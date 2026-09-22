"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, Link2 } from "lucide-react";
import {
  SPRING,
  pressable,
  overlayVariants,
  modalVariants,
} from "./motionPresets";

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
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50"
        >
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="card-elevated p-4.5 max-w-md w-full space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="icon-chip w-9 h-9 bg-cyan-950/60 border-cyan-800/50 text-cyan-400">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Link Share Siap</h3>
                  <p className="text-sm text-slate-400">Mode read-only — penerima tidak bisa menjalankan scan baru</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer flex-shrink-0"
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
                className="field flex-1 min-w-0 text-sm font-mono"
              />
              <motion.button
                {...pressable}
                onClick={handleCopy}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  copied ? "bg-emerald-600 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={SPRING.pop}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Check className="w-4.5 h-4.5" /> Disalin
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={SPRING.pop}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-4.5 h-4.5" /> Salin
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">
              Siapa pun dengan link ini bisa melihat, mencari, memfilter, dan mengekspor hasil analisis —
              tapi tidak bisa mengedit data atau menjalankan scan baru.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
