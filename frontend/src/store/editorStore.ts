import { create } from "zustand";
import { audioEngine } from "../audio/AudioEngine";
import { assetService } from "../services/assets";
import { projectService, makeTrack } from "../services/projects";
import { collabClient } from "../services/collab";
import { useCollabStore } from "./collabStore";
import { SAMPLE_BY_ID } from "../audio/synth";
import { uid } from "../lib/id";
import type { Clip, MidiNote, Project, ProjectState, Track, TrackType } from "../types";
import { importMidiFile } from "../audio/midiIo";
import { quantizeNotes, type QuantizeGrid } from "../audio/quantize";

export type EditorTool = "select" | "cut";

const MAX_UNDO = 30;

interface EditorState {
  project: Project | null;
  loading: boolean;
  dirty: boolean;
  isPlaying: boolean;
  positionBeats: number;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  metronomeOn: boolean;
  loopOn: boolean;
  tool: EditorTool;
  pxPerBeat: number;
  undoStack: ProjectState[];
  redoStack: ProjectState[];
  applyingRemote: boolean;

  loadProject: (id: string | undefined, ownerId: string) => Promise<void>;
  applyRemoteState: (state: ProjectState, version: number) => void;
  save: () => Promise<void>;
  rename: (name: string) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  setBpm: (bpm: number) => void;
  setMasterVolume: (v: number) => void;
  setTimeSig: (sig: [number, number]) => void;
  setPxPerBeat: (v: number) => void;

  addTrack: (type: TrackType) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  toggleMute: (id: string) => void;
  toggleSolo: (id: string) => void;
  toggleArm: (id: string) => void;
  selectTrack: (id: string | null) => void;

  addClipFromSample: (trackId: string, sampleId: string, startBeat: number) => void;
  addClipFromAsset: (trackId: string, assetId: string, name: string, durationBeats: number, startBeat: number) => Promise<void>;
  addMidiClip: (trackId: string, startBeat: number, durationBeats?: number) => void;
  updateClip: (trackId: string, clipId: string, patch: Partial<Clip>) => void;
  setClipNotes: (trackId: string, clipId: string, notes: MidiNote[]) => void;
  importMidiToClip: (trackId: string, clipId: string, file: File) => Promise<void>;
  quantizeMidiClip: (trackId: string, clipId: string, division: QuantizeGrid) => void;
  removeClip: (trackId: string, clipId: string) => void;
  splitClip: (trackId: string, clipId: string, atBeat: number) => void;
  joinClip: (trackId: string, clipId: string) => void;
  selectClip: (trackId: string | null, clipId: string | null) => void;

  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (beat: number) => void;
  setMetronome: (on: boolean) => void;
  setLoop: (on: boolean) => void;
  setTool: (tool: EditorTool) => void;
  tick: () => void;
}

let rafId: number | null = null;
let collabDebounce: ReturnType<typeof setTimeout> | null = null;

const ADJACENT_EPS = 0.001;

function clipsCompatible(a: Clip, b: Clip): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "audio") {
    if (a.assetId && b.assetId) return a.assetId === b.assetId;
    if (a.sampleId && b.sampleId) return a.sampleId === b.sampleId;
    return false;
  }
  return true;
}

function mergeClips(left: Clip, right: Clip): Clip {
  const merged: Clip = {
    ...left,
    duration: left.duration + right.duration,
    name: left.name || right.name,
  };
  if (left.type === "midi") {
    const leftNotes = (left.notes ?? []).map((n) => ({ ...n }));
    const rightNotes = (right.notes ?? []).map((n) => ({
      ...n,
      id: uid("n_"),
      start: n.start + left.duration,
    }));
    merged.notes = [...leftNotes, ...rightNotes];
  }
  return merged;
}

function startRaf(get: () => EditorState) {
  if (rafId !== null) return;
  const loop = () => {
    get().tick();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopRaf() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function broadcastState(project: Project) {
  if (!collabClient.connected || useCollabStore.getState().readOnly) return;
  const version = useCollabStore.getState().version;
  if (collabDebounce) clearTimeout(collabDebounce);
  collabDebounce = setTimeout(() => {
    collabClient.sendPatch(version, project.state);
  }, 400);
}

/** Immutably update the current project's state and mark dirty + re-mix. */
function mutate(
  set: (fn: (s: EditorState) => Partial<EditorState>) => void,
  get: () => EditorState,
  updater: (project: Project) => Project,
  opts: { remix?: boolean; undoable?: boolean; sync?: boolean } = {}
) {
  const { remix = true, undoable = false, sync = true } = opts;
  set((s) => {
    if (!s.project || s.applyingRemote) return {};
    const undoStack = undoable ? [...s.undoStack.slice(-MAX_UNDO + 1), structuredClone(s.project.state)] : s.undoStack;
    const project = updater(s.project);
    if (remix) audioEngine.applyMix(project.state);
    if (sync && !s.applyingRemote) broadcastState(project);
    return { project, dirty: true, undoStack, redoStack: undoable ? [] : s.redoStack };
  });
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  loading: false,
  dirty: false,
  isPlaying: false,
  positionBeats: 0,
  selectedTrackId: null,
  selectedClipId: null,
  metronomeOn: false,
  loopOn: false,
  tool: "select",
  pxPerBeat: 32,
  undoStack: [],
  redoStack: [],
  applyingRemote: false,

  async loadProject(id, ownerId) {
    set({ loading: true });
    audioEngine.stop();
    let project: Project | null = null;
    if (id) project = await projectService.get(id);
    if (!project) project = await projectService.create(ownerId, "Untitled Project");
    await audioEngine.ensureLoaded(project.state, (assetId) => assetService.getBlob(assetId));
    audioEngine.applyMix(project.state);
    set({
      project,
      loading: false,
      dirty: false,
      isPlaying: false,
      positionBeats: 0,
      selectedTrackId: project.state.tracks[0]?.id ?? null,
      selectedClipId: null,
      undoStack: [],
      redoStack: [],
    });
  },

  applyRemoteState(state, version) {
    const { project } = get();
    if (!project) return;
    set({ applyingRemote: true });
    audioEngine.applyMix(state);
    set({
      project: { ...project, state, version },
      dirty: false,
      applyingRemote: false,
    });
    useCollabStore.getState().setVersion(version);
  },

  async save() {
    const { project } = get();
    if (!project || useCollabStore.getState().readOnly) return;
    const saved = await projectService.save(project);
    set({ project: saved, dirty: false });
    if (saved.version != null) useCollabStore.getState().setVersion(saved.version);
  },

  rename(name) {
    mutate(set, get, (p) => ({ ...p, name }), { remix: false });
  },

  pushUndo() {
    const { project, undoStack } = get();
    if (!project) return;
    set({ undoStack: [...undoStack.slice(-MAX_UNDO + 1), structuredClone(project.state)] });
  },

  undo() {
    const { project, undoStack, redoStack } = get();
    if (!project || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, structuredClone(project.state)],
      project: { ...project, state: prev },
      dirty: true,
    });
    audioEngine.applyMix(prev);
    broadcastState({ ...project, state: prev });
  },

  redo() {
    const { project, undoStack, redoStack } = get();
    if (!project || redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, structuredClone(project.state)],
      project: { ...project, state: next },
      dirty: true,
    });
    audioEngine.applyMix(next);
    broadcastState({ ...project, state: next });
  },

  setBpm(bpm) {
    const clamped = Math.max(40, Math.min(300, bpm || 120));
    mutate(set, get, (p) => ({ ...p, state: { ...p.state, bpm: clamped } }));
  },

  setMasterVolume(v) {
    mutate(set, get, (p) => ({ ...p, state: { ...p.state, masterVolume: v } }));
  },

  setTimeSig(sig) {
    mutate(set, get, (p) => ({ ...p, state: { ...p.state, timeSig: sig } }));
  },

  setPxPerBeat(v) {
    set({ pxPerBeat: Math.max(16, Math.min(64, v)) });
  },

  addTrack(type) {
    const names: Record<TrackType, string> = {
      drum: "Drum Track",
      synth: "Synth Track",
      audio: "Audio Track",
      bus: "Bus",
    };
    const colors = ["#ef4444", "#3b82f6", "#fbbf24", "#10b981", "#8b5cf6", "#0ea5e9"];
    mutate(
      set,
      get,
      (p) => {
        const track = makeTrack({
          type,
          name: names[type],
          color: colors[p.state.tracks.length % colors.length],
        });
        return { ...p, state: { ...p.state, tracks: [...p.state.tracks, track] } };
      },
      { undoable: true }
    );
    const tracks = get().project?.state.tracks;
    if (tracks?.length) set({ selectedTrackId: tracks[tracks.length - 1].id });
  },

  removeTrack(id) {
    mutate(set, get, (p) => ({
      ...p,
      state: { ...p.state, tracks: p.state.tracks.filter((t) => t.id !== id) },
    }), { undoable: true });
    if (get().selectedTrackId === id) set({ selectedTrackId: null });
  },

  updateTrack(id, patch) {
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      },
    }));
  },

  toggleMute(id) {
    const t = get().project?.state.tracks.find((x) => x.id === id);
    if (t) get().updateTrack(id, { muted: !t.muted });
  },
  toggleSolo(id) {
    const t = get().project?.state.tracks.find((x) => x.id === id);
    if (t) get().updateTrack(id, { solo: !t.solo });
  },
  toggleArm(id) {
    const t = get().project?.state.tracks.find((x) => x.id === id);
    if (t) get().updateTrack(id, { armed: !t.armed });
  },

  selectTrack(id) {
    set({ selectedTrackId: id });
  },

  addClipFromSample(trackId, sampleId, startBeat) {
    const def = SAMPLE_BY_ID.get(sampleId);
    if (!def) return;
    const clip: Clip = {
      id: uid("c_"),
      sampleId,
      name: def.name,
      start: Math.max(0, Math.round(startBeat)),
      duration: def.loopBeats,
      offset: 0,
      type: def.type === "drum" ? "midi" : def.type === "synth" ? "midi" : "audio",
    };
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      },
    }), { remix: false, undoable: true });
  },

  async addClipFromAsset(trackId, assetId, name, durationBeats, startBeat) {
    try {
      const data = await assetService.getBlob(assetId);
      await audioEngine.loadAsset(assetId, data);
    } catch {
      /* ignore */
    }
    const clip: Clip = {
      id: uid("c_"),
      assetId,
      name,
      start: Math.max(0, Math.round(startBeat)),
      duration: Math.max(1, Math.round(durationBeats)),
      offset: 0,
      type: "audio",
    };
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      },
    }), { remix: false, undoable: true });
  },

  addMidiClip(trackId, startBeat, durationBeats = 4) {
    const track = get().project?.state.tracks.find((t) => t.id === trackId);
    const clip: Clip = {
      id: uid("c_"),
      name: "MIDI Clip",
      start: Math.max(0, startBeat),
      duration: durationBeats,
      type: "midi",
      notes: [],
      color: track?.color,
    };
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      },
    }), { remix: false, undoable: true });
    set({ selectedTrackId: trackId, selectedClipId: clip.id });
  },

  updateClip(trackId, clipId, patch) {
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)) }
            : t
        ),
      },
    }), { remix: false });
  },

  setClipNotes(trackId, clipId, notes) {
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.map((c) => (c.id === clipId ? { ...c, notes } : c)) }
            : t
        ),
      },
    }), { remix: false, undoable: true });
  },

  async importMidiToClip(trackId, clipId, file) {
    const { project } = get();
    if (!project) return;
    const track = project.state.tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const { notes, durationBeats, detectedBpm } = await importMidiFile(
      file,
      project.state.bpm,
      Math.max(clip.duration, 64)
    );

    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        bpm: detectedBpm,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clipId
                    ? { ...c, notes, duration: Math.max(c.duration, durationBeats), type: "midi" as const }
                    : c
                ),
              }
            : t
        ),
      },
    }), { remix: false, undoable: true });
  },

  quantizeMidiClip(trackId, clipId, division) {
    const clip = get().project?.state.tracks
      .find((t) => t.id === trackId)
      ?.clips.find((c) => c.id === clipId);
    if (!clip?.notes) return;
    const quantized = quantizeNotes(clip.notes, division, clip.duration);
    get().setClipNotes(trackId, clipId, quantized);
  },

  removeClip(trackId, clipId) {
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t
        ),
      },
    }), { remix: false, undoable: true });
    if (get().selectedClipId === clipId) set({ selectedClipId: null });
  },

  splitClip(trackId, clipId, atBeat) {
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) => {
          if (t.id !== trackId) return t;
          const clips: Clip[] = [];
          for (const c of t.clips) {
            if (c.id === clipId && atBeat > c.start && atBeat < c.start + c.duration) {
              const spb = 60 / p.state.bpm;
              const firstDur = atBeat - c.start;
              const relSplit = atBeat - c.start;
              clips.push({
                ...c,
                duration: firstDur,
                notes: c.notes
                  ?.filter((n) => n.start + n.duration <= relSplit)
                  .map((n) => ({ ...n })),
              });
              clips.push({
                ...c,
                id: uid("c_"),
                start: atBeat,
                duration: c.duration - firstDur,
                offset: (c.offset ?? 0) + firstDur * spb,
                notes: c.notes
                  ?.filter((n) => n.start >= relSplit)
                  .map((n) => ({ ...n, id: uid("n_"), start: n.start - relSplit })),
              });
            } else {
              clips.push(c);
            }
          }
          return { ...t, clips };
        }),
      },
    }), { remix: false, undoable: true });
  },

  joinClip(trackId, clipId) {
    let mergedId: string | null = null;
    mutate(set, get, (p) => ({
      ...p,
      state: {
        ...p.state,
        tracks: p.state.tracks.map((t) => {
          if (t.id !== trackId) return t;
          const sorted = [...t.clips].sort((a, b) => a.start - b.start);
          const idx = sorted.findIndex((c) => c.id === clipId);
          if (idx < 0) return t;

          const current = sorted[idx];
          const right = sorted[idx + 1];
          const left = sorted[idx - 1];

          const touchRight =
            right && Math.abs(current.start + current.duration - right.start) < ADJACENT_EPS;
          const touchLeft =
            left && Math.abs(left.start + left.duration - current.start) < ADJACENT_EPS;

          let merged: Clip | null = null;
          let removeIds: string[] = [];

          if (touchRight && clipsCompatible(current, right)) {
            merged = mergeClips(current, right);
            removeIds = [current.id, right.id];
          } else if (touchLeft && clipsCompatible(left, current)) {
            merged = mergeClips(left, current);
            removeIds = [left.id, current.id];
          }

          if (!merged) return t;

          mergedId = merged.id;
          const clips = t.clips.filter((c) => !removeIds.includes(c.id));
          clips.push(merged);
          clips.sort((a, b) => a.start - b.start);
          return { ...t, clips };
        }),
      },
    }), { remix: false, undoable: true });

    if (mergedId) set({ selectedClipId: mergedId });
  },

  selectClip(trackId, clipId) {
    set({ selectedTrackId: trackId ?? get().selectedTrackId, selectedClipId: clipId });
  },

  async play() {
    const { project } = get();
    if (!project) return;
    await audioEngine.play(project.state, get().positionBeats);
    audioEngine.setMetronome(get().metronomeOn, get().positionBeats);
    set({ isPlaying: true });
    startRaf(get);
  },

  pause() {
    const pos = audioEngine.pause();
    stopRaf();
    set({ isPlaying: false, positionBeats: pos });
  },

  stop() {
    audioEngine.stop();
    stopRaf();
    set({ isPlaying: false, positionBeats: 0 });
  },

  seek(beat) {
    const wasPlaying = get().isPlaying;
    if (wasPlaying) audioEngine.pause();
    set({ positionBeats: Math.max(0, beat) });
    collabClient.sendCursor(beat, get().selectedTrackId ?? undefined);
    if (wasPlaying) get().play();
  },

  setMetronome(on) {
    set({ metronomeOn: on });
    audioEngine.setMetronome(on, get().positionBeats);
  },

  setLoop(on) {
    set({ loopOn: on });
    audioEngine.setLoop(on);
  },

  setTool(tool) {
    set({ tool });
  },

  tick() {
    if (!get().isPlaying) return;
    const pos = audioEngine.getPositionBeats();
    if (get().loopOn && pos >= audioEngine.lengthInBeats) {
      get().seek(0);
      if (get().isPlaying) void get().play();
      return;
    }
    if (!get().loopOn && pos >= audioEngine.lengthInBeats) {
      get().stop();
      return;
    }
    set({ positionBeats: pos });
  },
}));
