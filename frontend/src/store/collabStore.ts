import { create } from "zustand";
import type { ProjectMember, ProjectState } from "../types";

interface CollabState {
  connected: boolean;
  myRole: "owner" | "editor" | "viewer" | null;
  readOnly: boolean;
  version: number;
  members: ProjectMember[];
  remoteCursors: Record<string, { username: string; beat: number; trackId?: string }>;
  lastRemoteEditor: string | null;

  setConnected: (v: boolean) => void;
  setMyRole: (role: CollabState["myRole"]) => void;
  setVersion: (v: number) => void;
  setMembers: (members: ProjectMember[]) => void;
  setPresence: (users: { userId: string; username: string; role: string }[]) => void;
  setRemoteState: (version: number, state: ProjectState, senderName?: string) => void;
  setRemoteCursor: (userId: string, username: string, beat: number, trackId?: string) => void;
  reset: () => void;
}

export const useCollabStore = create<CollabState>((set) => ({
  connected: false,
  myRole: null,
  readOnly: false,
  version: 0,
  members: [],
  remoteCursors: {},
  lastRemoteEditor: null,

  setConnected: (v) => set({ connected: v }),
  setMyRole: (role) =>
    set({ myRole: role, readOnly: role === "viewer" }),
  setVersion: (v) => set({ version: v }),
  setMembers: (members) => set({ members }),
  setPresence: (users) =>
    set({
      members: users.map((u) => ({
        id: u.userId,
        userId: u.userId,
        username: u.username,
        email: "",
        role: u.role as ProjectMember["role"],
      })),
    }),
  setRemoteState: (version, _state, senderName) =>
    set({ version, lastRemoteEditor: senderName ?? null }),
  setRemoteCursor: (userId, username, beat, trackId) =>
    set((s) => ({
      remoteCursors: { ...s.remoteCursors, [userId]: { username, beat, trackId } },
    })),
  reset: () =>
    set({
      connected: false,
      myRole: null,
      readOnly: false,
      version: 0,
      members: [],
      remoteCursors: {},
      lastRemoteEditor: null,
    }),
}));
