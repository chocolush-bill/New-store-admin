import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Receipt,
  BarChart3, TrendingUp, Wallet, FileText, Star, Tag, Mail,
  Settings, LogOut, Database, Grid3X3, FlaskConical, Factory,
  Megaphone, Gift, X
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import toast from 'react-hot-toast';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    ],
  },
  {
    label: 'Store',
    items: [
      { label: 'Products', icon: Package, href: '/products' },
      { label: 'Categories', icon: Grid3X3, href: '/categories' },
      { label: 'Orders', icon: ShoppingCart, href: '/orders' },
      { label: 'Customers', icon: Users, href: '/customers' },
      { label: 'Billing / POS', icon: Receipt, href: '/billing' },
    ],
  },
  {
    label: 'Kitchen',
    items: [
      { label: 'Ingredients', icon: FlaskConical, href: '/ingredients' },
      { label: 'Production', icon: Factory, href: '/production' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Campaigns', icon: Megaphone, href: '/campaigns' },
      { label: 'Referrals', icon: Gift, href: '/referrals' },
      { label: 'Coupons', icon: Tag, href: '/coupons' },
      { label: 'Newsletter', icon: Mail, href: '/newsletter' },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Blog', icon: FileText, href: '/blog' },
      { label: 'Reviews', icon: Star, href: '/reviews' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Reports', icon: BarChart3, href: '/reports' },
      { label: 'Profits', icon: TrendingUp, href: '/profits' },
      { label: 'Expenses', icon: Wallet, href: '/expenses' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Store Settings', icon: Settings, href: '/settings' },
      { label: 'Backup', icon: Database, href: '/backup' },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAdminAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#374151] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#D4AF37] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-[#111827] font-bold text-sm">C</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wider leading-tight" style={{ fontFamily: 'Georgia, serif' }}>CHOCOLUSH</p>
            <p className="text-gray-500 text-[9px] tracking-widest">ADMIN PANEL</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 font-semibold px-3 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                      active
                        ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                        : 'text-gray-400 hover:text-white hover:bg-[#374151]/50'
                    }`}
                  >
                    <item.icon size={16} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#374151] p-3">
        <div className="px-3 py-2 mb-1">
          <p className="text-white text-xs font-medium truncate">{profile?.full_name || 'Admin'}</p>
          <p className="text-gray-500 text-[10px] capitalize">{profile?.role || 'admin'}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-900/20 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  return (
    <>
      {/* Desktop sidebar — fixed, always visible on lg+ */}
      <aside className="hidden lg:flex flex-col bg-[#1f2937] border-r border-[#374151] fixed top-0 left-0 h-full w-60 z-40">
        <SidebarContent onClose={() => {}} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 h-full w-64 bg-[#1f2937] border-r border-[#374151] z-50 lg:hidden flex flex-col"
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
