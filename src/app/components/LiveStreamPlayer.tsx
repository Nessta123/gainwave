"use client";
import React, { useState, useEffect, useRef } from 'react';

interface LiveStreamPlayerProps {
  url: string;
  traderName: string;
  onClose: () => void;
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({ url, traderName, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // DRAG & DROP STATE (Premikanje)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // RESIZE STATE (Spreminjanje velikosti)
  const [size, setSize] = useState({ width: 350, height: 220 }); // Začetna velikost
  const [isResizing, setIsResizing] = useState(false);
  
  const [isInteracting, setIsInteracting] = useState(false); // Ščit za iframe
  
  // Reference za računanje premikov
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 🔥 ULTIMATE SMART URL CONVERTER (YouTube, Twitch, Kick) 🔥
  let embedUrl = url;
  try {
    if (url.includes("watch?v=")) {
      // YouTube navaden link
      embedUrl = url.replace("watch?v=", "embed/").split("&")[0];
    } else if (url.includes("youtu.be/")) {
      // YouTube kratek link
      embedUrl = url.replace("youtu.be/", "www.youtube.com/embed/");
    } else if (url.includes("twitch.tv/")) {
      // Twitch link
      const channel = url.split("twitch.tv/")[1].split("?")[0].split("/")[0];
      // Twitch zahteva 'parent' domeno za varnost
      const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'gainwave.vercel.app';
      embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}`;
    } else if (url.includes("kick.com/")) {
      // Kick link
      const channel = url.split("kick.com/")[1].split("?")[0].split("/")[0];
      embedUrl = `https://player.kick.com/${channel}`;
    }
  } catch (err) {
    console.error("URL Parsing error", err);
  }

  // --- LOGIKA ZA PREMIKANJE OKENCA ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isExpanded) return; 
    
    // Prepreči premik, če kliknemo na gumb
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    setIsInteracting(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    dragStart.current = { x: clientX, y: clientY };
    positionStart.current = { ...position };
  };

  // --- LOGIKA ZA SPREMINJANJE VELIKOSTI (RESIZE) ---
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prepreči, da bi se sprožilo še premikanje!
    if (isExpanded) return;
    
    setIsResizing(true);
    setIsInteracting(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    resizeStart.current = { x: clientX, y: clientY, width: size.width, height: size.height };
  };

  // --- GLOBALNI POSLUŠALCI ZA PREMIKANJE IN VELIKOST ---
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e.cancelable) e.preventDefault(); // Prepreči scroll strani na telefonu
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      if (isDragging) {
        setPosition({
          x: positionStart.current.x + (clientX - dragStart.current.x),
          y: positionStart.current.y + (clientY - dragStart.current.y),
        });
      } else if (isResizing) {
        const deltaX = clientX - resizeStart.current.x;
        const deltaY = clientY - resizeStart.current.y;
        
        // Minimalna velikost, da okence ne izgine (250x150)
        const newWidth = Math.max(250, resizeStart.current.width + deltaX);
        const newHeight = Math.max(150, resizeStart.current.height + deltaY);
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setIsInteracting(false);
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing]);

  // Poskrbi, da ščit za iFrame popusti, ko končamo interakcijo
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsInteracting(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  return (
    <div 
      className={`fixed z-[9999] ${isDragging || isResizing ? 'duration-0' : 'duration-300 ease-in-out'} ${
        isExpanded 
          ? 'inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 transition-all' 
          : 'bottom-24 right-4 md:bottom-8 md:right-8'
      }`}
      style={!isExpanded ? { transform: `translate(${position.x}px, ${position.y}px)` } : {}}
    >
      <div 
        className={`flex flex-col relative bg-[#050509] border border-blue-500/50 shadow-[0_0_40px_rgba(37,99,235,0.4)] ${
          isExpanded 
            ? 'w-full max-w-6xl rounded-[2rem] transition-all duration-300 h-auto aspect-video' 
            : 'rounded-[1.5rem]'
        }`}
        style={!isExpanded ? { width: `${size.width}px`, height: `${size.height}px`, maxWidth: '95vw', maxHeight: '85vh' } : {}}
      >
        {/* ZAŠČITNI ŠČIT ZA IFRAME (Da ti ne "ukrade" klika med vlečenjem) */}
        {isInteracting && !isExpanded && (
          <div className="absolute inset-0 z-50 bg-transparent" />
        )}

        {/* 1. CYBER HEADER (TUKAJ PRIMEŠ ZA PREMIKANJE OKENCA) */}
        <div 
          className={`flex justify-between items-center px-4 py-3 bg-zinc-950/90 border-b border-blue-500/30 backdrop-blur-md relative z-[60] shrink-0 ${!isExpanded ? 'cursor-move active:cursor-grabbing' : ''}`}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 truncate max-w-[120px]">
              {traderName} LIVE
            </span>
          </div>
          
          <div className="flex items-center gap-3 relative z-[70]">
            {/* Gumb za razširitev / pomanjšanje */}
            <button 
              onClick={() => { setIsExpanded(!isExpanded); setPosition({x:0, y:0}); }}
              className="text-zinc-400 hover:text-blue-400 transition-colors active:scale-90 cursor-pointer p-1"
              title={isExpanded ? "Shrink to PiP" : "Expand to Fullscreen"}
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
              )}
            </button>

            {/* X GUMB ZA ZAPIRANJE */}
            <button 
              onClick={() => onClose()} 
              className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer active:scale-90"
              title="Terminate Connection"
            >
              <span className="text-xs font-black leading-none mb-[1px]">✕</span>
            </button>
          </div>
        </div>

        {/* 2. VIDEO PREDVAJALNIK (Popolnoma se prilagaja velikosti okna) */}
        <div className="relative w-full flex-1 bg-black overflow-hidden rounded-b-[1.5rem]">
          <iframe 
            src={embedUrl} 
            className="absolute inset-0 w-full h-full border-none outline-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          ></iframe>
        </div>
        
        {isExpanded && (
           <div className="p-4 bg-zinc-950 border-t border-white/5 text-center text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 shrink-0">
              Encrypted High-Bandwidth Node Connection
           </div>
        )}

        {/* 3. RESIZE ROČICA V DESNEM SPODNJEM KOTU (TUKAJ PRIMEŠ ZA VEČANJE/MANJŠANJE) */}
        {!isExpanded && (
          <div 
            className="absolute bottom-0 right-0 w-8 h-8 z-[70] cursor-nwse-resize flex items-end justify-end p-1 opacity-50 hover:opacity-100 transition-opacity"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 21l6-6m-6 6l6-6M9 21l12-12m-12 12l12-12" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};