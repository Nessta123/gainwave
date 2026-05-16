export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Lesson {
  id: string;
  title: string;
  image_url?: string;
  content: string;
  quiz_bank: QuizQuestion[];
}

export interface Level {
  level: number;
  title: string;
  lessons: Lesson[];
}

export const academyData: Level[] = [
  // ==========================================
  // LEVEL 0: THE FOUNDATIONS (In-depth)
  // ==========================================
  {
    level: 0,
    title: "The Foundations",
    lessons: [
      {
        id: "0.1",
        title: "Candlestick Anatomy: The Map of the Battle",
        image_url: "/academy/image_0.jpg",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Bulls:</strong> Buyers. They push the price UP.</li>
              <li><strong>Bears:</strong> Sellers. They push the price DOWN.</li>
              <li><strong>OHLC:</strong> Open, High, Low, Close. The four key price points of any candle.</li>
              <li><strong>SMC (Smart Money Concepts):</strong> Trading strategy based on how large institutions (banks) manipulate the market.</li>
            </ul>
          </div>

          <h3>The War Between Buyers and Sellers</h3>
          <p>Imagine a daily tug-of-war between two teams: the <strong>Bulls</strong> and the <strong>Bears</strong>. A Japanese Candlestick is simply the visual record of who won that battle over a specific period of time (for example, 1 hour).</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <h3>Body vs. Wick: The Truth vs. The Attempt</h3>
          <p>Every candlestick has two main components: the <strong>Body</strong> and the <strong>Wick</strong> (sometimes called a Shadow).</p>
          <ul>
            <li><strong>The Body (The Truth):</strong> This is the thick colored part. It shows where the price <em>Opened</em> at the start of the timeframe, and where it officially <em>Closed</em>. A large body means one side was in complete control. It represents committed money.</li>
            <li><strong>The Wick (The Attempt):</strong> The thin lines at the top and bottom. They show the absolute highest and lowest prices reached during that time before the opposing side pushed back. Wicks represent <strong>Rejection</strong>.</li>
          </ul>

          <h3>Why Wicks Matter in SMC</h3>
          <p>Retail (amateur) traders focus purely on the body. Smart Money Concept (SMC) traders focus heavily on the wicks. Think of a wick as a footprint. If you see a small body with a massive wick pointing down, it means sellers tried to crash the price, but buyers aggressively stepped in, absorbing all the sell orders and pushing the price back up. This often happens when institutions are "sweeping" stop losses (grabbing liquidity) before sending the market in their intended direction.</p>
        `,
        quiz_bank: [
          {
            question: "You are looking at a chart and spot a candle with a small body but an extremely long wick extending downwards. What does this long bottom wick indicate in SMC trading?",
            options: [
              "The market is weak and will definitely crash heavily.",
              "Sellers pushed the price down, but buyers strongly rejected it, potentially sweeping retail liquidity.",
              "The price will move sideways forever."
            ],
            correctAnswer: 1
          },
          {
            question: "What does a large, thick candlestick body tell you about that specific timeframe?",
            options: [
              "There was indecision in the market.",
              "The trading volume was dangerously low.",
              "One side (buyers or sellers) was in complete control and committed capital."
            ],
            correctAnswer: 2
          },
          {
            question: "In the context of Smart Money Concepts, what do wicks primarily represent?",
            options: [
              "A glitch in the trading software.",
              "Rejection of a price level and potential liquidity sweeps.",
              "Where the price is guaranteed to go next."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "0.2",
        title: "Timeframe Fractals: The Market Microscope",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Timeframe:</strong> The amount of time one single candle represents (e.g., 1H = 1 Hour).</li>
              <li><strong>HTF (High Timeframe):</strong> Large charts like Daily (1D) or 4-Hour (4H). Shows the macro trend.</li>
              <li><strong>LTF (Low Timeframe):</strong> Small charts like 15-Minute (15m) or 1-Minute (1m). Used for entries.</li>
              <li><strong>Fractal:</strong> A pattern that repeats itself at every scale. A trend on the 1D chart looks exactly like a trend on the 1m chart.</li>
            </ul>
          </div>

          <h3>The Concept of Fractals</h3>
          <p>The market is fractal. Think of it like Google Maps. If you look at the map of the entire Earth (HTF), you see the big oceans and continents. If you zoom in to your city (LTF), you see streets and houses. It's the same Earth, just viewed at a different level of detail. What looks like one single, massive 4-Hour candle is actually made up of sixteen 15-Minute candles going up and down.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <h3>HTF vs. LTF</h3>
          <p>To be an elite trader, you must be a multi-timeframe master:</p>
          <ul>
            <li><strong>HTF (The General):</strong> The HTF dictates the overall "narrative" or direction of the market. It holds massive institutional volume. If the Daily chart is going up, the market wants to go up.</li>
            <li><strong>LTF (The Sniper):</strong> The LTF is used to find the exact, surgical entry point with minimal risk.</li>
          </ul>
          
          <h3>The Golden Rule</h3>
          <p>A common mistake beginners make is getting lost in the 1-minute chart. They see a fast drop on the 1m chart and panic-sell, completely ignoring that on the 4-hour chart, this drop is just a tiny, healthy pullback in a massive uptrend. <strong>Never trade the LTF blindly; always align it with the HTF.</strong></p>
        `,
        quiz_bank: [
          {
            question: "If the 4-hour chart (HTF) is in a strong uptrend, but the 1-minute chart (LTF) shows a sharp drop, what should a Smart Money trader do?",
            options: [
              "Panic sell everything immediately to avoid losing money.",
              "Wait for the 1-minute chart to reverse and align back with the 4-hour uptrend to find a high-probability buy.",
              "Ignore the 4-hour chart completely because it's too slow."
            ],
            correctAnswer: 1
          },
          {
            question: "What does it mean when we say the market is 'fractal'?",
            options: [
              "It is broken and unpredictable.",
              "The market is controlled entirely by complex mathematical equations that no human can read.",
              "The same patterns and structures repeat themselves across all timeframes, from the 1-minute to the monthly chart."
            ],
            correctAnswer: 2
          },
          {
            question: "What is the primary role of the High Timeframe (HTF) in your trading strategy?",
            options: [
              "To dictate the overall macro narrative and major direction of the market.",
              "To find extremely tight, 1-pip surgical entries.",
              "To trick retail traders into buying at the top."
            ],
            correctAnswer: 0
          }
        ]
      },
      {
        id: "0.3",
        title: "Market Direction: The Staircase",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>HH (Higher High):</strong> A peak that is higher than the previous peak.</li>
              <li><strong>HL (Higher Low):</strong> A valley that is higher than the previous valley.</li>
              <li><strong>LH (Lower High):</strong> A peak that is lower than the previous peak.</li>
              <li><strong>LL (Lower Low):</strong> A valley that is lower than the previous valley.</li>
              <li><strong>Consolidation (Range):</strong> Sideways movement with no clear highs or lows.</li>
            </ul>
          </div>

          <h3>Identifying the Flow</h3>
          <p>The market never moves in a straight line. It breathes. It inhales (pullbacks) and exhales (impulses). There are three states of market flow:</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <ul>
            <li><strong>Uptrend (The Upward Staircase):</strong> The market creates <strong>Higher Highs (HH)</strong> and <strong>Higher Lows (HL)</strong>. Every time the market pulls back, it stops at a higher level than before, and then breaks the previous high. Buyers are in control.</li>
            <li><strong>Downtrend (The Downward Staircase):</strong> The market creates <strong>Lower Highs (LH)</strong> and <strong>Lower Lows (LL)</strong>. Sellers are dominating, pushing the price to new depths.</li>
            <li><strong>Ranging (Consolidation):</strong> Price is trapped in a box between a specific ceiling and floor. Institutions use this boring, sideways movement to quietly build massive positions without moving the price too much.</li>
          </ul>

          <h3>Trend is your Friend</h3>
          <p>In SMC, we do not try to guess the top or the bottom. We identify the current staircase (trend) and look to enter during the pullback (the HL in an uptrend, or the LH in a downtrend). We follow the footprints of the institutional order flow.</p>
        `,
        quiz_bank: [
          {
            question: "In a healthy Uptrend, what structural points must the price consistently create to confirm the bulls are still in control?",
            options: [
              "Lower Lows and Lower Highs.",
              "Equal Highs and sideways movement.",
              "Higher Highs and Higher Lows."
            ],
            correctAnswer: 2
          },
          {
            question: "What is typically happening during a period of Consolidation (Ranging)?",
            options: [
              "Institutions are violently crashing the price.",
              "Institutions are quietly accumulating or distributing massive positions before the next big move.",
              "The market has run out of all buyers."
            ],
            correctAnswer: 1
          },
          {
            question: "Where is the safest place to enter a trade during a confirmed downtrend?",
            options: [
              "Right as it makes a new Lower Low.",
              "During a pullback, when it forms a new Lower High (LH).",
              "Whenever you feel like it's cheap enough to buy."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "0.4",
        title: "Trading Sessions: When the Giants Wake Up",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>AMD (Accumulation, Manipulation, Distribution):</strong> The 3-phase cycle institutions use daily.</li>
              <li><strong>Session:</strong> Specific active hours of major financial centers (Asia, London, New York).</li>
              <li><strong>Stop Loss:</strong> An automatic order to exit a trade if it loses too much money.</li>
            </ul>
          </div>

          <h3>The Market Clock</h3>
          <p>The market doesn't move randomly; it's driven by the volume of major financial centers around the world. Understanding when these "giants" wake up is crucial for timing your trades.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <h3>The AMD Cycle</h3>
          <p>Institutions often follow a daily cycle across three major sessions:</p>
          <ul>
            <li><strong>Asian Session (Accumulation):</strong> Usually slow, quiet, and ranging. The market moves sideways, building up a pool of retail stop losses above and below the range.</li>
            <li><strong>London Session (Manipulation):</strong> London wakes up and often creates the "fake move" of the day. It violently breaks out of the Asian range to trigger stop losses (sweeping liquidity), trapping retail traders on the wrong side.</li>
            <li><strong>New York Session (Distribution):</strong> With maximum volume entering the market, NY usually reverses the London fakeout and delivers the true intended move of the day, distributing profits.</li>
          </ul>
          <p><strong>Takeaway:</strong> Amateurs trade breakouts during the Asian session. Professionals wait for London to manipulate the market, and trade the reversal in New York.</p>
        `,
        quiz_bank: [
          {
            question: "According to the typical daily institutional cycle (AMD), what is the London Open known for?",
            options: [
              "Moving sideways for 10 hours with no volume.",
              "Creating a fake breakout (Manipulation) to sweep liquidity built up during the Asian session.",
              "Closing all global banks."
            ],
            correctAnswer: 1
          },
          {
            question: "What phase of the AMD cycle typically occurs during the Asian Session?",
            options: [
              "Distribution (The real move).",
              "Accumulation (Building liquidity).",
              "Manipulation (The fakeout)."
            ],
            correctAnswer: 1
          },
          {
            question: "Why do professionals avoid trading breakouts during the Asian session?",
            options: [
              "Because it's usually just building liquidity (traps) for London to manipulate later.",
              "Because the spreads are too high.",
              "Because New York is the only session that matters."
            ],
            correctAnswer: 0
          }
        ]
      }
    ]
  },

  // ==========================================
  // LEVEL 1: MARKET STRUCTURE
  // ==========================================
  {
    level: 1,
    title: "Market Structure (SMC Core)",
    lessons: [
      {
        id: "1.1",
        title: "Break of Structure (BOS)",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>BOS (Break of Structure):</strong> When price successfully pushes past a previous major high or low and stays there.</li>
              <li><strong>Continuation:</strong> Proof that the current trend is still alive and healthy.</li>
            </ul>
          </div>

          <h3>Confirming the Trend</h3>
          <p>How do we know an uptrend is actually continuing? It must physically break past the previous ceiling. A <strong>Break of Structure (BOS)</strong> confirms that institutional momentum is strong enough to continue the trend.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <h3>The Golden Rule of BOS: Body vs. Wick</h3>
          <p>This is where 90% of retail traders fail. A valid Break of Structure <strong>MUST</strong> have a candle <strong>BODY</strong> that closes past the previous structure point.</p>
          <p>If the price pushes past the old high, but only leaves a wick and the body closes back down below the line... that is <strong>NOT</strong> a BOS. That is a trap. That is a Liquidity Sweep. A body close shows <em>commitment</em> from buyers to stay at higher prices. A wick shows rejection.</p>
        `,
        quiz_bank: [
          {
            question: "To have a valid Break of Structure (BOS) indicating a true continuation of the trend, what must happen at the previous high/low?",
            options: [
              "A wick must poke through the line for just a second.",
              "A solid candle BODY must close completely above/below the previous structure line.",
              "The price just needs to touch the exact same line and reverse."
            ],
            correctAnswer: 1
          },
          {
            question: "If price pushes past an old high but only leaves a wick, closing back below the high, what is this called?",
            options: [
              "A perfect Break of Structure.",
              "A Liquidity Sweep (A trap).",
              "A major continuation pattern."
            ],
            correctAnswer: 1
          },
          {
            question: "What does a body close past a structural level indicate compared to a wick?",
            options: [
              "It indicates commitment and true strength from that side.",
              "It indicates extreme weakness.",
              "There is no difference between a body close and a wick."
            ],
            correctAnswer: 0
          }
        ]
      },
      {
        id: "1.2",
        title: "Change of Character (CHoCH)",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>CHoCH (Change of Character):</strong> The first structural sign that a trend is reversing.</li>
              <li><strong>Reversal:</strong> When an uptrend changes into a downtrend, or vice versa.</li>
            </ul>
          </div>

          <h3>The First Whisper of a Reversal</h3>
          <p>While a BOS tells you the trend is continuing, a <strong>Change of Character (CHoCH)</strong> is the very first warning sign that the trend might be dying and preparing to reverse.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <p>Imagine an uptrend making Higher Highs (HH) and Higher Lows (HL). Suddenly, the price drops heavily and smashes right through the <em>last valid Higher Low</em>. The character of the market has just changed from bullish to bearish.</p>
          
          <h3>Internal vs. External CHoCH</h3>
          <p><strong>Warning:</strong> Retail traders see a CHoCH on a 1-minute chart and think the entire 4-Hour trend is over. Wrong. A 1-minute CHoCH inside a 4-Hour uptrend is just a temporary pullback. Always map your major structural points on the High Timeframe first!</p>
        `,
        quiz_bank: [
          {
            question: "What exactly does a bearish Change of Character (CHoCH) indicate in an established uptrend?",
            options: [
              "The trend is getting much stronger and you should buy heavily.",
              "It is the first structural sign that buyers are exhausted, the last higher low is broken, and a reversal might occur.",
              "It means the exchange has paused trading."
            ],
            correctAnswer: 1
          },
          {
            question: "What is the key difference between a BOS and a CHoCH?",
            options: [
              "A BOS signals continuation, while a CHoCH signals a potential reversal.",
              "A BOS only happens on daily charts, CHoCH only on 1-minute charts.",
              "There is no difference, they mean the same thing."
            ],
            correctAnswer: 0
          },
          {
            question: "Why should you be careful when trading a CHoCH on a very low timeframe (like 1m) without checking the HTF?",
            options: [
              "Because 1m charts are fake.",
              "Because a 1m CHoCH might just be a minor pullback within a massive HTF trend.",
              "Because lower timeframes don't use real money."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "1.3",
        title: "Premium vs. Discount Pricing",
        image_url: "/academy/image_3.jpg",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Equilibrium:</strong> The exact 50% middle point of a price move.</li>
              <li><strong>Premium:</strong> The upper half (above 50%). Expensive pricing.</li>
              <li><strong>Discount:</strong> The lower half (below 50%). Cheap pricing.</li>
              <li><strong>Fibonacci Tool:</strong> A drawing tool used to measure percentages of a price move.</li>
            </ul>
          </div>

          <h3>The Supermarket Analogy</h3>
          <p>Institutions are massive businesses. They do not buy things when they are expensive, and they do not sell things when they are cheap. They wait for sales. You should too.</p>
          <p>We use a Fibonacci retracement tool drawn from the bottom of an impulse leg to the top of that leg. We divide this area exactly in half (the 50% equilibrium line).</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <ul>
            <li><strong>Discount Zone (Below 50%):</strong> The price is cheap. This is the ONLY area where you should look for BUY (Long) setups during an uptrend.</li>
            <li><strong>Premium Zone (Above 50%):</strong> The price is expensive. This is the ONLY area where you should look for SELL (Short) setups during a downtrend.</li>
          </ul>
          <p>If you see a beautiful buy setup, but it is in the Premium zone (above 50%), you ignore it. You are buying at the top of the retail trap.</p>
        `,
        quiz_bank: [
          {
            question: "You are in an uptrend and looking to buy (go long). Where must the price pull back to before you even consider entering a trade?",
            options: [
              "The Premium Zone (Above the 50% equilibrium mark).",
              "Exactly at the 100% mark.",
              "The Discount Zone (Below the 50% equilibrium mark)."
            ],
            correctAnswer: 2
          },
          {
            question: "If you want to place a Sell (Short) order, in which zone should you ideally be looking?",
            options: [
              "The Discount Zone.",
              "The Premium Zone.",
              "Right on the Equilibrium line."
            ],
            correctAnswer: 1
          },
          {
            question: "Why do institutions wait for the Discount Zone to buy?",
            options: [
              "Because the Fibonacci tool forces them to.",
              "Because they operate like a business and want to buy assets at a cheap, discounted price.",
              "Because it's the only place they are legally allowed to trade."
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  },

  // ==========================================
  // LEVEL 2: LIQUIDITY SOURCING
  // ==========================================
  {
    level: 2,
    title: "Liquidity Sourcing (The Fuel)",
    lessons: [
      {
        id: "2.1",
        title: "Understanding Liquidity: The Market's Fuel",
        image_url: "/academy/image_5.jpg",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Liquidity:</strong> The availability of buy and sell orders. It's the "fuel" institutions need to enter trades.</li>
              <li><strong>BSL (Buy-Side Liquidity):</strong> Buy orders resting above old highs (Retail Short Stop-Losses).</li>
              <li><strong>SSL (Sell-Side Liquidity):</strong> Sell orders resting below old lows (Retail Long Stop-Losses).</li>
            </ul>
          </div>

          <h3>Why does the market really move?</h3>
          <p>Smart Money (Banks, Hedge Funds) trade with billions of dollars. If they want to buy 10,000 Bitcoin, they cannot just click "Buy" like a retail trader. If they do, there won't be enough sellers, and they will accidentally push the price up against themselves, getting a terrible entry price.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <p>To BUY a massive amount, they need a massive amount of SELL orders waiting in the market. Where do they find a massive pool of sell orders? <strong>At Retail Stop Losses.</strong></p>
          <p>Institutions hunt these stop losses to fill their own orders. Liquidity is the ultimate magnet for price. If you know where retail traders put their stops, you know where the market is going next.</p>
        `,
        quiz_bank: [
          {
            question: "Why do institutional algorithms deliberately target areas with a high concentration of retail stop losses (Liquidity)?",
            options: [
              "Because those areas act as unbreakable magical support/resistance.",
              "To trigger those stop losses, providing the massive volume (fuel) they need to enter or exit their own giant positions without slippage.",
              "Because trading indicators tell them to do it."
            ],
            correctAnswer: 1
          },
          {
            question: "What resides above old, obvious swing highs?",
            options: [
              "Buy-Side Liquidity (BSL), mainly retail buy-stop orders and short stop-losses.",
              "Sell-Side Liquidity (SSL).",
              "A guaranteed point of reversal."
            ],
            correctAnswer: 0
          },
          {
            question: "If Smart Money wants to execute a massive BUY order, what do they need to find in the market?",
            options: [
              "A massive amount of other buyers.",
              "A massive pool of SELL orders (usually found below old lows).",
              "A completely quiet market with no volume."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "2.2",
        title: "Equal Highs & Lows (EQH/EQL)",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>EQH (Equal Highs):</strong> A "Double Top". Two peaks at the exact same price level.</li>
              <li><strong>EQL (Equal Lows):</strong> A "Double Bottom". Two valleys at the exact same price level.</li>
            </ul>
          </div>

          <h3>The Ultimate Retail Trap</h3>
          <p>Every classic trading book teaches beginners the same thing: "If price hits the same bottom twice, it's a Double Bottom—a strong floor. Buy it and put your stop loss right below it!"</p>
          <p>Because millions of retail traders read the same books, millions of stop losses accumulate directly underneath these Equal Lows (EQL) or above Equal Highs (EQH).</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <p>To an SMC trader, Equal Highs and Lows are not support or resistance. They are a massive glowing target. We expect the price to deliberately crash through that "Double Bottom", hit all the retail stop losses (taking their money), and THEN reverse in the actual intended direction.</p>
        `,
        quiz_bank: [
          {
            question: "When an SMC trader spots a perfect 'Double Bottom' (Equal Lows) forming on the chart, what do they expect to happen?",
            options: [
              "They expect it to act as an unbreakable floor and buy immediately.",
              "They expect price to sweep below those lows to hunt the massive pool of retail stop losses before moving higher.",
              "They expect the market to freeze."
            ],
            correctAnswer: 1
          },
          {
            question: "Why do Equal Highs (EQH) attract price so strongly?",
            options: [
              "Because they are a natural, impenetrable resistance wall.",
              "Because millions of retail traders put their Stop Losses just above them, creating a pool of liquidity.",
              "Because it signifies the end of the trading session."
            ],
            correctAnswer: 1
          },
          {
            question: "If you see a 'Double Top' forming, your SMC mindset should view it as:",
            options: [
              "A guaranteed place to short.",
              "A target (liquidity pool) that will likely be swept before any real drop.",
              "A sign to close your charting software."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "2.3",
        title: "Trendline Liquidity",
        content: `
          <h3>The Diagonal Trap</h3>
          <p>Just like horizontal Equal Highs/Lows, retail traders are taught to draw diagonal Trendlines connecting the lows of an uptrend. They are taught to buy on the "3rd touch" and place their stop loss just below the diagonal line.</p>
          <p>This creates a diagonal slope of resting liquidity. Smart money algorithms are programmed to recognize these retail trendlines. Once enough stop losses are stacked beneath the line, the market will violently crash through the trendline, creating panic, stopping everyone out, tapping into a real institutional orderblock, and then rallying back up.</p>
          <p>Never trust a retail trendline. It is engineered liquidity meant to be swept.</p>
        `,
        quiz_bank: [
          {
            question: "What is the hidden danger of a very clean, obvious upward diagonal trendline with multiple touches?",
            options: [
              "It builds up a massive slope of retail stop losses (Liquidity) beneath it, making it a prime target for institutions to sweep.",
              "It is completely impenetrable and guarantees a safe buy entry.",
              "It proves the market has zero volatility."
            ],
            correctAnswer: 0
          },
          {
            question: "How do institutions often exploit retail trendlines?",
            options: [
              "They ignore them completely.",
              "They crash the price through the trendline to trigger stop losses, fill their orders, and then reverse.",
              "They always bounce price perfectly off the line."
            ],
            correctAnswer: 1
          },
          {
            question: "When a retail trendline is finally broken violently, what is usually the real target for the institutions?",
            options: [
              "To make the price go to zero.",
              "To reach a true, unmitigated POI/Orderblock resting below the trendline.",
              "To trigger a global recession."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "2.4",
        title: "Inducement (IDM - The Bait)",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>IDM (Inducement):</strong> A fake structural point created by the market to bait early buyers/sellers.</li>
              <li><strong>POI (Point of Interest):</strong> The true area (like an Orderblock) where we actually want to trade.</li>
            </ul>
          </div>

          <h3>The Art of Deception</h3>
          <p>Inducement is how the market tricks impatient traders. Imagine a strong uptrend. The market pulls back toward a massive, obvious Orderblock (POI) where everyone wants to buy.</p>
          <p>But before reaching the true Orderblock, the price suddenly stops, creates a small swing low, and starts pushing up. Impatient traders think "Oh no, it's taking off without me!" and they buy early, placing their stop loss under this new, fake swing low.</p>
          <p>This fake swing low is the <strong>Inducement (IDM)</strong>. It was engineered specifically to bait early buyers. Once enough people jump in, the market quickly drops, smashes through the IDM (stopping everyone out), finally taps the REAL Orderblock, and rockets upward.</p>
          <p><strong>Rule:</strong> If you don't spot the inducement, you ARE the inducement.</p>
        `,
        quiz_bank: [
          {
            question: "What is the primary function of an Inducement (IDM) in the market structure?",
            options: [
              "To confirm that a major crash is about to happen.",
              "To bait impatient traders into entering early, creating a pool of stop losses that fuel the real move from the true institutional zone.",
              "To mark the absolute highest point of a trend."
            ],
            correctAnswer: 1
          },
          {
            question: "If you see a strong POI (Orderblock), but there is NO inducement formed before it, what is the risk?",
            options: [
              "There is no risk; it's a 100% win.",
              "Your POI might actually become the inducement itself and get swept.",
              "The market will skip your POI entirely."
            ],
            correctAnswer: 1
          },
          {
            question: "Complete the SMC trader saying: 'If you don't spot the inducement...'",
            options: [
              "...you should buy immediately.",
              "...you are the inducement.",
              "...the trade is invalid."
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  },

  // ==========================================
  // LEVEL 3: ENTRY MODELS & FOOTPRINTS
  // ==========================================
  {
    level: 3,
    title: "Institutional Footprints",
    lessons: [
      {
        id: "3.1",
        title: "Fair Value Gaps (FVG) / Imbalances",
        image_url: "/academy/image_2.jpg",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>FVG (Fair Value Gap):</strong> A gap in price delivery where only one side (buyers or sellers) participated.</li>
              <li><strong>Imbalance / Inefficiency:</strong> Another word for FVG. The market hates these and seeks to fill them.</li>
              <li><strong>Mitigation:</strong> When price returns to a zone to "fill" or "neutralize" an imbalance or orderblock.</li>
            </ul>
          </div>

          <h3>The Price Vacuum</h3>
          <p>Normally, buying and selling is balanced. But when a major news event happens or institutions inject billions, the price moves so violently in one direction that there are literally no opposing orders on the way up/down. This creates an inefficiency, a vacuum in price delivery known as a <strong>Fair Value Gap (FVG)</strong>.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <p><strong>How to spot it:</strong> Look at a 3-candle sequence during a huge drop. If the bottom wick of Candle 1 and the top wick of Candle 3 do not overlap, the empty space between them is the FVG.</p>
          <p><strong>The Magnet Effect:</strong> The market algorithm hates inefficiency. Price is naturally drawn back to this empty space like a magnet to "fill" or "mitigate" the gap before continuing the original strong trend.</p>
        `,
        quiz_bank: [
          {
            question: "What causes a Fair Value Gap (FVG) and how does the market usually treat it?",
            options: [
              "It is caused by zero volume, and the market ignores it completely.",
              "It is caused by violent, one-sided price movement creating an inefficiency, and the market acts like a magnet to pull price back to 'fill' it.",
              "It is a glitch in the trading software that should be reported."
            ],
            correctAnswer: 1
          },
          {
            question: "How many candles do you need to identify a Fair Value Gap?",
            options: [
              "Only 1 giant candle.",
              "A sequence of 3 candles.",
              "At least 5 candles."
            ],
            correctAnswer: 1
          },
          {
            question: "What does it mean to 'mitigate' a Fair Value Gap?",
            options: [
              "To delete the trade from your journal.",
              "When price eventually returns to fill the empty space left by the FVG.",
              "To place a trade inside it."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "3.2",
        title: "Orderblocks (OB)",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>OB (Orderblock):</strong> The last candle before a massive institutional move. Where banks left their orders.</li>
            </ul>
          </div>

          <h3>The Origin of the Impulse</h3>
          <p>An Orderblock is the literal footprint of Smart Money. It is the last opposite-colored candle before a massive impulse move that breaks structure.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <p>For example, before a massive institutional BUY program begins, they will often rapidly sell the market (creating one last red candle) to grab liquidity, and then instantly inject their massive buy orders. That last red candle is the Bullish Orderblock.</p>
          
          <h3>The High-Probability OB Checklist</h3>
          <p>Not every opposite candle is an Orderblock. A true, high-probability OB must have three things:</p>
          <ol>
            <li><strong>It swept liquidity:</strong> The OB candle's wick took out a previous high/low (grabbed stops).</li>
            <li><strong>It caused a Break of Structure (BOS):</strong> The resulting move broke a major structural level.</li>
            <li><strong>It left a Fair Value Gap (FVG):</strong> The move away was so fast it left an imbalance.</li>
          </ol>
          <p>When price eventually pulls back to this specific block, it is "mitigating" the institution's leftover orders. This is where we enter the market.</p>
        `,
        quiz_bank: [
          {
            question: "Which combination of factors makes an Orderblock 'High Probability'?",
            options: [
              "It is simply the biggest, longest candle on your chart.",
              "It swept prior liquidity, caused a valid Break of Structure (BOS), and left behind a Fair Value Gap (FVG).",
              "It sits exactly on a retail diagonal trendline."
            ],
            correctAnswer: 1
          },
          {
            question: "In a bullish scenario, what color is the Orderblock usually?",
            options: [
              "Green (The last up candle before the up move).",
              "Red (The last down candle before the massive institutional up move).",
              "It has no color."
            ],
            correctAnswer: 1
          },
          {
            question: "Why does price often return to a valid Orderblock later on?",
            options: [
              "Because retail traders draw support lines there.",
              "To 'mitigate' or fill the remaining institutional orders that were left behind during the initial fast move.",
              "It's just a coincidence."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "3.3",
        title: "Breaker Blocks & Mitigation Blocks",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Breaker Block:</strong> A failed Orderblock that was broken, but now acts as support/resistance from the other side.</li>
              <li><strong>Mitigation Block:</strong> Similar to a Breaker, but it failed to sweep liquidity before breaking.</li>
            </ul>
          </div>

          <h3>When Orderblocks Fail</h3>
          <p>Trading isn't magic; sometimes valid Orderblocks get smashed right through. But in SMC, a failed Orderblock becomes a powerful new weapon.</p>
          <p>If you have a strong Bearish Orderblock (which was supposed to push price down), but massive bullish volume completely breaks through it and closes above it, that OB has failed. It now becomes a <strong>Breaker Block</strong>.</p>
          <p>Just like classic support turning into resistance, a broken sell block now becomes a buy block. We wait for the price to pull back down TO THAT SAME BROKEN BLOCK from above, and we buy the retest. It flips its polarity.</p>
        `,
        quiz_bank: [
          {
            question: "What happens when a valid Orderblock is completely broken and disrespected by a massive price impulse?",
            options: [
              "The entire market structure is invalidated and trading should stop.",
              "It transforms into a Breaker Block, flipping its polarity (e.g., a broken sell block becomes a support block for buys).",
              "It means the timeframe is too low."
            ],
            correctAnswer: 1
          },
          {
            question: "What is the main difference between a Breaker Block and a Mitigation Block?",
            options: [
              "There is no difference.",
              "A Breaker Block swept liquidity before failing, while a Mitigation Block failed to sweep liquidity.",
              "Breaker Blocks only work on crypto."
            ],
            correctAnswer: 1
          },
          {
            question: "If a Bullish Orderblock (designed for buying) fails and price crashes through it, what does it become?",
            options: [
              "A Bearish Breaker Block (you look to sell when price retests it from below).",
              "A stronger Bullish Orderblock.",
              "A Fair Value Gap."
            ],
            correctAnswer: 0
          }
        ]
      },
      {
        id: "3.4",
        title: "Liquidity Sweeps (Wick Offs)",
        content: `
          <h3>The Fakeout</h3>
          <p>A Liquidity Sweep is the deadliest weapon against retail breakout traders. Price aggressively pushes past a major High or Low. Retail traders see this and scream "BREAKOUT!"—they instantly buy the highs.</p>
          
          <div class="my-6 p-4 bg-black/20 rounded-xl border border-white/10 text-center">
            <p class="text-[10px] text-zinc-500 uppercase tracking-widest"></p>
          </div>

          <p>However, before the candle timer ends, the price violently reverses. The candle <strong>fails to close</strong> past the level. Instead, it leaves a long, nasty wick and the body closes back inside the previous range. </p>
          <p>This tells us the move was purely engineered to grab stop losses and trap breakout traders. A massive reversal in the opposite direction is now highly probable.</p>
        `,
        quiz_bank: [
          {
            question: "How do you visually distinguish a Liquidity Sweep from a true Break of Structure on a candlestick chart?",
            options: [
              "A sweep has a massive, solid body closing far beyond the structural line.",
              "A sweep only pierces the level with a wick, but the candle body closes back inside the previous range.",
              "They look identical; it's just a guess."
            ],
            correctAnswer: 1
          },
          {
            question: "Who is the primary victim of a massive Liquidity Sweep (Fakeout)?",
            options: [
              "Banks and Institutions.",
              "Breakout traders who buy/sell the moment a line is crossed.",
              "Long-term investors."
            ],
            correctAnswer: 1
          },
          {
            question: "When you see a confirmed liquidity sweep on a High Timeframe, what should be your immediate bias?",
            options: [
              "The trend is continuing.",
              "A high-probability reversal in the opposite direction of the sweep.",
              "The market is broken."
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  },

  // ==========================================
  // LEVEL 4: EXECUTION & MASTER PATH
  // ==========================================
  {
    level: 4,
    title: "Execution & Master Path",
    lessons: [
      {
        id: "4.1",
        title: "Multi-Timeframe Analysis (The Top-Down Approach)",
        image_url: "/academy/image_4.jpg",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Bias:</strong> Your overall belief of where the market is going today (Up or Down) based on HTF.</li>
              <li><strong>Top-Down Approach:</strong> Starting your analysis on the Daily/4H chart and zooming all the way down to the 1m chart.</li>
            </ul>
          </div>

          <h3>Putting the Puzzle Together</h3>
          <p>You cannot execute elite trades by looking at just one timeframe. You must tell a story from top to bottom:</p>
          <ol>
            <li><strong>The Map (4-Hour or Daily HTF):</strong> What is the overall trend? Are we bullish or bearish? Where are the massive unmitigated HTF Orderblocks and FVGs?</li>
            <li><strong>The Approach (15-Minute MTF):</strong> As price approaches our 4H Orderblock, how is it moving? Is it building liquidity (Inducement) right before the block?</li>
            <li><strong>The Trigger (1-Minute or 5-Minute LTF):</strong> Price taps the 4H Orderblock. Do we just blindly buy? No. We zoom into the 1m chart and wait for a 1-minute Change of Character (CHoCH) to confirm the institutions are actually defending this zone. THEN we enter.</li>
          </ol>
        `,
        quiz_bank: [
          {
            question: "In the Top-Down Multi-Timeframe (MTF) analysis approach, what is the primary purpose of the High Timeframe (e.g., 4H)?",
            options: [
              "To find surgical 1-pip entries.",
              "To determine the overall market narrative (Bias) and locate major institutional Points of Interest.",
              "To perfectly time a 5-minute scalp trade."
            ],
            correctAnswer: 1
          },
          {
            question: "If your 4H chart is extremely Bearish, but your 5-minute chart is making Higher Highs, what is happening?",
            options: [
              "The trend has fully reversed to Bullish.",
              "The 5-minute chart is just making a temporary pullback (retracement) into a 4H sell zone.",
              "The charts are glitched."
            ],
            correctAnswer: 1
          },
          {
            question: "What is the main danger of analyzing ONLY the 1-minute chart?",
            options: [
              "You will make too much money too fast.",
              "You lose the macro narrative and will likely trade straight into HTF structural traps.",
              "The 1-minute chart is too slow."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "4.2",
        title: "Entry Types: Risk vs. Confirmation",
        content: `
          <h3>How to pull the trigger</h3>
          <p>Once price reaches your Point of Interest (POI), you have two choices for execution:</p>
          <ul>
            <li><strong>Risk Entry:</strong> Placing a Limit Order directly at the edge of the HTF Orderblock. <br><em>Pros:</em> You will never miss a fast trade. <br><em>Cons:</em> Higher risk of a stop-out if the HTF block fails and price keeps crashing.</li>
            <li><strong>Confirmation Entry:</strong> Waiting for price to touch the HTF Orderblock, jumping down to a Lower Timeframe (1m/5m), and waiting for a structural shift (CHoCH) showing buyers stepping in. <br><em>Pros:</em> Much safer, proves the zone is active. <br><em>Cons:</em> Sometimes price taps the zone and rockets away so fast it never gives a LTF confirmation.</li>
          </ul>
        `,
        quiz_bank: [
          {
            question: "Which entry method requires waiting for a Change of Character (CHoCH) on a lower timeframe AFTER the price has already tapped your higher timeframe zone?",
            options: [
              "Risk Entry",
              "Blind Entry",
              "Confirmation Entry"
            ],
            correctAnswer: 2
          },
          {
            question: "What is the main advantage of a Risk Entry?",
            options: [
              "It has a 100% win rate.",
              "You place a limit order, ensuring you catch the trade even if price touches the zone and reverses instantly.",
              "It requires absolutely no analysis."
            ],
            correctAnswer: 1
          },
          {
            question: "What is the drawback of a Confirmation Entry?",
            options: [
              "It is too risky.",
              "If the market moves too violently away from the POI, it might not provide a LTF entry structure, causing you to miss the trade.",
              "It requires a massive account balance."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "4.3",
        title: "Risk Management: The Math of Survival",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>R:R (Risk to Reward Ratio):</strong> How much you risk compared to how much you can win. (e.g. 1:5 means risking $10 to make $50).</li>
              <li><strong>1% Rule:</strong> The golden rule of never risking more than 1% of your account on a single idea.</li>
            </ul>
          </div>

          <h3>Protect the Capital</h3>
          <p>Institutional traders are risk managers first, and traders second. If you risk 50% of your account on a "sure thing", you are gambling. The market owes you nothing.</p>
          <p><strong>The Power of Risk:Reward (R:R):</strong> Because SMC uses Multi-Timeframe analysis, our stop losses are incredibly tight (often just a few pips), while our targets are huge HTF liquidity pools. This creates trades with 1:5 or 1:10 R:R. <br>If you make 5% on a win, and lose 1% on a loss, you can lose 4 trades in a row, win just 1, and still be in profit. This is the secret to elite trading.</p>
        `,
        quiz_bank: [
          {
            question: "According to professional risk management, what is the secret advantage of the high Risk:Reward ratios (e.g., 1:5) achieved through SMC trading?",
            options: [
              "It guarantees you will never lose a trade again.",
              "It allows you to have a relatively low win rate (losing more often than winning) and still remain highly profitable overall.",
              "It forces you to risk 50% of your account to make big money."
            ],
            correctAnswer: 1
          },
          {
            question: "What does the '1% Rule' state?",
            options: [
              "You should only trade 1% of the days in a year.",
              "You should never risk losing more than 1% of your total account equity on any single trade setup.",
              "You should target 1% profit per year."
            ],
            correctAnswer: 1
          },
          {
            question: "If you have a 1:4 Risk to Reward ratio, and you lose 3 trades but win 1, what is your net outcome (assuming 1% risk)?",
            options: [
              "You are down -3%.",
              "You broke even (0%).",
              "You are in profit by +1%."
            ],
            correctAnswer: 2
          }
        ]
      },
      {
        id: "4.4",
        title: "Path Specific Mechanics: Crypto vs. Forex",
        content: `
          <h3>Know Your Beast</h3>
          <p>While SMC works on all charts, each market has its own personality quirks.</p>
          <p><strong>Crypto Market:</strong> Runs 24/7/365. Weekends often feature low-volume, algorithmic manipulation specifically designed to sweep out late retail longs/shorts before the true move happens on Monday. Always track Bitcoin (BTC) dominance, as it dictates the flow of almost all Altcoins.</p>
          <p><strong>Forex & Gold (XAU/USD):</strong> Heavily driven by macroeconomic data. Events like NFP (Non-Farm Payroll) or CPI (Inflation data) are extremely volatile. Amateurs try to guess the news direction. Institutions use the chaotic news volatility as an excuse to aggressively sweep major liquidity pools in seconds, before delivering price to the real, pre-planned objective.</p>
        `,
        quiz_bank: [
          {
            question: "In the Forex and Gold markets, how do Smart Money institutions typically utilize major economic news events like CPI or NFP?",
            options: [
              "They stop trading entirely and go on vacation.",
              "They use the massive volatility to violently sweep liquidity pools, filling their huge orders before sending the market in the true intended direction.",
              "They use it to make the chart freeze."
            ],
            correctAnswer: 1
          },
          {
            question: "What is a common characteristic of Crypto markets during the weekend?",
            options: [
              "The market is closed.",
              "Low-volume, algorithmic manipulation designed to sweep liquidity before the real weekly move begins.",
              "Extremely high volume and predictable trends."
            ],
            correctAnswer: 1
          },
          {
            question: "In the crypto market, what asset dictates the overall flow and sentiment of almost all Altcoins?",
            options: [
              "Ethereum (ETH).",
              "Bitcoin (BTC) and its dominance.",
              "Dogecoin (DOGE)."
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  },

  // ==========================================
  // LEVEL 5: THE ELITE EDGE (Added by AI)
  // ==========================================
  {
    level: 5,
    title: "The Elite Edge",
    lessons: [
      {
        id: "5.1",
        title: "Algorithmic Killzones",
        content: `
          <div class="mb-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs">
            <h4 class="font-black text-blue-400 mb-2 uppercase">Core Vocabulary</h4>
            <ul class="space-y-1">
              <li><strong>Killzone:</strong> Specific hours of the day when algorithmic trading is at its peak and massive liquidity is injected.</li>
              <li><strong>Silver Bullet:</strong> The perfect setup forming exactly inside a Killzone window.</li>
            </ul>
          </div>

          <h3>Time Over Price</h3>
          <p>In the elite tiers of SMC, time is more important than price. Institutions do not trade randomly throughout the day. They have strict algorithms that execute orders at very specific hours. If you try to trade SMC setups outside of these hours, you will face low probability and algorithmic chop.</p>
          
          <h3>Major Killzones (EST Time)</h3>
          <ul>
            <li><strong>London Open Killzone (2:00 AM - 5:00 AM EST):</strong> Often creates the High or Low of the day. Excellent for catching the initial manipulation sweep.</li>
            <li><strong>New York Open Killzone (7:00 AM - 10:00 AM EST):</strong> The highest volume period of the day. Often reverses the London direction or creates a massive continuation impulse.</li>
            <li><strong>London Close Killzone (10:00 AM - 12:00 PM EST):</strong> Used to lock in profits and close daily positions, often causing sharp pullbacks.</li>
          </ul>
          <p><strong>Rule:</strong> If a beautiful Orderblock or FVG appears outside of a Killzone, probability drops significantly. Wait for the algorithm to wake up.</p>
        `,
        quiz_bank: [
          {
            question: "Why do elite traders focus on specific 'Killzones' rather than trading all day?",
            options: [
              "Because those are the only times their brokers are open.",
              "Because time is more important than price, and Killzones represent the hours when institutional algorithms inject massive volume.",
              "Because they need to sleep the rest of the day."
            ],
            correctAnswer: 1
          },
          {
            question: "Which Killzone is historically famous for creating the initial 'Fakeout' (High or Low) of the daily cycle?",
            options: [
              "The New York Open.",
              "The Asian Session.",
              "The London Open Killzone."
            ],
            correctAnswer: 2
          }
        ]
      },
      {
        id: "5.2",
        title: "Wyckoff Schematics: The Macro Cycle",
        image_url: "/academy/image_6.jpg",
        content: `
          <h3>The Blueprint of Market Manipulation</h3>
          <p>Richard Wyckoff mapped out exactly how institutions accumulate (buy) and distribute (sell) assets over long periods. While AMD (Accumulation, Manipulation, Distribution) is the daily cycle, Wyckoff is the macro cycle.</p>

          <h3>The Phases of Accumulation</h3>
          <p>When institutions want to buy a massive amount of an asset, they create a sideways range (Phase A & B) to absorb all retail panic selling. The most important part is the <strong>Spring (Phase C)</strong>.</p>
          <ul>
            <li><strong>The Spring:</strong> This is the ultimate Liquidity Sweep. Price violently crashes below the entire accumulation range, making retail traders believe the asset is going to zero. This triggers massive stop-loss selling, which the institutions instantly buy up.</li>
            <li><strong>Sign of Strength (SOS):</strong> Immediately after the Spring, price rockets back into the range and breaks structure upwards.</li>
          </ul>
          <p>If you can identify the Spring, you are entering the market at the exact same millisecond the smart money has finished loading their bags.</p>
        `,
        quiz_bank: [
          {
            question: "In the Wyckoff Accumulation schematic, what is the 'Spring'?",
            options: [
              "A period of low volume and no movement.",
              "A massive liquidity sweep below the entire trading range, designed to trigger panic selling right before the real upward move.",
              "The final peak before a bear market."
            ],
            correctAnswer: 1
          },
          {
            question: "What happens immediately after a successful Wyckoff Spring?",
            options: [
              "The price drops to zero.",
              "A Sign of Strength (SOS) where price aggressively re-enters the range and breaks structure upwards.",
              "The market consolidates for another year."
            ],
            correctAnswer: 1
          }
        ]
      },
      {
        id: "5.3",
        title: "The Psychology of a Node (Mastery)",
        content: `
          <h3>Conquering the True Enemy</h3>
          <p>You now have the technical tools. You understand Liquidity, Orderblocks, and Killzones. But 90% of your success will rely on managing your own neurochemistry.</p>
          <p>The market is a mirror that reflects your flaws. If you are impatient, the market will take your money. If you have FOMO (Fear Of Missing Out), the market will trap you in a Premium pricing zone.</p>
          
          <h3>The Rules of Elite Nodes</h3>
          <ul>
            <li><strong>Accept the Loss:</strong> You will lose trades. Even the best algorithms lose 40% of the time. Your job is not to win every trade, but to execute your plan flawlessly and let Risk:Reward do the heavy lifting.</li>
            <li><strong>Zero Emotion:</strong> A loss is just business expense. A win is just a mathematical probability playing out. Never revenge trade.</li>
            <li><strong>Patience is a Position:</strong> Being flat (having no open trades) is an active, highly profitable position. Wait for the market to come to your POI. Never chase the price.</li>
          </ul>
          <p>Once you finish this module, you are no longer a beginner. You are a Node in the GainWave network. Protect your capital, wait for the setup, and strike with precision.</p>
        `,
        quiz_bank: [
          {
            question: "What is the professional trader's mindset regarding losing a trade?",
            options: [
              "They immediately open a larger trade to win the money back (Revenge Trading).",
              "They accept it as a normal business expense and a mathematical probability, remaining completely emotionless.",
              "They change their entire strategy after one loss."
            ],
            correctAnswer: 1
          },
          {
            question: "What does the phrase 'Patience is a Position' mean in SMC trading?",
            options: [
              "You should hold losing trades forever until they turn green.",
              "Having no active trades and waiting for the price to reach your exact Point of Interest (POI) is a strategic and profitable choice.",
              "You should only trade once a year."
            ],
            correctAnswer: 1
          }
        ]
      }
    ]
  }
];
