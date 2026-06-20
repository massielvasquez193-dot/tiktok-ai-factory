import { v4 as uuid } from 'uuid';
import {
  IVideoProvider, ProviderName, ProviderConfig,
  CreateTaskInput, CreateTaskOutput, TaskStatus, DownloadResult,
} from '../interfaces/IVideoProvider';

export class KlingProvider implements IVideoProvider {
  readonly name: ProviderName = 'kling';
  readonly config: Readonly<ProviderConfig>;

  private _timers = new Map<string, { start: number; duration: number }>();

  constructor(overrides?: Partial<ProviderConfig>) {
    this.config = Object.freeze({
      name: 'kling',
      apiKey: overrides?.apiKey || '',
      baseUrl: overrides?.baseUrl || 'https://api.kling.kuaishou.com/v1/videos/text2video',
      model: overrides?.model || 'kling-v1-5',
      pollIntervalMs: overrides?.pollIntervalMs || 5000,
      maxWaitMs: overrides?.maxWaitMs || 600_000,
    });
  }

  async createTask(input: CreateTaskInput): Promise<CreateTaskOutput> {
    // Real: POST to Kling API
    await this._delay(300 + Math.random() * 700);
    const externalTaskId = `kling_${uuid().slice(0, 12)}`;
    this._timers.set(externalTaskId, { start: Date.now(), duration: 3000 + Math.random() * 9000 });
    return { externalTaskId, estimatedSeconds: 60 };
  }

  async getStatus(externalTaskId: string): Promise<TaskStatus> {
    await this._delay(100 + Math.random() * 300);
    const timer = this._timers.get(externalTaskId) || { start: Date.now(), duration: 6000 };
    const elapsed = Date.now() - timer.start;
    const progress = Math.min(100, Math.round((elapsed / timer.duration) * 100));

    if (progress >= 100) {
      return {
        externalTaskId, status: 'completed', progress: 100,
        videoUrl: `https://storage.mock/kling/${externalTaskId}.mp4`,
        thumbnailUrl: `https://storage.mock/kling/${externalTaskId}_thumb.jpg`,
        duration: 5, error: '',
        metadata: { provider: 'kling', model: this.config.model, resolution: '1080p', fps: 24 },
      };
    }
    if (progress > 75 && Math.random() < 0.1) {
      return { externalTaskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Kling: API timeout', metadata: {} };
    }
    return { externalTaskId, status: 'processing', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: '', metadata: {} };
  }

  async downloadResult(videoUrl: string, outputPath: string): Promise<DownloadResult> {
    await this._delay(500 + Math.random() * 1000);
    const name = outputPath.split('/').pop() || `${uuid()}.mp4`;
    return { localPath: `output/videos/kling/${name}`, sizeBytes: 8_000_000 + Math.floor(Math.random() * 15_000_000) };
  }

  private _delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}
