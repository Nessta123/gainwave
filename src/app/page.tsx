"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner'; 
import { dispatchNotification } from './components/notification-dispatcher';

// UVOZI KOMPONENT
import SearchBar from './components/SearchBar';
import AuthView from './components/AuthView';
import ProfileSidebar from './components/ProfileSidebar';
import FeedView from './components/FeedView';
import GlobalFeed from './components/GlobalFeed';
import AnalogClock from './components/AnalogClock'; 
import TradingJournal from './components/TradingJournal';
import WalletView from './components/WalletView'; 
import AdCreatorModal from './components/AdCreatorModal'; 
import CommunityView from './components/CommunityView'; 
import TradingViewChart from './components/TradingViewChart'; 
import { LiveStreamPlayer } from './components/LiveStreamPlayer';
import GridBotTerminal from './components/GridBotTerminal'; 
import TokenArchitect from './components/TokenArchitect';
import ProjectTerminal from './components/ProjectTerminal'; 
import AssetRegistry from './components/AssetRegistry';
import AIGameStudio from './components/AIGameStudio'; 
import AcademyView from './components/AcademyView';

const compressImage = (file: File, isPro: boolean): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        const maxWidth = isPro ? 1920 : 600;
        const maxHeight = isPro ? 1080 : 600;
        const quality = isPro ? 0.9 : 0.6;

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
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { 
              type: 'image/webp', 
              lastModified: Date.now() 
            });
            resolve(newFile);
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/webp', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const getAvatarGradient = (alias: string) => {
  if (!alias) return 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h}, 80%, 60%), hsl(${(h + 40) % 360}, 80%, 40%))`;
};

const getLocalChanPins = () => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('gw_chan_pins') || '[]');
};

const getLocalChanMutes = () => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('gw_chan_mutes') || '[]');
};

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

const AdminDashboard = ({ darkMode, userData, onExit }: any) => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetAlias, setTargetAlias] = useState("");
  const [proDuration, setProDuration] = useState<number>(30); 
  const [broadcastText, setBroadcastText] = useState("");

  const fetchAdminData = async () => {
    setIsLoading(true);
    const { data: payData } = await supabase.from('withdrawals').select('*, profiles(alias)').order('created_at', { ascending: false });
    if (payData) setWithdrawals(payData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleMarkAsPaid = async (id: string, alias: string) => {
    if (!confirm(`Mark payout for @${alias} as PAID?`)) return;
    const { error } = await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', id);
    if (!error) {
      toast.success("Request marked as successful!");
      await supabase.from('messages').insert([{ from_alias: 'SYSTEM', to_alias: alias, text: `✅ PAYOUT SUCCESSFUL: Your payout request has been successfully processed!`, is_read: false }]);
      fetchAdminData();
    } else toast.error("Error updating.");
  };

  const handleReject = async (id: string, userId: string, amount: number, alias: string) => {
    if (!confirm(`REJECT request and return ${amount} GAINS to @${alias}?`)) return;
    const { error: updateErr } = await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', id);
    if (updateErr) return toast.error("Error rejecting.");

    const { data: wallet } = await supabase.from('user_balances').select('earned_balance').eq('user_id', userId).single();
    if (wallet) await supabase.from('user_balances').update({ earned_balance: wallet.earned_balance + amount }).eq('user_id', userId);

    await supabase.from('messages').insert([{ from_alias: 'SYSTEM', to_alias: alias, text: `❌ PAYOUT REJECTED: Your request for ${amount} GAINS has been rejected. Funds returned.`, is_read: false }]);
    toast.success("Rejected and funds returned!");
    fetchAdminData();
  };

  const handleDirectProAction = async (actionType: 'GRANT' | 'REVOKE') => {
    if (!targetAlias.trim()) {
      toast.error("Please enter user ALIAS!");
      return;
    }

    const cleanAlias = targetAlias.trim();
    const { data: targetUser, error: searchError } = await supabase
      .from('profiles')
      .select('id, alias, is_premium')
      .ilike('alias', cleanAlias)
      .maybeSingle();

    if (searchError || !targetUser) {
      toast.error(`User @${cleanAlias} does not exist in the database!`);
      return;
    }

    if (!confirm(`Are you sure you want to ${actionType} PRO status for @${targetUser.alias}?`)) return;

    let expiryDate = null;
    const newStatus = actionType === 'GRANT';

    if (newStatus && proDuration !== 9999) {
       const date = new Date();
       date.setDate(date.getDate() + proDuration);
       expiryDate = date.toISOString();
    }

    const { error } = await supabase
      .from('profiles')
      .update({ 
          is_premium: newStatus,
          pro_expires_at: newStatus ? expiryDate : null 
      })
      .eq('id', targetUser.id);
    
    if (!error) {
      toast.success(`Success! @${targetUser.alias} is now ${newStatus ? 'PRO' : 'FREE'}.`);
      
      if (newStatus) {
        const durationText = proDuration === 9999 ? 'LIFETIME' : `${proDuration} DAYS`;
        await supabase.from('messages').insert([{
          from_alias: 'SYSTEM',
          to_alias: targetUser.alias,
          text: `👑 PRO NODE ACTIVATED: Admin has granted you full access to the terminal for ${durationText}. Welcome to the elite.`,
          is_read: false
        }]);
      }
      setTargetAlias(""); 
    } else {
      toast.error("Error updating status.");
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) return toast.error("Enter broadcast message!");
    if (!confirm("Are you sure? Message will be broadcasted to ALL users in the network!")) return;

    const toastId = toast.loading("Broadcasting signal to the entire network...");
    
    try {
      const { error } = await supabase.rpc('broadcast_system_message', { msg_text: broadcastText });
      if (error) throw error;

      toast.success("🚀 BROADCAST SUCCESSFUL: All nodes received the notification!", { id: toastId });
      setBroadcastText("");
    } catch (err) {
      toast.error("Error broadcasting.", { id: toastId });
    }
  };

  const glassPanelClass = getGlassPanelClass(darkMode);
  const glassCardClass = getGlassCardClass(darkMode);
  const sunkenClass = getSunkenClass(darkMode);

  return (
    <div className={`fixed inset-0 z-[1000] overflow-y-auto p-4 md:p-10 pt-24 pb-32 animate-in fade-in duration-500 w-full ${darkMode ? 'bg-black text-white' : 'bg-zinc-50 text-black'}`}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className={`flex flex-col md:flex-row items-start md:items-center justify-between p-6 md:p-8 rounded-[2.5rem] gap-4 transition-all duration-300 ${glassPanelClass}`}>
          <div>
            <h2 className={`text-3xl font-black uppercase tracking-tighter text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]`}>CEO Command Center</h2>
            <p className={`text-xs font-black uppercase tracking-widest mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Terminal Oversight & Payout Protocol</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={fetchAdminData} className="flex-1 md:flex-none px-6 py-4 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md shadow-lg active:scale-95 border border-zinc-600/50">
              🔄 Refresh
            </button>
            <button onClick={onExit} className="flex-1 md:flex-none px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all border border-red-400/50 active:scale-95">
              Exit ✕
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20 opacity-50"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className={`p-6 md:p-8 rounded-[2.5rem] transition-all duration-300 relative overflow-hidden ${glassPanelClass}`}>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 blur-[60px] pointer-events-none z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl drop-shadow-lg">👑</span>
                  <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 drop-shadow-sm">Direct PRO Access</h3>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div>
                      <label className="text-xs font-black uppercase tracking-widest opacity-60 mb-2 block ml-2">Target Node Alias</label>
                      <input 
                        placeholder="e.g. BOJAN" 
                        value={targetAlias}
                        onChange={(e) => setTargetAlias(e.target.value)}
                        className={`w-full p-5 rounded-2xl text-lg outline-none font-black uppercase tracking-widest transition-all ${sunkenClass} ${darkMode ? 'focus:border-blue-500/80' : 'focus:border-blue-500/80'}`}
                      />
                  </div>
                  
                  <div>
                      <label className="text-xs font-black uppercase tracking-widest opacity-60 mb-2 block ml-2">Access Duration</label>
                      <select 
                        value={proDuration} 
                        onChange={(e) => setProDuration(Number(e.target.value))}
                        className={`w-full rounded-2xl px-4 py-5 text-sm outline-none font-black uppercase tracking-widest cursor-pointer transition-all ${sunkenClass} ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
                      >
                        <option value={30} className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>1 Month Access</option>
                        <option value={90} className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>3 Months Access</option>
                        <option value={180} className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>6 Months Access</option>
                        <option value={365} className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>1 Year Access</option>
                        <option value={9999} className={darkMode ? 'bg-zinc-900 text-white' : 'bg-white text-black'}>Lifetime Access</option>
                      </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button 
                          onClick={() => handleDirectProAction('GRANT')}
                          className="py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.4)] active:scale-95 border border-blue-400/30"
                      >
                          ⚡ GRANT PRO
                      </button>
                      <button 
                          onClick={() => handleDirectProAction('REVOKE')}
                          className="py-5 bg-zinc-800/60 backdrop-blur-md text-red-500 border border-red-500/30 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-900/40 transition-all active:scale-95 shadow-inner"
                      >
                          ❌ REVOKE
                      </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 md:p-8 rounded-[2.5rem] transition-all duration-300 relative overflow-hidden ${glassPanelClass}`}>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow-500/10 blur-[60px] pointer-events-none z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6"><span className="text-xl drop-shadow-lg">💰</span><h3 className="text-sm font-black uppercase tracking-widest text-yellow-500 drop-shadow-sm">Vault Withdrawals</h3></div>
                {withdrawals.length === 0 ? (
                  <div className={`text-center py-10 opacity-60 rounded-2xl border-dashed ${sunkenClass} !bg-transparent`}><p className="text-xs font-black uppercase tracking-widest">No pending requests.</p></div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {withdrawals.map((req) => (
                      <div key={req.id} className={`p-5 rounded-2xl transition-all ${glassCardClass}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>@{req.profiles?.alias || 'Unknown'}</span>
                            <span className="text-xs font-mono opacity-60 mt-1">{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xl font-black font-mono tracking-tighter drop-shadow-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{req.amount} $</span>
                          </div>
                        </div>
                        {req.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button onClick={() => handleMarkAsPaid(req.id, req.profiles?.alias)} className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-xs font-black uppercase shadow-lg border border-green-400/30 active:scale-95 transition-all">Mark Paid</button>
                            <button onClick={() => handleReject(req.id, req.user_id, req.amount, req.profiles?.alias)} className="w-full py-4 border border-red-500/50 text-red-500 bg-red-500/10 rounded-xl text-xs font-black uppercase active:scale-95 transition-all shadow-inner">Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={`p-6 md:p-8 rounded-[2.5rem] transition-all duration-300 relative overflow-hidden ${glassPanelClass}`}>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 blur-[60px] pointer-events-none z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xl drop-shadow-lg">📢</span>
                  <h3 className="text-sm font-black uppercase tracking-widest text-purple-500">Global Network Broadcast</h3>
                </div>
                
                <textarea 
                  placeholder="Write new update or feature here..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className={`w-full p-5 rounded-2xl text-sm outline-none font-medium min-h-[120px] transition-all ${sunkenClass} focus:border-purple-500/50`}
                />
                
                <button 
                  onClick={handleSendBroadcast}
                  className="w-full mt-4 py-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 shadow-[0_10px_25px_rgba(124,58,237,0.4)] transition-all active:scale-95"
                >
                  🚀 Launch Global Update
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    // Odstranjen Crisp - zamenjano z interno Telegram integracijo
  }, []);
  
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gw_isMuted') === 'true';
    }
    return false;
  });

  const [pinnedHubs, setPinnedHubs] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gw_pinnedHubs');
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  
  const [activeTab, setActiveTab] = useState<'feed' | 'profile' | 'community' | 'terminal' | 'forge' | 'assets' | 'game' | 'academy'>('feed');
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'journal' | 'wallet'>('info'); 
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLocked, setIsLocked] = useState(false);

  const [showAdmin, setShowAdmin] = useState(false);
  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [showGridBot, setShowGridBot] = useState(false);
  const [showMobileInbox, setShowMobileInbox] = useState(false);

  const [riskData, setRiskData] = useState({ balance: "1000", riskPct: "1", pips: "20" });
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const defaultPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
  const [activePairs, setActivePairs] = useState<string[]>(defaultPairs);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceFlash, setPriceFlash] = useState<Record<string, string>>({});
  const prevPrices = useRef<Record<string, number>>({});
  
  const [isEditingRadar, setIsEditingRadar] = useState(false);
  const [radarInput, setRadarInput] = useState("");

  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [activeProject, setActiveProject] = useState<any>(null);
  const [isCopyable, setIsCopyable] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [priceBulls, setPriceBulls] = useState(5);
  const [activeAds, setActiveAds] = useState<any[]>([]); 
  const [isAdModalOpen, setIsAdModalOpen] = useState(false); 

  const [messages, setMessages] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyingToMsg, setReplyingToMsg] = useState<any>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat || !userData.alias) return;

    toast.info("Compressing and uploading...");

    try {
      const compressedFile = await new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; 
            
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) {
                scaleSize = MAX_WIDTH / img.width;
            }
            
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: 'image/webp' }));
              } else {
                reject(new Error("Canvas blob generation failed"));
              }
            }, 'image/webp', 0.6); 
          };
        };
      });

      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('path', `chat-images/${Date.now()}-chat.webp`); 

      const uploadRes = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload to MinIO failed");

      const uploadData = await uploadRes.json();
      const finalImageUrl = uploadData.url; 
      
      const imagePayload = `[IMG]${finalImageUrl}`;
      
      await supabase.from('messages').insert([{
        from_alias: userData.alias, to_alias: activeChat, text: imagePayload, is_read: false, created_at: new Date().toISOString()
      }]);
      toast.success("Image sent safely!");
    } catch (err) {
      console.error("Chat Upload Error:", err);
      toast.error("Failed to upload image.");
    }
  };
  const [marketAlerts, setMarketAlerts] = useState<any[]>([]);
  const [alertSeverity, setAlertSeverity] = useState<'critical' | 'info' | null>(null);

  const [viewingAlias, setViewingAlias] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  // Kličemo helper za class-e glede na temo
  const glassPanelClass = getGlassPanelClass(darkMode);
  const glassCardClass = getGlassCardClass(darkMode);
  const sunkenClass = getSunkenClass(darkMode);
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowingViewingUser, setIsFollowingViewingUser] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalTitle, setFollowModalTitle] = useState("");
  const [followList, setFollowList] = useState<any[]>([]);

  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [myHubs, setMyHubs] = useState<any[]>([]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showSmartBanner, setShowSmartBanner] = useState(false); 
  const [isIos, setIsIos] = useState(false);

  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const [activeStream, setActiveStream] = useState<{url: string, name: string} | null>(null);

  const [userData, setUserData] = useState<any>({
    id: '', 
    alias: '', 
    email: '', 
    style: 'Day Trader', 
    market: 'Crypto', 
    bio: '',
    avatar: null,
    password: '', 
    confirmPassword: '',
    country: '🏳️', 
    followers: 0, 
    following: [] as string[],
    unread_followers: 0, 
    agreedToTerms: false,
    myfxbook_url: '',
    total_gain: 0,
    max_drawdown: 0,
    win_rate: 0,
    total_profit: 0, 
    verify_source: 'manual', 
    ftmo_username: '',         
    binance_key: '',           
    api_key: '',               
    api_secret: '',            
    api_passphrase: '',        
    exchange_name: 'binance',
    mql5_url: '',              
    gains_balance: 0,          
    earned_balance: 0,         
    subscription_price: 0,
    is_premium: false,
    is_institutional: false,
    is_developer: false, 
    is_live: false, 
    live_stream_url: null, 
    has_seen_tutorial: false 
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeChat) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = 'unset';
      }
    }
  }, [activeChat]);

  const isPro = userData.is_premium === true || (userData.win_rate && userData.win_rate >= 90);
  const isCEO = userData?.alias?.toUpperCase() === 'SIGNALHUNTER';

  const [loginAlias, setLoginAlias] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const activeChatRef = useRef<string | null>(null);
  const privateMessagesEndRef = useRef<HTMLDivElement>(null);

  const registerNinjaSync = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile || !userData?.id) return;

    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();

      if (existingSub) {
        return;
      }

      const newSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BNH550PaBB7cNXNunTBdd1GkMC1yduzAWkfRNNxkA8rgWwANSSZvMEFeoM2f93GSDiAckA7-8-Vy3ndI93srfww')
      });

      await supabase
        .from('profiles')
        .update({ push_subscription: JSON.stringify(newSub) })
        .eq('id', userData.id);
        
    } catch (err) {
      // console.error handled silently to avoid manifest complaints
    }
  };

  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    localStorage.setItem('gw_isMuted', String(newState));
    if (newState && "vibrate" in navigator) {
        navigator.vibrate(0);
    }
    toast.info(newState ? "🔕 System Muted (No Sounds/Vibrations)" : "🔔 Alerts Active");
  };

  const togglePin = (hubId: string, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    let newPins;
    if (pinnedHubs.includes(hubId)) {
        newPins = pinnedHubs.filter(id => id !== hubId);
    } else {
        newPins = [...pinnedHubs, hubId];
    }
    setPinnedHubs(newPins);
    localStorage.setItem('gw_pinnedHubs', JSON.stringify(newPins));
    toast.success(newPins.includes(hubId) ? "📌 Hub Pinned to Top" : "Hub Unpinned");
  };

  const getInboxChats = () => {
    const chats = new Map();
    messages.forEach(m => {
      const isMe = m.from_alias === userData.alias;
      const partnerAlias = isMe ? m.to_alias : m.from_alias;
      if (!partnerAlias) return;
      
      if (!chats.has(partnerAlias)) {
        chats.set(partnerAlias, {
          alias: partnerAlias,
          lastMessage: m.text,
          time: m.created_at,
          unread: !isMe && !m.is_read
        });
      } else {
        const existing = chats.get(partnerAlias);
        if (new Date(m.created_at) > new Date(existing.time)) {
          chats.set(partnerAlias, {
            alias: partnerAlias,
            lastMessage: m.text,
            time: m.created_at,
            unread: !isMe && !m.is_read ? true : existing.unread
          });
        } else if (!isMe && !m.is_read) {
          existing.unread = true;
        }
      }
    });
    return Array.from(chats.values()).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  };

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (activeChat) {
      privateMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChat]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });
        const readyRegistration = await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
           let subscription = await readyRegistration.pushManager.getSubscription();
           
           if (!subscription && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
              try {
                subscription = await readyRegistration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
                });
              } catch (e) {
                // Silently handle lack of VAPID
              }
           } 
           
           if (subscription && userData?.id) {
              await supabase.from('profiles')
                .update({ push_subscription: JSON.stringify(subscription) })
                .eq('id', userData.id);
           }
        }
        return readyRegistration;
      } catch (error) {
        // Silently handle
      }
    }
  };

  const fetchMyHubs = async () => {
    if (!userData?.id) return;
    const { data: memberships } = await supabase
      .from('user_hub_memberships')
      .select('hub_owner_id, profiles!hub_owner_id(alias, avatar_url)')
      .eq('user_id', userData.id);

    if (memberships) {
      const hubsWithStatus = memberships.map((m: any) => ({
        id: m.hub_owner_id,
        alias: m.profiles.alias,
        avatar: m.profiles.avatar_url,
        hasNew: false 
      }));
      setMyHubs(hubsWithStatus);
    }
  };

  const handleStripePurchase = async (amount: number, targetTraderId?: string) => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount, 
          userAlias: userData?.alias || "User",
          userId: userData?.id,
          traderId: targetTraderId
        }),
      });

      const session = await response.json();

      if (session.url) {
        window.location.href = session.url; 
      } else {
        alert("Server failed to create Stripe session.");
      }
    } catch (err) {
      console.error("Critical Purchase Error:", err);
      alert("Terminal connection to Stripe failed.");
    }
  };

  const updateUserBalance = async (userId: string, amount: number) => {
    try {
      const { data: wallet } = await supabase
        .from('user_balances')
        .select('bulls_balance')
        .eq('user_id', userId)
        .maybeSingle(); 
      
      const currentBalance = wallet ? wallet.bulls_balance : 0;
      const newBalance = currentBalance + amount;

      const { error } = await supabase
        .from('user_balances')
        .upsert({ user_id: userId, bulls_balance: newBalance, updated_at: new Date().toISOString() });

      if (error) throw error;

      setUserData((prev: any) => ({ ...prev, gains_balance: newBalance }));
      return true;
    } catch (err) {
      console.error("Balance update failed:", err);
      return false;
    }
  };

  const handleBotProfit = async (addedProfit: number) => {
    if (!userData?.id || addedProfit <= 0) return;
    
    const newTotal = (userData.bot_profit || 0) + addedProfit;
    
    setUserData((prev: any) => ({ ...prev, bot_profit: newTotal }));

    try {
      const { error } = await supabase
        .from('user_balances')
        .update({ 
          bot_profit: newTotal, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userData.id);

      if (error) throw error;
    } catch (err) {
      console.error("Error saving bot profit:", err);
    }
  };

 const fetchAds = async () => {
    const now = new Date().toISOString();

    try {
      // 1. BOOSTANE OBJAVE (iz Feeda)
      const { data: boostedData } = await supabase
        .from('boosted_posts')
        .select('*, posts!inner(*, profiles:user_id(alias, avatar_url, country))')
        .gt('end_date', now);

      let formattedBoosts = boostedData?.map((ad: any) => ({
        ...ad.posts, 
        authorAlias: ad.posts.profiles?.alias,
        authorAvatar: ad.posts.profiles?.avatar_url,
        authorCountry: ad.posts.profiles?.country,
        is_boosted_ad: true, 
        ad_type: 'boost',
        ad_id: ad.id,
      })) || [];

      // 2. WALLET OGLASI (tisti s slikco na levi)
      const { data: walletAdsData } = await supabase
        .from('ads')
        .select('*, profiles:user_id(alias, avatar_url, country)')
        .gt('end_date', now);

      let formattedWalletAds = walletAdsData?.map((ad: any) => ({
        id: `ad_${ad.id}`, 
        user_id: ad.user_id,
        authorAlias: ad.profiles?.alias || ad.title, // Če ni profila, vzame naslov oglasa
        authorAvatar: ad.profiles?.avatar_url,
        authorCountry: ad.profiles?.country || '🏳️',
        text: ad.content, 
        image: ad.image_url,
        link: ad.target_url, 
        created_at: ad.start_date,
        bulls: 0,
        bears: 0,
        is_boosted_ad: true,
        ad_type: 'wallet_ad',
        ad_id: ad.id,
      })) || [];

      const combinedAds = [...formattedBoosts, ...formattedWalletAds];
      setActiveAds(combinedAds.sort(() => 0.5 - Math.random()));
    } catch (e) {
      console.error("Ads fetch error:", e);
    }
  };

  const handleLaunchAd = async (adData: any, cost: number) => {
    if (userData.gains_balance < cost) {
      toast.error("Insufficient GAINS balance!");
      return;
    }

    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + adData.duration);

    try {
      // 1. Odštejemo GAINS
      const { error: walletErr } = await supabase
        .from('user_balances')
        .update({ bulls_balance: userData.gains_balance - cost })
        .eq('user_id', userData.id);

      if (walletErr) throw walletErr;

      // 2. Provizija za referrerja
      const referralCut = cost * 0.1;
      const { data: buyerProfile } = await supabase.from('profiles').select('referred_by_id').eq('id', userData.id).single();
      
      if (buyerProfile?.referred_by_id && referralCut > 0) {
          const { data: refWallet } = await supabase.from('user_balances').select('earned_balance').eq('user_id', buyerProfile.referred_by_id).maybeSingle();
          if (refWallet) {
              await supabase.from('user_balances').update({ earned_balance: (refWallet.earned_balance || 0) + referralCut }).eq('user_id', buyerProfile.referred_by_id);
              await supabase.from('transactions').insert([{
                buyer_id: userData.id,
                seller_id: buyerProfile.referred_by_id,
                amount: referralCut,
                item_type: 'REFERRAL_BONUS',
                item_name: '10% Ad Spend Commission'
              }]);
          }
      }

      // 3. LOGIKA ZA LOČEVANJE TABEL 🔥
      if (adData.post_id) {
        // A) To je BOOST objave iz Feeda
        const { error: boostErr } = await supabase.from('boosted_posts').insert([{
          user_id: userData.id,
          post_id: adData.post_id,
          start_date: new Date().toISOString(),
          end_date: expires_at.toISOString(),
          is_active: true
        }]);
        if (boostErr) throw boostErr;
      } else {
        // B) To je splošni AD iz Walleta
        const { error: adErr } = await supabase.from('ads').insert([{
          user_id: userData.id,
          title: adData.title || "GainWave Partner",
          content: adData.content || adData.text || "",
          image_url: adData.image_url || null,
          target_url: adData.target_url || null,
          start_date: new Date().toISOString(),
          end_date: expires_at.toISOString(),
          is_active: true,
          type: 'wallet_ad'
        }]);
        if (adErr) throw adErr;
      }

      toast.success("Campaign Launched Successfully! 🚀");
      setIsAdModalOpen(false);
      fetchAds(); 
      setUserData((prev: any) => ({ ...prev, gains_balance: prev.gains_balance - cost }));
    } catch (err: any) {
      console.error("Ad Launch Error:", err);
      toast.error("Error launching campaign: " + err.message);
    }
  };
  const fetchPostsFromDB = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts_with_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, subscription_price');
      
      let unlockedIds = new Set<string>();
      if (userData?.id) {
         const { data: unlocksData } = await supabase.from('post_unlocks').select('post_id').eq('user_id', userData.id);
         unlockedIds = new Set(unlocksData?.map(u => u.post_id) || []);
      }

      if (!postsError && postsData) {
        const formatted = postsData.map((p: any) => {
          const alias = p.author_alias_db || p.author_alias || "Anonymous";
          const authorProfile = profilesData?.find(prof => prof.id === p.user_id);
          const realPrice = (authorProfile?.subscription_price && authorProfile.subscription_price > 0) ? authorProfile.subscription_price : 100;

          return {
            id: p.id,
            user_id: p.user_id,
            authorAlias: alias, 
            authorCountry: p.author_country,
            authorAvatar: p.author_avatar, 
            text: p.text,
            image: p.image_url,
            bulls: p.bulls || 0,
            bears: p.bears || 0,
            time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: p.created_at,
            is_premium: p.is_premium || false,
            author_is_premium: p.author_is_premium || false, 
            is_institutional: p.is_institutional || false,
            is_copyable: p.is_copyable || false, 
            price_bulls: realPrice,
            is_unlocked: unlockedIds.has(p.id), 
            pair: p.pair,
            direction: p.direction,
            entry: p.entry_price,
            sl: p.sl_price,
            tp: p.tp_price,
            signal_status: p.signal_status,
            win_rate: p.win_rate || 0,
            total_gain: p.total_gain || 0,
            total_profit: p.total_profit || 0,
            verify_source: p.verify_source,
            is_boosted: p.is_boosted || false, 
            isCEO: alias.toUpperCase() === 'SIGNALHUNTER',
            hub_id: p.hub_id
          };
        });

        const filteredPosts = formatted.filter((post: any) => {
          const isMe = post.user_id === userData?.id;
          const amIFollowing = (userData?.following || []).includes(post.user_id);
          const isAuthorPro = post.author_is_premium === true; 
          const isBoosted = post.is_boosted === true;
          const isCEO = post.isCEO === true;

          if (isMe || amIFollowing || isAuthorPro || isBoosted || isCEO) {
            return true;
          }
          return false;
        });

        const sortedPosts = filteredPosts.sort((a: any, b: any) => {
          if (a.isCEO && !b.isCEO) return -1;
          if (!a.isCEO && b.isCEO) return 1;
          if (a.is_boosted && !b.is_boosted) return -1;
          if (!a.is_boosted && b.is_boosted) return 1;
          if (a.author_is_premium && !b.author_is_premium) return -1;
          if (!a.author_is_premium && b.author_is_premium) return 1;

          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA;
        });

        setPosts(sortedPosts);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewProject = async (postId: string) => {
    toast.loading("Encrypting connection to Forge...");
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) throw new Error("Post not found");

      const { data, error } = await supabase
        .from('forge_deployments')
        .select('*')
        .eq('owner_id', post.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      toast.dismiss();
      if (error || !data) {
        toast.error("Project data not found in Forge Registry.");
        return;
      }
      setActiveProject(data);
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to connect to the Forge Network.");
    }
  };

  const handleJoinHub = async (hubId: string) => {
    setActiveProject(null); 
    const hubOwner = allProfiles.find(p => p.id === hubId);
    if (hubOwner) {
      setViewingAlias(hubOwner.alias);
    } else {
       const { data } = await supabase.from('profiles').select('alias').eq('id', hubId).maybeSingle();
       if (data) setViewingAlias(data.alias);
    }
    setActiveTab('community');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (userData?.id) {
      fetchPostsFromDB();
    }
  }, [userData?.id, userData?.following?.length]);

  const handleSignalAction = async (postId: string, actionType: 'manual_close' | 'set_be') => {
    if (!userData.id) return;
    
    if (!confirm(`Are you sure you want to set this signal to: ${actionType === 'manual_close' ? 'CLOSE NOW' : 'BREAK EVEN'}?`)) return;

    try {
        let exitPrice = null;
        const newStatus = actionType === 'manual_close' ? 'manual_exit' : 'be_void';

        if (actionType === 'manual_close') {
            const post = posts.find(p => p.id === postId);
            if (post) {
                const binanceSymbol = post.pair.replace('/', '').replace('USD', 'USDT').toUpperCase();
                exitPrice = prices[binanceSymbol] || 0;
            }
        } else {
            const post = posts.find(p => p.id === postId);
            exitPrice = post?.entry || 0;
        }

        const { error } = await supabase
            .from('posts')
            .update({ 
                signal_status: newStatus,
                exit_price: exitPrice 
            })
            .eq('id', postId)
            .eq('user_id', userData.id);

        if (error) throw error;
        
        alert(`Signal locked at ${exitPrice || 'N/A'}. Status: ${newStatus.toUpperCase()}`);
        fetchPostsFromDB(); 
        fetchAllProfiles(); 
    } catch (err) {
        console.error("Error updating signal status:", err);
        alert("Failed to update signal status.");
    }
  };

  const handlePanicKill = async () => {
    if (!confirm("🚨 WARNING: This will close ALL your active trades on the exchange and the platform. Proceed with EMERGENCY KILL?")) return;

    try {
        const { error: postError } = await supabase
            .from('posts')
            .update({ signal_status: 'manual_exit', exit_price: 0 })
            .eq('user_id', userData.id)
            .eq('signal_status', 'open');

        const { error: copyError } = await supabase
            .from('copied_trades')
            .update({ status: 'manual_exit' })
            .eq('copier_id', userData.id)
            .eq('status', 'open');

        if (postError || copyError) throw new Error("Database update failed.");

        toast.error("🚨 EMERGENCY KILL EXECUTED", {
            description: "All signals and active trades have been terminated.",
            duration: 10000,
        });

        fetchPostsFromDB();
    } catch (err) {
        console.error(err);
        toast.error("Kill Switch Failed. Manual check required!");
    }
  };

  const handleSubscribeToTrader = async (traderId: string, priceGains: number) => {
    if (!userData?.id) return;
    
    if (userData.gains_balance < priceGains) {
      if (confirm(`Insufficient GAINS! You need ${priceGains} GAINS. Would you like to top up your wallet now?`)) {
          setViewingAlias(userData.alias);
          setActiveTab('profile');
          setActiveSubTab('wallet');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const confirmSub = window.confirm(`Subscribe to this trader for 30 Days for ${priceGains} GAINS?`);
    if (!confirmSub) return;

    try {
      const { error: deductErr } = await supabase
        .from('user_balances')
        .update({ bulls_balance: userData.gains_balance - priceGains })
        .eq('user_id', userData.id);

      if (deductErr) throw deductErr;

      const traderCut = Math.floor(priceGains * 0.8);
      const { data: traderWallet } = await supabase
        .from('user_balances')
        .select('earned_balance')
        .eq('user_id', traderId)
        .maybeSingle();
        
      if (traderWallet) {
          await supabase
            .from('user_balances')
            .update({ earned_balance: (traderWallet.earned_balance || 0) + traderCut })
            .eq('user_id', traderId);
      }

      const referralCut = priceGains * 0.1;
      const { data: buyerProfile } = await supabase.from('profiles').select('referred_by_id').eq('id', userData.id).single();
      
      if (buyerProfile?.referred_by_id && referralCut > 0) {
         const { data: refWallet } = await supabase.from('user_balances').select('earned_balance').eq('user_id', buyerProfile.referred_by_id).maybeSingle();
         if (refWallet) {
             await supabase.from('user_balances').update({ earned_balance: (refWallet.earned_balance || 0) + referralCut }).eq('user_id', buyerProfile.referred_by_id);
             
             await supabase.from('transactions').insert([{
                buyer_id: userData.id,
                seller_id: buyerProfile.referred_by_id,
                amount: referralCut,
                item_type: 'REFERRAL_BONUS',
                item_name: '10% Subscription Commission'
             }]);

             const { data: refProfile } = await supabase.from('profiles').select('alias').eq('id', buyerProfile.referred_by_id).single();
             if (refProfile) {
                 await supabase.from('messages').insert([{
                    from_alias: 'SYSTEM',
                    to_alias: refProfile.alias,
                    text: `📢 NETWORK BONUS: Your recruit subscribed to a Node! You earned +${referralCut.toFixed(2)} GAINS.`,
                    is_read: false
                 }]);
             }
         }
      }

      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      
      const { error: subErr } = await supabase
        .from('user_subscriptions')
        .insert([{
            subscriber_id: userData.id,
            trader_id: traderId,
            expires_at: expires.toISOString(),
            status: 'active'
        }]);

      if (subErr) throw subErr;

      await supabase.from('transactions').insert([{
        buyer_id: userData.id,
        seller_id: traderId,
        amount: priceGains,
        item_type: 'SUBSCRIPTION',
        item_name: '30-Day Premium Access'
      }]);

      toast.success("Subscription successful! Premium Intel Unlocked. 🚀");
      
      setUserData((prev: any) => ({ ...prev, gains_balance: prev.gains_balance - priceGains }));
      
      fetchPostsFromDB(); 

    } catch (err: any) {
      console.error("Subscription error:", err);
      toast.error("Failed to process subscription.");
    }
  };

  const handleFollow = async (targetAlias: string) => {
    if (targetAlias === userData.alias) return;

    const { data: prof } = await supabase.from('profiles').select('id').eq('alias', targetAlias).single();
    if (!prof) return; 

    const { data: existing } = await supabase.from('follows').select('*').eq('follower_id', userData.id).eq('following_id', prof.id).maybeSingle();

    if (existing) {
      await supabase.from('follows').delete().eq('follower_id', userData.id).eq('following_id', prof.id);
      setUserData((prev: any) => ({
        ...prev,
        following: (prev.following || []).filter((id: string) => id !== prof.id)
      }));
    } else {
      await supabase.from('follows').insert([{ follower_id: userData.id, following_id: prof.id }]);
      setUserData((prev: any) => ({
        ...prev,
        following: [...(prev.following || []), prof.id]
      }));
    }
    fetchFollowData();
  };

  const handleVisitProfile = (alias: string) => {
    setSearchTerm("");
    setViewingAlias(alias);
    setActiveTab('profile');
    setActiveSubTab('info');
    fetchAllProfiles(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchAllProfiles = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, alias, country, avatar_url, style, bio, verify_source, earned_balance, subscription_price, win_rate, total_profit, total_gain, max_drawdown, is_premium, has_seen_tutorial, is_institutional, is_live, live_stream_url, is_developer');
        
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      } 
      
      const { data: postsData, error: postsError } = await supabase
        .from('posts_with_profiles')
        .select('user_id, signal_status')
        .not('signal_status', 'is', null); 
        
      if (postsError) {
         console.error("Error fetching posts for stats:", postsError);
      }

      if (profilesData) {
        const formattedProfiles = profilesData.map((p: any) => {
          
          const userSignals = postsData ? postsData.filter((post: any) => post.user_id === p.id) : [];
          
          let totalWins = 0;
          let totalLosses = 0;
          let winRate = 0;
          
          userSignals.forEach((signal: any) => {
             if (signal.signal_status === 'win' || signal.signal_status === 'manual_exit') {
                 totalWins += 1;
             } 
             else if (signal.signal_status === 'loss') {
                 totalLosses += 1;
             }
          });
          
          const totalValidTrades = totalWins + totalLosses;
          
          if (totalValidTrades > 0) {
              winRate = Math.round((totalWins / totalValidTrades) * 100);
          }
          
          return {
            ...p,
            avatar: p.avatar_url,
            total_gain: p.total_gain || 0,        
            max_drawdown: p.max_drawdown || 0,   
            win_rate: p.win_rate || winRate,             
            total_profit: p.total_profit || 0, 
            subscription_price: p.subscription_price || 0,
            is_premium: p.is_premium || false, 
            is_institutional: p.is_institutional || false,
            is_developer: p.is_developer || false,
            is_live: p.is_live || false, 
            live_stream_url: p.live_stream_url || null, 
            myfxbook_url: '' 
          };
        });
        
        setAllProfiles(formattedProfiles);
      }
    } catch (err) {
      console.error("System error fetching profiles:", err);
    }
  };

  const calculatePositionSize = () => {
    const bal = parseFloat(riskData.balance) || 0;
    const risk = parseFloat(riskData.riskPct) || 0;
    const pips = parseFloat(riskData.pips) || 0;

    if (pips === 0) return;

    const riskAmount = (bal * risk) / 100;
    const lotSize = riskAmount / (pips * 10);
    setCalcResult(Number(lotSize.toFixed(2)));
  };

  const sendPrivateMessage = async () => {
    if (!chatInput.trim() || !activeChat || !userData.alias) return;
    try {
      let finalMessageText = chatInput;
      if (replyingToMsg) finalMessageText = `> Replying to ${replyingToMsg.from_alias}:\n> "${replyingToMsg.text.substring(0, 40)}..."\n\n${chatInput}`;

      if (editingMsgId) {
        const { error } = await supabase.from('messages').update({ text: finalMessageText + " (edited)" }).eq('id', editingMsgId).eq('from_alias', userData.alias);
        if (!error) {
          setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, text: finalMessageText + " (edited)" } : m));
          setChatInput(""); setEditingMsgId(null); setReplyingToMsg(null);
        } else toast.error("Failed to edit message.");
        return;
      }

      const newMessagePayload = { from_alias: userData.alias, to_alias: activeChat, text: finalMessageText, is_read: false, created_at: new Date().toISOString() };
      const { error, data } = await supabase.from('messages').insert([newMessagePayload]).select();
      
      if (!error && data) {
        // 🔥 TELEGRAM SUPPORT BLOKADA 🔥
        if (activeChat === 'GainWaveSupport') {
          fetch('/api/support/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: finalMessageText, 
              username: userData.alias,
              isSupport: true 
            })
          }).catch(console.error);
        }

        const receiverProf = allProfiles.find(p => p.alias === activeChat);
        if (receiverProf) dispatchNotification({ type: 'direct_message', senderAlias: userData.alias, receiverId: receiverProf.id, content: chatInput });
        else {
          fetch('/api/send-push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: `✉️ ${userData.alias}`, body: chatInput.length > 30 ? chatInput.substring(0, 30) + '...' : chatInput, url: `/?user=${userData.alias}`, targetAlias: activeChat }),
          }).catch(() => {});
        }
        setChatInput(""); setReplyingToMsg(null);
      }
    } catch (err: any) { console.error(err); }
  };

  const sendHubInvite = async () => {
    if (!activeChat || !userData.alias) return;
    
    const inviteLink = `${window.location.origin}/?hub=${userData.alias}`;
    const messageText = `🔥 Join my Hub! Click here to enter: ${inviteLink}`;

    const newMessagePayload = {
      from_alias: userData.alias,
      to_alias: activeChat,
      text: messageText,
      is_read: false,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('messages').insert([newMessagePayload]);
    
    if (!error) {
      const receiverProf = allProfiles.find(p => p.alias === activeChat);
      if (receiverProf) {
          dispatchNotification({
              type: 'hub_invite',
              senderAlias: userData.alias,
              receiverId: receiverProf.id,
              content: "Join my free network hub!"
          });
      } else {
          fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `🤝 Hub Invite: ${userData.alias}`,
              body: "Join my free network hub!",
              url: `/?hub=${userData.alias}`,
              targetAlias: activeChat 
            }),
          }).catch(err => console.log(err));
      }
    } else {
      console.error("Error sending invite:", error);
    }
  };

  const fetchFollowData = async () => {
    let targetId = userData.id;

    if (viewingAlias && viewingAlias !== userData.alias) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('alias', viewingAlias).maybeSingle();
      if (prof) targetId = prof.id;
      else { setFollowersCount(0); setFollowingCount(0); return; }
    }

    if (!targetId) return;

    const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId);
    const { count: following = 0 } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    if (viewingAlias && viewingAlias !== userData.alias) {
      const { data } = await supabase.from('follows').select('*').eq('follower_id', userData.id).eq('following_id', targetId).maybeSingle();
      setIsFollowingViewingUser(!!data);
    }
  };

  useEffect(() => {
    const handleOpenBot = () => setShowGridBot(true);
    window.addEventListener('open-grid-bot', handleOpenBot);
    
    const handleOpenStream = (e: any) => {
        setActiveStream({ url: e.detail.url, name: e.detail.name });
    };
    window.addEventListener('open-live-stream', handleOpenStream);

    if (userData.is_live && userData.live_stream_url && !(window as any)._gwMyStreamStarted) {
        (window as any)._gwMyStreamStarted = true; 
        setActiveStream({ url: userData.live_stream_url, name: userData.alias });
    } else if (!userData.is_live && (window as any)._gwMyStreamStarted) {
        (window as any)._gwMyStreamStarted = false;
        setActiveStream(null);
    }

    const liveSubscription = supabase
      .channel('live-streams')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        const updatedUser = payload.new;
        const oldUser = payload.old;

        if (updatedUser.is_live && !oldUser.is_live && updatedUser.id !== userData.id) {
          if (!isMuted && "vibrate" in navigator) navigator.vibrate([100,50,100]); 
          toast.success(`${updatedUser.alias} is now LIVE!`, { 
            icon: '📺',
            action: {
              label: 'Watch',
              onClick: () => setActiveStream({ url: updatedUser.live_stream_url, name: updatedUser.alias })
            },
            duration: 8000
          });
        } 
        else if (!updatedUser.is_live && oldUser.is_live) {
          setActiveStream((prev: any) => {
            if (prev?.name === updatedUser.alias) {
              toast.info(`${updatedUser.alias} ended the broadcast.`);
              return null;
            }
            return prev;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(liveSubscription);
      window.removeEventListener('open-live-stream', handleOpenStream);
    };
  }, [userData.is_live, userData.live_stream_url, userData.id, userData.alias, isMuted]);

  useEffect(() => {
    if (userData.id) {
      fetchFollowData();
      fetchMyHubs();
    }
  }, [userData.id, viewingAlias]);

  const handleOpenFollowList = async (type: 'followers' | 'following') => {
    let targetId = userData.id;
    if (viewingAlias && viewingAlias !== userData.alias) {
      const { data: prof } = await supabase.from('profiles').select('id').eq('alias', viewingAlias).maybeSingle();
      if (prof) targetId = prof.id;
      else return;
    }

    setFollowModalTitle(type === 'followers' ? 'Network Nodes (Followers)' : 'Connected Nodes (Following)');
    setFollowList([]); 
    setFollowModalOpen(true);

    const field = type === 'followers' ? 'follower_id' : 'following_id';
    const matchField = type === 'followers' ? 'following_id' : 'follower_id';

    const { data: followData } = await supabase.from('follows').select(`${field}, created_at`).eq(matchField, targetId).order('created_at', { ascending: false });

    if (followData && followData.length > 0) {
      const ids = followData.map((d: any) => d[field]);
      const { data: profiles } = await supabase.from('profiles').select('id, alias, country, avatar_url').in('id', ids);
      
      if (profiles) {
         const unreadCount = userData.unread_followers || 0;
         const isMyFollowers = type === 'followers' && targetId === userData.id;

         const sortedProfiles = ids.map((id, index) => {
            const p = profiles.find(profile => profile.id === id);
            if (!p) return null;
            return {
               ...p,
               isNew: isMyFollowers && index < unreadCount 
            };
         }).filter(Boolean);

         setFollowList(sortedProfiles);

         if (isMyFollowers && unreadCount > 0) {
             await supabase.from('profiles').update({ unread_followers: 0 }).eq('id', userData.id);
             setUserData((prev: any) => ({ ...prev, unread_followers: 0 }));
         }
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: any = {
        id: user.id,
        alias: userData.alias,
        bio: userData.bio,
        avatar_url: (userData as any).avatar || null,
        country: userData.country,
        style: userData.style,
        market: userData.market,
        subscription_price: userData.subscription_price || 0,
        verify_source: 'manual', 
        exchange_name: userData.exchange_name || 'binance', 
        api_key: userData.api_key || '',
        api_secret: userData.api_secret || '',
        api_passphrase: userData.api_passphrase || '',
        binance_key: userData.exchange_name === 'binance' ? userData.api_key : userData.binance_key,
        trade_size_usd: userData.trade_size_usd || 10,
        trade_leverage: userData.trade_leverage || 1,
        is_developer: userData.is_developer,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        toast.error("Error: " + error.message);
      } else {
        setIsEditing(false);
        setUserData((prev: any) => ({ ...prev, ...updates }));
        
        fetchAllProfiles(); 
        toast.success("Profile & Exchange Settings Saved! 🚀");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleVote = async (postId: any, type: 'bull' | 'bear') => {
    if (!userData.id) return;
    
    try {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', userData.id)
        .eq('post_id', postId)
        .maybeSingle();

      const postToUpdate = posts.find(p => p.id === postId);
      if (!postToUpdate) return;

      let updates: any = {};

      if (existingVote) {
        if (existingVote.vote_type === type) return; 

        if (existingVote.vote_type === 'bull' && type === 'bear') {
          updates = { bulls: Math.max(0, postToUpdate.bulls - 1), bears: postToUpdate.bears + 1 };
        } else if (existingVote.vote_type === 'bear' && type === 'bull') {
          updates = { bears: Math.max(0, postToUpdate.bears - 1), bulls: postToUpdate.bulls + 1 };
        }
        
        await supabase.from('votes').update({ vote_type: type }).eq('id', existingVote.id);
      } else {
        updates = type === 'bull' ? { bulls: postToUpdate.bulls + 1 } : { bears: postToUpdate.bears + 1 };
        await supabase.from('votes').insert([{ user_id: userData.id, post_id: postId, vote_type: type }]);
      }

      await supabase.from('posts').update(updates).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
      
      fetchAllProfiles(); 
    } catch (err) {
      console.error("Voting error:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this signal?")) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      
      if (error) {
        alert("Error deleting: " + error.message);
      } else {
        fetchPostsFromDB();
        fetchAllProfiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPost = async (signalData?: any) => {
    if (!newPost.trim() && !selectedImage && !signalData) {
        alert("Write something, upload intel, or fill out the signal details.");
        return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
          alert("Connection lost. Please re-login.");
          return;
      }

      // 🔥 NOVO: PREVERI DNEVNI LIMIT 5 OBJAV 🔥
      const todayStr = new Date().toISOString().split('T')[0];
      const { count: postsToday } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', `${todayStr}T00:00:00.000Z`);

      if (postsToday !== null && postsToday >= 5) {
          alert("⛔ Daily limit reached! You can post a maximum of 5 times per day.");
          return;
      }

      let finalImageUrl = null;
      if (selectedImage) {
        toast.info("Compressing image...");
        
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        
        const compressedBlob = await new Promise<Blob>((resolve) => {
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((b) => resolve(b!), 'image/webp', 0.8);
          };
        });

        const formData = new FormData();
        formData.append('file', new File([compressedBlob], `post-${Date.now()}.webp`, { type: 'image/webp' }));
        formData.append('path', `post-images/post-${Date.now()}.webp`); 

        const uploadRes = await fetch('/api/upload-media', {
            method: 'POST',
            body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload to MinIO failed");

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url; 
      }

      // 🔥 POPRAVEK ZA MT5 / FOREX 🔥
      let finalSignalStatus = signalData ? 'pending' : null;
      let finalVerifySource = userData.verify_source || 'manual';
      let isCrypto = true;
      
      if (signalData && signalData.pair) {
          const p = signalData.pair.toUpperCase();
          // Preverimo, če je par kripto
          isCrypto = p.includes('USDT') || p.includes('BTC') || p.includes('ETH') || p.includes('SOL');
          
          if (!isCrypto) {
              // 🔥 TUKAJ JE TISTI "STYL" (visual_only), KI SVA GA UPORABILA ZADNJIČ! 🔥
              // Python bot ta status 100% ignorira, GlobalFeed pa ga prepozna in nariše "👁️ MT5 PENDING".
              finalSignalStatus = 'visual_only';
              finalVerifySource = 'mt5';
          }
      }

      const newPostData = {
        text: newPost,
        image_url: finalImageUrl,
        author_alias: userData.alias || user.user_metadata.alias || "Anonymous",
        author_country: userData.country || "🏳️",
        user_id: user.id,
        is_premium: isPremium,
        is_copyable: isCopyable,
        price_bulls: isPremium ? priceBulls : 0,
        pair: signalData?.pair || null,
        direction: signalData?.direction || null,
        entry_price: signalData?.entry || null,
        sl_price: signalData?.sl || null,
        tp_price: signalData?.tp || null,
        signal_status: finalSignalStatus,
        verify_source: finalVerifySource
      };

      const { data, error } = await supabase.from('posts').insert([newPostData]).select();
      
      if (error) {
          console.error("Post error:", error);
          alert("Database Error: " + error.message);
      } else if (data && data.length > 0) {
          
          const isSignal = !!newPostData.pair;
          const pushContent = isSignal 
              ? { pair: newPostData.pair, type: newPostData.direction } 
              : newPost.substring(0, 50) + "...";

          // 🔥 AUTOMATIC NOTIFICATION FOR FOREX/GOLD 🔥
          if (isSignal && !isCrypto) {
              await supabase.from('messages').insert([{
                  from_alias: 'SYSTEM',
                  to_alias: userData.alias,
                  text: `⚠️ MT5 UPDATE: Signal for ${newPostData.pair} marked as MT5 PENDING. The Judge currently processes Crypto only. Full update for Forex, Gold & Stocks automation is coming soon!`,
                  is_read: false,
                  created_at: new Date().toISOString()
              }]);

              const { error: commentErr } = await supabase.from('comments').insert([{
                  post_id: data[0].id,
                  user_id: user.id, 
                  author_alias: 'SYSTEM',
                  text: `⚠️ SYSTEM NOTICE: This signal contains Forex/Metals/Stocks and is marked as MT5 PENDING. It is not managed by our automated judge yet. Non-crypto market integration is coming soon!`
              }]);
              
              if (commentErr) {
                  console.log("Comments table check:", commentErr);
              }
              
              toast.info("MT5 Signal opened! Check your notifications.");
          }

          fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'feed_post',
              senderId: user.id,
              title: `📢 New Intel from @${userData.alias}`,
              body: isSignal ? `🎯 New Signal: ${newPostData.pair}` : pushContent,
              url: '/'
            }),
          }).catch(err => console.log("Feed Push Error:", err));

          dispatchNotification({
              type: isSignal ? 'master_signal' : 'new_post',
              senderId: user.id,
              senderAlias: userData.alias,
              content: pushContent
          });

          // 🔥 REWARD ENGINE START 🔥
          try {
            const todayStr = new Date().toISOString().split('T')[0];
            
            const { count: rewardsCount, error: countErr } = await supabase
              .from('daily_rewards_log')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('claimed_at', todayStr);

            const currentCount = rewardsCount || 0;

            if (currentCount < 5) {
              await supabase.from('daily_rewards_log').insert([{ 
                  user_id: user.id, 
                  post_id: data[0].id,
                  reward_type: 'daily_post', 
                  amount: 0.1,
                  claimed_at: todayStr
              }]);

              const { data: balData } = await supabase
                  .from('user_balances')
                  .select('bonus_balance')
                  .eq('user_id', user.id)
                  .maybeSingle();

              let addedAmount = 0.1;
              let isStreakBonus = false;

              if (currentCount === 0) {
                try {
                  const { data: streak } = await supabase.rpc('check_user_streak', { u_id: user.id });
                  if (streak === 7) {
                    addedAmount += 1.0; 
                    isStreakBonus = true;
                  }
                } catch (e) {}
              }

              const newBonusTotal = (Number(balData?.bonus_balance || 0) + addedAmount);
              
              await supabase.from('user_balances').upsert({ 
                  user_id: user.id, 
                  bonus_balance: newBonusTotal,
                  updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });

              setUserData((prev: any) => ({ ...prev, bonus_balance: newBonusTotal }));

              toast.success(`🏆 Reward [${currentCount + 1}/5]: +0.1 GAINS!`);
              if (isStreakBonus) toast.success("🔥 7-DAY STREAK: +1.0 GAINS!");

              // 🔥 TUKAJ JE NOVO: POŠLJI SPOROČILO V INBOX OD "SYSTEM" 🔥
              const rewardMessageText = isStreakBonus 
                ? `🏆 LOYALTY REWARD: You earned +0.1 Bonus GAINS [${currentCount + 1}/5 today].\n🔥 7-DAY STREAK COMPLETED: +1.0 EXTRA GAINS added to your Vault!`
                : `🏆 LOYALTY REWARD: You earned +0.1 Bonus GAINS for your post [${currentCount + 1}/5 today]. Keep up the activity to earn your 7-day streak bonus!`;

              await supabase.from('messages').insert([{
                  from_alias: 'SYSTEM',
                  to_alias: userData.alias,
                  text: rewardMessageText,
                  is_read: false,
                  created_at: new Date().toISOString()
              }]);

            }
          } catch (rewardErr) {
            console.error("Critical Reward Error:", rewardErr);
          }
          // 🔥 REWARD ENGINE END 🔥

          const newPostForState = {
              id: data[0].id,
              user_id: user.id, 
              authorAlias: userData.alias, 
              authorCountry: userData.country,
              authorAvatar: userData.avatar, 
              text: data[0].text,
              image: data[0].image_url,
              bulls: 0,
              bears: 0,
              time: new Date(data[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              created_at: data[0].created_at,
              is_premium: data[0].is_premium,
              author_is_premium: userData.is_premium, 
              is_institutional: userData.is_institutional,
              is_copyable: data[0].is_copyable, 
              price_bulls: data[0].price_bulls,
              is_unlocked: false, 
              pair: data[0].pair,
              direction: data[0].direction,
              entry: data[0].entry_price,
              sl: data[0].sl_price,
              tp: data[0].tp_price,
              signal_status: data[0].signal_status,
              win_rate: userData.win_rate || 0,
              total_gain: userData.total_gain || 0,
              total_profit: userData.total_profit || 0,
              verify_source: data[0].verify_source || finalVerifySource
          };

          setPosts(prevPosts => [newPostForState, ...prevPosts]);

          setNewPost("");
          setSelectedImage(null);
          setIsPremium(false);
          setIsCopyable(false);
          setPriceBulls(5);
          
          fetchPostsFromDB();
          fetchAllProfiles();
      }
    } catch (err: any) {
      console.error(err);
      alert("System Error: " + err.message);
    }
  };

  const handleRegister = async (captchaToken?: string) => { 
    setLoginError("");

    if (!userData.agreedToTerms) {
      setLoginError("YOU MUST AGREE TO THE RISK DISCLAIMER.");
      return;
    }

    if (!userData.alias || !userData.password) {
      setLoginError("ALIAS AND KEY REQUIRED.");
      return;
    }
    
    let finalRegisterEmail = userData.email?.trim() || "";
    if (finalRegisterEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalRegisterEmail)) {
        setLoginError("PLEASE ENTER A VALID EMAIL ADDRESS.");
        return;
      }
    } else {
      finalRegisterEmail = `${userData.alias.toLowerCase().trim().replace(/\s+/g, '')}@terminal.com`;
    }

    if (userData.password !== userData.confirmPassword) {
      setLoginError("KEYS DO NOT MATCH.");
      return;
    }

    let referredById = null;
    let storedRefCode = null;
    
    if (typeof window !== 'undefined') {
       storedRefCode = localStorage.getItem('gw_referrer') || localStorage.getItem('gw_referral_code');
    }

    if (storedRefCode) {
       let { data: refUser } = await supabase
         .from('profiles')
         .select('id')
         .eq('referral_code', storedRefCode)
         .maybeSingle();
         
       if (!refUser) {
           const { data: aliasUser } = await supabase
             .from('profiles')
             .select('id')
             .ilike('alias', storedRefCode)
             .maybeSingle();
           refUser = aliasUser;
       }
         
       if (refUser && refUser.id) {
           referredById = refUser.id;
       }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: finalRegisterEmail, 
        password: userData.password,
        options: {
          data: {
            alias: userData.alias.trim(),
            country: userData.country,
            style: userData.style,
            market: userData.market,
            bio: userData.bio,
            avatar: null,
            following: [],
            referred_by: referredById
          }
        }
      });

      if (error) {
        if (error.message.toLowerCase().includes("user already registered") || error.message.toLowerCase().includes("already exists")) {
          setLoginError("EMAIL OR ALIAS ALREADY TAKEN.");
        } else {
          setLoginError(error.message.toUpperCase());
        }
        return;
      }

      if (data?.user) {
        if (referredById) {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const { error: refError } = await supabase
              .from('profiles')
              .update({ referred_by_id: referredById })
              .eq('id', data.user.id);
              
            if (refError) {
               console.warn("First referral bind failed, retrying...");
               await new Promise(resolve => setTimeout(resolve, 1000));
               await supabase
                  .from('profiles')
                  .update({ referred_by_id: referredById })
                  .eq('id', data.user.id);
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem('gw_referrer');
                localStorage.removeItem('gw_referral_code');
            }
        }

        toast.success("Account created! System ready.");
        
        setTimeout(() => {
          window.location.reload(); 
        }, 1500); 
      }
    } catch (err: any) {
      setLoginError("DATABASE ERROR.");
      console.error(err);
    }
  };

  const handleLogin = async () => {
    if (isLocked) return;
    setLoginError("");
    if (!loginAlias || !loginPassword) {
      setLoginError("ALIAS/EMAIL AND KEY REQUIRED.");
      return;
    }

    let finalLoginId = loginAlias.toLowerCase().trim();
    if (!finalLoginId.includes('@')) {
      finalLoginId = `${finalLoginId}@terminal.com`;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalLoginId, 
        password: loginPassword,
      });

      if (error) throw error;
      if (data?.user) {
        toast.success("Node Access Granted. Welcome back.");
        setTimeout(() => {
          window.location.reload(); 
        }, 500);
      }
    } catch (err: any) {
      setLoginError("ACCESS DENIED: INVALID ALIAS/EMAIL OR KEY.");
    }
  };

  const handleResetPassword = async (providedEmail: string) => {
    if (!providedEmail || !providedEmail.includes('@')) {
      setLoginError("ENTER YOUR REGISTERED RECOVERY EMAIL TO RESET.");
      toast.error("Please enter a valid email address.");
      return;
    }

    toast.loading("Sending recovery protocol...");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(providedEmail.trim(), {
        redirectTo: 'https://www.gain-wave.com/',
      });

      toast.dismiss();
      if (error) throw error;

      setLoginError("MAGIC LINK SENT! CHECK YOUR EMAIL OR SPAM FOLDER.");
      toast.success("Recovery link sent! Check your inbox.");
    } catch (error: any) {
      toast.dismiss();
      console.error("Reset Auth Error:", error);
      setLoginError("ERROR: " + error.message.toUpperCase());
      toast.error("Failed to send. Check if email is correct.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setActiveTab('feed');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      const isGw = urlParams.get('gw');

      if (refCode && !isGw) {
        localStorage.setItem('gw_referral_code', refCode);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) {
        setShowSmartBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isIosDevice && !isStandalone) {
        setIsIos(true);
        setShowSmartBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
        alert("📲 iPHONE INSTALL:\n1. Tap 'Share' 📤 at the bottom.\n2. Select 'Add to Home Screen' ➕.");
        return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowSmartBanner(false);
      }
      deferredPrompt(null);
    } else {
        alert("📲 ANDROID INSTALL:\n1. Tap the three dots ⋮ (top right).\n2. Select 'Install app' or 'Add to Home screen'.");
    }
  };

  useEffect(() => {
    if (!userData.alias || !userData.id) return;

    registerServiceWorker();

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`from_alias.eq.${userData.alias},to_alias.eq.${userData.alias}`)
        .order('created_at', { ascending: false }) 
        .limit(50); 
      
      if (data) setMessages(data.reverse()); 
    };
    fetchMessages();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
         fetchMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const channel = supabase
      .channel('gainwave_realtime_sync') 
      .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
      }, (payload: any) => {
          const newMessage = payload.new;
          if (newMessage.to_alias === userData.alias || newMessage.from_alias === userData.alias) {
              setMessages(prev => {
                  if (prev.some(m => m.id === newMessage.id)) return prev;
                  return [...prev, newMessage];
              });

              // Preveri, če uporabnik NI trenutno v chatu s pošiljateljem
              if (newMessage.to_alias === userData.alias && activeChatRef.current !== newMessage.from_alias) {
                  setHasNewMessage(true); 
                  if (!isMuted) {
                      // 🔥 ODSTRANJEN NADLEŽNI ZVOK - ZDAJ SAMO NEŽNO ZAVIBRIRA 🔥
                      if ("vibrate" in navigator) navigator.vibrate([100,50,100]);
                  }
                  toast.info(`✉️ Direct Node: ${newMessage.from_alias}`, {
                    description: newMessage.text.substring(0, 30) + "...",
                    action: {
                      label: 'Connect',
                      onClick: (e) => {
                        if (e) e.preventDefault(); 
                        window.history.pushState({}, '', `/?user=${newMessage.from_alias}`);
                        setActiveChat(newMessage.from_alias); 
                        setActiveTab('feed'); 
                      }
                    }
                  });
              }
          }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload: any) => {
          const updated = payload.new;
          if (updated.from_alias === activeChatRef.current && updated.to_alias === userData.alias && !updated.is_read) {
              return;
          }
          setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'posts' 
      }, (payload: any) => {
        fetchPostsFromDB();
        fetchAllProfiles(); 
        
        if (payload.new.user_id !== userData.id) {
          const isSignal = !!payload.new.pair;
          if (!isMuted && "vibrate" in navigator) navigator.vibrate([100,50,100]); 
          toast.success(isSignal ? "🎯 LIVE SIGNAL RECEIVED" : "📢 NEW ALPHA POSTED", {
            description: `@${payload.new.author_alias || 'Node'}: ${payload.new.pair || ""} Intel received.`,
            duration: 5000,
          });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'posts' 
      }, (payload: any) => {
        fetchPostsFromDB();
        fetchAllProfiles();
        
        const oldStatus = payload.old.signal_status;
        const newStatus = payload.new.signal_status;

        if (oldStatus === 'open' && (newStatus === 'win' || newStatus === 'loss') && payload.new.user_id === userData.id) {
          const emoji = newStatus === 'win' ? "💰" : "🛑";
          if (!isMuted && "vibrate" in navigator) navigator.vibrate([200, 100, 200]); 
          toast(newStatus === 'win' ? "TARGET REACHED!" : "STOP LOSS HIT", {
            icon: emoji,
            description: `Your signal ${payload.new.pair} closed as ${newStatus.toUpperCase()}`,
            style: { background: newStatus === 'win' ? '#065f46' : '#991b1b', color: '#fff' }
          });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData.alias, userData.id, isMuted]);

  useEffect(() => {
    const markAsRead = async () => {
      if (activeChat && userData.alias) {
        setHasNewMessage(false);

        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('from_alias', activeChat)
          .eq('to_alias', userData.alias)
          .eq('is_read', false);

        setMessages(currentMessages => 
          currentMessages.map(m => 
            (m.from_alias === activeChat && m.to_alias === userData.alias) 
              ? { ...m, is_read: true } 
              : m
          )
        );

        fetchAllProfiles();
      }
    };
    markAsRead();
  }, [activeChat, userData.alias]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteHub = urlParams.get('hub');
    const channelId = urlParams.get('channel'); 
    const dmUser = urlParams.get('user'); 
    const isGW = urlParams.get('gw') === 'true'; 

    if (channelId || inviteHub || (isGW && !dmUser)) {
      setActiveTab('community');
      if (inviteHub) setViewingAlias(inviteHub);
    } else if (dmUser) {
      setShowMobileInbox(false); 
      setActiveChat(dmUser);
    }

    setMounted(true);

    fetchPostsFromDB(); 
    fetchAllProfiles(); 
    fetchAds(); 

    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data || !data.session) return;
        const session = data.session;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle(); 

        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', session.user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];

        if (profileData) {
          // 🔥 TUKAJ JE DODAN BONUS BALANCE 🔥
          const { data: balanceData } = await supabase.from('user_balances').select('bulls_balance, bot_profit, bonus_balance').eq('user_id', session.user.id).maybeSingle();

          if (profileData.is_premium && profileData.radar_pairs && profileData.radar_pairs.length > 0) {
              setActivePairs(profileData.radar_pairs);
          } else {
              setActivePairs(defaultPairs);
          }

          setUserData((prev: any) => ({
            ...prev,
            id: session.user.id,
            email: session.user.email || '',
            alias: profileData.alias || session.user.user_metadata.alias,
            bio: profileData.bio || session.user.user_metadata.bio,
            avatar: profileData.avatar_url || session.user.user_metadata.avatar,
            country: profileData.country || session.user.user_metadata.country,
            style: profileData.style || session.user.user_metadata.style,
            market: profileData.market || session.user.user_metadata.market,
            following: followingIds, 
            unread_followers: profileData.unread_followers || 0,
            total_gain: profileData.total_gain || 0,
            max_drawdown: profileData.max_drawdown || 0,
            win_rate: profileData.win_rate || 0,
            total_profit: profileData.total_profit || 0, 
            verify_source: profileData.verify_source || 'manual', 
            exchange_name: profileData.exchange_name || 'binance', 
            api_key: profileData.api_key || profileData.binance_key || '',
            api_secret: profileData.api_secret || '',
            api_passphrase: profileData.api_passphrase || '',
            subscription_price: profileData.subscription_price || 0,
            is_premium: profileData.is_premium === true, 
            is_institutional: profileData.is_institutional === true,
            is_developer: profileData.is_developer === true,
            is_live: profileData.is_live === true, 
            live_stream_url: profileData.live_stream_url || null, 
            referral_code: profileData.referral_code, 
            gains_balance: balanceData?.bulls_balance || 0,
            bot_profit: balanceData?.bot_profit || 0,
            earned_balance: profileData.earned_balance || 0,
            // 🔥 TUKAJ JE DODAN BONUS BALANCE 🔥
            bonus_balance: balanceData?.bonus_balance || 0,
            has_seen_tutorial: profileData.has_seen_tutorial || false 
          }));

          if (profileData.has_seen_tutorial === false) {
             setShowTour(true);
          }

        } else {
          setUserData((prev: any) => ({
            ...prev,
            ...session.user.user_metadata,
            id: session.user.id,
            email: session.user.email || '',
            following: followingIds
          }));
          setShowTour(true);
        }
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Session check error:", err);
      }
    };
    checkUser();
  }, []);

  // 🔥 WEBSOCKET SAMO ZA BRANJE CEN (BREZ PISANJA V BAZO) 🔥
  useEffect(() => {
    if (!activePairs || activePairs.length === 0) return;

    const streams = activePairs.map(p => p.toLowerCase() + '@ticker').join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const symbol = data.s;
      const newPrice = parseFloat(data.c);

      setPrices((prev) => {
        const updatedPrices = { ...prev };
        let hasChanged = false;
        
        if (updatedPrices[symbol] !== newPrice) {
           setPriceFlash(pf => ({ ...pf, [symbol]: newPrice > (updatedPrices[symbol] || 0) ? 'text-green-500' : 'text-red-500' }));
           updatedPrices[symbol] = newPrice;
           hasChanged = true;
        }

        if (hasChanged) {
          setTimeout(() => setPriceFlash(pf => ({ ...pf, [symbol]: '' })), 1000);
          prevPrices.current = updatedPrices;
        }
        return updatedPrices;
      });
    };

    return () => {
        ws.close(); 
    };
  }, [activePairs]); 

  useEffect(() => {
    const fetchMarketNews = async () => {
      const { data } = await supabase
        .from('market_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setMarketAlerts(data);
    };
    fetchMarketNews();

    const newsChannel = supabase
      .channel('public:market_news') 
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_news' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            const msg = payload.new.message || "";
            const isCritical = msg.includes('🚨') || msg.includes('🔴') || msg.toUpperCase().includes('FOMC') || msg.toUpperCase().includes('CPI') || msg.toUpperCase().includes('NFP');

            setMarketAlerts(prev => [payload.new, ...prev].slice(0, 5));
            setAlertSeverity(isCritical ? 'critical' : 'info'); 
            
            setTimeout(() => setAlertSeverity(null), 5000); 
        }
      })
      .subscribe();
      
      return () => { supabase.removeChannel(newsChannel); };
  }, []);

  useEffect(() => {
    const handleGwCommand = (e: any) => {
      const { command, data } = e.detail;
      if (command === 'UPDATE_USER') setUserData((prev: any) => ({ ...prev, ...data }));
      if (command === 'CHANGE_TAB') { setActiveTab(data.tab); if (data.subTab) setActiveSubTab(data.subTab); }
      if (command === 'SHOW_TOAST') toast[data.type === 'error' ? 'error' : 'success'](data.message);
      if (command === 'SET_CHAT') { setActiveChat(data.alias); setShowMobileInbox(false); }
    };
    window.addEventListener('gw-command', handleGwCommand);
    return () => window.removeEventListener('gw-command', handleGwCommand);
  }, []);

  const handleFinishTour = async () => {
    setShowTour(false);
    if (userData.id) {
       await supabase.from('profiles').update({ has_seen_tutorial: true }).eq('id', userData.id);
       setUserData((prev: any) => ({ ...prev, has_seen_tutorial: true }));
    }
  };

  if (!mounted) return null;
  const activeColorBase = userData.is_developer 
      ? 'text-[#FF00FF] drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]' 
      : isPro 
          ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]' 
          : (darkMode ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'text-blue-600 drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]');

  const hoverColorBase = userData.is_developer
      ? 'hover:text-[#FF00FF] hover:drop-shadow-[0_0_8px_rgba(255,0,255,0.8)] group-hover:text-[#FF00FF] group-hover:drop-shadow-[0_0_8px_rgba(255,0,255,0.8)]'
      : isPro
          ? 'hover:text-yellow-500 hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)] group-hover:text-yellow-500 group-hover:drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]'
          : (darkMode ? 'hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] group-hover:text-blue-400 group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'hover:text-blue-600 hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.8)] group-hover:text-blue-600 group-hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.8)]');

  const dotColorBase = userData.is_developer ? 'bg-[#FF00FF] shadow-[0_0_5px_#FF00FF]' : isPro ? 'bg-yellow-500 shadow-[0_0_5px_#EAB308]' : 'bg-blue-500 shadow-[0_0_5px_#3B82F6]';

  const desktopBgHover = darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5';
  const desktopBgActive = darkMode ? 'bg-white/10' : 'bg-black/5';

  const getNavIconClass = (isActive: boolean) => `w-7 h-7 transition-all duration-300 ${isActive ? activeColorBase : `text-zinc-500 ${hoverColorBase}`}`;
  const getNavTextClass = (isActive: boolean) => `text-[9px] md:text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? activeColorBase : `text-zinc-500 ${hoverColorBase}`}`;
  const getDesktopBtnClass = (isActive: boolean) => `text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${isActive ? `${activeColorBase} ${desktopBgActive}` : `text-zinc-500 ${desktopBgHover} ${hoverColorBase}`}`;

  const isFeedActive = activeTab === 'feed' && !viewingAlias;
  const isTerminalActive = activeTab === 'terminal';
  const isHubsActive = activeTab === 'community';
  const isInboxActive = showMobileInbox;
  const isProfileActive = activeTab === 'profile' && activeSubTab === 'info' && viewingAlias === userData.alias;
  const isWalletActive = activeTab === 'profile' && activeSubTab === 'wallet';
  const isJournalActive = activeTab === 'profile' && activeSubTab === 'journal';
  const isRiskActive = showRiskCalc;
  const isBotActive = showGridBot;

  const sortedHubs = [...myHubs].sort((a, b) => {
    const aPin = pinnedHubs.includes(a.id) ? 1 : 0;
    const bPin = pinnedHubs.includes(b.id) ? 1 : 0;
    return bPin - aPin;
  });

  return (
    <main className={`flex min-h-screen flex-col items-center p-4 md:p-6 font-sans transition-colors duration-500 overflow-x-hidden pb-20 md:pb-6 relative ${
      darkMode ? 'bg-black text-white' : 'bg-zinc-50 text-zinc-900'
    }`}>
      <div className={`fixed top-0 left-0 w-full h-full pointer-events-none z-0 transition-opacity duration-1000 ${darkMode ? 'opacity-100' : 'opacity-50'}`}>
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.8); }
        * { scrollbar-width: thin; scrollbar-color: rgba(59, 130, 246, 0.5) transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {showAdmin && isCEO ? (
        <AdminDashboard darkMode={darkMode} userData={userData} onExit={() => setShowAdmin(false)} />
      ) : (
        <>
          {isLoggedIn && (
            <div className={`fixed top-6 left-2 right-2 lg:left-auto lg:right-6 z-[900] hidden md:flex items-center justify-center lg:justify-end gap-1.5 px-3 py-2 rounded-[2rem] overflow-x-auto no-scrollbar max-w-[95vw] transition-all duration-300 ${getGlassPanelClass(darkMode)}`}>
              <button onClick={() => { setViewingAlias(null); setActiveTab('feed'); }} className={getDesktopBtnClass(isFeedActive)}>Feed</button>
              <button onClick={() => setActiveTab('assets')} className={getDesktopBtnClass(activeTab === 'assets')}>
                🚀 Live Presales
              </button>
              <button onClick={() => setActiveTab('terminal')} className={getDesktopBtnClass(isTerminalActive)}>
                Terminal
              </button>
              <button onClick={() => setActiveTab('academy')} className={getDesktopBtnClass(activeTab === 'academy')}>
                Academy
              </button>
              <button onClick={() => setActiveTab('community')} className={getDesktopBtnClass(isHubsActive)}>Hubs</button>
              
              {userData?.is_developer && (
                <button onClick={() => setActiveTab('game')} className={getDesktopBtnClass(activeTab === 'game')}>
                  Engine
                </button>
              )}
              
              <button onClick={() => setShowMobileInbox(true)} className={`${getDesktopBtnClass(isInboxActive)}`}>
                Inbox {messages.filter(m => m.to_alias === userData.alias && !m.is_read).length > 0 && <span className={`w-2 h-2 rounded-full animate-pulse ${dotColorBase}`}/>}
              </button>
              <button onClick={() => { setViewingAlias(userData.alias); setActiveTab('profile'); setActiveSubTab('info'); }} className={getDesktopBtnClass(isProfileActive)}>Profile</button>
              <div className={`w-px h-4 mx-2 ${darkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`}></div>
              <button onClick={toggleMute} className={`text-lg transition-transform ${hoverColorBase} text-zinc-500`}>
                {isMuted ? "🔕" : "🔔"}
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className={`text-lg transition-transform ${hoverColorBase} text-zinc-500`}>
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
          )}

          {showSmartBanner && (
            <div className="fixed top-0 left-0 right-0 z-[1000] p-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex justify-between items-center animate-in slide-in-from-top-full duration-500 shadow-2xl">
              <div className="flex items-center gap-3">
                <img src="/Logo.png" className="w-10 h-10 rounded-xl border border-white/20 shadow-md" alt="Logo" />
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase">GainWave Pro Terminal</span>
                  <span className="text-[9px] opacity-80 uppercase font-bold">Install for 0% lag and alerts</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowSmartBanner(false)} className="px-3 text-[11px] font-black uppercase opacity-60 hover:opacity-100 transition-opacity">Later</button>
                <button onClick={handleInstallClick} className="px-6 py-2 bg-white text-blue-600 rounded-xl text-[11px] font-black uppercase shadow-xl active:scale-95 transition-all hover:bg-blue-50">Install</button>
              </div>
            </div>
          )}

          {isLoggedIn && sortedHubs.length > 0 && (
            <div className="fixed top-0 left-0 right-0 z-[400] flex justify-center p-2 pointer-events-none">
              <div className={`flex gap-2 p-1.5 rounded-2xl pointer-events-auto transition-all ${getGlassPanelClass(darkMode)}`}>
                {sortedHubs.map(hub => {
                  const isPinned = pinnedHubs.includes(hub.id);
                  return (
                    <button 
                      key={hub.id}
                      onClick={() => handleVisitProfile(hub.alias)}
                      onContextMenu={(e) => togglePin(hub.id, e)}
                      className={`relative group w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border transition-all duration-300 active:scale-90 ${
                        isPinned 
                          ? 'border-yellow-400 ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-110 z-10' 
                          : 'border-white/10 hover:border-blue-500'
                      }`}
                    >
                      {isPinned && <div className="absolute top-0 left-0 bg-yellow-500 text-black text-[8px] px-1 rounded-br-lg z-30 font-black shadow-md">📌</div>}
                      {hub.avatar ? (
                         <img src={hub.avatar} className="w-full h-full rounded-xl object-cover" alt={hub.alias} />
                      ) : (
                         <div className="w-full h-full rounded-xl flex items-center justify-center text-white font-black text-[12px] md:text-[14px] shadow-inner" style={{ background: getAvatarGradient(hub.alias) }}>
                           {hub.alias?.charAt(0).toUpperCase()}
                         </div>
                      )}
                      {hub.hasNew && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping z-20" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showMobileInbox && (
            <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className={`w-full max-w-md rounded-[2.5rem] p-6 flex flex-col max-h-[85vh] transition-all duration-300 ${getGlassPanelClass(darkMode)}`}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                   <h3 className="text-xs md:text-[10px] font-black uppercase tracking-widest text-blue-500">Direct Messages</h3>
                   <button type="button" onClick={() => setShowMobileInbox(false)} className="text-2xl md:text-xl opacity-50 hover:opacity-100 transition-transform hover:rotate-90">✕</button>
                </div>
                <div className="overflow-y-auto space-y-3 pr-2 custom-scrollbar flex-1">
                   {getInboxChats().length > 0 ? getInboxChats().map((chat: any, i) => (
                     <div 
                        key={i} 
                        onClick={() => {
                          setActiveChat(chat.alias);
                          setShowMobileInbox(false);
                        }} 
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:scale-[1.02] transition-all ${chat.unread ? 'border border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : getGlassCardClass(darkMode)}`}
                     >
                        {allProfiles.find(p => p.alias === chat.alias)?.avatar_url ? (
                          <img src={allProfiles.find(p => p.alias === chat.alias)?.avatar_url} className="w-12 h-12 md:w-10 md:h-10 rounded-full object-cover shrink-0 shadow-lg border border-white/10" alt={chat.alias} />
                        ) : (
                          <div className="w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-black text-sm md:text-[12px] shrink-0 shadow-inner border border-white/10" style={{ background: getAvatarGradient(chat.alias) }}>
                             {chat.alias.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <span className={`text-xs md:text-[10px] font-black uppercase truncate ${chat.unread ? 'text-blue-400' : (darkMode ? 'text-white' : 'text-zinc-900')}`}>{chat.alias}</span>
                              <span className="text-[9px] md:text-[7px] font-mono opacity-50 shrink-0 ml-2">
                                 {new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                           <p className={`text-[11px] md:text-[9px] truncate ${chat.unread ? 'font-bold text-blue-300' : 'opacity-60'}`}>
                              {chat.lastMessage.includes('VIP ACCESS GRANTED') ? '🔑 VIP Invite' : chat.lastMessage.includes('Join my Hub!') ? '🤝 Hub Invite' : chat.lastMessage}
                           </p>
                        </div>
                        {chat.unread && <div className="w-3 h-3 md:w-2 md:h-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_#3b82f6]"></div>}
                     </div>
                   )) : (
                     <div className="text-center py-10 opacity-40 flex flex-col items-center gap-2">
                        <span className="text-4xl md:text-3xl">📭</span>
                        <p className="text-[11px] md:text-[9px] font-bold uppercase tracking-widest">No messages yet</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {followModalOpen && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className={`w-full max-w-sm rounded-[2.5rem] p-6 transition-all duration-300 ${getGlassPanelClass(darkMode)}`}>
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xs md:text-[10px] font-black uppercase tracking-widest text-blue-500 drop-shadow-sm">{followModalTitle}</h3>
                   <button type="button" onClick={() => setFollowModalOpen(false)} className="text-xl opacity-50 hover:opacity-100 transition-transform hover:rotate-90">✕</button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                   {followList.length > 0 ? followList.map((u, i) => (
                     <div key={i} className={`flex items-center justify-between p-3 rounded-xl transition-all ${getGlassCardClass(darkMode)}`}>
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => { handleVisitProfile(u.alias); setFollowModalOpen(false); }}>
                           {u.avatar_url ? (
                              <img src={u.avatar_url} className="w-10 h-10 md:w-8 md:h-8 rounded-full object-cover border border-white/10 shadow-md" alt={u.alias} />
                           ) : (
                              <div className="w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-black text-xs md:text-[10px] border border-white/10 shadow-inner" style={{ background: getAvatarGradient(u.alias) }}>
                                 {u.alias?.charAt(0).toUpperCase()}
                              </div>
                           )}
                           <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base md:text-sm leading-none">{u.country || '🏳️'}</span>
                                <span className={`text-[11px] md:text-[10px] font-black uppercase ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{u.alias}</span>
                              </div>
                              {u.isNew && <span className="text-[9px] md:text-[7px] font-black text-red-500 uppercase mt-0.5 tracking-widest animate-pulse">New Node</span>}
                           </div>
                        </div>
                        {u.id !== userData.id && (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleFollow(u.alias); }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] md:text-[8px] font-black uppercase tracking-widest transition-all shrink-0 shadow-md active:scale-95 ${
                              (userData.following || []).includes(u.id)
                                ? (darkMode ? 'bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-500' : 'bg-zinc-200 border border-zinc-300 text-zinc-500 hover:text-red-500')
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:brightness-110 border border-blue-400/30'
                            }`}
                          >
                             {(userData.following || []).includes(u.id) ? 'Unfollow' : 'Follow'}
                          </button>
                        )}
                     </div>
                   )) : (
                     <p className="text-center text-[11px] md:text-[9px] opacity-40 uppercase py-10 font-bold italic">No connections found in current node</p>
                   )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center mb-10 text-center pt-24 px-4 max-w-2xl mx-auto relative z-10">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/20 blur-[100px] pointer-events-none z-0"></div>
            <img 
              src="/Logo.png" 
              alt="Gain Wave Logo" 
              className="h-32 md:h-48 w-auto object-contain transition-all duration-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)] relative z-10" 
            />
            
            <p className={`mt-6 text-xs md:text-[12px] font-black uppercase tracking-[0.6em] transition-colors duration-500 relative z-10 drop-shadow-md ${
              darkMode ? 'text-blue-300/80' : 'text-blue-600/80'
            }`}>
              Where the word becomes profit.
            </p>
          </div>

          {!isLoggedIn ? (
            <AuthView 
              isRegistering={isRegistering} setIsRegistering={setIsRegistering}
              userData={userData} setUserData={setUserData}
              handleRegister={handleRegister} 
              handleLogin={handleLogin} prices={{ btc: prices['BTCUSDT'] || 0, eth: prices['ETHUSDT'] || 0, ...prices }}
              loginAlias={loginAlias} setLoginAlias={setLoginAlias}
              loginPassword={loginPassword} setLoginPassword={setLoginPassword}
              loginError={loginError} darkMode={darkMode}
              handleResetPassword={handleResetPassword}
            />
          ) : (
            <div className="w-full animate-in fade-in duration-700 overflow-visible relative z-20">
              
              {showRiskCalc && (
                <div className="fixed inset-0 z-[500] flex items-start md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                  <div className={`my-auto w-full max-w-md p-6 md:p-8 rounded-[2.5rem] animate-in zoom-in-95 duration-300 transition-all ${getGlassPanelClass(darkMode)}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-sm font-black uppercase tracking-widest text-blue-500 drop-shadow-sm">Risk Management</h2>
                      <button type="button" onClick={() => { setShowRiskCalc(false); setCalcResult(null); }} className="text-xs opacity-50 hover:opacity-100 transition-opacity">CLOSE</button>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <label className="text-[11px] md:text-[9px] font-black uppercase opacity-60 mb-2 block ml-1">Account Balance ($)</label>
                        <input 
                            type="number" 
                            value={riskData.balance} 
                            onChange={(e) => setRiskData({...riskData, balance: e.target.value})} 
                            className={`w-full p-4 md:p-3 rounded-[1.2rem] outline-none text-base md:text-sm font-mono transition-all ${getSunkenClass(darkMode)} ${darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'}`} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] md:text-[9px] font-black uppercase opacity-60 mb-2 block ml-1">Risk %</label>
                          <input 
                            type="number" 
                            value={riskData.riskPct} 
                            onChange={(e) => setRiskData({...riskData, riskPct: e.target.value})}
                            className={`w-full p-4 md:p-3 rounded-[1.2rem] outline-none text-base md:text-sm font-mono transition-all ${getSunkenClass(darkMode)} ${darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'}`} 
                          />
                        </div>
                        <div>
                          <label className="text-[11px] md:text-[9px] font-black uppercase opacity-60 mb-2 block ml-1">Stop Loss (Pips)</label>
                          <input 
                            type="number" 
                            value={riskData.pips} 
                            onChange={(e) => setRiskData({...riskData, pips: e.target.value})} 
                            className={`w-full p-4 md:p-3 rounded-[1.2rem] outline-none text-base md:text-sm font-mono transition-all ${getSunkenClass(darkMode)} ${darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'}`} 
                          />
                        </div>
                      </div>
                      <button type="button" onClick={calculatePositionSize} className="w-full py-5 md:py-4 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-xs md:text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.4)] border border-blue-400/30">
                        Calculate Position
                      </button>
                      {calcResult !== null && (
                        <div className={`mt-6 p-6 rounded-2xl text-center animate-in fade-in slide-in-from-top-2 ${getGlassCardClass(darkMode)} border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]`}>
                          <span className="text-[11px] md:text-[9px] font-black uppercase text-blue-500 block mb-1 drop-shadow-sm">Recommended Lot Size</span>
                          <span className={`text-4xl md:text-3xl font-black font-mono tracking-tighter drop-shadow-sm ${darkMode ? 'text-white' : 'text-black'}`}>{calcResult} Lots</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="max-w-2xl mx-auto mb-10 w-full px-4 relative z-20">
                <SearchBar 
                  onSearch={setSearchTerm} 
                  posts={posts}
                  allUsers={allProfiles} 
                  onVisitProfile={handleVisitProfile}
                  darkMode={darkMode} 
                />
              </div>

              <div className={`grid gap-8 mt-6 ${activeTab === 'profile' ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1'}`}>
                
                {activeTab === 'profile' && (
                  <div className="md:col-span-1 space-y-4">
                    <ProfileSidebar 
                      userData={(viewingAlias && viewingAlias !== userData.alias) 
                        ? { 
                            id: posts.find(p => p.authorAlias === viewingAlias)?.user_id || allProfiles.find(p => p.alias === viewingAlias)?.id || '', 
                            alias: viewingAlias, 
                            bio: allProfiles.find(p => p.alias === viewingAlias)?.bio || "Terminal Node", 
                            avatar: posts.find(p => p.authorAlias === viewingAlias)?.authorAvatar || allProfiles.find(p => p.alias === viewingAlias)?.avatar || null,
                            country: posts.find(p => p.authorAlias === viewingAlias)?.authorCountry || allProfiles.find(p => p.alias === viewingAlias)?.country || '🏳️',
                            style: allProfiles.find(p => p.alias === viewingAlias)?.style || 'Trader', 
                            market: 'Global',
                            myfxbook: allProfiles.find(p => p.alias === viewingAlias)?.myfxbook_url || '',
                            total_gain: allProfiles.find(p => p.alias === viewingAlias)?.total_gain || 0,
                            max_drawdown: allProfiles.find(p => p.alias === viewingAlias)?.max_drawdown || 0,
                            win_rate: allProfiles.find(p => p.alias === viewingAlias)?.win_rate || 0,
                            verify_source: allProfiles.find(p => p.alias === viewingAlias)?.verify_source || 'manual',
                            subscription_price: allProfiles.find(p => p.alias === viewingAlias)?.subscription_price || 0,
                            is_premium: allProfiles.find(p => p.alias === viewingAlias)?.is_premium || false,
                            is_institutional: allProfiles.find(p => p.alias === viewingAlias)?.is_institutional || false,
                            is_developer: allProfiles.find(p => p.alias === viewingAlias)?.is_developer || false,
                            is_live: allProfiles.find(p => p.alias === viewingAlias)?.is_live || false, 
                            live_stream_url: allProfiles.find(p => p.alias === viewingAlias)?.live_stream_url || null 
                          } 
                        : userData
                      } 
                      setUserData={setUserData}
                      isEditing={isEditing} 
                      setIsEditing={setIsEditing}
                      handleLogout={handleLogout} 
                      setActiveTab={setActiveTab} 
                      activeTab={activeTab}
                      handleSaveProfile={handleSaveProfile} 
                      darkMode={darkMode}
                      messages={messages}
                      setActiveChat={setActiveChat}
                      followersCount={followersCount}
                      followingCount={followingCount}
                      onFollowersClick={() => handleOpenFollowList('followers')}
                      onFollowingClick={() => handleOpenFollowList('following')}
                      setViewingAlias={setViewingAlias}
                      hasNotification={hasNewMessage} 
                      isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                      activeSubTab={activeSubTab}
                      setActiveSubTab={setActiveSubTab}
                      onOpenRiskCalc={() => setShowRiskCalc(true)}
                      onVisitProfile={handleVisitProfile} 
                      handleStripePurchase={handleStripePurchase} 
                    />

                    {viewingAlias && viewingAlias !== userData.alias && (
                      <div className="flex flex-col gap-3 animate-in fade-in duration-500 px-2 mt-4">
                        <button 
                          type="button"
                          onClick={() => handleFollow(viewingAlias)}
                          className={`w-full py-4 md:py-3 rounded-2xl text-[11px] md:text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                            isFollowingViewingUser
                              ? getGlassCardClass(darkMode) + ' !text-zinc-500'
                              : 'bg-gradient-to-r from-indigo-600 to-indigo-700 border border-indigo-400/30 text-white hover:brightness-110 shadow-[0_10px_20px_rgba(79,70,229,0.4)]'
                          }`}
                        >
                          {isFollowingViewingUser ? '✓ Following' : '➕ Follow Node'}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setActiveChat(viewingAlias)}
                          className="w-full py-4 md:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-[11px] md:text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all border border-blue-400/30 shadow-[0_10px_20px_rgba(37,99,235,0.4)] active:scale-95"
                        >
                          ✉️ Send Message
                        </button>
                      </div>
                    )}
                    
                    {(!viewingAlias || viewingAlias === userData.alias) && (
                      <div className="px-2 mt-6 flex flex-col gap-2">
                        <button 
                          onClick={handleLogout}
                          className={`w-full py-4 md:py-3 text-red-500 rounded-2xl text-[10px] md:text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 ${getGlassCardClass(darkMode)} hover:!border-red-500/50 hover:!shadow-[0_0_15px_rgba(239,68,68,0.2)]`}
                        >
                          🚪 Logout
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className={(activeTab === 'profile') ? 'md:col-span-3 w-full' : 'w-full'}>
                  {activeTab === 'terminal' ? (
                    <div className="animate-in fade-in duration-700 w-full mb-32">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className={`text-[11px] md:text-[10px] font-black uppercase tracking-[0.4em] ${darkMode ? 'text-blue-500' : 'text-blue-600'} drop-shadow-sm`}>
                          Market Terminal Analysis
                        </h3>
                        <button onClick={() => setActiveTab('feed')} className="text-[11px] md:text-[9px] font-black uppercase opacity-60 hover:opacity-100 transition-opacity">Back to Feed</button>
                      </div>
                      <TradingViewChart 
                        darkMode={darkMode} 
                        isPro={isPro} 
                        onShareToFeed={() => { setActiveTab('feed'); setViewingAlias(null); }}
                      />
                    </div>
                  ) : activeTab === 'assets' ? (
                    <div className="animate-in fade-in duration-500 w-full mb-32">
                        <AssetRegistry 
                            darkMode={darkMode} 
                            onViewProject={(project: any) => setActiveProject(project)} 
                        />
                    </div>
                  ) : activeTab === 'feed' ? (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-4xl mx-auto w-full">
                      
                      {allProfiles.filter(p => p.is_live && p.live_stream_url).length > 0 && (
                        <div className="w-full max-w-4xl mx-auto animate-in slide-in-from-top-2 duration-500 mb-2 mt-2">
                          <div className="flex items-center gap-2 mb-4 px-2">
                            <div className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
                            <h3 className={`text-xs md:text-[10px] font-black uppercase tracking-[0.3em] text-red-500 drop-shadow-sm`}>
                              Active Transmissions
                            </h3>
                          </div>
                          
                          <div className="flex gap-4 overflow-x-auto no-scrollbar px-2 pb-4 snap-x">
                            {allProfiles.filter(p => p.is_live && p.live_stream_url).map(node => (
                              <button 
                                key={node.id}
                                onClick={() => setActiveStream({ url: node.live_stream_url, name: node.alias })}
                                className="flex flex-col items-center gap-2 shrink-0 snap-center group transition-all hover:-translate-y-1"
                              >
                                <div className="relative">
                                  <div className="absolute -inset-1 bg-gradient-to-tr from-red-600 to-orange-500 rounded-[1.2rem] animate-pulse blur-[5px] opacity-70 group-hover:opacity-100 transition-opacity"></div>
                                  
                                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-red-700 text-white text-[8px] md:text-[7px] font-black uppercase tracking-widest px-2 md:px-1.5 py-1 md:py-0.5 rounded-md border border-white/20 z-10 shadow-[0_5px_15px_rgba(239,68,68,0.8)]">
                                    LIVE
                                  </div>
                                  
                                  {node.avatar ? (
                                     <img src={node.avatar} className={`relative w-20 h-20 md:w-16 md:h-16 object-cover rounded-[1.1rem] border-2 border-white/10 shadow-inner`} alt={node.alias} />
                                  ) : (
                                     <div className={`relative w-20 h-20 md:w-16 md:h-16 flex items-center justify-center rounded-[1.1rem] border-2 border-white/10 text-white font-black text-3xl md:text-2xl shadow-inner`} style={{ background: getAvatarGradient(node.alias) }}>
                                       {node.alias?.charAt(0).toUpperCase()}
                                     </div>
                                  )}
                                </div>
                                <span className={`text-[11px] md:text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-zinc-900'} drop-shadow-sm mt-1`}>
                                  {node.alias.length > 8 ? node.alias.substring(0, 8) + '...' : node.alias}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="w-full max-w-4xl mx-auto animate-in slide-in-from-top-4 duration-1000">

                        <div className="w-full space-y-6">
                          
                          {/* 🔥 NOVI RADAR BLOCK Z EXTREME 3D GLASS 🔥 */}
                          <div className={`p-6 md:p-6 rounded-[2.5rem] transition-all duration-500 relative overflow-hidden ${getGlassPanelClass(darkMode)}`}>
                            
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-[60px] pointer-events-none z-0"></div>

                            <div className="flex items-center justify-between mb-6 px-2 relative z-10">
                              <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_12px_#22c55e]" />
                                <h3 className={`text-xs md:text-[9px] font-black uppercase tracking-[0.3em] ${darkMode ? 'text-blue-400' : 'text-blue-600'} drop-shadow-sm`}>
                                  Market Radar <span className="opacity-50">(Crypto)</span>
                                </h3>
                              </div>
                              {isPro && (
                                <button onClick={() => setIsEditingRadar(!isEditingRadar)} className="text-[10px] md:text-[9px] font-black uppercase opacity-60 hover:opacity-100 transition-all bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shadow-sm active:scale-95">
                                  {isEditingRadar ? '💾 Done' : '⚙️ Setup'}
                                </button>
                              )}
                            </div>

                            {isEditingRadar && isPro && (
                              <div className={`mb-6 p-5 rounded-[1.5rem] animate-in slide-in-from-top-2 duration-300 relative z-10 ${getGlassCardClass(darkMode)}`}>
                                <p className="text-[9px] font-bold uppercase opacity-60 mb-3 ml-1">Search & Add Pair (max 4)</p>
                                
                                <div className="relative flex flex-col gap-3">
                                  <div className="flex gap-3">
                                    <input 
                                      value={radarInput}
                                      onChange={(e) => setRadarInput(e.target.value.toUpperCase())}
                                      placeholder="Type symbol (e.g. BTC, SOL, PEPE...)"
                                      className={`flex-1 p-4 rounded-2xl text-xs font-mono outline-none transition-all ${getSunkenClass(darkMode)} ${darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'}`}
                                    />
                                    <button 
                                      onClick={async () => {
                                        const cleanInput = radarInput.includes('USDT') ? radarInput : radarInput + 'USDT';
                                        if (!radarInput || activePairs.length >= 4 || activePairs.includes(cleanInput)) return;
                                        const newPairs = [...activePairs, cleanInput];
                                        setActivePairs(newPairs);
                                        setRadarInput('');
                                        await supabase.from('profiles').update({ radar_pairs: newPairs }).eq('id', userData.id);
                                      }}
                                      className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-[10px] uppercase rounded-2xl hover:brightness-110 shadow-[0_10px_20px_rgba(37,99,235,0.4)] active:scale-95 border border-blue-400/30 transition-all"
                                    >
                                      Add
                                    </button>
                                  </div>

                                  {/* 🔥 AUTOCOMPLETE SEZNAM 🔥 */}
                                  {radarInput.length >= 1 && (
                                    <div className={`absolute top-[60px] left-0 right-24 z-[100] max-h-48 overflow-y-auto rounded-[1.5rem] shadow-2xl backdrop-blur-2xl border ${darkMode ? 'bg-zinc-900/90 border-zinc-700/50' : 'bg-white/95 border-zinc-200/50'}`}>
                                      {["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT", "PEPEUSDT", "SHIBUSDT", "LTCUSDT", "NEARUSDT", "TIAUSDT", "INJUSDT", "OPUSDT", "ARBUSDT", "APTUSDT", "RNDRUSDT", "SUIUSDT"]
                                        .filter(symbol => symbol.includes(radarInput) && !activePairs.includes(symbol))
                                        .map(symbol => (
                                          <button
                                            key={symbol}
                                            onClick={async () => {
                                              if (activePairs.length >= 4) {
                                                toast.error("Maximum 4 pairs allowed");
                                                return;
                                              }
                                              const newPairs = [...activePairs, symbol];
                                              setActivePairs(newPairs);
                                              setRadarInput('');
                                              await supabase.from('profiles').update({ radar_pairs: newPairs }).eq('id', userData.id);
                                              toast.success(`${symbol} added to Radar`);
                                            }}
                                            className={`w-full text-left px-5 py-4 text-[10px] font-black tracking-widest hover:bg-blue-600 hover:text-white transition-colors border-b last:border-0 ${darkMode ? 'border-zinc-800/50 text-zinc-300' : 'border-zinc-200/50 text-zinc-600'}`}
                                          >
                                            + {symbol.replace('USDT', '')} <span className="opacity-40 text-[8px] ml-1">/ USDT</span>
                                          </button>
                                        ))}
                                    </div>
                                  )}
                                </div>

                                {/* Seznam trenutno izbranih parov (za brisanje) */}
                                <div className="flex flex-wrap gap-2 mt-5">
                                  {activePairs.map(p => (
                                    <div key={p} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black font-mono shadow-inner animate-in zoom-in-90 ${getSunkenClass(darkMode)} border-none !bg-black/30`}>
                                      <span className={darkMode ? 'text-white' : 'text-blue-600'}>{p.replace('USDT', '')}</span>
                                      <button onClick={async () => {
                                        const newPairs = activePairs.filter(pair => pair !== p);
                                        setActivePairs(newPairs);
                                        await supabase.from('profiles').update({ radar_pairs: newPairs }).eq('id', userData.id);
                                        toast.info("Pair removed");
                                      }} className="text-red-500 hover:text-red-400 font-bold ml-1 hover:scale-125 transition-transform">✕</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                              {activePairs.map(symbol => {
                                const pairLabel = symbol.replace('USDT', '/USD');
                                const pFlash = priceFlash[symbol] || '';
                                const pValue = prices[symbol];

                                return (
                                  <div key={symbol} className={`flex-1 flex flex-col items-center md:items-start justify-center p-5 md:p-4 rounded-[1.5rem] transition-all duration-300 relative overflow-hidden ${getGlassCardClass(darkMode)} ${
                                    pFlash === 'text-green-500' ? '!border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)] -translate-y-1' : 
                                    pFlash === 'text-red-500' ? '!border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] -translate-y-1' : ''
                                  }`}>
                                    <span className={`text-[11px] md:text-[9px] font-black uppercase tracking-widest mb-1.5 drop-shadow-sm ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{pairLabel}</span>
                                    <span className={`text-base md:text-[13px] font-mono font-black tracking-tighter drop-shadow-md ${pFlash || (darkMode ? 'text-white' : 'text-black')}`}>
                                      {pValue ? `$${pValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : 'Loading...'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className={`md:col-span-1 flex items-center justify-around px-2 py-6 md:py-5 rounded-[2.5rem] transition-all duration-500 relative overflow-hidden ${getGlassPanelClass(darkMode)}`}>
                                <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent z-0"></div>
                                <div className="relative z-10 flex w-full justify-around">
                                  <AnalogClock label="TKY" timezone="Asia/Tokyo" darkMode={darkMode} />
                                  <AnalogClock label="LON" timezone="Europe/London" darkMode={darkMode} />
                                  <AnalogClock label="NYC" timezone="America/New_York" darkMode={darkMode} />
                                </div>
                              </div>

                              <div className={`md:col-span-2 p-6 md:p-5 rounded-[2.5rem] transition-all duration-700 relative overflow-hidden ${getGlassPanelClass(darkMode)} ${
                                alertSeverity === 'critical' ? '!bg-red-950/40 !border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : ''
                              }`}>
                                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[50px] pointer-events-none z-0"></div>
                                  <div className="relative z-10">
                                    <div className="flex items-center gap-2.5 mb-5 md:mb-4">
                                        <div className={`h-2.5 w-2.5 md:h-2 md:w-2 rounded-full ${alertSeverity === 'critical' ? 'bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]' : 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'}`} />
                                        <h3 className={`text-[11px] md:text-[9px] font-black uppercase tracking-[0.2em] drop-shadow-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>Live Intel Feed</h3>
                                    </div>
                                    <div className="flex gap-4 md:gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1">
                                        {marketAlerts.length > 0 ? marketAlerts.slice(0, 3).map((alert, idx) => (
                                            <div key={idx} className={`flex-shrink-0 w-72 md:w-64 p-4 md:p-3 rounded-2xl transition-all hover:-translate-y-1 ${getGlassCardClass(darkMode)}`}>
                                                <p className={`text-[12px] md:text-[10px] font-bold leading-relaxed line-clamp-2 ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{alert.message}</p>
                                            </div>
                                        )) : <p className="text-[10px] md:text-[9px] opacity-40 italic font-bold">Waiting for market intel...</p>}
                                    </div>
                                  </div>
                              </div>
                          </div>

                          <div className="space-y-6 w-full mt-10 relative z-20">
                            <GlobalFeed 
                              posts={posts} 
                              boostedPosts={activeAds} 
                              userData={userData} 
                              handleVote={handleVote} 
                              handleFollow={handleFollow} 
                              darkMode={darkMode} 
                              onVisitProfile={handleVisitProfile} 
                              handleDeletePost={handleDeletePost}
                              handleUnlock={handleSubscribeToTrader} 
                              handleSignalAction={handleSignalAction}
                              onViewProject={handleViewProject} 
                              onJoinHub={handleJoinHub}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : activeTab === 'community' ? (
                    <div className="animate-in fade-in duration-500 w-full mb-32 relative z-20">
                      <CommunityView 
                        userData={userData} 
                        darkMode={darkMode} 
                        onBack={() => setActiveTab('feed')}
                        isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                        viewingId={viewingAlias ? (allProfiles.find(p => p.alias === viewingAlias)?.id) : userData.id}
                        setActiveChat={setActiveChat} 
                        pinnedHubs={pinnedHubs} 
                        togglePin={togglePin}   
                      />
                    </div>
                  ) : activeTab === 'forge' ? (
                    <div className="animate-in fade-in duration-500 w-full mb-32 relative z-20">
                      <TokenArchitect 
                        userData={userData} 
                        darkMode={darkMode} 
                        onBack={() => setActiveTab('feed')} 
                      />
                    </div>
                  ) : activeTab === 'game' ? (
                    <div className="animate-in fade-in duration-500 w-full mb-32 relative z-20">
                      <AIGameStudio 
                        userData={userData} 
                        darkMode={darkMode} 
                      />
                    </div>
                  ) : activeTab === 'academy' ? (
                    <div className="animate-in fade-in duration-500 w-full mb-32 relative z-20">
                      <AcademyView darkMode={darkMode} userData={userData} />
                    </div>
                  ) : (
                    <div className="animate-in fade-in duration-500 space-y-6 w-full relative z-20">
                      <div className="w-full overflow-visible pb-32">
                        {activeSubTab === 'info' ? (
                          <FeedView 
                            userData={(viewingAlias && viewingAlias !== userData.alias) 
                              ? { 
                                  alias: viewingAlias, 
                                  bio: allProfiles.find(p => p.alias === viewingAlias)?.bio || 'Terminal Node', 
                                  avatar: posts.find(p => p.authorAlias === viewingAlias)?.authorAvatar || allProfiles.find(p => p.alias === viewingAlias)?.avatar || null,
                                  country: posts.find(p => p.authorAlias === viewingAlias)?.authorCountry || allProfiles.find(p => p.alias === viewingAlias)?.country || '🏳️',
                                  win_rate: allProfiles.find(p => p.alias === viewingAlias)?.win_rate || 0,
                                  total_gain: allProfiles.find(p => p.alias === viewingAlias)?.total_gain || 0,
                                  total_profit: allProfiles.find(p => p.alias === viewingAlias)?.total_profit || 0,
                                  verify_source: allProfiles.find(p => p.alias === viewingAlias)?.verify_source || 'manual',
                                  is_premium: allProfiles.find(p => p.alias === viewingAlias)?.is_premium || false,
                                  is_institutional: allProfiles.find(p => p.alias === viewingAlias)?.is_institutional || false 
                                } 
                              : userData
                            }
                            posts={posts.filter(p => {
                              if (viewingAlias && viewingAlias !== userData.alias) {
                                return p.authorAlias === viewingAlias;
                              }
                              return p.authorAlias === userData.alias; 
                            })} 
                            onBack={() => { setViewingAlias(null); setActiveTab('feed'); }}
                            handleAddPost={handleAddPost} 
                            newPost={newPost} 
                            setNewPost={setNewPost}
                            handleImageChange={(e) => {
                              if (e.target.files?.[0]) {
                                const reader = new FileReader();
                                reader.onload = (event) => setSelectedImage(event.target?.result as string);
                                reader.readAsDataURL(e.target.files[0]);
                              }
                            }}
                            selectedImage={selectedImage} 
                            darkMode={darkMode} 
                            handleVote={handleVote} 
                            isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                            handleDeletePost={handleDeletePost}
                            isPremium={isPremium}
                            setIsPremium={setIsPremium}
                            priceBulls={priceBulls}
                            setPriceBulls={setPriceBulls}
                            handleSignalAction={handleSignalAction}
                            isCopyable={isCopyable}        
                            setIsCopyable={setIsCopyable}  
                          />
                        ) : activeSubTab === 'journal' ? ( 
                          <TradingJournal 
                            userId={(viewingAlias && viewingAlias !== userData.alias) ? (posts.find(p => p.authorAlias === viewingAlias)?.user_id || allProfiles.find(p => p.alias === viewingAlias)?.id) : userData.id}
                            isOwnProfile={!viewingAlias || viewingAlias === userData.alias}
                            darkMode={darkMode}
                          />
                        ) : ( 
                          <WalletView 
                            userData={userData} 
                            darkMode={darkMode} 
                            onPromote={() => setIsAdModalOpen(true)}
                            setActiveChat={setActiveChat} 
                            updateUserBalance={updateUserBalance} 
                            handleStripePurchase={handleStripePurchase}
                            onPanicKill={handlePanicKill}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeChat && (
            <div className={`fixed bottom-[95px] md:bottom-4 right-2 left-2 md:left-auto md:w-[400px] h-[75vh] md:h-[600px] max-h-[800px] z-[1001] rounded-[2.5rem] animate-in slide-in-from-bottom-5 duration-300 overflow-hidden flex flex-col transition-all ${getGlassPanelClass(darkMode)}`}>
              <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 flex justify-between items-center text-white shrink-0 border-b border-blue-400/30">
                <div className="flex flex-col">
                  <span className="text-xs md:text-[11px] font-black uppercase tracking-widest text-white drop-shadow-md">Terminal Chat</span>
                  <span className="text-[10px] md:text-[9px] opacity-90 uppercase font-bold text-blue-100">Line to {activeChat}</span>
                </div>
                <button type="button" onClick={() => { setActiveChat(null); setReplyingToMsg(null); setEditingMsgId(null); setChatInput(""); }} className="text-lg md:text-base hover:rotate-90 transition-transform p-1">✕</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative overscroll-contain" onClick={() => setActiveMessageMenu(null)}>
                {messages.filter(m => (m.from_alias === userData.alias && m.to_alias === activeChat) || (m.from_alias === activeChat && m.to_alias === userData.alias))
                  .map(m => {
                    const isMe = m.from_alias === userData.alias;
                    const isVipInvite = m.text.includes('⚜️ VIP ACCESS GRANTED ⚜️');
                    const isHubInvite = m.text.includes('🔥 Join my Hub!'); 
                    const isImage = m.text.startsWith('[IMG]');
                    const isReply = m.text.startsWith('> Replying to');
                    
                    let mainText = m.text;
                    let replyBlock = null;
                    if (isReply) {
                      const parts = m.text.split('\n\n');
                      replyBlock = parts[0];
                      mainText = parts.slice(1).join('\n\n');
                    }
                    
                    return (
                      <div key={m.id} className={`relative max-w-[90%] p-4 md:p-3 rounded-2xl text-[13px] md:text-[11px] font-medium transition-all duration-300 flex flex-col ${
                        isVipInvite
                          ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-black self-center border border-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.4)] my-2'
                          : isHubInvite
                          ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 text-white self-center border border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)] my-2'
                          : isMe 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white self-end rounded-br-none shadow-[0_10px_20px_rgba(37,99,235,0.3)] border border-blue-400/30' 
                          : (darkMode ? 'bg-zinc-800/80 text-zinc-200 self-start rounded-bl-none border border-zinc-700/50 backdrop-blur-md shadow-md' : 'bg-white/90 text-zinc-900 self-start rounded-bl-none border border-zinc-200/50 shadow-md backdrop-blur-md')
                      }`}>
                        
                        {!isVipInvite && !isHubInvite && (
                          <div className={`absolute top-2 ${isMe ? '-left-6' : '-right-6'} opacity-50 hover:opacity-100 cursor-pointer p-1`} onClick={(e) => { e.stopPropagation(); setActiveMessageMenu(activeMessageMenu === m.id ? null : m.id); }}>
                            <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                          </div>
                        )}

                        {replyBlock && (
                          <div className={`text-[10px] md:text-[9px] pl-2 border-l-2 mb-2 italic opacity-80 ${isMe ? 'border-white text-white' : 'border-blue-500'}`}>
                            {replyBlock.replace(/> /g, '')}
                          </div>
                        )}

                        {isImage ? (
                          <div className="mt-1 mb-1">
                            <img src={mainText.replace('[IMG]', '')} alt="Chat Image" className="rounded-lg max-w-full h-auto object-contain cursor-pointer border border-white/10" onClick={() => window.open(mainText.replace('[IMG]', ''), '_blank')} />
                          </div>
                        ) : (
                          <p className={`whitespace-pre-wrap break-words ${isVipInvite || isHubInvite ? 'text-center font-black text-[13px] md:text-[12px] leading-relaxed' : 'leading-relaxed'}`}>
                            {mainText.split(/(https?:\/\/[^\s]+)/g).map((part: any, i: number) => {
                              if (part.match(/^https?:\/\//)) {
                                const isChannelLink = part.includes('?channel=') || part.includes('?hub=');
                                return (
                                  <a key={i} href={part} onClick={(e) => { if (isChannelLink) { e.preventDefault(); window.location.href = part; } }} target={isChannelLink ? "_self" : "_blank"} rel="noopener noreferrer" className={isVipInvite ? "block mt-4 bg-black text-yellow-400 px-5 py-3 rounded-xl border border-yellow-500/50 hover:bg-zinc-900 hover:scale-105 transition-all text-xs text-center shadow-lg cursor-pointer" : isHubInvite ? "block mt-4 bg-black text-indigo-300 px-5 py-3 rounded-xl border border-indigo-500/50 hover:bg-zinc-900 hover:scale-105 transition-all text-xs text-center shadow-lg cursor-pointer" : "text-yellow-400 underline hover:text-yellow-300 font-bold cursor-pointer drop-shadow-sm"}>
                                    {isVipInvite ? "🔑 ENTER VIP NODE" : isHubInvite ? "🤝 JOIN FREE HUB" : part}
                                  </a>
                                );
                              }
                              return part;
                            })}
                          </p>
                        )}
                        <div className={`flex items-center justify-end gap-1.5 mt-2 select-none ${isVipInvite || isHubInvite ? 'opacity-80' : 'opacity-60'}`}>
                          <span className={`text-[10px] md:text-[9px] font-mono ${isVipInvite ? 'text-black font-bold' : isHubInvite ? 'text-white font-bold' : ''}`}>
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </span>
                          {isMe && (
                            <div className="flex items-center ml-0.5">
                              {m.is_read ? <span className={isVipInvite ? "text-black font-black text-[11px]" : isHubInvite ? "text-white font-black text-[11px]" : "text-blue-300 font-black text-[11px] drop-shadow-[0_0_3px_rgba(147,197,253,0.8)]"}>✓✓</span> : <span className={isVipInvite ? "text-black/50 text-[11px]" : isHubInvite ? "text-white/50 text-[11px]" : "text-zinc-300 opacity-50 text-[11px]"}>✓</span>}
                            </div>
                          )}
                        </div>

                        {activeMessageMenu === m.id && (
                          <div className={`mt-3 pt-3 flex gap-2 border-t ${isMe ? 'border-blue-400/30' : darkMode ? 'border-zinc-700/50' : 'border-zinc-300/50'} animate-in fade-in slide-in-from-top-2 duration-200`}>
                            <button onClick={(e) => { e.stopPropagation(); setReplyingToMsg(m); setActiveMessageMenu(null); }} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isMe ? 'bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm' : darkMode ? 'bg-zinc-700/50 hover:bg-zinc-600/50 text-white backdrop-blur-sm' : 'bg-zinc-200/50 hover:bg-zinc-300/50 text-black backdrop-blur-sm'}`}>↩️ Reply</button>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(m.text); toast.success('Text copied!'); setActiveMessageMenu(null); }} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${isMe ? 'bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm' : darkMode ? 'bg-zinc-700/50 hover:bg-zinc-600/50 text-white backdrop-blur-sm' : 'bg-zinc-200/50 hover:bg-zinc-300/50 text-black backdrop-blur-sm'}`}>↪️ Copy</button>
                            {isMe && !isImage && (
                              <button onClick={(e) => { e.stopPropagation(); setEditingMsgId(m.id); setChatInput(mainText); setActiveMessageMenu(null); }} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all bg-yellow-500/80 hover:bg-yellow-400 text-black backdrop-blur-sm`}>✏️ Edit</button>
                            )}
                          </div>
                        )}

                      </div>
                    )
                  })}
                <div ref={privateMessagesEndRef} />
              </div>

              {(replyingToMsg || editingMsgId) && (
                <div className={`px-4 py-2 border-t border-b text-[10px] flex justify-between items-center ${darkMode ? 'bg-zinc-900/60 border-zinc-800/50 text-blue-300 backdrop-blur-md' : 'bg-white/80 border-zinc-200/50 text-blue-600 backdrop-blur-md'}`}>
                  <span className="font-bold truncate pr-4">
                    {editingMsgId ? '✏️ Editing message...' : `↩️ Replying to ${replyingToMsg.from_alias}: ${replyingToMsg.text.substring(0,20)}...`}
                  </span>
                  <button onClick={() => { setReplyingToMsg(null); setEditingMsgId(null); setChatInput(""); }} className="font-black hover:scale-110 transition-transform">✕</button>
                </div>
              )}

              <div className={`px-4 py-3 border-t flex gap-3 overflow-x-auto no-scrollbar shrink-0 ${darkMode ? 'border-zinc-800/50 bg-zinc-900/60 backdrop-blur-md' : 'border-zinc-200/50 bg-white/80 backdrop-blur-md'}`}>
                {['🐂','🐻','📈','📉','🚀','💰','💎','🔥','🎯'].map(emoji => (
                  <button key={emoji} onClick={() => setChatInput(prev => prev + emoji)} className="text-xl md:text-lg hover:scale-125 transition-transform drop-shadow-sm">{emoji}</button>
                ))}
              </div>
              
              <div className={`p-4 shrink-0 flex flex-col gap-3 rounded-b-[2.5rem] ${darkMode ? 'bg-zinc-950/80 backdrop-blur-xl' : 'bg-white/90 backdrop-blur-xl'}`}>
                <textarea 
                  value={chatInput} 
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    e.target.style.height = 'inherit';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault(); 
                      sendPrivateMessage();
                      e.currentTarget.style.height = '45px';
                    }
                  }}
                  placeholder="Type a message..." 
                  className={`w-full rounded-2xl px-4 py-3 text-[15px] md:text-xs outline-none font-medium resize-none min-h-[45px] max-h-[120px] custom-scrollbar transition-all ${getSunkenClass(darkMode)} ${darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'}`} 
                  rows={1}
                />
                
                <div className="flex justify-between items-center px-1">
                  <div className="flex gap-4 items-center">
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleChatImageUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-2xl opacity-70 hover:opacity-100 hover:scale-110 transition-all drop-shadow-sm" title="Upload Image">
                      🖼️
                    </button>
                    <button type="button" onClick={sendHubInvite} className="text-2xl opacity-70 hover:opacity-100 hover:scale-110 transition-all drop-shadow-sm" title="Invite to Hub">
                      🔗
                    </button>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={sendPrivateMessage} 
                    disabled={!chatInput.trim()}
                    className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white font-black text-xs md:text-[10px] px-6 py-2.5 rounded-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_20px_rgba(37,99,235,0.3)] border border-blue-400/30 ${!chatInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    SEND
                  </button>
                </div>
              </div>
            </div>
          )}

          <AdCreatorModal 
            isOpen={isAdModalOpen} 
            onClose={() => setIsAdModalOpen(false)} 
            onLaunch={handleLaunchAd}
            darkMode={darkMode}
            balance={userData.gains_balance}
          />

                  <div className="fixed bottom-24 right-6 z-[800] md:bottom-10 md:right-10">
            <button 
              onClick={() => {
                setActiveChat('GainWaveSupport');
                setShowMobileInbox(false);
              }}
              className="w-14 h-14 bg-gradient-to-tr from-[#FF00FF] to-[#89CFF0] rounded-full shadow-[0_0_30px_rgba(255,0,255,0.6)] flex items-center justify-center hover:scale-110 transition-all active:scale-95 group border-2 border-white/20 relative z-50"
            >
              <div className="absolute -top-10 right-0 bg-zinc-900/90 backdrop-blur-md text-white text-[9px] px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 shadow-xl font-black uppercase tracking-widest">
                Contact AI Support ⚡
              </div>
              <svg className="w-6 h-6 text-black drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </div>

         {/* 🔥 DINAMIČNI FOOTER: SKRIT SAMO V HUBU 🔥 */}
          {activeTab !== 'community' && (
            <footer className={`w-full max-w-7xl mx-auto mt-12 mb-6 p-8 rounded-[2.5rem] text-center transition-all pb-24 md:pb-6 relative overflow-hidden ${getGlassPanelClass(darkMode)}`}>
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/5 blur-[80px] pointer-events-none z-0"></div>
              <div className="relative z-10">
                <h4 className="text-xs font-black uppercase tracking-widest mb-4 text-red-500 drop-shadow-sm">⚠️ Institutional Risk Warning</h4>
                <p className={`text-[10px] uppercase opacity-60 leading-relaxed text-justify md:text-center max-w-4xl mx-auto font-medium ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  Trading financial markets involves high risk. GainWave is a technological platform and does not provide financial advice. All trades are at your own discretion. You could lose some or all of your initial capital. Past performance is not indicative of future results.
                </p>
                <div className="flex flex-wrap justify-center gap-6 mt-8 opacity-60 text-[9px] font-black uppercase tracking-[0.2em]">
                  <button onClick={() => alert("Terms of Service: GainWave is a software provider. By using this platform, you agree that you are solely responsible for your financial decisions and the risk associated with trading and investing in Web3 assets.")} className="hover:text-blue-400 transition-colors">Terms of Service</button>
                  <button onClick={() => alert("Privacy Policy: Your data is encrypted. We do not sell your personal information to third parties. Data is used strictly for platform authentication and terminal access.")} className="hover:text-blue-400 transition-colors">Privacy Policy</button>
                  <button onClick={() => alert("Refund Policy: All GAINS purchases and subscriptions are final. Due to the digital nature of the intel and blockchain transactions, we do not offer refunds.")} className="hover:text-blue-400 transition-colors">Refund Policy</button>
                </div>
                <div className="mt-6 pt-6 border-t border-zinc-500/20 text-[9px] font-bold opacity-40">© {new Date().getFullYear()} GAIN WAVE NETWORK. FORGED FOR ELITE TRADERS.</div>
              </div>
            </footer>
          )}

          {isLoggedIn && (
            <div className="md:hidden fixed bottom-4 left-2 right-2 z-[900]">
              <div className={`flex items-center justify-start gap-4 px-4 py-4 rounded-[2.5rem] overflow-x-auto no-scrollbar snap-x snap-mandatory w-full max-w-full transition-all duration-300 ${getGlassPanelClass(darkMode)}`}>
                
                <button onClick={() => { setViewingAlias(null); setActiveTab('feed'); }} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(isFeedActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className={getNavTextClass(isFeedActive)}>Feed</span>
                  {isFeedActive && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => { setViewingAlias(null); setActiveTab('assets'); }} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(activeTab === 'assets')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className={getNavTextClass(activeTab === 'assets')}>Assets</span>
                  {activeTab === 'assets' && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button 
                  onClick={() => userData.is_developer ? setActiveTab('forge') : setActiveTab('terminal')} 
                  className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group"
                >
                  {userData.is_developer ? (
                    <svg className={getNavIconClass(activeTab === 'forge')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className={getNavIconClass(isTerminalActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  )}
                  <span className={getNavTextClass(userData.is_developer ? activeTab === 'forge' : isTerminalActive)}>
                    {userData.is_developer ? 'Forge' : 'Chart'}
                  </span>
                  {(userData.is_developer ? activeTab === 'forge' : isTerminalActive) && (
                    <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />
                  )}
                </button>

                {/* 🔥 NOVI GUMB ZA AKADEMIJO (MOBILNA NAPRAVA) 🔥 */}
                <button onClick={() => setActiveTab('academy')} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(activeTab === 'academy')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  <span className={getNavTextClass(activeTab === 'academy')}>Academy</span>
                  {activeTab === 'academy' && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => setActiveTab('community')} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(activeTab === 'community')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  <span className={getNavTextClass(activeTab === 'community')}>Hubs</span>
                  {myHubs?.some((h: any) => h.hasNew) && <div className="absolute top-0 right-2 w-3 h-3 bg-red-500 border border-zinc-900 rounded-full" />}
                  {activeTab === 'community' && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => setShowMobileInbox(true)} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(isInboxActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className={getNavTextClass(isInboxActive)}>Inbox</span>
                  {messages.filter(m => m.to_alias === userData.alias && !m.is_read).length > 0 && <div className="absolute top-0 right-2 w-3 h-3 bg-red-500 border border-zinc-900 rounded-full animate-pulse" />}
                  {isInboxActive && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button 
                  onClick={() => { 
                    setViewingAlias(userData.alias); 
                    setActiveTab('profile'); 
                    setActiveSubTab('info'); 
                    registerNinjaSync(); 
                  }} 
                  className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group"
                >
                  <svg className={getNavIconClass(isProfileActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={getNavTextClass(isProfileActive)}>Profile</span>
                  {isProfileActive && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => { setActiveTab('profile'); setActiveSubTab('wallet'); }} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(isWalletActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className={getNavTextClass(isWalletActive)}>Wallet</span>
                  {isWalletActive && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => userData.is_developer ? toast.success('Smart Contract Auditor Starting...') : (() => { setActiveTab('profile'); setActiveSubTab('journal'); })()} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  {userData.is_developer ? (
                    <svg className={getNavIconClass(false)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ) : (
                    <svg className={getNavIconClass(isJournalActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  <span className={getNavTextClass(userData.is_developer ? false : isJournalActive)}>
                    {userData.is_developer ? 'Auditor' : 'Journal'}
                  </span>
                  {!userData.is_developer && isJournalActive && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => userData.is_developer ? toast.success('Alpha Scanner Connecting to Market...') : setShowRiskCalc(true)} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  {userData.is_developer ? (
                    <svg className={getNavIconClass(false)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  ) : (
                    <svg className={getNavIconClass(isRiskActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className={getNavTextClass(userData.is_developer ? false : isRiskActive)}>
                    {userData.is_developer ? 'Scanner' : 'Risk'}
                  </span>
                  {!userData.is_developer && isRiskActive && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => userData.is_developer ? setActiveTab('game') : setShowGridBot(true)} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  {userData.is_developer ? (
                    <svg className={getNavIconClass(activeTab === 'game')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  ) : (
                    <svg className={getNavIconClass(isBotActive)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className={getNavTextClass(userData.is_developer ? activeTab === 'game' : isBotActive)}>
                    {userData.is_developer ? 'Engine' : 'Bot'}
                  </span>
                  {(userData.is_developer ? activeTab === 'game' : isBotActive) && <div className={`absolute -bottom-3 w-1.5 h-1.5 rounded-full ${dotColorBase}`} />}
                </button>

                <button onClick={() => setDarkMode(!darkMode)} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  {darkMode ? (
                    <svg className={getNavIconClass(false)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className={getNavIconClass(false)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span className={getNavTextClass(false)}>Theme</span>
                </button>

                <button onClick={toggleMute} className="shrink-0 snap-center relative flex flex-col items-center gap-1.5 group">
                  <svg className={getNavIconClass(false)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMuted ? (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    ) : (
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    )}
                  </svg>
                  <span className={getNavTextClass(false)}>{isMuted ? 'Muted' : 'Alerts'}</span>
                </button>  

              </div>
            </div>
          )}
          {showTour && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
              <div className="w-full max-w-md p-10 rounded-[3rem] border border-yellow-500/50 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden text-center">
                
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-500 rounded-full blur-[90px] opacity-20 pointer-events-none" />

                <div className="mb-8 relative z-10">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                       <span className="text-5xl block drop-shadow-2xl animate-pulse">
                        {tourStep === 0 ? "🔱" : tourStep === 1 ? "🎯" : tourStep === 2 ? "📈" : "🔒"}
                      </span>
                      
                      {tourStep === 2 && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full border-2 border-black p-1 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-bounce">
                          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-white mb-4 drop-shadow-sm">
                    {tourStep === 0 ? "GainWave Elite" : 
                     tourStep === 1 ? "Institutional Signals" : 
                     tourStep === 2 ? "Verified Success" : 
                     "Profit Protection"}
                  </h2>

                  <div className="min-h-[140px] flex flex-col items-center justify-center gap-3">
                    <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                      {tourStep === 0 ? "Welcome to the world's most advanced financial node network. You are now equipped with institutional-grade intelligence to dominate global markets." : 
                       tourStep === 1 ? "Elite nodes broadcast high-probability signals. If a signal is locked, you can unlock full entry points and targets using GAINS. Premium intel at your fingertips." : 
                       tourStep === 2 ? "No fake stats. Every trade's success is automatically verified and recorded. Track real win rates and growth of every Node before you follow their lead." : 
                       "Secure your capital. If a trade is in profit, you can execute a 'Manual Exit' to lock in gains instantly. Don't wait for targets—take your profit on your terms."}
                    </p>

                    {tourStep === 2 && (
                      <div className="flex flex-col gap-2 items-start w-fit mx-auto mt-4 p-4 rounded-2xl bg-green-500/5 border border-green-500/20 shadow-inner">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                          <span className="w-4 h-4 rounded-full border border-green-500 flex items-center justify-center text-[8px]">✓</span> 
                          Auto-Tracked Performance
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                          <span className="w-4 h-4 rounded-full border border-green-500 flex items-center justify-center text-[8px]">✓</span> 
                          100% Immutable Trade History
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between relative z-10 pt-4">
                  <div className="flex gap-2.5">
                    {[0, 1, 2, 3].map(step => (
                      <div key={step} className={`h-1.5 rounded-full transition-all duration-700 ${tourStep === step ? 'w-8 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,1)]' : 'w-2 bg-zinc-800'}`} />
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    {tourStep > 0 && (
                      <button onClick={() => setTourStep(prev => prev - 1)} className="px-4 py-3 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors">
                        Back
                      </button>
                    )}
                    
                    {tourStep < 3 ? (
                      <button 
                        onClick={() => setTourStep(prev => prev + 1)} 
                        className="px-8 py-3 bg-white text-black font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all shadow-[0_10px_20px_rgba(255,255,255,0.2)] active:scale-95"
                      >
                        Next Step
                      </button>
                    ) : (
                      <button 
                        onClick={handleFinishTour} 
                        className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-black text-[11px] uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_30px_rgba(234,179,8,0.5)] border border-yellow-300"
                      >
                        Establish Node
                      </button>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleFinishTour} 
                  className="absolute top-8 right-8 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
                >
                  Skip Tour
                </button>
              </div>
            </div>
          )}

          {activeStream && (
            <LiveStreamPlayer 
              url={activeStream.url} 
              traderName={activeStream.name}
              onClose={() => setActiveStream(null)} 
            />
          )}
          
          {showGridBot && (
            <GridBotTerminal 
              onClose={() => setShowGridBot(false)} 
              isPremium={userData.is_premium} 
              prices={{ btc: prices['BTCUSDT'] || 0, eth: prices['ETHUSDT'] || 0, xau: 0, eur: 0 }}
              userData={userData} 
              onBotProfit={handleBotProfit} 
            />
          )}
          
          {activeProject && (
            <ProjectTerminal 
              project={activeProject} 
              darkMode={darkMode} 
              onBack={() => setActiveProject(null)} 
              onJoinHub={() => handleJoinHub(activeProject.owner_id)} 
            />
          )}
        </>
      )}
      
      {isCEO && !showAdmin && (
        <button 
          onClick={() => setShowAdmin(true)} 
          className="fixed top-6 right-6 z-[600] flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-black uppercase text-[10px] shadow-[0_10px_30px_rgba(220,38,38,0.5)] animate-pulse hover:scale-110 active:scale-95 transition-all border border-red-400/30 backdrop-blur-md"
        >
          🛡️ CEO Terminal
        </button>
      )}

    </main>
  );
}
