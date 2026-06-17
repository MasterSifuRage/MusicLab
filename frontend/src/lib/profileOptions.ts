import type { LucideIcon } from "lucide-react";
import {
  Mic,
  PenLine,
  Disc3,
  HandMetal,
  Music,
  Headphones,
  AudioWaveform,
  Heart,
  Radio,
} from "lucide-react";
import type { I18nKey } from "./i18n";

export interface ProfileOption {
  id: string;
  icon: LucideIcon;
  labelKey: I18nKey;
}

export const TALENT_OPTIONS: ProfileOption[] = [
  { id: "vocalist", icon: Mic, labelKey: "profile.talent.vocalist" },
  { id: "songwriter", icon: PenLine, labelKey: "profile.talent.songwriter" },
  { id: "dj", icon: Disc3, labelKey: "profile.talent.dj" },
  { id: "fan", icon: HandMetal, labelKey: "profile.talent.fan" },
  { id: "other", icon: Music, labelKey: "profile.talent.other" },
];

export const GENRE_OPTIONS: ProfileOption[] = [
  { id: "pop", icon: Mic, labelKey: "profile.genre.pop" },
  { id: "hiphop", icon: Headphones, labelKey: "profile.genre.hiphop" },
  { id: "electronic", icon: AudioWaveform, labelKey: "profile.genre.electronic" },
  { id: "kpop", icon: Heart, labelKey: "profile.genre.kpop" },
  { id: "lofi", icon: Radio, labelKey: "profile.genre.lofi" },
  { id: "other", icon: Music, labelKey: "profile.genre.other" },
];

export function optionById(options: ProfileOption[], id: string) {
  return options.find((o) => o.id === id);
}
