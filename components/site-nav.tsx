"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "The City" },
  { href: "/jobs", label: "Job Board" },
  { href: "/weighhouse", label: "Weighhouse" },
];

/** Nav segmented di header (cognita-app.html `.tabs`). Berbeda dari desain referensi, nav
 *  TIDAK disembunyikan di layar sempit -- di mobile dia jadi baris penuh sendiri (lihat
 *  SiteHeader), karena tanpa nav pengguna tidak bisa pindah halaman. Pill aktif memakai
 *  `layoutId` supaya meluncur antar tab. */
export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={cn("no-scrollbar overflow-x-auto", className)}>
      <ul className="flex w-max min-w-full gap-1 rounded-full border border-line bg-[rgba(17,17,22,0.04)] p-1">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href} className="relative flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 block whitespace-nowrap rounded-full px-3 py-[7px] text-center text-[13px] font-medium text-ink-2 transition-colors hover:text-text wide:px-[13px]",
                  active && "text-text"
                )}
              >
                {l.label}
              </Link>
              {active && (
                <motion.span
                  layoutId="site-nav-pill"
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-surface-2 shadow-[0_2px_8px_-2px_rgba(17,17,22,0.15)]"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
