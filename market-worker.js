require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' }); // Fallback
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Inicializacija Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Uporabimo SERVICE_ROLE_KEY če obstaja (za full access), drugače pa navaden ključ
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Manjkajo Supabase ključi v .env datoteki!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Vsi pari, ki jih podpiramo na platformi
const PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "ADAUSDT", 
    "AVAXUSDT", "DOGEUSDT", "DOTUSDT", "LINKUSDT", "MATICUSDT", "PEPEUSDT", 
    "SHIBUSDT", "LTCUSDT", "NEARUSDT", "TIAUSDT", "INJUSDT", "OPUSDT", 
    "ARBUSDT", "APTUSDT", "RNDRUSDT", "SUIUSDT"
];

let currentPrices = {};

function startWebsocket() {
    const streams = PAIRS.map(p => p.toLowerCase() + '@ticker').join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

    ws.on('open', () => console.log('✅ GainWave Market Bot povezan na Binance WS...'));
    
    ws.on('message', (data) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.s && parsed.c) {
                currentPrices[parsed.s] = parseFloat(parsed.c);
            }
        } catch (e) {}
    });

    ws.on('close', () => {
        console.log('❌ Binance WS zaprt. Ponovni zagon čez 5 sekund...');
        setTimeout(startWebsocket, 5000);
    });

    ws.on('error', (err) => {
        console.error('⚠️ WS Napaka:', err.message);
        ws.close();
    });
}

// Zaženi povezavo z Binance
startWebsocket();

// Vsakih 5 sekund pošlji cene v Supabase in pokliči Sodnika
setInterval(async () => {
    const pricesToUpdate = [];
    
    for (const [symbol, price] of Object.entries(currentPrices)) {
        if (price > 0) {
            pricesToUpdate.push({
                pair: symbol.replace('USDT', '/USD'),
                price: Number(price.toFixed(4)),
                updated_at: new Date().toISOString()
            });
        }
    }

    if (pricesToUpdate.length > 0) {
        // 1. Zapiši v bazo
        const { error } = await supabase.from('market_prices').upsert(pricesToUpdate);
        if (error) {
            console.error("❌ Napaka pri pisanju v bazo:", error.message);
        } else {
            console.log(`✅ Baza posodobljena: ${pricesToUpdate.length} parov.`);
        }

        // 2. Pokliči lokalnega API Sodnika
        try {
            // Kliče lokalni Next.js API, ker oba tečeta na istem serverju
            const res = await fetch('http://localhost:3000/api/judge');
            if (res.ok) {
                const data = await res.json();
                if (data.processed && data.processed > 0) {
                    console.log(`⚖️ Sodnik obdelal ${data.processed} sprememb signalov!`);
                }
            }
        } catch (err) {
            console.error("❌ Napaka pri klicu Sodnika:", err.message);
        }
    }
}, 5000); // <-- ČASOVNI INTERVAL (Vsakih 5 sekund)
