"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

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
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className={`flex items-start gap-2.5 rounded-xl border p-3.5 shadow-xl backdrop-blur-sm ${
              t.variant === "success"
                ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-200"
                : "bg-red-950/90 border-red-800/60 text-red-200"
            }`}
          >
            {t.variant === "success" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
            )}
            <p className="text-xs leading-relaxed flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
