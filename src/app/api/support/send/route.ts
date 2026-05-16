import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, username, isSupport } = await req.json();
    
    // 🔥 VAROVALO: Če ni izrecno označeno kot support chat, takoj prekini!
    if (!isSupport) {
      return NextResponse.json({ success: false, message: "Ignorirano - ni support chat" });
    }

    const BOT_TOKEN = '7969509329:AAGIE8KBM8W0h03DyiMmuDC1VasBmGehnEk';
    const CHAT_ID = '861378204'; // Tvoj osebni Telegram ID

    const text = `🚨 *GAINWAVE SUPPORT* 🚨\n\n👤 User: @${username}\n\n💬 Message:\n${message}\n\n--- \nNapotek: Za odgovor pritisni "Reply" na to sporočilo.`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: text,
        parse_mode: 'Markdown'
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telegram API Napaka:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
