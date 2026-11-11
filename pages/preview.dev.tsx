import { useEffect, useState } from 'react';
import { t } from '../src/client/strings';
import { IdeaForm, type IdeaDraft } from '../src/client/components/IdeaForm';
import { Layout, PoolCaption } from '../src/client/components/Layout';
import { LoadingState } from '../src/client/components/LoadingState';
import { Results } from '../src/client/components/Results';
// Plain data only (the model's one-shot example); no server code or env is imported.
import { EXAMPLE_IDEA, EXAMPLE_OUTPUT } from '../src/server/prompts/example';
import { buildResult } from '../src/shared/result';
import { AnalysisSchema, type PoolStatus } from '../src/shared/schemas';
import './style.css';

const POOL: PoolStatus = { state: 'ok', limit: 5, remaining: 4.94, reset: null, updatedAt: 0 };
const SAMPLE_RESULT = buildResult(EXAMPLE_IDEA, 'auto', AnalysisSchema.parse(EXAMPLE_OUTPUT), 'sample');

/**
 * Dev-only preview of every screen with sample data, no AI calls. Not built for production.
 * /preview?view=form | loading | results (default), &tab=rice|moscow forces the framework shown
 */
export default function PreviewPage() {
  const [view, setView] = useState('results');
  const [tab, setTab] = useState<'rice' | 'moscow' | undefined>();
  const ex = t.form.examples[0]!;
  const [draft, setDraft] = useState<IdeaDraft>({ ...ex, framework: 'rice' });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setView(params.get('view') ?? 'results');
    const t = params.get('tab');
    if (t === 'rice' || t === 'moscow') setTab(t);
  }, []);
  const noop = () => {};
  const caption = <PoolCaption status={POOL} loading={false} />;

  return (
    <Layout pool={POOL} poolLoading={false} onRefreshPool={noop} onHome={noop}>
      {(view === 'form' || view === 'home') && (
        <IdeaForm
          draft={draft}
          disabledReason={null}
          error={null}
          footer={caption}
          onChange={setDraft}
          onSubmit={noop}
        />
      )}
      {view === 'loading' && <LoadingState />}
      {view === 'results' && (
        <Results
          result={tab ? { ...SAMPLE_RESULT, framework: tab } : SAMPLE_RESULT}
          error={null}
          refineDisabledReason={null}
          onReset={noop}
          onRefine={noop}
        />
      )}
    </Layout>
  );
}
