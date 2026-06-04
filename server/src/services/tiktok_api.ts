/**
 * TikTok Shop API Client — Publish videos and manage shop content.
 *
 * API Reference: https://developers.tiktok.com/
 *
 * Supports:
 *   - OAuth 2.0 authentication
 *   - Video upload & publish
 *   - Product listing sync
 *   - Analytics / performance data
 *
 * Usage:
 *   import { TikTokClient } from './services/tiktok_api';
 *   const client = new TikTokClient({ accessToken: '...' });
 *   await client.publishVideo({ videoPath, caption, hashtags });
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Types ───────────────────────────────────────────────────────────────

export interface TikTokConfig {
  appKey: string;
  appSecret: string;
  accessToken?: string;
  refreshToken?: string;
  shopId?: string;
  baseUrl?: string;
}

export interface PublishVideoParams {
  videoPath: string;
  caption: string;
  hashtags: string[];
  description?: string;
  privacyLevel?: 'PUBLIC' | 'PRIVATE';
  disableComment?: boolean;
  duetDisabled?: boolean;
  stitchDisabled?: boolean;
}

export interface VideoPublishResult {
  success: boolean;
  videoId?: string;
  publishId?: string;
  shareUrl?: string;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
}

export interface ShopProduct {
  id: string;
  name: string;
  price: string;
  currency: string;
  stock: number;
  images: string[];
  status: 'ACTIVE' | 'INACTIVE';
}

// ── TikTok API Client ───────────────────────────────────────────────────

export class TikTokClient {
  private config: TikTokConfig;
  private baseUrl: string;

  constructor(config: TikTokConfig) {
    this.config = {
      baseUrl: 'https://open-api.tiktok.com',
      ...config,
    };
    this.baseUrl = this.config.baseUrl!;
  }

  // ── Auth ────────────────────────────────────────────────────────────

  /**
   * Generate OAuth authorization URL for user consent.
   */
  generateAuthUrl(redirectUri: string, state?: string): string {
    const s = state || crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_key: this.config.appKey,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      redirect_uri: redirectUri,
      state: s,
    });
    return `${this.baseUrl}/platform/oauth/connect/?${params}`;
  }

  /**
   * Exchange authorization code for access token.
   */
  async exchangeCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const res = await fetch(`${this.baseUrl}/oauth/access_token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_key: this.config.appKey,
        client_secret: this.config.appSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(`TikTok OAuth error: ${data.error_description || data.error}`);
    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresIn: data.data.expires_in,
    };
  }

  /**
   * Refresh access token.
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken) throw new Error('No refresh token available');

    const res = await fetch(`${this.baseUrl}/oauth/refresh_token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_key: this.config.appKey,
        client_secret: this.config.appSecret,
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
      }),
    });

    const data = await res.json();
    this.config.accessToken = data.data.access_token;
    if (data.data.refresh_token) this.config.refreshToken = data.data.refresh_token;
    return this.config.accessToken!;
  }

  // ── Video Upload & Publish ──────────────────────────────────────────

  /**
   * Step 1: Initialize video upload.
   */
  async initUpload(fileSize: number, fileName: string): Promise<string> {
    const res = await this._post('/video/upload/init/', {
      source_info: { source: 'FILE_UPLOAD', video_size: fileSize, file_name: fileName },
    });
    return res.data.upload_url;
  }

  /**
   * Step 2: Upload video bytes.
   */
  async uploadVideo(videoPath: string): Promise<string> {
    const stats = fs.statSync(videoPath);
    const fileName = path.basename(videoPath);
    const uploadUrl = await this.initUpload(stats.size, fileName);

    const videoBuffer = fs.readFileSync(videoPath);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: videoBuffer,
    });

    if (!uploadRes.ok) throw new Error(`Video upload failed: ${uploadRes.status}`);

    // Extract video_id from upload response
    const data = await uploadRes.json();
    return data.data?.video_id || uploadUrl.split('/').pop()!;
  }

  /**
   * Full publish flow: upload → verify → publish.
   */
  async publishVideo(params: PublishVideoParams): Promise<VideoPublishResult> {
    try {
      // 1. Upload
      console.log(`[TikTok] Uploading: ${params.videoPath}`);
      const videoId = await this.uploadVideo(params.videoPath);

      // 2. Publish
      const publishData = {
        video_id: videoId,
        text: params.caption,
        hashtags: params.hashtags,
        privacy_level: params.privacyLevel || 'PUBLIC',
        disable_comment: params.disableComment || false,
        disable_duet: params.duetDisabled || false,
        disable_stitch: params.stitchDisabled || false,
      };

      const res = await this._post('/video/publish/', publishData);

      return {
        success: true,
        videoId,
        publishId: res.data?.publish_id,
        shareUrl: res.data?.share_url || `https://www.tiktok.com/@user/video/${videoId}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Check video upload/publish status.
   */
  async getVideoStatus(videoId: string): Promise<{
    status: string;
    publishStatus?: string;
    errorMessage?: string;
  }> {
    const res = await this._get(`/video/status/`, { video_id: videoId });
    return {
      status: res.data?.status,
      publishStatus: res.data?.publish_status,
      errorMessage: res.data?.error_message,
    };
  }

  // ── Shop Products ───────────────────────────────────────────────────

  /**
   * List products from TikTok Shop.
   */
  async getShopProducts(page: number = 1, pageSize: number = 20): Promise<{
    products: ShopProduct[];
    total: number;
  }> {
    const res = await this._get('/shop/products/', {
      shop_id: this.config.shopId,
      page_number: page,
      page_size: pageSize,
    });
    return {
      products: (res.data?.products || []).map((p: any) => ({
        id: p.product_id,
        name: p.product_name,
        price: p.price?.amount || '0',
        currency: p.price?.currency || 'USD',
        stock: p.stock_info?.available_stock || 0,
        images: p.images || [],
        status: p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      })),
      total: res.data?.total_count || 0,
    };
  }

  /**
   * Sync a product from our DB to TikTok Shop.
   */
  async createShopProduct(product: {
    name: string;
    description: string;
    price: number;
    currency?: string;
    images: string[];
    categoryId?: string;
  }): Promise<string> {
    const res = await this._post('/shop/products/', {
      shop_id: this.config.shopId,
      product_name: product.name,
      description: product.description,
      price: { amount: product.price.toString(), currency: product.currency || 'USD' },
      images: product.images.map(url => ({ url })),
      category_id: product.categoryId,
    });
    return res.data?.product_id;
  }

  // ── Analytics ───────────────────────────────────────────────────────

  /**
   * Get video performance data.
   */
  async getVideoAnalytics(videoId: string, days: number = 7): Promise<{
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
    demographics?: any;
  }> {
    const res = await this._get('/video/analytics/', {
      video_id: videoId,
      days,
    });
    const d = res.data || {};
    return {
      views: d.views || 0,
      likes: d.likes || 0,
      comments: d.comments || 0,
      shares: d.shares || 0,
      engagementRate: d.views > 0 ? ((d.likes + d.comments + d.shares) / d.views) * 100 : 0,
      demographics: d.demographics,
    };
  }

  // ── HTTP Helpers ────────────────────────────────────────────────────

  private async _get(path: string, params?: Record<string, any>): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    return this._request(url.toString());
  }

  private async _post(path: string, body: Record<string, any>): Promise<any> {
    return this._request(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async _request(url: string, options?: RequestInit): Promise<any> {
    if (!this.config.accessToken) throw new Error('No access token');

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      ...(options?.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (data.error) {
      if (data.error === 'access_token_expired' || data.error_code === 'access_token_invalid') {
        // Auto-refresh and retry
        await this.refreshAccessToken();
        headers['Authorization'] = `Bearer ${this.config.accessToken}`;
        const retryRes = await fetch(url, { ...options, headers });
        const retryData = await retryRes.json();
        if (retryData.error) throw new Error(`TikTok API error: ${retryData.error_description || retryData.error}`);
        return retryData;
      }
      throw new Error(`TikTok API error: ${data.error_description || data.error}`);
    }

    return data;
  }
}

// ── Singleton factory ───────────────────────────────────────────────────

let instance: TikTokClient | null = null;

export function getTikTokClient(): TikTokClient {
  if (!instance) {
    instance = new TikTokClient({
      appKey: process.env.TIKTOK_APP_KEY || '',
      appSecret: process.env.TIKTOK_APP_SECRET || '',
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
      refreshToken: process.env.TIKTOK_REFRESH_TOKEN || '',
      shopId: process.env.TIKTOK_SHOP_ID || '',
    });
  }
  return instance;
}
