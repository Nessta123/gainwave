"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function ProjectTerminal({ project, darkMode, onBack, onJoinHub, userData }: any) {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // DUMMY Progress (Za zdaj fiksen, dokler ne postaviva pravih Trezorjev)
  const progress = 35; 

  const terminalStyle = darkMode
    ? `relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[3rem] border shadow-[0_0_80px_rgba(255,0,255,0.1)] custom-scrollbar border-[#FF00FF]/30 bg-black`
    : `relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[3rem] border shadow-[0_0_50px_rgba(137,207,240,0.1)] custom-scrollbar border-zinc-100 bg-white`;

  const textureOverlay = `absolute inset-0 opacity-10 ${darkMode ? 'mix-blend-overlay' : 'mix-blend-multiply'} pointer-events-none`;
  const backgroundGlow = `absolute inset-0 rounded-[3rem] bg-gradient-to-br ${darkMode ? 'from-[#89CFF0]/5 via-black to-[#FF00FF]/5' : 'from-[#89CFF0]/10 via-white to-[#FF00FF]/10'} blur-3xl`;

  // Izračun dinamičnega Trust Scora na podlagi podatkov
  const calculateTrustScore = () => {
    let score = 100;
    if (project.buy_tax + project.sell_tax > 10) score -= 30;
    if (project.buy_tax + project.sell_tax > 20) score -= 20;
    if (project.liquidity_percent < 70) score -= 15;
    if (project.airdrop_percent > 0) score += 5;
    if (project.is_audited) score += 20;
    if (project.kyc_verified) score += 10;
    return Math.min(100, Math.max(0, score));
  };

  const finalTrustScore = calculateTrustScore();

  // 🔥 Logika Nakupa (Opcija A - Priprava na pravo Web3 Povezavo) 🔥
  const handleBuy = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsLoading(true);
    toast.loading(`Initializing Web3 Connection for ${amount} ${project.chain}...`);

    // Simulacija čakanja na Web3 Denarnico
    setTimeout(() => {
      toast.dismiss();
      console.log(`🚨 INVESTICIJA ZAGNANA: ${amount} ${project.chain} v projekt ${project.token_symbol}`);
      alert(`⚠️ WEB3 TERMINAL AKTIVIRAN!\n\nV naslednji fazi se bo tukaj odprl MetaMask / Phantom za potrditev plačila ${amount} ${project.chain} v Presale trezor kovanca ${project.token_symbol.toUpperCase()}.\n\n(Opcija B bo ta gumb povezala s pravim Smart Contractom)`);
      setIsLoading(false);
    }, 1500);
  };

  // 🔥 Logika za generiranje Affiliate povezave 🔥
  const generateAffiliateLink = () => {
      const link = `${window.location.origin}?ref=${userData?.id || 'anonymous'}&project=${project.id}`;
      navigator.clipboard.writeText(link);
      toast.success("Affiliate Link Copied! Earn 1% on all referrals!");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in-95 duration-300">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onBack}></div>

      <div className={terminalStyle}>
        <div className={backgroundGlow}></div>
        <div className={`${textureOverlay}`} style={{ backgroundImage: 'url("/circuit_pattern.png")' }}></div>

        <div className="relative z-10">

          {/* HEADER SECTION */}
          <div className="sticky top-0 z-20 p-8 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-inherit rounded-t-[3rem]">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-black border-2 border-dashed border-[#FF00FF]/40 flex items-center justify-center text-4xl font-black text-[#FF00FF] shadow-[0_0_30px_rgba(255,0,255,0.3)]">
                {project.token_symbol?.substring(0, 1).toUpperCase() || 'W'}
              </div>
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tighter text-white group">
                  {project.token_name} <span className="text-[#89CFF0] text-2xl drop-shadow-[0_0_8px_rgba(137,207,240,0.5)]">${project.token_symbol?.toUpperCase()}</span>
                </h2>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[9px] font-black uppercase rounded-full border border-green-500/30 animate-pulse">Live Presale</span>
                  <span className="px-3 py-1 bg-[#89CFF0]/10 text-[#89CFF0] text-[9px] font-black uppercase rounded-full border border-[#89CFF0]/30">{project.chain} Network</span>
                  {project.is_audited && (
                    <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase rounded-full border border-yellow-500/30">🛡️ Audited</span>
                  )}
                  {project.kyc_verified && (
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-full border border-blue-500/30">👤 KYC</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onBack} className="p-4 text-zinc-600 hover:text-[#FF00FF] transition-all text-3xl font-light hover:rotate-90 duration-300">✕</button>
          </div>

          <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* LEVA STRAN: INFO & WHITEPAPER (2/3) */}
            <div className="lg:col-span-2 space-y-12">
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { label: 'Taxes', val: `B:${project.buy_tax}% S:${project.sell_tax}%` },
                  { label: 'Soft Cap', val: `${(project.hard_cap / 2).toLocaleString()} ${project.chain}` },
                  { label: 'Hard Cap', val: `${project.hard_cap.toLocaleString()} ${project.chain}` },
                  { label: 'WaveLock', val: `${project.liquidity_percent}% Locked` },
                ].map((stat, i) => (
                  <div key={i} className={`p-6 rounded-[1.5rem] border transition-all ${darkMode ? 'bg-black/50 border-white/5 hover:border-[#89CFF0]/30' : 'bg-white border-zinc-100 hover:border-[#89CFF0]/30'}`}>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">{stat.label}</p>
                    <p className={`text-[12px] font-black uppercase ${i === 0 || i === 3 ? 'text-[#FF00FF]' : 'text-white'}`}>{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase text-[#89CFF0] tracking-[0.2em] flex items-center gap-2">
                    <span className="text-xl">🤖</span> AI Generated Whitepaper
                    </h4>
                    {project.airdrop_percent > 0 && (
                       <span className="text-[10px] font-black text-[#FF00FF] uppercase border border-[#FF00FF]/30 px-3 py-1 rounded-full bg-[#FF00FF]/10">🎁 {project.airdrop_percent}% Airdrop</span>
                    )}
                </div>
                <div className={`p-10 rounded-[2.5rem] border leading-relaxed text-sm font-light ${darkMode ? 'bg-zinc-950/80 border-[#89CFF0]/20 text-[#89CFF0] shadow-[inset_0_0_20px_rgba(137,207,240,0.05)]' : 'bg-white border-zinc-100 text-zinc-700'}`}>
                  <pre className="whitespace-pre-wrap font-mono">
                    {project.whitepaper_text || "The architect has not provided a detailed vision yet."}
                  </pre>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 pt-6">
                 {project.hub_id && (
                     <button onClick={() => onJoinHub(project.hub_id)} className="px-10 py-5 rounded-[1.5rem] bg-white text-black font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center gap-2">
                       🚀 Join Community Hub
                     </button>
                 )}
                 <button onClick={generateAffiliateLink} className={`px-10 py-5 rounded-[1.5rem] border font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2 ${darkMode ? 'border-[#89CFF0]/50 text-[#89CFF0] bg-[#89CFF0]/5 hover:bg-[#89CFF0]/10' : 'border-[#89CFF0] text-[#89CFF0]'}`}>
                   🔗 Copy Viral Link (Earn 1%)
                 </button>
              </div>
            </div>

            {/* DESNA STRAN: INVESTMENT TERMINAL (1/3) */}
            <div className="space-y-8">
              
              <div className={`p-8 rounded-[3rem] border text-center transition-all ${darkMode ? 'bg-gradient-to-b from-[#89CFF0]/5 to-transparent border-[#89CFF0]/10 shadow-[0_0_50px_rgba(137,207,240,0.1)]' : 'bg-white border-zinc-100 shadow-xl'}`}>
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-5">Forge Security Audit</p>
                 <div className="relative inline-flex items-center justify-center">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-zinc-800" />
                      <circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="10" fill="transparent" 
                        strokeDasharray={414.7} strokeDashoffset={414.7 - (414.7 * finalTrustScore) / 100} 
                        className={`transition-all duration-1000 ${finalTrustScore > 70 ? 'text-[#89CFF0] shadow-[0_0_20px_rgba(137,207,240,0.5)]' : finalTrustScore > 40 ? 'text-yellow-500' : 'text-red-500'}`} />
                    </svg>
                    <span className="absolute text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{finalTrustScore}<span className="text-xl">%</span></span>
                 </div>
                 <p className={`text-[11px] font-black uppercase mt-5 ${finalTrustScore > 70 ? 'text-[#89CFF0] drop-shadow-[0_0_8px_rgba(137,207,240,0.5)]' : finalTrustScore > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {finalTrustScore > 70 ? 'Elite Status Verified' : finalTrustScore > 40 ? 'Moderate Risk' : 'High Risk Protocol'}
                 </p>
              </div>

              <div className={`p-10 rounded-[3rem] border shadow-2xl transition-all ${darkMode ? 'bg-black border-[#FF00FF]/30 shadow-[0_0_60px_rgba(255,0,255,0.1)]' : 'bg-white border-zinc-100'}`}>
                 <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black uppercase text-zinc-500">Live Progress</span>
                      <span className="text-white text-lg font-black">{progress}%</span>
                    </div>
                    <div className="w-full h-4 bg-zinc-900 border border-white/5 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-[#89CFF0] via-[#FF00FF] to-[#9400D3] shadow-[0_0_15px_rgba(255,0,255,0.5)]" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center font-bold uppercase">{(project.hard_cap * (progress/100)).toFixed(2)} / <span className="text-white">{project.hard_cap} {project.chain}</span> RAISED</p>
                 </div>

                 <div className="space-y-3 mb-8">
                   <label className="text-[10px] font-black text-zinc-600 uppercase ml-3 tracking-widest flex justify-between">
                       <span>Amount to Invest ({project.chain})</span>
                       <span className="text-[#FF00FF] cursor-pointer hover:underline">Max</span>
                   </label>
                   <input 
                    type="number" 
                    placeholder="0.0"
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-6 text-2xl font-mono text-white outline-none focus:border-[#FF00FF] focus:shadow-[0_0_15px_rgba(255,0,255,0.2)] transition-all"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                   />
                 </div>

                 <button 
                    onClick={handleBuy}
                    disabled={isLoading}
                    className={`w-full py-6 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all ${isLoading ? 'bg-zinc-800 text-zinc-500 cursor-wait' : 'bg-gradient-to-r from-[#89CFF0] via-[#FF00FF] to-[#9400D3] text-white shadow-[0_0_30px_rgba(255,0,255,0.3)]'}`}
                 >
                   {isLoading ? 'Connecting Wallet...' : `Buy $${project.token_symbol?.toUpperCase()}`}
                 </button>
                 
                 <p className="text-[9px] text-zinc-600 text-center uppercase font-bold mt-5 leading-relaxed italic">
                   Tokens will be automatically airdropped to your wallet upon presale finalization.
                 </p>
              </div>
            </div>

          </div>

          <div className="p-6 text-center border-t border-white/5 mt-auto">
             <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> GainWave Forge Project Terminal | Secured by Blockchain Protocol
             </p>
          </div>

        </div>
      </div>
    </div>
  );
}
