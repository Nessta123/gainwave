"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import StoryViewer from './StoryViewer';
// 🔥 UVOZ MOTORJA ZA OBVESTILA 🔥
import { dispatchNotification } from './notification-dispatcher';

export default function StoryBar({ userData, darkMode }: any) {
  const [stories, setStories] = useState<any[]>([]);
  const [groupedStories, setGroupedStories] = useState<any>({});
  const [activeUserStories, setActiveUserStories] = useState<any[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPro = userData?.is_premium || (userData?.win_rate || 0) >= 90;

  useEffect(() => {
    if (userData?.id) {
      fetchStories();
    }
  }, [userData?.id]);

  const fetchStories = async () => {
    // 1. POIŠČEMO PRIJATELJE (Koga spremljaš)
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userData.id);
    
    // Naredimo seznam dovoljenih ID-jev (Tvoji prijatelji + Ti)
    const followingIds = followsData ? followsData.map((f: any) => f.following_id) : [];
    const allowedIds = [...followingIds, userData.id];

    // 2. POTEGNEMO STORYJE (Samo od dovoljenih ID-jev)
    const { data, error } = await supabase
      .from('stories')
      .select('*, profiles(id, alias, avatar_url, is_live)')
      .gt('expires_at', new Date().toISOString())
      .in('user_id', allowedIds)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStories(data);
      // Grupiramo story-je po uporabnikih
      const grouped = data.reduce((acc: any, story: any) => {
        if (!acc[story.user_id]) acc[story.user_id] = [];
        acc[story.user_id].push(story);
        return acc;
      }, {});
      setGroupedStories(grouped);
    }
  };

  const handleAddStoryClick = () => {
    if (!isPro) {
      toast.error("Only PRO Nodes can broadcast Stories!");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.id) return;
    
    setIsUploading(true);
    const toastId = toast.loading("Broadcasting to network...");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const text = prompt("Add a short caption to your insight (optional):");

      const { error: dbError } = await supabase
        .from('stories')
        .insert([{
          user_id: userData.id,
          image_url: publicUrlData.publicUrl,
          text_content: text || ''
        }]);

      if (dbError) throw dbError;

      // 🔥 DISPATCHER ZDAJ SAM NAJDE SLEDILCE IN JIH OBVESTI (Brez napak 400) 🔥
      await dispatchNotification({
        type: 'new_story', // Točno ta tip sva nastavila v dispatcherju
        senderId: userData.id,
        senderAlias: userData.alias,
        content: text ? `New Story: ${text.substring(0, 30)}...` : "Just posted a new market insight 📸"
      });

      toast.dismiss(toastId);
      toast.success("Story broadcasted successfully! 🚀");
      
      setTimeout(() => {
        fetchStories();
      }, 500);

    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Failed to upload story: ${err.message}`);
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isPro && Object.keys(groupedStories).length === 0) return null;

  return (
    <div className={`w-full p-4 mb-4 rounded-[2rem] border overflow-x-auto flex gap-4 items-center custom-scrollbar ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-white border-zinc-200'}`}>
      
      {/* Tvoj Osebni Krog za Dodajanje (Če si PRO) */}
      {isPro && (
        <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={handleAddStoryClick}>
          <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-zinc-500 p-0.5 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
            {userData?.avatar ? (
              <img src={userData.avatar} alt="You" className="w-full h-full rounded-full object-cover grayscale" />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center">👤</div>
            )}
            <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black border-2 ${darkMode ? 'border-black bg-blue-500' : 'border-white bg-blue-500'}`}>
              +
            </div>
          </div>
          <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Add Story
          </span>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
        </div>
      )}

      {/* Krogci ostalih uporabnikov (Tvoji prijatelji) */}
      {Object.values(groupedStories).map((userStories: any, idx: number) => {
        const user = userStories[0].profiles;
        const isLive = user?.is_live;
        const avatarUrl = user?.avatar_url || user?.avatar || '👤';

        return (
          <div key={idx} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => setActiveUserStories(userStories)}>
            <div className={`relative w-14 h-14 rounded-full border-2 p-0.5 ${
              isLive 
                ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse' 
                : 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
            }`}>
              {avatarUrl === '👤' ? (
                 <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-800 text-xl">👤</div>
              ) : (
                 <img src={avatarUrl} alt={user?.alias || 'User'} className="w-full h-full rounded-full object-cover" />
              )}
              {isLive && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[7px] font-black px-2 rounded-sm border border-black uppercase tracking-widest">
                  LIVE
                </div>
              )}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest truncate w-14 text-center ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {user?.alias || 'Unknown'}
            </span>
          </div>
        );
      })}

      {/* Odprt Viewer */}
      {activeUserStories && (
        <StoryViewer 
          stories={activeUserStories} 
          currentUser={userData} 
          onClose={() => setActiveUserStories(null)} 
          onStoryDeleted={() => {
            setActiveUserStories(null);
            fetchStories();
          }}
        />
      )}

    </div>
  );
}