import React, { useEffect, useState } from 'react';
import {
  Save, Upload, ExternalLink, MessageCircle, Palette,
  Image, FileText, Phone, MapPin, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS: Record<string, string> = {
  store_name: 'Chocolush',
  tagline: 'Premium Chocolate Boutique',
  whatsapp_number: '919400667313',
  instagram_handle: '@chocolush',
  instagram_url: 'https://instagram.com/chocolush',
  hero_title: 'Pure Indulgence',
  hero_subtitle: 'Handcrafted luxury chocolates from Kerala. Every bite tells a story.',
  hero_image_1: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600',
  hero_image_2: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=1600',
  hero_image_3: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=1600',
  primary_color: '#D4AF37',
  secondary_color: '#C4956A',
  bg_color: '#111827',
  about_title: 'About Chocolush',
  about_text: 'Chocolush was born from a love of premium chocolate in Kerala.',
  about_image: '',
  brownie_title: 'Customized Brownies',
  brownie_subtitle: 'For Every Occasion',
  brownie_text: 'Weddings, birthdays, corporate events — bespoke chocolate experiences tailored just for you.',
  brownie_image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=1600',
  banner_title: '',
  banner_text: '',
  banner_image: '',
  banner_link: '',
  contact_email: 'chocolush10@gmail.com',
  contact_address: 'Kerala, India',
  footer_tagline: 'Where every bite is pure luxury.',
  free_delivery_above: '500',
  tax_percent: '0',
  meta_title: 'Chocolush — Premium Artisan Chocolates Kerala',
  meta_description: 'Handcrafted luxury chocolates from Kerala.',
  announcement_bar: '🍫 Free delivery above ₹500',
  store_policy: 'All sales are final. For issues, contact us on WhatsApp.',
  custom_css: '',
};

const TABS = [
  { id: 'general', label: 'General', icon: <ExternalLink size={14}/> },
  { id: 'hero', label: 'Hero / Banners', icon: <Image size={14}/> },
  { id: 'special', label: 'Special & Banners', icon: <Image size={14}/> },
  { id: 'social', label: 'Social & Contact', icon: <Phone size={14}/> },
  { id: 'about', label: 'About Page', icon: <FileText size={14}/> },
  { id: 'theme', label: 'Theme / Colors', icon: <Palette size={14}/> },
  { id: 'seo', label: 'SEO', icon: <ExternalLink size={14}/> },
  { id: 'policy', label: 'Policies', icon: <FileText size={14}/> },
];

// ── These MUST be top-level components (not defined inside SettingsManagerPage)
// ── Defining them inside causes React to recreate them on every render → inputs lose focus
interface FieldProps {
  label: string; keyName: string; type?: string;
  placeholder?: string; rows?: number;
  value: string; onChange: (key: string, val: string) => void;
}
const SettingsField: React.FC<FieldProps> = ({ label, keyName, type = 'text', placeholder = '', rows = 0, value, onChange }) => (
  <div>
    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">{label}</label>
    {rows > 0 ? (
      <textarea
        value={value} onChange={e => onChange(keyName, e.target.value)}
        placeholder={placeholder} rows={rows}
        className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm resize-none"
      />
    ) : type === 'color' ? (
      <div className="flex items-center gap-3">
        <input type="color" value={value || '#D4AF37'} onChange={e => onChange(keyName, e.target.value)}
          className="w-12 h-10 rounded-lg cursor-pointer border border-[#374151] bg-transparent"/>
        <input type="text" value={value} onChange={e => onChange(keyName, e.target.value)}
          className="flex-1 bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 text-sm"/>
      </div>
    ) : (
      <input type={type} value={value} onChange={e => onChange(keyName, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
      />
    )}
  </div>
);

interface ImageFieldProps {
  label: string; keyName: string; value: string;
  onChange: (key: string, val: string) => void;
  uploading: string | null;
  onUpload: (key: string, file: File) => void;
}
const SettingsImageField: React.FC<ImageFieldProps> = ({ label, keyName, value, onChange, uploading, onUpload }) => (
  <div>
    <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">{label}</label>
    <div className="flex gap-2">
      <input value={value} onChange={e => onChange(keyName, e.target.value)}
        placeholder="https://... paste image link"
        className="flex-1 bg-[#111827] border border-[#374151] text-white px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
      />
      <label className="flex items-center gap-1 bg-[#374151] hover:bg-[#4b5563] text-gray-400 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors">
        {uploading === keyName ? <RefreshCw size={14} className="animate-spin"/> : <Upload size={14}/>}
        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onUpload(keyName, e.target.files[0])}/>
      </label>
    </div>
    {value && (
      <div className="mt-2 rounded-xl overflow-hidden max-h-28 bg-[#111827]">
        <img src={value} alt={label} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display='none')}/>
      </div>
    )}
  </div>
);

const SettingsManagerPage = () => {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [imageUploading, setImageUploading] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Hard timeout — never stuck loading more than 4 seconds
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*');

        if (!mounted) return;

        if (error) {
          // Table might not exist yet — just use defaults
          console.warn('store_settings table issue:', error.message);
          setTableExists(false);
          setLoading(false);
          clearTimeout(timeout);
          return;
        }

        if (data && data.length > 0) {
          const mapped: Record<string, string> = { ...DEFAULT_SETTINGS };
          data.forEach((row: any) => {
            try {
              const val = row.value;
              mapped[row.key] = typeof val === 'string'
                ? val.replace(/^"|"$/g, '')
                : typeof val === 'number' || typeof val === 'boolean'
                  ? String(val)
                  : JSON.stringify(val).replace(/^"|"$/g, '');
            } catch {
              mapped[row.key] = String(row.value ?? '');
            }
          });
          setSettings(mapped);
        }
      } catch (err) {
        console.warn('Settings fetch error:', err);
        if (mounted) setTableExists(false);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    };

    fetchSettings();

    // Realtime
    const channel = supabase.channel('store-settings-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, fetchSettings)
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const upserts = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('store_settings')
        .upsert(upserts, { onConflict: 'key' });

      if (error) {
        if (error.message.includes('does not exist')) {
          toast.error('Run supabase-safe-upgrade.sql first to create the settings table');
        } else {
          toast.error('Save failed: ' + error.message);
        }
      } else {
        toast.success('✅ Store settings saved! Updates store in realtime.');
      }
    } catch (err) {
      toast.error('Save failed. Check your connection.');
    }
    setSaving(false);
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const uploadImage = async (key: string, file: File) => {
    setImageUploading(key);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `setting-${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: url } = supabase.storage.from('banners').getPublicUrl(fileName);
      handleChange(key, url.publicUrl);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Upload failed. Make sure banners bucket exists in Supabase Storage.');
    }
    setImageUploading(null);
  };

  // Field and ImageField are now top-level components (see above) — fixes input focus loss bug



  if (loading) return (
    <AdminLayout title="Store Settings">
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"/>
        <p className="text-gray-400 text-sm">Loading settings...</p>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Store Settings">
      {/* Warning if table doesn't exist */}
      {!tableExists && (
        <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-800/50 rounded-xl">
          <p className="text-yellow-400 text-sm font-bold mb-1">⚠️ store_settings table not found</p>
          <p className="text-yellow-300/70 text-xs">Run <code className="bg-[#111827] px-1 rounded">supabase-safe-upgrade.sql</code> in Supabase SQL Editor to create it. Settings below are shown with default values.</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-[#111827]'
                  : 'bg-[#1f2937] text-gray-400 border border-[#374151] hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold px-5 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
        >
          <Save size={16}/> {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-6">

        {activeTab === 'general' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">General Store Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SettingsField label="Store Name" keyName="store_name" placeholder="Chocolush" value={settings['store_name'] || ''} onChange={handleChange}/>
              <SettingsField label="Tagline" keyName="tagline" placeholder="Premium Chocolate Boutique" value={settings['tagline'] || ''} onChange={handleChange}/>
              <SettingsField label="Free Delivery Above (₹)" keyName="free_delivery_above" type="number" placeholder="500" value={settings['free_delivery_above'] || ''} onChange={handleChange}/>
              <SettingsField label="Tax %" keyName="tax_percent" type="number" placeholder="0" value={settings['tax_percent'] || ''} onChange={handleChange}/>
              <div className="md:col-span-2">
                <SettingsField label="Announcement Bar Text" keyName="announcement_bar" placeholder="🍫 Free delivery above ₹500" value={settings['announcement_bar'] || ''} onChange={handleChange}/>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hero' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">Hero Section & Banners</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SettingsField label="Hero Title" keyName="hero_title" placeholder="Pure Indulgence" value={settings['hero_title'] || ''} onChange={handleChange}/>
              <SettingsField label="Hero Subtitle" keyName="hero_subtitle" placeholder="Handcrafted luxury chocolates..." value={settings['hero_subtitle'] || ''} onChange={handleChange}/>
            </div>
            <SettingsImageField label="Hero Image 1 (Slide 1)" keyName="hero_image_1" value={settings['hero_image_1'] || ''} onChange={handleChange} uploading={imageUploading} onUpload={uploadImage}/>
            <SettingsImageField label="Hero Image 2 (Slide 2)" keyName="hero_image_2" value={settings['hero_image_2'] || ''} onChange={handleChange} uploading={imageUploading} onUpload={uploadImage}/>
            <SettingsImageField label="Hero Image 3 (Slide 3)" keyName="hero_image_3" value={settings['hero_image_3'] || ''} onChange={handleChange} uploading={imageUploading} onUpload={uploadImage}/>
          </div>
        )}

        {activeTab === 'special' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-white font-bold text-lg mb-2">Special Service — Customized Brownies</h3>
              <p className="text-gray-400 text-xs mb-4">Controls the "Customized Brownies" promo section shown on the homepage.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SettingsField label="Section Title" keyName="brownie_title" placeholder="Customized Brownies" value={settings['brownie_title'] || ''} onChange={handleChange}/>
                <SettingsField label="Section Subtitle" keyName="brownie_subtitle" placeholder="For Every Occasion" value={settings['brownie_subtitle'] || ''} onChange={handleChange}/>
                <div className="md:col-span-2">
                  <SettingsField label="Description Text" keyName="brownie_text" rows={3} placeholder="Weddings, birthdays, corporate events..." value={settings['brownie_text'] || ''} onChange={handleChange}/>
                </div>
              </div>
              <div className="mt-4">
                <SettingsImageField label="Section Background Image" keyName="brownie_image" value={settings['brownie_image'] || ''} onChange={handleChange} uploading={imageUploading} onUpload={uploadImage}/>
              </div>
            </div>

            <div className="pt-6 border-t border-[#374151]">
              <h3 className="text-white font-bold text-lg mb-2">General Store Banner</h3>
              <p className="text-gray-400 text-xs mb-4">Optional extra promotional banner shown on the homepage. Leave blank to hide.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <SettingsField label="Banner Title" keyName="banner_title" placeholder="e.g. New Festive Collection" value={settings['banner_title'] || ''} onChange={handleChange}/>
                <SettingsField label="Banner Link (optional)" keyName="banner_link" placeholder="/products" value={settings['banner_link'] || ''} onChange={handleChange}/>
                <div className="md:col-span-2">
                  <SettingsField label="Banner Text" keyName="banner_text" rows={2} placeholder="Short promotional message..." value={settings['banner_text'] || ''} onChange={handleChange}/>
                </div>
              </div>
              <div className="mt-4">
                <SettingsImageField label="Banner Image" keyName="banner_image" value={settings['banner_image'] || ''} onChange={handleChange} uploading={imageUploading} onUpload={uploadImage}/>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">Social Media & Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SettingsField label="WhatsApp Number (with country code)" keyName="whatsapp_number" placeholder="919400667313" value={settings['whatsapp_number'] || ''} onChange={handleChange}/>
              <SettingsField label="Instagram Handle" keyName="instagram_handle" placeholder="@chocolush" value={settings['instagram_handle'] || ''} onChange={handleChange}/>
              <SettingsField label="Instagram Profile URL" keyName="instagram_url" placeholder="https://instagram.com/chocolush" value={settings['instagram_url'] || ''} onChange={handleChange}/>
              <SettingsField label="Contact Email" keyName="contact_email" placeholder="chocolush10@gmail.com" value={settings['contact_email'] || ''} onChange={handleChange}/>
              <SettingsField label="Contact Address" keyName="contact_address" placeholder="Kerala, India" value={settings['contact_address'] || ''} onChange={handleChange}/>
              <SettingsField label="Footer Tagline" keyName="footer_tagline" placeholder="Where every bite is pure luxury." value={settings['footer_tagline'] || ''} onChange={handleChange}/>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">About Page Content</h3>
            <SettingsField label="About Page Title" keyName="about_title" placeholder="About Chocolush" value={settings['about_title'] || ''} onChange={handleChange}/>
            <SettingsField label="About Story Text" keyName="about_text" rows={6} placeholder="Tell your brand story..." value={settings['about_text'] || ''} onChange={handleChange}/>
            <SettingsImageField label="About Page Cover Image" keyName="about_image" value={settings['about_image'] || ''} onChange={handleChange} uploading={imageUploading} onUpload={uploadImage}/>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">Theme & Colors</h3>
            <div className="bg-[#111827] rounded-xl p-3 mb-2">
              <p className="text-[#D4AF37] text-xs">⚡ Save settings to update store colors in realtime</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <SettingsField label="Primary Color (Gold)" keyName="primary_color" type="color" value={settings['primary_color'] || ''} onChange={handleChange}/>
              <SettingsField label="Secondary Color (Brown)" keyName="secondary_color" type="color" value={settings['secondary_color'] || ''} onChange={handleChange}/>
              <SettingsField label="Background Color" keyName="bg_color" type="color" value={settings['bg_color'] || ''} onChange={handleChange}/>
            </div>
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-3">Preset Themes</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'Dark Chocolate 🍫', primary: '#D4AF37', secondary: '#C4956A', bg: '#111827' },
                  { name: 'Midnight Gold ✨', primary: '#FFD700', secondary: '#FFA500', bg: '#0a0a0a' },
                  { name: 'Rose Luxury 🌹', primary: '#E8B4B8', secondary: '#C48B8F', bg: '#1a0810' },
                  { name: 'Pistachio 🌿', primary: '#90EE90', secondary: '#6DBF6D', bg: '#071207' },
                ].map(theme => (
                  <button
                    key={theme.name}
                    onClick={() => {
                      handleChange('primary_color', theme.primary);
                      handleChange('secondary_color', theme.secondary);
                      handleChange('bg_color', theme.bg);
                    }}
                    className="p-3 rounded-xl border border-[#374151] hover:border-[#D4AF37]/50 transition-colors text-left"
                  >
                    <div className="flex gap-1 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primary }}/>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.secondary }}/>
                      <div className="w-4 h-4 rounded-full border border-gray-600" style={{ backgroundColor: theme.bg }}/>
                    </div>
                    <p className="text-gray-400 text-xs">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Custom CSS (Advanced)</label>
              <textarea
                value={settings.custom_css || ''}
                onChange={e => handleChange('custom_css', e.target.value)}
                placeholder="/* Add custom CSS here */" rows={5}
                className="w-full bg-[#111827] border border-[#374151] text-green-400 px-4 py-2.5 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm resize-none font-mono"
              />
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">SEO Settings</h3>
            <SettingsField label="Meta Title" keyName="meta_title" placeholder="Chocolush — Premium Artisan Chocolates Kerala" value={settings['meta_title'] || ''} onChange={handleChange}/>
            <SettingsField label="Meta Description" keyName="meta_description" rows={3} placeholder="Handcrafted luxury chocolates..." value={settings['meta_description'] || ''} onChange={handleChange}/>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="space-y-5">
            <h3 className="text-white font-bold text-lg mb-2">Store Policies</h3>
            <SettingsField label="Store Policy / Terms" keyName="store_policy" rows={8} placeholder="Return policy, delivery policy..." value={settings['store_policy'] || ''} onChange={handleChange}/>
          </div>
        )}

        <div className="pt-6 border-t border-[#374151] mt-6">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-4 rounded-xl transition-colors"
          >
            <Save size={18}/> {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SettingsManagerPage;
