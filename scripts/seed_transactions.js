const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching profiles and bank_sampah_units...");

    // Find the bank_sampah_id for BANK SAMPAH PALAKKA (or any)
    const { data: bank } = await supabase.from('bank_sampah_units').select('id, name').limit(1).single();
    if (!bank) return console.log("No bank found");

    const { data: users } = await supabase.from('profiles').select('id, role').eq('bank_sampah_id', bank.id);
    const kurirs = users.filter(u => u.role === 'courier');
    const simpleUsers = users.filter(u => u.role === 'user');

    if (!kurirs.length || !simpleUsers.length) return console.log("Missing couriers or users");

    // create a fake pickup
    const { data: pickup, error: errPickup } = await supabase.from('pickups').insert({
        user_id: simpleUsers[0].id,
        kurir_id: kurirs[0].id,
        status: 'completed',
        weight_estimate: 10,
        pickup_address: 'Jl. Test No.123',
        scheduled_date: new Date().toISOString()
    }).select('id').single();

    if (errPickup) return console.log("Err pickup:", errPickup);

    console.log("Inserting dummy transaction pending...");
    const { error: errTx } = await supabase.from('transactions').insert([
        {
            pickup_id: pickup.id,
            kurir_id: kurirs[0].id,
            user_id: simpleUsers[0].id,
            bank_sampah_id: bank.id,
            weight_organic: 4.5,
            weight_inorganic: 5.5,
            courier_sorting_quality: 'Sangat Bersih (Dipilah Mandiri)',
            status: 'menimbang',
            amount_earned: 50000
        },
        {
            pickup_id: pickup.id,
            kurir_id: kurirs[0].id,
            user_id: simpleUsers[1] ? simpleUsers[1].id : simpleUsers[0].id,
            bank_sampah_id: bank.id,
            weight_organic: 0,
            weight_inorganic: 12.0,
            courier_sorting_quality: 'Campur Aduk',
            status: 'antre',
            amount_earned: 45000
        }
    ]);

    if (errTx) console.log("Err tx:", errTx);
    else console.log("Transaction seeded!");
}

run();
