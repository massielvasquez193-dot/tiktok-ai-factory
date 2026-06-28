/**
 * Publishing Service — Sprint 4 Phase 1
 *
 * Multi-platform publishing: TikTok, YouTube Shorts, Instagram Reels.
 * Supports scheduling, retry, and queue management.
 */

import { prisma } from '../lib/prisma';
import { v4 as uuid } from 'uuid';

// ── Types ───────────────────────────────────────────────────────────────────

export interface PublishJobInfo {
  id: string;
  workspaceId: string;
  videoId: string;
  platform: string;
  title: string;
  description: string;
  hashtags: string;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  error: string;
  retryCount: number;
  createdAt: string;
}

export interface PublishHistory {
  jobs: PublishJobInfo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublishStats {
  total: number;
  drafted: number;
  scheduled: number;
  published: number;
  failed: number;
  byPlatform: Record<string, number>;
}

export const PLATFORMS = {
  tiktok: { name: 'TikTok', icon: '🎵', color: '#000000' },
  youtube_shorts: { name: 'YouTube Shorts', icon: '▶️', color: '#FF0000' },
  instagram_reels: { name: 'Instagram Reels', icon: '📷', color: '#E1306C' },
};

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function createPublishJob(data: {
  workspaceId: string;
  videoId: string;
  platform: string;
  title?: string;
  description?: string;
  hashtags?: string;
  pinnedComment?: string;
  scheduledAt?: string;
}): Promise<PublishJobInfo> {
  if (!Object.keys(PLATFORMS).includes(data.platform)) {
    throw new Error(`Unsupported platform: ${data.platform}`);
  }

  const job = await prisma.publishingJob.create({
    data: {
      id: uuid(),
      workspaceId: data.workspaceId,
      videoId: data.videoId,
      platform: data.platform,
      title: data.title || '',
      description: data.description || '',
      hashtags: data.hashtags || '',
      pinnedComment: data.pinnedComment || '',
      status: data.scheduledAt ? 'scheduled' : 'draft',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    },
  });

  return toJobInfo(job);
}

export async function getPublishJob(jobId: string): Promise<PublishJobInfo | null> {
  const job = await prisma.publishingJob.findUnique({ where: { id: jobId } });
  return job ? toJobInfo(job) : null;
}

export async function listPublishJobs(workspaceId: string, options: {
  status?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PublishHistory> {
  const { status, platform, page = 1, pageSize = 20 } = options;
  const where: any = { workspaceId };
  if (status) where.status = status;
  if (platform) where.platform = platform;

  const [jobs, total] = await Promise.all([
    prisma.publishingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.publishingJob.count({ where }),
  ]);

  return {
    jobs: jobs.map(toJobInfo),
    total,
    page,
    pageSize,
  };
}

export async function getPublishStats(workspaceId: string): Promise<PublishStats> {
  const jobs = await prisma.publishingJob.findMany({ where: { workspaceId } });
  const stats: PublishStats = {
    total: jobs.length,
    drafted: jobs.filter(j => j.status === 'draft').length,
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    published: jobs.filter(j => j.status === 'published').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    byPlatform: {},
  };

  for (const p of Object.keys(PLATFORMS)) {
    stats.byPlatform[p] = jobs.filter(j => j.platform === p).length;
  }

  return stats;
}

// ── Publishing Actions ──────────────────────────────────────────────────────

export async function publishNow(jobId: string): Promise<PublishJobInfo> {
  const job = await prisma.publishingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (job.status === 'published') throw new Error('Already published');

  // In production, this would call the platform API.
  // For now, simulate successful publish.
  const now = new Date();
  const updated = await prisma.publishingJob.update({
    where: { id: jobId },
    data: {
      status: 'published',
      publishedAt: now,
      externalPostId: `mock_${job.platform}_${Date.now()}`,
      externalPostUrl: `https://${job.platform}.com/mock-post/${jobId}`,
    },
  });

  return toJobInfo(updated);
}

export async function publishMultiple(jobIds: string[]): Promise<{ succeeded: string[]; failed: string[] }> {
  const results = { succeeded: [] as string[], failed: [] as string[] };
  for (const id of jobIds) {
    try {
      await publishNow(id);
      results.succeeded.push(id);
    } catch {
      results.failed.push(id);
    }
  }
  return results;
}

export async function retryPublish(jobId: string): Promise<PublishJobInfo> {
  const job = await prisma.publishingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Job not found');
  if (job.retryCount >= job.maxRetries) throw new Error('Max retries exceeded');

  const updated = await prisma.publishingJob.update({
    where: { id: jobId },
    data: {
      status: 'queued',
      error: '',
      retryCount: { increment: 1 },
    },
  });

  return toJobInfo(updated);
}

export async function schedulePublish(jobId: string, scheduledAt: string): Promise<PublishJobInfo> {
  const updated = await prisma.publishingJob.update({
    where: { id: jobId },
    data: {
      status: 'scheduled',
      scheduledAt: new Date(scheduledAt),
    },
  });
  return toJobInfo(updated);
}

export async function cancelPublish(jobId: string): Promise<PublishJobInfo> {
  const updated = await prisma.publishingJob.update({
    where: { id: jobId },
    data: { status: 'draft', scheduledAt: null },
  });
  return toJobInfo(updated);
}

export async function deletePublishJob(jobId: string): Promise<void> {
  await prisma.publishingJob.delete({ where: { id: jobId } });
}

export async function markFailed(jobId: string, error: string): Promise<PublishJobInfo> {
  const updated = await prisma.publishingJob.update({
    where: { id: jobId },
    data: { status: 'failed', error },
  });
  return toJobInfo(updated);
}

// ── Helper ──────────────────────────────────────────────────────────────────

function toJobInfo(j: any): PublishJobInfo {
  return {
    id: j.id,
    workspaceId: j.workspaceId,
    videoId: j.videoId,
    platform: j.platform,
    title: j.title,
    description: j.description,
    hashtags: j.hashtags,
    status: j.status,
    scheduledAt: j.scheduledAt?.toISOString() || null,
    publishedAt: j.publishedAt?.toISOString() || null,
    error: j.error,
    retryCount: j.retryCount,
    createdAt: j.createdAt.toISOString(),
  };
}
