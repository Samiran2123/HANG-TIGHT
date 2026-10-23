import React, { useState } from 'react';
import { X, Star, Clock, Flame, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function FoodModal({ food, onClose }) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!food) return null;

  const handleAddToCart = () => {
    if (!food.is_available) return;
    addToCart(food, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 600);
  };

  const lineTotal = (Number(food.price) * quantity).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-950 transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Food Image */}
        <div className="relative aspect-video w-full bg-slate-950">
          <img
            src={food.image_url}
            alt={food.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
          
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {food.rating && (
              <span className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/20">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {food.rating} Rating
              </span>
            )}
            {food.preparation_time && (
              <span className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md text-slate-300 text-xs px-2.5 py-1 rounded-full border border-slate-700/50">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                {food.preparation_time} mins prep
              </span>
            )}
            {food.calories && (
              <span className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md text-slate-300 text-xs px-2.5 py-1 rounded-full border border-slate-700/50">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                {food.calories} kcal
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {Array.isArray(food.tags) && food.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {food.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold text-white tracking-tight">{food.name}</h2>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">{food.description}</p>

          {/* Pricing & Quantity Controls */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Unit Price</span>
              <span className="text-xl font-bold text-white font-mono">${Number(food.price).toFixed(2)}</span>
            </div>

            {food.is_available ? (
              <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-1.5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-white font-mono text-sm">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                Unavailable
              </span>
            )}
          </div>

          {/* Add to Cart CTA */}
          <div className="mt-6">
            <button
              onClick={handleAddToCart}
              disabled={!food.is_available}
              className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                !food.is_available
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white shadow-brand-500/25 hover:scale-[1.01]'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Order • ${lineTotal}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
