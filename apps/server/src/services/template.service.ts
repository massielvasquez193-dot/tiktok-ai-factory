/**
 * Template Marketplace Service — Sprint 6 Phase 1
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── List & Search ───────────────────────────────────────────────────────

export async function listTemplates(options: {
  type?: string; category?: string; language?: string; search?: string;
  status?: string; isFeatured?: boolean; isOfficial?: boolean;
  sort?: string; page?: number; pageSize?: number;
} = {}) {
  const where: any = { status: options.status || 'published' };
  if (options.type) where.type = options.type;
  if (options.category) where.category = options.category;
  if (options.language) where.language = options.language;
  if (options.isFeatured) where.isFeatured = true;
  if (options.isOfficial !== undefined) where.isOfficial = options.isOfficial;

  const orderBy: any = options.sort === 'newest' ? [{ createdAt: 'desc' as const }]
    : options.sort === 'rating' ? [{ rating: 'desc' as const }]
    : options.sort === 'downloads' ? [{ downloads: 'desc' as const }]
    : [{ isFeatured: 'desc' as const }, { downloads: 'desc' as const }];

  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  let templates = await prisma.template.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize });
  const total = await prisma.template.count({ where });

  // Full-text-like search on name/description/tags
  if (options.search) {
    const q = options.search.toLowerCase();
    templates = templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.toLowerCase().includes(q));
  }

  return {
    items: templates.map(formatTemplate),
    total: options.search ? templates.length : total,
    page, pageSize,
  };
}

export async function getTemplate(id: string) {
  const t = await prisma.template.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
  if (!t) return null;
  return { ...formatTemplate(t), currentVersion: t.versions[0]?.version || 1 };
}

// ── Create & Publish ────────────────────────────────────────────────────

export async function createTemplate(workspaceId: string, userId: string, data: {
  name: string; description?: string; type?: string; category?: string;
  language?: string; content: string; pricing?: string; priceCredits?: number; tags?: string[];
}) {
  const t = await prisma.template.create({
    data: {
      id: uuid(), workspaceId, name: data.name,
      description: data.description || '', type: data.type || 'full_pipeline',
      category: data.category || 'general', language: data.language || 'en',
      content: data.content, pricing: data.pricing || 'free',
      priceCredits: data.priceCredits || 0,
      tags: (data.tags || []).join(','), createdBy: userId,
    },
  });
  return formatTemplate(t);
}

export async function publishTemplate(id: string) {
  const t = await prisma.template.update({ where: { id }, data: { status: 'published' } });
  // Create version snapshot
  await prisma.templateVersion.create({ data: { id: uuid(), templateId: id, version: 1, content: t.content, changelog: 'Initial published version' } });
  return formatTemplate(t);
}

export async function cloneTemplate(templateId: string, targetWorkspaceId: string, userId: string) {
  const src = await prisma.template.findUnique({ where: { id: templateId } });
  if (!src) throw new Error('Template not found');

  const clone = await prisma.template.create({
    data: {
      id: uuid(), workspaceId: targetWorkspaceId,
      name: `${src.name} (Clone)`, description: src.description,
      type: src.type, category: src.category, language: src.language,
      content: src.content, pricing: 'free', priceCredits: 0,
      tags: src.tags, createdBy: userId,
      status: 'draft', isFeatured: false, isOfficial: false,
    },
  });

  // Track download
  await prisma.templateDownload.create({
    data: { id: uuid(), templateId: templateId, workspaceId: targetWorkspaceId, userId },
  });

  // Increment download count
  await prisma.template.update({ where: { id: templateId }, data: { downloads: { increment: 1 } } });

  return formatTemplate(clone);
}

// ── Reviews ─────────────────────────────────────────────────────────────

export async function addReview(templateId: string, userId: string, data: { rating: number; comment?: string }) {
  if (data.rating < 1 || data.rating > 5) throw new Error('Rating must be 1-5');

  const review = await prisma.templateReview.upsert({
    where: { templateId_userId: { templateId, userId } },
    create: { id: uuid(), templateId, userId, rating: data.rating, comment: data.comment || '' },
    update: { rating: data.rating, comment: data.comment || '' },
  });

  // Recalculate average rating
  const agg = await prisma.templateReview.aggregate({ where: { templateId }, _avg: { rating: true } });
  const avgRating = Math.round((agg._avg.rating || 0) * 10) / 10;
  await prisma.template.update({ where: { id: templateId }, data: { rating: avgRating } });

  return review;
}

export async function getReviews(templateId: string) {
  return prisma.templateReview.findMany({ where: { templateId }, orderBy: { createdAt: 'desc' } });
}

// ── My Templates ────────────────────────────────────────────────────────

export async function listMyTemplates(workspaceId: string) {
  const templates = await prisma.template.findMany({ where: { workspaceId }, orderBy: { updatedAt: 'desc' } });
  return templates.map(formatTemplate);
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({ where: { id } });
}

export async function toggleFeatured(id: string) {
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t) throw new Error('Not found');
  const updated = await prisma.template.update({ where: { id }, data: { isFeatured: !t.isFeatured } });
  return formatTemplate(updated);
}

// ── Helper ──────────────────────────────────────────────────────────────

function formatTemplate(t: any) {
  return {
    id: t.id, workspaceId: t.workspaceId, name: t.name, description: t.description,
    type: t.type, category: t.category, language: t.language, country: t.country,
    thumbnailUrl: t.thumbnailUrl, content: t.content,
    pricing: t.pricing, priceCredits: t.priceCredits,
    tags: t.tags.split(',').filter(Boolean),
    downloads: t.downloads, likes: t.likes, rating: t.rating,
    status: t.status, isFeatured: t.isFeatured, isOfficial: t.isOfficial,
    createdBy: t.createdBy, createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt?.toISOString(),
  };
}
