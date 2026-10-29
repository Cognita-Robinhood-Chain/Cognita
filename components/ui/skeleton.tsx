import { cn } from "@/lib/cn";

/** Placeholder berkilau selama data awal belum ada. Kilau otomatis mati lewat aturan
 *  prefers-reduced-motion di globals.css. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-shimmer rounded-md bg-[linear-gradient(90deg,rgba(17,17,22,0.05),rgba(29,78,216,0.08),rgba(17,17,22,0.05))] bg-[length:200%_100%]",
        className
      )}
    />
  );
}
