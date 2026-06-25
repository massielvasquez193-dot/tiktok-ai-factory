import { v4 as uuid } from 'uuid';
import {
  IVideoProvider, ProviderName, ProviderConfig,
  CreateTaskInput, CreateTaskOutput, TaskStatus, DownloadResult,
} from '../interfaces/IVideoProvider';
import { getProviderMode, ProviderMode } from '../../lib/provider-mode';

export class VeoProvider implements IVideoProvider {
  readonly name: ProviderName = 'veo';
  readonly config: Readonly<ProviderConfig>;

  /** Configured mode (from unified system). */
  readonly mode: ProviderMode;

  /** True when mode === 'real' AND the API key is usable. */
  readonly realReady: boolean;

  private _timers = new Map<string, { start: number; duration: number }>();

  constructor(overrides?: Partial<ProviderConfig> & { mode?: ProviderMode }) {
    const apiKey = overrides?.apiKey || '';
    this.config = Object.freeze({
      name: 'veo',
      apiKey,
      baseUrl: overrides?.baseUrl || 'https://videogeneration.googleapis.com/v1/projects/my-project:generateVideo',
      model: overrides?.model || 'veo-2.0',
      pollIntervalMs: overrides?.pollIntervalMs || 5000,
      maxWaitMs: overrides?.maxWaitMs || 600_000,
    });

    if (overrides?.mode) {
      this.mode = overrides.mode;
    } else {
      this.mode = getProviderMode('veo').mode;
    }

    this.realReady = this.mode === 'real' && apiKey.length > 0;

    if (this.mode === 'real') {
      console.warn(`[VeoProvider] ⚠️  Real API not yet implemented${!this.realReady ? ' (key missing)' : ''} — falling back to mock.`);
    }

    console.log(`[VeoProvider] Mode: ${this.mode}`);
  }

  async createTask(input: CreateTaskInput): Promise<CreateTaskOutput> {
    if (this.mode === 'disabled') {
      throw new Error('[VeoProvider] Provider is disabled — refusing createTask');
    }
    if (this.mode === 'real') {
      throw new Error('[VeoProvider] Real API is not yet implemented (Phase 3D-2) — use mock mode instead');
    }
    // mock
    await this._delay(300 + Math.random() * 800);
    const externalTaskId = `veo_${uuid().slice(0, 12)}`;
    this._timers.set(externalTaskId, { start: Date.now(), duration: 4000 + Math.random() * 10000 });
    return { externalTaskId, estimatedSeconds: 90 };
  }

  async getStatus(externalTaskId: string): Promise<TaskStatus> {
    if (this.mode === 'disabled') {
      throw new Error('[VeoProvider] Provider is disabled — refusing getStatus');
    }
    if (this.mode === 'real') {
      throw new Error('[VeoProvider] Real API is not yet implemented (Phase 3D-2) — use mock mode instead');
    }
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
    if (this.mode === 'disabled') {
      throw new Error('[VeoProvider] Provider is disabled — refusing downloadResult');
    }
    if (this.mode === 'real') {
      throw new Error('[VeoProvider] Real API is not yet implemented (Phase 3D-2) — use mock mode instead');
    }
    await this._delay(600 + Math.random() * 1200);
    const name = outputPath.split('/').pop() || `${uuid()}.mp4`;
    return { localPath: `output/videos/veo/${name}`, sizeBytes: 12_000_000 + Math.floor(Math.random() * 20_000_000) };
  }

  private _delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }
}
