import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Uporabimo || '' za varen build na Vercelu
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

// Potrebujemo Supabase client za preverjanje referral povezav
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  try {
    // 🔥 DODANO: isSubscription in type iz frontenda
    const { amount, userAlias, userId, traderId, type, isSubscription } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Tvoja nova ID-ja iz Stripe Dashboarda (Za 50€ paket)
    const PRICE_ID_RECURRING = "price_1THnzr4ADujZOrnxErRWpsVu";
    const PRICE_ID_ONETIME = "price_1THo314ADujZOrnxa5rKd55E";

    // 🔥 PREVERIMO REFERRAL STATUS (A ima ta uporabnik botra?)
    const { data: profile } = await supabase
      .from('profiles')
      .select('referred_by_id')
      .eq('id', userId)
      .maybeSingle();

    const referrerId = profile?.referred_by_id || '';

    // 🔥 PAMETNO PREPOZNAVANJE TIPA PLAČILA 🔥
    // Zdaj preverjamo tudi type iz frontenda ali zneske
    const isProUpgrade = type === 'pro_upgrade' || (!traderId && (amount === 50 || amount === 100 || amount === 960));
    const isTraderSub = !!traderId;
    
    let lineItems: any[] = [];
    let paymentMode: 'payment' | 'subscription' = 'payment';
    let metaType = '';

    if (isProUpgrade) {
      // 1. SCENARIJ: NAKUP PRO NODE-a (Z uporabo tvojih novih Stripe produktov)
      lineItems = [
        {
          price: isSubscription ? PRICE_ID_RECURRING : PRICE_ID_ONETIME,
          quantity: 1,
        }
      ];
      paymentMode = isSubscription ? 'subscription' : 'payment';
      metaType = 'pro_upgrade';

    } else if (isTraderSub) {
      // 2. SCENARIJ: NAROČNINA NA DRUGEGA TRADERJA (Ustvarjeno sproti)
      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `VIP Subscription to Node`,
              description: `Monthly VIP access to signals and private hub.`,
            },
            unit_amount: amount * 100, // Znesek je v EUR
          },
          quantity: 1,
        }
      ];
      paymentMode = 'payment';
      metaType = 'subscription';

    } else {
      // 3. SCENARIJ: NAKUP GAINS KOVANCEV (Top-up) (Ustvarjeno sproti)
      lineItems = [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${amount} GAINS Coins`,
              description: `Terminal Top-up for Node: ${userAlias}`,
            },
            unit_amount: 10, // 0.10€ na en kovanec
          },
          quantity: amount,
        }
      ];
      paymentMode = 'payment';
      metaType = 'topup';
    }

    // Priprava Stripe seje
    const sessionConfig: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: paymentMode,
      // URL-ji, kamor uporabnika vrže po plačilu
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      metadata: {
        userId: userId,
        traderId: traderId || '', 
        amount: amount.toString(),
        type: metaType, 
        referrerId: referrerId 
      },
    };

    // 🔥 NUJNO ZA TRAJNIKE: Dodamo metadata še v subscription_data
    if (paymentMode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          userId: userId,
          type: metaType
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}