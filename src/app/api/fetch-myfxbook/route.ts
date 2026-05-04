import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

    // Myfxbook Widgeti so lažji za branje kot celotna spletna stran
    // Če uporabnik vpiše navaden link, ga poskusimo predelati v API klic
    const systemIdMatch = url.match(/(\d+)(?:\/?)$/);
    const systemId = systemIdMatch ? systemIdMatch[1] : null;

    if (!systemId) {
      return NextResponse.json({ gain: "0", drawdown: "0", winRate: "0" });
    }

    // Uporabimo Myfxbook javni API/Widget endpoint, ki vrne čiste podatke
    const apiUrl = `https://www.myfxbook.com/api/get-custom-widget-data.json?id=${systemId}`;
    
    const response = await fetch(apiUrl, { cache: 'no-store' });
    const data = await response.json();

    if (data && data.content) {
      return NextResponse.json({
        gain: data.content.totalGain || "0.0",
        drawdown: data.content.drawdown || "0.0",
        winRate: data.content.winRate || "0"
      });
    }

    // Če API ne dela, poskusimo še zadnjič z direktnim branjem (fallback)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const fallbackRes = await fetch(proxyUrl);
    const fallbackData = await fallbackRes.json();
    const html = fallbackData.contents;

    const gainMatch = html.match(/id="gain">([^<]+)%<\/span>/);
    const drawdownMatch = html.match(/id="drawdown">([^<]+)%<\/span>/);

    return NextResponse.json({
      gain: gainMatch ? gainMatch[1] : "0.0",
      drawdown: drawdownMatch ? drawdownMatch[1] : "0.0",
      winRate: "0"
    });

  } catch (error) {
    return NextResponse.json({ gain: "0", drawdown: "0", winRate: "0" });
  }
}