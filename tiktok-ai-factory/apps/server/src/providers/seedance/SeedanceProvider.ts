import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  IVideoProvider, ProviderName, ProviderConfig,
  CreateTaskInput, CreateTaskOutput, TaskStatus, DownloadResult,
} from '../interfaces/IVideoProvider';

export class SeedanceProvider implements IVideoProvider {
  readonly name: ProviderName = 'seedance';
  readonly config: Readonly<ProviderConfig>;

  private _mode: 'real' | 'mock';
  private _timers = new Map<string, { start: number; duration: number }>();

  constructor(overrides?: Partial<ProviderConfig>) {
    const apiKey = overrides?.apiKey || process.env.SEEDANCE_API_KEY || '';
    const baseUrl = overrides?.baseUrl || process.env.SEEDANCE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

    this.config = Object.freeze({
      name: 'seedance',
      apiKey,
      baseUrl,
      model: overrides?.model || 'doubao-seedance-2-0-260128',
      pollIntervalMs: overrides?.pollIntervalMs || 5000,
      maxWaitMs: overrides?.maxWaitMs || 600_000,
    });

    this._mode = apiKey ? 'real' : 'mock';
    console.log(`[SeedanceProvider] Mode: ${this._mode}${apiKey ? '' : ' (set SEEDANCE_API_KEY in .env to enable real API)'}`);
  }

  async createTask(input: CreateTaskInput): Promise<CreateTaskOutput> {
    if (this._mode === 'mock') return this._mockCreate(input);
    return this._realCreate(input);
  }

  async getStatus(externalTaskId: string): Promise<TaskStatus> {
    if (this._mode === 'mock') return this._mockStatus(externalTaskId);
    return this._realStatus(externalTaskId);
  }

  async downloadResult(videoUrl: string, outputPath: string): Promise<DownloadResult> {
    if (this._mode === 'mock') return this._mockDownload(videoUrl, outputPath);
    return this._realDownload(videoUrl, outputPath);
  }

  // ── Real API ──────────────────────────────────────────────────────────

  private async _realCreate(input: CreateTaskInput): Promise<CreateTaskOutput> {
    const content: any[] = [{ type: 'text', text: input.prompt }];
    if (input.imageUrl) content.push({ type: 'image_url', image_url: { url: input.imageUrl } });

    const payload = {
      model: this.config.model,
      content,
      resolution: input.resolution || '720p',
      ratio: input.aspectRatio || '9:16',
      duration: input.duration || 5,
      generate_audio: false,
      watermark: false,
    };

    const resp = await this._fetch('POST', this.config.baseUrl, payload);
    const taskId = resp?.id;
    if (!taskId) throw new Error(`Seedance API: no id in response — ${JSON.stringify(resp).slice(0, 300)}`);
    console.log(`[Seedance] Real task created: ${taskId}`);
    return { externalTaskId: taskId, estimatedSeconds: 45 };
  }

  private async _realStatus(externalTaskId: string): Promise<TaskStatus> {
    const url = `${this.config.baseUrl}/${externalTaskId}`;
    const resp = await this._fetch('GET', url);

    const status: string = resp?.status || 'unknown';
    const content = resp?.content;
    let videoUrl = '';
    if (content) {
      if (typeof content === 'object' && !Array.isArray(content)) {
        videoUrl = content.video_url || '';
      } else if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'object') {
        videoUrl = content[0].video_url || '';
      }
    }

    if (status === 'succeeded') {
      return {
        externalTaskId, status: 'completed', progress: 100,
        videoUrl, thumbnailUrl: '', duration: resp?.duration || 5, error: '',
        metadata: { provider: 'seedance', model: this.config.model, resolution: resp?.resolution || '720p' },
      };
    }
    if (status === 'failed' || status === 'expired') {
      return {
        externalTaskId, status: 'failed', progress: resp?.progress || 0,
        videoUrl: '', thumbnailUrl: '', duration: 0,
        error: resp?.error?.message || `Task ${status}`,
        metadata: {},
      };
    }
    // queued / running
    return {
      externalTaskId, status: 'processing', progress: resp?.progress || 30,
      videoUrl: '', thumbnailUrl: '', duration: 0, error: '', metadata: {},
    };
  }

  private async _realDownload(videoUrl: string, outputPath: string): Promise<DownloadResult> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const resp = await fetch(videoUrl);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    console.log(`[Seedance] Downloaded: ${(buffer.length / 1048576).toFixed(1)}MB -> ${outputPath}`);
    return { localPath: outputPath, sizeBytes: buffer.length };
  }

  // ── Mock (fallback) ───────────────────────────────────────────────────

  private async _mockCreate(_input: CreateTaskInput): Promise<CreateTaskOutput> {
    await this._delay(200 + Math.random() * 600);
    const taskId = `seedance_mock_${uuid().slice(0, 12)}`;
    this._timers.set(taskId, { start: Date.now(), duration: 2000 + Math.random() * 6000 });
    return { externalTaskId: taskId, estimatedSeconds: 45 };
  }

  private async _mockStatus(taskId: string): Promise<TaskStatus> {
    await this._delay(100 + Math.random() * 300);
    const t = this._timers.get(taskId) || { start: Date.now(), duration: 5000 };
    const elapsed = Date.now() - t.start;
    const progress = Math.min(100, Math.round((elapsed / t.duration) * 100));

    if (progress >= 100) {
      return {
        externalTaskId: taskId, status: 'completed', progress: 100,
        videoUrl: `https://storage.mock/seedance/${taskId}.mp4`,
        thumbnailUrl: `https://storage.mock/seedance/${taskId}_thumb.jpg`,
        duration: 5, error: '',
        metadata: { provider: 'seedance', model: this.config.model, resolution: '720p', fps: 30 },
      };
    }
    if (progress > 80 && Math.random() < 0.08) {
      return { externalTaskId: taskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Seedance: content moderation flagged', metadata: {} };
    }
    return { externalTaskId: taskId, status: 'processing', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: '', metadata: {} };
  }

  private async _mockDownload(videoUrl: string, outputPath: string): Promise<DownloadResult> {
    await this._delay(400 + Math.random() * 800);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const name = outputPath.split('/').pop() || `${uuid()}.mp4`;
    const localPath = dir + '/' + name;
    return { localPath, sizeBytes: 5_000_000 + Math.floor(Math.random() * 10_000_000) };
  }

  // ── HTTP ──────────────────────────────────────────────────────────────

  private async _fetch(method: string, url: string, body?: any): Promise<any> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'TikTokAIVF/1.0',
    };
    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const resp = await fetch(url, options);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Seedance API ${method} ${url} -> ${resp.status}: ${text.slice(0, 300)}`);
    }
    return resp.json();
  }

  private _delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}
