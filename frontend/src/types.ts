// Shared domain types for MusicLab. These mirror the JSON `project_state`
// described in the architecture docs so the same shape can later be persisted
// to a PostgreSQL JSONB column without changes.

export type UserRole = "guest" | "creator" | "admin";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  bio?: string;
  status: "Active" | "Banned";
  createdAt: string;
  profileMeta?: ProfileMeta;
}

export interface ProfileMeta {
  avatarUrl?: string | null;
  coverUrl?: string | null;
  locale?: "en" | "vi";
  labels?: {
    inspiredBy: string[];
    talents: string[];
    genres: string[];
  };
}

export type AssetFormat = "WAV" | "MP3" | "FLAC" | "M4A" | "OGG";

export interface Asset {
  id: string;
  ownerId: string;
  name: string;
  duration: number; // seconds
  bpm?: number | null;
  format: AssetFormat;
  size: number; // bytes
  uploaded: string; // ISO date
  source: "upload" | "sample";
  /** Built-in synthesized sample identifier (when source === "sample"). */
  sampleId?: string;
  /** Loop length in beats, when the asset is a musical loop. */
  loopBeats?: number;
}

export type ClipType = "audio" | "midi";

export interface MidiNote {
  id: string;
  pitch: number; // MIDI 0–127
  start: number; // beats within the clip
  duration: number; // beats
  velocity: number; // 0–127
}

export interface Clip {
  id: string;
  name: string;
  /** Reference to a user Asset (upload) — audio buffer stored in IndexedDB. */
  assetId?: string;
  /** Reference to a built-in synthesized sample. */
  sampleId?: string;
  start: number; // in beats from the start of the timeline
  duration: number; // in beats
  offset?: number; // playback start offset within the source, in seconds
  type: ClipType;
  color?: string;
  /** MIDI notes when type === "midi" and clip is editable in Piano Roll. */
  notes?: MidiNote[];
}

export type TrackType = "drum" | "synth" | "audio" | "bus";

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  color: string;
  volume: number; // 0..100
  pan: number; // -50 (hard left) .. 50 (hard right)
  muted: boolean;
  solo: boolean;
  armed: boolean;
  clips: Clip[];
  eq: boolean;
  reverb: number; // 0..100 wet amount
  delay: number; // 0..100 wet amount
}

export interface ProjectState {
  bpm: number;
  timeSig: [number, number];
  masterVolume: number; // 0..100
  tracks: Track[];
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  coverColor: string;
  status: "Public" | "Private";
  version?: number;
  createdAt: string;
  updatedAt: string;
  state: ProjectState;
}

export type ProjectMemberRole = "owner" | "editor" | "viewer";

export interface ProjectMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: ProjectMemberRole;
  invitedAt?: string;
}

export interface RenderJob {
  id: string;
  projectId: string;
  status: "queued" | "active" | "completed" | "failed";
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
}

export interface AdminReport {
  id: string;
  category: "content" | "account";
  type: string;
  track?: string;
  reason?: string;
  user: string;
  date: string;
}

export interface AdminLog {
  id: string;
  action: string;
  admin: string;
  time: string;
}
