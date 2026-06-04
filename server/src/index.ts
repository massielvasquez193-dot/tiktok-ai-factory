/**
 * TikTok AI Video Factory — Express API Server
 *
 * REST API for:
 *   - Product management (CRUD)
 *   - Script generation & management
 *   - Campaign creation & pipeline triggering
 *   - Video & task status tracking
 *   - Viral research data access
 *   - File upload (images + video assets)
 *   - Async queue management (BullMQ)
 *   - TikTok Shop API integration
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { PrismaClient } from '@prisma/client';

import { productRoutes } from './routes/products';
import { scriptRoutes } from './routes/scripts';
import { campaignRoutes } from './routes/campaigns';
import { videoRoutes } from './routes/videos';
import { researchRoutes } from './routes/research';
import { pipelineRouter } from './routes/pipeline';
import { uploadRoutes } from './routes/upload';
import { queueRoutes } from './routes/queue_routes';
import { tiktokRoutes } from './routes/tiktok_routes';
import { errorHandler } from './middleware/error';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('short'));

// Static files — serve uploaded assets
const uploadsPath = path.resolve(process.cwd(), '..', 'output', 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '0.3.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/upload', uploadRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/tiktok', tiktokRoutes);

// Error handling
app.use(errorHandler);

// Start
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] TikTok AI Video Factory API running on http://localhost:${PORT}`);
    console.log(`[Server] Health: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Uploads: ${uploadsPath}`);
  });
}

export default app;
