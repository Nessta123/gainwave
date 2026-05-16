"use client";
import React, { useState, useEffect } from 'react';

export default function AdBanner({ ads = [], darkMode, onPromote }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Logika za menjavanje oglasov vsakih 7 sekund
  useEffect(() => {
    if (ads && ads.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
      }, 7000);
      return () => clearInterval(timer);
    } else {
      setCurrentIndex(0); // Ponastavi na prvi oglas, če se seznam spremeni
    }
  }, [ads]);

  // Če ni oglasov, pokaži "Default" poziv za nakup
  if (!ads || ads.length === 0) {
    return (
      <div className={`relative w-full p-1 rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 mb-8`}>
        <div className={`flex items-center justify-between p-4 md:p-6 rounded-[1.8rem] ${darkMode ? 'bg-black/90' : 'bg-white/95'} backdrop-blur-xl`}>
          <div className="flex items-center gap-4">
            <div className="text-2xl">📢</div>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Sponsored Node</span>
              <p className={`text-xs font-bold ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>Boost your signal to the whole network!</p>
            </div>
          </div>
          <button onClick={onPromote} className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20">
            Promote
          </button>
        </div>
      </div>
    );
  }

  const currentAd = ads[currentIndex];

  return (
    <div className={`relative w-full p-1 rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 animate-gradient-x mb-8 shadow-lg shadow-blue-500/20 transition-all duration-500`}>
      <div className={`flex flex-col md:flex-row items-center gap-4 p-4 md:p-5 rounded-[1.8rem] ${darkMode ? 'bg-black/90' : 'bg-white/95'} backdrop-blur-xl relative overflow-hidden`}>
        
        {/* Slika oglasa (če obstaja) */}
        {currentAd.image_url && (
          <div className="w-full md:w-24 h-24 md:h-16 shrink-0 rounded-xl overflow-hidden border border-white/10">
            <img src={currentAd.image_url} alt="Ad" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">Premium Signal</span>
            <span className="text-[7px] opacity-40 uppercase font-mono truncate">By {currentAd.author_alias || 'Pro Node'}</span>
          </div>
          <p className={`text-xs font-bold leading-tight line-clamp-2 ${darkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
            {currentAd.text}
          </p>
          {currentAd.target_url && (
            <a href={currentAd.target_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 font-black uppercase hover:text-blue-300 mt-1 inline-flex items-center gap-1 transition-colors">
              View Analysis 
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2 h-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          )}
        </div>

        {/* Indikatorji (pike) za več oglasov */}
        {ads.length > 1 && (
          <div className="flex gap-1 absolute bottom-2 right-6 md:static">
            {ads.map((_: any, i: number) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-4 bg-blue-500' : 'w-1 bg-zinc-700'}`} 
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-move 3s ease infinite;
        }
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}