/**
 * TikTok integration routes — OAuth, publishing, analytics.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getTikTokClient } from '../services/tiktok_api';
import { AppError } from '../middleware/error';

export const tiktokRoutes = Router();

// GET /api/tiktok/auth-url — generate OAuth URL
tiktokRoutes.get('/auth-url', (req: Request, res: Response, next: NextFunction) => {
  try {
    const redirectUri = (req.query.redirect_uri as string) || 'http://localhost:3000/callback';
    const client = getTikTokClient();
    const url = client.generateAuthUrl(redirectUri);
    res.json({ url });
  } catch (err) { next(err); }
});

// POST /api/tiktok/callback — handle OAuth callback
tiktokRoutes.post('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    if (!code) throw new AppError(400, 'Authorization code is required');

    const client = getTikTokClient();
    const tokens = await client.exchangeCode(code);
    res.json(tokens);
  } catch (err) { next(err); }
});

// POST /api/tiktok/publish — publish video to TikTok
tiktokRoutes.post('/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoPath, caption, hashtags, description, privacyLevel } = req.body;
    if (!videoPath) throw new AppError(400, 'videoPath is required');

    const client = getTikTokClient();
    const result = await client.publishVideo({
      videoPath,
      caption: caption || '',
      hashtags: hashtags || [],
      description,
      privacyLevel,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/tiktok/video/:videoId — get video status
tiktokRoutes.get('/video/:videoId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = getTikTokClient();
    const status = await client.getVideoStatus(req.params.videoId);
    res.json(status);
  } catch (err) { next(err); }
});

// GET /api/tiktok/analytics/:videoId — get video analytics
tiktokRoutes.get('/analytics/:videoId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const client = getTikTokClient();
    const analytics = await client.getVideoAnalytics(req.params.videoId, days);
    res.json(analytics);
  } catch (err) { next(err); }
});

// GET /api/tiktok/products — sync TikTok Shop products
tiktokRoutes.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const client = getTikTokClient();
    const products = await client.getShopProducts(page);
    res.json(products);
  } catch (err) { next(err); }
});
