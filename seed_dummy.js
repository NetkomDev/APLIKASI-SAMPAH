import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Initialize Supabase. Use service_role_key if possible to bypass RLS and create users
const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
    console.log("Seeding dummy data...")

    // Bank Sampah T. Riattang (from the admin's view in the screenshot)
    const bankSampahId = "8027333b-021e-49f8-a783-2134e6d5a292"
    
    const dummyUsers = [
        { email: 'dummy_user1@example.com', name: 'Siti Rahma', phone: '81234560001', role: 'user', address: 'Jl. Ahmad Yani No 12' },
        { email: 'dummy_user2@example.com', name: 'Budi Santoso', phone: '81234560002', role: 'user', address: 'Komp. Beringin Indah Blok C2' },
        { email: 'dummy_user3@example.com', name: 'Andi Mappanyukki', phone: '81234560003', role: 'user', address: 'Jl. Besse Kajuara' },
        { email: 'dummy_user4@example.com', name: 'Wahyu Hidayat', phone: '81234560004', role: 'user', address: 'Jl. Veteran
// Initialize Supab: 'dummy_user5@example.com', name: 'Fitri Handayani', phone: '81234560005', role: 'uconst supabase =Komp. Unhas Bone' },
        
        { email: 'dummy_courier1@example.com', name: 'Joko Anwar', phone: '81234560006', role: 'courier', status: 'active', vehicle: 'motor', plate: 'DD 4455 XY', code: 'KUR-1001' },
        { email: 'dummy_courier2@example.com', name: 'Rian Dmasiv', phone: '81234560007', role: 'courier', status: 'active', vehicle: 'mobil_pickup', plate: 'DW 8877 LL', code: 'KUR-1002' },
        { email: 'dummy_courier3@example.com', name: 'Agus Salim', phone: '81234560008', role: 'courier', status: 'pending_approval', vehicle: 'gerobak', plate: null, code: null },
        { email: 'dummy_courier4@example.com', name: 'Ahmad Kurir', phone: '81234560009', role: 'courier', status: 'active', vehicle: 'motor', plate: 'DD 821 KA', code: 'KUR-1003' },
    ]

    for (const d of dummyUsers) {
        // Try sign up first
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: d.email,
            password: 'password123',
            options: {
                data: { full_name: d.name }
            }
        })
        
        if (authError || !authData?.user) {
            console.error('Failed to create user:', d.email, authError?.message)
            continue
        }
        
        const userId = authData.user.id

        // Create profile
        const { error: profError } = await supabase.from('profiles').update({
            full_name: d.name,
            phone_number: d.phone,
            role: d.role,
            address: d.address || null,
            bank_sampah_id: bankSampahId,
            achievement_points: d.role === 'user' ? Math.floor(Math.random() * 500) : null,
            courier_status: d.status || null,
            courier_id_code: d.code || null,
            vehicle_type: d.vehicle || null,
            vehicle_plate: d.plate || null,
            is_online: d.status === 'active' ? (Math.random() > 0.5) : false
        }).eq('id', userId)
        
        if (profError) {
             console.error('Failed to update profile:', profError.message)
             continue
        }

        // Create wallet
        await supabase.from('user_wallets').upsert({
            user_id: userId,
            balance: d.role === 'user' ? Math.floor(Math.random() * 100000) : 0
        })

        console.log(`Created ${d.role} ${d.name}`)
    }
    console.log("Done seed")
}

seed()
