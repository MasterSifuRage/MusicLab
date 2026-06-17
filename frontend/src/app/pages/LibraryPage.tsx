import React, { useEffect, useRef, useState } from "react";
import { Home, Library, FolderOpen, Settings, Upload, Search, Play, Pause, Download, X, Trash2, Loader2, Music2 } from "lucide-react";
import { toast } from "sonner";
import { SidebarLayout } from "../components/SidebarLayout";
import { useAuthStore } from "../../store/authStore";
import { useLocaleStore } from "../../store/localeStore";
import { t } from "../../lib/i18n";
import { ApiError } from "../../lib/api";
import { assetService, STORAGE_QUOTA_BYTES } from "../../services/assets";
import { audioEngine } from "../../audio/AudioEngine";
import { SAMPLE_LIBRARY } from "../../audio/synth";
import { formatBytes, formatDuration } from "../../lib/format";
import type { Asset } from "../../types";

export function LibraryPage() {
  const user = useAuthStore((s) => s.user)!;
  const locale = useLocaleStore((s) => s.locale);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [usage, setUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const list = await assetService.list(user.id);
    setAssets(list);
    setUsage(list.reduce((sum, a) => sum + a.size, 0));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    return () => audioEngine.stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const filteredAssets = assets.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredSamples = SAMPLE_LIBRARY.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const previewAsset = async (asset: Asset) => {
    if (playingId === asset.id) {
      audioEngine.stopPreview();
      setPlayingId(null);
      return;
    }
    try {
      const data = await assetService.getBlob(asset.id);
      await audioEngine.previewAsset(asset.id, data);
      setPlayingId(asset.id);
      window.setTimeout(() => setPlayingId((p) => (p === asset.id ? null : p)), Math.max(500, asset.duration * 1000));
    } catch {
      toast.error("Could not play this file.");
    }
  };

  const previewSample = async (id: string) => {
    if (playingId === id) {
      audioEngine.stopPreview();
      setPlayingId(null);
      return;
    }
    await audioEngine.previewSample(id);
    setPlayingId(id);
    window.setTimeout(() => setPlayingId((p) => (p === id ? null : p)), 1500);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        await assetService.upload(user.id, file);
        ok++;
      } catch (err) {
        if (err instanceof ApiError && err.status === 413) {
          toast.error(t(locale, "library.quotaExceeded"));
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    }
    setUploading(false);
    setShowUpload(false);
    if (ok > 0) toast.success(`Uploaded ${ok} file${ok === 1 ? "" : "s"}.`);
    refresh();
  };

  const handleDownload = async (asset: Asset) => {
    try {
      const data = await assetService.getBlob(asset.id);
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleDelete = async (asset: Asset) => {
    await assetService.remove(asset.id);
    toast.success(`Removed ${asset.name}.`);
    refresh();
  };

  const sidebarLinks = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Library, label: "Library", path: "/library" },
    { icon: FolderOpen, label: "My Projects", path: "/dashboard?tab=projects" },
    { icon: Settings, label: "Settings", path: "/dashboard?tab=settings" },
  ];

  const quotaPct = Math.min(100, (usage / STORAGE_QUOTA_BYTES) * 100);

  return (
    <SidebarLayout
      title="MusicLab"
      sidebarLinks={sidebarLinks}
      avatarColor="from-[#0ea5e9] to-[#059669]"
      headerCenter={<h1 className="text-[14px] text-[#eeeeee] font-medium tracking-wide">Library</h1>}
      headerActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 bg-[#333333] border border-[#3e3e42] text-[#eeeeee] px-3 py-1 rounded-[2px] hover:bg-[#444444] transition-none text-[11px] font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      }
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-[18px] text-[#eeeeee] font-medium">My Audio Assets</h1>
          <div className="min-w-[200px]">
            <div className="flex justify-between text-[11px] text-[#888888] mb-1">
              <span>Storage</span>
              <span className="font-mono">{formatBytes(usage)} / {formatBytes(STORAGE_QUOTA_BYTES)}</span>
            </div>
            <div className="w-56 h-1.5 bg-[#1e1e1e] border border-[#3e3e42] rounded-full overflow-hidden">
              <div className="h-full bg-[#0ea5e9]" style={{ width: `${quotaPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audio files & samples..."
              className="w-full bg-[#1e1e1e] text-[#cccccc] pl-9 pr-4 py-2 rounded-lg border border-[#3e3e42] focus:border-[#0ea5e9] focus:outline-none transition-colors text-[13px]"
            />
          </div>
        </div>

        {/* User assets table */}
        <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden shadow-sm mb-8">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#3e3e42] bg-[#1e1e1e]">
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">File Name</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Duration</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Size</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px]">Format</th>
                <th className="text-left px-6 py-3 text-[#666666] font-medium uppercase tracking-wider text-[11px] w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-b border-[#3e3e42]/50 hover:bg-[#2a2a2d] transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => previewAsset(asset)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 shadow-sm ${
                          playingId === asset.id ? "bg-[#0ea5e9]/20 border border-[#0ea5e9] text-[#0ea5e9]" : "bg-[#333333] border border-[#3e3e42] hover:bg-[#444444] text-[#eeeeee]"
                        }`}
                      >
                        {playingId === asset.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                      </button>
                      <span className={`text-[#eeeeee] font-mono tracking-tight ${playingId === asset.id ? "text-[#0ea5e9]" : ""}`}>{asset.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#cccccc] font-mono">{formatDuration(asset.duration)}</td>
                  <td className="px-6 py-4 text-[#cccccc] font-mono">{formatBytes(asset.size)}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 bg-[#1e1e1e] border border-[#3e3e42] text-[#888888] text-[10px] rounded-md font-mono uppercase">{asset.format}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleDownload(asset)} className="text-[#888888] hover:text-[#0ea5e9] transition-colors p-1.5 rounded-md hover:bg-[#0ea5e9]/10" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(asset)} className="text-[#888888] hover:text-[#e11d48] transition-colors p-1.5 rounded-md hover:bg-[#e11d48]/10" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-[#888888]"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              )}
              {!loading && filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-[#888888]">
                    {searchQuery ? `No files matching "${searchQuery}"` : "No uploads yet. Click Upload to add your own samples."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Built-in sample library */}
        <h2 className="text-[12px] text-[#888888] mb-4 font-medium uppercase tracking-wider">Built-in Sample Library</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSamples.map((sample) => (
            <div key={sample.id} className="flex items-center gap-3 bg-[#252526] p-3 rounded-xl border border-[#3e3e42] hover:border-[#0ea5e9]/40 transition-colors shadow-sm">
              <button
                onClick={() => previewSample(sample.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  playingId === sample.id ? "bg-[#0ea5e9]/20 border border-[#0ea5e9] text-[#0ea5e9]" : "bg-[#333333] border border-[#3e3e42] hover:bg-[#444444] text-[#eeeeee]"
                }`}
              >
                {playingId === sample.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[#eeeeee] truncate font-medium">{sample.name}</div>
                <div className="text-[11px] text-[#888888] flex gap-2">
                  <span>{sample.category}</span>
                  {sample.bpm && <span>{sample.bpm} BPM</span>}
                  <span>{sample.key}</span>
                </div>
              </div>
              <Music2 className="w-4 h-4 text-[#666666] flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {showUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#252526] border border-[#3e3e42] rounded-xl p-6 w-full max-w-sm shadow-2xl text-[12px]">
            <div className="flex justify-between items-center mb-4 border-b border-[#3e3e42] pb-3">
              <h3 className="text-[15px] text-[#eeeeee] font-medium">Upload Audio Asset</h3>
              <button onClick={() => setShowUpload(false)} className="text-[#888888] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              className="border border-dashed border-[#3e3e42] rounded-xl p-8 text-center mb-5 hover:border-[#0ea5e9] transition-colors bg-[#1e1e1e] cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-[#0ea5e9] mx-auto mb-3 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-[#888888] mx-auto mb-3" />
              )}
              <p className="text-[#eeeeee] font-medium mb-1">{uploading ? "Uploading…" : "Click to browse or drag and drop"}</p>
              <p className="text-[10px] text-[#666666]">WAV, MP3, FLAC, OGG up to ~50MB</p>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-[#888888] hover:text-white transition-colors font-medium hover:bg-[#333333] rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
