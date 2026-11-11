import { defineHandler, type CloudContext } from 'void';
import { AiError, runAnalysis } from '../../src/server/openrouter';
import { getPoolStatus, markExhausted } from '../../src/server/pool';
import { buildResult } from '../../src/shared/result';
import { AnalyzeRequestSchema, type ApiErrorBody, type ApiErrorCode, type PoolStatus } from '../../src/shared/schemas';

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid_request: 'Please check your input and try again.',
  pool_exhausted: 'The shared AI pool has been exhausted. Please try again later.',
  ai_timeout: 'The analysis took too long. Please try again.',
  ai_rate_limited: 'The AI provider is busy right now. Please try again in a minute.',
  ai_invalid_output: 'The AI returned an incomplete answer. Please try again.',
  ai_error: 'Something went wrong while analyzing your idea. Please try again.',
  config_error: 'The AI service is not configured correctly. Please tell the site owner.',
};

const STATUS: Record<ApiErrorCode, 400 | 429 | 500 | 502 | 503 | 504> = {
  invalid_request: 400,
  pool_exhausted: 503,
  ai_timeout: 504,
  ai_rate_limited: 429,
  ai_invalid_output: 502,
  ai_error: 502,
  config_error: 500,
};

const AI_CODES: Record<AiError['code'], ApiErrorCode> = {
  insufficient_credits: 'pool_exhausted',
  rate_limited: 'ai_rate_limited',
  timeout: 'ai_timeout',
  invalid_output: 'ai_invalid_output',
  upstream: 'ai_error',
  config: 'config_error',
};

function fail(c: CloudContext, code: ApiErrorCode, pool?: PoolStatus) {
  const body: ApiErrorBody = { error: { code, message: MESSAGES[code] }, pool };
  return c.json(body, STATUS[code]);
}

/** POST /api/analyze — one analysis against the shared OpenRouter key. */
export const POST = defineHandler.withValidator({ body: AnalyzeRequestSchema })(async (c, { body }) => {
  c.header('Cache-Control', 'no-store');

  // Refuse early if the shared balance is known to be (nearly) spent.
  // OpenRouter's credit limit on the key remains the hard stop.
  const before = await getPoolStatus();
  if (before.state === 'exhausted') return fail(c, 'pool_exhausted', before);

  try {
    const { analysis, model } = await runAnalysis(body);
    const result = buildResult(body.idea, body.framework, analysis, model);
    return { result, pool: await getPoolStatus({ fresh: true }) };
  } catch (error) {
    if (error instanceof AiError) {
      console.warn(`Analysis failed (${error.code}): ${error.message}`);
      if (error.code === 'insufficient_credits') return fail(c, 'pool_exhausted', markExhausted());
      return fail(c, AI_CODES[error.code], await getPoolStatus());
    }
    console.error('Unexpected analysis error', error);
    return fail(c, 'ai_error', await getPoolStatus());
  }
});
