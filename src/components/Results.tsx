import { useState, type ReactNode } from 'react';
import { t } from '../client/copy';
import { resultToMarkdown } from '../shared/markdown';
import {
  MOSCOW_CATEGORIES,
  REFINEMENT_MAX_CHARS,
  type AnalysisResult,
  type MoscowCategory,
  type ScoredFeature,
  type SuggestionType,
} from '../shared/schemas';
import { ArrowLeft, Check, Chevron, Copy } from './Icons';

interface Props {
  result: AnalysisResult;
  refineDisabledReason: string | null;
  error: string | null;
  onRefine: (feedback: string) => void;
  onReset: () => void;
}

/** Use the AI's titled suggestions; fall back to the first item of each list for older results. */
function suggestionsOf(result: AnalysisResult) {
  if (result.suggestions.length) return result.suggestions;
  const fallback: { type: SuggestionType; title: string; detail: string }[] = [];
  if (result.missingInformation[0]) fallback.push({ type: 'clarify', title: result.missingInformation[0], detail: '' });
  if (result.recommendations.validation[0]) fallback.push({ type: 'test', title: result.recommendations.validation[0], detail: '' });
  if (result.recommendations.risks[0]) fallback.push({ type: 'differentiate', title: result.recommendations.risks[0], detail: '' });
  return fallback;
}

export function Results({ result, refineDisabledReason, error, onRefine, onReset }: Props) {
  const r = t.results;
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const [feedback, setFeedback] = useState('');
  const mvp = new Set(result.mvp.featureIds);
  const pickedByAi = result.requestedFramework === 'auto';
  const note = pickedByAi ? result.frameworkReason : result.framework === 'rice' ? result.riceNotes : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(resultToMarkdown(result));
      setCopied('done');
    } catch {
      setCopied('failed');
    }
    setTimeout(() => setCopied('idle'), 2000);
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onReset} className="btn-ghost -ml-2">
          <ArrowLeft size={14} /> {r.newIdea}
        </button>
        <button type="button" onClick={copy} className="btn-ghost -mr-2">
          {copied === 'done' ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          {copied === 'done' ? r.copied : copied === 'failed' ? r.copyFailed : r.copy}
        </button>
      </div>

      {/* Overview */}
      <section className="grid gap-6 border-b border-line pb-7 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className="eyebrow">
            {r.counts(result.features.length, result.mvp.featureIds.length)}
          </p>
          <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-balance">
            {result.overview.verdict || r.fallbackTitle}
          </h1>
          <p className="mt-2 leading-relaxed text-muted">{result.overview.summary}</p>
        </div>
        <dl className="grid content-start gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="eyebrow">{r.problem}</dt>
            <dd className="mt-1 leading-relaxed text-muted">{result.overview.problem}</dd>
          </div>
          <div>
            <dt className="eyebrow">{r.whoFor}</dt>
            <dd className="mt-1 leading-relaxed text-muted">{result.overview.targetUsers.join(' · ')}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-7 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Main: the prioritization */}
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="prioritization">
            <h2 id="prioritization" className="flex flex-wrap items-baseline gap-x-2 text-[17px] font-semibold tracking-tight">
              {r.features}
              {pickedByAi && (
                <span className="text-xs font-normal text-faint">
                  {r.pickedByAi(t.form.methods[result.framework].label)}
                </span>
              )}
            </h2>
            {note && <p className="mt-1 text-sm leading-relaxed text-muted">{note}</p>}
            <div className="mt-3">
              {result.framework === 'rice' ? <RiceTable result={result} /> : <MoscowList result={result} mvp={mvp} />}
            </div>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold tracking-tight">{r.refine}</h2>
            <p className="mt-1 text-sm text-muted">{r.refineHint}</p>
            <form
              className="mt-2 flex flex-col gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (feedback.trim() && !refineDisabledReason) onRefine(feedback.trim());
              }}
            >
              <textarea
                aria-label={r.refineLabel}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={REFINEMENT_MAX_CHARS}
                rows={2}
                placeholder={r.refinePlaceholder}
                className="field resize-y text-sm"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={!feedback.trim() || refineDisabledReason !== null} className="btn-primary h-8 px-3.5 text-sm">
                  {r.update}
                </button>
              </div>
              {refineDisabledReason && <p className="text-sm text-warn">{refineDisabledReason}</p>}
              {error && (
                <p className="text-sm text-danger" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
        </div>

        {/* Side: what to do next */}
        <div className="flex min-w-0 flex-col gap-8">
          <Section title={r.nextSteps}>
            <ol className="flex flex-col gap-4">
              {suggestionsOf(result).map((s) => (
                <li key={s.title} className="text-sm">
                  <span className="eyebrow">{r.suggestion[s.type]}</span>
                  <p className="mt-0.5 font-medium text-fg">{s.title}</p>
                  {s.detail && <p className="mt-0.5 leading-snug text-muted">{s.detail}</p>}
                </li>
              ))}
            </ol>
          </Section>

          <Section title={r.firstVersion}>
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg">MVP.</span> {result.mvp.summary}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <SubList title={r.buildFirst} items={result.recommendations.buildFirst} numbered />
              <SubList title={r.later} items={result.recommendations.postpone} />
            </div>
          </Section>

          <Section title={r.risks}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <SubList title={r.wrong} items={result.recommendations.risks} />
              <SubList title={r.test} items={result.recommendations.validation} />
              {result.missingInformation.length > 0 && <SubList title={r.unclear} items={result.missingInformation} />}
            </div>
          </Section>
        </div>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */

function RiceTable({ result }: { result: AnalysisResult }) {
  const ranked = [...result.features].sort((a, b) => a.riceRank - b.riceRank);
  const max = Math.max(...ranked.map((f) => f.riceScore), 1);
  return (
    <div>
      <ol className="flex flex-col gap-2">
        {ranked.map((f) => (
          <RiceRow key={f.id} feature={f} max={max} />
        ))}
      </ol>
      <p className="mt-2.5 text-xs leading-relaxed text-faint">
        {t.results.scoreNote}
      </p>
    </div>
  );
}

function RiceRow({ feature: f, max }: { feature: ScoredFeature; max: number }) {
  const [open, setOpen] = useState(false);
  const r = t.results;
  const top = f.riceRank === 1;
  return (
    <li className={`panel overflow-hidden transition-colors ${open ? 'border-line-strong' : 'hover:border-line-strong'}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-3 text-left">
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
            <Chip label={r.impact}>{r.impactLevels[f.rice.impact] ?? f.rice.impact}</Chip>
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
function MoscowList({ result, mvp }: { result: AnalysisResult; mvp: Set<string> }) {
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
              <span className="rounded bg-white/[0.06] px-1.5 font-mono text-xs text-muted tabular-nums">{features.length}</span>
            </div>
            <p className="mt-1 text-xs leading-snug text-faint">{result.moscowNotes[cat]}</p>
            {features.length > 0 && (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f.id} className="rounded-md border border-line bg-bg px-3 py-2.5 text-[13px] sm:[&:last-child:nth-child(odd)]:col-span-2">
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
  return n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[17px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function MvpTag() {
  return (
    <span className="shrink-0 rounded-sm bg-accent/15 px-1 font-mono text-[10px] leading-4 text-accent">MVP</span>
  );
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-fg">{title}</div>
      <div className="mt-0.5 leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty?: string }) {
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

function SubList({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <div className="text-sm">
      <h3 className="mb-1.5 font-medium">{title}</h3>
      {numbered && items.length ? (
        <ol className="space-y-1 text-muted">
          {items.map((item, i) => (
            <li key={item} className="flex gap-2">
              <span className="w-3 shrink-0 font-mono text-xs leading-5 text-faint tabular-nums">{i + 1}</span>
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="leading-snug text-muted">
          <BulletList items={items} />
        </div>
      )}
    </div>
  );
}
