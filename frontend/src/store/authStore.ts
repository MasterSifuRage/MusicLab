import { create } from "zustand";
import { authService } from "../services/auth";
import { seedIfNeeded } from "../services/seed";
import { isApiMode } from "../lib/api";
import { imagesFromMeta } from "../lib/profileMeta";
import { useProfileImagesStore } from "./profileImagesStore";
import { useLocaleStore } from "./localeStore";
import type { User, UserRole, ProfileMeta } from "../types";

export type ProfileUpdate = Partial<Pick<User, "username" | "email" | "bio">> & {
  profileMeta?: ProfileMeta;
};

interface AuthState {
  user: User | null;
  initialized: boolean;
  init: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<User>;
  loginAs: (role: Exclude<UserRole, "guest">) => Promise<User>;
  signup: (email: string, username: string, password: string) => Promise<User>;
  updateProfile: (patch: ProfileUpdate) => Promise<void>;
  logout: () => void;
}

function syncProfileImages(user: User) {
  const images = imagesFromMeta(user.profileMeta);
  useProfileImagesStore.getState().hydrate(user.id, images);
  if (!isApiMode()) {
    useProfileImagesStore.getState().commit(user.id, images);
  }
}

function syncLocale(user: User | null) {
  useLocaleStore.getState().initForUser(user);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  async init() {
    if (!isApiMode()) await seedIfNeeded();
    const user = await authService.getCurrentUser();
    if (user) syncProfileImages(user);
    syncLocale(user);
    set({ user, initialized: true });
  },

  async login(identifier, password) {
    const user = await authService.login(identifier, password);
    syncProfileImages(user);
    syncLocale(user);
    set({ user });
    return user;
  },

  async loginAs(role) {
    const user = await authService.loginAs(role);
    syncProfileImages(user);
    syncLocale(user);
    set({ user });
    return user;
  },

  async signup(email, username, password) {
    const user = await authService.signup({ email, username, password });
    syncProfileImages(user);
    syncLocale(user);
    set({ user });
    return user;
  },

  async updateProfile(patch) {
    const user = await authService.updateProfile(patch);
    syncProfileImages(user);
    syncLocale(user);
    set({ user });
  },

  logout() {
    authService.logout();
    syncLocale(null);
    set({ user: null });
  },
}));
