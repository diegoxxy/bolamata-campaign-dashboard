"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "motion/react";
import type { VideoItem } from "@/lib/social/types";
import { formatFullNumber } from "@/lib/social/format";
import { ExternalLink, FolderSearch } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { reveal, SPRING } from "./motionPresets";

const ROW_HEIGHT = 68;

const PLATFORM_BADGE: Record<VideoItem["platform"], string> = {
  youtube: "bg-red-500/10 text-red-400 border-red-500/25",
  instagram: "bg-pink-500/10 text-pink-400 border-pink-500/25",
  tiktok: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
};

export default function MasterTable({ videos }: { videos: VideoItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: videos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (videos.length === 0) {
    return (
      <div className="card p-10 sm:p-14 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-900/50 flex items-center justify-center mb-4 float-soft">
          <FolderSearch className="w-5 h-5 text-cyan-400" />
        </div>
        <h3 className="text-base font-semibold text-white">Tidak ada video yang cocok</h3>
        <p className="text-sm text-fg-muted mt-1.5 max-w-sm mx-auto leading-relaxed">
          Coba ubah filter status, naikkan minimum views, atau kosongkan kolom pencarian.
        </p>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      animate="show"
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className="surface-raised grid grid-cols-[56px_96px_minmax(0,2fr)_minmax(0,1.2fr)_112px_128px_88px] gap-3 px-4 py-3.5 border-b border-border-strong text-sm font-bold text-fg-muted uppercase tracking-wider">
        <span>Cover</span>
        <span>Platform</span>
        <span>Caption</span>
        <span>Username</span>
        <span className="text-right">Views</span>
        <span>Status</span>
        <span className="text-right">Link</span>
      </div>

      {/* Virtualized body */}
      <div ref={scrollRef} className="h-[65vh] overflow-y-auto enterprise-scroll">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {items.map((vRow) => {
            const vid = videos[vRow.index];

            // Perbaikan: Bersihkan prefix '@' agar tidak bertumpuk
            const cleanAuthor = vid.authorName ? vid.authorName.replace(/^@+/, "") : "unknown";

            return (
              <div
                key={vid.id + vRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${vRow.start}px)`,
                }}
                className="group relative grid grid-cols-[56px_96px_minmax(0,2fr)_minmax(0,1.2fr)_112px_128px_88px] gap-3 px-4 items-center border-b border-border-subtle hover:bg-slate-800/25 transition-colors"
              >
                <motion.span
                  className="absolute left-0 top-0 h-full w-0.5 bg-cyan-500 origin-center"
                  initial={{ scaleY: 0 }}
                  whileHover={{ scaleY: 1, transition: SPRING.snappy }}
                />
                {/* Cover Image */}
                {vid.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vid.coverUrl} alt="" className="w-9 h-12 object-cover rounded border border-slate-800" />
                ) : (
                  <div className="w-9 h-12 rounded border border-slate-800 bg-slate-900" />
                )}

                {/* Platform Badge */}
                <div>
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-sm font-medium border ${PLATFORM_BADGE[vid.platform]}`}
                  >
                    {vid.platform === "youtube" ? "YouTube" : vid.platform === "instagram" ? "Instagram" : "TikTok"}
                  </span>
                </div>

                {/* Caption */}
                <p className="text-sm text-fg-muted line-clamp-2 leading-snug min-w-0">
                  {vid.title || <span className="italic text-fg-subtle">(tanpa caption)</span>}
                </p>

                {/* Username - Perbaikan `@` Ganda */}
                <a
                  href={vid.authorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-cyan-400 hover:underline truncate"
                >
                  @{cleanAuthor}
                </a>

                {/* Views */}
                <span className="text-sm font-semibold text-amber-400 text-right tabular-nums">
                  {formatFullNumber(vid.views)}
                </span>

                {/* Status */}
                <span>
                  <StatusBadge status={vid.status} />
                </span>

                {/* Link */}
                <motion.a
                  href={vid.sourceUrl || vid.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ x: -2 }}
                  transition={SPRING.snappy}
                  className="flex items-center justify-end gap-1 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Buka <ExternalLink className="w-4 h-4" />
                </motion.a>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
