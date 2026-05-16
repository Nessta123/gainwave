"use client";
import React from 'react';

export default function ProfileView({ userData, onBack, posts }: any) {
  const userPosts = posts?.filter((p: any) => p.authorAlias === userData.alias) || [];
  const totalBulls = userPosts.reduce((sum: number, p: any) => sum + (p.bulls || 0), 0);
  const totalBears = userPosts.reduce((sum: number, p: any) => sum + (p.bears || 0), 0);
  const totalVotes = totalBulls + totalBears;
  
  const pulsePct = totalVotes > 0 ? (totalBulls / totalVotes) * 100 : 50;
  const isBullish = pulsePct >= 50;

  return (
    /* Zmanjšan padding na p-6 za mobilne naprave, p-10 ostane za desktop */
    <div className="relative overflow-hidden p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-blue-500/30 bg-zinc-900/40 text-center animate-in slide-in-from-bottom-4 duration-500 w-full">
      
      {/* --- TERMINAL PULSE HEADER --- */}
      <div className="absolute top-0 left-0 w-full h-20 md:h-24 overflow-hidden opacity-40">
        <div 
          className={`h-full transition-all duration-1000 ease-in-out ${isBullish ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${pulsePct}%` }}
        />
        <div 
          className={`absolute top-0 right-0 h-full w-1 shadow-[0_0_20px_2px] ${isBullish ? 'shadow-green-500 bg-green-400' : 'shadow-red-500 bg-red-400'}`}
          style={{ left: `calc(${pulsePct}% - 2px)` }}
        />
      </div>

      {/* PULSE LABEL - Prilagojen za ozke zaslone */}
      <div className="absolute top-4 md:top-6 left-0 w-full flex justify-center px-4">
        <div className="px-3 md:px-4 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
           <p className={`text-[7px] md:text-[9px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] ${isBullish ? 'text-green-500' : 'text-red-500'}`}>
             Pulse: {pulsePct.toFixed(1)}% {isBullish ? 'Bullish' : 'Bearish'}
           </p>
        </div>
      </div>

      {/* AVATAR SEKCIJA */}
      <div className="relative mt-10 md:mt-12 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[1.8rem] md:rounded-[2rem] mx-auto mb-4 md:mb-6 flex items-center justify-center text-3xl md:text-4xl shadow-2xl overflow-hidden border-2 border-blue-500/50 z-10">
        {userData.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" alt="Avatar" /> : "👤"}
      </div>

      <h2 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tighter break-words">
        {userData.alias || "Trader"}
      </h2>
      
      {/* PRIKAZ TRGA IN STILA */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-3">
        <p className="text-blue-500 font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px]">{userData.style}</p>
        <span className="text-zinc-700 hidden md:inline">•</span>
        <p className="text-yellow-500 font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px]">{userData.market}</p>
      </div>
      
      <div className="h-px w-24 md:w-32 bg-zinc-800 mx-auto my-6 md:my-8"></div>
      
      <p className="text-zinc-400 italic text-base md:text-lg max-w-md mx-auto leading-relaxed px-2">
        "{userData.bio || "No bio available."}"
      </p>
      
      {/* STATISTIKA - Popravljen Grid za iPhone (večji razmaki, manjše pisave) */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mt-8 md:mt-10 max-w-sm mx-auto">
        <div className="bg-zinc-800/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-zinc-800/50">
          <p className="text-[7px] md:text-[9px] text-zinc-500 uppercase">Following</p>
          <p className="text-base md:text-xl font-black text-white">{Array.isArray(userData.following) ? userData.following.length : 0}</p>
        </div>
        <div className="bg-zinc-800/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-zinc-800/50">
          <p className="text-[7px] md:text-[9px] text-zinc-500 uppercase">Followers</p>
          <p className="text-base md:text-xl font-black text-blue-500">{userData.followers || 0}</p>
        </div>
        <div className="bg-zinc-800/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-zinc-800/50">
          <p className="text-[7px] md:text-[9px] text-zinc-500 uppercase">Votes</p>
          <p className="text-base md:text-xl font-black text-green-500">{totalVotes}</p>
        </div>
      </div>

      <button 
        onClick={onBack} 
        className="mt-10 md:mt-12 w-full md:w-auto text-[9px] md:text-[10px] text-zinc-400 hover:text-white uppercase font-black border border-zinc-800 px-8 py-4 rounded-full transition-all active:scale-95 hover:border-blue-500 hover:bg-blue-500/5"
      >
        ← Return to Global Feed
      </button>
    </div>
  );
}