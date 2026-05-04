"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner'; 
import StoryBar from './StoryBar'; 
import { dispatchNotification } from './notification-dispatcher';

// 🔥 FUNKCIJA ZA KOMPRESIJO Z LOGIKO ZA PRO/FREE 🔥
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
        const quality = isPro ? 0.9 : 0.4;

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

const getAvatarGradient = (alias: string) => {
  if (!alias) return 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${h}, 80%, 60%), hsl(${(h + 40) % 360}, 80%, 40%))`;
};

// 🔥 POMOŽNA FUNKCIJA ZA "LAST SEEN" ČAS 🔥
const formatLastSeen = (dateString: string) => {
  if (!dateString) return "UNKNOWN";
  const diffMs = new Date().getTime() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "JUST NOW";
  if (diffMins < 60) return `${diffMins}M AGO`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}H AGO`;
  return `${Math.floor(diffMins / 1440)}D AGO`;
};

// 🔥 LOCAL STORAGE HELPERJI 🔥
const getLocalChanPins = () => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('gw_chan_pins') || '[]');
};

const getLocalChanMutes = () => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('gw_chan_mutes') || '[]');
};

// 🔥 VIZUALNA KARTICA ZA SIGNALE 🔥
const SignalCard = ({ payload, onCopy, isOwn }: { payload: any, onCopy: (data: any) => void, isOwn: boolean }) => {
    const isLong = payload.direction === 'long' || payload.direction === 'LONG';
    
    return (
        <div className="bg-[#111115] border border-zinc-700/50 rounded-xl overflow-hidden shadow-lg w-full min-w-[200px] md:min-w-[280px] my-1 text-left">
            <div className={`px-3 py-2 flex justify-between items-center ${isLong ? 'bg-green-900/30 border-b border-green-500/20' : 'bg-red-900/30 border-b border-red-500/20'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{payload.pair}</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isLong ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isLong ? '📈 LONG' : '📉 SHORT'}
                </span>
            </div>
            
            <div className="p-3 grid grid-cols-3 gap-1 md:gap-2">
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Entry</span>
                    <span className="text-[10px] md:text-xs font-mono font-bold text-white">${payload.entry_price}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-green-500 uppercase">Take Profit</span>
                    <span className="text-[10px] md:text-xs font-mono font-bold text-green-400">${payload.take_profit}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-red-500 uppercase">Stop Loss</span>
                    <span className="text-[10px] md:text-xs font-mono font-bold text-red-400">${payload.stop_loss}</span>
                </div>
            </div>

            {payload.content && (
                <div className="px-3 pb-2">
                    <p className="text-[10px] text-zinc-400 italic">"{payload.content}"</p>
                </div>
            )}

            {payload.allow_copy === true && !isOwn && (
                <div className="px-3 pb-3 mt-1">
                    <button 
                        onClick={() => onCopy(payload)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                        <span>⚡</span> COPY
                    </button>
                </div>
            )}
            {payload.allow_copy === true && isOwn && (
                <div className="px-3 pb-3 mt-1">
                    <div className="w-full py-2 bg-zinc-800 text-zinc-500 rounded-lg text-[10px] font-black uppercase tracking-widest text-center border border-zinc-700">
                        YOUR SIGNAL
                    </div>
                </div>
            )}
            {payload.allow_copy === false && (
                <div className="px-3 pb-3 mt-1">
                    <div className="w-full py-2 bg-zinc-800/50 text-zinc-500 rounded-lg text-[8px] font-black uppercase tracking-widest text-center border border-zinc-800/50">
                        TRADE IDEA (NO COPY)
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CommunityView({ userData, darkMode, onBack, isOwnProfile, viewingId, setActiveChat }: any) {
  const targetOwnerId = viewingId || userData?.id;

  const isPro = userData?.is_premium === true || (userData?.win_rate || 0) >= 90;
  const charLimit = isPro ? 8000 : 2000;

  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [topicUnread, setTopicUnread] = useState<Record<string, number>>({}); 
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  const [myHubs, setMyHubs] = useState<any[]>([]);
  const [showInviteSearch, setShowInviteSearch] = useState(false);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [currentChannelMembers, setCurrentChannelMembers] = useState<string[]>([]);

  // 🔥 ACTION MENU STATE (For Mobile & Desktop clicking) 🔥
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingMsgText, setEditingMsgText] = useState("");

  // 🔥 MENTIONS & REPLY STATE 🔥
  const [replyingToMsg, setReplyingToMsg] = useState<any | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  // 🔥 EMOJI PICKER STATE 🔥
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showStylePicker, setShowStylePicker] = useState(false);
  const [tempColorA, setTempColorA] = useState("#1a1a1a");
  const [tempColorB, setTempColorB] = useState("#000000");

  const [showAddChan, setShowAddChan] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanIsPremium, setNewChanIsPremium] = useState(false);
  const [newChanGainsPrice, setNewChanGainsPrice] = useState<number>(0);
  const [newChanLogo, setNewChanLogo] = useState<File | null>(null);
  const [newChanLogoPreview, setNewChanLogoPreview] = useState<string | null>(null);

  const [hasAccess, setHasAccess] = useState(true);
  const [hasInvite, setHasInvite] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [myChannels, setMyChannels] = useState<any[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  
  const [isMemberOfActive, setIsMemberOfActive] = useState(false);
  const [currentUserMembership, setCurrentUserMembership] = useState<any>(null); 
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);

  const [modTarget, setModTarget] = useState<{ id: string, alias: string, win_rate?: number } | null>(null);
  
  const [appSettings, setAppSettings] = useState<any>({ subscription_price: 200 });

  // 🔥 REF ZA SCROLLANJE ZNOTRAJ CHATA 🔥
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [showSignalPicker, setShowSignalPicker] = useState(false);
  const [mySignals, setMySignals] = useState<any[]>([]);

  const [copyModalPost, setCopyModalPost] = useState<any | null>(null);
  const [copyRiskType, setCopyRiskType] = useState<'percent' | 'fixed'>('percent');
  const [copyRiskValue, setCopyRiskValue] = useState<string>("1");

  // 🔥 PIN CAROUSEL STATE 🔥
  const [activePinIndex, setActivePinIndex] = useState(0);

  useEffect(() => {
    const fetchAllProfiles = async () => {
      // 🔥 DODAN last_seen_at ZA ČLANSKI SEZNAM 🔥
      const { data } = await supabase.from('profiles').select('id, alias, avatar_url, country, last_seen_at');
      if (data) setAllProfiles(data);
    };
    
    const fetchSettings = async () => {
      const { data } = await supabase.from('app_config').select('*').maybeSingle();
      if (data) setAppSettings(data);
    };
    
    fetchAllProfiles();
    fetchSettings();
  }, []);

  // 🔥 HEARTBEAT ZA LAST SEEN (Javlja aktivnost vsako minuto) 🔥
  useEffect(() => {
    if (!userData?.id) return;
    const updatePresence = async () => {
      await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userData.id);
    };
    updatePresence();
    const interval = setInterval(updatePresence, 60000); 
    return () => { clearInterval(interval); updatePresence(); };
  }, [userData?.id]);

  const fetchMyHubs = async () => {
    if (!userData?.id) return;
    const { data: memberships } = await supabase
      .from('user_hub_memberships')
      .select('hub_owner_id, profiles!hub_owner_id(alias, avatar_url)')
      .eq('user_id', userData.id);

    if (memberships) {
      const hubsWithStatus = await Promise.all(memberships.map(async (m: any) => {
        const { count } = await supabase
          .from('community_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', activeChannel?.id)
          .gt('created_at', new Date(Date.now() - 3600000).toISOString());

        return {
          id: m.hub_owner_id,
          alias: m.profiles.alias,
          avatar: m.profiles.avatar_url,
          hasNew: count && count > 0
        };
      }));
      setMyHubs(hubsWithStatus);
    }
  };

  const fetchMyChannels = async () => {
    if (!userData?.id) return;
    
    const localPins = getLocalChanPins();
    const localMutes = getLocalChanMutes();

    const { data: memberships } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', userData.id);

    if (memberships && memberships.length > 0) {
      const ids = memberships.map(m => m.channel_id);
      const { data: chans } = await supabase
        .from('community_channels')
        .select('*')
        .in('id', ids);
      
      if (chans) {
        const combinedChans = chans.map(chan => {
          return {
            ...chan,
            is_pinned: localPins.includes(chan.id),
            is_muted: localMutes.includes(chan.id) 
          };
        });
        setMyChannels(combinedChans);
        
        if (activeChannel) {
          const currentActiveData = combinedChans.find(c => c.id === activeChannel.id);
          if (currentActiveData && currentActiveData.is_muted !== activeChannel.is_muted) {
            setActiveChannel((prev: any) => ({ ...prev, is_muted: currentActiveData.is_muted }));
          }
        }
      }
    } else {
      setMyChannels([]);
    }
  };

  const fetchTopics = async (channelId: string) => {
    const { data } = await supabase
      .from('channel_topics')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
      
    if (data && data.length > 0) {
      setTopics(data);

      let targetTopic = null;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlTopicId = params.get('topic');
        if (urlTopicId) {
            targetTopic = data.find(t => t.id === urlTopicId);
        }
      }

      if (targetTopic) {
          setActiveTopic(targetTopic);
      } else if (!activeTopic || activeTopic.channel_id !== channelId) {
          setActiveTopic(data[0]);
      }
    } else {
      setTopics([]);
      setActiveTopic(null);
    }
  };

  useEffect(() => {
    const syncNodeAccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlChannelId = params.get('channel');
      const urlHubAlias = params.get('hub'); 

      await fetchMyChannels();
      await fetchMyHubs();

      if (urlChannelId && userData?.id) {
        const { data: targetChan } = await supabase
          .from('community_channels')
          .select('*')
          .eq('id', urlChannelId)
          .maybeSingle();

        if (targetChan) {
          const localMutes = getLocalChanMutes();
          
          setActiveChannel({
            ...targetChan,
            is_muted: localMutes.includes(targetChan.id)
          });
          
          const { data: invite } = await supabase
            .from('community_invites')
            .select('*')
            .eq('channel_id', urlChannelId)
            .eq('user_id', userData.id)
            .maybeSingle();

          if (!targetChan.is_premium || targetChan.owner_id === userData.id || invite) {
            setHasInvite(true);
            setHasAccess(true);
          } else {
            setHasInvite(false);
          }
        }
      } else if (urlHubAlias) {
        const { data: hubProfile } = await supabase.from('profiles').select('id').eq('alias', urlHubAlias).maybeSingle();
        if (hubProfile) {
            const { data: hubChan } = await supabase.from('community_channels').select('*').eq('owner_id', hubProfile.id).maybeSingle();
            if (hubChan) {
                const localMutes = getLocalChanMutes();
                setActiveChannel({
                  ...hubChan,
                  is_muted: localMutes.includes(hubChan.id)
                });
            }
        }
      }
    };

    syncNodeAccess();
  }, [userData.id, viewingId]);

  useEffect(() => {
    const searchAllChannels = async () => {
      if (!globalSearchTerm.trim()) {
        setIsSearching(false);
        setGlobalSearchResults([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase
        .from('community_channels')
        .select('*')
        .ilike('name', `%${globalSearchTerm}%`)
        .limit(10);
      
      setGlobalSearchResults(data || []);
    };
    
    const delayDebounceFn = setTimeout(() => {
      searchAllChannels();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearchTerm]);

  useEffect(() => {
    const checkMembership = async () => {
      if (!activeChannel || !userData?.id) return;
      
      const { data } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', activeChannel.id)
        .eq('user_id', userData.id)
        .maybeSingle();
        
      setCurrentUserMembership(data);
      
      if (data && activeChannel.is_premium && data.role !== 'admin' && data.expires_at) {
        const expiryDate = new Date(data.expires_at).getTime();
        const now = Date.now();
        const diffDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
          setIsMemberOfActive(false);
          setHasAccess(false);
          return;
        } else if (diffDays <= 3) {
          setDaysUntilExpiry(diffDays);
        } else {
          setDaysUntilExpiry(null);
        }
      }

      setIsMemberOfActive(!!data);
      
      if (data) {
        setTempColorA(activeChannel.bg_color || "#1a1a1a");
        setTempColorB(activeChannel.bg_image_url || "#000000");
      }
      
      setTopicUnread({}); 
      fetchTopics(activeChannel.id);

      // 🔥 SAMODEJNO PREBERI VSE ČLANE KANALA 🔥
      const { data: allMembers } = await supabase
        .from('channel_members')
        .select('user_id')
        .eq('channel_id', activeChannel.id);
      if (allMembers) {
        setCurrentChannelMembers(allMembers.map(m => m.user_id));
      }
    };
    
    checkMembership();
  }, [activeChannel, userData?.id]);

  const handleTogglePin = async (chanId: string, currentPinStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !currentPinStatus;
    
    let pins = getLocalChanPins();

    if (newStatus && !isPro) {
      if (pins.length >= 1) {
        toast.error(`FREE Status: Only 1 pinned channel allowed. Upgrade to PRO for ${appSettings.subscription_price} GAINS!`);
        return;
      }
    }

    if (newStatus) {
      if (!pins.includes(chanId)) pins.push(chanId);
    } else {
      pins = pins.filter((id: string) => id !== chanId);
    }

    localStorage.setItem('gw_chan_pins', JSON.stringify(pins));
    setMyChannels(prev => prev.map(c => c.id === chanId ? { ...c, is_pinned: newStatus } : c));
    toast.success(newStatus ? "Node pinned to top 📌" : "Node unpinned");

    supabase.from('channel_members').update({ is_pinned: newStatus }).eq('channel_id', chanId).eq('user_id', userData.id).then();
  };

  const handleToggleMute = async (chanId: string, currentMuteStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteStatus = !currentMuteStatus;

    let mutes = getLocalChanMutes();
    if (newMuteStatus) {
      if (!mutes.includes(chanId)) mutes.push(chanId);
    } else {
      mutes = mutes.filter((id: string) => id !== chanId);
    }

    localStorage.setItem('gw_chan_mutes', JSON.stringify(mutes));
    setMyChannels(prev => prev.map(c => c.id === chanId ? { ...c, is_muted: newMuteStatus } : c));
    
    if (activeChannel?.id === chanId) {
      setActiveChannel((prev: any) => ({ ...prev, is_muted: newMuteStatus }));
    }

    toast.success(newMuteStatus ? "Node notifications DISABLED 🔇" : "Node notifications ENABLED 🔊");
    supabase.from('channel_members').update({ is_muted: newMuteStatus }).eq('channel_id', chanId).eq('user_id', userData.id).then();
  };
  
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const originalFile = e.target.files[0];
      
      if (!originalFile.type.startsWith('image/')) {
        toast.error("Please select a valid image (PNG, JPG).");
        return;
      }

      try {
        const compressedFile = await compressImage(originalFile, isPro);
        setNewChanLogo(compressedFile);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          setNewChanLogoPreview(event.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        toast.error("Image processing failed.");
      }
    }
  };

  const handleAddChannel = async () => {
    if (!newChanName.trim()) return;
    
    try {
      let finalLogoUrl = null;
      if (newChanLogo) {
        const fileExtension = newChanLogo.name.split('.').pop();
        const fileName = `${Date.now()}-${newChanName.toLowerCase().replace(/\s+/g, '-')}.${fileExtension}`;
        const filePath = `community-logos/${userData.id}/${fileName}`;
        
        // 🔥 HETZNER MINIO LOGO UPLOAD 🔥
        const formData = new FormData();
        formData.append("file", newChanLogo);
        formData.append("path", filePath);

        const uploadRes = await fetch("/api/upload-media", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Logo upload failed on Hetzner");
        const uploadData = await uploadRes.json();
        finalLogoUrl = uploadData.url;
      }

      const { data: newChan, error } = await supabase.from('community_channels').insert([
        { 
          name: newChanName.toLowerCase().replace(/\s+/g, '-'), 
          owner_id: userData.id,
          is_premium: newChanIsPremium,
          unlock_price_gains: newChanGainsPrice,
          logo_url: finalLogoUrl,
          bg_color: "#1a1a1a",
          bg_image_url: "#000000"
        }
      ]).select().single();
      
      if (error) throw error;

      if (newChan) {
         const expiresAt = newChanIsPremium ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() : null;
         await supabase.from('channel_members').insert([
           { channel_id: newChan.id, user_id: userData.id, role: 'admin', expires_at: expiresAt }
         ]);
         
         await supabase.from('channel_topics').insert([
           { channel_id: newChan.id, name: 'General' }
         ]);
      }
      
      setNewChanName("");
      setNewChanIsPremium(false);
      setNewChanGainsPrice(0);
      setNewChanLogo(null);
      setNewChanLogoPreview(null);
      setShowAddChan(false);
      fetchMyChannels();
      toast.success("Node successfully established!");
      
    } catch (err: any) {
      toast.error("Error establishing channel.");
    }
  };
  
  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !activeChannel) return;
    
    const { data, error } = await supabase.from('channel_topics').insert([
      { channel_id: activeChannel.id, name: newTopicName }
    ]).select().single();
    
    if (!error && data) {
      setTopics(prev => [...prev, data]);
      setActiveTopic(data);
      setNewTopicName("");
      setShowAddTopic(false);
      toast.success("Topic created!");
    } else {
        toast.error("Failed to create topic.");
    }
  };

  const handleRemoveTopic = async (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this topic? All messages inside will be lost forever.")) return;
    
    try {
      await supabase.from('community_messages').delete().eq('topic_id', topicId);
      const { data, error } = await supabase.from('channel_topics').delete().eq('id', topicId).select();
      
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("Supabase Database Blocked Deletion! (Missing DELETE Policy on 'channel_topics').");
        return;
      }

      const remainingTopics = topics.filter(t => t.id !== topicId);
      setTopics(remainingTopics);
      if (activeTopic?.id === topicId) {
        setActiveTopic(remainingTopics.length > 0 ? remainingTopics[0] : null);
      }
      toast.success("Topic permanently deleted from the network.");
    } catch (err: any) {
      console.error("Delete failed:", err.message);
      toast.error("Failed to delete topic. Check your admin privileges.");
    }
  };

  const handleEditTopic = async (topicId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt("Rename topic:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;
    
    const { error } = await supabase.from('channel_topics').update({ name: newName.trim() }).eq('id', topicId);
    if (!error) {
      setTopics(prev => prev.map(t => t.id === topicId ? { ...t, name: newName.trim() } : t));
      if (activeTopic?.id === topicId) {
        setActiveTopic({ ...activeTopic, name: newName.trim() });
      }
      toast.success("Topic renamed.");
    } else {
      toast.error("Error renaming topic.");
    }
  };

  const handleRemoveChannel = async (chanId: string) => {
    if (!confirm("CRITICAL WARNING: This will permanently delete the entire Node, all topics, and all messages! Proceed?")) return;
    const { error } = await supabase.from('community_channels').delete().eq('id', chanId);
    if (!error) {
      if (activeChannel?.id === chanId) setActiveChannel(null);
      fetchMyChannels();
      fetchMyHubs();
      toast.success("Node successfully deleted.");
    } else {
      toast.error("Failed to delete Node.");
    }
  };

  const handleLeaveChannel = async () => {
    if (!activeChannel || !userData?.id) return;
    if (!confirm(`Are you sure you want to leave the node #${activeChannel.name}?`)) return;
    
    const { error } = await supabase.from('channel_members').delete().eq('channel_id', activeChannel.id).eq('user_id', userData.id);
    if (!error) {
       toast.success("You have left the node.");
       setActiveChannel(null);
       fetchMyChannels();
       fetchMyHubs();
    } else {
       toast.error("Failed to leave node.");
    }
  };

  useEffect(() => {
    const checkChannelAccess = async () => {
      if (!activeChannel || !userData?.id) return;
      if (!activeChannel.is_premium || activeChannel.owner_id === userData.id) {
        setHasAccess(true);
        setHasInvite(true);
        return;
      }

      const { data: inviteMsg } = await supabase
        .from('messages')
        .select('id')
        .eq('to_alias', userData.alias)
        .ilike('text', `%channel=${activeChannel.id}%`)
        .limit(1);

      if (inviteMsg && inviteMsg.length > 0) {
        setHasInvite(true);
        setHasAccess(true); 
        return;
      }

      setHasInvite(false);
      setHasAccess(false);
    };

    checkChannelAccess();
  }, [activeChannel, userData.id, userData.alias, isOwnProfile]);

  const handleJoinChannel = async () => {
    if (!activeChannel || !userData?.id) return;
    
    if (activeChannel.is_premium && !hasInvite) {
       const price = activeChannel.unlock_price_gains || 0;
       
       if (userData.gains_balance < price) {
           toast.error(`You need ${price} GAINS to access this VIP node.`);
           return;
       }

       if (!confirm(`Unlock 30-day VIP access for ${price} GAINS?`)) return;

       const { error: walletErr } = await supabase
           .from('user_balances')
           .update({ bulls_balance: userData.gains_balance - price })
           .eq('user_id', userData.id);
           
       if (walletErr) {
           toast.error("Transaction failed.");
           return;
       }

       const { data: ownerWallet } = await supabase
           .from('user_balances')
           .select('earned_balance')
           .eq('user_id', activeChannel.owner_id)
           .maybeSingle();
           
       if (ownerWallet) {
           await supabase
               .from('user_balances')
               .update({ earned_balance: ownerWallet.earned_balance + price })
               .eq('user_id', activeChannel.owner_id);
       }

       await supabase.from('transactions').insert([{
         buyer_id: userData.id,
         seller_id: activeChannel.owner_id,
         amount: price,
         item_type: 'VIP_NODE',
         item_name: `VIP Access: #${activeChannel.name}`
       }]);

       const { data: ownerProfile } = await supabase.from('profiles').select('alias').eq('id', activeChannel.owner_id).single();
       if (ownerProfile && ownerProfile.alias !== userData.alias) {
         await supabase.from('messages').insert([{
           from_alias: 'SYSTEM',
           to_alias: ownerProfile.alias,
           text: `💰 PAYMENT RECEIVED: ${userData.alias} just paid ${price} GAINS to enter #${activeChannel.name}!`,
           is_read: false
         }]);
       }

       toast.success(`Successfully paid ${price} GAINS!`);
    }

    const expiresAt = activeChannel.is_premium 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
        : null;

    const { error } = await supabase
      .from('channel_members')
      .insert([{ channel_id: activeChannel.id, user_id: userData.id, role: 'member', expires_at: expiresAt }]);
      
    if (!error) {
      toast.success(`Joined #${activeChannel.name}!`);
      setIsMemberOfActive(true);
      setHasAccess(true);
      fetchMyChannels(); 
      
      if (topics.length > 0) {
        await supabase.from('community_messages').insert([{
          channel_id: activeChannel.id,
          topic_id: topics[0].id,
          author_id: userData.id,
          author_alias: 'SYSTEM',
          text: `👋 @${userData.alias} just joined the node #${activeChannel.name}! Welcome!`
        }]);
      }
    } else {
        toast.error("Error joining node.");
    }
  };

  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !activeChannel || !isMemberOfActive || !activeTopic) return;
    const file = e.target.files[0];
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isPro) {
      toast.error("Upgrade to PRO to share documents, zip files and PDFs!");
      return;
    }

    setUploadingFile(true);
    const toastId = toast.loading("Uploading file...");

    try {
      let fileToUpload = file;

      if (isImage) {
        fileToUpload = await compressImage(file, isPro); 
      }

      // 🔥 HETZNER MINIO ATTACHMENT UPLOAD 🔥
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("path", `chat-attachments/${userData.id}_${Date.now()}_${fileToUpload.name}`);

      const uploadRes = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Napaka pri nalaganju slike na Hetzner strežnik!");
      }

      const uploadData = await uploadRes.json();
      const hetznerImageUrl = uploadData.url;

      const { error: insertErr } = await supabase.from('community_messages').insert([{
        channel_id: activeChannel.id,
        topic_id: activeTopic.id,
        author_id: userData.id,
        author_alias: userData.alias,
        text: "", 
        image_url: hetznerImageUrl,
      }]);

      if (insertErr) throw insertErr;

      dispatchNotification({
        type: 'channel_message',
        senderId: userData.id,
        senderAlias: userData.alias,
        channelId: activeChannel.id,
        channelName: activeChannel.name,
        topicId: activeTopic.id,
        topicName: activeTopic.name,
        content: "📷 Sent an attachment"
      });
      
      toast.success("File uploaded successfully!", { id: toastId });

    } catch (err) {
      console.error(err);
      toast.error("Upload error. Check network connection.", { id: toastId });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleUpdateStyle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeChannel || !isOwnProfile) return;
    
    const { data, error } = await supabase.from('community_channels')
      .update({ bg_color: tempColorA, bg_image_url: tempColorB })
      .eq('id', activeChannel.id)
      .select();
    
    if (!error && data) {
      toast.success("Style locked! 🎨");
      setActiveChannel(data[0]);
      setShowStylePicker(false);
      fetchMyChannels();
    } else {
      toast.error("Style update failed.");
    }
  };

  const handleOpenInviteSearch = async () => {
    if (!activeChannel) return;
    try {
      const { data } = await supabase.from('channel_members').select('user_id').eq('channel_id', activeChannel.id);
      if (data) {
        setCurrentChannelMembers(data.map(m => m.user_id));
      }
    } catch (e) {
      console.error(e);
    }
    setInviteSearchTerm("");
    setShowInviteSearch(true);
  };

  const handleSendInvite = async (targetAlias: string) => {
    if (!activeChannel) return;

    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('alias', targetAlias).single();
      if (!profile) {
          toast.error("User does not exist!");
          return;
      }

      await supabase.from('user_hub_memberships').upsert([
        { user_id: profile.id, hub_owner_id: userData.id }
      ]);

      const inviteUrl = `${window.location.origin}/?channel=${activeChannel.id}`;
      
      const messageText = activeChannel.is_premium
          ? `⚜️ VIP ACCESS GRANTED ⚜️\nAdmin ${userData.alias} has granted you free access to the VIP Node:\n#${activeChannel.name}\n\n${inviteUrl}`
          : `🔥 Join my Hub! Click here to enter:\n#${activeChannel.name}\n\n${inviteUrl}`;

      const { error: msgErr } = await supabase.from('messages').insert([{
        from_alias: userData.alias,
        to_alias: targetAlias,
        text: messageText,
        is_read: false
      }]);

      if (msgErr) throw msgErr;

      toast.success(`Invite sent to ${targetAlias}!`);
      setShowInviteSearch(false);
      
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error("Error sending invite.");
    }
  };

  const handleReaction = async (msgId: string, emoji: string, currentReactions: any) => {
    let newReactions = { ...(currentReactions || {}) };
    if (!newReactions[emoji]) newReactions[emoji] = [];
    
    if (newReactions[emoji].includes(userData.alias)) {
      newReactions[emoji] = newReactions[emoji].filter((alias: string) => alias !== userData.alias);
      if (newReactions[emoji].length === 0) delete newReactions[emoji];
    } else {
      newReactions[emoji].push(userData.alias);
    }
    
    const { error } = await supabase.from('community_messages').update({ reactions: newReactions }).eq('id', msgId);
    if (!error) setSelectedMsgId(null);
  };

  // 🔥 POSODOBLJENA LOGIKA ZA PINANJE - PREVERJANJE LIMITOV 🔥
  const handlePinMessage = async (msgId: string, currentPinnedStatus: boolean) => {
    const currentPins = messages.filter(m => m.is_pinned).length;
    
    if (!currentPinnedStatus && !isPro && currentPins >= 1) {
      toast.error("Standard users can only pin 1 message. Upgrade to PRO for up to 3 pins!");
      return;
    }
    
    if (!currentPinnedStatus && isPro && currentPins >= 3) {
      toast.error("Maximum 3 pinned messages reached! Unpin an old message to add a new one.");
      return;
    }

    const { error } = await supabase.from('community_messages').update({ is_pinned: !currentPinnedStatus }).eq('id', msgId);
    if (!error) {
        toast.success(!currentPinnedStatus ? "Message Pinned to Node! 📌" : "Message Unpinned");
        setSelectedMsgId(null);
    } else {
        toast.error("Failed to pin message.");
    }
  };

  const handleInputContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    const match = val.match(/@(\w*)$/);
    if (match) {
        setMentionFilter(match[1]);
        setShowMentionMenu(true);
    } else {
        setShowMentionMenu(false);
    }
  };

  const insertMention = (alias: string) => {
    const newVal = newMessage.replace(/@\w*$/, `@${alias} `);
    setNewMessage(newVal);
    setShowMentionMenu(false);
  };

  // 🔥 VSTAVI EMOJI V TEKST 🔥
  const insertEmoji = (emoji: string) => {
      setNewMessage(prev => prev + emoji);
      setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (!activeChannel || !activeTopic || !hasAccess || !isMemberOfActive) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel_id', activeChannel.id)
        .eq('topic_id', activeTopic.id)
        .order('created_at', { ascending: true });
        
      if (error || !data) return;

      if (data.length > 0) {
        const authorIds = [...new Set(data.map((m: any) => m.author_id))];
        const { data: profs } = await supabase
            .from('profiles')
            .select('id, alias, avatar_url, is_institutional, win_rate') 
            .in('id', authorIds);
            
        if (profs) {
            const profMap: Record<string, any> = {};
            profs.forEach(p => profMap[p.id] = p);
            const enrichedData = data.map((m: any) => ({
                ...m,
                profiles: profMap[m.author_id] || null
            }));
            setMessages(enrichedData);
        } else {
            setMessages(data);
        }
      } else {
        setMessages([]);
      }
    };
    
    fetchMessages();

    const channelSub = supabase.channel(`chan-${activeChannel.id}`, {
      config: { presence: { key: userData.alias } },
    });

    channelSub
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages', filter: `channel_id=eq.${activeChannel.id}` }, 
      async (payload) => {
        if (payload.eventType === 'INSERT') {
            if (payload.new.topic_id === activeTopic.id) {
                const { data: prof } = await supabase.from('profiles').select('alias, avatar_url, is_institutional, win_rate').eq('id', payload.new.author_id).single();
                const fullMsg = { ...payload.new, profiles: prof };
                setMessages(prev => [...prev, fullMsg]);
            } else {
                setTopicUnread(prev => ({
                    ...prev,
                    [payload.new.topic_id]: (prev[payload.new.topic_id] || 0) + 1
                }));
            }
        }
        if (payload.eventType === 'DELETE') {
             setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
        if (payload.eventType === 'UPDATE' && payload.new.topic_id === activeTopic.id) {
             setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channelSub.presenceState();
        setOnlineUsers(Object.keys(newState));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelSub.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channelSub); };
  }, [activeChannel, activeTopic, hasAccess, userData.alias, isMemberOfActive]);

  // 🔥 POPRAVLJEN SCROLL MEHANIZEM 🔥
  useEffect(() => { 
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length, activeTopic]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel || !activeTopic || !userData?.id || !isMemberOfActive) return;
    
    if (newMessage.length > charLimit) {
      toast.error(`Message too long! Your current node limit is ${charLimit} characters.`);
      return;
    }

    if (currentUserMembership?.muted_until) {
      const mutedTime = new Date(currentUserMembership.muted_until).getTime();
      if (mutedTime > Date.now()) {
        toast.error(`You are MUTED until ${new Date(mutedTime).toLocaleString()}`);
        return;
      }
    }

    let finalMessageText = newMessage.trim();
    if (replyingToMsg) {
      finalMessageText = `> Replying to ${replyingToMsg.profiles?.alias || replyingToMsg.author_alias}:\n> "${replyingToMsg.text.replace(/> Replying to (.*?):\n> "(.*?)"\n\n/, '').substring(0, 40)}..."\n\n${finalMessageText}`;
    }

    setNewMessage(""); 
    setReplyingToMsg(null);
    setShowMentionMenu(false);

    try {
      const { error } = await supabase.from('community_messages').insert([{
        channel_id: activeChannel.id,
        topic_id: activeTopic.id,
        author_id: userData.id,
        author_alias: userData.alias,
        text: finalMessageText
      }]);
      
      if (error) throw error;

      await dispatchNotification({
        type: 'channel_message',
        senderId: userData.id,
        senderAlias: userData.alias,
        channelId: activeChannel.id,
        channelName: activeChannel.name,
        topicId: activeTopic.id,
        topicName: activeTopic.name,
        content: finalMessageText
      });

      // 🔥 PREVERI ZA MENTIONS 🔥
      const mentions = finalMessageText.match(/@(\w+)/g);
      if (mentions) {
         mentions.forEach(async (mention) => {
            const alias = mention.substring(1);
            if (alias !== userData.alias) {
               const userProf = allProfiles.find(p => p.alias === alias && currentChannelMembers.includes(p.id));
               if (userProf) {
                   await fetch('/api/send-push', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                       title: `💬 You were mentioned in #${activeChannel.name}`,
                       body: `${userData.alias}: ${finalMessageText.substring(0, 40)}...`,
                       url: `/?channel=${activeChannel.id}&topic=${activeTopic.id}`,
                       targetAlias: alias 
                     }),
                   }).catch(() => {});
               }
            }
         });
      }

    } catch (err) {
      toast.error("Transmission failed.");
    }
  };

  const handleDeleteMessage = async (msgId: string, msgAuthorId: string) => {
    if (!confirm("Delete this message permanently?")) return;
    const isOwner = activeChannel?.owner_id === userData.id;
    
    // 🔥 TAKOJ IZBRIŠI IZ EKRANA (Optimistic Update) 🔥
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    if (isOwner) {
      await supabase.from('community_messages').delete().eq('id', msgId);
    } else {
      await supabase.from('community_messages').delete().eq('id', msgId).eq('author_id', userData.id);
    }
    setSelectedMsgId(null);
  };

  const handleUpdateMessage = async (msgId: string) => {
    if (!editingMsgText.trim()) return;
    const { error } = await supabase.from('community_messages').update({ text: editingMsgText }).eq('id', msgId).eq('author_id', userData.id);
    if (!error) {
      setEditingMsgId(null);
      setEditingMsgText("");
      setSelectedMsgId(null);
    }
  };

  const handleUserClick = (alias: string) => {
    if (alias === userData.alias || alias === 'SYSTEM') return; 
    if (setActiveChat) {
      window.history.pushState({}, '', `/?user=${alias}`);
      setActiveChat(alias);
    }
  };

  const openModMenu = (e: React.MouseEvent, targetId: string, targetAlias: string, winRate?: number) => {
    e.stopPropagation();
    if (targetAlias === 'SYSTEM') return;
    
    if (activeChannel?.owner_id === userData.id && targetId !== userData.id) {
        setModTarget({ id: targetId, alias: targetAlias, win_rate: winRate });
    } else {
        handleUserClick(targetAlias);
    }
  };

  const handleWarnUser = async () => {
    if (!modTarget || !activeChannel || !activeTopic) return;
    await supabase.from('community_messages').insert([{
      channel_id: activeChannel.id,
      topic_id: activeTopic.id,
      author_id: userData.id,
      author_alias: 'SYSTEM',
      text: `⚠️ SYSTEM WARNING: @${modTarget.alias}, please adhere to the node guidelines.`
    }]);
    toast.success(`Warning sent to ${modTarget.alias}`);
    setModTarget(null);
  };

  const handleMuteUser = async () => {
    if (!modTarget || !activeChannel || !activeTopic) return;
    if (!confirm(`Mute ${modTarget.alias} for 24 hours?`)) return;

    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const { error } = await supabase.from('channel_members')
      .update({ muted_until: tomorrow.toISOString() })
      .eq('channel_id', activeChannel.id)
      .eq('user_id', modTarget.id);

    if (!error) {
      await supabase.from('community_messages').insert([{
        channel_id: activeChannel.id,
        topic_id: activeTopic.id,
        author_id: userData.id,
        author_alias: 'SYSTEM',
        text: `🔇 @${modTarget.alias} has been MUTED for 24 hours by Admin.`
      }]);
      toast.success(`${modTarget.alias} has been muted.`);
    } else {
      toast.error("Error applying mute.");
    }
    setModTarget(null);
  };

  const handleKickUser = async () => {
    if (!modTarget || !activeChannel || !activeTopic) return;
    if (!confirm(`KICK ${modTarget.alias} from the entire Node? This is permanent.`)) return;

    const { error } = await supabase.from('channel_members')
      .delete()
      .eq('channel_id', activeChannel.id)
      .eq('user_id', modTarget.id);

    if (!error) {
      await supabase.from('community_messages').insert([{
        channel_id: activeChannel.id,
        topic_id: activeTopic.id,
        author_id: userData.id,
        author_alias: 'SYSTEM',
        text: `🥾 @${modTarget.alias} was KICKED from the node.`
      }]);
      toast.success(`${modTarget.alias} kicked successfully.`);
    } else {
      toast.error("Error kicking user.");
    }
    setModTarget(null);
  };

  const handleOpenSignalPicker = async () => {
      const { data } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userData.id)
          .not('pair', 'is', null) 
          .order('created_at', { ascending: false })
          .limit(10);
          
      if (data) setMySignals(data);
      setShowSignalPicker(true);
  };

  const handleDeleteSignal = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to delete this signal?")) return;
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (!error) {
          setMySignals(prev => prev.filter(s => s.id !== id));
          toast.success("Signal deleted successfully.");
      } else {
          toast.error("Error deleting signal.");
      }
  };

  const handleShareSignalToChat = async (signal: any) => {
      if (!activeChannel || !activeTopic || !userData?.id) return;
      
      const payload = {
          id: signal.id,
          pair: signal.pair || 'ASSET',
          direction: signal.direction,
          entry_price: signal.entry_price,
          take_profit: signal.take_profit || signal.tp_price, 
          stop_loss: signal.stop_loss || signal.sl_price,
          content: signal.text || signal.content,
          allow_copy: signal.is_copyable 
      };

      const msg = `[GW_SIGNAL_PAYLOAD]${JSON.stringify(payload)}`;

      const { error } = await supabase.from('community_messages').insert([{
         channel_id: activeChannel.id,
         topic_id: activeTopic.id,
         author_id: userData.id,
         author_alias: userData.alias,
         text: msg
      }]);

      if (!error) {
          toast.success("Signal shared to chat successfully!");
          setShowSignalPicker(false);
      } else {
          toast.error("Error sharing signal.");
      }
  };

  const executeCopySignalFromHub = async () => {
    if (!copyModalPost || !userData?.id) return;
    
    const riskVal = parseFloat(copyRiskValue);
    if (isNaN(riskVal) || riskVal <= 0) {
      toast.error("Please enter a valid risk or lot value.");
      return;
    }
    
    try {
      const { error } = await supabase.from('copied_trades').insert([{
        copier_id: userData.id,
        signal_id: copyModalPost.id || null,
        signal_author_id: activeChannel.owner_id, 
        pair: copyModalPost.pair,
        direction: copyModalPost.direction,
        entry_price: copyModalPost.entry_price ? parseFloat(copyModalPost.entry_price) : null,
        sl_price: copyModalPost.stop_loss ? parseFloat(copyModalPost.stop_loss) : null,
        tp_price: copyModalPost.take_profit ? parseFloat(copyModalPost.take_profit) : null,
        risk_type: copyRiskType,
        risk_value: riskVal,
        status: 'pending'
      }]);

      if (error) throw error;
      
      toast.success(`⚡ Signal successfully sent to the terminal database!\nSystem awaiting execution: ${copyModalPost.pair}`);
      
      setCopyModalPost(null); 
      setCopyRiskValue("1");
    } catch (err: any) {
      console.error("Napaka pri kopiranju:", err);
      toast.error("System copy error: " + err.message);
    }
  };

  const sortedMyChannels = [...myChannels].sort((a, b) => {
    const aPinned = a.is_pinned ? 1 : 0;
    const bPinned = b.is_pinned ? 1 : 0;
    return bPinned - aPinned;
  });

  const pinnedMessages = messages.filter(m => m.is_pinned);

  return (
    <div className="flex flex-col w-full flex-1 h-[calc(100dvh-70px)] md:h-[calc(100vh-80px)] gap-2 md:gap-4 relative animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden" onClick={() => setSelectedMsgId(null)}>
      
      <div className={`${activeChannel ? 'hidden md:block' : 'block'} shrink-0 px-2 pt-2 md:pt-0`}>
        <StoryBar userData={userData} darkMode={darkMode} />
      </div>

      {/* --- ALL MODALS REMAIN THE SAME --- */}

      {/* 🔥 THEME PICKER MODAL (NA SREDINI IN NAD VSEM) 🔥 */}
      {showStylePicker && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowStylePicker(false)}>
            <div className={`w-full max-w-xs p-6 rounded-[2.5rem] border shadow-2xl ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black uppercase tracking-widest text-blue-500">Theme Colors</h3>
                 <button onClick={() => setShowStylePicker(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Top Color</span>
                  <input type="color" value={tempColorA} onChange={(e) => setTempColorA(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-2xl border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bottom Color</span>
                  <input type="color" value={tempColorB} onChange={(e) => setTempColorB(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none" />
                </div>
                <button onClick={handleUpdateStyle} className="w-full py-4 mt-2 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Apply Colors</button>
              </div>
            </div>
          </div>
      )}

      {showAddTopic && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowAddTopic(false)}>
            <div className={`w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`} onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 mb-6">Create New Topic</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 mb-2 block ml-2">Topic Name</label>
                  <input 
                    autoFocus
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
                    placeholder="e.g. general-chat"
                    className={`w-full p-5 rounded-2xl border-2 font-bold outline-none transition-all ${darkMode ? 'bg-black border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-blue-600'}`}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowAddTopic(false); setNewTopicName(""); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-all">Cancel</button>
                  <button onClick={handleAddTopic} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Create Topic</button>
                </div>
              </div>
            </div>
          </div>
      )}

      {copyModalPost && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setCopyModalPost(null); }}>
          <div className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'} shadow-2xl relative`} onClick={e => e.stopPropagation()}>
            <button onClick={() => setCopyModalPost(null)} className={`absolute top-6 right-6 text-xl transition-transform hover:rotate-90 ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}>✕</button>
            <div className="flex items-center gap-3 mb-6"><span className="text-3xl drop-shadow-md">⚡</span><div><h3 className={`text-xl font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>Copy Signal</h3><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">From Node: {activeChannel?.name}</p></div></div>
            <div className={`p-4 rounded-2xl mb-6 grid grid-cols-2 gap-4 ${darkMode ? 'bg-black/50 border border-zinc-800' : 'bg-zinc-50 border border-zinc-200'}`}>
               <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Pair & Dir</span><span className={`text-sm font-black font-mono ${copyModalPost.direction === 'LONG' || copyModalPost.direction === 'long' ? 'text-green-500' : 'text-red-500'}`}>{copyModalPost.pair} {copyModalPost.direction === 'LONG' || copyModalPost.direction === 'long' ? '🟢' : '🔴'}</span></div>
               <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Entry</span><span className={`text-sm font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{copyModalPost.entry_price}</span></div>
               <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest text-red-500 font-bold mb-1">Stop Loss</span><span className={`text-sm font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{copyModalPost.stop_loss}</span></div>
               <div className="flex flex-col"><span className="text-[8px] uppercase tracking-widest text-green-500 font-bold mb-1">Take Profit</span><span className={`text-sm font-mono font-bold ${darkMode ? 'text-white' : 'text-black'}`}>{copyModalPost.take_profit}</span></div>
            </div>
            <div className="space-y-4">
              <div className="flex bg-zinc-800/30 rounded-xl p-1 border border-zinc-700/50">
                <button onClick={() => { setCopyRiskType('percent'); setCopyRiskValue("1"); }} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${copyRiskType === 'percent' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Risk %</button>
                <button onClick={() => { setCopyRiskType('fixed'); setCopyRiskValue("0.1"); }} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${copyRiskType === 'fixed' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}>Fixed Lot</button>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block ml-1">{copyRiskType === 'percent' ? 'Risk Per Trade (%)' : 'Position Size (Lots)'}</label>
                <div className="relative">
                  <input type="number" min="0.01" step="0.01" value={copyRiskValue} onChange={(e) => setCopyRiskValue(e.target.value)} className={`w-full p-4 rounded-2xl border-2 text-2xl font-black font-mono outline-none transition-all pr-12 ${darkMode ? 'bg-black text-white focus:border-blue-500' : 'bg-white text-black focus:border-blue-600'} ${copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 ? 'border-red-500 text-red-500 focus:border-red-500' : (darkMode ? 'border-zinc-800' : 'border-zinc-200')}`} />
                  <span className={`absolute right-5 top-1/2 -translate-y-1/2 font-black text-xl ${copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 ? 'text-red-500' : 'text-zinc-500'}`}>{copyRiskType === 'percent' ? '%' : 'L'}</span>
                </div>
                {copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 && (<p className="text-[10px] font-black text-red-500 uppercase mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed">⚠️ Warning: Risking more than 2% per trade greatly increases the chance of capital loss (drawdown). We recommend 1-2%.</p>)}
              </div>
            </div>
            <button onClick={executeCopySignalFromHub} className="w-full mt-8 py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95">Confirm & Execute</button>
          </div>
        </div>
      )}

      {modTarget && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setModTarget(null)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-64 shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-800 bg-black/50 text-center">
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Manage Node User</p>
                    <p className="text-sm font-black text-white mt-1">{modTarget.alias}</p>
                    {modTarget.win_rate !== undefined && (<div className={`text-[11px] font-bold uppercase mt-1.5 ${modTarget.win_rate >= 80 ? 'text-yellow-500' : 'text-green-400'}`}>🏆 Win Rate: {modTarget.win_rate}%</div>)}
                </div>
                <div className="flex flex-col">
                    <button onClick={() => { handleUserClick(modTarget.alias); setModTarget(null); }} className="px-4 py-3 text-xs font-bold text-white hover:bg-zinc-800 text-left flex items-center gap-3 transition-colors"><span>👤</span> View Profile</button>
                    <button onClick={handleWarnUser} className="px-4 py-3 text-xs font-bold text-yellow-500 hover:bg-zinc-800 text-left flex items-center gap-3 transition-colors"><span>⚠️</span> Warn User</button>
                    <button onClick={handleMuteUser} className="px-4 py-3 text-xs font-bold text-orange-500 hover:bg-zinc-800 text-left flex items-center gap-3 transition-colors"><span>🤐</span> Mute (24h)</button>
                    <button onClick={handleKickUser} className="px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-900/30 text-left flex items-center gap-3 transition-colors"><span>🥾</span> Kick from Node</button>
                </div>
            </div>
        </div>
      )}

      {/* 🔥 NOV POPRAVLJEN MODAL ZA "ONLINE / OFFLINE" ČLANE KANALA 🔥 */}
      {showOnlineUsers && (() => {
        const memberProfiles = allProfiles.filter(p => currentChannelMembers.includes(p.id));
        memberProfiles.sort((a, b) => {
           const aOnline = onlineUsers.includes(a.alias);
           const bOnline = onlineUsers.includes(b.alias);
           if (aOnline && !bOnline) return -1;
           if (!aOnline && bOnline) return 1;
           const aTime = new Date(a.last_seen_at || 0).getTime();
           const bTime = new Date(b.last_seen_at || 0).getTime();
           return bTime - aTime;
        });

        return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowOnlineUsers(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[600px]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
              <h3 className="text-[11px] font-black uppercase text-white tracking-widest flex items-center gap-2">
                Node Members ({currentChannelMembers.length})
              </h3>
              <button onClick={() => setShowOnlineUsers(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar flex-1 max-h-[400px]">
              {memberProfiles.length === 0 ? (
                <p className="text-center text-xs text-zinc-500 py-4 uppercase font-bold">No members found</p>
              ) : (
                memberProfiles.map(p => {
                  const isOnline = onlineUsers.includes(p.alias);
                  return (
                  <div key={p.id} className={`flex items-center gap-3 p-2.5 border ${isOnline ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-black'} rounded-xl cursor-pointer hover:bg-zinc-800 hover:border-blue-500 transition-colors`} onClick={() => { setShowOnlineUsers(false); handleUserClick(p.alias); }}>
                    <div className="relative shrink-0">
                        {p.avatar_url ? <img src={p.avatar_url} className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-inner" style={{ background: getAvatarGradient(p.alias) }}>{p.alias.charAt(0).toUpperCase()}</div>}
                        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-red-500/80'}`}></div>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-black uppercase text-white truncate">{p.alias}</span>
                        <span className={`text-[9px] font-bold tracking-wider truncate mt-0.5 ${isOnline ? 'text-green-400' : 'text-zinc-500'}`}>
                          {isOnline ? '🟢 ACTIVE NOW' : `🔴 LAST SEEN: ${formatLastSeen(p.last_seen_at)}`}
                        </span>
                    </div>
                    {isOnline && (
                        <div className="shrink-0 text-green-500 px-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    )}
                  </div>
                )})
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {showSignalPicker && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowSignalPicker(false)}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
                    <h3 className="text-[11px] font-black uppercase text-blue-500 tracking-widest">Select Signal to Broadcast</h3>
                    <button onClick={() => setShowSignalPicker(false)} className="text-zinc-500 hover:text-white">✕</button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                    {mySignals.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="text-3xl mb-2 block opacity-50">📊</span>
                            <p className="text-zinc-500 text-xs font-bold uppercase">No active signals found.</p>
                            <p className="text-[9px] text-zinc-600 mt-1">Create a signal on your profile first.</p>
                        </div>
                    ) : (
                        mySignals.map(sig => (
                            <div key={sig.id} className="p-3 border border-zinc-800 bg-black rounded-xl hover:border-blue-500 hover:bg-zinc-900 transition-all group">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex flex-col cursor-pointer" onClick={() => handleShareSignalToChat(sig)}>
                                        <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{sig.pair || 'SIGNAL'}</span>
                                        <span className="text-[8px] font-bold text-zinc-500">{new Date(sig.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded cursor-pointer ${sig.direction === 'long' || sig.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`} onClick={() => handleShareSignalToChat(sig)}>
                                            {sig.direction === 'long' || sig.direction === 'LONG' ? 'LONG' : 'SHORT'}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900/50 p-2 rounded-lg cursor-pointer" onClick={() => handleShareSignalToChat(sig)}>
                                    <div><span className="opacity-50 text-[8px]">ENTRY</span><br/>${sig.entry_price || sig.entry}</div>
                                    <div className="text-green-500"><span className="opacity-50 text-green-700 text-[8px]">TP</span><br/>${sig.take_profit || sig.tp_price}</div>
                                    <div className="text-red-500"><span className="opacity-50 text-red-700 text-[8px]">SL</span><br/>${sig.stop_loss || sig.sl_price}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {showInviteSearch && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className={`w-full max-w-sm rounded-[2.5rem] border p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-2xl'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Grant VIP Access</h3>
              <button onClick={() => setShowInviteSearch(false)} className="text-zinc-500 hover:text-white transition-colors">✕</button>
            </div>
            <input className={`w-full p-4 rounded-2xl border text-xs mb-4 outline-none ${darkMode ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200'}`} placeholder="Search alias..." value={inviteSearchTerm} onChange={(e) => setInviteSearchTerm(e.target.value)} />
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
              {allProfiles
                .filter(p => p.alias.toLowerCase().includes(inviteSearchTerm.toLowerCase()) && p.alias !== userData.alias && !currentChannelMembers.includes(p.id))
                .map(p => (
                  <div key={p.alias} onClick={() => handleSendInvite(p.alias)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all ${darkMode ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800' : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100'}`}>
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? <img src={p.avatar_url} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-inner" style={{ background: getAvatarGradient(p.alias) }}>{p.alias?.charAt(0).toUpperCase()}</div>}
                      <span className="text-[10px] font-black uppercase">{p.alias}</span>
                    </div>
                    <span className="text-[9px] font-black tracking-widest bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30">GRANT</span>
                  </div>
                ))}
              {allProfiles.filter(p => p.alias.toLowerCase().includes(inviteSearchTerm.toLowerCase()) && !currentChannelMembers.includes(p.id)).length === 0 && (
                <p className="text-center text-[9px] opacity-40 py-4">No eligible nodes found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MAIN APP CONTAINER 🔥 */}
      <div className={`flex flex-col md:flex-row flex-1 min-h-0 w-full md:rounded-[2.5rem] md:border overflow-hidden md:shadow-2xl relative ${darkMode ? 'bg-zinc-950/80 md:border-zinc-800' : 'bg-white md:border-zinc-200'}`}>
        
        {/* SIDEBAR (Nodes List) */}
        <div className={`${activeChannel ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0 flex-col border-r h-full ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="p-3 md:p-4 border-b border-zinc-800/30 flex justify-between items-center bg-zinc-900 shrink-0">
             <div className="flex items-center gap-3 w-full">
                <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <input 
                  type="text" 
                  placeholder="Global Node Search..." 
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className={`bg-zinc-800 text-xs px-4 py-2 rounded-full outline-none text-white w-full border border-zinc-700 focus:border-blue-500 transition-colors`}
                />
             </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative bg-zinc-900 p-2">
            
            {showAddChan && (
              <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700 space-y-3 mb-4 animate-in slide-in-from-top-1 shadow-md">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-[10px] font-black uppercase text-blue-500">New Transmission</span>
                   <button onClick={() => setShowAddChan(false)} className="text-zinc-500 hover:text-white">✕</button>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <label className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 cursor-pointer bg-blue-600 text-white overflow-hidden`}>
                    {newChanLogoPreview ? <img src={newChanLogoPreview} className="w-full h-full object-cover" /> : '📷'}
                    <input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} className="hidden" />
                  </label>
                  <input 
                    className="w-full bg-transparent text-sm font-bold text-white outline-none border-b border-zinc-600 pb-1 placeholder-zinc-500" 
                    placeholder="Channel Name..."
                    value={newChanName}
                    onChange={e => setNewChanName(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-700">
                    <label className="flex items-center justify-between cursor-pointer text-zinc-400 hover:text-yellow-500 transition-colors">
                        <span className="text-[10px] font-black uppercase flex items-center gap-2">
                            <input type="checkbox" checked={newChanIsPremium} onChange={e => setNewChanIsPremium(e.target.checked)} className="accent-yellow-500 w-4 h-4" />
                            VIP Private
                        </span>
                    </label>
                    {newChanIsPremium && (
                        <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg">
                            <span className="text-[10px] font-bold text-zinc-500">PRICE:</span>
                            <input 
                                type="number" 
                                min="0"
                                className="bg-transparent text-sm font-bold text-yellow-500 outline-none w-full" 
                                placeholder="0 GAINS"
                                value={newChanGainsPrice}
                                onChange={e => setNewChanGainsPrice(Number(e.target.value))}
                            />
                            <span className="text-[10px] font-bold text-yellow-500">GAINS</span>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end pt-2">
                  <button onClick={handleAddChannel} className="text-xs font-bold text-white bg-blue-600 px-4 py-1.5 rounded-lg hover:bg-blue-500 w-full">Create</button>
                </div>
              </div>
            )}

            <div className="px-2 py-1 mb-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {isSearching ? 'Search Results' : 'My Chats'}
              </h3>
            </div>

            <div className="space-y-0.5 pb-20">
              {(isSearching ? globalSearchResults : sortedMyChannels).map((chan: any) => {
                const isPinnedInBase = chan.is_pinned; 
                const isActive = activeChannel?.id === chan.id;
                return (
                <div 
                  key={chan.id} 
                  onClick={() => setActiveChannel(chan)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all relative overflow-hidden border ${
                    isActive 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
                      : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/10 text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-16">
                    
                    <div className="relative shrink-0">
                      {chan.logo_url ? (
                        <img src={chan.logo_url} className={`w-10 h-10 rounded-full object-cover shrink-0 bg-zinc-800 border ${isPinnedInBase ? 'border-yellow-400 ring-2 ring-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.5)] z-10' : 'border-white/10'}`} />
                      ) : (
                        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-lg font-bold uppercase border ${isPinnedInBase ? 'border-yellow-400 ring-2 ring-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.5)] z-10' : 'border-white/10'} ${isActive ? 'bg-white text-blue-600' : ''}`} style={{ background: isActive ? 'white' : getAvatarGradient(chan.name) }}>
                          {chan.name?.charAt(0)}
                        </div>
                      )}
                      
                      {chan.is_premium && !isPinnedInBase && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] px-1 rounded font-black border border-black z-10">VIP</div>
                      )}
                      
                      {isPinnedInBase && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[8px] px-1 rounded-full z-20 shadow-md border border-black">📌</div>
                      )}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[12px] font-bold truncate tracking-wide ${isPinnedInBase && !isActive ? 'text-yellow-500' : ''}`}>#{chan.name}</span>
                      <span className={`text-[10px] truncate ${isActive ? 'text-blue-200' : 'text-zinc-500'}`}>
                        {chan.is_premium ? '🔒 Exclusive' : 'Public'}
                      </span>
                    </div>
                  </div>

                  {!isSearching && chan.is_muted && (
                     <div className="flex items-center shrink-0 opacity-50 transition-opacity group-hover:opacity-0 mr-2">
                        <span className="text-xs">🔇</span>
                     </div>
                  )}

                  {!isSearching && (
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${
                      isActive ? 'bg-blue-600' : 'bg-zinc-800'
                    } pl-2 shadow-[-10px_0_10px_rgba(39,39,42,1)] z-30`}>
                      <button 
                        onClick={(e) => handleToggleMute(chan.id, chan.is_muted, e)}
                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-all active:scale-90 ${chan.is_muted ? 'opacity-100' : 'opacity-40'}`}
                        title={chan.is_muted ? 'Unmute' : 'Mute'}
                      >
                        {chan.is_muted ? '🔇' : '🔊'}
                      </button>
                      <button 
                        onClick={(e) => handleTogglePin(chan.id, isPinnedInBase, e)}
                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-all active:scale-90 ${isPinnedInBase ? 'opacity-100 text-yellow-500' : 'opacity-40'}`}
                        title={isPinnedInBase ? 'Unpin' : 'Pin to top'}
                      >
                        📌
                      </button>
                    </div>
                  )}
                </div>
              )})}
              
              {!isSearching && myChannels.length === 0 && (
                 <div className="text-center p-6 opacity-40 mt-10">
                    <p className="text-[10px] font-black uppercase mb-2">No active chats</p>
                    <p className="text-[8px] uppercase">Use the global search to find nodes or create your own.</p>
                 </div>
              )}
            </div>

            {!isSearching && (
              <button 
                onClick={() => setShowAddChan(true)}
                className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-[0_4px_15px_rgba(59,130,246,0.4)] flex items-center justify-center transition-all z-20 hover:scale-110 active:scale-95"
                title="Create New Channel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
            )}
          </div>
        </div>

        {/* CHAT AREA (Messages) */}
        <div 
          className={`${!activeChannel ? 'hidden md:flex' : 'flex'} flex-1 min-h-0 flex-col relative h-full bg-zinc-900 transition-all duration-300`}
          style={{ 
            background: activeChannel ? `linear-gradient(180deg, ${activeChannel?.bg_color || '#1a1a1a'} 0%, ${activeChannel?.bg_image_url || '#000000'} 100%)` : ''
          }}
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/diagmonds-light.png')" }} />

          {activeChannel ? (
            <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
              
              {/* 🔥 FLOATING HEADER (Naslov, Topic) 🔥 */}
              <div className="absolute top-0 left-0 right-0 z-20 flex flex-col pointer-events-auto">
                  {daysUntilExpiry !== null && (
                    <div className="bg-yellow-500 text-black px-4 py-1 flex items-center justify-between shadow-md shrink-0">
                        <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                            ⚠️ VIP Access expires in {daysUntilExpiry} days
                        </span>
                        <span className="text-[8px] font-bold uppercase opacity-80">
                            Top up GAINS
                        </span>
                    </div>
                  )}

                  <div className={`px-3 md:px-6 py-2 md:py-3 border-b border-white/5 flex justify-between items-center bg-black/60 backdrop-blur-xl shrink-0 shadow-lg`}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveChannel(null)} className="md:hidden text-zinc-400 hover:text-white p-1 -ml-1 shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                      </button>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <h2 className="text-[13px] md:text-sm font-bold text-white flex items-center gap-2 truncate">
                          {activeChannel.name}
                          {activeChannel.is_premium && <span className="text-[7px] md:text-[8px] bg-yellow-500 text-black px-1.5 rounded font-black shrink-0">VIP</span>}
                        </h2>
                        
                        {/* 🔥 SPREMENJEN ZGORNJI GUMB ZA ONLINE/MEMBERS 🔥 */}
                        <div 
                            className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate cursor-pointer hover:text-white flex items-center gap-1.5 transition-colors"
                            onClick={() => { if(isMemberOfActive) setShowOnlineUsers(true); }}
                        >
                          {isMemberOfActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                              {onlineUsers.length} ONLINE / {currentChannelMembers.length} MEMBERS
                            </>
                          ) : 'PREVIEW MODE'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 items-center shrink-0">
                      {activeChannel.owner_id === userData.id && (
                        <div className="relative flex items-center gap-2 md:gap-3">
                          <button onClick={() => setShowStylePicker(true)} className="text-zinc-400 hover:text-white transition-colors" title="Change Colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
                          </button>
                          
                          <button onClick={() => handleRemoveChannel(activeChannel.id)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Delete Channel">
                            🗑️
                          </button>
                        </div>
                      )}
                      
                      {isOwnProfile && (
                        <button onClick={handleOpenInviteSearch} className="text-zinc-400 hover:text-white transition-colors" title="Invite User">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                        </button>
                      )}
                      
                      {/* 🔥 GUMB ZA ZAPUSTITEV KANALA 🔥 */}
                      {isMemberOfActive && activeChannel.owner_id !== userData.id && (
                        <button onClick={handleLeaveChannel} className="text-zinc-400 hover:text-red-500 transition-colors" title="Leave Channel">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {isMemberOfActive && (
                    <div className="px-2 md:px-4 py-1.5 md:py-2 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center gap-2 overflow-x-auto scrollbar-hide shrink-0 shadow-sm">
                      {topics.map(t => {
                        const isActive = activeTopic?.id === t.id;
                        const isOwner = activeChannel.owner_id === userData.id;
                        const unreadCount = topicUnread[t.id] || 0; 
                        
                        return (
                          <div key={t.id} className={`flex items-center rounded-full transition-all shrink-0 ${isActive ? 'bg-white text-black shadow-lg pl-3 md:pl-4 pr-1 md:pr-2' : 'bg-white/10 text-white/60 hover:bg-white/20 px-3 md:px-4'}`}>
                            <button 
                                onClick={() => {
                                    setActiveTopic(t);
                                    setTopicUnread(prev => {
                                        const updated = { ...prev };
                                        delete updated[t.id];
                                        return updated;
                                    });
                                }} 
                                className="py-1 md:py-1.5 flex items-center gap-1.5"
                            >
                              <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider whitespace-nowrap">#{t.name}</span>
                              
                              {!isActive && unreadCount > 0 && (
                                  <span className="bg-red-500 text-white text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded-full inline-flex items-center justify-center animate-pulse">
                                      {unreadCount}
                                  </span>
                              )}
                            </button>
                            
                            {isActive && isOwner && (
                              <div className="flex items-center ml-1 md:ml-2 border-l border-black/20 pl-1 md:pl-2 gap-1">
                                <button onClick={(e) => handleEditTopic(t.id, t.name, e)} className="text-[10px] opacity-60 hover:opacity-100 hover:text-blue-600 transition-colors" title="Rename Topic">✏️</button>
                                <button onClick={(e) => handleRemoveTopic(t.id, e)} className="text-[10px] opacity-60 hover:opacity-100 hover:text-red-600 transition-colors" title="Delete Topic">🗑️</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {activeChannel.owner_id === userData.id && (
                        <button 
                            onClick={() => setShowAddTopic(true)} 
                            className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shrink-0 text-xs md:text-base"
                        >
                            +
                        </button>
                      )}
                    </div>
                  )}

                  {/* 🔥 PIN CAROUSEL IMPLEMENTACIJA 🔥 */}
                  {pinnedMessages.length > 0 && (
                    <div className="bg-blue-900/40 border-b border-blue-500/30 px-4 py-2 flex flex-col shadow-md backdrop-blur-md z-10 shrink-0">
                      <div className="flex items-start gap-3">
                        <span className="text-blue-400 mt-0.5">📌</span>
                        <div 
                          className="flex flex-col min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                              const el = document.getElementById(`msg-${pinnedMessages[activePinIndex].id}`);
                              if (el && chatScrollRef.current) {
                                  chatScrollRef.current.scrollTo({
                                      top: el.offsetTop - 150,
                                      behavior: 'smooth'
                                  });
                                  el.classList.add('ring-2', 'ring-blue-500', 'bg-blue-900/30', 'rounded-2xl');
                                  setTimeout(() => {
                                      el.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-900/30', 'rounded-2xl');
                                  }, 2000);
                              } else {
                                  toast.info("Message might be higher up in the history.");
                              }
                          }}
                        >
                           <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest">
                              Pinned Message {pinnedMessages.length > 1 ? `${activePinIndex + 1}/${pinnedMessages.length}` : ''} • {pinnedMessages[activePinIndex].profiles?.alias || pinnedMessages[activePinIndex].author_alias}
                           </span>
                           <span className="text-xs text-white truncate opacity-90">
                              {pinnedMessages[activePinIndex].text}
                           </span>
                        </div>
                      </div>
                      
                      {pinnedMessages.length > 1 && (
                        <div className="flex justify-center gap-1.5 mt-2">
                          {pinnedMessages.map((_, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setActivePinIndex(idx)}
                              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${idx === activePinIndex ? 'w-4 bg-blue-400' : 'w-1.5 bg-blue-900 hover:bg-blue-700'}`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>

              {isMemberOfActive ? (
                <>
                  {/* 🔥 CHAT MESSAGE AREA - Z REF-OM ZA PRAVILNO SCROLLANJE ZNOTRAJ DIVA 🔥 */}
                  <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 custom-scrollbar bg-black/10 pt-36 pb-40 md:pb-48 relative" onClick={() => setSelectedMsgId(null)}>
                    {messages.map((m: any, i) => {
                      const isMe = m.author_id === userData.id;
                      const isMsgAuthorInstitutional = m.profiles?.is_institutional === true;
                      const isSystem = m.author_alias === 'SYSTEM';

                      const isOwner = activeChannel.owner_id === userData.id;
                      const canDelete = isMe || isOwner;
                      const isSelected = selectedMsgId === m.id;

                      if (isSystem) {
                        return (
                          <div key={m.id || i} id={`msg-${m.id}`} className="flex justify-center my-2 md:my-3 w-full transition-all duration-500">
                            <div className="px-3 md:px-4 py-1 bg-blue-900/30 border border-blue-500/50 rounded-xl text-center max-w-[85%] md:max-w-[80%]">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{m.text}</span>
                            </div>
                          </div>
                        );
                      }

                      let signalPayload = null;
                      let displayMessage = m.text;
                      let isReply = false;
                      let replyAlias = "";
                      
                      // PREVERI ČE JE REPLY IN PARSIRAJ
                      if (m.text && m.text.startsWith('> Replying to')) {
                        const parts = m.text.split('\n\n');
                        if (parts.length >= 2) {
                            isReply = true;
                            const firstLine = parts[0];
                            const aliasMatch = firstLine.match(/> Replying to (.*?):/);
                            replyAlias = aliasMatch ? aliasMatch[1] : "Unknown";
                            
                            displayMessage = parts.slice(1).join('\n\n');
                        }
                      }
                      
                      if (displayMessage && displayMessage.startsWith('[GW_SIGNAL_PAYLOAD]')) {
                          try {
                              signalPayload = JSON.parse(displayMessage.replace('[GW_SIGNAL_PAYLOAD]', ''));
                              displayMessage = "";
                          } catch (e) {}
                      }

                      const imgUrl = m.image_url || m.file_url; 
                      
                      const msgDate = m.created_at ? new Date(m.created_at) : new Date();
                      const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dateStr = msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                      const fullMsgTime = `${dateStr} ${timeStr}`;

                      // Preberi JSON reakcije
                      const reactions = m.reactions || {};
                      const hasReactions = Object.keys(reactions).length > 0;

                      return (
                        <div key={m.id || i} id={`msg-${m.id}`} className={`flex gap-2 group relative transition-all duration-500 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${hasReactions ? 'mb-6 md:mb-8' : ''}`}>
                          
                          {/* AVATAR */}
                          {m.profiles?.avatar_url ? (
                            <img 
                              src={m.profiles.avatar_url} 
                              className="w-8 h-8 rounded-full object-cover shrink-0 cursor-pointer self-end shadow-sm" 
                              alt={m.author_alias}
                              onClick={(e) => openModMenu(e, m.author_id, m.profiles?.alias || m.author_alias, m.profiles?.win_rate)}
                            />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-full shrink-0 cursor-pointer flex items-center justify-center text-white font-black text-[10px] self-end shadow-sm" 
                              style={{ background: getAvatarGradient(m.profiles?.alias || m.author_alias) }}
                              onClick={(e) => openModMenu(e, m.author_id, m.profiles?.alias || m.author_alias, m.profiles?.win_rate)}
                            >
                              {(m.profiles?.alias || m.author_alias)?.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* BUBBLE CONTENT */}
                          <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                            
                            {/* ALIAS (samo za druge) */}
                            {!isMe && (
                              <div className="flex items-center gap-1 mb-0.5 ml-2">
                                <span 
                                  className="text-[10px] font-bold text-zinc-400 cursor-pointer hover:text-blue-400 transition-colors"
                                  onClick={(e) => openModMenu(e, m.author_id, m.profiles?.alias || m.author_alias, m.profiles?.win_rate)}
                                >
                                  {m.profiles?.alias || m.author_alias}
                                </span>
                                {isMsgAuthorInstitutional && (
                                  <svg className="w-3 h-3 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2l-6 2.5v5c0 4.5 3.5 8.5 6 10.5 2.5-2 6-6 6-10.5v-5L10 2z" /></svg>
                                )}
                              </div>
                            )}
                            
                            {editingMsgId === m.id ? (
                              <div className="flex flex-col gap-2 bg-zinc-800 p-2 md:p-3 rounded-xl border border-zinc-700 min-w-[200px] shadow-xl">
                                <textarea 
                                  className="bg-transparent text-sm outline-none resize-none h-16 text-white custom-scrollbar"
                                  value={editingMsgText}
                                  onChange={e => setEditingMsgText(e.target.value)}
                                />
                                <div className="flex justify-end gap-3">
                                  <button onClick={() => setEditingMsgId(null)} className="text-xs font-bold text-zinc-400">CANCEL</button>
                                  <button onClick={() => handleUpdateMessage(m.id)} className="text-xs font-bold text-blue-500">SAVE</button>
                                </div>
                              </div>
                            ) : (
                              <div className={`relative group/bubble flex items-center ${isSelected ? 'z-40' : ''}`}>
                                
                                {/* 🔥 TELEGRAM OBLAČEK Z AKCIJO NA KLIK 🔥 */}
                                <div 
                                  onClick={(e) => { e.stopPropagation(); setSelectedMsgId(isSelected ? null : m.id); }}
                                  className={`cursor-pointer ${signalPayload ? 'w-full' : 'px-3 py-2 shadow-sm'} text-[13px] md:text-[14px] relative flex flex-col transition-all ${
                                    isMe 
                                      ? `rounded-t-2xl rounded-l-2xl rounded-br-sm ${signalPayload ? '' : 'bg-[#2b5278] text-white'}` 
                                      : `rounded-t-2xl rounded-r-2xl rounded-bl-sm ${signalPayload ? '' : 'bg-[#182533] text-white'}`
                                  } ${isSelected ? 'ring-2 ring-white/30' : ''}`}
                                >
                                  
                                  {/* 🔥 REPLY OBLAČEK 🔥 */}
                                  {isReply && (
                                    <div className={`mb-1.5 pl-2 border-l-2 opacity-80 flex flex-col ${isMe ? 'border-white text-white' : 'border-blue-400 text-zinc-300'}`}>
                                      <span className="text-[9px] font-black uppercase">{replyAlias}</span>
                                      <span className="text-[10px] italic truncate max-w-[200px]">{m.text.split('\n\n')[0].replace(/> "([^"]+)"/, '$1')}</span>
                                    </div>
                                  )}

                                  {signalPayload ? (
                                      <SignalCard 
                                          payload={signalPayload} 
                                          onCopy={(data) => setCopyModalPost(data)} 
                                          isOwn={isMe}
                                      />
                                  ) : (
                                      <>
                                          {imgUrl && (
                                            <a href={imgUrl} target="_blank" rel="noreferrer" className="block mb-1">
                                               <img src={imgUrl} className="w-full max-w-[240px] rounded-lg cursor-pointer" alt="attached" />
                                            </a>
                                          )}
                                          
                                          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                                            {displayMessage && <span className="leading-relaxed whitespace-pre-wrap break-words">{displayMessage}</span>}
                                            
                                            <div className="flex items-center gap-1 shrink-0 ml-auto pt-1 mt-1">
                                              <span className="text-[9px] font-bold text-sky-200/80 tracking-widest whitespace-nowrap">
                                                {fullMsgTime}
                                              </span>
                                              {isMe && <span className="text-[10px] text-sky-400 ml-0.5">✓✓</span>}
                                            </div>
                                          </div>
                                      </>
                                  )}

                                  {/* 🔥 ACTION MENU (Prikaže se pod oblačkom, ko klikneš) - POPRAVLJEN ZA MOBILE & DESKTOP 🔥 */}
                                  {isSelected && (
                                    <div className={`absolute ${isMe ? 'right-0 md:mr-10' : 'left-0 md:ml-10'} top-full mt-1 flex flex-wrap items-center justify-end gap-1 bg-zinc-800/95 backdrop-blur rounded-lg p-1.5 z-50 border border-zinc-700 shadow-2xl min-w-[200px]`}>
                                      {/* EMOJI BAR */}
                                      <div className="flex flex-wrap justify-center gap-1 border-b md:border-b-0 md:border-r border-zinc-700 pb-1 md:pb-0 md:pr-1 w-full md:w-auto">
                                        {['👍', '🔥', '🚀', '📉', '🤝'].map(emoji => (
                                           <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(m.id, emoji, reactions); }} className="p-1.5 hover:bg-zinc-700 rounded transition-transform hover:scale-110 active:scale-95 text-base md:text-sm">{emoji}</button>
                                        ))}
                                      </div>

                                      <div className="flex items-center gap-1 w-full md:w-auto justify-end pt-1 md:pt-0">
                                        <button onClick={(e) => { e.stopPropagation(); setReplyingToMsg(m); setSelectedMsgId(null); }} className="text-zinc-300 hover:text-white text-[10px] px-2 py-1.5 rounded hover:bg-zinc-700 font-bold uppercase tracking-widest flex-1 md:flex-none text-center">↩️ Reply</button>
                                        
                                        {isOwner && (
                                          <button onClick={(e) => { e.stopPropagation(); handlePinMessage(m.id, m.is_pinned); }} className="text-zinc-300 hover:text-blue-400 text-[10px] px-2 py-1.5 rounded hover:bg-zinc-700 font-bold uppercase tracking-widest flex-1 md:flex-none text-center">
                                             {m.is_pinned ? 'Unpin' : '📌 Pin'}
                                          </button>
                                        )}

                                        {canDelete && !signalPayload && (
                                          <>
                                            {isMe && <button onClick={(e) => { e.stopPropagation(); setEditingMsgId(m.id); setEditingMsgText(displayMessage); setSelectedMsgId(null); }} className="text-zinc-300 hover:text-white text-[10px] px-2 py-1.5 rounded hover:bg-zinc-700 font-bold uppercase tracking-widest flex-1 md:flex-none text-center">✏️ Edit</button>}
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m.id, m.author_id); }} className="text-red-400 hover:text-red-300 text-[10px] px-2 py-1.5 rounded hover:bg-red-900/30 font-bold uppercase tracking-widest flex-1 md:flex-none text-center">🗑️ Del</button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 🔥 PRIKAZ EMOJI REAKCIJ 🔥 */}
                                {hasReactions && (
                                  <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex gap-1 z-10`}>
                                     {Object.entries(reactions).map(([emoji, users]: [string, any]) => (
                                        <div key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(m.id, emoji, reactions); }} className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 cursor-pointer border shadow-sm ${users.includes(userData.alias) ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'}`}>
                                           <span>{emoji}</span>
                                           <span className="font-bold">{users.length}</span>
                                        </div>
                                     ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 🔥 FLOATING INPUT AREA 🔥 */}
                  <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-auto bg-black/60 backdrop-blur-xl border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                    
                    {/* PRIKAZ AKTIVNEGA REPLY-ja NAD INPUTOM */}
                    {replyingToMsg && (
                      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-white/5 text-xs">
                        <div className="flex flex-col border-l-2 border-blue-500 pl-2 overflow-hidden">
                          <span className="font-bold text-blue-400 text-[10px] uppercase">Replying to {replyingToMsg.profiles?.alias || replyingToMsg.author_alias}</span>
                          <span className="text-zinc-400 truncate opacity-80 text-[11px]">
                             {replyingToMsg.text.startsWith('> Replying to') ? replyingToMsg.text.split('\n\n').slice(1).join('\n\n').substring(0, 40) : replyingToMsg.text.substring(0, 40)}...
                          </span>
                        </div>
                        <button onClick={() => setReplyingToMsg(null)} className="p-1 text-zinc-500 hover:text-white shrink-0">✕</button>
                      </div>
                    )}

                    {/* 🔥 EMOJI PICKER DROPDOWN 🔥 */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-full right-4 mb-2 bg-zinc-900 border border-zinc-700 rounded-2xl p-2 shadow-2xl z-50 flex flex-wrap w-64 gap-1">
                        {['😀','😂','🥰','😎','🤔','😡','🚀','🔥','📉','📈','🤝','👀','💯','💎','💸'].map(emoji => (
                          <button key={emoji} onClick={() => insertEmoji(emoji)} className="p-2 hover:bg-zinc-700 rounded-lg text-xl transition-transform hover:scale-110 active:scale-95">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 🔥 MENTIONS DROPDOWN MENU 🔥 */}
                    {showMentionMenu && (
                        <div className="absolute bottom-full left-0 mb-1 w-full bg-zinc-900 border border-zinc-700 rounded-t-xl max-h-48 overflow-y-auto custom-scrollbar shadow-2xl z-50">
                           {allProfiles.filter(p => currentChannelMembers.includes(p.id) && p.alias.toLowerCase().includes(mentionFilter.toLowerCase()) && p.alias !== userData.alias).length > 0 ? (
                               allProfiles.filter(p => currentChannelMembers.includes(p.id) && p.alias.toLowerCase().includes(mentionFilter.toLowerCase()) && p.alias !== userData.alias).map(p => (
                                   <div key={p.id} onClick={() => insertMention(p.alias)} className="flex items-center gap-3 p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/50">
                                      {p.avatar_url ? <img src={p.avatar_url} className="w-6 h-6 rounded-md object-cover" /> : <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[8px]" style={{ background: getAvatarGradient(p.alias) }}>{p.alias?.charAt(0).toUpperCase()}</div>}
                                      <span className="text-xs font-bold text-white">{p.alias}</span>
                                   </div>
                               ))
                           ) : (
                               <div className="p-3 text-xs text-zinc-500 text-center uppercase font-bold">No channel members found</div>
                           )}
                        </div>
                    )}

                    <div className="p-2 md:p-3 flex items-end gap-2 pb-safe relative">
                      <label className={`text-zinc-400 hover:text-blue-500 cursor-pointer p-2 shrink-0 ${uploadingFile ? 'animate-pulse text-blue-500' : ''}`} title="Upload File">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                         <input type="file" accept="image/*, .pdf, .zip, .rar" className="hidden" onChange={handleChatFileUpload} disabled={uploadingFile} />
                      </label>
                      <button onClick={handleOpenSignalPicker} className="text-zinc-400 hover:text-green-500 p-2 shrink-0 transition-colors" title="Share Active Signal">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                      </button>
                      
                      <div className="flex-1 relative bg-zinc-900/80 border border-zinc-700/50 rounded-2xl flex items-center pr-1 overflow-hidden shadow-inner">
                        <textarea 
                          className="w-full bg-transparent px-3 py-3 outline-none text-sm text-white placeholder-zinc-500 resize-none max-h-32 min-h-[44px] custom-scrollbar" 
                          placeholder={uploadingFile ? "Uploading..." : `Message (@ to mention)`} 
                          value={newMessage} 
                          onChange={handleInputContentChange} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        
                        <div className="flex items-center shrink-0 pr-1 gap-1">
                          {/* 🔥 GUMB ZA EMOJIJE 🔥 */}
                          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-zinc-400 hover:text-yellow-400 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </button>

                          {newMessage.trim() && (
                            <button onClick={handleSendMessage} disabled={newMessage.length > charLimit} className="p-2 text-blue-500 hover:text-blue-400 transition-colors disabled:opacity-20 mr-1">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md p-6 text-center animate-in zoom-in-95 duration-500 h-full">
                  {activeChannel.logo_url ? (
                     <img src={activeChannel.logo_url} className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover mb-4 border-4 border-zinc-800 shadow-2xl" />
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-4xl font-black text-white mb-4 shadow-2xl border-4 border-zinc-800" style={{ background: getAvatarGradient(activeChannel.name) }}>
                      {activeChannel.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">{activeChannel.name}</h2>
                  <p className="text-zinc-400 text-xs md:text-sm max-w-md mx-auto mb-8 leading-relaxed px-4">
                    {activeChannel.is_premium ? `This VIP Node is locked. The admin has requested an access fee.` : "This is a public broadcast Node. Join to see the intel and participate in the discussion."}
                  </p>
                  
                  {activeChannel.is_premium && (
                     <div className="flex items-center gap-3 mb-6 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 shrink-0">
                         <div className="flex flex-col text-left"><span className="text-[10px] font-black uppercase text-zinc-500">Access Fee</span><span className="text-lg md:text-xl font-black text-yellow-500">{activeChannel.unlock_price_gains} GAINS</span></div>
                         <div className="h-8 w-px bg-zinc-700"></div>
                         <div className="flex flex-col text-left"><span className="text-[10px] font-black uppercase text-zinc-500">Duration</span><span className="text-lg md:text-xl font-black text-white">30 Days</span></div>
                     </div>
                  )}
                  <button onClick={handleJoinChannel} className={`w-full max-w-[280px] px-4 py-4 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider shadow-2xl transition-all hover:scale-105 active:scale-95 shrink-0 ${hasInvite ? 'bg-yellow-500 text-black' : 'bg-white text-black'}`}>
                    {activeChannel.is_premium ? (hasInvite ? '🎟️ ACCEPT VIP INVITE' : `🔒 UNLOCK ACCESS`) : 'JOIN NETWORK'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex m-auto flex-col items-center justify-center text-zinc-500 relative z-10">
              <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <svg className="w-10 h-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              </div>
              <span className="bg-zinc-900 px-4 py-1.5 rounded-full text-xs font-medium">Select a node to establish connection</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
