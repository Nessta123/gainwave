import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    console.error("❌ Configuration missing: STRIPE_WEBHOOK_SECRET ali STRIPE_SECRET_KEY manjka.");
    return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // --- 1. USPEŠNO PLAČILO (Prvič ali ponovitev trajnika) ---
  if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {
    const session = event.data.object as any;
    
    // Pridobimo userId - bodisi iz metadata seje, bodisi iz podrobnosti naročnine
    let userId = session.metadata?.userId || session.subscription_details?.metadata?.userId;
    let type = session.metadata?.type;
    const referrerId = session.metadata?.referrerId; 

    // Če je to avtomatska ponovitev (invoice), Stripe morda ne pošlje metadata, zato poiščemo po bazi
    if (event.type === 'invoice.payment_succeeded' && !userId) {
       const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', session.subscription)
          .single();
       if (profile) {
          userId = profile.id;
          type = 'pro_upgrade'; // Sklepamo, da gre za PRO, ker se obnavlja naročnina
       }
    }
    
    if (!userId) {
        console.error("❌ No userId in metadata ali v bazi naročnin!");
        return NextResponse.json({ error: "No userId" }, { status: 400 });
    }

    // --- OPCIJA A: NAKUP KOVANCEV (Top-up) ---
    if (type === 'topup' && event.type === 'checkout.session.completed') {
      const amountGains = parseInt(session.metadata?.amount || "0");
      
      if (amountGains > 0) {
        const { data: wallet } = await supabase.from('user_balances').select('bulls_balance').eq('user_id', userId).maybeSingle();
        const newBalance = (wallet?.bulls_balance || 0) + amountGains;

        const { error: upsertError } = await supabase.from('user_balances').upsert({ 
              user_id: userId, bulls_balance: newBalance, updated_at: new Date() 
        }, { onConflict: 'user_id' });

        if (upsertError) console.error("❌ Napaka pri upsert-u denarnice:", upsertError);

        // Zapis v tvojo tabelo 'transactions'
        await supabase.from('transactions').insert({
          buyer_id: userId,
          seller_id: null,
          amount: amountGains,
          item_type: 'deposit',
          item_name: 'Stripe Top-up (Gains)'
        });

        // 🔥 REFERRAL LOGIKA 🔥
        if (referrerId && referrerId !== "") {
          const bonusGains = Math.floor(amountGains * 0.10);
          if (bonusGains > 0) {
            const { data: refWallet } = await supabase.from('user_balances').select('bulls_balance').eq('user_id', referrerId).maybeSingle();
            const newRefBalance = (refWallet?.bulls_balance || 0) + bonusGains;

            await supabase.from('user_balances').upsert({ 
                  user_id: referrerId, bulls_balance: newRefBalance, updated_at: new Date() 
            }, { onConflict: 'user_id' });

            await supabase.from('referral_rewards').insert({ affiliate_id: referrerId, new_user_id: userId, amount_gains: bonusGains, is_paid: true });
            
            await supabase.from('transactions').insert({
              buyer_id: referrerId, seller_id: userId, amount: bonusGains,
              item_type: 'referral_bonus', item_name: 'Referral Bonus (10%)'
            });
            console.log(`🎊 Referral Bonus uspel! ${referrerId} prejel +${bonusGains} Gains`);
          }
        }
        console.log(`✅ Top-up uspešen za ${userId}: +${amountGains} Gains`);
      }
    }

    // --- OPCIJA B: VIP NAROČNINA NA TRADERJA ---
    if (type === 'subscription' && event.type === 'checkout.session.completed') {
      const traderId = session.metadata?.traderId;
      if (traderId) {
        const { error: subError } = await supabase.from('subscriptions').insert([{ 
            user_id: userId, trader_id: traderId, status: 'active',
            created_at: new Date(), expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }]);

        if (!subError) {
          await supabase.from('transactions').insert({
            buyer_id: userId, seller_id: traderId, amount: session.amount_total ? session.amount_total / 100 : 0,
            item_type: 'subscription_payment', item_name: 'VIP Subscription to Trader'
          });
          console.log(`✅ VIP Naročnina aktivirana: Uporabnik ${userId} -> Trader ${traderId}`);
        }
      }
    }

    // --- OPCIJA C: NAKUP GAINWAVE PRO NODE-a (Trajnik ali 1 mesec) 🔥 ---
    if (type === 'pro_upgrade') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 32); // Dodamo 32 dni (30 dni + 2 dni rezerve)

      const { error: proError } = await supabase
        .from('profiles')
        .update({ 
          is_premium: true, 
          premium_expires_at: expiresAt.toISOString(),           // 🔴 Shrani kdaj poteče
          stripe_subscription_id: session.subscription || null,  // 🔴 Shrani ID trajnika (če je izbran trajnik)
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);

      if (proError) {
        console.error("❌ PRO Upgrade napaka:", proError.message);
      } else if (event.type === 'checkout.session.completed') {
        // Zabeležimo transakcijo samo pri prvem nakupu, ne pri vsaki ponovitvi trajnika
        await supabase.from('transactions').insert({
          buyer_id: userId,
          seller_id: null,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          item_type: 'pro_upgrade_payment',
          item_name: 'GainWave PRO Node Subscription'
        });
        console.log(`👑 PRO Status uspešno aktiviran/podaljšan za: ${userId} do ${expiresAt.toISOString()}`);
      }
    }
  }

  // --- 2. PREKLIC ALI NEUSPELO PLAČILO (Trajnik ustavljen) ---
  if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    // Tukaj ne gledamo metadata, ker pri teh dogodkih niso vedno prisotni. 
    // Gledamo samo po Subscription ID-ju, ki sva ga prejšnjič shranila v bazo.
    const subscriptionId = (event.data.object as any).subscription || (event.data.object as any).id;
    
    if (subscriptionId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ 
            is_premium: false, 
            premium_expires_at: new Date().toISOString() // Poteče takoj
          })
          .eq('id', profile.id);
        
        console.log(`❌ PRO Status ugasnjen za uporabnika zaradi preklica: ${profile.id}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}