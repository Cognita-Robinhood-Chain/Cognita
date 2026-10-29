'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { JobCard } from '@/components/job-card';
import { Panel, PanelHeader, PanelScroll, SectionLabel } from '@/components/ui/panel';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/ui/empty-state';
import { Chip } from '@/components/ui/chip';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Button } from '@/components/ui/button';
import { RANK_LABEL, WARD_LABEL } from '@/types/domain';
import { buildContinueDraft, saveContinueDraft } from '@/lib/continue-job';
import { activeChain } from '@/lib/web3/chains';
import { sendBack, setTheSeal } from '@/lib/web3/set-the-seal';
import { ConnectWalletLink } from '@/components/wallet-connect';
import type { JobSummary, Rank } from '@/types/domain';

export interface JobDetailEvent {
  id: string;
  actorLabel: string;
  text: string;
  /** Sudah diformat di server (Server Component) supaya tidak ada risiko
   *  mismatch locale/timezone antara render server dan client. */
  atLabel: string;
  /** Tx hash on-chain kalau event ini berasal dari transaksi (lock wage,
   *  seal, split) -- dirender sebagai link ke explorer. */
  tx?: string | null;
}

export interface JobAgentInfo {
  id: string;
  name: string;
  code: string;
  rank: Rank;
}

const STAGES = [
  { at: 0, label: 'Warden is choosing a Wright' },
  { at: 15, label: 'Brief assigned to a Wright' },
  { at: 30, label: 'Reading the brief' },
  { at: 45, label: 'Drafting the report' },
  { at: 70, label: 'Checking the draft' },
  { at: 95, label: 'Finalizing the deliverable' },
] as const;

/** Info kerja agent selama job belum siap di-seal: tahap yang sedang jalan
 *  (diturunkan dari progress yang naik live lewat Realtime). */
function WorkProgress({
  job,
  className,
}: {
  job: JobSummary;
  className?: string;
}) {
  const waiting = job.status === 'open';
  return (
    <Panel className={className}>
      <PanelHeader title="Work in progress" />
      <div className="flex flex-col gap-3 p-4">
        <p className="text-[13px] leading-relaxed text-muted">
          {waiting
            ? 'The Warden is choosing the best Wright for this brief. This takes about 30 seconds, and this page updates by itself.'
            : `${job.agentCode || 'Your Wright'} is working on your brief. You can stay here or come back later — you will only be asked to seal once the deliverable is ready.`}
        </p>
        <ProgressBar value={job.progress} label="Work progress" />
        {/* Stepper vertikal: titik cobalt penuh = selesai, berdenyut = sedang jalan. */}
        <ol className="relative flex flex-col gap-2.5 pl-1">
          <span aria-hidden className="absolute bottom-2 left-[8px] top-2 w-px bg-line-2" />
          {STAGES.map((st, i) => {
            const next = STAGES[i + 1]?.at ?? 101;
            const done = job.progress >= next;
            const active = job.progress >= st.at && !done;
            return (
              <li
                key={st.label}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'relative flex items-center gap-2.5 text-[12.5px]',
                  done ? 'text-muted' : active ? 'font-medium text-text' : 'text-faint',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'relative z-10 grid size-[9px] shrink-0 place-items-center rounded-full border',
                    done && 'border-cobalt bg-cobalt',
                    active && 'animate-ping-soft border-cobalt bg-white',
                    !done && !active && 'border-line-2 bg-white',
                  )}
                />
                {st.label}
                {done && <span className="sr-only"> (done)</span>}
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}

export function JobDetail({
  job,
  brief,
  deliverable,
  agent,
  events,
  isOwnJob,
  needsWallet,
}: {
  job: JobSummary;
  brief: string;
  /** Hasil kerja Wright -- baru ada untuk Research Ward (Fase 1 item 10).
   *  null selama status belum 'review'/'paid', atau di Ward yang belum
   *  punya runtime sendiri. */
  deliverable: string | null;
  agent: JobAgentInfo | null;
  events: JobDetailEvent[];
  isOwnJob: boolean;
  /** true di mode wallet selama belum ada wallet terhubung. Selalu false di mode simulasi. */
  needsWallet: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<string | undefined>();

  async function callAction(
    path: 'approve' | 'revise',
    noteOrRating?: string | number,
  ) {
    setBusy(true);
    setError('');

    try {
      if (path === 'approve') {
        // Fase 2 item 7: kalau wage terkunci on-chain, ini juga mengirim
        // approve() dari wallet client -- lihat lib/web3/set-the-seal.ts.
        await setTheSeal(
          job,
          setStep,
          typeof noteOrRating === 'number' ? noteOrRating : undefined,
        );
      } else {
        const note = typeof noteOrRating === 'string' ? noteOrRating : '';
        await sendBack(job, note, setStep);
      }
      toast(
        path === 'approve'
          ? 'Seal set. Wage released and split 60 / 20 / 10 / 10.'
          : 'Sent back. The Wright is reworking it with your note.',
      );
      // Job dan Ledger di bawah sama-sama Server Component -- refresh
      // menarik ulang status, progress, dan event terbaru sekaligus.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
      setStep(undefined);
    }
  }

  // Lanjut ke Ward/Wright lain = job BARU (upah dan penilaian terpisah per Wright).
  // Draft brief dititipkan lewat sessionStorage (isi report bisa panjang untuk URL)
  // dan diambil form di /jobs/new.
  function continueInAnotherWard() {
    if (!deliverable) return;
    saveContinueDraft(
      buildContinueDraft({
        title: job.title,
        wardLabel: WARD_LABEL[job.district],
        agentCode: job.agentCode,
        deliverable,
      }),
    );
    router.push('/jobs/new');
  }

  // Job yang sudah di-seal terlihat di daftar oleh semua orang, tapi isinya
  // (brief, deliverable, ledger, escrow) hanya untuk client yang membuatnya.
  const locked = job.status === 'paid' && !isOwnJob;

  if (locked) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        <Panel>
          <PanelHeader title="Job" />
          <JobCard job={job} linkToDetail={false} locked />
          <div className="flex flex-col gap-2 border-t border-line p-4">
            <p className="text-[13px] text-muted">
              This job has been sealed. Its brief, deliverable and ledger are
              private to the client who posted it.
            </p>
            {needsWallet && (
              <p className="text-[12px] text-muted">
                <ConnectWalletLink /> the wallet that posted this job to view
                its details.
              </p>
            )}
            {agent && (
              <Link
                href={`/agents/${agent.id}`}
                className="flex w-fit items-center gap-2 text-[13px] font-medium text-text hover:text-cobalt"
              >
                <span>{agent.name}</span>
                <Chip variant="sigil">{agent.code}</Chip>
                <Chip variant="rank">{RANK_LABEL[agent.rank]}</Chip>
              </Link>
            )}
          </div>
        </Panel>
      </div>
    );
  }

  // Layar lebar: Deliverable & Job masing-masing dikunci setinggi PANEL_H, isi yang
  // panjang di-scroll di dalam panel. `shrink-0` wajib: induknya flex-col di dalam
  // area yang tingginya terbatas, jadi tanpa itu panel ikut mengecil ketika Ledger
  // bertambah (mis. setelah seal) dan tingginya jadi tidak sama lagi.
  const PANEL_H = 'lg:h-[32rem] lg:shrink-0';
  const deliverablePanel = deliverable ? (
    <Panel className={PANEL_H}>
      <PanelHeader
        title="Deliverable"
        action={
          isOwnJob ? (
            <Button
              size="small"
              onClick={continueInAnotherWard}
              title="Start a new job in any Ward, pre-filled with this report and its open questions"
            >
              Continue in another Ward →
            </Button>
          ) : undefined
        }
      />
      <PanelScroll className="max-h-[28rem] lg:max-h-none">
        {/* Blok putih supaya laporan panjang nyaman dibaca sebelum menekan seal. */}
        <div className="m-3 rounded-card border border-line bg-surface-2 px-4 py-3.5">
          <p className="max-w-[72ch] whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">{deliverable}</p>
        </div>
      </PanelScroll>
    </Panel>
  ) : null;

  const showProgress = job.status === 'open' || job.status === 'working';

  // Selama Wright bekerja (open / working) belum ada Deliverable, jadi baris atas
  // = Job (kiri) + Work in progress (kanan) dengan lebar yang sama (2 kolom 1:1).
  // Grid meregangkan kedua panel ke tinggi yang sama (mengikuti yang tertinggi).
  const sideBySide = !deliverablePanel && showProgress;

  const jobPanel = (
    <Panel className={deliverablePanel ? PANEL_H : undefined}>
      <PanelHeader title="Job" />
      <PanelScroll className="lg:max-h-none">
        <JobCard
          job={job}
          isOwnJob={isOwnJob}
          busy={busy}
          busyLabel={step}
          error={error}
          linkToDetail={false}
          onSetSeal={(rating) => callAction('approve', rating)}
          onSendBack={(note) => callAction('revise', note)}
          deliverable={deliverable}
        />

        {needsWallet && job.status === 'review' && (
          <p className="border-y border-line bg-cobalt-wash px-4 py-2 text-[12px] text-muted">
            <ConnectWalletLink /> the wallet that posted this job to set the
            seal.
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-line px-4 py-3.5">
          <SectionLabel>Brief</SectionLabel>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{brief}</p>
        </div>

        {job.escrowTx && (
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3.5">
            <SectionLabel>Escrow</SectionLabel>
            <a
              href={`${activeChain.blockExplorers.default.url}/tx/${job.escrowTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit font-mono text-[12px] text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
            >
              {job.escrowTx.slice(0, 10)}…{job.escrowTx.slice(-6)} ↗
            </a>
          </div>
        )}

        {agent && (
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3.5">
            <SectionLabel>Wright</SectionLabel>
            <Link
              href={`/agents/${agent.id}`}
              className="flex w-fit items-center gap-2 text-[13px] font-medium text-text hover:text-cobalt"
            >
              <span>{agent.name}</span>
              <Chip variant="sigil">{agent.code}</Chip>
              <Chip variant="rank">{RANK_LABEL[agent.rank]}</Chip>
            </Link>
          </div>
        )}
      </PanelScroll>
    </Panel>
  );

  // Layout (layar lebar):
  //  - Ada Deliverable (review / paid): baris atas = Deliverable (kiri) + Job (kanan).
  //  - Wright bekerja (open / working): baris atas = Job (kiri) + Work in progress
  //    (kanan), ukuran sama.
  //  - Lainnya: Job saja, satu kolom di tengah.
  // Ledger selalu memanjang selebar baris atas di bawahnya. Di layar sempit semuanya
  // ditumpuk, dan saat status review Deliverable tetap di atas Job supaya hasil kerja
  // dibaca dulu sebelum gerbang seal.
  return (
    <div
      className={
        deliverablePanel || sideBySide
          ? 'flex shrink-0 flex-col gap-3'
          : 'mx-auto flex w-full max-w-xl shrink-0 flex-col gap-3'
      }
    >
      {sideBySide ? (
        <div className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
          {jobPanel}
          <WorkProgress job={job} />
        </div>
      ) : (
        <div
          className={
            deliverablePanel
              ? 'grid shrink-0 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start'
              : 'flex shrink-0 flex-col gap-3'
          }
        >
          {deliverablePanel && (
            <div className="min-w-0">{deliverablePanel}</div>
          )}
          <div className="flex min-w-0 flex-col gap-3">{jobPanel}</div>
        </div>
      )}

      <Panel className="shrink-0">
        <PanelHeader title="Ledger" />
        <PanelScroll className="max-h-72">
          {events.length === 0 ? (
            <EmptyState title="Nothing recorded yet">
              Every step of this job will be carved into the Ledger.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-1.5 p-3">
              {/* Event baru dari Realtime fade in dari bawah; render awal tanpa animasi */}
              <AnimatePresence initial={false}>
                {events.map((e) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="rounded-[4px_12px_12px_4px] border border-l-2 border-line border-l-cobalt bg-white/75 px-3 py-2 text-[12px] text-ink-2"
                  >
                    <span className="font-semibold text-text">
                      {e.actorLabel}
                    </span>{' '}
                    {e.text}
                    {e.tx && (
                      <a
                        href={`${activeChain.blockExplorers.default.url}/tx/${e.tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 font-mono text-[10.5px] text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
                      >
                        {e.tx.slice(0, 8)}…{e.tx.slice(-4)} ↗
                      </a>
                    )}
                    <div className="mt-0.5 font-mono text-[10px] text-muted">
                      {e.atLabel}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </PanelScroll>
      </Panel>
    </div>
  );
}
