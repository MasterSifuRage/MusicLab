import { Queue } from "bullmq";
import { config } from "../config.js";

export const RENDER_QUEUE_NAME = "musiclab-render";

let queue: Queue | null = null;

export function getQueueConnection() {
  if (!config.redisUrl) return null;
  return { url: config.redisUrl, maxRetriesPerRequest: null as null };
}

export function getRenderQueue(): Queue | null {
  const connection = getQueueConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(RENDER_QUEUE_NAME, { connection });
  }
  return queue;
}

export interface RenderJobData {
  jobId: string;
  projectId: string;
  userId: string;
}
