import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const { signIn, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error, data } = await signIn(email, password);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Check admin role
    const { data: profile } = await import('../lib/supabase').then(m =>
      m.supabase.from('profiles').select('role').eq('id', data.user?.id).single()
    );
    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      await import('../lib/supabase').then(m => m.supabase.auth.signOut());
      toast.error('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    toast.success('Welcome to Chocolush Admin! 🍫');
    navigate('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1f2937]/50 via-[#111827] to-[#1f2937]/30" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl mb-4">
            <Shield size={28} className="text-[#D4AF37]" />
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            CHOCO<span className="text-[#D4AF37]">LUSH</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Admin Dashboard</p>
        </div>

        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-6">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="admin@chocolush.com"
                  className="w-full bg-[#111827] border border-[#374151] text-white pl-11 pr-4 py-3 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs tracking-widest uppercase block mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-[#111827] border border-[#374151] text-white pl-11 pr-12 py-3 rounded-xl outline-none focus:border-[#D4AF37]/50 placeholder-gray-600 text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#C4956A] disabled:opacity-50 text-[#111827] font-bold py-3.5 rounded-xl transition-colors text-sm tracking-wider"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
          <p className="text-center text-gray-600 text-xs mt-6">Protected admin access only</p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
