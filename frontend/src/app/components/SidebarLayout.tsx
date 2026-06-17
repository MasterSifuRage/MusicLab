import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { LogOut, User, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { useProfileImagesStore } from "../../store/profileImagesStore";
import { t } from "../../lib/i18n";
import { MusicLabLogo } from "./MusicLabLogo";

interface SidebarLink {
  icon: React.ElementType;
  label: string;
  path?: string;
  id?: string;
}

interface SidebarLayoutProps {
  title: string;
  sidebarLinks: SidebarLink[];
  activeId?: string;
  onLinkClick?: (id: string) => void;
  headerCenter?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  avatarColor?: string;
}

export function SidebarLayout({
  title,
  sidebarLinks,
  activeId,
  onLinkClick,
  headerCenter,
  headerActions,
  children,
  avatarColor = "from-[#ef4444] to-[#fbbf24]",
}: SidebarLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const profileAvatarUrl = useProfileImagesStore((s) => s.images.avatarUrl);
  const hydrateImages = useProfileImagesStore((s) => s.hydrate);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) hydrateImages(user.id);
  }, [user?.id, hydrateImages]);

  const handleLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login");
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#1e1e1e] flex font-sans text-[13px] select-none text-[#cccccc]">
      {/* Left Sidebar */}
      <aside
        className={`${
          isCollapsed ? "w-14" : "w-56"
        } bg-[#252526] border-r border-[#3e3e42] flex flex-col transition-all duration-150 shrink-0 z-30 overflow-visible relative`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 w-6 h-6 bg-[#333333] border border-[#3e3e42] rounded-full flex items-center justify-center text-[#cccccc] hover:bg-[#444444] hover:text-white transition-none z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <div className={`flex items-center gap-2.5 p-4 mb-2 border-b border-[#3e3e42] ${isCollapsed ? "justify-center" : ""}`}>
          <MusicLabLogo size={28} />
          {!isCollapsed && <span className="text-[14px] text-[#eeeeee] font-medium tracking-wide truncate">{title}</span>}
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto no-scrollbar font-medium">
          {sidebarLinks.map((link, idx) => {
            const Icon = link.icon;
            const isActive =
              link.id && activeId !== undefined
                ? activeId === link.id
                : link.path
                  ? link.path.includes("?")
                    ? `${location.pathname}${location.search}` === link.path
                    : location.pathname === link.path && location.search === ""
                  : false;

            const content = (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-[#888888]"}`} />
                {!isCollapsed && <span className="truncate text-[13px]">{link.label}</span>}
              </>
            );

            const className = `flex items-center gap-3 py-2 rounded-md transition-colors ${
              isCollapsed ? "justify-center px-0" : "px-3"
            } ${
              isActive
                ? "bg-[#37373d] text-white border border-[#3e3e42] shadow-sm"
                : "text-[#888888] hover:text-[#cccccc] hover:bg-[#2a2a2d] border border-transparent"
            }`;

            if (link.path) {
              return (
                <Link key={idx} to={link.path} className={className} title={isCollapsed ? link.label : undefined}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => link.id && onLinkClick?.(link.id)}
                className={`w-full ${className}`}
                title={isCollapsed ? link.label : undefined}
              >
                {content}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#3e3e42]">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 py-2 rounded-md text-[#e11d48] hover:bg-[#e11d48]/10 hover:border-[#e11d48]/30 border border-transparent transition-colors font-medium ${
              isCollapsed ? "justify-center px-0" : "px-3"
            }`}
            title={isCollapsed ? "Log Out" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>{t(locale, "nav.logout")}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#1e1e1e] min-w-0 relative z-10">
        {/* Top Header */}
        <header className="bg-[#252526] border-b border-[#3e3e42] px-5 py-2 h-14 flex items-center justify-between flex-shrink-0 z-50">
          <div className="flex-1 text-[13px] font-sans">{headerCenter}</div>
          <div className="flex items-center gap-3">
            {headerActions}
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={`w-8 h-8 rounded-full border border-[#3e3e42] hover:brightness-110 transition-none overflow-hidden ${
                  profileAvatarUrl ? "bg-[#1e1e1e]" : `bg-gradient-to-br ${avatarColor}`
                }`}
              >
                {profileAvatarUrl && (
                  <img src={profileAvatarUrl} alt="" className="w-full h-full object-cover" />
                )}
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#252526] border border-[#3e3e42] rounded-xl shadow-xl py-1 z-50 overflow-hidden">
                  <Link
                    to="/profile"
                    className={`w-full flex items-center gap-2 px-3 py-1.5 transition-none text-left ${
                      location.pathname === "/profile"
                        ? "text-white bg-[#04395e]"
                        : "text-[#cccccc] hover:text-white hover:bg-[#04395e]"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{t(locale, "nav.profile")}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[#e11d48] hover:bg-[#e11d48]/10 transition-none text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t(locale, "nav.logout")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(90deg, #252526 1px, transparent 1px), linear-gradient(90deg, rgba(37,37,38,0.4) 1px, transparent 1px)", backgroundSize: "120px 100%, 30px 100%", opacity: 0.2 }} />
          <div className="relative z-10 h-full">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
}
