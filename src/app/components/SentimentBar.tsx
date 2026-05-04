"use client";
import React from 'react';

export default function SentimentBar({ pct, label, showLabels = true, darkMode = true }: any) {
  // VARNOSTNI PREKLOP: Če pct ni številka (npr. med nalaganjem), uporabimo 50%
  const safePct = (typeof pct === 'number' && !isNaN(pct)) ? pct : 50;

  return (
    <div className="mb-4 w-full text-left">
      {showLabels && (
        <div className="flex justify-between text-[9px] font-black uppercase mb-2 px-1">
          <span className="text-green-500 font-bold">{safePct.toFixed(0)}% Bulls</span>
          {label && (
            <span className={`text-center flex-1 transition-colors ${
              darkMode ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              {label}
            </span>
          )}
          <span className="text-red-500 font-bold">{(100 - safePct).toFixed(0)}% Bears</span>
        </div>
      )}
      
      {/* GLAVNA LINIJA */}
      <div className={`w-full h-2 rounded-full overflow-hidden flex transition-all duration-500 ${
        darkMode ? 'bg-zinc-900 shadow-inner' : 'bg-zinc-200 shadow-inner'
      }`}>
        {/* ZELEN DEL - BULLS */}
        <div 
          style={{ width: `${safePct}%` }} 
          className="h-full bg-green-500 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(34,197,94,0.3)]"
        ></div>
        {/* RDEČ DEL - BEARS */}
        <div 
          style={{ width: `${100 - safePct}%` }} 
          className="h-full bg-red-500 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        ></div>
      </div>
    </div>
  );
}