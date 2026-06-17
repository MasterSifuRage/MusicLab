import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { query } from "../../db/pool.js";
import { canEdit, canView, getProjectRole } from "../../lib/projectAccess.js";
import type { JwtPayload, ProjectRow } from "../../types.js";

interface ClientInfo {
  ws: WebSocket;
  userId: string;
  username: string;
  projectId: string;
  role: "owner" | "editor" | "viewer";
}

const rooms = new Map<string, Set<ClientInfo>>();

function broadcast(projectId: string, message: object, except?: WebSocket) {
  const room = rooms.get(projectId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const client of room) {
    if (client.ws !== except && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function presenceList(projectId: string) {
  const room = rooms.get(projectId);
  if (!room) return [];
  return [...room].map((c) => ({
    userId: c.userId,
    username: c.username,
    role: c.role,
  }));
}

export function attachCollabWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    try {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      const projectId = url.searchParams.get("projectId");
      if (!token || !projectId) {
        ws.close(4001, "token and projectId required");
        return;
      }

      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      } catch {
        ws.close(4003, "invalid token");
        return;
      }

      const role = await getProjectRole(payload.sub, projectId);
      if (!canView(role)) {
        ws.close(4004, "no access");
        return;
      }

      const { rows: userRows } = await query<{ username: string }>(
        `SELECT username FROM users WHERE id = $1`,
        [payload.sub]
      );
      const username = userRows[0]?.username ?? "User";

      const { rows: projectRows } = await query<ProjectRow>(
        `SELECT * FROM projects WHERE id = $1`,
        [projectId]
      );
      const project = projectRows[0];
      if (!project) {
        ws.close(4004, "project not found");
        return;
      }

      const client: ClientInfo = {
        ws,
        userId: payload.sub,
        username,
        projectId,
        role: role!,
      };

      if (!rooms.has(projectId)) rooms.set(projectId, new Set());
      rooms.get(projectId)!.add(client);

      ws.send(
        JSON.stringify({
          type: "welcome",
          userId: payload.sub,
          role,
          version: (project as ProjectRow & { version?: number }).version ?? 0,
          state: project.state,
        })
      );
      broadcast(projectId, { type: "presence", users: presenceList(projectId) });

      ws.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "patch" && canEdit(client.role)) {
            const incomingVersion = Number(msg.version ?? 0);
            const currentVersion = (project as ProjectRow & { version?: number }).version ?? 0;
            if (incomingVersion < currentVersion) {
              ws.send(JSON.stringify({ type: "reject", reason: "stale version", version: currentVersion }));
              return;
            }

            const nextVersion = currentVersion + 1;
            await query(
              `UPDATE projects SET state = $1, version = $2, updated_at = NOW() WHERE id = $3`,
              [JSON.stringify(msg.state), nextVersion, projectId]
            );
            (project as ProjectRow & { version?: number }).version = nextVersion;
            project.state = msg.state;

            broadcast(
              projectId,
              {
                type: "state",
                version: nextVersion,
                state: msg.state,
                senderId: payload.sub,
                senderName: username,
              },
              ws
            );
            ws.send(JSON.stringify({ type: "ack", version: nextVersion }));
          } else if (msg.type === "cursor") {
            broadcast(
              projectId,
              {
                type: "cursor",
                userId: payload.sub,
                username,
                beat: msg.beat,
                trackId: msg.trackId,
              },
              ws
            );
          }
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
        }
      });

      ws.on("close", () => {
        rooms.get(projectId)?.delete(client);
        if (rooms.get(projectId)?.size === 0) rooms.delete(projectId);
        broadcast(projectId, { type: "presence", users: presenceList(projectId) });
      });
    } catch {
      ws.close(1011, "server error");
    }
  });

  console.log("[collab] WebSocket server attached at /ws");
  return wss;
}
