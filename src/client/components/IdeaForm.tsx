import { useEffect, useId, useRef } from 'react';
import { t } from '../strings';
import {
  DETAIL_MAX_CHARS,
  FRAMEWORK_CHOICES,
  IDEA_MAX_CHARS,
  IDEA_MIN_CHARS,
  type FrameworkChoice,
} from '../../shared/schemas';

export interface IdeaDraft {
  idea: string;
  targetUser: string;
  problem: string;
  framework: FrameworkChoice;
}

interface Props {
  draft: IdeaDraft;
  disabledReason: string | null;
  error: string | null;
  footer: React.ReactNode;
  onChange: (draft: IdeaDraft) => void;
  onSubmit: () => void;
}

/** The first screen: the form on the left, a short note on the two methods on the right. */
export function IdeaForm({ draft, disabledReason, error, footer, onChange, onSubmit }: Props) {
  const ideaId = useId();
  const userId = useId();
  const problemId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const examples = t.form.examples;
  const length = draft.idea.trim().length;
  const tooShort = length < IDEA_MIN_CHARS;
  const canSubmit = !disabledReason && !tooShort && length <= IDEA_MAX_CHARS;
  const set = (patch: Partial<IdeaDraft>) => onChange({ ...draft, ...patch });

  useEffect(() => textareaRef.current?.focus(), []);

  return (
    <div className="grid animate-fade-in gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
      <form
        className="flex max-w-2xl flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        <div>
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">{t.form.title}</h1>
          <p className="mt-2 text-muted">{t.form.subtitle}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={ideaId} className="label">
              {t.form.idea}
            </label>
            <span className="font-mono text-xs text-faint tabular-nums">
              {length}/{IDEA_MAX_CHARS}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            id={ideaId}
            value={draft.idea}
            onChange={(e) => set({ idea: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) onSubmit();
            }}
            placeholder={examples[0]?.idea}
            maxLength={IDEA_MAX_CHARS}
            rows={4}
            className="field resize-y leading-relaxed"
          />
          <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-faint">
            {t.form.tryExample}
            {examples.map((ex, i) => (
              <span key={ex.label}>
                <button
                  type="button"
                  onClick={() => set({ idea: ex.idea, targetUser: ex.targetUser, problem: ex.problem })}
                  className="text-muted underline decoration-line-strong underline-offset-2 hover:text-fg hover:decoration-fg"
                >
                  {ex.label}
                </button>
                {i < examples.length - 1 && ','}
              </span>
            ))}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={problemId} className="label">
            {t.form.problem} <span className="font-normal text-faint">{t.form.optional}</span>
          </label>
          <textarea
            id={problemId}
            value={draft.problem}
            onChange={(e) => set({ problem: e.target.value })}
            maxLength={DETAIL_MAX_CHARS}
            rows={2}
            placeholder={t.form.problemPlaceholder}
            className="field resize-y leading-relaxed"
          />
        </div>

        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={userId} className="label">
              {t.form.targetUser} <span className="font-normal text-faint">{t.form.optional}</span>
            </label>
            <input
              id={userId}
              value={draft.targetUser}
              onChange={(e) => set({ targetUser: e.target.value })}
              maxLength={DETAIL_MAX_CHARS}
              placeholder={t.form.targetUserPlaceholder}
              className="field"
            />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="label mb-1.5">{t.form.method}</legend>
            <div role="radiogroup" aria-label={t.form.method} className="inline-flex w-fit rounded-md border border-line-strong p-0.5">
              {FRAMEWORK_CHOICES.map((value) => {
                const active = draft.framework === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => set({ framework: value })}
                    className={`rounded px-4 py-1.5 text-sm transition-colors ${
                      active ? 'bg-white/10 font-medium text-fg' : 'text-muted hover:text-fg'
                    }`}
                  >
                    {t.form.methods[value].label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-faint">{t.form.methods[draft.framework].hint}</p>
          </fieldset>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button type="submit" disabled={!canSubmit} className="btn-primary h-10 shrink-0 px-5">
              {t.form.analyze}
            </button>
            <div className="space-y-0.5">
              {footer}
              <p className="text-xs text-faint">{t.form.disclaimer}</p>
            </div>
          </div>
          {tooShort && length > 0 && <p className="text-xs text-faint">{t.form.tooShort}</p>}
          {disabledReason && (
            <p className="rounded-md border border-warn/30 px-3 py-2 text-sm text-warn" role="status">
              {disabledReason}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-danger/30 px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>

      <aside className="text-sm lg:border-l lg:border-line lg:pl-8">
        <h2 className="eyebrow">{t.form.asideTitle}</h2>
        <dl className="mt-3 space-y-4 text-muted">
          <div>
            <dt className="font-medium text-fg">RICE</dt>
            <dd className="mt-0.5 leading-relaxed">
              {t.form.riceAbout} <span className="text-fg">{t.form.riceFormula}</span>. {t.form.riceAboutEnd}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-fg">MoSCoW</dt>
            <dd className="mt-0.5 leading-relaxed">{t.form.moscowAbout}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
