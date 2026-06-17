export type UserRole = "creator" | "admin";

export interface ProjectState {
  bpm: number;
  timeSig: [number, number];
  masterVolume: number;
  tracks: unknown[];
}

export interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  bio: string | null;
  status: "Active" | "Banned";
  created_at: Date;
  profile_meta?: ProfileMetaRow | null;
}

export interface ProfileMetaRow {
  avatarUrl?: string | null;
  coverUrl?: string | null;
  locale?: "en" | "vi";
  labels?: {
    inspiredBy?: string[];
    talents?: string[];
    genres?: string[];
  };
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  bio?: string;
  status: "Active" | "Banned";
  createdAt: string;
  profileMeta?: ProfileMetaRow;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  cover_color: string;
  status: "Public" | "Private";
  state: ProjectState;
  version?: number;
  created_at: Date;
  updated_at: Date;
}

export interface AssetRow {
  id: string;
  owner_id: string;
  name: string;
  duration: number;
  bpm: number | null;
  format: string;
  size: string;
  file_path: string;
  source: string;
  uploaded: Date;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
}
