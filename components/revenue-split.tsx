"use client";

import { motion } from "motion/react";
import type { RevenueSplitData } from "@/types/domain";

// Warna segmen dari desain (cognita-app.html SPLIT): Patrons cobalt, Lamp Oil cobalt muda,
// Tithe abu, Furnace merah (dibakar).
const ROWS: { key: keyof RevenueSplitData; label: string; color: string }[] = [
  { key: "patronsPct", label: "Patrons", color: "bg-cobalt" },
  { key: "lampOilPct", label: "Lamp Oil", color: "bg-cobalt-soft" },
  { key: "tithePct", label: "Tithe", color: "bg-tithe" },
  { key: "furnacePct", label: "Furnace", color: "bg-furnace" },
];

export function RevenueSplit({ data }: { data: RevenueSplitData }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={ROWS.map((r) => `${r.label} ${data[r.key]}%`).join(", ")}
      >
        {ROWS.map((r, i) => (
          // Tiap segmen tumbuh dari 0 ke persentasenya, berurutan kiri -> kanan.
          <motion.span
            key={r.key}
            className={r.color}
            initial={{ width: 0 }}
            animate={{ width: `${data[r.key]}%` }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.35 + i * 0.12 }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted">
        {ROWS.map((r) => (
          <span key={r.key} className="inline-flex items-center">
            <i aria-hidden className={`mr-[5px] inline-block size-[7px] rounded-[2px] ${r.color}`} />
            {r.label} {data[r.key]}%
          </span>
        ))}
      </div>
    </div>
  );
}
