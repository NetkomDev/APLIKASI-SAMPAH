require("dotenv").config();
const WebSocket = require("ws");
global.WebSocket = WebSocket;
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

let systemSettings = {};
let botMenus = [];
const registrationSessions = {};

// ── Rate Limiter ──
const rateLimiter = {};
const MAX_MSGS_PER_USER_PER_DAY = 30;
let globalDailyMsgCount = 0;
let globalDailyResetAt = Date.now() + 86400000;
const MAX_GLOBAL_MSGS_PER_DAY = 200;

function isRateLimited(phoneNumber) {
    const now = Date.now();
    if (now > globalDailyResetAt) { globalDailyMsgCount = 0; globalDailyResetAt = now + 86400000; }
    if (globalDailyMsgCount >= MAX_GLOBAL_MSGS_PER_DAY) return true;
    if (!rateLimiter[phoneNumber] || now > rateLimiter[phoneNumber].resetAt) {
        rateLimiter[phoneNumber] = { count: 0, resetAt: now + 86400000 };
    }
    if (rateLimiter[phoneNumber].count >= MAX_MSGS_PER_USER_PER_DAY) return true;
    return false;
}

function trackMessage(phoneNumber) {
    if (!rateLimiter[phoneNumber]) rateLimiter[phoneNumber] = { count: 0, resetAt: Date.now() + 86400000 };
    rateLimiter[phoneNumber].count++;
    globalDailyMsgCount++;
}

function randomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// ──────────────────────────────────────────────
// WHATSAPP CLOUD API — SEND FUNCTIONS
// ──────────────────────────────────────────────

async function sendWA(toPhoneNumber, payload) {
    const token = systemSettings["wa_api_token"];
    const phoneId = systemSettings["wa_phone_number_id"];
    if (!token || !phoneId) { console.error("[WA] Token/PhoneID missing!"); return; }

    try {
        const delay = randomDelay(1500, 3000);
        await new Promise(r => setTimeout(r, delay));

        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: toPhoneNumber, ...payload })
        });
        const data = await response.json();
        if (data.error) console.error("[WA Send Error]", data.error);
        else trackMessage(toPhoneNumber);
    } catch (error) {
        console.error("[WA Send Exception]", error);
    }
}

// Kirim Teks Biasa
async function sendWhatsAppMessage(toPhoneNumber, messageText) {
    return sendWA(toPhoneNumber, { type: "text", text: { preview_url: false, body: messageText } });
}

// Kirim Interactive List (untuk Menu Utama)
async function sendMenuList(toPhoneNumber, headerText, bodyText, footerText, buttonLabel, sections) {
    return sendWA(toPhoneNumber, {
        type: "interactive",
        interactive: {
            type: "list",
            header: { type: "text", text: headerText },
            body: { text: bodyText },
            footer: { text: footerText },
            action: { button: buttonLabel, sections }
        }
    });
}

// Kirim Interactive Buttons (max 3 tombol)
async function sendButtons(toPhoneNumber, bodyText, buttons, headerText, footerText) {
    const payload = {
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
                buttons: buttons.map(b => ({
                    type: "reply",
                    reply: { id: b.id, title: b.title }
                }))
            }
        }
    };
    if (headerText) payload.interactive.header = { type: "text", text: headerText };
    if (footerText) payload.interactive.footer = { text: footerText };
    return sendWA(toPhoneNumber, payload);
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

function formatResponse(template, variables) {
    let result = template || "";
    result = result.replace(/\\n/g, "\n");
    for (const key in variables) {
        const re = new RegExp(`{${key}}`, "gi");
        result = result.replace(re, variables[key] ?? "");
    }
    return result;
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

// ──────────────────────────────────────────────
// SEND MAIN MENU (Interactive List)
// ──────────────────────────────────────────────

async function sendMainMenu(senderNumber, nama) {
    const rows = [
        { id: "saldo",    title: "💰 Cek Saldo",     description: "Lihat saldo dompet digital Anda" },
        { id: "jemput",   title: "🚛 Request Jemput", description: "Minta petugas jemput sampah" },
        { id: "riwayat",  title: "📜 Riwayat",        description: "Riwayat 5 setoran terakhir" },
        { id: "harga",    title: "💲 Daftar Harga",   description: "Harga sampah per-kilogram" },
        { id: "referral", title: "📢 Referral",       description: "Ajak tetangga, dapat bonus!" },
        { id: "bantuan",  title: "📞 Bantuan / CS",   description: "Hubungi customer service" }
    ];

    return sendMenuList(
        senderNumber,
        "♻️ Beres | Menu Utama",
        `Halo *${nama}*! 👋\n\nSelamat datang di *Beres | Benahi Residu Sampah*.\nPilih menu di bawah ini:`,
        "Ketik 'menu' kapan saja untuk kembali",
        "📋 Pilih Menu",
        [{ title: "Menu Layanan", rows }]
    );
}

// ──────────────────────────────────────────────
// WEB WELCOME
// ──────────────────────────────────────────────

async function sendWebWelcomeIfNeeded(senderNumber, userProfile) {
    if (userProfile.registration_source !== "web") return;
    try {
        const welcomeTemplate = systemSettings["registration_welcome"] || "Selamat datang, {nama}!";
        let welcomeMsg = formatResponse(welcomeTemplate, { nama: userProfile.full_name });
        await sendWhatsAppMessage(senderNumber, welcomeMsg);
        await sendMainMenu(senderNumber, userProfile.full_name);
        await supabase.from("profiles").update({ registration_source: "web_welcomed" }).eq("id", userProfile.id);
    } catch (e) {
        console.error("Failed to send reactive welcome:", e.message);
    }
}

// ──────────────────────────────────────────────
// REGISTRATION FLOW
// ──────────────────────────────────────────────

const REGISTRATION_STEPS = {
    WAITING_NAME: "WAITING_NAME", WAITING_JALAN: "WAITING_JALAN",
    WAITING_NOMOR: "WAITING_NOMOR", WAITING_RTRW: "WAITING_RTRW",
    WAITING_DESA: "WAITING_DESA", WAITING_KECAMATAN: "WAITING_KECAMATAN",
    WAITING_KABUPATEN: "WAITING_KABUPATEN", WAITING_PROVINSI: "WAITING_PROVINSI",
    WAITING_CONFIRM: "WAITING_CONFIRM"
};

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
            if (messageText.length < 3) return sendWhatsAppMessage(senderNumber, "⚠️ Nama terlalu pendek (min 3 karakter):");
            session.data.fullName = messageText; session.step = REGISTRATION_STEPS.WAITING_JALAN;
            return sendWhatsAppMessage(senderNumber, `Baik, *${messageText}*! 👍\n\n*Langkah 2/2*: Masukkan alamat lengkap:\nNama Jalan/Dusun:\n_(Contoh: Jl. Pisang)_`);
        case REGISTRATION_STEPS.WAITING_JALAN:
            if (messageText.length < 3) return sendWhatsAppMessage(senderNumber, "⚠️ Nama Jalan terlalu pendek:");
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
            return sendButtons(senderNumber,
                `📋 *Konfirmasi Data Pendaftaran:*\n\n👤 Nama: *${session.data.fullName}*\n📱 HP: *${senderNumber}*\n🏠 Alamat: *${session.data.address}*\n${refInfo}\nApakah data sudah benar?`,
                [
                    { id: "confirm_ya", title: "✅ Ya, Benar" },
                    { id: "confirm_koreksi", title: "✏️ Koreksi" },
                    { id: "confirm_batal", title: "❌ Batalkan" }
                ],
                "📝 Konfirmasi Data", "Beres | Benahi Residu Sampah"
            );
        case REGISTRATION_STEPS.WAITING_CONFIRM:
            if (messageText.toLowerCase() === "koreksi" || messageText === "confirm_koreksi") {
                session.step = REGISTRATION_STEPS.WAITING_NAME;
                Object.keys(session.data).forEach(k => { if (k !== "referrerId" && k !== "phoneNumber") delete session.data[k]; });
                return sendWhatsAppMessage(senderNumber, "Mari ulangi pendaftaran.\n\n*Langkah 1/2*: Siapa nama lengkap Anda?");
            }
            if (messageText.toLowerCase() === "batal" || messageText === "confirm_batal") {
                delete registrationSessions[senderNumber];
                return sendWhatsAppMessage(senderNumber, "❌ Pendaftaran dibatalkan.");
            }
            if (messageText.toLowerCase() !== "ya" && messageText !== "confirm_ya") {
                return sendWhatsAppMessage(senderNumber, "⚠️ Ketik YA untuk konfirmasi, KOREKSI untuk mengulang.");
            }
            try {
                const tempEmail = `wa_${senderNumber}@ecosistemdigital.id`;
                const tempPassword = `EcoWA_${senderNumber}_${Date.now()}`;
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({ email: tempEmail, password: tempPassword, email_confirm: true, user_metadata: { full_name: session.data.fullName } });
                if (authError) return sendWhatsAppMessage(senderNumber, "⚠️ Kendala pendaftaran. Coba lagi.");
                await supabase.from("profiles").update({ full_name: session.data.fullName, phone_number: senderNumber, address: session.data.address, role: "user", registration_source: "whatsapp", is_registration_complete: true, referred_by: session.data.referrerId || null }).eq("id", authUser.user.id);
                await supabase.from("user_wallets").insert({ user_id: authUser.user.id, balance: 0 });
                await loadBotConfigs();
                let completeMsg = formatResponse(systemSettings["wa_registration_complete"] || "✅ Pendaftaran berhasil, {nama}!", { nama: session.data.fullName });
                await sendWhatsAppMessage(senderNumber, completeMsg);
                await sendMainMenu(senderNumber, session.data.fullName);
                delete registrationSessions[senderNumber];
            } catch (e) {
                sendWhatsAppMessage(senderNumber, "⚠️ Error sistem.");
            }
            return true;
    }
}

// ──────────────────────────────────────────────
// MENU RESPONSE HANDLERS (With Interactive UI)
// ──────────────────────────────────────────────

async function handleMenuSaldo(senderNumber, userProfile) {
    const { data: wallet } = await supabase.from("user_wallets").select("balance").eq("user_id", userProfile.id).single();
    const saldo = wallet ? wallet.balance.toLocaleString("id-ID") : "0";
    return sendButtons(senderNumber,
        `💰 *Informasi Saldo*\n\n👤 Nama: *${userProfile.full_name}*\n💵 Saldo: *Rp ${saldo}*\n\n_Saldo bertambah setiap kali Anda menyetorkan sampah._`,
        [
            { id: "riwayat", title: "📜 Lihat Riwayat" },
            { id: "jemput", title: "🚛 Request Jemput" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        "💰 Saldo Dompet Digital", "Beres | Benahi Residu Sampah"
    );
}

async function handleMenuJemput(senderNumber, userProfile) {
    if (userProfile.role !== "user") return sendWhatsAppMessage(senderNumber, "Maaf, fitur 'Jemput' hanya untuk peran warga.");
    await supabase.from("pickup_requests").insert([{ user_id: userProfile.id, status: "pending" }]);
    return sendButtons(senderNumber,
        `🚛 *Request Jemput Berhasil!*\n\n✅ Permintaan penjemputan sampah Anda telah dikirim.\n📍 Petugas akan segera menghubungi Anda.\n\n_Pastikan sampah sudah dipisah (Organik / Anorganik) agar proses lebih cepat._`,
        [
            { id: "saldo", title: "💰 Cek Saldo" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        "🚛 Jemput Sampah", "Beres | Benahi Residu Sampah"
    );
}

async function handleMenuRiwayat(senderNumber, userProfile) {
    const { data: txns } = await supabase.from("transactions").select("weight_organic, weight_inorganic, amount_earned, created_at").eq("user_id", userProfile.id).order("created_at", { ascending: false }).limit(5);
    let bodyText;
    if (txns && txns.length > 0) {
        const list = txns.map((t, i) => {
            const date = new Date(t.created_at).toLocaleDateString("id-ID");
            const totalKg = Number(t.weight_organic) + Number(t.weight_inorganic);
            return `${i + 1}. 📅 ${date}\n   📦 ${totalKg} Kg — 💵 Rp ${Number(t.amount_earned).toLocaleString("id-ID")}`;
        }).join("\n\n");
        bodyText = `📜 *Riwayat 5 Setoran Terakhir*\n\n${list}`;
    } else {
        bodyText = `📜 *Riwayat Setoran*\n\nBelum ada riwayat setoran.\nMulai setor sampah untuk mendapatkan penghasilan! ♻️`;
    }
    return sendButtons(senderNumber, bodyText,
        [
            { id: "saldo", title: "💰 Cek Saldo" },
            { id: "jemput", title: "🚛 Request Jemput" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        "📜 Riwayat Setoran", "Beres | Benahi Residu Sampah"
    );
}

async function handleMenuHarga(senderNumber) {
    return sendButtons(senderNumber,
        `💲 *Daftar Harga Sampah*\n\n` +
        `┌─────────────────────────\n` +
        `│ 🥤 Plastik PET    Rp 2.000/kg\n` +
        `│ 📦 Kardus         Rp 1.500/kg\n` +
        `│ 🔩 Besi/Logam     Rp 4.000/kg\n` +
        `│ 📰 Kertas/HVS     Rp 1.000/kg\n` +
        `│ 🍶 Botol Kaca     Rp   500/kg\n` +
        `│ 🛢️ Minyak Jelantah Rp 3.000/L\n` +
        `└─────────────────────────\n\n` +
        `_Harga dapat berubah sewaktu-waktu_`,
        [
            { id: "jemput", title: "🚛 Request Jemput" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        "💲 Daftar Harga", "Beres | Benahi Residu Sampah"
    );
}

async function handleMenuReferral(senderNumber, userProfile) {
    const refLink = `https://beres.vercel.app/auth?ref=${userProfile.id}`;
    await sendButtons(senderNumber,
        `📢 *Program Referral*\n\nAjak tetangga dan teman bergabung!\n🎁 Setiap orang yang mendaftar lewat link Anda, saldo bonus akan ditambahkan.\n\n🔗 Link Referral Anda:\n${refLink}\n\n_Teruskan pesan di bawah ini ke teman Anda:_`,
        [
            { id: "saldo", title: "💰 Cek Saldo" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        "📢 Referral Program", "Beres | Benahi Residu Sampah"
    );
    // Kirim pesan forwardable terpisah
    return sendWhatsAppMessage(senderNumber, `Hai! Ayo gabung di *Beres | Benahi Residu Sampah* 🌿♻️\n\nSetor sampah, dapat uang!\nDaftar gratis di sini:\n${refLink}`);
}

async function handleMenuBantuan(senderNumber) {
    const csPhone = systemSettings["cs_phone_number"] || "08xxxxxxxxxx";
    return sendButtons(senderNumber,
        `📞 *Pusat Bantuan*\n\n` +
        `Butuh bantuan? Hubungi Customer Service kami:\n\n` +
        `📱 CS: wa.me/${csPhone.replace(/^0/, '62')}\n` +
        `📧 Email: cs@beres.id\n` +
        `🕐 Jam Operasional: 08.00 - 17.00 WITA\n\n` +
        `_Atau ketik pertanyaan Anda dan kami akan segera merespons._`,
        [
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        "📞 Bantuan", "Beres | Benahi Residu Sampah"
    );
}

// ──────────────────────────────────────────────
// MAIN MESSAGE HANDLER
// ──────────────────────────────────────────────

async function handleIncomingMessage(senderNumber, messageText, interactionId) {
    // interactionId = button_reply.id atau list_reply.id (jika dari interactive)
    const command = (interactionId || messageText || "").trim().toLowerCase();
    if (!command) return;

    if (isRateLimited(senderNumber)) return;

    // Handle ongoing registration
    if (registrationSessions[senderNumber]) return await handleRegistrationFlow(senderNumber, command);

    // Superadmin RELOAD
    if (command === "reload") {
        const { data: profile } = await supabase.from("profiles").select("role").eq("phone_number", senderNumber).single();
        if (profile && profile.role === "superadmin") {
            await loadBotConfigs();
            return sendWhatsAppMessage(senderNumber, "✅ Konfigurasi bot berhasil diperbarui.");
        }
    }

    try {
        const { data: userProfile } = await supabase.from("profiles").select("id, full_name, role, is_registration_complete, registration_source").eq("phone_number", senderNumber).single();

        // Reactive welcome untuk user web
        if (userProfile && userProfile.registration_source === "web") return await sendWebWelcomeIfNeeded(senderNumber, userProfile);

        // Unregistered user
        if (!userProfile) {
            const refMatch = (messageText || "").match(/ref[=:]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (refMatch) return await startRegistration(senderNumber, refMatch[1]);
            if (command === "daftar") return await startRegistration(senderNumber, null);
            return sendButtons(senderNumber,
                `Halo! 👋\n\nNomor Anda belum terdaftar di *Beres | Benahi Residu Sampah*.\n\nSilakan daftar untuk mulai menyetor sampah dan mendapatkan penghasilan!`,
                [{ id: "daftar", title: "📝 Daftar Sekarang" }],
                "♻️ Beres", "Ketik DAFTAR atau klik tombol di bawah"
            );
        }

        if (!userProfile.is_registration_complete) return sendWhatsAppMessage(senderNumber, "⏳ Pendaftaran belum selesai.");

        // ── MENU ROUTING (dari tombol CTA atau teks) ──
        switch (command) {
            case "saldo":
            case "cek saldo":
                return await handleMenuSaldo(senderNumber, userProfile);

            case "jemput":
            case "request jemput":
                return await handleMenuJemput(senderNumber, userProfile);

            case "riwayat":
            case "lihat riwayat":
                return await handleMenuRiwayat(senderNumber, userProfile);

            case "harga":
            case "daftar harga":
                return await handleMenuHarga(senderNumber);

            case "referral":
            case "ajak teman":
                return await handleMenuReferral(senderNumber, userProfile);

            case "bantuan":
            case "cs":
            case "help":
                return await handleMenuBantuan(senderNumber);

            case "menu":
            case "hi":
            case "halo":
            case "btn_menu":
                return await sendMainMenu(senderNumber, userProfile.full_name);

            default:
                // Coba cocokkan dari database menu lama
                const matchedMenu = botMenus.find(m => command === m.menu_key);
                if (matchedMenu) {
                    let tv = { nama: userProfile.full_name, nomor_cs: systemSettings["cs_phone_number"] || "-", link_web: "https://beres.vercel.app", link_referral: `https://beres.vercel.app/auth?ref=${userProfile.id}` };
                    return sendWhatsAppMessage(senderNumber, formatResponse(matchedMenu.response_template, tv));
                }
                // Default: tampilkan menu utama
                return await sendMainMenu(senderNumber, userProfile.full_name);
        }
    } catch (err) {
        console.error("Error:", err);
        sendWhatsAppMessage(senderNumber, "Terjadi gangguan sistem. Silakan coba lagi.");
    }
}

// ──────────────────────────────────────────────
// WEBHOOK POLLING
// ──────────────────────────────────────────────

async function processPendingWebhooks() {
    try {
        const { data: webhooks, error } = await supabase
            .from("whatsapp_webhooks")
            .select("*")
            .eq("processed", false)
            .order("id", { ascending: true })
            .limit(10);

        if (error) { console.error("Poll Error:", error.message); return; }
        if (!webhooks || webhooks.length === 0) return;

        for (const wh of webhooks) {
            await supabase.from("whatsapp_webhooks").update({ processed: true }).eq("id", wh.id);

            const changes = wh.payload?.entry?.[0]?.changes?.[0]?.value;
            if (!changes || !changes.messages || changes.messages.length === 0) continue;

            const msgInfo = changes.messages[0];
            const from = msgInfo.from;

            if (msgInfo.type === "text" && msgInfo.text?.body) {
                // Pesan teks biasa
                await handleIncomingMessage(from, msgInfo.text.body, null);
            } else if (msgInfo.type === "interactive") {
                // Klik tombol (button_reply) atau pilih list (list_reply)
                const btnReply = msgInfo.interactive?.button_reply;
                const listReply = msgInfo.interactive?.list_reply;
                const interactionId = btnReply?.id || listReply?.id || "";
                const interactionTitle = btnReply?.title || listReply?.title || "";
                console.log(`[BOT] Interactive: ${interactionId} (${interactionTitle}) from ${from}`);
                await handleIncomingMessage(from, interactionTitle, interactionId);
            }
        }
    } catch (e) {
        console.error("Poll Exception:", e.message);
    }
}

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────

async function boot() {
    await loadBotConfigs();
    console.log("✅ Konfigurasi dimuat. Bot Beres siap dengan Interactive UI!");
    console.log(`📱 Phone ID: ${systemSettings["wa_phone_number_id"] || "NOT SET"}`);
    console.log(`🔑 Token: ${systemSettings["wa_api_token"] ? "OK (" + systemSettings["wa_api_token"].substring(0, 15) + "...)" : "NOT SET"}`);
    setInterval(processPendingWebhooks, 3000);
}

boot();
