import { query } from "../db/pool.js";
import type { ProjectRow } from "../types.js";

export type ProjectRole = "owner" | "editor" | "viewer" | null;

export async function getProjectRole(userId: string, projectId: string): Promise<ProjectRole> {
  const { rows } = await query<ProjectRow>(`SELECT owner_id FROM projects WHERE id = $1`, [projectId]);
  if (!rows[0]) return null;
  if (rows[0].owner_id === userId) return "owner";

  const member = await query<{ role: "viewer" | "editor" }>(
    `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  if (!member.rows[0]) return null;
  return member.rows[0].role;
}

export function canView(role: ProjectRole) {
  return role === "owner" || role === "editor" || role === "viewer";
}

export function canEdit(role: ProjectRole) {
  return role === "owner" || role === "editor";
}

export async function getAccessibleProject(userId: string, projectId: string) {
  const role = await getProjectRole(userId, projectId);
  if (!canView(role)) return null;
  const { rows } = await query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  if (!rows[0]) return null;
  return { project: rows[0], role: role! };
}
