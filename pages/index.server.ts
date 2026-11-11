import { defineHandler, type InferProps } from 'void';
import { getPoolStatus } from '../src/server/pool';

export type Props = InferProps<typeof loader>;

/** Page data: the shared-pool status (cached ~45 s per instance), so it shows on first paint. */
export const loader = defineHandler(async (c) => {
  c.header('Cache-Control', 'no-store');
  return { pool: await getPoolStatus() };
});
