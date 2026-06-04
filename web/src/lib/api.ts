// API client for the backend

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Products
export const api = {
  // Products
  getProducts: () => request<any[]>('/products'),
  getProduct: (id: string) => request<any>(`/products/${id}`),
  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),

  // Scripts
  getScripts: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/scripts${qs}`);
  },
  createScript: (data: any) => request<any>('/scripts', { method: 'POST', body: JSON.stringify(data) }),

  // Campaigns
  getCampaigns: () => request<any[]>('/campaigns'),
  getCampaign: (id: string) => request<any>(`/campaigns/${id}`),
  createCampaign: (data: any) => request<any>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaignStatus: (id: string, status: string) =>
    request<any>(`/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Pipeline
  runPipeline: (data: { productId: string; languages?: string[]; scriptTypes?: string[]; generateVideo?: boolean }) =>
    request<any>('/pipeline/run', { method: 'POST', body: JSON.stringify(data) }),
  getPipelineStatus: (campaignId: string) => request<any>(`/pipeline/status/${campaignId}`),

  // Research
  getResearchVideos: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/research/videos${qs}`);
  },
  getResearchTemplates: () => request<any[]>('/research/templates'),
};
