import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: Request) {
  // 1. Varnostna preverba preko URL parametra
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('key');
  const MY_HARDCODED_SECRET = '2051991.Pk';

  if (secret !== MY_HARDCODED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    const { data: openSignals, error: signalsError } = await supabase
      .from('posts')
      .select('*')
      .eq('signal_status', 'open')
      .not('pair', 'is', null);

    if (signalsError) throw signalsError;
    if (!openSignals || openSignals.length === 0) {
      return NextResponse.json({ message: "No active signals to resolve." });
    }

    const baseUrl = new URL(req.url).origin;
    const priceRes = await fetch(`${baseUrl}/api/prices`, { cache: 'no-store' });
    const currentPrices = await priceRes.json();

    const resolvedResults = [];

    for (const signal of openSignals) {
      const pairKey = signal.pair.toUpperCase();
      const priceData = currentPrices[pairKey];

      if (!priceData || !priceData.price) continue;

      const currentPrice = parseFloat(priceData.price);
      let finalStatus: string | null = null;

      if (signal.direction === 'LONG') {
        if (currentPrice >= signal.tp_price) finalStatus = 'win';
        else if (currentPrice <= signal.sl_price) finalStatus = 'loss';
      } else if (signal.direction === 'SHORT') {
        if (currentPrice <= signal.tp_price) finalStatus = 'win';
        else if (currentPrice >= signal.sl_price) finalStatus = 'loss';
      }

      if (finalStatus) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ 
            signal_status: finalStatus,
            exit_price: currentPrice 
          })
          .eq('id', signal.id);

        if (!updateError) {
          resolvedResults.push({ id: signal.id, pair: pairKey, status: finalStatus, exitPrice: currentPrice });
        }
      }
    }

    return NextResponse.json({ 
      processed: openSignals.length, 
      resolved: resolvedResults.length,
      details: resolvedResults 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}