import { z } from 'zod';
import { MOSCOW_CATEGORIES, normalizeMoscowCategory } from './frameworks/moscow';
import { normalizeConfidence, normalizeEffort, normalizeImpact, normalizeReach } from './frameworks/rice';

/* ------------------------------------------------------------------ */
/* Limits shared by client and server                                  */
/* ------------------------------------------------------------------ */

export const IDEA_MIN_CHARS = 20;
export const IDEA_MAX_CHARS = 2000;
export const REFINEMENT_MAX_CHARS = 600;
export const DETAIL_MAX_CHARS = 200;

export const FRAMEWORK_CHOICES = ['auto', 'rice', 'moscow'] as const;
export type FrameworkChoice = (typeof FRAMEWORK_CHOICES)[number];
export type Framework = Exclude<FrameworkChoice, 'auto'>;

export const SUGGESTION_TYPES = ['clarify', 'test', 'differentiate', 'scope'] as const;
export type SuggestionType = (typeof SUGGESTION_TYPES)[number];


/* ------------------------------------------------------------------ */
/* AI response schema                                                  */
/*                                                                     */
/* Strings are trimmed and lists are capped rather than rejected, so a  */
/* slightly verbose model still produces a usable result. Structural   */
/* problems (missing fields, wrong types) fail validation.             */
/* ------------------------------------------------------------------ */

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.slice(0, max));

/** A missing list is treated as empty rather than failing the whole response. */
const list = (maxItems: number, maxChars = 400) =>
  z
    .array(z.string().trim())
    .default([])
    .transform((items) =>
    items
      .filter((s) => s.length > 0)
      .slice(0, maxItems)
      .map((s) => s.slice(0, maxChars)),
  );

/** Accepts a number or a numeric string ("80", "0.8", "80%"). */
const numeric = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value.replace(/[%,\s]/g, ''));
  if (!Number.isFinite(n)) {
    ctx.addIssue({ code: 'custom', message: 'Expected a number' });
    return z.NEVER;
  }
  return n;
});

const RiceEstimateSchema = z.object({
  reach: numeric.transform(normalizeReach),
  reachReasoning: text(400),
  impact: numeric.transform(normalizeImpact),
  confidence: numeric.transform(normalizeConfidence),
  effort: numeric.transform(normalizeEffort),
  effortReasoning: text(400),
  evidence: list(4),
  assumptions: list(4),
});

const FeatureSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.slice(0, 40)),
  name: text(80),
  description: text(300),
  whyItMatters: text(400),
  rice: RiceEstimateSchema,
  moscow: z.object({
    category: z.preprocess(normalizeMoscowCategory, z.enum(MOSCOW_CATEGORIES)),
    reasoning: text(400),
  }),
});

export const AnalysisSchema = z.object({
  overview: z.object({
    /** Candid 2–5 word verdict shown as the results headline. Optional so older outputs still parse. */
    verdict: z
      .string()
      .trim()
      .default('')
      .transform((s) => s.slice(0, 80)),
    summary: text(600),
    problem: text(600),
    targetUsers: list(5, 200),
  }),
  framework: z.object({
    recommended: z.preprocess(
      (v) => (typeof v === 'string' ? v.toLowerCase().trim() : v),
      z.enum(['rice', 'moscow']),
    ),
    reason: text(500),
  }),
  features: z
    .array(FeatureSchema)
    .min(3)
    .transform((features) => {
      // Guarantee unique ids even if the model repeats one.
      const seen = new Set<string>();
      return features.slice(0, 8).map((f, i) => {
        const id = seen.has(f.id) ? `${f.id}-${i + 1}` : f.id;
        seen.add(id);
        return { ...f, id };
      });
    }),
  mvp: z.object({
    summary: text(600),
    featureIds: z.array(z.string()).transform((ids) => ids.slice(0, 8)),
  }),
  riceNotes: text(500),
  moscowNotes: z.object({
    must: text(400),
    should: text(400),
    could: text(400),
    wont: text(400),
  }),
  recommendations: z.object({
    buildFirst: list(5),
    postpone: list(5),
    risks: list(6),
    validation: list(6),
  }),
  missingInformation: list(6),
  /** Three headline next steps shown as cards. Optional so older outputs still parse. */
  suggestions: z
    .array(
      z.object({
        type: z.enum(SUGGESTION_TYPES).catch('clarify'),
        title: text(90),
        detail: text(240),
      }),
    )
    .default([])
    .transform((items) => items.slice(0, 3)),
});

export type Analysis = z.output<typeof AnalysisSchema>;
export type Feature = Analysis['features'][number];

/* ------------------------------------------------------------------ */
/* API request / response                                              */
/* ------------------------------------------------------------------ */

/** Compact summary of a previous result, sent back when refining. */
export const PreviousAnalysisSchema = z.object({
  summary: z.string().max(800),
  features: z
    .array(
      z.object({
        id: z.string().max(40),
        name: z.string().max(80),
        description: z.string().max(300),
        moscow: z.enum(MOSCOW_CATEGORIES),
      }),
    )
    .max(8),
});
export type PreviousAnalysis = z.infer<typeof PreviousAnalysisSchema>;

export const AnalyzeRequestSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(IDEA_MIN_CHARS, `Describe your idea in at least ${IDEA_MIN_CHARS} characters.`)
    .max(IDEA_MAX_CHARS, `Keep your idea under ${IDEA_MAX_CHARS} characters.`),
  framework: z.enum(FRAMEWORK_CHOICES),
  /** Optional details from the form; treated like the idea text. */
  targetUser: z.string().trim().max(DETAIL_MAX_CHARS).optional(),
  problem: z.string().trim().max(DETAIL_MAX_CHARS).optional(),
  refinement: z.string().trim().max(REFINEMENT_MAX_CHARS).optional(),
  previous: PreviousAnalysisSchema.optional(),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export type PoolState = 'ok' | 'exhausted' | 'no_cap' | 'unavailable';

/** The only usage data ever sent to the browser. */
export interface PoolStatus {
  state: PoolState;
  /** Spending cap in USD, or null if none is configured / unknown. */
  limit: number | null;
  /** Remaining allowance in USD, or null if unknown. */
  remaining: number | null;
  /** Reset interval reported by OpenRouter (e.g. "monthly"), if any. */
  reset: string | null;
  /** Epoch ms when the underlying OpenRouter value was fetched. */
  updatedAt: number | null;
}

export type ScoredFeature = Feature & { riceScore: number; riceRank: number };

export type AnalysisResult = Omit<Analysis, 'framework' | 'features'> & {
  idea: string;
  requestedFramework: FrameworkChoice;
  /** The framework shown first: the user's choice, or the AI's pick in Auto mode. */
  framework: Framework;
  frameworkReason: string;
  features: ScoredFeature[];
  model: string;
};

export type ApiErrorCode =
  | 'invalid_request'
  | 'pool_exhausted'
  | 'ai_timeout'
  | 'ai_rate_limited'
  | 'ai_invalid_output'
  | 'ai_error'
  | 'config_error';

export interface ApiErrorBody {
  /** The client maps the code to its own text (src/client/strings.ts). */
  error: { code: ApiErrorCode };
  pool?: PoolStatus;
}
