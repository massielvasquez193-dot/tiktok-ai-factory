/**
 * TikTok AI Video Factory — Express API Server
 *
 * REST API for:
 *   - Product management (CRUD)
 *   - Script generation & management
 *   - Campaign creation & pipeline triggering
 *   - Video & task status tracking
 *   - Viral research data access
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

import { productRoutes } from './routes/products';
import { scriptRoutes } from './routes/scripts';
import { campaignRoutes } from './routes/campaigns';
import { videoRoutes } from './routes/videos';
import { researchRoutes } from './routes/research';
import { pipelineRouter } from './routes/pipeline';
import { errorHandler } from './middleware/error';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('short'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.2.0', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/pipeline', pipelineRouter);

// Error handling
app.use(errorHandler);

// Start
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] TikTok AI Video Factory API running on http://localhost:${PORT}`);
    console.log(`[Server] Health: http://localhost:${PORT}/api/health`);
  });
}

export default app;
