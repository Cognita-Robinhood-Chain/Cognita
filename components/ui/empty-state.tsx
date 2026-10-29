"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Empty state (cognita-app.html `.empty`): judul display opsional + kalimat ajakan. */
export function EmptyState({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="px-3 py-7 text-center text-[13px] text-muted"
    >
      {title && (
        <b className="mb-1 block font-display text-[15px] font-bold leading-snug text-text">{title}</b>
      )}
      {children}
    </motion.div>
  );
}
