import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Star, 
  ArrowRight, 
  Check, 
  Award, 
  Truck 
} from 'lucide-react';
import FoodCard from '../components/FoodCard';
import FoodModal from '../components/FoodModal';
import { FoodCardSkeleton } from '../components/SkeletonLoader';
import { api } from '../services/api';

export default function Home({ onOpenCart }) {
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [loading, setLoading] = useState(true);
  const [selectedFood, setSelectedFood] = useState(null);

  // Fetch foods & categories
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [catsRes, foodsRes] = await Promise.all([
          api.getCategories().catch(() => ({ data: [] })),
          api.getFoods({
            category: selectedCategory,
            search: searchQuery,
            sort: sortBy
          }).catch(() => ({ data: [] }))
        ]);

        setCategories(catsRes.data || []);
        setFoods(foodsRes.data || []);
      } catch (err) {
        console.error('Failed to load menu data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Award-Winning Culinary Delivery</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] font-serif">
            Artisanal Flavors, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-amber-300 to-amber-500 font-sans">
              Delivered in Minutes.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-light">
            Indulge in 48-hour fermented Neapolitan pizzas, double smash Angus burgers, and scratch-made ramen bowls. Crafted by master chefs, sealed for peak freshness.
          </p>

          {/* Key Value Badges */}
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>24 Mins Avg Delivery</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>4.9 / 5 (12,000+ Reviews)</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>Free Delivery Over $50</span>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Filter & Search Bar */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
              Explore Our Menu
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {foods.length} dishes prepared fresh on order
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search burgers, ramen, pizza..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-brand-500 transition-colors cursor-pointer pr-8"
              >
                <option value="rating">Highest Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
                : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
            }`}
          >
            All Dishes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Food Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <FoodCardSkeleton key={i} />
            ))}
          </div>
        ) : foods.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-slate-500">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No dishes match your filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search query or selecting a different category pill above.
            </p>
            <button
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="mt-2 text-xs font-semibold text-brand-400 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {foods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onSelect={(f) => setSelectedFood(f)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Chef Recommendation Feature Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-brand-950 via-slate-900 to-amber-950 border border-brand-500/20 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Award className="w-4 h-4" /> Executive Chef's Recommendation
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-white font-serif tracking-tight">
            Truffle Umami Double Smash Burger
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
            Double Angus beef patty smashed crispy with black truffle aioli, aged English cheddar, and caramelized balsamic shallots on a toasted brioche bun.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <span className="text-2xl font-bold text-white font-mono">$15.99</span>
            <button
              onClick={() => {
                const truffleBurger = foods.find(f => f.id === 'f1000000-0000-0000-0000-000000000001') || foods[0];
                if (truffleBurger) setSelectedFood(truffleBurger);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-amber-600 hover:from-brand-600 hover:to-amber-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-500/25 transition-all hover:scale-105"
            >
              <span>View & Customize</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border border-brand-500/30 shadow-2xl">
          <img
            src="https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80"
            alt="Truffle Umami Double Smash"
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* Food Details Modal */}
      {selectedFood && (
        <FoodModal
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
        />
      )}
    </div>
  );
}
