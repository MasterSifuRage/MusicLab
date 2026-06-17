const KEY_PREFIX = "musiclab.profile.labels.";

export interface ProfileLabels {
  inspiredBy: string[];
  talents: string[];
  genres: string[];
}

export const EMPTY_PROFILE_LABELS: ProfileLabels = {
  inspiredBy: [],
  talents: [],
  genres: [],
};

export function getProfileLabels(userId: string): ProfileLabels {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    if (!raw) return { ...EMPTY_PROFILE_LABELS };
    const parsed = JSON.parse(raw) as Partial<ProfileLabels>;
    return {
      inspiredBy: Array.isArray(parsed.inspiredBy) ? parsed.inspiredBy : [],
      talents: Array.isArray(parsed.talents) ? parsed.talents : [],
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
    };
  } catch {
    return { ...EMPTY_PROFILE_LABELS };
  }
}

export function saveProfileLabels(userId: string, labels: ProfileLabels) {
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(labels));
}
