/**
 * Shared AI pool status, read from OpenRouter's GET /key.
 *
 * The key's own credit limit (set in the OpenRouter dashboard) is the hard
 * stop: OpenRouter rejects requests with 402 once it is reached. This module
 * only reads that balance so the UI can show it and the server can refuse
 * work early. The cache is per Worker instance and exists only to avoid
 * calling /key on every page load.
 */
import type { PoolStatus } from '../shared/schemas';
import { fetchKeyUsage, type KeyUsage } from './openrouter';

/** Minimum remaining balance (USD) before analyses are refused. */
export const MIN_REMAINING_USD = 0.05;
/** How long an OpenRouter /key response is reused within one Worker instance. */
const USAGE_CACHE_MS = 45_000;

/** Turn OpenRouter's key data into the minimal public status. */
export function toPoolStatus(usage: KeyUsage | null, fetchedAt: number): PoolStatus {
  if (!usage) return { state: 'unavailable', limit: null, remaining: null, reset: null, updatedAt: null };
  if (usage.limit === null || usage.limitRemaining === null) {
    return { state: 'no_cap', limit: null, remaining: null, reset: null, updatedAt: fetchedAt };
  }
  const remaining = Math.max(0, usage.limitRemaining);
  return {
    state: remaining < MIN_REMAINING_USD ? 'exhausted' : 'ok',
    limit: usage.limit,
    remaining: Math.floor(remaining * 100) / 100,
    reset: usage.limitReset,
    updatedAt: fetchedAt,
  };
}

let cached: { status: PoolStatus; at: number } | null = null;

/** Current pool status; refetched when older than the cache window or when `fresh` is set. */
export async function getPoolStatus({ fresh = false } = {}): Promise<PoolStatus> {
  const now = Date.now();
  if (!fresh && cached && now - cached.at < USAGE_CACHE_MS) return cached.status;
  try {
    const status = toPoolStatus(await fetchKeyUsage(), now);
    cached = { status, at: now };
    return status;
  } catch (error) {
    console.warn('OpenRouter key lookup failed:', error instanceof Error ? error.message : error);
    return cached?.status ?? toPoolStatus(null, now);
  }
}

/** Record that the pool is empty (after OpenRouter answered 402). */
export function markExhausted(): PoolStatus {
  const previous = cached?.status;
  const status: PoolStatus = {
    state: 'exhausted',
    limit: previous?.limit ?? null,
    remaining: previous?.limit != null ? 0 : null,
    reset: previous?.reset ?? null,
    updatedAt: Date.now(),
  };
  cached = { status, at: Date.now() };
  return status;
}
