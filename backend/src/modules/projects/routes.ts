import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { uid } from "../../lib/id.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";
import { canEdit, getAccessibleProject } from "../../lib/projectAccess.js";
import { param } from "../../lib/params.js";
import type { ProjectRow, ProjectState } from "../../types.js";

const router = Router();

const emptyState = (): ProjectState => ({
  bpm: 120,
  timeSig: [4, 4],
  masterVolume: 90,
  tracks: [],
});

function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    coverColor: row.cover_color,
    status: row.status,
    version: row.version ?? 0,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    state: row.state,
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<ProjectRow>(
      `SELECT DISTINCT p.* FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
       WHERE p.owner_id = $1 OR pm.user_id IS NOT NULL
       ORDER BY p.updated_at DESC`,
      [req.user!.sub]
    );
    res.json({ projects: rows.map(mapProject) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const access = await getAccessibleProject(req.user!.sub, param(req.params.id));
    if (!access) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ project: mapProject(access.project), role: access.role });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = z
      .object({
        name: z.string().min(1).default("Untitled Project"),
        privacy: z.enum(["public", "private"]).default("public"),
      })
      .parse(req.body ?? {});

    const id = uid("p_");
    const colors = ["#ef4444", "#3b82f6", "#fbbf24", "#10b981", "#8b5cf6", "#0ea5e9"];
    const cover = colors[Math.floor(Math.random() * colors.length)];
    const status = input.privacy === "public" ? "Public" : "Private";

    await query(
      `INSERT INTO projects (id, owner_id, name, cover_color, status, state) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, req.user!.sub, input.name, cover, status, JSON.stringify(emptyState())]
    );
    const { rows } = await query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [id]);
    res.status(201).json({ project: mapProject(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const access = await getAccessibleProject(req.user!.sub, param(req.params.id));
    if (!access || !canEdit(access.role)) {
      res.status(403).json({ error: "No edit access" });
      return;
    }

    const input = z
      .object({
        name: z.string().min(1).optional(),
        status: z.enum(["Public", "Private"]).optional(),
        state: z.any().optional(),
        version: z.number().optional(),
      })
      .parse(req.body);

    const fields: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let i = 1;
    if (input.name) {
      fields.push(`name = $${i++}`);
      values.push(input.name);
    }
    if (input.status) {
      fields.push(`status = $${i++}`);
      values.push(input.status);
    }
    if (input.state) {
      fields.push(`state = $${i++}`);
      values.push(JSON.stringify(input.state));
      fields.push(`version = version + 1`);
    }
    values.push(param(req.params.id));
    await query(`UPDATE projects SET ${fields.join(", ")} WHERE id = $${i}`, values);
    const { rows } = await query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [param(req.params.id)]);
    res.json({ project: mapProject(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/privacy", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const access = await getAccessibleProject(req.user!.sub, param(req.params.id));
    if (!access || access.role !== "owner") {
      res.status(403).json({ error: "Only owner can change privacy" });
      return;
    }
    const nextStatus = access.project.status === "Public" ? "Private" : "Public";
    await query(`UPDATE projects SET status = $1, updated_at = NOW() WHERE id = $2`, [
      nextStatus,
      param(req.params.id),
    ]);
    const updated = await query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [param(req.params.id)]);
    res.json({ project: mapProject(updated.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const access = await getAccessibleProject(req.user!.sub, param(req.params.id));
    if (!access || access.role !== "owner") {
      res.status(403).json({ error: "Only owner can delete" });
      return;
    }
    await query(`DELETE FROM projects WHERE id = $1`, [param(req.params.id)]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
