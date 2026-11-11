import { MOSCOW_LABELS } from '../shared/frameworks/moscow';
import type { FrameworkChoice, SuggestionType } from '../shared/schemas';

/** All UI text in one place. */

interface Example {
  label: string;
  idea: string;
  targetUser: string;
  problem: string;
}

export const t = {
  appName: 'Idea Prioritizer',
  home: 'Idea Prioritizer, home',

  pool: {
    label: 'Shared AI pool',
    checking: 'Checking…',
    unavailable: 'Usage unavailable',
    noLimit: 'No limit set',
    left: (remaining: string, limit: string) => `${remaining} of ${limit} left`,
    shared: 'Shared by everyone using this website.',
    refresh: 'Click to refresh.',
    resets: (when: string) => `, resets ${when}`,
  },

  form: {
    title: 'What should you build first?',
    subtitle:
      "Describe your idea. You'll get its features in priority order, a first version to build, and ways to test it.",
    idea: 'Your idea',
    tryExample: 'Try an example:',
    problem: 'What problem does it solve?',
    problemPlaceholder: 'What is hard or annoying today?',
    targetUser: 'Who is it for?',
    targetUserPlaceholder: 'e.g. First-year students',
    optional: '(optional)',
    method: 'Method',
    methods: {
      auto: { label: 'Auto', hint: 'Let the AI choose the method that fits your idea.' },
      rice: { label: 'RICE', hint: 'Scores each feature by value for the effort.' },
      moscow: { label: 'MoSCoW', hint: "Sorts features into Must, Should, Could and Won't." },
    } satisfies Record<FrameworkChoice, { label: string; hint: string }>,
    analyze: 'Analyze',
    tooShort: 'Add a little more detail.',
    disclaimer: 'AI estimates can be wrong. Check them with real users.',
    asideTitle: 'Two ways to rank',
    riceAbout: 'Gives each feature a score:',
    riceFormula: '(Reach × Impact × Confidence) ÷ Effort',
    riceAboutEnd: 'Higher means more value for the work.',
    moscowAbout: "Sorts features into Must, Should, Could and Won't, so you know what goes in the first version.",
    examples: [
      {
        label: 'Slang translator',
        idea: 'A tool that translates social media screenshots and explains slang or idioms.',
        targetUser: 'Social media users',
        problem: "Can't easily understand slang or idioms in posts",
      },
      {
        label: 'Study partners',
        idea: 'An app that helps university students find study partners, organize sessions, and share notes.',
        targetUser: 'Students taking the same courses',
        problem: 'Hard to find classmates to study with outside of class',
      },
      {
        label: 'Dorm laundry',
        idea: 'A web app that shows which laundry machines in our dorm are free and notifies you when your load is done.',
        targetUser: 'Residents of one dorm',
        problem: 'Walking down only to find every machine busy',
      },
    ] as Example[],
  },

  loading: {
    analyzing: 'Analyzing your idea',
    updating: 'Updating the analysis',
    progress: 'Estimated progress',
    steps: {
      read: 'Reading your idea',
      features: 'Finding features',
      score: 'Scoring features',
      write: 'Writing next steps',
    },
    usual: 'This usually takes about 15 seconds.',
    slow: 'Taking longer than usual. Still working on it.',
  },

  results: {
    newIdea: 'New idea',
    copy: 'Copy as Markdown',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    counts: (features: number, mvp: number) => `${features} features · ${mvp} in MVP`,
    fallbackTitle: 'Your idea, analyzed',
    problem: 'Problem',
    whoFor: "Who it's for",
    features: 'Features',
    pickedByAi: (name: string) => `${name}, picked by the AI`,
    refine: 'Refine',
    refineHint: 'AI estimates can be wrong. Correct them or add details, then run it again.',
    refineLabel: 'Feedback to refine the analysis',
    refinePlaceholder: 'e.g. “Only for my faculty, about 800 students”',
    update: 'Update analysis',
    nextSteps: 'Next steps',
    suggestion: {
      clarify: 'Clarify',
      test: 'Test first',
      differentiate: 'Stand out',
      scope: 'Cut scope',
    } satisfies Record<SuggestionType, string>,
    firstVersion: 'First version',
    buildFirst: 'Build first',
    later: 'Later',
    risks: 'Risks',
    wrong: 'What could go wrong',
    test: 'Test before building',
    unclear: 'Still unclear',
    nothing: 'Nothing specific.',
    scoreNote: 'Score = (Reach × Impact × Confidence) ÷ Effort. Open a feature to see why.',
    pts: 'pts',
    why: 'Why',
    hide: 'Hide',
    reach: 'Reach',
    impact: 'Impact',
    confidence: 'Confidence',
    effort: 'Effort',
    weeksShort: 'wk',
    whyItMatters: 'Why it matters',
    reachDetail: (n: string) => `Reach: ${n} people in 3 months`,
    effortDetail: (n: number) => `Effort: ${n} ${n === 1 ? 'week' : 'weeks'} of work`,
    evidence: 'Evidence',
    noEvidence: 'Nothing in your description backs this up yet.',
    assumptions: 'Assumptions',
    noAssumptions: 'None stated.',
  },

  moscow: MOSCOW_LABELS,

  errors: {
    invalid_request: 'Please check your idea and try again.',
    pool_exhausted: 'The shared AI pool has been exhausted. Please try again later.',
    ai_timeout: 'The AI took too long to answer. Please try again.',
    ai_rate_limited: 'The AI is busy right now. Please wait a moment and try again.',
    ai_invalid_output: 'The AI gave an answer we could not read. Please try again.',
    ai_error: 'The AI service had a problem. Please try again.',
    config_error: 'The site is not set up correctly. Please try again later.',
    timeout: 'The request took too long. Please try again.',
    network: 'Network error. Check your connection and try again.',
    generic: 'Something went wrong. Please try again.',
  } as Record<string, string> & { pool_exhausted: string; generic: string },
};

/** Message for an API error code, falling back to a generic one. */
export function errorMessage(code: string | undefined): string {
  return (code && t.errors[code]) || t.errors.generic;
}
