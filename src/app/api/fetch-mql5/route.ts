import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || !url.includes('mql5.com')) {
      return NextResponse.json({ gain: "0", drawdown: "0" });
    }

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    // Dodamo timeout, da strežnik ne čaka v neskončnost
    const response = await fetch(proxyUrl, { 
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000) 
    });

    const proxyData = await response.json();
    const html = proxyData?.contents || "";

    // Iskanje Growth (Gain) - Izboljšan Regex
    const growthMatch = html.match(/class="[^"]*signal-card__growth-value[^"]*"[^>]*>([\d\.\+\-]+)%<\/div>/i) || 
                       html.match(/Growth:\s*([\d\.\+\-]+)%/i);
    
    const drawdownMatch = html.match(/Drawdown:\s*([\d\.\+\-]+)%/i) || 
                          html.match(/Drawdown<\/div>[^<]*<div[^>]*>([\d\.\+\-]+)%<\/div>/i);

    return NextResponse.json({
      gain: growthMatch ? growthMatch[1].replace('+', '') : "0.0",
      drawdown: drawdownMatch ? drawdownMatch[1] : "0.0"
    });

  } catch (error) {
    console.error("MQL5 Safe Error Handle:", error);
    // KLJUČNO: Če pride do napake, vrnemo nule namesto ERROR 500!
    // Tako bo gumb "Save" v page.tsx dobil odgovor in dokončal vpis v bazo.
    return NextResponse.json({ gain: "0", drawdown: "0" });
  }
}