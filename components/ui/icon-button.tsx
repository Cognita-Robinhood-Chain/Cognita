import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/** Tombol ikon persegi 36px (cognita-app.html `.icon-btn`). `aria-label` wajib diisi pemanggil. */
export function IconButton({
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { "aria-label": string }) {
  return <button type="button" className={cn(iconButtonClass, className)} {...props} />;
}

/** Kelas yang sama untuk <a> / <Link> berbentuk tombol ikon. */
export const iconButtonClass =
  "grid size-9 shrink-0 place-items-center rounded-control border border-line bg-surface-2 text-text transition-colors hover:border-line-2 [&_svg]:size-[15px]";
