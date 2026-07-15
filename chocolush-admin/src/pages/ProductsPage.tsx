import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Star, Package, ToggleLeft, ToggleRight, X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const EMPTY_PRODUCT = {
  name: '', price: '', offer_price: '', description: '', category_id: '',
  stock: '', image_url: '', is_featured: false,
  meta_title: '', meta_description: '',
};

const ProductsPage = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProducts();
    supabase.from('categories').select('*').then(({ data }) => setCategories(data || []));
    const channel = supabase.channel('admin-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
      if (error) console.warn('Products:', error.message);
      setProducts(data || []);
    } catch (e) {
      console.warn('Products fetch error:', e);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm(EMPTY_PRODUCT); setEditing(null); setImageFile(null); setModalOpen(true); };
  const openEdit = (product: any) => { setForm({ ...product, price: product.price?.toString(), offer_price: product.offer_price?.toString() || '', stock: product.stock?.toString() }); setEditing(product); setImageFile(null); setModalOpen(true); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((p: any) => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleImageUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `product-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
    if (error) { toast.error('Image upload failed'); return null; }
    const { data: url } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return url.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    setSaving(true);
    let imageUrl = form.image_url;
    if (imageFile) {
      const uploaded = await handleImageUpload(imageFile);
      if (uploaded) imageUrl = uploaded;
    }
    const payload = {
      name: form.name, price: parseFloat(form.price),
      offer_price: form.offer_price ? parseFloat(form.offer_price) : null,
      description: form.description, category_id: form.category_id || null,
      stock: parseInt(form.stock) || 0, image_url: imageUrl,
      is_featured: form.is_featured,
      meta_title: form.meta_title, meta_description: form.meta_description,
    };
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) toast.error('Update failed: ' + error.message);
      else toast.success('Product updated!');
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) toast.error('Create failed: ' + error.message);
      else toast.success('Product created! 🍫');
    }
    setSaving(false);
    setModalOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else toast.success('Product deleted');
    setDeleteConfirm(null);
    fetchProducts();
  };

  const toggleFeatured = async (product: any) => {
    await supabase.from('products').update({ is_featured: !product.is_featured }).eq('id', product.id);
    fetchProducts();
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Products">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full bg-[#1f2937] border border-[#374151] text-white pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total Products', value: products.length, color: '#D4AF37' },
          { label: 'Featured', value: products.filter(p => p.is_featured).length, color: '#8B5CF6' },
          { label: 'Out of Stock', value: products.filter(p => p.stock === 0).length, color: '#EF4444' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-[#1f2937] rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(product => (
            <motion.div key={product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden hover:border-[#D4AF37]/30 transition-all group">
              <div className="relative aspect-square">
                <img src={product.image_url || 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=300'}
                  alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => openEdit(product)} className="w-9 h-9 bg-[#D4AF37] rounded-full flex items-center justify-center text-[#111827]"><Edit size={14} /></button>
                  <button onClick={() => setDeleteConfirm(product.id)} className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center text-white"><Trash2 size={14} /></button>
                </div>
                {product.stock === 0 && (
                  <span className="absolute top-2 left-2 bg-red-500/80 text-white text-[10px] px-2 py-0.5 rounded-full">Out of Stock</span>
                )}
                {product.is_featured && (
                  <span className="absolute top-2 right-2 bg-[#D4AF37]/80 text-[#111827] text-[10px] px-2 py-0.5 rounded-full">Featured</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-white text-sm font-medium truncate">{product.name}</p>
                <p className="text-gray-500 text-xs">{product.categories?.name || 'Uncategorized'}</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[#D4AF37] font-bold text-sm">₹{(product.offer_price || product.price)?.toLocaleString()}</span>
                    {product.offer_price && <span className="text-gray-600 text-xs line-through ml-1">₹{product.price?.toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Package size={12} /> {product.stock}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => toggleFeatured(product)} className={`flex items-center gap-1 text-xs transition-colors ${product.is_featured ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-400'}`}>
                    {product.is_featured ? <ToggleRight size={16} /> : <ToggleLeft size={16} />} Featured
                  </button>
                  <div className={`flex items-center gap-1 text-xs ${product.stock > 5 ? 'text-green-400' : product.stock > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 5 ? 'bg-green-400' : product.stock > 0 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    {product.stock > 0 ? 'In Stock' : 'Out'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-3 sm:mx-0 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-[#374151]">
                <h2 className="text-white font-bold text-lg">{editing ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                {/* Name — always full width */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Product Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Kunafa Chocolate Box"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                </div>
                {/* Price + Offer Price side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Price (₹) *</label>
                    <input name="price" value={form.price} onChange={handleChange} type="number" placeholder="450"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Offer Price (₹)</label>
                    <input name="offer_price" value={form.offer_price} onChange={handleChange} type="number" placeholder="380"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                </div>
                {/* Stock + Category side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Stock</label>
                    <input name="stock" value={form.stock} onChange={handleChange} type="number" placeholder="10"
                      className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Category</label>
                    <select name="category_id" value={form.category_id} onChange={handleChange}
                      className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 text-sm">
                      <option value="">Select category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                {/* Description */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Describe this chocolate..."
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm resize-none" />
                </div>
                {/* Image */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Product Image</label>
                  <div className="flex gap-2">
                    <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://... or upload"
                      className="flex-1 bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                    <label className="flex items-center gap-1 bg-[#374151] hover:bg-[#4b5563] text-gray-400 px-3 py-2.5 rounded-xl text-sm cursor-pointer shrink-0">
                      <Upload size={14} />
                      <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  {imageFile && <p className="text-green-400 text-xs mt-1">📎 {imageFile.name}</p>}
                </div>
                {/* SEO */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">SEO Title</label>
                  <input name="meta_title" value={form.meta_title} onChange={handleChange} placeholder="SEO title"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">SEO Description</label>
                  <textarea name="meta_description" value={form.meta_description} onChange={handleChange} rows={2} placeholder="Meta description"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm resize-none" />
                </div>
                {/* Featured */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={handleChange} className="accent-[#D4AF37] w-4 h-4" />
                  <span className="text-gray-400 text-sm">Feature this product on homepage</span>
                </label>
              </div>
              <div className="flex gap-3 p-6 border-t border-[#374151]">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl transition-colors text-sm">
                  {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
                </button>
                <button onClick={() => setModalOpen(false)} className="px-6 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm hover:bg-[#374151] transition-colors">Cancel</button>
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
              <h3 className="text-white font-bold mb-2">Delete Product?</h3>
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

export default ProductsPage;
