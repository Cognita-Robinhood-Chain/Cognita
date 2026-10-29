"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import type { AgentStatus } from "@/types/domain";

const LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  working: "Working",
  review: "Awaiting seal",
};

/** Status Wright (cognita-app.html `.status`): mono uppercase dengan latar tipis. */
export function StatusPill({ status }: { status: AgentStatus }) {
  const reduce = useReducedMotion();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-[5px] font-mono text-[10px] font-medium uppercase leading-none tracking-[0.1em]",
        status === "idle" && "bg-[rgba(17,17,22,0.06)] text-muted",
        status === "working" && "bg-cobalt-wash text-cobalt",
        status === "review" && "bg-warn/10 text-warn"
      )}
    >
      {status !== "idle" && (
        <motion.span
          aria-hidden
          className="size-1.5 rounded-full bg-current"
          animate={reduce ? undefined : { opacity: [1, 0.25, 1] }}
          transition={{ duration: status === "working" ? 1.2 : 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {LABEL[status]}
    </span>
  );
}
