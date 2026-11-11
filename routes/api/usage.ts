import { defineHandler } from 'void';
import { getPoolStatus } from '../../src/server/pool';

/** GET /api/usage — sanitized shared-pool status (cached ~45s per instance). */
export const GET = defineHandler(async (c) => {
  const status = await getPoolStatus();
  c.header('Cache-Control', 'no-store');
  return status;
});
