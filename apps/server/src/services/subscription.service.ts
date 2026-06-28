/**
 * Subscription Service — Sprint 3 Phase 1
 *
 * Plan management, subscription lifecycle, feature gating.
 * Seeds 5 default plans: Free, Starter, Pro, Business, Enterprise.
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PlanInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  creditMonthly: number;
  maxMembers: number;
  maxVideoGenerations: number;
  maxStorageMb: number;
  hasApiAccess: boolean;
  hasTeamFeature: boolean;
  hasPriorityQueue: boolean;
  hasCustomBranding: boolean;
  hasAdvancedAnalytics: boolean;
  hasWhiteLabel: boolean;
  features: Record<string, unknown>;
}

export interface SubscriptionInfo {
  id: string;
  workspaceId: string;
  planId: string;
  planName: string;
  status: string;
  billingPeriod: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
}

// ── Plan Definitions ────────────────────────────────────────────────────────

const DEFAULT_PLANS = [
  {
    name: 'free', displayName: 'Free', description: 'For trying out the platform',
    priceMonthly: 0, priceYearly: 0, creditMonthly: 50,
    maxMembers: 1, maxVideoGenerations: 5, maxStorageMb: 100, maxResearchAnalyses: 2,
    hasApiAccess: false, hasTeamFeature: false, hasPriorityQueue: false,
    hasCustomBranding: false, hasAdvancedAnalytics: false, hasWhiteLabel: false,
    sortOrder: 1, features: JSON.stringify({ support: 'Community', overage: 'blocked' }),
  },
  {
    name: 'starter', displayName: 'Starter', description: 'For solo creators',
    priceMonthly: 2900, priceYearly: 28800, creditMonthly: 500,
    maxMembers: 3, maxVideoGenerations: 50, maxStorageMb: 1024, maxResearchAnalyses: 20,
    hasApiAccess: false, hasTeamFeature: false, hasPriorityQueue: false,
    hasCustomBranding: false, hasAdvancedAnalytics: false, hasWhiteLabel: false,
    sortOrder: 2, features: JSON.stringify({ support: 'Email', overage: 'blocked' }),
  },
  {
    name: 'pro', displayName: 'Pro', description: 'For growing teams',
    priceMonthly: 9900, priceYearly: 94800, creditMonthly: 2500,
    maxMembers: 10, maxVideoGenerations: 250, maxStorageMb: 10240, maxResearchAnalyses: 100,
    hasApiAccess: true, hasTeamFeature: true, hasPriorityQueue: true,
    hasCustomBranding: false, hasAdvancedAnalytics: true, hasWhiteLabel: false,
    sortOrder: 3, features: JSON.stringify({ support: 'Priority', overage: 'auto_purchase' }),
  },
  {
    name: 'business', displayName: 'Business', description: 'For agencies & brands',
    priceMonthly: 29900, priceYearly: 298800, creditMonthly: 10000,
    maxMembers: 30, maxVideoGenerations: 1000, maxStorageMb: 51200, maxResearchAnalyses: 999999,
    hasApiAccess: true, hasTeamFeature: true, hasPriorityQueue: true,
    hasCustomBranding: true, hasAdvancedAnalytics: true, hasWhiteLabel: false,
    sortOrder: 4, features: JSON.stringify({ support: 'Dedicated', overage: 'auto_purchase' }),
  },
  {
    name: 'enterprise', displayName: 'Enterprise', description: 'For large organizations',
    priceMonthly: 0, priceYearly: 0, creditMonthly: 999999,
    maxMembers: 999, maxVideoGenerations: 999999, maxStorageMb: 512000, maxResearchAnalyses: 999999,
    hasApiAccess: true, hasTeamFeature: true, hasPriorityQueue: true,
    hasCustomBranding: true, hasAdvancedAnalytics: true, hasWhiteLabel: true,
    sortOrder: 5, features: JSON.stringify({ support: 'SLA', overage: 'none', sso: true, custom_integration: true }),
  },
];

// ── Seed ─────────────────────────────────────────────────────────────────────

export async function seedDefaultPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      create: { id: uuid(), ...plan },
      update: {
        displayName: plan.displayName,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        creditMonthly: plan.creditMonthly,
        maxMembers: plan.maxMembers,
        maxVideoGenerations: plan.maxVideoGenerations,
        maxStorageMb: plan.maxStorageMb,
      },
    });
  }
}

// ── Plan Queries ────────────────────────────────────────────────────────────

export async function listPlans(): Promise<PlanInfo[]> {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  return plans.map(p => ({
    id: p.id, name: p.name, displayName: p.displayName, description: p.description,
    priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, creditMonthly: p.creditMonthly,
    maxMembers: p.maxMembers, maxVideoGenerations: p.maxVideoGenerations,
    maxStorageMb: p.maxStorageMb,
    hasApiAccess: p.hasApiAccess, hasTeamFeature: p.hasTeamFeature,
    hasPriorityQueue: p.hasPriorityQueue, hasCustomBranding: p.hasCustomBranding,
    hasAdvancedAnalytics: p.hasAdvancedAnalytics, hasWhiteLabel: p.hasWhiteLabel,
    features: p.features as Record<string, unknown>,
  }));
}

export async function getPlan(planId: string): Promise<PlanInfo | null> {
  const p = await prisma.plan.findUnique({ where: { id: planId } });
  if (!p) return null;
  return {
    id: p.id, name: p.name, displayName: p.displayName, description: p.description,
    priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, creditMonthly: p.creditMonthly,
    maxMembers: p.maxMembers, maxVideoGenerations: p.maxVideoGenerations,
    maxStorageMb: p.maxStorageMb,
    hasApiAccess: p.hasApiAccess, hasTeamFeature: p.hasTeamFeature,
    hasPriorityQueue: p.hasPriorityQueue, hasCustomBranding: p.hasCustomBranding,
    hasAdvancedAnalytics: p.hasAdvancedAnalytics, hasWhiteLabel: p.hasWhiteLabel,
    features: p.features as Record<string, unknown>,
  };
}

// ── Subscription ────────────────────────────────────────────────────────────

export async function getSubscription(workspaceId: string): Promise<SubscriptionInfo | null> {
  const sub = await prisma.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (!sub) return null;
  return {
    id: sub.id, workspaceId: sub.workspaceId, planId: sub.planId,
    planName: sub.plan.name, status: sub.status, billingPeriod: sub.billingPeriod,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    canceledAt: sub.canceledAt?.toISOString() || null,
  };
}

export async function assignPlan(workspaceId: string, planName: string, billingPeriod: string = 'monthly'): Promise<SubscriptionInfo> {
  const plan = await prisma.plan.findUnique({ where: { name: planName } });
  if (!plan) throw new Error(`Plan "${planName}" not found`);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + (billingPeriod === 'yearly' ? 12 : 1));

  const existing = await prisma.subscription.findUnique({ where: { workspaceId } });
  if (existing) {
    const sub = await prisma.subscription.update({
      where: { workspaceId },
      data: {
        planId: plan.id, billingPeriod,
        currentPeriodStart: now, currentPeriodEnd: periodEnd,
        status: 'active', canceledAt: null,
      },
      include: { plan: true },
    });
    return {
      id: sub.id, workspaceId: sub.workspaceId, planId: sub.planId,
      planName: sub.plan.name, status: sub.status, billingPeriod: sub.billingPeriod,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      canceledAt: null,
    };
  }

  // Initialize credit wallet with plan credits
  const { initializeWalletWithPlanCredits } = await import('./credit.service');
  await initializeWalletWithPlanCredits(workspaceId, planName);

  const sub = await prisma.subscription.create({
    data: {
      id: uuid(), workspaceId, planId: plan.id,
      status: 'active', billingPeriod,
      currentPeriodStart: now, currentPeriodEnd: periodEnd,
    },
    include: { plan: true },
  });
  return {
    id: sub.id, workspaceId: sub.workspaceId, planId: sub.planId,
    planName: sub.plan.name, status: sub.status, billingPeriod: sub.billingPeriod,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    canceledAt: null,
  };
}

export async function cancelSubscription(workspaceId: string): Promise<SubscriptionInfo> {
  const sub = await prisma.subscription.update({
    where: { workspaceId },
    data: { status: 'canceled', canceledAt: new Date() },
    include: { plan: true },
  });
  return {
    id: sub.id, workspaceId: sub.workspaceId, planId: sub.planId,
    planName: sub.plan.name, status: sub.status, billingPeriod: sub.billingPeriod,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    canceledAt: sub.canceledAt?.toISOString() || null,
  };
}

// ── Feature Gating ──────────────────────────────────────────────────────────

export async function getWorkspacePlan(workspaceId: string): Promise<PlanInfo | null> {
  const sub = await prisma.subscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (!sub) return null;
  const p = sub.plan;
  return {
    id: p.id, name: p.name, displayName: p.displayName, description: p.description,
    priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, creditMonthly: p.creditMonthly,
    maxMembers: p.maxMembers, maxVideoGenerations: p.maxVideoGenerations,
    maxStorageMb: p.maxStorageMb,
    hasApiAccess: p.hasApiAccess, hasTeamFeature: p.hasTeamFeature,
    hasPriorityQueue: p.hasPriorityQueue, hasCustomBranding: p.hasCustomBranding,
    hasAdvancedAnalytics: p.hasAdvancedAnalytics, hasWhiteLabel: p.hasWhiteLabel,
    features: p.features as Record<string, unknown>,
  };
}

export async function checkFeature(workspaceId: string, feature: string): Promise<boolean> {
  const plan = await getWorkspacePlan(workspaceId);
  if (!plan) return false;
  return !!(plan as any)[feature] === true;
}

export async function checkLimit(workspaceId: string, limit: string): Promise<number> {
  const plan = await getWorkspacePlan(workspaceId);
  if (!plan) return 0;
  return (plan as any)[limit] || 0;
}
