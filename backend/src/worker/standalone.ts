import "dotenv/config";
import { startRenderWorker } from "./renderWorker.js";

const worker = startRenderWorker();
if (!worker) {
  console.error("[worker] REDIS_URL required for standalone worker");
  process.exit(1);
}

console.log("[worker] Standalone render worker running");
