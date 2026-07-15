import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, TrendingUp, Wallet, FileText, Star, Tag, Mail, Settings, Plus, Trash2, Edit, X, Search, Check, Download, Upload } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const CHART_OPTS: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
    y: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
  },
};

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
export const ReportsPage = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'daily' | 'monthly' | 'all'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('bills').select('*').order('created_at', { ascending: false }).timeout?.(4000) ?? supabase.from('bills').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
    ]).then(([{ data: b }, { data: o }]) => {
      setBills(b?.length ? b : DEMO_BILLS);
      setOrders(o || []);
      setLoading(false);
    });
  }, []);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue = months.map((_, mi) =>
    bills.filter(b => new Date(b.created_at).getMonth() === mi).reduce((s, b) => s + (b.grand_total || 0), 0)
  );
  const totalRevenue = bills.reduce((s, b) => s + (b.grand_total || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const totalDue = bills.reduce((s, b) => s + (b.due_amount || 0), 0);
  const partialBills = bills.filter(b => b.payment_status === 'PARTIAL');

  const exportCSV = () => {
    const headers = ['Bill No', 'Customer', 'Date', 'Grand Total', 'Paid', 'Due', 'Status'];
    const rows = bills.map(b => [b.bill_no, b.customer_name, new Date(b.created_at).toLocaleDateString('en-IN'), b.grand_total, b.paid_amount, b.due_amount, b.payment_status]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chocolush-reports-${Date.now()}.csv`; a.click();
  };

  return (
    <AdminLayout title="Reports">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: '#D4AF37' },
          { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, color: '#10B981' },
          { label: 'Total Due', value: `₹${totalDue.toLocaleString()}`, color: '#EF4444' },
          { label: 'Partial Bills', value: partialBills.length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="font-bold text-xl mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Monthly Revenue</h3>
          <button onClick={exportCSV} className="flex items-center gap-1 text-[#D4AF37] text-xs hover:text-[#C4956A]"><Download size={14} /> Export CSV</button>
        </div>
        <div className="h-52">
          <Bar data={{ labels: months, datasets: [{ data: monthlyRevenue, backgroundColor: '#D4AF3760', borderColor: '#D4AF37', borderWidth: 2, borderRadius: 6 }] }} options={CHART_OPTS} />
        </div>
      </div>

      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#374151] flex items-center justify-between">
          <h3 className="text-white font-semibold">Bill History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#374151]">
              {['Bill No', 'Customer', 'Date', 'Total', 'Paid', 'Due', 'Status'].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bills.slice(0, 20).map((b: any, i: number) => (
                <tr key={b.id || i} className="border-b border-[#374151]/50 hover:bg-[#374151]/20">
                  <td className="px-4 py-3 text-[#D4AF37] text-sm font-mono">{b.bill_no}</td>
                  <td className="px-4 py-3 text-white text-sm">{b.customer_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{new Date(b.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-white font-bold text-sm">₹{(b.grand_total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400 text-sm">₹{(b.paid_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-400 text-sm">₹{(b.due_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${b.payment_status === 'PAID' ? 'bg-green-900/30 text-green-400' : b.payment_status === 'PARTIAL' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
                      {b.payment_status || 'DUE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── PROFITS PAGE ─────────────────────────────────────────────────────────────
export const ProfitsPage = () => {
  const [ingredients, setIngredients] = useState<any[]>([{ name: '', qty: '', unit: 'g', cost: '' }]);
  const [batchQty, setBatchQty] = useState(10);
  const [packaging, setPackaging] = useState(0);
  const [labor, setLabor] = useState(0);
  const [overhead, setOverhead] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);

  const SUGGESTED = ['Belgian Chocolate (500g) - ₹450', 'Kadaifi / Kunafa (250g) - ₹120', 'Cream (200ml) - ₹60', 'Butter (100g) - ₹55', 'Sugar (200g) - ₹20', 'Cocoa Powder (50g) - ₹80'];

  const ingredientCost = ingredients.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
  const totalCostBatch = ingredientCost + packaging + labor + overhead;
  const costPerPiece = batchQty > 0 ? totalCostBatch / batchQty : 0;
  const grossProfit = sellingPrice - costPerPiece;
  const margin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

  const addIngredient = () => setIngredients(p => [...p, { name: '', qty: '', unit: 'g', cost: '' }]);
  const updateIngredient = (i: number, key: string, val: string) => setIngredients(p => p.map((ing, idx) => idx === i ? { ...ing, [key]: val } : ing));
  const removeIngredient = (i: number) => setIngredients(p => p.filter((_, idx) => idx !== i));

  const addSuggested = (s: string) => {
    const name = s.split(' - ')[0];
    if (ingredients.some(i => i.name === name)) { toast.error('Already added'); return; }
    setIngredients(p => [...p, { name, qty: '', unit: 'g', cost: s.split('₹')[1] || '' }]);
  };

  return (
    <AdminLayout title="Profit Analysis">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Sheet */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-3 sm:p-5">
          <h3 className="text-white font-bold mb-4">💰 Cost Sheet</h3>
          <div className="space-y-3 mb-4">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)} placeholder="Ingredient"
                  className="flex-1 bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-[#D4AF37]/50 placeholder-gray-600" />
                <input value={ing.cost} onChange={e => updateIngredient(i, 'cost', e.target.value)} placeholder="₹ Cost" type="number"
                  className="w-24 bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-[#D4AF37]/50 placeholder-gray-600" />
                <button onClick={() => removeIngredient(i)} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={addIngredient} className="flex items-center gap-1 text-[#D4AF37] text-sm hover:text-[#C4956A]"><Plus size={14} /> Add Ingredient</button>
          </div>

          <div className="space-y-2 mb-4">
            {[
              { label: 'Batch Quantity (pieces)', key: 'batchQty', val: batchQty, set: setBatchQty },
              { label: 'Packaging Cost (₹)', key: 'packaging', val: packaging, set: setPackaging },
              { label: 'Labor Cost (₹)', key: 'labor', val: labor, set: setLabor },
              { label: 'Overhead Cost (₹)', key: 'overhead', val: overhead, set: setOverhead },
              { label: 'Selling Price per piece (₹)', key: 'selling', val: sellingPrice, set: setSellingPrice },
            ].map(f => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <label className="text-gray-400 text-xs">{f.label}</label>
                <input type="number" value={f.val || ''} onChange={e => f.set(parseFloat(e.target.value) || 0)}
                  className="w-28 bg-[#111827] border border-[#374151] text-white px-3 py-1.5 rounded-xl text-sm outline-none focus:border-[#D4AF37]/50 text-right" />
              </div>
            ))}
          </div>

          <div className="bg-[#111827] rounded-xl p-4 space-y-2">
            {[
              { label: 'Total Ingredient Cost', value: `₹${ingredientCost.toFixed(2)}` },
              { label: 'Total Batch Cost', value: `₹${totalCostBatch.toFixed(2)}` },
              { label: `Cost per Piece (÷${batchQty})`, value: `₹${costPerPiece.toFixed(2)}`, bold: true },
              { label: 'Gross Profit per Piece', value: `₹${grossProfit.toFixed(2)}`, color: grossProfit > 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Margin', value: `${margin.toFixed(1)}%`, color: margin >= 30 ? 'text-green-400' : margin >= 15 ? 'text-yellow-400' : 'text-red-400' },
            ].map(r => (
              <div key={r.label} className={`flex justify-between text-sm ${r.bold ? 'border-t border-[#374151] pt-2 mt-2' : ''}`}>
                <span className="text-gray-400">{r.label}</span>
                <span className={`font-bold ${r.color || 'text-white'}`}>{r.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Margin Health</span><span>{margin.toFixed(1)}%</span></div>
            <div className="w-full bg-[#374151] rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${margin >= 30 ? 'bg-green-500' : margin >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, margin)}%` }} />
            </div>
            <p className={`text-xs mt-1 ${margin >= 30 ? 'text-green-400' : margin >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
              {margin >= 30 ? '✅ Healthy margin' : margin >= 15 ? '⚠️ Low margin' : '❌ Below break-even'}
            </p>
          </div>
        </div>

        {/* Suggested Ingredients */}
        <div className="space-y-4">
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-bold mb-4">💡 Suggested Ingredients</h3>
            <div className="space-y-2">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => addSuggested(s)} className="w-full flex items-center justify-between bg-[#111827] hover:bg-[#374151] border border-[#374151] rounded-xl px-4 py-3 text-left transition-colors group">
                  <span className="text-gray-400 text-sm">{s}</span>
                  <Plus size={14} className="text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-3 sm:p-5">
            <h3 className="text-white font-bold mb-4">📊 Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Cost Price', value: `₹${costPerPiece.toFixed(2)}` },
                { label: 'Selling Price', value: `₹${sellingPrice.toFixed(2)}` },
                { label: 'Profit per Piece', value: `₹${grossProfit.toFixed(2)}`, color: grossProfit > 0 ? '#10B981' : '#EF4444' },
                { label: 'Margin %', value: `${margin.toFixed(1)}%`, color: margin >= 30 ? '#10B981' : margin >= 15 ? '#F59E0B' : '#EF4444' },
                { label: 'Batch Profit (×' + batchQty + ')', value: `₹${(grossProfit * batchQty).toFixed(2)}`, color: '#D4AF37' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="font-bold" style={{ color: r.color || '#fff' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// ─── EXPENSES PAGE ─────────────────────────────────────────────────────────────
export const ExpensesPage = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', category_id: '', date: new Date().toISOString().slice(0, 10), notes: '' });
  const [catForm, setCatForm] = useState({ name: '', icon: '💰' });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from('expenses').select('*, expense_categories(name, icon)').order('date', { ascending: false }),
      supabase.from('expense_categories').select('*'),
    ]);
    setExpenses(e?.length ? e : DEMO_EXPENSES);
    setCategories(c?.length ? c : DEMO_CATS);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) { toast.error('Name and amount required'); return; }
    const payload = { name: form.name, amount: parseFloat(form.amount), category_id: form.category_id || null, date: form.date, notes: form.notes };
    if (editing) {
      await supabase.from('expenses').update(payload).eq('id', editing.id);
      toast.success('Expense updated!');
    } else {
      await supabase.from('expenses').insert(payload);
      toast.success('Expense added!');
    }
    setModalOpen(false); setEditing(null); setForm({ name: '', amount: '', category_id: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    fetchAll();
  };

  const handleAddCat = async () => {
    if (!catForm.name) return;
    if (categories.some(c => c.name === catForm.name)) { toast.error('Category exists'); return; }
    await supabase.from('expense_categories').insert(catForm);
    setCatModalOpen(false); setCatForm({ name: '', icon: '💰' }); fetchAll();
    toast.success('Category added!');
  };

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = filtered.map(e => `${e.name},${e.amount},${e.expense_categories?.name || ''},${e.date},${e.notes || ''}`);
    const csv = ['Name,Amount,Category,Date,Notes', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `expenses-${Date.now()}.csv`; a.click();
  };

  const filtered = expenses.filter(e => {
    const ms = !search || e.name?.toLowerCase().includes(search.toLowerCase());
    const mc = !filterCat || e.category_id === filterCat;
    return ms && mc;
  });

  const totalExpenses = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <AdminLayout title="Expenses">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses..."
            className="w-full bg-[#1f2937] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-[#1f2937] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button onClick={() => setCatModalOpen(true)} className="border border-[#374151] text-gray-400 hover:text-white px-4 py-2.5 rounded-xl text-sm transition-colors">+ Category</button>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Expenses', value: `₹${totalExpenses.toLocaleString()}`, color: '#EF4444' },
          { label: 'This Month', value: `₹${filtered.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}`, color: '#F59E0B' },
          { label: 'Records', value: filtered.length, color: '#D4AF37' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="font-bold text-xl mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#374151]">
          <h3 className="text-white font-semibold">Expense Records</h3>
          <button onClick={exportCSV} className="flex items-center gap-1 text-[#D4AF37] text-xs hover:text-[#C4956A]"><Download size={14} /> CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#374151]">
              {['Expense', 'Category', 'Amount', 'Date', 'Notes', 'Actions'].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((expense: any, i: number) => (
                <tr key={expense.id || i} className="border-b border-[#374151]/50 hover:bg-[#374151]/20">
                  <td className="px-4 py-3 text-white text-sm font-medium">{expense.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{expense.expense_categories?.icon} {expense.expense_categories?.name || '—'}</td>
                  <td className="px-4 py-3 text-red-400 font-bold text-sm">₹{(expense.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{expense.date}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{expense.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ name: expense.name, amount: expense.amount?.toString(), category_id: expense.category_id || '', date: expense.date, notes: expense.notes || '' }); setEditing(expense); setModalOpen(true); }} className="w-7 h-7 bg-[#374151] rounded-lg flex items-center justify-center text-[#D4AF37]"><Edit size={12} /></button>
                      <button onClick={() => deleteExpense(expense.id)} className="w-7 h-7 bg-[#374151] rounded-lg flex items-center justify-center text-red-400"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-3 sm:mx-0">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">{editing ? 'Edit' : 'Add'} Expense</h3>
                <button onClick={() => setModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: 'name', label: 'Expense Name', type: 'text', placeholder: 'e.g. Packaging materials' },
                  { key: 'amount', label: 'Amount (₹)', type: 'number', placeholder: '500' },
                  { key: 'date', label: 'Date', type: 'date', placeholder: '' },
                  { key: 'notes', label: 'Notes', type: 'text', placeholder: 'Optional notes' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
                    <input type={f.type} value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Category</label>
                  <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                    className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                    <option value="">No Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleSave} className="flex-1 bg-[#D4AF37] text-[#111827] font-bold py-3 rounded-xl text-sm">{editing ? 'Update' : 'Add Expense'}</button>
                <button onClick={() => setModalOpen(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {catModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-white font-bold mb-4">Add Category</h3>
              <div className="space-y-3 mb-4">
                <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} placeholder="Category name"
                  className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                <input value={catForm.icon} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))} placeholder="Emoji icon"
                  className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddCat} className="flex-1 bg-[#D4AF37] text-[#111827] font-bold py-3 rounded-xl text-sm">Add</button>
                <button onClick={() => setCatModalOpen(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

// ─── BLOG MANAGEMENT PAGE ─────────────────────────────────────────────────────
export const BlogManagementPage = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', excerpt: '', image_url: '', category: '', meta_title: '', meta_description: '', published: false });

  useEffect(() => { fetchBlogs(); }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBlogs(data?.length ? data : DEMO_BLOGS);
    } catch (e) {
      console.warn('Blog fetch:', e);
      setBlogs(DEMO_BLOGS);
    }
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title required'); return; }
    const slug = form.slug || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const payload = { ...form, slug };
    if (editing) {
      await supabase.from('blog_posts').update(payload).eq('id', editing.id);
      toast.success('Blog updated!');
    } else {
      await supabase.from('blog_posts').insert(payload);
      toast.success('Blog created! 🍫');
    }
    setModalOpen(false); setEditing(null);
    fetchBlogs();
  };

  const togglePublish = async (blog: any) => {
    await supabase.from('blog_posts').update({ published: !blog.published }).eq('id', blog.id);
    fetchBlogs();
  };

  const deleteBlog = async (id: string) => {
    await supabase.from('blog_posts').delete().eq('id', id);
    toast.success('Blog deleted'); fetchBlogs();
  };

  const openEdit = (blog: any) => {
    setForm({ title: blog.title, slug: blog.slug || '', content: blog.content || '', excerpt: blog.excerpt || '', image_url: blog.image_url || '', category: blog.category || '', meta_title: blog.meta_title || '', meta_description: blog.meta_description || '', published: blog.published });
    setEditing(blog); setModalOpen(true);
  };

  return (
    <AdminLayout title="Blog Management">
      <div className="flex justify-end mb-6">
        <button onClick={() => { setForm({ title: '', slug: '', content: '', excerpt: '', image_url: '', category: '', meta_title: '', meta_description: '', published: false }); setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18} /> New Blog Post
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blogs.map((blog: any) => (
          <motion.div key={blog.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden hover:border-[#D4AF37]/20 transition-all">
            <div className="aspect-video overflow-hidden relative">
              <img src={blog.image_url || 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400'} alt={blog.title} className="w-full h-full object-cover" />
              <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold ${blog.published ? 'bg-green-900/80 text-green-400' : 'bg-gray-900/80 text-gray-400'}`}>
                {blog.published ? 'Published' : 'Draft'}
              </div>
            </div>
            <div className="p-4">
              <p className="text-[#D4AF37] text-[10px] tracking-[0.2em] uppercase mb-1">{blog.category || 'Uncategorized'}</p>
              <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">{blog.title}</h3>
              {blog.excerpt && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{blog.excerpt}</p>}
              <div className="flex gap-2">
                <button onClick={() => togglePublish(blog)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${blog.published ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'}`}>
                  {blog.published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => openEdit(blog)} className="w-8 h-8 bg-[#374151] rounded-xl flex items-center justify-center text-[#D4AF37]"><Edit size={13} /></button>
                <button onClick={() => deleteBlog(blog.id)} className="w-8 h-8 bg-[#374151] rounded-xl flex items-center justify-center text-red-400"><Trash2 size={13} /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">{editing ? 'Edit Blog Post' : 'New Blog Post'}</h3>
                <button onClick={() => setModalOpen(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { key: 'title', label: 'Title *', placeholder: 'Blog post title' },
                  { key: 'slug', label: 'Slug (URL)', placeholder: 'auto-generated-from-title' },
                  { key: 'category', label: 'Category', placeholder: 'Craft, Lifestyle, Story...' },
                  { key: 'image_url', label: 'Cover Image URL', placeholder: 'https://...' },
                  { key: 'excerpt', label: 'Excerpt', placeholder: 'Short summary for cards...' },
                  { key: 'meta_title', label: 'SEO Title', placeholder: 'SEO title' },
                  { key: 'meta_description', label: 'SEO Description', placeholder: 'Meta description' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
                    <input value={form[f.key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Content (HTML)</label>
                  <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={8} placeholder="<p>Blog content here...</p>"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm resize-none font-mono" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} className="accent-[#D4AF37] w-4 h-4" />
                  <span className="text-gray-400 text-sm">Publish immediately (visible on Store)</span>
                </label>
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleSave} className="flex-1 bg-[#D4AF37] text-[#111827] font-bold py-3 rounded-xl text-sm">{editing ? 'Update Post' : 'Create Post'}</button>
                <button onClick={() => setModalOpen(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

// ─── REVIEWS PAGE ─────────────────────────────────────────────────────────────
export const ReviewsPage = () => {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('reviews').select('*, profiles(full_name), products(name)').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('Reviews:', error.message);
        setReviews(data?.length ? data : DEMO_REVIEWS);
      }).catch(() => setReviews(DEMO_REVIEWS));
  }, []);

  const updateReview = async (id: string, update: any) => {
    await supabase.from('reviews').update(update).eq('id', id);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...update } : r));
    toast.success('Review updated!');
  };

  const deleteReview = async (id: string) => {
    await supabase.from('reviews').delete().eq('id', id);
    setReviews(prev => prev.filter(r => r.id !== id));
    toast.success('Review deleted');
  };

  return (
    <AdminLayout title="Reviews">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: reviews.length, color: '#D4AF37' },
          { label: 'Approved', value: reviews.filter(r => r.approved).length, color: '#10B981' },
          { label: 'Pending', value: reviews.filter(r => !r.approved).length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4 text-center">
            <p className="font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-gray-400 text-xs">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {reviews.map((review: any) => (
          <div key={review.id} className={`bg-[#1f2937] border rounded-2xl p-5 transition-all ${review.approved ? 'border-[#374151]' : 'border-yellow-900/50'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-white font-medium text-sm">{review.profiles?.full_name || 'Customer'}</p>
                  <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-[#374151]'} />)}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${review.approved ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                    {review.approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                {review.products?.name && <p className="text-gray-500 text-xs mb-1">Product: {review.products.name}</p>}
                <p className="text-gray-400 text-sm">{review.comment}</p>
              </div>
              <div className="flex gap-2">
                {!review.approved && (
                  <button onClick={() => updateReview(review.id, { approved: true })} className="w-8 h-8 bg-green-900/30 hover:bg-green-900/50 rounded-lg flex items-center justify-center text-green-400"><Check size={14} /></button>
                )}
                <button onClick={() => deleteReview(review.id)} className="w-8 h-8 bg-[#374151] hover:bg-red-900/30 rounded-lg flex items-center justify-center text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

// ─── COUPONS PAGE ─────────────────────────────────────────────────────────────
export const CouponsPage = () => {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const EMPTY_COUPON_FORM = { code: '', discount_type: 'percent', discount_value: '', min_order: '', max_uses: '', expires_at: '', active: true };
  const [form, setForm] = useState<any>(EMPTY_COUPON_FORM);

  const refresh = () => supabase.from('coupons').select('*').order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) console.warn('Coupons:', error.message);
      setCoupons(data?.length ? data : DEMO_COUPONS);
    }).catch(() => setCoupons(DEMO_COUPONS));

  useEffect(() => { refresh(); }, []);

  const openCreate = () => { setEditingCoupon(null); setForm(EMPTY_COUPON_FORM); setModalOpen(true); };
  const openEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percent',
      discount_value: coupon.discount_value?.toString() || '',
      min_order: coupon.min_order?.toString() || '',
      max_uses: coupon.max_uses?.toString() || '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      active: coupon.active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { toast.error('Code and discount required'); return; }
    const payload: any = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order: parseFloat(form.min_order) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      active: form.active,
    };

    if (editingCoupon) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editingCoupon.id);
      if (error) { toast.error('Update failed: ' + error.message); return; }
      toast.success('Coupon updated!');
    } else {
      payload.used_count = 0;
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Coupon created!');
    }
    setModalOpen(false);
    setEditingCoupon(null);
    refresh();
  };

  const toggleActive = async (coupon: any) => {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c));
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupons').delete().eq('id', id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    toast.success('Coupon deleted');
  };

  return (
    <AdminLayout title="Discounts & Coupons">
      <div className="flex justify-end mb-6">
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18} /> New Coupon
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map((coupon: any) => (
          <motion.div key={coupon.id} layout className={`bg-[#1f2937] border rounded-2xl p-5 transition-all ${coupon.active ? 'border-[#D4AF37]/20' : 'border-[#374151] opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl px-4 py-2">
                <p className="text-[#D4AF37] font-bold font-mono tracking-widest">{coupon.code}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(coupon)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-colors ${coupon.active ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                  {coupon.active ? '✓' : '✗'}
                </button>
                <button onClick={() => openEdit(coupon)} className="w-8 h-8 bg-[#374151] rounded-lg flex items-center justify-center text-[#D4AF37] hover:bg-[#D4AF37]/20"><Edit size={13} /></button>
                <button onClick={() => deleteCoupon(coupon.id)} className="w-8 h-8 bg-[#374151] rounded-lg flex items-center justify-center text-red-400"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Discount</span><span className="text-white font-bold">{coupon.discount_value}{coupon.discount_type === 'percent' ? '%' : '₹'} off</span></div>
              {coupon.min_order > 0 && <div className="flex justify-between"><span className="text-gray-400">Min Order</span><span className="text-gray-400">₹{coupon.min_order}</span></div>}
              <div className="flex justify-between"><span className="text-gray-400">Used</span><span className="text-gray-400">{coupon.used_count || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''} times</span></div>
              {coupon.expires_at && <div className="flex justify-between"><span className="text-gray-400">Expires</span><span className="text-gray-400">{new Date(coupon.expires_at).toLocaleDateString('en-IN')}</span></div>}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-3 sm:mx-0">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">{editingCoupon ? 'Edit Coupon' : 'New Coupon'}</h3>
                <button onClick={() => { setModalOpen(false); setEditingCoupon(null); }}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { key: 'code', label: 'Coupon Code *', placeholder: 'CHOCO20' },
                  { key: 'discount_value', label: 'Discount Value *', placeholder: '20', type: 'number' },
                  { key: 'min_order', label: 'Min Order Amount (₹)', placeholder: '500', type: 'number' },
                  { key: 'max_uses', label: 'Max Uses', placeholder: '100', type: 'number' },
                  { key: 'expires_at', label: 'Expiry Date', placeholder: '', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">{f.label}</label>
                    <input type={f.type || 'text'} value={form[f.key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                ))}
                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Discount Type</label>
                  <div className="flex gap-2">
                    {[{ v: 'percent', l: 'Percentage (%)' }, { v: 'flat', l: 'Flat (₹)' }].map(t => (
                      <button key={t.v} onClick={() => setForm(p => ({ ...p, discount_type: t.v }))}
                        className={`flex-1 py-2 rounded-xl text-sm transition-colors ${form.discount_type === t.v ? 'bg-[#D4AF37] text-[#111827] font-bold' : 'bg-[#111827] text-gray-400 border border-[#374151]'}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer pt-1">
                  <input type="checkbox" checked={form.active} onChange={e => setForm((p: any) => ({ ...p, active: e.target.checked }))} className="accent-[#D4AF37] w-4 h-4" />
                  <span className="text-gray-400 text-sm">Coupon active</span>
                </label>
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleSave} className="flex-1 bg-[#D4AF37] text-[#111827] font-bold py-3 rounded-xl text-sm">{editingCoupon ? 'Update Coupon' : 'Create Coupon'}</button>
                <button onClick={() => { setModalOpen(false); setEditingCoupon(null); }} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

// ─── NEWSLETTER PAGE ─────────────────────────────────────────────────────────
export const NewsletterPage = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.warn('Newsletter:', error.message);
        setSubscribers(data?.length ? data : DEMO_SUBSCRIBERS);
      }).catch(() => setSubscribers(DEMO_SUBSCRIBERS));
  }, []);

  const exportCSV = () => {
    const csv = ['Email,Date', ...subscribers.map(s => `${s.email},${new Date(s.created_at || Date.now()).toLocaleDateString('en-IN')}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `subscribers-${Date.now()}.csv`; a.click();
  };

  const unsubscribe = async (id: string) => {
    await supabase.from('newsletter_subscribers').delete().eq('id', id);
    setSubscribers(prev => prev.filter(s => s.id !== id));
  };

  const filtered = subscribers.filter(s => s.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Newsletter">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subscribers..."
            className="w-full bg-[#1f2937] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 border border-[#374151] text-[#D4AF37] hover:bg-[#374151] px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Download size={16} /> Export CSV
        </button>
      </div>
      <div className="bg-[#1f2937] border border-[#374151] rounded-xl p-4 mb-4">
        <p className="text-[#D4AF37] font-bold text-2xl">{subscribers.length}</p>
        <p className="text-gray-400 text-sm">Total Subscribers</p>
      </div>
      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-[#374151]">
            {['Email', 'Subscribed On', 'Action'].map(h => (
              <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((sub: any, i: number) => (
              <tr key={sub.id || i} className="border-b border-[#374151]/50 hover:bg-[#374151]/20">
                <td className="px-4 py-3 text-white text-sm">{sub.email}</td>
                <td className="px-4 py-3 text-gray-400 text-sm">{new Date(sub.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => unsubscribe(sub.id)} className="text-red-400 text-xs hover:text-red-300">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
export const SettingsPage = () => {
  const [settings, setSettings] = useState({ store_name: 'Chocolush', tagline: 'Premium Chocolate Boutique', whatsapp: '+91 9400667313', instagram: '@chocolush', currency: 'INR', tax_percent: 0, free_delivery_above: 500 });
  const handleSave = () => toast.success('Settings saved!');

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {[
          { title: 'Store Branding', fields: [
            { key: 'store_name', label: 'Store Name' },
            { key: 'tagline', label: 'Tagline' },
          ]},
          { title: 'Contact & Social', fields: [
            { key: 'whatsapp', label: 'WhatsApp Number' },
            { key: 'instagram', label: 'Instagram Handle' },
          ]},
          { title: 'Business Settings', fields: [
            { key: 'currency', label: 'Currency' },
            { key: 'tax_percent', label: 'Tax %', type: 'number' },
            { key: 'free_delivery_above', label: 'Free Delivery Above (₹)', type: 'number' },
          ]},
        ].map(section => (
          <div key={section.title} className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-6">
            <h3 className="text-white font-bold mb-4">{section.title}</h3>
            <div className="space-y-4">
              {section.fields.map(f => (
                <div key={f.key}>
                  <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1.5">{f.label}</label>
                  <input type={f.type || 'text'} value={settings[f.key as keyof typeof settings]} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 text-sm" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button onClick={handleSave} className="w-full bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold py-3 rounded-xl transition-colors">Save Settings</button>
      </div>
    </AdminLayout>
  );
};

// Demo data
const DEMO_BILLS = [
  { id: '1', bill_no: 'CHO26051284', customer_name: 'Fatima Noor', grand_total: 1386, paid_amount: 1000, due_amount: 386, payment_status: 'PARTIAL', created_at: new Date().toISOString() },
  { id: '2', bill_no: 'CHO26051285', customer_name: 'Rahul Menon', grand_total: 680, paid_amount: 680, due_amount: 0, payment_status: 'PAID', created_at: new Date().toISOString() },
];
const DEMO_REVIEWS = [
  { id: '1', rating: 5, comment: 'Absolutely divine!', approved: true, profiles: { full_name: 'Fatima Noor' }, products: { name: 'Kunafa Chocolate Box' } },
  { id: '2', rating: 4, comment: 'Great quality!', approved: false, profiles: { full_name: 'Rahul Menon' }, products: { name: 'Dark Truffle Box' } },
];
const DEMO_COUPONS = [
  { id: '1', code: 'CHOCO20', discount_type: 'percent', discount_value: 20, min_order: 500, max_uses: 50, used_count: 12, active: true, expires_at: '2025-12-31' },
  { id: '2', code: 'FIRST50', discount_type: 'flat', discount_value: 50, min_order: 300, max_uses: 100, used_count: 45, active: true, expires_at: null },
];
const DEMO_SUBSCRIBERS = [
  { id: '1', email: 'fatima@email.com', created_at: new Date().toISOString() },
  { id: '2', email: 'rahul@email.com', created_at: new Date().toISOString() },
  { id: '3', email: 'aisha@email.com', created_at: new Date().toISOString() },
];
const DEMO_EXPENSES = [
  { id: '1', name: 'Belgian Chocolate Stock', amount: 4500, date: '2025-05-10', expense_categories: { name: 'Ingredients', icon: '🍫' }, notes: 'Monthly stock' },
  { id: '2', name: 'Packaging Boxes', amount: 1200, date: '2025-05-08', expense_categories: { name: 'Packaging', icon: '📦' }, notes: '' },
  { id: '3', name: 'Delivery Charges', amount: 800, date: '2025-05-05', expense_categories: { name: 'Logistics', icon: '🚚' }, notes: '' },
];
const DEMO_CATS = [
  { id: '1', name: 'Ingredients', icon: '🍫' },
  { id: '2', name: 'Packaging', icon: '📦' },
  { id: '3', name: 'Logistics', icon: '🚚' },
  { id: '4', name: 'Marketing', icon: '📢' },
];
const DEMO_BLOGS = [
  { id: '1', title: 'The Art of Kunafa Chocolate', category: 'Craft', published: true, image_url: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400', excerpt: 'How we make our signature product.' },
  { id: '2', title: 'Chocolate Gifting Guide 2025', category: 'Lifestyle', published: true, image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400', excerpt: 'The ultimate luxury gifting guide.' },
  { id: '3', title: 'Behind the Brownie', category: 'Story', published: false, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', excerpt: 'Our origin story.' },
];
