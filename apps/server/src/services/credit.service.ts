/**
 * Credit Service — Sprint 3 Phase 2
 *
 * Credit Wallet + Transaction Ledger with atomic balance operations.
 * Supports: consume, grant, purchase, refund, monthly reset.
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CreditWalletInfo {
  id: string;
  workspaceId: string;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  totalRefunded: number;
  totalGranted: number;
  monthlyResetAt: string | null;
}

export interface TransactionInfo {
  id: string;
  type: string;
  category: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

// ── Credit Cost Table ───────────────────────────────────────────────────────

export const CREDIT_COSTS: Record<string, number> = {
  research: 10,
  knowledge: 2,
  script: 5,
  script_translate: 3,
  storyboard: 8,
  prompt: 5,
  video_720p: 50,
  video_1080p: 100,
  tts: 10,
  compose: 15,
  publishing: 20,
  export: 5,
};

export function getCreditCost(operation: string): number {
  return CREDIT_COSTS[operation] || 10;
}

// ── Wallet Management ───────────────────────────────────────────────────────

export async function getOrCreateWallet(workspaceId: string): Promise<CreditWalletInfo> {
  let wallet = await prisma.creditWallet.findUnique({ where: { workspaceId } });
  if (!wallet) {
    wallet = await prisma.creditWallet.create({
      data: { id: uuid(), workspaceId, balance: 0 },
    });
  }
  return walletToInfo(wallet);
}

export async function getWallet(workspaceId: string): Promise<CreditWalletInfo | null> {
  const wallet = await prisma.creditWallet.findUnique({ where: { workspaceId } });
  return wallet ? walletToInfo(wallet) : null;
}

function walletToInfo(w: any): CreditWalletInfo {
  return {
    id: w.id, workspaceId: w.workspaceId, balance: w.balance,
    totalPurchased: w.totalPurchased, totalUsed: w.totalUsed,
    totalRefunded: w.totalRefunded, totalGranted: w.totalGranted,
    monthlyResetAt: w.monthlyResetAt?.toISOString() || null,
  };
}

// ── Atomic Credit Operations ────────────────────────────────────────────────

async function ensureWallet(workspaceId: string): Promise<string> {
  const wallet = await prisma.creditWallet.findUnique({ where: { workspaceId } });
  if (wallet) return wallet.id;
  const created = await prisma.creditWallet.create({
    data: { id: uuid(), workspaceId, balance: 0 },
  });
  return created.id;
}

/**
 * Consume credits atomically. Deducts `amount` from wallet balance.
 * Returns updated balance. Throws if insufficient credits.
 */
export async function consumeCredits(
  workspaceId: string,
  userId: string | null,
  amount: number,
  category: string,
  referenceType: string = '',
  referenceId: string = '',
  description: string = '',
): Promise<{ balanceAfter: number; transactionId: string }> {
  if (amount <= 0) throw new Error('Amount must be positive');

  const walletId = await ensureWallet(workspaceId);
  const idemKey = `consume:${workspaceId}:${category}:${referenceId || uuid()}:${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUniqueOrThrow({ where: { workspaceId } });
    if (wallet.balance < amount) {
      throw new Error(`Insufficient credits: have ${wallet.balance}, need ${amount}`);
    }

    const updated = await tx.creditWallet.update({
      where: { workspaceId, balance: { gte: amount } },
      data: { balance: { decrement: amount }, totalUsed: { increment: amount } },
    });

    const txn = await tx.creditTransaction.create({
      data: {
        id: uuid(), walletId, userId, type: 'consume', category,
        amount: -amount, balanceAfter: updated.balance,
        referenceType: referenceType || category, referenceId: referenceId || '',
        description: description || `Consumed ${amount} credits for ${category}`,
        idempotencyKey: idemKey,
      },
    });

    return { balanceAfter: updated.balance, transactionId: txn.id };
  });
}

/**
 * Grant credits (admin action, monthly reset, promo, etc.).
 */
export async function grantCredits(
  workspaceId: string,
  userId: string | null,
  amount: number,
  type: string,
  category: string,
  description: string = '',
): Promise<{ balanceAfter: number; transactionId: string }> {
  if (amount <= 0) throw new Error('Amount must be positive');

  const walletId = await ensureWallet(workspaceId);
  const idemKey = `grant:${workspaceId}:${type}:${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.creditWallet.update({
      where: { workspaceId },
      data: { balance: { increment: amount }, totalGranted: { increment: amount } },
    });

    const txn = await tx.creditTransaction.create({
      data: {
        id: uuid(), walletId, userId, type, category,
        amount: amount, balanceAfter: updated.balance,
        description: description || `Granted ${amount} credits (${type})`,
        idempotencyKey: idemKey,
      },
    });

    return { balanceAfter: updated.balance, transactionId: txn.id };
  });
}

/**
 * Refund credits for failed operations.
 */
export async function refundCredits(
  workspaceId: string,
  userId: string,
  amount: number,
  referenceType: string,
  referenceId: string,
): Promise<{ balanceAfter: number }> {
  const walletId = await ensureWallet(workspaceId);
  const idemKey = `refund:${workspaceId}:${referenceId}:${Date.now()}`;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.creditWallet.update({
      where: { workspaceId },
      data: { balance: { increment: amount }, totalRefunded: { increment: amount } },
    });

    await tx.creditTransaction.create({
      data: {
        id: uuid(), walletId, userId, type: 'refund', category: 'admin',
        amount, balanceAfter: updated.balance,
        referenceType, referenceId,
        description: `Refunded ${amount} credits for ${referenceType}`,
        idempotencyKey: idemKey,
      },
    });

    return { balanceAfter: updated.balance };
  });
}

// ── Monthly Reset ───────────────────────────────────────────────────────────

export async function processMonthlyReset(workspaceId: string, planCredits: number): Promise<CreditWalletInfo> {
  await ensureWallet(workspaceId);

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.creditWallet.findUniqueOrThrow({ where: { workspaceId } });

    // Reset: set balance to planCredits (replace, don't add)
    const updated = await tx.creditWallet.update({
      where: { workspaceId },
      data: {
        balance: planCredits,
        monthlyResetAt: new Date(),
      },
    });

    // Log reset
    const idemKey = `reset:${workspaceId}:${new Date().toISOString().slice(0, 7)}`;
    await tx.creditTransaction.create({
      data: {
        id: uuid(), walletId: wallet.id, userId: null, type: 'reset',
        category: 'admin', amount: planCredits,
        balanceAfter: planCredits,
        description: `Monthly credit reset: ${planCredits} credits from plan`,
        idempotencyKey: idemKey,
      },
    });

    return walletToInfo(updated);
  });
}

// ── Transaction History ─────────────────────────────────────────────────────

export async function getTransactionHistory(
  workspaceId: string,
  options: { limit?: number; category?: string; type?: string } = {},
): Promise<TransactionInfo[]> {
  const wallet = await prisma.creditWallet.findUnique({ where: { workspaceId } });
  if (!wallet) return [];

  const where: any = { walletId: wallet.id };
  if (options.category) where.category = options.category;
  if (options.type) where.type = options.type;

  const txns = await prisma.creditTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
  });

  return txns.map((t: any) => ({
    id: t.id, type: t.type, category: t.category,
    amount: t.amount, balanceAfter: t.balanceAfter,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  }));
}

// ── Initialize wallet with plan credits on subscription assignment ──────────

export async function initializeWalletWithPlanCredits(
  workspaceId: string,
  planName: string,
): Promise<CreditWalletInfo> {
  const { prisma: p } = await import('../lib/prisma');
  const plan = await p.plan.findUnique({ where: { name: planName } });
  if (!plan) throw new Error(`Plan ${planName} not found`);

  await getOrCreateWallet(workspaceId);
  // Stable idempotency key prevents double-grant on repeated calls
  const walletId = (await getOrCreateWallet(workspaceId)).id;
  const idemKey = `init:${planName}:${workspaceId}`;

  const { prisma: p } = await import('../lib/prisma');
  const existing = await p.creditTransaction.findUnique({ where: { idempotencyKey: idemKey } });
  if (!existing) {
    await grantCredits(
      workspaceId, null, plan.creditMonthly, 'grant',
      'admin', `Initial ${plan.creditMonthly} credits from ${planName} plan`,
    );
  }
  return getOrCreateWallet(workspaceId);
}
