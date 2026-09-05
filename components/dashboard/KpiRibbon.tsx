"use client";

import { motion } from "motion/react";
import type { GlobalMetrics } from "@/lib/social/types";
import { formatCompactViews, formatFullNumber, formatPercent } from "@/lib/social/format";
import { ClipboardCheck, Eye, Crown, Heart, MessageSquare, Share2, Bookmark } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export default function KpiRibbon({ metrics, hashtag }: { metrics: GlobalMetrics; hashtag: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Ringkasan Performa Kampanye <span className="text-cyan-400">{hashtag}</span>
      </h2>

      {/* Hero KPIs */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Submissions + Qualified Rate */}
        <motion.div
          variants={cardVariants}
          className="bg-[#131b2e] border border-[#1e293b] p-5 rounded-xl hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <ClipboardCheck className="w-3.5 h-3.5" /> SUBMISSIONS
          </div>
          <AnimatedNumber
            value={metrics.totalSubmitted}
            format={formatFullNumber}
            className="block text-3xl font-bold text-white mt-2 tabular-nums"
          />
          <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.qualifiedRate)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Qualified rate:{" "}
            <span className="text-emerald-400 font-semibold">{formatPercent(metrics.qualifiedRate)}</span>
          </p>
        </motion.div>

        {/* Total Views — the hero of the hero */}
        <motion.div
          variants={cardVariants}
          className="relative overflow-hidden bg-gradient-to-br from-[#131b2e] to-[#0f1a2e] border border-amber-900/40 p-5 rounded-xl hover:border-amber-700/50 transition-colors"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="flex items-center gap-1.5 text-xs text-amber-200/70 font-medium relative">
            <Eye className="w-3.5 h-3.5" /> TOTAL CAMPAIGN VIEWS
          </div>
          <AnimatedNumber
            value={metrics.totalViews}
            format={formatCompactViews}
            className="block text-4xl font-bold text-amber-400 mt-2 tabular-nums relative"
          />
          <p className="text-[11px] text-slate-500 mt-1.5 relative">
            {formatFullNumber(metrics.totalViews)} views akumulasi
          </p>
        </motion.div>

        {/* Top Creator */}
        <motion.div
          variants={cardVariants}
          className="relative bg-[#131b2e] border border-cyan-900/40 p-5 rounded-xl overflow-hidden hover:border-cyan-700/50 transition-colors"
        >
          <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-cyan-500/10 blur-xl" />
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium relative">
            <Crown className="w-3.5 h-3.5 text-cyan-400" /> TOP CREATOR
          </div>
          {metrics.topCreator ? (
            <div className="mt-2 relative">
              <p className="text-xl font-bold text-cyan-400 truncate">@{metrics.topCreator.authorName}</p>
              <p className="text-[11px] text-amber-400 font-semibold mt-1">
                {formatCompactViews(metrics.topCreator.totalViews)} views
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-3 relative">Belum ada data</p>
          )}
        </motion.div>
      </motion.div>

      {/* Engagement breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-4 bg-[#131b2e] border border-[#1e293b] rounded-xl p-5"
      >
        <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-4">Engagement Breakdown</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x sm:divide-slate-800/70">
          <div className="flex items-center gap-3 sm:px-4 sm:first:pl-0">
            <div className="w-9 h-9 rounded-lg bg-rose-950/40 border border-rose-900/40 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div className="min-w-0">
              <AnimatedNumber
                value={metrics.totalLikes || 0}
                format={formatCompactViews}
                className="block text-lg font-bold text-white tabular-nums"
              />
              <p className="text-[10px] text-slate-500">Likes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:px-4">
            <div className="w-9 h-9 rounded-lg bg-blue-950/40 border border-blue-900/40 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <AnimatedNumber
                value={metrics.totalComments || 0}
                format={formatCompactViews}
                className="block text-lg font-bold text-white tabular-nums"
              />
              <p className="text-[10px] text-slate-500">Comments</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:px-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-900/40 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <AnimatedNumber
                value={metrics.totalShares || 0}
                format={formatCompactViews}
                className="block text-lg font-bold text-white tabular-nums"
              />
              <p className="text-[10px] text-slate-500">Shares</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:px-4 sm:last:pr-0">
            <div className="w-9 h-9 rounded-lg bg-purple-950/40 border border-purple-900/40 flex items-center justify-center flex-shrink-0">
              <Bookmark className="w-4 h-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <AnimatedNumber
                value={metrics.totalSaves || 0}
                format={formatCompactViews}
                className="block text-lg font-bold text-white tabular-nums"
              />
              <p className="text-[10px] text-slate-500">Saves</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
