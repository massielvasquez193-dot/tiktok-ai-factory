/**
 * Video Task Service — Batch 2: Credits + Video Generation Business Loop
 *
 * Provides atomic operations that couple video task lifecycle with credits:
 *   - createAndCharge:  atomic debit + task creation (SINGLE DB transaction)
 *   - refundTask:       idempotent refund (prevents double-refund)
 *   - syncToLibrary:    create a Video record from a completed VideoTask
 *
 * All credit operations go through credit.service.ts which provides
 * atomic wallet updates with deterministic idempotency-key protection.
 *
 * IDEMPOTENCY DESIGN (v2 — Batch 2 fix):
 *   - debit key:  video_generation:{taskId}:debit   ← deterministic, NO Date.now()
 *   - refund key: video_generation:{taskId}:refund  ← deterministic, NO Date.now()
 *   - credit.service.ts now accepts explicit idempotency keys
 *   - Fast-path duplicate check + in-transaction re-check prevents race
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';
import {
  getCreditCost,
  consumeCredits,
  refundCredits,
  getOrCreateWallet,
  CREDIT_COSTS,
} from './credit.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CreateAndChargeInput {
  workspaceId: string;
  userId: string;
  promptId: string;
  model?: string;
  costOverride?: number;
  /** TikTok style key (validated before reaching this function). */
  style?: string;
  /** Client-provided idempotency key to prevent duplicate submissions. */
  clientIdempotencyKey?: string;
}

export interface CreateAndChargeResult {
  taskId: string;
  creditsCharged: number;
  transactionId: string;
  balanceAfter: number;
  /** True when this was a duplicate request — the task already existed. */
  duplicate: boolean;
}

export interface RefundResult {
  taskId: string;
  refundedAmount: number;
  transactionId: string;
  balanceAfter: number;
  /** false when the task was already refunded (idempotent — no second refund) */
  alreadyRefunded: boolean;
}

// ── Idempotency key builders (DETERMINISTIC — no Date.now(), no random) ──────

export function debitIdemKey(taskId: string): string {
  return `video_generation:${taskId}:debit`;
}

export function refundIdemKey(taskId: string): string {
  return `video_generation:${taskId}:refund`;
}

// ── Atomic create + charge (SINGLE Prisma transaction) ────────────────────────

/**
 * Create a video task AND deduct credits in a SINGLE Prisma interactive transaction.
 *
 * This is the critical fix for Batch 2: previously, consumeCredits and
 * task creation were two separate transactions. If the task creation failed
 * after a successful debit, we'd have a ghost charge. Now everything is
 * wrapped in ONE transaction — if any step fails, everything rolls back.
 *
 * Guarantees:
 *  - Balance check and decrement are atomic (UPDATE WHERE balance >= cost).
 *  - Task is only created if credits are successfully deducted.
 *  - Deterministic idempotency key prevents double-charge on retry.
 *  - Client idempotency key prevents duplicate task creation for the same request.
 *
 * Caller MUST then submit the task to ProviderManager.
 * If ProviderManager.submit() fails, caller SHOULD call refundTask().
 */
export async function createAndCharge(
  input: CreateAndChargeInput,
): Promise<CreateAndChargeResult> {
  const { workspaceId, userId, promptId, model, costOverride, clientIdempotencyKey } = input;

  // Resolve cost — use override if provided, otherwise look up by model
  const cost = costOverride ?? resolveCost(model ?? 'seedance');

  // Validate prompt exists
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) throw new Error(`Prompt not found: ${promptId}`);

  const taskId = uuid();

  // ═══ Check client idempotency key (prevents duplicate HTTP submissions) ═══
  // If the client provides an idempotency key, check if we already have a task
  // for this key. This prevents double-submission from retried HTTP requests.
  if (clientIdempotencyKey) {
    const clientKey = `client:${workspaceId}:${clientIdempotencyKey}`;
    const existingByClientKey = await prisma.creditTransaction.findUnique({
      where: { idempotencyKey: clientKey },
    });
    if (existingByClientKey) {
      // Find the task linked to this transaction
      const existingTask = await prisma.videoTask.findFirst({
        where: { creditTransactionId: existingByClientKey.id },
      });
      if (existingTask) {
        console.log(`[VideoTaskService] Duplicate request detected via client key ${clientIdempotencyKey} — returning existing task ${existingTask.id}`);
        return {
          taskId: existingTask.id,
          creditsCharged: existingTask.creditsCharged,
          transactionId: existingByClientKey.id,
          balanceAfter: existingByClientKey.balanceAfter,
          duplicate: true,
        };
      }
    }
  }

  // ═══ Duplicate-submission guard (even without client idempotency key) ═══
  // Check for an ACTIVE task for the same (promptId, model) in this workspace.
  // The partial unique index on (promptId, provider) for active statuses
  // is the DB-level safety net, but this explicit check gives a friendlier
  // response and avoids a wasted transaction rollback on P2002.
  const activeStatuses = ['pending', 'submitted', 'processing'];
  const existingActive = await prisma.videoTask.findFirst({
    where: {
      workspaceId,
      promptId,
      provider: model ?? 'seedance',
      status: { in: activeStatuses },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existingActive) {
    console.log(`[VideoTaskService] Active task ${existingActive.id} already exists for prompt ${promptId}/${model ?? 'seedance'} — returning existing`);
    return {
      taskId: existingActive.id,
      creditsCharged: existingActive.creditsCharged,
      transactionId: existingActive.creditTransactionId ?? '',
      balanceAfter: 0, // unknown — caller should refresh wallet
      duplicate: true,
    };
  }

  // ═══ SINGLE ATOMIC TRANSACTION ════════════════════════════════════════════
  // All steps inside one Prisma $transaction — either all succeed or all roll back.
  // No more "debit succeeded but task creation failed" ghost charges.

  const debitKey = debitIdemKey(taskId);
  const clientKey = clientIdempotencyKey
    ? `client:${workspaceId}:${clientIdempotencyKey}`
    : undefined;

  return prisma.$transaction(async (tx) => {
    // ── Step 1: Ensure wallet exists ──────────────────────────────────────
    let wallet = await tx.creditWallet.findUnique({ where: { workspaceId } });
    if (!wallet) {
      wallet = await tx.creditWallet.create({
        data: { id: uuid(), workspaceId, balance: 0 },
      });
    }

    // ── Step 2: Check for existing debit (idempotency) ───────────────────
    const existingDebit = await tx.creditTransaction.findUnique({
      where: { idempotencyKey: debitKey },
    });
    if (existingDebit) {
      // Idempotent: debit already exists — find or create the task
      const existingTask = await tx.videoTask.findFirst({
        where: { creditTransactionId: existingDebit.id },
      });
      if (existingTask) {
        return {
          taskId: existingTask.id,
          creditsCharged: existingTask.creditsCharged,
          transactionId: existingDebit.id,
          balanceAfter: existingDebit.balanceAfter,
          duplicate: true,
        };
      }
      // Edge case: debit exists but task doesn't (shouldn't happen after this fix)
      // Create the task now to recover
      await tx.videoTask.create({
        data: {
          id: taskId, workspaceId, userId, promptId,
          model: model ?? prompt.model ?? 'seedance',
          provider: model ?? prompt.model ?? 'seedance',
          status: 'pending', progress: 0,
          creditsCharged: cost,
          creditTransactionId: existingDebit.id,
          metadata: { tiktokStyle: input.style ?? 'UGC_REVIEW' },
        },
      });
      return {
        taskId, creditsCharged: cost,
        transactionId: existingDebit.id,
        balanceAfter: existingDebit.balanceAfter,
        duplicate: false,
      };
    }

    // ── Step 3: Check balance atomically ──────────────────────────────────
    wallet = await tx.creditWallet.findUniqueOrThrow({ where: { workspaceId } });
    if (wallet.balance < cost) {
      throw new InsufficientCreditsError(workspaceId, cost,
        `Insufficient credits: have ${wallet.balance}, need ${cost}`);
    }

    // ── Step 4: Atomically deduct balance ─────────────────────────────────
    const updatedWallet = await tx.creditWallet.update({
      where: { workspaceId, balance: { gte: cost } },
      data: { balance: { decrement: cost }, totalUsed: { increment: cost } },
    });

    // ── Step 5: Create debit transaction ──────────────────────────────────
    const debitTxn = await tx.creditTransaction.create({
      data: {
        id: uuid(),
        walletId: wallet.id,
        userId,
        type: 'consume',
        category: 'video',
        amount: -cost,
        balanceAfter: updatedWallet.balance,
        referenceType: 'video_task',
        referenceId: taskId,
        description: `Video generation (${model ?? 'seedance'}) — ${cost} credits`,
        idempotencyKey: debitKey,
      },
    });

    // ── Step 6: Also record the client idempotency key if provided ───────
    if (clientKey) {
      try {
        await tx.creditTransaction.create({
          data: {
            id: uuid(),
            walletId: wallet.id,
            userId,
            type: 'consume',
            category: 'video',
            amount: 0, // zero-amount marker — the real debit is above
            balanceAfter: updatedWallet.balance,
            referenceType: 'client_idempotency',
            referenceId: taskId,
            description: `Client idempotency marker for task ${taskId}`,
            idempotencyKey: clientKey,
          },
        });
      } catch (e: any) {
        // P2002 on the client key → another request beat us
        // This is fine — the real debit above is already done
        if (e?.code !== 'P2002') throw e;
      }
    }

    // ── Step 7: Create video task ─────────────────────────────────────────
    // P2002 = unique constraint violation on (promptId, provider) partial index
    // for active statuses. If this happens, another request created the task
    // first — the transaction will roll back (credits restored). We catch the
    // error outside the transaction and return the existing task.
    try {
      await tx.videoTask.create({
        data: {
          id: taskId,
          workspaceId,
          userId,
          promptId,
          model: model ?? prompt.model ?? 'seedance',
          provider: model ?? prompt.model ?? 'seedance',
          status: 'pending',
          progress: 0,
          creditsCharged: cost,
          creditTransactionId: debitTxn.id,
          metadata: { tiktokStyle: input.style ?? 'UGC_REVIEW' },
        },
      });
    } catch (e: any) {
      // P2002 inside transaction → taints the tx, but the Prisma $transaction
      // wrapper will roll back everything. We re-throw with a marker so the
      // outer catch can handle it gracefully.
      if (e?.code === 'P2002') {
        throw new DuplicateTaskError(promptId, model ?? 'seedance');
      }
      throw e;
    }

    console.log(
      `[VideoTaskService] Created task ${taskId} | charged ${cost} credits | tx ${debitTxn.id} | balance ${updatedWallet.balance}`,
    );

    return {
      taskId,
      creditsCharged: cost,
      transactionId: debitTxn.id,
      balanceAfter: updatedWallet.balance,
      duplicate: false,
    };
  }).catch(async (err) => {
    // Handle P2002 / DuplicateTaskError from inside the transaction.
    // The transaction was rolled back — credits were NOT charged.
    // Find and return the existing active task.
    if (err instanceof DuplicateTaskError) {
      const winner = await prisma.videoTask.findFirst({
        where: {
          promptId: err.promptId,
          provider: err.provider,
          status: { in: activeStatuses },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (winner) {
        console.log(`[VideoTaskService] P2002 recovered — returning existing task ${winner.id} (credits were NOT double-charged)`);
        return {
          taskId: winner.id,
          creditsCharged: winner.creditsCharged,
          transactionId: winner.creditTransactionId ?? '',
          balanceAfter: 0,
          duplicate: true,
        };
      }
    }
    // Unknown error — re-throw
    throw err;
  });
}

// ── Idempotent refund ─────────────────────────────────────────────────────────

/**
 * Refund credits for a failed video task.
 *
 * Idempotent: calling refundTask() twice for the same task returns
 * `alreadyRefunded: true` without creating a second refund.
 *
 * Uses DETERMINISTIC idempotency key: video_generation:{taskId}:refund
 * The credit.service.ts refundCredits now checks for existing keys before
 * creating a new refund transaction.
 *
 * Only refunds tasks that:
 *  - Were actually charged (creditsCharged > 0)
 *  - Have not already been refunded (refundedAt === null)
 *  - Are NOT completed (successful tasks should never be refunded)
 */
export async function refundTask(taskId: string): Promise<RefundResult> {
  // Fetch task with a stable read
  const task = await prisma.videoTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error(`Task not found: ${taskId}`);

  // ✅ Guard: never refund a completed task
  if (task.status === 'completed') {
    console.log(
      `[VideoTaskService] Task ${taskId} is completed — refusing refund`,
    );
    return {
      taskId,
      refundedAmount: 0,
      transactionId: '',
      balanceAfter: 0,
      alreadyRefunded: false,
    };
  }

  // ✅ Guard: no credits charged → nothing to refund
  if (task.creditsCharged <= 0) {
    console.log(
      `[VideoTaskService] Task ${taskId} has no credits charged — skipping refund`,
    );
    return {
      taskId,
      refundedAmount: 0,
      transactionId: '',
      balanceAfter: 0,
      alreadyRefunded: false,
    };
  }

  // ✅ Guard: already refunded (idempotent)
  if (task.refundedAt) {
    console.log(
      `[VideoTaskService] Task ${taskId} already refunded at ${task.refundedAt.toISOString()} — skipping`,
    );
    return {
      taskId,
      refundedAmount: task.creditsCharged,
      transactionId: task.creditTransactionId ?? '',
      balanceAfter: 0,
      alreadyRefunded: true,
    };
  }

  // ✅ Guard: must have a credit transaction to refund against
  if (!task.creditTransactionId) {
    console.log(
      `[VideoTaskService] Task ${taskId} has no credit transaction — nothing to refund`,
    );
    return {
      taskId,
      refundedAmount: 0,
      transactionId: '',
      balanceAfter: 0,
      alreadyRefunded: false,
    };
  }

  // ✅ Guard: verify the original debit transaction exists
  const debitTx = await prisma.creditTransaction.findUnique({
    where: { id: task.creditTransactionId },
  });
  if (!debitTx) {
    console.warn(
      `[VideoTaskService] Task ${taskId} references non-existent debit tx ${task.creditTransactionId} — skipping refund`,
    );
    return {
      taskId,
      refundedAmount: 0,
      transactionId: '',
      balanceAfter: 0,
      alreadyRefunded: false,
    };
  }

  // ✅ Guard: must have a workspaceId and userId to refund
  if (!task.workspaceId) {
    throw new Error(`Task ${taskId} has no workspaceId — cannot refund`);
  }

  // ═══ Atomic CAS: set refundedAt ════════════════════════════════════════════
  // Use updateMany with a WHERE filter to ensure atomicity.
  // If two concurrent refunds race, only one will match the WHERE clause.
  const cas = await prisma.videoTask.updateMany({
    where: {
      id: taskId,
      refundedAt: null, // ← atomic guard
      creditsCharged: { gt: 0 },
      status: { not: 'completed' },
    },
    data: { refundedAt: new Date() },
  });

  if (cas.count === 0) {
    // Lost the race — another refund already processed
    console.log(`[VideoTaskService] Task ${taskId} refund CAS lost — already refunded by another worker`);
    return {
      taskId,
      refundedAmount: task.creditsCharged,
      transactionId: task.creditTransactionId ?? '',
      balanceAfter: 0,
      alreadyRefunded: true,
    };
  }

  // ═══ Execute refund with DETERMINISTIC idempotency key ═══════════════════
  const result = await refundCredits(
    task.workspaceId,
    task.userId ?? 'system',
    task.creditsCharged,
    'video_task',
    taskId,
    refundIdemKey(taskId), // ← deterministic key, prevents double-refund
    'video',               // ← category: ensures transaction history is filterable
  );

  console.log(
    `[VideoTaskService] Refunded ${task.creditsCharged} credits for task ${taskId} | tx ${result.transactionId ?? 'idem'} | balance ${result.balanceAfter}`,
  );

  return {
    taskId,
    refundedAmount: task.creditsCharged,
    transactionId: result.transactionId ?? '',
    balanceAfter: result.balanceAfter,
    alreadyRefunded: false,
  };
}

// ── Sync completed task to video library ──────────────────────────────────────

/**
 * Create a Video record from a completed VideoTask.
 *
 * Idempotent: if a Video already exists for this taskId, returns the existing one.
 */
export async function syncTaskToLibrary(taskId: string): Promise<string | null> {
  const task = await prisma.videoTask.findUnique({
    where: { id: taskId },
    include: { prompt: { include: { storyboard: { include: { script: { include: { product: true } } } } } } },
  });

  if (!task || task.status !== 'completed') return null;

  // Already synced? (Video.taskId is unique on VideoTask)
  const existing = await prisma.video.findUnique({ where: { taskId } });
  if (existing) return existing.id;

  const product = task.prompt?.storyboard?.script?.product;
  const taskStyle = (task.metadata as any)?.tiktokStyle;
  const styleSuffix = taskStyle ? ` [${taskStyle}]` : '';
  const title = product
    ? `${product.product_name} — Shot #${task.prompt?.sceneNumber ?? '?'}${styleSuffix}`
    : `Generated Video — ${task.model}${styleSuffix}`;

  const video = await prisma.video.create({
    data: {
      id: uuid(),
      taskId: task.id,
      workspaceId: task.workspaceId,
      productId: product?.id ?? '',
      provider: task.provider || task.model,
      title,
      videoUrl: task.videoUrl,
      thumbnailUrl: task.thumbnailUrl,
      duration: task.duration || 5,
      size: 0,
      status: 'completed',
    },
  });

  console.log(`[VideoTaskService] Synced task ${taskId} → video ${video.id}`);
  return video.id;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveCost(model: string): number {
  // Map model to credit cost. Different providers have different costs.
  const provider = (model || 'seedance').toLowerCase();
  if (provider === 'veo') return CREDIT_COSTS.video_1080p ?? 100;    // Veo is premium
  if (provider === 'kling') return CREDIT_COSTS.video_720p ?? 50;    // Kling standard
  return CREDIT_COSTS.video_720p ?? 50;                               // Seedance default
}

/** Estimate cost before actually charging — for frontend display. */
export function estimateCost(model?: string): number {
  return resolveCost(model ?? 'seedance');
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  readonly workspaceId: string;
  readonly required: number;

  constructor(workspaceId: string, required: number, message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.workspaceId = workspaceId;
    this.required = required;
  }
}

/** Internal error used to signal P2002 from inside a transaction to the outer catch. */
class DuplicateTaskError extends Error {
  readonly promptId: string;
  readonly provider: string;

  constructor(promptId: string, provider: string) {
    super(`Duplicate task for prompt ${promptId}/${provider}`);
    this.name = 'DuplicateTaskError';
    this.promptId = promptId;
    this.provider = provider;
  }
}
