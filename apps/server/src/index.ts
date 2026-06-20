import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { PrismaClient } from '@prisma/client';
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

export const prisma = new PrismaClient();
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
  res.json({ status: 'ok', version: '1.0.0', uptime: process.uptime() });
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

// Restore automation cron jobs on startup
try { require('./routes/automationTasks').restoreAutomationTasks(); } catch {}

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`[Server] http://localhost:${PORT}`));
}

export default app;
