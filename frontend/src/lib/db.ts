// IndexedDB wrapper (via idb). Stores projects, asset metadata + raw audio
// blobs, users, and admin data. This is the local stand-in for the future
// PostgreSQL backend; the service layer talks only to these helpers.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Asset, Project, User, AdminReport, AdminLog } from "../types";

interface MusicLabDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { ownerId: string } };
  assets: { key: string; value: Asset; indexes: { ownerId: string } };
  assetBlobs: { key: string; value: ArrayBuffer };
  users: { key: string; value: User; indexes: { email: string } };
  reports: { key: string; value: AdminReport };
  logs: { key: string; value: AdminLog };
}

let dbPromise: Promise<IDBPDatabase<MusicLabDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MusicLabDB>("musiclab", 1, {
      upgrade(db) {
        const projects = db.createObjectStore("projects", { keyPath: "id" });
        projects.createIndex("ownerId", "ownerId");
        const assets = db.createObjectStore("assets", { keyPath: "id" });
        assets.createIndex("ownerId", "ownerId");
        db.createObjectStore("assetBlobs");
        const users = db.createObjectStore("users", { keyPath: "id" });
        users.createIndex("email", "email");
        db.createObjectStore("reports", { keyPath: "id" });
        db.createObjectStore("logs", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}
