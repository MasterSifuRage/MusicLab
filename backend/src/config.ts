import "dotenv/config";

function corsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length <= 1 ? list[0] ?? "http://localhost:5173" : list;
}

const isProd = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

if (isProd && jwtSecret === "dev-secret-change-in-production") {
  throw new Error("JWT_SECRET must be set to a strong value in production (NODE_ENV=production).");
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://musiclab:musiclab@localhost:5432/musiclab",
  jwtSecret: jwtSecret,
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  renderDir: process.env.RENDER_DIR ?? "./renders",
  corsOrigin: corsOrigins(),
  redisUrl: process.env.REDIS_URL ?? "",
  /** When false, only the dedicated worker container runs BullMQ jobs. */
  embeddedWorker: process.env.EMBEDDED_WORKER !== "false",
  /** Serve built frontend from ./public (same-origin deploy: Render, VPS nginx). */
  serveSpa: process.env.SERVE_SPA === "true",
};
