"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Eye } from "lucide-react";
import type { SharePayload } from "@/lib/social/types";
import ResultsView from "./ResultsView";

export default function ShareView({ payload }: { payload: SharePayload }) {
  const createdLabel = new Date(payload.createdAt).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="border-b border-[#1e293b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl px-3.5 py-3 shadow-lg shadow-black/30 flex-shrink-0">
              <Image
                src="/logo-bolamata.png"
                alt="Bola Mata Currency Clippers Agency"
                width={1048}
                height={136}
                priority
                className="h-6 sm:h-7 w-auto"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 text-amber-400">
                <Eye className="w-3.5 h-3.5" />
                Shared Report — Read Only
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Campaign Analytics Report
              </h1>
              <p className="text-sm text-slate-400 mt-1">Dibuat pada {createdLabel}</p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#131b2e] hover:bg-[#1a2438] border border-[#1e293b] text-slate-300 rounded-lg text-xs font-semibold transition-colors self-start md:self-auto"
          >
            Buat Analisis Sendiri →
          </Link>
        </motion.header>

        <ResultsView hashtag={payload.hashtag} allVideos={payload.videos} readOnly />
      </div>
    </main>
  );
}
