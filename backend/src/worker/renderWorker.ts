import { mkdirSync } from "fs";
import { join } from "path";
import { Worker } from "bullmq";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { renderProjectToWav } from "../audio/mixer.js";
import { encodeWavFile } from "../audio/wavIo.js";
import { getQueueConnection, RENDER_QUEUE_NAME, type RenderJobData } from "../lib/queue.js";
import type { ProjectRow } from "../types.js";

mkdirSync(config.renderDir, { recursive: true });

async function processRenderJob(data: RenderJobData) {
  const { jobId, projectId, userId } = data;

  await query(`UPDATE render_jobs SET status = 'active', progress = 5 WHERE id = $1`, [jobId]);

  const { rows } = await query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [projectId]);
  const project = rows[0];
  if (!project) throw new Error("Project not found");

  const outputPath = join(config.renderDir, `${jobId}.wav`);

  const pcm = await renderProjectToWav(project.state as never, project.owner_id, async (pct) => {
    await query(`UPDATE render_jobs SET progress = $1 WHERE id = $2`, [pct, jobId]);
  });

  encodeWavFile(pcm, outputPath);

  await query(
    `UPDATE render_jobs SET status = 'completed', progress = 100, output_path = $1, completed_at = NOW() WHERE id = $2`,
    [outputPath, jobId]
  );

  console.log(`[render] completed job ${jobId} for project ${projectId} (user ${userId})`);
}

export function startRenderWorker() {
  const connection = getQueueConnection();
  if (!connection) {
    console.log("[render] Redis not configured — background worker disabled (inline fallback available)");
    return null;
  }

  const worker = new Worker<RenderJobData>(
    RENDER_QUEUE_NAME,
    async (job) => {
      try {
        await processRenderJob(job.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Render failed";
        await query(
          `UPDATE render_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE id = $2`,
          [message, job.data.jobId]
        );
        throw err;
      }
    },
    { connection, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[render] job ${job?.id} failed:`, err.message);
  });

  console.log("[render] BullMQ worker started");
  return worker;
}

/** Process without Redis (dev fallback). */
export async function processRenderInline(data: RenderJobData) {
  try {
    await processRenderJob(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    await query(
      `UPDATE render_jobs SET status = 'failed', error = $1, completed_at = NOW() WHERE id = $2`,
      [message, data.jobId]
    );
    throw err;
  }
}
