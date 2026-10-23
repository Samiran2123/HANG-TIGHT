import React from 'react';

export function FoodCardSkeleton() {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg animate-pulse flex flex-col justify-between">
      <div className="aspect-[4/3] w-full bg-slate-800/60" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-slate-800 rounded-md" />
          <div className="h-4 w-12 bg-slate-800 rounded-md" />
        </div>
        <div className="h-5 w-3/4 bg-slate-800 rounded-md" />
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-800/60 rounded" />
          <div className="h-3 w-4/5 bg-slate-800/60 rounded" />
        </div>
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="h-6 w-16 bg-slate-800 rounded-md" />
          <div className="h-8 w-20 bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-2">
      <div className="h-4 w-24 bg-slate-800 rounded" />
      <div className="h-8 w-32 bg-slate-800 rounded-md" />
      <div className="h-3 w-20 bg-slate-800/60 rounded" />
    </div>
  );
}
