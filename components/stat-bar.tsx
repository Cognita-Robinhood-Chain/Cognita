"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/cn";

export interface Stat {
  label: string;
  value: string;
  /** Angka utama berwarna cobalt (mis. In the Strongbox). `gold` = nama lama, tetap diterima. */
  accent?: boolean;
  gold?: boolean;
  /** Warna merah (Furnace = yang dibakar). */
  crit?: boolean;
}

/** Strip statistik kota (cognita-app.html `.stats`): satu kapsul, sel dipisah garis.
 *  Bisa digeser horizontal DI DALAM wadahnya sendiri (min-w-0), jadi tidak pernah
 *  mendorong lebar halaman di ponsel. */
export function StatBar({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      aria-label="City stats"
      className={cn(
        "no-scrollbar flex min-w-0 overflow-x-auto rounded-card border border-cobalt/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(237,241,255,0.7))]",
        className
      )}
    >
      {stats.map((s) => (
        <StatCell key={s.label} stat={s} />
      ))}
    </dl>
  );
}

function StatCell({ stat: s }: { stat: Stat }) {
  // Kilat cobalt singkat saat nilainya berubah lewat Realtime (render awal tidak berkilat).
  const [flash, setFlash] = useState(false);
  const prev = useRef(s.value);
  useEffect(() => {
    if (prev.current === s.value) return;
    prev.current = s.value;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [s.value]);

  const accent = s.accent || s.gold;

  return (
    <div className="flex flex-none flex-col border-r border-line px-2.5 py-1.5 last:border-r-0 tab:px-3 wide:py-[7px] ultra:px-4">
      <dt className="eyebrow tab:whitespace-nowrap">{s.label}</dt>
      {/* Saat nilai berubah angka lama naik keluar, angka baru naik masuk. */}
      <dd className="relative flex overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={s.value}
            initial={{ y: "70%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-70%", opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn(
              "whitespace-nowrap font-mono text-[13px] font-medium leading-[1.4] tabular-nums transition-colors duration-400 tab:text-sm wide:text-[15px]",
              flash ? "text-cobalt" : accent ? "text-cobalt" : s.crit ? "text-crit" : "text-text"
            )}
          >
            {s.value}
          </motion.span>
        </AnimatePresence>
      </dd>
    </div>
  );
}
