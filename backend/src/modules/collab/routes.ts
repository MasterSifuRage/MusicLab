import { Router } from "express";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { uid } from "../../lib/id.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";
import { canEdit, getAccessibleProject, getProjectRole } from "../../lib/projectAccess.js";
import { param } from "../../lib/params.js";
import type { UserRow } from "../../types.js";

const router = Router();

interface MemberRow {
  id: string;
  project_id: string;
  user_id: string;
  role: "viewer" | "editor";
  invited_at: Date;
  username: string;
  email: string;
}

router.get("/:projectId/members", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = param(req.params.projectId);
    const access = await getAccessibleProject(req.user!.sub, projectId);
    if (!access) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const { rows: ownerRows } = await query<{ id: string; username: string; email: string }>(
      `SELECT id, username, email FROM users WHERE id = $1`,
      [access.project.owner_id]
    );
    const owner = ownerRows[0];

    const { rows: members } = await query<MemberRow>(
      `SELECT pm.*, u.username, u.email
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.invited_at ASC`,
      [projectId]
    );

    res.json({
      members: [
        {
          id: "owner",
          userId: owner.id,
          username: owner.username,
          email: owner.email,
          role: "owner",
        },
        ...members.map((m) => ({
          id: m.id,
          userId: m.user_id,
          username: m.username,
          email: m.email,
          role: m.role,
          invitedAt: m.invited_at.toISOString(),
        })),
      ],
      myRole: access.role,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:projectId/members", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = param(req.params.projectId);
    const role = await getProjectRole(req.user!.sub, projectId);
    if (role !== "owner") {
      res.status(403).json({ error: "Only the project owner can invite members" });
      return;
    }

    const input = z
      .object({
        email: z.string().email(),
        memberRole: z.enum(["viewer", "editor"]).default("editor"),
      })
      .parse(req.body);

    const { rows: users } = await query<UserRow>(`SELECT * FROM users WHERE email = $1`, [
      input.email.toLowerCase(),
    ]);
    const user = users[0];
    if (!user) {
      res.status(404).json({ error: "User not found with that email" });
      return;
    }

    const { rows: projectRows } = await query<{ owner_id: string }>(
      `SELECT owner_id FROM projects WHERE id = $1`,
      [projectId]
    );
    if (projectRows[0]?.owner_id === user.id) {
      res.status(400).json({ error: "Owner is already on the project" });
      return;
    }

    const existing = await query(
      `SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, user.id]
    );
    if (existing.rows[0]) {
      res.status(409).json({ error: "User is already a member" });
      return;
    }

    const memberId = uid("pm_");
    await query(
      `INSERT INTO project_members (id, project_id, user_id, role) VALUES ($1, $2, $3, $4)`,
      [memberId, projectId, user.id, input.memberRole]
    );

    res.status(201).json({
      member: {
        id: memberId,
        userId: user.id,
        username: user.username,
        email: user.email,
        role: input.memberRole,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/:projectId/members/:memberId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = param(req.params.projectId);
    const ownerRole = await getProjectRole(req.user!.sub, projectId);
    if (ownerRole !== "owner") {
      res.status(403).json({ error: "Only the project owner can change roles" });
      return;
    }

    const input = z.object({ role: z.enum(["viewer", "editor"]) }).parse(req.body);
    const result = await query(
      `UPDATE project_members SET role = $1 WHERE id = $2 AND project_id = $3`,
      [input.role, param(req.params.memberId), projectId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:projectId/members/:memberId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = param(req.params.projectId);
    const ownerRole = await getProjectRole(req.user!.sub, projectId);
    if (ownerRole !== "owner") {
      res.status(403).json({ error: "Only the project owner can remove members" });
      return;
    }
    const result = await query(
      `DELETE FROM project_members WHERE id = $1 AND project_id = $2`,
      [param(req.params.memberId), projectId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
