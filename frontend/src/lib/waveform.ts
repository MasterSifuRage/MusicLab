/** Peak bucket count for timeline clip waveforms from pixel width + HQ setting. */
export function waveformBucketCount(widthPx: number, hqPreview: boolean): number {
  const w = Math.max(1, widthPx);
  if (hqPreview) {
    return Math.min(512, Math.max(16, Math.floor(w)));
  }
  return Math.min(256, Math.max(8, Math.floor(w / 2)));
}

/** Decorative bar count for MIDI / synth clip blocks. */
export function midiClipBarCount(widthPx: number, hqPreview: boolean): number {
  const w = Math.max(1, widthPx);
  if (hqPreview) {
    return Math.min(64, Math.max(32, Math.floor(w / 3)));
  }
  return Math.min(32, Math.max(16, Math.floor(w / 6)));
}
