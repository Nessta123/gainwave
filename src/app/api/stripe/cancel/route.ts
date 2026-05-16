import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializacija Stripe-a
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

// Inicializacija baze
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // 1. Poiščemo uporabnika v bazi, da dobimo njegov Stripe Customer ID
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !profile?.stripe_customer_id) {
      console.error('Customer lookup error:', error);
      return NextResponse.json({ error: 'No active Stripe customer found.' }, { status: 404 });
    }

    // 2. Poiščemo njegove aktivne naročnine v Stripe-u
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No active subscription found to cancel.' }, { status: 404 });
    }

    // 3. Prekličemo naročnino ob koncu obračunskega obdobja
    const activeSub = subscriptions.data[0];
    const updatedSubscription = await stripe.subscriptions.update(activeSub.id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the billing period.' 
    });

  } catch (error: any) {
    console.error('Cancel Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
