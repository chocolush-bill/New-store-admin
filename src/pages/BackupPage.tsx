import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Download, Upload, RefreshCw, Trash2, Shield, CheckCircle, AlertTriangle, Clock, HardDrive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const BACKUP_TABLES = ['products', 'categories', 'orders', 'order_items', 'customers', 'profiles', 'reviews', 'wishlist', 'blog_posts', 'newsletter_subscribers', 'bills', 'expenses', 'expense_categories', 'coupons'];

const BackupPage = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState<any>(null);
  const [progress, setProgress] = useState('');
  const [exportTable, setExportTable] = useState('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTable, setImportTable] = useState('products');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, lastBackup: '', size: '0 KB' });

  useEffect(() => { loadBackupHistory(); }, []);

  const loadBackupHistory = () => {
    const stored = JSON.parse(localStorage.getItem('chocolush_backups') || '[]');
    setBackups(stored);
    if (stored.length > 0) {
      setStats({ total: stored.length, lastBackup: new Date(stored[0].timestamp).toLocaleString('en-IN'), size: stored[0].size || '0 KB' });
    }
  };

  const createFullBackup = async () => {
    setLoading(true);
    setProgress('Fetching all data...');
    const backup: any = { timestamp: new Date().toISOString(), tables: {} };

    for (const table of BACKUP_TABLES) {
      setProgress(`Backing up ${table}...`);
      const { data } = await supabase.from(table).select('*');
      backup.tables[table] = data || [];
    }

    const json = JSON.stringify(backup, null, 2);
    const size = `${(new Blob([json]).size / 1024).toFixed(1)} KB`;
    const meta = { id: Date.now(), name: `chocolush-backup-${new Date().toISOString().slice(0, 10)}`, timestamp: backup.timestamp, size, tables: BACKUP_TABLES.length };

    const stored = JSON.parse(localStorage.getItem('chocolush_backups') || '[]');
    stored.unshift(meta);
    if (stored.length > 10) stored.pop();
    localStorage.setItem('chocolush_backups', JSON.stringify(stored));
    localStorage.setItem(`backup_${meta.id}`, json);

    // Auto-download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${meta.name}.json`; a.click();

    setBackups(stored);
    setStats({ total: stored.length, lastBackup: new Date(meta.timestamp).toLocaleString('en-IN'), size });
    setProgress('');
    setLoading(false);
    toast.success('Full backup created & downloaded! 🍫');
  };

  const downloadBackup = (backup: any) => {
    const json = localStorage.getItem(`backup_${backup.id}`);
    if (!json) { toast.error('Backup data not found locally'); return; }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${backup.name}.json`; a.click();
    toast.success('Backup downloaded!');
  };

  const deleteBackup = (id: number) => {
    const stored = JSON.parse(localStorage.getItem('chocolush_backups') || '[]').filter((b: any) => b.id !== id);
    localStorage.setItem('chocolush_backups', JSON.stringify(stored));
    localStorage.removeItem(`backup_${id}`);
    setBackups(stored);
    toast.success('Backup deleted');
  };

  const restoreBackup = async (backup: any) => {
    const json = localStorage.getItem(`backup_${backup.id}`);
    if (!json) { toast.error('Backup data not found'); setRestoreConfirm(null); return; }
    setLoading(true);
    setProgress('Starting restore...');
    const data = JSON.parse(json);

    // Create pre-restore backup first
    toast('Creating pre-restore backup...', { icon: '🔒' });
    await createFullBackup();

    for (const [table, rows] of Object.entries(data.tables) as [string, any[]][]) {
      if (!rows.length) continue;
      setProgress(`Restoring ${table} (${rows.length} records)...`);
      await supabase.from(table).upsert(rows, { onConflict: 'id' });
    }

    setProgress('');
    setLoading(false);
    setRestoreConfirm(null);
    toast.success('Restore completed! 🍫');
  };

  const exportData = async () => {
    setLoading(true);
    const tables = exportTable === 'all' ? BACKUP_TABLES : [exportTable];
    const exportObj: any = {};

    for (const t of tables) {
      const { data } = await supabase.from(t).select('*');
      exportObj[t] = data || [];
    }

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `chocolush-export-${exportTable}-${Date.now()}.json`; a.click();
    } else {
      // CSV export for single table
      const tableData = exportObj[tables[0]] || [];
      if (tableData.length === 0) { toast.error('No data to export'); setLoading(false); return; }
      const headers = Object.keys(tableData[0]);
      const csv = [headers.join(','), ...tableData.map((row: any) => headers.map(h => {
        const val = row[h] ?? '';
        return typeof val === 'string' && val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `chocolush-${tables[0]}-${Date.now()}.csv`; a.click();
    }

    setLoading(false);
    toast.success('Export complete!');
  };

  const handleImportFile = (file: File) => {
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      try {
        const data = JSON.parse(text);
        const rows = Array.isArray(data) ? data : data[importTable] || [];
        setImportPreview(rows.slice(0, 3));
      } catch {
        // CSV parse
        const lines = text.split('\n').filter(Boolean);
        const headers = lines[0].split(',');
        const rows = lines.slice(1, 4).map(line => {
          const vals = line.split(',');
          return headers.reduce((obj, h, i) => ({ ...obj, [h.trim()]: vals[i]?.trim() || '' }), {});
        });
        setImportPreview(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async e => {
      const text = e.target?.result as string;
      try {
        const data = JSON.parse(text);
        const rows = Array.isArray(data) ? data : data[importTable] || [];
        if (rows.length === 0) { toast.error('No data found'); setLoading(false); return; }
        const { error } = await supabase.from(importTable).upsert(rows, { onConflict: 'id' });
        if (error) toast.error('Import failed: ' + error.message);
        else toast.success(`Imported ${rows.length} records to ${importTable}!`);
      } catch {
        toast.error('Invalid file format');
      }
      setLoading(false);
      setImportFile(null);
      setImportPreview([]);
    };
    reader.readAsText(importFile);
  };

  return (
    <AdminLayout title="Backup & Restore">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: <Database size={20} />, label: 'Total Backups', value: stats.total, color: '#D4AF37' },
          { icon: <Clock size={20} />, label: 'Last Backup', value: stats.lastBackup || 'Never', color: '#3B82F6' },
          { icon: <HardDrive size={20} />, label: 'Latest Size', value: stats.size, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-2" style={{ color: s.color }}>{s.icon}<span className="text-gray-400 text-sm">{s.label}</span></div>
            <p className="text-white font-bold text-lg">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full Backup */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-6">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2"><Shield size={18} className="text-[#D4AF37]" /> Full Database Backup</h3>
          <p className="text-gray-400 text-sm mb-4">Creates a complete backup of all {BACKUP_TABLES.length} tables and downloads it as JSON.</p>
          {progress && (
            <div className="bg-[#111827] rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 text-[#D4AF37] text-sm"><RefreshCw size={14} className="animate-spin" /> {progress}</div>
            </div>
          )}
          <button onClick={createFullBackup} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3 rounded-xl transition-colors">
            <Download size={18} /> {loading ? 'Creating...' : 'Create Full Backup & Download'}
          </button>
          <p className="text-gray-500 text-xs mt-2 text-center">Includes: {BACKUP_TABLES.join(', ')}</p>
        </div>

        {/* Export */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Download size={18} className="text-[#3B82F6]" /> Export Data</h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Table</label>
              <select value={exportTable} onChange={e => setExportTable(e.target.value)}
                className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                <option value="all">All Tables</option>
                {BACKUP_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Format</label>
              <div className="flex gap-2">
                {(['json', 'csv'] as const).map(f => (
                  <button key={f} onClick={() => setExportFormat(f)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors uppercase ${exportFormat === f ? 'bg-[#3B82F6] text-white' : 'bg-[#111827] text-gray-400 border border-[#374151]'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={exportData} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
            <Download size={16} /> Export {exportFormat.toUpperCase()}
          </button>
        </div>

        {/* Import */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Upload size={18} className="text-[#10B981]" /> Import Data</h3>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-1.5">Target Table</label>
              <select value={importTable} onChange={e => setImportTable(e.target.value)}
                className="w-full bg-[#111827] border border-[#374151] text-white px-3 py-2.5 rounded-xl outline-none text-sm">
                {['products', 'customers', 'expenses', 'coupons', 'blog_posts'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#374151] hover:border-[#D4AF37]/50 rounded-xl p-6 cursor-pointer transition-colors">
              <Upload size={24} className="text-gray-500 mb-2" />
              <p className="text-gray-400 text-sm">{importFile ? importFile.name : 'Click to upload JSON or CSV'}</p>
              <p className="text-gray-600 text-xs mt-1">Supports JSON, CSV, XLSX</p>
              <input type="file" accept=".json,.csv,.xlsx" className="hidden" onChange={e => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
            </label>
            {importPreview.length > 0 && (
              <div className="bg-[#111827] rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-2">Preview (first 3 records):</p>
                <pre className="text-green-400 text-xs overflow-auto max-h-20">{JSON.stringify(importPreview, null, 2)}</pre>
              </div>
            )}
          </div>
          <button onClick={handleImport} disabled={!importFile || loading}
            className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
            <Upload size={16} /> Import Data
          </button>
        </div>

        {/* Backup History */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-[#8B5CF6]" /> Backup History</h3>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <Database size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No backups yet. Create your first backup above.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {backups.map((backup: any) => (
                <div key={backup.id} className="flex items-center justify-between bg-[#111827] rounded-xl p-3">
                  <div>
                    <p className="text-white text-sm font-medium">{backup.name}</p>
                    <p className="text-gray-500 text-xs">{new Date(backup.timestamp).toLocaleString('en-IN')} · {backup.size}</p>
                    <p className="text-gray-600 text-xs">{backup.tables} tables</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => downloadBackup(backup)} className="w-8 h-8 bg-[#374151] hover:bg-[#4b5563] rounded-lg flex items-center justify-center text-[#D4AF37] transition-colors"><Download size={14} /></button>
                    <button onClick={() => setRestoreConfirm(backup)} className="w-8 h-8 bg-[#374151] hover:bg-[#4b5563] rounded-lg flex items-center justify-center text-[#3B82F6] transition-colors"><RefreshCw size={14} /></button>
                    <button onClick={() => deleteBackup(backup.id)} className="w-8 h-8 bg-[#374151] hover:bg-red-900/30 rounded-lg flex items-center justify-center text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Restore Confirm Modal */}
      <AnimatePresence>
        {restoreConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#1f2937] border border-yellow-900/50 rounded-2xl p-6 max-w-sm w-full">
              <AlertTriangle size={32} className="text-yellow-400 mx-auto mb-3" />
              <h3 className="text-white font-bold text-center mb-2">Restore Backup?</h3>
              <p className="text-gray-400 text-sm text-center mb-2">Restoring <strong className="text-white">{restoreConfirm.name}</strong> will overwrite current data.</p>
              <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-3 mb-4">
                <p className="text-yellow-300 text-xs">⚠️ A pre-restore backup will be created automatically before overwriting any data.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => restoreBackup(restoreConfirm)} disabled={loading}
                  className="flex-1 bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-2.5 rounded-xl text-sm">
                  {loading ? 'Restoring...' : 'Yes, Restore'}
                </button>
                <button onClick={() => setRestoreConfirm(null)} className="flex-1 border border-[#374151] text-gray-400 py-2.5 rounded-xl text-sm hover:bg-[#374151]">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default BackupPage;
