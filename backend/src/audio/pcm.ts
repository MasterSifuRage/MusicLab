// PCM buffer utilities for server-side audio mixing.

export const DEFAULT_SAMPLE_RATE = 44100;

export interface PcmBuffer {
  channels: Float32Array[];
  sampleRate: number;
  length: number;
}

export function createPcm(seconds: number, channels = 2, sampleRate = DEFAULT_SAMPLE_RATE): PcmBuffer {
  const length = Math.max(1, Math.ceil(seconds * sampleRate));
  return {
    channels: Array.from({ length: channels }, () => new Float32Array(length)),
    sampleRate,
    length,
  };
}

export function monoToStereo(mono: Float32Array, sampleRate: number): PcmBuffer {
  return { channels: [mono, mono.slice()], sampleRate, length: mono.length };
}

export function resampleMono(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = toRate / fromRate;
  const outLen = Math.max(1, Math.floor(input.length * ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i / ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = src - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

export function normalizeToStereo(buf: PcmBuffer): PcmBuffer {
  if (buf.channels.length >= 2) return buf;
  const mono = buf.channels[0];
  return { channels: [mono, mono.slice()], sampleRate: buf.sampleRate, length: buf.length };
}

export function mixInto(
  target: PcmBuffer,
  source: PcmBuffer,
  startSample: number,
  gain = 1,
  pan = 0
) {
  const src = normalizeToStereo(source);
  const panL = pan <= 0 ? 1 : 1 - pan;
  const panR = pan >= 0 ? 1 : 1 + pan;
  const end = Math.min(target.length, startSample + src.length);
  for (let i = startSample; i < end; i++) {
    const si = i - startSample;
    target.channels[0][i] += src.channels[0][si] * gain * panL;
    target.channels[1][i] += src.channels[1][si] * gain * panR;
  }
}

export function applyMasterGain(buf: PcmBuffer, gain: number) {
  for (const ch of buf.channels) {
    for (let i = 0; i < ch.length; i++) ch[i] *= gain;
  }
}

export function limiter(buf: PcmBuffer, ceiling = 0.98) {
  for (const ch of buf.channels) {
    for (let i = 0; i < ch.length; i++) {
      ch[i] = Math.max(-ceiling, Math.min(ceiling, ch[i]));
    }
  }
}
