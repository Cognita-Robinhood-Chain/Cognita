import type { ReactNode } from "react";
import { MotionHeader } from "@/components/motion/primitives";
import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { WalletConnect } from "@/components/wallet-connect";
import { cn } from "@/lib/cn";

/** Header bersama semua halaman (cognita-app.html `.top`): logo · nav · motto · stat · aksi ·
 *  wallet. Sebelumnya tiap page menyalin markup header sendiri.
 *
 *  Tata letak:
 *  - wide (>=1481px): satu baris; stat strip mengisi ruang tengah.
 *  - desk (1181-1480px): baris 1 logo + nav + wallet, baris 2 stat strip.
 *  - < desk: baris 1 logo + wallet, baris 2 nav (lebar penuh), baris 3 stat strip.
 *    Nav tidak pernah disembunyikan (desain menyembunyikannya di <=720px -- diperbaiki).
 *  `title` = <h1> untuk pembaca layar (logo kini berupa link, bukan heading). */
export function SiteHeader({
  title,
  stats,
  actions,
  motto = "Work sealed. Wages shared.",
  showWallet = true,
  className,
}: {
  title: string;
  stats?: ReactNode;
  actions?: ReactNode;
  motto?: string;
  /** false di /login (halaman itu tidak memakai wallet). */
  showWallet?: boolean;
  className?: string;
}) {
  return (
    <MotionHeader
      className={cn(
        "glass-panel flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5 rounded-panel py-2.5 pl-3 pr-3.5",
        className
      )}
    >
      <h1 className="sr-only">{title}</h1>
      <SiteLogo />
      <SiteNav className="order-3 w-full desk:order-none desk:w-auto" />
      <span className="hidden whitespace-nowrap text-[13px] italic text-muted ultra:inline">{motto}</span>
      {/* Stat strip sebaris dengan nav hanya di layar lebar (>=1481px); di bawahnya punya baris
          sendiri selebar penuh supaya tidak terpotong. */}
      {stats && <div className="order-4 flex w-full min-w-0 wide:order-none wide:ml-auto wide:w-auto wide:flex-1 wide:justify-end">{stats}</div>}
      <div className={cn("ml-auto flex min-w-0 items-center gap-2", stats && "wide:ml-0")}>
        {actions}
        {showWallet && <WalletConnect />}
      </div>
    </MotionHeader>
  );
}
