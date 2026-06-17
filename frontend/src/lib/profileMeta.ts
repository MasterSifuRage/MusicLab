import type { ProfileImages } from "./profileImages";
import { EMPTY_PROFILE_IMAGES } from "./profileImages";
import type { ProfileLabels } from "./profileLabels";
import { EMPTY_PROFILE_LABELS } from "./profileLabels";
import type { Locale } from "./i18n";
import type { ProfileMeta } from "../types";

export function imagesFromMeta(meta?: ProfileMeta | null): ProfileImages {
  if (!meta) return { ...EMPTY_PROFILE_IMAGES };
  return {
    avatarUrl: meta.avatarUrl ?? null,
    coverUrl: meta.coverUrl ?? null,
  };
}

export function labelsFromMeta(meta?: ProfileMeta | null): ProfileLabels {
  if (!meta?.labels) return { ...EMPTY_PROFILE_LABELS };
  return {
    inspiredBy: Array.isArray(meta.labels.inspiredBy) ? meta.labels.inspiredBy : [],
    talents: Array.isArray(meta.labels.talents) ? meta.labels.talents : [],
    genres: Array.isArray(meta.labels.genres) ? meta.labels.genres : [],
  };
}

export function buildProfileMeta(
  images: ProfileImages,
  labels: ProfileLabels,
  existing?: ProfileMeta | null,
): ProfileMeta {
  return {
    ...existing,
    avatarUrl: images.avatarUrl,
    coverUrl: images.coverUrl,
    labels: {
      inspiredBy: labels.inspiredBy,
      talents: labels.talents,
      genres: labels.genres,
    },
  };
}

export function withProfileLocale(meta: ProfileMeta | null | undefined, locale: Locale): ProfileMeta {
  return { ...(meta ?? {}), locale };
}
