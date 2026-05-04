import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uporabimo tvoje obstoječe ključe iz .env datoteke
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Skrivni varnostni žeton (enak mora biti v MT5 na iMacu)
const SECRET_KEY = "gainwave_hardcore_mt5_bridge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Varnostna blokada (če nekdo tretji poskuša poslati lažne cene)
    if (body.secret !== SECRET_KEY) {
      return NextResponse.json({ error: "Access Denied" }, { status: 401 });
    }

    // 2. Povezava s Supabase (z admin pravicami za pisanje)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. UPSERT: Če simbol že obstaja, prepišemo ceno, če ne, dodamo novo vrstico
    const { error } = await supabaseAdmin
      .from('live_prices')
      .upsert({ 
        symbol: body.symbol, 
        bid: body.bid, 
        ask: body.ask,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'symbol' 
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🔥 MT5 Bridge Error:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
