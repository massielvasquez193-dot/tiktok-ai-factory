/**
 * Provider Webhook Routes — Batch 2: Credits + Video Generation Business Loop
 *
 * Receives asynchronous callbacks from video generation providers
 * (Seedance, Kling, Veo) when a task completes or fails.
 *
 * Security:
 *   - Verifies webhook signature using provider-specific secrets.
 *   - Never trusts provider-supplied taskId alone — cross-checks with DB.
 *   - Idempotent: duplicate callbacks are safe (CAS guards in ProviderManager).
 *
 * Endpoints:
 *   POST /api/webhooks/providers/seedance
 *   POST /api/webhooks/providers/kling
 *   POST /api/webhooks/providers/veo
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { ProviderManager } from '../providers/manager/ProviderManager';
import { refundTask, syncTaskToLibrary } from '../services/videoTask.service';
import crypto from 'crypto';

export const providerWebhookRoutes = Router();

// ── Types ────────────────────────────────────────────────────────────────────

interface WebhookPayload {
  taskId: string;        // Provider's external task ID
  status: 'completed' | 'failed' | 'processing';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  progress?: number;
}

// ── Signature Verification ───────────────────────────────────────────────────

/**
 * Verify webhook signature using HMAC-SHA256.
 *
 * Each provider has its own webhook secret:
 *   - SEEDANCE_WEBHOOK_SECRET
 *   - KLING_WEBHOOK_SECRET
 *   - VEO_WEBHOOK_SECRET
 */
function verifySignature(
  provider: string,
  rawBody: Buffer,
  signature: string,
): boolean {
  const secretKey = `${provider.toUpperCase()}_WEBHOOK_SECRET`;
  const secret = process.env[secretKey];

  // In mock/dev mode, skip signature verification
  if (!secret || process.env.NODE_ENV === 'development') {
    console.log(`[ProviderWebhook] Signature verification skipped for ${provider} (no secret or dev mode)`);
    return true;
  }

  if (!signature) {
    console.warn(`[ProviderWebhook] Missing signature header from ${provider}`);
    return false;
  }

  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    const provided = signature.startsWith('sha256=')
      ? signature.slice(7)
      : signature;
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(provided, 'hex'),
    );
  } catch {
    return false;
  }
}

// ── Core Handler ─────────────────────────────────────────────────────────────

/**
 * Process a provider callback:
 * 1. Verify signature
 * 2. Find the VideoTask by externalTaskId
 * 3. Update status based on callback
 * 4. On success: sync to video library
 * 5. On failure: refund credits (idempotent)
 *
 * Idempotent: duplicate callbacks are safe.
 *   - If task is already completed, success callback is a no-op.
 *   - If task is already refunded, failure callback is a no-op.
 *   - refundTask() internally checks refundedAt.
 */
async function handleProviderCallback(
  provider: string,
  payload: WebhookPayload,
  rawBody: Buffer,
  signature?: string,
): Promise<{ processed: boolean; action: string; taskId?: string }> {
  // ── Step 1: Verify signature ──────────────────────────────────────────
  if (!verifySignature(provider, rawBody, signature || '')) {
    console.error(`[ProviderWebhook] Invalid signature for ${provider}`);
    throw new Error('Invalid webhook signature');
  }

  // ── Step 2: Find the task in our DB ───────────────────────────────────
  const externalTaskId = payload.taskId;
  if (!externalTaskId) {
    throw new Error('Missing taskId in webhook payload');
  }

  const task = await prisma.videoTask.findFirst({
    where: { externalTaskId, provider },
    orderBy: { createdAt: 'desc' },
  });

  if (!task) {
    console.warn(`[ProviderWebhook] No task found for externalTaskId ${externalTaskId} (${provider})`);
    return { processed: false, action: 'unknown_task' };
  }

  console.log(`[ProviderWebhook] Callback from ${provider}: task ${task.id} → ${payload.status}`);

  // ── Step 3: Process by status ─────────────────────────────────────────

  if (payload.status === 'completed') {
    // ── Success — update task and sync to library ──────────────────────
    // Idempotent: if already completed, this is a no-op
    if (task.status === 'completed') {
      console.log(`[ProviderWebhook] Task ${task.id} already completed — ignoring duplicate callback`);
      return { processed: false, action: 'already_completed', taskId: task.id };
    }

    // CAS: only update if still processing (not already failed/refunded)
    const updateResult = await prisma.videoTask.updateMany({
      where: {
        id: task.id,
        status: { in: ['processing', 'submitted', 'pending'] },
      },
      data: {
        status: 'completed',
        progress: 100,
        videoUrl: payload.videoUrl || task.videoUrl,
        thumbnailUrl: payload.thumbnailUrl || task.thumbnailUrl,
        duration: payload.duration || task.duration,
        completedAt: new Date(),
        metadata: {
          ...((task.metadata as any) || {}),
          webhookCompletedAt: new Date().toISOString(),
          webhookCallback: true,
        },
      },
    });

    if (updateResult.count === 0) {
      console.log(`[ProviderWebhook] Task ${task.id} CAS failed — state changed before update`);
      return { processed: false, action: 'cas_failed', taskId: task.id };
    }

    // Sync to video library (idempotent)
    syncTaskToLibrary(task.id).catch(err =>
      console.error(`[ProviderWebhook] Library sync error for ${task.id}:`, err.message),
    );

    // Cancel any existing poller for this task
    ProviderManager.instance.cancel(task.id);

    return { processed: true, action: 'completed', taskId: task.id };
  }

  if (payload.status === 'failed') {
    // ── Failure — mark failed and refund ────────────────────────────────
    // Idempotent: if already failed/refunded, no-op
    if (task.status === 'failed' || task.status === 'completed') {
      console.log(`[ProviderWebhook] Task ${task.id} already in terminal state ${task.status} — ignoring failure callback`);
      return { processed: false, action: 'already_terminal', taskId: task.id };
    }

    await prisma.videoTask.updateMany({
      where: {
        id: task.id,
        status: { in: ['processing', 'submitted', 'pending'] },
      },
      data: {
        status: 'failed',
        error: payload.error || `Provider ${provider} reported failure`,
        progress: payload.progress || 0,
        metadata: {
          ...((task.metadata as any) || {}),
          webhookFailedAt: new Date().toISOString(),
          webhookCallback: true,
        },
      },
    });

    // Refund credits (idempotent — refundTask checks refundedAt)
    refundTask(task.id).catch(err =>
      console.error(`[ProviderWebhook] Refund error for ${task.id}:`, err.message),
    );

    // Cancel any existing poller
    ProviderManager.instance.cancel(task.id);

    return { processed: true, action: 'failed_refunded', taskId: task.id };
  }

  // processing — just update progress, no terminal action
  if (payload.status === 'processing') {
    if (task.status === 'processing') {
      await prisma.videoTask.updateMany({
        where: { id: task.id, status: 'processing' },
        data: {
          progress: Math.max(task.progress, payload.progress || 0),
          metadata: {
            ...((task.metadata as any) || {}),
            webhookProgressAt: new Date().toISOString(),
          },
        },
      });
    }
    return { processed: true, action: 'progress_updated', taskId: task.id };
  }

  return { processed: false, action: 'unknown_status', taskId: task.id };
}

// ── Route Handlers ───────────────────────────────────────────────────────────

function createWebhookHandler(provider: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use raw body for signature verification
      const rawBody = req.body instanceof Buffer
        ? req.body
        : Buffer.from(JSON.stringify(req.body), 'utf-8');

      const signature = req.headers['x-webhook-signature'] as string
        || req.headers['x-signature'] as string;

      const result = await handleProviderCallback(
        provider,
        req.body as WebhookPayload,
        rawBody,
        signature,
      );

      res.json({ success: true, ...result });
    } catch (e: any) {
      if (e.message === 'Invalid webhook signature') {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      console.error(`[ProviderWebhook] Error processing ${provider} callback:`, e.message);
      // Always return 200 to prevent provider retries for unknown tasks
      res.status(200).json({ success: false, error: 'Internal processing error' });
    }
  };
}

// ── Mount Routes ─────────────────────────────────────────────────────────────

providerWebhookRoutes.post('/seedance', createWebhookHandler('seedance'));
providerWebhookRoutes.post('/kling', createWebhookHandler('kling'));
providerWebhookRoutes.post('/veo', createWebhookHandler('veo'));
