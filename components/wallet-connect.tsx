'use client';

import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
} from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { iconButtonClass } from '@/components/ui/icon-button';
import { SUPPORTED_CHAIN_IDS } from '@/lib/web3/chains';
import { isWeb3Configured } from '@/lib/web3/config';
import { isWalletMode } from '@/lib/identity/mode';
import { X_URL } from '@/lib/social';

/** Tombol ikon X di header -- membuka akun X Cognita di tab baru. */
function XLink() {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Cognita on X"
      title="Follow on X"
      className={iconButtonClass}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  );
}

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Rendered instead of WalletConnectActive when wallet connect can't be used -- no Reown/wagmi
 *  hooks called here (unlike WalletConnectActive below), since those throw if the modal was
 *  never initialized (see web3-provider.tsx). Kept as a separate component rather than an
 *  early return inside WalletConnectActive so the hook calls below stay unconditional either
 *  way (rules-of-hooks). */
function WalletConnectDisabled({ reason, className }: { reason: string; className?: string }) {
  return (
    <span
      title={reason}
      aria-disabled="true"
      className={`${className ?? 'inline-flex'} h-9 cursor-not-allowed items-center rounded-control border border-line bg-surface-2 px-3.5 text-[13px] font-semibold text-muted opacity-70`}
    >
      Connect wallet
    </span>
  );
}

/** Mode simulasi (escrow on-chain belum dikonfigurasi): tidak ada login dan tidak
 *  perlu wallet -- pemilik job = browser ini (lib/identity/sim-id.ts). */
function SimulationBadge() {
  return (
    <span
      title="Simulation mode: no wallet needed. Wages are recorded in the database only, and the jobs you post belong to this browser. Wallet connect turns on once on-chain escrow is configured (NEXT_PUBLIC_WAGEHOLD_NETWORK + NEXT_PUBLIC_STRONGBOX_ADDRESS + NEXT_PUBLIC_WAGE_TOKEN_ADDRESS)."
      className="inline-flex h-9 items-center gap-[7px] rounded-control border border-line bg-surface-2 px-3 text-[12.5px] text-ink-2"
    >
      <i aria-hidden className="size-[7px] rounded-full bg-live shadow-[0_0_0_3px_rgba(34,176,125,0.18)]" />
      Simulation<span className="hidden text-muted ultra:inline">&nbsp;· this browser</span>
    </span>
  );
}

/** Tautan kecil "Connect wallet" di dalam teks (Job Board / Job Detail). Hook AppKit hanya
 *  dipanggil di komponen terpisah yang dirender kalau AppKit memang diinisialisasi. */
function ConnectWalletLinkActive() {
  const { open } = useAppKit();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="font-medium text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
    >
      Connect your wallet
    </button>
  );
}

export function ConnectWalletLink() {
  if (!isWeb3Configured) {
    return (
      <span title="Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local to enable wallet connect">
        Connect your wallet
      </span>
    );
  }
  return <ConnectWalletLinkActive />;
}

function ConnectWalletButtonActive() {
  const { open } = useAppKit();
  return (
    <Button variant="primary" onClick={() => open()}>
      Connect wallet
    </Button>
  );
}

/** Tombol besar "Connect wallet" untuk empty state (Job Board). */
export function ConnectWalletButton() {
  if (!isWeb3Configured) {
    return (
      <Button
        variant="primary"
        disabled
        title="Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local to enable wallet connect"
      >
        Connect wallet
      </Button>
    );
  }
  return <ConnectWalletButtonActive />;
}

function WalletConnectActive() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <Button variant="primary" className="h-9" onClick={() => open()}>
        Connect wallet
      </Button>
    );
  }

  const wrongNetwork =
    typeof chainId === 'number' && !SUPPORTED_CHAIN_IDS.has(chainId);

  if (wrongNetwork) {
    return (
      <Button
        className="h-9 border-warn/50 bg-warn/10 text-warn hover:border-warn"
        onClick={() => open({ view: 'Networks' })}
      >
        Wrong network · switch
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button className="h-9 font-mono text-xs font-medium" onClick={() => open({ view: 'Account' })}>
        {truncate(address)}
      </Button>
      <button
        onClick={() => disconnect()}
        aria-label="Disconnect wallet"
        title="Disconnect wallet"
        className={`${iconButtonClass} text-muted hover:text-text`}
      >
        ×
      </button>
    </div>
  );
}

/** Identitas di header semua halaman -- menggantikan Sign in / Sign out (tidak ada login lagi).
 *
 *  - Mode wallet (escrow on-chain terkonfigurasi): tombol Connect wallet. Wallet inilah
 *    "akun" -- pemilik job = alamat yang mengunci wage.
 *  - Mode simulasi (default sekarang): lencana "Simulation" + tombol Connect wallet nonaktif.
 *    Pemilik job = browser ini, tanpa wallet.
 *
 *  Posisi (kanan header) diatur oleh SiteHeader. */
export function WalletConnect() {
  let content: React.ReactNode;
  if (!isWalletMode) {
    content = (
      <>
        <SimulationBadge />
        {/* Tidak berfungsi di mode simulasi -- disembunyikan di ponsel supaya header muat. */}
        <WalletConnectDisabled
          className="hidden tab:inline-flex"
          reason="Simulation mode: no wallet needed. Wallet connect turns on once on-chain escrow (mainnet) is configured in .env.local." />
      </>
    );
  } else if (!isWeb3Configured) {
    content = (
      <WalletConnectDisabled reason="Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local (see .env.local.example) to enable wallet connect" />
    );
  } else {
    content = <WalletConnectActive />;
  }

  return (
    <div className="flex min-w-0 items-center gap-2 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
      <XLink />
      {content}
    </div>
  );
}
