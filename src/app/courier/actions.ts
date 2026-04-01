"use server";

import { createClient } from "@supabase/supabase-js";

// Menggunakan Service Role Key untuk bypass RLS (Row Level Security).
// Karena Kurir perlu mencari Profil Warga, yang secara RLS mungkin dibatasi.
export async function searchWargaForPickup(queryCode: string) {
    if (!queryCode) return { data: null, error: "Kode / Nama kosong." };

    const sanitized = queryCode.replace(/[,()]/g, "").trim();
    if (!sanitized) return { data: null, error: "Kode tidak valid." };

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitized);

    try {
        let profile = null;

        // Jika berbentuk UUID, maka prioritaskan pencarian QR by ID Warga
        if (isUUID) {
            const { data } = await supabase
                .from("profiles")
                .select("id, full_name, phone_number, address, bank_sampah_id")
                .eq("id", sanitized)
                .eq("role", "user")
                .maybeSingle();
            
            profile = data;
        }

        // Jika bukan UUID (atau UUID tidak ketemu), fallback ke pencarian by Name
        if (!profile) {
            const { data } = await supabase
                .from("profiles")
                .select("id, full_name, phone_number, address, bank_sampah_id")
                .eq("role", "user")
                .ilike("full_name", `%${sanitized}%`)
                .limit(1)
                .maybeSingle();
            
            profile = data;
        }

        if (!profile) {
            return { data: null, error: "Warga tidak ditemukan" };
        }

        return { data: profile, error: null };
    } catch (err: any) {
        return { data: null, error: err.message || "Terjadi kesalahan internal" };
    }
}

// Auto-link warga to courier's bank sampah if not already linked
export async function linkWargaToBankSampah(wargaId: string, courierBankSampahId: string | null, courierBankSampahName: string | null) {
    if (!wargaId || !courierBankSampahId) return;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Only update if warga doesn't already have a bank_sampah_id
        await supabase
            .from("profiles")
            .update({
                bank_sampah_id: courierBankSampahId,
                bank_sampah_name: courierBankSampahName,
            })
            .eq("id", wargaId)
            .eq("role", "user")
            .is("bank_sampah_id", null);
    } catch (_) {
        // Silent fail — non-critical operation
    }
}
