"use client";
import React from 'react';

export default function PriceTicker({ prices, darkMode = true }: any) {
  // Če cen še ni, prikažemo loader, da ni prazno
  if (!prices || !prices.btc) {
    return (
      <div className="flex justify-center gap-4 mb-12 animate-pulse">
        <div className="h-10 w-24 bg-zinc-800 rounded-full"></div>
        <div className="h-10 w-24 bg-zinc-800 rounded-full"></div>
        <div className="h-10 w-24 bg-zinc-800 rounded-full"></div>
      </div>
    );
  }

  const itemStyle = darkMode 
    ? "border-zinc-800 bg-zinc-900/40 text-white" 
    : "border-zinc-200 bg-white text-zinc-900 shadow-sm";

  return (
    <div className="flex flex-row justify-center gap-4 mb-12 opacity-80 scale-90 flex-wrap text-center transition-all duration-500">
      {/* BTC */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] ${itemStyle}`}>
        <span className="text-[10px] mr-2 font-bold uppercase opacity-50">BTC</span>
        <span className="text-green-500 font-black">
          ${prices.btc?.toLocaleString() || '0.0'}
        </span>
      </div>

      {/* ETH */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] ${itemStyle}`}>
        <span className="text-[10px] mr-2 font-bold uppercase opacity-50">ETH</span>
        <span className="text-purple-500 font-black">
          ${prices.eth?.toLocaleString() || '0.0'}
        </span>
      </div>
      
      {/* EUR/USD - Tukaj je bila napaka (nvda -> eur) */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] ${itemStyle}`}>
        <span className="text-[10px] mr-2 font-bold uppercase opacity-50">EUR</span>
        <span className="text-indigo-500 font-black">
          {prices.eur?.toFixed(4) || '0.0000'}
        </span>
      </div>
      
      {/* GOLD (XAU) */}
      <div className={`px-6 py-3 border rounded-full min-w-[120px] ${
        darkMode ? 'border-yellow-900/30 bg-yellow-950/10' : 'border-yellow-200 bg-yellow-50'
      }`}>
        <span className="text-yellow-600 text-[10px] mr-2 font-bold uppercase">XAU</span>
        <span className="text-yellow-500 font-black">
          ${prices.xau?.toFixed(1) || '0.0'}
        </span>
      </div>
    </div>
  );
}