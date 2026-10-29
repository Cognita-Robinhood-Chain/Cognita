import { WAGE_UNIT } from '@/lib/currency';
import { formatWage } from '@/lib/patronage';
import { Chip } from '@/components/ui/chip';
import { StatusPill } from '@/components/ui/status-pill';
import { AgentFunction } from '@/components/agent-function';
import { cn } from '@/lib/cn';
import { RANK_LABEL, WARD_COLOR_HEX, WARD_LABEL, type AgentDetail } from '@/types/domain';

/** Kepala profil Wright (cognita-app.html `.prof`): kode · Ward · pangkat · status, lalu
 *  avatar + nama, lalu callout "What it does". Dipakai panel kota dan halaman /agents/[id]. */
export function WrightIdentity({ agent, size = 'panel' }: { agent: AgentDetail; size?: 'panel' | 'page' }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip variant="sigil">{agent.code}</Chip>
        <Chip>
          <i aria-hidden className="inline-block size-[7px] rounded-full" style={{ background: WARD_COLOR_HEX[agent.district] }} />
          {WARD_LABEL[agent.district]}
        </Chip>
        <Chip variant="lead">{agent.isLead ? 'Warden' : RANK_LABEL[agent.rank]}</Chip>
        <StatusPill status={agent.status} />
      </div>

      <div className="flex items-center gap-3">
        <WrightAvatar code={agent.code} color={WARD_COLOR_HEX[agent.district]} />
        <h3
          className={cn(
            'font-display font-extrabold leading-[1.05] tracking-[-0.02em] text-text',
            size === 'page' ? 'text-[30px]' : 'text-[26px]'
          )}
        >
          {agent.name}
        </h3>
      </div>

      <AgentFunction description={agent.description} district={agent.district} />
    </div>
  );
}

/** Avatar: ubin cobalt bergaris scanline, empat huruf kode, titik warna Ward di pojok. */
export function WrightAvatar({ code, color }: { code: string; color: string }) {
  return (
    <div
      aria-hidden
      className="relative grid size-12 flex-none place-items-center overflow-hidden rounded-card font-mono text-[11px] font-medium tracking-[0.04em] text-white shadow-[0_10px_20px_-10px_rgba(29,78,216,0.8),inset_0_1px_0_rgba(255,255,255,0.35)]"
      style={{ background: 'radial-gradient(120% 120% at 20% 0%, #7da2ff 0%, #1d4ed8 55%, #142f86 100%)' }}
    >
      <span
        className="absolute inset-0"
        style={{ background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.12) 0 1px, transparent 1px 6px)' }}
      />
      <span className="relative">{code.slice(0, 4)}</span>
      <i className="absolute bottom-1.5 right-1.5 size-[7px] rounded-full border-[1.5px] border-white" style={{ background: color }} />
    </div>
  );
}

/** Grid KV 2 kolom (cognita-app.html `.kv`): Revenue, Staked, Patrons, Rating, Sealed, Rank. */
export function WrightStats({ agent, className }: { agent: AgentDetail; className?: string }) {
  const rows: { label: string; value: string; accent?: boolean }[] = [
    {
      label: 'Revenue 30d',
      value: `${Math.round(agent.revenue30d).toLocaleString('en-US')} ${WAGE_UNIT}`,
      accent: true,
    },
    { label: 'Staked by patrons', value: formatWage(agent.stakedWage) },
    { label: 'Patrons', value: agent.stakerCount.toLocaleString('en-US') },
    { label: 'Client rating', value: agent.rating != null ? `${agent.rating.toFixed(1)} ★` : 'No ratings yet' },
    { label: agent.isLead ? 'Sealed jobs (Ward)' : 'Sealed jobs', value: String(agent.jobsSealed) },
    { label: 'Rank', value: agent.isLead ? 'Warden' : RANK_LABEL[agent.rank] },
  ];
  return (
    <dl
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-card border border-line bg-white/60 [&>div:nth-child(2n)]:border-r-0 [&>div:nth-last-child(-n+2)]:border-b-0',
        className
      )}
    >
      {rows.map((r) => (
        <div key={r.label} className="border-b border-r border-line px-3 py-2.5">
          <dt className="eyebrow">{r.label}</dt>
          <dd className={cn('font-mono text-sm font-medium leading-normal tabular-nums', r.accent ? 'text-cobalt' : 'text-text')}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
