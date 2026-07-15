import React from 'react';
import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLogin from './pages/AdminLogin';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import BillingPage from './pages/BillingPage';
import BackupPage from './pages/BackupPage';
import CategoriesPage from './pages/CategoriesPage';
import IngredientsPage from './pages/IngredientsPage';
import ProductionPage from './pages/ProductionPage';
import CampaignsPage from './pages/CampaignsPage';
import SettingsManagerPage from './pages/SettingsManagerPage';
import ReferralPage from './pages/ReferralPage';
import {
  ReportsPage, ProfitsPage, ExpensesPage,
  BlogManagementPage, ReviewsPage, CouponsPage, NewsletterPage
} from './pages/AdminOtherPages';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAdminAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-400 text-sm">Loading Chocolush Admin...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace/>;
  if (!isAdmin) return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center text-center px-4">
      <div>
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 text-sm mb-4">Admin privileges required.</p>
        <button onClick={() => { import('./lib/supabase').then(m => m.supabase.auth.signOut()); window.location.hash='/login'; }}
          className="bg-[#D4AF37] text-[#111827] font-bold px-6 py-2 rounded-xl text-sm">Sign Out</button>
      </div>
    </div>
  );
  return <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <AdminAuthProvider>
      <Routes>
        <Route path="/login" element={<AdminLogin/>}/>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage/></ProtectedRoute>}/>
        <Route path="/products" element={<ProtectedRoute><ProductsPage/></ProtectedRoute>}/>
        <Route path="/products/new" element={<ProtectedRoute><ProductsPage/></ProtectedRoute>}/>
        <Route path="/categories" element={<ProtectedRoute><CategoriesPage/></ProtectedRoute>}/>
        <Route path="/orders" element={<ProtectedRoute><OrdersPage/></ProtectedRoute>}/>
        <Route path="/customers" element={<ProtectedRoute><CustomersPage/></ProtectedRoute>}/>
        <Route path="/billing" element={<ProtectedRoute><BillingPage/></ProtectedRoute>}/>
        <Route path="/reports" element={<ProtectedRoute><ReportsPage/></ProtectedRoute>}/>
        <Route path="/profits" element={<ProtectedRoute><ProfitsPage/></ProtectedRoute>}/>
        <Route path="/expenses" element={<ProtectedRoute><ExpensesPage/></ProtectedRoute>}/>
        <Route path="/ingredients" element={<ProtectedRoute><IngredientsPage/></ProtectedRoute>}/>
        <Route path="/production" element={<ProtectedRoute><ProductionPage/></ProtectedRoute>}/>
        <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage/></ProtectedRoute>}/>
        <Route path="/referrals" element={<ProtectedRoute><ReferralPage/></ProtectedRoute>}/>
        <Route path="/blog" element={<ProtectedRoute><BlogManagementPage/></ProtectedRoute>}/>
        <Route path="/reviews" element={<ProtectedRoute><ReviewsPage/></ProtectedRoute>}/>
        <Route path="/coupons" element={<ProtectedRoute><CouponsPage/></ProtectedRoute>}/>
        <Route path="/newsletter" element={<ProtectedRoute><NewsletterPage/></ProtectedRoute>}/>
        <Route path="/backup" element={<ProtectedRoute><BackupPage/></ProtectedRoute>}/>
        <Route path="/settings" element={<ProtectedRoute><SettingsManagerPage/></ProtectedRoute>}/>
        <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes>
      <Toaster position="top-right" toastOptions={{
        style:{background:'#1f2937',color:'#fff',border:'1px solid #374151'},
        success:{iconTheme:{primary:'#D4AF37',secondary:'#111827'}},
        error:{iconTheme:{primary:'#ef4444',secondary:'#111827'}},
      }}/>
    </AdminAuthProvider>
  </BrowserRouter>
);

export default App;
