import { create } from "zustand";
import {
  getStoredLocale,
  resolveLocale,
  setStoredLocale,
  type Locale,
} from "../lib/i18n";
import type { User } from "../types";

interface LocaleState {
  locale: Locale;
  userId: string | null;
  setLocale: (locale: Locale) => void;
  initForUser: (user: User | null) => void;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: "en",
  userId: null,

  setLocale: (locale) => {
    const userId = get().userId;
    setStoredLocale(locale, userId);
    set({ locale });
  },

  initForUser: (user) => {
    const userId = user?.id ?? null;
    const locale = user
      ? resolveLocale({ userId, profileMeta: user.profileMeta })
      : getStoredLocale(null);
    setStoredLocale(locale, userId);
    set({ locale, userId });
  },
}));
