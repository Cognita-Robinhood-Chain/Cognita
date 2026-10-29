"use client";

import { AnimatePresence, motion } from "motion/react";
import { Panel, PanelHeader, PanelScroll } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { LedgerEvent } from "@/types/domain";

export function LedgerWall({
  events,
  className,
}: {
  events: LedgerEvent[];
  className?: string;
}) {
  return (
    <Panel className={cn(className)}>
      <PanelHeader title="Ledger Wall" />
      <PanelScroll>
        {events.length === 0 ? (
          <EmptyState title="Nothing recorded yet">Every action in the city is carved into the Ledger.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-1.5 p-3">
            {/* html berasal dari event yang kita generate sendiri (bukan
                input client langsung) -- kalau nanti actor/note bisa diisi
                pihak luar, escape dulu sebelum masuk sini. */}
            {/* Event baru dari Realtime masuk di paling atas: turun dari atas sambil
                fade in, baris lain bergeser halus (`layout="position"`). Render awal
                dari server tidak dianimasikan (`initial={false}`). */}
            <AnimatePresence initial={false}>
              {events.map((e, i) => (
                <motion.li
                  key={e.id}
                  layout="position"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="rounded-[4px_12px_12px_4px] border border-l-2 border-line border-l-cobalt bg-white/75 px-3 py-2 text-[12px] text-ink-2 [&_b]:font-semibold [&_b]:text-text"
                  {...(i === 0 ? { "data-latest": true } : {})}
                  dangerouslySetInnerHTML={{ __html: e.html }}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </PanelScroll>
    </Panel>
  );
}
