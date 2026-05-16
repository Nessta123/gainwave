import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uporabiva Service Role ključ, da bo bot vedno imel dostop do pisanja sporočil
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Preverimo, če je to "Reply" sporočilo v Telegramu
    if (body.message && body.message.reply_to_message) {
      const replyText = body.message.text;
      const originalText = body.message.reply_to_message.text || "";

      // Iz originalnega bot sporočila izluščimo @username (tisti User: @alias del)
      const match = originalText.match(/User:\s*@([a-zA-Z0-9_]+)/);
      
      if (match && match[1]) {
        const targetAlias = match[1];

        // Zapišemo tvoj odgovor v bazo pod imenom GainWaveSupport
        const { error } = await supabase.from('messages').insert([{
          from_alias: 'GainWaveSupport',
          to_alias: targetAlias,
          text: replyText,
          is_read: false,
          created_at: new Date().toISOString()
        }]);

        if (error) console.error('Baza error:', error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook fail' }, { status: 500 });
  }
}
