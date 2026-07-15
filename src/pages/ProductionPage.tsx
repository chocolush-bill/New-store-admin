import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Factory, X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const ProductionPage = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', batch_qty: '', notes: '' });
  const [selectedIngredients, setSelectedIngredients] = useState<any[]>([{ ingredient_id: '', qty_per_piece: '', unit: 'g' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
    const channel = supabase.channel('admin-production')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_batches' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    const [{ data: b }, { data: p }, { data: i }] = await Promise.all([
      supabase.from('production_batches').select('*, products(name)').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, stock'),
      supabase.from('ingredients').select('*'),
    ]);
    setBatches(b?.length ? b : DEMO_BATCHES);
    setProducts(p || []);
    setIngredients(i || DEMO_INGREDIENTS);
  };

  const calcCostPerPiece = () => {
    if (!form.batch_qty) return 0;
    const qty = parseInt(form.batch_qty);
    const totalCost = selectedIngredients.reduce((s, si) => {
      const ing = ingredients.find(i => i.id === si.ingredient_id);
      if (!ing) return s;
      return s + (parseFloat(si.qty_per_piece) * qty * ing.cost_per_unit);
    }, 0);
    return qty > 0 ? totalCost / qty : 0;
  };

  const handleProduce = async () => {
    if (!form.product_id || !form.batch_qty) { toast.error('Select product and batch quantity'); return; }
    setSaving(true);
    const product = products.find(p => p.id === form.product_id);
    const batchQty = parseInt(form.batch_qty);
    const costPerPiece = calcCostPerPiece();
    const totalCost = costPerPiece * batchQty;

    // Deduct ingredients from stock
    for (const si of selectedIngredients) {
      if (!si.ingredient_id || !si.qty_per_piece) continue;
      const ing = ingredients.find(i => i.id === si.ingredient_id);
      if (!ing) continue;
      const totalDeduct = parseFloat(si.qty_per_piece) * batchQty;
      await supabase.from('ingredients').update({ quantity: Math.max(0, ing.quantity - totalDeduct) }).eq('id', ing.id);
    }

    // Increase product stock
    if (product) {
      await supabase.from('products').update({ stock: (product.stock || 0) + batchQty }).eq('id', form.product_id);
    }

    // Record batch
    await supabase.from('production_batches').insert({
      product_id: form.product_id, product_name: product?.name,
      batch_qty: batchQty, ingredients_used: selectedIngredients,
      cost_per_piece: costPerPiece, total_cost: totalCost, notes: form.notes,
    });

    toast.success(`✅ Produced ${batchQty}x ${product?.name}! Stock & ingredients updated.`);
    setSaving(false); setModalOpen(false);
    setForm({ product_id: '', batch_qty: '', notes: '' });
    setSelectedIngredients([{ ingredient_id: '', qty_per_piece: '', unit: 'g' }]);
    fetchAll();
  };

  const totalProduced = batches.reduce((s, b) => s + (b.batch_qty || 0), 0);
  const totalProductionCost = batches.reduce((s, b) => s + (b.total_cost || 0), 0);

  return (
    <AdminLayout title="Production">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Batches', value: batches.length, color: '#D4AF37' },
          { label: 'Total Produced', value: `${totalProduced} pcs`, color: '#10B981' },
          { label: 'Total Production Cost', value: `₹${totalProductionCost.toLocaleString()}`, color: '#3B82F6' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="font-bold text-xl mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-6">
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18} /> New Production Batch
        </button>
      </div>

      {/* Batch History */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#374151]">
          <h3 className="text-white font-semibold flex items-center gap-2"><Factory size={16} className="text-[#D4AF37]" /> Production History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#374151]">
              {['Product', 'Batch Qty', 'Cost/Piece', 'Total Cost', 'Ingredients Used', 'Date', 'Notes'].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {batches.map((batch: any) => (
                <tr key={batch.id} className="border-b border-[#374151]/50 hover:bg-[#374151]/20">
                  <td className="px-4 py-3 text-white text-sm font-medium">{batch.product_name || batch.products?.name}</td>
                  <td className="px-4 py-3 text-[#D4AF37] font-bold text-sm">{batch.batch_qty} pcs</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">₹{parseFloat(batch.cost_per_piece || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-white font-bold text-sm">₹{parseFloat(batch.total_cost || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {Array.isArray(batch.ingredients_used) ? `${batch.ingredients_used.filter((i: any) => i.ingredient_id).length} ingredients` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{new Date(batch.produced_at || batch.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{batch.notes || '—'}</td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-500">No production batches yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">New Production Batch</h3>
                <button onClick={() => setModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Product *</label>
                    <select value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                      <option value="">Select product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Batch Quantity (pieces) *</label>
                    <input type="number" value={form.batch_qty} onChange={e => setForm(p => ({ ...p, batch_qty: e.target.value }))} placeholder="e.g. 40"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-gray-400 text-xs uppercase tracking-wider">Ingredients Used (per piece)</label>
                    <button onClick={() => setSelectedIngredients(p => [...p, { ingredient_id: '', qty_per_piece: '', unit: 'g' }])}
                      className="text-[#D4AF37] text-xs hover:text-[#C4956A]">+ Add Ingredient</button>
                  </div>
                  <div className="space-y-2">
                    {selectedIngredients.map((si, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <select value={si.ingredient_id} onChange={e => setSelectedIngredients(prev => prev.map((x, idx) => idx === i ? { ...x, ingredient_id: e.target.value } : x))}
                          className="flex-1 bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl outline-none text-sm">
                          <option value="">Select ingredient</option>
                          {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.quantity} {ing.unit} left)</option>)}
                        </select>
                        <input type="number" value={si.qty_per_piece} onChange={e => setSelectedIngredients(prev => prev.map((x, idx) => idx === i ? { ...x, qty_per_piece: e.target.value } : x))}
                          placeholder="Qty/piece"
                          className="w-28 bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl outline-none text-sm placeholder-gray-600" />
                        <button onClick={() => setSelectedIngredients(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost Preview */}
                {form.batch_qty && selectedIngredients.some(si => si.ingredient_id && si.qty_per_piece) && (
                  <div className="bg-[#111827] rounded-xl p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Cost Preview</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Cost per piece</span>
                      <span className="text-[#D4AF37] font-bold">₹{calcCostPerPiece().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Total batch cost ({form.batch_qty} pcs)</span>
                      <span className="text-white font-bold">₹{(calcCostPerPiece() * parseInt(form.batch_qty)).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Notes</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any production notes"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                </div>

                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl p-3">
                  <p className="text-[#D4AF37] text-xs">⚡ This will automatically reduce ingredient stock and increase product stock in Supabase.</p>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleProduce} disabled={saving}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl text-sm">
                  {saving ? 'Producing...' : '🏭 Record Production'}
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

const DEMO_BATCHES = [
  { id: '1', product_name: 'Kunafa Chocolate Box', batch_qty: 40, cost_per_piece: 105, total_cost: 4200, produced_at: new Date().toISOString(), notes: 'Morning batch', ingredients_used: [{ ingredient_id: '1' }, { ingredient_id: '4' }] },
  { id: '2', product_name: 'Dark Truffle Box', batch_qty: 25, cost_per_piece: 180, total_cost: 4500, produced_at: new Date().toISOString(), notes: '' , ingredients_used: [] },
];
const DEMO_INGREDIENTS = [
  { id: '1', name: 'Belgian Chocolate', quantity: 2500, unit: 'g', cost_per_unit: 0.90 },
  { id: '2', name: 'Nutella', quantity: 1800, unit: 'g', cost_per_unit: 0.75 },
  { id: '3', name: 'Pistachio', quantity: 300, unit: 'g', cost_per_unit: 2.50 },
  { id: '4', name: 'Kadaifi', quantity: 800, unit: 'g', cost_per_unit: 0.48 },
];

export default ProductionPage;
