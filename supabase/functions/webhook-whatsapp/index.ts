// Follow this setup guide to connect the Fonnte Webhook to this edge function.
// URL to enter in Fonnte Dashboard: https://icyirbezrmixxkzzrufq.supabase.co/functions/v1/webhook-whatsapp

import { serve } from "std/http/server.ts";
import { createClient } from "supabase";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
    // We only accept POST requests from Fonnte
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = await req.json();

        // 1. Fonnte typically sends the sender's phone and their message text
        const senderRaw = body.sender || "";
        const message = body.message?.trim().toLowerCase() || "";

        // Clean up Fonnte sender number (Sometimes it comes with @c.us or leading 62)
        const senderSanitized = senderRaw.replace(/\@c\.us$/, "");

        // 2. Check if this phone number exists in our 'profiles' table
        const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('phone_number', senderSanitized)
            .single();

        if (!userProfile) {
            // Logic for UNREGISTERED user
            return new Response(JSON.stringify({
                reply: "Halo! Nomor Anda belum terdaftar di Sistem Beres | Benahi Residu Sampah. Silakan daftar via Aplikasi Web terlebih dahulu."
            }), { headers: { "Content-Type": "application/json" } });
        }

        // 3. Simple Intent Engine via WhatsApp Text
        let replyText = "";

        switch (message) {
            case "saldo":
            case "cek saldo":
                // Fetch wallet balance
                const { data: wallet } = await supabase
                    .from('user_wallets')
                    .select('balance')
                    .eq('user_id', userProfile.id)
                    .single();

                replyText = `Halo ${userProfile.full_name}, Saldo Anda saat ini adalah: Rp ${wallet?.balance || 0}.`;
                break;

            case "jemput":
            case "request jemput":
                if (userProfile.role !== 'user') {
                    replyText = "Maaf, fitur 'Jemput' hanya untuk warga.";
                    break;
                }

                // Insert a new pickup request
                const { error: pickupError } = await supabase
                    .from('pickup_requests')
                    .insert([{ user_id: userProfile.id, status: 'pending' }]);

                if (pickupError) {
                    replyText = "Gagal membuat tiket penjemputan. Coba lagi nanti.";
                } else {
                    replyText = `Tiket penjemputan berhasil dibuat. Segera, Kurir kami akan merespon permintaan Anda!`;
                }
                break;

            default:
                replyText = `Selamat datang kembali, ${userProfile.full_name}!\n\nKetik:\n👉 *SALDO* untuk Cek Uang\n👉 *JEMPUT* untuk panggil Kurir\n👉 *PROFIL* untuk akses Web Anda.`;
        }

        return new Response(JSON.stringify({ reply: replyText }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Error processing webhook:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
