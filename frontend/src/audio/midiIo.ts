import { Midi } from "@tonejs/midi";
import { uid } from "../lib/id";
import type { Clip, MidiNote, ProjectState } from "../types";

/** Parse a .mid file into notes for a MIDI clip (first non-empty track). */
export async function importMidiFile(
  file: File,
  bpm: number,
  maxBeats: number
): Promise<{ notes: MidiNote[]; durationBeats: number; detectedBpm: number }> {
  const buf = await file.arrayBuffer();
  const midi = new Midi(buf);
  const detectedBpm = Math.round(midi.header.tempos[0]?.bpm ?? bpm) || bpm;

  let track = midi.tracks.find((t) => t.notes.length > 0) ?? midi.tracks[0];
  if (!track) {
    return { notes: [], durationBeats: 4, detectedBpm };
  }

  const spb = 60 / detectedBpm;
  const notes: MidiNote[] = track.notes.map((n) => ({
    id: uid("n_"),
    pitch: n.midi,
    start: Math.max(0, n.time / spb),
    duration: Math.max(0.25, n.duration / spb),
    velocity: Math.round(n.velocity * 127),
  }));

  let durationBeats = Math.max(4, Math.ceil(maxBeats));
  for (const n of notes) {
    durationBeats = Math.max(durationBeats, Math.ceil(n.start + n.duration));
  }
  durationBeats = Math.min(durationBeats, maxBeats);

  const clipped = notes
    .filter((n) => n.start < durationBeats)
    .map((n) => ({
      ...n,
      duration: Math.min(n.duration, durationBeats - n.start),
    }));

  return { notes: clipped, durationBeats, detectedBpm };
}

/** Export a single MIDI clip to Standard MIDI File bytes. */
export function exportClipToMidi(clip: Clip, bpm: number, clipName?: string): Uint8Array {
  const midi = new Midi();
  midi.name = clipName ?? clip.name ?? "MusicLab Clip";
  midi.header.setTempo(bpm);
  const track = midi.addTrack();
  track.name = clip.name ?? "Track";

  const spb = 60 / bpm;
  for (const note of clip.notes ?? []) {
    track.addNote({
      midi: note.pitch,
      time: note.start * spb,
      duration: note.duration * spb,
      velocity: (note.velocity ?? 100) / 127,
    });
  }

  return midi.toArray();
}

/** Export all MIDI clips in a project (one track per clip). */
export function exportProjectMidi(state: ProjectState, projectName: string): Uint8Array {
  const midi = new Midi();
  midi.name = projectName;
  midi.header.setTempo(state.bpm);
  const spb = 60 / state.bpm;

  for (const t of state.tracks) {
    for (const clip of t.clips) {
      if (clip.type !== "midi" || !clip.notes?.length) continue;
      const track = midi.addTrack();
      track.name = `${t.name} — ${clip.name}`;
      for (const note of clip.notes) {
        track.addNote({
          midi: note.pitch,
          time: (clip.start + note.start) * spb,
          duration: note.duration * spb,
          velocity: (note.velocity ?? 100) / 127,
        });
      }
    }
  }

  return midi.toArray();
}

export function downloadMidiBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".mid") ? filename : `${filename}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
