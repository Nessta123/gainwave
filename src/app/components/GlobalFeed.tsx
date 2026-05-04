"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; 
import { toast } from 'sonner';
import StoryBar from './StoryBar';
import StoryViewer from './StoryViewer'; 

// 🔥 DODAN DETEKTOR IN EKSTRAKTOR ZA KOVANCE 🔥
const isForgePost = (content: string) => content && content.includes("GLOBAL FORGE ALERT");
const extractForgeData = (content: string) => {
  const nameMatch = content.match(/\*\*Asset:\*\* (.*?) \(/);
  const symbolMatch = content.match(/\((.*?)\)/);
  const scoreMatch = content.match(/\*\*Trust Score:\*\* (.*?)%/);
  return {
    name: nameMatch ? nameMatch[1] : "New Asset",
    symbol: symbolMatch ? symbolMatch[1] : "TKN",
    score: scoreMatch ? scoreMatch[1] : "0"
  };
};

// --- POSODOBLJEN INTERFACE ---
interface Post {
  id: any;
  user_id: string;
  created_at: string;
  text?: string;
  content?: string;
  image?: string;
  authorAlias?: string;
  authorAvatar?: string;
  authorCountry?: string;
  win_rate?: number;
  total_gain?: number;
  total_profit?: number;
  verify_source?: string;
  is_premium?: boolean;      
  author_is_premium?: boolean; 
  is_copyable?: boolean;     
  price_bulls?: number;
  signal_status?: string;
  pair?: string;
  direction?: string;
  entry?: string;
  sl?: string;
  tp?: string;
  exit_price?: string;
  is_unlocked?: boolean;
  bulls?: number;
  bears?: number;
  is_institutional?: boolean; 
  is_boosted?: boolean; 
  hub_id?: string; // Dodano za Hub povezavo
  is_boosted_ad?: boolean; // 🔥 NOVO: Da feed prepozna, da gre za plačan Inject
}

interface GlobalFeedProps {
  posts: Post[]; 
  boostedPosts?: Post[]; // 🔥 NOVO: Promovirane objave iz baze
  userData: any;
  handleVote: (id: any, type: 'bull' | 'bear') => void;
  handleFollow: (alias: string) => void;
  darkMode: boolean; 
  onVisitProfile: (alias: string) => void;
  handleDeletePost: (id: string) => void;
  handleUnlock?: (id: string, price: number) => void; 
  handleSignalAction?: (id: string, actionType: 'manual_close' | 'set_be') => void;
  onViewProject?: (id: any) => void; 
  onJoinHub?: (hubId: string) => void; 
}

// 🔥 EXTREME 3D GLASS UI FUNKCIJE 🔥
const getGlassPanelClass = (darkMode: boolean) => darkMode 
  ? 'bg-gradient-to-br from-zinc-800/40 via-zinc-900/60 to-black/90 backdrop-blur-2xl border border-white/5 border-t-white/20 border-l-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.8)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
  : 'bg-gradient-to-br from-white/90 via-zinc-100/70 to-zinc-300/50 backdrop-blur-2xl border border-white/60 border-t-white/90 border-l-white/90 shadow-[0_25px_50px_rgba(0,0,0,0.1)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]';

const getGlassCardClass = (darkMode: boolean) => darkMode
  ? 'bg-gradient-to-br from-zinc-700/30 to-zinc-900/80 backdrop-blur-xl border border-white/5 border-t-white/10 border-l-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)] transition-all duration-300'
  : 'bg-gradient-to-br from-white/80 to-zinc-200/50 backdrop-blur-xl border border-white/50 border-t-white/80 border-l-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.08)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.15)] transition-all duration-300';

const getSunkenClass = (darkMode: boolean) => darkMode
  ? 'bg-black/60 shadow-[inset_0_4px_20px_rgba(0,0,0,1)] border border-zinc-800/80 border-b-white/5 border-r-white/5 text-white placeholder-zinc-500'
  : 'bg-zinc-200/60 shadow-[inset_0_4px_15px_rgba(0,0,0,0.1)] border border-zinc-300/80 border-b-white/80 border-r-white/80 text-zinc-900 placeholder-zinc-400';


export default function GlobalFeed({ 
  posts, 
  boostedPosts = [], // 🔥 NOVO: Default prazen array
  userData, 
  handleVote, 
  handleFollow, 
  darkMode,
  onVisitProfile,
  handleDeletePost,
  handleUnlock,
  handleSignalAction,
  onViewProject,
  onJoinHub
}: GlobalFeedProps) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [lastPostId, setLastPostId] = useState<number | null>(null);
  
  const [commentsMap, setCommentsMap] = useState<{[key: string]: any[]}>({});
  const [openComments, setOpenComments] = useState<{[key: string]: boolean}>({});
  const [commentInputs, setCommentInputs] = useState<{[key: string]: string}>({});
  const [unreadCounts, setUnreadCounts] = useState<{[key: string]: number}>({});

  const [copyModalPost, setCopyModalPost] = useState<Post | null>(null);
  const [copyRiskType, setCopyRiskType] = useState<'percent' | 'fixed'>('percent');
  const [copyRiskValue, setCopyRiskValue] = useState<string>("1");

  const [userStoriesMap, setUserStoriesMap] = useState<{[key: string]: any[]}>({});
  const [activeStoryToView, setActiveStoryToView] = useState<any[] | null>(null);

  const [subscribedTraderIds, setSubscribedTraderIds] = useState<string[]>([]);
  const [boostModalPost, setBoostModalPost] = useState<Post | null>(null);

  // 🔥 NOVO: MARKETING INJECTOR LOGIKA (Vsaka 15 objava je reklama) 🔥
  const injectBoostedPosts = (normalPosts: Post[], ads: Post[]) => {
    if (!ads || ads.length === 0) return normalPosts;
    
    const combinedFeed: Post[] = [];
    let adIndex = 0;

    normalPosts.forEach((post, index) => {
      combinedFeed.push(post);
      
      // Vstavi reklamo po vsakih 14 objavah (torej na 15. mesto)
      if ((index + 1) % 14 === 0 && ads[adIndex]) {
        combinedFeed.push({ ...ads[adIndex], is_boosted_ad: true });
        adIndex = (adIndex + 1) % ads.length; // Loop čez reklame, če jih zmanjka
      }
    });

    return combinedFeed;
  };

  const safePosts = Array.isArray(posts) ? injectBoostedPosts(posts, boostedPosts) : [];

  useEffect(() => {
    const fetchUserSubscriptions = async () => {
      if (!userData?.id) return;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('trader_id')
        .eq('subscriber_id', userData.id)
        .gt('expires_at', new Date().toISOString());

      if (!error && data) {
        const ids = data.map(sub => sub.trader_id);
        setSubscribedTraderIds(ids);
      }
    };

    fetchUserSubscriptions();
  }, [userData?.id]);

  useEffect(() => {
    if (safePosts.length > 0) {
      setLastPostId(safePosts[0].id);
      const timer = setTimeout(() => setLastPostId(null), 3000);
      
      safePosts.forEach(post => {
        if(!post.is_boosted_ad) fetchUnreadCount(post.id);
      });

      const channel = supabase
        .channel('public:post_comments_feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'post_comments' },
          (payload) => {
            const newComment = payload.new;
            if (newComment.user_id !== userData?.id) {
              setUnreadCounts(prev => ({
                ...prev,
                [newComment.post_id]: (prev[newComment.post_id] || 0) + 1
              }));
            }
          }
        )
        .subscribe();

      return () => {
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    }
  }, [safePosts.length, userData?.id]); 

  useEffect(() => {
    const fetchStoriesForAuthors = async () => {
      if (!userData?.id || safePosts.length === 0) return;
      
      const uniqueAuthorIds = Array.from(new Set(safePosts.filter(p => !p.is_boosted_ad).map(p => p.user_id)));
      if (uniqueAuthorIds.length === 0) return;

      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles(id, alias, avatar_url, is_live)')
        .in('user_id', uniqueAuthorIds)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (!error && data) {
        const grouped = data.reduce((acc: any, story: any) => {
          if (!acc[story.user_id]) acc[story.user_id] = [];
          acc[story.user_id].push(story);
          return acc;
        }, {});
        setUserStoriesMap(grouped);
      }
    };
    
    fetchStoriesForAuthors();
  }, [safePosts, userData?.id]);

  const fetchUnreadCount = async (postId: string) => {
    if (!userData?.id) return;
    const { data: viewData } = await supabase
      .from('post_views')
      .select('last_viewed_at')
      .eq('user_id', userData.id)
      .eq('post_id', postId)
      .maybeSingle();

    const lastViewed = viewData?.last_viewed_at || new Date(0).toISOString();
    const { count, error } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .gt('created_at', lastViewed);
      
    if (!error && count !== null) {
      setUnreadCounts(prev => ({ ...prev, [postId]: count }));
    }
  };

  const markAsRead = async (postId: string) => {
    if (!userData?.id) return;
    const { error } = await supabase
      .from('post_views')
      .upsert({ 
        user_id: userData.id, 
        post_id: postId, 
        last_viewed_at: new Date().toISOString() 
      }, { onConflict: 'user_id,post_id' });
      
    if (!error) {
      setUnreadCounts(prev => ({ ...prev, [postId]: 0 }));
    }
  };

  const fetchComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setCommentsMap(prev => ({ ...prev, [postId]: data }));
    }
  };

  const submitComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    const { error } = await supabase.from('post_comments').insert([{
      post_id: postId,
      user_id: userData.id,
      author_alias: userData.alias,
      text: text.trim()
    }]);
    if (!error) {
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId); 
      markAsRead(postId);
    }
  };

  const toggleComments = (postId: string) => {
    if (!openComments[postId]) {
      fetchComments(postId);
      markAsRead(postId);
    }
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleUserClick = (e: React.MouseEvent, postUserId: string, alias: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (userStoriesMap[postUserId] && userStoriesMap[postUserId].length > 0) {
      setActiveStoryToView(userStoriesMap[postUserId]);
    } else if (alias && onVisitProfile) {
      onVisitProfile(alias);
    }
  };

  const handleVoteClick = (postId: any, voteType: 'bull' | 'bear', isClosed: boolean) => {
    if (isClosed) {
      alert("This signal is already closed. Voting is disabled.");
      return;
    }
    handleVote(postId, voteType);
  };

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

  const executeBoostPost = async (cost: number, durationHours: number) => {
    if (!boostModalPost || !userData?.id) return;

    if (userData.gains_balance < cost) {
      alert("Insufficient GAINS! Please top up your wallet.");
      return;
    }

    try {
      const { error: walletErr } = await supabase
        .from('user_balances')
        .update({ bulls_balance: userData.gains_balance - cost })
        .eq('user_id', userData.id);

      if (walletErr) throw walletErr;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      const { error: postErr } = await supabase
        .from('posts')
        .update({ 
          is_boosted: true, 
          boost_expires_at: expiresAt.toISOString() 
        })
        .eq('id', boostModalPost.id);

      if (postErr) throw postErr;

      alert("🚀 Signal Boosted Successfully! It is now prioritized in the Global Feed.");
      setBoostModalPost(null);
      window.location.reload();
      
    } catch (err: any) {
      console.error("Napaka pri boostanju:", err);
      alert("Sistemska napaka pri boostanju: " + err.message);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full overflow-x-hidden relative">
      
      <StoryBar userData={userData} darkMode={darkMode} />

      {activeStoryToView && (
        <StoryViewer 
          stories={activeStoryToView} 
          currentUser={userData} 
          onClose={() => setActiveStoryToView(null)} 
          onStoryDeleted={(id: string) => {
            const authorId = activeStoryToView[0]?.user_id;
            const newStories = activeStoryToView.filter((s: any) => s.id !== id);
            
            if (newStories.length === 0) {
              setActiveStoryToView(null);
              setUserStoriesMap(prev => {
                  const updated = {...prev};
                  delete updated[authorId];
                  return updated;
              });
            } else {
              setActiveStoryToView(newStories);
              setUserStoriesMap(prev => ({...prev, [authorId]: newStories}));
            }
          }}
        />
      )}

      {/* 🔥 BOOST MODAL (POJAVNO OKNO ZA AVTORJA) 🔥 */}
      {boostModalPost && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm p-8 rounded-[3rem] border transition-all duration-300 relative overflow-hidden ${getGlassPanelClass(darkMode)} border-blue-500/30`}>
            
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/20 blur-[60px] pointer-events-none z-0" />

            <button 
              onClick={() => setBoostModalPost(null)}
              className={`absolute top-6 right-6 text-xl transition-transform hover:rotate-90 z-20 ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'}`}
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center gap-3 mb-8 relative z-10">
              <span className="text-4xl drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">🚀</span>
              <div>
                <h3 className={`text-2xl font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>Boost Protocol</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mt-2">Force your signal to the top of the Global Feed</p>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <button 
                onClick={() => executeBoostPost(50, 12)}
                className={`w-full p-6 rounded-[2rem] border transition-all hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center gap-2 ${getGlassCardClass(darkMode)} hover:border-blue-500/50`}
              >
                <span className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>12 Hours Priority</span>
                <span className="text-xl font-black font-mono text-blue-500 drop-shadow-sm">50 GAINS</span>
              </button>

              <button 
                onClick={() => executeBoostPost(150, 48)}
                className={`w-full p-6 rounded-[2rem] border transition-all hover:-translate-y-1 active:scale-95 flex flex-col items-center justify-center gap-2 shadow-[0_0_30px_rgba(59,130,246,0.15)] ${darkMode ? 'bg-gradient-to-br from-blue-900/40 to-blue-950/40 border-blue-500/50 backdrop-blur-md' : 'bg-gradient-to-br from-blue-50/80 to-white/80 border-blue-300 backdrop-blur-md'}`}
              >
                <span className={`text-sm font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>48 Hours Max Visibility</span>
                <span className="text-xl font-black font-mono text-blue-500 drop-shadow-sm">150 GAINS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 COPY MODAL (POJAVNO OKNO) */}
      {copyModalPost && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm p-6 md:p-8 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden ${getGlassPanelClass(darkMode)}`}>
            
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

            <div className={`p-4 rounded-2xl mb-6 grid grid-cols-2 gap-4 border relative z-10 ${getSunkenClass(darkMode)} !bg-transparent`}>
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
              <div className={`flex rounded-xl p-1 border ${getSunkenClass(darkMode)} !bg-transparent`}>
                <button 
                  onClick={() => { setCopyRiskType('percent'); setCopyRiskValue("1"); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${copyRiskType === 'percent' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Risk %
                </button>
                <button 
                  onClick={() => { setCopyRiskType('fixed'); setCopyRiskValue("0.1"); }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${copyRiskType === 'fixed' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
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
                    className={`w-full p-4 rounded-2xl border-2 text-2xl font-black font-mono outline-none transition-all pr-12 backdrop-blur-sm ${getSunkenClass(darkMode)} ${copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 ? '!border-red-500 text-red-500 focus:!border-red-500' : (darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50')}
                    `}
                  />
                  <span className={`absolute right-5 top-1/2 -translate-y-1/2 font-black text-xl ${
                    copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 ? 'text-red-500' : 'text-zinc-500'
                  }`}>
                    {copyRiskType === 'percent' ? '%' : 'L'}
                  </span>
                </div>
                
                {copyRiskType === 'percent' && parseFloat(copyRiskValue) >= 3 && (
                  <p className="text-[10px] font-black text-red-500 uppercase mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl leading-relaxed">
                    ⚠️ Opozorilo: Tveganje več kot 2% na posamezen trade močno poveča možnost izgube kapitala (Drawdown). Priporočamo 1-2%.
                  </p>
                )}
              </div>
            </div>

            <button 
              onClick={executeCopySignal}
              className="w-full mt-8 py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:brightness-110 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 border border-blue-400/30 relative z-10"
            >
              Confirm & Execute
            </button>

          </div>
        </div>
      )}

      {safePosts.length === 0 ? (
        <div className={`text-center py-20 border border-dashed rounded-[3rem] transition-all duration-300 ${
          darkMode ? 'border-zinc-800 bg-zinc-950/20 backdrop-blur-md' : 'border-zinc-200 bg-white/40 backdrop-blur-md'
        }`}>
          <div className="flex flex-col items-center gap-3">
            <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${
                darkMode ? 'border-blue-500/20' : 'border-blue-500/40'
            }`} />
            <p className={`${darkMode ? 'text-zinc-600' : 'text-zinc-400'} text-[9px] uppercase font-black tracking-[0.3em]`}>
              Synchronizing Nodes...
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 w-full">
          {safePosts.map((post, index) => {
            const isMe = post.user_id === userData?.id;
            
            const isAlreadyFollowing = (userData?.following || []).includes(post.user_id);
            const isPremiumAuthor = post.author_is_premium === true;

            const isInstitutional = isMe ? userData?.is_institutional : post.is_institutional;

            const checkWinRate = isMe ? userData?.win_rate : post.win_rate;
            const checkGain = isMe ? userData?.total_gain : post.total_gain;
            const checkProfit = isMe ? userData?.total_profit : post.total_profit;
            const checkVerify = isMe ? userData?.verify_source : post.verify_source;

            const isAuthenticated = (Number(checkWinRate) > 0) || (Number(checkGain) > 0) || (Number(checkProfit) > 0) || checkVerify === 'verified';

            const hasActiveSub = subscribedTraderIds.includes(post.user_id);
            const showBlur = post.is_premium && !isMe && !post.is_unlocked && !hasActiveSub;

            const postTime = post.created_at ? new Date(post.created_at).getTime() : 0;
            const isActive = Date.now() - postTime < 3600000; 
            const isNew = post.id === lastPostId;
            
            const isPending = post.signal_status === 'pending';
            const isOpen = post.signal_status === 'open';
            const isClosed = post.signal_status && !['pending', 'open'].includes(post.signal_status);

            const authorHasStory = userStoriesMap[post.user_id] && userStoriesMap[post.user_id].length > 0;
            
            const isBoostedAd = post.is_boosted_ad || post.is_boosted;

            const contentStr = post.text || post.content || "";
            const isForgeAlert = isForgePost(contentStr);
            const forgeData = isForgeAlert ? extractForgeData(contentStr) : null;

            return (
              <div 
                key={`${post.id}-${index}`} 
                className={`group relative p-4 md:p-5 rounded-[2.5rem] transition-all duration-700 overflow-hidden ${
                  isBoostedAd
                    ? (darkMode ? 'bg-gradient-to-br from-blue-950/40 via-zinc-900/50 to-black/80 border-blue-500/40 shadow-[0_10px_30px_rgba(59,130,246,0.15)] backdrop-blur-2xl border border-t-white/20 border-l-blue-400/20 shadow-[inset_0_1px_1px_rgba(59,130,246,0.1)]' : 'bg-gradient-to-br from-blue-50/70 to-white/70 border-blue-300 shadow-xl backdrop-blur-2xl border border-t-white/90 border-l-blue-200/90')
                    : isNew 
                      ? (darkMode ? 'bg-gradient-to-br from-blue-900/20 via-zinc-900/60 to-black/90 border border-blue-500/50 border-t-white/20 border-l-blue-400/20 shadow-[0_10px_30px_rgba(59,130,246,0.2)] backdrop-blur-2xl' : 'bg-blue-50/70 border-blue-200 shadow-lg backdrop-blur-2xl border border-t-white/90 border-l-blue-200/90')
                      : isPremiumAuthor 
                        ? (darkMode ? 'bg-gradient-to-br from-yellow-500/5 via-zinc-900/50 to-black/80 border border-yellow-500/30 border-t-white/20 border-l-yellow-400/20 shadow-[0_10px_20px_rgba(234,179,8,0.1)] backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(234,179,8,0.1)]' : 'bg-gradient-to-br from-yellow-50/50 to-white/70 border-yellow-200 shadow-sm backdrop-blur-2xl border border-t-white/90 border-l-yellow-200/90')
                        : getGlassPanelClass(darkMode)
                } ${isClosed ? 'opacity-80' : ''}`}
              >
                 {isMe && !isBoostedAd && (
                   <button 
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       handleDeletePost(post.id); 
                     }}
                     className="absolute top-5 right-5 z-20 text-zinc-500 hover:text-red-500 transition-all p-2 bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md border border-white/5 active:scale-90"
                     title="Delete Signal"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                     </svg>
                   </button>
                 )}

                 <div className="flex flex-col md:flex-row gap-4 md:gap-5 relative z-10">
                   
                   {post.image && !showBlur && (
                     <div 
                       onClick={() => setZoomImage(post.image || null)}
                       className={`relative shrink-0 w-full md:w-36 h-48 md:h-36 rounded-[1.5rem] overflow-hidden border cursor-zoom-in group/img transition-all shadow-inner ${
                         darkMode ? 'border-zinc-700/50 bg-black/40' : 'border-zinc-200/80 bg-zinc-100/50'
                       }`}
                     >
                       <img 
                         src={post.image} 
                         alt="Market Intel" 
                         className={`w-full h-full object-cover transition-all duration-700 ${isClosed ? 'grayscale opacity-50' : 'opacity-90 group-hover/img:opacity-100 group-hover/img:scale-105'}`} 
                       />
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
                     <div className={`relative shrink-0 w-full md:w-36 h-48 md:h-36 rounded-[1.5rem] overflow-hidden border backdrop-blur-sm ${
                       darkMode ? 'border-zinc-800/50 bg-black/20' : 'border-zinc-200/50 bg-white/50'
                     }`}>
                       <img 
                         src={post.image} 
                         alt="Locked Intel" 
                         className="w-full h-full object-cover opacity-20 blur-xl pointer-events-none select-none" 
                       />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-3xl opacity-50 drop-shadow-lg">🔒</span>
                       </div>
                     </div>
                   )}

                   <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        {/* Zgornji del vizitke avtorja in bedži (PRO, Boosted...) */}
                        <div className="flex justify-between items-start mb-3 gap-2 pr-12 md:pr-10">
                          <div className="flex flex-wrap items-center gap-2">
                            
                            <div 
                                onClick={(e) => handleUserClick(e, post.user_id, post.authorAlias || "")}
                                className="flex items-center gap-2 cursor-pointer group/alias relative z-30 bg-black/10 backdrop-blur-sm pr-3 pl-1 py-1 rounded-full border border-white/5 hover:bg-black/20 transition-all"
                            >
                              <div className="relative">
                                <div className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all shadow-md ${
                                  authorHasStory
                                    ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-110'
                                    : isPremiumAuthor 
                                      ? 'border-zinc-400' 
                                      : (darkMode ? 'border-zinc-600' : 'border-zinc-300')
                                }`}>
                                    {post.authorAvatar ? (
                                    <img src={post.authorAvatar} alt="Av" className="w-full h-full object-cover" />
                                    ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-[10px] ${darkMode ? 'bg-zinc-800/50' : 'bg-zinc-200/50'}`}>
                                        👤
                                    </div>
                                    )}
                                </div>
                              </div>

                              <span className="text-sm filter drop-shadow-sm">
                                {post.authorCountry || '🏳️'}
                              </span>
                              
                              <div className="flex flex-col min-w-0 justify-center">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                                    isPremiumAuthor 
                                      ? 'text-yellow-500 drop-shadow-sm' 
                                      : (darkMode ? 'text-white group-hover/alias:text-blue-300' : 'text-zinc-900 group-hover/alias:text-blue-600')
                                  } transition-colors`}>
                                    {post.authorAlias || "Anonymous"} 
                                  </span>

                                  {isInstitutional && (
                                    <div className="group relative flex items-center inline-block cursor-help">
                                      <div className="relative">
                                        <svg className="w-3.5 h-3.5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M10 2l-6 2.5v5c0 4.5 3.5 8.5 6 10.5 2.5-2 6-6 6-10.5v-5L10 2z" />
                                        </svg>
                                        <svg className="absolute inset-0 w-2 h-2 text-black m-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                      
                                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/shield:opacity-100 transition-all duration-300 bg-zinc-950 border border-green-500/50 p-2 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.8)] w-48 z-[100] pointer-events-none backdrop-blur-xl">
                                        <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1 italic">
                                          🔱 Institutional Grade Node
                                        </p>
                                        <p className="text-[8px] text-zinc-400 leading-tight uppercase font-bold">
                                          Verified high-accuracy node with 80%+ win-rate and institutional risk management protocols.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-[7px] opacity-50 font-mono uppercase leading-none mt-1">
                                  {new Date(post.created_at).toLocaleDateString('sl-SI')} • {new Date(post.created_at).toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>

                            {!isMe && !isAlreadyFollowing && !post.is_boosted_ad && (
                              <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFollow(post.authorAlias || "");
                                }}
                                className="text-[7px] px-3 py-1.5 rounded-full uppercase font-black tracking-widest bg-blue-600/90 backdrop-blur-md text-white hover:bg-blue-500 shadow-md active:scale-95 transition-all animate-in fade-in"
                              >
                                + Follow
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            {/* 🔥 SPREMENJENA ZNAČKA ZA REKLAMO 🔥 */}
                            {isBoostedAd && (
                              <div className="flex items-center gap-1 text-[7px] font-black px-2 py-1 rounded-md border border-blue-500/50 bg-blue-500/10 backdrop-blur-sm text-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                ⚡ SPONSORED
                              </div>
                            )}

                            {isPremiumAuthor && (
                              <div className="flex items-center gap-1 text-[7px] font-black px-2 py-1 rounded-md border border-yellow-500/50 bg-yellow-500/10 backdrop-blur-sm text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                👑 PRO
                              </div>
                            )}

                            {isAuthenticated && !isPremiumAuthor && (
                              <div className={`flex items-center gap-1 text-[7px] font-black px-2 py-1 rounded-md border backdrop-blur-sm ${
                                darkMode ? 'bg-green-500/5 border-green-500/30 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-green-500/10 border-green-500/40 text-green-700'
                              }`}>
                                <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                AUTHENTICATED
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 🔥 NOV ZAMEGLJEN BLOK (PAYWALL) Z DINAMIČNO CENO 🔥 */}
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
                                  e.stopPropagation(); 
                                  if (handleUnlock) {
                                    handleUnlock(post.user_id, post.price_bulls || 100); 
                                  } else {
                                    alert("Subscription protocol offline.");
                                  }
                                }}
                                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(234,179,8,0.4)] border border-yellow-300"
                              >
                                Subscribe for 30 Days ({post.price_bulls || 100} GAINS)
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {/* 🔥 ČE JE FORGE OBJAVA, IZRIŠI KARTICO NAMERSTO TEKSTA IN SIGNALA 🔥 */}
                            {isForgeAlert && forgeData ? (
                              <div className={`mt-4 mb-5 p-6 rounded-[2rem] border overflow-hidden relative backdrop-blur-md ${darkMode ? 'bg-black/60 border-[#89CFF0]/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)]' : 'bg-white/60 border-[#89CFF0]/30 shadow-sm'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#89CFF0]/10 blur-3xl rounded-full pointer-events-none"></div>
                                
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                                  <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                                      {forgeData.name} <span className="text-[#89CFF0] drop-shadow-[0_0_8px_rgba(137,207,240,0.5)]">${forgeData.symbol}</span>
                                    </h3>
                                    <div className="flex gap-3 mt-2">
                                      <span className="text-[10px] font-black text-green-500 uppercase">🛡️ Security: {forgeData.score}%</span>
                                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">• Verified Forge</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onViewProject && onViewProject(post.id); }} 
                                      className="flex-1 md:flex-none px-6 py-4 rounded-2xl bg-[#89CFF0] text-black font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(137,207,240,0.4)] whitespace-nowrap"
                                    >
                                      View Project
                                    </button>
                                    {post.hub_id && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onJoinHub && onJoinHub(post.hub_id!); }}
                                        className={`flex-1 md:flex-none px-6 py-4 rounded-2xl border transition-all whitespace-nowrap shadow-inner ${darkMode ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-black/10 bg-black/5 text-black hover:bg-black/10'}`}
                                      >
                                        Join Hub
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* NORMALNA OBJAVA (SIGNAL + TEXT) */
                              <>
                                {post.entry && (
                                    <div className="flex gap-2 my-3">
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
                                        <div className={`py-1.5 px-3 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] inline-block backdrop-blur-sm shadow-inner ${
                                            post.signal_status === 'win' ? 'bg-green-500/10 text-green-500 border border-green-500/30 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]' :
                                            post.signal_status === 'loss' ? 'bg-red-500/10 text-red-500 border border-red-500/30 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]' :
                                            post.signal_status === 'manual_exit' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' :
                                            (post.signal_status === 'visual_only' || post.signal_status === 'waiting_mt5') ? 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/30' :
                                            'bg-zinc-500/10 text-zinc-500 border border-zinc-500/30'
                                        }`}>
                                            {post.signal_status === 'win' ? '🎯 TARGET HIT' :
                                            post.signal_status === 'loss' ? '🛑 STOPPED OUT' :
                                            post.signal_status === 'manual_exit' ? '✋ MANUAL CLOSE' :
                                            (post.signal_status === 'visual_only' || post.signal_status === 'waiting_mt5') ? '👁️ MT5 PENDING' :
                                            '🛡️ BREAK EVEN (VOID)'}
                                        </div>
                                    )}
                                    </div>
                                )}

                                {post.pair && (
                                   <div className={`mt-3 mb-5 flex flex-wrap gap-0 p-1 rounded-[1.2rem] border relative overflow-hidden backdrop-blur-md shadow-inner ${getSunkenClass(darkMode)}`}>
                                      <div className="flex-1 flex flex-col pl-4 pr-2 py-3 border-r border-zinc-500/20">
                                         <span className="text-[7px] uppercase font-black text-zinc-500 mb-0.5">Pair</span>
                                         <span className={`text-[12px] font-black font-mono tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'} drop-shadow-sm`}>{post.pair}</span>
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

                                      {isMe && !isClosed && handleSignalAction && (
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
                                <p className={`text-[13px] md:text-[14px] font-medium leading-relaxed tracking-tight mb-5 break-words ${
                                  darkMode ? 'text-zinc-200' : 'text-zinc-800'
                                }`}>
                                  {contentStr}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 🔥 BOTTOM ACTION BAR 🔥 */}
                      {!showBlur && (
                        <>
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleVoteClick(post.id, 'bull', Boolean(isClosed)); }}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-4 py-3 md:py-2 rounded-xl transition-all active:scale-95 ${
                                isClosed 
                                    ? (darkMode ? 'bg-zinc-900/30 border border-zinc-800/30 text-zinc-700 cursor-not-allowed shadow-inner' : 'bg-zinc-100/50 border border-zinc-200/50 text-zinc-400 cursor-not-allowed shadow-inner')
                                    : getGlassCardClass(darkMode) + (darkMode ? ' text-zinc-400 hover:text-green-500 hover:!border-green-500/30' : ' text-zinc-600 hover:text-green-600 hover:!border-green-300')
                              }`}
                            >
                              <span className="text-[9px] font-black uppercase tracking-widest">Bullish</span>
                              <span className={`text-[11px] font-mono font-black ${isClosed ? 'opacity-50' : 'text-green-500 drop-shadow-sm'}`}>{post.bulls || 0}</span>
                            </button>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleVoteClick(post.id, 'bear', Boolean(isClosed)); }}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-4 py-3 md:py-2 rounded-xl transition-all active:scale-95 ${
                                isClosed 
                                    ? (darkMode ? 'bg-zinc-900/30 border border-zinc-800/30 text-zinc-700 cursor-not-allowed shadow-inner' : 'bg-zinc-100/50 border border-zinc-200/50 text-zinc-400 cursor-not-allowed shadow-inner')
                                    : getGlassCardClass(darkMode) + (darkMode ? ' text-zinc-400 hover:text-red-500 hover:!border-red-500/30' : ' text-zinc-600 hover:text-red-600 hover:!border-red-300')
                              }`}
                            >
                              <span className="text-[9px] font-black uppercase tracking-widest">Bearish</span>
                              <span className={`text-[11px] font-mono font-black ${isClosed ? 'opacity-50' : 'text-red-500 drop-shadow-sm'}`}>{post.bears || 0}</span>
                            </button>

                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleComments(post.id); }}
                              className={`relative flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded-xl transition-all active:scale-95 ${
                                openComments[post.id] 
                                  ? (darkMode ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]' : 'bg-blue-500/10 border border-blue-300 text-blue-600 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]')
                                  : getGlassCardClass(darkMode) + (darkMode ? ' text-zinc-400 hover:text-blue-400 hover:!border-blue-500/30' : ' text-zinc-600 hover:text-blue-600 hover:!border-blue-300')
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48L4.32 20.587A.5.5 0 0 0 4.807 21h.023l2.87-.82A8.956 8.956 0 0 0 12 20.25Z" />
                              </svg>
                              <span className="text-[9px] font-black uppercase tracking-widest">Intel Feed</span>
                              
                              {(unreadCounts[post.id] || 0) > 0 && !openComments[post.id] && (
                                <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-black animate-bounce z-10 shadow-[0_0_10px_rgba(220,38,38,0.8)]">
                                  {unreadCounts[post.id]}
                                </div>
                              )}
                            </button>

                            {/* 🔥 BOOST GUMB (Samo za navadne objave avtorja) 🔥 */}
                            {isMe && !isBoostedAd && !isClosed && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBoostModalPost(post);
                                }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 text-white border border-blue-400/50 shadow-[0_5px_15px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest">🚀 Boost</span>
                              </button>
                            )}

                            {post.is_copyable && !isMe && !isClosed && !isBoostedAd && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCopyModalPost(post);
                                }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 py-3 md:py-2 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border border-yellow-300 shadow-[0_5px_15px_rgba(234,179,8,0.4)] transition-all active:scale-95"
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest">⚡ Copy</span>
                              </button>
                            )}

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const shareText = `Check out this signal by ${post.authorAlias} on GAIN WAVE! 📈`;
                                const shareUrl = window.location.href;
                                if (navigator.share) {
                                  navigator.share({ title: 'GAIN WAVE Signal', text: shareText, url: shareUrl });
                                } else {
                                  navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                                  toast.success("Link copied!");
                                }
                              }}
                              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 md:py-2 rounded-xl border transition-all active:scale-95 shadow-inner ${
                                darkMode 
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
                                    : 'bg-blue-500/5 border-blue-500/20 text-blue-600 hover:bg-blue-500/10'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                              </svg>
                              <span className="text-[9px] font-black uppercase tracking-widest">Share</span>
                            </button>
                          </div>

                          {openComments[post.id] && (
                            <div className={`mt-5 pt-5 border-t ${darkMode ? 'border-white/10' : 'border-black/10'} animate-in slide-in-from-top-2 duration-300`}>
                              <div className="space-y-3 mb-5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {commentsMap[post.id]?.length > 0 ? commentsMap[post.id].map((comm, idx) => (
                                  <div key={comm.id || idx} className={`p-4 rounded-[1.2rem] transition-all ${getGlassCardClass(darkMode)}`}>
                                    <div className="flex justify-between items-center mb-1.5">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 drop-shadow-sm">{comm.author_alias}</span>
                                      <span className="text-[8px] opacity-50 font-mono tracking-widest">{new Date(comm.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className={`text-[12px] font-medium leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>{comm.text}</p>
                                  </div>
                                )) : (
                                  <p className="text-[9px] uppercase tracking-widest text-center opacity-40 font-bold py-6">No node feedback yet...</p>
                                )}
                              </div>
                              <div className="flex gap-3">
                                <input 
                                  type="text" 
                                  placeholder="Add intel update..."
                                  value={commentInputs[post.id] || ''}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                                  className={`flex-1 px-5 py-3.5 rounded-[1.5rem] text-[11px] font-medium outline-none transition-all ${getSunkenClass(darkMode)} ${darkMode ? 'focus:border-blue-500/50' : 'focus:border-blue-400/50'}`}
                                />
                                <button 
                                  onClick={() => submitComment(post.id)}
                                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] hover:brightness-110 shadow-[0_5px_15px_rgba(37,99,235,0.3)] active:scale-95 transition-all border border-blue-400/30"
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                   </div>
                 </div>

                 {isClosed && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden z-0">
                        <span className="text-9xl font-black rotate-[-20deg] uppercase tracking-tighter whitespace-nowrap">
                            {post.signal_status?.replace('_', ' ')}
                        </span>
                    </div>
                 )}

                 <div className={`absolute top-0 right-0 w-16 h-16 border-t-[3px] border-r-[3px] rounded-tr-[2.5rem] transition-all duration-700 z-10 pointer-events-none ${
                    isNew ? 'opacity-100 border-blue-500 shadow-[inset_-10px_10px_30px_rgba(59,130,246,0.3)]' : 'opacity-0 group-hover:opacity-100 border-white/20'
                 }`} />
              </div>
            );
          })}
        </div>
      )}

      {zoomImage && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-6 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setZoomImage(null)}
        >
          <img src={zoomImage} className="max-w-full max-h-full object-contain rounded-[2rem] shadow-[0_0_60px_rgba(255,255,255,0.15)] border border-white/10" alt="Intel" />
        </div>
      )}
      <div className="h-10" />
    </div>
  );
}
