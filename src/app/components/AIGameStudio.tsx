"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function AIGameStudio({ userData, darkMode }: any) {
  const isPro = userData?.is_premium === true || (userData?.win_rate || 0) >= 90 || userData?.is_developer === true;
  const GENERATION_COST = 50; 

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [uiStyle, setUiStyle] = useState('neon');

  // 🔥 VFX ENGINE STATE 
  const [vfxSettings, setVfxSettings] = useState({
    type: 'smoke', 
    color1: '#00FFFF', 
    color2: '#FF00FF', 
    intensity: 1.5
  });

  // 🔥 RISK MECHANICS STATE
  const [riskMechanics, setRiskMechanics] = useState({
    fragileCore: true,
    overheatGauge: true
  });

  const [assets, setAssets] = useState<Record<string, { prompt: string, url: string | null, loading: boolean, freeUsed: boolean }>>({
    character: { prompt: '', url: null, loading: false, freeUsed: false },
    background: { prompt: '', url: null, loading: false, freeUsed: false },
    obstacle: { prompt: '', url: null, loading: false, freeUsed: false },
    item: { prompt: '', url: null, loading: false, freeUsed: false },
    effects: { prompt: '', url: null, loading: false, freeUsed: false },
  });

  const [equipmentPrompt, setEquipmentPrompt] = useState("");
  const [isEquipping, setIsEquipping] = useState(false);

  const [ecoSettings, setEcoSettings] = useState({
    maxEnergy: 1000,
    regenRate: 5,
    upgradeBaseCost: 500,
    upgradeMultiplier: 1.5
  });

  const [streakRewards, setStreakRewards] = useState([100, 250, 500, 1000, 2000, 3500, 10000]);
  const [strictReset, setStrictReset] = useState(true);

  const [ytLink, setYtLink] = useState("");
  const [rewardAmount, setRewardAmount] = useState(5000);
  const [gameConfig, setGameConfig] = useState({ 
    tokenName: '', contractAddress: '', conversionRate: '100000', presaleUrl: '' 
  });

  // 🔥 LIVE PREVIEW SIMULATOR STATE
  const [simScore, setSimScore] = useState(0);
  const [simHealth, setSimHealth] = useState(100);
  const [isBroken, setIsBroken] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<any[]>([]);
  const [cracks, setCracks] = useState<any[]>([]); 
  const clickHistory = useRef<number[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  const genres = [
    { id: 'mining', name: 'Tap / Mining', desc: 'Resource extraction. Target: Break Geodes.', targetName: 'Geode / Crystal' },
    { id: 'catch', name: 'Asset Catcher', desc: 'Drop mechanics. Target: Falling Loot.', targetName: 'Falling Reward' },
    { id: 'pvp', name: 'PvP Arena', desc: '1v1 Combat. Target: Enemy Shield.', targetName: 'Energy Shield' },
  ];

  const genreLogic: Record<string, any> = {
    mining: {
      character: { title: 'Main Character (Miner)', placeholder: 'e.g., Cyberpunk bear with a hardhat, front view...' },
      obstacle: { title: 'Hazard / Trap', placeholder: 'e.g., Explosive barrel, toxic gas cloud...' },
      item: { title: 'Mined Resource (Target)', placeholder: 'e.g., Glowing blue crystal geode, gold nugget...' },
      arsenal: { title: '5. Extraction Tool Forge', sub: 'Equip your miner', placeholder: 'e.g., Plasma drill, neon pickaxe...' }
    },
    catch: {
      character: { title: 'Main Character (Catcher)', placeholder: 'e.g., Bear looking slightly up, arms ready to catch...' },
      obstacle: { title: 'Falling Hazard', placeholder: 'e.g., Falling anvil, acid rain drop...' },
      item: { title: 'Falling Reward (Target)', placeholder: 'e.g., Golden apple, cash bundle...' },
      arsenal: { title: '5. Catcher Gear Forge', sub: 'Equip your catcher', placeholder: 'e.g., Magnetic gloves, energy net...' }
    },
    pvp: {
      character: { title: 'Main Character (Fighter)', placeholder: 'e.g., Bear in aggressive combat stance, front view...' },
      obstacle: { title: 'Arena Hazard', placeholder: 'e.g., Spike trap on the floor, fire pit...' },
      item: { title: 'Enemy Target (Shield/Armor)', placeholder: 'e.g., Glowing hexagonal energy shield, combat drone...' },
      arsenal: { title: '5. Combat Arsenal Forge', sub: 'Equip your fighter', placeholder: 'e.g., Neon katana, plasma shield...' }
    }
  };

  const uiStylesList = [
    { id: 'neon', name: 'Neon Edge' },
    { id: 'matte', name: 'Minimal Matte' },
    { id: 'retro', name: 'Arcade Retro' }
  ];

  const vfxTypes = [
    { id: 'sparks', name: 'Electric Sparks', icon: '⚡' },
    { id: 'smoke', name: 'Industrial Smoke', icon: '💨' },
    { id: 'fire', name: 'Nuclear Fire', icon: '🔥' },
  ];

  const currentLogic = selectedGenre ? genreLogic[selectedGenre] : genreLogic.mining;

  const getAssetTypes = () => {
    // 🔥 POPRAVEK: Obstacle vrnjen v vse žanre (tudi mining) 🔥
    let baseAssets = [
      { key: 'character', title: currentLogic.character.title, placeholder: currentLogic.character.placeholder },
      { key: 'background', title: 'Environment / Background', placeholder: 'e.g., Cyberpunk neon city, dark underground cavern...' },
      { key: 'item', title: currentLogic.item.title, placeholder: currentLogic.item.placeholder },
      { key: 'obstacle', title: currentLogic.obstacle.title, placeholder: currentLogic.obstacle.placeholder },
    ];
    
    baseAssets.push({ key: 'effects', title: 'UI Icons & Menus (AI Generated)', placeholder: 'Enter primary UI colors (e.g., Neon Pink and Gold)...' });
    return baseAssets;
  };

  useEffect(() => {
    const loadSavedAssets = async () => {
      if (!userData?.id) return;
      const { data } = await supabase.from('user_game_assets').select('*').eq('user_id', userData.id);
      if (data && data.length > 0) {
        const loadedAssets = { ...assets };
        data.forEach(item => { 
          if (loadedAssets[item.asset_type]) { 
            loadedAssets[item.asset_type].url = item.image_url; 
            // Ce obstaja URL, predpostavljamo, da je bil Free zeton ze porabljen
            loadedAssets[item.asset_type].freeUsed = true;
          }
        });
        setAssets(loadedAssets);
      }
    };
    loadSavedAssets();
  }, [userData?.id]);

  // 🔥 POPRAVEK: Pro user dobi free SAMO 1X na posamezen asset.
  const getCost = (key: string) => { 
    return (isPro && !assets[key].freeUsed) ? 0 : GENERATION_COST; 
  };

  const handleGenerateAsset = async (assetKey: string) => {
    if (!selectedGenre) return toast.error("Please select a Game Architecture (Stage 1) first!");
    const assetData = assets[assetKey];
    if (!assetData.prompt.trim()) return toast.error("Enter a prompt description before forging!");
    
    const cost = getCost(assetKey);
    if (userData.gains_balance < cost) return toast.error(`Insufficient funds! You need ${cost} GAINS.`);

    let finalPrompt = assetData.prompt;
    const baseStyle = "Clean black background, high-quality 3D mobile game asset, Unreal Engine 5 render style.";

    if (assetKey === 'character') {
      if (selectedGenre === 'mining') finalPrompt = `Exact front view, facing camera perfectly symmetrical. ${assetData.prompt}. ${baseStyle}`;
      else if (selectedGenre === 'catch') finalPrompt = `Exact front view, facing camera perfectly symmetrical. Looking slightly up, ready to catch. ${assetData.prompt}. ${baseStyle}`;
      else if (selectedGenre === 'pvp') finalPrompt = `Dynamic aggressive combat stance, front view. ${assetData.prompt}. ${baseStyle}`;
    } else if (assetKey === 'effects') {
      const styleText = uiStyle === 'neon' ? 'Cyberpunk style, glowing neon outlines, sharp glass aesthetic.' :
                        uiStyle === 'matte' ? 'Minimalist flat design, matte finish, modern Web3 clean UI.' :
                        '8-bit retro arcade pixel art style, nostalgic gaming aesthetic.';
      finalPrompt = `Set of 5 game UI buttons and icons (Heart, Lightning Energy, Cart, Gear, Coin). ${styleText} Primary colors: ${assetData.prompt}. Clean black background. Uniform isometric perspective.`;
    }

    if (!confirm(`Forging this asset costs ${cost} GAINS. Proceed?`)) return;

    setAssets(prev => ({ ...prev, [assetKey]: { ...prev[assetKey], loading: true } }));
    toast.info(`Initializing AI Visual Engine...`);

    try {
      if (cost > 0) {
        await supabase.from('user_balances').update({ bulls_balance: userData.gains_balance - cost }).eq('user_id', userData.id);
      }
      const res = await fetch('/api/process-game-asset', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, assetType: assetKey, userId: userData.id, selectedGenre })
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) throw new Error(data.error || "AI generation failed.");
      
      setAssets(prev => ({ ...prev, [assetKey]: { ...prev[assetKey], url: data.imageUrl, loading: false, freeUsed: true } }));
      toast.success("Asset successfully forged!");
    } catch (err: any) {
      toast.error(err.message);
      setAssets(prev => ({ ...prev, [assetKey]: { ...prev[assetKey], loading: false } }));
    }
  };

  const handleEquipItem = async () => {
    if (!selectedGenre || !assets.character.url || !equipmentPrompt.trim()) return;
    const cost = getCost('character');
    if (userData.gains_balance < cost) return toast.error(`Insufficient GAINS. You need ${cost}.`);

    setIsEquipping(true);
    let combinedPrompt = `Maintain EXACT visual features, colors, and style of the character from the reference image. The character is now holding or equipped with ${equipmentPrompt}. Exact front view, facing camera. 3D mobile game asset style, black background.`;

    try {
      if (cost > 0) {
        await supabase.from('user_balances').update({ bulls_balance: userData.gains_balance - cost }).eq('user_id', userData.id);
      }
      const res = await fetch('/api/process-game-asset', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: combinedPrompt, assetType: 'character', userId: userData.id, selectedGenre, referenceImage: assets.character.url })
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) throw new Error(data.error || "AI generation failed.");
      
      setAssets(prev => ({ ...prev, character: { ...prev.character, url: data.imageUrl, freeUsed: true } }));
      setEquipmentPrompt("");
      toast.success("Equipment successfully fused!");
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setIsEquipping(false); 
    }
  };

  const handleUpdatePrompt = (key: string, val: string) => setAssets(prev => ({ ...prev, [key]: { ...prev[key], prompt: val } }));
  const handleUpdateStreak = (index: number, val: number) => { 
    const newRewards = [...streakRewards]; 
    newRewards[index] = val; 
    setStreakRewards(newRewards); 
  };

  // 🔥 LIVE SIMULATOR LOGIC 🔥
  const handleSimulateClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isBroken) return; 

    const containerRect = previewRef.current?.getBoundingClientRect();
    const targetRect = e.currentTarget.getBoundingClientRect();
    if (!containerRect || !targetRect) return;
    
    // Natančna sredina znotraj samega kovanca v pikslih (za dim)
    const targetCenterX = targetRect.width / 2;
    const targetCenterY = targetRect.height / 2;

    const now = Date.now();
    clickHistory.current = clickHistory.current.filter(time => now - time < 1000);
    clickHistory.current.push(now);
    
    const cps = clickHistory.current.length; 
    
    if (riskMechanics.fragileCore && cps > 5) {
        const newHealth = simHealth - 15;
        
        const angle = Math.random() * Math.PI * 2;
        const r1 = Math.random() * 8 + 4; 
        const r2 = r1 + Math.random() * 12 + 6; 
        const r3 = r2 + Math.random() * 10 + 4; 
        
        const px1 = 50 + Math.cos(angle) * r1; const py1 = 50 + Math.sin(angle) * r1;
        const px2 = 50 + Math.cos(angle + 0.2) * r2; const py2 = 50 + Math.sin(angle - 0.2) * r2;
        const px3 = 50 + Math.cos(angle - 0.1) * r3; const py3 = 50 + Math.sin(angle + 0.1) * r3;

        setCracks(prev => [...prev, { 
            id: now, 
            path: `M 50 50 L ${px1} ${py1} L ${px2} ${py2} L ${px3} ${py3}` 
        }]);

        if (newHealth <= 0) {
            triggerBreak(targetCenterX, targetCenterY);
            return;
        } else {
            setSimHealth(newHealth);
        }
    }

    setSimScore(prev => prev + 10);
    
    // Dim gre iz sredine objekta (znotraj e.currentTarget)
    triggerParticles(targetCenterX, targetCenterY);
    
    // 🔥 POPRAVEK: Floating text gre iz absolutne pozicije miške znotraj celotnega kontejnerja 🔥
    triggerFloatingText(e.clientX - containerRect.left, e.clientY - containerRect.top, `+10`);
  };

  const triggerParticles = (cx: number, cy: number) => {
      const isSmoke = vfxSettings.type === 'smoke';
      const newParticles: any[] = [];
      const numParticles = isSmoke ? 4 : 8; 
      
      for(let i=0; i<numParticles; i++) {
          newParticles.push({
              id: Math.random(),
              x: cx, 
              y: cy,
              angle: isSmoke ? (Math.random() * 100 + 220) : Math.random() * 360,
              speed: isSmoke ? Math.random() * 30 + 10 : Math.random() * 80 + 30,
              life: isSmoke ? Math.random() * 1.5 + 1.5 : 0.8,
              size: isSmoke ? Math.random() * 100 + 80 : 6
          });
      }
      setParticles(prev => [...prev, ...newParticles]);
      
      setTimeout(() => {
          setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
      }, 3000);
  };

  const triggerFloatingText = (x: number, y: number, text: string) => {
      const id = Date.now();
      setFloatingTexts(prev => [...prev, { id, x, y, text }]);
      setTimeout(() => {
          setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
      }, 800);
  };

  const triggerBreak = (cx: number, cy: number) => {
      setIsBroken(true);
      setSimHealth(0);
      
      const newParticles: any[] = [];
      for(let i=0; i<30; i++) {
          newParticles.push({ id: Date.now() + i, x: cx, y: cy, angle: Math.random() * 360, speed: Math.random() * 200 + 50, life: 1.5, size: 10 });
      }
      setParticles(prev => [...prev, ...newParticles]);
      
      setTimeout(() => {
          setIsBroken(false);
          setSimHealth(100);
          clickHistory.current = [];
          setCracks([]);
      }, 3000);
  };

  const handleCompileGame = () => toast.success("Initializing Build & Smart Contracts...");
  const handleSaveYouTubeQuest = () => toast.success("YouTube Quest saved!");

  return (
    <div className={`p-0 sm:p-4 md:p-8 rounded-none sm:rounded-[2.5rem] border-0 sm:border shadow-none sm:shadow-[0_0_40px_rgba(255,0,255,0.05)] animate-in fade-in duration-700 ${darkMode ? 'bg-zinc-950 sm:border-[#FF00FF]/20' : 'bg-zinc-50 sm:border-[#FF00FF]/30'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-0 sm:py-0">
        
        {/* HEADER */}
        <div className="mb-10 flex flex-col items-center text-center border-b border-[#FF00FF]/20 pb-8">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter bg-gradient-to-r from-[#FF00FF] to-[#89CFF0] text-transparent bg-clip-text">
            Forge Engine Studio
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-2 text-zinc-400">
            Advanced Code & AI Game Constructor
          </p>
        </div>

        {/* STAGE 1: GENRE SELECTION */}
        <div className="mb-12 border-b border-zinc-800/50 pb-12">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#89CFF0] mb-2">1. Select Architecture Core</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase mb-6">Choose the physics model. AI generates art, while Code handles the VFX and anti-bot systems.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {genres.map(g => (
              <button 
                key={g.id} 
                onClick={() => setSelectedGenre(g.id)} 
                className={`p-5 rounded-2xl border transition-all text-left group ${selectedGenre === g.id ? 'border-[#89CFF0] bg-[#89CFF0]/10 shadow-[0_0_20px_rgba(137,207,240,0.2)]' : 'border-zinc-800 bg-black hover:border-zinc-600'}`}
              >
                <h4 className={`text-[11px] font-black uppercase tracking-widest mb-1 ${selectedGenre === g.id ? 'text-white' : 'text-zinc-400'}`}>
                  {g.name}
                </h4>
                <p className="text-[9px] text-zinc-600 font-bold uppercase">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* STAGE 2: MODULAR ASSET FORGE */}
        {selectedGenre && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 border-b border-zinc-800/50 pb-12 mb-12">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FF00FF] mb-2">2. AI Art Matrix</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-6">Describe AI assets. The AI engine will forge them and remove backgrounds.</p>
            
            <div className="space-y-4">
              {getAssetTypes().map(asset => {
                const state = assets[asset.key];
                return (
                  <div key={asset.key} className={`flex flex-col lg:flex-row gap-4 p-4 md:p-6 rounded-[2rem] border transition-all ${state.url ? 'border-[#89CFF0]/30 bg-[#89CFF0]/5' : 'border-zinc-800 bg-black/40'}`}>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">[ {asset.key.toUpperCase()} ]</span>
                          <h4 className="text-xs font-black uppercase text-white">{asset.title}</h4>
                        </div>

                        {asset.key === 'effects' ? (
                            <div className="mb-4">
                                <div className="text-[9px] text-zinc-500 uppercase font-black mb-2 border-t border-zinc-800 pt-2">Generate UI Elements (AI)</div>
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                                    {uiStylesList.map(s => (
                                      <button 
                                        key={s.id} 
                                        onClick={() => setUiStyle(s.id)} 
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${uiStyle === s.id ? 'bg-[#FF00FF]/20 border-[#FF00FF] text-white' : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                                      >
                                          {s.name}
                                      </button>
                                    ))}
                                </div>
                                <textarea 
                                  value={state.prompt} 
                                  onChange={(e) => handleUpdatePrompt(asset.key, e.target.value)} 
                                  placeholder={asset.placeholder} 
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] text-white outline-none h-12 resize-none font-mono mb-4" 
                                />
                            </div>
                        ) : (
                            <textarea 
                              value={state.prompt} 
                              onChange={(e) => handleUpdatePrompt(asset.key, e.target.value)} 
                              placeholder={asset.placeholder} 
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-[11px] text-white outline-none focus:border-[#FF00FF] transition-all h-20 resize-none font-mono" 
                            />
                        )}

                      </div>
                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={() => handleGenerateAsset(asset.key)} 
                          disabled={state.loading} 
                          className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${state.loading ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' : 'bg-transparent border border-[#FF00FF] text-[#FF00FF] hover:bg-[#FF00FF]/10 shadow-[0_0_15px_rgba(255,0,255,0.2)]'}`}
                        >
                          {state.loading ? 'FORGING ASSET...' : `🧬 GENERATE AI ASSET ${getCost(asset.key) === 0 ? '(FREE)' : `(-${getCost(asset.key)})`}`}
                        </button>
                      </div>
                    </div>

                    <div className="w-full lg:w-48 xl:w-64 h-48 lg:h-auto rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center shrink-0">
                      {state.url ? (
                        <div className="relative w-full h-full flex items-center justify-center p-2">
                          <img src={state.url} className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="text-zinc-700 text-[8px] font-black uppercase tracking-widest text-center px-4">
                          Awaiting AI Input
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 3: ECONOMY, RISK & VFX */}
        {selectedGenre && (
          <div className="mb-12 border-b border-zinc-800/50 pb-12 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-yellow-500 mb-2">3. Engine Mechanics (Economy, Risk & VFX)</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-6">Setup the physics, anti-bot mechanics, and impact visuals.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Economy Settings */}
                <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem] space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 border-b border-yellow-900/50 pb-2">Economy Loop</h4>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black uppercase text-white">Max Energy</label>
                          <span className="text-[10px] font-mono text-yellow-500">{ecoSettings.maxEnergy}⚡</span>
                        </div>
                        <input type="range" min="100" max="5000" step="100" value={ecoSettings.maxEnergy} onChange={(e) => setEcoSettings({...ecoSettings, maxEnergy: Number(e.target.value)})} className="w-full accent-yellow-500" />
                    </div>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black uppercase text-white">Upgrade Multiplier</label>
                          <span className="text-[10px] font-mono text-yellow-500">{ecoSettings.upgradeMultiplier}x</span>
                        </div>
                        <input type="range" min="1.1" max="3.0" step="0.1" value={ecoSettings.upgradeMultiplier} onChange={(e) => setEcoSettings({...ecoSettings, upgradeMultiplier: Number(e.target.value)})} className="w-full accent-yellow-500" />
                    </div>
                </div>

                {/* Risk Mechanics (Anti-Bot) */}
                <div className="bg-red-950/20 border border-red-900/30 p-6 rounded-[2rem] space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 border-b border-red-900/50 pb-2">Fragility & Anti-Bot System</h4>
                    
                    <label className="flex items-center justify-between cursor-pointer group bg-black p-4 rounded-xl border border-zinc-800 hover:border-red-500 transition-all mt-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase text-white">Fragile Core</span>
                            <span className="text-[8px] uppercase text-zinc-500 font-bold">Item breaks on spam click.</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-1 transition-colors ${riskMechanics.fragileCore ? 'bg-red-600' : 'bg-zinc-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${riskMechanics.fragileCore ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={riskMechanics.fragileCore} onChange={(e) => setRiskMechanics({...riskMechanics, fragileCore: e.target.checked})} />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group bg-black p-4 rounded-xl border border-zinc-800 hover:border-red-500 transition-all mt-4">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase text-white">Overheat Gauge</span>
                            <span className="text-[8px] uppercase text-zinc-500 font-bold">Show temperature bar.</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-1 transition-colors ${riskMechanics.overheatGauge ? 'bg-orange-500' : 'bg-zinc-700'}`}>
                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${riskMechanics.overheatGauge ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={riskMechanics.overheatGauge} onChange={(e) => setRiskMechanics({...riskMechanics, overheatGauge: e.target.checked})} />
                    </label>
                </div>

                {/* 🔥 DUAL COLOR VFX ENGINE 🔥 */}
                <div className="bg-[#00FFFF]/5 border border-[#00FFFF]/20 p-6 rounded-[2rem] space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#00FFFF] border-b border-[#00FFFF]/20 pb-2">Impact VFX (Code Particles)</h4>
                    <div className="flex flex-col gap-4 mt-4">
                        <div className="flex flex-wrap gap-2 w-full">
                            {vfxTypes.map(vfx => (
                                <button 
                                  key={vfx.id} 
                                  onClick={() => setVfxSettings({...vfxSettings, type: vfx.id})} 
                                  className={`flex-1 px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${vfxSettings.type === vfx.id ? 'bg-[#00FFFF]/20 border-[#00FFFF] text-white' : 'bg-black border-zinc-700 text-zinc-500'}`}
                                >
                                    {vfx.icon} {vfx.name}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex flex-col bg-black border border-zinc-800 px-3 py-2 rounded-xl">
                                <label className="text-[8px] font-black text-zinc-500 uppercase mb-1">Primary Color</label>
                                <input 
                                  type="color" 
                                  value={vfxSettings.color1} 
                                  onChange={(e) => setVfxSettings({...vfxSettings, color1: e.target.value})} 
                                  className="w-full h-6 rounded cursor-pointer bg-transparent border-0 p-0" 
                                />
                            </div>
                            <div className="flex flex-col bg-black border border-zinc-800 px-3 py-2 rounded-xl">
                                <label className="text-[8px] font-black text-zinc-500 uppercase mb-1">Secondary Color</label>
                                <input 
                                  type="color" 
                                  value={vfxSettings.color2} 
                                  onChange={(e) => setVfxSettings({...vfxSettings, color2: e.target.value})} 
                                  className="w-full h-6 rounded cursor-pointer bg-transparent border-0 p-0" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
          </div>
        )}

        {/* STAGE 4: RETENTION ENGINE */}
        {selectedGenre && (
          <div className="mb-12 border-b border-zinc-800/50 pb-12 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-red-500 mb-2">4. Retention Engine (Daily Streak)</h3>
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 md:p-8 rounded-[2rem]">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 mt-4">
                {streakRewards.map((reward, index) => (
                  <div key={index} className={`flex flex-col border rounded-xl p-3 text-center transition-colors ${index === 6 ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-800 bg-black'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest mb-2 ${index === 6 ? 'text-yellow-500' : 'text-zinc-500'}`}>Day {index + 1}</span>
                    <input 
                      type="number" 
                      value={reward} 
                      onChange={(e) => handleUpdateStreak(index, Number(e.target.value))} 
                      className={`w-full bg-transparent text-center text-xs font-mono font-black outline-none ${index === 6 ? 'text-yellow-400' : 'text-white'}`} 
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: ARSENAL FORGE (Samo če NI mining) */}
        {selectedGenre && selectedGenre !== 'mining' && (
          <div className="mb-12 border-b border-zinc-800/50 pb-12 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-2">{currentLogic.arsenal.title}</h3>
            <div className="p-6 md:p-8 rounded-[2rem] border border-orange-500/30 bg-orange-500/5">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <input 
                  value={equipmentPrompt} 
                  onChange={(e) => setEquipmentPrompt(e.target.value)} 
                  placeholder={currentLogic.arsenal.placeholder} 
                  className="flex-1 w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs font-mono text-white outline-none focus:border-orange-500" 
                />
                <button 
                  onClick={handleEquipItem} 
                  disabled={isEquipping || !assets.character.url} 
                  className={`w-full md:w-auto px-8 py-4 font-black uppercase tracking-widest rounded-xl transition-all ${isEquipping || !assets.character.url ? 'bg-zinc-800 text-zinc-500' : 'bg-gradient-to-r from-orange-600 to-orange-400 text-black hover:scale-105'}`}
                >
                  {isEquipping ? 'FORGING...' : `EQUIP ITEM`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 6: SOCIAL QUEST */}
        {selectedGenre && (
          <div className="mb-12 border-b border-zinc-800/50 pb-12 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FF00FF] mb-2">6. Viral Quest Integrator</h3>
            <div className="p-6 rounded-[2rem] border border-[#FF00FF]/30 bg-[#FF00FF]/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  value={ytLink} 
                  onChange={(e) => setYtLink(e.target.value)} 
                  placeholder="YouTube/TikTok Link" 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs font-mono text-white outline-none" 
                />
                <input 
                  type="number" 
                  value={rewardAmount} 
                  onChange={(e) => setRewardAmount(Number(e.target.value))} 
                  placeholder="Reward Points" 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs font-mono text-white outline-none" 
                />
              </div>
            </div>
          </div>
        )}

        {/* STAGE 7: TGE ECONOMY */}
        {selectedGenre && (
          <div className="mb-12 border-b border-zinc-800/50 pb-12 animate-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2">7. TGE Economy Model</h3>
            <div className="p-6 rounded-[2rem] border border-zinc-800 bg-zinc-900/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  value={gameConfig.tokenName} 
                  onChange={(e) => setGameConfig({...gameConfig, tokenName: e.target.value})} 
                  placeholder="Token Name (e.g. DUST)" 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs font-mono text-white" 
                />
                <input 
                  type="number" 
                  value={gameConfig.conversionRate} 
                  onChange={(e) => setGameConfig({...gameConfig, conversionRate: e.target.value})} 
                  placeholder="Conversion Rate (e.g. 100000)" 
                  className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-xs font-mono text-white" 
                />
              </div>
            </div>
          </div>
        )}

        {/* 🔥 STAGE 8: THE LIVE PREVIEW SIMULATOR 🔥 */}
        {selectedGenre && (
            <div className="mb-12 animate-in slide-in-from-bottom-4 duration-1000 border-2 border-[#00FFFF]/30 rounded-[2.5rem] overflow-hidden bg-black shadow-[0_0_50px_rgba(0,255,255,0.1)]">
                <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Stage 8: Live Physics Engine Simulator</h3>
                        <p className="text-[10px] text-[#00FFFF] font-bold uppercase mt-1">Test VFX, Particle System & Anti-Bot mechanics in real-time.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-black uppercase">Simulated Balance</div>
                        <div className="text-xl font-black text-yellow-500 font-mono">{simScore} GAINS</div>
                    </div>
                </div>

                {/* THE GAME CANVAS - POPRAVLJENO OZADJE (bottom center) */}
                <div 
                    ref={previewRef}
                    className="relative w-full h-[500px] md:h-[600px] bg-zinc-950 overflow-hidden cursor-crosshair select-none"
                    style={{
                        backgroundImage: assets.background.url ? `url(${assets.background.url})` : 'linear-gradient(to bottom, #09090b, #18181b)',
                        backgroundSize: 'cover', 
                        backgroundPosition: 'bottom center'
                    }}
                >
                    {/* HUD / Top Bar */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between z-50 pointer-events-none">
                        <div className="bg-black/80 backdrop-blur border border-white/10 px-4 py-2 rounded-xl flex items-center gap-3">
                            <span className="text-[10px] font-black text-zinc-400 uppercase">Energy</span>
                            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="w-full h-full bg-yellow-500" />
                            </div>
                        </div>
                        {riskMechanics.overheatGauge && (
                            <div className="bg-black/80 backdrop-blur border border-white/10 px-4 py-2 rounded-xl flex flex-col items-center">
                                <span className="text-[8px] font-black text-orange-500 uppercase mb-1">Target Core Temp</span>
                                <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                                    <div className="absolute left-0 top-0 h-full transition-all duration-300" style={{ width: `${100 - simHealth}%`, backgroundColor: simHealth < 30 ? '#ef4444' : '#f97316' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 🔥 MAIN CHARACTER - POPRAVLJENO: Stoji na tleh (bottom-0) in NE skače 🔥 */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-64 md:w-80 md:h-80 pointer-events-none z-10">
                        {assets.character.url ? (
                            <img src={assets.character.url} className="w-full h-full object-contain object-bottom filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-t-full bg-black/50 backdrop-blur">
                              <span className="text-[10px] font-black text-zinc-600 uppercase">AI Character</span>
                            </div>
                        )}
                    </div>

                    {/* 🔥 THE TARGET / CLICK AREA (POZICIJA ZNIŽANA NA 10% IN FIKSNA SREDINA) 🔥 */}
                    <div 
                        className={`absolute z-30 cursor-pointer w-40 h-40 md:w-48 md:h-48`}
                        style={{
                            left: '50%', // Fiksno na sredini
                            transform: 'translateX(-50%)', // Fiksno na sredini
                            bottom: selectedGenre === 'mining' ? '5%' : 'auto', // Fiksno na tleh
                            top: selectedGenre !== 'mining' ? '50%' : 'auto',
                            marginTop: selectedGenre !== 'mining' ? '-6rem' : '0',
                        }}
                    >
                        {/* ZNOTRANJI DIV PREVZAME ANIMACIJO, ZUNANJI DRŽI POZICIJO */}
                        <div 
                            className="relative w-full h-full transition-transform active:scale-90" 
                            style={{ 
                                animation: isBroken ? 'none' : 'idleFloat 4s ease-in-out infinite reverse',
                                filter: simHealth < 50 && !isBroken ? 'sepia(1) hue-rotate(-50deg) saturate(5) contrast(1.5)' : 'none',
                            }}
                            onClick={handleSimulateClick}
                        >
                            {isBroken ? (
                                <div className="w-full h-full flex items-center justify-center"><span className="text-6xl drop-shadow-2xl">💥</span></div>
                            ) : (
                                <div className="relative w-full h-full">
                                    {/* 🔥 DIM JE ZDAJ ZNOTRAJ KOVANCA (Z-20) 🔥 */}
                                    {particles.map(p => (
                                        <div 
                                             key={p.id} 
                                             className="absolute pointer-events-none z-20"
                                             style={{
                                                 left: `${p.x}px`, // Piksli! Sredina izračunana iz JS
                                                 top: `${p.y}px`,  // Piksli!
                                                 width: `${p.size}px`, 
                                                 height: `${p.size}px`,
                                                 // Prosojnost na zelo mehko (44 in 22)
                                                 background: vfxSettings.type === 'smoke' ? `radial-gradient(circle, ${vfxSettings.color1}44 0%, ${vfxSettings.color2}22 50%, transparent 70%)` : vfxSettings.color1,
                                                 borderRadius: vfxSettings.type === 'smoke' ? '50%' : '2px',
                                                 boxShadow: vfxSettings.type !== 'smoke' ? `0 0 15px ${vfxSettings.color1}` : 'none',
                                                 transform: `translate(-50%, -50%) rotate(${p.angle}deg)`,
                                                 animation: `particleShoot ${p.life}s ease-out forwards`,
                                                 '--travel-dist': `${p.speed}px`
                                             } as React.CSSProperties}
                                        />
                                    ))}

                                    {/* KOVANEC SLIKA (Z-30) */}
                                    <div className="relative w-full h-full z-30">
                                        {assets.item.url ? (
                                            <img src={assets.item.url} className={`w-full h-full object-contain ${simHealth < 50 ? 'animate-shake' : ''}`} />
                                        ) : (
                                            <div className={`w-full h-full rounded-full flex flex-col items-center justify-center text-center p-4 border-2 ${simHealth < 50 ? 'border-red-500 bg-red-500/20' : 'border-[#00FFFF] bg-[#00FFFF]/10 backdrop-blur shadow-[0_0_30px_rgba(0,255,255,0.2)]'}`}>
                                                <span className="text-[10px] font-black uppercase text-white">Click Target</span>
                                            </div>
                                        )}
                                        
                                        {/* 🔥 DYNAMIC SVG CRACKS 🔥 */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-hidden rounded-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            {cracks.map(c => (
                                                <path 
                                                  key={c.id} 
                                                  d={c.path} 
                                                  stroke="#000000" 
                                                  strokeWidth="2" 
                                                  fill="none" 
                                                  filter="drop-shadow(0 0 3px red)" 
                                                  strokeLinecap="round" 
                                                  strokeLinejoin="round" 
                                                />
                                            ))}
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RENDER FLOATING TEXT */}
                    {floatingTexts.map(ft => (
                        <div 
                             key={ft.id} 
                             className="absolute pointer-events-none z-40 font-black font-mono text-2xl"
                             style={{
                                 left: `${ft.x}px`, 
                                 top: `${ft.y}px`, 
                                 color: ft.text === 'BROKEN!' ? '#ef4444' : '#00FFFF',
                                 textShadow: '0 0 10px rgba(0,0,0,0.8), 0 0 20px currentColor',
                                 animation: 'floatUpAndFade 0.8s ease-out forwards'
                             }}
                        >
                            {ft.text}
                        </div>
                    ))}
                </div>
                
                <div className="bg-zinc-900 px-6 py-4 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <span className="text-[10px] text-zinc-500 uppercase font-black">Click fast on the target to test Fragility / Anti-Bot system.</span>
                    <div className="flex gap-4">
                        <button 
                          onClick={() => { setIsBroken(false); setSimHealth(100); setSimScore(0); setCracks([]); }} 
                          className="text-[9px] text-white border border-zinc-700 bg-black px-4 py-2 rounded-xl hover:border-white transition-colors uppercase font-black"
                        >
                          Reset Simulator
                        </button>
                        <button 
                          onClick={handleCompileGame} 
                          className="text-[9px] bg-gradient-to-r from-[#FF00FF] to-[#89CFF0] text-black px-6 py-2 rounded-xl uppercase font-black shadow-[0_0_15px_rgba(255,0,255,0.4)] hover:scale-105 transition-all"
                        >
                          Compile Engine
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 🔥 THE FORGE ENGINE CSS KEYFRAMES 🔥 */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes idleFloat {
            0% { transform: translate(0, 0px); }
            50% { transform: translate(0, -15px); }
            100% { transform: translate(0, 0px); }
          }
          @keyframes particleShoot {
            0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0px) scale(0.5); opacity: 1; }
            100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--travel-dist) * -1)) scale(1.5); opacity: 0; }
          }
          @keyframes floatUpAndFade {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
            20% { transform: translate(-50%, -40px) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -100px) scale(1); opacity: 0; }
          }
          @keyframes animate-shake {
            0% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(3deg) scale(1.02); }
            50% { transform: rotate(-3deg) scale(1.02); }
            75% { transform: rotate(3deg) scale(1.02); }
            100% { transform: rotate(0deg) scale(1); }
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </div>
    </div>
  );
}
