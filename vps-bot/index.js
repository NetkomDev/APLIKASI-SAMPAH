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



// ──────────────────────────────────────────────
// WHATSAPP CLOUD API — STATUS & TYPING (Non-blocking)
// ──────────────────────────────────────────────

// Tandai pesan sudah dibaca (centang biru) — fire-and-forget
function markAsRead(messageId) {
    const token = systemSettings["wa_api_token"];
    const phoneId = systemSettings["wa_phone_number_id"];
    if (!token || !phoneId || !messageId) return;

    fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId })
    }).catch(() => { }); // silent fail, non-blocking
}

// Tampilkan indikator "sedang mengetik..." — fire-and-forget
function showTyping(toPhoneNumber) {
    const token = systemSettings["wa_api_token"];
    const phoneId = systemSettings["wa_phone_number_id"];
    if (!token || !phoneId) return;

    fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ 
            messaging_product: "whatsapp", 
            recipient_type: "individual", 
            to: toPhoneNumber, 
            sender_action: "typing_on" 
        })
    }).catch((e) => { console.error("Typing API Error:", e.message) }); // silent fail but log
}

// ──────────────────────────────────────────────
// WHATSAPP CLOUD API — SEND FUNCTIONS
// ──────────────────────────────────────────────

async function sendWA(toPhoneNumber, payload) {
    const token = systemSettings["wa_api_token"];
    const phoneId = systemSettings["wa_phone_number_id"];
    if (!token || !phoneId) { console.error("[WA] Token/PhoneID missing!"); return; }

    try {
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

// Kirim CTA URL Button (tombol buka link)
async function sendCTAUrl(toPhoneNumber, bodyText, buttonLabel, url, headerText, footerText) {
    const payload = {
        type: "interactive",
        interactive: {
            type: "cta_url",
            body: { text: bodyText },
            action: { name: "cta_url", parameters: { display_text: buttonLabel, url } }
        }
    };
    if (headerText) payload.interactive.header = { type: "text", text: headerText };
    if (footerText) payload.interactive.footer = { text: footerText };
    return sendWA(toPhoneNumber, payload);
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────

// Ambil domain aplikasi dari system_settings (dinamis, bisa diubah SuperAdmin)
function getAppDomain() {
    return (systemSettings["app_domain"] || "https://beres-bone.vercel.app").replace(/\/+$/, "");
}

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

// Peta emoji dan deskripsi default per menu_key
const MENU_META = {
    saldo:   { emoji: "💰", desc: "Lihat saldo dompet digital Anda" },
    jemput:  { emoji: "🚛", desc: "Minta petugas jemput sampah" },
    riwayat: { emoji: "📜", desc: "Riwayat 5 setoran terakhir" },
    harga:   { emoji: "💲", desc: "Harga sampah per-kilogram" },
    referral:{ emoji: "📢", desc: "Ajak tetangga, dapat bonus!" },
    bantuan: { emoji: "📞", desc: "Hubungi customer service" },
    qrcode:  { emoji: "🪪", desc: "Tampilkan Kartu & QR Code Anda" },
};

async function sendMainMenu(senderNumber, nama) {
    // Build menu dynamically dari Supabase (sudah difilter is_active=true di loadBotConfigs)
    const rows = botMenus.map(m => {
        const meta = MENU_META[m.menu_key] || { emoji: "•", desc: m.menu_label };
        const label = m.menu_label || `${meta.emoji} ${m.menu_key}`;
        return {
            id: m.menu_key,
            title: label.length > 24 ? label.substring(0, 24) : label,
            description: meta.desc
        };
    });

    // Selipkan QR Code jika belum ada dari database
    if (!rows.find(r => r.id === "qrcode")) {
        rows.push({
            id: "qrcode",
            title: "🪪 Tampilkan QR Code",
            description: MENU_META.qrcode.desc
        });
    }

    // Fallback jika Supabase kosong
    if (rows.length === 0) {
        return sendWhatsAppMessage(senderNumber, `Halo *${nama}*! 👋\n\nSistem bot sedang dalam konfigurasi. Silakan hubungi admin.`);
    }

    return sendMenuList(
        senderNumber,
        "♻️ BERES | Menu Utama",
        `Halo *${nama}*! 👋\n\nSelamat datang di *Aplikasi BERES | Benahi Residu Sampah*.\nPilih menu di bawah ini:`,
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
// REGISTRATION FLOW (Simplified 2 Steps + Web Option)
// ──────────────────────────────────────────────

const REG = {
    CHOOSE_METHOD: "CHOOSE_METHOD",
    WAITING_NAME: "WAITING_NAME",
    WAITING_ADDRESS: "WAITING_ADDRESS",
    WAITING_CONFIRM: "WAITING_CONFIRM"
};

async function startRegistration(senderNumber, referrerId) {
    registrationSessions[senderNumber] = { step: REG.CHOOSE_METHOD, data: { referrerId, phoneNumber: senderNumber } };

    let referrerInfo = "";
    if (referrerId) {
        const { data: referrer } = await supabase.from("profiles").select("full_name").eq("id", referrerId).single();
        if (referrer) referrerInfo = `\n📎 Diundang oleh: *${referrer.full_name}*`;
    }

    const webUrl = referrerId
        ? `${getAppDomain()}/auth?ref=${referrerId}`
        : `${getAppDomain()}/auth`;

    // Kirim pilihan metode pendaftaran
    await sendWhatsAppMessage(senderNumber,
        `🌿 *Selamat Datang di Aplikasi BERES!*\n` +
        `_Benahi Residu Sampah_\n${referrerInfo}\n\n` +
        `Setor sampah dari rumah, dapat penghasilan! ♻️💰\n\n` +
        `Pilih cara mendaftar:`
    );

    // Tombol CTA ke web
    await sendCTAUrl(senderNumber,
        `🌐 *Daftar via Website*\nDaftar lengkap dengan form interaktif di browser Anda.`,
        "🌐 Buka Formulir Web", webUrl,
        null, "Lebih cepat & mudah"
    );

    // Tombol daftar via chat
    return sendButtons(senderNumber,
        `💬 *Daftar via WhatsApp*\nCukup 2 langkah — ketik nama & alamat, selesai!`,
        [{ id: "reg_chat", title: "💬 Daftar via Chat" }],
        null, "Hanya butuh 1 menit"
    );
}

async function handleRegistrationFlow(senderNumber, messageTextRaw) {
    const session = registrationSessions[senderNumber];
    if (!session) return false;
    const text = messageTextRaw.trim();
    const cmd = text.toLowerCase();

    // Batalkan kapan saja
    if (cmd === "batal" || cmd === "confirm_batal") {
        delete registrationSessions[senderNumber];
        return sendButtons(senderNumber,
            "❌ Pendaftaran dibatalkan.\n\nAnda bisa mendaftar kapan saja.",
            [{ id: "daftar", title: "📝 Daftar Ulang" }],
            null, "Aplikasi BERES | Benahi Residu Sampah"
        );
    }

    switch (session.step) {
        case REG.CHOOSE_METHOD:
            if (cmd !== "reg_chat" && cmd !== "daftar") {
                return sendButtons(senderNumber,
                    "Silakan pilih metode pendaftaran:",
                    [{ id: "reg_chat", title: "💬 Daftar via Chat" }],
                    null, null
                );
            }
            session.step = REG.WAITING_NAME;
            return sendWhatsAppMessage(senderNumber,
                `📝 *Pendaftaran via WhatsApp*\n\n` +
                `*Langkah 1 dari 2* — Nama Lengkap\n\n` +
                `Silakan ketik nama lengkap Anda:\n` +
                `_(Contoh: Ahmad Fauzi)_`
            );

        case REG.WAITING_NAME:
            if (text.length < 3) return sendWhatsAppMessage(senderNumber, "⚠️ Nama terlalu pendek. Minimal 3 karakter.");
            session.data.fullName = text;
            session.step = REG.WAITING_ADDRESS;
            return sendWhatsAppMessage(senderNumber,
                `Baik, *${text}*! 👍\n\n` +
                `*Langkah 2 dari 2* — Alamat Rumah\n\n` +
                `Ketik alamat lengkap Anda dalam *satu pesan*:\n\n` +
                `_Contoh:_\n` +
                `_Jl. Mangga No. 12, RT 03/RW 05,_\n` +
                `_Desa Sukamaju, Kec. Ciamis,_\n` +
                `_Kab. Ciamis, Jawa Barat_`
            );

        case REG.WAITING_ADDRESS:
            if (text.length < 10) return sendWhatsAppMessage(senderNumber, "⚠️ Alamat terlalu pendek. Pastikan alamat lengkap (min. 10 karakter).");
            session.data.address = text;
            session.step = REG.WAITING_CONFIRM;

            let refInfo = "";
            if (session.data.referrerId) {
                const { data: ref } = await supabase.from("profiles").select("full_name").eq("id", session.data.referrerId).single();
                if (ref) refInfo = `\n📎 Diundang oleh: *${ref.full_name}*`;
            }

            return sendButtons(senderNumber,
                `📋 *Konfirmasi Data Pendaftaran*\n\n` +
                `┌────────────────────\n` +
                `│ 👤 *${session.data.fullName}*\n` +
                `│ 📱 ${senderNumber}\n` +
                `│ 🏠 ${session.data.address}\n` +
                `└────────────────────${refInfo}\n\n` +
                `Apakah data di atas sudah benar?`,
                [
                    { id: "confirm_ya", title: "✅ Ya, Daftarkan" },
                    { id: "confirm_koreksi", title: "✏️ Ulangi" },
                    { id: "confirm_batal", title: "❌ Batalkan" }
                ],
                "📝 Konfirmasi", "Aplikasi BERES | Benahi Residu Sampah"
            );

        case REG.WAITING_CONFIRM:
            if (cmd === "koreksi" || cmd === "confirm_koreksi" || cmd === "✏️ ulangi") {
                session.step = REG.WAITING_NAME;
                session.data = { referrerId: session.data.referrerId, phoneNumber: session.data.phoneNumber };
                return sendWhatsAppMessage(senderNumber, "📝 Mari ulangi.\n\n*Langkah 1 dari 2* — Ketik nama lengkap Anda:");
            }
            if (cmd !== "ya" && cmd !== "confirm_ya" && cmd !== "✅ ya, daftarkan") {
                return sendButtons(senderNumber,
                    "Silakan konfirmasi data Anda:",
                    [
                        { id: "confirm_ya", title: "✅ Ya, Daftarkan" },
                        { id: "confirm_koreksi", title: "✏️ Ulangi" },
                        { id: "confirm_batal", title: "❌ Batalkan" }
                    ], null, null
                );
            }

            // === PROSES PENDAFTARAN ===
            try {
                const tempEmail = `wa_${senderNumber}@ecosistemdigital.id`;
                const tempPassword = `EcoWA_${senderNumber}_${Date.now()}`;
                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: tempEmail, password: tempPassword, email_confirm: true,
                    user_metadata: { full_name: session.data.fullName }
                });
                if (authError) {
                    console.error("Reg Auth Error:", authError);
                    return sendWhatsAppMessage(senderNumber, "⚠️ Terjadi kendala. Silakan coba lagi atau daftar via web.");
                }

                await supabase.from("profiles").update({
                    full_name: session.data.fullName,
                    phone_number: senderNumber,
                    address: session.data.address,
                    role: "user",
                    registration_source: "whatsapp",
                    is_registration_complete: true,
                    referred_by: session.data.referrerId || null
                }).eq("id", authUser.user.id);

                await supabase.from("user_wallets").insert({ user_id: authUser.user.id, balance: 0 });
                await loadBotConfigs();

                // Pesan sukses
                await sendWhatsAppMessage(senderNumber,
                    `🎉 *Pendaftaran Berhasil!*\n\n` +
                    `Selamat bergabung, *${session.data.fullName}*! 🌿\n\n` +
                    `Anda kini bisa menyetor sampah dan mendapatkan penghasilan melalui *Aplikasi BERES*.\n\n` +
                    `♻️ *Langkah selanjutnya:*\n` +
                    `1. Pisahkan sampah organik & anorganik\n` +
                    `2. Request jemput melalui menu bot\n` +
                    `3. Petugas datang, sampah ditimbang\n` +
                    `4. Saldo masuk otomatis ke dompet digital Anda!`
                );

                await sendMainMenu(senderNumber, session.data.fullName);
                delete registrationSessions[senderNumber];
            } catch (e) {
                console.error("Registration Error:", e);
                sendWhatsAppMessage(senderNumber, "⚠️ Error sistem. Silakan coba lagi.");
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
        `💰 *Saldo Dompet Digital*\n\n👤 Nama: *${userProfile.full_name}*\n💵 Saldo: *Rp ${saldo}*\n\n_Saldo bertambah setiap kali Anda menyetorkan sampah._`,
        [
            { id: "riwayat", title: "📜 Lihat Riwayat" },
            { id: "tarik_tunai", title: "💸 Tarik Tunai" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        null, "Aplikasi BERES"
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
        null, "Aplikasi BERES"
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
    
    return sendButtons(senderNumber, bodyText, [
        { id: "saldo", title: "💰 Cek Saldo" },
        { id: "btn_menu", title: "📋 Menu Utama" }
    ], null, "Aplikasi BERES");
}

async function handleMenuTarikTunai(senderNumber, userProfile) {
    const { data: wallet } = await supabase.from("user_wallets").select("balance").eq("user_id", userProfile.id).single();
    if (!wallet || wallet.balance <= 0) {
        return sendWhatsAppMessage(senderNumber, "❌ *Saldo Anda Kosong*.\nSilakan setor sampah terlebih dahulu untuk mencairkan saldo.");
    }
    
    // Check pending request
    const { data: existing } = await supabase.from("withdraw_requests").select("id").eq("user_id", userProfile.id).eq("status", "pending").single();
    if (existing) {
        return sendWhatsAppMessage(senderNumber, "⏳ Anda masih memiliki pengajuan pencairan yang sedang *Diproses*.\nSilakan temui admin Bank Sampah Anda untuk mengambil uang tunai.");
    }

    // Insert to withdraw_requests 
    await supabase.from("withdraw_requests").insert([{
        user_id: userProfile.id,
        amount: 0, // Admin decides the actual actual amount given
        bank_name: "TUNAI",
        account_no: "-",
        status: "pending"
    }]);

    return sendWhatsAppMessage(senderNumber, `💸 *Pengajuan Pencairan Saldo Berhasil*\n\n✅ Request tarik tunai Anda telah dikirim ke Admin Bank Sampah.\n\n📍 *Langkah Selanjutnya:*\nSilakan datang ke Bank Sampah Anda dan temui Admin. Tunjukkan QR Code Anda atau sebutkan nomor WA ini. Admin akan mencairkan uang tunai dan memotong saldo Anda sesuai jumlah yang ditarik.\n\nKetik *MENU* untuk kembali.`);
}
async function handleMenuHarga(senderNumber, userProfile) {
    let pricesData = [];
    let bankName = 'Bank Sampah Anda';

    if (userProfile && userProfile.bank_sampah_id) {
        // Ambil nama bank sampah untuk ditampilkan
        const { data: bankData } = await supabase.from('bank_sampah_units')
            .select('name')
            .eq('id', userProfile.bank_sampah_id)
            .single();
        if (bankData) bankName = bankData.name;

        // Filter hanya harga BELI dari warga (inbound ke bank sampah)
        const { data, error } = await supabase.from('unit_commodity_prices')
            .select('name, price_per_kg, unit, category')
            .eq('bank_sampah_unit_id', userProfile.bank_sampah_id)
            .eq('trade_type', 'buy_from_citizen')
            .eq('is_active', true)
            .order('name');

        if (error) console.error('[BOT] Error fetch harga:', error.message);
        if (data && data.length > 0) pricesData = data;
    }

    let priceList = `┌─────────────────────────\n`;
    let icons = ["♻️", "📦", "🔩", "📰", "🍶", "🛢️", "🥤"];
    if (pricesData && pricesData.length > 0) {
        pricesData.forEach((p, idx) => {
             const icon = icons[idx % icons.length];
             const nameStr = p.name.padEnd(14, ' ');
             const price = Number(p.price_per_kg).toLocaleString('id-ID');
             priceList += `│ ${icon} ${nameStr} Rp ${price}/${p.unit || 'kg'}\n`;
        });
    } else {
        priceList += `│ Harga belum diatur oleh Admin.\n│ Hubungi Bank Sampah Anda.\n`;
    }
    priceList += `└─────────────────────────`;

    return sendButtons(senderNumber,
        `💲 *Harga Beli Sampah*\n📍 ${bankName}\n\n${priceList}\n\n_Harga dapat berubah sewaktu-waktu_`,
        [
            { id: "jemput", title: "🚛 Request Jemput" },
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        null, "Aplikasi BERES"
    );
}

async function handleMenuReferral(senderNumber, userProfile) {
    const refLink = `${getAppDomain()}/auth?ref=${userProfile.id}`;

    // 1. Pesan utama (Interactive)
    await sendButtons(senderNumber,
        `📢 *Program Referral BERES*\n\n` +
        `Ajak warga sekitar bergabung dan dapatkan *bonus saldo* setiap berhasil mengajak! 🎁\n\n` +
        `🔗 *Link Referral Anda:*\n${refLink}`,
        [
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        null, "Aplikasi BERES"
    );

    // 2. Pengantar forward
    await sendWhatsAppMessage(senderNumber,
        `👇 *Teruskan pesan di bawah ini ke teman Anda:*`
    );

    // 3. Pesan siap-forward (Teks murni)
    return sendWhatsAppMessage(senderNumber,
        `♻️🌿 *Aplikasi BERES — Benahi Residu Sampah*\n\n` +
        `Hai! Tau nggak? Sekarang sampah rumah tangga bisa jadi uang! 💰\n\n` +
        `✅ Gratis daftar\n` +
        `✅ Sampah dijemput dari rumah\n` +
        `✅ Ditimbang & dibayar langsung ke dompet digital\n\n` +
        `Yuk gabung sekarang! 👇\n${refLink}`
    );
}

async function handleMenuBantuan(senderNumber) {
    const csPhone = systemSettings["cs_phone_number"] || "08xxxxxxxxxx";
    await sendButtons(senderNumber,
        `📞 *Pusat Bantuan — Aplikasi BERES*\n\n` +
        `Butuh bantuan? Hubungi Customer Service kami:\n\n` +
        `📱 CS: wa.me/${csPhone.replace(/^0/, '62')}\n` +
        `📧 Email: cs@beres.id\n` +
        `🕐 Jam Operasional: 08.00 - 17.00 WITA\n\n` +
        `_Atau ketik pertanyaan Anda dan kami akan segera merespons._`,
        [
            { id: "btn_menu", title: "📋 Menu Utama" }
        ],
        null, "Aplikasi BERES"
    );
    return sendCTAUrl(senderNumber,
        "Anda juga bisa langsung chat CS kami:",
        "💬 Chat CS Sekarang", `https://wa.me/${csPhone.replace(/^0/, '62')}`,
        null, null
    );
}

// ──────────────────────────────────────────────
// QR CODE HANDLER
// ──────────────────────────────────────────────

async function handleMenuQrCode(senderNumber, userProfile) {
    if (userProfile.role !== "user") {
        return sendWhatsAppMessage(senderNumber, "Fitur ini khusus untuk warga / nasabah Bank Sampah.");
    }
    
    return sendCTAUrl(
        senderNumber,
        `🪪 *Identitas & QR Code Warga*\n\n` +
        `Halo *${userProfile.full_name}*,\n` +
        `Anda bisa menggunakan QR Code ini untuk diserahkan ke kurir saat penjemputan sampah.\n\n` +
        `Klik tombol di bawah ini untuk melihat dan mencetak Kartu ID / QR Code Anda secara mandiri:`,
        "🔎 Lihat QR Code",
        `${getAppDomain()}/qr/${userProfile.id}`,
        "💳 Kartu Warga BERES",
        "Tunjukkan layar HP atau cetak ID Card ini"
    );
}

// ──────────────────────────────────────────────
// COURIER REGISTRATION HANDLER
// ──────────────────────────────────────────────

async function handleDaftarKurir(senderNumber, userProfile) {
    // Check if already a courier
    if (userProfile.role === "courier") {
        return sendWhatsAppMessage(senderNumber, `Anda sudah terdaftar sebagai kurir aktif, ${userProfile.full_name}! 🚛\n\nAkses Dashboard Kurir di sini:\n${getAppDomain()}/courier`);
    }

    // Check if already applied
    const { data: existing } = await supabase
        .from("courier_applications")
        .select("status, reject_reason")
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (existing && existing.status === "pending") {
        return sendWhatsAppMessage(senderNumber,
            `⏳ Lamaran kurir Anda sedang dalam *proses peninjauan* oleh admin.\n\nKami akan mengirimkan notifikasi ke WhatsApp ini begitu ada keputusan. Terima kasih atas kesabaran Anda! 🙏`
        );
    }

    if (existing && existing.status === "rejected") {
        return sendCTAUrl(
            senderNumber,
            `Lamaran kurir Anda sebelumnya ditolak.\n📋 Alasan: _${existing.reject_reason || "Tidak memenuhi syarat"}_\n\nAnda dapat mendaftar ulang dengan data yang sudah diperbaiki:`,
            "📝 Daftar Ulang Kurir",
            `${getAppDomain()}/courier/register`,
            "🚛 Pendaftaran Kurir BERES",
            "Pastikan foto KTP dan dokumen sudah jelas"
        );
    }

    // New applicant — send CTA to registration form
    return sendCTAUrl(
        senderNumber,
        `Ingin jadi *Pahlawan Lingkungan*? 🦸‍♂️\n\nDaftar sebagai kurir BERES dan dapatkan penghasilan dengan menjemput sampah warga!\n\n✅ Kerja fleksibel\n✅ Notif order langsung ke WA\n✅ Komisi setiap jemputan\n\nKlik tombol di bawah untuk mengisi formulir pendaftaran:`,
        "📝 Daftar Jadi Kurir",
        `${getAppDomain()}/courier/register`,
        "🚛 Rekrutmen Kurir BERES",
        "Siapkan foto KTP, SIM (opsional), dan Selfie+KTP"
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
                `Halo! 👋\n\nNomor Anda belum terdaftar di *Aplikasi BERES | Benahi Residu Sampah*.\n\nSetor sampah dari rumah, dapat penghasilan! ♻️💰`,
                [{ id: "daftar", title: "📝 Daftar Sekarang" }],
                "♻️ Aplikasi BERES", "Ketik DAFTAR atau klik tombol"
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

            case "tarik_tunai":
            case "tarik tunai":
            case "tarik saldo":
            case "pencairan":
                return await handleMenuTarikTunai(senderNumber, userProfile);

            case "harga":
            case "daftar harga":
                return await handleMenuHarga(senderNumber, userProfile);

            case "referral":
            case "ajak teman":
                return await handleMenuReferral(senderNumber, userProfile);

            case "bantuan":
            case "cs":
            case "help":
                return await handleMenuBantuan(senderNumber);

            case "qr code":
            case "qrcode":
            case "id card":
            case "kartu":
                return await handleMenuQrCode(senderNumber, userProfile);

            case "daftar kurir":
            case "kurir":
            case "jadi kurir":
            case "gabung kurir":
                return await handleDaftarKurir(senderNumber, userProfile);

            case "menu":
            case "hi":
            case "halo":
            case "btn_menu":
                return await sendMainMenu(senderNumber, userProfile.full_name);

            default:
                // Coba cocokkan dari database menu lama
                const matchedMenu = botMenus.find(m => command === m.menu_key);
                if (matchedMenu) {
                    let tv = { nama: userProfile.full_name, nomor_cs: systemSettings["cs_phone_number"] || "-", link_web: getAppDomain(), link_referral: `${getAppDomain()}/auth?ref=${userProfile.id}` };
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
// WEBHOOK POLLING & REALTIME
// ──────────────────────────────────────────────

let isProcessing = false;

async function processPendingWebhooks() {
    if (isProcessing) return; // Mencegah double trigger
    isProcessing = true;
    try {
        const { data: webhooks, error } = await supabase
            .from("whatsapp_webhooks")
            .select("*")
            .eq("processed", false)
            .order("id", { ascending: true })
            .limit(10);

        if (error) { console.error("Poll Error:", error.message); isProcessing = false; return; }
        if (!webhooks || webhooks.length === 0) { isProcessing = false; return; }

        // Tandai diproses secara synchronous sebelum eksekusi logic untuk mencegah race condition (double trigger)
        const ids = webhooks.map(w => w.id);
        await supabase.from("whatsapp_webhooks").update({ processed: true }).in("id", ids);

        for (const wh of webhooks) {

            const changes = wh.payload?.entry?.[0]?.changes?.[0]?.value;
            if (!changes || !changes.messages || changes.messages.length === 0) continue;

            const msgInfo = changes.messages[0];
            const from = msgInfo.from;
            const msgId = msgInfo.id;

            // Langsung kirim centang biru + typing (non-blocking, tidak menunda)
            markAsRead(msgId);
            showTyping(from);

            if (msgInfo.type === "text" && msgInfo.text?.body) {
                // Jangan di-await agar bisa lanjut proses antrian (fire-and-forget approach for webhooks)
                handleIncomingMessage(from, msgInfo.text.body, null).catch(console.error);
            } else if (msgInfo.type === "interactive") {
                const btnReply = msgInfo.interactive?.button_reply;
                const listReply = msgInfo.interactive?.list_reply;
                const interactionId = btnReply?.id || listReply?.id || "";
                const interactionTitle = btnReply?.title || listReply?.title || "";
                console.log(`[BOT] Interactive: ${interactionId} (${interactionTitle}) from ${from}`);
                handleIncomingMessage(from, interactionTitle, interactionId).catch(console.error);
            }
        }
    } catch (e) {
        console.error("Poll Exception:", e.message);
    } finally {
        isProcessing = false;
        // Check if there's more pending after we finish this batch
        checkMorePending();
    }
}

async function checkMorePending() {
    const { count } = await supabase.from("whatsapp_webhooks").select('*', { count: 'exact', head: true }).eq("processed", false);
    if (count && count > 0) processPendingWebhooks();
}

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────

async function boot() {
    await loadBotConfigs();
    console.log("✅ Konfigurasi dimuat. Bot Beres siap dengan Interactive UI & Realtime Engine!");
    console.log(`📱 Phone ID: ${systemSettings["wa_phone_number_id"] || "NOT SET"}`);
    console.log(`🔑 Token: ${systemSettings["wa_api_token"] ? "OK (" + systemSettings["wa_api_token"].substring(0, 15) + "...)" : "NOT SET"}`);
    
    // START REALTIME LISTENER FOR INSTANT RESPONSES ⚡
    supabase
        .channel('whatsapp_instant_hook')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'whatsapp_webhooks' },
            (payload) => {
                // Langsung trigger tanpa perlu menunggu polling!
                processPendingWebhooks();
            }
        )
        .subscribe((status) => {
            console.log(`📡 Realtime Status: ${status}`);
        });

    // Fallback Polling (berjaga-jaga jika Socket/Realtime terputus sementara)
    setInterval(processPendingWebhooks, 5000);
}

boot();
