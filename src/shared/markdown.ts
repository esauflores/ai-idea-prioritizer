import { impactLabel } from './frameworks/rice';
import { MOSCOW_CATEGORIES, MOSCOW_LABELS } from './frameworks/moscow';
import type { AnalysisResult } from './schemas';

/** Plain Markdown export of a result, used by the "Copy" button. Shows only the method the result used. */
export function resultToMarkdown(result: AnalysisResult): string {
  const byRank = [...result.features].sort((a, b) => a.riceRank - b.riceRank);
  const mvp = new Set(result.mvp.featureIds);
  const bullets = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join('\n') : '- None');

  const lines: string[] = [
    '# Idea analysis',
    '',
    `> ${result.idea.replace(/\n+/g, ' ')}`,
    '',
    '## Overview',
    ...(result.overview.verdict ? [`**Verdict:** ${result.overview.verdict}`, ''] : []),
    result.overview.summary,
    '',
    `**Problem:** ${result.overview.problem}`,
    '',
    `**Target users:** ${result.overview.targetUsers.join('; ')}`,
    '',
    '## Suggested features',
    ...result.features.map(
      (f) => `- **${f.name}**${mvp.has(f.id) ? ' (MVP)' : ''}: ${f.description} _Why:_ ${f.whyItMatters}`,
    ),
    '',
    `**Recommended MVP:** ${result.mvp.summary}`,
    '',
    ...(result.framework === 'rice'
      ? [
          '## RICE analysis',
          result.riceNotes,
          '',
          '| Rank | Feature | Reach / 3 months | Impact | Confidence | Effort (weeks) | Score |',
          '| --- | --- | --- | --- | --- | --- | --- |',
          ...byRank.map(
            (f) =>
              `| ${f.riceRank} | ${f.name} | ${f.rice.reach} | ${f.rice.impact} (${impactLabel(f.rice.impact)}) | ${Math.round(f.rice.confidence * 100)}% | ${f.rice.effort} | ${f.riceScore} |`,
          ),
          '',
        ]
      : [
          '## MoSCoW analysis',
          ...MOSCOW_CATEGORIES.flatMap((cat) => [
            `### ${MOSCOW_LABELS[cat]}`,
            result.moscowNotes[cat],
            ...result.features
              .filter((f) => f.moscow.category === cat)
              .map((f) => `- **${f.name}**: ${f.moscow.reasoning}`),
            '',
          ]),
        ]),
    '## Recommendations',
    '### Build first',
    bullets(result.recommendations.buildFirst),
    '### Later',
    bullets(result.recommendations.postpone),
    '### What could go wrong',
    bullets(result.recommendations.risks),
    '### Test before building',
    bullets(result.recommendations.validation),
    '### Still unclear',
    bullets(result.missingInformation),
    '',
    `_Method: ${result.framework === 'rice' ? 'RICE' : 'MoSCoW'}. ${result.frameworkReason} RICE score = (Reach × Impact × Confidence) ÷ Effort. Made with Idea Prioritizer; the estimates are assumptions, not research._`,
  ];
  return lines.join('\n');
}
