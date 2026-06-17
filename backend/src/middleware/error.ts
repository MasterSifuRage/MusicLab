import type { Request, Response, NextFunction } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = message.includes("not found") ? 404 : message.includes("exists") ? 409 : 500;
  res.status(status).json({ error: message });
}
