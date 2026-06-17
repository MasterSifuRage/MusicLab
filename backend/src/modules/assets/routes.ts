import { Router } from "express";
import multer from "multer";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { join, extname } from "path";
import { query } from "../../db/pool.js";
import { uid } from "../../lib/id.js";
import { config } from "../../config.js";
import { getAudioDurationSeconds } from "../../lib/audioDuration.js";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";
import type { AssetRow } from "../../types.js";

const router = Router();
const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;

mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => cb(null, `${uid("f_")}${extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || /\.(wav|mp3|flac|ogg|m4a)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

function mapAsset(row: AssetRow) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    duration: row.duration,
    bpm: row.bpm,
    format: row.format,
    size: Number(row.size),
    uploaded: row.uploaded.toISOString().split("T")[0],
    source: row.source as "upload" | "sample",
  };
}

router.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<AssetRow>(
      `SELECT * FROM assets WHERE owner_id = $1 ORDER BY uploaded DESC`,
      [req.user!.sub]
    );
    res.json({ assets: rows.map(mapAsset) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<AssetRow>(
      `SELECT * FROM assets WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user!.sub]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    res.download(rows[0].file_path, rows[0].name);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, upload.single("file"), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { rows: usageRows } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(size), 0)::bigint AS total FROM assets WHERE owner_id = $1`,
      [req.user!.sub]
    );
    const used = Number(usageRows[0]?.total ?? 0);
    if (used + req.file.size > STORAGE_QUOTA_BYTES) {
      await unlink(req.file.path).catch(() => undefined);
      res.status(413).json({ error: "Storage quota exceeded (500 MB limit)." });
      return;
    }

    const duration = await getAudioDurationSeconds(req.file.path);
    const id = uid("a_");
    const ext = extname(req.file.originalname).slice(1).toUpperCase() || "WAV";
    await query(
      `INSERT INTO assets (id, owner_id, name, duration, format, size, file_path) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.user!.sub, req.file.originalname, duration, ext, req.file.size, req.file.path]
    );
    const { rows } = await query<AssetRow>(`SELECT * FROM assets WHERE id = $1`, [id]);
    res.status(201).json({ asset: mapAsset(rows[0]) });
  } catch (err) {
    if (req.file?.path) await unlink(req.file.path).catch(() => undefined);
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<AssetRow>(
      `SELECT * FROM assets WHERE id = $1 AND owner_id = $2`,
      [req.params.id, req.user!.sub]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }
    await query(`DELETE FROM assets WHERE id = $1 AND owner_id = $2`, [
      req.params.id,
      req.user!.sub,
    ]);
    await unlink(rows[0].file_path).catch(() => undefined);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
