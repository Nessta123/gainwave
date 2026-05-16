import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    // Bot sam vzame ključe iz .env datoteke
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Manjkajo kljuci v .env' }, { status: 500 });
    }

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

    const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': apiKey }
    });
    
    const data = await response.json();

    return NextResponse.json({
      success: !!data.balances,
      accountType: data.accountType,
      totalAssets: data.balances ? data.balances.length : 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Binance API Error' }, { status: 500 });
  }
}