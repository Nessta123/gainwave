"use client";
import React, { useEffect, useRef, memo, useState } from 'react';
import { toast } from 'sonner';

interface TradingViewChartProps {
  darkMode?: boolean;
  isPro?: boolean; 
  proExpiresAt?: string; 
  onShareToFeed?: () => void;
}

function TradingViewChart({ darkMode = true, isPro = false, proExpiresAt, onShareToFeed }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false); // 🔥 DODANO: Stanje za prikaz navodil

  // 🔥 FUNKCIJA, KI ZGENERIRA ZAKLENJENO KODO
  const handleCopyIndicator = () => {
    // Če nimamo datuma, mu damo default 30 dni od danes
    const expirationDate = proExpiresAt ? new Date(proExpiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expYear = expirationDate.getFullYear();
    const expMonth = expirationDate.getMonth() + 1; // JS meseci so 0-11
    const expDay = expirationDate.getDate();

    // 🔒 TUKAJ JE SKRIPTA S ČASOVNO KLJUČAVNICO IN TVOJO ZAKODIRANO LOGIKO
    const pineScriptCode = `//@version=5
indicator("GW GOLD MASTER v24.26 - Pro Sweeps", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ⏳ ČASOVNA KLJUČAVNICA (DYNAMIC TIME-LOCK)
_ex = timestamp(${expYear}, ${expMonth}, ${expDay}, 23, 59)
if timenow > _ex
    runtime.error("GainWave PRO Node: Vaša naročnina je potekla! Podaljšajte na terminalu.")

// 🔐 OBFUSCIRANA LOGIKA
_a=input.int(5,"BOS Sensitivity (candles)",minval=2)
_b=input.int(50,"Premium/Discount Lookback",minval=10)
_c=input.session("2000-0000","Asian Session Time")
_d=ta.highest(high,_b)
_e=ta.lowest(low,_b)
_f=(_d+_e)/2
var line _g=line.new(na,na,na,na,xloc=xloc.bar_time,color=color.new(color.red,30),style=line.style_solid,width=2,extend=extend.both)
var line _h=line.new(na,na,na,na,xloc=xloc.bar_time,color=color.new(color.gray,50),style=line.style_dashed,width=1,extend=extend.both)
var line _i=line.new(na,na,na,na,xloc=xloc.bar_time,color=color.new(color.teal,30),style=line.style_solid,width=2,extend=extend.both)
var label _j=label.new(na,na,text="PREMIUM",xloc=xloc.bar_time,style=label.style_none,textcolor=color.new(color.red,40),size=size.small,textalign=text.align_left)
var label _k=label.new(na,na,text="EQUILIBRIUM",xloc=xloc.bar_time,style=label.style_none,textcolor=color.new(color.gray,60),size=size.small,textalign=text.align_left)
var label _l=label.new(na,na,text="DISCOUNT",xloc=xloc.bar_time,style=label.style_none,textcolor=color.new(color.teal,40),size=size.small,textalign=text.align_left)
if barstate.islast
    line.set_xy1(_g,time[1],_d)
    line.set_xy2(_g,time,_d)
    line.set_xy1(_h,time[1],_f)
    line.set_xy2(_h,time,_f)
    line.set_xy1(_i,time[1],_e)
    line.set_xy2(_i,time,_e)
    _m=time+(time-time[1])*5
    label.set_xy(_j,_m,_d)
    label.set_xy(_k,_m,_f)
    label.set_xy(_l,_m,_e)
var float _n=na
var float _o=na
var int _p=na
var box _q=na
_r=time(timeframe.period,_c)
if _r and not _r[1]
    _n:=high
    _o:=low
    _p:=time
    _q:=box.new(left=_p,top=_n,right=time,bottom=_o,xloc=xloc.bar_time,bgcolor=color.new(color.blue,90),border_color=color.blue,border_style=line.style_solid,text="ASIAN SESSION",text_color=color.blue,text_size=size.small,text_valign=text.align_top)
else if _r
    _n:=math.max(_n,high)
    _o:=math.min(_o,low)
    box.set_top(_q,_n)
    box.set_bottom(_q,_o)
    box.set_right(_q,time)
_s=not na(_o) and low<_o and low[1]>=_o
_t=not na(_n) and high>_n and high[1]<=_n
plotshape(_s,"Liquidity Sweep Low",shape.xcross,location.belowbar,color.new(color.orange,40),size=size.tiny,text="")
plotshape(_t,"Liquidity Sweep High",shape.xcross,location.abovebar,color.new(color.orange,40),size=size.tiny,text="")
if _s or _t
    alert("LIQUIDITY SWEEP: Banke so pobrale azijsko likvidnost!",alert.freq_once_per_bar)
_u=ta.highest(high,_a)[1]
_v=ta.lowest(low,_a)[1]
_w=ta.crossover(close,_u)
_x=ta.crossunder(close,_v)
var int _y=0
if _w
    _z=_y==-1?"ChoCh":"BOS"
    _y:=1
    _aa=time+(time-time[1])*5
    line.new(x1=time[_a],y1=_u,x2=_aa,y2=_u,xloc=xloc.bar_time,color=color.new(color.teal,60),style=line.style_dashed,width=1)
    label.new(x=_aa,y=_u,text=_z,xloc=xloc.bar_time,style=label.style_label_left,color=color.new(color.white,100),textcolor=color.new(color.teal,40),size=size.tiny)
if _x
    _z=_y==1?"ChoCh":"BOS"
    _y:=-1
    _aa=time+(time-time[1])*5
    line.new(x1=time[_a],y1=_v,x2=_aa,y2=_v,xloc=xloc.bar_time,color=color.new(color.red,60),style=line.style_dashed,width=1)
    label.new(x=_aa,y=_v,text=_z,xloc=xloc.bar_time,style=label.style_label_left,color=color.new(color.white,100),textcolor=color.new(color.red,40),size=size.tiny)
_bb(_cc)=>
    _dd=0
    for _ee=1 to 15
        if _cc
            if close[_ee]<open[_ee]
                _dd:=_ee
                break
        else
            if close[_ee]>open[_ee]
                _dd:=_ee
                break
    _dd
var box _ff=na
var box _gg=na
var box _hh=na
var box _ii=na
if _w
    _jj=_bb(true)
    if _jj>0
        if not na(_ff)
            box.delete(_ff)
            box.delete(_gg)
        _kk=time[_jj]
        _ll=time+(time-time[1])*15
        _ff:=box.new(left=_kk,top=high[_jj],right=_ll,bottom=low[_jj],xloc=xloc.bar_time,bgcolor=color.new(color.teal,85),border_color=color.teal,text="BUY ZONE",text_color=color.teal,text_size=size.tiny,text_halign=text.align_right)
        _mm=_u-low[_jj]
        _nn=_u-(_mm*0.618)
        _oo=_u-(_mm*0.786)
        _gg:=box.new(left=_kk,top=_nn,right=_ll,bottom=_oo,xloc=xloc.bar_time,bgcolor=color.new(color.yellow,75),border_color=na,text="POTENTIAL BUY ZONE",text_color=color.new(color.yellow,30),text_size=size.tiny,text_halign=text.align_right)
if _x
    _pp=_bb(false)
    if _pp>0
        if not na(_hh)
            box.delete(_hh)
            box.delete(_ii)
        _kk=time[_pp]
        _ll=time+(time-time[1])*15
        _hh:=box.new(left=_kk,top=high[_pp],right=_ll,bottom=low[_pp],xloc=xloc.bar_time,bgcolor=color.new(color.red,85),border_color=color.red,text="SELL ZONE",text_color=color.red,text_size=size.tiny,text_halign=text.align_right)
        _mm=high[_pp]-_v
        _oo=_v+(_mm*0.618)
        _nn=_v+(_mm*0.786)
        _ii:=box.new(left=_kk,top=_nn,right=_ll,bottom=_oo,xloc=xloc.bar_time,bgcolor=color.new(color.yellow,75),border_color=na,text="POTENTIAL SELL ZONE",text_color=color.new(color.yellow,30),text_size=size.tiny,text_halign=text.align_right)
_qq=low>high[2] and close[1]>open[1]
_rr=high<low[2] and close[1]<open[1]
var box _ss=na
var box _tt=na
if _qq
    if not na(_ss)
        box.delete(_ss)
    _ss:=box.new(left=time[2],top=low,right=time+(time-time[1])*10,bottom=high[2],xloc=xloc.bar_time,bgcolor=color.new(color.blue,85),border_color=na,text="FVG",text_color=color.new(color.blue,50),text_size=size.tiny,text_halign=text.align_right)
if _rr
    if not na(_tt)
        box.delete(_tt)
    _tt:=box.new(left=time[2],top=low[2],right=time+(time-time[1])*10,bottom=high,xloc=xloc.bar_time,bgcolor=color.new(color.red,85),border_color=na,text="FVG",text_color=color.new(color.red,50),text_size=size.tiny,text_halign=text.align_right)
var table _uu=table.new(position.top_right,1,2,bgcolor=color.new(color.black,80),border_width=1,border_color=color.new(color.gray,50))
if barstate.islast
    table.cell(_uu,0,0,"MARKET TREND",text_color=color.white,text_size=size.small)
    if _y==1
        table.cell(_uu,0,1,"BULLISH",text_color=color.white,text_size=size.normal,bgcolor=color.new(color.teal,30))
    else if _y==-1
        table.cell(_uu,0,1,"BEARISH",text_color=color.white,text_size=size.normal,bgcolor=color.new(color.red,30))
`;

    // Kopiramo v odložišče
    navigator.clipboard.writeText(pineScriptCode).then(() => {
      setIsCopied(true);
      toast.success("✅ PRO Indicator Code Copied! Paste it in TradingView Pine Editor.");
      setTimeout(() => setIsCopied(false), 5000);
    }).catch(() => {
      toast.error("Failed to copy code. Please try again.");
    });
  };

  useEffect(() => {
    if (containerRef.current) containerRef.current.innerHTML = '';

    const initWidget = () => {
      if (typeof window !== 'undefined' && (window as any).TradingView && containerRef.current) {
        new (window as any).TradingView.widget({
          autosize: true,
          symbol: "BINANCE:BTCUSDT",
          interval: "D",
          timezone: "Etc/UTC",
          theme: darkMode ? "dark" : "light",
          style: "1",
          locale: "en",
          enable_publishing: false,
          backgroundColor: darkMode ? "#000000" : "#ffffff",
          gridColor: darkMode ? "#1f2937" : "#f3f4f6",
          hide_top_toolbar: false,
          hide_legend: false,
          hide_side_toolbar: false, 
          allow_symbol_change: true,
          save_image: true, 
          container_id: containerRef.current.id,
        });
      }
    };

    const existingScript = document.getElementById('tv-script-api');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'tv-script-api';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      initWidget();
    }
  }, [darkMode]);

  return (
    <div className="flex flex-col gap-4">
      
      {/* 🔥 PRO TREZOR: Prikaz za PRO in zamegljeno za FREE */}
      {isPro ? (
        <div className={`p-4 rounded-[1.5rem] border flex flex-col sm:flex-row items-center justify-between gap-4 ${darkMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300'}`}>
          <div>
            <h3 className={`text-[11px] font-black uppercase tracking-widest ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`}>
              👑 GW Gold Master Indicator
            </h3>
            <p className={`text-[9px] uppercase font-bold mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Locked to your node. Expires: {proExpiresAt ? new Date(proExpiresAt).toLocaleDateString() : 'Active'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* 🔥 NOVI GUMB ZA NAVODILA 🔥 */}
            <button 
              onClick={() => setShowInstructions(true)}
              className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
              }`}
            >
              📖 VIEW INSTRUCTIONS
            </button>
            <button 
              onClick={handleCopyIndicator}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                isCopied 
                  ? 'bg-green-500 text-black shadow-green-500/40' 
                  : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-yellow-500/30 hover:scale-105'
              }`}
            >
              {isCopied ? '✓ CODE COPIED' : '🔑 COPY PRO SCRIPT'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`p-4 rounded-[1.5rem] border flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 drop-shadow-md">
              🔒 Indicator Locked - Upgrade to PRO in Wallet
            </span>
          </div>
          {/* FAKE vsebina pod zameglitvijo, samo za izgled */}
          <div className="opacity-30 blur-[2px] w-full flex justify-between items-center">
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                👑 GW Gold Master Indicator
              </h3>
              <p className="text-[9px] uppercase font-bold mt-1 text-zinc-600">
                Locked to your node. Expires: 00/00/0000
              </p>
            </div>
            <button disabled className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-600">
              🔑 COPY PRO SCRIPT
            </button>
          </div>
        </div>
      )}

      {/* GLAVNI GRAF - ZDAJ VEDNO VIDEN! */}
      <div className={`w-full h-[600px] md:h-[700px] rounded-[2rem] overflow-hidden border shadow-2xl relative transition-colors duration-500 ${darkMode ? 'border-zinc-800 bg-black' : 'border-zinc-200 bg-white'}`}>
        <div id="tv_chart_container_main" ref={containerRef} className="absolute inset-0 w-full h-full" />
      </div>

      {/* GUMB ZA FEED */}
      {onShareToFeed && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-blue-500/5 border border-blue-500/20 p-4 rounded-[1.5rem]">
          <p className={`text-[9px] font-bold uppercase tracking-widest opacity-60 text-center sm:text-left ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            Tip: Use the camera icon (top right) on the chart to copy image.
          </p>
          <button 
            onClick={onShareToFeed}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Go to Feed
          </button>
        </div>
      )}

      {/* 🔥 MODALNO OKNO ZA NAVODILA 🔥 */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`relative w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 md:p-8 rounded-[2rem] border shadow-2xl ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            {/* Gumb za zapiranje */}
            <button 
              onClick={() => setShowInstructions(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h2 className={`text-xl md:text-2xl font-black mb-6 ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`}>
              🛠️ USER GUIDE: GAINWAVE PRO INDICATOR
            </h2>

            <div className={`space-y-6 text-sm ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
              <section className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <h3 className="font-bold text-red-500 mb-2">🚨 IMPORTANT DISCLAIMER: WHAT THIS TOOL IS AND IS NOT</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>NOT an automated Trading Bot:</strong> This program will NOT automatically trade, open, or close positions for you. It has no access to your capital.</li>
                  <li><strong>NOT Infallible:</strong> Despite the advanced algorithm, this is a technical tool and can be wrong. No tool in the world offers 100% success, as financial markets are dynamic and unpredictable.</li>
                  <li><strong>Your own analysis is MANDATORY:</strong> The indicator acts as your professional radar—it performs complex mathematical calculations and draws "Golden Zones" on your chart. However, <strong>you</strong> must perform the final analysis. Always use your own judgment and confirm the trade makes sense before clicking. The final decision and responsibility are exclusively yours.</li>
                </ul>
              </section>

              <p className="font-medium text-zinc-400">Welcome to the world of <strong>Smart Money Concepts (SMC)</strong>. For long-term profitability, strictly follow this 4-step process.</p>

              <section>
                <h3 className="font-bold text-lg mb-2 text-blue-400">📍 PREPARATION: Timeframes & News</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Timeframes:</strong> Always perform your analysis in two steps. Use the <strong>1-Hour (1H)</strong> chart to determine the main trend and the <strong>15-Minute (15m)</strong> chart to find precise entries.</li>
                  <li><strong>News:</strong> Check economic calendars (or the flags at the bottom of your TradingView chart). <strong>Never</strong> open positions 15 minutes before or after major "Red Folder" news (NFP, CPI, FED).</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h3 className="font-bold text-lg text-yellow-500">🎯 4 STEPS TO THE PERFECT ENTRY</h3>
                
                <div>
                  <h4 className="font-bold text-zinc-200">STEP 1: Determine Direction (Trend Filter)</h4>
                  <p>Before looking for an opportunity, you must know where you stand:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li><strong>Check the Trend Dashboard</strong> (top right on the chart):
                      <ul className="list-circle pl-5 mt-1">
                        <li>Does it say <strong className="text-green-500">BULLISH</strong>? Only look for <strong>BUY</strong> trades.</li>
                        <li>Does it say <strong className="text-red-500">BEARISH</strong>? Only look for <strong>SELL</strong> trades.</li>
                      </ul>
                    </li>
                    <li><strong>Check the 3 Horizontal Lines:</strong>
                      <ul className="list-circle pl-5 mt-1">
                        <li>🔴 <strong>PREMIUM (Top Line):</strong> Market is overbought/expensive. Look for Sells only.</li>
                        <li>🟢 <strong>DISCOUNT (Bottom Line):</strong> Market is oversold/cheap. Look for Buys only.</li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-200">STEP 2: Wait for Institutional Move (The Trigger)</h4>
                  <p>The algorithm requires proof that "Big Players" have entered the market. Wait for one of these scenarios:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Scenario A (Morning):</strong> An orange cross (<strong>Liquidity Sweep</strong>) appears near the blue Asian Session box. This means liquidity has been hunted.</li>
                    <li><strong>Scenario B (Intraday):</strong> Price aggressively breaks the previous structure. A dashed <strong>BOS</strong> or <strong>ChoCh</strong> line must appear, ideally accompanied by a blue/red <strong>FVG</strong> box (Fair Value Gap).</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-200">STEP 3: Enter in the "Golden Zone" (OTE - Optimal Trade Entry)</h4>
                  <p>If Step 2 is met, the algorithm will automatically draw a main colored box (Turquoise = Buy, Red = Sell) and a smaller <strong>YELLOW</strong> box inside it.</p>
                  <p className="mt-2 text-yellow-500"><strong>STRICT ENTRY RULE:</strong> Do not enter immediately when the structure breaks! Wait for the price to return (<strong>pullback</strong>) and touch or enter the inner <strong>YELLOW box (POTENTIAL BUY/SELL ZONE)</strong>. If the price does not reach this yellow zone, skip the trade.</p>
                </div>

                <div>
                  <h4 className="font-bold text-zinc-200">STEP 4: Risk Management (SL and TP)</h4>
                  <p>Once price enters the yellow box and you open your position, set your protection immediately:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Stop-Loss (SL):</strong> Place it exactly below (for Buy) or above (for Sell) the outer edge of the main (Turquoise/Red) box. If the price breaks this box, the structural idea is invalidated.</li>
                    <li><strong>Take-Profit (TP):</strong> Your first target should be the previous High (for Buy) or Low (for Sell). The ultimate target is the opposite boundary line (e.g., if you bought in Discount, target the Premium line).</li>
                  </ul>
                </div>
              </section>

              <section className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <h3 className="font-bold text-red-500 mb-2">⛔ FORBIDDEN TRADES (When NOT to click)</h3>
                <p>Protect your capital and ignore the signal if:</p>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                  <li><strong>Counter-Trend Signal:</strong> The indicator draws a Buy zone, but the Dashboard shows <strong>BEARISH</strong>. Do not trade.</li>
                  <li><strong>Wrong Location:</strong> The indicator draws a green Buy box that touches the upper red <strong>PREMIUM</strong> line. This is a trap (price is too expensive to buy).</li>
                  <li><strong>No BOS Confirmation:</strong> An orange cross (Sweep) occurs, but the price does not break the structure (no dashed BOS line in your direction).</li>
                </ol>
              </section>

            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setShowInstructions(false)}
                className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
              >
                GOT IT, CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TradingViewChart);
