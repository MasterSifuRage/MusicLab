const KEY_PREFIX = "musiclab.profile.images.";

export interface ProfileImages {
  avatarUrl: string | null;
  coverUrl: string | null;
}

export const EMPTY_PROFILE_IMAGES: ProfileImages = {
  avatarUrl: null,
  coverUrl: null,
};

export function getProfileImages(userId: string): ProfileImages {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    if (!raw) return { ...EMPTY_PROFILE_IMAGES };
    const parsed = JSON.parse(raw) as Partial<ProfileImages>;
    return {
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      coverUrl: typeof parsed.coverUrl === "string" ? parsed.coverUrl : null,
    };
  } catch {
    return { ...EMPTY_PROFILE_IMAGES };
  }
}

export function saveProfileImages(userId: string, images: ProfileImages) {
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(images));
}
