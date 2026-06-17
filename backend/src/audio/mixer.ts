import { query } from "../db/pool.js";
import type { AssetRow } from "../types.js";
import { decodeAudioFile } from "./wavIo.js";
import {
  applyMasterGain,
  createPcm,
  limiter,
  mixInto,
  normalizeToStereo,
  resampleMono,
  DEFAULT_SAMPLE_RATE,
  type PcmBuffer,
} from "./pcm.js";
import { getSampleBuffer, renderMidiNote } from "./synthServer.js";

interface MidiNote {
  id: string;
  pitch: number;
  start: number;
  duration: number;
  velocity: number;
}

interface Clip {
  id: string;
  assetId?: string;
  sampleId?: string;
  start: number;
  duration: number;
  offset?: number;
  type: "audio" | "midi";
  notes?: MidiNote[];
}

interface Track {
  id: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  clips: Clip[];
}

interface ProjectState {
  bpm: number;
  masterVolume: number;
  tracks: Track[];
}

function computeLengthBeats(state: ProjectState): number {
  let max = 0;
  for (const t of state.tracks) {
    for (const c of t.clips) max = Math.max(max, c.start + c.duration);
  }
  return Math.max(16, Math.ceil(max));
}

function trackGain(track: Track, anySolo: boolean): number {
  if (track.muted) return 0;
  if (anySolo && !track.solo) return 0;
  return track.volume / 100;
}

async function loadClipBuffer(
  clip: Clip,
  assetMap: Map<string, AssetRow>
): Promise<PcmBuffer | null> {
  if (clip.sampleId) return getSampleBuffer(clip.sampleId);
  if (!clip.assetId) return null;
  const asset = assetMap.get(clip.assetId);
  if (!asset) return null;
  try {
    const buf = await decodeAudioFile(asset.file_path, asset.format);
    return normalizeToStereo(buf);
  } catch {
    return null;
  }
}

function resampleToDefault(buf: PcmBuffer): PcmBuffer {
  if (buf.sampleRate === DEFAULT_SAMPLE_RATE) return buf;
  const channels = buf.channels.map((ch) => resampleMono(ch, buf.sampleRate, DEFAULT_SAMPLE_RATE));
  return { channels, sampleRate: DEFAULT_SAMPLE_RATE, length: channels[0].length };
}

export async function renderProjectToWav(
  state: ProjectState,
  ownerId: string,
  onProgress?: (pct: number) => void
): Promise<PcmBuffer> {
  const bpm = state.bpm || 120;
  const spb = 60 / bpm;
  const lengthBeats = computeLengthBeats(state);
  const tail = 2.5;
  const totalSeconds = lengthBeats * spb + tail;
  const output = createPcm(totalSeconds, 2, DEFAULT_SAMPLE_RATE);
  const anySolo = state.tracks.some((t) => t.solo);

  const assetIds = new Set<string>();
  for (const track of state.tracks) {
    for (const clip of track.clips) {
      if (clip.assetId) assetIds.add(clip.assetId);
    }
  }

  const assetMap = new Map<string, AssetRow>();
  if (assetIds.size > 0) {
    const { rows } = await query<AssetRow>(
      `SELECT * FROM assets WHERE owner_id = $1 AND id = ANY($2::text[])`,
      [ownerId, [...assetIds]]
    );
    for (const row of rows) assetMap.set(row.id, row);
  }

  const totalClips = state.tracks.reduce((n, t) => n + t.clips.length, 0) || 1;
  let done = 0;

  for (const track of state.tracks) {
    const gain = trackGain(track, anySolo);
    const pan = Math.max(-1, Math.min(1, track.pan / 50));

    for (const clip of track.clips) {
      const clipStartSample = Math.floor(clip.start * spb * DEFAULT_SAMPLE_RATE);

      if (clip.type === "midi" && clip.notes?.length) {
        for (const note of clip.notes) {
          const noteStart = clipStartSample + Math.floor(note.start * spb * DEFAULT_SAMPLE_RATE);
          const noteDur = note.duration * spb;
          const noteBuf = renderMidiNote(note.pitch, noteDur, note.velocity);
          mixInto(output, noteBuf, noteStart, gain, pan);
        }
      } else {
        let buf = await loadClipBuffer(clip, assetMap);
        if (!buf) {
          done++;
          onProgress?.(Math.round((done / totalClips) * 90));
          continue;
        }
        buf = resampleToDefault(buf);
        const offsetSamples = Math.floor((clip.offset ?? 0) * DEFAULT_SAMPLE_RATE);
        const playSamples = Math.min(
          Math.floor(clip.duration * spb * DEFAULT_SAMPLE_RATE),
          buf.length - offsetSamples
        );
        if (playSamples <= 0) {
          done++;
          continue;
        }
        const slice: PcmBuffer = {
          channels: buf.channels.map((ch) => ch.subarray(offsetSamples, offsetSamples + playSamples)),
          sampleRate: DEFAULT_SAMPLE_RATE,
          length: playSamples,
        };
        mixInto(output, slice, clipStartSample, gain, pan);
      }
      done++;
      onProgress?.(Math.round((done / totalClips) * 90));
    }
  }

  applyMasterGain(output, (state.masterVolume ?? 90) / 100);
  limiter(output);
  onProgress?.(100);
  return output;
}
