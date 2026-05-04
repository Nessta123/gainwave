require('dotenv').config({ path: '../.env' });
const ccxt = require('ccxt');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function processCopyTrades() {
    try {
        // 1. Pridobimo samo pending trade
        const { data: pendingTrades, error: tradesError } = await supabase
            .from('copied_trades')
            .select('*')
            .eq('status', 'pending');

        if (tradesError) throw tradesError;
        if (!pendingTrades || pendingTrades.length === 0) return;

        console.log(`📡 Found ${pendingTrades.length} pending orders. Processing...`);

        for (const trade of pendingTrades) {
            try {
                // 2. Ločeno pridobimo profil copierja (brez JOIN-a)
                const { data: prof, error: profError } = await supabase
                    .from('profiles')
                    .select('exchange_name, api_key, api_secret, api_passphrase')
                    .eq('id', trade.copier_id)
                    .single();

                if (profError || !prof || !prof.api_key) {
                    throw new Error(`Profile keys not found for user ${trade.copier_id}`);
                }

                // 3. CCXT Setup
                const exchangeId = prof.exchange_name ? prof.exchange_name.toLowerCase() : 'binance';
                const exchange = new ccxt[exchangeId]({
                    apiKey: prof.api_key,
                    secret: prof.api_secret,
                    password: prof.api_passphrase,
                    enableRateLimit: true,
                    options: { defaultType: 'spot' }
                });

                let symbol = trade.pair.toUpperCase();
                if (!symbol.includes('/')) symbol = symbol + '/USDT';
                symbol = symbol.replace('/USD', '/USDT');

                const ticker = await exchange.fetchTicker(symbol);
                const currentPrice = ticker.last;

                let amount = 0;
                if (trade.risk_type === 'fixed') {
                    amount = Number(trade.risk_value);
                } else {
                    const balance = await exchange.fetchBalance();
                    const freeUsdt = balance.USDT ? balance.USDT.free : 0;
                    const dollarRisk = freeUsdt * (Number(trade.risk_value) / 100);
                    amount = dollarRisk / currentPrice;
                }

                if (amount <= 0) throw new Error("Balance insufficient for risk calculation.");

                const side = (trade.direction === 'LONG' || trade.direction === 'long' || trade.direction === 'BULLISH') ? 'buy' : 'sell';

                console.log(`⚡ [EXECUTE] ${side.toUpperCase()} ${symbol} | Amount: ${amount.toFixed(4)}`);
                
                const order = await exchange.createMarketOrder(symbol, side, amount);

                // 4. Update statusa
                await supabase.from('copied_trades').update({
                    status: 'open',
                    entry_price: order.average || currentPrice,
                    error_log: `Executed Order ID: ${order.id}`
                }).eq('id', trade.id);

                console.log(`✅ Success for copier ${trade.copier_id}`);

            } catch (err) {
                console.error(`❌ Trade failed: ${err.message}`);
                await supabase.from('copied_trades').update({
                    status: 'failed',
                    error_log: err.message
                }).eq('id', trade.id);
            }
        }
    } catch (globalErr) {
        console.error("🔥 Global Engine Error:", globalErr.message);
    }
}

console.log("🚀 BULLETPROOF Copy Engine Active...");
setInterval(processCopyTrades, 3000);
