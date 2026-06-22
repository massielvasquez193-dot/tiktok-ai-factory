/**
 * Standalone BullMQ Worker process entry point.
 *
 * Run via:  npm run worker   (or:  tsx src/services/worker.ts)
 *
 * This starts all registered workers as a long-running process,
 * independent of the Express API server. Useful for scaling
 * worker capacity separately from HTTP request handling.
 *
 * Gracefully shuts down on SIGTERM / SIGINT.
 */

import { getVideoGenerationWorker, closeVideoGenerationWorker } from '../workers/video-generation.worker';
import { closeQueues } from '../lib/queue-registry';
import { closeRedis } from '../lib/redis';

console.log('[Worker] Starting BullMQ workers...');

// Start all workers
const vgWorker = getVideoGenerationWorker();

console.log('[Worker] All workers started — waiting for jobs');

// ── Graceful Shutdown ──────────────────────────────────────────────────

const shutdown = async (signal: string) => {
  console.log(`[Worker] Received ${signal} — shutting down...`);

  try { await closeVideoGenerationWorker(); } catch (e: any) { console.error('[Worker] vg-worker close error:', e.message); }
  try { await closeQueues(); } catch (e: any) { console.error('[Worker] queue close error:', e.message); }
  try { await closeRedis(); } catch (e: any) { console.error('[Worker] redis close error:', e.message); }

  console.log('[Worker] Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
