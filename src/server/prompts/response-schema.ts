/**
 * JSON Schema sent to OpenRouter as `response_format` (structured outputs), so
 * the provider enforces the shape while generating. Zod (AnalysisSchema) still
 * validates and normalizes the result; this schema only describes the wire shape.
 * Strict mode requires every property to be listed in `required` and
 * `additionalProperties: false` on every object.
 */
import { CONFIDENCE_VALUES, IMPACT_VALUES } from '../../shared/frameworks/rice';
import { MOSCOW_CATEGORIES } from '../../shared/frameworks/moscow';
import { SUGGESTION_TYPES } from '../../shared/schemas';

type JsonSchema = Record<string, unknown>;

const str: JsonSchema = { type: 'string' };
const num: JsonSchema = { type: 'number' };
const strList: JsonSchema = { type: 'array', items: str };

function obj(properties: Record<string, JsonSchema>): JsonSchema {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

const feature = obj({
  id: str,
  name: str,
  description: str,
  whyItMatters: str,
  rice: obj({
    reach: { type: 'integer' },
    reachReasoning: str,
    impact: { type: 'number', enum: IMPACT_VALUES },
    confidence: { type: 'number', enum: CONFIDENCE_VALUES },
    effort: num,
    effortReasoning: str,
    evidence: strList,
    assumptions: strList,
  }),
  moscow: obj({
    category: { type: 'string', enum: MOSCOW_CATEGORIES },
    reasoning: str,
  }),
});

export const ANALYSIS_JSON_SCHEMA = obj({
  overview: obj({ verdict: str, summary: str, problem: str, targetUsers: strList }),
  framework: obj({ recommended: { type: 'string', enum: ['rice', 'moscow'] }, reason: str }),
  features: { type: 'array', items: feature },
  mvp: obj({ summary: str, featureIds: strList }),
  riceNotes: str,
  moscowNotes: obj({ must: str, should: str, could: str, wont: str }),
  recommendations: obj({ buildFirst: strList, postpone: strList, risks: strList, validation: strList }),
  missingInformation: strList,
  suggestions: {
    type: 'array',
    items: obj({
      type: { type: 'string', enum: SUGGESTION_TYPES },
      title: str,
      detail: str,
    }),
  },
});
