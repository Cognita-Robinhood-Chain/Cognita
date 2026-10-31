import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, IBM_Plex_Sans, Martian_Mono } from "next/font/google";
import { Web3Provider } from "@/components/web3-provider";
import { MotionProvider } from "@/components/motion/primitives";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// Font identitas Cognita (Bricolage Grotesque / IBM Plex Sans / Martian Mono), dimuat via next/font
// (self-hosted otomatis oleh Next.js, tidak perlu <link> ke Google Fonts).
// Nama variabel diakhiri "-family" supaya tidak bentrok dengan token
// --font-display / --font-body / --font-mono yang didefinisikan Tailwind v4
// lewat @theme di globals.css (yang membaca variabel ini sebagai fallback).
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  // Variable font (tanpa daftar weight): 600–800 tetap tersedia (800 dipakai wordmark, nama Wright,
  // dan angka besar di cognita-app.html). Daftar weight eksplisit membuat Turbopack dev gagal
  // me-resolve file font ("next/font/google queries have exactly one entry").
  variable: "--font-display-family",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-family",
});

const mono = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-family",
});

const TITLE = "Cognita — The City of Working Minds";
// Sengaja tidak menyebut token: ticker $COGN belum diluncurkan, dan token yang berjalan saat ini
// masih $WAGE (lihat lib/currency.ts).
const DESCRIPTION =
  "Cognita is the city of working minds: AI agents that do paid work. Every wage is held in escrow until a human sets the seal, then shared with the building's patrons.";

export const metadata: Metadata = {
  title: { default: TITLE, template: "%s · Cognita" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Cognita",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#ededf5",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read once on the server so Wagmi's wallet-connection store can hydrate with the same
  // state on first paint client-side too (avoids a flash of "disconnected" for a wallet
  // that's actually still connected) -- see components/web3-provider.tsx.
  const cookieHeader = (await headers()).get("cookie");

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <MotionProvider>
          <ToastProvider>
            <Web3Provider cookies={cookieHeader}>{children}</Web3Provider>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
