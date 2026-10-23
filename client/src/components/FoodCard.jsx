import React, { useState } from 'react';
import { Star, Clock, Plus, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function FoodCard({ food, onSelect }) {
  const { addToCart } = useCart();
  const [addedAnimation, setAddedAnimation] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!food.is_available) return;
    addToCart(food, 1);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 900);
  };

  return (
    <div
      onClick={() => onSelect(food)}
      className="group bg-slate-900/90 rounded-2xl border border-slate-800/80 hover:border-brand-500/40 overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-brand-500/10 cursor-pointer flex flex-col justify-between"
    >
      {/* Food Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={food.image_url}
          alt={food.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {food.rating && (
            <span className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md text-amber-400 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {food.rating}
            </span>
          )}
          {food.preparation_time && (
            <span className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md text-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-full border border-slate-700/50">
              <Clock className="w-3 h-3 text-brand-400" />
              {food.preparation_time}m
            </span>
          )}
        </div>

        {!food.is_available && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider rounded-lg">
              Sold Out Today
            </span>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Tags */}
          {Array.isArray(food.tags) && food.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {food.tags.slice(0, 2).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h3 className="font-semibold text-white text-base tracking-tight group-hover:text-brand-300 transition-colors line-clamp-1">
            {food.name}
          </h3>

          <p className="text-slate-400 text-xs mt-1 line-clamp-2 leading-relaxed">
            {food.description}
          </p>
        </div>

        {/* Footer: Price & Add Button */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-normal">Price</span>
            <span className="text-lg font-bold text-white font-mono">
              ${Number(food.price).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleAdd}
            disabled={!food.is_available}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              !food.is_available
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : addedAnimation
                ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md scale-95'
                : 'bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white shadow-md shadow-brand-500/20 hover:scale-105 active:scale-95'
            }`}
            aria-label={`Add ${food.name} to cart`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
