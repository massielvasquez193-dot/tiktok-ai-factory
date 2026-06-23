/**
 * Prisma Client Singleton — unified entry point for the entire project.
 *
 * All routes, services, workers, and providers MUST import prisma from here.
 * Never create `new PrismaClient()` elsewhere in production code.
 *
 *   import { prisma } from '../../lib/prisma';
 *
 * Architecture:
 *  - Production:   module-level singleton (one connection pool)
 *  - Development:  cached on globalThis to survive tsx hot-reload
 *  - Test:         inject mock client via setPrismaClientForTests()
 *
 * The old `import { prisma } from '../index'` still works during
 * migration, but should be replaced to avoid loading the full Express app.
 */

import { PrismaClient } from '@prisma/client';

// ── Global cache (dev hot-reload safety) ──────────────────────────────────

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  __prismaTestOverride?: PrismaClient;
};

// ── Factory ───────────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

// ── Current-client resolver ──────────────────────────────────────────────

/**
 * Return whichever PrismaClient is currently active.
 *
 * Resolution order:
 *   1. Injected test mock   (setPrismaClientForTests)
 *   2. Cached globalThis     (dev hot-reload)
 *   3. New instance          (first import in a cold process)
 */
function resolvePrisma(): PrismaClient {
  if (globalForPrisma.__prismaTestOverride) return globalForPrisma.__prismaTestOverride;
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

// ── Public singleton (Proxy — allows test injection to work for all consumers) ─

/**
 * The shared PrismaClient, exported as a Proxy.
 *
 * Every property access delegates to the *current* underlying client,
 * so setPrismaClientForTests() takes effect immediately — even for
 * code that already destructured `prisma` from this module.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = resolvePrisma();
    const value = (client as any)[prop];
    // Bind methods so `prisma.product.findMany()` works
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, prop: string | symbol, value: any) {
    (resolvePrisma() as any)[prop] = value;
    return true;
  },
  has(_target, prop) {
    return prop in (resolvePrisma() as any);
  },
  ownKeys() {
    return Reflect.ownKeys(resolvePrisma() as any);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(resolvePrisma() as any, prop);
  },
  getPrototypeOf() {
    return Object.getPrototypeOf(resolvePrisma());
  },
});

// ── Test helpers ──────────────────────────────────────────────────────────

/**
 * Inject a mock PrismaClient for tests.
 * Call resetPrismaClientForTests() after the test to restore the default.
 */
export function setPrismaClientForTests(client: PrismaClient): void {
  globalForPrisma.__prismaTestOverride = client;
}

/**
 * Remove the test override.  Subsequent calls to resolvePrisma()
 * fall back to the cached or new production instance.
 */
export function resetPrismaClientForTests(): void {
  delete globalForPrisma.__prismaTestOverride;
}

/**
 * Explicit accessor — resolves and returns the current client.
 * Equivalent to the proxy, but gives you the real instance.
 */
export function getPrismaClient(): PrismaClient {
  return resolvePrisma();
}

/**
 * Gracefully disconnect the singleton.  Safe to call multiple times.
 *
 * Call ONLY during process shutdown (SIGTERM / SIGINT).
 * Never call after every request — that defeats connection pooling.
 */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.__prismaTestOverride) {
    await globalForPrisma.__prismaTestOverride.$disconnect();
    return;
  }
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
}
