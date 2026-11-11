# AI Idea Prioritizer

Describe an idea → click **Analyze** → get AI-suggested features, a RICE ranking, a MoSCoW split and practical recommendations.

A small educational tool for classmates. No accounts, no database, no API keys for users: everyone shares one server-side OpenRouter key and one visible spending pool.

Built with [Void](https://void.cloud) (Vite + Cloudflare Workers), React, TypeScript, Tailwind CSS v4 and Zod. Package manager: Bun.

## Setup

Requirements: Bun ≥ 1.4 and Node.js 24.22+ or 26.12+ (the Void CLI runs on Node).

```sh
bun install
cat > .env <<'EOF'
OPENROUTER_API_KEY=sk-or-v1-...
EOF
bun run dev             # http://localhost:5173
```

### Create the OpenRouter key

1. Go to <https://openrouter.ai/settings/keys> and create a key for this site.
2. **Set a credit limit on the key** (for example `$5`, optionally resetting monthly). The app shows this limit as the shared pool and stops accepting analyses before it runs out.
3. Put it in `.env` as `OPENROUTER_API_KEY`.

Without a limit the app still works, but the pool shows "No limit set" and nothing stops spending except your OpenRouter account balance.

### Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | yes | Shared key, server-only. Never sent to the browser. |
| `OPENROUTER_MODEL` | no | OpenRouter model id. Default `deepseek/deepseek-v4.1-flash-1017` (about $0.002 per analysis). |

- **`env.ts`** (committed) is the source of truth: names, types, defaults. It replaces a `.env.example`.
- **`.env`** (gitignored) holds local values. It is the only dotenv file Void reads; Void refuses to build if `.env.example`, `.env.local` or similar files exist.
- **Production** values are Worker secrets: `bunx void secret put OPENROUTER_API_KEY`. `.env` is never uploaded.
- `bunx void env check` validates your `.env` against `env.ts`.

## Scripts

```sh
bun run dev         # local dev server (Workers runtime via Miniflare)
bun run test        # unit tests (RICE scoring, schemas, pool status)
bun run typecheck   # generate Void types, then tsc
bun run build       # production build
bun run deploy      # void deploy
```

## Deploy to Cloudflare

```sh
bunx void connect --platform cloudflare   # once: sign in and pick an account
bunx void secret put OPENROUTER_API_KEY
bunx void secret put OPENROUTER_MODEL     # optional
bun run deploy
```

`void deploy` builds the app and prints the URL.

## How it works

```
pages/index.tsx            Single page: input screen ↔ results screen (client state only)
src/components/            IdeaForm, Results (RICE / MoSCoW), LoadingState, Layout (header + pool status)
src/client/api.ts          Typed calls to the two API routes
routes/api/analyze.ts      POST: validate → balance check → OpenRouter → validate → score
routes/api/usage.ts        GET: sanitized shared-pool status
src/server/pool.ts         Shared pool status from OpenRouter /key (cached)
src/server/openrouter.ts   OpenRouter client (chat completions + /key), timeouts, error mapping
src/server/prompts/        System prompt + RICE/MoSCoW guides, output shape, JSON schema, one-shot example
src/shared/rice.ts         RICE scales and deterministic scoring (unit tested)
src/shared/schemas.ts      Zod schemas for requests and AI responses
src/shared/result.ts       Scores the analysis and enforces MVP rules (unit tested)
pages/preview.dev.tsx      Dev-only preview of each screen: /preview?view=form|loading|results
```

### AI analysis

- One OpenRouter call returns the overview, 4–8 features, RICE **estimates** and MoSCoW categories for every feature, and recommendations. Switching between the RICE and MoSCoW tabs costs nothing; only **Refine** makes another call.
- The response shape is enforced by OpenRouter structured outputs (`src/server/prompts/response-schema.ts`), then validated with Zod. Numbers are snapped to the defined scales and missing lists default to empty. Malformed output is retried once automatically, then shown as a friendly error.
- The prompt is a step-by-step procedure (the model's reasoning mode is off) plus one worked example. It answers in the idea's language, treats numbers in the idea as unverified claims, and never names products the user didn't mention.
- MVP consistency is enforced in code: every Must is included, Could/Won't never are.
- The app, not the model, computes `RICE = (Reach × Impact × Confidence) / Effort`:
  - **Reach**: people per quarter (integer)
  - **Impact**: 3 / 2 / 1 / 0.5 / 0.25 (Massive … Minimal)
  - **Confidence**: 100% / 80% / 50%
  - **Effort**: person-weeks, 0.25–52
- Each estimate lists *evidence* (only facts from the user's own description) separately from *assumptions*. The prompt forbids invented statistics or market research.
- Limits: idea ≤ 2,000 characters, refinement ≤ 600, output ≤ 6,000 tokens (reasoning disabled), 45 s per attempt, 75 s total.

### Shared pool and safeguards

The OpenRouter key's **credit limit is the hard stop**: once it is reached, OpenRouter rejects requests with `402`. Set it to what you are willing to spend (e.g. $3–5). The app adds a few light checks on top:

- **Balance check.** Before each analysis the server reads `GET https://openrouter.ai/api/v1/key` (cached ~45 s per Worker instance, refreshed after each analysis) and refuses work when less than $0.05 remains.
- **Minimal public data.** The browser receives only `state`, `limit`, `remaining`, `reset` and `updatedAt`, never the key or account metadata.
- **Bounded requests.** Idea ≤ 2,000 characters, refinement ≤ 600, output ≤ 6,000 tokens (reasoning disabled), 45 s per attempt, 75 s total.
- **No double submits.** The Analyze button is disabled while a request runs.
- **Clear failures.** `402` marks the pool exhausted; `429`, timeouts and malformed output map to friendly messages. No fallback key is ever used.

There is intentionally no per-visitor rate limiting: someone could spend the pool quickly, but never more than the key's limit.

When the pool is exhausted, the Analyze button is disabled with *"The shared AI pool has been exhausted. Please try again later."*

Limits are constants at the top of `src/server/pool.ts` (balance, cache) and `src/server/openrouter.ts` (timeouts, tokens).
