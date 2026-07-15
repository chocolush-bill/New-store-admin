import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, X } from 'lucide-react';
import Sidebar from './Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#111827] flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main — offset by sidebar only on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-[#1f2937] border-b border-[#374151] px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors shrink-0 p-1"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            {title && (
              <h1 className="text-white font-bold text-base truncate">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-[#111827] border border-[#374151] rounded-xl px-3 py-2 w-44">
              <Search size={13} className="text-gray-500 shrink-0" />
              <input placeholder="Search..." className="bg-transparent text-sm text-gray-400 outline-none placeholder-gray-600 w-full min-w-0" />
            </div>

            <button className="relative w-8 h-8 rounded-xl bg-[#111827] border border-[#374151] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#D4AF37] rounded-full" />
            </button>

            <div className="w-8 h-8 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl flex items-center justify-center">
              <span className="text-[#D4AF37] text-xs font-bold">AD</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-5 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
