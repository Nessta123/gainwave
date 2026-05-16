"use client";
import React, { useState, useEffect, useRef } from 'react';
import UserCard from './UserCard';
import { supabase } from '@/lib/supabaseClient';

// 🔥 EXTREME 3D GLASS UI FUNKCIJA ZA ISKALNIK 🔥
const getSunkenClass = (darkMode: boolean) => darkMode
  ? 'bg-black/20 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] border border-white/5 text-white placeholder-zinc-500'
  : 'bg-zinc-200/40 shadow-[inset_0_4px_15px_rgba(0,0,0,0.05)] border border-black/5 text-zinc-900 placeholder-zinc-400';

interface SearchBarProps {
  onSearch: (query: string) => void;
  posts: any[];
  onVisitProfile: (alias: string) => void;
  darkMode: boolean;
  allUsers?: any[]; 
}

export default function SearchBar({ onSearch, posts, onVisitProfile, darkMode, allUsers = [] }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dbUsers, setDbUsers] = useState<any[]>([]); 
  
  const [followingIds, setFollowingIds] = useState<string[]>([]); 
  const wrapperRef = useRef<HTMLDivElement>(null);

  const refreshUsersDirectly = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, alias, country, avatar_url, style');
      
      if (!error && data) {
        setDbUsers(data.map(u => ({
          id: u.id,
          alias: u.alias,
          country: u.country,
          style: u.style,
          avatar: u.avatar_url
        })));
      }
    } catch (err) {
      console.error("Search fetch error:", err);
    }
  };

  const fetchFollowingList = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('follows') 
          .select('following_id') 
          .eq('follower_id', user.id);

        if (data) {
          const ids = data.map((row: any) => row.following_id).filter(Boolean);
          setFollowingIds(ids);
        }
      }
    } catch (err) {
      console.error("Following fetch error:", err);
    }
  };

  useEffect(() => {
    refreshUsersDirectly();
    fetchFollowingList(); 
  }, []);

  useEffect(() => {
    if (query.trim().length > 0) {
      const usersMap = new Map();

      dbUsers.forEach(u => {
        if (u.alias) usersMap.set(u.alias.toLowerCase(), u);
      });

      allUsers.forEach(u => {
        if (u.alias) usersMap.set(u.alias.toLowerCase(), u);
      });

      posts.forEach(p => {
        if (p.authorAlias && !usersMap.has(p.authorAlias.toLowerCase())) {
          usersMap.set(p.authorAlias.toLowerCase(), {
            id: p.authorId || null,
            alias: p.authorAlias,
            country: p.authorCountry || '🏳️',
            style: 'Node',
            avatar: p.authorAvatar
          });
        }
      });
      
      const allUniqueUsers = Array.from(usersMap.values());
      const results = allUniqueUsers.filter((u: any) => 
        u.alias.toLowerCase().includes(query.toLowerCase())
      );
      
      setFilteredUsers(results);
      setShowDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowDropdown(false);
    }
  }, [query, posts, allUsers, dbUsers]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user: any) => {
    if (onVisitProfile) {
      onVisitProfile(user.alias);
    }
    setQuery("");
    setShowDropdown(false);
    if (onSearch) {
      onSearch(""); 
    }
  };

  return (
    <div ref={wrapperRef} className="w-full p-2 md:p-4 sticky top-0 z-[100]">
      <div className="relative max-w-2xl mx-auto">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs z-10">🔍</span>
        
        <input 
          type="text" 
          value={query}
          placeholder="Search Network Nodes..." 
          onFocus={() => { refreshUsersDirectly(); fetchFollowingList(); if(query) setShowDropdown(true); }}
          onChange={(e) => setQuery(e.target.value)}
          className={`w-full rounded-full py-2.5 md:py-3 pl-10 pr-10 text-xs md:text-sm font-bold uppercase tracking-wide outline-none transition-all ${getSunkenClass(darkMode)}`}
        />

        {query.length > 0 && (
          <button 
            onClick={() => { setQuery(""); if(onSearch) onSearch(""); }} 
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors active:scale-90 ${darkMode ? 'bg-white/10 text-zinc-400 hover:text-white' : 'bg-black/10 text-zinc-500 hover:text-black'}`}
          >
            ✕
          </button>
        )}

        {showDropdown && filteredUsers.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-[2rem] border shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-2xl ${
            darkMode ? 'bg-zinc-950/90 border-white/10 shadow-black' : 'bg-white/95 border-black/5 shadow-xl'
          }`}>
            <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1 custom-scrollbar">
              {filteredUsers.map((user, idx) => {
                const isAlreadyFollowing = user.id ? followingIds.includes(user.id) : false;

                return (
                  <UserCard 
                    key={idx}
                    alias={user.alias}
                    country={user.country}
                    style={user.style}
                    image={user.avatar} 
                    darkMode={darkMode}
                    onClick={() => handleSelect(user)}
                    isFollowing={isAlreadyFollowing}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
