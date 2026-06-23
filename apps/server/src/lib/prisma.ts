/**
 * Prisma Client Singleton — decoupled from Express app.
 *
 * This module exports the PrismaClient as a shared singleton
 * WITHOUT importing the Express app, routes, or workers.
 *
 * Use this import from workers, services, and providers:
 *   import { prisma } from '../lib/prisma';
 *
 * The old import from '..' / '../../index' still works but
 * triggers loading the full Express app, which is undesirable
 * in tests and worker-only processes.
 */

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
