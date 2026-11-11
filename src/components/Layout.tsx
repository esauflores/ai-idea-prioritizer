import type { ReactNode } from 'react';
import { t } from '../client/copy';
import type { PoolStatus } from '../shared/schemas';
import { LogoMark, Refresh } from './Icons';

interface Props {
  pool: PoolStatus | null;
  poolLoading: boolean;
  onRefreshPool: () => void;
  onHome: () => void;
  children: ReactNode;
}

export function Layout({ pool, poolLoading, onRefreshPool, onHome, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={onHome}
            className="flex items-center gap-2.5 font-semibold"
            aria-label={t.home}
          >
            <LogoMark size={18} />
            {t.appName}
          </button>
          <PoolIndicator status={pool} loading={poolLoading} onRefresh={onRefreshPool} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared-pool status                                                  */
/* ------------------------------------------------------------------ */

const usd = (n: number) => `$${n.toFixed(2)}`;

function poolText(status: PoolStatus | null, loading: boolean): string {
  if (!status) return loading ? t.pool.checking : t.pool.unavailable;
  if (status.state === 'no_cap') return t.pool.noLimit;
  if (status.state === 'unavailable') return t.pool.unavailable;
  return t.pool.left(usd(status.remaining ?? 0), usd(status.limit ?? 0));
}

function percentOf(status: PoolStatus | null): number | null {
  return status?.limit && status.remaining !== null
    ? Math.max(0, Math.min(100, (status.remaining / status.limit) * 100))
    : null;
}

interface PoolIndicatorProps {
  status: PoolStatus | null;
  loading: boolean;
  onRefresh: () => void;
}

/** Shared-pool status for the header: label, amount and a thin meter. Click refreshes. */
function PoolIndicator({ status, loading, onRefresh }: PoolIndicatorProps) {
  const text = poolText(status, loading);
  const percent = percentOf(status);
  const bar = status?.state === 'exhausted' ? 'bg-danger' : percent !== null && percent < 20 ? 'bg-warn' : 'bg-accent';

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      title={`${t.pool.shared} ${t.pool.refresh}`}
      aria-label={`${t.pool.label}: ${text}. ${t.pool.shared} ${t.pool.refresh}`}
      className="group flex items-center gap-3 rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/[0.04]"
    >
      <span className="hidden text-faint sm:inline">{t.pool.label}</span>
      <span className="font-medium text-fg tabular-nums">{text}</span>
      {percent !== null && (
        <span className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
          <span className={`block h-full transition-[width] duration-500 ${bar}`} style={{ width: `${percent}%` }} />
        </span>
      )}
      <Refresh size={12} className={`shrink-0 text-faint group-hover:text-fg ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}

/** One-line caption version, shown under the main actions. */
export function PoolCaption({ status, loading }: { status: PoolStatus | null; loading: boolean }) {
  return (
    <p className="text-xs text-faint">
      {t.pool.label}: <span className="text-muted tabular-nums">{poolText(status, loading)}</span>
      {status?.reset ? t.pool.resets(status.reset) : ''}. {t.pool.shared}
    </p>
  );
}
