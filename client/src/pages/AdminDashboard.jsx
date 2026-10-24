import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  UtensilsCrossed, 
  Plus, 
  Edit2, 
  Trash2, 
  FileSpreadsheet, 
  Check, 
  X, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  Layers,
  Eye,
  LogOut,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MetricCardSkeleton } from '../components/SkeletonLoader';

export default function AdminDashboard({ onOpenAuth }) {
  const { isAdmin, logout, loginAsDemoAdmin, isDemoAllowed } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'categories', 'customers', 'sheets'
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [foodCategoryFilter, setFoodCategoryFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');

  // Modals state
  const [editingFood, setEditingFood] = useState(null);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodFormData, setFoodFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
    preparation_time: 20,
    calories: '',
    tags: ''
  });

  const [editingCategory, setEditingCategory] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    sort_order: 0
  });

  const [inspectedOrder, setInspectedOrder] = useState(null);

  // Google Sheets sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Status banners
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, oRes, fRes, cRes, custRes] = await Promise.all([
        api.getAdminMetrics().catch(() => ({ data: null })),
        api.getAdminOrders({ status: orderStatusFilter, search: orderSearch }).catch(() => ({ data: [] })),
        api.getFoods({ availableOnly: 'false' }).catch(() => ({ data: [] })),
        api.getCategories().catch(() => ({ data: [] })),
        api.getAdminCustomers().catch(() => ({ data: [] }))
      ]);

      setMetrics(mRes.data);
      setOrders(oRes.data || []);
      setFoods(fRes.data || []);
      setCategories(cRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      console.error('Admin load error:', err);
      setError(err.message || 'Failed to fetch administrative data.');
    } finally {
      setLoading(false);
    }
  }, [orderStatusFilter, orderSearch]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadAdminData]);

  const handleAdminLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Protected Gate
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 animate-fade-in shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white font-serif">Administrator Access Required</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          This portal is restricted to authorized culinary administrators and executive personnel.
        </p>
        <div className="pt-2 flex flex-col gap-2.5">
          {isDemoAllowed && (
            <button
              onClick={loginAsDemoAdmin}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01]"
            >
              1-Click Demo Admin Sign-In (Evaluation)
            </button>
          )}
          <button
            onClick={onOpenAuth}
            className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            Sign In to Authorized Admin Account
          </button>
        </div>
      </div>
    );
  }

  // --- ORDER ACTIONS ---
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (inspectedOrder && inspectedOrder.id === orderId) {
        setInspectedOrder({ ...inspectedOrder, status: newStatus });
      }
      setMessage(`Order status updated to "${newStatus}".`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update order status');
    }
  };

  // --- FOOD ACTIONS ---
  const handleToggleAvailability = async (foodId, currentStatus) => {
    try {
      await api.toggleFoodAvailability(foodId, !currentStatus);
      setFoods(foods.map(f => f.id === foodId ? { ...f, is_available: !currentStatus } : f));
      setMessage(`Dish availability updated.`);
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      setError(err.message || 'Failed to toggle food availability');
    }
  };

  const handleDeleteFood = async (foodId) => {
    if (!window.confirm('Are you sure you want to remove this dish from the menu?')) return;
    try {
      await api.deleteFood(foodId);
      setFoods(foods.filter(f => f.id !== foodId));
      setMessage('Food item removed successfully.');
      setTimeout(() => setMessage(null), 2500);
    } catch (err) {
      setError(err.message || 'Failed to delete food item');
    }
  };

  const openFoodModal = (food = null) => {
    if (food) {
      setEditingFood(food);
      setFoodFormData({
        name: food.name,
        category_id: food.category_id || '',
        description: food.description || '',
        price: food.price,
        image_url: food.image_url || '',
        is_available: food.is_available,
        preparation_time: food.preparation_time || 20,
        calories: food.calories || '',
        tags: Array.isArray(food.tags) ? food.tags.join(', ') : ''
      });
    } else {
      setEditingFood(null);
      setFoodFormData({
        name: '',
        category_id: categories[0]?.id || '',
        description: '',
        price: '',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        is_available: true,
        preparation_time: 20,
        calories: '',
        tags: 'Chef Special, New'
      });
    }
    setIsFoodModalOpen(true);
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: foodFormData.name,
        category_id: foodFormData.category_id || null,
        description: foodFormData.description,
        price: Number(foodFormData.price),
        image_url: foodFormData.image_url,
        is_available: foodFormData.is_available,
        preparation_time: Number(foodFormData.preparation_time),
        calories: foodFormData.calories ? Number(foodFormData.calories) : null,
        tags: foodFormData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (editingFood) {
        const res = await api.updateFood(editingFood.id, payload);
        setFoods(foods.map(f => f.id === editingFood.id ? (res.data || { ...f, ...payload }) : f));
        setMessage(`Dish "${payload.name}" updated successfully.`);
      } else {
        const res = await api.createFood(payload);
        setFoods([res.data || payload, ...foods]);
        setMessage(`Dish "${payload.name}" added to menu.`);
      }

      setIsFoodModalOpen(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save food dish');
    }
  };

  // --- CATEGORY ACTIONS ---
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryFormData({
        name: cat.name,
        slug: cat.slug || '',
        description: cat.description || '',
        image_url: cat.image_url || '',
        sort_order: cat.sort_order || 0
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        slug: '',
        description: '',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        sort_order: categories.length + 1
      });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        const res = await api.updateCategory(editingCategory.id, categoryFormData);
        setCategories(categories.map(c => c.id === editingCategory.id ? (res.data || { ...c, ...categoryFormData }) : c));
        setMessage(`Category "${categoryFormData.name}" updated.`);
      } else {
        const res = await api.createCategory(categoryFormData);
        setCategories([...categories, res.data || categoryFormData]);
        setMessage(`Category "${categoryFormData.name}" created.`);
      }
      setIsCategoryModalOpen(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const linkedDishes = foods.filter(f => f.category_id === categoryId);
    if (linkedDishes.length > 0) {
      setError(`Cannot delete category: ${linkedDishes.length} dish(es) are assigned to it. Please reassign or delete those dishes first.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.deleteCategory(categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
      setMessage('Category deleted successfully.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    }
  };

  // Google Sheets sync
  const handleTriggerSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await api.syncGoogleSheets();
      setSyncResult(res);
      loadAdminData();
    } catch (err) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncLoading(false);
    }
  };

  // Filtered views
  const filteredFoods = foods.filter(f => {
    if (foodCategoryFilter === 'all') return true;
    return f.category_id === foodCategoryFilter;
  });

  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 py-6 animate-fade-in">
      {/* Header with Navigation and Logout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrative Command Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white font-serif tracking-tight">Executive Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervise live orders, manage food menus and categories, monitor customer activity, and synchronize operational data
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleAdminLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !metrics ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Total Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                ${metrics?.totalRevenue?.toFixed(2) || '0.00'}
              </p>
              <span className="text-[10px] text-emerald-400 block font-medium">From verified customer orders</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Active Orders</span>
                <ShoppingBag className="w-4 h-4 text-brand-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {metrics?.activeOrders || 0}
              </p>
              <span className="text-[10px] text-slate-400 block">Pending / Cooking / In Transit</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Menu Dishes & Categories</span>
                <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {metrics?.availableFoods || 0} / {metrics?.totalFoods || foods.length || 0}
              </p>
              <span className="text-[10px] text-amber-400 block font-medium">{categories.length} active categories</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Customer Accounts</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white font-mono">
                {metrics?.totalCustomers || customers.length || 0}
              </p>
              <span className="text-[10px] text-blue-400 block font-medium">Registered customer profiles</span>
            </div>
          </>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Customer Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'menu'
              ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Menu Dishes ({foods.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'categories'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customer Directory ({customers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sheets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'sheets'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Google Sheets Sync</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ORDERS MANAGEMENT */}
      {/* ==================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter Status:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order #, customer, email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Order ID & Date</th>
                    <th className="p-4">Customer Details</th>
                    <th className="p-4">Items Summary</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Live Status</th>
                    <th className="p-4">Quick Update</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-300">No orders match the current filter.</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Try selecting another status or clearing the search query.</p>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-4">
                          <span className="font-mono font-bold text-white block">{order.order_number}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(order.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-white block">{order.customer_name}</span>
                          <span className="text-[11px] text-slate-400 block">{order.customer_email}</span>
                          <span className="text-[11px] text-slate-400">{order.customer_phone}</span>
                        </td>

                        <td className="p-4 max-w-xs">
                          {Array.isArray(order.items) && (
                            <div className="space-y-0.5">
                              {order.items.map((i, idx) => (
                                <p key={idx} className="text-slate-300 text-[11px] truncate">
                                  {i.quantity}x {i.food_name}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="font-mono font-bold text-white block text-sm">
                            ${Number(order.total_amount).toFixed(2)}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-emerald-400">
                            {order.payment_method?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                            order.status === 'preparing' ? 'bg-brand-500/20 text-brand-300 border-brand-500/30' :
                            order.status === 'out_for_delivery' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="p-4">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => setInspectedOrder(order)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 ml-auto text-xs"
                            title="Inspect complete order details"
                          >
                            <Eye className="w-3.5 h-3.5 text-brand-400" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: MENU CATALOG */}
      {/* ==================================================================== */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Category:</span>
              <select
                value={foodCategoryFilter}
                onChange={(e) => setFoodCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => openFoodModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Dish Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Availability</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFoods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <UtensilsCrossed className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-300">No food dishes match the selected category.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFoods.map((food) => (
                      <tr key={food.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={food.image_url}
                            alt={food.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-800"
                          />
                          <div>
                            <span className="font-bold text-white block">{food.name}</span>
                            <span className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{food.description}</span>
                          </div>
                        </td>

                        <td className="p-4 text-slate-300">
                          {categories.find(c => c.id === food.category_id)?.name || food.category_name || 'Artisanal Selection'}
                        </td>

                        <td className="p-4 font-mono font-bold text-white">
                          ${Number(food.price).toFixed(2)}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAvailability(food.id, food.is_available)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                              food.is_available
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300'
                            }`}
                          >
                            {food.is_available ? 'Available' : 'Sold Out (86ed)'}
                          </button>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openFoodModal(food)}
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500 text-slate-300 hover:text-white transition-colors"
                              title="Edit Dish"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFood(food.id)}
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Dish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CATEGORIES MANAGEMENT */}
      {/* ==================================================================== */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Manage menu category taxonomy, navigation slugs, and presentation order
            </p>
            <button
              onClick={() => openCategoryModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Category</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Category Details</th>
                    <th className="p-4">Slug Identifier</th>
                    <th className="p-4">Sort Order</th>
                    <th className="p-4">Linked Dishes</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-300">No categories found.</p>
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => {
                      const dishCount = foods.filter(f => f.category_id === cat.id).length;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            {cat.image_url && (
                              <img
                                src={cat.image_url}
                                alt={cat.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-800"
                              />
                            )}
                            <div>
                              <span className="font-bold text-white block">{cat.name}</span>
                              <span className="text-[11px] text-slate-400 line-clamp-1 max-w-sm">{cat.description || '—'}</span>
                            </div>
                          </td>

                          <td className="p-4 font-mono text-slate-300">
                            {cat.slug}
                          </td>

                          <td className="p-4 text-white font-mono">
                            {cat.sort_order || 0}
                          </td>

                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-medium text-[11px]">
                              {dishCount} dish(es)
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openCategoryModal(cat)}
                                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500 text-slate-300 hover:text-white transition-colors"
                                title="Edit Category"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: CUSTOMERS DIRECTORY */}
      {/* ==================================================================== */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Registered customer profiles with verified email identities and role badges
            </p>
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by customer name or email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Customer Name & Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Saved Delivery Address</th>
                    <th className="p-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-300">No customers found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-white block">{c.full_name || 'Customer'}</span>
                          <span className="text-[11px] text-slate-400">{c.email}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            c.role === 'admin' 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {c.role}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">{c.phone || '—'}</td>
                        <td className="p-4 text-slate-300 max-w-xs truncate">{c.address || '—'}</td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: GOOGLE SHEETS SECONDARY SYNC */}
      {/* ==================================================================== */}
      {activeTab === 'sheets' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google Sheets Operational Replica</h3>
                  <p className="text-xs text-slate-400">
                    Authoritative ACID database is Supabase PostgreSQL. Google Sheets acts as an operational replica for logistics and analytics.
                  </p>
                </div>
              </div>

              <button
                onClick={handleTriggerSync}
                disabled={syncLoading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                <span>{syncLoading ? 'Synchronizing...' : 'Batch Resync Orders'}</span>
              </button>
            </div>

            {syncResult && (
              <div className={`p-4 rounded-2xl border text-xs ${
                syncResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}>
                <p className="font-semibold">{syncResult.message || syncResult.error}</p>
                {syncResult.syncedCount !== undefined && (
                  <p className="text-[11px] mt-1 text-slate-300">
                    Orders successfully batch synchronized: {syncResult.syncedCount}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Spreadsheet Target Tabs</span>
                <span className="text-white font-semibold">Customers, Orders, Order_Items, Sync_Logs</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Sync Protocol</span>
                <span className="text-white font-semibold">Idempotent Webhook with Shared Token</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Authoritative ACID DB</span>
                <span className="text-emerald-400 font-semibold">Supabase PostgreSQL (ACID)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ORDER DETAILS INSPECTION */}
      {/* ==================================================================== */}
      {inspectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up space-y-6">
            <button
              onClick={() => setInspectedOrder(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Inspection</span>
                <h3 className="text-xl font-bold text-white font-mono">{inspectedOrder.order_number}</h3>
              </div>
              <div className="text-right pr-8">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Order Status</span>
                <select
                  value={inspectedOrder.status}
                  onChange={(e) => handleUpdateOrderStatus(inspectedOrder.id, e.target.value)}
                  className="mt-1 px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="preparing">Preparing</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Customer & Delivery Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs text-brand-400">
                  <Users className="w-3.5 h-3.5" /> Customer Details
                </h4>
                <p className="text-white font-medium">{inspectedOrder.customer_name}</p>
                <p className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-500" /> {inspectedOrder.customer_email}</p>
                <p className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-500" /> {inspectedOrder.customer_phone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5 text-xs text-brand-400">
                  <MapPin className="w-3.5 h-3.5" /> Delivery Information
                </h4>
                <p className="text-white leading-relaxed">{inspectedOrder.delivery_address}</p>
                {inspectedOrder.delivery_notes && (
                  <p className="text-amber-300 text-[11px] pt-1 border-t border-slate-800">
                    <span className="font-semibold text-slate-400">Notes:</span> {inspectedOrder.delivery_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Itemized Breakdown</h4>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 divide-y divide-slate-850 overflow-hidden text-xs">
                {Array.isArray(inspectedOrder.items) && inspectedOrder.items.length > 0 ? (
                  inspectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-white">{item.food_name}</span>
                        <span className="text-slate-400 block text-[11px]">
                          {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-white">
                        ${Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-slate-500 text-center">No line items recorded for this order.</p>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-white">${Number(inspectedOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax (8.25%)</span>
                <span className="font-mono text-white">${Number(inspectedOrder.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Delivery Fee</span>
                <span className="font-mono text-white">${Number(inspectedOrder.delivery_fee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                <span>Total Amount</span>
                <span className="font-mono text-brand-400">${Number(inspectedOrder.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setInspectedOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT FOOD DISH */}
      {/* ==================================================================== */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <button
              onClick={() => setIsFoodModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white font-serif mb-4">
              {editingFood ? 'Edit Culinary Dish' : 'Add New Culinary Dish'}
            </h3>

            <form onSubmit={handleSaveFood} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={foodFormData.name}
                  onChange={(e) => setFoodFormData({ ...foodFormData, name: e.target.value })}
                  placeholder="e.g. Wagyu Truffle Smash"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={foodFormData.category_id}
                    onChange={(e) => setFoodFormData({ ...foodFormData, category_id: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={foodFormData.price}
                    onChange={(e) => setFoodFormData({ ...foodFormData, price: e.target.value })}
                    placeholder="15.99"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={foodFormData.description}
                  onChange={(e) => setFoodFormData({ ...foodFormData, description: e.target.value })}
                  placeholder="Describe ingredients, culinary method, flavor profile..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={foodFormData.image_url}
                  onChange={(e) => setFoodFormData({ ...foodFormData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    value={foodFormData.preparation_time}
                    onChange={(e) => setFoodFormData({ ...foodFormData, preparation_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={foodFormData.calories}
                    onChange={(e) => setFoodFormData({ ...foodFormData, calories: e.target.value })}
                    placeholder="750"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={foodFormData.tags}
                  onChange={(e) => setFoodFormData({ ...foodFormData, tags: e.target.value })}
                  placeholder="Chef Special, Bestseller, Wagyu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={foodFormData.is_available}
                    onChange={(e) => setFoodFormData({ ...foodFormData, is_available: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500"
                  />
                  <span>Dish is Available Today</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.01]"
                >
                  {editingFood ? 'Save Dish Changes' : 'Create Dish'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFoodModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD / EDIT CATEGORY */}
      {/* ==================================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-slide-up">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white font-serif mb-4">
              {editingCategory ? 'Edit Menu Category' : 'Create New Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  placeholder="e.g. Wood-Fired Specialties"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Slug (URL Identifier - Optional)</label>
                <input
                  type="text"
                  value={categoryFormData.slug}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                  placeholder="wood-fired-specialties (auto-derived if empty)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  placeholder="Brief summary of dishes in this collection..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Image URL</label>
                <input
                  type="url"
                  value={categoryFormData.image_url}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Sort Order (Priority in Menu)</label>
                <input
                  type="number"
                  value={categoryFormData.sort_order}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-brand-500 hover:from-amber-600 hover:to-brand-600 text-white font-semibold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01]"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
