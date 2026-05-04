"use client";
import React, { useState, useEffect } from 'react';
import PriceTicker from './PriceTicker';
import { toast } from 'sonner';

export default function AuthView({ 
  isRegistering, 
  setIsRegistering, 
  userData, 
  setUserData, 
  handleRegister, 
  handleLogin,
  handleResetPassword,
  prices,
  loginAlias,
  setLoginAlias,
  loginPassword,
  setLoginPassword,
  loginError,
  darkMode 
}: any) { 
  
  const [humanVerified, setHumanVerified] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isIA = /FBAN|FBAV|Instagram|Telegram|Line|Viber|Snapchat/i.test(ua);
      if (isIA) {
        setIsInAppBrowser(true);
      }

      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get('ref');

      if (refFromUrl) {
        localStorage.setItem('gw_referrer', refFromUrl);
        console.log("Referral link secured:", refFromUrl);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, []);

  const isPasswordStrong = (pass: string) => {
    return pass && pass.length >= 6;
  };

  const isFormValid = 
    (userData.alias?.trim()?.length || 0) > 0 && 
    (userData.password?.length || 0) > 0 && 
    (userData.confirmPassword?.length || 0) > 0 &&
    userData.agreedToTerms === true &&
    humanVerified === true; 

  const handleRegisterClick = () => {
    if (!isFormValid) return;
    
    if (userData.password !== userData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    if (!isPasswordStrong(userData.password)) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    handleRegister("human_verified"); 
  };

  // 🔥 THE HARDCORE BYPASS PROTOCOL (Kliče najin lasten API) 🔥
  const onResetPasswordClick = async () => {
    if (!loginAlias || !loginAlias.includes('@')) {
      alert("Please enter your registered EMAIL in the field above to recover your key.");
      return;
    }

    console.log("🚀 STARTING CUSTOM RECOVERY FOR:", loginAlias);
    toast.loading("Forging secure link & bypassing filters...");

    try {
      const response = await fetch('/api/send-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginAlias.trim() })
      });

      const data = await response.json();
      toast.dismiss();

      if (!response.ok) {
        console.error("❌ SERVER ERROR:", data.error);
        alert("SERVER ERROR: " + data.error);
      } else {
        console.log("✅ SUCCESS: Email sent via Custom Hostinger SMTP Engine!");
        alert("SUCCESS! Check your email for the magic link.");
      }
    } catch (err: any) {
      toast.dismiss();
      console.error("🔥 CRITICAL FAILURE:", err);
      alert("SYSTEM CRASH: " + err.message);
    }
  };

  const countries = [
    { name: 'Slovenia', flag: '🇸🇮' },
    { name: 'USA', flag: '🇺🇸' },
    { name: 'UK', flag: '🇬🇧' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Austria', flag: '🇦🇹' },
    { name: 'Croatia', flag: '🇭🇷' },
    { name: 'Italy', flag: '🇮🇹' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'Switzerland', flag: '🇨🇭' },
    { name: 'UAE', flag: '🇦🇪' }
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setUserData((prev: any) => ({ ...prev, avatar: result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
      
      <div className="w-full max-w-4xl mb-8">
         <PriceTicker prices={prices} darkMode={darkMode} />
      </div>
      
      <div className={`w-full max-w-xl p-8 md:p-10 rounded-[3rem] border transition-all duration-500 relative overflow-hidden ${
        darkMode 
          ? 'border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl shadow-black/50' 
          : 'border-zinc-200 bg-white/80 backdrop-blur-xl shadow-xl shadow-zinc-200/50'
      }`}>
        
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 -z-10 ${darkMode ? 'bg-blue-600' : 'bg-blue-400'}`} />
        <div className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-20 -z-10 ${darkMode ? 'bg-purple-600' : 'bg-purple-400'}`} />

        {isInAppBrowser && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-2xl mb-6 text-center animate-in slide-in-from-top">
            <p className="text-yellow-500 font-black text-[11px] uppercase tracking-widest mb-2">⚠️ Unsupported Browser Detected</p>
            <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              For the best experience and security, please open this link in <strong className="text-blue-500">Chrome</strong> or <strong className="text-blue-500">Safari</strong>.
            </p>
          </div>
        )}

        {isRegistering ? (
          <div className="space-y-5 text-left animate-in slide-in-from-right-4 duration-300">
            <h2 className={`text-center text-[10px] uppercase tracking-[0.4em] mb-6 font-black ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Initialize New Node
            </h2>
            
            <div className="group">
              <label className={`text-[8px] uppercase font-bold ml-4 mb-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Trader Alias (Public)</label>
              <input 
                type="text" 
                placeholder="E.g. Satoshi_N" 
                value={userData.alias} 
                onChange={(e) => setUserData({...userData, alias: e.target.value})} 
                className={`w-full border rounded-2xl px-5 py-3 text-sm outline-none transition-all font-mono ${
                  darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-blue-500 focus:bg-black' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
                }`} 
              />
            </div>

            <div className="group">
              <label className={`text-[8px] uppercase font-bold ml-4 mb-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Recovery Email (Optional)</label>
              <input 
                type="email" 
                placeholder="Secure Email for Account Recovery" 
                value={userData.email || ''} 
                onChange={(e) => setUserData({...userData, email: e.target.value})} 
                className={`w-full border rounded-2xl px-5 py-3 text-sm outline-none transition-all font-mono ${
                  darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-blue-500 focus:bg-black' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
                }`} 
              />
            </div>

            <div className={`flex flex-col justify-center border border-dashed rounded-2xl p-4 transition-colors hover:border-blue-500/50 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <label className={`text-[8px] uppercase font-bold mb-2 block text-center ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Profile Identity (Optional)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="text-[9px] text-zinc-500 mx-auto cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[9px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="group">
                <label className={`text-[8px] uppercase font-bold ml-3 mb-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Style</label>
                <select 
                  value={userData.style} 
                  onChange={(e) => setUserData({...userData, style: e.target.value})} 
                  className={`w-full p-3 border rounded-xl text-xs outline-none appearance-none transition-all cursor-pointer ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <option>Day Trader</option>
                  <option>Scalper</option>
                  <option>Investor</option>
                  <option>Swing Trader</option>
                </select>
              </div>
              
              <div className="group">
                <label className={`text-[8px] uppercase font-bold ml-3 mb-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Market</label>
                <select 
                  value={userData.market} 
                  onChange={(e) => setUserData({...userData, market: e.target.value})} 
                  className={`w-full p-3 border rounded-xl text-xs outline-none appearance-none transition-all cursor-pointer ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  <option>Crypto</option>
                  <option>Forex</option>
                  <option>Stocks</option>
                  <option>Gold (XAU)</option>
                </select>
              </div>

              <div className="group">
                <label className={`text-[8px] uppercase font-bold ml-3 mb-1 block ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Region</label>
                <select 
                  value={userData.country} 
                  onChange={(e) => setUserData({...userData, country: e.target.value})} 
                  className={`w-full p-3 border rounded-xl text-xs outline-none appearance-none transition-all cursor-pointer ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                  }`}
                >
                  {countries.map(c => (
                    <option key={c.flag} value={c.flag}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1">
                <input 
                  type="password" 
                  placeholder="Access Key" 
                  value={userData.password} 
                  onChange={(e) => setUserData({...userData, password: e.target.value})} 
                  className={`w-full border rounded-2xl px-5 py-3 text-sm outline-none transition-all font-mono ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
                  }`} 
                />
              </div>
              <input 
                type="password" 
                placeholder="Confirm Key" 
                value={userData.confirmPassword} 
                onChange={(e) => setUserData({...userData, confirmPassword: e.target.value})} 
                className={`w-full border rounded-2xl px-5 py-3 text-sm outline-none transition-all font-mono ${
                  userData.confirmPassword && userData.password !== userData.confirmPassword 
                    ? 'border-red-500 bg-red-500/10' 
                    : (darkMode ? 'border-zinc-800 bg-black/50 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-900')
                }`} 
              />
            </div>
            
            <p className="text-[9px] text-center opacity-40 font-mono">
               Key strength: {userData.password?.length >= 6 ? 'OK' : 'WEAK (<6)'}
            </p>

            <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
              darkMode ? 'bg-black/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex items-center h-5">
                <input 
                  id="terms" 
                  type="checkbox" 
                  checked={userData.agreedToTerms}
                  onChange={(e) => setUserData({...userData, agreedToTerms: e.target.checked})}
                  className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900 bg-zinc-800 cursor-pointer" 
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="terms" className={`text-[9px] font-bold uppercase tracking-wider cursor-pointer ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  I acknowledge the high risk of trading
                </label>
                <p className={`text-[8px] leading-tight mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  I confirm that GAIN WAVE is for educational purposes only. I trade at my own risk and accept full responsibility for any financial losses.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center my-4">
              <div 
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  humanVerified ? 'bg-green-500/10 border-green-500/50' : (darkMode ? 'bg-black/30 border-zinc-800 hover:border-blue-500/50' : 'bg-zinc-50 border-zinc-200 hover:border-blue-500/50')
                }`} 
                onClick={() => setHumanVerified(true)}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  humanVerified ? 'bg-green-500 border-green-500' : (darkMode ? 'border-zinc-700' : 'border-zinc-300')
                }`}>
                  {humanVerified && <span className="text-white text-[12px] font-bold">✓</span>}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  humanVerified ? 'text-green-500' : (darkMode ? 'text-zinc-400' : 'text-zinc-600')
                }`}>
                  {humanVerified ? 'Identity Verified' : 'Tap to confirm you are human'}
                </span>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                 <p className="text-red-500 text-[9px] uppercase font-bold text-center tracking-widest">{loginError}</p>
              </div>
            )}

            <button 
              onClick={handleRegisterClick}
              disabled={!isFormValid}
              className={`w-full font-black py-4 rounded-2xl uppercase transition-all duration-300 shadow-lg mt-4 ${
                isFormValid 
                  ? 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-500 hover:scale-[1.02] active:scale-95' 
                  : (darkMode ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed')
              }`}
            >
              Initialize Node
            </button>
            
            <button 
              onClick={() => setIsRegistering(false)}
              className={`w-full text-center text-[9px] uppercase font-black tracking-widest transition-colors py-2 ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
            >
              &larr; Return to Login
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
            <h2 className={`text-center text-[10px] uppercase tracking-[0.4em] font-black mb-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Terminal Access
            </h2>
            
            <div className="space-y-4">
              <div className="group">
                 <label className={`text-[8px] uppercase font-bold ml-4 mb-1 block transition-colors ${darkMode ? 'text-zinc-600 group-focus-within:text-blue-500' : 'text-zinc-400 group-focus-within:text-blue-600'}`}>Alias or Email</label>
                 <input 
                  type="text" 
                  value={loginAlias} 
                  placeholder="Enter Alias or Registered Email"
                  onChange={(e) => setLoginAlias(e.target.value)} 
                  className={`w-full border rounded-2xl px-6 py-4 text-sm outline-none transition-all font-mono tracking-wide ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
                  }`} 
                />
              </div>
              
              <div className="group relative">
                 <label className={`text-[8px] uppercase font-bold ml-4 mb-1 block transition-colors ${darkMode ? 'text-zinc-600 group-focus-within:text-blue-500' : 'text-zinc-400 group-focus-within:text-blue-600'}`}>Security Key</label>
                 <input 
                  type="password" 
                  placeholder="Enter your password"
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                  className={`w-full border rounded-2xl px-6 py-4 text-sm outline-none transition-all font-mono tracking-wide ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
                  }`} 
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl animate-in shake">
                 <p className="text-red-500 text-[9px] uppercase font-bold text-center tracking-widest">{loginError}</p>
              </div>
            )}
            
            <button 
              onClick={() => handleLogin()} 
              className="w-full bg-blue-600 font-black py-5 rounded-2xl uppercase text-white tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-500/40 mt-4"
            >
              Connect to Mainframe
            </button>

            <div className="flex justify-center mt-2">
              <button 
                onClick={onResetPasswordClick}
                className={`text-[9px] font-black uppercase tracking-widest transition-colors hover:scale-105 active:scale-95 ${darkMode ? 'text-yellow-500/80 hover:text-yellow-400' : 'text-yellow-600 hover:text-yellow-500'}`}
              >
                Forgot Security Key? (Recovery via Email)
              </button>
            </div>
            
            <div className="pt-6 border-t border-dashed border-zinc-800/50 mt-4">
                <button 
                  onClick={() => setIsRegistering(true)}
                  className={`w-full text-center text-[9px] uppercase font-black tracking-widest transition-colors ${darkMode ? 'text-zinc-500 hover:text-blue-400' : 'text-zinc-400 hover:text-blue-600'}`}
                >
                  Create New Protocol Identity
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
