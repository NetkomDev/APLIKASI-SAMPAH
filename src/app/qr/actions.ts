"use server";

import { createClient } from "@supabase/supabase-js";

export async function getWargaProfile(id: string) {
    if (!id) return { data: null, error: "ID tidak valid" };
    
    // Gunakan Service Role Key agar bisa diakses secara publik (Shareable Link via WA)
    // UUID (id) dianggap sebagai public key yang unik sehingga aman untuk dibagikan khusus Warga ybs.
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, phone_number, address, bank_sampah_name, role")
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error("Warga tidak ditemukan.");

        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err.message || "Gagal memuat profil warga" };
    }
}
