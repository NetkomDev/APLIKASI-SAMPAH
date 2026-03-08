require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let systemSettings = {};
let botMenus = [];
const registrationSessions = {};

const rateLimiter = {};
const MAX_MSGS_PER_USER_PER_DAY = 30;
let globalDailyMsgCount = 0;
let globalDailyResetAt = Date.now() + 86400000;
const MAX_GLOBAL_MSGS_PER_DAY = 200;

function isRateLimited(phoneNumber) {
    const now = Date.now();
    if (now > globalDailyResetAt) {
        globalDailyMsgCount = 0;
        globalDailyResetAt = now + 86400000;
    }
    if (globalDailyMsgCount >= MAX_GLOBAL_MSGS_PER_DAY) {
        return true;
    }
    if (!rateLimiter[phoneNumber] || now > rateLimiter[phoneNumber].resetAt) {
        rateLimiter[phoneNumber] = { count: 0, resetAt: now + 86400000 };
    }
    if (rateLimiter[phoneNumber].count >= MAX_MSGS_PER_USER_PER_DAY) {
        return true;
    }
    return false;
}

function trackMessage(phoneNumber) {
    if (!rateLimiter[phoneNumber]) {
        rateLimiter[phoneNumber] = { count: 0, resetAt: Date.now() + 86400000 };
    }
    rateLimiter[phoneNumber].count++;
    globalDailyMsgCount++;
}

function randomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

async function sendWhatsAppMessage(toPhoneNumber, messageText) {
    const token = systemSettings["wa_api_token"];
    const phoneId = systemSettings["wa_phone_number_id"];

    if (!token || !phoneId) return;

    try {
        const delay = randomDelay(2000, 4000);
        await new Promise(r => setTimeout(r, delay));

        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: toPhoneNumber,
                type: "text",
                text: { preview_url: false, body: messageText }
            })
        });

        const data = await response.json();
        if (data.error) console.error("[WA Send Error]", data.error);
        else trackMessage(toPhoneNumber);
    } catch (error) {
        console.error("[WA Send Exception]", error);
    }
}

function formatResponse(template, variables) {
    let result = template || "";
    result = result.replace(/\\n/g, "\n");
    for (const key in variables) {
        const re = new RegExp(`{${key}}`, "gi");
        const val = variables[key] ?? "";
        result = result.replace(re, val);
    }
    return result;
}

function generateMenuList() {
    let menuList = "";
    botMenus.forEach(m => {
        menuList += `👉 *${m.menu_key.toUpperCase()}*: ${m.menu_label}\n`;
    });
    return menuList;
}

async function loadBotConfigs() {
    try {
        const { data: settings } = await supabase.from("system_settings").select("key_name, value_text");
        if (settings) settings.forEach(s => { systemSettings[s.key_name] = s.value_text; });
        const { data: menus } = await supabase.from("wa_menu_configs").select("*").eq("is_active", true).order("sort_order");
        if (menus) botMenus = menus;
    } catch (error) {
        console.error("Error loading config:", error);
    }
}

async function sendWebWelcomeIfNeeded(senderNumber, userProfile) {
    if (userProfile.registration_source !== "web") return;
    try {
        const welcomeTemplate = systemSettings["registration_welcome"] || "Selamat datang, {nama}!";
        let welcomeMsg = formatResponse(welcomeTemplate, { nama: userProfile.full_name });
        welcomeMsg += "\n\n" + generateMenuList();
        await sendWhatsAppMessage(senderNumber, welcomeMsg);
        await supabase.from("profiles").update({ registration_source: "web_welcomed" }).eq("id", userProfile.id);
    } catch (e) {
        console.error("Failed to send reactive welcome:", e.message);
    }
}

const REGISTRATION_STEPS = { WAITING_NAME: "WAITING_NAME", WAITING_JALAN: "WAITING_JALAN", WAITING_NOMOR: "WAITING_NOMOR", WAITING_RTRW: "WAITING_RTRW", WAITING_DESA: "WAITING_DESA", WAITING_KECAMATAN: "WAITING_KECAMATAN", WAITING_KABUPATEN: "WAITING_KABUPATEN", WAITING_PROVINSI: "WAITING_PROVINSI", WAITING_CONFIRM: "WAITING_CONFIRM" };

async function startRegistration(senderNumber, referrerId) {
    registrationSessions[senderNumber] = { step: REGISTRATION_STEPS.WAITING_NAME, data: { referrerId, phoneNumber: senderNumber } };
    let referrerInfo = "";
    if (referrerId) {
        const { data: referrer } = await supabase.from("profiles").select("full_name").eq("id", referrerId).single();
        if (referrer) referrerInfo = `\n📎 Anda diundang oleh: *${referrer.full_name}*\n`;
    }
    await sendWhatsAppMessage(senderNumber, `📝 *Pendaftaran Akun Beres | Benahi Residu Sampah*\n${referrerInfo}\nMari kita mulai!\n\n*Langkah 1/2*: Siapa nama lengkap Anda?`);
}

async function handleRegistrationFlow(senderNumber, messageTextRaw) {
    const session = registrationSessions[senderNumber];
    if (!session) return false;

    const messageText = messageTextRaw.trim();
    if (messageText.toLowerCase() === "batal") {
        delete registrationSessions[senderNumber];
        await sendWhatsAppMessage(senderNumber, "❌ Pendaftaran dibatalkan. Ketik *DAFTAR* kapan saja untuk mendaftar kembali.");
        return true;
    }

    switch (session.step) {
        case REGISTRATION_STEPS.WAITING_NAME:
            if (messageText.length < 3) return sendWhatsAppMessage(senderNumber, "⚠️ Nama terlalu pendek. Silakan masukkan nama lengkap Anda (minimal 3 karakter):");
            session.data.fullName = messageText; session.step = REGISTRATION_STEPS.WAITING_JALAN;
            return sendWhatsAppMessage(senderNumber, `Baik, *${messageText}*! 👍\n\n*Langkah 2/2*: Masukkan alamat lengkap Anda:\nNama Jalan/Dusun:\n_(Contoh: Jl. Pisang atau Dusun Mekar Jaya)_`);
        case REGISTRATION_STEPS.WAITING_JALAN:
            if (messageText.length < 3) return sendWhatsAppMessage(senderNumber, "⚠️ Nama Jalan terlalu pendek. Silakan masukkan nama Jalan/Dusun:");
            session.data.jalan = messageText; session.step = REGISTRATION_STEPS.WAITING_NOMOR;
            return sendWhatsAppMessage(senderNumber, `Nomor Rumah:\n_(Ketik "-" jika tidak ada)_`);
        case REGISTRATION_STEPS.WAITING_NOMOR:
            session.data.nomor = messageText; session.step = REGISTRATION_STEPS.WAITING_RTRW;
            return sendWhatsAppMessage(senderNumber, `RT/RW:\n_(Contoh: 03/05)_`);
        case REGISTRATION_STEPS.WAITING_RTRW:
            session.data.rtrw = messageText; session.step = REGISTRATION_STEPS.WAITING_DESA;
            return sendWhatsAppMessage(senderNumber, `Desa/Kelurahan:`);
        case REGISTRATION_STEPS.WAITING_DESA:
            session.data.desa = messageText; session.step = REGISTRATION_STEPS.WAITING_KECAMATAN;
            return sendWhatsAppMessage(senderNumber, `Kecamatan:`);
        case REGISTRATION_STEPS.WAITING_KECAMATAN:
            session.data.kecamatan = messageText; session.step = REGISTRATION_STEPS.WAITING_KABUPATEN;
            return sendWhatsAppMessage(senderNumber, `Kabupaten/Kota:`);
        case REGISTRATION_STEPS.WAITING_KABUPATEN:
            session.data.kabupaten = messageText; session.step = REGISTRATION_STEPS.WAITING_PROVINSI;
            return sendWhatsAppMessage(senderNumber, `Provinsi:`);
        case REGISTRATION_STEPS.WAITING_PROVINSI:
            session.data.provinsi = messageText;
            let addr = session.data.jalan;
            if (session.data.nomor && session.data.nomor !== "-") addr += ` No. ${session.data.nomor}`;
            addr += `, RT/RW ${session.data.rtrw}, Desa/Kel. ${session.data.desa}, Kec. ${session.data.kecamatan}, ${session.data.kabupaten}, Provinsi ${session.data.provinsi}`;
            session.data.address = addr; session.step = REGISTRATION_STEPS.WAITING_CONFIRM;
            let refInfo = "";
            if (session.data.referrerId) {
                const { data: ref } = await supabase.from("profiles").select("full_name").eq("id", session.data.referrerId).single();
                if (ref) refInfo = `📎 Diundang oleh: *${ref.full_name}*\n`;
            }
            return sendWhatsAppMessage(senderNumber, `📋 *Konfirmasi Data Pendaftaran:*\n\n👤 Nama: *${session.data.fullName}*\n📱 No. HP: *${senderNumber}*\n🏠 Alamat: *${session.data.address}*\n${refInfo}\nApakah data di atas sudah benar?\nKetik *YA* bila benar, atau *KOREKSI* jika ada.`);
        case REGISTRATION_STEPS.WAITING_CONFIRM:
            if (messageText.toLowerCase() === "koreksi") {
                session.step = REGISTRATION_STEPS.WAITING_NAME;
                Object.keys(session.data).forEach(k => { if (k !== "referrerId" && k !== "phoneNumber") delete session.data[k]; });
                return sendWhatsAppMessage(senderNumber, "Mari kita ulangi proses pendaftaran.\n\n*Langkah 1/2*: Siapa nama lengkap Anda?");
            }
            if (messageText.toLowerCase() !== "ya") return sendWhatsAppMessage(senderNumber, "⚠️ Pilihan tidak valid. Ketik DAFTAR untuk mengulang pendaftaran, atau KOREKSI.");

            try {
                const tempEmail = `wa_${senderNumber}@ecosistemdigital.id`;
                const tempPassword = `EcoWA_${senderNumber}_${Date.now()}`;
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({ email: tempEmail, password: tempPassword, email_confirm: true, user_metadata: { full_name: session.data.fullName } });
                if (authError) return sendWhatsAppMessage(senderNumber, "⚠️ Terjadi kendala pendaftaran akun. Coba lagi.");

                await supabase.from("profiles").update({ full_name: session.data.fullName, phone_number: senderNumber, address: session.data.address, role: "user", registration_source: "whatsapp", is_registration_complete: true, referred_by: session.data.referrerId || null }).eq("id", authUser.user.id);
                await supabase.from("user_wallets").insert({ user_id: authUser.user.id, balance: 0 });
                await loadBotConfigs();
                let completeMsg = formatResponse(systemSettings["wa_registration_complete"] || "✅ Pendaftaran berhasil, {nama}!", { nama: session.data.fullName }) + "\n\n" + generateMenuList();
                await sendWhatsAppMessage(senderNumber, completeMsg);
                delete registrationSessions[senderNumber];
            } catch (e) {
                sendWhatsAppMessage(senderNumber, "⚠️ Error sistem.");
            }
            return true;
    }
}

async function handleIncomingMessage(senderNumber, messageTextRaw) {
    if (!messageTextRaw) return;
    const messageText = messageTextRaw.trim().toLowerCase();

    if (isRateLimited(senderNumber)) return;
    if (registrationSessions[senderNumber]) return await handleRegistrationFlow(senderNumber, messageTextRaw);
    if (messageText === "reload") {
        const { data: profile } = await supabase.from("profiles").select("role").eq("phone_number", senderNumber).single();
        if (profile && profile.role === "superadmin") {
            await loadBotConfigs(); return sendWhatsAppMessage(senderNumber, "✅ Konfigurasi bot berhasil diperbarui.");
        }
    }

    try {
        const { data: userProfile } = await supabase.from("profiles").select("id, full_name, role, is_registration_complete, registration_source").eq("phone_number", senderNumber).single();
        if (userProfile && userProfile.registration_source === "web") return await sendWebWelcomeIfNeeded(senderNumber, userProfile);

        if (!userProfile) {
            const refMatch = messageTextRaw.match(/ref[=:]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (refMatch) return await startRegistration(senderNumber, refMatch[1]);
            if (messageText === "daftar") return await startRegistration(senderNumber, null);
            return sendWhatsAppMessage(senderNumber, formatResponse(systemSettings["unregistered_message"] || "Nomor belum terdaftar.", { link_web: "https://beres.vercel.app/auth" }));
        }

        if (!userProfile.is_registration_complete) return sendWhatsAppMessage(senderNumber, "⏳ Pendaftaran belum selesai.");

        const matchedMenu = botMenus.find(menu => messageText === menu.menu_key);
        if (matchedMenu) {
            let tv = { nama: userProfile.full_name, nomor_cs: systemSettings["cs_phone_number"] || "-", link_web: "https://beres.vercel.app", link_referral: `https://beres.vercel.app/auth?ref=${userProfile.id}` };
            if (matchedMenu.menu_key === "saldo") {
                const { data: wallet } = await supabase.from("user_wallets").select("balance").eq("user_id", userProfile.id).single();
                tv.saldo = wallet ? wallet.balance.toLocaleString("id-ID") : "0";
            }
            if (matchedMenu.menu_key === "jemput") {
                if (userProfile.role !== "user") return sendWhatsAppMessage(senderNumber, "Hanya untuk warga.");
                await supabase.from("pickup_requests").insert([{ user_id: userProfile.id, status: "pending" }]);
            }
            if (matchedMenu.menu_key === "harga") tv.daftar_harga = "1. Plastik PET: Rp 2.000/kg\n2. Kardus: Rp 1.500/kg\n3. Besi/Logam: Rp 4.000/kg";
            if (matchedMenu.menu_key === "riwayat") {
                const { data: txns } = await supabase.from("transactions").select("weight_organic, weight_inorganic, amount_earned, created_at").eq("user_id", userProfile.id).order("created_at", { ascending: false }).limit(5);
                if (txns && txns.length > 0) {
                    tv.jumlah = txns.length; tv.daftar = txns.map(t => `- ${new Date(t.created_at).toLocaleDateString("id-ID")}: ${Number(t.weight_organic) + Number(t.weight_inorganic)} Kg (Rp ${Number(t.amount_earned).toLocaleString("id-ID")})`).join("\n");
                } else { tv.jumlah = 0; tv.daftar = "(Belum ada riwayat)"; }
            }
            if (matchedMenu.menu_key === "referral") {
                await sendWhatsAppMessage(senderNumber, "📢 Bagikan pesan di bawah ini dengan cara ditekan lama lalu Teruskan:");
                return sendWhatsAppMessage(senderNumber, `Hai! Ayo bergabung di *Beres* 🌿♻️\n\nDaftar gratis di sini:\n${tv.link_referral}`);
            }
            return sendWhatsAppMessage(senderNumber, formatResponse(matchedMenu.response_template, tv));
        } else {
            return sendWhatsAppMessage(senderNumber, `${formatResponse(systemSettings["welcome_message"] || "Menu:", { nama: userProfile.full_name })}\n\n${generateMenuList()}`);
        }
    } catch (err) { console.error("Error", err); sendWhatsAppMessage(senderNumber, "Terjadi gangguan sistem."); }
}

async function boot() {
    await loadBotConfigs();
    console.log("Memulai Subsribe Supabase Realtime ke whatsapp_webhooks...");
    supabase.channel("whatsapp-listener")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_webhooks" }, async (payload) => {
            try {
                const changes = payload.new.payload?.entry?.[0]?.changes?.[0]?.value;
                if (!changes || !changes.messages) return;
                const msgInfo = changes.messages[0];
                if (msgInfo.type === "text" && msgInfo.text?.body) {
                    await handleIncomingMessage(msgInfo.from, msgInfo.text.body);
                    await supabase.from("whatsapp_webhooks").update({ processed: true }).eq("id", payload.new.id);
                }
            } catch (e) { console.error("Parse Error:", e); }
        })
        .subscribe((status, err) => {
            if (status === "SUBSCRIBED") {
                console.log("✅ Terhubung ke Realtime! Menunggu pesan.");
            } else {
                console.log("Status Realtime:", status, err);
            }
        });
}

boot();
