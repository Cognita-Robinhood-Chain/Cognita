import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ChipProps {
  children: ReactNode;
  /** default = pill putih; rank/lead = pill cobalt-wash (Warden, pangkat); sigil = kode Wright. */
  variant?: "default" | "rank" | "lead" | "sigil";
  className?: string;
}

export function Chip({ children, variant = "default", className }: ChipProps) {
  if (variant === "sigil") {
    return (
      <span className={cn("font-mono text-xs font-medium tracking-[0.04em] text-cobalt", className)}>
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium",
        variant === "default" && "border-line bg-surface-2 text-ink-2",
        (variant === "rank" || variant === "lead") && "border-cobalt/20 bg-cobalt-wash text-cobalt",
        className
      )}
    >
      {children}
    </span>
  );
}
