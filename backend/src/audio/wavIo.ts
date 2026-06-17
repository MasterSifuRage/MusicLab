import { readFileSync, writeFileSync } from "fs";
import type { PcmBuffer } from "./pcm.js";
import { DEFAULT_SAMPLE_RATE, monoToStereo } from "./pcm.js";

export function decodeWavFile(path: string): PcmBuffer {
  const buf = readFileSync(path);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const readStr = (offset: number, len: number) =>
    String.fromCharCode(...Array.from({ length: len }, (_, i) => view.getUint8(offset + i)));

  if (readStr(0, 4) !== "RIFF" || readStr(8, 4) !== "WAVE") {
    throw new Error("Not a WAV file");
  }

  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = DEFAULT_SAMPLE_RATE;
  let bitsPerSample = 16;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset < view.byteLength - 8) {
    const chunkId = readStr(offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8;
    if (chunkId === "fmt ") {
      audioFormat = view.getUint16(offset, true);
      numChannels = view.getUint16(offset + 2, true);
      sampleRate = view.getUint32(offset + 4, true);
      bitsPerSample = view.getUint16(offset + 14, true);
    } else if (chunkId === "data") {
      dataOffset = offset;
      dataSize = chunkSize;
      break;
    }
    offset += chunkSize;
  }

  if (!dataOffset) throw new Error("WAV data chunk missing");

  const bytesPerSample = bitsPerSample / 8;
  const numFrames = Math.floor(dataSize / (bytesPerSample * numChannels));
  const channels: Float32Array[] = Array.from({ length: numChannels }, () => new Float32Array(numFrames));

  let pos = dataOffset;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = 0;
      if (audioFormat === 1 && bitsPerSample === 16) {
        sample = view.getInt16(pos, true) / 0x8000;
        pos += 2;
      } else if (audioFormat === 1 && bitsPerSample === 8) {
        sample = (view.getUint8(pos) - 128) / 128;
        pos += 1;
      } else if (audioFormat === 3 && bitsPerSample === 32) {
        sample = view.getFloat32(pos, true);
        pos += 4;
      } else {
        throw new Error(`Unsupported WAV format: ${audioFormat}/${bitsPerSample}`);
      }
      channels[c][i] = sample;
    }
  }

  return { channels, sampleRate, length: numFrames };
}

export function encodeWavFile(buf: PcmBuffer, path: string) {
  const numChannels = buf.channels.length;
  const sampleRate = buf.sampleRate;
  const numFrames = buf.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = buf.channels[c][i] ?? 0;
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  writeFileSync(path, Buffer.from(arrayBuffer));
}

/** Best-effort decode: WAV natively, other formats via audio-decode if installed. */
export async function decodeAudioFile(path: string, format: string): Promise<PcmBuffer> {
  if (format.toUpperCase() === "WAV") {
    return decodeWavFile(path);
  }
  try {
    const decode = (await import("audio-decode")).default;
    const data = readFileSync(path);
    const audio = await decode(data);
    const ch = audio.numberOfChannels;
    const len = audio.length;
    const channels = Array.from({ length: ch }, (_, c) => {
      const mono = new Float32Array(len);
      const src = audio.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] = src[i];
      return mono;
    });
    if (ch === 1) return monoToStereo(channels[0], audio.sampleRate);
    return { channels, sampleRate: audio.sampleRate, length: len };
  } catch {
    throw new Error(`Cannot decode ${format} — install audio-decode or use WAV`);
  }
}
