"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'info', text: 'Intercepting secure token...' });

  useEffect(() => {
    let mounted = true;

    const forceSession = async () => {
      // 1. Ujamemo celoten hash (#access_token=...)
      const hash = window.location.hash;
      
      if (hash && hash.includes('access_token')) {
        if (mounted) setStatus({ type: 'info', text: 'Token intercepted! Forcing session...' });
        
        // Zamenjamo # z ? da lahko URLSearchParams prebere vrednosti
        const hashParams = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // 🔥 BRUTALNA SILA: Ročno povemo Supabase-u, naj uporabi ta žeton
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            if (mounted) setStatus({ type: 'error', text: 'Force Session Failed: ' + error.message });
          } else {
            if (mounted) {
              setStatus({ type: 'success', text: 'Security override accepted! Enter new key.' });
              // Počistimo URL, da ne kaže dolge klobase
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
          return; // Končamo, ker sva uspela
        }
      }

      // 2. Če hasha ni, preverimo standardni ?code=...
      const searchParams = new URLSearchParams(window.location.search);
      const authError = searchParams.get('error_description') || searchParams.get('error');
      
      if (authError && mounted) {
        setStatus({ type: 'error', text: `Access Denied: ${authError.replace(/\+/g, ' ')}` });
        return;
      }

      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && mounted) setStatus({ type: 'error', text: error.message });
        else if (mounted) {
          setStatus({ type: 'success', text: 'Session active! Enter your new key.' });
          window.history.replaceState(null, '', window.location.pathname);
        }
        return;
      }

      // 3. Fallback: Če je bil žeton že procesiran in uporabnik samo osveži stran
      const { data } = await supabase.auth.getSession();
      if (data.session && mounted) {
        setStatus({ type: 'success', text: 'Session recovered. Enter your new key.' });
      } else if (mounted) {
        setStatus({ type: 'error', text: 'NO TOKEN DETECTED. Please use the exact link from your email.' });
      }
    };

    forceSession();

    return () => { mounted = false; };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Key must be at least 6 characters.");
    
    setLoading(true);
    // Ko prideva do sem, je seja 100% aktivna in to bo šlo skozi!
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) setStatus({ type: 'error', text: error.message });
    else {
      setStatus({ type: 'success', text: 'System Override Successful! Redirecting...' });
      setTimeout(() => { window.location.href = '/'; }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#050509] flex flex-col items-center justify-center p-6 font-mono text-white">
      <div className="w-full max-w-md bg-zinc-900/80 border border-blue-500/30 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
        <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-8 text-center">
          Terminal Recovery
        </h2>
        
        <div className={`mb-8 p-4 rounded-xl text-[9px] uppercase font-bold text-center border transition-all ${
          status.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' : 
          status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 
          'bg-blue-500/10 border-blue-500/50 text-blue-400 animate-pulse'
        }`}>
          {status.text}
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <input 
            type="password" 
            placeholder="NEW SECURITY KEY"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all text-center tracking-[0.2em]"
            required
            disabled={status.type === 'error' || status.type === 'info'}
          />
          <button 
            type="submit"
            disabled={loading || status.type === 'error' || status.type === 'info'}
            className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-blue-600/20"
          >
            {loading ? "Injected..." : "Confirm Key Update"}
          </button>
        </form>
      </div>
    </div>
  );
}
