import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, X, User, Phone, MapPin, ShoppingBag, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const EMPTY = { name: '', phone: '', address: '', email: '' };

const CustomersPage = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
    supabase.from('orders').select('*').then(({ data }) => setOrders(data || []));
    const channel = supabase.channel('admin-customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchCustomers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) console.warn('Customers:', error.message);
      setCustomers(data?.length ? data : DEMO_CUSTOMERS);
    } catch (e) {
      setCustomers(DEMO_CUSTOMERS);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModalOpen(true); };
  const openEdit = (c: any) => { setForm({ name: c.name, phone: c.phone, address: c.address || '', email: c.email || '' }); setEditing(c); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    // Duplicate check
    if (!editing) {
      const dup = customers.find(c => c.phone === form.phone);
      if (dup) { toast.error('Customer with this phone already exists'); return; }
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('customers').update(form).eq('id', editing.id);
      if (error) toast.error('Update failed'); else toast.success('Customer updated!');
    } else {
      const { error } = await supabase.from('customers').insert(form);
      if (error) toast.error('Create failed'); else toast.success('Customer added!');
    }
    setSaving(false);
    setModalOpen(false);
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('customers').delete().eq('id', id);
    toast.success('Customer deleted');
    setDeleteConfirm(null);
    fetchCustomers();
  };

  const getCustomerOrders = (phone: string) => orders.filter(o => o.customer_phone === phone);
  const getCustomerTotal = (phone: string) => getCustomerOrders(phone).reduce((s, o) => s + (o.total_amount || 0), 0);
  const isVIP = (phone: string) => getCustomerTotal(phone) >= 2000;

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Customers">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email..."
            className="w-full bg-[#1f2937] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: customers.length, color: '#D4AF37' },
          { label: 'VIP Customers', value: customers.filter(c => isVIP(c.phone)).length, color: '#8B5CF6' },
          { label: 'Total Revenue', value: `₹${orders.reduce((s, o) => s + (o.total_amount || 0), 0).toLocaleString()}`, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="font-bold text-xl mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#1f2937] rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#374151]">
                  {['Customer', 'Phone', 'Orders', 'Total Spent', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-gray-400 text-xs tracking-widest uppercase px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(customer => {
                  const custOrders = getCustomerOrders(customer.phone);
                  const total = getCustomerTotal(customer.phone);
                  const vip = isVIP(customer.phone);
                  return (
                    <motion.tr key={customer.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="border-b border-[#374151]/50 hover:bg-[#374151]/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                            <span className="text-[#D4AF37] text-sm font-bold">{customer.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{customer.name}</p>
                            {customer.email && <p className="text-gray-500 text-xs">{customer.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{customer.phone}</td>
                      <td className="px-4 py-3 text-white text-sm">{custOrders.length}</td>
                      <td className="px-4 py-3 text-[#D4AF37] font-bold text-sm">₹{total.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {vip ? (
                          <span className="flex items-center gap-1 text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 px-2 py-1 rounded-full w-fit">
                            <Star size={10} fill="currentColor" /> VIP
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 bg-[#374151] px-2 py-1 rounded-full">Regular</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(customer)} className="w-8 h-8 bg-[#374151] hover:bg-[#4b5563] rounded-lg flex items-center justify-center text-[#D4AF37] transition-colors"><Edit size={14} /></button>
                          <button onClick={() => setDeleteConfirm(customer.id)} className="w-8 h-8 bg-[#374151] hover:bg-red-900/30 rounded-lg flex items-center justify-center text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">No customers found</div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-3 sm:mx-0">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">{editing ? 'Edit Customer' : 'Add Customer'}</h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { key: 'name', label: 'Full Name *', placeholder: 'Customer name', icon: <User size={14} /> },
                  { key: 'phone', label: 'Phone Number *', placeholder: '+91 XXXXX XXXXX', icon: <Phone size={14} /> },
                  { key: 'address', label: 'Address', placeholder: 'Street, City, Kerala', icon: <MapPin size={14} /> },
                  { key: 'email', label: 'Email', placeholder: 'customer@email.com', icon: null },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">{f.label}</label>
                    <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl text-sm transition-colors">
                  {saving ? 'Saving...' : editing ? 'Update' : 'Add Customer'}
                </button>
                <button onClick={() => setModalOpen(false)} className="px-5 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm hover:bg-[#374151]">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer Detail */}
      <AnimatePresence>
        {selectedCustomer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelectedCustomer(null); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">Customer Profile</h3>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#D4AF37] text-2xl font-bold">{selectedCustomer.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">{selectedCustomer.name}</p>
                    {isVIP(selectedCustomer.phone) && (
                      <span className="flex items-center gap-1 text-xs text-[#8B5CF6]"><Star size={10} fill="currentColor" /> VIP Customer</span>
                    )}
                  </div>
                </div>
                <div className="space-y-3 mb-5">
                  {[
                    { icon: <Phone size={14} />, value: selectedCustomer.phone },
                    { icon: <MapPin size={14} />, value: selectedCustomer.address },
                  ].filter(i => i.value).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-gray-400 text-sm">
                      <span className="text-[#D4AF37]">{item.icon}</span> {item.value}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#111827] rounded-xl p-3 text-center">
                    <p className="text-[#D4AF37] font-bold text-xl">{getCustomerOrders(selectedCustomer.phone).length}</p>
                    <p className="text-gray-500 text-xs">Total Orders</p>
                  </div>
                  <div className="bg-[#111827] rounded-xl p-3 text-center">
                    <p className="text-[#D4AF37] font-bold text-xl">₹{getCustomerTotal(selectedCustomer.phone).toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">Total Spent</p>
                  </div>
                </div>
                {getCustomerOrders(selectedCustomer.phone).length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs tracking-widest uppercase mb-3">Order History</p>
                    <div className="space-y-2">
                      {getCustomerOrders(selectedCustomer.phone).slice(0, 5).map(o => (
                        <div key={o.id} className="flex justify-between items-center bg-[#111827] rounded-xl px-3 py-2">
                          <div>
                            <p className="text-white text-xs">#{o.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-gray-500 text-xs">{new Date(o.created_at).toLocaleDateString('en-IN')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#D4AF37] text-xs font-bold">₹{o.total_amount?.toLocaleString()}</p>
                            <p className="text-gray-500 text-xs capitalize">{o.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-red-900/50 rounded-2xl p-6 max-w-sm w-full text-center">
              <Trash2 size={32} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Delete Customer?</h3>
              <p className="text-gray-400 text-sm mb-5">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm">Delete</button>
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-[#374151] text-gray-400 py-2.5 rounded-xl text-sm hover:bg-[#374151]">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

const DEMO_CUSTOMERS = [
  { id: '1', name: 'Fatima Noor', phone: '+91 98765 43210', address: 'Kasaragod, Kerala', email: 'fatima@email.com' },
  { id: '2', name: 'Rahul Menon', phone: '+91 87654 32109', address: 'Kozhikode, Kerala' },
  { id: '3', name: 'Aisha Rahman', phone: '+91 76543 21098', address: 'Kannur, Kerala', email: 'aisha@email.com' },
  { id: '4', name: 'Mohammed Ali', phone: '+91 65432 10987', address: 'Malappuram, Kerala' },
];

export default CustomersPage;
