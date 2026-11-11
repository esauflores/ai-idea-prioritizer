import { useState, type ReactNode } from 'react';
import { t } from '../strings';
import { resultToMarkdown } from '../../shared/markdown';
import { REFINEMENT_MAX_CHARS, type AnalysisResult, type SuggestionType } from '../../shared/schemas';
import { BulletList, MoscowList, RiceList } from './FeatureList';
import { ArrowLeft, Check, Copy } from './Icons';

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
  if (result.recommendations.validation[0])
    fallback.push({ type: 'test', title: result.recommendations.validation[0], detail: '' });
  if (result.recommendations.risks[0])
    fallback.push({ type: 'differentiate', title: result.recommendations.risks[0], detail: '' });
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
          <p className="eyebrow">{r.counts(result.features.length, result.mvp.featureIds.length)}</p>
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
            <h2
              id="prioritization"
              className="flex flex-wrap items-baseline gap-x-2 text-[17px] font-semibold tracking-tight"
            >
              {r.features}
              {pickedByAi && (
                <span className="text-xs font-normal text-faint">
                  {r.pickedByAi(t.form.methods[result.framework].label)}
                </span>
              )}
            </h2>
            {note && <p className="mt-1 text-sm leading-relaxed text-muted">{note}</p>}
            <div className="mt-3">
              {result.framework === 'rice' ? <RiceList result={result} /> : <MoscowList result={result} mvp={mvp} />}
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
                <button
                  type="submit"
                  disabled={!feedback.trim() || refineDisabledReason !== null}
                  className="btn-primary h-8 px-3.5 text-sm"
                >
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[17px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
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
