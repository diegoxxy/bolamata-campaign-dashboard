"use client";

import { motion } from "motion/react";
import type { GlobalMetrics } from "@/lib/social/types";
import { formatCompactViews, formatFullNumber, formatPercent } from "@/lib/social/format";
import { ClipboardCheck, Eye, Crown, Heart, MessageSquare, Share2, Bookmark } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";
import { WobbleIcon, gridStagger, fadeUp, cardLift, SPRING, EASE_OUT } from "./motionPresets";

type EngageKey = "totalLikes" | "totalComments" | "totalShares" | "totalSaves";
type IconType = typeof Heart;

const ENGAGE: { key: EngageKey; label: string; Icon: IconType; chip: string; tone: string }[] = [
  { key: "totalLikes", label: "Likes", Icon: Heart, chip: "bg-rose-950/50 border-rose-900/50", tone: "text-rose-400" },
  { key: "totalComments", label: "Comments", Icon: MessageSquare, chip: "bg-blue-950/50 border-blue-900/50", tone: "text-blue-400" },
  { key: "totalShares", label: "Shares", Icon: Share2, chip: "bg-emerald-950/50 border-emerald-900/50", tone: "text-emerald-400" },
  { key: "totalSaves", label: "Saves", Icon: Bookmark, chip: "bg-purple-950/50 border-purple-900/50", tone: "text-purple-400" },
];

export default function KpiRibbon({ metrics, hashtag }: { metrics: GlobalMetrics; hashtag: string }) {
  const engagementTotal =
    (metrics.totalLikes || 0) +
    (metrics.totalComments || 0) +
    (metrics.totalShares || 0) +
    (metrics.totalSaves || 0);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="flex items-baseline gap-2.5 mb-4"
      >
        <h2 className="text-sm font-bold text-fg-muted uppercase tracking-[0.14em]">
          Ringkasan Performa
        </h2>
        <span className="text-sm font-semibold text-accent truncate">#{hashtag}</span>
      </motion.div>

      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Submissions + qualified rate */}
        <motion.div
          variants={fadeUp}
          {...cardLift}
          className="card-elevated group relative overflow-hidden p-5"
        >
          <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-cyan-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-150" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2 text-sm text-fg-muted font-bold uppercase tracking-wider">
              <WobbleIcon className="text-cyan-400">
                <ClipboardCheck className="w-5 h-5" />
              </WobbleIcon>
              Submissions
            </div>
            <span className="text-xs font-mono text-fg-subtle">01</span>
          </div>
          <AnimatedNumber
            value={metrics.totalSubmitted}
            format={formatFullNumber}
            className="block text-hero leading-tight font-bold text-white mt-2 tabular-nums"
          />
          <div className="mt-4 h-2 bg-slate-800/80 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 origin-left"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: Math.min(100, metrics.qualifiedRate) / 100 }}
              style={{ width: "100%" }}
              transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.15 }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-2 flex items-center gap-1.5">
            Qualified rate
            <span className="text-emerald-400 font-bold tabular-nums">
              {formatPercent(metrics.qualifiedRate)}
            </span>
          </p>
        </motion.div>

        {/* Total views — hero */}
        <motion.div
          variants={fadeUp}
          {...cardLift}
          className="group relative overflow-hidden rounded-2xl border border-amber-900/45 p-5 bg-[linear-gradient(145deg,#182338,#0f1a2e_60%,#0d1526)]"
        >
          <div className="absolute -right-8 -top-5 w-32 h-32 rounded-full bg-amber-500/12 blur-2xl transition-all duration-500 group-hover:scale-125" />
          <div
            aria-hidden
            className="absolute inset-0 mesh-fade opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(251,191,36,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.06) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2 text-sm text-amber-200/90 font-bold uppercase tracking-wider">
              <WobbleIcon className="text-amber-400" intensity={1.2}>
                <Eye className="w-5 h-5" />
              </WobbleIcon>
              Total Campaign Views
            </div>
            <span className="text-xs font-mono text-fg-subtle">02</span>
          </div>
          <AnimatedNumber
            value={metrics.totalViews}
            format={formatCompactViews}
            className="block text-hero leading-tight font-bold text-amber-gradient mt-2 tabular-nums relative"
          />
          <p className="text-sm text-slate-400 mt-2 relative">
            {formatFullNumber(metrics.totalViews)} views akumulasi
          </p>
        </motion.div>

        {/* Top creator */}
        <motion.div
          variants={fadeUp}
          {...cardLift}
          className="card-elevated group relative overflow-hidden p-5"
        >
          <div className="absolute -right-6 -top-4 w-24 h-24 rounded-full bg-cyan-500/10 blur-xl transition-all duration-500 group-hover:scale-110" />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2 text-sm text-fg-muted font-bold uppercase tracking-wider">
              <WobbleIcon className="text-cyan-400" intensity={1.2}>
                <Crown className="w-5 h-5" />
              </WobbleIcon>
              Top Creator
            </div>
            <span className="text-xs font-mono text-fg-subtle">03</span>
          </div>
          {metrics.topCreator ? (
            <div className="mt-2 relative">
              <p className="text-2xl font-bold text-accent truncate">
                @{metrics.topCreator.authorName}
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-lg font-bold text-amber-400 tabular-nums">
                  {formatCompactViews(metrics.topCreator.totalViews)}
                </span>
                <span className="text-sm text-slate-400">views</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 mt-3 relative">Belum ada data</p>
          )}
          <div className="mt-4 flex items-center gap-2 relative">
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-transparent" />
          </div>
        </motion.div>
      </motion.div>

      {/* Engagement breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.4, ease: EASE_OUT }}
        className="mt-5 card-elevated p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-fg-muted uppercase tracking-[0.14em] font-bold">
            Engagement Breakdown
          </p>
          <p className="text-sm text-fg-muted font-mono">
            {formatCompactViews(engagementTotal)} total interactions
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ENGAGE.map((e, i) => (
            <EngagementCell
              key={e.label}
              Icon={e.Icon}
              label={e.label}
              value={metrics[e.key]}
              chip={e.chip}
              tone={e.tone}
              delay={0.22 + i * 0.06}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function EngagementCell({
  Icon,
  label,
  value,
  chip,
  tone,
  delay,
}: {
  Icon: IconType;
  label: string;
  value: number;
  chip: string;
  tone: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...SPRING.gentle, delay }}
      whileHover={{ y: -2, transition: SPRING.snappy }}
      className="group flex items-center gap-3 sm:px-4 sm:first:pl-0"
    >
      <motion.div
        className={`icon-chip w-10 h-10 ${chip} ${tone}`}
        whileHover={{ scale: 1.12, rotate: -4, transition: SPRING.snappy }}
        whileTap={{ scale: 0.92 }}
      >
        <Icon className="w-5 h-5" />
      </motion.div>
      <div className="min-w-0">
        <AnimatedNumber
          value={value || 0}
          format={formatCompactViews}
          className="block text-xl font-bold text-white tabular-nums"
        />
        <p className="text-sm text-fg-muted">{label}</p>
      </div>
    </motion.div>
  );
}
