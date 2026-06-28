'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { History, Search, Filter, Star, Play, Download, MoreVertical, X } from 'lucide-react';

interface Generation { id: string; title: string; provider: string; status: string; duration: number; createdAt: string; videoUrl: string; }

export default function HistoryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/videos', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setItems(d.items || d.data || []); }).catch(() => {}).finally(() => setLoading(false));
    const favs = JSON.parse(localStorage.getItem('favorite_videos') || '[]');
    setFavorites(new Set(favs));
  }, [token]);

  function toggleFavorite(id: string) {
    const next = new Set(favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavorites(next);
    localStorage.setItem('favorite_videos', JSON.stringify([...next]));
  }

  const filtered = items.filter(v => {
    if (search && !(v.title || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (providerFilter !== 'all' && v.provider !== providerFilter) return false;
    if (showFavorites && !favorites.has(v.id)) return false;
    return true;
  });

  if (loading) return <div className="text-gray-400 py-8">Loading generation history...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold flex items-center gap-2"><History size={24}/> Generation History</h2><p className="text-sm text-gray-500">{filtered.length} of {items.length} videos</p></div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search generations..." className="input pl-10"/>{search && <button onClick={()=>setSearch('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><X size={14}/></button>}</div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input w-36"><option value="all">All Status</option><option value="completed">Completed</option><option value="processing">Processing</option><option value="failed">Failed</option></select>
        <select value={providerFilter} onChange={e=>setProviderFilter(e.target.value)} className="input w-36"><option value="all">All Providers</option><option value="seedance">Seedance</option><option value="kling">Kling</option><option value="veo">Veo</option></select>
        <button onClick={()=>setShowFavorites(!showFavorites)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${showFavorites?'bg-yellow-50 border-yellow-300 text-yellow-700':'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'} flex items-center gap-2`}><Star size={16} fill={showFavorites?'currentColor':'none'}/>Favorites</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <History size={48} className="mx-auto text-gray-300 mb-3"/>
          <h3 className="text-lg font-semibold text-gray-700">{items.length===0?'No generations yet':'No results found'}</h3>
          <p className="text-sm text-gray-400 mt-1">{items.length===0?'Generate your first video to see it here':'Try adjusting your search or filters'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <div key={v.id} className="card group relative">
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {v.videoUrl ? <video src={v.videoUrl} className="w-full h-full object-cover"/> : <Play size={24} className="text-gray-400"/>}
              </div>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-900 truncate">{v.title || 'Untitled'}</p><p className="text-xs text-gray-500">{v.provider} · {v.duration}s · {new Date(v.createdAt).toLocaleDateString()}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>toggleFavorite(v.id)} className={`p-1 rounded ${favorites.has(v.id)?'text-yellow-500':'text-gray-300 hover:text-yellow-500'}`}><Star size={14} fill={favorites.has(v.id)?'currentColor':'none'}/></button>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${v.status==='completed'?'bg-green-100 text-green-700':v.status==='processing'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>{v.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
