// ── Product ──
export interface Product {
  id: string;
  name: string;
  category: string;
  price: string;
  offer: string;
  salesPage: string;
  country: Country;
  persona: string;
  status: 'draft' | 'active' | 'archived';
  painPoints: PainPoint[];
  benefits: Benefit[];
  assets: Asset[];
  brief?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PainPoint { id: string; text: string; productId: string; }
export interface Benefit { id: string; text: string; productId: string; }

export interface Asset {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'video';
  rights: string;
  tags: string[];
  score: number;
  productId: string;
}

// ── Script ──
export type ScriptType = 'ugc' | 'review' | 'before_after' | 'pov' | 'problem_solution';
export type Language = 'en' | 'ms' | 'th' | 'fil' | 'es';
export type Country = 'US' | 'MY' | 'SG' | 'TH' | 'PH';

export interface ScriptScene {
  sceneNumber: number;
  voiceover: string;
  onScreenText: string;
  durationSeconds: number;
  camera: string;
  shotType: string;
}

export interface Script {
  id: string;
  scriptType: ScriptType;
  language: Language;
  languageName: string;
  durationSeconds: number;
  hook: { text: string; durationSeconds: number };
  scenes: ScriptScene[];
  cta: { text: string; durationSeconds: number };
  hashtags: string[];
  status: 'draft' | 'generated' | 'approved';
  productId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Campaign ──
export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  productId: string;
  product?: Product;
  videos: Video[];
  tasks: Task[];
  config?: CampaignConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignConfig {
  languages: Language[];
  scriptTypes: ScriptType[];
  generateVideo: boolean;
}

export interface Task {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: Record<string, unknown>;
  campaignId: string;
}

export interface Video {
  id: string;
  filename: string;
  url: string;
  localPath: string;
  duration: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  provider: string;
  metadata?: Record<string, unknown>;
  campaignId: string;
}

// ── API ──
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Queue ──
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}
