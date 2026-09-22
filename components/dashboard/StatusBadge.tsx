"use client";

import { motion } from "motion/react";
import type { VideoStatus } from "@/lib/social/types";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { badgePop } from "./motionPresets";

const STYLES: Record<VideoStatus, string> = {
  qualified: "bg-emerald-950/50 text-emerald-400 border-emerald-800/60",
  unqualified: "bg-slate-800/70 text-fg-subtle border-border-strong",
  error: "bg-red-950/50 text-red-400 border-red-800/60",
};

const LABELS: Record<VideoStatus, string> = {
  qualified: "Qualified",
  unqualified: "Unqualified",
  error: "Error/Private",
};

const ICONS: Record<VideoStatus, React.ComponentType<{ className?: string }>> = {
  qualified: CheckCircle2,
  unqualified: AlertTriangle,
  error: XCircle,
};

/** Badge status: icon pop-in saat mount, micro-bounce saat hover. */
export default function StatusBadge({ status }: { status: VideoStatus }) {
  const Icon = ICONS[status];

  return (
    <motion.span
      variants={badgePop}
      initial="initial"
      animate="animate"
      className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-md border ${STYLES[status]}`}
    >
      <Icon className="w-4 h-4" />
      {LABELS[status]}
    </motion.span>
  );
}
