import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    // 1. Beremo vse uporabnike in VSE njihove ključe
    const { data: users, error } = await supabase
      .from('profiles') 
      .select('id, binance_api_key, binance_api_secret, bybit_api_key, bybit_api_secret, okx_api_key, okx_api_secret, kraken_api_key, kraken_api_secret');

    if (error || !users) {
      return NextResponse.json({ error: 'Napaka baze', details: error }, { status: 500 });
    }

    const results = [];

    // 2. Zanka gre čez uporabnike in preveri, kaj imajo vpisano
    for (const user of users) {
      
      // --- BINANCE LOGIKA ---
      if (user.binance_api_key && user.binance_api_secret) {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = crypto.createHmac('sha256', user.binance_api_secret).update(queryString).digest('hex');

        try {
          const res = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
            headers: { 'X-MBX-APIKEY': user.binance_api_key }
          });
          const data = await res.json();
          results.push({ userId: user.id, exchange: 'Binance', success: !!data.balances });
        } catch (err) {
          results.push({ userId: user.id, exchange: 'Binance', success: false });
        }
      }

      // --- BYBIT LOGIKA (Ogrodje, pripravljeno za klic) ---
      if (user.bybit_api_key && user.bybit_api_secret) {
        // Tukaj se kasneje doda Bybit API fetch koda
        results.push({ userId: user.id, exchange: 'Bybit', status: 'ready_to_build' });
      }

      // --- OKX in KRAKEN (Lahko dodamo enako ogrodje) ---
      if (user.okx_api_key) {
        results.push({ userId: user.id, exchange: 'OKX', status: 'ready_to_build' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedUsers: users.length,
      results 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
