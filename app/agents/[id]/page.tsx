import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getInitialUserId } from '@/lib/identity/server';
import { summarizeStakes } from '@/lib/patronage';
import {
  deriveAgentStats,
  deriveRank,
  deriveWardStats,
} from '@/lib/agent-stats';
import {
  getAgentById,
  listAgentsByDistrict,
  listJobsByAgent,
  listJobsByDistrict,
  listStakes,
} from '@/lib/supabase/queries';
import { AgentProfile } from '@/components/agent-profile';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import type { AgentDetail, AgentStatus, JobSummary } from '@/types/domain';
import { MotionPage } from '@/components/motion/primitives';

export const metadata: Metadata = { title: "Wright" };

export const revalidate = 0; // sama seperti City Dashboard, Job Board & Page D

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: agentRow, error: agentError }, jobsRes, stakes, userId] =
    await Promise.all([
      getAgentById(supabase, id),
      listJobsByAgent(supabase, id),
      listStakes(supabase),
      getInitialUserId(),
    ]);

  if (agentError || !agentRow) {
    notFound();
  }

  const jobs = jobsRes.data ?? [];

  // Status diturunkan dari job aktif Wright ini, sama seperti City Dashboard
  // (app/page.tsx) -- belum ada kolom `status` di tabel agents karena status
  // memang milik job, bukan agent.
  let status: AgentStatus = 'idle';
  for (const job of jobs) {
    if (job.status === 'review') {
      status = 'review';
      break; // 'review' menang atas semua status lain kalau ada lebih dari satu job aktif
    }
    if (job.status === 'working') status = 'working';
  }

  // Sealed jobs, revenue & rating dari baris `jobs` sungguhan, bukan angka demo di kolom agents.
  //
  // Warden tidak pernah dipilih selectWright() jadi tidak punya job sendiri
  // (angkanya selalu 0). Untuk Warden, angka yang tampil adalah agregat
  // seluruh Ward -- lihat deriveWardStats di lib/agent-stats.ts -- dan daftar
  // Sealed jobs di bawahnya juga milik seluruh Wright di Ward itu.
  let wardJobs = jobs;
  const codeById = new Map<string, string>([[agentRow.id, agentRow.code]]);
  if (agentRow.is_lead) {
    const [wardJobsRes, wardAgentsRes] = await Promise.all([
      listJobsByDistrict(supabase, agentRow.district),
      listAgentsByDistrict(supabase, agentRow.district),
    ]);
    wardJobs = wardJobsRes.data ?? [];
    for (const a of wardAgentsRes.data ?? []) codeById.set(a.id, a.code);
  }

  const stats = agentRow.is_lead
    ? deriveWardStats(
        wardJobs.map((j) => ({
          status: j.status,
          budgetUsdc: Number(j.budget_usdc),
          rating: j.rating,
          agentId: j.agent_id,
        })),
      )
    : deriveAgentStats(
        jobs.map((j) => ({
          status: j.status,
          budgetUsdc: Number(j.budget_usdc),
          rating: j.rating,
        })),
      );

  // Patronage: pool bangunan ini + stake/earned milik pengunjung (mode simulasi: cookie
  // browser; mode wallet: server tidak tahu siapa pengunjungnya, jadi 0).
  const patronage = summarizeStakes(stakes, agentRow.id, userId);

  const agent: AgentDetail = {
    id: agentRow.id,
    name: agentRow.name,
    code: agentRow.code,
    district: agentRow.district,
    // Fase 3 item 3: rank dari sealed jobs + rating sungguhan, bukan lagi
    // kolom agents.rank (angka demo) -- Warden tetap dari is_lead, tidak
    // pernah lewat deriveRank (lihat catatan di lib/agent-stats.ts).
    rank: agentRow.is_lead
      ? agentRow.rank
      : deriveRank(stats.jobsSealed, stats.rating),
    isLead: agentRow.is_lead,
    status,
    revenue30d: stats.revenue30d,
    description: agentRow.description,
    stakerCount: patronage.stakerCount,
    stakedWage: patronage.stakedWage,
    bondWage: Number(agentRow.bond_wage ?? 0),
    rating: stats.rating,
    jobsSealed: stats.jobsSealed,
  };

  const sealedJobs: JobSummary[] = wardJobs
    .filter(
      (j) => j.status === 'paid' && (agentRow.is_lead ? j.agent_id : true),
    )
    .map((j) => ({
      id: j.id,
      title: j.title,
      district: j.district,
      agentCode:
        (j.agent_id ? codeById.get(j.agent_id) : undefined) ??
        agentRow.code,
      budgetUsdc: Number(j.budget_usdc),
      status: j.status,
      progress: j.progress,
    }));

  return (
    <MotionPage className="flex min-h-dvh flex-col gap-2 p-2 tab:gap-3 tab:p-3">
      <SiteHeader title="Wright profile" />

      <div className="flex flex-1 justify-center py-1">
        <div className="w-full max-w-6xl">
          <AgentProfile
            agent={agent}
            sealedJobs={sealedJobs}
            patronage={patronage}
            canIdentify={!!userId}
          />
        </div>
      </div>

      <SiteFooter />
    </MotionPage>
  );
}
