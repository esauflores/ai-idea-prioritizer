import { rankByRice } from './rice';
import type { Analysis, AnalysisResult, FrameworkChoice, PreviousAnalysis } from './schemas';

/** Combine the validated AI analysis with deterministic RICE scores. */
export function buildResult(
  idea: string,
  requestedFramework: FrameworkChoice,
  analysis: Analysis,
  model: string,
): AnalysisResult {
  const ranked = rankByRice(analysis.features);
  const scores = new Map(ranked.map((r) => [r.item.id, r]));
  const features = analysis.features.map((feature) => ({
    ...feature,
    riceScore: scores.get(feature.id)!.score,
    riceRank: scores.get(feature.id)!.rank,
  }));

  // MVP consistency is enforced in code: every "must" is in, no "could"/"wont".
  // Including a "should" stays the model's judgment call.
  const category = new Map(features.map((f) => [f.id, f.moscow.category]));
  const chosen = analysis.mvp.featureIds.filter((id) => {
    const c = category.get(id);
    return c === 'must' || c === 'should';
  });
  const missingMusts = features.filter((f) => f.moscow.category === 'must' && !chosen.includes(f.id)).map((f) => f.id);
  const mvpIds = [...new Set([...chosen, ...missingMusts])];

  const { framework, ...rest } = analysis;
  return {
    ...rest,
    idea,
    requestedFramework,
    framework: requestedFramework === 'auto' ? framework.recommended : requestedFramework,
    frameworkReason: framework.reason,
    features,
    mvp: { summary: analysis.mvp.summary, featureIds: mvpIds },
    model,
  };
}

/** Compact form of a result, sent back to the server when refining. */
export function toPrevious(result: AnalysisResult): PreviousAnalysis {
  return {
    summary: result.overview.summary.slice(0, 800),
    features: result.features.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      moscow: f.moscow.category,
    })),
  };
}
