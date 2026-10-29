'use client';

import { WAGE_UNIT } from '@/lib/currency';
import { summarizeStakes, formatWage, type StakeItem } from '@/lib/patronage';
import { useWageBalance } from '@/lib/web3/use-wage-balance';
import { useMemo, useState } from 'react';
import { CityScene, type CityAgent } from '@/components/city-scene';
import { useCityChainSignals } from '@/components/weighhouse/use-work-ratio';
import { StatBar } from '@/components/stat-bar';
import { WrightProfilePanel } from '@/components/wright-profile-panel';
import {
  deriveAgentStats,
  deriveRank,
  deriveWardStats,
} from '@/lib/agent-stats';
import { JobBoard, type JobBoardItem } from '@/components/job-board';
import Link from 'next/link';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { useRealtimeChanges } from '@/lib/supabase/realtime';
import { useIdentity } from '@/lib/identity/use-identity';
import { isWalletMode } from '@/lib/identity/mode';
import { escapeHtml } from '@/lib/escape-html';
import type {
  AgentDetail,
  AgentStatus,
  DistrictId,
  JobStatus,
  JobSummary,
  LedgerEvent,
  Rank,
} from '@/types/domain';
import { MotionPage } from '@/components/motion/primitives';

interface DashboardAgent {
  id: string;
  name: string;
  code: string;
  district: DistrictId;
  rank: Rank;
  isLead: boolean;
  description: string;
  /** WAGE yang dikunci bangunan ini (agents.bond_wage). */
  bondWage: number;
  rating: number | null;
  jobsSealed: number;
  revenue30d: number;
}

/** Bagian patron yang diterima staker (stake_payouts) -- sumber baris feed "You earned". */
interface DashboardPayout {
  id: string;
  jobId: string;
  agentId: string;
  amount: number;
  at: string;
}

interface WageTotals {
  /** Total yang dibakar di Furnace. */
  burned: number;
  /** Counting House: tithe + bagian patron yang tidak terbagi. */
  treasury: number;
}

interface DashboardJob {
  id: string;
  title: string;
  district: DistrictId;
  agentId: string | null;
  status: JobStatus;
  budgetUsdc: number;
  progress: number;
  clientId: string;
  /** Tx hash escrow on-chain -- dipakai Set the seal untuk memilih alur wallet vs simulasi. */
  escrowTx: string | null;
  /** Rating 1-5 dari client saat set-the-seal (0007_job_rating.sql), null
   *  kalau belum di-rate. Dipakai deriveAgentStats() untuk Client rating. */
  rating: number | null;
}

interface DashboardEvent {
  id: string;
  jobId: string;
  at: string;
  actor: string;
  type: string;
  note: string | null;
}

// Ledger Wall cuma menampilkan 20 baris terakhir (sama seperti
// listRecentEvents sebelumnya) -- dijaga di sini juga supaya array event
// tidak tumbuh tanpa batas selama tab dibiarkan terbuka lama.
const MAX_EVENTS = 20;

/**
 * Item 11 (Realtime Ledger Wall): seluruh City Dashboard sekarang satu
 * Client Component yang mulai dari data hasil render server (`initial*`),
 * lalu didorong Supabase Realtime (WebSocket) tiap ada perubahan di
 * `job_events`, `jobs`, atau `agents` -- pengganti `revalidate = 0` +
 * refresh manual. Tinggi gedung, status Wright (idle/working/review), dan
 * Ledger Wall semuanya ikut bergerak tanpa reload, termasuk saat Deepdive
 * memproses job Research Ward lewat Gemini di request lain.
 */
export function RealtimeCityDashboard({
  initialAgents,
  initialJobs,
  initialEvents,
  initialStakes,
  initialTotals,
  initialPayouts,
  initialUserId,
}: {
  initialAgents: DashboardAgent[];
  initialJobs: DashboardJob[];
  initialEvents: DashboardEvent[];
  initialStakes: StakeItem[];
  initialTotals: WageTotals;
  initialPayouts: DashboardPayout[];
  initialUserId: string | null;
}) {
  const [agents, setAgents] = useState(initialAgents);
  const [jobs, setJobs] = useState(initialJobs);
  const [events, setEvents] = useState(initialEvents);
  const [stakes, setStakes] = useState(initialStakes);
  const [totals, setTotals] = useState(initialTotals);
  const [payouts, setPayouts] = useState(initialPayouts);
  // Wright yang profilnya tampil di panel kiri -- default: revenue tertinggi
  // (listAgents mengurutkan revenue_30d menurun). Diganti lewat klik gedung.
  const [selectedId, setSelectedId] = useState<string | null>(
    initialAgents[0]?.id ?? null,
  );
  const userId = useIdentity(initialUserId);
  const walletBalance = useWageBalance();
  // Kilau jendela landmark Weighhouse mengikuti Work Ratio 24 jam.
  const { workRatioPct: workRatio24h, burnPulse } = useCityChainSignals();

  useRealtimeChanges('job_events', (payload) => {
    if (payload.eventType !== 'INSERT') return; // event tidak pernah di-update/dihapus
    const row = payload.new;
    setEvents((prev) => {
      if (prev.some((e) => e.id === row.id)) return prev; // guard kalau event yang sama masuk dobel
      const next: DashboardEvent = {
        id: row.id,
        jobId: row.job_id,
        at: row.at,
        actor: row.actor,
        type: row.type,
        note: row.note,
      };
      return [next, ...prev]
        .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
        .slice(0, MAX_EVENTS);
    });
  });

  useRealtimeChanges('jobs', (payload) => {
    if (payload.eventType === 'DELETE') return; // job tidak pernah dihapus lewat alur produk
    const row = payload.new;
    const next: DashboardJob = {
      id: row.id,
      title: row.title,
      district: row.district,
      agentId: row.agent_id,
      status: row.status,
      budgetUsdc: Number(row.budget_usdc),
      progress: row.progress,
      clientId: row.client_id,
      escrowTx: row.escrow_tx,
      rating: row.rating,
    };
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
  });

  useRealtimeChanges('agents', (payload) => {
    if (payload.eventType !== 'UPDATE') return; // revenue_30d berubah lewat Set the seal
    const row = payload.new;
    setAgents((prev) =>
      prev.map((a) =>
        a.id === row.id
          ? {
              ...a,
              revenue30d: Number(row.revenue_30d),
              bondWage: Number(row.bond_wage ?? a.bondWage),
              rating: row.rating == null ? null : Number(row.rating),
              jobsSealed: row.jobs_sealed,
            }
          : a,
      ),
    );
  });

  // Patronage: stake berubah (stake / unstake / earned bertambah saat seal).
  useRealtimeChanges('stakes', (payload) => {
    if (payload.eventType === 'DELETE') return; // baris stake tidak pernah dihapus (amount 0 = ditarik)
    const row = payload.new;
    const next: StakeItem = {
      stakerId: row.staker_id,
      agentId: row.agent_id,
      amount: Number(row.amount),
      earned: Number(row.earned),
    };
    setStakes((prev) => {
      const idx = prev.findIndex(
        (s) => s.stakerId === next.stakerId && s.agentId === next.agentId,
      );
      if (idx === -1) return [...prev, next];
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
  });

  // Furnace & Counting House: satu baris wage_splits per job yang disegel.
  useRealtimeChanges('wage_splits', (payload) => {
    if (payload.eventType !== 'INSERT') return;
    const row = payload.new;
    setTotals((prev) => ({
      burned: prev.burned + Number(row.furnace),
      treasury:
        prev.treasury + Number(row.tithe) + Number(row.treasury_redirect),
    }));
  });

  // Hanya payout MILIK user ini yang didengar (untuk baris feed "You earned").
  useRealtimeChanges(
    'stake_payouts',
    (payload) => {
      if (payload.eventType !== 'INSERT' || !userId) return;
      const row = payload.new;
      setPayouts((prev) =>
        prev.some((p) => p.id === row.id)
          ? prev
          : [
              {
                id: row.id,
                jobId: row.job_id,
                agentId: row.agent_id,
                amount: Number(row.amount),
                at: row.created_at,
              },
              ...prev,
            ].slice(0, MAX_EVENTS),
      );
    },
    `staker_id=eq.${userId ?? 'none'}`,
  );

  // Status per agent diturunkan dari job aktifnya -- belum ada kolom
  // `status` di tabel agents, karena status memang milik job, bukan agent.
  const statusByAgent = useMemo(() => {
    const map = new Map<string, AgentStatus>();
    for (const job of jobs) {
      if (!job.agentId) continue;
      if (job.status !== 'working' && job.status !== 'review') continue;
      const current = map.get(job.agentId);
      if (job.status === 'review' || current !== 'review') {
        map.set(job.agentId, job.status === 'review' ? 'review' : 'working');
      }
    }
    return map;
  }, [jobs]);

  // Sealed jobs, revenue & rating per agent dari job `paid` sungguhan (lihat
  // lib/agent-stats.ts) -- dipakai untuk tinggi gedung dan Wright profile,
  // bukan lagi agents.revenue_30d / jobs_sealed / rating (angka demo seed).
  const statsByAgent = useMemo(() => {
    const map = new Map<
      string,
      { jobsSealed: number; revenue30d: number; rating: number | null }
    >();
    for (const a of agents) {
      map.set(a.id, deriveAgentStats(jobs.filter((j) => j.agentId === a.id)));
    }
    return map;
  }, [agents, jobs]);

  // Statistik per Ward -- dipakai untuk profil Warden DAN tinggi gedung
  // Warden. Warden tidak pernah punya job sendiri (selectWright() melewati
  // is_lead), jadi angkanya diwakili seluruh Ward (lihat deriveWardStats).
  // Tinggi gedung memakai angka yang sama dengan Revenue 30D di profilnya,
  // supaya gedung Warden ikut naik setiap Wright di Ward-nya kena seal.
  const statsByDistrict = useMemo(() => {
    const map = new Map<
      DistrictId,
      { jobsSealed: number; revenue30d: number; rating: number | null }
    >();
    const districts = new Set(agents.map((a) => a.district));
    for (const d of districts) {
      map.set(d, deriveWardStats(jobs.filter((j) => j.district === d)));
    }
    return map;
  }, [agents, jobs]);

  const cityAgents: CityAgent[] = useMemo(
    () =>
      agents.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        isLead: a.isLead,
        district: a.district,
        // Warden: akumulasi seluruh Ward (sama dengan Revenue 30D di profil);
        // Wright: job miliknya sendiri.
        revenue30d: a.isLead
          ? (statsByDistrict.get(a.district)?.revenue30d ?? 0)
          : (statsByAgent.get(a.id)?.revenue30d ?? 0),
        status: statusByAgent.get(a.id) ?? 'idle',
      })),
    [agents, statsByAgent, statsByDistrict, statusByAgent],
  );

  const sealedCount = useMemo(
    () => jobs.filter((j) => j.status === 'paid').length,
    [jobs],
  );

  const inStrongbox = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.status === 'open' ||
            j.status === 'working' ||
            j.status === 'review',
        )
        .reduce((sum, j) => sum + j.budgetUsdc, 0),
    [jobs],
  );

  const wrightsAtWork = useMemo(
    () => cityAgents.filter((a) => a.status !== 'idle').length,
    [cityAgents],
  );

  // Counting House & Furnace dibaca dari wage_splits (0013), yang dicatat atomik saat
  // seal: treasury = tithe + bagian patron yang tidak terbagi (bangunan tanpa staker).

  const agentCodes = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.code;
    return map;
  }, [agents]);

  // Job Board (kolom kanan) -- gerbang seal (Article I): hanya pemilik job
  // (wallet / browser) yang melihat "Set the seal" / "Send back". Keputusan sesungguhnya
  // tetap di server (Route Handler approve/revise), ini cuma memilih tombol yang tampil.
  const boardItems: JobBoardItem[] = useMemo(
    () =>
      jobs.map((j) => ({
        job: {
          id: j.id,
          title: j.title,
          district: j.district,
          agentCode: j.agentId ? agentCodes[j.agentId] : undefined,
          budgetUsdc: j.budgetUsdc,
          status: j.status,
          progress: j.progress,
          escrowTx: j.escrowTx,
        },
        isOwnJob: !!userId && j.clientId === userId,
      })),
    [jobs, agentCodes, userId],
  );

  // Wright profile (kolom kiri) -- diturunkan dari agents + jobs yang sudah ada di state.
  const selectedAgent: AgentDetail | null = useMemo(() => {
    const a = agents.find((x) => x.id === selectedId);
    if (!a) return null;
    // Sealed jobs, revenue & rating dihitung dari baris `jobs` yang benar-benar
    // ada di database, supaya angkanya cocok dengan daftar Sealed jobs di
    // bawahnya dan dengan tinggi gedungnya di kota (kolom agents.* masih demo).
    const ownStats = statsByAgent.get(a.id) ?? {
      jobsSealed: 0,
      revenue30d: 0,
      rating: null,
    };
    const pool = summarizeStakes(stakes, a.id, userId);
    // Warden: agregat seluruh Ward, bukan job miliknya sendiri (selalu 0).
    const stats = a.isLead
      ? (statsByDistrict.get(a.district) ?? ownStats)
      : ownStats;
    return {
      id: a.id,
      name: a.name,
      code: a.code,
      district: a.district,
      // Fase 3 item 3: rank dari sealed jobs + rating sungguhan (lihat
      // catatan di lib/agent-stats.ts) -- Warden tetap dari a.rank/isLead.
      rank: a.isLead ? a.rank : deriveRank(stats.jobsSealed, stats.rating),
      isLead: a.isLead,
      status: statusByAgent.get(a.id) ?? 'idle',
      revenue30d: stats.revenue30d,
      description: a.description,
      stakerCount: pool.stakerCount,
      stakedWage: pool.stakedWage,
      bondWage: a.bondWage,
      rating: stats.rating,
      jobsSealed: stats.jobsSealed,
    };
  }, [
    agents,
    selectedId,
    statsByAgent,
    statsByDistrict,
    statusByAgent,
    stakes,
    userId,
  ]);

  // Patronage bangunan yang sedang dipilih: pool total + stake/earned milik user ini.
  const patronage = useMemo(
    () => summarizeStakes(stakes, selectedId ?? '', userId),
    [stakes, selectedId, userId],
  );

  const toSummary = (j: DashboardJob, code: string): JobSummary => ({
    id: j.id,
    title: j.title,
    district: j.district,
    agentCode: code,
    budgetUsdc: j.budgetUsdc,
    status: j.status,
    progress: j.progress,
    escrowTx: j.escrowTx,
  });

  const currentJob: JobSummary | null = useMemo(() => {
    if (!selectedAgent) return null;
    const mine = jobs.filter((j) => j.agentId === selectedAgent.id);
    const active =
      mine.find((j) => j.status === 'review') ??
      mine.find((j) => j.status === 'working');
    return active ? toSummary(active, selectedAgent.code) : null;
  }, [jobs, selectedAgent]);

  const sealedJobs: JobSummary[] = useMemo(() => {
    if (!selectedAgent) return [];
    // Warden: daftar Sealed jobs = seluruh Ward (cocok dengan angka agregat
    // di atasnya), tiap baris memakai code Wright yang mengerjakannya.
    const belongs = (j: DashboardJob) =>
      selectedAgent.isLead
        ? j.district === selectedAgent.district && j.agentId != null
        : j.agentId === selectedAgent.id;
    return jobs
      .filter((j) => belongs(j) && j.status === 'paid')
      .slice(0, 5)
      .map((j) =>
        toSummary(
          j,
          (j.agentId ? agentCodes[j.agentId] : undefined) ??
            selectedAgent.code,
        ),
      );
  }, [jobs, selectedAgent, agentCodes]);

  const jobTitleById = useMemo(
    () => new Map(jobs.map((j) => [j.id, j.title])),
    [jobs],
  );

  const agentNameById = useMemo(
    () => new Map(agents.map((a) => [a.id, a.name])),
    [agents],
  );

  const ledgerEvents: LedgerEvent[] = useMemo(() => {
    const shared: LedgerEvent[] = events.map((e) => ({
      id: e.id,
      at: e.at,
      // Judul job diisi bebas oleh user -> WAJIB di-escape (LedgerWall merender HTML).
      html: `<b>${escapeHtml(e.actor)}</b> ${escapeHtml(e.note ?? e.type)} -- "${escapeHtml(
        jobTitleById.get(e.jobId) ?? 'a job',
      )}"`,
    }));
    // Baris pribadi (hanya terlihat oleh patron itu sendiri): "You earned {n} WAGE as a
    // patron of {Wright}". Nominal 0 (mis. pembulatan) tidak ditampilkan.
    const mine: LedgerEvent[] = payouts
      .filter((p) => p.amount > 0)
      .map((p) => ({
        id: `payout-${p.id}`,
        at: p.at,
        html: `<b>You</b> earned ${escapeHtml(formatWage(p.amount))} as a patron of ${escapeHtml(
          agentNameById.get(p.agentId) ?? 'a Wright',
        )} -- "${escapeHtml(jobTitleById.get(p.jobId) ?? 'a job')}"`,
      }));
    return [...shared, ...mine]
      .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
      .slice(0, MAX_EVENTS);
  }, [events, payouts, jobTitleById, agentNameById]);

  const stats = (
    <StatBar
      // Saat strip punya baris sendiri, sel dibagi rata selebar header. Di ponsel: grid 3 kolom
      // supaya semua angka terlihat tanpa digeser.
      className="w-full max-tab:grid max-tab:grid-cols-3 max-tab:[&>div:nth-child(-n+3)]:border-b max-tab:[&>div:nth-child(3n)]:border-r-0 wide:w-auto [&>div]:flex-1 wide:[&>div]:flex-none"
      stats={[
        {
          label: 'Counting House',
          value: `${Math.round(totals.treasury).toLocaleString('en-US')} ${WAGE_UNIT}`,
        },
        {
          label: 'In the Strongbox',
          value: `${inStrongbox.toLocaleString('en-US')} ${WAGE_UNIT}`,
          accent: true,
        },
        {
          label: 'Burned in the Furnace',
          value: `${Math.round(totals.burned).toLocaleString('en-US')} ${WAGE_UNIT}`,
          crit: true,
        },
        { label: 'Sealed jobs', value: String(sealedCount) },
        {
          label: 'Wrights at work',
          value: `${wrightsAtWork} / ${cityAgents.length}`,
        },
        // Hanya kalau wallet terhubung dan saldonya terbaca (mode wallet).
        ...(walletBalance !== null
          ? [{ label: 'Your wallet', value: formatWage(walletBalance) }]
          : []),
      ]}
    />
  );

  return (
    <MotionPage className="flex min-h-dvh flex-col gap-2 p-2 tab:gap-3 tab:p-3 desk:h-dvh">
      <SiteHeader title="Cognita -- The City" stats={stats} />

      {/* 3 kolom seperti desain: Wright profile | The City | Your jobs (desk >= 1181px).
          Di bawahnya kota pindah ke atas selebar penuh, dua panel lain berdampingan (tab)
          atau bertumpuk (mobile). */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 tab:grid-cols-2 tab:gap-3 desk:grid-cols-[300px_minmax(0,1fr)_minmax(300px,330px)] desk:[grid-template-rows:minmax(0,1fr)]">
        <WrightProfilePanel
          agent={selectedAgent}
          currentJob={currentJob}
          sealedJobs={sealedJobs}
          patronage={patronage}
          canIdentify={!!userId}
          className="h-[520px] tab:h-[560px] desk:h-auto"
        />

        <Panel className="order-first h-[62svh] min-h-[380px] tab:col-span-2 tab:h-[64vh] tab:min-h-[420px] desk:order-none desk:col-span-1 desk:h-auto desk:min-h-0">
          <PanelHeader
            title="The City"
            action={
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pl-1">
                <LiveIndicator />
                <span className="hidden text-[11.5px] text-faint tab:inline">
                  drag to rotate · scroll to zoom
                </span>
              </div>
            }
          />
          <div className="relative min-h-0 flex-1">
            {cityAgents.length === 0 ? (
              <p className="p-4 text-sm text-muted">
                No Wright registered yet -- run
                supabase/migrations/0002_seed_agents.sql.
              </p>
            ) : (
              <CityScene
                agents={cityAgents}
                selectedId={selectedId}
                onSelect={setSelectedId}
                workRatioPct={workRatio24h}
                burnPulse={burnPulse}
              />
            )}

            {/* Ledger Wall ringkas di dasar kota: 2 baris di ponsel, 3 di tablet/desktop, 4 di layar sangat lebar. */}
            <div
              aria-live="polite"
              aria-label="Latest from the Ledger"
              className="pointer-events-none absolute bottom-3 left-3 z-10 flex w-[min(420px,calc(100%-24px))] flex-col gap-1.5 tab:w-[min(420px,calc(100%-250px))] desk:bottom-[22px] desk:left-[22px]"
            >
              {ledgerEvents.slice(0, 4).map((e) => (
                <div
                  key={e.id}
                  className="pointer-events-auto animate-rise-in truncate rounded-[4px_12px_12px_4px] border border-l-2 border-line border-l-cobalt bg-white/85 px-3 py-2 text-[12px] text-ink-2 shadow-[0_6px_16px_-10px_rgba(17,17,22,0.3)] backdrop-blur-md [&:nth-child(n+3)]:hidden tab:[&:nth-child(3)]:block ultra:[&:nth-child(4)]:block [&_b]:font-semibold [&_b]:text-text"
                  dangerouslySetInnerHTML={{ __html: e.html }}
                />
              ))}
            </div>

            {/* Work Ratio 24j (data Weighhouse) -> halaman Weighhouse. */}
            <Link
              href="/weighhouse"
              className="absolute bottom-3 right-3 z-10 hidden items-center gap-2 rounded-control border border-line bg-white/85 px-3 py-2 text-[11.5px] text-ink-2 shadow-soft backdrop-blur-md transition-colors hover:border-cobalt/40 tab:inline-flex desk:bottom-[22px] desk:right-[22px]"
            >
              <span className="eyebrow">Work Ratio 24h</span>
              <b className="font-mono text-[13px] font-medium text-cobalt tabular-nums">
                {workRatio24h == null ? '—' : `${workRatio24h.toFixed(1)}%`}
              </b>
              <span aria-hidden className="text-faint">→</span>
            </Link>
          </div>
        </Panel>

        <div className="h-[560px] min-h-0 desk:h-auto">
          <JobBoard items={boardItems} needsWallet={isWalletMode && !userId} />
        </div>
      </div>

      <SiteFooter />
    </MotionPage>
  );
}
