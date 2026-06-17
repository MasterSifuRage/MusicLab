import { apiFetch, isApiMode } from "../lib/api";
import { getDB } from "../lib/db";
import { uid } from "../lib/id";
import type { Project, ProjectState, Track } from "../types";

const COVER_COLORS = ["#ef4444", "#3b82f6", "#fbbf24", "#10b981", "#8b5cf6", "#0ea5e9"];

export function emptyProjectState(): ProjectState {
  return { bpm: 120, timeSig: [4, 4], masterVolume: 90, tracks: [] };
}

export function makeTrack(partial: Partial<Track> = {}): Track {
  return {
    id: uid("t_"),
    name: partial.name ?? "Audio Track",
    type: partial.type ?? "audio",
    color: partial.color ?? COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
    volume: partial.volume ?? 80,
    pan: partial.pan ?? 0,
    muted: false,
    solo: false,
    armed: false,
    clips: partial.clips ?? [],
    eq: false,
    reverb: 0,
    delay: 0,
  };
}

export const projectService = {
  async list(ownerId: string): Promise<Project[]> {
    if (isApiMode()) {
      const { projects } = await apiFetch<{ projects: Project[] }>("/api/projects");
      return projects;
    }
    const db = await getDB();
    const all = await db.getAllFromIndex("projects", "ownerId", ownerId);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id: string): Promise<Project | null> {
    if (isApiMode()) {
      try {
        const { project } = await apiFetch<{ project: Project }>(`/api/projects/${id}`);
        return project;
      } catch {
        return null;
      }
    }
    const db = await getDB();
    return (await db.get("projects", id)) ?? null;
  },

  async create(
    ownerId: string,
    name = "Untitled Project",
    privacy: "public" | "private" = "public"
  ): Promise<Project> {
    if (isApiMode()) {
      const { project } = await apiFetch<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, privacy }),
      });
      return project;
    }
    const db = await getDB();
    const now = new Date().toISOString();
    const project: Project = {
      id: uid("p_"),
      ownerId,
      name,
      coverColor: COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)],
      status: privacy === "public" ? "Public" : "Private",
      createdAt: now,
      updatedAt: now,
      state: emptyProjectState(),
    };
    await db.put("projects", project);
    return project;
  },

  async save(project: Project): Promise<Project> {
    if (isApiMode()) {
      const { project: saved } = await apiFetch<{ project: Project }>(`/api/projects/${project.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: project.name,
          status: project.status,
          state: project.state,
        }),
      });
      return saved;
    }
    const db = await getDB();
    const updated = { ...project, updatedAt: new Date().toISOString() };
    await db.put("projects", updated);
    return updated;
  },

  async remove(id: string): Promise<void> {
    if (isApiMode()) {
      await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      return;
    }
    const db = await getDB();
    await db.delete("projects", id);
  },

  async togglePrivacy(id: string): Promise<Project | null> {
    if (isApiMode()) {
      const { project } = await apiFetch<{ project: Project }>(`/api/projects/${id}/privacy`, {
        method: "PATCH",
      });
      return project;
    }
    const project = await this.get(id);
    if (!project) return null;
    project.status = project.status === "Public" ? "Private" : "Public";
    return this.save(project);
  },
};
