"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { itemVariants } from "@/components/motion/primitives";

/** Panel kaca (cognita-app.html `.panel`). Ikut animasi stagger kalau berada di dalam
 *  <MotionPage>. Di luar itu (mis. /dev/components) dia tidak beranimasi sama sekali. */
export function Panel({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={itemVariants}
      className={cn("glass-panel flex min-h-0 flex-col overflow-hidden rounded-panel", className)}
    >
      {children}
    </motion.section>
  );
}

/** Judul panel: font display 15/700 dengan kotak gradien cobalt kecil di depannya.
 *  `hint` = teks petunjuk kecil di kanan; `action` = tombol / elemen bebas. */
export function PanelHeader({
  title,
  action,
  hint,
  className,
}: {
  title: string;
  action?: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2.5 border-b border-line px-4 py-3.5", className)}>
      <h2 className="flex min-w-0 items-center gap-2.5 font-display text-[15px] font-bold leading-none tracking-[-0.01em] text-text">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-[3px] bg-gradient-to-br from-cobalt-soft to-cobalt shadow-[0_0_0_3px_rgba(29,78,216,0.12)]"
        />
        <span className="truncate">{title}</span>
      </h2>
      {hint && <span className="hidden text-[11.5px] text-faint tab:inline">{hint}</span>}
      {action}
    </div>
  );
}

/** Wadah scroll di dalam Panel — dipakai untuk daftar panjang (job list, roster).
 *  `layoutScroll` wajib supaya animasi `layout` anak-anaknya tetap akurat saat
 *  daftar sedang di-scroll (dipakai Ledger Wall). */
export function PanelScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div layoutScroll className={cn("min-h-0 flex-1 overflow-auto", className)}>
      {children}
    </motion.div>
  );
}

/** Label kecil uppercase untuk sub-bagian di dalam panel (`.sub` di desain). */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("eyebrow", className)}>{children}</h3>;
}
