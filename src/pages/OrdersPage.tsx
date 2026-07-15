import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MessageCircle, ChevronDown, Eye, X, Receipt, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'confirmed', 'ready', 'delivered', 'cancelled'];
const STATUS_STYLES: any = {
  pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  confirmed: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
  ready: 'bg-purple-900/30 text-purple-400 border-purple-800/50',
  delivered: 'bg-green-900/30 text-green-400 border-green-800/50',
  cancelled: 'bg-red-900/30 text-red-400 border-red-800/50',
};
const WA_MESSAGES: any = {
  confirmed: (name: string, id: string) => `Hi ${name}! 🍫 Your Chocolush order #${id} has been *CONFIRMED*. We're now preparing your chocolates with love! Please share your payment (GPay/UPI) to +91 9400667313. Thank you! ✨`,
  ready: (name: string, id: string) => `Hi ${name}! 🍫 Great news! Your Chocolush order #${id} is *READY* and will be dispatched shortly. Please ensure someone is available to receive it. ✨`,
  delivered: (name: string, id: string) => `Hi ${name}! 🍫 Your Chocolush order #${id} has been *DELIVERED*. We hope you love every bite! Please leave us a review. Thank you for choosing Chocolush! ❤️`,
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) console.warn('Orders:', error.message);
      setOrders(data || []);
    } catch (e) {
      console.warn('Orders error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    if (selectedOrder?.id === orderId) setSelectedOrder((o: any) => ({ ...o, status }));
    toast.success(`Order marked as ${status}`);
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
      setDeleteConfirm(null);
      toast.success('Order deleted');
    } catch (e: any) {
      toast.error('Delete failed: ' + (e?.message || 'Unknown error'));
    }
  };

  const openWhatsApp = (order: any) => {
    const msg = WA_MESSAGES[order.status]?.(order.customer_name, order.id.slice(0, 8).toUpperCase()) ||
      `Hi ${order.customer_name}! 🍫 Regarding your Chocolush order #${order.id.slice(0, 8).toUpperCase()}.`;
    const phone = order.customer_phone?.replace(/\D/g, '') || '919400667313';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const sendToBilling = (order: any) => {
    sessionStorage.setItem('billing_order', JSON.stringify(order));
    navigate('/billing');
    toast.success('Order loaded in Billing POS!');
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.customer_name?.toLowerCase().includes(search.toLowerCase()) || o.id?.includes(search);
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout title="Orders">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or order ID..."
            className="w-full bg-[#1f2937] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1f2937] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {STATUSES.map(status => (
          <button key={status} onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`rounded-xl p-3 text-center border transition-all ${filterStatus === status ? STATUS_STYLES[status] : 'bg-[#1f2937] border-[#374151] text-gray-400 hover:border-gray-500'}`}>
            <p className="text-lg font-bold">{orders.filter(o => o.status === status).length}</p>
            <p className="text-xs capitalize">{status}</p>
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3 overflow-x-hidden">{[...Array(5)].map((_, i) => <div key={i} className="bg-[#1f2937] rounded-2xl h-24 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No orders found</div>
      ) : (
        <div className="space-y-3 overflow-x-hidden">
          {filtered.map(order => (
            <motion.div key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl p-5 hover:border-[#D4AF37]/20 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-[#D4AF37] text-xs font-bold">{order.customer_name?.charAt(0) || 'C'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold">{order.customer_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[order.status]}`}>{order.status}</span>
                    </div>
                    <p className="text-gray-500 text-xs">#{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-gray-400 text-xs mt-1">{order.customer_address}</p>
                    {order.order_items && (
                      <p className="text-gray-500 text-xs mt-1">{order.order_items.length} item(s)</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#D4AF37] font-bold text-lg">₹{order.total_amount?.toLocaleString()}</span>

                  {/* Status Update - click controlled (hover breaks on mobile touch) */}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenStatusId(openStatusId === order.id ? null : order.id); }}
                      className="flex items-center gap-1 bg-[#374151] hover:bg-[#4b5563] text-gray-400 px-3 py-1.5 rounded-lg text-xs transition-colors">
                      Update <ChevronDown size={12} />
                    </button>
                    {openStatusId === order.id && (
                      <div className="absolute left-0 top-full mt-1 w-36 bg-[#1f2937] border border-[#374151] rounded-xl shadow-2xl overflow-hidden z-30">
                        {STATUSES.map(s => (
                          <button key={s}
                            onClick={(e) => { e.stopPropagation(); updateStatus(order.id, s); setOpenStatusId(null); }}
                            className={`w-full text-left px-3 py-2.5 text-xs capitalize hover:bg-[#374151] transition-colors ${order.status === s ? 'text-[#D4AF37] font-semibold' : 'text-gray-400'}`}>
                            {order.status === s ? '✓ ' : ''}{s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); openWhatsApp(order); }}
                    className="flex items-center gap-1 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] px-3 py-1.5 rounded-lg text-xs transition-colors border border-[#25D366]/20">
                    <MessageCircle size={14} /> WhatsApp
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); sendToBilling(order); }}
                    className="flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] px-3 py-1.5 rounded-lg text-xs transition-colors border border-[#D4AF37]/20">
                    <Receipt size={14} /> Bill
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                    className="w-8 h-8 bg-[#374151] hover:bg-[#4b5563] rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <Eye size={14} />
                  </button>

                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(order); }}
                    className="w-8 h-8 bg-[#374151] hover:bg-red-100 rounded-lg flex items-center justify-center text-red-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold">Order Details</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-[#111827] rounded-xl p-4">
                  <p className="text-gray-400 text-xs tracking-widest uppercase mb-3">Customer</p>
                  <p className="text-white font-semibold">{selectedOrder.customer_name}</p>
                  <p className="text-gray-400 text-sm">{selectedOrder.customer_phone}</p>
                  <p className="text-gray-400 text-sm">{selectedOrder.customer_address}</p>
                </div>
                <div className="bg-[#111827] rounded-xl p-4">
                  <p className="text-gray-400 text-xs tracking-widest uppercase mb-3">Items</p>
                  <div className="space-y-2">
                    {selectedOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-400">{item.product_name} ×{item.quantity}</span>
                        <span className="text-[#D4AF37]">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-[#374151] mt-3 pt-3 flex justify-between font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-[#D4AF37]">₹{selectedOrder.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div className="bg-[#111827] rounded-xl p-4">
                    <p className="text-gray-400 text-xs tracking-widest uppercase mb-2">Notes</p>
                    <p className="text-gray-400 text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => openWhatsApp(selectedOrder)}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20B85A] text-white font-bold py-3 rounded-xl text-sm transition-colors">
                    <MessageCircle size={16} /> WhatsApp Customer
                  </button>
                  <button onClick={() => { sendToBilling(selectedOrder); setSelectedOrder(null); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold py-3 rounded-xl text-sm transition-colors">
                    <Receipt size={16} /> Generate Bill
                  </button>
                </div>
                <button onClick={() => setDeleteConfirm(selectedOrder)}
                  className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-500 hover:bg-red-50 font-bold py-3 rounded-xl text-sm transition-colors">
                  <Trash2 size={16} /> Delete Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-[#1f2937] border border-red-200 rounded-2xl p-6 max-w-sm w-full text-center">
              <AlertTriangle size={36} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">Delete Order?</h3>
              <p className="text-gray-400 text-sm mb-1">Order #{deleteConfirm.id.slice(0, 8).toUpperCase()} — {deleteConfirm.customer_name}</p>
              <p className="text-gray-500 text-xs mb-5">This permanently removes the order and its items. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => deleteOrder(deleteConfirm.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  Yes, Delete
                </button>
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm hover:bg-[#111827] transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default OrdersPage;
