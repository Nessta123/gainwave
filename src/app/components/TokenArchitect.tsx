"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { ethers } from 'ethers';
// 🔥 SOLANA WEB3 IMPORTI 🔥
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function TokenArchitect({ userData, darkMode, onBack }: any) {
  const [step, setStep] = useState(1);
  const [myChannels, setMyChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // 🔥 State za navodila (Guide Modal) 🔥
  const [showGuide, setShowGuide] = useState(false);

  const [aiCount, setAiCount] = useState(0);

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [kycRequested, setKycRequested] = useState(false);
  const [auditRequested, setAuditRequested] = useState(false);

  // 🔥 TVOJI PRAVI NASLOVI (Pobiralka provizij) 🔥
  const CEO_WALLET_SOL = "42YFGbH8UXiXTL1ThPoCA29ZssYcw2U4x9meULi6MUrk"; 
  const CEO_WALLET_EVM = "0xf4f0c5E36509072998Dfc00a1859D5842632DAA3";

  // 🔥 CENE: SOL DVIGNJEN NA 0.8, ETH IN BASE OSTANETA 0.05 🔥
  const FEES = {
    SOL: { base: 0.8, kyc: 0.2, audit: 0.5 },
    ETH: { base: 0.05, kyc: 0.02, audit: 0.05 },
    BASE: { base: 0.05, kyc: 0.02, audit: 0.05 }
  };
  
  const [config, setConfig] = useState({
    name: '', symbol: '', supply: '1000000000',
    buyTax: 0, sellTax: 0, walletLimit: 2,
    renounce: false, revokeMint: false, revokeFreeze: false,
    launchChain: 'SOL' as 'SOL' | 'ETH' | 'BASE', softCap: '', hardCap: '', liquidityPercent: 51,
    description: '', website: '', twitter: '', telegram: '', whitepaper: '',
    airdropPercent: 0, airdropCondition: 'activity',
    // 🔥 DODANO ZA AIRDROP LOGIKO 🔥
    minComments: 0, minLikes: 0,
    // 🔥 NADGRADNJE: VESTING, WHITELIST, AUTO-DEX 🔥
    isWhitelistEnabled: false,
    whitelistAddresses: '', 
    vestingPercent: 100, // 100 pomeni brez vestinga (vse se odklene takoj)
    vestingMonths: 0,
    autoDex: true
  });

  const [configLoaded, setConfigLoaded] = useState(false);

  // 🔥 PHANTOM AUTO-RECONNECT FIX 🔥
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const provider = (window as any).phantom?.solana || (window as any).solana;
      if (provider?.isPhantom) {
        // Tihi poskus povezave, če je denarnica že bila avtorizirana
        provider.connect({ onlyIfTrusted: true }).then((res: any) => {
          setWalletAddress(res.publicKey.toString());
        }).catch(() => {
          /* Tiho ignoriramo, uporabnik bo sam kliknil Connect */
        });
      }
    }
  }, []);

  // 🔥 NOVO: IRON MEMORY (Spomin) ZA KOVAČNICO (Reši težavo s Phantom Deep Linkom!) 🔥
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gw_forge_state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.config) setConfig(parsed.config);
          if (parsed.step) setStep(parsed.step);
          if (parsed.kycRequested !== undefined) setKycRequested(parsed.kycRequested);
          if (parsed.auditRequested !== undefined) setAuditRequested(parsed.auditRequested);
          if (parsed.selectedChannel) setSelectedChannel(parsed.selectedChannel);
        } catch (e) {}
      }
      setConfigLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (configLoaded && typeof window !== 'undefined') {
      localStorage.setItem('gw_forge_state', JSON.stringify({
        config, step, kycRequested, auditRequested, selectedChannel
      }));
    }
  }, [config, step, kycRequested, auditRequested, selectedChannel, configLoaded]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!userData?.id) return;
      const { data, error } = await supabase
        .from('community_channels')
        .select('id, name')
        .eq('owner_id', userData.id);
      
      if (data && !error) setMyChannels(data);
    };
    fetchChannels();
  }, [userData]);

  const trustScore = () => {
    let s = 100;
    if (config.buyTax + config.sellTax > 10) s -= 30;
    if (config.buyTax + config.sellTax > 20) s -= 20; 
    if (!config.renounce) s -= 40;
    if (config.liquidityPercent < 70) s -= 15; 
    if (config.airdropPercent > 0) s += 5; 
    // 🔥 VESTING BOOST 🔥
    if (config.vestingPercent < 100) s += 15; 
    if (auditRequested) s += 20;
    if (kycRequested) s += 10;
    return Math.min(100, Math.max(0, s));
  };

  const isDeveloper = userData?.is_developer === true;

  const neonBorderStyle = isDeveloper 
    ? (darkMode ? 'border-[#FF00FF]/40 bg-black shadow-[0_0_50px_rgba(255,0,255,0.15)]' : 'border-[#FF00FF]/30 bg-white/70 shadow-[0_0_30px_rgba(137,207,240,0.3)]')
    : (darkMode ? 'border-zinc-800 bg-zinc-950/80 shadow-2xl' : 'border-zinc-100 bg-white shadow-xl');

  const neonTextGradient = isDeveloper 
    ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#89CFF0] via-[#FF00FF] to-[#9400D3]' 
    : (darkMode ? 'text-white' : 'text-zinc-950');

  const neonButtonGradient = isDeveloper
    ? 'bg-gradient-to-r from-[#89CFF0] via-[#FF00FF] to-[#9400D3] text-white hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,0,255,0.4)]'
    : 'bg-blue-600 text-white hover:bg-blue-500';

  // 🔥 ZANESLJIVA DETEKCIJA PHANTOMA 🔥
  const getProvider = () => {
    if (typeof window !== 'undefined') {
      if ((window as any).phantom?.solana?.isPhantom) {
        return (window as any).phantom.solana;
      }
      if ((window as any).solana?.isPhantom) {
        return (window as any).solana;
      }
    }
    return null;
  };

  const connectWallet = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const siteUrl = window.location.origin;

      if (config.launchChain === 'SOL') {
        const provider = getProvider();
        
        // 1. ZNOTRAJ PHANTOMA ALI PC
        if (provider) {
          const response = await provider.connect();
          setWalletAddress(response.publicKey.toString());
          toast.success("Phantom Wallet Connected!");
        } else {
          // 2. NAVADEN MOBILNI BRSKALNIK (Chrome) -> PRISILI KOPIJO
          if (isMobile) {
            toast.error("Open GainWave inside Phantom App Browser!", { duration: 6000 });
            
            // Kopiramo link v odložišče
            navigator.clipboard.writeText(siteUrl).then(() => {
              toast.info("GainWave Link Copied! Open Phantom App and paste it in the Browser 🌐.", { duration: 8000 });
            });
            
            // Rešilni Deep Link (včasih na iOS prime)
            setTimeout(() => {
              const encodedUrl = encodeURIComponent(siteUrl);
              window.location.href = `https://phantom.app/ul/browse/${encodedUrl}?ref=${encodedUrl}`;
            }, 3000);
          } else {
            toast.error("Phantom wallet not found! Please install the extension.");
            window.open("https://phantom.app/", "_blank");
          }
        }
      } else {
        if (typeof window !== 'undefined' && "ethereum" in window) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          setWalletAddress(accounts[0]);
          toast.success("MetaMask Connected!");
        } else {
          if (isMobile) {
            toast.info("Opening MetaMask...", { duration: 4000 });
            setTimeout(() => {
                window.location.href = `https://metamask.app.link/dapp/${window.location.host}`;
            }, 1000);
          } else {
            toast.error("MetaMask not found! Please install the extension.");
            window.open("https://metamask.io/", "_blank");
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to connect wallet.");
    }
  };

  const generateAIWhitepaper = async () => {
    if (!config.name || !config.description) {
      toast.error("Please enter Token Name and Vision first!");
      return;
    }

    const AI_FEE = 500;
    if (aiCount >= 2) {
      if (!userData?.id) return toast.error("User session not found!");
      
      toast.loading("Verifying GAINS for additional revision...");
      const { data: balanceData, error: balanceError } = await supabase
        .from('user_balances')
        .select('earned_balance')
        .eq('user_id', userData.id)
        .single();

      toast.dismiss();

      if (balanceError || !balanceData) {
        toast.error("Could not verify balance.");
        return;
      }

      if (balanceData.earned_balance < AI_FEE) {
        toast.error(`INSUFFICIENT FUNDS! You need ${AI_FEE} GAINS for extra revisions.`);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_balances')
        .update({ earned_balance: balanceData.earned_balance - AI_FEE })
        .eq('user_id', userData.id);

      if (updateError) {
        toast.error("Payment failed. Try again.");
        return;
      }
      toast.success(`Payment Confirmed: ${AI_FEE} GAINS deducted for Architect Revision.`);
    }

    setIsGeneratingAI(true);
    toast.loading("GainWave AI is forging your Whitepaper...");

    try {
      const res = await fetch('/api/forge-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          symbol: config.symbol,
          chain: config.launchChain,
          vision: config.description,
          buyTax: config.buyTax,
          sellTax: config.sellTax,
          liquidity: config.liquidityPercent,
          airdrop: config.airdropPercent,
          renounced: config.renounce
        })
      });

      if (!res.ok) throw new Error("AI Mainframe unreachable. Check API connection.");
      
      const data = await res.json();
      
      toast.dismiss();
      toast.success("Elite Whitepaper generated!");
      
      setConfig(prev => ({
        ...prev,
        whitepaper: data.whitepaper
      }));
      
      setAiCount(prev => prev + 1);

    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "AI Engine Failed.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 🔥 POPRAVLJENA SOLANA TRANSAKCIJA IN DEPLOY API KLIC 🔥
  const handleDeploy = async () => {
    if (!userData?.id) return toast.error("User session not found!");
    if (!walletAddress) return toast.error("Please connect your Web3 Wallet first!");
    
    setIsLoading(true);

    let totalFee = FEES[config.launchChain].base;
    if (kycRequested) totalFee += FEES[config.launchChain].kyc;
    if (auditRequested) totalFee += FEES[config.launchChain].audit;

    let txHash = "pending_simulation";

    try {
      toast.loading(`Awaiting Web3 Signature for ${totalFee.toFixed(2)} ${config.launchChain}...`);

      if (config.launchChain === 'ETH' || config.launchChain === 'BASE') {
         const provider = new ethers.BrowserProvider((window as any).ethereum);
         const signer = await provider.getSigner();
         const tx = await signer.sendTransaction({
            to: CEO_WALLET_EVM,
            value: ethers.parseEther(totalFee.toString())
         });
         txHash = tx.hash;
         await tx.wait();
      } else if (config.launchChain === 'SOL') {
         const provider = getProvider();
         if (!provider) throw new Error("Phantom not connected.");

         const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
         const fromPubkey = new PublicKey(walletAddress);
         const toPubkey = new PublicKey(CEO_WALLET_SOL);
         // 🔥 POPRAVEK: Uporaba Math.round da preprečimo decimal error v Solana omrežju
         const lamports = Math.round(totalFee * LAMPORTS_PER_SOL);

         const transaction = new Transaction().add(
           SystemProgram.transfer({
             fromPubkey,
             toPubkey,
             lamports,
           })
         );

         const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
         transaction.recentBlockhash = blockhash;
         transaction.feePayer = fromPubkey;

         const { signature } = await provider.signAndSendTransaction(transaction);
         txHash = signature;

         toast.loading("Transaction sent. Confirming on Solana network...");
         
         await connection.confirmTransaction({
           signature,
           blockhash,
           lastValidBlockHeight
         }, 'confirmed');
      }

      toast.dismiss();
      toast.success("Payment Verified! Initiating WaveLock Contract Forge...");

      const forgeResponse = await fetch('/api/forge-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          symbol: config.symbol,
          supply: config.supply,
          network: config.launchChain,
          ownerAddress: walletAddress,
          isWhitelistEnabled: config.isWhitelistEnabled,
          whitelistAddresses: config.isWhitelistEnabled ? config.whitelistAddresses : '', 
          vestingPercent: config.vestingPercent,
          autoDex: config.autoDex,
          // 🔥 POŠLJEMO TUDI AIRDROP PODATKE V BACKEND 🔥
          airdropPercent: config.airdropPercent,
          airdropCondition: config.airdropCondition,
          airdropMinComments: config.minComments,
          airdropMinLikes: config.minLikes
        })
      });

      const forgeData = await forgeResponse.json();

      if (!forgeResponse.ok || !forgeData.success) {
        throw new Error(forgeData.error || "Blockchain Deployment Engine failed.");
      }

      const deployedContractAddress = forgeData.contractAddress;

      const { data: deployData, error: insertError } = await supabase
        .from('forge_deployments')
        .insert([{
          owner_id: userData.id,
          hub_id: selectedChannel,
          token_name: config.name,
          token_symbol: config.symbol,
          buy_tax: config.buyTax,
          sell_tax: config.sellTax,
          hard_cap: config.hardCap ? Number(config.hardCap) : 0,
          liquidity_percent: config.liquidityPercent,
          chain: config.launchChain,
          whitepaper_text: config.whitepaper,
          airdrop_percent: config.airdropPercent,
          airdrop_condition: config.airdropCondition,
          status: 'live_presale',
          kyc_verified: kycRequested,
          is_audited: auditRequested,
          contract_address: deployedContractAddress,
          tx_hash: txHash,
          vesting_percent: config.vestingPercent,
          whitelist_addresses: config.isWhitelistEnabled ? config.whitelistAddresses : null,
          // 🔥 SHRANIMO V BAZO POGOJE ZA AIRDROP 🔥
          airdrop_min_comments: config.minComments,
          airdrop_min_likes: config.minLikes
        }])
        .select()
        .single();

      if (insertError) throw new Error("Contract deployed, but registry failed. Contact support.");

      const globalAlertMessage = `🚨 **WAVELOCK: NEW ASSET FORGED!** 🚨\n\n🚀 **Asset:** ${config.name} (${config.symbol.toUpperCase()})\n🌐 **Network:** ${config.launchChain}\n🔒 **Liquidity Locked:** ${config.liquidityPercent}% (WaveLock Protocol)\n🛡️ **Trust Score:** ${trustScore()}% ${kycRequested ? ' | 👤 KYC' : ''} ${auditRequested ? ' | 🛡️ AUDIT' : ''}\n🎁 **Airdrop:** ${config.airdropPercent}%\n\n*This asset was deployed securely via GainWave Forge. Presale is now LIVE!*`;
      
      await supabase.from('posts').insert([{
        user_id: userData.id,
        text: globalAlertMessage,
        author_alias: userData.alias,
        is_promoted: true,
        is_boosted: true,
        is_forge_deployment: true,
        pair: `${config.symbol}/USDT`,
        signal_status: 'presale'
      }]);

      const hubAlertMessage = `⚒️ **HUB ANNOUNCEMENT: PRE-SALE LIVE** ⚒️\n\nOur official token **${config.symbol.toUpperCase()}** is deployed! Secure your bags before public marketing starts.\n\n🔹 Presale Target: ${config.hardCap || 'TBA'} ${config.launchChain}\n🔹 Liquidity Locked: ${config.liquidityPercent}%`;

      await supabase.from('posts').insert([{
        user_id: userData.id,
        hub_id: selectedChannel, 
        author_alias: userData.alias,
        text: hubAlertMessage
      }]);

      toast.success("ASSET LIVE ON BLOCKCHAIN! Genesis Post injected into Global Feed.");
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gw_forge_state');
      }

      setTimeout(() => {
        onBack(); 
      }, 3000);

    } catch (err: any) {
      toast.dismiss();
      if (err.code === "ACTION_REJECTED" || err.code === 4001 || err.message?.includes("User rejected")) {
        toast.error("Transaction rejected by user.");
      } else {
        console.error("Deploy Error:", err);
        toast.error(err.message || "Smart Contract Deployment Failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-3 md:p-6 lg:p-8 animate-in fade-in duration-700 relative overflow-y-auto">
      
      {/* 🔥 GUIDE MODAL (NAVODILA) 🔥 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl md:rounded-[2rem] border p-6 md:p-10 shadow-2xl relative custom-scrollbar ${darkMode ? 'bg-zinc-950 border-[#FF00FF]/30 text-white' : 'bg-white border-zinc-200 text-black'}`}>
            <button 
              onClick={() => setShowGuide(false)} 
              className="absolute top-4 right-4 md:top-6 md:right-6 text-3xl font-black hover:text-[#FF00FF] transition-all"
            >&times;</button>
            
            <h2 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-[#89CFF0] mb-6 md:mb-8 mt-2">
              GainWave Forge <span className="text-[#FF00FF]">Architect Manual</span>
            </h2>

            <div className="space-y-6 md:space-y-8">
              <section>
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-[#FF00FF] mb-2 md:mb-3">1. The Forging Process</h3>
                <p className="text-[10px] md:text-xs text-zinc-400 leading-relaxed">
                  GainWave Forge allows you to instantly mint, audit, and launch a Web3 smart contract.
                  Unlike traditional platforms, a Forge deployment automatically triggers a **Boosted Genesis Post** into the Global Feed, instantly exposing your token to our entire user base. Your token is natively integrated with our Hub system for immediate community building.
                </p>
              </section>

              <section>
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-[#FF00FF] mb-2 md:mb-3">2. Fee Structure & Revenue</h3>
                <ul className="text-[10px] md:text-xs text-zinc-400 leading-relaxed space-y-2 list-disc pl-5">
                  <li><strong className={darkMode ? 'text-white' : 'text-black'}>Upfront Architect Fee:</strong> A base deployment fee is paid via Web3 Wallet (0.8 SOL or 0.05 ETH/BASE) to compile the contract and setup the AI Whitepaper.</li>
                  <li><strong className={darkMode ? 'text-white' : 'text-black'}>1% Platform Presale Fee:</strong> GainWave takes a 1% protocol fee ONLY from the total funds successfully raised during your Presale phase.</li>
                  <li><strong className={darkMode ? 'text-white' : 'text-black'}>AI Engine Limits:</strong> You receive 2 free AI Whitepaper generations. Subsequent re-rolls cost 500 GAINS per attempt.</li>
                </ul>
              </section>

              <section className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-[#89CFF0]/10 to-[#FF00FF]/10 border border-[#89CFF0]/30">
                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white mb-3">3. Maximizing Your Trust Score (Safe Coin)</h3>
                <p className="text-[10px] md:text-xs text-zinc-300 leading-relaxed mb-4">
                  Investors look at your <strong className="text-green-500">Trust Score</strong> before buying. Follow these rules to forge a 100% Elite Asset that attracts major liquidity:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-[10px] md:text-xs text-zinc-400">
                  <div className="p-3 md:p-4 bg-black/40 rounded-xl border border-white/5">
                    <strong className="text-[#89CFF0] uppercase block mb-1">Low Taxes</strong>
                    Keep Buy and Sell taxes below 10%. High taxes severely penalize your Trust Score.
                  </div>
                  <div className="p-3 md:p-4 bg-black/40 rounded-xl border border-white/5">
                    <strong className="text-[#89CFF0] uppercase block mb-1">Renounce Ownership</strong>
                    Always check "Renounce Ownership". This proves to investors you cannot maliciously change taxes later.
                  </div>
                  <div className="p-3 md:p-4 bg-black/40 rounded-xl border border-white/5">
                    <strong className="text-[#89CFF0] uppercase block mb-1">WaveLock Liquidity</strong>
                    Lock at least 70% of your raised presale funds. The higher the lock, the safer the coin.
                  </div>
                  <div className="p-3 md:p-4 bg-black/40 rounded-xl border border-green-500/30">
                    <strong className="text-green-500 uppercase block mb-1">KYC & Audit Badges</strong>
                    Purchase the KYC and Smart Contract Audit in Step 6. This adds a massive +30% boost to your Trust Score and grants you the "Verified" badge in the Global Feed.
                  </div>
                </div>
              </section>
            </div>
            
            <button 
              onClick={() => setShowGuide(false)}
              className="w-full mt-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest bg-zinc-800 text-white hover:bg-zinc-700 transition-all"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-white/5 pb-4 md:pb-6">
        <div>
          <h2 className={`text-3xl md:text-4xl font-black uppercase tracking-tighter ${neonTextGradient}`}>
            GainWave <span className={`${neonTextGradient}`}>Forge</span>
          </h2>
          <p className="text-[9px] md:text-[11px] font-bold text-zinc-500 tracking-widest uppercase mt-1">
            Elite Token Architect Protocol
          </p>
        </div>
        <div className="flex gap-3 md:gap-4 items-center">
          <button 
            onClick={() => setShowGuide(true)} 
            className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#89CFF0] hover:text-[#FF00FF] transition-all border border-[#89CFF0]/30 px-3 py-2 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-[#89CFF0]/10 shadow-[0_0_15px_rgba(137,207,240,0.2)]"
          >
            📖 Guide
          </button>
          <button onClick={onBack} className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>
            &larr; Exit
          </button>
        </div>
      </div>

      <div className={`w-full max-w-4xl mx-auto rounded-3xl md:rounded-[3rem] border transition-all duration-500 backdrop-blur-3xl overflow-hidden ${neonBorderStyle}`}>
        
        {/* KORAK 1: HUB LINK */}
        {step === 1 && (
          <div className="p-6 md:p-12 text-center space-y-6 md:space-y-10 animate-in zoom-in-95 duration-500">
            <div className={`w-20 h-20 md:w-28 md:h-28 ${isDeveloper ? 'bg-[#FF00FF]/5 shadow-[0_0_30px_rgba(255,0,255,0.1)]' : 'bg-blue-500/5'} rounded-full flex items-center justify-center mx-auto border border-blue-500/20`}>
               <span className="text-4xl md:text-5xl">🏠</span>
            </div>
            <div>
              <h3 className={`text-xl md:text-2xl font-black uppercase ${darkMode ? 'text-white' : 'text-black'}`}>Step 1: Link Genesis Hub</h3>
              <p className="text-zinc-500 text-[10px] md:text-xs mt-2 md:mt-3 uppercase tracking-wider leading-relaxed">A verified token requires an established community home.<br/> Link your Community Hub to begin the process.</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4 md:space-y-5">
              <div className="relative">
                <select 
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className={`w-full p-4 md:p-5 rounded-xl md:rounded-2xl border outline-none text-xs md:text-sm appearance-none cursor-pointer pr-10 md:pr-12 ${
                        darkMode 
                            ? 'bg-zinc-900/50 border-zinc-800 text-white focus:border-blue-500' 
                            : 'bg-zinc-50 border-zinc-200 focus:border-blue-600'
                    }`}
                >
                    <option value="">-- SELECT YOUR ACTIVE HUB --</option>
                    {myChannels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                </select>
                <div className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none text-[10px] md:text-xs">▼</div>
              </div>

              {myChannels.length === 0 && (
                <div className={`p-3 md:p-4 rounded-xl border-l-4 ${darkMode ? 'bg-red-950/20 border-red-500 text-red-400' : 'bg-red-50 border-red-600 text-red-700'}`}>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase animate-pulse">
                        ⚠️ No Hub detected. You must create a Community Hub first.
                    </p>
                </div>
              )}

              <button 
                disabled={!selectedChannel}
                onClick={() => setStep(2)}
                className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-[0.2em] transition-all disabled:opacity-20 disabled:cursor-not-allowed ${neonButtonGradient}`}
              >
                Continue to Forge &rarr;
              </button>
            </div>
          </div>
        )}

        {/* KORAK 2: TOKENOMICS & TRUST-O-METER */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 animate-in slide-in-from-right-10 duration-500">
            <div className={`lg:col-span-2 p-5 md:p-10 space-y-6 md:space-y-8 border-b lg:border-b-0 lg:border-r ${darkMode ? 'border-white/5' : 'border-zinc-200'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Token Name</label>
                  <input 
                    placeholder="e.g. GainWave Gold" 
                    value={config.name}
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm outline-none transition-all ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-[#FF00FF]/50 border' : 'bg-zinc-50 border-zinc-200 text-black focus:border-[#FF00FF]/50 border'}`} 
                    onChange={e => setConfig({...config, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Ticker / Symbol</label>
                  <input 
                    placeholder="GWG" 
                    value={config.symbol}
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm uppercase outline-none transition-all ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-[#89CFF0]/50 border' : 'bg-zinc-50 border-zinc-200 text-black focus:border-[#89CFF0]/50 border'}`} 
                    onChange={e => setConfig({...config, symbol: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Buy Tax (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="99"
                    placeholder="0"
                    value={config.buyTax === 0 ? '' : config.buyTax} 
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm font-mono outline-none transition-all ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-blue-500 border' : 'bg-zinc-50 border-zinc-200 text-black focus:border-blue-500 border'}`} 
                    onChange={e => setConfig({...config, buyTax: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Sell Tax (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="99"
                    placeholder="0"
                    value={config.sellTax === 0 ? '' : config.sellTax} 
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm font-mono outline-none transition-all ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-blue-500 border' : 'bg-zinc-50 border-zinc-200 text-black focus:border-blue-500 border'}`} 
                    onChange={e => setConfig({...config, sellTax: e.target.value === '' ? 0 : Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className={`p-4 md:p-6 rounded-xl md:rounded-2xl border flex items-center justify-between group transition-all cursor-pointer ${darkMode ? 'bg-white/5 border-white/5 hover:border-[#FF00FF]/30' : 'bg-zinc-50 border-zinc-200 hover:border-[#FF00FF]/30'}`} onClick={() => setConfig({...config, renounce: !config.renounce})}>
                <div className="flex flex-col pr-2">
                  <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>Renounce Ownership</span>
                  <span className="text-[8px] md:text-[9px] text-zinc-500 font-bold uppercase mt-1">Permanent trust. You can't change taxes after launch.</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={config.renounce}
                  className="w-5 h-5 md:w-6 md:h-6 accent-[#FF00FF] cursor-pointer shrink-0" 
                  readOnly 
                />
              </div>
            </div>

            <div className={`p-6 md:p-10 flex flex-col justify-between items-center text-center relative overflow-hidden ${darkMode ? 'bg-black/20' : 'bg-zinc-100/50'}`}>
              <div className="space-y-4 md:space-y-6 w-full relative z-10">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Security Protocol</span>
                
                <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mt-2 md:mt-4">
                  <div className={`absolute inset-0 rounded-full blur-2xl opacity-30 transition-all duration-700 ${trustScore() > 70 ? 'bg-green-500' : trustScore() > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <div className={`w-full h-full rounded-full border-4 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all duration-700 ${trustScore() > 70 ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : trustScore() > 40 ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)]' : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]'}`}>
                    <span className="text-4xl md:text-5xl font-black text-white drop-shadow-md font-mono">{trustScore()}%</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2 md:pt-4">
                  <p className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest ${trustScore() > 70 ? 'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : trustScore() > 40 ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}>
                    {trustScore() > 70 ? '👑 ELITE STATUS' : trustScore() > 40 ? '⚠️ MODERATE RISK' : '🚫 HIGH RISK'}
                  </p>
                </div>
              </div>

              <div className="w-full pt-8 md:pt-12 space-y-3 md:space-y-4 relative z-10 mt-auto">
                <button 
                   onClick={() => setStep(3)}
                   disabled={!config.name || !config.symbol}
                   className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${neonButtonGradient}`}
                >
                  Next: Presale Hub &rarr;
                </button>
                <button onClick={() => setStep(1)} className="w-full text-[8px] md:text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-all py-2">
                  &larr; Back to Step 1
                </button>
              </div>
            </div>

          </div>
        )}

        {/* KORAK 3: PRESALE & LIQUIDITY */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 animate-in slide-in-from-right-10 duration-500 p-5 md:p-10 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              <div className="flex gap-2 md:gap-4 p-2 bg-black/20 rounded-2xl md:rounded-[2rem] border border-white/5 w-fit">
                {['SOL', 'ETH', 'BASE'].map(coin => (
                  <button 
                    key={coin}
                    onClick={() => setConfig({...config, launchChain: coin as any})}
                    className={`px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black transition-all ${config.launchChain === coin ? 'bg-[#FF00FF] text-white shadow-[0_0_15px_rgba(255,0,255,0.4)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {coin}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest text-left block">Soft Cap</label>
                  <input 
                    type="number" placeholder="min. to succeed" 
                    value={config.softCap}
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm font-mono outline-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-[#FF00FF]/50' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                    onChange={e => setConfig({...config, softCap: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest text-left block">Hard Cap</label>
                  <input 
                    type="number" placeholder="max. raise limit" 
                    value={config.hardCap}
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm font-mono outline-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-[#FF00FF]/50' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                    onChange={e => setConfig({...config, hardCap: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4 p-5 md:p-6 rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] md:text-[10px] font-black text-[#89CFF0] uppercase tracking-widest">Liquidity Lock-up</label>
                  <span className="text-lg md:text-xl font-black text-white">{config.liquidityPercent}%</span>
                </div>
                <input 
                  type="range" min="51" max="100" 
                  value={config.liquidityPercent}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF00FF]"
                  onChange={e => setConfig({...config, liquidityPercent: Number(e.target.value)})}
                />
                <div className="flex justify-between text-[7px] md:text-[8px] font-black text-zinc-600 uppercase">
                  <span>Minimum (51%)</span>
                  <span>Maximum (100%)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest text-left block">Presale Rate (1 {config.launchChain})</label>
                  <input 
                    placeholder="e.g. 1,000,000" 
                    className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm font-mono outline-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest text-left block">Lock Time</label>
                  <select className={`w-full rounded-xl md:rounded-2xl p-4 md:p-5 text-[9px] md:text-[10px] font-black uppercase outline-none border cursor-pointer ${darkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`}>
                    <option>1 Month</option>
                    <option>6 Months</option>
                    <option selected>1 Year (365 Days)</option>
                    <option>Forever (Burn)</option>
                  </select>
                </div>
              </div>

              {/* 🔥 NOVO: VESTING & WHITELIST 🔥 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-4">
                <div className="space-y-4 p-5 md:p-6 rounded-2xl md:rounded-[2rem] bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] md:text-[10px] font-black text-[#89CFF0] uppercase tracking-widest">Initial Unlock (Vesting)</label>
                    <span className="text-lg md:text-xl font-black text-white">{config.vestingPercent}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="100" step="5"
                    value={config.vestingPercent}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#89CFF0]"
                    onChange={e => setConfig({...config, vestingPercent: Number(e.target.value)})}
                  />
                  <p className="text-[7px] md:text-[8px] font-black text-zinc-500 uppercase mt-2">Protects against early dumps.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className={`p-5 md:p-6 rounded-xl md:rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${config.isWhitelistEnabled ? 'bg-[#89CFF0]/10 border-[#89CFF0]/50' : (darkMode ? 'bg-black/40 border-white/5' : 'bg-zinc-50 border-zinc-200')}`} onClick={() => setConfig({...config, isWhitelistEnabled: !config.isWhitelistEnabled})}>
                    <div className="flex flex-col pr-4">
                      <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>Private Whitelist</span>
                      <span className="text-[8px] md:text-[9px] text-zinc-500 font-bold uppercase mt-1">Restrict buyers.</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-all ${config.isWhitelistEnabled ? 'bg-[#89CFF0]' : 'bg-zinc-700'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full transition-all ${config.isWhitelistEnabled ? 'translate-x-4' : ''}`} />
                    </div>
                  </div>

                  {/* 🔥 VGRAJEN INPUT ZA WHITELIST NASLOVE 🔥 */}
                  {config.isWhitelistEnabled && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <textarea 
                        placeholder="Paste wallet addresses here (separated by commas or new lines)..."
                        value={config.whitelistAddresses}
                        onChange={e => setConfig({...config, whitelistAddresses: e.target.value})}
                        className={`w-full h-24 md:h-28 rounded-xl p-3 md:p-4 text-[10px] md:text-xs font-mono outline-none resize-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-[#89CFF0]/50' : 'bg-zinc-50 border-zinc-200 text-black focus:border-[#89CFF0]/50'}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border flex flex-col justify-between ${darkMode ? 'bg-zinc-950/50 border-[#FF00FF]/20 shadow-2xl' : 'bg-white border-zinc-200 shadow-xl'}`}>
              <div className="space-y-6 md:space-y-8">
                <div className="text-center">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Live Simulation</span>
                  <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-black/40 border border-white/5 space-y-2 md:space-y-3">
                     <div className="flex justify-between text-[8px] md:text-[9px] font-bold uppercase">
                        <span className="text-zinc-600">Raise Target:</span>
                        <span className="text-[#89CFF0]">{config.hardCap || '0'} {config.launchChain}</span>
                     </div>
                     <div className="flex justify-between text-[8px] md:text-[9px] font-bold uppercase">
                        <span className="text-zinc-600">To Liquidity:</span>
                        <span className="text-green-500">{(Number(config.hardCap || 0) * (config.liquidityPercent / 100)).toFixed(2)} {config.launchChain}</span>
                     </div>
                     <div className="flex justify-between text-[8px] md:text-[9px] font-bold uppercase border-t border-white/5 pt-2 mt-2">
                        <span className="text-[#FF00FF]">Platform Fee (1%):</span>
                        <span className="text-white">{(Number(config.hardCap || 0) * 0.01).toFixed(2)} {config.launchChain}</span>
                     </div>
                  </div>
                </div>

                <div className="p-3 md:p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                   <p className="text-[7px] md:text-[8px] text-zinc-500 uppercase font-black leading-tight italic text-center">
                     "Your liquidity will be automatically locked via the Forge Protocol on launch."
                   </p>
                </div>
              </div>

              <div className="space-y-3 mt-8 md:mt-10">
                <button 
                  onClick={() => setStep(4)}
                  className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest ${neonButtonGradient}`}
                >
                  Continue to Branding &rarr;
                </button>
                <button onClick={() => setStep(2)} className="w-full text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest py-2">
                  &larr; Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KORAK 4: BRANDING & AI WHITEPAPER */}
        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 animate-in slide-in-from-right-10 duration-500 p-5 md:p-10 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Project Vision / Utility</label>
                <textarea 
                  placeholder="Describe your project in a few sentences... (AI will use this to generate the Whitepaper)"
                  value={config.description}
                  onChange={e => setConfig({...config, description: e.target.value})}
                  className={`w-full h-24 md:h-32 rounded-xl md:rounded-2xl p-4 md:p-5 text-xs md:text-sm outline-none resize-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white focus:border-[#89CFF0]/50' : 'bg-zinc-50 border-zinc-200 text-black'}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Website</label>
                  <input placeholder="https://" value={config.website} onChange={e => setConfig({...config, website: e.target.value})} className={`w-full rounded-xl md:rounded-2xl p-3 md:p-4 text-xs outline-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Twitter (X)</label>
                  <input placeholder="@" value={config.twitter} onChange={e => setConfig({...config, twitter: e.target.value})} className={`w-full rounded-xl md:rounded-2xl p-3 md:p-4 text-xs outline-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Telegram</label>
                  <input placeholder="t.me/" value={config.telegram} onChange={e => setConfig({...config, telegram: e.target.value})} className={`w-full rounded-xl md:rounded-2xl p-3 md:p-4 text-xs outline-none border ${darkMode ? 'bg-black/40 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-black'}`} />
                </div>
              </div>
            </div>

            <div className={`p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border flex flex-col justify-between ${darkMode ? 'bg-zinc-950/50 border-[#89CFF0]/20 shadow-2xl' : 'bg-white border-zinc-200 shadow-xl'}`}>
              <div className="space-y-5 md:space-y-6">
                <div className="text-center">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-[#89CFF0]">GainWave AI Engine</span>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 mt-1 md:mt-2">Generate a professional, structured whitepaper for your investors in seconds.</p>
                </div>
                
                {config.whitepaper ? (
                  <div className="space-y-3 md:space-y-4">
                    <div className="p-4 md:p-5 rounded-xl md:rounded-2xl bg-zinc-950/80 border border-[#89CFF0]/50 h-40 md:h-56 overflow-y-auto custom-scrollbar relative shadow-[inset_0_0_20px_rgba(137,207,240,0.15)]">
                      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(137,207,240,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(137,207,240,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-50"></div>
                      <pre className="text-[9px] md:text-[10px] text-[#89CFF0] font-mono whitespace-pre-wrap relative z-10 leading-relaxed">{config.whitepaper}</pre>
                    </div>
                    <button 
                      onClick={generateAIWhitepaper}
                      disabled={isGeneratingAI}
                      className="w-full py-2 md:py-3 rounded-lg md:rounded-xl border border-[#FF00FF]/30 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[#FF00FF] hover:bg-[#FF00FF]/10 transition-all"
                    >
                      {isGeneratingAI ? 'Regenerating...' : '⟳ Re-roll AI Whitepaper'}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={generateAIWhitepaper}
                    disabled={isGeneratingAI}
                    className={`w-full py-6 md:py-8 rounded-xl md:rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${isGeneratingAI ? 'border-[#FF00FF]/50 bg-[#FF00FF]/10 shadow-[0_0_20px_rgba(255,0,255,0.2)] animate-pulse' : 'border-[#89CFF0]/30 hover:border-[#89CFF0]/60 bg-[#89CFF0]/5 cursor-pointer'}`}
                  >
                    <span className="text-xl md:text-2xl mb-1 md:mb-2">🤖</span>
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#89CFF0]">
                      {isGeneratingAI ? 'Architecting...' : 'Generate Whitepaper'}
                    </span>
                  </button>
                )}

                <div className={`mt-3 md:mt-4 p-2 md:p-3 rounded-lg md:rounded-xl border text-center ${aiCount >= 2 ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                   <p className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest leading-relaxed ${aiCount >= 2 ? 'text-red-400 animate-pulse' : 'text-yellow-500'}`}>
                     ⚠️ SYSTEM ALERT: {Math.max(0, 2 - aiCount)} free revisions left.<br/>
                     {aiCount >= 2 ? 'FEE APPLIES: 500 GAINS per extra.' : 'Next attempts: 500 GAINS.'}
                   </p>
                </div>

              </div>

              <div className="space-y-3 mt-5 md:mt-6">
                <button onClick={() => setStep(5)} className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest ${neonButtonGradient}`}>
                  Continue to Airdrop Strategy &rarr;
                </button>
                <button onClick={() => setStep(3)} className="w-full text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest py-2">
                  &larr; Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KORAK 5: COMMUNITY AIRDROP STRATEGY */}
        {step === 5 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 animate-in slide-in-from-right-10 duration-500 p-5 md:p-10 gap-6 md:gap-8">
            <div className="lg:col-span-2 space-y-6 md:space-y-8 text-left">
              <div>
                <h3 className={`text-lg md:text-xl font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>Community Reward Protocol</h3>
                <p className="text-zinc-500 text-[9px] md:text-[10px] uppercase font-bold mt-1">Set the rules for your automated token distribution.</p>
              </div>

              <div className={`space-y-3 md:space-y-4 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border transition-all ${darkMode ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex justify-between items-center">
                  <label className="text-[9px] md:text-[10px] font-black text-[#FF00FF] uppercase tracking-widest">Airdrop Allocation (%)</label>
                  <span className={`text-lg md:text-xl font-black ${darkMode ? 'text-white' : 'text-black'}`}>{config.airdropPercent}%</span>
                </div>
                <input 
                  type="range" min="0" max="20" 
                  value={config.airdropPercent}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF00FF]"
                  onChange={e => setConfig({...config, airdropPercent: Number(e.target.value)})}
                />
                <p className="text-[8px] md:text-[9px] text-zinc-500 font-bold uppercase">This supply will be locked for automated community distribution.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <button 
                  onClick={() => setConfig({...config, airdropCondition: 'activity'})}
                  className={`p-4 md:p-5 rounded-xl md:rounded-2xl border transition-all text-left group ${config.airdropCondition === 'activity' ? 'border-[#89CFF0] bg-[#89CFF0]/10' : (darkMode ? 'border-white/5 bg-black/20 hover:border-white/20' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300')}`}
                >
                  <span className={`block text-[10px] md:text-[11px] font-black uppercase ${darkMode ? 'text-white' : 'text-black'}`}>🔥 Activity Based</span>
                  <span className="block text-[8px] md:text-[9px] text-zinc-500 uppercase mt-1 font-bold">Reward top commenters & creators in your Hub.</span>
                </button>
                
                <button 
                  onClick={() => setConfig({...config, airdropCondition: 'viral'})}
                  className={`p-4 md:p-5 rounded-xl md:rounded-2xl border transition-all text-left group ${config.airdropCondition === 'viral' ? 'border-[#FF00FF] bg-[#FF00FF]/10' : (darkMode ? 'border-white/5 bg-black/20 hover:border-white/20' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300')}`}
                >
                  <span className={`block text-[10px] md:text-[11px] font-black uppercase ${darkMode ? 'text-white' : 'text-black'}`}>📢 Viral Growth</span>
                  <span className="block text-[8px] md:text-[9px] text-zinc-500 uppercase mt-1 font-bold">Reward those who share your promo post.</span>
                </button>
              </div>

              {/* 🔥 DODANO: INPUT POLJA POVEZANA S STATE-OM 🔥 */}
              {config.airdropCondition === 'activity' && (
                <div className={`p-4 md:p-5 rounded-xl md:rounded-2xl border animate-in fade-in zoom-in-95 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white border-zinc-200 shadow-sm'}`}>
                  <label className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase ml-1 md:ml-2 tracking-widest">Min. Interaction Required</label>
                  <div className="grid grid-cols-2 gap-3 md:gap-4 mt-2 md:mt-3">
                    <input 
                      type="number" 
                      min="0"
                      placeholder="Min Comments" 
                      value={config.minComments || ''}
                      onChange={e => setConfig({...config, minComments: Number(e.target.value)})}
                      className={`rounded-lg md:rounded-xl p-3 text-[10px] md:text-xs outline-none border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#89CFF0]/50' : 'bg-zinc-50 border-zinc-200 text-black focus:border-[#89CFF0]/50'}`} 
                    />
                    <input 
                      type="number" 
                      min="0"
                      placeholder="Min Likes" 
                      value={config.minLikes || ''}
                      onChange={e => setConfig({...config, minLikes: Number(e.target.value)})}
                      className={`rounded-lg md:rounded-xl p-3 text-[10px] md:text-xs outline-none border ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#89CFF0]/50' : 'bg-zinc-50 border-zinc-200 text-black focus:border-[#89CFF0]/50'}`} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={`p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border flex flex-col justify-between ${darkMode ? 'bg-zinc-950/50 border-[#FF00FF]/20 shadow-2xl' : 'bg-white border-zinc-200 shadow-xl'}`}>
              <div className="space-y-5 md:space-y-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF00FF]/10 rounded-full flex items-center justify-center mx-auto border border-[#FF00FF]/30">
                  <span className="text-xl md:text-2xl">🎁</span>
                </div>
                <div className="text-center">
                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Airdrop Engine</span>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 mt-2 font-bold uppercase leading-relaxed">
                    GainWave Forge will auto-scan your Hub and distribute tokens to the most loyal supporters based on your rules.
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-5 md:mt-6">
                <button onClick={() => setStep(6)} className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest ${neonButtonGradient}`}>
                  Continue to Deployment &rarr;
                </button>
                <button onClick={() => setStep(4)} className="w-full text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-widest py-2">
                  &larr; Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 KORAK 6: WEB3 DEPLOYMENT & UPSELLS 🔥 */}
        {step === 6 && (
          <div className="p-5 md:p-12 animate-in slide-in-from-right-10 duration-500">
            <div className="text-center mb-8 md:mb-10">
              <h3 className={`text-2xl md:text-3xl font-black uppercase ${darkMode ? 'text-white' : 'text-black'}`}>Step 6: Final Web3 Injection</h3>
              <p className="text-zinc-500 text-[10px] md:text-xs mt-2 md:mt-3 uppercase tracking-wider">Configure security and deploy to {config.launchChain}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
              {/* Trust & Upsells (PinkSale Killer) */}
              <div className={`p-6 md:p-8 rounded-3xl md:rounded-[2rem] border ${darkMode ? 'bg-black/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <h4 className="text-[9px] md:text-[10px] font-black text-[#89CFF0] uppercase tracking-widest mb-4 md:mb-6">GainWave Security Suite</h4>
                
                <div className="space-y-3 md:space-y-4">
                  <div 
                    onClick={() => setKycRequested(!kycRequested)}
                    className={`p-3 md:p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${kycRequested ? 'bg-blue-500/10 border-blue-500' : (darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200')}`}
                  >
                    <div>
                      <div className={`text-[10px] md:text-xs font-black uppercase ${darkMode ? 'text-white' : 'text-black'}`}>👤 Request KYC</div>
                      <div className="text-[8px] md:text-[9px] text-zinc-500 uppercase mt-1">Dev verification badge (+{FEES[config.launchChain].kyc} {config.launchChain})</div>
                    </div>
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center text-[10px] md:text-xs ${kycRequested ? 'border-blue-500 bg-blue-500 text-white' : 'border-zinc-400'}`}>
                      {kycRequested && '✓'}
                    </div>
                  </div>

                  <div 
                    onClick={() => setAuditRequested(!auditRequested)}
                    className={`p-3 md:p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${auditRequested ? 'bg-yellow-500/10 border-yellow-500' : (darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200')}`}
                  >
                    <div>
                      <div className={`text-[10px] md:text-xs font-black uppercase ${darkMode ? 'text-white' : 'text-black'}`}>🛡️ Smart Contract Audit</div>
                      <div className="text-[8px] md:text-[9px] text-zinc-500 uppercase mt-1">Code review & badge (+{FEES[config.launchChain].audit} {config.launchChain})</div>
                    </div>
                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center text-[10px] md:text-xs ${auditRequested ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-zinc-400'}`}>
                      {auditRequested && '✓'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/5 flex justify-between">
                    <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase">Trust Score</span>
                    <span className={`text-[10px] md:text-[12px] font-black ${trustScore() > 70 ? 'text-green-500' : 'text-yellow-500'}`}>{trustScore()}%</span>
                </div>
              </div>

              {/* Plačilo in Gumb */}
              <div className={`p-6 md:p-8 rounded-3xl md:rounded-[2rem] border flex flex-col justify-between relative overflow-hidden ${darkMode ? 'bg-zinc-950/80 border-[#FF00FF]/30' : 'bg-white border-[#FF00FF]/30'}`}>
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-[#FF00FF]/10 blur-3xl rounded-full"></div>
                <div>
                  <h4 className="text-[9px] md:text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 md:mb-2 relative z-10">Total Architect Fee</h4>
                  <div className={`text-3xl md:text-4xl font-black font-mono tracking-tighter relative z-10 ${darkMode ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'text-black'}`}>
                    {/* Popravek seštevka z uporabo Number() za varnost */}
                    {(Number(FEES[config.launchChain].base) + (kycRequested ? Number(FEES[config.launchChain].kyc) : 0) + (auditRequested ? Number(FEES[config.launchChain].audit) : 0)).toFixed(2)} <span className="text-xs md:text-sm text-[#FF00FF]">{config.launchChain}</span>
                  </div>
                  <p className="text-[8px] md:text-[9px] text-zinc-500 uppercase font-bold mt-3 md:mt-4 leading-relaxed relative z-10">
                    Includes Smart Contract compilation, liquidity pool setup, AI Whitepaper hosting, Auto-Airdrop engine, and GainWave Network integration.
                  </p>
                </div>

                <div className="mt-6 md:mt-8 space-y-3 relative z-10">
                  {!walletAddress ? (
                    <button type="button" onClick={connectWallet} className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest ${darkMode ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}`}>
                      🔗 Connect Web3 Wallet
                    </button>
                  ) : (
                    <button type="button" onClick={handleDeploy} disabled={isLoading} className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all ${isLoading ? 'opacity-50 cursor-wait bg-zinc-800 text-white' : neonButtonGradient}`}>
                      {isLoading ? 'Confirming on Chain...' : `Pay & Deploy to ${config.launchChain}`}
                    </button>
                  )}
                  <button type="button" onClick={() => setStep(5)} disabled={isLoading} className="w-full text-[8px] md:text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-all py-2 md:py-3">
                    &larr; Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
