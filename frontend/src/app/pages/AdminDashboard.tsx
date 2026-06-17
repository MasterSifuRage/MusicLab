import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Search, Ban, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SidebarLayout } from "../components/SidebarLayout";
import { SettingsPanel } from "../components/SettingsPanel";
import { useLocaleStore } from "../../store/localeStore";
import { t } from "../../lib/i18n";
import { adminSidebarLinks } from "../../lib/dashboardNav";
import { adminService } from "../../services/admin";
import type { AdminLog, AdminReport, User } from "../../types";

function OverviewView() {
  const [stats, setStats] = useState({ totalUsers: 0, activeProjects: 0, bannedAccounts: 0 });
  const [logs, setLogs] = useState<AdminLog[]>([]);

  useEffect(() => {
    adminService.stats().then(setStats);
    adminService.listLogs().then(setLogs);
  }, []);

  const cards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), color: "#3b82f6" },
    { label: "Active Projects", value: stats.activeProjects.toLocaleString(), color: "#10b981" },
    { label: "Banned Accounts", value: stats.bannedAccounts.toLocaleString(), color: "#ef4444" },
  ];

  return (
    <div className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {cards.map((stat, idx) => (
          <div key={idx} className="bg-[#252526] rounded-xl p-5 border border-[#3e3e42] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#888888] text-[11px] uppercase tracking-wide">{stat.label}</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
            </div>
            <div className="text-[20px] text-[#eeeeee] font-medium font-mono">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-[#3e3e42] bg-[#1e1e1e]">
            <h2 className="text-[12px] text-[#eeeeee] uppercase tracking-wide">Recent System Activity</h2>
          </div>
          <div className="p-5 space-y-3">
            {logs.length === 0 && <p className="text-[#666666] text-[12px]">No recent activity.</p>}
            {logs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex justify-between items-center pb-3 border-b border-[#3e3e42] last:border-0 last:pb-0">
                <div>
                  <p className="text-[#cccccc] text-[12px]">{log.action}</p>
                  <p className="text-[#666666] text-[10px] mt-1">{log.admin}</p>
                </div>
                <span className="text-[#888888] text-[10px]">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden flex flex-col justify-center items-center p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-[#059669]/10 rounded-full flex items-center justify-center mb-4 border border-[#059669]/20 shadow-inner">
            <CheckCircle className="w-6 h-6 text-[#059669]" />
          </div>
          <h3 className="text-[15px] text-[#eeeeee] mb-2 font-medium">System Status: Optimal</h3>
          <p className="text-[#888888] text-[12px] max-w-xs">All services are running normally with no reported downtime in the last 30 days.</p>
        </div>
      </div>
    </div>
  );
}

function UserManagementView({ query }: { query: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setUsers(await adminService.listUsers());
    setLoading(false);
  };
  useEffect(() => {
    refresh();
  }, []);

  const toggleUserStatus = async (user: User) => {
    const next = user.status === "Active" ? "Banned" : "Active";
    await adminService.setUserStatus(user.id, next);
    toast.success(`${user.username} ${next === "Banned" ? "disabled" : "enabled"}.`);
    refresh();
  };

  const filtered = users.filter(
    (u) => u.username.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[14px] text-[#eeeeee] font-medium tracking-wide uppercase">User Management</h2>
        <button className="bg-[#333333] border border-[#3e3e42] text-[#eeeeee] px-4 py-2 rounded-lg hover:bg-[#444444] transition-colors text-[12px] font-medium shadow-sm">
          Export Users
        </button>
      </div>

      <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#3e3e42] bg-[#1e1e1e]">
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Username</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Email</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Role</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Status</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px] w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-[#3e3e42]/50 hover:bg-[#2a2a2d] transition-colors">
                  <td className="px-6 py-4 text-[#eeeeee] font-medium">{user.username}</td>
                  <td className="px-6 py-4 text-[#888888]">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 text-[10px] rounded-full font-medium border uppercase tracking-wider ${
                      user.role === "admin" ? "bg-[#e11d48]/10 text-[#e11d48] border-[#e11d48]/30" : "bg-[#0ea5e9]/10 text-[#0ea5e9] border-[#0ea5e9]/30"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 text-[10px] rounded-full font-medium border uppercase tracking-wider ${
                      user.status === "Active" ? "bg-[#059669]/10 text-[#059669] border-[#059669]/30" : "bg-[#e11d48]/10 text-[#e11d48] border-[#e11d48]/30"
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "admin" ? (
                      <span className="text-[#666666] text-[11px]">—</span>
                    ) : user.status === "Active" ? (
                      <button onClick={() => toggleUserStatus(user)} className="flex items-center gap-1.5 text-[#e11d48] hover:text-[#be123c] transition-colors text-[11px] font-medium p-1.5 rounded-md hover:bg-[#e11d48]/10">
                        <Ban className="w-4 h-4" />
                        Disable
                      </button>
                    ) : (
                      <button onClick={() => toggleUserStatus(user)} className="text-[#059669] hover:text-[#047857] transition-colors text-[11px] font-medium flex items-center gap-1.5 p-1.5 rounded-md hover:bg-[#059669]/10">
                        <CheckCircle className="w-4 h-4" />
                        Enable
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#888888]"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#888888]">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportedContentView() {
  const [tab, setTab] = useState<"content" | "account">("content");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const refresh = async () => setReports(await adminService.listReports());
  useEffect(() => {
    refresh();
  }, []);

  const visible = reports.filter((r) => r.category === tab);

  const applyAction = async (label: string) => {
    if (!selectedReport) return;
    await adminService.resolveReport(selectedReport.id);
    await adminService.addLog(`${label} for report against @${selectedReport.user}`, "Admin");
    toast.success("Action applied.");
    setSelectedReport(null);
    refresh();
  };

  const dismissReport = async (id: string) => {
    await adminService.resolveReport(id);
    toast.success("Report dismissed.");
    refresh();
  };

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[14px] text-[#eeeeee] font-medium tracking-wide uppercase">Reported Content & Accounts</h2>
        <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#3e3e42] shadow-sm">
          <button className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors ${tab === "content" ? "bg-[#333333] text-[#eeeeee] shadow-sm" : "text-[#888888] hover:text-white hover:bg-[#2a2a2d]"}`} onClick={() => setTab("content")}>
            Content Reports
          </button>
          <button className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors ${tab === "account" ? "bg-[#333333] text-[#eeeeee] shadow-sm" : "text-[#888888] hover:text-white hover:bg-[#2a2a2d]"}`} onClick={() => setTab("account")}>
            Account Reports
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {visible.map((report) => (
          <div key={report.id} className="bg-[#252526] rounded-xl border border-[#3e3e42] p-5 flex items-start justify-between shadow-sm hover:border-[#0ea5e9]/30 transition-colors">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#e11d48]/10 rounded-full flex items-center justify-center flex-shrink-0 border border-[#e11d48]/20">
                <AlertTriangle className="w-5 h-5 text-[#e11d48]" />
              </div>
              <div>
                <h3 className="text-[14px] text-[#eeeeee] font-medium mb-1">{report.type}</h3>
                {report.track ? (
                  <p className="text-[#888888] text-[12px] mb-1">Track: <span className="text-[#cccccc]">{report.track}</span></p>
                ) : (
                  <p className="text-[#888888] text-[12px] mb-1">Reason: <span className="text-[#cccccc]">{report.reason}</span></p>
                )}
                <p className="text-[#666666] text-[11px]">Reported against: <span className="text-[#0ea5e9]">@{report.user}</span></p>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between h-full gap-3">
              <span className="text-[#888888] text-[11px]">{report.date}</span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedReport(report)} className="px-3 py-1.5 bg-[#e11d48]/10 text-[#e11d48] rounded-md hover:bg-[#e11d48]/20 border border-[#e11d48]/30 transition-colors text-[11px] font-medium">
                  Take Action
                </button>
                <button onClick={() => dismissReport(report.id)} className="px-3 py-1.5 bg-[#1e1e1e] text-[#888888] border border-[#3e3e42] rounded-md hover:bg-[#333333] transition-colors text-[11px] font-medium">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <div className="text-center py-12 text-[#666666] bg-[#252526] rounded-xl border border-[#3e3e42] border-dashed">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-[#059669]/50" />
            <p className="text-[13px]">No pending reports in this category.</p>
          </div>
        )}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#3e3e42] rounded-xl p-6 w-full max-w-sm shadow-2xl text-[12px]">
            <h3 className="text-[15px] text-[#eeeeee] mb-4 border-b border-[#3e3e42] pb-3 font-medium">
              Take Action on {tab === "content" ? "Content" : "Account"}
            </h3>
            <div className="mb-5 space-y-1.5 bg-[#1e1e1e] border border-[#3e3e42] p-4 rounded-lg">
              <p className="text-[#888888] text-[11px]">Target User: <span className="text-[#eeeeee]">@{selectedReport.user}</span></p>
              <p className="text-[#888888] text-[11px]">Report Type: <span className="text-[#e11d48]">{selectedReport.type}</span></p>
              {selectedReport.track && <p className="text-[#888888] text-[11px]">Track: <span className="text-[#eeeeee]">{selectedReport.track}</span></p>}
            </div>

            <div className="space-y-2 mb-6">
              {tab === "content" ? (
                <>
                  <button onClick={() => applyAction("Removed reported track")} className="w-full text-left px-4 py-2.5 bg-[#e11d48]/10 hover:bg-[#e11d48]/20 border border-[#e11d48]/30 text-[#e11d48] rounded-lg transition-colors font-medium">
                    Remove Reported Track
                  </button>
                  <button onClick={() => applyAction("Issued warning")} className="w-full text-left px-4 py-2.5 bg-[#333333] hover:bg-[#444444] border border-[#3e3e42] text-[#eeeeee] rounded-lg transition-colors font-medium">
                    Issue Warning to @{selectedReport.user}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => applyAction("Banned account")} className="w-full text-left px-4 py-2.5 bg-[#e11d48]/10 hover:bg-[#e11d48]/20 border border-[#e11d48]/30 text-[#e11d48] rounded-lg transition-colors font-medium">
                    Ban Account (@{selectedReport.user})
                  </button>
                  <button onClick={() => applyAction("Suspended account 7 days")} className="w-full text-left px-4 py-2.5 bg-[#333333] hover:bg-[#444444] border border-[#3e3e42] text-[#eeeeee] rounded-lg transition-colors font-medium">
                    Suspend Account for 7 Days
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedReport(null)} className="px-4 py-2 text-[#888888] hover:text-[#eeeeee] hover:bg-[#333333] rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemLogsView() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  useEffect(() => {
    adminService.listLogs().then(setLogs);
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[14px] text-[#eeeeee] font-medium tracking-wide uppercase">System Logs</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#333333] text-[#eeeeee] border border-[#3e3e42] rounded-lg hover:bg-[#444444] transition-colors text-[12px] font-medium shadow-sm">Filter</button>
          <button onClick={() => toast.success("Logs exported.")} className="px-4 py-2 bg-[#0ea5e9] text-white rounded-lg hover:bg-[#0284c7] transition-colors text-[12px] font-medium shadow-sm shadow-[#0ea5e9]/20">
            Download Logs
          </button>
        </div>
      </div>

      <div className="bg-[#252526] rounded-xl border border-[#3e3e42] p-2 shadow-sm">
        {logs.length === 0 && <p className="text-center text-[#666666] py-8 text-[13px]">No logs recorded yet.</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-4 p-3 border-b border-[#3e3e42]/50 last:border-0 hover:bg-[#2a2a2d] transition-colors rounded-lg">
            <div className="w-2 h-2 rounded-full bg-[#0ea5e9] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[#cccccc] text-[13px]">{log.action}</p>
              <p className="text-[#888888] text-[11px] mt-0.5">Initiated by: {log.admin}</p>
            </div>
            <span className="text-[#888888] text-[11px] font-mono bg-[#1e1e1e] border border-[#3e3e42] px-2.5 py-1 rounded-md">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const [query, setQuery] = useState("");
  const locale = useLocaleStore((s) => s.locale);

  const sidebarLinks = adminSidebarLinks(locale);

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagementView query={query} />;
      case "reports":
        return <ReportedContentView />;
      case "logs":
        return <SystemLogsView />;
      case "settings":
        return <SettingsPanel variant="admin" />;
      default:
        return <OverviewView />;
    }
  };

  const getHeaderTitle = () => {
    if (activeTab === "settings") return t(locale, "settings.title.admin");
    return sidebarLinks.find((l) => l.id === activeTab)?.label || t(locale, "nav.overview");
  };

  return (
    <SidebarLayout
      title="MusicLab"
      sidebarLinks={sidebarLinks}
      activeId={activeTab}
      avatarColor="from-[#e11d48] to-[#0ea5e9]"
      headerCenter={<h1 className="text-[14px] text-[#eeeeee] font-medium tracking-wide uppercase">{getHeaderTitle()}</h1>}
      headerActions={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#888888]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="w-56 bg-[#1e1e1e] text-[#cccccc] pl-8 pr-3 py-1 rounded-[2px] border border-[#3e3e42] focus:border-[#0ea5e9] focus:outline-none transition-none text-[11px]"
          />
        </div>
      }
    >
      {renderContent()}
    </SidebarLayout>
  );
}
