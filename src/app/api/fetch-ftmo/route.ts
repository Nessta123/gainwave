import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ profit: "0", error: "Missing username" });
    }

    // Uporabimo proxy za dostop, da nas ne blokirajo takoj
    const url = `https://ftmo.com/en/leaderboard/`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, { 
      cache: 'no-store',
      signal: AbortSignal.timeout(8000) // Čakamo največ 8 sekund
    });

    if (!response.ok) throw new Error("Proxy connection failed");

    const proxyData = await response.json();
    const html = proxyData?.contents || "";

    // Regex, ki išče uporabnika in njegov dobiček
    const regex = new RegExp(`${username}[\\s\\S]*?<td>([\\$\\d\\,\\.]+)<\\/td>`, 'i');
    const match = html.match(regex);

    if (match) {
      return NextResponse.json({
        profit: match[1].replace(/[^0-9.-]+/g,""), // Izlušči samo številko
        isFunded: true
      });
    }

    // Če ne najde uporabnika na prvi strani lestvice
    return NextResponse.json({ profit: "0", isFunded: false, note: "User not on first page" });

  } catch (error) {
    console.error("FTMO API Error:", error);
    // KLJUČNO: Vrnemo 200 OK z ničlami namesto 500 Error, da se gumb SAVE ne ustavi!
    return NextResponse.json({ profit: "0", error: "Server blocked or timeout" });
  }
}