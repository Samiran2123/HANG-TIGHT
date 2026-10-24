import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Clock, MapPin, ArrowRight, Home, Receipt, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order && orderNumber) {
      api.trackOrder(orderNumber)
        .then(res => setOrder(res.data))
        .catch(err => console.error('Failed to load confirmed order:', err))
        .finally(() => setLoading(false));
    }
  }, [order, orderNumber]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 animate-fade-in text-center">
      {/* Success Badge */}
      <div className="space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/10 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Order Confirmed & Sent to Kitchen</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-serif tracking-tight">
          Thank you for dining with HANG TIGHT!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Your order has been recorded in our database and synchronized for preparation.
        </p>
      </div>

      {/* Order Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-left space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase font-medium tracking-wider">Order Reference</span>
            <span className="text-lg font-bold text-white font-mono tracking-tight">{orderNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-medium tracking-wider">Estimated Delivery</span>
            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 25 - 35 mins
            </span>
          </div>
        </div>

        {/* Delivery Details */}
        {order && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer</span>
                <span className="text-white font-medium">{order.customer_name}</span>
                <span className="text-slate-400 block text-[11px]">{order.customer_email}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Delivery Destination</span>
                <span className="text-white font-medium">{order.delivery_address}</span>
              </div>
            </div>

            {/* Line items summary */}
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-slate-400 block text-[11px] font-semibold uppercase">Items Ordered</span>
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-200">
                      {item.quantity}x {item.food_name}
                    </span>
                    <span className="text-white font-mono font-semibold">
                      ${Number(item.subtotal).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-300">Total Charged</span>
              <span className="text-brand-400 font-mono text-base">${Number(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to={`/orders/track/${orderNumber}`}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02]"
        >
          <span>Track Order Live</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/"
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Return to Menu</span>
        </Link>
      </div>
    </div>
  );
}
