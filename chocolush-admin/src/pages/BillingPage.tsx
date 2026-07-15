import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Minus, Trash2, Printer, MessageCircle, User, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

interface BillItem { id: string; name: string; price: number; quantity: number; }
interface Customer { id?: string; name: string; phone: string; address: string; }

const generateBillNo = () => `CHO${Date.now().toString().slice(-8)}`;

const BillingPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<BillItem[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', address: '' });
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [billNo] = useState(generateBillNo());
  const [billSaved, setBillSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchBills();
    // Check if order was passed from Orders page
    const stored = sessionStorage.getItem('billing_order');
    if (stored) {
      const order = JSON.parse(stored);
      setCustomer({ name: order.customer_name || '', phone: order.customer_phone || '', address: order.customer_address || '' });
      const items = order.order_items?.map((i: any) => ({ id: i.product_id || i.id, name: i.product_name, price: i.price, quantity: i.quantity })) || [];
      setCart(items);
      sessionStorage.removeItem('billing_order');
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').gt('stock', 0);
      setProducts(data?.length ? data : DEMO_PRODUCTS);
    } catch { setProducts(DEMO_PRODUCTS); }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('*').order('name');
      setCustomers(data || []);
    } catch { setCustomers([]); }
  };

  const fetchBills = async () => {
    try {
      const { data } = await supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(10);
      setBills(data || []);
    } catch { setBills([]); }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: product.offer_price || product.price, quantity: 1 }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'percent' ? (subtotal * discountValue) / 100 : discountValue;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const dueAmount = Math.max(0, grandTotal - paidAmount);
  const paymentStatus = paidAmount >= grandTotal ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'DUE';

  const saveCustomer = async () => {
    if (!customer.name || !customer.phone) return;
    const existing = customers.find(c => c.phone === customer.phone);
    if (!existing) {
      const { data } = await supabase.from('customers').insert({ name: customer.name, phone: customer.phone, address: customer.address }).select().single();
      if (data) setCustomers(prev => [...prev, data]);
    }
  };

  const saveBill = async () => {
    if (cart.length === 0) { toast.error('Add items to bill'); return; }
    if (!customer.name) { toast.error('Add customer name'); return; }
    setSaving(true);
    await saveCustomer();
    const billData = {
      bill_no: billNo, customer_name: customer.name, customer_phone: customer.phone,
      customer_address: customer.address, items: cart, subtotal, discount_type: discountType,
      discount_value: discountValue, discount_amount: discountAmount, grand_total: grandTotal,
      paid_amount: paidAmount, due_amount: dueAmount, payment_status: paymentStatus,
    };
    const { error } = await supabase.from('bills').insert(billData);
    if (error) toast.error('Failed to save bill: ' + error.message);
    else { toast.success('Bill saved! 🍫'); setBillSaved(true); fetchBills(); }
    setSaving(false);
  };

  const printBill = () => {
    const content = billRef.current?.innerHTML;
    const win = window.open('', '_blank', 'width=400,height=800');
    if (win && content) {
      win.document.write(`<html><head><title>Chocolush Bill - ${billNo}</title><style>
        body{font-family:monospace;font-size:12px;padding:10px;max-width:380px;margin:0 auto;}
        .center{text-align:center;} .bold{font-weight:bold;} .line{border-top:1px dashed #999;margin:8px 0;}
        .flex{display:flex;justify-content:space-between;}
      </style></head><body>${content}</body></html>`);
      win.document.close();
      win.print();
    }
  };

  const sendWhatsApp = () => {
    if (!customer.phone) { toast.error('Add customer phone'); return; }
    const phone = customer.phone.replace(/\D/g, '');
    const itemList = cart.map(i => `• ${i.name}\n  Qty: ${i.quantity} × ₹${i.price.toFixed(2)}\n  Total: ₹${(i.price * i.quantity).toFixed(2)}`).join('\n\n');
    const msg = `🍫 *CHOCOLUSH*\n*Premium Chocolate Boutique*\n\n*Bill No:* ${billNo}\n*Date:* ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n*Customer:* ${customer.name}\n\n*Items:*\n${itemList}\n\n*Subtotal:* ₹${subtotal.toFixed(2)}\n*Discount:* -₹${discountAmount.toFixed(2)}\n*Grand Total:* ₹${grandTotal.toFixed(2)}\n*Paid:* ₹${paidAmount.toFixed(2)}\n*Due:* ₹${dueAmount.toFixed(2)}\n\n*Status:* ${paymentStatus}\n\nThank you for shopping with Chocolush 🍫✨\nInstagram: @chocolush\nWhatsApp: +91 9400667313`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredCustomers = customers.filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch));

  return (
    <AdminLayout title="Billing / POS">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:p-6">
        {/* Left: Products */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products to add..."
                className="w-full bg-[#111827] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {filteredProducts.map(product => (
                <motion.button key={product.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className="bg-[#111827] border border-[#374151] rounded-xl p-3 text-left hover:border-[#D4AF37]/40 transition-all group">
                  <div className="aspect-square rounded-lg overflow-hidden mb-2">
                    <img src={product.image_url || 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=200'} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-white text-xs font-medium truncate">{product.name}</p>
                  <p className="text-[#D4AF37] text-xs font-bold">₹{(product.offer_price || product.price)?.toLocaleString()}</p>
                  <p className="text-gray-500 text-[10px]">Stock: {product.stock}</p>
                  <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-center gap-1 bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] py-0.5 rounded"><Plus size={10} /> Add</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4">
              <h3 className="text-white font-semibold mb-3">Cart Items</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-[#111827] rounded-xl px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{item.name}</p>
                      <p className="text-[#D4AF37] text-xs">₹{item.price.toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-6 h-6 bg-[#374151] rounded-full flex items-center justify-center text-gray-400 hover:text-white"><Minus size={10} /></button>
                      <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-6 h-6 bg-[#374151] rounded-full flex items-center justify-center text-gray-400 hover:text-white"><Plus size={10} /></button>
                    </div>
                    <p className="text-[#D4AF37] font-bold text-sm w-20 text-right">₹{(item.price * item.quantity).toLocaleString()}</p>
                    <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="text-gray-600 hover:text-red-400 ml-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Bill Panel */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><User size={16} className="text-[#D4AF37]" /> Customer</h3>
            <div className="relative mb-3">
              <input value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerSearch(true); }}
                onFocus={() => setShowCustomerSearch(true)}
                placeholder="Search existing customer..."
                className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
              {showCustomerSearch && customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1f2937] border border-[#374151] rounded-xl shadow-2xl z-10 max-h-36 overflow-y-auto">
                  {filteredCustomers.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => { setCustomer({ name: c.name, phone: c.phone, address: c.address || '' }); setCustomerSearch(''); setShowCustomerSearch(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-[#374151] transition-colors">
                      <p className="text-white text-sm">{c.name}</p>
                      <p className="text-gray-500 text-xs">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {[
              { key: 'name', placeholder: 'Customer name *' },
              { key: 'phone', placeholder: 'Phone number *' },
              { key: 'address', placeholder: 'Address' },
            ].map(f => (
              <input key={f.key} value={customer[f.key as keyof Customer]} onChange={e => setCustomer(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm mb-2" />
            ))}
          </div>

          {/* Discount */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3">Discount</h3>
            <div className="flex gap-2 mb-3">
              {(['flat', 'percent'] as const).map(t => (
                <button key={t} onClick={() => setDiscountType(t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${discountType === t ? 'bg-[#D4AF37] text-[#111827]' : 'bg-[#111827] text-gray-400 border border-[#374151]'}`}>
                  {t === 'flat' ? 'Flat (₹)' : 'Percent (%)'}
                </button>
              ))}
            </div>
            <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
              placeholder={discountType === 'flat' ? 'Discount amount' : 'Discount %'}
              className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
          </div>

          {/* Payment */}
          <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3">Payment</h3>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-green-400"><span>Discount</span><span>-₹{discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-white font-bold text-base border-t border-[#374151] pt-2 mt-2"><span>Grand Total</span><span className="text-[#D4AF37]">₹{grandTotal.toLocaleString()}</span></div>
            </div>
            <input type="number" value={paidAmount || ''} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
              placeholder="Amount paid by customer"
              className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm mb-2" />
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Due Amount</span>
              <span className={`font-bold ${dueAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>₹{dueAmount.toFixed(2)}</span>
            </div>
            <div className={`text-center py-1.5 rounded-xl text-xs font-bold ${paymentStatus === 'PAID' ? 'bg-green-900/30 text-green-400' : paymentStatus === 'PARTIAL' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-400'}`}>
              {paymentStatus === 'PAID' ? '✅' : paymentStatus === 'PARTIAL' ? '🟡' : '🔴'} {paymentStatus}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={saveBill} disabled={saving || billSaved}
              className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl text-sm transition-colors">
              {billSaved ? <><Check size={16} /> Bill Saved!</> : saving ? 'Saving...' : '🍫 Save & Generate Bill'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={printBill}
                className="flex items-center justify-center gap-2 bg-[#1f2937] border border-[#374151] text-gray-400 hover:text-white py-2.5 rounded-xl text-sm transition-colors">
                <Printer size={14} /> Print
              </button>
              <button onClick={sendWhatsApp}
                className="flex items-center justify-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 py-2.5 rounded-xl text-sm transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </button>
            </div>
          </div>

          {/* Thermal Bill Preview */}
          <div ref={billRef} className="bg-white text-black rounded-2xl p-4 font-mono text-xs overflow-hidden">
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
              <p className="font-bold text-base">🍫 CHOCOLUSH</p>
              <p className="text-gray-600">Premium Chocolate Boutique</p>
            </div>
            <div className="mb-3">
              <div className="flex justify-between"><span>Bill No</span><span className="font-bold">{billNo}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              <div className="flex justify-between"><span>Time</span><span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></div>
            </div>
            {customer.name && (
              <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
                <p className="font-bold mb-1">Customer</p>
                <div className="flex justify-between"><span>Name</span><span>{customer.name}</span></div>
                {customer.phone && <div className="flex justify-between"><span>Phone</span><span>{customer.phone}</span></div>}
                {customer.address && <div className="flex justify-between"><span>Address</span><span className="text-right max-w-[55%]">{customer.address}</span></div>}
              </div>
            )}
            {cart.length > 0 && (
              <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
                <p className="font-bold mb-2">Items</p>
                {cart.map((item, i) => (
                  <div key={item.id} className="mb-2">
                    <p>{i + 1}. {item.name}</p>
                    <div className="flex justify-between text-gray-600">
                      <span>Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                      <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between"><span>Discount{discountType === 'percent' ? ` (${discountValue}%)` : ''}</span><span>-₹{discountAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold border-t border-dashed border-gray-300 pt-1 mt-1"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between mt-1"><span>Paid Amount</span><span>₹{paidAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Due Amount</span><span>₹{dueAmount.toFixed(2)}</span></div>
              <p className="text-center mt-2 font-bold">Payment Status: {paymentStatus === 'PAID' ? '✅ PAID' : paymentStatus === 'PARTIAL' ? '🟡 PARTIAL' : '🔴 DUE'}</p>
            </div>
            <div className="border-t border-dashed border-gray-300 pt-3 text-center text-gray-600">
              <p>Thank you for shopping with Chocolush 🍫✨</p>
              <p>Instagram: @chocolush</p>
              <p>WhatsApp: +91 9400667313</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const DEMO_PRODUCTS = [
  { id: '1', name: 'Big Kunafa Chocolate', price: 450, stock: 10, image_url: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=200' },
  { id: '2', name: 'Med. Kunafa Chocolate', price: 280, stock: 8, image_url: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=200' },
  { id: '3', name: 'Mini Kunafa Bites Box', price: 120, stock: 15, image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200' },
  { id: '4', name: 'Dark Truffle Box', price: 680, stock: 6, image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200' },
  { id: '5', name: 'Rose Gold Pralines', price: 520, stock: 4, image_url: 'https://images.unsplash.com/photo-1587049352851-8d4e89dc8296?w=200' },
  { id: '6', name: 'Hazelnut Dream Bar', price: 380, stock: 12, image_url: 'https://images.unsplash.com/photo-1548907994-e9c2f8e4d35e?w=200' },
];

export default BillingPage;
