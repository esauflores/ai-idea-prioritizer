import { defineConfig } from 'vitest/config';

// Unit tests cover pure logic only (scoring, schemas, prompts, pool status), so they run
// without the Void/Cloudflare plugins.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
