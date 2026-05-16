"use client";
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient'; // 🔥 Nujen uvoz za komunikacijo z bazo

export default function ReferralSettings({ userData, darkMode }: any) {
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔥 VARNOSTNI POPRAVEK: Dodan userData?. da preprečimo "Application Error" sesutje
  const referralLink = typeof window !== 'undefined' && userData
    ? `${window.location.origin}/?ref=${userData?.referral_code || userData?.alias || ''}` 
    : '';

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  // 🔥 TUKAJ POTEGNEMA PODATKE IZ BAZE (Z dodano varovalko proti zankam)
  useEffect(() => {
    let isMounted = true; // Varovalka za preprečevanje memory leak-ov

    const fetchReferrals = async () => {
      if (!userData?.id) {
        if (isMounted) setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('alias, created_at')
          .eq('referred_by_id', userData.id)
          .order('created_at', { ascending: false });

        if (!error && data && isMounted) {
          setReferredUsers(data);
        }
      } catch (err) {
        console.error("Error fetching referrals", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReferrals();

    return () => {
      isMounted = false; // Ko se komponenta zapre, ustavi procese
    };
  }, [userData?.id]);

  return (
    <div className={`p-6 rounded-[2rem] border transition-all duration-500 ${
      darkMode ? 'bg-zinc-900/60 border-yellow-500/20 shadow-2xl' : 'bg-white border-zinc-200 shadow-lg'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">💎</span>
        <div>
          <h3 className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`}>
            Referral Network
          </h3>
          <p className="text-[9px] opacity-50 uppercase font-bold">Earn 10% from your network's purchases</p>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border mb-6 ${darkMode ? 'bg-black/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <label className="text-[8px] font-black uppercase text-zinc-500 mb-2 block ml-1">Your Personal Node Link</label>
        <div className="flex items-center gap-2">
          <div className={`flex-1 p-3 rounded-xl border font-mono text-[10px] truncate ${
            darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-600'
          }`}>
            {referralLink}
          </div>
          <button 
            onClick={copyLink}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all active:scale-95 shadow-lg"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center mb-8">
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <span className="text-[8px] font-black uppercase text-zinc-500 block mb-1">Referral Code</span>
          {/* 🔥 VARNOSTNI POPRAVEK */}
          <span className="text-sm font-black tracking-tighter text-blue-500">{userData?.referral_code || userData?.alias || '...'}</span>
        </div>
        <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-white border-zinc-100 shadow-sm'}`}>
          <span className="text-[8px] font-black uppercase text-zinc-500 block mb-1">Total Recruits</span>
          <span className="text-sm font-black tracking-tighter text-green-500">{referredUsers.length} Nodes</span>
        </div>
      </div>

      {/* 🔥 SEZNAM REKRUTOV 🔥 */}
      <div className="space-y-4 border-t border-zinc-800/50 pt-6">
        <h4 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Your Network History
        </h4>
        
        {isLoading ? (
          <div className="text-center py-6 text-[10px] uppercase font-bold text-zinc-500 animate-pulse">
            Scanning Network...
          </div>
        ) : referredUsers.length === 0 ? (
          <div className={`text-center py-8 rounded-2xl border border-dashed ${darkMode ? 'border-zinc-800 bg-black/20 text-zinc-600' : 'border-zinc-300 bg-zinc-50 text-zinc-400'}`}>
            <span className="text-2xl block mb-2 opacity-50">🕸️</span>
            <p className="text-[10px] uppercase font-black tracking-widest">Your network is empty</p>
            <p className="text-[8px] uppercase mt-1">Share your link to start earning</p>
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {referredUsers.map((refUser, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                    {refUser.alias ? refUser.alias.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>
                      @{refUser.alias}
                    </span>
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">
                      Joined: {new Date(refUser.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[9px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
