'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Star, Download, Filter, ArrowRight, Sparkles, Clock, TrendingUp, MessageSquare, Copy } from 'lucide-react';

const CATEGORIES = ['All','Beauty','Electronics','Fashion','Food','Health','Home','General'];
const TYPES = ['All','Script','Storyboard','Prompt','Composition','Full Pipeline'];

const MOCK_TEMPLATES = [
  { id:'1', name:'UGC Beauty Review', type:'full_pipeline', category:'Beauty', downloads:1240, rating:4.8, reviews:23, isFeatured:true, description:'Complete UGC pipeline for beauty products', tags:['ugc','beauty','review'] },
  { id:'2', name:'Problem Solution Script', type:'script', category:'General', downloads:980, rating:4.6, reviews:18, isFeatured:true, description:'Script template for problem→solution format', tags:['script','problem-solution'] },
  { id:'3', name:'Electronics POV', type:'full_pipeline', category:'Electronics', downloads:756, rating:4.5, reviews:12, isFeatured:false, description:'POV-style pipeline for gadgets', tags:['pov','electronics','unboxing'] },
  { id:'4', name:'Fashion Before/After', type:'storyboard', category:'Fashion', downloads:632, rating:4.3, reviews:9, isFeatured:false, description:'Before/After storyboard for fashion', tags:['before-after','fashion'] },
  { id:'5', name:'Food Viral Hook', type:'prompt', category:'Food', downloads:510, rating:4.7, reviews:15, isFeatured:true, description:'High-converting hook prompts for food videos', tags:['hook','food','viral'] },
  { id:'6', name:'Health Supplement Review', type:'full_pipeline', category:'Health', downloads:445, rating:4.4, reviews:11, isFeatured:false, description:'Health supplement review pipeline', tags:['review','health','supplement'] },
];

export default function TemplateMarketplace() {
  const [templates] = useState(MOCK_TEMPLATES);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');
  const [sort, setSort] = useState('featured');

  const featured = templates.filter(t => t.isFeatured).slice(0, 3);
  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.tags.some(tg => tg.includes(search.toLowerCase()))) return false;
    if (category !== 'All' && t.category !== category) return false;
    if (type !== 'All' && t.type !== type.replace(' ','_').toLowerCase()) return false;
    return true;
  }).sort((a, b) => sort === 'newest' ? 0 : sort === 'rating' ? b.rating - a.rating : sort === 'downloads' ? b.downloads - a.downloads : (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-brand-500 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4"><Sparkles className="inline" size={32}/> Template Marketplace</h1>
          <p className="text-lg text-brand-100 mb-8 max-w-xl mx-auto">Discover community-created templates to speed up your video production pipeline</p>
          <div className="relative max-w-lg mx-auto"><Search size={18} className="absolute left-4 top-3.5 text-gray-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 text-sm focus:ring-2 focus:ring-white/50"/></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Featured */}
        {!search && category === 'All' && type === 'All' && (
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Star size={18} className="text-yellow-500" fill="currentColor"/> Featured Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featured.map(t => (
                <div key={t.id} className="bg-white rounded-xl border-2 border-brand-100 shadow-sm hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between mb-2"><span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium">{t.type.replace('_',' ')}</span><span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Featured</span></div>
                  <h3 className="font-semibold mb-1">{t.name}</h3><p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4"><span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" fill="currentColor"/>{t.rating}</span><span className="flex items-center gap-1"><Download size={12}/>{t.downloads}</span><span>{t.reviews} reviews</span></div>
                  <button className="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 flex items-center justify-center gap-2"><Copy size={14}/>Clone Template</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">{CATEGORIES.map(c => <button key={c} onClick={()=>setCategory(c)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${category===c?'bg-white shadow-sm text-gray-900':'text-gray-500 hover:text-gray-700'}`}>{c}</button>)}</div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">{TYPES.map(t => <button key={t} onClick={()=>setType(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${type===t?'bg-white shadow-sm text-gray-900':'text-gray-500 hover:text-gray-700'}`}>{t}</button>)}</div>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5"><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top Rated</option><option value="downloads">Most Used</option></select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? <div className="text-center py-16"><Search size={40} className="mx-auto text-gray-300 mb-3"/><p className="text-gray-500">No templates found</p></div> :
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{t.type.replace('_',' ')}</span><span className="text-xs text-gray-400">{t.category}</span></div>
              <h3 className="font-semibold mb-1">{t.name}</h3><p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">{t.tags.map(tg => <span key={tg} className="text-xs bg-gray-50 px-2 py-0.5 rounded text-gray-500">{tg}</span>)}</div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4"><span className="flex items-center gap-1"><Star size={12} className="text-yellow-500" fill="currentColor"/>{t.rating}</span><span className="flex items-center gap-1"><Download size={12}/>{t.downloads}</span><span>{t.reviews} reviews</span></div>
              <div className="flex gap-2"><button className="flex-1 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 flex items-center justify-center gap-1"><Copy size={12}/>Clone</button><button className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"><Star size={14} className="text-gray-400"/></button></div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
