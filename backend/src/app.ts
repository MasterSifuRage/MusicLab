import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./modules/auth/routes.js";
import projectRoutes from "./modules/projects/routes.js";
import assetRoutes from "./modules/assets/routes.js";
import adminRoutes from "./modules/admin/routes.js";
import renderRoutes from "./modules/render/routes.js";
import collabRoutes from "./modules/collab/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "musiclab-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/assets", assetRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/render", renderRoutes);
  app.use("/api/collab", collabRoutes);

  if (config.serveSpa) {
    const spaDir = path.join(__dirname, "../public");
    app.use(express.static(spaDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(spaDir, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(errorHandler);
  return app;
}
