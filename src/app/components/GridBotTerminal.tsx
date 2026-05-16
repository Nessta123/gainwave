"use client";
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

// ==========================================
// 🧠 NODE ENGINE (Bot Remote Control)
// ==========================================
function useGridEngine(userData: any) { 
  const [botActive, setBotActive] = useState(false);
  const [isStandby, setIsStandby] = useState(false); 
  const [profit, setProfit] = useState(0);
  const [gridLevels, setGridLevels] = useState<number[]>([]);
  const [logs, setLogs] = useState<{time: string, msg: string, type: 'buy' | 'sell' | 'system' | 'standby'}[]>([]);
  
  const [triggerPrice, setTriggerPrice] = useState<number | null>(null);
  const [triggerDirection, setTriggerDirection] = useState<'up' | 'down' | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<number | null>(null);

  const [botId, setBotId] = useState<string | null>(null);
  const [activeBotData, setActiveBotData] = useState<any>(null); 

  // 🔥 1. MASTER CLOUD SYNC
  useEffect(() => {
    if (!userData?.id) return;
    
    const fetchActiveCloudBot = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_bots')
          .select('*')
          .eq('user_id', userData.id)
          .eq('status', 'running')
          .maybeSingle();

        if (data) {
          setBotId(data.id);
          setBotActive(true);
          setProfit(Number(data.total_profit) || 0);
          setActiveBotData(data); 
          
          // Naložimo še SL in TP iz baze (če obstajata)
          setStopLoss(data.stop_loss || null);
          setTakeProfit(data.take_profit || null);
          
          const step = (data.upper_limit - data.lower_limit) / (data.grids - 1);
          const levels = [];
          for (let i = 0; i < data.grids; i++) levels.push(data.lower_limit + (step * i));
          setGridLevels(levels);

          setLogs([{ time: new Date().toLocaleTimeString(), msg: `☁️ [CLOUD SYNC] Connected to active ${data.symbol} node.`, type: 'system' }]);
        }
      } catch (err) {
        console.error("Cloud sync error:", err);
      }
    };

    fetchActiveCloudBot();
  }, [userData?.id]);

  // 🔥 2. REAL-TIME PROFIT SYNC
  useEffect(() => {
    if (!botId || !botActive) return;

    const fetchServerData = async () => {
      try {
        const { data, error } = await supabase
          .from('trading_bots')
          .select('total_profit, status')
          .eq('id', botId)
          .single();

        if (data) {
          if (Number(data.total_profit) > profit) {
             setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `[SYNC] Server reports profit: +$${(Number(data.total_profit) - profit).toFixed(2)}`, type: 'buy' as 'buy' }, ...prev].slice(0, 50));
          }
          setProfit(Number(data.total_profit) || 0);

          if (data.status === 'stopped') {
             setBotActive(false);
             setBotId(null);
             toast.error("Node was halted by safety protocols (SL/TP reached).");
          }
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    };

    const interval = setInterval(fetchServerData, 3000);
    return () => clearInterval(interval);
  }, [botId, botActive, profit]);

  const startBot = async (
    min: number, max: number, grids: number, investment: number, currentPrice: number, 
    mode: 'paper' | 'live', hasApi: boolean, tp: number | null, sl: number | null, trigger: number | null,
    pair: string, exchange: string 
  ) => {
    if (mode === 'live' && !hasApi) {
      toast.error("API Key Missing! Please link your Exchange API in Settings.");
      return false;
    }
    
    // 🔥 POPRAVEK: Zdaj pošljemo tudi take_profit in stop_loss v bazo!
    const { data, error } = await supabase.from('trading_bots').insert([{
        user_id: userData?.id || null,
        symbol: pair.replace('/', ''),
        exchange: exchange,
        upper_limit: max,
        lower_limit: min,
        grids: grids,
        amount_per_grid: investment,
        take_profit: tp,
        stop_loss: sl,
        status: 'running',
        total_profit: 0
    }]).select().single();

    if (error) {
        toast.error(`Database Error: ${error.message}`);
        console.error("Supabase error:", error);
        return false;
    }

    setBotId(data.id); 

    const step = (max - min) / (grids - 1);
    const levels = [];
    for (let i = 0; i < grids; i++) levels.push(min + (step * i));
    setGridLevels(levels);
    
    setStopLoss(sl);
    setTakeProfit(tp);
    setTriggerPrice(trigger);
    setProfit(0);

    const modeText = mode === 'live' ? '⚡ LIVE EXCHANGE' : '📄 PAPER TRADING';
    setBotActive(true);
    setIsStandby(false);
    setLogs([{ time: new Date().toLocaleTimeString(), msg: `🚀 Node Deployed [${modeText}]. Server taking control.`, type: 'system' as 'system' }]);
    
    toast.success("Bot successfully deployed to Cloud Engine!");
    return true;
  };

  const stopBot = async (reason: string = "Manual Stop") => {
    if (botId) {
        await supabase.from('trading_bots').update({ status: 'stopped' }).eq('id', botId);
    }
    
    setBotActive(false);
    setIsStandby(false);
    setTriggerDirection(null);
    setGridLevels([]);
    setBotId(null);
    setActiveBotData(null);
    
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `🛑 Node Terminated (${reason}).`, type: 'system' as 'system' }, ...prev].slice(0, 50));
    toast.info(`Bot Terminated: ${reason}`);
  };

  // 🔥 3. POPRAVLJENO: Dejansko zapiše nove TP/SL vrednosti v bazo (async)
  const updateConfigLive = async (newTp: number | null, newSl: number | null) => {
     if (botId) {
        const { error } = await supabase
            .from('trading_bots')
            .update({ take_profit: newTp, stop_loss: newSl })
            .eq('id', botId);
            
        if (error) {
            toast.error("Database Error: Failed to update SL/TP.");
            console.error(error);
            return;
        }
     }
     
     setTakeProfit(newTp);
     setStopLoss(newSl);
     setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: `⚙️ Cloud Config updated: SL/TP synchronized!`, type: 'system' as 'system' }, ...prev].slice(0, 50));
     toast.success("Safety parameters synced to Cloud Engine!");
  };

  return { botActive, isStandby, profit, gridLevels, logs, startBot, stopBot, triggerPrice, stopLoss, takeProfit, updateConfigLive, activeBotData };
}

// ==========================================
// 🖥️ VISUAL TERMINAL (UI)
// ==========================================
interface GridBotTerminalProps {
  onClose: () => void;
  isPremium: boolean;
  prices: { btc: number; eth: number; xau: number; eur: number };
  userData?: any; 
  onBotProfit?: (amount: number) => void; 
}

export default function GridBotTerminal({ onClose, isPremium, prices, userData, onBotProfit }: GridBotTerminalProps) {
  const [position, setPosition] = useState({ x: 10, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState({ width: 420, height: 850 }); 
  const [isResizing, setIsResizing] = useState(false);
  
  const [pair, setPair] = useState("BTCUSDT"); 
  const [timeframe, setTimeframe] = useState('15'); 
  const [lowerPrice, setLowerPrice] = useState("");
  const [upperPrice, setUpperPrice] = useState("");
  const [grids, setGrids] = useState("12"); 
  const [investment, setInvestment] = useState("");

  const [inputTp, setInputTp] = useState("");
  const [inputSl, setInputSl] = useState("");
  const [inputTrigger, setInputTrigger] = useState("");

  const [tradingMode, setTradingMode] = useState<'paper' | 'live'>('paper');
  
  const [exchange, setExchange] = useState(userData?.exchange_name || "binance");
  const [apiKey, setApiKey] = useState(userData?.api_key || userData?.binance_key || "");
  const [apiSecret, setApiSecret] = useState(userData?.api_secret || ""); 
  const [apiPassphrase, setApiPassphrase] = useState(userData?.api_passphrase || ""); 
  const [isSavingApi, setIsSavingApi] = useState(false);

  const [isLiveEditing, setIsLiveEditing] = useState(false);

  const [localLivePrice, setLocalLivePrice] = useState<number>(0);
  const [tvKey, setTvKey] = useState(0); 

  const [showGuide, setShowGuide] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const engine = useGridEngine(userData); 

  // 🔥 3. AUTO-LOAD SETTINGS
  useEffect(() => {
    if (engine.activeBotData) {
      setPair(engine.activeBotData.symbol.replace('/', ''));
      setLowerPrice(engine.activeBotData.lower_limit.toString());
      setUpperPrice(engine.activeBotData.upper_limit.toString());
      setGrids(engine.activeBotData.grids.toString());
      setInvestment(engine.activeBotData.amount_per_grid.toString());
      
      // POPRAVEK: Tudi v input polja zapišemo SL/TP, da jih uporabnik vidi, ko se stran naloži
      if (engine.activeBotData.take_profit) setInputTp(engine.activeBotData.take_profit.toString());
      if (engine.activeBotData.stop_loss) setInputSl(engine.activeBotData.stop_loss.toString());

      if (engine.activeBotData.exchange) setExchange(engine.activeBotData.exchange);
      setTvKey(prev => prev + 1); 
    }
  }, [engine.activeBotData]);

  useEffect(() => {
    if (userData) {
      if (userData.exchange_name && !engine.activeBotData) setExchange(userData.exchange_name);
      if (userData.api_key || userData.binance_key) setApiKey(userData.api_key || userData.binance_key);
      if (userData.api_secret) setApiSecret(userData.api_secret);
      if (userData.api_passphrase) setApiPassphrase(userData.api_passphrase);
    }
  }, [userData, engine.activeBotData]);

  const handlePairChange = (newPair: string) => {
    setPair(newPair);
    setLocalLivePrice(0); 
    setTvKey(prev => prev + 1); 
    
    if (!engine.botActive) {
      setLowerPrice("");
      setUpperPrice("");
      setInputTp("");
      setInputSl("");
      setInputTrigger("");
    }
  };

  const handleExchangeChange = (newExchange: string) => {
      setExchange(newExchange);
      setLocalLivePrice(0); 
      setTvKey(prev => prev + 1); 
  };

  // 🔥 POPRAVEK: WEBSOCKET AUTO-RECONNECT
  useEffect(() => {
    let ws: WebSocket;
    let isMounted = true;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
      if (!pair || !isMounted) return;

      if (exchange === 'kraken') {
        ws = new WebSocket('wss://ws.kraken.com');
        ws.onopen = () => {
          let kPair = pair.toUpperCase();
          if (kPair.includes('BTC')) kPair = kPair.replace('BTC', 'XBT');
          if (!kPair.includes('/')) {
             if (kPair.endsWith('USDT')) kPair = kPair.replace('USDT', '/USDT');
             else if (kPair.endsWith('USD')) kPair = kPair.replace('USD', '/USD');
             else if (kPair.endsWith('EUR')) kPair = kPair.replace('EUR', '/EUR');
          }
          ws.send(JSON.stringify({
            event: "subscribe",
            pair: [kPair],
            subscription: { name: "ticker" }
          }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (Array.isArray(data) && data[1] && data[1].c && data[1].c[0]) {
            if (isMounted) setLocalLivePrice(parseFloat(data[1].c[0]));
          }
        };
      } else if (exchange === 'bybit') {
        ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
        ws.onopen = () => {
          ws.send(JSON.stringify({ op: "subscribe", args: [`tickers.${pair.toUpperCase()}`] }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data?.data?.lastPrice) {
            if (isMounted) setLocalLivePrice(parseFloat(data.data.lastPrice));
          }
        };
      } else if (exchange === 'okx') {
         ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
         ws.onopen = () => {
           let okxPair = pair.toUpperCase();
           if (okxPair.endsWith('USDT')) okxPair = okxPair.replace('USDT', '-USDT');
           else if (okxPair.endsWith('USDC')) okxPair = okxPair.replace('USDC', '-USDC');
           ws.send(JSON.stringify({ op: "subscribe", args: [{ channel: "tickers", instId: okxPair }] }));
         };
         ws.onmessage = (event) => {
           const data = JSON.parse(event.data);
           if (data?.data?.[0]?.last) {
             if (isMounted) setLocalLivePrice(parseFloat(data.data[0].last));
           }
         };
      } else {
        let wsPair = pair.toLowerCase();
        if (wsPair.includes('xau')) wsPair = 'paxgusdt';
        if (wsPair === 'eurusd') wsPair = 'eurusdt';
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsPair}@ticker`);
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data && data.c) {
            if (isMounted) setLocalLivePrice(parseFloat(data.c));
          }
        };
      }

      // Reconnect logika, če borza prekine povezavo!
      ws.onclose = () => {
         if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 3000);
         }
      };
      
      ws.onerror = () => {
         ws.close(); // To bo sprožilo onclose, ki bo znova povezal
      };
    };

    connectWs();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [pair, exchange]); 

  const getCurrentPriceForPair = () => {
    if (pair.includes('BTC')) return prices.btc;
    if (pair.includes('ETH')) return prices.eth;
    if (pair.includes('XAU')) return prices.xau;
    if (pair.includes('EUR')) return prices.eur;
    return 0; 
  };

  const activePrice = localLivePrice > 0 ? localLivePrice : getCurrentPriceForPair();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 500;
      setSize({ 
        width: isMobile ? window.innerWidth - 20 : 450, 
        height: isMobile ? window.innerHeight - 100 : 850 
      });
      setPosition({ x: isMobile ? 10 : window.innerWidth / 2 - 225, y: 50 });
    }
  }, []);

  useEffect(() => {
    const containerId = `tv_chart_${tvKey}`; 
    const container = document.getElementById("tv_wrapper_div");
    
    if (container) {
      container.innerHTML = `<div id="${containerId}" class="w-full h-full"></div>`; 
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        if (typeof (window as any).TradingView !== 'undefined') {
          new (window as any).TradingView.widget({
            autosize: true,
            symbol: `${exchange.toUpperCase()}:${pair}`, 
            interval: timeframe,
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1", 
            locale: "en",
            enable_publishing: false,
            backgroundColor: "#000000",
            gridColor: "#111111",
            hide_top_toolbar: true, 
            hide_legend: true,
            save_image: false,
            container_id: containerId,
          });
        }
      };
      container.appendChild(script);
    }
  }, [pair, timeframe, exchange, tvKey]); 

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select') || (e.target as HTMLElement).closest('.tv-overlay')) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
  };

  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height };
  };

  // 🔥 POPRAVLJENO: Function is now async
  const handleLiveEditSave = async () => {
      await engine.updateConfigLive(
          inputTp ? parseFloat(inputTp) : null,
          inputSl ? parseFloat(inputSl) : null
      );
      setIsLiveEditing(false);
  };

  const toggleEngine = () => {
    if (!isPremium) { toast.error("PRO Node required to activate HFT Bot Engine."); return; }
    if (engine.botActive) {
      engine.stopBot();
    } else {
      if (activePrice === 0) { toast.error("Awaiting secure price feed. Please wait."); return; }
      
      const min = parseFloat(lowerPrice);
      const max = parseFloat(upperPrice);
      const gridCount = parseInt(grids);
      const invest = parseFloat(investment);

      if (isNaN(min) || isNaN(max) || isNaN(gridCount) || isNaN(invest)) {
          toast.error("Please fill all fields: Min, Max, Grids, and Initial Capital!");
          return;
      }
      if (min >= max) {
          toast.error("Lower limit must be less than Upper limit!");
          return;
      }
      if (invest < 10) {
          toast.error("Minimum investment is $10.");
          return;
      }

      engine.startBot(
        min, max, gridCount, invest, activePrice, tradingMode, !!apiKey,
        inputTp ? parseFloat(inputTp) : null,
        inputSl ? parseFloat(inputSl) : null,
        inputTrigger ? parseFloat(inputTrigger) : null,
        pair, exchange 
      );
    }
  };

  const handleSaveApiKeys = async () => {
    if (!apiKey) { toast.error("API Key is required."); return; }
    if (!userData?.id) return;
    setIsSavingApi(true);
    try {
      const updateData: any = { api_key: apiKey, api_secret: apiSecret, api_passphrase: apiPassphrase, exchange_name: exchange };
      if (exchange === "binance") updateData.binance_key = apiKey;
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userData.id);
      if (error) throw error;
      toast.success(`Exchange API (${exchange.toUpperCase()}) Secured & Linked! 🔗`);
    } catch (err: any) { toast.error("Failed to link API: " + err.message); } 
    finally { setIsSavingApi(false); }
  };

  return (
    <div 
      className="fixed z-[9999] touch-none" 
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: `${size.width}px`, height: `${size.height}px`, maxWidth: '100vw', maxHeight: '100vh' }}
    >
      <div className="flex flex-col w-full h-full relative bg-[#050509] border border-blue-500/50 shadow-[0_0_50px_rgba(37,99,235,0.3)] rounded-[2rem] overflow-hidden backdrop-blur-xl">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-4 bg-zinc-950/90 border-b border-blue-500/30 cursor-grab active:cursor-grabbing shrink-0" onPointerDown={handlePointerDownDrag}>
          <div className="flex items-center gap-2 pointer-events-none">
            <div className={`w-2.5 h-2.5 rounded-full ${engine.botActive ? (engine.isStandby ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]') : 'bg-zinc-600'}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${engine.isStandby ? 'text-yellow-500' : 'text-blue-400'}`}>
              {engine.isStandby ? 'NODE STANDBY' : 'HFT AI GRID NODE'}
            </span>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowGuide(true)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-blue-500/30">
               <span>ℹ️</span> Guide
             </button>
             <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white transition-all active:scale-90">✕</button>
          </div>
        </div>

        {/* 🔥 MASTER GUIDE MODAL 🔥 */}
        {showGuide && (
          <div className="absolute inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
             <div className="bg-zinc-950 border border-blue-500/50 rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(37,99,235,0.2)]">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0 bg-blue-900/10 rounded-t-3xl">
                   <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <span className="text-lg">⚙️</span> Master Guide
                   </h3>
                   <button onClick={() => setShowGuide(false)} className="text-zinc-500 hover:text-white">✕</button>
                </div>
                <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar text-xs leading-relaxed text-zinc-300">
                   
                   <div className="space-y-2">
                     <h4 className="text-white font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800 pb-1">1. API Setup (Live Mode)</h4>
                     <p>To run the bot on your exchange, you must generate API keys.</p>
                     <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400 font-mono">
                        <li>Go to your exchange settings (API Management).</li>
                        <li>Create a new API Key.</li>
                        <li className="text-red-400 font-bold">Check: "Enable Spot & Margin Trading" (or "Trade").</li>
                        <li className="text-red-400 font-bold">Leave Blank: "Enable Withdrawals" (CRITICAL!)</li>
                        <li>Paste Key and Secret below. For OKX/KuCoin, enter Passphrase.</li>
                     </ul>
                   </div>

                   <div className="space-y-2">
                     <h4 className="text-white font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800 pb-1">2. Grid Preparation (Engine Settings)</h4>
                     <p>The grid engine buys low and sells high within a defined channel.</p>
                     <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400">
                        <li><strong className="text-blue-400">Lower/Upper Range:</strong> Define the price channel. If the price drops below Lower, buying halts.</li>
                        <li><strong className="text-blue-400">Grid Density:</strong> Number of lines. Higher density equals faster trades, but less profit per trade. Start with 10-20.</li>
                     </ul>
                   </div>

                   <div className="space-y-2">
                     <h4 className="text-white font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800 pb-1">3. Golden Rules</h4>
                     <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-xl text-[10px] space-y-2">
                        <p>⚠️ Never set a narrow range on highly volatile assets (Meme coins).</p>
                        <p>⚠️ Always test your strategy in 📄 <strong>Paper Trading</strong> mode for a few days before enabling Live mode.</p>
                     </div>
                   </div>

                </div>
                <div className="p-4 border-t border-zinc-800 shrink-0">
                   <button onClick={() => setShowGuide(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-colors">
                     Understood. Let's Deploy.
                   </button>
                </div>
             </div>
          </div>
        )}

        <div className="relative flex-1 flex flex-col p-5 overflow-y-auto custom-scrollbar">
          
          <div className={`flex bg-black p-1 rounded-2xl border border-zinc-800 mb-4 shrink-0 ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
            <button onClick={() => !engine.botActive && setTradingMode('paper')} disabled={engine.botActive} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tradingMode === 'paper' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>📄 Paper Trading</button>
            <button onClick={() => !engine.botActive && setTradingMode('live')} disabled={engine.botActive} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tradingMode === 'live' ? 'bg-green-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
              <span className={tradingMode === 'live' ? 'animate-pulse' : ''}>⚡ Live Exchange</span>
            </button>
          </div>

          {tradingMode === 'live' && !engine.botActive && (
             <div className="bg-black/50 border border-green-500/30 rounded-[1.5rem] p-4 mb-4 space-y-3 shrink-0">
                <div className="flex items-center gap-2 mb-2"><span className="text-green-500">🌍</span><h4 className="text-[9px] font-black uppercase tracking-widest text-green-500">Universal Exchange Link</h4></div>
                <select value={exchange} onChange={(e) => handleExchangeChange(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] font-black text-white outline-none focus:border-green-500 uppercase cursor-pointer">
                  <option value="binance">Binance</option><option value="bybit">Bybit</option><option value="okx">OKX</option><option value="kucoin">KuCoin</option><option value="kraken">Kraken</option>
                </select>
                <div className="space-y-2">
                   <input type="text" placeholder="API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-white" />
                   <input type="password" placeholder="Secret Key" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-white" />
                   {(exchange === "okx" || exchange === "kucoin") && <input type="password" placeholder="Passphrase" value={apiPassphrase} onChange={(e) => setApiPassphrase(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-white" />}
                </div>
                <button onClick={handleSaveApiKeys} disabled={isSavingApi || !apiKey} className="w-full py-3 bg-green-600 text-black font-black uppercase text-[9px] rounded-xl">{isSavingApi ? 'Encrypting...' : 'Secure & Connect API'}</button>
             </div>
          )}

          <div className={`relative w-full h-[250px] shrink-0 bg-black rounded-[1.5rem] border border-zinc-800 overflow-hidden mb-2 shadow-inner ${!isPremium ? 'blur-sm' : ''}`}>
            <div className="absolute top-3 left-3 z-30 flex gap-1 bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/5 tv-overlay">
              {[ {label: '1m', val: '1'}, {label: '5m', val: '5'}, {label: '15m', val: '15'}, {label: '1h', val: '60'} ].map(tf => (
                <button key={tf.val} onClick={() => setTimeframe(tf.val)} className={`px-2.5 py-1 text-[8px] font-black uppercase rounded transition-colors ${timeframe === tf.val ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>{tf.label}</button>
              ))}
            </div>
            <div id="tv_wrapper_div" className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />
          </div>

          {/* MATRIX UI */}
          <div className="w-full bg-black/50 border border-zinc-800 rounded-[1.5rem] p-4 mb-4 shrink-0 flex flex-col gap-3 shadow-inner">
             <div className="flex items-center justify-between mb-2">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Bloomberg Order Matrix</h4>
                <div className="flex gap-2">
                    {engine.botActive && (
                        <button onClick={() => setIsLiveEditing(!isLiveEditing)} className="text-[9px] font-black uppercase tracking-widest text-yellow-500 hover:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                            {isLiveEditing ? 'Cancel Edit' : 'Edit Live Config'}
                        </button>
                    )}
                    <span className="text-[9px] font-black text-blue-500 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> SYNCED
                    </span>
                </div>
             </div>

             {/* LIVE EDIT PANEL */}
             {isLiveEditing && engine.botActive && (
                 <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-xl p-3 flex gap-2 items-end mb-2 animate-in fade-in">
                     <div className="flex-1 space-y-1">
                        <label className="text-[7px] text-green-500 font-black uppercase">Take Profit</label>
                        <input type="number" value={inputTp} onChange={e => setInputTp(e.target.value)} placeholder="Price" className="w-full bg-black border border-zinc-800 p-2 text-[10px] text-white rounded outline-none"/>
                     </div>
                     <div className="flex-1 space-y-1">
                        <label className="text-[7px] text-red-500 font-black uppercase">Stop Loss</label>
                        <input type="number" value={inputSl} onChange={e => setInputSl(e.target.value)} placeholder="Price" className="w-full bg-black border border-zinc-800 p-2 text-[10px] text-white rounded outline-none"/>
                     </div>
                     <button onClick={handleLiveEditSave} className="bg-yellow-500 text-black px-3 py-2 rounded text-[9px] font-black uppercase h-[34px]">Save</button>
                 </div>
             )}
             
             <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {(() => {
                  const min = parseFloat(lowerPrice);
                  const max = parseFloat(upperPrice);
                  const num = parseInt(grids);
                  
                  if (!min || !max || max <= min || !num || num < 2 || activePrice === 0) {
                    return <div className="text-center py-6 text-[10px] text-zinc-600 uppercase font-bold animate-pulse">Awaiting Grid Parameters...</div>;
                  }

                  let levels = engine.gridLevels.length > 0 ? engine.gridLevels : [];
                  if (levels.length === 0) {
                    const step = (max - min) / (num - 1);
                    for (let i = 0; i < num; i++) levels.push(min + step * i);
                  }

                  const sortedLevels = [...levels].sort((a, b) => b - a);

                  return (
                    <div className="flex flex-col gap-1.5">
                      
                      {/* STANDBY TRIGGER ROW */}
                      {engine.triggerPrice && (
                         <div className={`flex justify-between items-center p-2.5 rounded-xl border bg-yellow-500/10 border-yellow-500/30 ${engine.isStandby ? 'animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'opacity-50'}`}>
                             <span className="text-[9px] font-black uppercase tracking-widest text-yellow-500">[TRG] Entry Trigger</span>
                             <span className="text-[11px] font-mono font-bold text-yellow-300">${engine.triggerPrice.toFixed(2)}</span>
                         </div>
                      )}

                      {/* TP ROW */}
                      {engine.takeProfit && (
                         <div className="flex justify-between items-center p-2.5 rounded-xl border bg-green-500/10 border-green-500/30">
                             <span className="text-[9px] font-black uppercase tracking-widest text-green-500">[TP] Take Profit</span>
                             <span className="text-[11px] font-mono font-bold text-green-300">${engine.takeProfit.toFixed(2)}</span>
                         </div>
                      )}

                      {activePrice > sortedLevels[0] && (
                        <div className="flex justify-between items-center p-3 my-1 rounded-xl bg-blue-600/10 border border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                           <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Market Price</span>
                           <span className="text-[12px] font-mono font-black text-white">${activePrice.toFixed(2)}</span>
                        </div>
                      )}

                      {sortedLevels.map((lvl, idx) => {
                        const isAbove = lvl > activePrice;
                        const nextLvl = sortedLevels[idx + 1];
                        const showCurrentHere = activePrice <= lvl && (!nextLvl || activePrice > nextLvl);

                        return (
                          <React.Fragment key={idx}>
                            <div className={`flex justify-between items-center p-2.5 rounded-xl border ${isAbove ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${isAbove ? 'text-red-400' : 'text-green-400'}`}>{isAbove ? '🔴 Sell Limit' : '🟢 Buy Limit'}</span>
                              <span className="text-[11px] font-mono font-bold text-zinc-300">${lvl.toFixed(2)}</span>
                            </div>
                            
                            {showCurrentHere && (
                              <div className="flex justify-between items-center p-3 my-1 rounded-xl bg-blue-600/10 border border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Market Price</span>
                                <span className="text-[12px] font-mono font-black text-white">${activePrice.toFixed(2)}</span>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* SL ROW */}
                      {engine.stopLoss && (
                         <div className="flex justify-between items-center p-2.5 rounded-xl border bg-red-500/10 border-red-500/30">
                             <span className="text-[9px] font-black uppercase tracking-widest text-red-500">[SL] Stop Loss</span>
                             <span className="text-[11px] font-mono font-bold text-red-300">${engine.stopLoss.toFixed(2)}</span>
                         </div>
                      )}
                    </div>
                  );
                })()}
             </div>
          </div>

          <div className={`flex flex-col gap-6 flex-1 ${!isPremium ? 'opacity-30 pointer-events-none filter blur-sm' : ''}`}>
            
            <div className="space-y-2">
              <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 ml-1">Trading Asset Pair</label>
              <div className="flex gap-2">
                <input type="text" value={pair} onChange={(e) => handlePairChange(e.target.value.toUpperCase().replace('/', ''))} disabled={engine.botActive} className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-blue-400 outline-none focus:border-blue-500 uppercase" />
                <div className="flex gap-1">
                  {['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'].map(coin => (
                    <button key={coin} onClick={() => handlePairChange(`${coin}USDT`)} disabled={engine.botActive} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-[8px] font-black text-zinc-400 hover:text-white hover:bg-zinc-700">{coin}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-2 ml-1">Grid Architecture</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-zinc-600 uppercase ml-1">Lower Range</label>
                  <input type="number" placeholder="Min" value={lowerPrice} onChange={(e) => setLowerPrice(e.target.value)} disabled={engine.botActive} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-zinc-600 uppercase ml-1">Upper Range</label>
                  <input type="number" placeholder="Max" value={upperPrice} onChange={(e) => setUpperPrice(e.target.value)} disabled={engine.botActive} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-zinc-600 uppercase ml-1">Grid Density</label>
                  <input type="number" placeholder="Grids" value={grids} onChange={(e) => setGrids(e.target.value)} disabled={engine.botActive} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[7px] font-black text-zinc-600 uppercase ml-1">Initial Capital</label>
                  <input type="number" placeholder="USDT" value={investment} onChange={(e) => setInvestment(e.target.value)} disabled={engine.botActive} className="w-full bg-blue-600/5 border border-blue-600/20 rounded-xl p-4 text-xs font-mono text-blue-400 outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
               <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-left text-[9px] font-black uppercase text-zinc-500 hover:text-white flex items-center justify-between border-b border-zinc-800 pb-2">
                 🛡️ Advanced Safeguards (Optional) <span>{showAdvanced ? '▲' : '▼'}</span>
               </button>
               {showAdvanced && (
                 <div className="grid grid-cols-3 gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[6px] font-black text-red-500 uppercase ml-1">Stop Loss</label>
                      <input type="number" placeholder="Price" value={inputSl} onChange={(e) => setInputSl(e.target.value)} disabled={engine.botActive} className="w-full bg-red-950/20 border border-red-900/50 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-red-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[6px] font-black text-green-500 uppercase ml-1">Take Profit</label>
                      <input type="number" placeholder="Price" value={inputTp} onChange={(e) => setInputTp(e.target.value)} disabled={engine.botActive} className="w-full bg-green-950/20 border border-green-900/50 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-green-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[6px] font-black text-yellow-500 uppercase ml-1">Entry Trigger</label>
                      <input type="number" placeholder="Price" value={inputTrigger} onChange={(e) => setInputTrigger(e.target.value)} disabled={engine.botActive} className="w-full bg-yellow-950/20 border border-yellow-900/50 rounded-lg p-2 text-[10px] font-mono text-white outline-none focus:border-yellow-500" />
                    </div>
                 </div>
               )}
            </div>

            {engine.botActive && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
                 <h4 className="text-[8px] font-black uppercase tracking-widest text-zinc-500 ml-1">Execution Logs</h4>
                 <div className="h-24 overflow-y-auto bg-black/50 border border-zinc-800 rounded-xl p-2 space-y-1 custom-scrollbar">
                    {engine.logs.map((log, i) => (
                      <div key={i} className={`text-[8px] font-mono flex gap-2 ${log.type === 'buy' ? 'text-green-500' : log.type === 'sell' ? 'text-red-500' : log.type === 'standby' ? 'text-yellow-500' : 'text-zinc-400'}`}>
                         <span className="opacity-50 text-zinc-500 shrink-0">[{log.time}]</span>
                         <span className="font-bold">{log.msg}</span>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            <div className="mt-auto pt-6 flex flex-col gap-4">
               <div className={`p-5 rounded-[1.5rem] bg-zinc-900/80 border flex flex-col items-center text-center gap-1 shadow-inner ${tradingMode === 'live' ? 'border-green-500/30' : 'border-zinc-800'}`}>
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Live Profit (Net)</span>
                 <span className={`text-3xl font-black font-mono ${engine.profit > 0 ? (tradingMode === 'live' ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]') : 'text-zinc-700'}`}>
                   +${engine.profit.toFixed(2)}
                 </span>
               </div>
               
               <button 
                  onClick={toggleEngine} 
                  className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-xl ${ 
                    engine.botActive 
                      ? 'bg-red-600/20 text-red-500 border border-red-500/40 hover:bg-red-600 hover:text-white' 
                      : (tradingMode === 'live' ? 'bg-green-600 text-black hover:bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)]')
                  }`}
                >
                 {engine.botActive ? '🛑 Terminate Bot Engine' : (tradingMode === 'live' ? '⚡ Deploy Live Node' : '🚀 Deploy Paper Node')}
               </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-12 h-12 z-50 cursor-nwse-resize flex items-end justify-end p-3 group" onPointerDown={handlePointerDownResize}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 text-blue-500 opacity-20 group-hover:opacity-100 transition-opacity"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 21l6-6m-6 6l6-6M9 21l12-12m-12 12l12-12" /></svg>
        </div>
      </div>
    </div>
  );
}
