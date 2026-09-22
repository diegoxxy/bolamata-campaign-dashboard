"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Eye, Sparkles, ArrowRight } from "lucide-react";
import type { SharePayload } from "@/lib/social/types";
import ResultsView from "./ResultsView";
import { EASE_OUT, SPRING } from "./motionPresets";

export default function ShareView({ payload }: { payload: SharePayload }) {
  const createdLabel = new Date(payload.createdAt).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <main className="min-h-screen text-slate-100 p-4 md:p-5 font-sans">
      <div className="max-w-7xl mx-auto space-y-4.5">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="card-elevated relative overflow-hidden p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-5"
        >
          {/* glow dekoratif */}
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-40 h-40 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative">
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
              <div className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-[0.14em] mb-1 text-amber-300">
                <Eye className="w-4.5 h-4.5" />
                Shared Report — Read Only
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                Campaign Analytics Report
              </h1>
              <p className="text-sm text-fg-subtle mt-1">Dibuat pada {createdLabel}</p>
            </div>
          </div>

          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING.snappy} className="relative">
            <Link
              href="/"
              className="sheen group inline-flex items-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors overflow-hidden"
            >
              Buat Analisis Sendiri
              <ArrowRight className="w-4.5 h-4.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.header>

        <ResultsView hashtag={payload.hashtag} allVideos={payload.videos} readOnly />
      </div>
    </main>
  );
}
