import { FetchError, fetch } from 'void/client';
import type { AnalysisResult, AnalyzeRequest, ApiErrorBody, PoolStatus } from '../shared/schemas';

/** A failed API call. `code` maps to a user-facing message via `errorMessage` in copy.ts. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly pool?: PoolStatus,
  ) {
    super(code);
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof FetchError) {
    const data = error.data as Partial<ApiErrorBody> | undefined;
    if (data?.error?.code) return new ApiError(data.error.code, data.pool);
    return new ApiError(error.status === 400 ? 'invalid_request' : 'http_error');
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') return new ApiError('timeout');
  return new ApiError('network');
}

export async function getUsage(): Promise<PoolStatus> {
  try {
    return (await fetch('/api/usage', { retry: 0, timeout: 15_000 })) as PoolStatus;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function analyze(request: AnalyzeRequest): Promise<{ result: AnalysisResult; pool: PoolStatus }> {
  try {
    return (await fetch('/api/analyze', { method: 'POST', body: request, retry: 0, timeout: 100_000 })) as {
      result: AnalysisResult;
      pool: PoolStatus;
    };
  } catch (error) {
    throw toApiError(error);
  }
}
