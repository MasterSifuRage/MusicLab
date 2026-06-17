import type { LucideIcon } from "lucide-react";
import {
  Home,
  Library,
  FolderOpen,
  Settings,
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { t, type Locale } from "./i18n";

export interface DashboardNavLink {
  icon: LucideIcon;
  label: string;
  path?: string;
  id?: string;
}

export function creatorSidebarLinks(locale: Locale): DashboardNavLink[] {
  return [
    { icon: Home, label: t(locale, "nav.home"), id: "home", path: "/dashboard?tab=home" },
    { icon: Library, label: t(locale, "nav.library"), path: "/library" },
    { icon: FolderOpen, label: t(locale, "nav.projects"), id: "projects", path: "/dashboard?tab=projects" },
    { icon: Settings, label: t(locale, "nav.settings"), id: "settings", path: "/dashboard?tab=settings" },
  ];
}

export function adminSidebarLinks(locale: Locale): DashboardNavLink[] {
  return [
    { icon: LayoutDashboard, label: t(locale, "nav.overview"), id: "overview", path: "/admin" },
    { icon: Users, label: t(locale, "nav.users"), id: "users", path: "/admin?tab=users" },
    { icon: AlertTriangle, label: t(locale, "nav.reports"), id: "reports", path: "/admin?tab=reports" },
    { icon: FileText, label: t(locale, "nav.logs"), id: "logs", path: "/admin?tab=logs" },
    { icon: Settings, label: t(locale, "nav.settings"), id: "settings", path: "/admin?tab=settings" },
  ];
}
