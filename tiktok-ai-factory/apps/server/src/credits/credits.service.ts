import { prisma } from '../index';
import { AppError } from '../auth/auth.service';

export class CreditsService {
  /** Get current balance for a user */
  static async getBalance(userId: string) {
    const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    return wallet || { balance: 0, lifetime: 0, frozen: 0 };
  }

  /** Check if user has enough credits */
  static async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    if (!wallet) return false;
    return (wallet.balance - wallet.frozen) >= amount;
  }

  /** Deduct credits (returns new balance) */
  static async deduct(userId: string, amount: number, source: string, description?: string) {
    const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('NO_WALLET', 'No credit wallet found', 400);

    const available = wallet.balance - wallet.frozen;
    if (available < amount) {
      throw new AppError('INSUFFICIENT_CREDITS',
        `Insufficient credits: need ${amount}, have ${available}`, 402);
    }

    const newBalance = wallet.balance - amount;
    await prisma.$transaction([
      prisma.creditWallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      }),
      prisma.creditLedger.create({
        data: {
          userId,
          amount: -amount,
          balanceAfter: newBalance,
          type: 'usage',
          source,
          description: description || `Credit usage for ${source}`,
        },
      }),
    ]);
    return newBalance;
  }

  /** Add credits */
  static async add(userId: string, amount: number, type: string, source: string, description?: string) {
    const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    const newBalance = (wallet?.balance || 0) + amount;

    await prisma.$transaction([
      prisma.creditWallet.upsert({
        where: { userId },
        update: { balance: { increment: amount }, lifetime: { increment: amount } },
        create: { userId, balance: amount, lifetime: amount },
      }),
      prisma.creditLedger.create({
        data: {
          userId,
          amount,
          balanceAfter: newBalance,
          type,
          source,
          description: description || `Credit ${type} from ${source}`,
        },
      }),
    ]);
    return newBalance;
  }

  /** Freeze credits for an in-flight task */
  static async freeze(userId: string, amount: number) {
    const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw new AppError('NO_WALLET', 'No credit wallet found', 400);
    if (wallet.balance - wallet.frozen < amount) {
      throw new AppError('INSUFFICIENT_CREDITS', 'Not enough available credits to freeze', 402);
    }
    await prisma.creditWallet.update({
      where: { userId },
      data: { frozen: { increment: amount } },
    });
  }

  /** Unfreeze credits after task completes/fails */
  static async unfreeze(userId: string, amount: number) {
    await prisma.creditWallet.update({
      where: { userId },
      data: { frozen: { decrement: amount } },
    });
  }

  /** Get ledger history */
  static async getLedger(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      prisma.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.creditLedger.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Admin: manually adjust credits */
  static async adminAdjust(adminUserId: string, targetUserId: string, amount: number, reason: string) {
    // Verify admin
    const admin = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      throw new AppError('FORBIDDEN', 'Admin access required', 403);
    }

    return amount > 0
      ? this.add(targetUserId, amount, 'manual', adminUserId, reason)
      : this.deduct(targetUserId, Math.abs(amount), adminUserId, reason);
  }
}

/**
 * Cancel pending video tasks and refund credits.
 * Called when a tenant is suspended / cancelled.
 */
export async function cancelPendingVideoTasks(userId: string) {
  // In production: find pending VideoTask records, cancel them via provider API, unfreeze credits
  const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
  if (wallet && wallet.frozen > 0) {
    await prisma.creditWallet.update({
      where: { userId },
      data: { frozen: 0, balance: { increment: wallet.frozen } },
    });
  }
}
