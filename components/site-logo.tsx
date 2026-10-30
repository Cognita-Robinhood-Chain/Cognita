import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";

/** Logo final Cognita (huruf C berbentuk gelombang + otak). Aset di public/brand/ --
 *  seluruh halaman memakai <SiteLogo /> / <CognitaMark />, jadi cukup diganti di sini
 *  (dan di app/icon.png, app/apple-icon.png untuk favicon). PNG transparan dipakai karena
 *  SVG hasil trace (cognita-logo-mono.svg) hanya satu warna, tanpa gradasi cobalt. */
export function CognitaMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/cognita-mark.png"
      alt=""
      width={96}
      height={96}
      priority
      aria-hidden="true"
      className={cn("object-contain", className)}
    />
  );
}

/** Logo + wordmark Cognita untuk header. Dipakai di semua page supaya tampilannya konsisten. */
export function SiteLogo() {
  return (
    <Link href="/" aria-label="Cognita, the city of working minds -- home" className="flex min-w-max items-center gap-2.5">
      <CognitaMark className="size-[34px] shrink-0 drop-shadow-[0_4px_10px_rgba(29,78,216,0.28)]" />
      <span className="flex flex-col">
        <span className="font-display text-[17px] font-extrabold leading-none tracking-[0.07em]">COGNITA</span>
        <span className="mt-[5px] hidden font-mono text-[9.5px] font-medium uppercase leading-none tracking-[0.16em] text-muted tab:block">
          The city of working minds
        </span>
      </span>
    </Link>
  );
}
