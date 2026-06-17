import { Link } from "react-router";
import { toast } from "sonner";
import {
  Bell, Globe, Lock, Sliders, User, Shield, RefreshCw, Table2, Mail,
} from "lucide-react";
import { useState, type ElementType, type ReactNode } from "react";
import { getSettings, saveSettings, type AppSettings } from "../../lib/session";
import { t, type Locale } from "../../lib/i18n";
import { withProfileLocale } from "../../lib/profileMeta";
import { useLocaleStore } from "../../store/localeStore";
import { useAuthStore } from "../../store/authStore";

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition-colors relative border shrink-0 ${
        on ? "bg-[#0ea5e9]/25 border-[#0ea5e9]" : "bg-[#1e1e1e] border-[#3e3e42]"
      }`}
    >
      <div
        className={`absolute top-[3px] left-[3px] bg-[#eeeeee] w-4 h-4 rounded-full transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-[#3e3e42]/60 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-[#eeeeee] text-[13px] font-medium">{title}</p>
        {description && <p className="text-[#888888] text-[12px] mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: ElementType;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[#252526] rounded-xl border border-[#3e3e42] p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#3e3e42]/80">
        <Icon className="w-4 h-4 text-[#0ea5e9]" />
        <h2 className="text-[14px] text-[#eeeeee] font-medium">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface SettingsPanelProps {
  variant: "creator" | "admin";
}

export function SettingsPanel({ variant }: SettingsPanelProps) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());

  const apply = () => {
    saveSettings(settings);
    toast.success(t(locale, "settings.saved"));
  };

  const setLang = async (lang: Locale) => {
    setLocale(lang);
    if (user) {
      try {
        await updateProfile({
          profileMeta: withProfileLocale(user.profileMeta, lang),
        });
      } catch {
        toast.error(t(lang, "settings.saveError"));
        return;
      }
    }
    toast.success(t(lang, "settings.saved"));
  };

  const isCreator = variant === "creator";

  return (
    <div className="p-6 w-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-[20px] text-[#eeeeee] font-semibold">
              {t(locale, isCreator ? "settings.title.creator" : "settings.title.admin")}
            </h1>
            <p className="text-[#888888] text-[13px] mt-1">
              {t(locale, isCreator ? "settings.subtitle.creator" : "settings.subtitle.admin")}
            </p>
          </div>
          <button
            onClick={apply}
            className="bg-[#0ea5e9] text-white hover:bg-[#0284c7] px-6 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm shadow-[#0ea5e9]/20 shrink-0"
          >
            {t(locale, "settings.apply")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Language — full width on top row spanning 2 cols on lg */}
          <Card icon={Globe} title={t(locale, "settings.language")} className="lg:col-span-2">
            <p className="text-[#888888] text-[12px] mb-4">{t(locale, "settings.language.desc")}</p>
            <div className="flex flex-wrap gap-3">
              {(["en", "vi"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLang(lang)}
                  className={`min-w-[140px] flex-1 py-3 px-4 rounded-lg border text-[13px] font-medium transition-colors ${
                    locale === lang
                      ? "bg-[#0ea5e9]/15 border-[#0ea5e9] text-[#0ea5e9]"
                      : "border-[#3e3e42] bg-[#1e1e1e] text-[#888888] hover:bg-[#2a2a2d] hover:text-[#cccccc]"
                  }`}
                >
                  {t(locale, lang === "en" ? "settings.lang.en" : "settings.lang.vi")}
                </button>
              ))}
            </div>
          </Card>

          <Card icon={Bell} title={t(locale, "settings.notifications")}>
            <SettingRow
              title={t(locale, isCreator ? "settings.emailNotif" : "settings.adminAlerts")}
              description={t(locale, isCreator ? "settings.emailNotif.desc" : "settings.adminAlerts.desc")}
            >
              <Toggle
                on={settings.emailNotifications}
                onChange={(v) => setSettings((s) => ({ ...s, emailNotifications: v }))}
              />
            </SettingRow>
          </Card>

          {isCreator ? (
            <Card icon={Lock} title={t(locale, "settings.privacy")}>
              <p className="text-[#888888] text-[12px] mb-4">{t(locale, "settings.privacy.desc")}</p>
              <div className="flex gap-3">
                {(["public", "private"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, defaultPrivacy: p }))}
                    className={`flex-1 py-2.5 rounded-lg border transition-colors text-[13px] font-medium ${
                      settings.defaultPrivacy === p
                        ? p === "public"
                          ? "bg-[#059669]/10 border-[#059669] text-[#059669]"
                          : "bg-[#0ea5e9]/10 border-[#0ea5e9] text-[#0ea5e9]"
                        : "border-[#3e3e42] bg-[#1e1e1e] text-[#888888] hover:bg-[#2a2a2d]"
                    }`}
                  >
                    {t(locale, p === "public" ? "settings.public" : "settings.private")}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card icon={Table2} title={t(locale, "nav.users")}>
              <SettingRow title={t(locale, "settings.compactTables")} description={t(locale, "settings.compactTables.desc")}>
                <Toggle
                  on={settings.compactTables ?? false}
                  onChange={(v) => setSettings((s) => ({ ...s, compactTables: v }))}
                />
              </SettingRow>
              <SettingRow title={t(locale, "settings.autoRefresh")} description={t(locale, "settings.autoRefresh.desc")}>
                <Toggle
                  on={settings.autoRefreshDashboard ?? true}
                  onChange={(v) => setSettings((s) => ({ ...s, autoRefreshDashboard: v }))}
                />
              </SettingRow>
            </Card>
          )}

          {isCreator && (
            <Card icon={Sliders} title={t(locale, "settings.editor")} className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
                <SettingRow title={t(locale, "settings.snapGrid")} description={t(locale, "settings.snapGrid.desc")}>
                  <Toggle on={settings.snapToGrid} onChange={(v) => setSettings((s) => ({ ...s, snapToGrid: v }))} />
                </SettingRow>
                <SettingRow title={t(locale, "settings.autoScroll")} description={t(locale, "settings.autoScroll.desc")}>
                  <Toggle on={settings.autoScroll} onChange={(v) => setSettings((s) => ({ ...s, autoScroll: v }))} />
                </SettingRow>
                <SettingRow title={t(locale, "settings.hqPreview")} description={t(locale, "settings.hqPreview.desc")}>
                  <Toggle on={settings.hqPreview} onChange={(v) => setSettings((s) => ({ ...s, hqPreview: v }))} />
                </SettingRow>
              </div>
            </Card>
          )}

          {!isCreator && (
            <Card icon={Shield} title={t(locale, "settings.security")} className="lg:col-span-2">
              <SettingRow title={t(locale, "settings.auditTrail")} description={t(locale, "settings.auditTrail.desc")}>
                <Toggle
                  on={settings.enhancedAuditTrail ?? false}
                  onChange={(v) => setSettings((s) => ({ ...s, enhancedAuditTrail: v }))}
                />
              </SettingRow>
              <p className="text-[#666666] text-[11px] mt-3 flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {t(locale, "settings.sessionNote")}
              </p>
            </Card>
          )}

          {isCreator && (
            <Card icon={User} title={t(locale, "settings.account")} className="lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-[#888888] text-[12px]">{t(locale, "settings.account.desc")}</p>
                <Link
                  to="/profile"
                  className="inline-flex items-center justify-center gap-2 bg-[#333333] border border-[#3e3e42] text-[#eeeeee] px-5 py-2.5 rounded-lg hover:bg-[#444444] transition-colors text-[13px] font-medium shrink-0"
                >
                  <User className="w-4 h-4" />
                  {t(locale, "settings.openProfile")}
                </Link>
              </div>
            </Card>
          )}

          {!isCreator && (
            <Card icon={RefreshCw} title={t(locale, "nav.logs")} className="lg:col-span-2">
              <p className="text-[#888888] text-[12px]">
                {locale === "vi"
                  ? "Tải nhật ký và lọc báo cáo từ các tab Tổng quan / Nhật ký hệ thống."
                  : "Download logs and filter reports from the Overview / System Logs tabs."}
              </p>
            </Card>
          )}
        </div>

        <div className="flex justify-end mt-6 lg:hidden">
          <button
            onClick={apply}
            className="w-full sm:w-auto bg-[#0ea5e9] text-white hover:bg-[#0284c7] px-6 py-2.5 rounded-lg text-[13px] font-medium"
          >
            {t(locale, "settings.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
