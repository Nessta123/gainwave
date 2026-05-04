"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TradingJournal({ userId, isOwnProfile, darkMode }: any) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTrade, setNewTrade] = useState({
    pair: '',
    type: 'BUY',
    entry_price: '',
    status: 'OPEN',
    pips_profit: '',
    notes: ''
  });

  const fetchTrades = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) setTrades(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrades();
  }, [userId]);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    const { error } = await supabase.from('trades').insert([{
      ...newTrade,
      user_id: userId,
      pair: newTrade.pair.toUpperCase(),
      entry_price: parseFloat(newTrade.entry_price || '0'),
      pips_profit: parseFloat(newTrade.pips_profit || '0')
    }]);

    if (!error) {
      setNewTrade({ pair: '', type: 'BUY', entry_price: '', status: 'OPEN', pips_profit: '', notes: '' });
      fetchTrades();
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error) fetchTrades();
  };

  const calculateStats = () => {
    const closed = trades.filter(t => t.status !== 'OPEN');
    const wins = closed.filter(t => t.status === 'WIN').length;
    const totalProfit = trades.reduce((sum, t) => sum + (Number(t.pips_profit) || 0), 0);
    const winRate = closed.length > 0 ? (wins / closed.length * 100).toFixed(1) : 0;
    
    return { winRate, total: closed.length, totalProfit };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto p-2 md:p-4">
      
      {/* PERFORMANCE DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
          <p className="text-[9px] font-black uppercase text-blue-500 mb-1 tracking-widest">Accuracy</p>
          <p className="text-3xl font-black">{stats.winRate}%</p>
        </div>
        <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
          <p className="text-[9px] font-black uppercase text-orange-500 mb-1 tracking-widest">Total P/L</p>
          <p className={`text-3xl font-black ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.totalProfit > 0 ? `+${stats.totalProfit}` : stats.totalProfit}
          </p>
        </div>
        <div className={`p-6 rounded-[2rem] border ${darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
          <p className="text-[9px] font-black uppercase text-zinc-500 mb-1 tracking-widest">Trades Completed</p>
          <p className="text-3xl font-black">{stats.total}</p>
        </div>
      </div>

      {/* INPUT LEDGER - Only for the owner */}
      {isOwnProfile && (
        <form onSubmit={handleAddTrade} className={`p-6 md:p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900/20 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
          <h3 className="text-[10px] font-black uppercase mb-6 tracking-[0.3em] text-center opacity-50 italic">Terminal Entry Log</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <input type="text" placeholder="PAIR (e.g. BTC/USD)" value={newTrade.pair} onChange={e => setNewTrade({...newTrade, pair: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`} required />
              <select value={newTrade.type} onChange={e => setNewTrade({...newTrade, type: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold uppercase outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}>
                <option value="BUY">LONG / BUY</option>
                <option value="SELL">SHORT / SELL</option>
              </select>
            </div>
            <div className="space-y-4">
              <input type="number" step="any" placeholder="ENTRY PRICE" value={newTrade.entry_price} onChange={e => setNewTrade({...newTrade, entry_price: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-blue-500 transition-all ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`} required />
              <input type="number" step="any" placeholder="PROFIT / LOSS (+/-)" value={newTrade.pips_profit} onChange={e => setNewTrade({...newTrade, pips_profit: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-blue-500 transition-all ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`} />
            </div>
            <div className="space-y-4">
              <select value={newTrade.status} onChange={e => setNewTrade({...newTrade, status: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold uppercase outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}>
                <option value="OPEN">PENDING / OPEN</option>
                <option value="WIN">PROFIT / WIN</option>
                <option value="LOSS">STOPPED / LOSS</option>
              </select>
              <input type="text" placeholder="STRATEGY NOTES" value={newTrade.notes} onChange={e => setNewTrade({...newTrade, notes: e.target.value})} className={`w-full p-3 rounded-xl border text-xs font-bold outline-none focus:border-blue-500 transition-all ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`} />
            </div>
          </div>
          <button type="submit" className="w-full mt-6 bg-blue-600 text-white text-[10px] font-black uppercase rounded-2xl py-4 hover:bg-blue-500 transition-all shadow-xl tracking-[0.2em]">Commit to Ledger</button>
        </form>
      )}

      {/* TRADE HISTORY LIST */}
      <div className="space-y-4">
        {trades.length > 0 ? trades.map(trade => (
          <div key={trade.id} className={`group relative p-5 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between transition-all hover:scale-[1.01] ${darkMode ? 'bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700' : 'bg-white border-zinc-100 shadow-sm'}`}>
            <div className="flex items-center gap-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs ${trade.type === 'BUY' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {trade.type === 'BUY' ? 'L' : 'S'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">{trade.pair}</h4>
                  <span className="text-[8px] opacity-30 font-mono">#{trade.id.slice(0,5)}</span>
                </div>
                <div className="flex gap-4 mt-1">
                  <p className="text-[10px] font-mono opacity-50">Entry: <span className={darkMode ? 'text-zinc-200' : 'text-zinc-900'}>{trade.entry_price}</span></p>
                  {trade.notes && <p className="text-[10px] italic opacity-40">" {trade.notes} "</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-8 mt-4 md:mt-0">
              <div className="text-right">
                <p className={`text-sm font-black font-mono ${trade.pips_profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trade.pips_profit > 0 ? `+${trade.pips_profit}` : trade.pips_profit}
                </p>
                <span className={`text-[9px] font-black uppercase tracking-tighter ${
                  trade.status === 'WIN' ? 'text-green-500' : trade.status === 'LOSS' ? 'text-red-500' : 'text-zinc-500'
                }`}>
                  {trade.status}
                </span>
              </div>

              {isOwnProfile && (
                <button onClick={() => handleDeleteTrade(trade.id)} className="p-2 rounded-full hover:bg-red-500/10 text-zinc-600 hover:text-red-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="text-center py-20 opacity-20 uppercase font-black tracking-[0.5em] text-[10px]">Empty Ledger</div>
        )}
      </div>
    </div>
  );
}