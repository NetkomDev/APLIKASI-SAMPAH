const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("1. Fetching first available Bank Sampah...");
    const { data: bank, error: bankErr } = await supabase.from('bank_sampah_units').select('id, name').limit(1).single();
    if (!bank) {
        console.error("No bank found or error:", bankErr);
        return;
    }
    console.log("Selected Bank ID:", bank.id, "Name:", bank.name);

    console.log("2. Fetching couriers and users...");
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, role');

    // Fallback: Even if they aren't bound to the bank_sampah_id, just grab ANY courier and user
    let kurirs = profiles.filter(u => u.role === 'courier');
    let users = profiles.filter(u => u.role === 'user');

    if (!kurirs.length || !users.length) {
        console.log("Missing couriers or users in DB! Kurirs:", kurirs.length, "Users:", users.length);
        console.log("Let me just fallback to using the first available profiles regardless of role for the dummy data (just to show it works)");
        kurirs = profiles;
        users = profiles;
        if (!profiles.length) {
            console.error("NO PROFILES AT ALL.");
            return;
        }
    }

    console.log("Found Couriers:", kurirs.length, "Users:", users.length);

    console.log("3. Creating a dummy Pickup request...");
    const { data: pickup, error: errPickup } = await supabase.from('pickup_requests').insert({
        user_id: users[0].id,
        kurir_id: kurirs[0].id,
        status: 'completed',
        est_weight: 15
    }).select('id').single();

    if (errPickup) {
        console.error("Error creating pickup:", errPickup);
        return;
    }
    console.log("Pickup created:", pickup.id);

    console.log("4. Inserting Dummy Transactions for Command Center Audit...");
    const { data: transactions, error: errTx } = await supabase.from('transactions').insert([
        {
            pickup_id: pickup.id,
            kurir_id: kurirs[0].id,
            user_id: users[0].id,
            bank_sampah_id: bank.id,
            weight_organic: 4.5,
            weight_inorganic: 8.5,
            courier_sorting_quality: 'Sangat Bersih (Dipilah Mandiri)',
            status: 'menimbang',
            amount_earned: 65000
        },
        {
            pickup_id: pickup.id,
            kurir_id: kurirs[kurirs.length > 1 ? 1 : 0].id,
            user_id: users[users.length > 1 ? 1 : 0].id,
            bank_sampah_id: bank.id,
            weight_organic: 2.0,
            weight_inorganic: 10.0,
            courier_sorting_quality: 'Campur Aduk / Belum Dipilah',
            status: 'antre',
            amount_earned: 45000
        }
    ]).select();

    if (errTx) {
        console.error("Error seeding transactions:", errTx);
    } else {
        console.log("Successfully seeded", transactions?.length, "transactions!");
        console.log(transactions);
    }
}

run();
