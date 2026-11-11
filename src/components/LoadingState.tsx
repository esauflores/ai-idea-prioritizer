import { useEffect, useState } from 'react';
import { t } from '../client/copy';
import { Check } from './Icons';

/**
 * Steps with typical durations (seconds), tuned to observed runs of ~8–14 s.
 * The model returns everything in one response, so these are paced estimates;
 * the last step has no duration and stays open until the response arrives.
 */
const STEPS = [2, 4, 5, null];
const EXPECTED_TOTAL = 14;
/** Each step's duration varies by up to ±0.5 s so the pacing doesn't feel mechanical. */
const JITTER = 0.5;
const SLOW_AFTER = 25;

/** Ease toward 95%: fast at first, slowing down, never "done" before the answer is in. */
function progressAt(t: number): number {
  return Math.min(0.95, 1 - Math.exp(-t / (EXPECTED_TOTAL / 1.9)));
}

export function LoadingState({ refining = false }: { refining?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [durations] = useState(() =>
    STEPS.map((seconds) => (seconds === null ? null : seconds + (Math.random() * 2 - 1) * JITTER)),
  );
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    return () => clearInterval(timer);
  }, []);

  // Start time of each step, and which one is active.
  const starts: number[] = [];
  let acc = 0;
  for (const seconds of durations) {
    starts.push(acc);
    acc += seconds ?? Infinity;
  }
  const current = starts.reduce((idx, start, i) => (elapsed >= start ? i : idx), 0);
  const percent = Math.round(progressAt(elapsed) * 100);

  return (
    <div className="mx-auto w-full max-w-lg animate-fade-in py-6" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{refining ? t.loading.updating : t.loading.analyzing}</h2>
        <span className="font-mono text-xs text-faint tabular-nums">{elapsed.toFixed(0)}s</span>
      </div>

      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t.loading.progress}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-6 divide-y divide-line border-y border-line">
        {STEPS.map((seconds, i) => {
          const done = i < current;
          const active = i === current;
          const start = starts[i]!;
          const time = done
            ? `${(starts[i + 1]! - start).toFixed(1)}s`
            : active
              ? `${(elapsed - start).toFixed(1)}s`
              : seconds
                ? `~${seconds}s`
                : '';
          return (
            <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                  done ? 'border-accent bg-accent text-accent-ink' : active ? 'border-fg' : 'border-line-strong'
                }`}
              >
                {done ? <Check size={10} strokeWidth={3} /> : active ? <span className="size-1.5 animate-pulse rounded-full bg-fg" /> : null}
              </span>
              <span className={`flex-1 ${done ? 'text-muted' : active ? 'text-fg' : 'text-faint'}`}>{t.loading.steps[i]}</span>
              <span className={`font-mono text-xs tabular-nums ${active ? 'text-fg' : 'text-faint'}`}>{time}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-faint">
        {elapsed > SLOW_AFTER ? t.loading.slow : t.loading.usual}
      </p>
    </div>
  );
}
