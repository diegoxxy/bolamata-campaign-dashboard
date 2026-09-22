"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Shared motion presets — pola Vercel/Linear: easing cepat (OutExpo), spring
 * stiff (300–500), durasi 0.2–0.45s. Mohon tidak menambah interpolasi aneh.
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Container yang mengstagger children saat masuk viewport/mount. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

/** @deprecated ganti nama ke staggerContainer — alias biar diff lama tetap jalan. */
export const gridStagger = staggerContainer;

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

/** Reveal sekilas + scale kecil — untuk section/table besar. */
export const reveal = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
};

/** Card folder/KPI: lift halus saat hover, press feedback saat tap. */
export const cardLift = {
  whileHover: { y: -3, transition: { type: "spring" as const, stiffness: 420, damping: 26 } },
  whileTap: { scale: 0.99 },
};

/** Feedback seragam untuk semua tombol — dapatkan konsistensi tanpa tulis ulang. */
export const pressable = {
  whileHover: { y: -1, transition: { type: "spring" as const, stiffness: 500, damping: 30 } },
  whileTap: { scale: 0.96 },
};

/** Micro-bar proporsional: tumbuh dari kiri, lift saat hover. */
export const barLift = {
  initial: { width: 0 },
  whileHover: { scaleY: 1.6, transition: { type: "spring" as const, stiffness: 500, damping: 30 } },
};

export const SPRING = {
  /** Slider toggle & chip — snappy, no bounce. */
  snappy: { type: "spring" as const, stiffness: 500, damping: 34 },
  /** Pop-in badge & icon — sedikit overshoot. */
  pop: { type: "spring" as const, stiffness: 480, damping: 22 },
  /** Toast & floating element — tenang. */
  gentle: { type: "spring" as const, stiffness: 400, damping: 32 },
};

/** Header/page entrance: slide dari atas, 0.5s. */
export const headerSlide = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE_OUT },
};

/** Backdrop + dialog — pola modal Linear-style. */
export const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalVariants = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
  transition: { duration: 0.22, ease: EASE_OUT },
};

export const badgePop = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: SPRING.pop,
  whileHover: { scale: 1.06, transition: SPRING.snappy },
};

export const toastSpring = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: 40, transition: { duration: 0.2 } },
  transition: SPRING.gentle,
};

/**
 * Icon ayunan kecil saat hover — reference: pola "icon wiggle" Vercel.
 * whileTap scale 0.88 biar terasa tertekan.
 */
export function WobbleIcon({
  children,
  className,
  intensity = 1,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <span className={`inline-flex ${className ?? ""}`}>{children}</span>;

  return (
    <motion.span
      className={`inline-flex ${className ?? ""}`}
      whileHover={{
        rotate: [0, -8 * intensity, 6 * intensity, -4 * intensity, 0],
        scale: 1 + 0.14 * intensity,
      }}
      whileTap={{ scale: 0.88 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      {children}
    </motion.span>
  );
}

/**
 * Icon kedutan denyut (heartbeat) — untuk icon status/penting.
 * Hanya jalan jika tidak ada request reduced-motion.
 */
export function HeartbeatIcon({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <span className={`inline-flex ${className ?? ""}`}>{children}</span>;

  return (
    <motion.span
      className={`inline-flex ${className ?? ""}`}
      animate={{ scale: [1, 1.18, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.span>
  );
}
