import { apiFetch, isApiMode } from "../lib/api";
import { getDB } from "../lib/db";
import { uid } from "../lib/id";
import type { AdminLog, AdminReport, User } from "../types";

export const adminService = {
  async listUsers(): Promise<User[]> {
    if (isApiMode()) {
      const { users } = await apiFetch<{ users: User[] }>("/api/admin/users");
      return users;
    }
    const db = await getDB();
    const all = await db.getAll("users");
    return all.sort((a, b) => a.username.localeCompare(b.username));
  },

  async stats(): Promise<{ totalUsers: number; activeProjects: number; bannedAccounts: number }> {
    if (isApiMode()) {
      return apiFetch("/api/admin/stats");
    }
    const db = await getDB();
    const users = await db.getAll("users");
    const projects = await db.getAll("projects");
    return {
      totalUsers: users.length,
      activeProjects: projects.length,
      bannedAccounts: users.filter((u) => u.status === "Banned").length,
    };
  },

  async setUserStatus(id: string, status: "Active" | "Banned"): Promise<void> {
    if (isApiMode()) {
      await apiFetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      return;
    }
    const db = await getDB();
    const user = await db.get("users", id);
    if (!user) return;
    user.status = status;
    await db.put("users", user);
    await this.addLog(
      `User '${user.username}' was ${status === "Banned" ? "banned" : "re-enabled"}`,
      "Admin"
    );
  },

  async listReports(): Promise<AdminReport[]> {
    if (isApiMode()) {
      const { reports } = await apiFetch<{ reports: AdminReport[] }>("/api/admin/reports");
      return reports;
    }
    const db = await getDB();
    return db.getAll("reports");
  },

  async resolveReport(id: string): Promise<void> {
    if (isApiMode()) {
      await apiFetch(`/api/admin/reports/${id}`, { method: "DELETE" });
      return;
    }
    const db = await getDB();
    await db.delete("reports", id);
  },

  async listLogs(): Promise<AdminLog[]> {
    if (isApiMode()) {
      const { logs } = await apiFetch<{ logs: AdminLog[] }>("/api/admin/logs");
      return logs;
    }
    const db = await getDB();
    const all = await db.getAll("logs");
    return all.reverse();
  },

  async addLog(action: string, admin: string): Promise<void> {
    if (isApiMode()) return;
    const db = await getDB();
    const log: AdminLog = {
      id: uid("log_"),
      action,
      admin,
      time: new Date().toLocaleString(),
    };
    await db.put("logs", log);
  },
};
