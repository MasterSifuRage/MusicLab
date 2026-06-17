import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Bell, Plus, Play, Trash2, Edit2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SidebarLayout } from "../components/SidebarLayout";
import { SettingsPanel } from "../components/SettingsPanel";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { t } from "../../lib/i18n";
import { creatorSidebarLinks } from "../../lib/dashboardNav";
import { projectService } from "../../services/projects";
import { getSettings } from "../../lib/session";
import { timeAgo } from "../../lib/format";
import type { Project } from "../../types";

const trendingTracks = [
  { id: 1, title: "Midnight Dreams", artist: "DJMaster", plays: "1.2M" },
  { id: 2, title: "Electric Soul", artist: "SynthWave", plays: "980K" },
  { id: 3, title: "Urban Jungle", artist: "BeatMaker", plays: "750K" },
];

function HomeView({ projects, username }: { projects: Project[]; username: string }) {
  return (
    <div className="p-6">
      <h1 className="text-[18px] text-[#eeeeee] mb-1 font-medium">Hello, {username}</h1>
      <p className="text-[13px] text-[#888888] mb-8">Ready to make some music today?</p>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[12px] text-[#888888] font-medium uppercase tracking-wider">Recent Projects</h2>
          <Link to="/dashboard?tab=projects" className="text-[#0ea5e9] hover:text-[#38bdf8] text-[12px] transition-colors">
            View All
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="bg-[#252526] border border-dashed border-[#3e3e42] rounded-xl p-10 text-center text-[#888888]">
            <p className="text-[13px] mb-3">You have no projects yet.</p>
            <Link to="/editor" className="inline-flex items-center gap-2 bg-[#0ea5e9] text-white px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#0284c7] transition-colors">
              <Plus className="w-4 h-4" /> Create your first project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                to={`/editor/${project.id}`}
                className="group bg-[#252526] rounded-xl overflow-hidden hover:brightness-110 transition-all duration-200 border border-[#3e3e42] hover:border-[#0ea5e9]/50 shadow-sm"
              >
                <div className="h-28 relative" style={{ backgroundColor: project.coverColor }}>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-[#eeeeee] text-[14px] mb-1 truncate font-medium">{project.name}</h3>
                  <p className="text-[12px] text-[#888888]">Last edited {timeAgo(project.updatedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[12px] text-[#888888] mb-4 font-medium uppercase tracking-wider">Explore Trending Tracks</h2>
        <div className="space-y-2">
          {trendingTracks.map((track) => (
            <div key={track.id} className="flex items-center gap-4 bg-[#252526] p-3 rounded-xl hover:bg-[#2a2a2d] transition-colors border border-[#3e3e42] shadow-sm">
              <button className="w-10 h-10 bg-[#e11d48] rounded-full flex items-center justify-center hover:bg-[#be123c] transition-colors shadow-sm shadow-[#e11d48]/20">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </button>
              <div className="flex-1">
                <h3 className="text-[#eeeeee] text-[14px] font-medium">{track.title}</h3>
                <p className="text-[12px] text-[#888888]">{track.artist}</p>
              </div>
              <div className="text-[#888888] text-[12px] bg-[#1e1e1e] px-2 py-1 rounded-md border border-[#3e3e42]">{track.plays} plays</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProjectsView({
  projects,
  loading,
  onProjectAction,
}: {
  projects: Project[];
  loading: boolean;
  onProjectAction: (action: "edit" | "delete", project: Project) => void;
}) {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[18px] text-[#eeeeee] font-medium">My Projects</h1>
        <Link to="/editor" className="bg-[#0ea5e9] text-white hover:bg-[#0284c7] px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium shadow-sm shadow-[#0ea5e9]/20">
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#3e3e42] bg-[#1e1e1e]">
              <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px] w-2/5">Project Name</th>
              <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Status</th>
              <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Last Edited</th>
              <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px] w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-[#3e3e42]/50 hover:bg-[#2a2a2d] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md shadow-sm" style={{ backgroundColor: project.coverColor }} />
                    <Link to={`/editor/${project.id}`} className="text-[#eeeeee] font-medium group-hover:text-[#0ea5e9] transition-colors">
                      {project.name}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 text-[11px] rounded-md font-medium border ${
                    project.status === "Public" ? "bg-[#059669]/10 text-[#059669] border-[#059669]/20" : "bg-[#1e1e1e] text-[#888888] border-[#3e3e42]"
                  }`}>
                    {project.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#888888]">{timeAgo(project.updatedAt)}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button onClick={() => onProjectAction("edit", project)} className="text-[#888888] hover:text-[#0ea5e9] transition-colors p-1.5 rounded-md hover:bg-[#0ea5e9]/10">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onProjectAction("delete", project)} className="text-[#888888] hover:text-[#e11d48] transition-colors p-1.5 rounded-md hover:bg-[#e11d48]/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#888888]">No projects found. Create one to get started!</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-[#888888]">
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsView() {
  return <SettingsPanel variant="creator" />;
}

export function CreatorDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "home";
  const user = useAuthStore((s) => s.user)!;
  const locale = useLocaleStore((s) => s.locale);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifPopup, setShowNotifPopup] = useState(false);
  const [actionPopup, setActionPopup] = useState<{ action: "edit" | "delete"; project: Project } | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      const list = await projectService.list(user.id);
      setProjects(list);
      setLoading(false);
    },
    [user.id]
  );

  useEffect(() => {
    refresh();
  }, [refresh, tab]);

  const sidebarLinks = creatorSidebarLinks(locale);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const settings = getSettings();
      const project = await projectService.create(user.id, "Untitled Project", settings.defaultPrivacy);
      navigate(`/editor/${project.id}`);
    } finally {
      setCreating(false);
    }
  };

  const executeAction = async () => {
    if (!actionPopup) return;
    if (actionPopup.action === "delete") {
      await projectService.remove(actionPopup.project.id);
      toast.success(`Deleted "${actionPopup.project.name}".`);
    } else {
      await projectService.togglePrivacy(actionPopup.project.id);
      toast.success("Privacy updated.");
    }
    setActionPopup(null);
    refresh();
  };

  const renderContent = () => {
    switch (tab) {
      case "projects":
        return <ProjectsView projects={projects} loading={loading} onProjectAction={(action, project) => setActionPopup({ action, project })} />;
      case "settings":
        return <SettingsView />;
      default:
        return <HomeView projects={projects} username={user.username} />;
    }
  };

  return (
    <SidebarLayout
      title="MusicLab"
      sidebarLinks={sidebarLinks}
      activeId={tab}
      avatarColor="from-[#0ea5e9] to-[#059669]"
      headerCenter={<div className="flex-1" />}
      headerActions={
        <>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 bg-[#059669] text-white px-3 py-1 rounded-[2px] hover:bg-[#047857] transition-none font-medium text-[11px] disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {t(locale, "nav.createProject")}
          </button>
          <div className="relative">
            <button onClick={() => setShowNotifPopup(!showNotifPopup)} className="relative p-1 text-[#888888] hover:text-white transition-none hover:bg-[#333333] rounded-[2px]">
              <Bell className="w-4 h-4" />
              <span className="absolute top-[2px] right-[2px] w-1.5 h-1.5 bg-[#e11d48] rounded-full border border-[#252526]" />
            </button>

            {showNotifPopup && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#252526] border border-[#3e3e42] rounded-xl shadow-2xl py-1 z-50 overflow-hidden text-[11px]">
                <div className="px-3 py-2 border-b border-[#3e3e42] flex justify-between items-center bg-[#1e1e1e]">
                  <span className="text-[#eeeeee] font-medium">Notifications</span>
                  <button className="text-[10px] text-[#0ea5e9] hover:underline">Mark all read</button>
                </div>
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  <div className="px-3 py-2 border-b border-[#3e3e42] hover:bg-[#2a2a2d] transition-colors cursor-pointer">
                    <p className="text-[#eeeeee]">Your track "Summer Vibes" hit 1,000 plays!</p>
                    <p className="text-[10px] text-[#888888] mt-0.5">2 hours ago</p>
                  </div>
                  <div className="px-3 py-2 border-b border-[#3e3e42] hover:bg-[#2a2a2d] transition-colors cursor-pointer bg-[#333333]/30">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]" />
                      <p className="text-[#eeeeee]">DJMaster liked your comment.</p>
                    </div>
                    <p className="text-[10px] text-[#888888] mt-0.5 ml-3">Yesterday</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      }
    >
      {renderContent()}

      {actionPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#3e3e42] rounded-xl p-5 w-full max-w-sm shadow-2xl text-[12px]">
            <div className="flex justify-between items-center mb-4 border-b border-[#3e3e42] pb-2">
              <h3 className="text-[15px] text-[#eeeeee] font-medium">
                {actionPopup.action === "delete" ? "Delete Project" : "Edit Project Settings"}
              </h3>
              <button onClick={() => setActionPopup(null)} className="text-[#888888] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#cccccc] mb-6 text-[13px] leading-relaxed">
              {actionPopup.action === "delete" ? (
                <>Are you sure you want to delete <strong className="text-white">"{actionPopup.project.name}"</strong>? This action cannot be undone.</>
              ) : (
                <>Do you want to toggle the privacy status of <strong className="text-white">"{actionPopup.project.name}"</strong>?</>
              )}
            </p>

            <div className="flex justify-end gap-2">
              <button onClick={() => setActionPopup(null)} className="px-4 py-2 text-[#888888] hover:text-white hover:bg-[#333333] rounded-lg transition-colors border border-transparent">
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-white ${actionPopup.action === "delete" ? "bg-[#e11d48] hover:bg-[#be123c]" : "bg-[#0ea5e9] hover:bg-[#0284c7]"}`}
              >
                {actionPopup.action === "delete" ? "Delete" : "Toggle Privacy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
