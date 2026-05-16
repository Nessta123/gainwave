"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function StoryViewer({ stories, currentUser, onClose, onStoryDeleted }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentStory = stories[currentIndex];
  const isOwner = currentUser?.id === currentStory?.user_id;

  // Avtomatsko predvajanje (vsaka slika 5 sekund)
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            clearInterval(timer);
            onClose();
            return 100;
          }
        }
        return prev + 2; // Hitrost polnjenja vrstice
      });
    }, 100);

    return () => clearInterval(timer);
  }, [currentIndex, stories.length, onClose]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this story?");
    if (!confirmDelete) return;

    try {
      // 1. Izbrišemo iz tabele
      await supabase.from('stories').delete().eq('id', currentStory.id);
      
      // 2. Izbrišemo iz Storage-a
      const fileName = currentStory.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('stories').remove([fileName]);
      }

      toast.success("Story deleted!");
      onStoryDeleted(currentStory.id);
      
      if (stories.length <= 1) {
        onClose(); // Če je bil to zadnji story, zapremo
      } else {
        handleNext(); // Gremo na naslednjega
      }
    } catch (err) {
      toast.error("Error deleting story.");
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black flex flex-col animate-in fade-in duration-300">
      
      {/* Progress Bars na vrhu */}
      <div className="absolute top-0 left-0 w-full p-4 flex gap-1 z-50">
        {stories.map((s: any, idx: number) => (
          <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 linear"
              style={{ 
                width: idx === currentIndex ? `${progress}%` : (idx < currentIndex ? '100%' : '0%') 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header (Profilna in Delete Gumb) */}
      <div className="absolute top-6 left-0 w-full p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          {/* 🔥 POPRAVLJENO: avatar_url namesto avatar + fallback */}
          {currentStory.profiles?.avatar_url ? (
             <img src={currentStory.profiles.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border border-white object-cover" />
          ) : (
             <div className="w-10 h-10 rounded-full border border-white flex items-center justify-center bg-zinc-800 text-lg">👤</div>
          )}
          
          <div>
            <p className="text-white text-xs font-black uppercase tracking-widest drop-shadow-md">
              {currentStory.profiles?.alias || 'Trader'}
            </p>
            <p className="text-white/70 text-[10px] uppercase font-bold drop-shadow-md">
              {new Date(currentStory.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Gumb za brisanje (Samo za avtorja) */}
          {isOwner && (
            <button onClick={handleDelete} className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transition-colors">
              🗑️
            </button>
          )}
          <button onClick={onClose} className="p-2 text-white text-2xl font-bold opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      </div>

      {/* Slika in Tekst */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-950">
        <img src={currentStory.image_url} alt="Story" className="max-w-full max-h-full object-contain" />
        
        {currentStory.text_content && (
          <div className="absolute bottom-20 left-4 right-4 text-center z-50">
            <span className="bg-black/70 text-white text-sm font-bold px-4 py-2 rounded-xl backdrop-blur-sm shadow-xl inline-block">
              {currentStory.text_content}
            </span>
          </div>
        )}

        {/* Klikabilna območja za naprej/nazaj */}
        <div className="absolute top-0 left-0 w-1/3 h-full z-40" onClick={handlePrev} />
        <div className="absolute top-0 right-0 w-1/3 h-full z-40" onClick={handleNext} />
      </div>

    </div>
  );
}