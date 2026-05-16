import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
// 🔥 DODAN IMPORT ZA TVOJ DISPATCHER 🔥
import { dispatchNotification } from '../../components/notification-dispatcher';

export const dynamic = 'force-dynamic'; // NUJNO: Prepreči Next.js cache

// Uporabimo Service Role Key za bypass RLS politik
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// Pomožna funkcija za preverjanje, ali je par kripto
const isCryptoPair = (pair: string) => {
  if (!pair) return false;
  const upperPair = pair.toUpperCase();
  
  const nonCryptoPrefixes = [
    'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD', 'CHF', 
    'XAU', 'GOLD', 'XAG', 'SILVER', 'WTI',           
    'US30', 'NAS100', 'SPX500', 'GER40', 'UK100',    
    'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'GOOGL', 'META', 'NFLX', 'AMD'
  ];
  
  if (nonCryptoPrefixes.some(prefix => upperPair.startsWith(prefix))) {
    return false;
  }
  return true;
};

// Pretvorba para iz formata "BTC/USD" v Binance format "BTCUSDT"
const toBinanceSymbol = (pair: string) => {
  return pair.replace('/', '').replace('USD', 'USDT').toUpperCase();
};

export async function GET() {
  try {
    // 1. Pridobimo VSE signale, ki so open, pending ali waiting
    // 🔥 FIX: Odstranjen profiles(alias), da preprečimo 500 Error v Supabase
    const { data: activeSignals, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .in('signal_status', ['open', 'pending', 'waiting', 'waiting_for_entry']);

    if (fetchError) throw fetchError;
    if (!activeSignals || activeSignals.length === 0) {
      return NextResponse.json({ message: "No active signals to judge." });
    }

    // --- TAKOJŠNJA BLOKADA ZA FOREX / XAU ---
    const nonCryptoSignals = activeSignals.filter(signal => !isCryptoPair(signal.pair));
    
    for (const signal of nonCryptoSignals) {
      await supabase.from('posts').update({ signal_status: 'visual_only' }).eq('id', signal.id);
      await supabase.from('post_comments').insert({
          post_id: signal.id,
          author_alias: "SYSTEM",
          text: "Analysis posted! ✅ Automatic result verification is currently exclusive to Crypto. Automated tracking for XAU and Forex pairs is coming soon with our MT5 integration."
        });
    }

    // --- CRYPTO LOGIKA ---
    const cryptoSignals = activeSignals.filter(signal => isCryptoPair(signal.pair));

    if (cryptoSignals.length === 0) {
      return NextResponse.json({ message: "No active CRYPTO signals.", forex_processed: nonCryptoSignals.length });
    }

    // Pridobimo VSE trenutne cene iz Binance z enim optimiziranim klicem
    const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price');
    const priceData = await priceRes.json();
    
    const priceMap: Record<string, number> = {};
    priceData.forEach((item: any) => {
      priceMap[item.symbol] = parseFloat(item.price);
    });

    // Procesiramo vsak kripto signal glede na status (Pending vs Open)
    for (const signal of cryptoSignals) {
      if (!signal.pair) continue;

      const binanceSymbol = toBinanceSymbol(signal.pair);
      const currentPrice = priceMap[binanceSymbol];

      if (!currentPrice) continue;

      const entry = parseFloat(signal.entry_price || '0');
      const tp = parseFloat(signal.tp_price || '0');
      const sl = parseFloat(signal.sl_price || '0');
      const direction = signal.direction?.toUpperCase();
      
      const createdAt = new Date(signal.created_at).getTime();
      const now = Date.now();
      const isPending = ['pending', 'waiting', 'waiting_for_entry'].includes(signal.signal_status);
      const isOpen = signal.signal_status === 'open';

      // Priprava podatkov za obvestila (brez profiles join-a)
      const authorAlias = signal.author_alias || signal.author_alias_db || 'Trader';
      const userId = signal.user_id;

      // 🔥 FIX: Varno pošiljanje obvestil, da Sodnik ne crkne, če push pade
      const safeDispatch = async (title: string, content: string) => {
        try {
          await dispatchNotification({ type: 'system_judge_alert', senderId: userId, senderAlias: authorAlias, title, content });
        } catch (e) { console.error("Push Dispatch failed silently:", e); }
      };

      // --- A) THE CLEANER: Auto-expire po 48h ---
      if (isPending && (now - createdAt) > 172800000) { 
         await supabase.from('posts').update({ signal_status: 'expired' }).eq('id', signal.id);
         await supabase.from('post_comments').insert({ 
           post_id: signal.id, 
           author_alias: "SYSTEM", 
           text: "⚠️ Signal Expired: Entry zone was not reached within 48 hours. Capital preserved." 
         });
         
         // 📱 POŠLJI OBVESTILO
         await safeDispatch("⚠️ Signal Expired", `${authorAlias} signal for ${signal.pair} did not reach entry. Capital preserved.`);
         continue; 
      }

      // --- B) ACTIVATION: Pending -> Open ---
      if (isPending && entry > 0) {
         const isEntryHit = (direction === 'LONG' || direction === 'BUY' ? currentPrice <= entry : currentPrice >= entry);
         if (isEntryHit) {
             await supabase.from('posts').update({ signal_status: 'open', activated_at: new Date().toISOString() }).eq('id', signal.id);
             await supabase.from('post_comments').insert({ 
               post_id: signal.id, 
               author_alias: "SYSTEM", 
               text: `🚀 Signal Activated! Price reached entry zone at ${currentPrice}. Watch your capital.` 
             });

             // 📱 POŠLJI OBVESTILO
             await safeDispatch("🚀 Signal Activated!", `${authorAlias} signal for ${signal.pair} hit entry. Trade is LIVE.`);
         }
         continue; // Preskočimo TP/SL preverjanje v tem ciklu, da se trade najprej uradno odpre
      }

      // --- C) OPEN SIGNALS: Profit Guardian & Win/Loss Judge ---
      if (isOpen && entry > 0 && tp > 0 && sl > 0) {
          
          // 1. Profit Guardian (+2% Alert)
          const pnl = direction === 'LONG' || direction === 'BUY' 
            ? ((currentPrice - entry) / entry) * 100 
            : ((entry - currentPrice) / entry) * 100;
            
          if (pnl >= 2.0 && !signal.notified_profit) {
              await supabase.from('post_comments').insert({ 
                  post_id: signal.id, 
                  author_alias: "SYSTEM", 
                  text: `⭐ Profit Protection: Signal is in +2% profit! Consider moving Stop Loss to Entry (BE) to secure your capital.` 
              });
              // Označimo, da je bilo opozorilo poslano
              await supabase.from('posts').update({ notified_profit: true }).eq('id', signal.id);

              // 📱 POŠLJI OBVESTILO
              await safeDispatch("⭐ Profit Protected", `${authorAlias} signal is in +2% profit! Consider BE.`);
          }

          // 2. Win / Loss Judge
          let finalStatus = 'open';
          if (direction === 'LONG' || direction === 'BUY' || direction === 'BULLISH') {
            if (currentPrice >= tp) finalStatus = 'win';
            else if (currentPrice <= sl) finalStatus = 'loss';
          } else if (direction === 'SHORT' || direction === 'SELL' || direction === 'BEARISH') {
            if (currentPrice <= tp) finalStatus = 'win';
            else if (currentPrice >= sl) finalStatus = 'loss';
          }

          if (finalStatus !== 'open') {
            await supabase.from('posts').update({ 
              signal_status: finalStatus, 
              exit_price: currentPrice, 
              closed_at: new Date().toISOString() 
            }).eq('id', signal.id);
            
            const emoji = finalStatus === 'win' ? "💰" : "🛑";
            const message = finalStatus === 'win' 
              ? `${emoji} Signal closed as WIN at ${currentPrice}. Capital grown!` 
              : `${emoji} Signal closed as LOSS at ${currentPrice}. Risk management executed.`;
              
            await supabase.from('post_comments').insert({ post_id: signal.id, author_alias: "SYSTEM", text: message });

            // 📱 POŠLJI OBVESTILO
            const pushTitle = finalStatus === 'win' ? "💰 Target Smashed!" : "🛑 Stop Loss Hit";
            const pushContent = finalStatus === 'win' ? `${authorAlias} verified a WIN on ${signal.pair}!` : `${authorAlias} signal on ${signal.pair} closed.`;
            
            await safeDispatch(pushTitle, pushContent);
          }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Ultra Judge execution complete.",
      crypto_processed: cryptoSignals.length,
      forex_bypassed: nonCryptoSignals.length
    });

  } catch (err: any) {
    console.error("Judge Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
