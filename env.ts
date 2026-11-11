import { defineEnv, string } from 'void/env';

export default defineEnv({
  /** Shared OpenRouter key owned by the site operator. Server-only; never sent to the browser. */
  OPENROUTER_API_KEY: string(),
  /** OpenRouter model id used for every analysis. */
  OPENROUTER_MODEL: string().default('deepseek/deepseek-v4.1-flash-1017'),
});
