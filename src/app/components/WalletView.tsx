"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/lib/supabaseClient'; 
import { toast } from 'sonner'; 

export default function WalletView({ userData, darkMode, onPromote, setActiveChat, updateUserBalance, handleStripePurchase, onPanicKill }: any) {
  const [account, setAccount] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<string>("0.00");
  const canvasRef = useRef<HTMLCanvasElement>(null); 

  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({ amount: '', method: 'USDT', address: '' });

  const [customGains, setCustomGains] = useState<number>(100);
  const pricePerCoin = 0.10;
  const minEuro = 10;
  const minGains = minEuro / pricePerCoin;

  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false); 

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);

  // 🔥 NOVO: Stanja za rekrute
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);

  // 🔥 NOVO: State za Marketinški Hub (Ads Manager)
  const [boostCampaigns, setBoostCampaigns] = useState<any[]>([]);
  const [isLoadingBoosts, setIsLoadingBoosts] = useState(true);
  const [selectedStats, setSelectedStats] = useState<any | null>(null); // Za končno poročilo

  const MY_WALLET_ADDRESS = "0x2E8Cd535f9B2837ba1D9A37BA93ee40395b76484";
  const USDT_CONTRACT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
  const USDT_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const packages = [
    { name: 'Starter Pack', gains: 100, price: '10€', amount: 10, icon: '🌊' },
    { name: 'Pro Rider', gains: 550, price: '50€', amount: 50, icon: '🏄‍♂️' },
    { name: 'Whale Surge', gains: 1200, price: '100€', amount: 100, icon: '🐋' },
  ];

  const hasPaidPro = userData?.is_premium === true; 
  const hasPerformancePro = (userData?.win_rate || 0) >= 90; 
  const isPro = hasPaidPro || hasPerformancePro; 

  // 🔥 POPRAVLJENO: POTEGNEVA REKRUTE BREZ CREATED_AT STOLPCA (PREPREČI 400 ERROR) 🔥
  useEffect(() => {
    let isMounted = true;
    const fetchReferrals = async () => {
      if (!userData?.id) {
        if (isMounted) setIsLoadingReferrals(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('alias') 
          .eq('referred_by_id', userData.id);

        if (error) {
          console.error("Supabase Referral Error:", error);
        }

        if (!error && data && isMounted) {
          console.log(`Found ${data.length} recruits for ${userData.alias}`);
          setReferredUsers(data);
        }
      } catch (err) {
        console.error("Error fetching referrals", err);
      } finally {
        if (isMounted) setIsLoadingReferrals(false);
      }
    };
    fetchReferrals();
    return () => { isMounted = false; };
  }, [userData?.id]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!userData?.id) return;
      setIsLoadingTx(true);
      
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          buyer:profiles!transactions_buyer_id_fkey(alias, avatar_url),
          seller:profiles!transactions_seller_id_fkey(alias, avatar_url)
        `)
        .or(`buyer_id.eq.${userData.id},seller_id.eq.${userData.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setTransactions(data);
      }
      setIsLoadingTx(false);
    };

    fetchTransactions();
  }, [userData?.id]);

  // 🔥 NOVO: Fetchanje Marketinških Kampanj (Boosts)
  useEffect(() => {
    const fetchBoosts = async () => {
      if (!userData?.id) return;
      setIsLoadingBoosts(true);
      try {
        const { data, error } = await supabase
          .from('boosted_posts')
          .select('*')
          .eq('user_id', userData.id)
          .order('start_date', { ascending: false });

        if (!error && data) {
          setBoostCampaigns(data);
        }
      } catch (err) {
        console.error("Error fetching boosts:", err);
      } finally {
        setIsLoadingBoosts(false);
      }
    };
    fetchBoosts();
  }, [userData?.id]);

  const handleStripeProCheckout = async (isSub: boolean) => {
    if (!userData?.id) return;
    const loadingToast = toast.loading("Initializing secure Stripe gateway...");
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50, 
          userId: userData.id,
          type: 'pro_upgrade',
          isSubscription: isSub
        })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.dismiss(loadingToast);
        toast.error(data.error || "Failed to initiate checkout");
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Network error. Please try again.");
    }
  };

  // 🔥 NOVO: PREKLIC STRIPE NAROČNINE 🔥
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your PRO subscription? Your PRO status will remain active until the end of the paid period.')) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Canceling subscription via Stripe...");

    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userData.id })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Subscription successfully canceled. You will not be charged next month.', { id: toastId });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Error canceling: ' + (data.error || 'Unknown error'), { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Server communication error.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 NOVO: KUPITEV PRO NODE S KOVANCI (GAINS) 🔥
  const handleUpgradeWithGains = async (cost: number) => {
    // 🔥 POGLEDAMO OBA BALANCA: PRVO BONUS, POTEM BULLS 🔥
    const totalGains = (userData.gains_balance || 0) + (userData.bonus_balance || 0);

    if (totalGains < cost) {
      toast.error("Insufficient GAINS! Please acquire more first.");
      return;
    }

    if (!confirm(`Initialize PRO NODE protocol for ${cost} GAINS?`)) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Processing quantum transaction...");

    try {
      let remainingCost = cost;
      let newBonusBal = userData.bonus_balance || 0;
      let newBullsBal = userData.gains_balance || 0;

      // Najprej porabimo BONUS GAINS (ker so darilo in jih ne more izplačati)
      if (newBonusBal > 0) {
          if (newBonusBal >= remainingCost) {
              newBonusBal -= remainingCost;
              remainingCost = 0;
          } else {
              remainingCost -= newBonusBal;
              newBonusBal = 0;
          }
      }

      // Preostanek porabimo iz KUPLJENIH (bulls_balance)
      if (remainingCost > 0) {
          newBullsBal -= remainingCost;
      }

      // 1. Odštejemo balanc v tabeli user_balances
      const { error: balanceErr } = await supabase
        .from('user_balances')
        .update({ 
            bulls_balance: newBullsBal,
            bonus_balance: newBonusBal 
        })
        .eq('user_id', userData.id);

      if (balanceErr) throw balanceErr;

      // 2. Nastavimo PRO status in potek čez 30 dni v tabeli profiles
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); 

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true,
          pro_expires_at: expiryDate.toISOString()
        })
        .eq('id', userData.id);

      if (profileErr) throw profileErr;

      // 3. Transparentni Ledger zapis (Transaction History)
      await supabase.from('transactions').insert([{
          buyer_id: userData.id,
          seller_id: userData.id,
          amount: cost,
          item_type: 'PRO_UPGRADE',
          item_name: `30-Day PRO Node Access`
      }]);

      toast.success("👑 PRO NODE ACTIVATED! Welcome to the elite.", { id: toastId });
      
      // Hitri refresh za popolno sinhronizacijo RLS politik
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);

    } catch (err: any) {
      console.error("Pro Upgrade Error:", err);
      toast.error("Transaction failed. Contact support.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const connectWallet = async (e: any) => {
    if (e) e.preventDefault();

    if (typeof window !== 'undefined') {
      if ((window as any).solana && (window as any).solana.isPhantom) {
        try {
          const resp = await (window as any).solana.connect();
          setAccount(resp.publicKey.toString());
          toast.success("Phantom Wallet Connected! 👻");
          return;
        } catch (err) {
          console.error("Phantom Error:", err);
          toast.error("Phantom connection failed.");
        }
      } 
      else if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          const userAddress = accounts[0];
          setAccount(userAddress);
          toast.success("MetaMask Connected! 🦊");
        } catch (err) { 
          console.error("MetaMask Error:", err); 
          toast.error("MetaMask connection failed.");
        }
      } else {
        toast.error("Please install MetaMask or Phantom Wallet extension!");
      }
    }
  };

  const processAffiliateCommission = async (purchaseAmountUsd: number) => {
    if (!userData?.referred_by_id) return; 

    try {
        const { data: existingComm, error: checkErr } = await supabase
            .from('transactions')
            .select('id')
            .eq('buyer_id', userData.id)
            .eq('item_type', 'AFFILIATE_COM')
            .maybeSingle();

        if (checkErr) {
            console.error("Referral check error:", checkErr);
            return;
        }

        if (existingComm) {
            console.log("Affiliate bonus already paid for this user. Skipping.");
            return; 
        }

        const commissionAmount = purchaseAmountUsd * 0.10;
        if (commissionAmount <= 0) return;

        const { data: referrerWallet, error: fetchErr } = await supabase
            .from('user_balances')
            .select('earned_balance')
            .eq('user_id', userData.referred_by_id)
            .single();

        if (fetchErr) {
            console.error("Failed to fetch referrer wallet:", fetchErr);
            return;
        }

        const { error: updateErr } = await supabase
            .from('user_balances')
            .update({ earned_balance: (referrerWallet.earned_balance || 0) + commissionAmount })
            .eq('user_id', userData.referred_by_id);

        if (updateErr) {
            console.error("Failed to add commission:", updateErr);
            return;
        }

        await supabase.from('transactions').insert([{
            buyer_id: userData.id, 
            seller_id: userData.referred_by_id, 
            amount: commissionAmount,
            item_type: 'AFFILIATE_COM',
            item_name: `First Deposit Reward (Node: @${userData.alias})`
        }]);

        const { data: refProfile } = await supabase
            .from('profiles')
            .select('alias')
            .eq('id', userData.referred_by_id)
            .single();

        if (refProfile) {
            await supabase.from('messages').insert([{
                from_alias: 'SYSTEM',
                to_alias: refProfile.alias,
                text: `💰 NETWORK BONUS: Your referred Node @${userData.alias} has initialized their first deposit! A 10% commission ($${commissionAmount.toFixed(2)}) has been credited to your Rewards Vault.`,
                is_read: false
            }]);
        }

    } catch (err) {
        console.error("Affiliate processing error:", err);
    }
  };

  const handleBuy = async (pkg: any) => {
    if (!account) { alert("Please connect your wallet first!"); await connectWallet(null); return; }
    const proceed = window.confirm(`Send ${pkg.amount} USDT for ${pkg.gains} GAINS?`);
    if (proceed) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
        const amountInUnits = ethers.parseUnits(pkg.amount.toString(), 6);
        const tx = await usdtContract.transfer(MY_WALLET_ADDRESS, amountInUnits);
        await tx.wait();
        
        if (updateUserBalance) {
          await updateUserBalance(userData.id, pkg.gains);
          
          await supabase.from('transactions').insert([{
            buyer_id: userData.id,
            seller_id: userData.id, 
            amount: pkg.gains,
            item_type: 'DEPOSIT',
            item_name: `GAINS Acquisition (${pkg.amount} USDT)`
          }]);

          await processAffiliateCommission(pkg.amount);

          alert("Success! Your GAINS have been synchronized. 🚀");
          window.location.reload(); 
        }
      } catch (err: any) { alert("Transaction failed."); }
    }
  };

  const handleCustomStripePurchase = async () => {
      if (handleStripePurchase) {
          const purchaseValueFiat = customGains * pricePerCoin;
          await processAffiliateCommission(purchaseValueFiat);
          handleStripePurchase(customGains);
      }
  };

  const handleRequestPayout = () => { setShowWithdrawalModal(true); };

  const submitWithdrawalRequest = async () => {
    if (!withdrawalData.amount || !withdrawalData.address) {
      alert("Please fill in all fields.");
      return;
    }

    const requestedAmount = parseFloat(withdrawalData.amount);

    if (requestedAmount <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }

    if (userData.earned_balance < requestedAmount) {
       alert("Insufficient funds for withdrawal (Rewards balance too low).");
       return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('request_withdrawal', {
         p_user_id: userData.id,
         p_amount: requestedAmount,
         p_method: withdrawalData.method,
         p_address: withdrawalData.address
      });

      if (error) throw error;

      alert(`Withdrawal request for $${withdrawalData.amount} was successfully submitted. It will be processed in 24-48 hours.`);
      setShowWithdrawalModal(false);
      setWithdrawalData({ amount: '', method: 'USDT', address: '' });
      
    } catch (err: any) {
      console.error("Error saving:", err.message);
      if (err.message.includes('function "request_withdrawal" does not exist')) {
          console.warn("RPC function missing, executing fallback client transfer...");
          const { error: insertErr } = await supabase
            .from('withdrawals')
            .insert([
              { 
                user_id: userData.id, 
                amount: requestedAmount, 
                method: withdrawalData.method, 
                address: withdrawalData.address,
                status: 'pending'
              }
            ]);
            
          if(insertErr) {
             alert("An error occurred submitting the request. Please try again.");
             setIsSubmitting(false);
             return;
          }
          
          const { error: updateErr } = await supabase
            .from('user_balances')
            .update({ earned_balance: userData.earned_balance - requestedAmount })
            .eq('user_id', userData.id);

          if (!updateErr) {
             await supabase.from('transactions').insert([{
                buyer_id: userData.id,
                seller_id: userData.id, 
                amount: requestedAmount,
                item_type: 'WITHDRAWAL',
                item_name: `Vault Withdrawal (${withdrawalData.method})`
             }]);

             alert(`Withdrawal request for $${withdrawalData.amount} was successfully submitted. It will be processed in 24-48 hours.`);
             setShowWithdrawalModal(false);
             setWithdrawalData({ amount: '', method: 'USDT', address: '' });
          } else {
             alert("Error deducting funds. Please contact support.");
          }
      } else {
          alert("An error occurred submitting the request: " + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCode = userData?.referral_code || userData?.alias || 'NODE';
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/?ref=${activeCode}` 
    : `https://ticker-talker.vercel.app/?ref=${activeCode}`;

  const copyReferralLink = () => {
    const linkToCopy = referralLink;
    
    const triggerSuccessFeedback = () => {
      setIsCopied(true);
      try { toast.success("Affiliate link copied to clipboard! 🚀"); } catch(e) {}
      setTimeout(() => { setIsCopied(false); }, 2000);
    };

    const fallbackCopyTextToClipboard = (text: string) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) triggerSuccessFeedback();
        else alert("Link generated! Please copy manually: " + text);
      } catch (err) {
        console.error("Fallback copy failed", err);
        alert("Copy this link: " + text);
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(linkToCopy).then(() => {
        triggerSuccessFeedback();
      }).catch((err) => {
        console.warn("Clipboard API failed, using fallback...", err);
        fallbackCopyTextToClipboard(linkToCopy);
      });
    } else {
      fallbackCopyTextToClipboard(linkToCopy);
    }
  };

  const generateAndDownloadShareCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGeneratingCard(true);
    const toastId = toast.loading("Synthesizing your Elite Invitation Card...");

    const backgroundImg = new Image();
    backgroundImg.src = '/ref-card-bg-v1.png'; 
    backgroundImg.crossOrigin = "anonymous";

    backgroundImg.onload = () => {
      canvas.width = backgroundImg.width;
      canvas.height = backgroundImg.height;
      ctx.drawImage(backgroundImg, 0, 0);

      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(referralLink)}&color=ffffff&bgcolor=030712&qzone=2&format=png`;
      const qrImg = new Image();
      qrImg.src = qrApiUrl;
      qrImg.crossOrigin = "anonymous";

      qrImg.onload = () => {
        const centerX = canvas.width / 2;
        const qrSize = canvas.height * 0.25; 
        const posX_QR = centerX - (qrSize / 2); 
        const posY_QR = (canvas.height * 0.44) - (qrSize / 2); 
        
        ctx.drawImage(qrImg, posX_QR, posY_QR, qrSize, qrSize);

        const fontSize = Math.floor(canvas.height * 0.038); 
        ctx.font = `900 ${fontSize}px Inter, Arial, sans-serif`;
        ctx.fillStyle = '#FFFFFF'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; 
        
        const posX_Alias = canvas.width * 0.58; 
        const posY_Alias = canvas.height * 0.905; 
        
        ctx.fillText(`@${userData.alias}`, posX_Alias, posY_Alias);

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `GW-Invite-${userData.alias}.png`;
        link.href = dataUrl;
        link.click();

        toast.dismiss(toastId);
        toast.success("Premium Invitation Card Generated! 🚀");
        setIsGeneratingCard(false);
      };

      qrImg.onerror = () => {
          toast.dismiss(toastId);
          toast.error("QR Code Error.");
          setIsGeneratingCard(false);
      };
    };

    backgroundImg.onerror = () => {
      toast.dismiss(toastId);
      toast.error("Background Asset Missing.");
      setIsGeneratingCard(false);
    };
  };

  const activeBoosts = boostCampaigns.filter(c => c.is_active && new Date(c.end_date) > new Date());
  const completedBoosts = boostCampaigns.filter(c => !c.is_active || new Date(c.end_date) <= new Date());

  return (
    <div className="animate-in fade-in zoom-in-95 duration-700 space-y-6 relative">
      
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

      {/* HEADER - Cyber Node Status */}
      <div className={`flex flex-col md:flex-row justify-between items-center p-5 rounded-[2rem] border backdrop-blur-xl transition-all ${
        darkMode ? 'bg-[#050509]/60 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-white/50 border-zinc-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${account ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-zinc-600'}`} />
            {account && <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-50" />}
          </div>
          <h3 className={`text-[10px] font-black uppercase tracking-[0.4em] ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Terminal Node: {account ? <span className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">Online</span> : 'Discovery Mode'}
          </h3>
          {account && (
            <div className="px-3 py-1 rounded-full border border-green-500/30 bg-green-500/10 flex items-center gap-2">
              <span className="text-[7px] font-black text-green-500 uppercase tracking-widest">Connected Polygon</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button type="button" onClick={connectWallet} className={`px-5 py-2.5 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${account ? 'border-zinc-800/50 text-zinc-500 bg-black/20' : 'border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]'}`}>
            {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : '🦊 Link Web3 Wallet'}
          </button>
          <button type="button" onClick={onPromote} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-105 transition-all">
            🚀 Boost Protocol
          </button>
        </div>
      </div>

      {/* THE CORE VAULTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* GAINS VAULT */}
        <div className={`relative overflow-hidden p-8 rounded-[3rem] border transition-all duration-500 hover:-translate-y-1 ${
          darkMode ? 'bg-[#050509]/80 backdrop-blur-xl border-blue-500/30 shadow-[0_0_40px_rgba(59,130,246,0.1)_inset] hover:shadow-[0_0_60px_rgba(59,130,246,0.2)_inset]' : 'bg-white border-blue-200 shadow-xl'
        }`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />
          <span className="text-3xl mb-4 block drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">💎</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 text-blue-500/80">Local Core GAINS</h2>
          <div className={`text-5xl font-black font-mono tracking-tighter ${darkMode ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]' : 'text-blue-600'}`}>
            {userData.gains_balance || 0}
          </div>
        </div>

        {/* REWARDS VAULT */}
        <div className={`relative overflow-hidden p-8 rounded-[3rem] border transition-all duration-500 hover:-translate-y-1 ${
          darkMode ? 'bg-[#050509]/80 backdrop-blur-xl border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.1)_inset] hover:shadow-[0_0_60px_rgba(234,179,8,0.2)_inset]' : 'bg-white border-yellow-200 shadow-xl'
        }`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 blur-[50px] rounded-full pointer-events-none" />
          <span className="text-3xl mb-4 block drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">💰</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 text-yellow-500/80">Earned Rewards ($)</h2>
          <div className={`text-5xl font-black font-mono tracking-tighter ${darkMode ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]' : 'text-yellow-600'}`}>
            ${userData.earned_balance || "0.00"}
          </div>
          <button type="button" onClick={handleRequestPayout} className="mt-5 w-full py-3 rounded-xl text-[8px] font-black uppercase tracking-widest bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-50 hover:text-black transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]">
            Initialize Withdrawal
          </button>
        </div>

        {/* 🔥 NOVO: LOYALTY VAULT (BONUS GAINS) 🔥 */}
        <div className={`relative overflow-hidden p-8 rounded-[3rem] border transition-all duration-500 hover:-translate-y-1 ${
          darkMode ? 'bg-[#050509]/80 backdrop-blur-xl border-[#FF00FF]/30 shadow-[0_0_40px_rgba(255,0,255,0.1)_inset] hover:shadow-[0_0_60px_rgba(255,0,255,0.2)_inset]' : 'bg-white border-purple-300 shadow-xl'
        }`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF00FF]/10 blur-[50px] rounded-full pointer-events-none" />
          <span className="text-3xl mb-4 block drop-shadow-[0_0_15px_rgba(255,0,255,0.5)]">🌟</span>
          <div className="flex flex-col">
            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 text-[#FF00FF]/80">Loyalty Vault</h2>
            <div className={`text-5xl font-black font-mono tracking-tighter ${darkMode ? 'text-[#FF00FF] drop-shadow-[0_0_20px_rgba(255,0,255,0.6)]' : 'text-purple-600'}`}>
              {(userData.bonus_balance || 0).toFixed(1)}
            </div>
            <p className="text-[7px] font-bold uppercase tracking-widest mt-4 opacity-50 text-[#FF00FF]">Non-Withdrawable</p>
            <p className="text-[7px] font-bold uppercase tracking-widest mt-1 opacity-40 text-zinc-400">Use for PRO Upgrades & Boosts</p>
          </div>
        </div>

        {/* HFT NODE PROFIT VAULT */}
        <div className={`relative overflow-hidden p-8 rounded-[3rem] border transition-all duration-500 hover:-translate-y-1 ${
          darkMode ? 'bg-[#050509]/80 backdrop-blur-xl border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.1)_inset] hover:shadow-[0_0_60px_rgba(168,85,247,0.2)_inset]' : 'bg-white border-purple-200 shadow-xl'
        }`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />
          <span className="text-3xl mb-4 block drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">🤖</span>
          <h2 className="text-[9px] font-black uppercase tracking-[0.4em] mb-2 text-purple-500/80">HFT Node Profit</h2>
          <div className={`text-4xl font-black font-mono tracking-tighter ${
            parseFloat(userData.bot_profit || 0) < 0 
              ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]' 
              : (darkMode ? 'text-purple-400 drop-shadow-[0_0_20px_rgba(192,132,252,0.6)]' : 'text-purple-600')
          }`}>
            {parseFloat(userData.bot_profit || 0) > 0 ? '+' : ''}${parseFloat(userData.bot_profit || 0).toFixed(2)}
          </div>
          <p className="text-[7px] font-bold mt-5 opacity-40 uppercase tracking-[0.3em] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full inline-block animate-pulse" /> AI Sync Active
          </p>
        </div>

      </div>

      {/* 🔥 NOVO: ADS MANAGER / MARKETING HUB 🔥 */}
      <div className={`p-8 md:p-10 rounded-[3.5rem] border overflow-hidden transition-all ${darkMode ? 'bg-[#050509]/60 backdrop-blur-xl border-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.05)]' : 'bg-blue-50/50 border-blue-200 shadow-xl'}`}>
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <span className="text-3xl drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">📈</span>
               <div>
                  <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Ads Manager</h3>
                  <p className={`text-[9px] uppercase font-bold tracking-widest mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Monitor your signal promotions in real-time</p>
               </div>
            </div>
            <button type="button" onClick={onPromote} className="hidden md:block px-5 py-2 text-[9px] font-black uppercase tracking-widest border border-blue-500/50 text-blue-400 rounded-xl hover:bg-blue-500/10 transition-all">Launch New Ad</button>
         </div>

         {isLoadingBoosts ? (
            <div className="text-center py-10 opacity-50 text-[10px] uppercase font-bold text-blue-500 animate-pulse">Syncing Marketing Data...</div>
         ) : boostCampaigns.length === 0 ? (
            <div className={`text-center py-10 rounded-3xl border border-dashed ${darkMode ? 'border-zinc-800 bg-black/20 text-zinc-600' : 'border-zinc-300 bg-zinc-50 text-zinc-400'}`}>
               <span className="text-3xl block mb-2 opacity-30">🚀</span>
               <p className="text-[10px] uppercase font-black tracking-widest">No Active Campaigns</p>
               <p className="text-[8px] uppercase mt-1 opacity-70">Boost a post to dominate the network feed</p>
               <button type="button" onClick={onPromote} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)]">Start Promoting</button>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* ACTIVE CAMPAIGNS */}
               {activeBoosts.map((boost) => (
                  <div key={boost.id} className={`p-5 rounded-2xl border relative overflow-hidden ${darkMode ? 'bg-[#0a0a0f] border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)_inset]' : 'bg-white border-green-200'}`}>
                     <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-[40px] pointer-events-none" />
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                           <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded border border-green-500/20 flex items-center gap-1 w-max">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping inline-block"></span> Live Now
                           </span>
                           <h4 className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Boost ID: {boost.id.substring(0,6)}</h4>
                        </div>
                        <span className="text-2xl opacity-80">🔥</span>
                     </div>
                     <div className="space-y-2 relative z-10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500">
                           <span>Network Reach</span>
                           <span className={darkMode ? 'text-white' : 'text-black'}>{boost.total_impressions || 0} Views</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                           <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(((boost.total_impressions || 0) / 2000) * 100, 100)}%` }}></div>
                        </div>
                        <p className="text-[7px] text-zinc-600 font-mono text-right mt-1">Est. End: {new Date(boost.end_date).toLocaleTimeString()}</p>
                     </div>
                  </div>
               ))}

               {/* COMPLETED CAMPAIGNS */}
               {completedBoosts.map((boost) => (
                  <div key={boost.id} className={`p-5 rounded-2xl border transition-all opacity-80 hover:opacity-100 ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800/50 px-2 py-1 rounded">Completed</span>
                           <h4 className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Boost ID: {boost.id.substring(0,6)}</h4>
                        </div>
                        <span className="text-xl opacity-30 grayscale">📊</span>
                     </div>
                     <button 
                        type="button"
                        onClick={() => setSelectedStats(boost)}
                        className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-blue-500/50 hover:text-blue-400' : 'border-zinc-300 text-zinc-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'}`}
                     >
                        View Full Stats
                     </button>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* 🔥 UPRAVLJANJE AKTIVNE PRO VEZAVE (PRIKAŽE SE SAMO PRO UPORABNIKOM) 🔥 */}
      {isPro && (
        <div className={`p-8 md:p-10 rounded-[3.5rem] border relative overflow-hidden transition-all ${
          darkMode ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)]' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-xl'
        }`}>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-500/10 blur-[80px] pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]">👑</span>
                <div className="flex flex-col">
                  <h3 className={`text-xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-green-900'}`}>PRO Node Active</h3>
                  <span className="text-[9px] font-black uppercase text-green-500 tracking-widest">All premium features unlocked</span>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-red-600/10 text-red-500 border border-red-600/50 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Cancel Monthly Subscription'}
                </button>
                <p className={`text-[8px] mt-2 uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Status remains valid until the end of the billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 PRO UPGRADE SEKCIJA (PRIKAŽE SE SAMO NE-PRO UPORABNIKOM) 🔥 */}
      {!isPro && (
        <div className={`p-8 md:p-12 rounded-[3.5rem] border relative overflow-hidden transition-all ${
          darkMode ? 'bg-gradient-to-br from-indigo-900/40 to-blue-900/20 border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.15)]' : 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400 shadow-xl'
        }`}>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 blur-[80px] pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">👑</span>
                <div className="flex flex-col">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white drop-shadow-md">Upgrade to PRO Node</h3>
                  <span className="text-[9px] font-black uppercase text-yellow-400 tracking-widest animate-pulse">Activate premium features instantly</span>
                </div>
              </div>
              <ul className="space-y-2">
                <li className={`text-[10px] flex items-center gap-2 font-bold uppercase tracking-widest ${darkMode ? 'text-blue-200' : 'text-blue-100'}`}>
                  <span className="text-green-400 text-lg leading-none">✓</span> 24/7 AI Grid Bot Engine
                </li>
                <li className={`text-[10px] flex items-center gap-2 font-bold uppercase tracking-widest ${darkMode ? 'text-blue-200' : 'text-blue-100'}`}>
                  <span className="text-green-400 text-lg leading-none">✓</span> GainWave Indicator Access
                </li>
                <li className={`text-[10px] flex items-center gap-2 font-bold uppercase tracking-widest ${darkMode ? 'text-blue-200' : 'text-blue-100'}`}>
                  <span className="text-green-400 text-lg leading-none">✓</span> Premium VIP Broadcasts
                </li>
              </ul>
            </div>

            {/* GUMBI ZA UPGRADE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto shrink-0 md:min-w-[400px]">
              
              {/* NAKUP Z GAINS (ČE JIH IMA DOVOLJ) */}
              <button 
                type="button"
                onClick={() => handleUpgradeWithGains(500)} 
                disabled={isSubmitting}
                className="w-full sm:col-span-2 py-4 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-blue-300 active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
              >
                <span>30-Day Access (500 GAINS 💎)</span>
                <span className="text-[7px] text-blue-100 opacity-90">Instant Activation via Vault Balance</span>
              </button>

              {/* TRAJNIK GUMB STRIPE */}
              <button 
                type="button"
                onClick={() => handleStripeProCheckout(true)} 
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] border border-yellow-300 active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
              >
                <span>Auto-Renew (50€)</span>
                <span className="text-[7px] text-yellow-900 opacity-80">💳 Stripe Secure</span>
              </button>
              
              {/* ENKRATNO GUMB STRIPE */}
              <button 
                type="button"
                onClick={() => handleStripeProCheckout(false)} 
                disabled={isSubmitting}
                className="w-full py-4 bg-white text-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
              >
                <span>30-Days (50€)</span>
                <span className="text-[7px] text-zinc-500 opacity-80">💳 Stripe Secure</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRIPE ACQUISITION (Za GAINS) */}
      <div className={`p-8 md:p-12 rounded-[3.5rem] border relative overflow-hidden ${
        darkMode ? 'bg-[#050509]/80 backdrop-blur-xl border-white/5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]' : 'bg-zinc-50 border-zinc-200 shadow-xl'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none" />
        
        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💳</span>
                <h3 className={`text-xl font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-zinc-900'}`}>Token Acquisition</h3>
              </div>
              <p className="text-[9px] uppercase font-bold opacity-40 tracking-[0.2em] ml-10">Terminal Top-up via Stripe Security</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="number" 
                  min={minGains} 
                  value={customGains} 
                  onChange={(e) => setCustomGains(parseInt(e.target.value) || 0)} 
                  className={`w-full p-5 rounded-2xl border-2 text-2xl font-black font-mono outline-none transition-all ${
                    darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-600'
                  } ${customGains < minGains ? 'border-red-500/50' : ''}`}
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-zinc-500 tracking-[0.2em] text-xs uppercase">GAINS</span>
              </div>
              
              <button 
                type="button"
                onClick={handleCustomStripePurchase} 
                disabled={customGains < minGains}
                className="w-full py-5 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-30 disabled:hover:translate-y-0"
              >
                Buy Custom GAINS Amount
              </button>
            </div>
          </div>

          <div className="space-y-6 flex flex-col items-center md:items-end">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30">Global Payment Standards</p>
            <div className="flex gap-6 grayscale opacity-30 hover:opacity-80 transition-opacity">
              {/* 🔥 POPRAVEK: ZANESLJIVI CDN LOGOTIPI 🔥 */}
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" className="h-3" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" className="h-5" alt="Mastercard" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Apple_Pay_logo.svg/200px-Apple_Pay_logo.svg.png" className="h-4" alt="Apple Pay" />
            </div>
            <div className={`p-6 rounded-3xl border text-right max-w-xs ${darkMode ? 'bg-blue-950/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
              <p className="text-[9px] font-bold uppercase opacity-60 leading-relaxed tracking-widest">
                Tokens are issued at a rate of <span className="text-blue-400 font-black drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]">0.10€ per GAIN</span>. Acquisition is final and processed instantly over secure protocol.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* REFERRAL NETWORK SEKCIJA */}
      <div className={`p-8 md:p-10 rounded-[3.5rem] border overflow-hidden relative transition-all ${
        darkMode ? 'bg-[#050509]/60 backdrop-blur-xl border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.05)]' : 'bg-white border-yellow-200 shadow-xl'
      }`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-yellow-500/10 blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">🤝</div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  Network Affiliate Program
                </h3>
                <p className={`text-[9px] uppercase font-bold tracking-widest mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Invite nodes and earn <span className="text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]">10% GAINS</span> from their purchases.
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2 block ml-2">Your Unique Node Link</label>
              
              <div className={`p-2 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${darkMode ? 'bg-black/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                
                <div className={`flex-1 px-2 sm:px-4 py-3 font-mono text-[8px] min-[380px]:text-[9px] sm:text-[10px] md:text-[11px] break-all whitespace-normal leading-relaxed text-center sm:text-left ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {referralLink}
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <button 
                    type="button"
                    onClick={copyReferralLink}
                    className={`flex-1 sm:flex-none px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      isCopied 
                        ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.6)] scale-[0.98]' 
                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {isCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button 
                    type="button"
                    onClick={generateAndDownloadShareCard}
                    disabled={isGeneratingCard}
                    className={`flex-1 sm:flex-none px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      darkMode ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'bg-yellow-500 text-black'
                    } hover:scale-105 active:scale-95 disabled:opacity-50`}
                  >
                    {isGeneratingCard ? 'Generating...' : '🚀 Get Share Card'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto shrink-0">
             <div className={`p-5 rounded-3xl border text-center ${darkMode ? 'bg-[#0a0a0f] border-zinc-800/50' : 'bg-white border-zinc-100'}`}>
                <span className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Commission</span>
                <span className="text-xl font-black text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">10%</span>
             </div>
             <div className={`p-5 rounded-3xl border text-center ${darkMode ? 'bg-[#0a0a0f] border-zinc-800/50' : 'bg-white border-zinc-100'}`}>
                <span className="block text-[8px] font-black uppercase tracking-widest opacity-40 mb-2">Active Code</span>
                <span className="text-xl font-black text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{activeCode}</span>
             </div>
          </div>
        </div>

        {/* 🔥 TUKAJ VSTAVIMO SEZNAM REKRUTOV 🔥 */}
        <div className="mt-8 border-t border-zinc-800/50 pt-6 relative z-10">
          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Your Recruited Nodes ({referredUsers.length})
          </h4>
          
          {isLoadingReferrals ? (
             <div className="text-center py-6 text-[10px] uppercase font-bold text-zinc-500 animate-pulse">Scanning Network...</div>
          ) : referredUsers.length === 0 ? (
             <div className={`text-center py-8 rounded-2xl border border-dashed ${darkMode ? 'border-zinc-800 bg-black/20 text-zinc-600' : 'border-zinc-300 bg-zinc-50 text-zinc-400'}`}>
               <span className="text-2xl block mb-2 opacity-50">🕸️</span>
               <p className="text-[10px] uppercase font-black tracking-widest">Your network is empty</p>
               <p className="text-[8px] uppercase mt-1">Share your link to start earning</p>
             </div>
          ) : (
             <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
               {referredUsers.map((refUser, index) => (
                 <div key={index} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                   <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-600'}`}>
                       {refUser.alias ? refUser.alias.charAt(0).toUpperCase() : '?'}
                     </div>
                     <div className="flex flex-col">
                       <span className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? 'text-white' : 'text-black'}`}>
                         @{refUser.alias}
                       </span>
                       <span className="text-[8px] font-bold text-zinc-500 uppercase">
                         Node Active
                       </span>
                     </div>
                   </div>
                   <div className="text-right flex flex-col">
                     <span className="text-[9px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded">
                       Active
                     </span>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>

      </div>

      {/* 🔥 TRANSACTION HISTORY (LEDGER) 🔥 */}
      <div className={`p-8 md:p-10 rounded-[3.5rem] border overflow-hidden transition-all ${
        darkMode ? 'bg-[#050509]/60 backdrop-blur-xl border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'bg-white border-zinc-200 shadow-xl'
      }`}>
         <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">📜</span>
            <div>
               <h3 className={`text-sm font-black uppercase tracking-[0.2em] ${darkMode ? 'text-white' : 'text-black'}`}>
                 Transaction History
               </h3>
               <p className={`text-[9px] uppercase font-bold tracking-widest mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                 Secure ledger of all incoming and outgoing terminal transfers
               </p>
            </div>
         </div>

         {isLoadingTx ? (
            <div className="flex justify-center items-center py-10 opacity-50">
               <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
         ) : transactions.length === 0 ? (
            <div className="text-center py-10 opacity-30 border border-dashed rounded-3xl border-zinc-500/50">
               <p className="text-[10px] font-black uppercase tracking-widest mb-1">No Transactions Found</p>
               <p className="text-[8px] font-mono">Your ledger is currently empty.</p>
            </div>
         ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
               {transactions.map((tx: any) => {
                  const isIncoming = tx.seller_id === userData.id || tx.item_type === 'AFFILIATE_COM';
                  const isOutgoing = tx.buyer_id === userData.id && tx.item_type !== 'AFFILIATE_COM';

                  let otherPartyAlias = 'System Protocol';
                  if (tx.item_type === 'AFFILIATE_COM') {
                      otherPartyAlias = `New Node: @${tx.buyer?.alias || 'Unknown'}`;
                  } else {
                      otherPartyAlias = isIncoming ? `@${tx.buyer?.alias || 'System'}` : `@${tx.seller?.alias || 'System'}`;
                  }
                  
                  return (
                     <div key={tx.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01] ${
                        darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'
                     }`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                              isOutgoing ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                           }`}>
                              {isOutgoing ? '📤' : '📥'}
                           </div>
                           <div className="flex flex-col">
                              <span className={`text-[11px] font-black uppercase tracking-wider ${darkMode ? 'text-white' : 'text-black'}`}>
                                 {tx.item_name || tx.item_type}
                                 {tx.item_type === 'AFFILIATE_COM' && <span className="text-yellow-500 ml-2">🤝</span>}
                              </span>
                              <span className="text-[9px] font-bold text-zinc-500 mt-0.5 flex items-center gap-1.5">
                                 {tx.item_type === 'AFFILIATE_COM' ? 'Bonus from:' : (isIncoming ? 'From:' : 'To:')} 
                                 <span className={darkMode ? 'text-zinc-300' : 'text-zinc-700'}>
                                    {otherPartyAlias}
                                 </span>
                                 • {new Date(tx.created_at).toLocaleDateString()}
                              </span>
                           </div>
                        </div>
                        <div className={`text-sm font-black font-mono ${
                           isOutgoing ? 'text-red-500' : 'text-green-500'
                        }`}>
                           {isOutgoing ? '-' : '+'}{tx.amount} <span className="text-[9px] text-zinc-500">{tx.item_type === 'AFFILIATE_COM' ? '$' : 'GAINS'}</span>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </div>

      {/* QUICK ACQUISITION PACKS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <button type="button" key={pkg.name} onClick={() => handleBuy(pkg)} className={`p-8 rounded-[3rem] border group transition-all duration-500 hover:-translate-y-2 text-left relative overflow-hidden ${
            darkMode ? 'bg-[#050509]/60 backdrop-blur-xl border-zinc-800 hover:border-blue-500/50 hover:shadow-[0_15px_40px_rgba(59,130,246,0.15)]' : 'bg-white border-zinc-200 shadow-sm hover:shadow-xl'
          }`}>
            <span className="text-3xl mb-4 block group-hover:scale-125 group-hover:-rotate-6 transition-transform duration-500">{pkg.icon}</span>
            <div className={`text-2xl font-black mb-1 transition-colors duration-500 ${darkMode ? 'group-hover:text-blue-400' : 'group-hover:text-blue-600'}`}>{pkg.gains} GAINS</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">{pkg.name} // {pkg.amount} USDT</div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        ))}
      </div>

      {/* EMERGENCY KILL SWITCH */}
      <div className={`p-8 md:p-10 rounded-[3.5rem] border-2 border-dashed relative overflow-hidden transition-all ${
          darkMode ? 'bg-[#1a0505]/60 backdrop-blur-xl border-red-500/40 shadow-[0_0_50px_rgba(220,38,38,0.15)_inset]' : 'bg-red-50 border-red-200 shadow-xl'
      }`}>
          <div className="absolute top-1/2 left-0 w-full h-full bg-red-500/5 blur-[80px] pointer-events-none -translate-y-1/2" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.8)] shrink-0 border-4 border-red-950">
                      <span className="text-white text-3xl">⚠️</span>
                  </div>
                  <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">Emergency Node Kill Switch</h3>
                      <p className={`text-[9px] uppercase font-bold mt-2 leading-relaxed max-w-md tracking-widest ${darkMode ? 'text-red-200/60' : 'text-zinc-600'}`}>
                          Critical protocol: Immediately force-closes all active market positions across connected exchanges and terminates all live signals. Use only in extreme market volatility.
                      </p>
                  </div>
              </div>
              <button type="button" onClick={() => onPanicKill && onPanicKill()} className="w-full md:w-auto px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(220,38,38,0.6)] active:scale-[0.98] transition-all shrink-0">
                  Execute Protocol
              </button>
          </div>
      </div>

      {/* WITHDRAWAL MODAL OVERLAY */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className={`w-full max-w-md p-10 rounded-[3.5rem] border relative overflow-hidden ${darkMode ? 'bg-[#050509] border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.1)]' : 'bg-white border-zinc-200 shadow-2xl'} animate-in zoom-in-95`}>
            
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 blur-[60px] pointer-events-none" />

            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">Vault Withdrawal</h3>
              <button type="button" onClick={() => setShowWithdrawalModal(false)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>

            <div className={`p-4 rounded-2xl mb-8 border relative z-10 ${darkMode ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-yellow-400 bg-yellow-50'}`}>
              <p className="text-[9px] text-yellow-500 font-black uppercase tracking-widest leading-relaxed">
                Notice: All withdrawal requests are processed within 24 to 48 hours after institutional security verification.
              </p>
            </div>

            <div className="space-y-5 relative z-10">
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block mb-2 ml-2">Amount ($)</label>
                <input type="number" value={withdrawalData.amount} onChange={(e) => setWithdrawalData({...withdrawalData, amount: e.target.value})} placeholder="0.00" className={`w-full p-5 rounded-2xl border-2 font-black font-mono outline-none transition-all ${darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-yellow-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-yellow-600'}`} />
              </div>
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block mb-2 ml-2">Routing Protocol</label>
                <select value={withdrawalData.method} onChange={(e) => setWithdrawalData({...withdrawalData, method: e.target.value})} className={`w-full p-5 rounded-2xl border-2 font-black uppercase tracking-widest outline-none transition-all ${darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-yellow-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-yellow-600'}`}>
                  <option value="USDT">USDT (Polygon)</option>
                  <option value="SEPA">Bank Transfer (SEPA)</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-500 block mb-2 ml-2">Destination Vector (Address/IBAN)</label>
                <textarea value={withdrawalData.address} onChange={(e) => setWithdrawalData({...withdrawalData, address: e.target.value})} placeholder="Enter destination..." className={`w-full p-5 rounded-2xl border-2 font-black font-mono outline-none transition-all h-32 resize-none ${darkMode ? 'bg-black/50 border-zinc-800 text-white focus:border-yellow-500' : 'bg-zinc-50 border-zinc-200 text-black focus:border-yellow-600'}`} />
              </div>
              <button type="button" onClick={submitWithdrawalRequest} disabled={isSubmitting} className="w-full mt-4 py-6 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-2xl hover:scale-[1.02] shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all disabled:opacity-50 disabled:hover:scale-100">
                {isSubmitting ? 'Verifying Protocol...' : 'Finalize Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NOVO: FULL STATS MODAL OVERLAY 🔥 */}
      {selectedStats && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className={`w-full max-w-md p-10 rounded-[3.5rem] border relative overflow-hidden ${darkMode ? 'bg-[#050509] border-blue-500/30 shadow-[0_0_80px_rgba(59,130,246,0.15)]' : 'bg-white border-zinc-200 shadow-2xl'} animate-in zoom-in-95`}>
            
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 blur-[80px] pointer-events-none" />

            <div className="flex justify-between items-center mb-8 relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">Final Report</h3>
              <button type="button" onClick={() => setSelectedStats(null)} className="text-zinc-500 hover:text-white text-xl transition-colors">✕</button>
            </div>

            <div className="space-y-6 relative z-10">
               {/* REACH STATS */}
               <div className={`p-6 rounded-3xl border text-center ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2">Total Network Reach</span>
                  <div className={`text-4xl font-black font-mono ${darkMode ? 'text-white' : 'text-black'}`}>
                     {(selectedStats.total_impressions || 0).toLocaleString()} <span className="text-sm text-zinc-500">👀</span>
                  </div>
               </div>

               {/* ENGAGEMENT SPLIT */}
               <div className="grid grid-cols-2 gap-4">
                  <div className={`p-5 rounded-3xl border text-center ${darkMode ? 'bg-blue-900/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                     <span className="block text-[8px] font-black uppercase tracking-widest text-blue-500/80 mb-2">Profile Clicks</span>
                     <div className="text-2xl font-black text-blue-500">{selectedStats.total_clicks || 0}</div>
                  </div>
                  <div className={`p-5 rounded-3xl border text-center ${darkMode ? 'bg-purple-900/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                     <span className="block text-[8px] font-black uppercase tracking-widest text-purple-500/80 mb-2">Est. Conversion</span>
                     <div className="text-2xl font-black text-purple-500">
                        {(( (selectedStats.total_clicks || 0) / Math.max(1, selectedStats.total_impressions || 1) ) * 100).toFixed(1)}%
                     </div>
                  </div>
               </div>

               <div className="pt-4 border-t border-zinc-800/50">
                  <p className="text-[9px] font-bold text-center text-zinc-500 uppercase tracking-widest">
                     Campaign ended on {new Date(selectedStats.end_date).toLocaleDateString()}
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
