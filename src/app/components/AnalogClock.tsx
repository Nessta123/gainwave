"use client";
import React, { useEffect, useState } from 'react';

interface ClockProps {
  label: string;
  timezone: string;
  darkMode: boolean;
}

const AnalogClock = ({ label, timezone, darkMode }: ClockProps) => {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!mounted) return <div className="w-12 h-12 md:w-14 md:h-14" />;

  // 1. IZRAČUN LOKALNEGA ČASA
  const localTimeString = time.toLocaleString('en-US', { timeZone: timezone });
  const localTime = new Date(localTimeString);
  
  const seconds = localTime.getSeconds();
  const minutes = localTime.getMinutes();
  const hoursRaw = localTime.getHours();
  const hours = hoursRaw % 12;
  const day = localTime.getDay();

  // 2. FUNKCIJA ZA PREVERJANJE STATUSA MARKETA
  const checkMarket = (l: string, hr: number, min: number, d: number) => {
    if (d === 0 || d === 6) return false; 
    if (l === "Tokyo" || l === "TKY") return hr >= 9 && hr < 15;
    if (l === "London" || l === "LON") return hr >= 8 && (hr < 16 || (hr === 16 && min <= 30));
    if (l === "N. York" || l === "NYC") return (hr === 9 && min >= 30) || (hr >= 10 && hr < 16);
    return false;
  };

  const isOpen = checkMarket(label, hoursRaw, minutes, day);

  // 3. LOGIKA ZA GOLDEN CROSS
  const lonTime = new Date(time.toLocaleString('en-US', { timeZone: "Europe/London" }));
  const nyTime = new Date(time.toLocaleString('en-US', { timeZone: "America/New_York" }));
  
  const isLondonOpen = checkMarket("London", lonTime.getHours(), lonTime.getMinutes(), lonTime.getDay());
  const isNYOpen = checkMarket("N. York", nyTime.getHours(), nyTime.getMinutes(), nyTime.getDay());
  
  const isGoldenCross = isLondonOpen && isNYOpen;

  // 4. IZRAČUN KOTOV KAZALCEV
  const sDeg = seconds * 6;
  const mDeg = (minutes * 6) + (seconds * 0.1);
  const hDeg = (hours * 30) + (minutes * 0.5);

  const handColor = darkMode ? 'bg-white' : 'bg-zinc-900';

  return (
    /* flex-shrink-0 prepreči, da bi iPhone stisnil uro v elipso */
    <div className="flex flex-col items-center space-y-2 relative flex-shrink-0">
      
      {/* STATUSNA LUČKA */}
      <div className={`absolute top-0 -right-0.5 z-10 w-2 h-2 rounded-full border ${
        darkMode ? 'border-zinc-900' : 'border-white'
      } ${
        isOpen 
          ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' 
          : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]'
      }`} />

      {/* GLAVNI OKVIR URE - Dodana odzivna velikost (w-12 na mobi, w-14 na desktop) */}
      <div className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full border-2 transition-all duration-700 ${
        isGoldenCross 
          ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] scale-110 z-20' 
          : (darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white shadow-sm')
      }`}>
        
        {/* ŠTEVILČNICA */}
        <div className="absolute inset-0 flex flex-col justify-between items-center py-1">
          <div className={`w-0.5 h-1 rounded-full ${isGoldenCross ? 'bg-yellow-400' : (darkMode ? 'bg-zinc-700' : 'bg-zinc-300')}`} />
          <div className={`w-0.5 h-1 rounded-full ${darkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
        </div>
        <div className="absolute inset-0 flex justify-between items-center px-1">
          <div className={`w-1 h-0.5 rounded-full ${darkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
          <div className={`w-1 h-0.5 rounded-full ${darkMode ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
        </div>
        
        {/* URNI KAZALEC - Prilagojene pozicije za w-12/w-14 */}
        <div className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${hDeg}deg)` }}>
          <div className={`w-0.5 h-[25%] mt-[25%] rounded-full ${handColor} shadow-sm`} />
        </div>

        {/* MINUTNI KAZALEC */}
        <div className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${mDeg}deg)` }}>
          <div className={`w-0.5 h-[35%] mt-[15%] rounded-full ${handColor} opacity-70`} />
        </div>

        {/* SEKUNDNI KAZALEC */}
        <div className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${sDeg}deg)` }}>
          <div className={`w-[1px] h-[45%] mt-[5%] rounded-full ${isGoldenCross ? 'bg-yellow-400 animate-pulse' : 'bg-blue-500'}`} />
        </div>

        {/* SREDINSKA PIKA */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full z-30 ${isGoldenCross ? 'bg-yellow-400' : 'bg-blue-500'}`} />
      </div>
      
      {/* NAPISI SPODAJ */}
      <div className="flex flex-col items-center leading-tight min-h-[20px]">
        <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] transition-colors ${
          isGoldenCross ? 'text-yellow-500' : (darkMode ? 'text-blue-500/80' : 'text-blue-600')
        }`}>
          {label}
        </span>
        <span className={`text-[6px] font-bold uppercase tracking-tighter ${
          isGoldenCross ? 'text-yellow-400' : (isOpen ? 'text-green-500' : 'text-red-500/70')
        }`}>
          {isGoldenCross ? 'Golden Cross' : (isOpen ? 'Live' : 'Closed')}
        </span>
      </div>
    </div>
  );
};

export default AnalogClock;