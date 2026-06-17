import type { UserRow, UserPublic } from "../types.js";

export function toPublicUser(row: UserRow): UserPublic {
  const meta = row.profile_meta ?? undefined;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    bio: row.bio ?? "",
    status: row.status,
    createdAt: row.created_at.toISOString(),
    profileMeta: meta
      ? {
          avatarUrl: meta.avatarUrl ?? null,
          coverUrl: meta.coverUrl ?? null,
          labels: meta.labels
            ? {
                inspiredBy: meta.labels.inspiredBy ?? [],
                talents: meta.labels.talents ?? [],
                genres: meta.labels.genres ?? [],
              }
            : undefined,
        }
      : undefined,
  };
}
