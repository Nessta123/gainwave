"use client";
import React, { useState, useEffect } from 'react';
import PriceTicker from './PriceTicker';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import StoryViewer from './StoryViewer'; 

// 🔥 FUNKCIJA ZA KOMPRESIJO PROFILNIH SLIK (AVATARJEV) 🔥
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        const maxWidth = 400;
        const maxHeight = 400;
        const quality = 0.8;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { 
              type: 'image/jpeg', 
              lastModified: Date.now() 
            });
            resolve(newFile);
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function ProfileSidebar({ 
  userData, 
  setUserData, 
  isEditing, 
  setIsEditing, 
  handleSaveProfile, 
  handleLogout, 
  setActiveTab,
  activeTab,
  darkMode,
  messages = [], 
  setActiveChat,
  
  followersCount = 0,
  followingCount = 0,
  onFollowersClick,
  onFollowingClick,
  hasNotification,
  isOwnProfile,
  
  setViewingAlias,

  activeSubTab,
  setActiveSubTab,

  onOpenRiskCalc,
  handleSubscribeMonthly,
  handleStripePurchase 
}: any) {
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMsgOpen, setIsMsgOpen] = useState(false);
  const [hasPosts, setHasPosts] = useState(false); 
  
  const [userStories, setUserStories] = useState<any[] | null>(null);
  const [showStory, setShowStory] = useState(false);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isProcessingSub, setIsProcessingSub] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const navigateTo = (tab: string, subTab?: string) => {
    setActiveTab(tab);
    if (subTab) setActiveSubTab(subTab);
    setIsMenuOpen(false);
  };

  const safeUserData = userData || {};

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const checkUserPosts = async () => {
      if (!safeUserData.id) return;
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', safeUserData.id);
      
      if (!error && count && count > 0) {
        setHasPosts(true);
      } else {
        setHasPosts(false);
      }
    };
    checkUserPosts();
  }, [safeUserData.id]);

  useEffect(() => {
    const checkUserStories = async () => {
      if (!safeUserData.id) return;
      const { data } = await supabase
        .from('stories')
        .select('*, profiles(id, alias, avatar_url, is_live)') 
        .eq('user_id', safeUserData.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
        
      if (data && data.length > 0) {
        const mappedStories = data.map(s => ({
            ...s,
            profiles: {
                alias: safeUserData.alias,
                avatar: safeUserData.avatar || '👤',
                is_live: safeUserData.is_live
            }
        }));
        setUserStories(mappedStories);
      } else {
        setUserStories(null);
      }
    };
    checkUserStories();
  }, [safeUserData.id]);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (isOwnProfile || !currentUserId || !safeUserData.id) return;
      
      const { data } = await supabase
        .from('user_subscriptions')
        .select('expires_at')
        .eq('subscriber_id', currentUserId)
        .eq('trader_id', safeUserData.id)
        .gt('expires_at', new Date().toISOString()) 
        .maybeSingle();

      if (data) setIsSubscribed(true);
      else setIsSubscribed(false);
    };
    
    checkSubscriptionStatus();
  }, [currentUserId, safeUserData.id, isOwnProfile]);

  const handlePurchaseSubscription = async () => {
    if (!currentUserId || !safeUserData.id) return;
    
    const price = safeUserData.subscription_price || 0;
    if (price <= 0) {
      toast.error("This trader has not set a valid subscription price.");
      return;
    }

    setIsProcessingSub(true);

    try {
      const { data: buyerWallet, error: buyerErr } = await supabase
        .from('user_balances')
        .select('bulls_balance')
        .eq('user_id', currentUserId)
        .single();

      if (buyerErr || !buyerWallet) throw new Error("Could not fetch wallet balance.");

      if (buyerWallet.bulls_balance < price) {
        toast.error(`Insufficient GAINS. You need ${price} GAINS.`);
        setIsProcessingSub(false);
        return;
      }

      const confirmBuy = window.confirm(`Purchase 30-day access to ${safeUserData.alias} for ${price} GAINS?`);
      if (!confirmBuy) {
        setIsProcessingSub(false);
        return;
      }

      const { error: deductErr } = await supabase
        .from('user_balances')
        .update({ bulls_balance: buyerWallet.bulls_balance - price })
        .eq('user_id', currentUserId);
        
      if (deductErr) throw new Error("Transaction failed during deduction.");

      const { data: sellerWallet } = await supabase
        .from('user_balances')
        .select('earned_balance')
        .eq('user_id', safeUserData.id)
        .single();

      if (sellerWallet) {
        await supabase
          .from('user_balances')
          .update({ earned_balance: sellerWallet.earned_balance + price })
          .eq('user_id', safeUserData.id);
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: subErr } = await supabase
        .from('user_subscriptions')
        .insert([{
          subscriber_id: currentUserId,
          trader_id: safeUserData.id,
          expires_at: expiresAt
        }]);

      if (subErr) throw new Error("Failed to activate subscription.");

      await supabase.from('transactions').insert([{
        buyer_id: currentUserId,
        seller_id: safeUserData.id,
        amount: price,
        item_type: 'TRADER_SUB',
        item_name: `Subscription to ${safeUserData.alias}`
      }]);

      const { data: currentProfile } = await supabase.from('profiles').select('alias').eq('id', currentUserId).single();
      if (currentProfile) {
        await supabase.from('messages').insert([{
          from_alias: 'SYSTEM',
          to_alias: safeUserData.alias,
          text: `💰 PAYMENT RECEIVED: ${currentProfile.alias} just subscribed to your Premium Intel for ${price} GAINS!`,
          is_read: false
        }]);
      }

      setIsSubscribed(true);
      toast.success(`Successfully subscribed to ${safeUserData.alias} for 30 days! 🚀`);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Subscription process failed.");
    } finally {
      setIsProcessingSub(false);
    }
  };

  const isAuthenticated = hasPosts || (safeUserData.win_rate > 0) || (safeUserData.total_gain > 0) || (safeUserData.total_profit > 0) || safeUserData.verify_source === 'verified';
  
  const hasPaidPro = safeUserData.is_premium === true; 
  const hasPerformancePro = safeUserData.win_rate >= 90; 
  const isPro = hasPaidPro || hasPerformancePro; 
  const isDeveloper = safeUserData.is_developer === true; 
  
  const isInstitutional = safeUserData.is_institutional === true;

  const handleViewFollowers = async () => {
    onFollowersClick();
    if (isOwnProfile && safeUserData.unread_followers > 0) {
      setUserData({ ...safeUserData, unread_followers: 0 });
      await supabase
        .from('profiles')
        .update({ unread_followers: 0 })
        .eq('id', safeUserData.id);
    }
  };

  const handleGoLive = async () => {
    if (safeUserData.is_live) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_live: false, live_stream_url: null })
        .eq('id', safeUserData.id);
      
      if (!error) {
        setUserData({ ...safeUserData, is_live: false, live_stream_url: null });
        toast.success("Broadcast terminated.");
      } else {
        toast.error("Failed to stop stream.");
      }
    } else {
      const url = prompt("Enter your YouTube Live Embed URL (e.g. https://www.youtube.com/embed/live_id):");
      if (url && url.trim() !== "") {
        const { error } = await supabase
          .from('profiles')
          .update({ is_live: true, live_stream_url: url })
          .eq('id', safeUserData.id);
        
        if (!error) {
          setUserData({ ...safeUserData, is_live: true, live_stream_url: url });
          toast.success("You are now LIVE on the network!");
        } else {
          toast.error("Failed to start stream.");
        }
      }
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const originalFile = e.target.files[0];
      
      try {
        toast.info("Uploading avatar...");
        const compressedFile = await compressImage(originalFile);
        
        // Naložimo stisnjeno sliko preko najinega MinIO API-ja z DODANIM PATH-om!
        const formData = new FormData();
        formData.append('file', new File([compressedFile], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        formData.append('path', `avatars/avatar-${Date.now()}.jpg`); // <--- POPRAVLJENO TUKAJ!

        const uploadRes = await fetch('/api/upload-media', {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload to MinIO failed");

        const uploadData = await uploadRes.json();
        const finalImageUrl = uploadData.url;

        // URL, ki ga vrne MinIO, sedaj prikažemo in kasneje shranimo (ob kliku na 'Save')
        setUserData((prev: any) => ({ 
          ...prev, 
          avatar: finalImageUrl 
        }));
        
        toast.success("Avatar uploaded! Remember to Save Changes.");
      } catch (err) {
        console.error("Avatar Upload Error:", err);
        toast.error("Image processing or upload failed.");
      }
    }
  };

  const activeContacts = messages && messages.length > 0 
    ? Array.from(new Set(messages.map((m: any) => 
        m.from_alias === safeUserData.alias ? m.to_alias : m.from_alias
      ))) 
    : [];

  const getUnreadCount = (contact: string) => {
    if (!messages) return 0;
    return messages.filter((m: any) => 
      m.from_alias === contact && 
      m.to_alias === safeUserData.alias && 
      m.is_read === false
    ).length;
  };

  const totalUnread = messages.filter((m: any) => m.to_alias === safeUserData.alias && !m.is_read).length;

  return (
    <div className="md:col-span-1 space-y-4 h-fit sticky top-6 transition-all duration-500">
      
      {showStory && userStories && (
        <StoryViewer 
          stories={userStories} 
          currentUser={userData} 
          onClose={() => setShowStory(false)} 
          onStoryDeleted={(id: string) => {
            const newStories = userStories.filter(s => s.id !== id);
            if (newStories.length === 0) {
              setUserStories(null);
              setShowStory(false);
            } else {
              setUserStories(newStories);
            }
          }}
        />
      )}

      <div className={`relative p-4 sm:p-6 md:p-8 rounded-[2.5rem] border backdrop-blur-2xl transition-all duration-500 ${
        isDeveloper 
          ? (darkMode 
              ? 'border-[#FF00FF]/50 bg-gradient-to-b from-[#89CFF0]/10 to-zinc-950/80 shadow-[0_0_30px_rgba(255,0,255,0.2)]' 
              : 'border-2 border-[#FF00FF]/40 bg-gradient-to-b from-white to-pink-50/50 shadow-[0_0_30px_rgba(137,207,240,0.4)]')
          : isPro 
            ? (darkMode ? 'border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-zinc-950/80 shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-white/90 shadow-[0_0_30px_rgba(234,179,8,0.2)]')
            : (darkMode ? 'border-zinc-800/80 bg-zinc-950/80 shadow-2xl' : 'border-white/50 bg-white/80 shadow-xl shadow-zinc-200/50')
      }`}>

        <div className="flex justify-end items-center gap-2 mb-4">
          {!isEditing && isOwnProfile && (
            <>
              <div className="relative">
                <button 
                  onClick={() => setIsMsgOpen(!isMsgOpen)}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 ${
                    darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <span className="text-xl">✉️</span>
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-black animate-pulse">
                      {totalUnread}
                    </span>
                  )}
                </button>

                {isMsgOpen && (
                  <div className={`absolute top-full right-0 mt-2 w-[85vw] max-w-[260px] sm:w-64 rounded-3xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-[200] ${
                    darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-100'
                  }`}>
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Node Inbox</span>
                      <button onClick={() => setIsMsgOpen(false)} className="text-[10px] opacity-40">Close</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                      {activeContacts.length > 0 ? activeContacts.map((contact: any) => {
                        const count = getUnreadCount(contact);
                        return (
                          <button 
                            key={contact}
                            onClick={() => { setActiveChat(contact); setIsMsgOpen(false); }}
                            className={`w-full p-3 rounded-2xl text-[10px] font-bold uppercase text-left transition-all mb-1 flex items-center justify-between ${
                              darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-50 text-zinc-600'
                            }`}
                          >
                            <span className="truncate pr-2">👤 {contact}</span>
                            {count > 0 && <span className="bg-green-500 text-black text-[8px] px-1.5 py-0.5 rounded-md font-black shrink-0">{count}</span>}
                          </button>
                        );
                      }) : (
                        <p className="text-[8px] opacity-40 text-center py-6 italic uppercase">No transmissions</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsEditing(true)}
                className={`p-2.5 rounded-xl transition-all active:scale-90 ${
                  darkMode ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                }`}
                title="Edit Profile Settings"
              >
                <span className="text-xl opacity-80">⚙️</span>
              </button>

              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`hidden md:block p-2.5 rounded-xl transition-all active:scale-90 ${
                  isPro ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 'bg-blue-600/10 text-blue-500 hover:bg-blue-600/20'
                }`}
              >
                <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
              </button>
            </>
          )}
        </div>
        
        <div className="relative group w-fit">
          <div className={`rounded-2xl mb-6 transition-all relative ${
            safeUserData.is_live 
                ? 'p-1.5 border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse cursor-pointer' 
                : userStories 
                    ? 'p-1.5 border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)] cursor-pointer hover:scale-105'
                    : isDeveloper 
                        ? 'p-1 bg-gradient-to-tr from-[#89CFF0] via-[#FF00FF] to-[#9400D3] shadow-[0_0_20px_rgba(255,0,255,0.4)]'
                        : isPro ? 'p-1 bg-gradient-to-tr from-yellow-600 via-yellow-300 to-yellow-700 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : ''
          }`}
          onClick={() => {
              if (userStories) setShowStory(true);
          }}
          >
            {safeUserData.avatar ? (
              <img 
                src={safeUserData.avatar} 
                className={`w-24 h-24 rounded-[0.9rem] object-cover border-2 shadow-lg transition-all ${
                  isPro || isDeveloper 
                    ? 'border-black' 
                    : (darkMode ? 'border-blue-500 shadow-blue-500/20' : 'border-blue-600 shadow-blue-600/10')
                }`} 
                alt="Avatar" 
              />
            ) : (
              <div className={`w-20 h-20 rounded-[0.9rem] flex items-center justify-center text-3xl shadow-lg transition-all ${
                isPro || isDeveloper 
                  ? 'bg-black border-2 border-black' 
                  : (darkMode ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-100 text-zinc-400')
              }`}>👤</div>
            )}
            
            {safeUserData.is_live && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-3 py-0.5 rounded-md border-2 border-black uppercase tracking-widest z-10 animate-pulse">
                LIVE
              </div>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-4 animate-in fade-in duration-300 text-left">
            <div>
              <label className={`block text-[8px] uppercase font-black mb-2 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Profile Photo
              </label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-[10px] text-zinc-500 w-full" />
            </div>

            <div className={`mt-4 mb-4 p-4 rounded-xl border-2 ${darkMode ? 'bg-black/60 border-zinc-700' : 'bg-zinc-100 border-zinc-300'} flex items-center justify-between`}>
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-widest text-[#FF00FF]">Developer Mode</span>
                  <span className="text-[9px] text-zinc-500 font-bold mt-1">Unlock Forge Tools & Terminal</span>
                </div>
                
                <div 
                  onClick={() => {
                    const newStatus = !safeUserData.is_developer;
                    setUserData({...safeUserData, is_developer: newStatus});
                    toast.success(`Developer Mode ${newStatus ? 'ON 🚀' : 'OFF'}`);
                  }}
                  className={`w-14 h-7 rounded-full flex items-center p-1 cursor-pointer transition-all duration-300 shadow-inner ${safeUserData.is_developer ? 'bg-gradient-to-r from-[#89CFF0] to-[#FF00FF]' : 'bg-zinc-800 border border-zinc-600'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${safeUserData.is_developer ? 'translate-x-7' : 'translate-x-0'}`} />
                </div>
            </div>
            
            <input 
              type="text" 
              placeholder="Alias"
              value={safeUserData.alias || ""} 
              onChange={(e) => setUserData({...safeUserData, alias: e.target.value})} 
              className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
                darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
              }`} 
            />

            <div className="grid grid-cols-2 gap-2">
              <select 
                value={safeUserData.market || "Crypto"} 
                onChange={(e) => setUserData({...safeUserData, market: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
                  darkMode ? 'bg-black border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <option>Crypto</option>
                <option>Forex</option>
                <option>Gold (XAU)</option>
                <option>Indices</option>
              </select>

              <select 
                value={safeUserData.country || "🏳️"} 
                onChange={(e) => setUserData({...safeUserData, country: e.target.value})}
                className={`w-full border rounded-lg px-3 py-2 text-xs outline-none transition-colors ${
                  darkMode ? 'bg-black border-zinc-800 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }`}
              >
                <option value="🏳️">🏳️ Unknown / Hidden</option>
                {countries.map(c => (
                  <option key={c.flag} value={c.flag}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>

            <textarea 
              placeholder="Short bio..."
              value={safeUserData.bio || ""} 
              onChange={(e) => setUserData({...safeUserData, bio: e.target.value})} 
              className={`w-full border rounded-lg px-3 py-2 text-xs outline-none h-20 resize-none transition-colors ${
                darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-600'
              }`}
            />

            <div className="animate-in slide-in-from-top-2 duration-300 pt-1">
              <label className={`block text-[8px] uppercase font-black mb-1 ml-1 ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`}>Monthly Subscription Price (GAINS)</label>
              <input 
                type="number" 
                min="0"
                placeholder="0"
                value={safeUserData.subscription_price === 0 || safeUserData.subscription_price === undefined ? "" : safeUserData.subscription_price} 
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  if (val >= 0) setUserData({...safeUserData, subscription_price: val});
                }}
                onFocus={(e) => e.target.select()}
                className={`w-full border rounded-lg px-3 py-2 text-[10px] font-mono outline-none transition-colors ${
                  darkMode ? 'bg-yellow-500/5 border-yellow-500/30 text-yellow-400 focus:border-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-800 focus:border-yellow-600'
                }`} 
              />
            </div>

            <div className="mt-6 p-5 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 text-left">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                🛡️ Universal Exchange API
              </h3>
              
              <p className="text-[8px] text-zinc-500 leading-tight mb-4 uppercase font-bold italic">
                "We will NEVER ask for withdrawal permissions. You MUST disable withdrawals in exchange settings before connecting."
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1 ml-1">Select Exchange</label>
                  <select 
                    value={safeUserData.exchange_name || "none"}
                    onChange={(e) => setUserData({...safeUserData, exchange_name: e.target.value})}
                    className={`w-full border rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200 text-black'}`}
                  >
                    <option value="none">Not Connected</option>
                    <option value="binance">Binance</option>
                    <option value="bybit">Bybit</option>
                    <option value="okx">OKX</option>
                    <option value="kucoin">KuCoin</option>
                    <option value="kraken">Kraken</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1 ml-1">API Key</label>
                  <input 
                    type="password" 
                    placeholder="Enter API Key..."
                    value={safeUserData.api_key || safeUserData.binance_key || ""}
                    onChange={(e) => setUserData({...safeUserData, api_key: e.target.value})}
                    className={`w-full border rounded-xl px-3 py-2 text-[10px] font-mono outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1 ml-1">API Secret</label>
                  <input 
                    type="password" 
                    placeholder="Enter API Secret..."
                    value={safeUserData.api_secret || ""}
                    onChange={(e) => setUserData({...safeUserData, api_secret: e.target.value})}
                    className={`w-full border rounded-xl px-3 py-2 text-[10px] font-mono outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                  />
                </div>

                {(safeUserData.exchange_name === 'okx' || safeUserData.exchange_name === 'kucoin') && (
                  <div className="animate-in fade-in zoom-in-95">
                    <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1 ml-1">API Passphrase</label>
                    <input 
                      type="password" 
                      placeholder="Required for this exchange..."
                      value={safeUserData.api_passphrase || ""}
                      onChange={(e) => setUserData({...safeUserData, api_passphrase: e.target.value})}
                      className={`w-full border rounded-xl px-3 py-2 text-[10px] font-mono outline-none ${darkMode ? 'bg-black border-indigo-500/30 text-white focus:border-indigo-500' : 'bg-indigo-50 border-indigo-200 text-black focus:border-indigo-500'}`}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/50 mt-4">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1 ml-1">Trade Size ($)</label>
                    <input 
                      type="number" 
                      value={safeUserData.trade_size_usd || 10}
                      onChange={(e) => setUserData({...safeUserData, trade_size_usd: parseFloat(e.target.value)})}
                      className={`w-full border rounded-xl px-3 py-2 text-[10px] font-mono outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1 ml-1">Leverage (x)</label>
                    <input 
                      type="number" 
                      value={safeUserData.trade_leverage || 1}
                      onChange={(e) => setUserData({...safeUserData, trade_leverage: parseInt(e.target.value)})}
                      className={`w-full border rounded-xl px-3 py-2 text-[10px] font-mono outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-white border-zinc-200'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-[10px] font-bold py-3 rounded-xl uppercase hover:bg-blue-500 text-white transition-colors shadow-lg">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className={`flex-1 text-[10px] font-bold py-3 rounded-xl uppercase transition-colors border ${
                darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
              }`}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{safeUserData.country || '🏳️'}</span>
                  <h2 className={`text-xl font-black uppercase tracking-tight text-left transition-colors flex items-center ${
                    isDeveloper ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#89CFF0] to-[#FF00FF]' : 
                    isPro ? 'text-yellow-500' : (darkMode ? 'text-white' : 'text-zinc-900')
                  }`}>
                    {safeUserData.alias || "Trader"}
                    
                    {isInstitutional && (
                      <div className="group relative flex items-center inline-block ml-2 cursor-help">
                        <div className="relative">
                          <svg className="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 2l-6 2.5v5c0 4.5 3.5 8.5 6 10.5 2.5-2 6-6 6-10.5v-5L10 2z" />
                          </svg>
                          <svg className="absolute inset-0 w-3 h-3 text-black m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-zinc-950 border border-green-500/50 p-3 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.8)] w-56 z-[100] pointer-events-none">
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1 italic">
                            🔱 Institutional Grade Node
                          </p>
                          <p className="text-[9px] text-zinc-400 leading-tight uppercase font-bold">
                            Verified high-accuracy node with 80%+ win-rate and institutional risk management protocols.
                          </p>
                          <div className="flex gap-1 mt-2">
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-75" />
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-150" />
                          </div>
                        </div>
                      </div>
                    )}
                  </h2>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-1">
                  {isDeveloper && (
                    <div className="flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded-full border border-[#FF00FF]/50 bg-[#89CFF0]/10 text-[#FF00FF] w-fit">
                      🚀 ARCHITECT
                    </div>
                  )}
                  {isPro && !isDeveloper && (
                    <div className="flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded-full border border-yellow-500/50 bg-yellow-500/10 text-yellow-500 animate-pulse w-fit">
                      👑 PRO NODE
                    </div>
                  )}
                  {isAuthenticated && !isInstitutional && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest w-fit ${
                      darkMode ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-green-50 text-green-600 border border-green-200'
                    }`}>
                      <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                      GW AUTHENTICATED
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <span className={`border text-[8px] font-black uppercase px-2 py-0.5 rounded transition-all ${
                darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                {safeUserData.style || "Trader"}
              </span>
              <span className={`border text-[8px] font-black uppercase px-2 py-0.5 rounded transition-all ${
                darkMode ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-yellow-50 border-yellow-200 text-yellow-600'
              }`}>
                {safeUserData.market || "Market"}
              </span>
            </div>

            {!isOwnProfile && isPro && safeUserData.subscription_price > 0 && (
              <div className="mt-6 pt-4 border-t border-zinc-800/30">
                {isSubscribed ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-between text-green-500">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Active Subscriber
                    </span>
                    <span className="text-[8px] font-bold uppercase">Signals Unlocked</span>
                  </div>
                ) : (
                  <button 
                    onClick={handlePurchaseSubscription}
                    disabled={isProcessingSub}
                    className="w-full py-4 rounded-2xl bg-yellow-500 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingSub ? 'Processing...' : `🔓 UNLOCK TRADER (${safeUserData.subscription_price} GAINS)`}
                  </button>
                )}
                {!isSubscribed && (
                  <p className="text-center text-[8px] font-bold text-zinc-500 mt-2 uppercase tracking-wide">
                    Unlocks all hidden signals in Feed for 30 days
                  </p>
                )}
              </div>
            )}

            {isOwnProfile && (
              <button 
                onClick={handleGoLive}
                className={`w-full mt-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  safeUserData.is_live 
                    ? 'bg-red-600 text-white animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500' 
                    : (darkMode ? 'bg-zinc-800/80 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700' : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200')
                }`}
              >
                {safeUserData.is_live ? '🔴 Stop Broadcast' : '📺 Go Live'}
              </button>
            )}

            {!isDeveloper && (
              <div className={`mt-5 p-4 rounded-2xl border ${darkMode ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-1.5 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-3.5 h-3.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    VERIFIED TRADER STATISTICS
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <span className={`text-[7px] uppercase tracking-wider font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Total Gain</span>
                    <span className={`text-xs font-black font-mono ${safeUserData.total_gain > 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : safeUserData.total_gain < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                      {safeUserData.total_gain > 0 ? '+' : ''}{safeUserData.total_gain || '0.0'}%
                    </span>
                  </div>
                  <div className="flex flex-col border-l pl-2 border-dashed border-blue-500/20">
                    <span className={`text-[7px] uppercase tracking-wider font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Max DD</span>
                    <span className={`text-xs font-black font-mono ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                      {safeUserData.max_drawdown > 0 ? '-' : ''}{safeUserData.max_drawdown || '0.0'}%
                    </span>
                  </div>
                  <div className="flex flex-col border-l pl-2 border-dashed border-blue-500/20">
                    <span className={`text-[7px] uppercase tracking-wider font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Win Rate</span>
                    <span className={`text-xs font-black font-mono ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                      {safeUserData.win_rate || '0'}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex gap-6 mt-6 border-y py-4 transition-colors ${
              darkMode ? 'border-zinc-800/50' : 'border-zinc-100'
            }`}>
              <button onClick={onFollowingClick} className="text-left group cursor-pointer hover:opacity-80">
                <p className={`font-black text-lg leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{followingCount}</p>
                <p className={`text-[7px] uppercase tracking-[0.2em] font-bold mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Following</p>
              </button>

              <button onClick={handleViewFollowers} className="text-left group cursor-pointer hover:opacity-80 relative">
                <p className={`font-black text-lg leading-none ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{followersCount}</p>
                <p className={`text-[7px] uppercase tracking-[0.2em] font-bold mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Followers</p>
                
                {isOwnProfile && safeUserData.unread_followers > 0 && (
                  <div className="absolute -top-2 -right-4 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-black animate-bounce shadow-lg">
                    +{safeUserData.unread_followers}
                  </div>
                )}
              </button>
            </div>

            <p className={`text-xs mt-4 italic text-left leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              "{safeUserData.bio || "No bio set."}"
            </p>

            <div className={`hidden md:block mt-6 space-y-2 transition-all duration-500 ${isMenuOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible absolute'}`}>
              <p className={`text-[8px] font-black uppercase tracking-widest mb-3 ml-1 opacity-70 ${isDeveloper ? 'text-[#FF00FF]' : 'text-blue-500'}`}>
                {isDeveloper ? 'Architect Modules' : 'Terminal Navigation'}
              </p>
              
              {isDeveloper ? (
                <button 
                  onClick={() => navigateTo('forge')} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 hover:border-[#FF00FF]/50 hover:bg-gradient-to-r hover:from-[#89CFF0]/10 hover:to-[#FF00FF]/10 hover:text-[#FF00FF] hover:shadow-[0_0_20px_rgba(255,0,255,0.4)] ${
                    darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-500'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Coin Creator (Forge)
                </button>
              ) : (
                <button 
                  onClick={() => navigateTo('terminal')} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                    activeTab === 'terminal' 
                      ? (darkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-yellow-50 border-yellow-400 text-yellow-600 shadow-sm')
                      : (darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800')
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                  Market Terminal
                </button>
              )}

              <button 
                onClick={() => {
                   setActiveTab('feed');
                   if (setViewingAlias) setViewingAlias(null);
                   setIsMenuOpen(false);
                }} 
                className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                  activeTab === 'feed' && !setViewingAlias
                    ? (darkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-yellow-50 border-yellow-400 text-yellow-600 shadow-sm')
                    : (darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800')
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                Home Feed
              </button>

              {isOwnProfile && (
                <button 
                  onClick={() => {
                    setActiveTab('profile');
                    setActiveSubTab('wallet');
                    setIsMenuOpen(false);
                  }} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                    activeSubTab === 'wallet'
                      ? (darkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-yellow-50 border-yellow-400 text-yellow-600 shadow-sm')
                      : (darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800')
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                  My Wallet ({safeUserData.gains_balance || 0})
                </button>
              )}
              
              <button 
                onClick={() => {
                   setActiveTab('profile');
                   setActiveSubTab('info'); 
                   if (setViewingAlias) setViewingAlias(null);
                   setIsMenuOpen(false);
                }} 
                className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                  activeTab === 'profile' && activeSubTab === 'info' && isOwnProfile 
                    ? (darkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-yellow-50 border-yellow-400 text-yellow-600 shadow-sm')
                    : (darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800')
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                My Profile
              </button>

              {isDeveloper ? (
                <button 
                  onClick={() => toast.success('Smart Contract Auditor Starting...')} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 hover:border-[#FF00FF]/50 hover:bg-gradient-to-r hover:from-[#89CFF0]/10 hover:to-[#FF00FF]/10 hover:text-[#FF00FF] hover:shadow-[0_0_20px_rgba(255,0,255,0.4)] ${
                    darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-500'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Contract Auditor
                </button>
              ) : (
                <button 
                  onClick={() => {
                     setActiveTab('profile');
                     setActiveSubTab('journal'); 
                     setIsMenuOpen(false);
                  }} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                    activeTab === 'profile' && activeSubTab === 'journal'
                      ? (darkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-yellow-50 border-yellow-400 text-yellow-600 shadow-sm')
                      : (darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800')
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Trading Journal
                </button>
              )}

              <button 
                onClick={() => {
                   setActiveTab('community');
                   setIsMenuOpen(false);
                }} 
                className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                  activeTab === 'community'
                    ? (darkMode ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'bg-yellow-50 border-yellow-400 text-yellow-600 shadow-sm')
                    : (darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800')
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
                Community Hubs
              </button>

              {isDeveloper ? (
                <button 
                  onClick={() => toast.success('Alpha Scanner Connecting to Market...')} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 hover:border-[#FF00FF]/50 hover:bg-gradient-to-r hover:from-[#89CFF0]/10 hover:to-[#FF00FF]/10 hover:text-[#FF00FF] hover:shadow-[0_0_20px_rgba(255,0,255,0.4)] ${
                    darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-500'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                  Alpha Scanner
                </button>
              ) : (
                <button 
                  onClick={() => {
                    onOpenRiskCalc();
                    setIsMenuOpen(false);
                  }} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
                    darkMode ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300 hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                  Risk Calculator
                </button>
              )}

              {isDeveloper ? (
                <button 
                  onClick={() => toast.success('Game Engine Studio Opened!')} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all active:scale-95 hover:border-[#FF00FF]/50 hover:bg-gradient-to-r hover:from-[#89CFF0]/10 hover:to-[#FF00FF]/10 hover:text-[#FF00FF] hover:shadow-[0_0_20px_rgba(255,0,255,0.4)] ${
                    darkMode ? 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-500'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                  Game Engine
                </button>
              ) : (
                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-grid-bot'));
                    setIsMenuOpen(false);
                  }} 
                  className={`w-full flex items-center gap-3 p-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all active:scale-95 ${
                    darkMode 
                      ? 'bg-zinc-900/50 border-blue-500/50 text-blue-400 hover:bg-blue-500/10' 
                      : 'bg-white border-blue-200 text-blue-600 hover:bg-white'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  AI Grid Bot
                </button>
              )}

              <div className="pt-4 border-t border-zinc-800/20 mt-4 space-y-2 text-center">
                  <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-zinc-800/10 border border-zinc-700/20 text-zinc-600 font-black uppercase text-[9px] tracking-widest italic cursor-not-allowed">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Exchange API (Soon)
                  </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
