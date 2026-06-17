import { apiFetch, apiBase, getToken, isApiMode, ApiError } from "../lib/api";
import { getDB } from "../lib/db";
import { uid } from "../lib/id";
import type { Asset, AssetFormat } from "../types";

export const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;

function formatFromName(name: string): AssetFormat {
  const ext = name.split(".").pop()?.toUpperCase();
  if (ext === "MP3") return "MP3";
  if (ext === "FLAC") return "FLAC";
  if (ext === "M4A") return "M4A";
  if (ext === "OGG") return "OGG";
  return "WAV";
}

export const assetService = {
  async list(ownerId: string): Promise<Asset[]> {
    if (isApiMode()) {
      const { assets } = await apiFetch<{ assets: Asset[] }>("/api/assets");
      return assets;
    }
    const db = await getDB();
    const all = await db.getAllFromIndex("assets", "ownerId", ownerId);
    return all.sort((a, b) => b.uploaded.localeCompare(a.uploaded));
  },

  async upload(ownerId: string, file: File): Promise<Asset> {
    if (isApiMode()) {
      const form = new FormData();
      form.append("file", file);
      const { asset } = await apiFetch<{ asset: Asset }>("/api/assets", {
        method: "POST",
        body: form,
      });
      return asset;
    }
    const db = await getDB();
    const existing = await db.getAllFromIndex("assets", "ownerId", ownerId);
    const used = existing.reduce((sum, a) => sum + a.size, 0);
    if (used + file.size > STORAGE_QUOTA_BYTES) {
      throw new ApiError("Storage quota exceeded (500 MB limit).", 413);
    }
    const data = await file.arrayBuffer();
    let duration = 0;
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctor();
      const buf = await ctx.decodeAudioData(data.slice(0));
      duration = buf.duration;
      ctx.close();
    } catch {
      duration = 0;
    }
    const asset: Asset = {
      id: uid("a_"),
      ownerId,
      name: file.name,
      duration,
      bpm: null,
      format: formatFromName(file.name),
      size: file.size,
      uploaded: new Date().toISOString(),
      source: "upload",
    };
    await db.put("assets", asset);
    await db.put("assetBlobs", data, asset.id);
    return asset;
  },

  async getBlob(assetId: string): Promise<ArrayBuffer> {
    if (isApiMode()) {
      const token = getToken();
      const res = await fetch(`${apiBase()}/api/assets/${assetId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Asset data not found");
      return res.arrayBuffer();
    }
    const db = await getDB();
    const data = await db.get("assetBlobs", assetId);
    if (!data) throw new Error("Asset data not found");
    return data;
  },

  async remove(assetId: string): Promise<void> {
    if (isApiMode()) {
      await apiFetch(`/api/assets/${assetId}`, { method: "DELETE" });
      return;
    }
    const db = await getDB();
    await db.delete("assets", assetId);
    await db.delete("assetBlobs", assetId);
  },

  async usage(ownerId: string): Promise<number> {
    const all = await this.list(ownerId);
    return all.reduce((sum, a) => sum + a.size, 0);
  },
};
