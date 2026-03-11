require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Seeding Market data...");
    
    // Add missing outbound categories to commodity_prices based on the original request
    const missingOutbound = [
        { name: "Plastik Daur Ulang", category: "processed", trade_type: "sell_to_market", unit: "kg", price_per_kg: 8000, is_active: true },
        { name: "Kertas / Kardus Press", category: "processed", trade_type: "sell_to_market", unit: "kg", price_per_kg: 3000, is_active: true },
        { name: "Beling / Botol Kaca", category: "processed", trade_type: "sell_to_market", unit: "kg", price_per_kg: 1000, is_active: true },
        { name: "Besi / Logam", category: "processed", trade_type: "sell_to_market", unit: "kg", price_per_kg: 5000, is_active: true }
    ];

    for (const item of missingOutbound) {
        const { data: existing } = await supabase.from('commodity_prices').select('id').eq('name', item.name).single();
        if (!existing) {
            console.log(`Menambahkan: ${item.name}`);
            await supabase.from('commodity_prices').insert([item]);
        } else {
            console.log(`Sudah ada: ${item.name}`);
        }
    }

    console.log("Selesai menambhkan market data tambahan.");
}

main().catch(console.error);
