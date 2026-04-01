"use server";

import { createClient } from "@supabase/supabase-js";

// Buat client khusus server dengan hak akses Service Role (Bypass RLS)
const getAdminSupabase = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
};

export async function manualRegisterCourier(formData: any, adminId: string) {
    const supabase = getAdminSupabase();

    try {
        // 1. Verifikasi Admin
        const { data: adminProfile } = await supabase
            .from("profiles")
            .select("bank_sampah_id, bank_sampah_name")
            .eq("id", adminId)
            .single();

        if (!adminProfile?.bank_sampah_id) {
            throw new Error("Akses ditolak: Profil admin Bank Sampah tidak valid.");
        }

        // 2. Format Phone Number
        let phone = formData.phone.replace(/\D/g, "");
        if (phone.startsWith("0")) phone = "62" + phone.slice(1);
        if (!phone.startsWith("62")) phone = "62" + phone;

        // 3. Cek apakah user sudah ada
        const { data: existingProfile } = await supabase
            .from("profiles").select("id, courier_status").eq("phone_number", phone).maybeSingle();

        let courierUserId: string;

        if (existingProfile) {
            courierUserId = existingProfile.id;
            if (existingProfile.courier_status === "pending_approval") {
                throw new Error("Nomor ini sudah terdaftar dan menunggu persetujuan.");
            }
            if (existingProfile.courier_status === "active") {
                throw new Error("Kurir dengan nomor telepon ini sudah aktif bekerja.");
            }
        } else {
            // 4. Buat Akun Auth Baru via Admin API
            const email = `wa_${phone}@ecosistemdigital.id`;
            const tempPassword = `BERES-${formData.nik.slice(-4)}-${Date.now().toString(36)}`;

            const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true,
                user_metadata: { full_name: formData.fullName },
            });

            if (authErr) {
                if (authErr.message.includes("already registered")) {
                    throw new Error("Email internal sudah dipakai, tapi tidak ditemukan di profil.");
                } else {
                    throw new Error(`Gagal membuat akun Auth: ${authErr.message}`);
                }
            }
            courierUserId = authData.user.id;
        }

        // 5. Simpan / Perbarui Profil (Bypass RLS)
        const { error: profileErr } = await supabase.from("profiles").upsert({
            id: courierUserId,
            full_name: formData.fullName,
            phone_number: phone,
            address: formData.addressKtp,
            role: "user",
            courier_status: "pending_approval",
        });
        if (profileErr) throw new Error(`Gagal simpan profil: ${profileErr.message}`);

        // 6. Masukkan Lamaran (Bypass RLS insert courier_applications)
        const { error: appErr } = await supabase.from("courier_applications").insert({
            user_id: courierUserId,
            nik: formData.nik,
            full_name: formData.fullName,
            birth_place: formData.birthPlace || "-",
            birth_date: formData.birthDate || new Date().toISOString().split("T")[0],
            address_ktp: formData.addressKtp || "-",
            phone_number: phone,
            vehicle_type: formData.vehicleType,
            vehicle_plate: formData.vehiclePlate || null,
            preferred_zone: adminProfile.bank_sampah_name || "",
            target_bank_sampah_id: adminProfile.bank_sampah_id,
            ktp_photo_url: "",
            status: "pending",
            source: "offline",
        });

        if (appErr) throw new Error(`Gagal simpan dokumen pendaftaran: ${appErr.message}`);

        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Unknown error occurred during manual registration" };
    }
}
