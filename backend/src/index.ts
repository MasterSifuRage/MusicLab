import { createServer } from "http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { attachCollabWebSocket } from "./modules/collab/wsHub.js";
import { startRenderWorker } from "./worker/renderWorker.js";

const app = createApp();
app.set("trust proxy", 1);

const server = createServer(app);
attachCollabWebSocket(server);

if (config.embeddedWorker) {
  startRenderWorker();
}

server.listen(config.port, "0.0.0.0", () => {
  console.log(`MusicLab API listening on port ${config.port}`);
});
