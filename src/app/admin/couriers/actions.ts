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
            selfie_ktp_url: "",
            sim_photo_url: "",
            status: "pending",
            source: "offline",
        });

        if (appErr) throw new Error(`Gagal simpan dokumen pendaftaran: ${appErr.message}`);

        return { success: true };
    } catch (e: any) {
        return { error: e.message || "Unknown error occurred during manual registration" };
    }
}

export async function approveCourierAction(appId: string, adminId: string) {
    const supabase = getAdminSupabase();

    try {
        // 1. Get Application
        const { data: application } = await supabase
            .from("courier_applications")
            .select("*")
            .eq("id", appId)
            .single();

        if (!application) throw new Error("Aplikasi pendaftaran tidak ditemukan.");

        // 2. Get Admin & Generate Code
        const { data: adminProfile } = await supabase
            .from("profiles")
            .select("bank_sampah_id, bank_sampah_name")
            .eq("id", adminId).single();

        if (!adminProfile?.bank_sampah_id) throw new Error("Akses ditolak: Admin tidak valid.");

        // 3. Generate Courier Code
        const { data: codeResult } = await supabase.rpc("generate_courier_id_code");
        const courierCode = codeResult || `KUR-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

        // 4. Update Application Status
        const { error: appErr } = await supabase
            .from("courier_applications")
            .update({
                status: "approved",
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
                courier_id_code: courierCode,
            })
            .eq("id", appId);

        if (appErr) throw appErr;

        // 5. Upgrade Profile
        const { error: profileErr } = await supabase
            .from("profiles")
            .update({
                role: "courier",
                courier_status: "active",
                courier_id_code: courierCode,
                vehicle_type: application.vehicle_type,
                vehicle_plate: application.vehicle_plate,
                preferred_zone: application.preferred_zone,
                is_online: false,
                bank_sampah_id: adminProfile.bank_sampah_id,
                bank_sampah_name: adminProfile.bank_sampah_name
            })
            .eq("id", application.user_id);

        if (profileErr) throw profileErr;

        // 6. Create Wallet
        await supabase
            .from("user_wallets")
            .upsert({ user_id: application.user_id, balance: 0 }, { onConflict: "user_id" });

        // 7. WA Notification integration (using official Meta Cloud API)
        let waStatus = "WA Notification Attempted";
        try {
            const { data: configs } = await supabase.from('system_settings').select('key_name, value_text').in('key_name', ['wa_api_token', 'wa_phone_number_id']);
            
            const token = configs?.find(c => c.key_name === 'wa_api_token')?.value_text;
            const phoneId = configs?.find(c => c.key_name === 'wa_phone_number_id')?.value_text;

            if (token && phoneId) {
                let phoneWa = application.phone_number;
                if (phoneWa.startsWith("0")) phoneWa = "62" + phoneWa.slice(1);

                const messageLines = [
                    "*SELAMAT! PENDAFTARAN KURIR DITERIMA* 🚀",
                    "",
                    `Halo ${application.full_name}, pendaftaran Anda sebagai Kurir/Mitra Jemput di *${adminProfile.bank_sampah_name}* telah disetujui.`,
                    "",
                    `*ID KURIR:* ${courierCode}`,
                    `*ARMADA:* ${application.vehicle_type?.toUpperCase() || "TIDAK DIKETAHUI"}`,
                    "",
                    "Silakan langsung mulai bekerja dengan menekan tombol *Mulai Jemput Sampah* di Dashboard Kurir Anda.",
                    "",
                    "🔗 *Login Dashboard:* https://beres-bone.vercel.app/courier"
                ];
                const message = messageLines.join("\n");
                
                const waRes = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: phoneWa,
                        type: "text",
                        text: { preview_url: false, body: message }
                    })
                });

                const waData = await waRes.json();
                if (waData.error) {
                    console.error("[WA Notif Error]", JSON.stringify(waData.error));
                    waStatus = `Failed from Meta: ${waData.error.message || JSON.stringify(waData.error)}`;
                } else {
                    console.log("[WA Notif OK]", JSON.stringify(waData));
                    waStatus = "Success";
                }
            } else {
                console.error("[WA Notif] Missing token or phoneId in system_settings");
                waStatus = "Failed: Missing token or phoneId in Database";
            }
        } catch (waErr: any) {
            console.error("Failed to send WA Notification", waErr);
            waStatus = `Exception: ${waErr.message}`;
        }

        return { success: true, waStatus };
    } catch (e: any) {
        return { error: e.message || "Unknown error occurred during approval" };
    }
}
