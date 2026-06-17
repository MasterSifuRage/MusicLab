import { apiBase, apiFetch, getToken, isApiMode } from "../lib/api";
import type { RenderJob } from "../types";

export const renderService = {
  isAvailable(): boolean {
    return isApiMode();
  },

  async queue(projectId: string): Promise<RenderJob> {
    const { job } = await apiFetch<{ job: RenderJob }>(`/api/render/projects/${projectId}/render`, {
      method: "POST",
    });
    return job;
  },

  async getStatus(jobId: string): Promise<RenderJob> {
    const { job } = await apiFetch<{ job: RenderJob }>(`/api/render/jobs/${jobId}`);
    return job;
  },

  async pollUntilDone(jobId: string, onProgress?: (job: RenderJob) => void): Promise<RenderJob> {
    for (let i = 0; i < 120; i++) {
      const job = await this.getStatus(jobId);
      onProgress?.(job);
      if (job.status === "completed" || job.status === "failed") return job;
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error("Render timed out");
  },

  downloadUrl(jobId: string): string | null {
    if (!isApiMode() || !getToken()) return null;
    return `${apiBase()}/api/render/jobs/${jobId}/download`;
  },

  async download(jobId: string, filename: string) {
    const url = this.downloadUrl(jobId);
    const token = getToken();
    if (!url || !token) throw new Error("Cannot download");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
