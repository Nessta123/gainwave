import { NextResponse } from 'next/server';

// Nastavimo na 0, da Vercel prisilimo, da VEDNO potegne sveže cene in ne kaže starih nul!
export const revalidate = 0; 

export async function GET() {
  try {
    const apiKey = 'dd2686977779477fbe39d7c87091b3b5'; 
    let finalPrices: any = {};

    // ==========================================
    // 1. BINANCE (Kripto) - S popravljenim URL-jem!
    // ==========================================
    try {
      // Pravilno zapakiran URL (encodeURIComponent), da ga Vercel ne blokira
      const symbols = '["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","BNBUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT"]';
      const binanceUrl = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(symbols)}`;
      
      // cache: 'no-store' prisili Vercel, da vedno vzame svež podatek
      const binanceRes = await fetch(binanceUrl, { cache: 'no-store' });
      const binanceData = await binanceRes.json();

      if (Array.isArray(binanceData)) {
        binanceData.forEach((item: any) => {
          const cleanSymbol = item.symbol.replace('USDT', '/USD'); 
          finalPrices[cleanSymbol] = { price: parseFloat(item.price).toString() };
        });
      } else {
        console.error("Binance ni vrnil seznama:", binanceData);
      }
    } catch (binanceErr) {
      console.error("Binance Fetch Error:", binanceErr);
    }

    // ==========================================
    // 2. TWELVEDATA (8 parov)
    // ==========================================
    try {
      const tdSymbols = [
        "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD",
        "XAU/USD", "XAG/USD", "US30/USD", "NAS100/USD"
      ].join(',');

      const tdUrl = `https://api.twelvedata.com/price?symbol=${tdSymbols}&apikey=${apiKey}`;
      const tdRes = await fetch(tdUrl, { cache: 'no-store' });
      const tdData = await tdRes.json();

      if (tdData.status !== 'error') {
        Object.keys(tdData).forEach(key => {
          finalPrices[key] = tdData[key];
        });
      }
    } catch (tdErr) {
      console.error("TwelveData Fetch Error:", tdErr);
    }

    return NextResponse.json(finalPrices);

  } catch (error) {
    console.error("Internal API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}