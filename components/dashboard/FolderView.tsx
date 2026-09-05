"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ExternalLink, Pencil, X, Save, Crown, Heart, MessageSquare, Share2, Bookmark, AlertTriangle } from "lucide-react";
import type { CreatorGroup, VideoItem } from "@/lib/social/types";
import StatusBadge from "./StatusBadge";

interface FolderViewProps {
  creators: CreatorGroup[];
  onUpdateVideo?: (updatedVideo: VideoItem) => void;
  readOnly?: boolean;
}

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function FolderView({ creators, onUpdateVideo, readOnly = false }: FolderViewProps) {
  const [selectedAuthorName, setSelectedAuthorName] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  // Form State
  const [editAuthor, setEditAuthor] = useState("");
  const [editViews, setEditViews] = useState<number>(0);
  const [editLikes, setEditLikes] = useState<number>(0);
  const [editComments, setEditComments] = useState<number>(0);
  const [editShares, setEditShares] = useState<number>(0);
  const [editSaves, setEditSaves] = useState<number>(0);

  // Cari creator group terkini berdasarkan state props `creators`
  const selectedCreator = creators.find(
    (c) => c.authorName.toLowerCase() === selectedAuthorName?.toLowerCase()
  );

  const handleOpenEdit = (v: VideoItem) => {
    setEditingVideo(v);
    setEditAuthor(
      v.authorName === "instagram_creator" || v.authorName === "unknown"
        ? ""
        : v.authorName
    );
    setEditViews(v.views || 0);
    setEditLikes(v.likes || 0);
    setEditComments(v.comments || 0);
    setEditShares(v.shares || 0);
    setEditSaves(v.saves || 0);
  };

  const handleSaveEdit = () => {
    if (!editingVideo) return;

    const newUsername = editAuthor.trim().toLowerCase().replace(/^@/, "");
    const finalAuthor = newUsername || editingVideo.authorName;

    const updated: VideoItem = {
      ...editingVideo,
      authorName: finalAuthor,
      authorDisplayName: `@${finalAuthor}`,
      authorUrl: editingVideo.sourceUrl.includes("instagram.com")
        ? `https://www.instagram.com/${finalAuthor}`
        : editingVideo.authorUrl,
      views: Number(editViews) || 0,
      likes: Number(editLikes) || 0,
      comments: Number(editComments) || 0,
      shares: Number(editShares) || 0,
      saves: Number(editSaves) || 0,
      status: "qualified",
    };

    // Update global state di app/page.tsx -> otomatis mereorganisasi creators folder
    if (onUpdateVideo) {
      onUpdateVideo(updated);
    }

    setEditingVideo(null);
  };

  // Tampilan Dalam Folder
  if (selectedCreator) {
    const creatorAvatar = selectedCreator.videos.find((v) => v.authorAvatar)?.authorAvatar;

    return (
      <motion.div
        key="creator-detail"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <button
          onClick={() => setSelectedAuthorName(null)}
          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Semua Folder Kreator
        </button>

        {/* Header Dalam Folder Kreator */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {creatorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creatorAvatar}
                alt={selectedCreator.authorName}
                className="w-16 h-16 rounded-full object-cover border border-cyan-800/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 text-xl font-bold uppercase">
                @{selectedCreator.authorName.slice(0, 2)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">@{selectedCreator.authorName}</h2>
              <p className="text-xs text-slate-400">Total Link Video: {selectedCreator.videos.length} Video</p>
            </div>
          </div>
        </div>

        {/* List Card Video */}
        <motion.div
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {selectedCreator.videos.map((v) => (
            <motion.div
              key={v.id}
              variants={gridItem}
              className="bg-[#111827] border border-[#1e293b] hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-4 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={v.status} />
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    @{v.authorName}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-200 mt-2 line-clamp-2">
                  {v.title}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {v.sourceUrl}
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-[11px] text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-center">
                <div>
                  <span className="block text-[10px] text-slate-500">Views</span>
                  <strong className="text-amber-400">{(v.views || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Likes</span>
                  <strong className="text-rose-400">{(v.likes || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Comments</span>
                  <strong className="text-cyan-400">{(v.comments || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Shares</span>
                  <strong className="text-emerald-400">{(v.shares || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Saves</span>
                  <strong className="text-purple-400">{(v.saves || 0).toLocaleString("id-ID")}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={v.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-center rounded-lg text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  Buka Link Asli <ExternalLink className="w-3 h-3" />
                </a>
                {!readOnly && (
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleOpenEdit(v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Data
                  </motion.button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Modal Edit */}
        <AnimatePresence>
          {editingVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingVideo(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111827] border border-[#1e293b] p-6 rounded-xl max-w-lg w-full space-y-4 shadow-2xl"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Data Video &amp; Username</h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5 max-w-sm">{editingVideo.sourceUrl}</p>
                  </div>
                  <button
                    onClick={() => setEditingVideo(null)}
                    className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Username Creator</label>
                    <input
                      type="text"
                      placeholder="Contoh: kutipanpodcast"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      *Mengubah username akan otomatis memindahkan video ini ke folder username tersebut.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Views</label>
                      <input
                        type="number"
                        value={editViews}
                        onChange={(e) => setEditViews(Number(e.target.value))}
                        className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Likes</label>
                      <input
                        type="number"
                        value={editLikes}
                        onChange={(e) => setEditLikes(Number(e.target.value))}
                        className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Comments</label>
                      <input
                        type="number"
                        value={editComments}
                        onChange={(e) => setEditComments(Number(e.target.value))}
                        className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-300 block mb-1">Shares</label>
                      <input
                        type="number"
                        value={editShares}
                        onChange={(e) => setEditShares(Number(e.target.value))}
                        className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Saves</label>
                    <input
                      type="number"
                      value={editSaves}
                      onChange={(e) => setEditSaves(Number(e.target.value))}
                      className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditingVideo(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan &amp; Organisasi Folder
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Tampilan Utama Seluruh Card Folder Kreator
  return (
    <motion.div
      key="creator-grid"
      variants={gridContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {creators.map((c) => {
        const avatarUrl = c.videos.find((v) => v.authorAvatar)?.authorAvatar;
        const isUnknown = c.authorName.toLowerCase() === "unknown";

        return (
          <motion.div
            key={c.authorName}
            variants={gridItem}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setSelectedAuthorName(c.authorName)}
            className={`relative overflow-hidden p-5 rounded-xl cursor-pointer transition-colors ${
              isUnknown
                ? "bg-amber-950/10 border border-amber-900/40 hover:border-amber-700/60"
                : "bg-[#111827] border border-[#1e293b] hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-950/30"
            }`}
          >
            {c.isTopCreator && !isUnknown && (
              <span className="absolute top-0 right-0 inline-flex items-center gap-1 text-[10px] font-bold text-[#0b0f19] bg-gradient-to-r from-amber-400 to-amber-300 pl-2.5 pr-3 py-1 rounded-bl-xl">
                <Crown className="w-3 h-3" /> TOP
              </span>
            )}

            <div className="flex items-center justify-between mb-4 pr-2">
              <div className="flex items-center gap-3 min-w-0">
                {isUnknown ? (
                  <div className="w-11 h-11 rounded-full bg-amber-950/60 border border-amber-800/60 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                ) : avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={c.authorName}
                    className="w-11 h-11 rounded-full object-cover border border-cyan-800 flex-shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-sm uppercase flex-shrink-0">
                    {c.authorName.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className={`text-sm font-bold truncate ${isUnknown ? "text-amber-300" : "text-white"}`}>
                    {isUnknown ? "Link Error / Unknown" : `@${c.authorName}`}
                  </h3>
                  <p className="text-[10px] text-slate-500">{c.videoCount} video link</p>
                </div>
              </div>
            </div>

            {/* Views — hero stat */}
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total Views</p>
                <p className={`text-2xl font-bold tabular-nums ${isUnknown ? "text-amber-400/80" : "text-amber-400"}`}>
                  {c.totalViews.toLocaleString("id-ID")}
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-semibold flex-shrink-0 mb-0.5">Buka →</span>
            </div>

            {/* Engagement row */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/60">
              <div className="flex items-center gap-1.5 min-w-0">
                <Heart className="w-3 h-3 text-rose-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {(c.totalLikes || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {(c.totalComments || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Share2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {(c.totalShares || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Bookmark className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {(c.totalSaves || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
