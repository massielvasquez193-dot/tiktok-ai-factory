const B = '/api';
async function r<T>(path: string, o?: RequestInit): Promise<T> {
  const res = await fetch(B + path, { headers: { 'Content-Type': 'application/json' }, ...o });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error); }
  return res.json();
}
export const api = {
  getProducts: () => r<any[]>('/products'),
  getProduct: (id: string) => r<any>(`/products/${id}`),
  createProduct: (d: any) => r<any>('/products', { method: 'POST', body: JSON.stringify(d) }),
  updateProduct: (id: string, d: any) => r<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProduct: (id: string) => r<any>(`/products/${id}`, { method: 'DELETE' }),
  getCampaigns: () => r<any[]>('/campaigns'),
  getCampaign: (id: string) => r<any>(`/campaigns/${id}`),
  createCampaign: (d: any) => r<any>('/campaigns', { method: 'POST', body: JSON.stringify(d) }),
  updateCampaignStatus: (id: string, status: string) => r<any>(`/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  runPipeline: (d: any) => r<any>('/queue/pipeline', { method: 'POST', body: JSON.stringify(d) }),
  getQueueStats: () => r<any>('/queue/stats'),
  getScripts: (p?: Record<string, string>) => r<any[]>('/scripts' + (p ? '?' + new URLSearchParams(p) : '')),
};
