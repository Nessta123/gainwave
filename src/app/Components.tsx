"use client";
import React from 'react';

export const SentimentBar = ({ pct, label, showLabels = true, darkMode = true }: any) => (
  <div className="mb-4 w-full text-left">
    {showLabels && (
      <div className="flex justify-between text-[9px] font-black uppercase mb-2 px-1">
        <span className="text-green-500 font-bold">{pct.toFixed(0)}% Bulls</span>
        {label && (
          <span className={`text-center flex-1 transition-colors ${
            darkMode ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            {label}
          </span>
        )}
        <span className="text-red-500 font-bold">{(100 - pct).toFixed(0)}% Bears</span>
      </div>
    )}
    <div className={`w-full h-2 rounded-full overflow-hidden flex transition-all duration-500 ${
      darkMode ? 'bg-zinc-900 shadow-inner' : 'bg-zinc-200 shadow-inner'
    }`}>
      {/* ZELEN DEL - BULLS */}
      <div 
        style={{ width: `${pct}%` }} 
        className="h-full bg-green-500 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(34,197,94,0.3)]"
      ></div>
      {/* RDEČ DEL - BEARS */}
      <div 
        style={{ width: `${100 - pct}%` }} 
        className="h-full bg-red-500 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(239,68,68,0.3)]"
      ></div>
    </div>
  </div>
);

export const PriceTicker = ({ prices, darkMode = true }: any) => {
  const itemStyle = darkMode 
    ? "border-zinc-800 bg-zinc-900/40" 
    : "border-zinc-200 bg-white shadow-sm";

  return (
    <div className="flex flex-row justify-center gap-4 mb-12 opacity-80 scale-90 flex-wrap text-center transition-all duration-500">
      {/* BTC - Popravljeno: Dodan $ in odstranjen % */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] transition-all ${itemStyle}`}>
        <span className={`text-[10px] mr-2 font-bold uppercase ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>BTC</span>
        <span className="text-green-500 font-black">
          ${prices.btc.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      </div>
      
      {/* EUR/USD (NVDA label) - Popravljeno: Odstranjen % */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] transition-all ${itemStyle}`}>
        <span className={`text-[10px] mr-2 font-bold uppercase ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>EUR/USD</span>
        <span className="text-green-500 font-black">{prices.nvda.toFixed(4)}</span>
      </div>
      
      {/* GOLD (XAU) - Popravljeno: Dodan $ in odstranjen % */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] transition-all ${
        darkMode ? 'border-yellow-900/30 bg-yellow-950/10' : 'border-yellow-200 bg-yellow-50 shadow-sm'
      }`}>
        <span className="text-yellow-600 text-[10px] mr-2 font-bold uppercase">XAU</span>
        <span className="text-yellow-500 font-black">${prices.xau.toFixed(1)}</span>
      </div>
    </div>
  );
};