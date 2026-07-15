import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, AlertTriangle, FlaskConical, Search, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'boxes', 'packets'];
const EMPTY = { name: '', quantity: '', unit: 'g', cost_per_unit: '', min_stock: '', purchase_date: '', expiry_date: '', supplier: '', notes: '' };

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [wastage, setWastage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [wastageModal, setWastageModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [wastageForm, setWastageForm] = useState({ ingredient_id: '', quantity: '', reason: '' });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tab, setTab] = useState<'ingredients' | 'wastage'>('ingredients');
  const [noTable, setNoTable] = useState(false);

  useEffect(() => {
    fetchAll();
    const channel = supabase.channel('admin-ingredients')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wastage' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    try {
      const [{ data: ing, error: ingErr }, { data: wst }] = await Promise.all([
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('wastage').select('*, ingredients(name)').order('created_at', { ascending: false }),
      ]);
      if (ingErr) {
        if (ingErr.message.includes('does not exist') || ingErr.message.includes('schema cache')) {
          setNoTable(true);
        }
        console.warn('Ingredients:', ingErr.message);
        setIngredients(DEMO_INGREDIENTS);
      } else {
        setIngredients(ing && ing.length ? ing : []);
      }
      setWastage(wst || []);
    } catch (e) {
      console.warn('Ingredients fetch error:', e);
      setIngredients(DEMO_INGREDIENTS);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return null;
    const diff = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isLowStock = (ing: any) => parseFloat(ing.quantity) <= parseFloat(ing.min_stock || 0);
  const isExpiringSoon = (ing: any) => { const days = getDaysUntilExpiry(ing.expiry_date); return days !== null && days <= 7 && days >= 0; };
  const isExpired = (ing: any) => { const days = getDaysUntilExpiry(ing.expiry_date); return days !== null && days < 0; };

  const lowStockCount = ingredients.filter(isLowStock).length;
  const expiringSoonCount = ingredients.filter(isExpiringSoon).length;
  const expiredCount = ingredients.filter(isExpired).length;

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModalOpen(true); };
  const openEdit = (ing: any) => {
    setForm({ name: ing.name, quantity: ing.quantity?.toString(), unit: ing.unit, cost_per_unit: ing.cost_per_unit?.toString(), min_stock: ing.min_stock?.toString(), purchase_date: ing.purchase_date || '', expiry_date: ing.expiry_date || '', supplier: ing.supplier || '', notes: ing.notes || '' });
    setEditing(ing); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Ingredient name is required'); return; }
    if (form.quantity === '' || isNaN(parseFloat(form.quantity))) { toast.error('Enter a valid quantity'); return; }
    setSaving(true);

    const basePayload: any = {
      name: form.name.trim(),
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit || 'g',
      cost_per_unit: parseFloat(form.cost_per_unit) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      purchase_date: form.purchase_date || null,
      expiry_date: form.expiry_date || null,
      supplier: form.supplier || null,
      notes: form.notes || null,
    };

    try {
      if (editing) {
        const { error } = await supabase.from('ingredients')
          .update({ ...basePayload, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Ingredient updated!');
      } else {
        const { error } = await supabase.from('ingredients').insert(basePayload);
        if (error) throw error;
        toast.success('Ingredient added!');
      }
      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      if (msg.includes('does not exist') || msg.includes('schema cache')) {
        toast.error('Ingredients table not set up. Run chocolush-missing-tables.sql in Supabase.');
      } else if (msg.toLowerCase().includes('row-level security')) {
        toast.error('Permission denied. Make sure your account role is "admin" in profiles table.');
      } else {
        toast.error('Save failed: ' + msg);
      }
      console.error('Ingredient save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddWastage = async () => {
    if (!wastageForm.ingredient_id || !wastageForm.quantity) { toast.error('Select ingredient and quantity'); return; }
    const ing = ingredients.find(i => i.id === wastageForm.ingredient_id);
    if (!ing) return;
    const qty = parseFloat(wastageForm.quantity);
    const costLoss = qty * (ing.cost_per_unit || 0);
    await supabase.from('wastage').insert({ ingredient_id: ing.id, ingredient_name: ing.name, quantity: qty, unit: ing.unit, reason: wastageForm.reason, cost_loss: costLoss, date: new Date().toISOString().slice(0, 10) });
    // Reduce ingredient stock
    await supabase.from('ingredients').update({ quantity: Math.max(0, ing.quantity - qty) }).eq('id', ing.id);
    toast.success('Wastage recorded & stock updated!');
    setWastageModal(false); setWastageForm({ ingredient_id: '', quantity: '', reason: '' }); fetchAll();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('ingredients').delete().eq('id', id);
    toast.success('Deleted'); setDeleteConfirm(null); fetchAll();
  };

  const exportCSV = () => {
    const rows = ingredients.map(i => `${i.name},${i.quantity},${i.unit},${i.cost_per_unit},${i.min_stock},${i.expiry_date || ''}`);
    const csv = ['Name,Quantity,Unit,Cost/Unit,Min Stock,Expiry', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ingredients-${Date.now()}.csv`; a.click();
  };

  const filtered = ingredients.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  const totalValue = ingredients.reduce((s, i) => s + (i.quantity * i.cost_per_unit || 0), 0);

  return (
    <AdminLayout title="Ingredients & Inventory">
      {noTable && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-xl">
          <p className="text-yellow-600 text-sm">⚠️ ingredients table not found. Run <code className="bg-[#111827] px-1 rounded">chocolush-missing-tables.sql</code> in Supabase SQL Editor, then refresh.</p>
        </div>
      )}
      {/* Alerts */}
      {(lowStockCount > 0 || expiringSoonCount > 0 || expiredCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/50 rounded-xl px-4 py-2">
              <AlertTriangle size={16} className="text-yellow-400" />
              <span className="text-yellow-400 text-sm">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} low on stock</span>
            </div>
          )}
          {expiringSoonCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-900/20 border border-orange-800/50 rounded-xl px-4 py-2">
              <AlertTriangle size={16} className="text-orange-400" />
              <span className="text-orange-400 text-sm">{expiringSoonCount} expiring within 7 days</span>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-red-400 text-sm">{expiredCount} expired item{expiredCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items', value: ingredients.length, color: '#D4AF37' },
          { label: 'Inventory Value', value: `₹${totalValue.toLocaleString()}`, color: '#10B981' },
          { label: 'Low Stock', value: lowStockCount, color: '#F59E0B' },
          { label: 'Expiring Soon', value: expiringSoonCount + expiredCount, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="font-bold text-xl mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['ingredients', 'wastage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-[#D4AF37] text-[#111827]' : 'bg-[#1f2937] text-gray-400 border border-[#374151] hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'ingredients' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..."
                className="w-full bg-[#1f2937] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
            </div>
            <button onClick={exportCSV} className="flex items-center gap-2 border border-[#374151] text-[#D4AF37] px-4 py-2.5 rounded-xl text-sm hover:bg-[#374151] transition-colors">
              <Download size={16} /> Export
            </button>
            <button onClick={() => setWastageModal(true)} className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 text-red-400 px-4 py-2.5 rounded-xl text-sm hover:bg-red-900/50 transition-colors">
              + Record Wastage
            </button>
            <button onClick={openAdd} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              <Plus size={18} /> Add Ingredient
            </button>
          </div>

          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#374151]">
                  {['Ingredient', 'Stock', 'Cost/Unit', 'Total Value', 'Expiry', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map((ing: any) => {
                    const low = isLowStock(ing);
                    const expSoon = isExpiringSoon(ing);
                    const exp = isExpired(ing);
                    const days = getDaysUntilExpiry(ing.expiry_date);
                    return (
                      <tr key={ing.id} className={`border-b border-[#374151]/50 hover:bg-[#374151]/20 ${exp ? 'bg-red-900/10' : low ? 'bg-yellow-900/10' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FlaskConical size={14} className="text-[#D4AF37]" />
                            <span className="text-white text-sm font-medium">{ing.name}</span>
                          </div>
                          {ing.supplier && <p className="text-gray-500 text-xs ml-5">{ing.supplier}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className={`text-sm font-bold ${low ? 'text-yellow-400' : 'text-white'}`}>{ing.quantity} {ing.unit}</p>
                          {ing.min_stock > 0 && <p className="text-gray-500 text-xs">Min: {ing.min_stock} {ing.unit}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">₹{ing.cost_per_unit}/{ing.unit}</td>
                        <td className="px-4 py-3 text-[#D4AF37] text-sm font-bold">₹{(ing.quantity * ing.cost_per_unit).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {ing.expiry_date ? (
                            <div>
                              <p className={`text-xs font-medium ${exp ? 'text-red-400' : expSoon ? 'text-orange-400' : 'text-gray-400'}`}>
                                {new Date(ing.expiry_date).toLocaleDateString('en-IN')}
                              </p>
                              {days !== null && <p className={`text-xs ${exp ? 'text-red-400' : expSoon ? 'text-orange-400' : 'text-gray-500'}`}>
                                {exp ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                              </p>}
                            </div>
                          ) : <span className="text-gray-600 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {exp ? <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-full">Expired</span>
                            : expSoon ? <span className="text-xs bg-orange-900/30 text-orange-400 px-2 py-1 rounded-full">Expiring Soon</span>
                            : low ? <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded-full">Low Stock</span>
                            : <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">Good</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(ing)} className="w-8 h-8 bg-[#374151] rounded-lg flex items-center justify-center text-[#D4AF37]"><Edit size={13} /></button>
                            <button onClick={() => setDeleteConfirm(ing.id)} className="w-8 h-8 bg-[#374151] rounded-lg flex items-center justify-center text-red-400"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <div className="text-center py-12 text-gray-500">No ingredients found</div>}
            </div>
          </div>
        </>
      )}

      {tab === 'wastage' && (
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#374151] flex items-center justify-between">
            <h3 className="text-white font-semibold">Wastage Log</h3>
            <p className="text-red-400 text-sm font-bold">Total Loss: ₹{wastage.reduce((s, w) => s + (w.cost_loss || 0), 0).toFixed(2)}</p>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#374151]">
              {['Ingredient', 'Quantity', 'Cost Loss', 'Reason', 'Date'].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {wastage.map((w: any) => (
                <tr key={w.id} className="border-b border-[#374151]/50 hover:bg-[#374151]/20">
                  <td className="px-4 py-3 text-white text-sm">{w.ingredient_name || w.ingredients?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{w.quantity} {w.unit}</td>
                  <td className="px-4 py-3 text-red-400 font-bold text-sm">₹{w.cost_loss?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{w.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{w.date}</td>
                </tr>
              ))}
              {wastage.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">No wastage recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">{editing ? 'Edit Ingredient' : 'Add Ingredient'}</h3>
                <button onClick={() => setModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Ingredient Name *</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Belgian Chocolate"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Quantity *</label>
                    <input type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="500"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Unit</label>
                    <select value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Cost per Unit (₹)</label>
                    <input type="number" value={form.cost_per_unit} onChange={e => setForm(p => ({ ...p, cost_per_unit: e.target.value }))} placeholder="0.90"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Min Stock Alert</label>
                    <input type="number" value={form.min_stock} onChange={e => setForm(p => ({ ...p, min_stock: e.target.value }))} placeholder="100"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Purchase Date</label>
                    <input type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Expiry Date</label>
                    <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Supplier</label>
                    <input value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} placeholder="Supplier name"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Notes</label>
                    <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl text-sm">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Ingredient'}
                </button>
                <button onClick={() => setModalOpen(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wastage Modal */}
      <AnimatePresence>
        {wastageModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-red-900/50 rounded-2xl w-full max-w-md p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-red-400" /> Record Wastage</h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Ingredient *</label>
                  <select value={wastageForm.ingredient_id} onChange={e => setWastageForm(p => ({ ...p, ingredient_id: e.target.value }))}
                    className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                    <option value="">Select ingredient</option>
                    {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Quantity Wasted *</label>
                  <input type="number" value={wastageForm.quantity} onChange={e => setWastageForm(p => ({ ...p, quantity: e.target.value }))} placeholder="e.g. 300"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Reason</label>
                  <input value={wastageForm.reason} onChange={e => setWastageForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Burned batch, Expired"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddWastage} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm">Record Wastage</button>
                <button onClick={() => setWastageModal(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-red-900/50 rounded-2xl p-6 max-w-sm w-full text-center">
              <Trash2 size={32} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Delete Ingredient?</h3>
              <div className="flex gap-3 mt-4">
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm">Delete</button>
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-[#374151] text-gray-400 py-2.5 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

const DEMO_INGREDIENTS = [
  { id: '1', name: 'Belgian Chocolate', quantity: 2500, unit: 'g', cost_per_unit: 0.90, min_stock: 500, expiry_date: '2025-08-15', supplier: 'Choco Imports' },
  { id: '2', name: 'Nutella', quantity: 1800, unit: 'g', cost_per_unit: 0.75, min_stock: 400, expiry_date: '2025-09-20' },
  { id: '3', name: 'Pistachio', quantity: 300, unit: 'g', cost_per_unit: 2.50, min_stock: 200, expiry_date: '2025-06-01', supplier: 'Dry Fruit Hub' },
  { id: '4', name: 'Kadaifi / Kunafa', quantity: 800, unit: 'g', cost_per_unit: 0.48, min_stock: 300 },
  { id: '5', name: 'Packaging Boxes', quantity: 45, unit: 'pcs', cost_per_unit: 12, min_stock: 20 },
  { id: '6', name: 'Butter', quantity: 500, unit: 'g', cost_per_unit: 0.55, min_stock: 100, expiry_date: '2025-05-25' },
];

export default IngredientsPage;
