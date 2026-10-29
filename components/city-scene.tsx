'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DISTRICT_ORDER,
  WARD_COLOR_HEX,
  WARD_LABEL,
  type AgentStatus,
  type DistrictId,
} from '@/types/domain';
import { cn } from '@/lib/cn';
import { createCity, WEIGH_ID, type CityHandle } from '@/components/city/scene';

// Kota 3D Cognita (desain cognita-app.html): grid 5x5 cobalt, Counting House di pusat,
// lima Ward, Weighhouse & Furnace, skyline di cincin luar. Visual dibangun di
// components/city/* (Three.js murni). API komponen ini SAMA dengan versi lama, jadi
// realtime-city-dashboard.tsx hanya menambah field opsional `isLead` / `name`.
export interface CityAgent {
  id: string;
  code: string;
  district: DistrictId;
  revenue30d: number;
  status: AgentStatus;
  /** Warden: gedung lebih ramping dengan antena, tinggi tetap. */
  isLead?: boolean;
  /** Nama Wright -- dipakai daftar alternatif (keyboard / tanpa WebGL). */
  name?: string;
}

type Control = 'left' | 'right' | 'out' | 'in';
const CONTROLS: [label: string, action: Control, iconPath: string][] = [
  ['Rotate left', 'left', 'M15 18l-6-6 6-6'],
  ['Rotate right', 'right', 'M9 18l6-6-6-6'],
  ['Zoom out', 'out', 'M5 12h14'],
  ['Zoom in', 'in', 'M12 5v14M5 12h14'],
];

const STATUS_TEXT: Record<AgentStatus, string> = {
  idle: 'idle',
  working: 'working',
  review: 'awaiting seal',
};

export function CityScene({
  agents,
  selectedId = null,
  onSelect,
  workRatioPct = null,
  burnPulse = 0,
}: {
  agents: CityAgent[];
  /** Work Ratio 24 jam (persen) dari Weighhouse -- mengatur kilau landmark Weighhouse.
   *  null = belum ada data (redup). */
  workRatioPct?: number | null;
  /** Penghitung event Burned baru (naik 1 tiap burn lewat realtime) -- memicu kilat Furnace.
   *  Nilai awal dipakai sebagai baseline (tidak memicu kilat). */
  burnPulse?: number;
  /** Gedung yang sedang dipilih (label & tepi cobalt). */
  selectedId?: string | null;
  /** Klik gedung -> panggil ini (mis. buka Wright profile di panel kiri).
   *  Kalau tidak diberikan, klik langsung pindah ke /agents/[id]. */
  onSelect?: (id: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CityHandle | null>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Data terbaru lewat ref supaya loop animasi (di luar siklus render React) tidak
  // memegang closure basi.
  const agentsRef = useRef(agents);
  const selectedRef = useRef(selectedId);
  const workRatioRef = useRef(workRatioPct);
  const burnPulseRef = useRef(burnPulse);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    agentsRef.current = agents;
    selectedRef.current = selectedId;
    workRatioRef.current = workRatioPct;
    burnPulseRef.current = burnPulse;
    onSelectRef.current = onSelect;
  }, [agents, selectedId, workRatioPct, burnPulse, onSelect]);

  const pick = (id: string) => {
    if (id === WEIGH_ID) router.push('/weighhouse');
    else if (onSelectRef.current) onSelectRef.current(id);
    else router.push(`/agents/${id}`);
  };
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });

  useEffect(() => {
    const stage = stageRef.current;
    const labelsEl = labelsRef.current;
    if (!stage || !labelsEl) return;
    let handle: CityHandle;
    try {
      handle = createCity({
        stage,
        labelsEl,
        getAgents: () => agentsRef.current,
        getSelected: () => selectedRef.current,
        getWorkRatio: () => workRatioRef.current,
        getBurnPulse: () => burnPulseRef.current,
        onPick: (id) => pickRef.current(id),
        onReady: () => setReady(true),
      });
    } catch {
      // WebGL tidak tersedia (driver / browser lama / dimatikan) -> daftar Wright.
      // setState di sini menanggapi kegagalan sistem luar (WebGL), bukan turunan render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }
    handleRef.current = handle;
    return () => {
      handleRef.current = null;
      handle.dispose();
    };
  }, []);

  function runControl(action: Control) {
    const h = handleRef.current;
    if (!h) return;
    if (action === 'left') h.nudge(-1);
    else if (action === 'right') h.nudge(1);
    else h.zoomBy(action === 'in' ? 1.25 : 1 / 1.25);
  }

  const byWard = DISTRICT_ORDER.map((d) => ({
    d,
    list: agents
      .filter((a) => a.district === d)
      .sort((a, b) => Number(!!b.isLead) - Number(!!a.isLead) || a.code.localeCompare(b.code)),
  }));

  return (
    <div
      ref={stageRef}
      className="relative h-full min-h-[360px] w-full overflow-hidden"
      style={{ background: 'radial-gradient(70% 60% at 50% 38%, #ffffff 0%, #eef1fb 45%, #e2e6f6 100%)' }}
    >
      {/* Placeholder sampai frame pertama tergambar. */}
      {!ready && !failed && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">Raising the city…</span>
        </div>
      )}

      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" />

      {/* Vignette & sudut HUD (dekoratif). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(90% 80% at 50% 45%, transparent 60%, rgba(29,78,216,.08))' }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-2.5 opacity-55">
        {['left-0 top-0', 'right-0 top-0', 'left-0 bottom-0', 'right-0 bottom-0'].map((pos) => (
          <span key={pos} className={cn('absolute size-[18px]', pos)}>
            <span className={cn('absolute h-0.5 w-[18px] bg-cobalt', pos.includes('top') ? 'top-0' : 'bottom-0')} />
            <span className={cn('absolute h-[18px] w-0.5 bg-cobalt', pos.includes('left') ? 'left-0' : 'right-0')} />
          </span>
        ))}
      </div>

      {failed && (
        <div className="absolute inset-0 overflow-auto p-5 pt-16">
          <p className="mb-1 font-display text-[15px] font-bold text-text">3D view needs WebGL.</p>
          <p className="mb-4 text-[12.5px] text-muted">The city still works. Pick a Wright below to open its profile.</p>
          <WrightList byWard={byWard} selectedId={selectedId} onPick={pick} />
        </div>
      )}

      {/* Legend Ward -- disembunyikan saat kolom tengah sempit (1181-1480px); label Ward tetap ada. */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 hidden max-w-[70%] flex-wrap gap-x-3 gap-y-1.5 rounded-control border border-line bg-white/80 px-3 py-[7px] text-[11.5px] text-ink-2 backdrop-blur-sm tab:flex desk:left-[22px] desk:top-[22px] desk:hidden wide:flex">
        {DISTRICT_ORDER.map((d) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            <i className="inline-block size-[7px] rounded-full" style={{ background: WARD_COLOR_HEX[d] }} />
            {WARD_LABEL[d]}
          </span>
        ))}
      </div>

      {/* Kontrol kamera: putar 90° dan zoom (zoom juga untuk layar sentuh tanpa wheel). */}
      {!failed && (
        <div className="absolute right-3 top-3 z-10 flex gap-1.5 desk:right-[22px] desk:top-[22px]">
          {CONTROLS.map(([label, action, d]) => (
            <button
              key={label}
              type="button"
              onClick={() => runControl(action)}
              aria-label={label}
              title={label}
              className="grid size-8 place-items-center rounded-control-sm border border-line bg-white/90 text-ink-2 backdrop-blur-sm transition-colors hover:border-line-2 hover:text-text"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={d} />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Alternatif keyboard / pembaca layar: daftar Wright yang tersembunyi secara visual,
          muncul saat salah satu tombolnya mendapat fokus. */}
      {!failed && (
        <nav
          aria-label="Wrights in the city"
          className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-3 focus-within:top-14 focus-within:z-20 focus-within:max-h-[70%] focus-within:overflow-auto focus-within:rounded-card focus-within:border focus-within:border-line focus-within:bg-white/95 focus-within:p-3 focus-within:shadow-panel"
        >
          <WrightList byWard={byWard} selectedId={selectedId} onPick={pick} />
        </nav>
      )}
    </div>
  );
}

function WrightList({
  byWard,
  selectedId,
  onPick,
}: {
  byWard: { d: DistrictId; list: CityAgent[] }[];
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 tab:grid-cols-2">
      {byWard.map(({ d, list }) => (
        <div key={d}>
          <p className="eyebrow mb-1.5 flex items-center gap-1.5">
            <i className="inline-block size-[7px] rounded-full" style={{ background: WARD_COLOR_HEX[d] }} />
            {WARD_LABEL[d]}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onPick(a.id)}
                  aria-pressed={selectedId === a.id}
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-mono text-[10.5px] transition-colors',
                    selectedId === a.id
                      ? 'border-transparent bg-cobalt text-white'
                      : 'border-line bg-surface-2 text-text hover:border-line-2',
                  )}
                >
                  {a.code}
                  {a.name ? <span className="sr-only">, {a.name}</span> : null}
                  <span className="sr-only">
                    {a.isLead ? ', Warden' : ''}, {STATUS_TEXT[a.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
