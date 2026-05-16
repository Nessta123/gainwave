"use client";
import React, { useState, useEffect } from 'react';

export default function UserCard({ alias, style, country, image, isFollowing, isFollowingInitial, onClick, onFollowChange, darkMode }: any) {
  // Združimo isFollowing (iz iskalnika) in isFollowingInitial (iz drugih delov aplikacije)
  const [following, setFollowing] = useState(isFollowing || isFollowingInitial || false);

  // Osvežimo state, če se prop isFollowing posodobi
  useEffect(() => {
    if (isFollowing !== undefined) {
      setFollowing(isFollowing);
    }
  }, [isFollowing]);

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prepreči, da bi klik na gumb odprl profil
    setFollowing(true);  // Takoj ko klikneš, mu začneš slediti
    if (onFollowChange) onFollowChange(true);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`p-3 rounded-[1.5rem] border flex items-center justify-between cursor-pointer transition-all group active:scale-95 relative z-10 ${
        darkMode 
          ? 'bg-zinc-900/60 border-zinc-800 hover:border-blue-500/50 hover:bg-black' 
          : 'bg-white border-zinc-100 hover:border-blue-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          {image ? (
            <div className={`w-10 h-10 rounded-xl p-[1px] overflow-hidden ${darkMode ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
               <img 
                 src={image} 
                 alt={alias} 
                 className="w-full h-full rounded-[10px] object-cover"
               />
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
              darkMode ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
            }`}>👤</div>
          )}
        </div>

        <div className="text-left flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-xs">{country || '🏳️'}</span>
            <h4 className={`font-black text-[11px] uppercase tracking-wide transition-colors ${
              darkMode ? 'text-zinc-200 group-hover:text-blue-400' : 'text-zinc-800 group-hover:text-blue-600'
            }`}>
              {alias}
            </h4>
          </div>
          <p className={`text-[8px] uppercase font-bold tracking-wider ${
            darkMode ? 'text-zinc-600' : 'text-zinc-400'
          }`}>{style || "NODE"}</p>
        </div>
      </div>

      {/* 🔥 GUMB SE PRIKAŽE SAMO, ČE UPORABNIKU ŠE NE SLEDIŠ 🔥 */}
      {!following && (
        <button 
          onClick={handleFollowClick}
          className="relative z-20 px-4 py-1.5 rounded-full text-[8px] font-black uppercase transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500"
        >
          Follow
        </button>
      )}
    </div>
  );
}
