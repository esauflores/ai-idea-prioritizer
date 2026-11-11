<!--injected-by-void-v1.7.0-->
## Void

- This project uses [Void](https://void.cloud), a full-stack Vite framework for Cloudflare Workers with file-based API routing, server-rendered pages, and typed backend services.
- Use Void's CLI and typed APIs. Before working with Void, read the relevant Markdown docs in `node_modules/void/docs/`; start with `guide/quickstart.md` for setup and `reference/cli.md` for commands.

<!--/injected-by-void-->

## Project notes

- Single-page app: `pages/index.tsx` (UI), `pages/index.server.ts` (loader: pool status), `routes/api/analyze.ts` (the only API route); no database or Durable Objects.
- Business logic is pure and unit-tested (`tests/logic.test.ts`, `tests/analysis.test.ts`): `src/shared/frameworks/{rice,moscow}.ts`, `src/shared/schemas.ts`, `src/shared/result.ts`, `toPoolStatus` in `src/server/pool.ts`. Keep scoring deterministic in code; the AI only supplies estimates. Prefer typed lookup maps (`Record<…>`) over if/ternary chains for value dispatch.
- Boundaries: `src/shared` imports neither client nor server; client code never imports `src/server` (only the dev preview reads the plain-data `prompts/example.ts`). Limits are constants at the top of `pool.ts` and `openrouter.ts`.
- Prompts live in `src/server/prompts/`; tune them there, not in route code. Keep `OUTPUT_SHAPE` (analyze.ts), `response-schema.ts` and `AnalysisSchema` in sync (a test checks it).
- Never expose `OPENROUTER_API_KEY` or raw `/key` data to the browser; only `PoolStatus` fields leave the server.
- Run `bun run test` and `bun run typecheck` before finishing a change.
