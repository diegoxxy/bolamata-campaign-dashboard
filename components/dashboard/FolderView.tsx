"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  X,
  Save,
  Crown,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import type { CreatorGroup, VideoItem } from "@/lib/social/types";
import StatusBadge from "./StatusBadge";
import {
  gridStagger,
  fadeUp,
  cardLift,
  EASE_OUT,
  barLift,
  pressable,
  SPRING,
  overlayVariants,
  modalVariants,
} from "./motionPresets";

interface FolderViewProps {
  creators: CreatorGroup[];
  onUpdateVideo?: (updatedVideo: VideoItem) => void;
  readOnly?: boolean;
}

const ENGAGE_META = [
  { key: "totalLikes" as const, label: "Likes", Icon: Heart, tone: "text-rose-400" },
  { key: "totalComments" as const, label: "Comments", Icon: MessageSquare, tone: "text-blue-400" },
  { key: "totalShares" as const, label: "Shares", Icon: Share2, tone: "text-emerald-400" },
  { key: "totalSaves" as const, label: "Saves", Icon: Bookmark, tone: "text-purple-400" },
];

const fmt = (n: number) => (n || 0).toLocaleString("id-ID");

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

  // Helper untuk memastikan username selalu bersih dari prefix '@'
  const sanitizeUsername = (raw: string) => raw.trim().toLowerCase().replace(/^@+/, "");

  // Cari creator group terkini berdasarkan state props `creators`
  const selectedCreator = creators.find(
    (c) => sanitizeUsername(c.authorName) === (selectedAuthorName ? sanitizeUsername(selectedAuthorName) : "")
  );

  const handleOpenEdit = (v: VideoItem) => {
    setEditingVideo(v);
    const cleanAuthor = sanitizeUsername(v.authorName);
    setEditAuthor(cleanAuthor === "instagram_creator" || cleanAuthor === "unknown" ? "" : cleanAuthor);
    setEditViews(v.views || 0);
    setEditLikes(v.likes || 0);
    setEditComments(v.comments || 0);
    setEditShares(v.shares || 0);
    setEditSaves(v.saves || 0);
  };

  const handleSaveEdit = () => {
    if (!editingVideo) return;

    // Perbaikan: Hapus semua prefix '@' secara menyeluruh dari input maupun fallback
    const rawAuthor = editAuthor.trim() || editingVideo.authorName;
    const finalAuthor = sanitizeUsername(rawAuthor);

    const updated: VideoItem = {
      ...editingVideo,
      authorName: finalAuthor,
      authorDisplayName: `@${finalAuthor}`, // Dijamin selalu tepat 1 '@'
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

  // ============ Tampilan Dalam Folder Kreator ============
  if (selectedCreator) {
    const creatorAvatar = selectedCreator.videos.find((v) => v.authorAvatar)?.authorAvatar;
    const cleanCreatorName = sanitizeUsername(selectedCreator.authorName);
    const maxViews = Math.max(1, ...selectedCreator.videos.map((v) => v.views || 0));

    return (
      <motion.div
        key="creator-detail"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className="space-y-4"
      >
        <motion.button
          whileHover={{ x: -3, transition: SPRING.snappy }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setSelectedAuthorName(null)}
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-strong font-medium cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4.5 h-4.5" /> Kembali ke Semua Folder Kreator
        </motion.button>

        {/* Header Dalam Folder Kreator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="card-elevated relative overflow-hidden p-4.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-cyan-500/8 blur-3xl" />
          <div className="flex items-center gap-4 relative">
            {creatorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creatorAvatar}
                alt={cleanCreatorName}
                className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/40 shadow-lg shadow-cyan-950/40"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cyan-950/70 border-2 border-cyan-700/50 flex items-center justify-center text-cyan-400 text-xl font-bold uppercase">
                {cleanCreatorName.slice(0, 2)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">@{cleanCreatorName}</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {selectedCreator.videos.length} video · {fmt(selectedCreator.totalViews)} total views
              </p>
            </div>
          </div>
          {selectedCreator.isTopCreator && (
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1.5 rounded-full shadow-lg shadow-amber-950/40">
              <Crown className="w-4 h-4" /> TOP CREATOR
            </span>
          )}
        </motion.div>

        {/* List Card Video */}
        <motion.div
          variants={gridStagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {selectedCreator.videos.map((v) => {
            const cleanVideoAuthor = sanitizeUsername(v.authorName);
            const viewBar = Math.max(4, Math.round(((v.views || 0) / maxViews) * 100));

            return (
              <motion.div
                key={v.id}
                variants={fadeUp}
                whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 26 } }}
                className="card-elevated group p-4 flex flex-col justify-between space-y-3.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={v.status} />
                    <span className="text-sm font-mono text-accent font-semibold truncate">
                      @{cleanVideoAuthor}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 mt-2 line-clamp-2 leading-snug">
                    {v.title}
                  </h4>
                  <p className="text-sm text-fg-subtle mt-1 truncate font-mono">{v.sourceUrl}</p>
                </div>

                {/* Views bar — proporsional vs video terbaik di folder */}
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm text-fg-muted uppercase tracking-wide">Views</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">{fmt(v.views)}</span>
                  </div>
                  <div className="h-1 bg-slate-800/70 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 origin-left"
                      variants={barLift}
                      initial="initial"
                      animate={{ width: `${viewBar}%` }}
                      transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
                      whileHover={{ scaleY: 1.6 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  {(
                    [
                      ["Likes", v.likes, "text-rose-400"],
                      ["Comments", v.comments, "text-blue-400"],
                      ["Shares", v.shares, "text-emerald-400"],
                      ["Saves", v.saves, "text-purple-400"],
                    ] as const
                  ).map(([label, val, tone]) => (
                    <div key={label}>
                      <span className="block text-sm text-fg-muted uppercase tracking-wide font-medium">{label}</span>
                      <strong className={`text-sm tabular-nums ${tone}`}>{fmt(val)}</strong>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={v.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 surface-raised hover:bg-slate-800 text-slate-300 text-center rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 border border-slate-700/60"
                  >
                    Buka Link Asli <ExternalLink className="w-4 h-4" />
                  </a>
                  {!readOnly && (
                    <motion.button
                      {...pressable}
                      onClick={() => handleOpenEdit(v)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600/15 hover:bg-amber-600/25 text-amber-400 border border-amber-600/30 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4.5 h-4.5" /> Edit Data
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Modal Edit */}
        <AnimatePresence>
          {editingVideo && (
            <motion.div
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={() => setEditingVideo(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50"
            >
              <motion.div
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
                className="card-elevated p-4.5 max-w-lg w-full space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white">Edit Data Video &amp; Username</h3>
                    <p className="text-sm text-fg-subtle truncate mt-0.5 font-mono" title={editingVideo.sourceUrl}>
                      {editingVideo.sourceUrl}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingVideo(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-fg-muted block mb-1.5">Username Creator</label>
                    <input
                      type="text"
                      placeholder="Contoh: kutipanpodcast"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      className="field w-full text-sm"
                    />
                    <p className="text-sm text-fg-subtle mt-1.5">
                      *Mengubah username akan otomatis memindahkan video ini ke folder username tersebut.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(
                      [
                        ["Views", editViews, setEditViews],
                        ["Likes", editLikes, setEditLikes],
                        ["Comments", editComments, setEditComments],
                        ["Shares", editShares, setEditShares],
                        ["Saves", editSaves, setEditSaves],
                      ] as const
                    ).map(([label, val, setter]) => (
                      <div key={label}>
                        <label className="text-sm font-medium text-fg-muted block mb-1.5">{label}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={val ? val.toLocaleString("id-ID") : ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setter(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                          className="field w-full text-sm tabular-nums"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditingVideo(null)}
                    className="px-4 py-2 surface-raised hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer border border-slate-700/60"
                  >
                    Batal
                  </button>
                  <motion.button
                    {...pressable}
                    onClick={handleSaveEdit}
                    className="sheen inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-4.5 h-4.5" /> Simpan &amp; Organisasikan Folder
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ============ Tampilan Utama: Card Folder Kreator ============
  return (
    <motion.div
      key="creator-grid"
      variants={gridStagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {creators.map((c) => {
        const avatarUrl = c.videos.find((v) => v.authorAvatar)?.authorAvatar;
        const cleanName = sanitizeUsername(c.authorName);
        const isUnknown = cleanName === "unknown";
        const engageTotal = Math.max(
          1,
          (c.totalLikes || 0) + (c.totalComments || 0) + (c.totalShares || 0) + (c.totalSaves || 0)
        );

        return (
          <motion.div
            key={c.authorName}
            variants={fadeUp}
            {...cardLift}
            onClick={() => setSelectedAuthorName(cleanName)}
            className={`group relative overflow-hidden p-5 rounded-2xl cursor-pointer ${
              isUnknown
                ? "bg-amber-950/10 border border-amber-900/40 hover:border-amber-700/60"
                : "card-elevated hover:border-cyan-500/50 hover:shadow-[0_22px_48px_-20px_rgba(0,0,0,0.8),0_0_0_1px_rgba(0,210,255,0.12)]"
            }`}
          >
            {/* Glow yang menyala saat hover */}
            <motion.div
              aria-hidden
              className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                isUnknown ? "bg-amber-500/10" : "bg-cyan-500/12"
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1, scale: 1.15, transition: SPRING.snappy }}
            />

            {c.isTopCreator && !isUnknown && (
              <span className="absolute top-0 right-0 inline-flex items-center gap-1 text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 pl-2.5 pr-3 py-1 rounded-bl-xl shadow-lg">
                <Crown className="w-4 h-4" /> TOP
              </span>
            )}

            <div className="flex items-center justify-between mb-4 pr-2 relative">
              <div className="flex items-center gap-3 min-w-0">
                {isUnknown ? (
                  <div className="icon-chip w-11 bg-amber-950/60 border-amber-800/60 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={cleanName}
                    className="w-11 rounded-full object-cover border border-cyan-700/50 flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-11 rounded-full bg-cyan-950/70 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-bold text-sm uppercase flex-shrink-0 transition-transform duration-300 group-hover:scale-105">
                    {cleanName.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3
                    className={`text-sm font-bold truncate ${
                      isUnknown ? "text-amber-300" : "text-white"
                    }`}
                  >
                    {isUnknown ? "Link Error / Unknown" : `@${cleanName}`}
                  </h3>
                  <p className="text-sm text-fg-subtle">{c.videoCount} video link</p>
                </div>
              </div>
            </div>

            {/* Views — hero stat */}
            <div className="flex items-end justify-between mb-3 relative">
              <div>
                <p className="text-sm text-fg-muted uppercase tracking-wide">Total Views</p>
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    isUnknown ? "text-amber-400/80" : "text-amber-gradient"
                  }`}
                >
                  {c.totalViews.toLocaleString("id-ID")}
                </p>
              </div>
              <motion.span
                className="text-sm text-accent font-semibold flex-shrink-0 mb-0.5 inline-flex items-center gap-1"
                whileHover={{ x: 3, transition: SPRING.snappy }}
              >
                Buka <ChevronRight className="w-4.5 h-4.5" />
              </motion.span>
            </div>

            {/* Engagement row + proportional micro-bar */}
            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-800/60 relative">
              {ENGAGE_META.map(({ key, label, Icon, tone }) => {
                const val = c[key] || 0;
                const pct = Math.min(100, (val / engageTotal) * 100 * 4);
                return (
                  <div key={label} className="group/stat flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${tone} flex-shrink-0 transition-transform duration-200 group-hover/stat:scale-110`} />
                      <span className="text-sm font-semibold text-slate-300 truncate tabular-nums">
                        {fmt(val)}
                      </span>
                    </div>
                    <div className="h-0.5 bg-slate-800/70 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${tone.replace("text-", "bg-")}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.12 }}
                        whileHover={{ scaleY: 2.5 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
