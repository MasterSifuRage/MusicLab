import React, { useState } from "react";
import { Users, UserPlus, X, Eye, Pencil } from "lucide-react";
import { collabService } from "../../services/collab";
import { useCollabStore } from "../../store/collabStore";
import type { ProjectMember } from "../../types";
import { toast } from "sonner";

interface CollabPanelProps {
  projectId: string;
  isOwner: boolean;
}

export function CollabPanel({ projectId, isOwner }: CollabPanelProps) {
  const connected = useCollabStore((s) => s.connected);
  const members = useCollabStore((s) => s.members);
  const myRole = useCollabStore((s) => s.myRole);
  const lastRemote = useCollabStore((s) => s.lastRemoteEditor);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [loading, setLoading] = useState(false);

  if (!collabService.isAvailable()) return null;

  const refreshMembers = async () => {
    const data = await collabService.listMembers(projectId);
    useCollabStore.getState().setMembers(data.members);
    useCollabStore.getState().setMyRole(data.myRole as "owner" | "editor" | "viewer");
  };

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await collabService.invite(projectId, email.trim(), inviteRole);
      toast.success(`Invited ${email}`);
      setEmail("");
      await refreshMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (member: ProjectMember) => {
    if (member.role === "owner") return;
    try {
      await collabService.removeMember(projectId, member.id);
      await refreshMembers();
      toast.success("Member removed");
    } catch {
      toast.error("Could not remove member");
    }
  };

  const roleIcon = (role: string) => {
    if (role === "viewer") return <Eye className="w-3 h-3" />;
    return <Pencil className="w-3 h-3" />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refreshMembers().catch(() => {});
        }}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[11px] ${
          connected ? "bg-[#0ea5e9]/20 text-[#0ea5e9]" : "bg-[#333333] text-[#888888]"
        }`}
        title="Collaborators"
      >
        <Users className="w-3.5 h-3.5" />
        {members.length || "—"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-[#252526] border border-[#3e3e42] shadow-2xl rounded-[4px] z-50 text-[11px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#3e3e42]">
            <span className="text-[#eeeeee] font-medium">Collaborators</span>
            <button onClick={() => setOpen(false)} className="text-[#888] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center justify-between px-2 py-1 rounded hover:bg-[#333]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#0ea5e9]">{roleIcon(m.role)}</span>
                  <span className="truncate text-[#ccc]">{m.username}</span>
                  <span className="text-[#666] text-[9px]">{m.role}</span>
                </div>
                {isOwner && m.role !== "owner" && (
                  <button onClick={() => handleRemove(m)} className="text-[#666] hover:text-red-400 text-[9px]">
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="p-2 border-t border-[#3e3e42] space-y-2">
              <div className="flex gap-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@musiclab.com"
                  className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-[#ccc] focus:outline-none focus:border-[#0ea5e9]"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
                  className="bg-[#1e1e1e] border border-[#3e3e42] rounded px-1 text-[#ccc]"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                onClick={handleInvite}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1 py-1 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded disabled:opacity-50"
              >
                <UserPlus className="w-3 h-3" />
                Invite
              </button>
            </div>
          )}

          <div className="px-3 py-2 border-t border-[#3e3e42] text-[9px] text-[#666]">
            {connected ? (
              <>
                Live sync {myRole === "viewer" ? "(view only)" : "on"}
                {lastRemote && ` · last edit: ${lastRemote}`}
              </>
            ) : (
              "Connecting…"
            )}
          </div>
        </div>
      )}
    </div>
  );
}
