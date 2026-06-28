const B = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function r<T>(path: string, o?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(B + path, { headers, ...o });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || e.message); }
  return res.json();
}
export const api = {
  // Products
  getProducts: () => r<any[]>('/products'),
  getProduct: (id: string) => r<any>(`/products/${id}`),
  createProduct: (d: any) => r<any>('/products', { method: 'POST', body: JSON.stringify(d) }),
  updateProduct: (id: string, d: any) => r<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteProduct: (id: string) => r<any>(`/products/${id}`, { method: 'DELETE' }),
  // Campaigns
  getCampaigns: () => r<any[]>('/campaigns'),
  getCampaign: (id: string) => r<any>(`/campaigns/${id}`),
  createCampaign: (d: any) => r<any>('/campaigns', { method: 'POST', body: JSON.stringify(d) }),
  updateCampaignStatus: (id: string, status: string) => r<any>(`/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  // Queue
  runPipeline: (d: any) => r<any>('/queue/pipeline', { method: 'POST', body: JSON.stringify(d) }),
  getQueueStats: () => r<any>('/queue/stats'),
  getScripts: (p?: Record<string, string>) => r<any[]>('/scripts' + (p ? '?' + new URLSearchParams(p) : '')),
  // Auth
  register: (d: any) => r<any>('/auth/register', { method: 'POST', body: JSON.stringify(d) }),
  login: (d: any) => r<any>('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => r<any>('/auth/logout', { method: 'POST' }),
  getMe: () => r<any>('/auth/me'),
  updateMe: (d: any) => r<any>('/auth/me', { method: 'PATCH', body: JSON.stringify(d) }),
  // Workspaces
  getWorkspaces: () => r<any>('/workspaces'),
  getWorkspace: (id: string) => r<any>(`/workspaces/${id}`),
  createWorkspace: (d: any) => r<any>('/workspaces', { method: 'POST', body: JSON.stringify(d) }),
  updateWorkspace: (id: string, d: any) => r<any>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteWorkspace: (id: string) => r<any>(`/workspaces/${id}`, { method: 'DELETE' }),
  getMembers: (id: string) => r<any>(`/workspaces/${id}/members`),
  inviteMember: (id: string, d: any) => r<any>(`/workspaces/${id}/invite`, { method: 'POST', body: JSON.stringify(d) }),
  updateMemberRole: (wsId: string, mId: string, role: string) => r<any>(`/workspaces/${wsId}/members/${mId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (wsId: string, mId: string) => r<any>(`/workspaces/${wsId}/members/${mId}`, { method: 'DELETE' }),
};
