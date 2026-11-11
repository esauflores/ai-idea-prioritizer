import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, analyze, getUsage } from '../src/client/api';
import { errorMessage, t } from '../src/client/copy';
import { IdeaForm, type IdeaDraft } from '../src/components/IdeaForm';
import { Layout, PoolCaption } from '../src/components/Layout';
import { LoadingState } from '../src/components/LoadingState';
import { Results } from '../src/components/Results';
import { toPrevious } from '../src/shared/result';
import type { AnalysisResult, AnalyzeRequest, PoolStatus } from '../src/shared/schemas';
import './style.css';

const EMPTY_DRAFT: IdeaDraft = { idea: '', targetUser: '', problem: '', framework: 'auto' };

type View = 'form' | 'results';

export default function HomePage() {
  const [view, setView] = useState<View>('form');
  const [draft, setDraft] = useState<IdeaDraft>(EMPTY_DRAFT);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastRequest, setLastRequest] = useState<AnalyzeRequest | null>(null);
  const [pending, setPending] = useState<null | 'analyze' | 'refine'>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const error = errorCode ? errorMessage(errorCode) : null;
  const [pool, setPool] = useState<PoolStatus | null>(null);
  const [poolLoading, setPoolLoading] = useState(true);
  const inFlight = useRef(false);

  const refreshPool = useCallback(async () => {
    setPoolLoading(true);
    try {
      setPool(await getUsage());
    } catch {
      // Keep the last known value; the indicator shows "Usage unavailable" if there is none.
    } finally {
      setPoolLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPool();
  }, [refreshPool]);

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
        refineDisabledReason={exhausted ? t.errors.exhausted : null}
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
        disabledReason={exhausted ? t.errors.exhausted : null}
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
