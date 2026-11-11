/**
 * Minimal server-side client for OpenRouter's HTTP API.
 * The API key is read from the environment and never leaves the server.
 */
import { env } from 'void/env';
import { z } from 'zod';
import { AnalysisSchema, type Analysis, type AnalyzeRequest } from '../shared/schemas';
import { buildAnalyzeMessages } from './prompts/messages';
import { ANALYSIS_JSON_SCHEMA } from './prompts/response-schema';

export interface KeyUsage {
  /** Spending cap in USD, or null when the key has none. */
  limit: number | null;
  /** Remaining allowance reported by OpenRouter, or null when uncapped. */
  limitRemaining: number | null;
  limitReset: string | null;
}

const BASE_URL = 'https://openrouter.ai/api/v1';

/** Per-attempt timeout, total budget across the one retry, and minimum time left to retry. */
const AI_TIMEOUT_MS = 45_000;
const AI_TOTAL_TIMEOUT_MS = 75_000;
const AI_RETRY_MIN_MS = 25_000;
const KEY_TIMEOUT_MS = 8_000;
const MAX_OUTPUT_TOKENS = 6_000;

export type OpenRouterErrorCode =
  | 'insufficient_credits'
  | 'rate_limited'
  | 'timeout'
  | 'invalid_output'
  | 'upstream'
  | 'config';

export class OpenRouterError extends Error {
  constructor(
    readonly code: OpenRouterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

function apiKey(): string {
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new OpenRouterError('config', 'OPENROUTER_API_KEY is not configured.');
  return key;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
    'X-Title': 'AI Idea Prioritizer',
  };
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/** Known OpenRouter HTTP statuses; anything else is a generic upstream error. */
const STATUS_ERRORS: Record<number, [OpenRouterErrorCode, string]> = {
  401: ['config', 'OpenRouter rejected the API key (401).'],
  402: ['insufficient_credits', 'The shared AI pool has run out of credits.'],
  403: ['config', 'OpenRouter rejected the API key (403).'],
  408: ['timeout', 'The AI provider timed out.'],
  429: ['rate_limited', 'The AI provider is rate limiting requests.'],
};

function errorForStatus(status: number, detail: string): OpenRouterError {
  const [code, message] = STATUS_ERRORS[status] ?? ['upstream', `OpenRouter error ${status}: ${detail.slice(0, 200)}`];
  return new OpenRouterError(code, message);
}

/* ------------------------------------------------------------------ */
/* Key usage                                                           */
/* ------------------------------------------------------------------ */

const KeyResponseSchema = z.object({
  data: z.object({
    usage: z.number().nullish(),
    limit: z.number().nullish(),
    limit_remaining: z.number().nullish(),
    limit_reset: z.string().nullish(),
  }),
});

/** GET /key — returns only the fields the app needs. */
export async function fetchKeyUsage(): Promise<KeyUsage> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/key`, {
      headers: headers(),
      signal: AbortSignal.timeout(KEY_TIMEOUT_MS),
    });
  } catch (error) {
    throw isTimeout(error) ? new OpenRouterError('timeout', 'OpenRouter key lookup timed out.') : error;
  }
  if (!response.ok) throw errorForStatus(response.status, await response.text().catch(() => ''));

  const { data } = KeyResponseSchema.parse(await response.json());
  const limit = data.limit ?? null;
  let limitRemaining = data.limit_remaining ?? null;
  if (limit !== null && limitRemaining === null && typeof data.usage === 'number') {
    limitRemaining = Math.max(0, limit - data.usage);
  }
  return { limit, limitRemaining: limit === null ? null : limitRemaining, limitReset: data.limit_reset ?? null };
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

const CompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({ content: z.string().nullish() }),
      }),
    )
    .min(1),
  error: z.object({ message: z.string(), code: z.union([z.number(), z.string()]).nullish() }).nullish(),
});

/** Pull a JSON object out of a reply that may be wrapped in a code fence. */
function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const body = fenced ? fenced[1]! : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) throw new SyntaxError('No JSON object found');
  return JSON.parse(body.slice(start, end + 1));
}

export interface AnalyzeOutcome {
  analysis: Analysis;
  model: string;
}

/** One request to OpenRouter; throws OpenRouterError on any failure. */
async function attemptAnalysis(request: AnalyzeRequest, model: string, timeoutMs: number): Promise<AnalyzeOutcome> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: headers(),
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        messages: buildAnalyzeMessages(request),
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        // Structured outputs: the provider enforces this JSON Schema while generating.
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'idea_analysis', strict: true, schema: ANALYSIS_JSON_SCHEMA },
        },
        // Hidden reasoning tokens count against max_tokens and can truncate the JSON.
        // Ignored by models that don't support it.
        reasoning: { enabled: false },
      }),
    });
  } catch (error) {
    if (isTimeout(error)) throw new OpenRouterError('timeout', 'The analysis took too long. Please try again.');
    throw new OpenRouterError('upstream', 'Could not reach OpenRouter.');
  }

  if (!response.ok) throw errorForStatus(response.status, await response.text().catch(() => ''));

  const parsed = CompletionSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new OpenRouterError('upstream', 'OpenRouter returned an unexpected response.');
  const completion = parsed.data;

  if (completion.error) {
    const status = typeof completion.error.code === 'number' ? completion.error.code : 502;
    throw errorForStatus(status, completion.error.message);
  }

  const choice = completion.choices[0]!;
  if (choice.finish_reason === 'length') {
    throw new OpenRouterError('invalid_output', 'The AI response was cut off. Try a shorter description.');
  }

  let json: unknown;
  try {
    json = extractJson(choice.message.content ?? '');
  } catch {
    throw new OpenRouterError('invalid_output', 'The AI returned malformed JSON. Please try again.');
  }

  const analysis = AnalysisSchema.safeParse(json);
  if (!analysis.success) {
    console.warn('AI output failed validation', z.prettifyError(analysis.error).slice(0, 1000));
    throw new OpenRouterError('invalid_output', 'The AI response was incomplete. Please try again.');
  }

  return { analysis: analysis.data, model };
}

/**
 * Run an analysis, retrying once if the model returns malformed output and
 * enough of the overall time budget remains.
 */
export async function runAnalysis(request: AnalyzeRequest): Promise<AnalyzeOutcome> {
  const model = env.OPENROUTER_MODEL.trim();
  const deadline = Date.now() + AI_TOTAL_TIMEOUT_MS;
  try {
    return await attemptAnalysis(request, model, AI_TIMEOUT_MS);
  } catch (error) {
    const remaining = deadline - Date.now();
    if (!(error instanceof OpenRouterError) || error.code !== 'invalid_output' || remaining < AI_RETRY_MIN_MS) {
      throw error;
    }
    console.warn(`Retrying analysis after invalid output: ${error.message}`);
    return attemptAnalysis(request, model, Math.min(AI_TIMEOUT_MS, remaining));
  }
}
