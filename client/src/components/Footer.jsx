import React from 'react';
import { Flame, Heart, Shield, Database, FileSpreadsheet, Server, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-amber-600 flex items-center justify-center text-white">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white font-serif tracking-tight">AURA Gourmet</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              Artisanal smash burgers, hand-stretched Neapolitan sourdough pizzas, and craft bowls prepared fresh to order.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Kitchen open for delivery • Average 24 mins
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 tracking-wide text-xs uppercase">Culinary Catalog</h4>
            <ul className="space-y-2">
              <li><a href="#category-burgers" className="hover:text-brand-400 transition-colors">Artisanal Burgers</a></li>
              <li><a href="#category-pizzas" className="hover:text-brand-400 transition-colors">Neapolitan Pizzas</a></li>
              <li><a href="#category-asian-bowls" className="hover:text-brand-400 transition-colors">Asian Wok & Bowls</a></li>
              <li><a href="#category-desserts" className="hover:text-brand-400 transition-colors">Desserts & Shakes</a></li>
            </ul>
          </div>

          {/* Architecture & Tech Stack */}
          <div>
            <h4 className="text-white font-semibold mb-3 tracking-wide text-xs uppercase">Engineering Stack</h4>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-brand-400" /> React + Vite + Tailwind CSS</li>
              <li className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-blue-400" /> Express REST API (Render ready)</li>
              <li className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-400" /> Supabase PostgreSQL + Auth RLS</li>
              <li className="flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5 text-green-400" /> Google Sheets Secondary Replica</li>
            </ul>
          </div>

          {/* Security & Verification */}
          <div>
            <h4 className="text-white font-semibold mb-3 tracking-wide text-xs uppercase">Academic Evaluation</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Built for live project demonstration. Includes tamper-proof price verification, role-based database policies, and idempotent webhooks.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
              <span className="text-amber-400 font-semibold">Demo Credentials Ready:</span> Use the quick-switch bar at the top or sign in with your email.
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} AURA Gourmet Pro. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for Live Demonstration
          </p>
        </div>
      </div>
    </footer>
  );
}
