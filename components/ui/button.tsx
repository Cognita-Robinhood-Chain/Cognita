"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "default" | "primary" | "ghost";
  size?: "default" | "small";
}

/** Tombol (cognita-app.html `.btn`): primary = gradien cobalt + kilau saat hover,
 *  default = putih bergaris, ghost = tanpa latar. */
export function Button({
  variant = "default",
  size = "default",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-semibold transition-[border-color,filter,opacity,background-color] disabled:opacity-55",
        variant === "default" &&
          "border border-line-2 bg-surface-2 text-text hover:border-[rgba(17,17,22,0.25)]",
        variant === "primary" &&
          "bg-cta shine overflow-hidden border-0 text-white shadow-cta hover:brightness-[1.06] disabled:hover:brightness-100",
        variant === "ghost" && "border border-transparent bg-transparent text-ink-2 hover:bg-cobalt-wash",
        size === "default" && "h-[38px] rounded-control px-3.5 text-[13px]",
        size === "small" && "h-8 rounded-control-sm px-3 text-[12.5px]",
        className
      )}
      {...props}
    />
  );
}
