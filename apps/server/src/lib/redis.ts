/**
 * Redis Connection — Singleton IORedis client + BullMQ connection config.
 *
 * Reads REDIS_URL from environment (injected via docker-compose or .env).
 * Never hardcodes credentials.
 *
 * Two exports:
 *  - getRedis()           → IORedis instance (for direct use / shutdown)
 *  - getRedisConnection() → plain object that BullMQ Queue/Worker accept
 */

import IORedis from 'ioredis';

let redis: IORedis | null = null;
let parsedUrl: { host: string; port: number; password?: string; db?: number } | null = null;

export function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

/**
 * Parse REDIS_URL into a plain object suitable for BullMQ `connection`.
 * BullMQ v5 ships its own ioredis — passing a raw IORedis instance from
 * our dependency tree causes a type mismatch, so we pass connection opts instead.
 */
export function getRedisConnection(): { host: string; port: number; password?: string; db?: number } {
  if (parsedUrl) return parsedUrl;

  const url = new URL(getRedisUrl());
  parsedUrl = {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    db: url.pathname ? parseInt(url.pathname.replace('/', ''), 10) || 0 : 0,
  };
  return parsedUrl;
}

/**
 * Returns the shared IORedis connection (for direct Redis ops).
 * NOT passed to BullMQ — use getRedisConnection() for that.
 */
export function getRedis(): IORedis {
  if (!redis) {
    const url = getRedisUrl();
    redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (times > 10) {
          console.error('[Redis] Connection failed after 10 retries — giving up');
          return null;
        }
        const delay = Math.min(times * 200, 3000);
        console.warn(`[Redis] Retry #${times} in ${delay}ms`);
        return delay;
      },
    });

    redis.on('connect', () => console.log('[Redis] Connected'));
    redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    redis.on('close', () => console.log('[Redis] Connection closed'));
  }
  return redis;
}

/**
 * Gracefully close the Redis connection.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
