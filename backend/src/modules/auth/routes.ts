import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../../db/pool.js";
import { uid } from "../../lib/id.js";
import { toPublicUser } from "../../lib/user.js";
import { requireAuth, signToken, type AuthRequest } from "../../middleware/auth.js";
import type { UserRow } from "../../types.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32),
  password: z.string().min(4),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

async function findByIdentifier(identifier: string): Promise<UserRow | null> {
  const id = identifier.trim().toLowerCase();
  const { rows } = await query<UserRow>(
    `SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

router.post("/signup", async (req, res, next) => {
  try {
    const input = signupSchema.parse(req.body);
    const existing = await findByIdentifier(input.email);
    if (existing) {
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }
    const id = uid("u_");
    const hash = await bcrypt.hash(input.password, 10);
    await query(
      `INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, 'creator')`,
      [id, input.username.trim(), input.email.trim(), hash]
    );
    const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
    const user = toPublicUser(rows[0]);
    const token = signToken({ sub: user.id, role: user.role });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const row = await findByIdentifier(input.identifier);
    if (!row) {
      res.status(401).json({ error: "Account not found." });
      return;
    }
    const ok = await bcrypt.compare(input.password, row.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Invalid password." });
      return;
    }
    if (row.status === "Banned") {
      res.status(403).json({ error: "This account has been banned." });
      return;
    }
    const user = toPublicUser(row);
    const token = signToken({ sub: user.id, role: user.role });
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [req.user!.sub]);
    if (!rows[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

const profileLabelsSchema = z.object({
  inspiredBy: z.array(z.string().max(64)).max(20).optional(),
  talents: z.array(z.string().max(32)).max(20).optional(),
  genres: z.array(z.string().max(32)).max(20).optional(),
});

const profileMetaSchema = z.object({
  avatarUrl: z.string().max(400_000).nullable().optional(),
  coverUrl: z.string().max(800_000).nullable().optional(),
  locale: z.enum(["en", "vi"]).optional(),
  labels: profileLabelsSchema.optional(),
});

router.patch("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const patch = z
      .object({
        username: z.string().min(2).max(32).optional(),
        email: z.string().email().optional(),
        bio: z.string().max(500).optional(),
        profileMeta: profileMetaSchema.optional(),
      })
      .parse(req.body);

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (patch.username) {
      fields.push(`username = $${i++}`);
      values.push(patch.username);
    }
    if (patch.email) {
      fields.push(`email = $${i++}`);
      values.push(patch.email);
    }
    if (patch.bio !== undefined) {
      fields.push(`bio = $${i++}`);
      values.push(patch.bio);
    }
    if (patch.profileMeta !== undefined) {
      fields.push(`profile_meta = $${i++}`);
      values.push(patch.profileMeta);
    }
    if (fields.length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    values.push(req.user!.sub);
    await query(`UPDATE users SET ${fields.join(", ")} WHERE id = $${i}`, values);
    const { rows } = await query<UserRow>(`SELECT * FROM users WHERE id = $1`, [req.user!.sub]);
    res.json({ user: toPublicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
