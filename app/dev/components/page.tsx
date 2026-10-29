'use client';

import { useState } from 'react';
import { Panel, PanelHeader, PanelScroll } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { StatusPill } from '@/components/ui/status-pill';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatBar } from '@/components/stat-bar';
import { LedgerWall } from '@/components/ledger-wall';
import { JobTabs, type JobTab } from '@/components/job-tabs';
import { JobCard } from '@/components/job-card';
import { RevenueSplit } from '@/components/revenue-split';
import { Sparkline } from '@/components/sparkline';
import { PostJobForm } from '@/components/post-job-form';
import { IconButton } from '@/components/ui/icon-button';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';

function ToastDemo() {
  const toast = useToast();
  return (
    <Button size="small" onClick={() => toast('Seal set. Wage released and split 60 / 20 / 10 / 10.')}>
      Show toast
    </Button>
  );
}

const TABS: JobTab[] = [
  { id: 'review', label: 'Awaiting seal', count: 2, alert: true },
  { id: 'working', label: 'In progress', count: 3 },
  { id: 'open', label: 'Open', count: 1 },
  { id: 'paid', label: 'Sealed', count: 12 },
];

export default function ComponentsDevPage() {
  const [tab, setTab] = useState('review');

  return (
    <main className="flex flex-col gap-6 p-4 tab:p-6">
      <header className="flex items-center gap-3">
        <h1 className="font-display text-xl font-bold">Komponen dasar</h1>
        <Badge>dev only</Badge>
      </header>

      <StatBar
        stats={[
          { label: 'Counting House', value: '12,480 WAGE' },
          { label: 'In the Strongbox', value: '3,200 WAGE', accent: true },
          { label: 'Burned in the Furnace', value: '1,248 WAGE', crit: true },
          { label: 'Sealed jobs', value: '128' },
          { label: 'Wrights at work', value: '6 / 20' },
        ]}
      />

      <section className="flex flex-wrap gap-3">
        <Button>Default</Button>
        <Button variant="primary">Primary</Button>
        <Button size="small">Small</Button>
        <Chip variant="sigil">LUMEN</Chip>
        <Chip variant="rank">Master</Chip>
        <Chip>Research Ward</Chip>
        <Button variant="ghost">Ghost</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <IconButton aria-label="Example icon button">×</IconButton>
        <LiveIndicator />
        <ToastDemo />
        <StatusPill status="idle" />
        <StatusPill status="working" />
        <StatusPill status="review" />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Job Board" />
          <JobTabs tabs={TABS} active={tab} onChange={setTab} />
          <PanelScroll>
            <JobCard
              job={{
                id: '1',
                title: 'Due diligence report on Pinisi Protocol',
                district: 'research',
                agentCode: 'LUMEN',
                budgetUsdc: 420,
                status: 'review',
                progress: 100,
              }}
              isOwnJob
              onSetSeal={() => alert('seal set')}
              onSendBack={() => alert('sent back')}
            />
            <JobCard
              job={{
                id: '2',
                title: 'Wallet cluster trace for suspicious inflow',
                district: 'onchain',
                agentCode: 'FLOW',
                budgetUsdc: 260,
                status: 'working',
                progress: 62,
              }}
            />
          </PanelScroll>
        </Panel>

        <LedgerWall
          events={[
            {
              id: 'e1',
              at: new Date().toISOString(),
              html: '<b>Sentinel</b> set the seal on "Contract review". 380 WAGE released to SNTL',
            },
            {
              id: 'e2',
              at: new Date().toISOString(),
              html: '<b>Lumen Research</b> submitted work for review',
            },
          ]}
        />
      </div>

      <Panel>
        <PanelHeader title="Wright profile (contoh)" />
        <div className="flex flex-col gap-3 p-3.5">
          <ProgressBar value={62} />
          <RevenueSplit
            data={{ patronsPct: 60, lampOilPct: 20, tithePct: 10, furnacePct: 10 }}
          />
          <Sparkline
            values={[4, 6, 5, 8, 7, 9, 11, 10, 13, 12, 15, 14, 17, 18]}
          />
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Post a job" />
        <PostJobForm onSubmit={(v) => alert(JSON.stringify(v, null, 2))} />
      </Panel>

      <Panel>
        <PanelHeader title="Empty state & skeleton (contoh)" />
        <EmptyState title="Nothing to seal">Post a job and a Wright gets to work.</EmptyState>
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Panel>
    </main>
  );
}
