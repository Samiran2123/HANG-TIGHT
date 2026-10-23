import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, ShoppingBag, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function MyOrders({ onOpenAuth }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getMyOrders();
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 mx-auto flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Sign In to View Orders</h2>
        <p className="text-xs text-slate-400">
          Sign in or use 1-Click Demo to review your recent gourmet orders and active tracking.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-serif tracking-tight">Your Order History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track active deliveries and review previous culinary orders
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh orders"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/80 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No orders placed yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't ordered any delicious dishes yet. Explore our artisanal menu today!
          </p>
          <Link
            to="/"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold"
          >
            Browse Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white font-mono">{order.order_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                    order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {Array.isArray(order.items) && (
                  <p className="text-xs text-slate-300 line-clamp-1">
                    {order.items.map(i => `${i.quantity}x ${i.food_name}`).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Total</span>
                  <span className="text-base font-bold text-white font-mono">${Number(order.total_amount).toFixed(2)}</span>
                </div>

                <Link
                  to={`/orders/track/${order.order_number || order.id}`}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-brand-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-brand-400" />
                  <span>Track</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
