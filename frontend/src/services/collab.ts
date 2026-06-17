import { apiBase, apiFetch, getToken, isApiMode } from "../lib/api";
import type { ProjectMember, ProjectState } from "../types";

function wsBase(): string {
  const api = apiBase();
  if (api) return api.replace(/^http/, "ws");
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export type CollabMessage =
  | { type: "welcome"; userId: string; role: string; version: number; state: ProjectState }
  | { type: "presence"; users: { userId: string; username: string; role: string }[] }
  | { type: "state"; version: number; state: ProjectState; senderId: string; senderName?: string }
  | { type: "ack"; version: number }
  | { type: "reject"; reason: string; version: number }
  | { type: "cursor"; userId: string; username: string; beat: number; trackId?: string }
  | { type: "error"; message: string };

type MessageHandler = (msg: CollabMessage) => void;

export class CollabClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private projectId: string | null = null;

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  connect(projectId: string) {
    if (!isApiMode()) return;
    const token = getToken();
    if (!token) return;
    this.disconnect();
    this.projectId = projectId;
    const url = `${wsBase()}/ws?token=${encodeURIComponent(token)}&projectId=${encodeURIComponent(projectId)}`;
    this.ws = new WebSocket(url);
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as CollabMessage;
        for (const h of this.handlers) h(msg);
      } catch {
        /* ignore */
      }
    };
    this.ws.onclose = () => {
      this.ws = null;
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.projectId = null;
  }

  sendPatch(version: number, state: ProjectState) {
    if (!this.connected) return;
    this.ws!.send(JSON.stringify({ type: "patch", version, state }));
  }

  sendCursor(beat: number, trackId?: string) {
    if (!this.connected) return;
    this.ws!.send(JSON.stringify({ type: "cursor", beat, trackId }));
  }
}

export const collabClient = new CollabClient();

export const collabService = {
  isAvailable(): boolean {
    return isApiMode();
  },

  async listMembers(projectId: string): Promise<{ members: ProjectMember[]; myRole: string }> {
    return apiFetch(`/api/collab/${projectId}/members`);
  },

  async invite(projectId: string, email: string, memberRole: "viewer" | "editor" = "editor") {
    return apiFetch(`/api/collab/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify({ email, memberRole }),
    });
  },

  async removeMember(projectId: string, memberId: string) {
    return apiFetch(`/api/collab/${projectId}/members/${memberId}`, { method: "DELETE" });
  },

  async setRole(projectId: string, memberId: string, role: "viewer" | "editor") {
    return apiFetch(`/api/collab/${projectId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
};
