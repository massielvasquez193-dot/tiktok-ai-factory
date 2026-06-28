import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { productRoutes } from './routes/products';
import { scriptRoutes } from './routes/scripts';
import { storyboardRoutes } from './routes/storyboards';
import { promptRoutes } from './routes/prompts';
import { videoTaskRoutes } from './routes/videoTasks';
import { videoRoutes as videoLibraryRoutes } from './routes/videos';
import { providerRoutes } from './routes/providers';
import { assetRoutes } from './routes/assets';
import { researchRoutes } from './routes/research';
import { campaignRoutes as campaignRecordRoutes } from './routes/campaigns';
import { proxyRoutes } from './routes/proxy';
import { localizationRoutes } from './routes/localization';
import { campaignV2Routes } from './routes/campaignsV2';
import { assetLibraryRoutes } from './routes/assetLibrary';
import { errorHandler } from './middleware/error';
import { authenticate } from './middleware/auth';
import { authRoutes } from './routes/auth';
import { workspaceRoutes } from './routes/workspaces';
import { queueRoutes } from './routes/queue';
import { uploadRoutes } from './routes/upload';
import { getVideoGenerationWorker, closeVideoGenerationWorker } from './workers/video-generation.worker';
import { getTtsWorker, closeTtsWorker } from './workers/tts.worker';
import { getPublishingWorker, closePublishingWorker } from './workers/publishing.worker';
import { getUploadProcessingWorker, closeUploadProcessingWorker } from './workers/upload-processing.worker';
import { getAutomationWorker, closeAutomationWorker } from './workers/automation.worker';
import { closeQueues } from './lib/queue-registry';
import { closeRedis } from './lib/redis';
import { disconnectPrisma } from './lib/prisma';
import { logStartupAudit } from './lib/provider-mode';
import { ProviderManager } from './providers/manager/ProviderManager';

// Re-export the shared Prisma singleton for backward compatibility
export { prisma } from './lib/prisma';
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('short'));

// Static files — serve uploaded images
const projectRoot = path.resolve(process.cwd(), '..', '..');
app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));
app.use('/output/videos', express.static(path.join(projectRoot, 'output', 'videos')));
app.use('/output/research', express.static(path.join(projectRoot, 'output', 'research')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', uptime: process.uptime(), saasMode: process.env.SAAS_MODE === 'true' });
});

// ── Global Auth Middleware (Phase 4) ───────────────────────────────────────
// When SAAS_MODE=true: all /api/* routes require authentication
// When SAAS_MODE=false: pass-through no-op
app.use('/api', (req, res, next) => {
  // Skip auth for public endpoints
  if (req.path === '/health' || req.path.startsWith('/auth/') || req.path.startsWith('/webhooks/') || req.path.startsWith('/plans')) {
    return next();
  }
  authenticate(req, res, next);
});

// ── Auth (Phase 1) ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Plans (Sprint 3 Phase 1) ───────────────────────────────────────────────
const { planRoutes, subscriptionRoutes } = require('./routes/subscriptions');
app.use('/api/plans', planRoutes);

// ── Workspaces (Phase 2) ──────────────────────────────────────────────────
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:id/subscription', subscriptionRoutes);

// ── Credits (Sprint 3 Phase 2) ─────────────────────────────────────────────
const { creditRoutes } = require('./routes/credits');
app.use('/api/workspaces/:id/credits', creditRoutes);

// ── Publishing V2 (Sprint 4 Phase 1) ───────────────────────────────────────
const { publishingV2Routes } = require('./routes/publishing-v2');
app.use('/api/workspaces/:id/publishing', publishingV2Routes);

// ── AI Workspace (Sprint 5 Phase 1) ────────────────────────────────────────
const { aiWorkspaceRoutes } = require('./routes/ai-workspace');
app.use('/api/workspaces/:id/ai', aiWorkspaceRoutes);

// ── Webhooks (Sprint 3 Phase 3) ────────────────────────────────────────────
app.post('/api/webhooks/stripe', async (req, res) => {
  try {
    const { handleWebhook } = require('./services/billing.service');
    const result = await handleWebhook(req.body);
    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[Webhook] Error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

app.use('/api/products', productRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/storyboards', storyboardRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/video-tasks', videoTaskRoutes);
app.use('/api/videos', videoLibraryRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/campaigns', campaignRecordRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/localization', localizationRoutes);
app.use('/api/campaigns-v2', campaignV2Routes);
app.use('/api/asset-library', assetLibraryRoutes);
app.use('/api/post-production', require('./routes/postProduction').postProductionRoutes);
app.use('/api/publishing', require('./routes/publishing').publishingRoutes);
app.use('/api/performance', require('./routes/performance').performanceRoutes);
app.use('/api/knowledge', require('./routes/knowledge').knowledgeRoutes);
app.use('/api/automation', require('./routes/automation').automationRoutes);
app.use('/api/publish', require('./routes/publish').publishRoutes);
app.use('/api/video-generator', require('./routes/videoGenerator').videoGeneratorRoutes);
app.use('/api/tiktok-connector', require('./routes/tiktokConnector').tiktokConnectorRoutes);
app.use('/api/ceo-dashboard', require('./routes/ceoDashboard').ceoDashboardRoutes);
try { const { startTikTokSync } = require('./services/tiktokConnector'); startTikTokSync(1440); } catch(e) {}
app.use('/api/data-center', require('./routes/dataCenter').dataCenterRoutes);
try { const { startAutoLearning } = require('./services/learningEngine'); startAutoLearning(360); } catch(e) { console.log('AutoLearning: disabled (no performance data)'); }
app.use('/api/agent', require('./routes/agent').agentRoutes);
app.use('/api/automation-tasks', require('./routes/automationTasks').automationTaskRoutes);

// BullMQ Queue API (internal verification endpoints)
app.use('/api/queue', queueRoutes);

// File Upload API
app.use('/api/upload', uploadRoutes);

// Initialize BullMQ workers for all 5 queues
try {
  logStartupAudit();
  getVideoGenerationWorker();
  getTtsWorker();
  getPublishingWorker();
  getUploadProcessingWorker();
  getAutomationWorker();
  console.log('[Server] All 5 BullMQ workers started');

  // Seed default plans (Sprint 3 Phase 1)
  try { const { seedDefaultPlans } = require('./services/subscription.service'); seedDefaultPlans().catch(() => {}); } catch {}

  // Recover stale video tasks from before restart
  ProviderManager.recoverStaleTasks(ProviderManager.instance).catch((e: any) =>
    console.error('[Server] Task recovery scan failed:', e.message));
} catch (err: any) {
  console.warn('[Server] Could not start BullMQ workers (Redis may be unavailable):', err.message);
}

// Restore automation cron jobs on startup
try { require('./routes/automationTasks').restoreAutomationTasks(); } catch {}

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => console.log(`[Server] http://localhost:${PORT}`));

  // ── Graceful Shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal} — shutting down gracefully...`);
    server.close();

    try { await closeVideoGenerationWorker(); } catch (e: any) { console.error('[Server] vg-worker shutdown error:', e.message); }
    try { await closeTtsWorker(); } catch (e: any) { console.error('[Server] tts-worker shutdown error:', e.message); }
    try { await closePublishingWorker(); } catch (e: any) { console.error('[Server] pub-worker shutdown error:', e.message); }
    try { await closeUploadProcessingWorker(); } catch (e: any) { console.error('[Server] upload-worker shutdown error:', e.message); }
    try { await closeAutomationWorker(); } catch (e: any) { console.error('[Server] auto-worker shutdown error:', e.message); }
    try { await closeQueues(); } catch (e: any) { console.error('[Server] Queue shutdown error:', e.message); }
    try { await closeRedis(); } catch (e: any) { console.error('[Server] Redis shutdown error:', e.message); }
    try { await disconnectPrisma(); } catch (e: any) { console.error('[Server] Prisma disconnect error:', e.message); }

    console.log('[Server] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default app;
