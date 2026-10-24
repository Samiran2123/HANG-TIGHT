import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CartDrawer({ onOpenAuth }) {
  const { 
    items, 
    itemCount, 
    subtotal, 
    tax, 
    deliveryFee, 
    total, 
    isCartOpen, 
    closeCart, 
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useCart();
  const { isAuthenticated } = useAuth();

  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = 50.00;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const freeDeliveryProgress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  const handleProceedToCheckout = () => {
    closeCart();
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-up">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Your Order ({itemCount})</h2>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors mr-2"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={closeCart}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Free Delivery Incentive Bar */}
          {items.length > 0 && (
            <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {amountToFreeDelivery === 0 ? (
                    <span className="text-emerald-400 font-semibold">🎉 You unlocked FREE Delivery!</span>
                  ) : (
                    <span>Add <strong className="text-white">${amountToFreeDelivery.toFixed(2)}</strong> for Free Delivery</span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">{Math.round(freeDeliveryProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${freeDeliveryProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-500 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-white">Your cart is empty</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Discover our chef-crafted smash burgers, artisanal pizzas, and healthy bowls.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-6 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
                >
                  Explore Delicious Menu
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div 
                  key={item.food.id}
                  className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex gap-3 items-center group"
                >
                  <img
                    src={item.food.image_url}
                    alt={item.food.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{item.food.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">${Number(item.food.price).toFixed(2)}</p>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.food.id, item.quantity - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-white font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.food.id, item.quantity + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-brand-400 font-mono ml-auto">
                        ${(Number(item.food.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.food.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout CTA */}
          {items.length > 0 && (
            <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-400">
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
                <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                  <span>Order Total</span>
                  <span className="font-mono text-brand-400">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                id="checkout-btn"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.01]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
