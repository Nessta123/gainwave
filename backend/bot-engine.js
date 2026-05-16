require('dotenv').config({ path: '../.env' });
const ccxt = require('ccxt');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const exchanges = {
    binance: new ccxt.binance(),
    bybit: new ccxt.bybit(),
    okx: new ccxt.okx(),
    kucoin: new ccxt.kucoin(),
    kraken: new ccxt.kraken()
};

async function tickBots() {
    try {
        // Pridobimo tekoče bote
        const { data: bots, error } = await supabase.from('trading_bots').select('*').eq('status', 'running');
        if (error) throw error;
        if (!bots || bots.length === 0) return;

        for (const bot of bots) {
            try {
                const exchangeName = bot.exchange ? bot.exchange.toLowerCase() : 'binance';
                const exchange = exchanges[exchangeName] || exchanges.binance;
                
                let symbol = bot.symbol.toUpperCase();
                if (!symbol.includes('/')) {
                    if (symbol.endsWith('USDT')) symbol = symbol.replace('USDT', '/USDT');
                    else if (symbol.endsWith('USD')) symbol = symbol.replace('USD', '/USD');
                    else symbol = symbol + '/USDT'; 
                }
                
                const ticker = await exchange.fetchTicker(symbol);
                const currentPrice = ticker.last;

                if (!currentPrice) continue;

                // 🔥 1. SAFETY CHECKS (Stop Loss / Take Profit)
                // Pretvori v Number za varno primerjavo
                const sl = bot.stop_loss ? Number(bot.stop_loss) : null;
                const tp = bot.take_profit ? Number(bot.take_profit) : null;

                let stopBot = false;
                let stopReason = "";

                if (sl && currentPrice <= sl) {
                    stopBot = true;
                    stopReason = "Stop Loss";
                } else if (tp && currentPrice >= tp) {
                    stopBot = true;
                    stopReason = "Take Profit";
                }

                if (stopBot) {
                    console.log(`🛑 [${bot.symbol}] ${stopReason} Triggered @ $${currentPrice.toFixed(2)}. Halting.`);
                    await supabase.from('trading_bots').update({ status: 'stopped', last_price: currentPrice }).eq('id', bot.id);

                    if (bot.user_id) {
                        const { data: profile } = await supabase.from('profiles').select('alias').eq('id', bot.user_id).single();
                        if (profile?.alias) {
                            await fetch('https://www.gain-wave.com/api/send-push', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    title: `🛑 Node Halted: ${bot.symbol}`,
                                    body: `${stopReason} reached at $${currentPrice.toFixed(2)}. Bot automatically stopped for safety.`,
                                    targetAlias: profile.alias,
                                    url: '/'
                                })
                            });
                        }
                    }
                    continue; 
                }

                // 🔥 2. SMART GRID LOGIC
                let profitToAdd = 0;
                let actionStr = "";
                const prevPrice = bot.last_price ? Number(bot.last_price) : null;

                if (prevPrice !== null && prevPrice !== currentPrice) {
                    const step = (bot.upper_limit - bot.lower_limit) / (bot.grids - 1);
                    
                    // Preverimo vsako linijo v mrežo
                    for (let i = 0; i < bot.grids; i++) {
                        const levelPrice = bot.lower_limit + (step * i);

                        // Preveri cross UP (Sell) ali cross DOWN (Buy)
                        const crossedUp = prevPrice < levelPrice && currentPrice >= levelPrice;
                        const crossedDown = prevPrice > levelPrice && currentPrice <= levelPrice;

                        if (crossedUp || crossedDown) {
                            profitToAdd += (bot.amount_per_grid / bot.grids) * 0.002; 
                            actionStr = crossedUp ? 'SELL' : 'BUY';
                            console.log(`🤖 [${bot.symbol}] Grid ${actionStr} @ $${levelPrice.toFixed(2)} | Profit: +$${profitToAdd.toFixed(4)}`);
                        }
                    }
                }

                // 🔥 3. DATABASE UPDATE
                if (profitToAdd > 0 || prevPrice !== currentPrice) {
                    const newTotalProfit = Number(bot.total_profit || 0) + profitToAdd;
                    
                    // Posodobimo bazo - vedno prepišemo zadnjo ceno in skupni profit
                    await supabase.from('trading_bots').update({
                        last_price: currentPrice,
                        total_profit: newTotalProfit
                    }).eq('id', bot.id);

                    // Pošljemo push obvestilo samo ob dejanskem tradu
                    if (profitToAdd > 0 && bot.user_id) {
                        const { data: profile } = await supabase.from('profiles').select('alias').eq('id', bot.user_id).single();
                        if (profile?.alias) {
                            try {
                                await fetch('https://www.gain-wave.com/api/send-push', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        title: `🤖 Trade Executed [${bot.symbol}]`,
                                        body: `Grid profit: +$${profitToAdd.toFixed(2)} (Total: $${newTotalProfit.toFixed(2)})`,
                                        targetAlias: profile.alias,
                                        url: '/'
                                    })
                                });
                            } catch (e) { /* push failed silently */ }
                        }
                    }
                }
            } catch (botErr) {
                console.error(`⚠️ Error with bot ${bot.symbol}:`, botErr.message);
            }
        }
    } catch (err) {
        console.error("🔥 Engine Tick Error:", err.message);
    }
}

console.log("🚀 GainWave Bot Engine Started & Listening...");
setInterval(tickBots, 3000);
