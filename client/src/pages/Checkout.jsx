import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  User 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Checkout() {
  const { items, subtotal, tax, deliveryFee, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    delivery_address: '',
    delivery_notes: '',
    payment_method: 'card_demo'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Prepopulate if user is logged in
  useEffect(() => {
    if (profile || user) {
      setFormData((prev) => ({
        ...prev,
        customer_name: profile?.full_name || prev.customer_name,
        customer_email: profile?.email || user?.email || prev.customer_email,
        customer_phone: profile?.phone || prev.customer_phone,
        delivery_address: profile?.address || prev.delivery_address
      }));
    }
  }, [profile, user]);

  // If cart is empty, redirect to menu
  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Your cart is empty</h2>
        <p className="text-xs text-slate-400">Please select delicious dishes from the menu first.</p>
        <Link 
          to="/" 
          className="inline-block px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold"
        >
          Return to Menu
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const orderPayload = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        delivery_address: formData.delivery_address,
        delivery_notes: formData.delivery_notes,
        payment_method: formData.payment_method,
        user_id: user?.id || null,
        items: items.map(item => ({
          food_id: item.food.id,
          quantity: item.quantity
        }))
      };

      const res = await api.createOrder(orderPayload);

      if (res.success && res.data) {
        clearCart();
        navigate(`/orders/confirmation/${res.data.order_number}`, {
          state: { order: res.data }
        });
      } else {
        throw new Error(res.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setError(err.message || 'Failed to submit order. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8 animate-fade-in">
      <Link 
        to="/" 
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-serif tracking-tight">Checkout</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review delivery details and confirm your gourmet order
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Demo Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-amber-300 text-xs">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong>Academic & Demonstration Mode:</strong> Payment authorization is simulated securely on the server. No real monetary charges will be applied.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Customer & Delivery Details Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Contact Details Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-brand-400" />
              1. Customer Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  name="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  name="customer_email"
                  required
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (For Delivery Driver)</label>
                <input
                  type="tel"
                  name="customer_phone"
                  required
                  value={formData.customer_phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              2. Delivery Address
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Street Address, Apt / Suite, City, Zip</label>
              <textarea
                name="delivery_address"
                required
                rows={2}
                value={formData.delivery_address}
                onChange={handleChange}
                placeholder="742 Evergreen Terrace, Apt 4B, Springfield, IL 62704"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Delivery Notes (Optional)</label>
              <input
                type="text"
                name="delivery_notes"
                value={formData.delivery_notes}
                onChange={handleChange}
                placeholder="e.g. Ring bell, gate code #1234, leave at door"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-400" />
              3. Payment Option
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Demo Card Option */}
              <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                formData.payment_method === 'card_demo'
                  ? 'bg-brand-500/10 border-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="card_demo"
                  checked={formData.payment_method === 'card_demo'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-brand-400" />
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">Demo</span>
                </div>
                <span className="text-xs font-bold block">Credit / Debit</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Instant simulated authorization</span>
              </label>

              {/* Demo UPI Option */}
              <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                formData.payment_method === 'upi_demo'
                  ? 'bg-brand-500/10 border-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="upi_demo"
                  checked={formData.payment_method === 'upi_demo'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-2">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Instant</span>
                </div>
                <span className="text-xs font-bold block">UPI / QR Code</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Scan to pay simulation</span>
              </label>

              {/* COD Option */}
              <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
                formData.payment_method === 'cod'
                  ? 'bg-brand-500/10 border-brand-500 text-white shadow-md shadow-brand-500/10'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={formData.payment_method === 'cod'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="flex items-center justify-between mb-2">
                  <Banknote className="w-5 h-5 text-amber-400" />
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Cash</span>
                </div>
                <span className="text-xs font-bold block">Cash on Delivery</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Pay upon delivery arrival</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="place-order-submit-btn"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Processing & Securing Order...' : `Place Order • $${total.toFixed(2)}`}
          </button>
        </form>

        {/* Right Col: Order Summary Sidebar */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 sticky top-24">
          <h2 className="text-base font-bold text-white pb-3 border-b border-slate-800">
            Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} Items)
          </h2>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.food.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-brand-400 font-bold flex items-center justify-center shrink-0 font-mono text-[11px]">
                    {item.quantity}x
                  </span>
                  <span className="text-slate-200 truncate">{item.food.name}</span>
                </div>
                <span className="text-white font-mono font-semibold shrink-0">
                  ${(Number(item.food.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-slate-200 font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tax (8.25%)</span>
              <span className="text-slate-200 font-mono">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="text-slate-200 font-mono">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-400 font-semibold uppercase text-[10px]">Free</span>
                ) : (
                  `$${deliveryFee.toFixed(2)}`
                )}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between text-base font-bold text-white">
              <span>Grand Total</span>
              <span className="font-mono text-brand-400">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Truck className="w-3.5 h-3.5 text-brand-400" />
              <span>Estimated Arrival Time</span>
            </div>
            <p>25 - 35 minutes from kitchen confirmation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
