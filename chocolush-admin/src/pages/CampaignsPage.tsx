import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, Megaphone, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const EMPTY = {
  name: '', description: '', banner_url: '', badge_text: '',
  start_date: '', end_date: '', active: false, discount_percent: '', theme_color: '#D4AF37'
};

const PRESETS = [
  { name: 'Ramadan Collection', badge_text: '🌙 Ramadan Special', theme_color: '#4A90D9' },
  { name: 'Eid Collection', badge_text: '✨ Eid Mubarak', theme_color: '#10B981' },
  { name: "Valentine's Day", badge_text: '❤️ Love Edition', theme_color: '#EF4444' },
  { name: 'Christmas Special', badge_text: '🎄 Xmas Edition', theme_color: '#10B981' },
  { name: 'Onam Collection', badge_text: '🌸 Onam Special', theme_color: '#F59E0B' },
  { name: 'New Year Edition', badge_text: '🎆 New Year', theme_color: '#8B5CF6' },
];

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<any[]>(DEMO_CAMPAIGNS);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [noTable, setNoTable] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    const fetch = async () => {
      try {
        const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
        if (!mounted) return;
        if (error) {
          if (error.message.includes('does not exist')) setNoTable(true);
          else console.warn('Campaigns:', error.message);
          setCampaigns(DEMO_CAMPAIGNS);
        } else {
          setCampaigns(data?.length ? data : DEMO_CAMPAIGNS);
        }
      } catch (e) {
        if (mounted) setCampaigns(DEMO_CAMPAIGNS);
      } finally {
        if (mounted) { setLoading(false); clearTimeout(timeout); }
      }
    };

    fetch();

    const channel = supabase.channel('campaigns-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, fetch)
      .subscribe();

    return () => { mounted = false; clearTimeout(timeout); supabase.removeChannel(channel); };
  }, []);

  const openAdd = (preset?: any) => {
    setForm(preset ? { ...EMPTY, ...preset } : EMPTY);
    setEditing(null); setModalOpen(true);
  };

  const openEdit = (c: any) => {
    setForm({
      name: c.name, description: c.description || '', banner_url: c.banner_url || '',
      badge_text: c.badge_text || '', start_date: c.start_date?.slice(0, 10) || '',
      end_date: c.end_date?.slice(0, 10) || '', active: c.active,
      discount_percent: c.discount_percent?.toString() || '', theme_color: c.theme_color || '#D4AF37'
    });
    setEditing(c); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Campaign name required'); return; }
    setSaving(true);
    const payload = {
      name: form.name, description: form.description, banner_url: form.banner_url,
      badge_text: form.badge_text, start_date: form.start_date || null,
      end_date: form.end_date || null, active: form.active,
      discount_percent: parseFloat(form.discount_percent) || 0, theme_color: form.theme_color
    };
    try {
      if (editing) {
        const { error } = await supabase.from('campaigns').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Campaign updated!');
      } else {
        const { error } = await supabase.from('campaigns').insert(payload);
        if (error) throw error;
        toast.success('Campaign created! 🎉');
      }
      setModalOpen(false);
      // Refresh
      const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (data) setCampaigns(data);
    } catch (e: any) {
      toast.error(noTable ? 'Run supabase-complete-setup.sql first' : 'Error: ' + e.message);
    }
    setSaving(false);
  };

  const toggleActive = async (campaign: any) => {
    if (noTable) { toast.error('Run supabase-complete-setup.sql first'); return; }
    try {
      if (!campaign.active) {
        await supabase.from('campaigns').update({ active: false }).neq('id', campaign.id);
      }
      await supabase.from('campaigns').update({ active: !campaign.active }).eq('id', campaign.id);
      const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
      if (data) setCampaigns(data);
      toast.success(campaign.active ? 'Campaign stopped' : `"${campaign.name}" is LIVE! 🎉`);
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await supabase.from('campaigns').delete().eq('id', id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success('Campaign deleted');
    } catch (e: any) { toast.error('Error: ' + e.message); }
  };

  const activeCampaign = campaigns.find(c => c.active);

  if (loading) return (
    <AdminLayout title="Campaigns">
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"/>
        <p className="text-gray-400 text-sm">Loading campaigns...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Festival Campaigns">
      {noTable && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-xl">
          <p className="text-yellow-400 text-sm">⚠️ campaigns table not found. Run <code className="bg-[#111827] px-1 rounded">chocolush-complete-setup.sql</code> in Supabase SQL Editor.</p>
        </div>
      )}

      {activeCampaign && (
        <div className="mb-6 p-4 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: activeCampaign.theme_color + '15', borderColor: activeCampaign.theme_color + '40' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeCampaign.theme_color }}/>
            <div>
              <p className="text-white font-bold">{activeCampaign.name} is LIVE</p>
              <p className="text-gray-400 text-xs">{activeCampaign.badge_text} {activeCampaign.discount_percent > 0 ? `· ${activeCampaign.discount_percent}% off` : ''}</p>
            </div>
          </div>
          <button onClick={() => toggleActive(activeCampaign)} className="text-xs bg-red-900/30 text-red-400 px-3 py-1.5 rounded-xl border border-red-800/50 hover:bg-red-900/50">Stop</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-400 text-sm">{campaigns.length} campaigns</p>
        <button onClick={() => openAdd()} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18}/> New Campaign
        </button>
      </div>

      {/* Preset Templates */}
      <div className="mb-6">
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.name} onClick={() => openAdd(p)}
              className="px-3 py-1.5 rounded-xl text-xs border border-[#374151] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition-colors">
              {p.badge_text}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map(campaign => (
          <motion.div key={campaign.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`bg-[#1f2937] border rounded-2xl overflow-hidden transition-all ${campaign.active ? 'border-opacity-60' : 'border-[#374151]'}`}
            style={{ borderColor: campaign.active ? campaign.theme_color : undefined }}>
            <div className="relative aspect-video bg-[#111827] overflow-hidden">
              {campaign.banner_url ? (
                <img src={campaign.banner_url} alt={campaign.name} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: campaign.theme_color + '20' }}>
                  <Megaphone size={32} style={{ color: campaign.theme_color }}/>
                </div>
              )}
              {campaign.active && (
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: campaign.theme_color }}/>
                  <span className="text-xs text-white">LIVE</span>
                </div>
              )}
              {campaign.badge_text && (
                <div className="absolute bottom-2 left-2 text-xs px-2 py-1 rounded-full bg-black/60 text-white">{campaign.badge_text}</div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-white font-bold mb-1">{campaign.name}</h3>
              {campaign.description && <p className="text-gray-400 text-xs mb-2 line-clamp-2">{campaign.description}</p>}
              {campaign.discount_percent > 0 && (
                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">{campaign.discount_percent}% off</span>
              )}
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleActive(campaign)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors ${campaign.active ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'}`}>
                  {campaign.active ? <><ToggleRight size={14}/> Deactivate</> : <><ToggleLeft size={14}/> Go Live</>}
                </button>
                <button onClick={() => openEdit(campaign)} className="w-9 h-9 bg-[#374151] rounded-xl flex items-center justify-center text-[#D4AF37]"><Edit size={14}/></button>
                <button onClick={() => deleteCampaign(campaign.id)} className="w-9 h-9 bg-[#374151] rounded-xl flex items-center justify-center text-red-400"><Trash2 size={14}/></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">{editing ? 'Edit Campaign' : 'New Campaign'}</h3>
                <button onClick={() => setModalOpen(false)}><X size={20} className="text-gray-400"/></button>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { key: 'name', label: 'Campaign Name *', placeholder: 'e.g. Ramadan Collection' },
                  { key: 'description', label: 'Description', placeholder: 'Short description' },
                  { key: 'badge_text', label: 'Badge Text', placeholder: '🌙 Ramadan Special' },
                  { key: 'banner_url', label: 'Banner Image URL', placeholder: 'https://...' },
                  { key: 'discount_percent', label: 'Discount %', placeholder: '10', type: 'number' },
                  { key: 'start_date', label: 'Start Date', placeholder: '', type: 'date' },
                  { key: 'end_date', label: 'End Date', placeholder: '', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
                    <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"/>
                  </div>
                ))}
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.theme_color} onChange={e => setForm((p: any) => ({ ...p, theme_color: e.target.value }))}
                      className="w-12 h-10 rounded-lg cursor-pointer border border-[#374151] bg-transparent"/>
                    <span className="text-gray-400 text-sm">{form.theme_color}</span>
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm((p: any) => ({ ...p, active: e.target.checked }))} className="accent-[#D4AF37] w-4 h-4"/>
                  <span className="text-gray-400 text-sm">Make this campaign LIVE immediately (shows on store)</span>
                </label>
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl text-sm">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create Campaign'}
                </button>
                <button onClick={() => setModalOpen(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

const DEMO_CAMPAIGNS = [
  { id:'1', name:'Ramadan Collection', badge_text:'🌙 Ramadan Special', description:'Special chocolates for Ramadan', discount_percent:10, theme_color:'#4A90D9', active:false, banner_url:'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600' },
  { id:'2', name:"Valentine's Day", badge_text:"❤️ Love Edition", description:'Romantic chocolate gift boxes', discount_percent:15, theme_color:'#EF4444', active:false, banner_url:'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600' },
];

export default CampaignsPage;
