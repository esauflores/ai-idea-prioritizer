import { describe, expect, it } from 'vitest';
import { MIN_REMAINING_USD, toPoolStatus } from '../src/server/pool';
import {
  calculateRice,
  normalizeConfidence,
  normalizeEffort,
  normalizeImpact,
  normalizeReach,
  rankByRice,
} from '../src/shared/rice';

describe('calculateRice', () => {
  it('applies (Reach × Impact × Confidence) / Effort', () => {
    expect(calculateRice({ reach: 500, impact: 2, confidence: 0.8, effort: 4 })).toBe(200);
    expect(calculateRice({ reach: 1000, impact: 3, confidence: 1, effort: 2 })).toBe(1500);
    expect(calculateRice({ reach: 300, impact: 0.5, confidence: 0.5, effort: 1 })).toBe(75);
  });

  it('rounds to one decimal place', () => {
    // 100 × 1 × 0.8 / 3 = 26.666…
    expect(calculateRice({ reach: 100, impact: 1, confidence: 0.8, effort: 3 })).toBe(26.7);
  });

  it('returns 0 when reach is 0', () => {
    expect(calculateRice({ reach: 0, impact: 3, confidence: 1, effort: 1 })).toBe(0);
  });

  it('is deterministic for the same inputs', () => {
    const inputs = { reach: 1234, impact: 2, confidence: 0.8, effort: 5.5 };
    expect(calculateRice(inputs)).toBe(calculateRice({ ...inputs }));
  });

  it('normalizes off-scale inputs before scoring', () => {
    // impact 2.4 → 2, confidence 80 (%) → 0.8, effort 0 → 0.25
    expect(calculateRice({ reach: 100, impact: 2.4, confidence: 80, effort: 0 })).toBe(640);
  });

  it('never divides by zero or returns NaN', () => {
    const score = calculateRice({ reach: Number.NaN, impact: Number.NaN, confidence: Number.NaN, effort: Number.NaN });
    expect(Number.isFinite(score)).toBe(true);
  });
});

describe('normalizers', () => {
  it('snaps impact to the 0.25 / 0.5 / 1 / 2 / 3 scale', () => {
    expect(normalizeImpact(3)).toBe(3);
    expect(normalizeImpact(5)).toBe(3);
    expect(normalizeImpact(1.4)).toBe(1);
    expect(normalizeImpact(0.3)).toBe(0.25);
    expect(normalizeImpact(-1)).toBe(0.25);
  });

  it('accepts confidence as a fraction or a percentage', () => {
    expect(normalizeConfidence(0.8)).toBe(0.8);
    expect(normalizeConfidence(80)).toBe(0.8);
    expect(normalizeConfidence(100)).toBe(1);
    expect(normalizeConfidence(0.2)).toBe(0.5);
    expect(normalizeConfidence(0.95)).toBe(1);
  });

  it('rounds reach to whole people and clamps negatives', () => {
    expect(normalizeReach(120.6)).toBe(121);
    expect(normalizeReach(-5)).toBe(0);
    expect(normalizeReach(1e12)).toBe(10_000_000);
  });

  it('clamps effort to 0.25–52 person-weeks in quarter steps', () => {
    expect(normalizeEffort(0)).toBe(0.25);
    expect(normalizeEffort(1.1)).toBe(1);
    expect(normalizeEffort(2.4)).toBe(2.5);
    expect(normalizeEffort(100)).toBe(52);
  });
});

describe('rankByRice', () => {
  const feature = (id: string, reach: number, effort: number) => ({
    id,
    name: id,
    rice: { reach, impact: 1, confidence: 1, effort },
  });

  it('orders by score, highest first', () => {
    const ranked = rankByRice([feature('low', 10, 1), feature('high', 100, 1), feature('mid', 50, 1)]);
    expect(ranked.map((r) => r.item.id)).toEqual(['high', 'mid', 'low']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('breaks ties by lower effort, then by name, and shares ranks for equal scores', () => {
    // Both score 100; "cheap" needs less effort.
    const ranked = rankByRice([feature('costly', 400, 4), feature('cheap', 100, 1), feature('b', 10, 1), feature('a', 10, 1)]);
    expect(ranked.map((r) => r.item.id)).toEqual(['cheap', 'costly', 'a', 'b']);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3, 3]);
  });

  it('does not mutate the input', () => {
    const input = [feature('a', 1, 1), feature('b', 2, 1)];
    rankByRice(input);
    expect(input.map((f) => f.id)).toEqual(['a', 'b']);
  });
});

const AT = 1_700_000_000_000;

describe('toPoolStatus', () => {
  it('reports remaining and limit from a capped key', () => {
    expect(toPoolStatus({ limit: 5, limitRemaining: 4.327, limitReset: 'monthly' }, AT)).toEqual({
      state: 'ok',
      limit: 5,
      remaining: 4.32,
      reset: 'monthly',
      updatedAt: AT,
    });
  });

  it('is exhausted below the minimum remaining balance', () => {
    expect(toPoolStatus({ limit: 5, limitRemaining: MIN_REMAINING_USD - 0.01, limitReset: null }, AT).state).toBe(
      'exhausted',
    );
    expect(toPoolStatus({ limit: 5, limitRemaining: -1, limitReset: null }, AT)).toMatchObject({
      state: 'exhausted',
      remaining: 0,
    });
  });

  it('never invents a balance for keys without a cap', () => {
    expect(toPoolStatus({ limit: null, limitRemaining: null, limitReset: null }, AT)).toMatchObject({
      state: 'no_cap',
      limit: null,
      remaining: null,
    });
  });

  it('is unavailable without data', () => {
    expect(toPoolStatus(null, AT).state).toBe('unavailable');
  });
});
