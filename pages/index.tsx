import { useRouter } from '@void/react';
import { useEffect, useRef, useState } from 'react';
import { ApiError, analyze } from '../src/client/api';
import { errorMessage, t } from '../src/client/strings';
import { IdeaForm, type IdeaDraft } from '../src/client/components/IdeaForm';
import { Layout, PoolCaption } from '../src/client/components/Layout';
import { LoadingState } from '../src/client/components/LoadingState';
import { Results } from '../src/client/components/Results';
import { toPrevious } from '../src/shared/result';
import type { AnalysisResult, AnalyzeRequest, PoolStatus } from '../src/shared/schemas';
import type { Props } from './index.server';
import './style.css';

const EMPTY_DRAFT: IdeaDraft = { idea: '', targetUser: '', problem: '', framework: 'auto' };

type View = 'form' | 'results';

export default function HomePage({ pool: loadedPool }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>('form');
  const [draft, setDraft] = useState<IdeaDraft>(EMPTY_DRAFT);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastRequest, setLastRequest] = useState<AnalyzeRequest | null>(null);
  const [pending, setPending] = useState<null | 'analyze' | 'refine'>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const error = errorCode ? errorMessage(errorCode) : null;
  const [pool, setPool] = useState<PoolStatus>(loadedPool);
  const [poolLoading, setPoolLoading] = useState(false);
  const inFlight = useRef(false);

  // The loader's value wins whenever the page data is re-fetched.
  useEffect(() => setPool(loadedPool), [loadedPool]);

  /** Re-run the page loader (server-side pool status); page state is preserved. */
  async function refreshPool() {
    setPoolLoading(true);
    try {
      await router.refresh();
    } catch {
      // Keep the last known value.
    } finally {
      setPoolLoading(false);
    }
  }

  const exhausted = pool?.state === 'exhausted';

  function go(next: View) {
    setView(next);
    setErrorCode(null);
    window.scrollTo({ top: 0 });
  }

  async function run(request: AnalyzeRequest, kind: 'analyze' | 'refine') {
    if (inFlight.current) return; // guard against double clicks and repeated Enter presses
    inFlight.current = true;
    setPending(kind);
    setErrorCode(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const response = await analyze(request);
      setResult(response.result);
      setLastRequest(request);
      setPool(response.pool);
      setView('results');
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      setErrorCode(apiError?.code ?? 'generic');
      if (apiError?.pool) setPool(apiError.pool);
      else void refreshPool();
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  function submitDraft() {
    const request: AnalyzeRequest = { idea: draft.idea.trim(), framework: draft.framework };
    if (draft.targetUser.trim()) request.targetUser = draft.targetUser.trim();
    if (draft.problem.trim()) request.problem = draft.problem.trim();
    void run(request, 'analyze');
  }

  function newIdea() {
    setResult(null);
    setLastRequest(null);
    setDraft(EMPTY_DRAFT);
    go('form');
  }

  let content;
  if (pending) {
    content = <LoadingState refining={pending === 'refine'} />;
  } else if (view === 'results' && result) {
    content = (
      <Results
        key={result.idea + result.features.map((f) => f.id).join()}
        result={result}
        error={error}
        refineDisabledReason={exhausted ? t.errors.pool_exhausted : null}
        onReset={newIdea}
        onRefine={(feedback) =>
          lastRequest && run({ ...lastRequest, refinement: feedback, previous: toPrevious(result) }, 'refine')
        }
      />
    );
  } else {
    content = (
      <IdeaForm
        draft={draft}
        disabledReason={exhausted ? t.errors.pool_exhausted : null}
        error={error}
        footer={<PoolCaption status={pool} loading={poolLoading} />}
        onChange={setDraft}
        onSubmit={submitDraft}
      />
    );
  }

  return (
    <Layout
      pool={pool}
      poolLoading={poolLoading}
      onRefreshPool={refreshPool}
      onHome={() => go(result ? 'results' : 'form')}
    >
      {content}
    </Layout>
  );
}
