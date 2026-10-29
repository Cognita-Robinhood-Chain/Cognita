"use client";

import { motion } from "motion/react";

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label ?? "Progress"}
      className="h-[5px] overflow-hidden rounded-full bg-[rgba(17,17,22,0.07)]"
    >
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-cobalt to-cobalt-2"
        // Mulai dari 0 supaya bar "terisi" saat kartu pertama muncul,
        // lalu bergerak halus tiap progress berubah lewat Realtime.
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
