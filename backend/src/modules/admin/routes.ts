import { Router } from "express";
import { query } from "../../db/pool.js";
import { uid } from "../../lib/id.js";
import { toPublicUser } from "../../lib/user.js";
import { requireAuth, requireAdmin, type AuthRequest } from "../../middleware/auth.js";
import type { UserRow } from "../../types.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res, next) => {
  try {
    const users = await query<UserRow>(`SELECT status FROM users`);
    const projects = await query(`SELECT COUNT(*)::int AS count FROM projects`);
    res.json({
      totalUsers: users.rows.length,
      activeProjects: projects.rows[0].count,
      bannedAccounts: users.rows.filter((u) => u.status === "Banned").length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const { rows } = await query<UserRow>(`SELECT * FROM users ORDER BY username`);
    res.json({ users: rows.map(toPublicUser) });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const status = req.body.status === "Banned" ? "Banned" : "Active";
    const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (!rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (rows[0].role === "admin") {
      res.status(403).json({ error: "Cannot modify admin accounts" });
      return;
    }
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, req.params.id]);
    await query(`INSERT INTO admin_logs (id, action, admin) VALUES ($1, $2, $3)`, [
      uid("log_"),
      `User '${rows[0].username}' was ${status === "Banned" ? "banned" : "re-enabled"}`,
      "Admin",
    ]);
    const updated = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    res.json({ user: toPublicUser(updated.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.get("/reports", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, category, type, track, reason, reported_user AS user,
              TO_CHAR(created_at, 'FMMon DD') AS date
       FROM admin_reports ORDER BY created_at DESC`
    );
    res.json({ reports: rows });
  } catch (err) {
    next(err);
  }
});

router.delete("/reports/:id", async (req, res, next) => {
  try {
    await query(`DELETE FROM admin_reports WHERE id = $1`, [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/logs", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, action, admin, TO_CHAR(created_at, 'HH12:MI AM') AS time
       FROM admin_logs ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ logs: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
