export type ProviderName = 'seedance' | 'kling' | 'veo' | 'runway';
export type VideoTaskStatus = 'pending' | 'submitted' | 'processing' | 'completed' | 'failed';

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  pollIntervalMs: number;
  maxWaitMs: number;
}

export interface CreateTaskInput {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  imageUrl?: string;
}

export interface CreateTaskOutput {
  externalTaskId: string;
  estimatedSeconds: number;
}

export interface TaskStatus {
  externalTaskId: string;
  status: VideoTaskStatus;
  progress: number;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  error: string;
  metadata: Record<string, unknown>;
}

export interface DownloadResult {
  localPath: string;
  sizeBytes: number;
}

export interface IVideoProvider {
  readonly name: ProviderName;
  readonly config: Readonly<ProviderConfig>;

  createTask(input: CreateTaskInput): Promise<CreateTaskOutput>;
  getStatus(externalTaskId: string): Promise<TaskStatus>;
  downloadResult(videoUrl: string, outputPath: string): Promise<DownloadResult>;
}
