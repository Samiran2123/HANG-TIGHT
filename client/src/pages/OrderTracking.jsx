import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Truck, 
  Award, 
  RotateCw, 
  MapPin, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';

const STEPS = [
  { key: 'pending', label: 'Order Received', icon: Clock, desc: 'We have received your order.' },
  { key: 'confirmed', label: 'Kitchen Confirmed', icon: CheckCircle2, desc: 'Chef verified ingredients.' },
  { key: 'preparing', label: 'Freshly Cooking', icon: Flame, desc: 'Order is being sizzled and plated.' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck, desc: 'Driver is on the way.' },
  { key: 'delivered', label: 'Delivered', icon: Award, desc: 'Bon appétit!' }
];

export default function OrderTracking() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const [inputCode, setInputCode] = useState(identifier || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(identifier));
  const [error, setError] = useState(null);

  const fetchOrder = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.trackOrder(id.trim());
      if (res.data) {
        setOrder(res.data);
      } else {
        setError('Order not found with provided ID or tracking number.');
      }
    } catch (err) {
      setError(err.message || 'Order not found. Please verify the tracking number.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (identifier) {
      fetchOrder(identifier);
    }
  }, [identifier]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    navigate(`/orders/track/${inputCode.trim()}`);
    fetchOrder(inputCode.trim());
  };

  // Determine current step index
  const getStepIndex = (status) => {
    if (status === 'cancelled') return -1;
    const idx = STEPS.findIndex(s => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = order ? getStepIndex(order.status) : 0;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white font-serif tracking-tight">Live Order Tracking</h1>
        <p className="text-xs text-slate-400">
          Monitor your culinary order from the kitchen to your doorstep in real time
        </p>
      </div>

      {/* Tracking Input Bar */}
      <form onSubmit={handleSearch} className="max-w-md mx-auto flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter Order ID (e.g. ORD-20261023-1001)"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition-colors shrink-0"
        >
          {loading ? 'Finding...' : 'Track'}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-300 text-xs max-w-md mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {order && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">Order Reference</span>
              <span className="text-lg font-bold text-white font-mono">{order.order_number}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${
                order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {order.status.replace(/_/g, ' ')}
              </span>

              <button
                onClick={() => fetchOrder(order.id || order.order_number)}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                title="Refresh Order Status"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stepper Timeline */}
          {order.status !== 'cancelled' ? (
            <div className="py-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isCompleted = idx <= currentStepIdx;
                  const isCurrent = idx === currentStepIdx;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center relative z-10 space-y-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-110 ring-4 ring-brand-500/20'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-950 text-slate-600 border border-slate-800'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-semibold ${isCompleted ? 'text-white' : 'text-slate-500'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block max-w-[100px] leading-tight">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
              This order has been cancelled. If you have questions, please reach out to customer care.
            </div>
          )}

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-800 text-xs">
            <div className="space-y-2">
              <h4 className="font-semibold text-white">Delivery Destination</h4>
              <p className="text-slate-300 flex items-start gap-1.5 leading-relaxed">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>{order.delivery_address}</span>
              </p>
              {order.delivery_notes && (
                <p className="text-slate-400 text-[11px] italic">Note: "{order.delivery_notes}"</p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-white">Payment & Summary</h4>
              <div className="space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span className="font-medium capitalize">{order.payment_method?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <span className="font-medium capitalize text-emerald-400">{order.payment_status}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span className="font-mono text-brand-400">${Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Line Items */}
          {Array.isArray(order.items) && order.items.length > 0 && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h4 className="font-semibold text-white text-xs">Items ({order.items.length})</h4>
              <div className="divide-y divide-slate-800/60">
                {order.items.map((item, i) => (
                  <div key={i} className="py-2 flex justify-between items-center text-xs">
                    <span className="text-slate-200">
                      {item.quantity}x {item.food_name}
                    </span>
                    <span className="text-white font-mono font-medium">
                      ${Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
