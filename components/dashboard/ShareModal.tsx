"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, Link2 } from "lucide-react";

interface ShareModalProps {
  url: string | null;
  onClose: () => void;
}

export default function ShareModal({ url, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API mungkin diblokir — biarkan user select+copy manual dari input.
    }
  };

  return (
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111827] border border-[#1e293b] p-6 rounded-xl max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Link Share Siap</h3>
                  <p className="text-[11px] text-slate-500">Mode read-only — penerima tidak bisa menjalankan scan baru</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 bg-[#0b0f19] border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500"
              />
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleCopy}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  copied ? "bg-emerald-600 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Disalin
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin
                  </>
                )}
              </motion.button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Siapa pun dengan link ini bisa melihat, mencari, memfilter, dan mengekspor hasil analisis —
              tapi tidak bisa mengedit data atau menjalankan scan baru.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
