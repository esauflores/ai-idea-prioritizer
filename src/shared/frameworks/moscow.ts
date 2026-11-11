/**
 * MoSCoW helpers. Pure functions, unit-tested.
 *
 *   Must   – the first version does not work without it
 *   Should – important, in the MVP only if the AI judged it worth it
 *   Could  – nice to have, never in the MVP
 *   Won't  – explicitly out for now, never in the MVP
 */

export const MOSCOW_CATEGORIES = ['must', 'should', 'could', 'wont'] as const;
export type MoscowCategory = (typeof MOSCOW_CATEGORIES)[number];

export const MOSCOW_LABELS: Record<MoscowCategory, string> = {
  must: 'Must have',
  should: 'Should have',
  could: 'Could have',
  wont: "Won't have for now",
};

/**
 * Spellings the model sometimes uses, after lowercasing, removing non-letters and
 * dropping "have…" ("Won't have for now" → "wont", "Must-have (core)" → "must").
 */
const ALIASES: Record<string, MoscowCategory> = {
  must: 'must',
  should: 'should',
  could: 'could',
  wont: 'wont',
  willnot: 'wont',
};

/** Map loose category text to a category, or return the input unchanged so validation can reject it. */
export function normalizeMoscowCategory(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return ALIASES[value.toLowerCase().replace(/[^a-z]/g, '').replace(/have.*$/, '')] ?? value;
}

/** How each category is treated when building the MVP. */
const MVP_RULE: Record<MoscowCategory, 'always' | 'if-chosen' | 'never'> = {
  must: 'always',
  should: 'if-chosen',
  could: 'never',
  wont: 'never',
};

/**
 * The MVP feature ids: the AI's picks that are allowed, plus every Must it left out.
 * Order follows the AI's picks first, then the added Musts in feature order.
 */
export function selectMvp(features: { id: string; category: MoscowCategory }[], chosenIds: string[]): string[] {
  const category = new Map(features.map((f) => [f.id, f.category]));
  const allowed = chosenIds.filter((id) => {
    const c = category.get(id);
    return c !== undefined && MVP_RULE[c] !== 'never';
  });
  const required = features.filter((f) => MVP_RULE[f.category] === 'always').map((f) => f.id);
  return [...new Set([...allowed, ...required])];
}
