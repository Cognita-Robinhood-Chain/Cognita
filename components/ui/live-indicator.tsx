"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSimulationMode } from "@/lib/identity/mode";
import { activeChain } from "@/lib/web3/chains";
import { cn } from "@/lib/cn";

type Conn = "connecting" | "live" | "offline";

const CHECK_MS = 3000;

/** Indikator "Live" (cognita-app.html `.live`). Jujur terhadap status sesungguhnya: membaca
 *  koneksi WebSocket Supabase Realtime dari browser client (singleton @supabase/ssr, jadi
 *  socket-nya sama dengan yang dipakai useRealtimeChanges). Label kedua = mode: "simulation"
 *  atau nama chain aktif dari konfigurasi (tidak pernah hard-code nama chain). */
export function LiveIndicator({ className }: { className?: string }) {
  const [conn, setConn] = useState<Conn>("connecting");

  useEffect(() => {
    let client: ReturnType<typeof createClient> | null = null;
    try {
      client = createClient();
    } catch {
      // Supabase belum dikonfigurasi -- tidak ada realtime sama sekali. setState di sini
      // menanggapi kegagalan sistem luar, bukan turunan render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConn("offline");
      return;
    }
    let everLive = false;
    const check = () => {
      const ok = client?.realtime.isConnected() ?? false;
      if (ok) everLive = true;
      setConn(ok ? "live" : everLive ? "offline" : "connecting");
    };
    check();
    const id = setInterval(check, CHECK_MS);
    return () => clearInterval(id);
  }, []);

  const mode = isSimulationMode ? "simulation" : activeChain.name;
  const label = conn === "live" ? "Live" : conn === "connecting" ? "Connecting" : "Reconnecting";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[7px] whitespace-nowrap font-mono text-[10.5px] font-medium uppercase leading-none tracking-[0.12em]",
        conn === "live" ? "text-cobalt" : "text-muted",
        className
      )}
      title={
        conn === "live"
          ? "Realtime connected: the city updates as it happens."
          : "Realtime is not connected yet. Numbers may be a few seconds behind."
      }
    >
      <i
        aria-hidden
        className={cn(
          "size-[7px] rounded-full",
          conn === "live" ? "animate-ping-soft bg-cobalt" : "bg-faint"
        )}
      />
      {label}
      <span className="hidden text-faint tab:inline">· {mode}</span>
    </span>
  );
}
