import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, Upload, Grid3X3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const EMPTY = { name: '', slug: '', image_url: '', description: '' };

const CategoriesPage = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
    const channel = supabase.channel('admin-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order');
      if (error) console.warn('Categories:', error.message);
      setCategories(data || []);
    } catch (e) {
      console.warn('Categories error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(EMPTY);
    setEditing(null);
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (cat: any) => {
    setForm({ name: cat.name, slug: cat.slug || '', image_url: cat.image_url || '', description: cat.description || '' });
    setEditing(cat);
    setImageFile(null);
    setModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `category-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: true });
    if (error) { toast.error('Image upload failed'); return null; }
    const { data: url } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return url.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Category name is required'); return; }
    setSaving(true);

    let imageUrl = form.image_url;
    if (imageFile) {
      const uploaded = await handleImageUpload(imageFile);
      if (uploaded) imageUrl = uploaded;
    }

    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const payload = { name: form.name, slug, image_url: imageUrl, description: form.description };

    if (editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) toast.error('Update failed: ' + error.message);
      else toast.success('Category updated! ✅');
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) toast.error('Create failed: ' + error.message);
      else toast.success('Category created! 🍫');
    }

    setSaving(false);
    setModalOpen(false);
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) toast.error('Delete failed: ' + error.message);
    else toast.success('Category deleted');
    setDeleteConfirm(null);
    fetchCategories();
  };

  return (
    <AdminLayout title="Categories">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">{categories.length} categories total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#1f2937] rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20">
          <Grid3X3 size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No categories yet</p>
          <p className="text-gray-600 text-sm mb-6">Add your first category to organize products</p>
          <button onClick={openAdd} className="bg-[#D4AF37] text-[#111827] font-bold px-6 py-3 rounded-xl text-sm">
            + Add First Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <motion.div
              key={cat.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden hover:border-[#D4AF37]/30 transition-all"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-[#111827]">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 size={32} className="text-gray-600" />
                  </div>
                )}
                {/* Overlay buttons */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => openEdit(cat)}
                    className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center text-[#111827] hover:bg-[#C4956A] transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat.id)}
                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-white font-semibold">{cat.name}</p>
                {cat.slug && (
                  <p className="text-gray-500 text-xs mt-0.5">/{cat.slug}</p>
                )}
                {cat.description && (
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">{cat.description}</p>
                )}
                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex-1 flex items-center justify-center gap-1 bg-[#374151] hover:bg-[#4b5563] text-gray-400 py-2 rounded-xl text-xs transition-colors"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat.id)}
                    className="w-9 h-9 bg-[#374151] hover:bg-red-900/30 rounded-xl flex items-center justify-center text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1f2937] border border-[#374151] rounded-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-3 sm:mx-0"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#374151]">
                <h3 className="text-white font-bold text-lg">
                  {editing ? 'Edit Category' : 'Add Category'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">
                    Category Name *
                  </label>
                  <input
                    value={form.name}
                    onChange={e => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                      setForm(p => ({ ...p, name, slug }));
                    }}
                    placeholder="e.g. Kunafa Special"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-3 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">
                    Slug (URL)
                  </label>
                  <input
                    value={form.slug}
                    onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                    placeholder="kunafa-special (auto-generated)"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-3 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">
                    Description
                  </label>
                  <input
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Short description (optional)"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-3 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">
                    Image URL
                  </label>
                  <input
                    value={form.image_url}
                    onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                    placeholder="https://... paste image link"
                    className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-3 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">
                    Or Upload Image
                  </label>
                  <label className="flex items-center justify-center gap-3 border-2 border-dashed border-[#374151] hover:border-[#D4AF37]/50 rounded-xl p-4 cursor-pointer transition-colors">
                    <Upload size={18} className="text-gray-500" />
                    <span className="text-gray-400 text-sm">
                      {imageFile ? imageFile.name : 'Click to upload image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          // Show preview URL
                          const reader = new FileReader();
                          reader.onload = ev => setForm(p => ({ ...p, image_url: ev.target?.result as string }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Image Preview */}
                {form.image_url && (
                  <div className="rounded-xl overflow-hidden aspect-video bg-[#111827]">
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 p-5 border-t border-[#374151]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl transition-colors text-sm"
                >
                  {saving ? 'Saving...' : editing ? 'Update Category' : 'Create Category'}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm hover:bg-[#374151] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-[#1f2937] border border-red-900/50 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <Trash2 size={36} className="text-red-400 mx-auto mb-3" />
              <h3 className="text-white font-bold text-lg mb-2">Delete Category?</h3>
              <p className="text-gray-400 text-sm mb-5">
                Products in this category won't be deleted, but they'll become uncategorized.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 border border-[#374151] text-gray-400 py-3 rounded-xl text-sm hover:bg-[#374151] transition-colors"
                >
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

export default CategoriesPage;
