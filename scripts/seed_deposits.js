const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("1. Fetching first available Bank Sampah...");
    const { data: bank, error: bankErr } = await supabase.from('bank_sampah_units').select('id, name').limit(1).single();
    if (!bank) return console.error("No bank found or error:", bankErr);

    console.log("2. Fetching couriers...");
    const { data: profs } = await supabase.from('profiles').select('id, role');
    let kurirs = profs.filter(u => u.role === 'courier');
    if (!kurirs.length) kurirs = profs; // fallback

    console.log("3. Inserting Dummy Courier Deposits (Manifest Bulk)...");
    const { data: deposits, error: depErr } = await supabase.from('courier_deposits').insert([
        {
            kurir_id: kurirs[0].id,
            bank_sampah_id: bank.id,
            total_organic_claimed: 24.5,
            total_inorganic_claimed: 15.2,
            status: 'pending_audit'
        },
        {
            kurir_id: kurirs[kurirs.length > 1 ? 1 : 0].id,
            bank_sampah_id: bank.id,
            total_organic_claimed: 5.0,
            total_inorganic_claimed: 34.0,
            status: 'pending_audit'
        }
    ]).select();

    if (depErr) console.error("Error seeding deposits:", depErr);
    else console.log("Successfully seeded", deposits?.length, "manifests!");
}

run();
