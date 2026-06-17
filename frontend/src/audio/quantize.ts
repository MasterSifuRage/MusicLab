import type { MidiNote } from "../types";

/** Grid divisions in beats: 1 = quarter, 0.5 = eighth, 0.25 = sixteenth */
export type QuantizeGrid = 1 | 0.5 | 0.25 | 0.125;

export const QUANTIZE_OPTIONS: { label: string; value: QuantizeGrid }[] = [
  { label: "1/4", value: 1 },
  { label: "1/8", value: 0.5 },
  { label: "1/16", value: 0.25 },
  { label: "1/32", value: 0.125 },
];

export function snapToGrid(value: number, division: QuantizeGrid): number {
  if (division <= 0) return value;
  return Math.round(value / division) * division;
}

export function quantizeNotes(
  notes: MidiNote[],
  division: QuantizeGrid,
  clipDuration: number
): MidiNote[] {
  const minDur = division;
  return notes.map((n) => {
    const start = Math.max(0, snapToGrid(n.start, division));
    let duration = Math.max(minDur, snapToGrid(n.duration, division));
    if (start + duration > clipDuration) {
      duration = Math.max(minDur, clipDuration - start);
    }
    return { ...n, start, duration };
  });
}
