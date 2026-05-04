"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// --- SEZNAM VSEH PODPRTIH PAROV ZA AVTOMATSKEGA SODNIKA ---
const POPULAR_PAIRS = [
  // Crypto
  "BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD", "ADA/USD", "DOT/USD", "LINK/USD", "AVAX/USD", "DOGE/USD",
  // Forex
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "USD/CHF", "EUR/GBP", "EUR/JPY", "GBP/JPY",
  // Indices
  "US30/USD", "NAS100/USD", "SPX500/USD", "GER40/EUR", "UK100/GBP",
  // Commodities
  "XAU/USD", "XAG/USD", "WTI/USD",
  // Stocks (Delnice)
  "AAPL/USD", "TSLA/USD", "NVDA/USD", "AMZN/USD", "MSFT/USD", "GOOGL/USD", "META/USD", "NFLX/USD", "AMD/USD"
];

// 🔥 EXTREME 3D GLASS UI FUNKCIJE 🔥
const getGlassPanelClass = (darkMode: boolean) => darkMode 
  ? 'bg-gradient-to-br from-zinc-800/40 via-zinc-900/60 to-black/90 backdrop-blur-2xl border border-white/5 border-t-white/20 border-l-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
  : 'bg-gradient-to-br from-white/90 via-zinc-100/70 to-zinc-300/50 backdrop-blur-2xl border border-white/60 border-t-white/90 border-l-white/90 shadow-[0_25px_50px_rgba(0,0,0,0.1)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]';

const getGlassCardClass = (darkMode: boolean) => darkMode
  ? 'bg-gradient-to-br from-zinc-700/30 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 border-l-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)] transition-all duration-300'
  : 'bg-gradient-to-br from-white/80 to-zinc-200/50 backdrop-blur-xl border border-white/50 border-t-white/80 border-l-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.15)] transition-all duration-300';

const getSunkenClass = (darkMode: boolean) => darkMode
  ? 'bg-black/20 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] border border-white/5 text-white placeholder-zinc-500'
  : 'bg-zinc-200/40 shadow-[inset_0_4px_15px_rgba(0,0,0,0.05)] border border-black/5 text-zinc-900 placeholder-zinc-400';


interface FeedViewProps {
  userData: any;
  posts: any[];
  onBack: () => void;
  handleAddPost: (signalData?: any) => void; 
  newPost: string;
  setNewPost: (val: string) => void;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedImage: string | null;
  darkMode: boolean; 
  handleVote: (id: string, type: 'bull' | 'bear') => void;
  isOwnProfile?: boolean; 
  handleDeletePost: (id: string) => void; 
  handleUnlock?: (id: string, price: number) => void; 
  isPremium?: boolean; 
  setIsPremium?: (val: boolean) => void;
  priceBulls?: number; 
  setPriceBulls?: (val: number) => void; 
  handleSignalAction?: (id: string, actionType: 'manual_close' | 'set_be') => void; 
  isCopyable?: boolean;
  setIsCopyable?: (val: boolean) => void;
}

export default function FeedView({ 
  userData, 
  posts, 
  onBack, 
  handleAddPost, 
  newPost, 
  setNewPost, 
  handleImageChange, 
  selectedImage,
  darkMode,
  handleVote,
  isOwnProfile = true,
  handleDeletePost,
  handleUnlock,
  isPremium = false,
  setIsPremium,
  priceBulls = 5,
  setPriceBulls,
  handleSignalAction,
  isCopyable = false, 
  setIsCopyable 
}: FeedViewProps) {
  
  const [searchTerm, setSearchTerm] = useState("");
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // --- NOVI STATE-I ZA SIGNAL OBRAZEC ---
  const [isSignalMode, setIsSignalMode] = useState(false);
  const [signalPair, setSignalPair] = useState("");
  const [signalDir, setSignalDir] = useState("LONG");
  const [signalEntry, setSignalEntry] = useState("");
  const [signalSL, setSignalSL] = useState("");
  const [signalTP, setSignalTP] = useState("");

  // 🔥 STATE-I ZA COPY MODAL
  const [copyModalPost, setCopyModalPost] = useState<any | null>(null);
  const [copyRiskType, setCopyRiskType] = useState<'percent' | 'fixed'>('percent');
  const [copyRiskValue, setCopyRiskValue] = useState<string>("1");

  // 🔥 NOVO: STATE ZA ZAVIHTKE (ACTIVE / HISTORY)
  const [activeViewTab, setActiveViewTab] = useState<'active' | 'history'>('active');

  const safePosts = Array.isArray(posts) ? posts : [];
  const totalBulls = safePosts.reduce((sum, p) => sum + (p.bulls || 0), 0);
  const totalBears = safePosts.reduce((sum, p) => sum + (p.bears || 0), 0);
  const totalVotes = totalBulls + totalBears;
  const pulsePct = totalVotes > 0 ? (totalBulls / totalVotes) * 100 : 50;

  const isAuthenticated = (userData?.win_rate > 0) || (userData?.total_gain > 0) || (userData?.total_profit > 0) || userData?.verify_source === 'verified';
  const isInstitutional = userData?.is_institutional === true; 

  // 🔥 POPRAVLJENO: LOGIKA ZA FILTRIRANJE PO ZAVIHTKIH IN ISKANJU
  const filteredPosts = safePosts.filter(post => {
    const matchesSearch = !searchTerm || 
                          (post.text && post.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (post.pair && post.pair.toLowerCase().includes(searchTerm.toLowerCase()));
                          
    const isClosed = post.signal_status && !['pending', 'open'].includes(post.signal_status);
    const isSignal = Boolean(post.pair && post.entry);

    if (activeViewTab === 'history') {
      return matchesSearch && isSignal && isClosed;
    } else {
      return matchesSearch && (!isSignal || !isClosed);
    }
  });

  const handlePublishClick = () => {
    if (isSignalMode) {
      if (!signalPair || !signalEntry || !signalSL || !signalTP) {
        alert("Please fill in all signal fields (Pair, Entry, SL, TP).");
        return;
      }

      const entry = parseFloat(signalEntry);
      const sl = parseFloat(signalSL);
      const tp = parseFloat(signalTP);

      // --- SECURITY VALIDATION (Fat Finger Protection) ---
      if (signalDir === 'LONG') {
        if (sl >= entry) {
          alert("⚠️ SECURITY ERROR: For LONG positions, Stop Loss must be LOWER than Entry price.");
          return;
        }
        if (tp <= entry) {
          alert("⚠️ SECURITY ERROR: For LONG positions, Take Profit must be HIGHER than Entry price.");
          return;
        }
      } else if (signalDir === 'SHORT') {
        if (sl <= entry) {
          alert("⚠️ SECURITY ERROR: For SHORT positions, Stop Loss must be HIGHER than Entry price.");
          return;
        }
        if (tp >= entry) {
          alert("⚠️ SECURITY ERROR: For SHORT positions, Take Profit must be LOWER than Entry price.");
          return;
        }
      }

      handleAddPost({
        pair: signalPair.toUpperCase(),
        direction: signalDir,
        entry: entry,
        sl: sl,
        tp: tp
      });

      setSignalPair(""); setSignalEntry(""); setSignalSL(""); setSignalTP("");
      setIsSignalMode(false);
    } else {
      handleAddPost();
    }
  };

  const handleVoteClick = (postId: any, voteType: 'bull' | 'bear', isClosed: boolean) => {
    if (isClosed) {
      alert("This signal is already closed. Voting is disabled.");
      return;
    }
    handleVote(postId, voteType);
  };

  // 🔥 NOVO: FUNKCIJA ZA IZRAČUN DONOSA (PNL) V HISTORY TABU
  const calculateReturn = (post: any) => {
    if (!post.entry || !post.exit_price) return null;
    const entry = parseFloat(post.entry);
    const exit = parseFloat(post.exit_price);
    const isLong = post.direction === 'LONG' || post.direction?.toLowerCase() === 'bullish';
    
    let pnl = 0;
    if (isLong) {
      pnl = ((exit - entry) / entry) * 100;
    } else {
      pnl = ((entry - exit) / entry) * 100;
    }
    return pnl.toFixed(2);
  };

  // 🔥 FUNKCIJA ZA IZVRŠITEV KOPIRANJA V BAZO
  const executeCopySignal = async () => {
    if (!copyModalPost || !userData?.id) return;
    
    const riskVal = parseFloat(copyRiskValue);
    if (isNaN(riskVal) || riskVal <= 0) {
      alert("Prosimo vnesite veljavno vrednost za tveganje ali lot.");
      return;
    }
    
    try {
      const { error } = await supabase.from('copied_trades').insert([{
        copier_id: userData.id,
        signal_id: copyModalPost.id,
        signal_author_id: copyModalPost.user_id,
        pair: copyModalPost.pair,
        direction: copyModalPost.direction,
        entry_price: copyModalPost.entry ? parseFloat(copyModalPost.entry) : null,
        sl_price: copyModalPost.sl ? parseFloat(copyModalPost.sl) : null,
        tp_price: copyModalPost.tp ? parseFloat(copyModalPost.tp) : null,
        risk_type: copyRiskType,
        risk_value: riskVal,
        status: 'pending'
      }]);

      if (error) throw error;
      
      alert(`⚡ Signal uspešno poslan v terminalsko bazo!\n\nSistem čaka na izvršitev: ${copyModalPost.pair} ${copyModalPost.direction}`);
      
      setCopyModalPost(null); 
      setCopyRiskValue("1");
    } catch (err: any) {
      console.error("Napaka pri kopiranju:", err);
      alert("Sistemska napaka pri kopiranju: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">
      
      {/* 🔥 COPY MODAL */}
      {copyModalPost && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
          <div className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 ${getGlassPanelClass(darkMode)}`}>
            
            <button 
              onClick={() => setCopyModalPost(null)}
              className={`absolute top-6 right-6 text-xl transition-transform hover:rotate-90 z-20 ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <span className="text-3xl drop-shadow-md">⚡</span>
              <div>
                <h3 className={`text-xl font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>Copy Signal</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">From Node: {copyModalPost.authorAlias}</p>
              </div>
            </div>

            <div className={`p-4 rounded-[1.5rem] mb-6 grid grid-cols-2 gap-4 transition-all duration-300 relative z-10 ${getSunkenClass(darkMode)} !bg-transparent`}>
               <div className="flex flex-col">
                 <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Pair & Dir</span>
                 <span className={`text-sm font-black font-mono ${copyModalPost.direction === 'LONG' || copyModalPost.direction?.toLowerCase() === 'bullish' ? 'text-green-500' : 'text-red-500'}`}>
                   {copyModalPost.pair} {copyModalPost.direction === 'LONG' || copyModalPost.direction?.toLowerCase() === 'bullish' ? '🟢' : '🔴'}
                 </span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Entry</span>
                 <span className={`text-sm font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{copyModalPost.entry}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[8px] uppercase tracking-widest text-red-500 font-bold mb-1">Stop Loss</span>
                 <span className={`text-sm font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{copyModalPost.sl}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[8px] uppercase tracking-widest text-green-500 font-bold mb-1">Take Profit</span>
                 <span className={`text-sm font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{copyModalPost.tp}</span>
               </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className={`flex rounded-[1rem] p-1 transition-all ${getSunkenClass(darkMode)} !bg-transparent`}>
                <button 
                  onClick={() => { setCopyRiskType('percent'); setCopyRiskValue("1"); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${copyRiskType === 'percent' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-blue-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Risk %
                </button>
                <button 
                  onClick={() => { setCopyRiskType('fixed'); setCopyRiskValue("0.1"); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${copyRiskType === 'fixed' ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md border border-zinc-600' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Fixed Lot
                </button>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block ml-1">
                  {copyRiskType === 'percent' ? 'Risk Per Trade (%)' : 'Position Size (Lots)'}
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={copyRiskValue}
                    onChange={(e) => setCopyRiskValue(e.target.value)}
                    className={`w-full p-4 rounded-2xl text-2xl font-black font-mono outline-none transition-all pr-12 ${getSunkenClass(darkMode)}
                      ${copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 ? '!border-red-500 !text-red-500 focus:!border-red-500 shadow-[inset_0_0_15px_rgba(239,68,68,0.2)]' : (darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50')}
                    `}
                  />
                  <span className={`absolute right-5 top-1/2 -translate-y-1/2 font-black text-xl ${
                    copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 ? 'text-red-500' : 'text-zinc-500'
                  }`}>
                    {copyRiskType === 'percent' ? '%' : 'L'}
                  </span>
                </div>
                
                {copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 && (
                  <p className="text-[10px] font-black text-red-500 uppercase mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed shadow-inner">
                    ⚠️ Opozorilo: Tveganje več kot 2% na posamezen trade močno poveča možnost izgube kapitala (Drawdown). Priporočamo 1-2%.
                  </p>
                )}
              </div>
            </div>

            <button 
              onClick={executeCopySignal}
              className="w-full mt-8 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:brightness-110 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all active:scale-95 border border-blue-400/30 relative z-10"
            >
              Confirm & Execute
            </button>

          </div>
        </div>
      )}

      {/* 1. NAVIGACIJA */}
      <div className={`flex items-center justify-between p-4 rounded-[1.5rem] transition-all duration-500 relative overflow-hidden ${getGlassPanelClass(darkMode)}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] pointer-events-none z-0"></div>
        
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack(); }}
          className={`relative z-10 flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-90 ${getGlassCardClass(darkMode)} hover:border-blue-500/50`}
        >
          <span className={darkMode ? "text-blue-500" : "text-blue-600"}>←</span>
        </button>
        
        <div className="flex items-center gap-4 px-1 relative z-10">
          <span className={`text-[8px] font-black uppercase tracking-[0.2em] drop-shadow-sm opacity-60 ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
             {isOwnProfile ? 'Terminal Master' : `Node: ${userData?.alias || 'Anonymous'}`}
          </span>
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBack(); }}
            className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-xl active:scale-95 ${getGlassCardClass(darkMode)} ${darkMode ? 'text-zinc-400 hover:text-blue-400' : 'text-zinc-600 hover:text-blue-600'}`}
          >
            {isOwnProfile ? 'Exit Terminal' : 'Back'}
          </button>
        </div>
      </div>

      {/* --- STATISTIKA OKVIR (ZGORAJ) --- */}
      <div className={`p-6 md:p-8 rounded-[2.5rem] transition-all duration-500 relative overflow-hidden ${getGlassPanelClass(darkMode)}`}>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-green-500/10 blur-[50px] pointer-events-none z-0"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/10 blur-[50px] pointer-events-none z-0"></div>
        
        <div className="relative z-10 flex justify-between items-end mb-4 px-1">
          <div className="flex flex-col">
            <span className="text-[7px] uppercase opacity-60 tracking-widest font-bold">VERIFIED TRADER STATISTICS</span>
            <span className="text-[10px] md:text-[12px] font-black text-green-500 tracking-tighter uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
              BULL {pulsePct.toFixed(1)}%
            </span>
          </div>
          <div className="text-center">
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] drop-shadow-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              TERMINAL PULSE
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[7px] uppercase opacity-60 tracking-widest font-bold">Sentiment</span>
            <span className="text-[10px] md:text-[12px] font-black text-red-500 tracking-tighter uppercase drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              BEAR {(100 - pulsePct).toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className={`relative w-full h-3 rounded-full overflow-hidden shadow-inner border ${getSunkenClass(darkMode)} !bg-zinc-900/50`}>
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/40 to-red-500/40" />
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(34,197,94,0.5)]"
            style={{ width: `${pulsePct}%` }}
          />
          <div 
            className="absolute top-0 h-full w-1.5 bg-white shadow-[0_0_10px_#fff] z-10 transition-all duration-1000"
            style={{ left: `calc(${pulsePct}% - 1px)` }}
          />
        </div>
      </div>

      {/* 2. BROADCAST MODUL (SAMO ZA LASTNIKA) */}
      {isOwnProfile && (
        <div className={`p-6 md:p-8 rounded-[2.5rem] transition-all duration-500 flex flex-col gap-4 relative overflow-hidden ${getGlassPanelClass(darkMode)} border-blue-500/20`}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[60px] pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6] ${darkMode ? 'bg-blue-500' : 'bg-blue-600'}`} />
              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Initial Broadcast
              </span>
            </div>
          </div>

          {isSignalMode && (
            <div className={`relative z-10 grid grid-cols-2 md:grid-cols-5 gap-4 p-5 rounded-[1.5rem] transition-all duration-300 ${getSunkenClass(darkMode)} !bg-black/30`}>
              <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                <label className={`text-[8px] font-black uppercase tracking-widest opacity-60 ${darkMode ? 'text-zinc-300' : 'text-zinc-500'}`}>Pair</label>
                <input 
                  type="text" 
                  list="popular-pairs-feed"
                  placeholder="BTC/USD" 
                  value={signalPair} 
                  onChange={e => setSignalPair(e.target.value)} 
                  className={`bg-transparent border-b outline-none text-xs font-mono font-black uppercase py-1.5 transition-colors ${darkMode ? 'border-zinc-700 text-white focus:border-blue-500' : 'border-zinc-400 text-zinc-900 focus:border-blue-600'}`} 
                />
                <datalist id="popular-pairs-feed">
                  {POPULAR_PAIRS.map(pair => (
                    <option key={pair} value={pair} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2 md:col-span-1">
                <label className={`text-[8px] font-black uppercase tracking-widest opacity-60 ${darkMode ? 'text-zinc-300' : 'text-zinc-500'}`}>Direction</label>
                <select value={signalDir} onChange={e => setSignalDir(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-black py-1.5 cursor-pointer transition-colors ${darkMode ? 'border-zinc-700' : 'border-zinc-400'} ${signalDir === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                  <option value="LONG" className={darkMode ? "bg-zinc-900 text-white" : "bg-white text-black"}>🟢 LONG</option>
                  <option value="SHORT" className={darkMode ? "bg-zinc-900 text-white" : "bg-white text-black"}>🔴 SHORT</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-blue-500">Entry</label>
                <input type="number" placeholder="0.00" value={signalEntry} onChange={e => setSignalEntry(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono py-1.5 transition-colors ${darkMode ? 'border-zinc-700 text-white focus:border-blue-500' : 'border-zinc-400 text-zinc-900 focus:border-blue-600'}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-red-500">Stop Loss</label>
                <input type="number" placeholder="0.00" value={signalSL} onChange={e => setSignalSL(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono py-1.5 transition-colors ${darkMode ? 'border-zinc-700 text-white focus:border-blue-500' : 'border-zinc-400 text-zinc-900 focus:border-blue-600'}`} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-green-500">Take Profit</label>
                <input type="number" placeholder="0.00" value={signalTP} onChange={e => setSignalTP(e.target.value)} className={`bg-transparent border-b outline-none text-xs font-mono py-1.5 transition-colors ${darkMode ? 'border-zinc-700 text-white focus:border-green-500' : 'border-zinc-400 text-zinc-900 focus:border-green-600'}`} />
              </div>
            </div>
          )}

          <textarea 
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={isSignalMode ? "Additional intel or setup logic (optional)..." : "Input signal data..."}
            className={`relative z-10 w-full rounded-2xl p-4 text-sm md:text-base font-light italic resize-none h-24 outline-none transition-all custom-scrollbar ${getSunkenClass(darkMode)} ${
              darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'
            }`}
          />

          <div className={`relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between mt-2 pt-5 border-t gap-4 ${darkMode ? 'border-zinc-700/50' : 'border-zinc-200/50'}`}>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer group flex items-center gap-2 relative">
                <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all active:scale-90 ${getGlassCardClass(darkMode)} hover:border-blue-500/50`}>
                  <svg className={`w-6 h-6 opacity-70 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
              </label>

              {selectedImage && (
                <div className="w-14 h-14 rounded-[1rem] overflow-hidden border border-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
               <div className={`flex p-1 rounded-xl transition-all ${getSunkenClass(darkMode)} !bg-transparent border-none`}>
                 <button 
                    type="button"
                    onClick={() => {
                      setIsSignalMode(false);
                      if (setIsCopyable) setIsCopyable(false);
                    }}
                    className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      !isSignalMode ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-blue-400/50' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    💬 Post
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsSignalMode(true)}
                    className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      isSignalMode ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md border border-green-400/50' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    🎯 Signal
                  </button>
               </div>

               {isSignalMode && (userData?.is_premium || userData?.alias === 'ADMIN') && setIsCopyable && (
                  <button 
                    type="button"
                    onClick={() => setIsCopyable(!isCopyable)}
                    className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                      isCopyable 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.2)]' 
                        : getGlassCardClass(darkMode) + ' text-zinc-500'
                    }`}
                  >
                    ⚡ {isCopyable ? 'Copy ON' : 'Copy OFF'}
                  </button>
               )}

               {/* 🔥 ZMENJANO: ZDAJ SO SAMO GUMBI ZA FREE / PREM (BREZ VNOSA CENE) 🔥 */}
               {setIsPremium && (
                 <div className={`flex p-1 rounded-xl transition-all ${getSunkenClass(darkMode)} !bg-transparent border-none`}>
                   <button 
                      type="button"
                      onClick={() => setIsPremium(false)}
                      className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        !isPremium ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-blue-400/50' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      🔓 Free
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsPremium(true)}
                      className={`px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        isPremium ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] border border-yellow-300' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      🔒 Prem
                    </button>
                 </div>
               )}

              <button 
                onClick={handlePublishClick}
                disabled={(!newPost.trim() && !selectedImage && !isSignalMode) || (isSignalMode && (!signalPair || !signalEntry || !signalSL || !signalTP))}
                className={`flex-1 lg:flex-none px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  ((newPost.trim() || selectedImage) || (isSignalMode && signalPair))
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-[0_10px_20px_rgba(37,99,235,0.4)] border border-blue-400/50 active:scale-95' 
                    : (darkMode ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed border border-zinc-800' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300')
                }`}
              >
                Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🔥 NOVO: TAB NAVIGACIJA ZA SEZNAM --- */}
      <div className="flex items-center gap-6 px-4 mt-10">
        <button 
          onClick={() => setActiveViewTab('active')}
          className={`pb-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
            activeViewTab === 'active' 
              ? (darkMode ? 'border-blue-500 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'border-blue-600 text-blue-600') 
              : 'border-transparent text-zinc-500 hover:text-zinc-400'
          }`}
        >
          Active Transmissions
        </button>
        <button 
          onClick={() => setActiveViewTab('history')}
          className={`pb-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
            activeViewTab === 'history' 
              ? (darkMode ? 'border-blue-500 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'border-blue-600 text-blue-600') 
              : 'border-transparent text-zinc-500 hover:text-zinc-400'
          }`}
        >
          Terminal History
        </button>
        <div className={`h-[1px] flex-1 mb-3 ${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}`} />
      </div>

      {/* 3. LOG SEZNAM */}
      <div className="grid grid-cols-1 gap-6 pb-10 mt-6 relative z-10">
        {filteredPosts.length === 0 ? (
          <div className={`text-center py-16 border-dashed rounded-[3rem] transition-all duration-300 ${getSunkenClass(darkMode)} !bg-transparent`}>
            <span className="text-[10px] md:text-xs uppercase font-black tracking-[0.3em] opacity-50">
              {activeViewTab === 'history' ? 'No closed trades yet.' : 'No active signals.'}
            </span>
          </div>
        ) : (
          filteredPosts.map((post, idx) => {
            const showBlur = !isOwnProfile && post.is_premium && !post.is_unlocked;
            const isPremiumAuthor = post.author_is_premium === true;

            // 🔥 DEFINICIJA STATUSOV
            const isPending = post.signal_status === 'pending';
            const isOpen = post.signal_status === 'open';
            const isClosed = post.signal_status && !['pending', 'open'].includes(post.signal_status);
            
            // Izračun donosa
            const returnPct = calculateReturn(post);

            return (
              <div key={post.id || idx} className={`group p-6 md:p-8 border rounded-[2.5rem] transition-all duration-700 relative overflow-hidden ${
                isPremiumAuthor 
                  ? (darkMode ? 'bg-gradient-to-br from-yellow-500/5 via-zinc-900/50 to-black/80 border-yellow-500/30 shadow-[0_10px_30px_rgba(234,179,8,0.1)] backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(234,179,8,0.1)]' : 'bg-gradient-to-br from-yellow-50/50 to-white/70 border-yellow-200 shadow-sm backdrop-blur-2xl border-t-white/90 border-l-yellow-200/90')
                  : getGlassPanelClass(darkMode)
              } ${isClosed ? 'opacity-80' : ''}`}>
                
                {isOwnProfile && (
                  <button 
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      handleDeletePost(post.id); 
                    }} 
                    className="absolute top-5 right-5 text-zinc-500 hover:text-red-500 p-2 bg-black/20 hover:bg-black/40 rounded-full z-20 backdrop-blur-md border border-white/5 active:scale-90 transition-all"
                    title="Delete Signal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}

                <div className="flex flex-col md:flex-row gap-5 md:gap-6 relative z-10">
                  {post.image && !showBlur && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); setZoomImage(post.image); }}
                      className={`relative shrink-0 w-full md:w-44 h-48 md:h-44 rounded-[1.5rem] overflow-hidden border cursor-zoom-in group/img transition-all shadow-inner ${
                        darkMode ? 'border-zinc-700/50 bg-black/40' : 'border-zinc-200/80 bg-zinc-100/50'
                      }`}
                    >
                      <img src={post.image} alt="Signal" className={`w-full h-full object-cover transition-transform duration-700 ${isClosed ? 'grayscale opacity-50' : 'group-hover:scale-105'}`} />
                      
                      {post.entry && !isClosed && (
                           <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-lg">
                              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPending ? 'bg-yellow-500 shadow-[0_0_5px_#eab308]' : 'bg-blue-500 shadow-[0_0_5px_#3b82f6]'}`}></div>
                              <span className="text-[7px] text-white font-black uppercase tracking-widest">
                                {isPending ? 'Syncing...' : 'Live Intel'}
                              </span>
                           </div>
                       )}
                    </div>
                  )}

                  {post.image && showBlur && (
                    <div className={`relative shrink-0 w-full md:w-44 h-48 md:h-44 rounded-[1.5rem] overflow-hidden border backdrop-blur-sm ${
                      darkMode ? 'border-zinc-800/50 bg-black/20' : 'border-zinc-200/50 bg-white/50'
                    }`}>
                       <img src={post.image} alt="Locked" className="w-full h-full object-cover opacity-20 blur-xl pointer-events-none select-none" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl opacity-50 drop-shadow-lg">🔒</span>
                       </div>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="relative">
                             <div className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all shadow-md ${
                               isPremiumAuthor ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : (darkMode ? 'border-zinc-600' : 'border-zinc-300')
                             }`}>
                                <div className={`w-full h-full flex items-center justify-center text-[10px] ${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}`}>
                                  {userData.avatar ? <img src={userData.avatar} className="w-full h-full object-cover" /> : "👤"}
                                </div>
                             </div>
                           </div>

                           <div className="flex items-center gap-1.5">
                             <span className={`text-[10px] md:text-xs font-black uppercase tracking-tighter ${
                               isPremiumAuthor ? 'text-yellow-500 drop-shadow-sm' : (darkMode ? 'text-white' : 'text-zinc-900')
                             }`}>
                                {userData.alias} {post.is_premium && <span className="text-yellow-500 ml-1">💎 PREM</span>}
                             </span>

                             {/* 🔥 INSTITUTIONAL ELITE SHIELD 🔥 */}
                             {isInstitutional && (
                               <div className="group/shield relative flex items-center cursor-help">
                                 <div className="relative">
                                   <svg className="w-4 h-4 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" fill="currentColor" viewBox="0 0 20 20">
                                     <path d="M10 2l-6 2.5v5c0 4.5 3.5 8.5 6 10.5 2.5-2 6-6 6-10.5v-5L10 2z" />
                                   </svg>
                                   <svg className="absolute inset-0 w-2.5 h-2.5 text-black m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                   </svg>
                                 </div>
                                 
                                 <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/shield:opacity-100 transition-all duration-300 bg-zinc-950 border border-green-500/50 p-3 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.8)] w-56 z-[100] pointer-events-none backdrop-blur-xl">
                                   <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 italic">
                                     🔱 Institutional Grade Node
                                   </p>
                                   <p className="text-[9px] text-zinc-400 leading-tight uppercase font-bold">
                                     Verified high-accuracy node with 80%+ win-rate and institutional risk management protocols.
                                   </p>
                                 </div>
                               </div>
                             )}
                           </div>

                           {isPremiumAuthor && (
                             <div className="flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-md border border-yellow-500/50 bg-yellow-500/10 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)] ml-2">
                               👑 PRO NODE
                             </div>
                           )}

                           {isAuthenticated && !isInstitutional && (
                             <div className={`flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-md border backdrop-blur-sm ${
                                darkMode ? 'bg-green-500/5 border-green-500/30 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-green-500/10 border-green-500/40 text-green-700'
                             } ml-2`}>
                                <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                GW AUTHENTICATED
                             </div>
                           )}
                        </div>
                        <span className="text-[8px] font-mono opacity-40 uppercase">{post.time}</span>
                      </div>
                      
                      {showBlur ? (
                          <div className={`relative mt-3 mb-5 p-8 rounded-[2rem] border flex flex-col items-center justify-center text-center overflow-hidden transition-all backdrop-blur-2xl shadow-inner ${
                            darkMode ? 'bg-gradient-to-br from-zinc-900/80 to-black/80 border-yellow-500/30' : 'bg-gradient-to-br from-zinc-50/90 to-white/90 border-yellow-300'
                          }`}>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] z-0"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/10 blur-[60px] pointer-events-none z-0"></div>
                            
                            <div className="z-10 flex flex-col items-center">
                              <div className="w-14 h-14 bg-gradient-to-tr from-yellow-500 to-yellow-300 rounded-full flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(234,179,8,0.5)] border-2 border-yellow-200">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-black">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                              </div>
                              <h4 className={`text-sm font-black uppercase tracking-[0.2em] mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} drop-shadow-sm`}>
                                Premium Node Intel
                              </h4>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mb-6 max-w-[220px] leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                This signal is exclusive to <span className={darkMode ? 'text-white' : 'text-black'}>@{post.authorAlias}</span>'s subscribers.
                              </p>
                              
                              <button 
                                onClick={(e) => { 
                                  e.preventDefault();
                                  e.stopPropagation(); 
                                  if (handleUnlock) {
                                    handleUnlock(post.id, post.price_bulls || 5); 
                                  } else {
                                    alert("Nakup kovancev bo kmalu na voljo!");
                                  }
                                }}
                                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(234,179,8,0.4)] border border-yellow-300"
                              >
                                Unlock for {post.price_bulls || 5} GAINS 💎
                              </button>
                            </div>
                          </div>
                      ) : (
                        <div>
                          {post.entry && (
                            <div className="flex gap-2 my-3 flex-wrap">
                              {isPending && (
                                <div className="py-1.5 px-3 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 flex items-center gap-2 animate-pulse backdrop-blur-sm shadow-inner">
                                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_5px_#eab308]"></span>
                                  🛰️ Waiting for Entry
                                </div>
                              )}
                              {isOpen && (
                                <div className="py-1.5 px-3 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] bg-blue-600/10 text-blue-500 border border-blue-500/30 flex items-center gap-2 backdrop-blur-sm shadow-inner">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping shadow-[0_0_5px_#3b82f6]"></span>
                                  🚀 Signal Active
                                </div>
                              )}
                              {isClosed && (
                                  <div className={`py-1.5 px-3 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-2 backdrop-blur-sm shadow-inner ${
                                      post.signal_status === 'win' ? 'bg-green-500/10 text-green-500 border border-green-500/30 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]' :
                                      post.signal_status === 'loss' ? 'bg-red-500/10 text-red-500 border border-red-500/30 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]' :
                                      post.signal_status === 'manual_exit' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' :
                                      (post.signal_status === 'visual_only' || post.signal_status === 'waiting_mt5') ? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/30' :
                                      'bg-zinc-500/10 text-zinc-500 border border-zinc-500/30'
                                  }`}>
                                      <span>
                                        {post.signal_status === 'win' ? '🎯 TARGET HIT' :
                                         post.signal_status === 'loss' ? '🛑 STOPPED OUT' :
                                         post.signal_status === 'manual_exit' ? '✋ MANUAL CLOSE' :
                                         (post.signal_status === 'visual_only' || post.signal_status === 'waiting_mt5') ? '👁️ MT5 PENDING' :
                                         '🛡️ BREAK EVEN'}
                                      </span>
                                      {/* 🔥 IZRAČUNAN PNL V ZGODOVINI */}
                                      {returnPct && post.signal_status !== 'visual_only' && post.signal_status !== 'waiting_mt5' && (
                                        <span className="pl-2 border-l border-current">
                                          PNL: {Number(returnPct) > 0 ? '+' : ''}{returnPct}%
                                        </span>
                                      )}
                                  </div>
                              )}
                            </div>
                          )}

                          {post.pair && (
                             <div className={`mt-3 mb-5 flex flex-wrap gap-0 p-1 rounded-[1.2rem] border relative overflow-hidden backdrop-blur-md shadow-inner transition-all ${getSunkenClass(darkMode)}`}>
                                <div className="flex-1 flex flex-col pl-4 pr-2 py-3 border-r border-zinc-500/20">
                                   <span className="text-[7px] uppercase font-black text-zinc-500 mb-0.5">Pair</span>
                                   <span className={`text-[12px] font-black font-mono tracking-tighter drop-shadow-sm ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{post.pair}</span>
                                </div>
                                <div className="flex-1 flex flex-col px-3 py-3 border-r border-zinc-500/20">
                                   <span className="text-[7px] uppercase font-black text-zinc-500 mb-0.5">Dir</span>
                                   <span className={`text-[12px] font-black tracking-tighter ${post.direction === 'LONG' || post.direction?.toLowerCase() === 'bullish' ? 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]' : 'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.4)]'}`}>
                                      {post.direction === 'LONG' || post.direction?.toLowerCase() === 'bullish' ? '🟢 LONG' : '🔴 SHORT'}
                                   </span>
                                </div>
                                <div className="flex-1 flex flex-col px-3 py-3 border-r border-zinc-500/20">
                                   <span className="text-[7px] uppercase font-black text-blue-500 mb-0.5">Entry</span>
                                   <span className={`text-[12px] font-mono font-bold tracking-tighter ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{post.entry}</span>
                                </div>
                                <div className="flex-1 flex flex-col px-3 py-3 border-r border-zinc-500/20">
                                   <span className="text-[7px] uppercase font-black text-red-500 mb-0.5">SL</span>
                                   <span className={`text-[12px] font-mono font-bold tracking-tighter ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{post.sl}</span>
                                </div>
                                <div className="flex-1 flex flex-col px-3 py-3">
                                   <span className="text-[7px] uppercase font-black text-green-500 mb-0.5">TP</span>
                                   <span className={`text-[12px] font-mono font-bold tracking-tighter ${darkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>{post.tp}</span>
                                </div>

                                {isClosed && post.exit_price && (
                                  <div className="flex-1 flex flex-col px-3 py-3 border-l border-zinc-500/20 animate-in fade-in duration-1000 bg-blue-500/5">
                                    <span className="text-[7px] uppercase font-black text-blue-400 mb-0.5">Exit Lock</span>
                                    <span className={`text-[12px] font-mono font-black tracking-tighter drop-shadow-sm ${
                                      post.signal_status === 'win' ? 'text-green-500' : 
                                      post.signal_status === 'loss' ? 'text-red-500' : 'text-blue-500'
                                    }`}>
                                      {post.exit_price}
                                    </span>
                                  </div>
                                )}

                                {isOwnProfile && !isClosed && handleSignalAction && (
                                  <div className="w-full mt-1 pt-2 pb-2 px-3 border-t border-zinc-500/20 flex gap-2 bg-black/10">
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleSignalAction(post.id, 'manual_close'); }}
                                          className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:brightness-110 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(37,99,235,0.3)] active:scale-95"
                                      >
                                          🛑 Close Now
                                      </button>
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleSignalAction(post.id, 'set_be'); }}
                                          className={`flex-1 py-2 border rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-inner ${
                                              darkMode ? 'border-zinc-600 text-zinc-300 hover:text-white hover:border-zinc-400 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-600 hover:text-black hover:border-zinc-400 hover:bg-zinc-100'
                                          }`}
                                      >
                                          🛡️ Set B.E.
                                      </button>
                                  </div>
                                )}
                             </div>
                          )}
                          <p className={`text-[13px] md:text-[14px] font-medium leading-relaxed tracking-tight mb-5 break-words ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            "{post.text}"
                          </p>
                        </div>
                      )}
                    </div>

                    {!showBlur && !isClosed && (
                      <div className="flex items-center gap-2 mt-6">
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVoteClick(post.id, 'bull', Boolean(isClosed)); }}
                          className={`flex-1 md:flex-none py-3 px-6 rounded-xl border text-[9px] font-black transition-all active:scale-95 ${
                            isClosed 
                                ? (darkMode ? 'bg-zinc-900/30 border-zinc-800/30 text-zinc-700 cursor-not-allowed shadow-inner' : 'bg-zinc-100/50 border-zinc-200/50 text-zinc-400 cursor-not-allowed shadow-inner')
                                : getGlassCardClass(darkMode) + (darkMode ? ' text-zinc-400 hover:text-green-500 hover:!border-green-500/30' : ' text-zinc-600 hover:text-green-600 hover:!border-green-300')
                          }`}
                        >
                          BULLISH {post.bulls > 0 && <span className="text-green-500 ml-1 font-mono text-[10px]">// {post.bulls}</span>}
                        </button>
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVoteClick(post.id, 'bear', Boolean(isClosed)); }}
                          className={`flex-1 md:flex-none py-3 px-6 rounded-xl border text-[9px] font-black transition-all active:scale-95 ${
                            isClosed 
                                ? (darkMode ? 'bg-zinc-900/30 border-zinc-800/30 text-zinc-700 cursor-not-allowed shadow-inner' : 'bg-zinc-100/50 border-zinc-200/50 text-zinc-400 cursor-not-allowed shadow-inner')
                                : getGlassCardClass(darkMode) + (darkMode ? ' text-zinc-400 hover:text-red-500 hover:!border-red-500/30' : ' text-zinc-600 hover:text-red-600 hover:!border-red-300')
                          }`}
                        >
                          BEARISH {post.bears > 0 && <span className="text-red-500 ml-1 font-mono text-[10px]">// {post.bears}</span>}
                        </button>
                        
                        {post.is_copyable && !isOwnProfile && !isClosed && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCopyModalPost(post);
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-400 text-black border border-yellow-300 shadow-[0_5px_15px_rgba(234,179,8,0.4)] transition-all active:scale-95"
                          >
                            <span className="text-[9px] font-black uppercase tracking-tighter">⚡ Copy</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isClosed && (
                   <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden z-0">
                       <span className="text-9xl font-black rotate-[-20deg] uppercase tracking-tighter whitespace-nowrap">
                           {String(post.signal_status || 'CLOSED').replace('_', ' ')}
                       </span>
                   </div>
                )}
                
                 <div className={`absolute top-0 right-0 w-16 h-16 border-t-[3px] border-r-[3px] rounded-tr-[2.5rem] transition-all duration-700 z-10 pointer-events-none ${
                    darkMode ? 'opacity-50 border-white/10 group-hover:opacity-100 group-hover:border-blue-500/50' : 'opacity-0 border-blue-500/30 group-hover:opacity-100'
                 }`} />
              </div>
            );
          })
        )}
      </div>

      {zoomImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-6 cursor-zoom-out animate-in fade-in duration-300" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} className="max-w-full max-h-full object-contain rounded-[2rem] shadow-[0_0_60px_rgba(255,255,255,0.15)] border border-white/10" alt="Zoom" />
        </div>
      )}
    </div>
  );
}
