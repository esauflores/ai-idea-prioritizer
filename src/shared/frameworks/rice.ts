/**
 * Deterministic RICE scoring.
 *
 * The AI only *estimates* the four inputs on the fixed scales below.
 * All arithmetic, normalization and ranking happens here, in plain code.
 *
 *   RICE = (Reach × Impact × Confidence) / Effort
 *
 * Units:
 *   Reach      – people affected per quarter (integer, ≥ 0)
 *   Impact     – per-person impact on a fixed 5-step scale (see IMPACT_SCALE)
 *   Confidence – how sure we are of the estimates, as a fraction (see CONFIDENCE_VALUES)
 *   Effort     – person-weeks of work for a small student team (≥ 0.25)
 */

export const IMPACT_SCALE = [
  { value: 3, label: 'Massive' },
  { value: 2, label: 'High' },
  { value: 1, label: 'Medium' },
  { value: 0.5, label: 'Low' },
  { value: 0.25, label: 'Minimal' },
] as const;

/** Word for an impact value, e.g. 2 → "High". */
export function impactLabel(value: number): string {
  return IMPACT_SCALE.find((s) => s.value === value)?.label ?? String(value);
}

export const IMPACT_VALUES = IMPACT_SCALE.map((s) => s.value);
export const CONFIDENCE_VALUES = [1, 0.8, 0.5] as const;

const REACH_MAX = 10_000_000;
export const EFFORT_MIN = 0.25;
export const EFFORT_MAX = 52;

export interface RiceInputs {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
}

function nearest<T extends number>(value: number, allowed: readonly T[]): T {
  let best = allowed[0]!;
  for (const candidate of allowed) {
    if (Math.abs(candidate - value) < Math.abs(best - value)) best = candidate;
  }
  return best;
}

/** Snap an impact estimate to the closest value on the defined scale. */
export function normalizeImpact(value: number) {
  return Number.isFinite(value) ? nearest(value, IMPACT_VALUES) : 1;
}

/**
 * Snap a confidence estimate to the scale. Accepts fractions (0.8) or
 * percentages (80). Anything below the scale is treated as Low (50%).
 */
export function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return nearest(value > 1 ? value / 100 : value, CONFIDENCE_VALUES);
}

/** Round reach to a whole number of people and clamp it to a sane range. */
export function normalizeReach(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value), REACH_MAX);
}

/** Clamp effort to [0.25, 52] person-weeks, rounded to the nearest quarter week. */
export function normalizeEffort(value: number): number {
  if (!Number.isFinite(value)) return EFFORT_MAX;
  const clamped = Math.min(Math.max(value, EFFORT_MIN), EFFORT_MAX);
  return Math.max(EFFORT_MIN, Math.round(clamped * 4) / 4);
}

/** RICE = (Reach × Impact × Confidence) / Effort, on normalized inputs, rounded to one decimal. */
export function calculateRice({ reach, impact, confidence, effort }: RiceInputs): number {
  const raw =
    (normalizeReach(reach) * normalizeImpact(impact) * normalizeConfidence(confidence)) / normalizeEffort(effort);
  return Math.round(raw * 10) / 10;
}

export interface Rankable {
  id: string;
  name: string;
  rice: RiceInputs;
}

/**
 * Sort by RICE score, highest first. Ties are broken by lower effort, then
 * by name, so the ordering is fully deterministic. Equal scores share a rank.
 */
export function rankByRice<T extends Rankable>(items: readonly T[]): { item: T; score: number; rank: number }[] {
  const scored = items.map((item) => ({
    item,
    score: calculateRice(item.rice),
    effort: normalizeEffort(item.rice.effort),
  }));
  scored.sort((a, b) => b.score - a.score || a.effort - b.effort || a.item.name.localeCompare(b.item.name));
  let rank = 0;
  let previous: number | null = null;
  return scored.map(({ item, score }, index) => {
    if (score !== previous) rank = index + 1;
    previous = score;
    return { item, score, rank };
  });
}
