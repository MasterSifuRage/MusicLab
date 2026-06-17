import { create } from "zustand";
import {
  getProfileImages,
  saveProfileImages,
  EMPTY_PROFILE_IMAGES,
  type ProfileImages,
} from "../lib/profileImages";

export const useProfileImagesStore = create<{
  images: ProfileImages;
  hydrate: (userId: string, images?: ProfileImages) => void;
  commit: (userId: string, images: ProfileImages, persistLocal?: boolean) => void;
}>((set) => ({
  images: EMPTY_PROFILE_IMAGES,
  hydrate: (userId, images) => set({ images: images ?? getProfileImages(userId) }),
  commit: (userId, images, persistLocal = true) => {
    if (persistLocal) saveProfileImages(userId, images);
    set({ images });
  },
}));
