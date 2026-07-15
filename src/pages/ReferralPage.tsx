import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gift, Users, Award, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';
import toast from 'react-hot-toast';

const ReferralPage = () => {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [milestones, setMilestones] = useState([
    { count: 3, reward: '₹100 coupon', code: 'REF3CHOCO' },
    { count: 5, reward: '₹200 coupon', code: 'REF5CHOCO' },
    { count: 10, reward: '15% discount', code: 'REF10CHOCO' },
  ]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    supabase.from('referrals').select('*, profiles!referrer_id(full_name, email)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setReferrals(data || DEMO_REFERRALS));
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
    toast.success('Copied!');
  };

  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const rewardsGiven = referrals.filter(r => r.reward_coupon_id).length;

  return (
    <AdminLayout title="Referral System">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Referrals', value: totalReferrals, color: '#D4AF37' },
          { label: 'Completed', value: completedReferrals, color: '#10B981' },
          { label: 'Rewards Given', value: rewardsGiven, color: '#8B5CF6' },
        ].map(s => (
          <div key={s.label} className="bg-[#1f2937] border border-[#374151] rounded-xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="font-bold text-2xl mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Milestones */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-5 mb-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Award size={18} className="text-[#D4AF37]"/> Reward Milestones</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {milestones.map((m, i) => (
            <div key={i} className="bg-[#111827] border border-[#374151] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={16} className="text-[#D4AF37]"/>
                <span className="text-white font-bold">Refer {m.count} friends</span>
              </div>
              <p className="text-[#D4AF37] text-sm mb-2">Reward: {m.reward}</p>
              <div className="flex items-center gap-2">
                <code className="text-green-400 text-xs bg-[#1f2937] px-2 py-1 rounded">{m.code}</code>
                <button onClick={() => copy(m.code)} className="text-gray-400 hover:text-white">
                  {copied === m.code ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Referral List */}
      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#374151]">
          <h3 className="text-white font-semibold flex items-center gap-2"><Users size={16} className="text-[#D4AF37]"/> Referral History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-[#374151]">
              {['Referrer', 'Code', 'Referred', 'Status', 'Reward', 'Date'].map(h => (
                <th key={h} className="text-left text-gray-400 text-xs uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {referrals.map((r: any, i: number) => (
                <tr key={r.id || i} className="border-b border-[#374151]/50 hover:bg-[#374151]/20">
                  <td className="px-4 py-3 text-white text-sm">{r.profiles?.full_name || r.referrer_name || 'Customer'}</td>
                  <td className="px-4 py-3"><code className="text-green-400 text-xs bg-[#111827] px-2 py-0.5 rounded">{r.referral_code}</code></td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{r.referred_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                      {r.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{r.reward_coupon_id ? '✅ Given' : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">{new Date(r.created_at || Date.now()).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {referrals.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-500">No referrals yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

const DEMO_REFERRALS = [
  { id: '1', referral_code: 'FATI-REF01', referrer_name: 'Fatima Noor', referred_name: 'Sara Ali', status: 'completed', reward_coupon_id: 'c1', created_at: new Date().toISOString() },
  { id: '2', referral_code: 'RAHU-REF01', referrer_name: 'Rahul Menon', referred_name: null, status: 'pending', reward_coupon_id: null, created_at: new Date().toISOString() },
];

export default ReferralPage;
