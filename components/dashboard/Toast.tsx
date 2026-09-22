"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { toastSpring, pressable } from "./motionPresets";

export interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

let idCounter = 0;

/** Hook kecil untuk memunculkan notifikasi toast, dipakai sebagai pengganti alert(). */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastItem["variant"] = "success") => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), 4200);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  return { toasts, showToast, dismiss };
}

export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            variants={toastSpring}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
            className={`relative flex items-start gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md overflow-hidden ${
              t.variant === "success"
                ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-200"
                : "bg-red-950/90 border-red-800/60 text-red-200"
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-0 top-0 h-full w-0.5 ${
                t.variant === "success" ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            <span className="icon-chip w-6 h-6 bg-white/5 border-white/10 text-current flex-shrink-0 mt-0.5">
              {t.variant === "success" ? (
                <CheckCircle2 className="w-4.5 h-4.5" />
              ) : (
                <AlertCircle className="w-4.5 h-4.5" />
              )}
            </span>
            <p className="text-sm leading-relaxed flex-1">{t.message}</p>
            <motion.button
              type="button"
              onClick={() => onDismiss(t.id)}
              {...pressable}
              className="text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4.5 h-4.5" />
            </motion.button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
