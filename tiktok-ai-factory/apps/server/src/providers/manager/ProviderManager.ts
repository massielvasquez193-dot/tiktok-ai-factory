import { IVideoProvider, ProviderName, CreateTaskInput } from '../interfaces/IVideoProvider';
import { SeedanceProvider } from '../seedance/SeedanceProvider';
import { KlingProvider } from '../kling/KlingProvider';
import { VeoProvider } from '../veo/VeoProvider';
import { prisma } from '../../index';
import { v4 as uuid } from 'uuid';

export class ProviderManager {
  private providers = new Map<ProviderName, IVideoProvider>();
  private pollers = new Map<string, NodeJS.Timeout>();

  private static _instance: ProviderManager;

  static get instance(): ProviderManager {
    if (!this._instance) {
      this._instance = new ProviderManager();
      this._instance.register(new SeedanceProvider({
        apiKey: process.env.SEEDANCE_API_KEY,
        baseUrl: process.env.SEEDANCE_BASE_URL,
      }));
      this._instance.register(new KlingProvider({
        apiKey: process.env.KLING_API_KEY,
        baseUrl: process.env.KLING_BASE_URL,
      }));
      this._instance.register(new VeoProvider({
        apiKey: process.env.VEO_API_KEY,
        baseUrl: process.env.VEO_BASE_URL,
      }));
    }
    return this._instance;
  }

  register(provider: IVideoProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: ProviderName): IVideoProvider | undefined {
    return this.providers.get(name);
  }

  list(): { name: ProviderName; model: string; baseUrl: string }[] {
    return Array.from(this.providers.values()).map(p => ({
      name: p.name, model: p.config.model, baseUrl: p.config.baseUrl,
    }));
  }

  get activeCount(): number {
    return this.pollers.size;
  }

  /**
   * Submit a prompt to its provider and start polling.
   */
  async submit(promptId: string, providerName: ProviderName): Promise<{ dbTaskId: string; externalTaskId: string }> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown provider: ${providerName}`);

    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: { storyboard: { include: { script: { include: { product: true } } } } },
    });
    if (!prompt) throw new Error('Prompt not found');

    const dbTaskId = uuid();
    await prisma.videoTask.create({
      data: {
        id: dbTaskId, promptId, model: providerName, provider: providerName,
        status: 'pending', progress: 0,
      },
    });

    try {
      await prisma.videoTask.update({ where: { id: dbTaskId }, data: { status: 'submitted', progress: 5, startedAt: new Date() } });

      const { externalTaskId } = await provider.createTask({
        prompt: prompt.prompt,
        negativePrompt: prompt.negativePrompt,
        duration: 5,
        aspectRatio: '9:16',
        resolution: '720p',
      });

      await prisma.videoTask.update({ where: { id: dbTaskId }, data: { externalTaskId, status: 'processing', progress: 10 } });

      this._startPolling(dbTaskId, externalTaskId, provider);
      return { dbTaskId, externalTaskId };
    } catch (err: any) {
      await prisma.videoTask.update({ where: { id: dbTaskId }, data: { status: 'failed', error: `Submit: ${err.message}` } });
      throw err;
    }
  }

  /** Batch submit - detects provider from each prompt's model field. */
  async submitBatch(promptIds: string[]): Promise<{ dbTaskId: string }[]> {
    const results = [];
    for (const pid of promptIds) {
      const prompt = await prisma.prompt.findUnique({ where: { id: pid } });
      if (!prompt) continue;
      const providerName = (prompt.model || 'seedance') as ProviderName;
      const r = await this.submit(pid, providerName);
      results.push(r);
    }
    return results;
  }

  cancel(dbTaskId: string): boolean {
    const interval = this.pollers.get(dbTaskId);
    if (interval) { clearInterval(interval); this.pollers.delete(dbTaskId); return true; }
    return false;
  }

  private _startPolling(dbTaskId: string, externalTaskId: string, provider: IVideoProvider): void {
    const timeout = setTimeout(() => {
      this.cancel(dbTaskId);
      prisma.videoTask.update({ where: { id: dbTaskId }, data: { status: 'failed', error: 'Timed out after 10min' } }).catch(() => {});
    }, provider.config.maxWaitMs);

    const interval = setInterval(async () => {
      try {
        const status = await provider.getStatus(externalTaskId);

        if (status.status === 'completed') {
          clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);
          const dl = await provider.downloadResult(status.videoUrl, `output/videos/${provider.name}/${dbTaskId}.mp4`);
          await prisma.videoTask.update({
            where: { id: dbTaskId },
            data: {
              status: 'completed', progress: 100, videoUrl: dl.localPath,
              thumbnailUrl: status.thumbnailUrl, duration: status.duration,
              completedAt: new Date(), metadata: JSON.stringify(status.metadata || {}),
            },
          });
        } else if (status.status === 'failed') {
          clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);
          await prisma.videoTask.update({ where: { id: dbTaskId }, data: { status: 'failed', progress: status.progress, error: status.error } });
        } else {
          await prisma.videoTask.update({ where: { id: dbTaskId }, data: { status: 'processing', progress: Math.max(10, status.progress) } });
        }
      } catch (err: any) {
        clearInterval(interval); clearTimeout(timeout); this.pollers.delete(dbTaskId);
        await prisma.videoTask.update({ where: { id: dbTaskId }, data: { status: 'failed', error: `Poll: ${err.message}` } });
      }
    }, provider.config.pollIntervalMs);

    this.pollers.set(dbTaskId, interval);
  }
}
