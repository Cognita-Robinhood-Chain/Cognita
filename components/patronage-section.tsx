'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { WAGE_SPLIT, WAGE_TOKEN } from '@/lib/currency';
import { formatWage } from '@/lib/patronage';
import { isWalletMode } from '@/lib/identity/mode';
import { useToast } from '@/components/ui/toast';

/**
 * Patronage (Revision 1): stake $WAGE pada sebuah bangunan untuk berbagi porsi patron
 * (WAGE_SPLIT.patronsPct) pro rata setiap kali client menyegel wage.
 *
 * MODE SIMULASI: stake hanya catatan di database (tidak ada token bergerak).
 * Staking on-chain belum ada, jadi di mode wallet tombolnya dinonaktifkan.
 */
export function PatronageSection({
  agentId,
  isLead,
  stakedWage,
  stakerCount,
  myStake,
  myEarned,
  mySharePct,
  canIdentify,
}: {
  agentId: string;
  isLead: boolean;
  stakedWage: number;
  stakerCount: number;
  myStake: number;
  myEarned: number;
  mySharePct: number;
  /** false selama identitas browser belum dikenal (mis. wallet belum terhubung). */
  canIdentify: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<'stake' | 'unstake' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(kind: 'stake' | 'unstake') {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/stake`, {
        method: kind === 'stake' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setAmount('');
      toast(
        kind === 'stake'
          ? `Staked ${formatWage(value)} on this building (simulation).`
          : `Unstaked ${formatWage(value)} (simulation).`,
      );
      // Dashboard mendengar Realtime; halaman /agents/:id dirender server, jadi minta segar.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const disabled = isLead || isWalletMode || !canIdentify;
  const disabledReason = isLead
    ? "A Warden routes work but doesn't take jobs, so it has no patron cut. Stake on a Wright in this Ward instead."
    : isWalletMode
      ? "On-chain staking isn't live yet."
      : null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] leading-snug text-muted">
        Stake {WAGE_TOKEN} on this building to share its {WAGE_SPLIT.patronsPct}% patron
        cut, pro rata, every time a client sets the seal.
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
        <span>
          Pool <span className="font-mono text-text">{formatWage(stakedWage)}</span>
        </span>
        <span>
          Patrons <span className="font-mono text-text">{stakerCount}</span>
        </span>
      </div>

      {disabledReason ? (
        <p className="rounded-control border border-line bg-white/60 px-3 py-2 text-[11.5px] text-muted">{disabledReason}</p>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (error) setError(null);
            }}
            placeholder="100"
            aria-label={`Amount of ${WAGE_TOKEN}`}
            disabled={disabled || busy !== null}
            className="h-[38px] w-full min-w-0 rounded-control border border-line-2 bg-surface-2 px-3 font-mono text-sm text-text outline-none transition-shadow focus-visible:border-cobalt focus-visible:shadow-[0_0_0_3px_rgba(29,78,216,0.15)] disabled:opacity-60"
          />
          <Button
            variant="primary"
            disabled={disabled || busy !== null}
            onClick={() => void send('stake')}
          >
            {busy === 'stake' ? 'Staking…' : `Stake ${WAGE_TOKEN}`}
          </Button>
          {myStake > 0 && (
            <Button
              disabled={disabled || busy !== null}
              onClick={() => void send('unstake')}
            >
              {busy === 'unstake' ? 'Unstaking…' : 'Unstake'}
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-[12px] text-crit">
          {error}
        </p>
      )}

      {!isWalletMode && canIdentify && (
        <p className="text-[11.5px] text-muted">
          Your stake here{' '}
          <span className="font-mono text-text">{formatWage(myStake)}</span> (
          {mySharePct.toLocaleString('en-US', { maximumFractionDigits: 1 })}% of pool)
          {' · '}Earned{' '}
          <span className="font-mono text-cobalt">{formatWage(myEarned)}</span>
        </p>
      )}
      {!isWalletMode && (
        <p className="text-[11px] text-faint">
          Simulation: no {WAGE_TOKEN} moves and no balance is checked.
        </p>
      )}
    </div>
  );
}

/** Baris Bond: WAGE yang dikunci bangunan, slashed kalau kalah sengketa. */
export function BondLine({ bondWage }: { bondWage: number }) {
  return (
    <p className="text-[12px] text-muted">
      Bond: <span className="font-mono text-text">{formatWage(bondWage)}</span> locked by
      this building. Slashed if it loses a dispute.
    </p>
  );
}
