import { v4 as uuid } from 'uuid';
import {
  IVideoProvider, ProviderName, ProviderConfig,
  CreateTaskInput, CreateTaskOutput, TaskStatus, DownloadResult,
} from '../interfaces/IVideoProvider';

export class VeoProvider implements IVideoProvider {
  readonly name: ProviderName = 'veo';
  readonly config: Readonly<ProviderConfig>;

  private _timers = new Map<string, { start: number; duration: number }>();

  constructor(overrides?: Partial<ProviderConfig>) {
    this.config = Object.freeze({
      name: 'veo',
      apiKey: overrides?.apiKey || '',
      baseUrl: overrides?.baseUrl || 'https://videogeneration.googleapis.com/v1/projects/my-project:generateVideo',
      model: overrides?.model || 'veo-2.0',
      pollIntervalMs: overrides?.pollIntervalMs || 5000,
      maxWaitMs: overrides?.maxWaitMs || 600_000,
    });
  }

  async createTask(input: CreateTaskInput): Promise<CreateTaskOutput> {
    // Real: POST to Google Veo API
    await this._delay(300 + Math.random() * 800);
    const externalTaskId = `veo_${uuid().slice(0, 12)}`;
    this._timers.set(externalTaskId, { start: Date.now(), duration: 4000 + Math.random() * 10000 });
    return { externalTaskId, estimatedSeconds: 90 };
  }

  async getStatus(externalTaskId: string): Promise<TaskStatus> {
    await this._delay(100 + Math.random() * 300);
    const timer = this._timers.get(externalTaskId) || { start: Date.now(), duration: 7000 };
    const elapsed = Date.now() - timer.start;
    const progress = Math.min(100, Math.round((elapsed / timer.duration) * 100));

    if (progress >= 100) {
      return {
        externalTaskId, status: 'completed', progress: 100,
        videoUrl: `https://storage.mock/veo/${externalTaskId}.mp4`,
        thumbnailUrl: `https://storage.mock/veo/${externalTaskId}_thumb.jpg`,
        duration: 8, error: '',
        metadata: { provider: 'veo', model: this.config.model, resolution: '4K', fps: 60 },
      };
    }
    if (progress > 70 && Math.random() < 0.05) {
      return { externalTaskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Veo: safety filter triggered', metadata: {} };
    }
    return { externalTaskId, status: 'processing', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: '', metadata: {} };
  }

  async downloadResult(videoUrl: string, outputPath: string): Promise<DownloadResult> {
    await this._delay(600 + Math.random() * 1200);
    const name = outputPath.split('/').pop() || `${uuid()}.mp4`;
    return { localPath: `output/videos/veo/${name}`, sizeBytes: 12_000_000 + Math.floor(Math.random() * 20_000_000) };
  }

  private _delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}
