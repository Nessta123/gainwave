import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, symbol, chain, vision } = body;
    const { buyTax, sellTax, liquidity } = body;
    const { airdrop, renounced } = body;

    const prompt = `You are an elite Blockchain Architect from 2030.
Write a highly professional 4-part whitepaper for a new token.
Do NOT use markdown asterisks or hash symbols.

Details:
- Name: ${name}
- Symbol: ${symbol}
- Network: ${chain}
- Vision: ${vision}
- Taxes: Buy ${buyTax}%, Sell ${sellTax}%
- Liquidity Locked: ${liquidity}%
- Airdrop: ${airdrop}%
- Renounced: ${renounced ? 'Yes' : 'No'}

Structure:
1. EXECUTIVE SUMMARY
2. PROTOCOL VISION
3. TOKENOMICS & DISTRIBUTION
4. SECURITY & ARCHITECTURE

End with: ARCHITECTED BY GAINWAVE AI ENGINE`;

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      const msg = "Missing API Key";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const aiRes = await 
fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      })
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      const errMsg = aiData.error?.message || 'Unknown';
      const finalMsg = `OpenAI Error: ${errMsg}`;
      return NextResponse.json({ error: finalMsg }, { status: 500 });
    }

    const wp = aiData.choices[0].message.content;
    return NextResponse.json({ whitepaper: wp });

  } catch (err: any) {
    const fallback = "Server Failed";
    const errorMsg = err.message || fallback;
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
