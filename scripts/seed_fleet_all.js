const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Seeding dummy data for ALL active branches...");

    const { data: banks } = await supabase.from('bank_sampah_units').select('id, name').eq('is_active', true);
    if (!banks || banks.length === 0) {
        console.error("No active Bank Sampah found");
        return;
    }

    for (let i = 0; i < banks.length; i++) {
        const bank = banks[i];
        const bankSampahId = bank.id;
        console.log(`\n--- Seeding for ${bank.name} ---`);

        const prefix = `b${i}_`;

        const dummyUsers = [
            { email: `${prefix}user1@example.com`, name: `Siti Rahma (${bank.name})`, phone: `8123456${i}001`, role: 'user', address: 'Jl. Ahmad Yani No 12' },
            { email: `${prefix}user2@example.com`, name: `Budi Santoso (${bank.name})`, phone: `8123456${i}002`, role: 'user', address: 'Komp. Beringin Indah Blok C2' },
            { email: `${prefix}user3@example.com`, name: `Andi Mappanyukki (${bank.name})`, phone: `8123456${i}003`, role: 'user', address: 'Jl. Besse Kajuara' },
            { email: `${prefix}user4@example.com`, name: `Wahyu Hidayat (${bank.name})`, phone: `8123456${i}004`, role: 'user', address: 'Jl. Veteran' },
            { email: `${prefix}user5@example.com`, name: `Fitri Handayani (${bank.name})`, phone: `8123456${i}005`, role: 'user', address: 'Komp. Unhas Bone' },

            { email: `${prefix}courier1@example.com`, name: `Joko Anwar (${bank.name})`, phone: `8123456${i}006`, role: 'courier', status: 'active', vehicle: 'motor', plate: 'DD 4455 XY', code: `KUR-${i}001` },
            { email: `${prefix}courier2@example.com`, name: `Rian Dmasiv (${bank.name})`, phone: `8123456${i}007`, role: 'courier', status: 'active', vehicle: 'mobil_pickup', plate: 'DW 8877 LL', code: `KUR-${i}002` },
            { email: `${prefix}courier3@example.com`, name: `Agus Salim (${bank.name})`, phone: `8123456${i}008`, role: 'courier', status: 'pending', vehicle: 'gerobak', plate: null, code: null },
            { email: `${prefix}courier4@example.com`, name: `Ahmad Kurir (${bank.name})`, phone: `8123456${i}009`, role: 'courier', status: 'active', vehicle: 'motor', plate: 'DD 821 KA', code: `KUR-${i}003` },
        ];

        for (const d of dummyUsers) {
            // Use supabase.auth.admin to create user without constraints
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: d.email,
                password: 'password123',
                email_confirm: true,
                user_metadata: { full_name: d.name }
            });

            let userId = authData?.user?.id;

            if (authError || !authData?.user) {
                // Probably already exists
                const { data: existingUser } = await supabase.auth.admin.listUsers();
                const u = existingUser?.users?.find(u => u.email === d.email);
                if (u) {
                    userId = u.id;
                } else {
                    console.error('Failed to create user:', d.email, authError?.message);
                    continue;
                }
            }

            // Create profile
            const { error: profError } = await supabase.from('profiles').update({
                full_name: d.name,
                phone_number: d.phone,
                role: d.role,
                address: d.address || null,
                bank_sampah_id: bankSampahId,
                achievement_points: d.role === 'user' ? Math.floor(Math.random() * 500) : 0,
                courier_status: d.status || null,
                courier_id_code: d.code || null,
                vehicle_type: d.vehicle || null,
                vehicle_plate: d.plate || null,
                is_online: d.status === 'active' ? (Math.random() > 0.5) : false
            }).eq('id', userId);

            if (profError) {
                console.error('Failed to update profile:', profError.message);
                continue;
            }

            // Create wallet
            await supabase.from('user_wallets').upsert({
                user_id: userId,
                balance: d.role === 'user' ? Math.floor(Math.random() * 100000) : 0
            });

            console.log(`Created ${d.role} ${d.name}`);
        }
    }
    console.log("Done seed");
}

seed();
