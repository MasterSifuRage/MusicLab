import { apiFetch, isApiMode, setToken } from "../lib/api";
import { getDB } from "../lib/db";
import { uid } from "../lib/id";
import { getSessionUserId, setSessionUserId } from "../lib/session";
import type { User, ProfileMeta } from "../types";

export type ProfileUpdate = Partial<Pick<User, "username" | "email" | "bio">> & {
  profileMeta?: ProfileMeta;
};

export interface SignupInput {
  email: string;
  username: string;
  password: string;
}

async function findLocalByIdentifier(identifier: string): Promise<User | undefined> {
  const db = await getDB();
  const all = await db.getAll("users");
  const id = identifier.trim().toLowerCase();
  return all.find(
    (u) => u.email.toLowerCase() === id || u.username.toLowerCase() === id
  );
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    if (isApiMode()) {
      try {
        const { user } = await apiFetch<{ user: User }>("/api/auth/me");
        setSessionUserId(user.id);
        return user;
      } catch {
        setToken(null);
        setSessionUserId(null);
        return null;
      }
    }
    const id = getSessionUserId();
    if (!id) return null;
    const db = await getDB();
    return (await db.get("users", id)) ?? null;
  },

  async login(identifier: string, password: string): Promise<User> {
    if (isApiMode()) {
      const { user, token } = await apiFetch<{ user: User; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      setToken(token);
      setSessionUserId(user.id);
      return user;
    }
    const user = await findLocalByIdentifier(identifier);
    if (!user) throw new Error("Account not found. Try a demo account or sign up.");
    if (user.status === "Banned") throw new Error("This account has been banned.");
    setSessionUserId(user.id);
    return user;
  },

  async loginAs(role: Exclude<UserRole, "guest">): Promise<User> {
    if (isApiMode()) {
      const creds =
        role === "admin"
          ? { identifier: "admin@musiclab.com", password: "demo1234" }
          : { identifier: "creator@musiclab.com", password: "demo1234" };
      return this.login(creds.identifier, creds.password);
    }
    const db = await getDB();
    const all = await db.getAll("users");
    const user = all.find((u) => u.role === role && u.status === "Active");
    if (!user) throw new Error(`No demo ${role} account available.`);
    setSessionUserId(user.id);
    return user;
  },

  async signup(input: SignupInput): Promise<User> {
    if (isApiMode()) {
      const { user, token } = await apiFetch<{ user: User; token: string }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setToken(token);
      setSessionUserId(user.id);
      return user;
    }
    const db = await getDB();
    const existing = await findLocalByIdentifier(input.email);
    if (existing) throw new Error("An account with that email already exists.");
    const user: User = {
      id: uid("u_"),
      username: input.username.trim(),
      email: input.email.trim(),
      role: "creator",
      bio: "",
      status: "Active",
      createdAt: new Date().toISOString(),
    };
    await db.put("users", user);
    setSessionUserId(user.id);
    return user;
  },

  async updateProfile(patch: ProfileUpdate): Promise<User> {
    if (isApiMode()) {
      const { user } = await apiFetch<{ user: User }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      return user;
    }
    const current = await this.getCurrentUser();
    if (!current) throw new Error("Not signed in.");
    const updated = { ...current, ...patch };
    const db = await getDB();
    await db.put("users", updated);
    return updated;
  },

  logout() {
    setToken(null);
    setSessionUserId(null);
  },
};
