-- MusicLab PostgreSQL schema (Modular Monolithic MVP)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'admin')),
  bio TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Banned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cover_color TEXT NOT NULL DEFAULT '#0ea5e9',
  status TEXT NOT NULL DEFAULT 'Private' CHECK (status IN ('Public', 'Private')),
  state JSONB NOT NULL DEFAULT '{"bpm":120,"timeSig":[4,4],"masterVolume":90,"tracks":[]}'::jsonb,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration DOUBLE PRECISION NOT NULL DEFAULT 0,
  bpm INTEGER,
  format TEXT NOT NULL DEFAULT 'WAV',
  size BIGINT NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'sample')),
  uploaded TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id);

CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS render_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'active', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0,
  output_path TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_render_jobs_user ON render_jobs(user_id);

CREATE TABLE IF NOT EXISTS admin_reports (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('content', 'account')),
  type TEXT NOT NULL,
  track TEXT,
  reason TEXT,
  reported_user TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  admin TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
