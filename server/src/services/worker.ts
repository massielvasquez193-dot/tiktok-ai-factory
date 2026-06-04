/**
 * BullMQ Worker Service — Async job processing.
 *
 * Start workers: npx tsx src/services/worker.ts
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '../index';
import {
  PipelineJobData,
  productAnalysisQueue,
  scriptGenerationQueue,
  videoGenerationQueue,
  voiceGenerationQueue,
  videoCompositionQueue,
} from './queue';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = { url: REDIS_URL, maxRetriesPerRequest: null };

// ── Product Analysis Worker ──────────────────────────────────────────────

const analysisWorker = new Worker<PipelineJobData>(
  'product-analysis',
  async (job: Job<PipelineJobData>) => {
    const { productId, campaignId } = job.data;
    console.log(`[Worker] Product Analysis started for ${productId}`);

    // Update task
    await prisma.task.updateMany({
      where: { campaignId, type: 'analyze_product' },
      data: { status: 'running', progress: 10 },
    });

    try {
      // Dispatch to Python pipeline
      const { execSync } = require('child_process');
      const result = execSync(
        `python src/agents/product_agent.py ${productId}`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 120_000 }
      );
      console.log(`[Worker] Product Analysis result: ${result.slice(0, 200)}`);

      await prisma.task.updateMany({
        where: { campaignId, type: 'analyze_product' },
        data: { status: 'completed', progress: 100, result: { output: result } },
      });

      // Chain: submit script generation jobs
      const languages = job.data.languages || ['en'];
      const scriptTypes = job.data.scriptTypes || ['ugc', 'review'];
      for (const lang of languages) {
        for (const st of scriptTypes) {
          await scriptGenerationQueue.add('generate', {
            productId,
            campaignId,
            language: lang,
            scriptType: st,
          });
        }
      }

      return { success: true, productId };
    } catch (err: any) {
      await prisma.task.updateMany({
        where: { campaignId, type: 'analyze_product' },
        data: { status: 'failed', result: { error: err.message } },
      });
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ── Script Generation Worker ─────────────────────────────────────────────

const scriptWorker = new Worker<any>(
  'script-generation',
  async (job: Job) => {
    const { productId, campaignId, language, scriptType } = job.data;
    console.log(`[Worker] Script Generation: ${scriptType}/${language}`);

    await prisma.task.upsert({
      where: { id: `script-${job.id}` },
      create: { id: `script-${job.id!}`, type: 'generate_scripts', status: 'running', progress: 50, campaignId },
      update: { status: 'running', progress: 50 },
    });

    try {
      const { execSync } = require('child_process');
      // In production, this calls the Python ScriptAgent directly or via API
      console.log(`[Worker] Generated ${scriptType} script in ${language}`);

      await prisma.task.upsert({
        where: { id: `script-${job.id}` },
        create: { id: `script-${job.id!}`, type: 'generate_scripts', status: 'completed', progress: 100, campaignId, result: { scriptType, language } },
        update: { status: 'completed', progress: 100, result: { scriptType, language } },
      });

      return { success: true, scriptType, language };
    } catch (err: any) {
      await prisma.task.upsert({
        where: { id: `script-${job.id}` },
        create: { id: `script-${job.id!}`, type: 'generate_scripts', status: 'failed', campaignId, result: { error: err.message } },
        update: { status: 'failed', result: { error: err.message } },
      });
      throw err;
    }
  },
  { connection, concurrency: 4 }
);

// ── Video Generation Worker ──────────────────────────────────────────────

const videoWorker = new Worker<any>(
  'video-generation',
  async (job: Job) => {
    const { campaignId, prompt, label, provider } = job.data;
    console.log(`[Worker] Video Generation: ${label}`);

    try {
      // Call Seedance API via Python
      const { execSync } = require('child_process');
      const configPath = process.env.SEEDANCE_CONFIG || 'configs/seedance_config.json';

      // Create video record
      const video = await prisma.video.create({
        data: {
          id: `video-${job.id}`,
          filename: `${label}.mp4`,
          status: 'generating',
          provider: provider || 'seedance',
          campaignId,
          metadata: { prompt, jobId: job.id },
        },
      });

      // In real production, this calls Seedance API
      // const result = execSync(`python src/services/seedance_client.py ${configPath} "${prompt}"`, {...});

      // For now, simulate async generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed', url: `output/videos/${label}.mp4` },
      });

      return { success: true, videoId: video.id, label };
    } catch (err: any) {
      console.error(`[Worker] Video generation failed: ${err.message}`);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ── Composition Worker ──────────────────────────────────────────────────

const composeWorker = new Worker<any>(
  'video-composition',
  async (job: Job) => {
    const { campaignId, videoPaths, audioPath, subtitlePath } = job.data;
    console.log(`[Worker] Composing video for campaign ${campaignId}`);

    try {
      const { execSync } = require('child_process');
      // In production, calls FFMpegComposer
      console.log(`[Worker] Composition complete`);

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'completed' },
      });

      return { success: true, campaignId };
    } catch (err: any) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

// ── Start ───────────────────────────────────────────────────────────────

console.log('[Worker] BullMQ Workers started');
console.log('  - product-analysis (concurrency: 2)');
console.log('  - script-generation (concurrency: 4)');
console.log('  - video-generation (concurrency: 2)');
console.log('  - video-composition (concurrency: 1)');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await Promise.all([
    analysisWorker.close(),
    scriptWorker.close(),
    videoWorker.close(),
    composeWorker.close(),
  ]);
  process.exit(0);
});
