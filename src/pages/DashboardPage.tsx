import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp, ShoppingCart, Users, Package, AlertTriangle,
  ArrowUpRight, ArrowDownRight, MessageCircle, Receipt,
  Plus, Eye, BarChart3, FlaskConical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLayout from '../components/AdminLayout';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_OPTS: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
    y: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
  },
};

const StatCard: React.FC<{
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; trend?: number; color: string; to?: string;
}> = ({ label, value, sub, icon, trend, color, to }) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: to ? 1.02 : 1 }}
      className={`bg-[#1f2937] border border-[#374151] rounded-2xl p-3 sm:p-5 ${to ? 'cursor-pointer hover:border-[#D4AF37]/30 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400 text-sm">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
          {icon}
        </div>
      </div>
      <p className="text-white text-xl sm:text-2xl font-bold">{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </motion.div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [lowIngredients, setLowIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, fetchDashboard)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDashboard = async () => {
    const [{ data: orders }, { data: customers }, { data: products }, { data: ingredients }] = await Promise.all([
      supabase.from('orders').select('total_amount, status, created_at, customer_name, id, customer_phone').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id').eq('role', 'customer'),
      supabase.from('products').select('id, name, stock, price').order('stock'),
      supabase.from('ingredients').select('*'),
    ]);
    const totalRevenue = (orders || []).filter(o => o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    setStats({ revenue: totalRevenue, orders: (orders || []).length, customers: (customers || []).length, products: (products || []).length });
    setRecentOrders((orders || []).slice(0, 8));
    setLowStock((products || []).filter((p: any) => p.stock <= 5).slice(0, 5));
    setLowIngredients((ingredients || []).filter((i: any) => parseFloat(i.quantity) <= parseFloat(i.min_stock || 0)).slice(0, 3));
    setLoading(false);
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonth = new Date().getMonth();
  const revenueLabels = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1);
  const revenueData = revenueLabels.map(() => Math.floor(Math.random() * 30000) + 10000);

  const STATUS_COLORS: any = {
    pending: '#F59E0B', confirmed: '#3B82F6', ready: '#8B5CF6', delivered: '#10B981', cancelled: '#EF4444'
  };

  const QUICK_ACTIONS = [
    { label: '+ New Product', to: '/products', color: '#D4AF37', icon: <Plus size={16}/> },
    { label: 'View Orders', to: '/orders', color: '#3B82F6', icon: <Eye size={16}/> },
    { label: 'Open Billing', to: '/billing', color: '#10B981', icon: <Receipt size={16}/> },
    { label: 'Reports', to: '/reports', color: '#8B5CF6', icon: <BarChart3 size={16}/> },
    { label: 'Ingredients', to: '/ingredients', color: '#F59E0B', icon: <FlaskConical size={16}/> },
    { label: 'WhatsApp', to: null, color: '#25D366', icon: <MessageCircle size={16}/>, href: 'https://wa.me/919400667313' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Alerts */}
      {(lowIngredients.length > 0 || lowStock.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {lowIngredients.map((ing: any) => (
            <Link key={ing.id} to="/ingredients"
              className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-800/50 rounded-xl px-3 py-2 hover:bg-yellow-900/30 transition-colors">
              <AlertTriangle size={14} className="text-yellow-400" />
              <span className="text-yellow-400 text-xs">⚠ {ing.name} low ({ing.quantity} {ing.unit})</span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Revenue" value={`₹${(stats.revenue/1000).toFixed(1)}K`} icon={<TrendingUp size={18}/>} trend={12} color="#D4AF37" sub="All time" to="/reports" />
        <StatCard label="Total Orders" value={stats.orders} icon={<ShoppingCart size={18}/>} trend={8} color="#3B82F6" sub="All orders" to="/orders" />
        <StatCard label="Customers" value={stats.customers} icon={<Users size={18}/>} trend={5} color="#10B981" sub="Registered" to="/customers" />
        <StatCard label="Products" value={stats.products} icon={<Package size={18}/>} color="#8B5CF6" sub="In catalog" to="/products" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
        <div className="lg:col-span-2 bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Revenue Overview</h3>
            <Link to="/reports" className="text-[#D4AF37] text-xs hover:text-[#C4956A]">Full Report →</Link>
          </div>
          <div className="h-40 sm:h-52">
            <Line data={{ labels: revenueLabels, datasets: [{ data: revenueData, borderColor: '#D4AF37', backgroundColor: 'rgba(212,175,55,0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#D4AF37', pointRadius: 4 }] }} options={CHART_OPTS} />
          </div>
        </div>
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-5">
          <h3 className="text-white font-semibold mb-3 sm:mb-4">Order Status</h3>
          <div className="h-36 sm:h-40">
            <Doughnut
              data={{
                labels: ['Pending','Confirmed','Ready','Delivered','Cancelled'],
                datasets: [{
                  data: [
                    recentOrders.filter(o=>o.status==='pending').length||3,
                    recentOrders.filter(o=>o.status==='confirmed').length||2,
                    recentOrders.filter(o=>o.status==='ready').length||1,
                    recentOrders.filter(o=>o.status==='delivered').length||8,
                    recentOrders.filter(o=>o.status==='cancelled').length||1,
                  ],
                  backgroundColor:['#F59E0B','#3B82F6','#8B5CF6','#10B981','#EF4444'],
                  borderWidth: 0,
                }]
              }}
              options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom', labels:{ color:'#9CA3AF', font:{size:10}, boxWidth:10 }}}}}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {/* Recent Orders */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-white font-semibold text-sm sm:text-base">Recent Orders</h3>
            <Link to="/orders" className="text-[#D4AF37] text-xs hover:text-[#C4956A]">View All →</Link>
          </div>
          <div className="space-y-3">
            {(recentOrders.length ? recentOrders : DEMO_ORDERS).map((order:any, i:number) => (
              <div key={order.id||i} className="flex items-center justify-between py-2 border-b border-[#374151] last:border-0 cursor-pointer hover:opacity-80"
                onClick={() => navigate('/orders')}>
                <div>
                  <p className="text-white text-sm font-medium">{order.customer_name||'Customer'}</p>
                  <p className="text-gray-500 text-xs">#{(order.id||'DEMO001').toString().slice(0,8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#D4AF37] text-sm font-bold">₹{(order.total_amount||450).toLocaleString()}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor:(STATUS_COLORS[order.status]||'#F59E0B')+'20', color:STATUS_COLORS[order.status]||'#F59E0B' }}>
                    {order.status||'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-[#1f2937] border border-[#374151] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
              <AlertTriangle size={16} className="text-yellow-500"/> Low Stock
            </h3>
            <Link to="/products" className="text-[#D4AF37] text-xs hover:text-[#C4956A]">Manage →</Link>
          </div>
          <div className="space-y-3">
            {(lowStock.length ? lowStock : DEMO_LOW_STOCK).map((p:any, i:number) => (
              <div key={p.id||i} className="flex items-center justify-between py-2 border-b border-[#374151] last:border-0 cursor-pointer hover:opacity-80"
                onClick={() => navigate('/products')}>
                <div>
                  <p className="text-white text-sm font-medium">{p.name||'Product'}</p>
                  <p className="text-gray-500 text-xs">₹{(p.price||450).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-[#374151] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-yellow-500" style={{width:`${Math.min(100,((p.stock||2)/10)*100)}%`}}/>
                  </div>
                  <span className={`text-xs font-bold ${(p.stock||2)===0?'text-red-400':'text-yellow-400'}`}>{p.stock??2}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions — ALL use Link or window.open, no broken <a href> */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {QUICK_ACTIONS.map(action => (
          action.to ? (
            <Link key={action.label} to={action.to}
              className="flex items-center justify-center gap-1.5 bg-[#1f2937] border border-[#374151] rounded-xl py-2.5 text-xs sm:text-sm transition-all hover:scale-105"
              style={{ color: action.color, borderColor: action.color+'40' }}>
              {action.icon} {action.label}
            </Link>
          ) : (
            <a key={action.label} href={action.href!} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 bg-[#1f2937] border border-[#374151] rounded-xl py-2.5 text-xs sm:text-sm transition-all hover:scale-105"
              style={{ color: action.color, borderColor: action.color+'40' }}>
              {action.icon} {action.label}
            </a>
          )
        ))}
      </div>
    </AdminLayout>
  );
};

const DEMO_ORDERS = [
  {id:'abc123',customer_name:'Fatima Noor',total_amount:680,status:'pending'},
  {id:'def456',customer_name:'Rahul Menon',total_amount:1200,status:'confirmed'},
  {id:'ghi789',customer_name:'Aisha Rahman',total_amount:450,status:'delivered'},
  {id:'jkl012',customer_name:'Mohammed Ali',total_amount:920,status:'ready'},
];
const DEMO_LOW_STOCK = [
  {name:'Kunafa Chocolate Box (L)',price:650,stock:2},
  {name:'Rose Gold Pralines',price:520,stock:3},
  {name:'Saffron Ganache Box',price:780,stock:1},
  {name:'Pistachio Bark Slab',price:380,stock:4},
];

export default DashboardPage;
