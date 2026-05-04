"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function AdminDashboard({ darkMode }: { darkMode: boolean }) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // 🔥 DODANO ZA UPORABNIKE
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // 🔥 DODANO ZA ISKANJE

  const fetchAdminData = async () => {
    setIsLoading(true);
    
    // 1. Vzamemo vse zahtevke
    const { data: payData, error: payErr } = await supabase
      .from('withdrawals')
      .select('*, profiles(alias)')
      .order('created_at', { ascending: false });

    // 2. Vzamemo vse uporabnike (Global Node Directory)
    const { data: usersData, error: usersErr } = await supabase
      .from('profiles')
      .select('id, alias, is_premium, created_at')
      .order('created_at', { ascending: false });

    if (!payErr && payData) setWithdrawals(payData);
    if (!usersErr && usersData) setUsers(usersData);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // 🔥 FUNKCIJA ZA POTRDITEV IZPLAČILA 🔥
  const handleMarkAsPaid = async (id: string, alias: string) => {
    if (!confirm(`Označi izplačilo za @${alias} kot PLAČANO?`)) return;

    const { error } = await supabase
      .from('withdrawals')
      .update({ status: 'completed' })
      .eq('id', id);

    if (!error) {
      toast.success("Zahtevek označen kot uspešen!");
      
      await supabase.from('messages').insert([{
        from_alias: 'SYSTEM',
        to_alias: alias,
        text: `✅ PAYOUT SUCCESSFUL: Vaš zahtevek za izplačilo je bil uspešno obdelan in nakazan!`,
        is_read: false
      }]);

      fetchAdminData();
    } else {
      toast.error("Napaka pri posodabljanju.");
    }
  };

  // 🔥 FUNKCIJA ZA ZAVRNITEV IZPLAČILA 🔥
  const handleReject = async (id: string, userId: string, amount: number, alias: string) => {
    if (!confirm(`ZAVRNI zahtevek in vrni ${amount} GAINS uporabniku @${alias}?`)) return;

    const { error: updateErr } = await supabase
      .from('withdrawals')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (updateErr) {
      toast.error("Napaka pri zavrnitvi.");
      return;
    }

    const { data: wallet } = await supabase.from('user_balances').select('earned_balance').eq('user_id', userId).single();
    if (wallet) {
      await supabase
        .from('user_balances')
        .update({ earned_balance: wallet.earned_balance + amount })
        .eq('user_id', userId);
    }

    await supabase.from('messages').insert([{
        from_alias: 'SYSTEM',
        to_alias: alias,
        text: `❌ PAYOUT REJECTED: Vaš zahtevek za ${amount} GAINS je bil zavrnjen. Sredstva so vrnjena na vaš profil.`,
        is_read: false
    }]);

    toast.success("Zavrnjeno in denar vrnjen!");
    fetchAdminData();
  };

  // 🔥 FUNKCIJA ZA ROČNO NADGRADNJO (Bojan & VIP) 🔥
  const toggleProStatus = async (userId: string, currentStatus: boolean, alias: string) => {
    const newStatus = !currentStatus;
    const actionText = newStatus ? 'GRANT' : 'REVOKE';
    
    if (!confirm(`Are you sure you want to ${actionText} PRO status for @${alias}?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: newStatus })
      .eq('id', userId);
    
    if (!error) {
      toast.success(`Node Status Updated for @${alias}!`);
      
      // Obvesti uporabnika o spremembi statusa
      if (newStatus) {
        await supabase.from('messages').insert([{
          from_alias: 'SYSTEM',
          to_alias: alias,
          text: `👑 PRO NODE ACTIVATED: Admin has granted you full access to the terminal. Welcome to the elite.`,
          is_read: false
        }]);
      }

      setUsers(users.map(u => u.id === userId ? { ...u, is_premium: newStatus } : u));
    } else {
      toast.error("Napaka pri posodabljanju statusa.");
    }
  };

  return (
    <div className={`p-6 md:p-10 rounded-[3rem] border shadow-2xl animate-in fade-in duration-500 w-full max-w-7xl mx-auto pt-24 space-y-12 ${
      darkMode ? 'bg-zinc-950/90 border-zinc-800' : 'bg-white border-zinc-200'
    }`}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b pb-6 border-zinc-500/20 gap-4">
        <div>
          <h2 className={`text-3xl font-black uppercase tracking-tighter text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]`}>
            CEO Command Center
          </h2>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Terminal Oversight & Payout Protocol
          </p>
        </div>
        <button onClick={fetchAdminData} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2">
          <span>🔄</span> Refresh Matrix
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 opacity-50">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* LEVI STOLPEC: PENDING PAYOUTS */}
          <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-black/50 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.05)_inset]' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">💰</span>
              <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500">Vault Withdrawals</h3>
            </div>
            
            {withdrawals.length === 0 ? (
              <div className="text-center py-10 opacity-30 border border-dashed rounded-2xl border-yellow-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest">No pending requests.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {withdrawals.map((req) => (
                  <div key={req.id} className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>
                          @{req.profiles?.alias || 'Unknown'}
                        </span>
                        <span className="text-[9px] font-mono opacity-50 mt-1">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-black font-mono tracking-tighter ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          {req.amount} $
                        </span>
                        <span className={`block text-[8px] font-black uppercase tracking-widest mt-0.5 px-2 py-0.5 rounded-md ${
                          req.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          req.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500 animate-pulse'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`p-3 rounded-xl mb-4 text-[9px] font-mono break-all ${darkMode ? 'bg-black border border-white/5' : 'bg-zinc-100 border border-zinc-200'}`}>
                      <span className="text-blue-500 font-bold uppercase tracking-widest mr-2">[{req.method}]</span> 
                      <span className="opacity-70">{req.address}</span>
                    </div>

                    {req.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button 
                          onClick={() => handleMarkAsPaid(req.id, req.profiles?.alias)}
                          className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                        >
                          Mark Paid
                        </button>
                        <button 
                          onClick={() => handleReject(req.id, req.user_id, req.amount, req.profiles?.alias)}
                          className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                            darkMode ? 'bg-transparent border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white border-red-200 text-red-500 hover:bg-red-50'
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DESNI STOLPEC: GLOBAL NODE DIRECTORY (USER MANAGEMENT) */}
          <div className={`p-8 rounded-[2.5rem] border ${darkMode ? 'bg-black/50 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.05)_inset]' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">👥</span>
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-500">Global Directory</h3>
              </div>
              <input 
                placeholder="Search Alias..." 
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full md:w-auto rounded-xl px-4 py-3 text-[10px] outline-none font-black uppercase tracking-widest border transition-all ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 focus:border-blue-500 text-white placeholder-zinc-600' : 'bg-white border-zinc-200 focus:border-blue-600 text-black placeholder-zinc-400'
                }`}
              />
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {users.filter(u => u.alias.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                <div key={u.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${u.is_premium ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-zinc-600'}`} />
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>
                        @{u.alias}
                      </span>
                      <span className="text-[7px] font-mono opacity-40 uppercase mt-0.5">
                        ID: {u.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleProStatus(u.id, u.is_premium, u.alias)}
                    className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border ${
                      u.is_premium 
                        ? (darkMode ? 'bg-zinc-800/50 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-zinc-50 border-red-200 text-red-500 hover:bg-red-500 hover:text-white')
                        : 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-md'
                    }`}
                  >
                    {u.is_premium ? 'Revoke PRO' : 'Grant PRO'}
                  </button>
                </div>
              ))}
              
              {users.filter(u => u.alias.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-widest">
                  No Node Found.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}