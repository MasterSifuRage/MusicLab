import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Link } from "react-router";
import {
  User,
  Mail,
  Shield,
  Camera,
  Save,
  Settings,
  FolderOpen,
  Pencil,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SidebarLayout } from "../components/SidebarLayout";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useProfileImagesStore } from "../../store/profileImagesStore";
import { t } from "../../lib/i18n";
import { isApiMode } from "../../lib/api";
import { creatorSidebarLinks, adminSidebarLinks } from "../../lib/dashboardNav";
import { buildProfileMeta, imagesFromMeta, labelsFromMeta } from "../../lib/profileMeta";
import { projectService } from "../../services/projects";
import {
  getProfileLabels,
  saveProfileLabels,
  type ProfileLabels,
} from "../../lib/profileLabels";
import { getProfileImages, type ProfileImages } from "../../lib/profileImages";
import {
  AVATAR_IMAGE_OPTIONS,
  COVER_IMAGE_OPTIONS,
  processImageFile,
} from "../../lib/imageUpload";
import {
  TALENT_OPTIONS,
  GENRE_OPTIONS,
  optionById,
} from "../../lib/profileOptions";

const DEMO_LABELS: ProfileLabels = {
  inspiredBy: ["Charlie Puth", "Bruno Mars"],
  talents: ["vocalist", "songwriter", "dj"],
  genres: ["pop", "hiphop", "electronic", "kpop", "lofi"],
};

function artistInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function artistColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hues = ["#0ea5e9", "#8b5cf6", "#e11d48", "#059669", "#f59e0b", "#ec4899"];
  return hues[Math.abs(hash) % hues.length];
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] text-[#888888] font-semibold uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-[12px] text-[#666666] italic">{text}</p>;
}

function ProfileCover({
  url,
  gradientClass,
  heightClass,
  isEditing,
  editLabel,
  removeLabel,
  onPick,
  onRemove,
  processing,
}: {
  url: string | null;
  gradientClass: string;
  heightClass: string;
  isEditing: boolean;
  editLabel: string;
  removeLabel: string;
  onPick: () => void;
  onRemove: () => void;
  processing?: boolean;
}) {
  return (
    <div className={`relative ${heightClass} overflow-hidden`}>
      {url ? (
        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass}`} />
      )}
      {url && <div className="absolute inset-0 bg-black/10" />}
      {isEditing && (
        <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-2 z-10">
          {url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={processing}
              className="bg-[#1e1e1e]/90 text-[#888888] px-3 py-2 rounded-lg border border-[#3e3e42] hover:text-[#e11d48] hover:border-[#e11d48]/40 transition-colors text-[11px] font-medium backdrop-blur-sm disabled:opacity-60"
            >
              {removeLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onPick}
            disabled={processing}
            className="bg-[#1e1e1e]/90 text-[#eeeeee] px-4 py-2 rounded-lg border border-[#3e3e42] flex items-center gap-1.5 hover:bg-[#333333] transition-colors text-[12px] font-medium backdrop-blur-sm disabled:opacity-60"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {editLabel}
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({
  url,
  gradientClass,
  sizeClass,
  borderClass,
  isEditing,
  changeLabel,
  removeLabel,
  onPick,
  onRemove,
  processing,
}: {
  url: string | null;
  gradientClass: string;
  sizeClass: string;
  borderClass: string;
  isEditing: boolean;
  changeLabel: string;
  removeLabel: string;
  onPick: () => void;
  onRemove: () => void;
  processing?: boolean;
}) {
  return (
    <div className={`relative group ${sizeClass}`}>
      {url ? (
        <img
          src={url}
          alt=""
          className={`${sizeClass} rounded-full ${borderClass} object-cover shadow-xl`}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full ${borderClass} bg-gradient-to-br shadow-xl ${gradientClass}`}
        />
      )}
      {isEditing && (
        <>
          <button
            type="button"
            onClick={onPick}
            disabled={processing}
            className="absolute inset-0 bg-black/55 rounded-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
            aria-label={changeLabel}
          >
            {processing ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <>
                <Camera className="w-5 h-5 text-white" />
                <span className="text-[9px] text-white font-medium px-1 text-center leading-tight">
                  {changeLabel}
                </span>
              </>
            )}
          </button>
          {url && !processing && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#1e1e1e] border border-[#3e3e42] text-[#888888] hover:text-[#e11d48] hover:border-[#e11d48]/40 flex items-center justify-center z-10"
              aria-label={removeLabel}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)!;
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const locale = useLocaleStore((s) => s.locale);
  const commitImages = useProfileImagesStore((s) => s.commit);
  const hydrateImages = useProfileImagesStore((s) => s.hydrate);
  const isAdmin = user.role === "admin";

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [artistInput, setArtistInput] = useState("");
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const [processingCover, setProcessingCover] = useState(false);

  const [savedLabels, setSavedLabels] = useState<ProfileLabels>(() => {
    const fromApi = labelsFromMeta(user.profileMeta);
    const stored = isApiMode() ? fromApi : getProfileLabels(user.id);
    const hasData =
      stored.inspiredBy.length > 0 || stored.talents.length > 0 || stored.genres.length > 0;
    if (!hasData && user.role === "creator" && !isApiMode()) return { ...DEMO_LABELS };
    return stored;
  });

  const [savedImages, setSavedImages] = useState<ProfileImages>(() =>
    isApiMode() ? imagesFromMeta(user.profileMeta) : getProfileImages(user.id),
  );

  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    bio: user.bio ?? "",
    labels: { ...savedLabels },
    images: { ...savedImages },
  });

  const avatarGradient = isAdmin ? "from-[#e11d48] to-[#0ea5e9]" : "from-[#0ea5e9] to-[#059669]";
  const coverGradient = isAdmin
    ? "from-[#e11d48]/50 to-[#0ea5e9]/50"
    : "from-[#0284c7]/50 to-[#4338ca]/50";
  const sidebarCoverGradient = isAdmin
    ? "from-[#e11d48]/40 to-[#0ea5e9]/40"
    : "from-[#0284c7]/40 to-[#4338ca]/40";

  const displayImages = isEditing ? form.images : savedImages;

  useEffect(() => {
    hydrateImages(user.id);
  }, [user.id, hydrateImages]);

  useEffect(() => {
    if (isAdmin) return;
    projectService.list(user.id).then((projects) => setProjectCount(projects.length));
  }, [user.id, isAdmin]);

  const roleLabel =
    user.role === "admin" ? t(locale, "profile.role.admin") : t(locale, "profile.role.creator");

  const settingsPath = isAdmin ? "/admin?tab=settings" : "/dashboard?tab=settings";
  const sidebarLinks = isAdmin ? adminSidebarLinks(locale) : creatorSidebarLinks(locale);
  const displayLabels = isEditing ? form.labels : savedLabels;

  const imageError = (err: unknown) => {
    const code = err instanceof Error ? err.message : "";
    if (code === "INVALID_TYPE") toast.error(t(locale, "profile.imageInvalid"));
    else if (code === "FILE_TOO_LARGE" || code === "COMPRESSED_TOO_LARGE") {
      toast.error(t(locale, "profile.imageTooLarge"));
    } else {
      toast.error(t(locale, "profile.imageTooLarge"));
    }
  };

  const handleAvatarFile = async (file: File) => {
    setProcessingAvatar(true);
    try {
      const dataUrl = await processImageFile(file, AVATAR_IMAGE_OPTIONS);
      setForm((prev) => ({
        ...prev,
        images: { ...prev.images, avatarUrl: dataUrl },
      }));
    } catch (err) {
      imageError(err);
    } finally {
      setProcessingAvatar(false);
    }
  };

  const handleCoverFile = async (file: File) => {
    setProcessingCover(true);
    try {
      const dataUrl = await processImageFile(file, COVER_IMAGE_OPTIONS);
      setForm((prev) => ({
        ...prev,
        images: { ...prev.images, coverUrl: dataUrl },
      }));
    } catch (err) {
      imageError(err);
    } finally {
      setProcessingCover(false);
    }
  };

  const onAvatarInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleAvatarFile(file);
  };

  const onCoverInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleCoverFile(file);
  };

  const toggleLabel = (group: "talents" | "genres", id: string) => {
    setForm((prev) => {
      const current = prev.labels[group];
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
      return { ...prev, labels: { ...prev.labels, [group]: next } };
    });
  };

  const addArtist = () => {
    const name = artistInput.trim();
    if (!name) return;
    if (form.labels.inspiredBy.some((a) => a.toLowerCase() === name.toLowerCase())) {
      setArtistInput("");
      return;
    }
    setForm((prev) => ({
      ...prev,
      labels: { ...prev.labels, inspiredBy: [...prev.labels.inspiredBy, name] },
    }));
    setArtistInput("");
  };

  const removeArtist = (name: string) => {
    setForm((prev) => ({
      ...prev,
      labels: {
        ...prev.labels,
        inspiredBy: prev.labels.inspiredBy.filter((a) => a !== name),
      },
    }));
  };

  const handleSave = async () => {
    if (!form.username.trim() || !form.email.trim()) {
      toast.error(t(locale, "profile.errorRequired"));
      return;
    }
    await updateProfile({
      username: form.username,
      email: form.email,
      bio: form.bio,
      profileMeta: buildProfileMeta(form.images, form.labels, user.profileMeta),
    });
    saveProfileLabels(user.id, form.labels);
    commitImages(user.id, form.images, !isApiMode());
    setSavedLabels({ ...form.labels });
    setSavedImages({ ...form.images });
    setIsEditing(false);
    toast.success(t(locale, "profile.updated"));
  };

  const handleCancel = () => {
    setForm({
      username: user.username,
      email: user.email,
      bio: user.bio ?? "",
      labels: { ...savedLabels },
      images: { ...savedImages },
    });
    setArtistInput("");
    setIsEditing(false);
  };

  const memberSince = new Date(user.createdAt ?? Date.now()).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-US",
    { month: "short", year: "numeric" },
  );

  return (
    <SidebarLayout
      title="MusicLab"
      sidebarLinks={sidebarLinks}
      avatarColor={isAdmin ? "from-[#e11d48] to-[#0ea5e9]" : "from-[#0ea5e9] to-[#059669]"}
      headerCenter={
        <div>
          <h1 className="text-[14px] text-[#eeeeee] font-medium tracking-wide">{t(locale, "profile.title")}</h1>
          <p className="text-[11px] text-[#888888] mt-0.5">{t(locale, "profile.subtitle")}</p>
        </div>
      }
    >
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onAvatarInputChange}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onCoverInputChange}
      />

      <div className="p-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="bg-[#252526] rounded-2xl border border-[#3e3e42] overflow-hidden shadow-lg">
              <ProfileCover
                url={displayImages.coverUrl}
                gradientClass={sidebarCoverGradient}
                heightClass="h-24 border-b border-[#3e3e42]"
                isEditing={isEditing}
                editLabel={t(locale, "profile.editCover")}
                removeLabel={t(locale, "profile.removeCover")}
                onPick={() => coverInputRef.current?.click()}
                onRemove={() =>
                  setForm((prev) => ({
                    ...prev,
                    images: { ...prev.images, coverUrl: null },
                  }))
                }
                processing={processingCover}
              />
              <div className="px-5 pb-5 -mt-10">
                <ProfileAvatar
                  url={displayImages.avatarUrl}
                  gradientClass={avatarGradient}
                  sizeClass="w-20 h-20"
                  borderClass="border-4 border-[#252526]"
                  isEditing={isEditing}
                  changeLabel={t(locale, "profile.changeAvatar")}
                  removeLabel={t(locale, "profile.removeAvatar")}
                  onPick={() => avatarInputRef.current?.click()}
                  onRemove={() =>
                    setForm((prev) => ({
                      ...prev,
                      images: { ...prev.images, avatarUrl: null },
                    }))
                  }
                  processing={processingAvatar}
                />
                <div className="mt-4">
                  <h2 className="text-[16px] text-[#eeeeee] font-medium truncate">{user.username}</h2>
                  <p className="text-[12px] text-[#0ea5e9]/80 truncate mt-0.5">@{user.username.toLowerCase()}</p>
                  <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md bg-[#1e1e1e] border border-[#3e3e42] text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-[#0ea5e9]" />
                    <span className="text-[#eeeeee]">{roleLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] p-4 space-y-3 text-[12px]">
              {!isAdmin && projectCount !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-[#888888] flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    {t(locale, "profile.projects")}
                  </span>
                  <span className="text-[#eeeeee] font-medium">{projectCount}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#888888]">{t(locale, "profile.memberSince")}</span>
                <span className="text-[#eeeeee] font-medium">{memberSince}</span>
              </div>
              <Link
                to={settingsPath}
                className="flex items-center justify-center gap-2 w-full mt-1 py-2.5 rounded-lg border border-[#3e3e42] text-[#cccccc] hover:text-white hover:bg-[#2a2a2d] hover:border-[#0ea5e9]/40 transition-colors"
              >
                <Settings className="w-4 h-4" />
                {t(locale, "profile.openSettings")}
              </Link>
            </div>

            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] p-4 space-y-5 text-[12px]">
              <div>
                <SectionTitle>{t(locale, "profile.inspiredBy")}</SectionTitle>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={artistInput}
                        onChange={(e) => setArtistInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addArtist())}
                        placeholder={t(locale, "profile.addArtist")}
                        className="flex-1 min-w-0 bg-[#1e1e1e] text-[#cccccc] px-3 py-2 rounded-lg border border-[#3e3e42] focus:border-[#0ea5e9] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={addArtist}
                        className="shrink-0 px-3 py-2 rounded-lg bg-[#333333] border border-[#3e3e42] text-[#eeeeee] hover:bg-[#444444] transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.labels.inspiredBy.map((artist) => (
                        <span
                          key={artist}
                          className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-[#1e1e1e] border border-[#3e3e42]"
                        >
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: artistColor(artist) }}
                          >
                            {artistInitials(artist)}
                          </span>
                          <span className="text-[#eeeeee]">{artist}</span>
                          <button
                            type="button"
                            onClick={() => removeArtist(artist)}
                            className="text-[#888888] hover:text-[#e11d48] ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : displayLabels.inspiredBy.length > 0 ? (
                  <div className="space-y-2">
                    {displayLabels.inspiredBy.map((artist) => (
                      <div key={artist} className="flex items-center gap-2.5">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ backgroundColor: artistColor(artist) }}
                        >
                          {artistInitials(artist)}
                        </span>
                        <span className="text-[#eeeeee] font-medium">{artist}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyHint text={t(locale, "profile.notSet")} />
                )}
              </div>

              <div>
                <SectionTitle>{t(locale, "profile.talents")}</SectionTitle>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {TALENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = form.labels.talents.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleLabel("talents", opt.id)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                            selected
                              ? "bg-[#0ea5e9]/15 border-[#0ea5e9]/50 text-[#eeeeee]"
                              : "bg-[#1e1e1e] border-[#3e3e42] text-[#888888] hover:text-[#cccccc] hover:border-[#555555]"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{t(locale, opt.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : displayLabels.talents.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {displayLabels.talents.map((id) => {
                      const opt = optionById(TALENT_OPTIONS, id);
                      if (!opt) return null;
                      const Icon = opt.icon;
                      return (
                        <div key={id} className="flex items-center gap-2 text-[#eeeeee]">
                          <Icon className="w-4 h-4 text-[#888888] shrink-0" />
                          <span>{t(locale, opt.labelKey)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyHint text={t(locale, "profile.notSet")} />
                )}
              </div>

              <div>
                <SectionTitle>{t(locale, "profile.genres")}</SectionTitle>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    {GENRE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const selected = form.labels.genres.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleLabel("genres", opt.id)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                            selected
                              ? "bg-[#8b5cf6]/15 border-[#8b5cf6]/50 text-[#eeeeee]"
                              : "bg-[#1e1e1e] border-[#3e3e42] text-[#888888] hover:text-[#cccccc] hover:border-[#555555]"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{t(locale, opt.labelKey)}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : displayLabels.genres.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {displayLabels.genres.map((id) => {
                      const opt = optionById(GENRE_OPTIONS, id);
                      if (!opt) return null;
                      const Icon = opt.icon;
                      return (
                        <div key={id} className="flex items-center gap-2 text-[#eeeeee]">
                          <Icon className="w-4 h-4 text-[#888888] shrink-0" />
                          <span>{t(locale, opt.labelKey)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyHint text={t(locale, "profile.notSet")} />
                )}
              </div>
            </div>
          </aside>

          <section className="bg-[#252526] rounded-2xl border border-[#3e3e42] shadow-lg overflow-hidden">
            <ProfileCover
              url={displayImages.coverUrl}
              gradientClass={coverGradient}
              heightClass="h-36 border-b border-[#3e3e42]"
              isEditing={isEditing}
              editLabel={t(locale, "profile.editCover")}
              removeLabel={t(locale, "profile.removeCover")}
              onPick={() => coverInputRef.current?.click()}
              onRemove={() =>
                setForm((prev) => ({
                  ...prev,
                  images: { ...prev.images, coverUrl: null },
                }))
              }
              processing={processingCover}
            />

            <div className="px-6 sm:px-8 py-4 flex flex-wrap justify-end gap-2 border-b border-[#3e3e42] bg-[#252526]">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center gap-1.5 bg-[#1e1e1e] border border-[#3e3e42] text-[#888888] px-4 py-2 rounded-lg hover:text-[#eeeeee] hover:bg-[#333333] transition-colors text-[12px] font-medium"
                  >
                    <X className="w-4 h-4" />
                    {t(locale, "profile.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={processingAvatar || processingCover}
                    className="flex items-center gap-1.5 bg-[#059669] text-white px-4 py-2 rounded-lg hover:bg-[#047857] transition-colors text-[12px] font-medium disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    {t(locale, "profile.save")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 bg-[#333333] border border-[#3e3e42] text-[#eeeeee] px-4 py-2 rounded-lg hover:bg-[#444444] transition-colors text-[12px] font-medium"
                >
                  <Pencil className="w-4 h-4" />
                  {t(locale, "profile.edit")}
                </button>
              )}
            </div>

            <div className="px-6 sm:px-8 py-6 space-y-5 text-[12px]">
              {isEditing && (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-[#3e3e42] bg-[#1e1e1e]/60">
                  <ProfileAvatar
                    url={form.images.avatarUrl}
                    gradientClass={avatarGradient}
                    sizeClass="w-16 h-16"
                    borderClass="border-2 border-[#3e3e42]"
                    isEditing
                    changeLabel={t(locale, "profile.changeAvatar")}
                    removeLabel={t(locale, "profile.removeAvatar")}
                    onPick={() => avatarInputRef.current?.click()}
                    onRemove={() =>
                      setForm((prev) => ({
                        ...prev,
                        images: { ...prev.images, avatarUrl: null },
                      }))
                    }
                    processing={processingAvatar}
                  />
                  <div>
                    <p className="text-[#eeeeee] font-medium mb-1">{t(locale, "profile.changeAvatar")}</p>
                    <p className="text-[11px] text-[#888888] leading-relaxed">
                      JPG, PNG, WebP or GIF. Recommended square image, at least 200×200px.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[#888888] mb-1.5 font-medium">{t(locale, "profile.username")}</label>
                  {isEditing ? (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className="w-full bg-[#1e1e1e] text-[#cccccc] pl-9 pr-4 py-2.5 rounded-lg border border-[#3e3e42] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-3 rounded-lg border border-[#3e3e42]">
                      <User className="w-4 h-4 text-[#666666] shrink-0" />
                      <span className="text-[#eeeeee]">{form.username}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#888888] mb-1.5 font-medium">{t(locale, "profile.email")}</label>
                  {isEditing ? (
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-[#1e1e1e] text-[#cccccc] pl-9 pr-4 py-2.5 rounded-lg border border-[#3e3e42] focus:border-[#0ea5e9] focus:outline-none transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-3 rounded-lg border border-[#3e3e42]">
                      <Mail className="w-4 h-4 text-[#666666] shrink-0" />
                      <span className="text-[#eeeeee]">{form.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[#888888] mb-1.5 font-medium">{t(locale, "profile.role")}</label>
                <div className="flex items-center gap-2 bg-[#1a1a1a] px-4 py-3 rounded-lg border border-[#3e3e42]">
                  <Shield className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                  <span className="text-[#eeeeee] font-medium">{roleLabel}</span>
                  <span className="text-[10px] text-[#666666] ml-auto">({t(locale, "profile.roleNote")})</span>
                </div>
              </div>

              <div>
                <label className="block text-[#888888] mb-1.5 font-medium">{t(locale, "profile.bio")}</label>
                {isEditing ? (
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={5}
                    className="w-full bg-[#1e1e1e] text-[#cccccc] p-4 rounded-lg border border-[#3e3e42] focus:border-[#0ea5e9] focus:outline-none transition-colors resize-none leading-relaxed"
                    placeholder={t(locale, "profile.bioPlaceholder")}
                  />
                ) : (
                  <div className="bg-[#1a1a1a] px-4 py-3 rounded-lg border border-[#3e3e42] min-h-[120px]">
                    <p className="text-[#cccccc] leading-relaxed whitespace-pre-wrap">
                      {form.bio || t(locale, "profile.notSet")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </SidebarLayout>
  );
}
