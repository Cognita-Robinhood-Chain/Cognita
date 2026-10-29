'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

export interface JobTab {
  id: string;
  label: string;
  count: number;
  alert?: boolean; // dipakai untuk "Awaiting seal" — angka disorot warna warn
}

export function JobTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: JobTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="no-scrollbar flex justify-between gap-0.5 overflow-x-auto border-b border-line px-2.5 tab:justify-start desk:justify-between ultra:justify-start"
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          onClick={() => onChange(t.id)}
          className={cn(
            'relative shrink-0 whitespace-nowrap px-1.5 py-[11px] text-[12px] text-muted transition-colors hover:text-text tab:px-2 tab:text-[12.5px] desk:px-1.5 desk:text-[12px] ultra:px-2 ultra:text-[12.5px]',
            t.id === active && 'font-semibold text-text',
          )}
        >
          {t.label}
          <span
            className={cn(
              'ml-1 font-mono text-[11px] text-cobalt',
              t.alert && t.count > 0 && 'rounded-full bg-cobalt px-1.5 py-px text-white',
            )}
          >
            {t.count}
          </span>
          {/* Garis cobalt meluncur dari tab lama ke tab baru */}
          {t.id === active && (
            <motion.span
              layoutId="job-tab-underline"
              className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-cobalt"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
