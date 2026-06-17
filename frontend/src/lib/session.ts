// Lightweight localStorage helpers for the mock session + UI settings.

const SESSION_KEY = "musiclab.session";
const SETTINGS_KEY = "musiclab.settings";

export interface AppSettings {
  emailNotifications: boolean;
  defaultPrivacy: "public" | "private";
  snapToGrid: boolean;
  autoScroll: boolean;
  hqPreview: boolean;
  /** Admin-only preferences */
  adminAlerts?: boolean;
  compactTables?: boolean;
  autoRefreshDashboard?: boolean;
  enhancedAuditTrail?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  emailNotifications: true,
  defaultPrivacy: "public",
  snapToGrid: true,
  autoScroll: true,
  hqPreview: true,
  adminAlerts: true,
  compactTables: false,
  autoRefreshDashboard: true,
  enhancedAuditTrail: false,
};

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("musiclab-settings"));
}
