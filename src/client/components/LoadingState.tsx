import { useEffect, useState, type ReactNode } from 'react';
import { t } from '../strings';
import { Check } from './Icons';

/**
 * Steps with typical durations (seconds), tuned to observed runs of ~8–14 s.
 * The model returns everything in one response, so these are paced estimates;
 * the last step has no duration and stays open until the response arrives.
 */
const STEPS = { read: 2, features: 4, score: 5, write: null } satisfies Record<keyof typeof t.loading.steps, number | null>;
type StepId = keyof typeof STEPS;
const STEP_IDS = Object.keys(STEPS) as StepId[];

const EXPECTED_TOTAL = 14;
/** Each step's duration varies by up to ±0.5 s so the pacing doesn't feel mechanical. */
const JITTER = 0.5;
const SLOW_AFTER = 25;

type Status = 'done' | 'active' | 'pending';

interface StepTiming {
  start: number;
  end: number;
  elapsed: number;
  estimate: number | null;
}

/** Everything that differs between a finished, running and upcoming step. */
const STATUS: Record<Status, { dot: string; marker: ReactNode; label: string; time: string; text: (s: StepTiming) => string }> = {
  done: {
    dot: 'border-accent bg-accent text-accent-ink',
    marker: <Check size={10} strokeWidth={3} />,
    label: 'text-muted',
    time: 'text-faint',
    text: (s) => `${(s.end - s.start).toFixed(1)}s`,
  },
  active: {
    dot: 'border-fg',
    marker: <span className="size-1.5 animate-pulse rounded-full bg-fg" />,
    label: 'text-fg',
    time: 'text-fg',
    text: (s) => `${(s.elapsed - s.start).toFixed(1)}s`,
  },
  pending: {
    dot: 'border-line-strong',
    marker: null,
    label: 'text-faint',
    time: 'text-faint',
    text: (s) => (s.estimate === null ? '' : `~${s.estimate}s`),
  },
};

/** Ease toward 95%: fast at first, slowing down, never "done" before the answer is in. */
function progressAt(seconds: number): number {
  return Math.min(0.95, 1 - Math.exp(-seconds / (EXPECTED_TOTAL / 1.9)));
}

export function LoadingState({ refining = false }: { refining?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const [durations] = useState(() =>
    STEP_IDS.map((id) => {
      const seconds = STEPS[id];
      return seconds === null ? Infinity : seconds + (Math.random() * 2 - 1) * JITTER;
    }),
  );
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => setElapsed((performance.now() - started) / 1000), 100);
    return () => clearInterval(timer);
  }, []);

  // Start time of each step (the next step's start is this one's end), and which one is active.
  const starts = durations.reduce<number[]>((acc, d, i) => [...acc, acc[i]! + d], [0]);
  const current = starts.filter((start) => elapsed >= start).length - 1;
  const percent = Math.round(progressAt(elapsed) * 100);
  const statusOf = (i: number): Status => (['done', 'active', 'pending'] as const)[Math.sign(i - current) + 1]!;

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
        {STEP_IDS.map((id, i) => {
          const status = STATUS[statusOf(i)];
          const timing = { start: starts[i]!, end: starts[i + 1]!, elapsed, estimate: STEPS[id] };
          return (
            <li key={id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${status.dot}`}>{status.marker}</span>
              <span className={`flex-1 ${status.label}`}>{t.loading.steps[id]}</span>
              <span className={`font-mono text-xs tabular-nums ${status.time}`}>{status.text(timing)}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-faint">{elapsed > SLOW_AFTER ? t.loading.slow : t.loading.usual}</p>
    </div>
  );
}
