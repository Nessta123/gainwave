"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AssetRegistry({ darkMode, onViewProject }: any) {
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('forge_deployments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAssets(data);
        }
      } catch (err) {
        console.error("Error fetching assets:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Funkcija za izračun Trust Score-a (enako kot v Forgeu)
  const calculateTrustScore = (asset: any) => {
    let s = 100;
    const taxes = (asset.buy_tax || 0) + (asset.sell_tax || 0);
    if (taxes > 10) s -= 30;
    if (taxes > 20) s -= 20; 
    if ((asset.liquidity_percent || 0) < 70) s -= 15; 
    if ((asset.airdrop_percent || 0) > 0) s += 5; 
    return Math.min(100, Math.max(0, s));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6 border-b border-white/5 pb-8">
        <div>
          <h2 className={`text-4xl font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>
            Asset <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#89CFF0] via-[#FF00FF] to-[#9400D3]">Registry</span>
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-2">
            Live Presales & Verified Forge Deployments
          </p>
        </div>
        <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 ${darkMode ? 'bg-black/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
           <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
           </span>
           <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Network Connected</span>
        </div>
      </div>

      {/* ASSET GRID */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 opacity-50">
           <div className="w-12 h-12 border-4 border-[#89CFF0] border-t-transparent rounded-full animate-spin mb-4" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#89CFF0]">Scanning Blockchain...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-zinc-800 rounded-[3rem] opacity-40">
           <span className="text-5xl mb-4 block">📭</span>
           <h3 className="text-sm font-black uppercase tracking-widest">No Assets Found</h3>
           <p className="text-[10px] font-bold uppercase mt-2">Be the first to forge a token on the GainWave Network.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => {
            const score = calculateTrustScore(asset);
            return (
              <div 
                key={asset.id} 
                className={`group p-6 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${
                  darkMode 
                    ? 'bg-zinc-950/60 border-zinc-800 hover:border-[#89CFF0]/50 hover:shadow-[0_0_30px_rgba(137,207,240,0.1)]' 
                    : 'bg-white border-zinc-200 hover:border-[#89CFF0]/50 hover:shadow-xl'
                }`}
              >
                {/* ASSET HEADER */}
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-xl font-black text-[#89CFF0] shadow-[0_0_15px_rgba(137,207,240,0.2)]">
                         {asset.token_symbol?.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3 className={`text-lg font-black uppercase tracking-tighter leading-none ${darkMode ? 'text-white' : 'text-black'}`}>
                          {asset.token_symbol}
                        </h3>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mt-1">
                          {asset.token_name}
                        </span>
                      </div>
                   </div>
                   <div className={`px-2 py-1 rounded border text-[8px] font-black uppercase tracking-wider ${
                     score > 70 ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                     score > 40 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                     'bg-red-500/10 border-red-500/30 text-red-500'
                   }`}>
                     Score: {score}%
                   </div>
                </div>

                {/* ASSET STATS */}
                <div className="space-y-3 mb-8">
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Network</span>
                      <span className={`text-[10px] font-black uppercase ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{asset.chain}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Hard Cap</span>
                      <span className={`text-[10px] font-black uppercase ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{asset.hard_cap ? `${asset.hard_cap} ${asset.chain}` : 'TBA'}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Liquidity Locked</span>
                      <span className={`text-[10px] font-black uppercase text-[#FF00FF]`}>{asset.liquidity_percent}%</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Architect</span>
                      <span className={`text-[10px] font-black uppercase text-[#89CFF0]`}>@{asset.profiles?.alias || 'Unknown'}</span>
                   </div>
                </div>

                {/* ACTION BUTTON */}
                <button 
                  onClick={() => onViewProject(asset)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 text-white text-[10px] font-black uppercase tracking-widest group-hover:from-[#89CFF0] group-hover:to-[#3b82f6] group-hover:border-[#89CFF0] transition-all shadow-lg active:scale-95"
                >
                  Connect Terminal &rarr;
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
