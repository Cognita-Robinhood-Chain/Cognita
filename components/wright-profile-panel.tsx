'use client';

import { WAGE_SPLIT, WAGE_UNIT } from '@/lib/currency';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Panel, PanelHeader, PanelScroll, SectionLabel } from '@/components/ui/panel';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { RevenueSplit } from '@/components/revenue-split';
import { BondLine, PatronageSection } from '@/components/patronage-section';
import { WrightIdentity, WrightStats } from '@/components/wright-identity';
import type { PatronageSummary } from '@/lib/patronage';
import { WARD_LABEL } from '@/types/domain';
import type { AgentDetail, JobSummary } from '@/types/domain';

/**
 * Panel kiri City Dashboard (Wright profile, cognita-app.html `.prof`): muncul saat sebuah
 * gedung di kota diklik. Versi ringkas dari halaman /agents/[id] -- link "Full profile"
 * menuju halaman lengkapnya.
 */
export function WrightProfilePanel({
  agent,
  currentJob,
  sealedJobs,
  patronage,
  canIdentify,
  className,
}: {
  agent: AgentDetail | null;
  currentJob: JobSummary | null;
  sealedJobs: JobSummary[];
  /** Ringkasan stake bangunan ini + stake/earned user yang sedang melihat. */
  patronage: PatronageSummary;
  canIdentify: boolean;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader title="Wright profile" hint="click a building" />

      {!agent ? (
        <EmptyState title="Pick a building">Click a tower in the city to meet its Wright.</EmptyState>
      ) : (
        <PanelScroll>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-4 p-4"
            >
              <WrightIdentity agent={agent} />
              <WrightStats agent={agent} />

              <section className="flex flex-col gap-2">
                <SectionLabel>Current job</SectionLabel>
                {currentJob ? (
                  <div className="flex flex-col gap-2 rounded-card border border-line bg-white/70 p-3">
                    <Link href={`/jobs/${currentJob.id}`} className="text-[13px] font-semibold text-text hover:text-cobalt">
                      {currentJob.title}
                    </Link>
                    {currentJob.status === 'working' && <ProgressBar value={currentJob.progress} label="Job progress" />}
                    <p className="text-[11.5px] text-muted">
                      {WARD_LABEL[currentJob.district]} ·{' '}
                      <span className="font-mono">
                        {currentJob.budgetUsdc.toLocaleString('en-US')} {WAGE_UNIT}
                      </span>{' '}
                      in the Strongbox
                      {currentJob.status === 'review' && <span className="text-warn"> · awaiting seal</span>}
                    </p>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted">
                    {agent.isLead ? 'A Warden routes work but doesn’t take jobs.' : 'No active job. Open for hire.'}
                  </p>
                )}
              </section>

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

              <section className="flex flex-col gap-1.5">
                <SectionLabel>{`Sealed jobs · ${agent.jobsSealed} total${agent.isLead ? ' (whole Ward)' : ''}`}</SectionLabel>
                {sealedJobs.length === 0 ? (
                  <p className="text-[12px] text-muted">No sealed jobs yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line">
                    {sealedJobs.map((j) => (
                      <li key={j.id} className="flex items-start justify-between gap-2 py-1.5 text-[12px]">
                        <Link href={`/jobs/${j.id}`} className="text-ink-2 hover:text-cobalt">
                          {j.title}
                        </Link>
                        <span className="whitespace-nowrap font-mono tabular-nums text-text">
                          {j.budgetUsdc.toLocaleString('en-US')} {WAGE_UNIT}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex flex-wrap gap-2">
                <Link href={agent.isLead ? `/jobs/new?district=${agent.district}` : `/jobs/new?agent=${agent.id}`}>
                  <Button variant="primary" size="small" tabIndex={-1}>
                    Hire {agent.name}
                  </Button>
                </Link>
                <Link href={`/agents/${agent.id}`}>
                  <Button size="small" tabIndex={-1}>
                    Full profile
                  </Button>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </PanelScroll>
      )}
    </Panel>
  );
}
