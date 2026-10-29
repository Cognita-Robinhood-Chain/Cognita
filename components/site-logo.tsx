import Link from "next/link";

/** Geometri tanda Cognita dari cognita-app.html (viewBox 64x64): huruf C terbuka di kanan
 *  seperti gerbang kota, satu node di tengah (pikiran yang bekerja) dan satu titik satelit.
 *  Diekspor supaya OG image (app/opengraph-image.tsx) memakai bentuk yang sama. */
export const MARK = {
  arc: "M44.4 19.6A17.5 17.5 0 1 0 44.4 44.4",
  arcWidth: 7,
  core: { cx: 32, cy: 32, r: 4.6 },
  satellite: { cx: 49.5, cy: 32, r: 2.4 },
  light: "#EDEDF5",
  gradient: ["#2f62f0", "#1638a3"] as const,
};

/** LOGO SEMENTARA (desain Mas Bimo). Aset final masih keputusan terbuka (brief §8.5) --
 *  seluruh halaman memakai <SiteLogo /> / <CognitaMark />, jadi cukup diganti di sini
 *  (dan di app/icon.svg untuk favicon). */
export function CognitaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="cognita-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={MARK.gradient[0]} />
          <stop offset="1" stopColor={MARK.gradient[1]} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cognita-mark-gradient)" />
      <path d={MARK.arc} fill="none" stroke={MARK.light} strokeWidth={MARK.arcWidth} strokeLinecap="round" />
      <circle {...MARK.core} fill={MARK.light} />
      <circle {...MARK.satellite} fill={MARK.light} />
    </svg>
  );
}

/** Logo + wordmark Cognita untuk header. Dipakai di semua page supaya tampilannya konsisten. */
export function SiteLogo() {
  return (
    <Link href="/" aria-label="Cognita, the city of working minds -- home" className="flex min-w-max items-center gap-2.5">
      <CognitaMark className="size-[34px] shrink-0 drop-shadow-[0_6px_12px_rgba(29,78,216,0.35)]" />
      <span className="flex flex-col">
        <span className="font-display text-[17px] font-extrabold leading-none tracking-[0.07em]">COGNITA</span>
        <span className="mt-[5px] hidden font-mono text-[9.5px] font-medium uppercase leading-none tracking-[0.16em] text-muted tab:block">
          The city of working minds
        </span>
      </span>
    </Link>
  );
}
