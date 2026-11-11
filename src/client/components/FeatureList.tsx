import { useState, type ReactNode } from 'react';
import { t } from '../strings';
import { impactLabel } from '../../shared/frameworks/rice';
import { MOSCOW_CATEGORIES, type MoscowCategory } from '../../shared/frameworks/moscow';
import type { AnalysisResult, ScoredFeature } from '../../shared/schemas';
import { Chevron } from './Icons';

/** The prioritized feature list: ranked RICE cards or MoSCoW category panels. */

export function RiceList({ result }: { result: AnalysisResult }) {
  const ranked = [...result.features].sort((a, b) => a.riceRank - b.riceRank);
  const max = Math.max(...ranked.map((f) => f.riceScore), 1);
  return (
    <div>
      <ol className="flex flex-col gap-2">
        {ranked.map((f) => (
          <RiceRow key={f.id} feature={f} max={max} />
        ))}
      </ol>
      <p className="mt-2.5 text-xs leading-relaxed text-faint">{t.results.scoreNote}</p>
    </div>
  );
}

function RiceRow({ feature: f, max }: { feature: ScoredFeature; max: number }) {
  const [open, setOpen] = useState(false);
  const r = t.results;
  const top = f.riceRank === 1;
  return (
    <li
      className={`panel overflow-hidden transition-colors ${open ? 'border-line-strong' : 'hover:border-line-strong'}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-md font-mono text-xs font-medium tabular-nums ${
            top ? 'bg-accent text-accent-ink' : 'bg-white/[0.06] text-muted'
          }`}
        >
          {f.riceRank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-sm leading-snug font-medium text-fg">{f.name}</span>
            <span className="shrink-0 font-mono text-base font-medium text-fg tabular-nums">
              {f.riceScore}
              <span className="ml-1 text-[11px] font-normal text-faint">{r.pts}</span>
            </span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <span
              className={`block h-full rounded-full ${top ? 'bg-accent' : 'bg-accent/60'}`}
              style={{ width: `${Math.max(2, (f.riceScore / max) * 100)}%` }}
            />
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip label={r.reach}>{compact(f.rice.reach)}</Chip>
            <Chip label={r.impact}>{impactLabel(f.rice.impact)}</Chip>
            <Chip label={r.confidence}>{Math.round(f.rice.confidence * 100)}%</Chip>
            <Chip label={r.effort}>
              {f.rice.effort} {r.weeksShort}
            </Chip>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-faint">
              {open ? r.hide : r.why}
              <Chevron size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          </span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-3 py-3 pl-[3.25rem] text-[13px]">
          <p className="text-muted">{f.description}</p>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Detail title={r.whyItMatters}>{f.whyItMatters}</Detail>
            </div>
            <Detail title={r.reachDetail(f.rice.reach.toLocaleString('en-US'))}>{f.rice.reachReasoning}</Detail>
            <Detail title={r.effortDetail(f.rice.effort)}>{f.rice.effortReasoning}</Detail>
            <Detail title={r.evidence}>
              <BulletList items={f.rice.evidence} empty={r.noEvidence} />
            </Detail>
            <Detail title={r.assumptions}>
              <BulletList items={f.rice.assumptions} empty={r.noAssumptions} />
            </Detail>
          </div>
        </div>
      )}
    </li>
  );
}

function Chip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded bg-white/[0.04] px-1.5 py-0.5 text-[11px]">
      <span className="text-faint">{label}</span>
      <span className="font-mono text-muted tabular-nums">{children}</span>
    </span>
  );
}

const MOSCOW_DOT: Record<MoscowCategory, string> = {
  must: 'bg-accent',
  should: 'bg-fg/70',
  could: 'bg-muted/50',
  wont: 'bg-faint/40',
};

/** One panel per category; each feature is its own card inside it. */
export function MoscowList({ result, mvp }: { result: AnalysisResult; mvp: Set<string> }) {
  return (
    <div className="flex flex-col gap-3">
      {MOSCOW_CATEGORIES.map((cat) => {
        const features = result.features.filter((f) => f.moscow.category === cat);
        return (
          <section key={cat} className="panel p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <span className={`size-2 rounded-full ${MOSCOW_DOT[cat]}`} aria-hidden="true" />
                {t.moscow[cat]}
              </h3>
              <span className="rounded bg-white/[0.06] px-1.5 font-mono text-xs text-muted tabular-nums">
                {features.length}
              </span>
            </div>
            <p className="mt-1 text-xs leading-snug text-faint">{result.moscowNotes[cat]}</p>
            {features.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li
                    key={f.id}
                    className="rounded-md border border-line bg-bg px-3 py-2.5 text-[13px] sm:[&:last-child:nth-child(odd)]:col-span-2"
                  >
                    <span className="flex flex-wrap items-center gap-2 font-medium text-fg">
                      {f.name}
                      {mvp.has(f.id) && <MvpTag />}
                    </span>
                    <p className="mt-1 leading-snug text-muted">{f.moscow.reasoning}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function compact(n: number): string {
  return n >= 10_000
    ? `${Math.round(n / 1000)}k`
    : n >= 1000
      ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : String(n);
}

function MvpTag() {
  return <span className="shrink-0 rounded-sm bg-accent/15 px-1 font-mono text-[10px] leading-4 text-accent">MVP</span>;
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-fg">{title}</div>
      <div className="mt-0.5 leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export function BulletList({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return <span className="text-faint">{empty ?? t.results.nothing}</span>;
  return (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <span className="text-faint">–</span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}
