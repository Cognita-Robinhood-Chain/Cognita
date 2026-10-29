import { WAGE_SPLIT } from '@/lib/currency';
import Link from 'next/link';
import { JobCard } from '@/components/job-card';
import { RevenueSplit } from '@/components/revenue-split';
import { Panel, PanelHeader, PanelScroll, SectionLabel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { BondLine, PatronageSection } from '@/components/patronage-section';
import { WrightIdentity, WrightStats } from '@/components/wright-identity';
import { type PatronageSummary } from '@/lib/patronage';
import type { AgentDetail, JobSummary } from '@/types/domain';

/** Halaman Wright profile lengkap (/agents/[id]). Bahasa visual sama dengan panel profil
 *  di kota (WrightIdentity + WrightStats), ditambah daftar sealed jobs penuh. */
export function AgentProfile({
  agent,
  sealedJobs,
  patronage,
  canIdentify,
}: {
  agent: AgentDetail;
  sealedJobs: JobSummary[];
  patronage: PatronageSummary;
  canIdentify: boolean;
}) {
  return (
    <div className="grid gap-3 desk:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desk:items-start">
      <Panel>
        <PanelHeader
          title="Wright profile"
          action={
            <Link href={agent.isLead ? `/jobs/new?district=${agent.district}` : `/jobs/new?agent=${agent.id}`}>
              <Button variant="primary" size="small" tabIndex={-1}>
                Hire {agent.name}
              </Button>
            </Link>
          }
        />
        <div className="flex flex-col gap-4 p-4 tab:p-5">
          <WrightIdentity agent={agent} size="page" />
          <WrightStats agent={agent} />
          <section className="flex flex-col gap-2">
            <SectionLabel>Where each wage goes (on seal)</SectionLabel>
            <RevenueSplit data={WAGE_SPLIT} />
          </section>
          <section className="flex flex-col gap-2">
            <SectionLabel>Patronage</SectionLabel>
            <PatronageSection
              agentId={agent.id}
              isLead={agent.isLead}
              stakedWage={patronage.stakedWage}
              stakerCount={patronage.stakerCount}
              myStake={patronage.myStake}
              myEarned={patronage.myEarned}
              mySharePct={patronage.mySharePct}
              canIdentify={canIdentify}
            />
            <BondLine bondWage={agent.bondWage} />
          </section>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title={agent.isLead ? 'Sealed jobs (whole Ward)' : 'Sealed jobs'} />
        <PanelScroll className="max-h-[560px]">
          {sealedJobs.length === 0 ? (
            <EmptyState title="Nothing sealed yet">
              {agent.isLead ? 'No sealed jobs in this Ward yet.' : 'Still proving itself. Hire this Wright to change that.'}
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2.5 p-3">
              {sealedJobs.map((job) => (
                <JobCard key={job.id} job={job} card />
              ))}
            </div>
          )}
        </PanelScroll>
      </Panel>
    </div>
  );
}
