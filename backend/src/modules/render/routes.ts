import { Router } from "express";
import { existsSync } from "fs";
import { mkdirSync } from "fs";
import { requireAuth, type AuthRequest } from "../../middleware/auth.js";
import { uid } from "../../lib/id.js";
import { query } from "../../db/pool.js";
import { config } from "../../config.js";
import { getRenderQueue } from "../../lib/queue.js";
import { processRenderInline } from "../../worker/renderWorker.js";
import { canEdit, getAccessibleProject } from "../../lib/projectAccess.js";
import { param } from "../../lib/params.js";

const router = Router();
mkdirSync(config.renderDir, { recursive: true });

interface RenderJobRow {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
  progress: number;
  output_path: string | null;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function mapJob(row: RenderJobRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    progress: row.progress,
    error: row.error,
    createdAt: row.created_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    downloadUrl: row.status === "completed" ? `/api/render/jobs/${row.id}/download` : null,
  };
}

router.post("/projects/:projectId/render", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = param(req.params.projectId);
    const access = await getAccessibleProject(req.user!.sub, projectId);
    if (!access || !canEdit(access.role)) {
      res.status(403).json({ error: "No edit access to this project" });
      return;
    }

    const jobId = uid("rj_");
    await query(
      `INSERT INTO render_jobs (id, project_id, user_id, status, progress) VALUES ($1, $2, $3, 'queued', 0)`,
      [jobId, projectId, req.user!.sub]
    );

    const payload = { jobId, projectId, userId: req.user!.sub };
    const queue = getRenderQueue();

    if (queue) {
      await queue.add("render", payload, { jobId });
    } else {
      processRenderInline(payload).catch((err) =>
        console.error("[render] inline job failed:", err)
      );
    }

    const { rows } = await query<RenderJobRow>(`SELECT * FROM render_jobs WHERE id = $1`, [jobId]);
    res.status(202).json({ job: mapJob(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs/:jobId", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<RenderJobRow>(
      `SELECT * FROM render_jobs WHERE id = $1 AND user_id = $2`,
      [param(req.params.jobId), req.user!.sub]
    );
    if (!rows[0]) {
      res.status(404).json({ error: "Render job not found" });
      return;
    }
    res.json({ job: mapJob(rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.get("/jobs/:jobId/download", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await query<RenderJobRow>(
      `SELECT * FROM render_jobs WHERE id = $1 AND user_id = $2`,
      [param(req.params.jobId), req.user!.sub]
    );
    const job = rows[0];
    if (!job || job.status !== "completed" || !job.output_path) {
      res.status(404).json({ error: "Render not ready" });
      return;
    }
    if (!existsSync(job.output_path)) {
      res.status(404).json({ error: "Output file missing" });
      return;
    }
    res.download(job.output_path, `musiclab-render-${job.project_id}.wav`);
  } catch (err) {
    next(err);
  }
});

export default router;
