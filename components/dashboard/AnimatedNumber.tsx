"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

interface Props {
  value: number;
  format: (n: number) => string;
  className?: string;
}

/**
 * Menampilkan angka yang "menghitung naik/turun" secara halus setiap kali
 * `value` berubah — dipakai di KPI ribbon supaya hasil scan terasa hidup,
 * bukan cuma angka statis yang tiba-tiba berganti.
 */
export default function AnimatedNumber({ value, format, className }: Props) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const controls = animate(prevRef.current, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest: number) => setDisplay(latest),
    });
    prevRef.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}
