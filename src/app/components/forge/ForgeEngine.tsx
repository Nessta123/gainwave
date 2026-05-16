"use client";
import React from 'react';
import './forge-styles.css';

export default function ForgeEngine({ userData }: any) {
  return (
    <div className="flex flex-col gap-6 p-4 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] font-black uppercase text-[#89CFF0] tracking-[0.2em]">GW Forge Terminal</h2>
        <p className="text-2xl font-black text-white">ARCHITECT MODE</p>
      </div>

      {/* 4 ključni gumbi */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="forge-button p-6 rounded-2xl flex flex-col items-center gap-3">
          <span className="text-2xl">💎</span>
          <span className="text-[10px]">ŽETONI</span>
        </button>
        
        <button className="forge-button p-6 rounded-2xl flex flex-col items-center gap-3">
          <span className="text-2xl">📜</span>
          <span className="text-[10px]">POGODBE</span>
        </button>

        <button className="forge-button p-6 rounded-2xl flex flex-col items-center gap-3">
          <span className="text-2xl">🎮</span>
          <span className="text-[10px]">IGRE</span>
        </button>

        <button className="forge-button p-6 rounded-2xl flex flex-col items-center gap-3">
          <span className="text-2xl">📊</span>
          <span className="text-[10px]">STATS</span>
        </button>
      </div>

      {/* Prostor za "Babi-Proof" orodja */}
      <div className="mt-8 p-6 border border-zinc-800 rounded-[2.5rem] bg-black/40 backdrop-blur-md">
        <p className="text-zinc-500 text-[10px] font-bold uppercase mb-4">Aktivni projekti</p>
        <div className="text-center py-10 opacity-30">
          <p className="text-xs">Noben projekt še ni v kovanju. Začni z gumbom zgoraj.</p>
        </div>
      </div>
    </div>
  );
}