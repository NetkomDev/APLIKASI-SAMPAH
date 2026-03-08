require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCodeImage = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Global State
let systemSettings = {};
let botMenus = [];
const registrationSessions = {};

// ── ANTI-BAN: Rate Limiter ──
const rateLimiter = {}; // { phoneNumber: { count, resetAt } }
const MAX_MSGS_PER_USER_PER_DAY = 30;
let globalDailyMsgCount = 0;
let globalDailyResetAt = Date.now() + 86400000;
const MAX_GLOBAL_MSGS_PER_DAY = 200;

function isRateLimited(phoneNumber) {
    const now = Date.now();
    // Reset global counter daily
    if (now > globalDailyResetAt) {
        globalDailyMsgCount = 0;
        globalDailyResetAt = now + 86400000;
    }
    // Global cap
    if (globalDailyMsgCount >= MAX_GLOBAL_MSGS_PER_DAY) {
        console.log(`[RATE] Global daily limit reached (${MAX_GLOBAL_MSGS_PER_DAY})`);
        return true;
    }
    // Per-user cap
    if (!rateLimiter[phoneNumber] || now > rateLimiter[phoneNumber].resetAt) {
        rateLimiter[phoneNumber] = { count: 0, resetAt: now + 86400000 };
    }
    if (rateLimiter[phoneNumber].count >= MAX_MSGS_PER_USER_PER_DAY) {
        console.log(`[RATE] User ${phoneNumber} daily limit reached (${MAX_MSGS_PER_USER_PER_DAY})`);
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

// ── ANTI-BAN: Random human-like delay ──
function randomDelay(minMs, maxMs) {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
} // Track ongoing WA registrations { phoneNumber: { step, data } }

// Init WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']
    }
});

// ──────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────

function formatResponse(template, variables) {
    let result = template || '';

    // Konversi text literal "\n" dari panel Admin menjadi karakter baris baru sesungguhnya
    result = result.replace(/\\n/g, '\n');

    for (const key in variables) {
        const re = new RegExp(`{${key}}`, 'gi');
        const val = variables[key] ?? '';
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

// ──────────────────────────────────────────────
// SUPABASE INIT & CONFIG LOADING
// ──────────────────────────────────────────────

async function initializeBotStatusSettings() {
    const statusKeys = ['bot_status', 'bot_qr_code'];
    for (const key of statusKeys) {
        const { data: exStatus } = await supabase.from('system_settings').select('id').eq('key_name', key).single();
        if (!exStatus) {
            await supabase.from('system_settings').insert({ key_name: key, value_text: '', category: 'bot' });
        }
    }
    console.log('[SUPABASE] Bot status settings initialized/checked.');
}

async function loadBotConfigs() {
    try {
        const { data: settings } = await supabase.from('system_settings').select('key_name, value_text');
        if (settings) {
            settings.forEach(s => { systemSettings[s.key_name] = s.value_text; });
        }
        const { data: menus } = await supabase.from('wa_menu_configs').select('*').eq('is_active', true).order('sort_order');
        if (menus) { botMenus = menus; }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// ──────────────────────────────────────────────
// WHATSAPP CLIENT EVENTS
// ──────────────────────────────────────────────

client.on('qr', async (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('[WA] Scan the QR code above with your WhatsApp app.');
    try {
        const qrImageBase64 = await QRCodeImage.toDataURL(qr, { margin: 1 });
        await supabase.from('system_settings').update({ value_text: qrImageBase64 }).eq('key_name', 'bot_qr_code');
        await supabase.from('system_settings').update({ value_text: 'WAITING_QR' }).eq('key_name', 'bot_status');
    } catch (e) {
        console.error('[WA] Fail uploading QR to Dashboard:', e);
    }
});

client.on('authenticated', () => { console.log('✅ Authenticated!'); });
client.on('auth_failure', msg => { console.error('❌ Auth failure', msg); });

client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready!');
    await loadBotConfigs();
    console.log('⚙️ Konfigurasi berhasil dimuat dari Supabase.');
    await supabase.from('system_settings').update({ value_text: '' }).eq('key_name', 'bot_qr_code');
    await supabase.from('system_settings').update({ value_text: 'CONNECTED' }).eq('key_name', 'bot_status');

    // ANTI-BAN: Tidak lagi mengirim pesan proaktif ke nomor yang belum pernah chat.
    // Welcome akan dikirim saat user pertama kali mengirim pesan ke bot (lihat handler).
});

client.on('disconnected', async (reason) => {
    console.log('[WA] Bot was disconnected!', reason);
    await supabase.from('system_settings').update({ value_text: 'DISCONNECTED' }).eq('key_name', 'bot_status');
});

// ──────────────────────────────────────────────
// WELCOME FOR WEB REGISTRANTS (Reactive, bukan Proactive)
// Dikirim saat user yang registrasi via web PERTAMA KALI mengirim pesan ke bot.
// ──────────────────────────────────────────────

async function sendWebWelcomeIfNeeded(msg, userProfile) {
    if (userProfile.registration_source !== 'web') return;
    try {
        const welcomeTemplate = systemSettings['registration_welcome'] || 'Selamat datang, {nama}!';
        let welcomeMsg = formatResponse(welcomeTemplate, { nama: userProfile.full_name });
        welcomeMsg += '\n\n' + generateMenuList();
        await msg.reply(welcomeMsg);
        console.log(`[WA] Reactive welcome sent to web user: ${userProfile.full_name}`);
        await supabase.from('profiles').update({ registration_source: 'web_welcomed' }).eq('id', userProfile.id);
    } catch (e) {
        console.error('[WA] Failed to send reactive welcome:', e.message);
    }
}

// ──────────────────────────────────────────────
// WA REGISTRATION FLOW (for referral users)
// ──────────────────────────────────────────────

const REGISTRATION_STEPS = {
    WAITING_NAME: 'WAITING_NAME',
    WAITING_JALAN: 'WAITING_JALAN',
    WAITING_NOMOR: 'WAITING_NOMOR',
    WAITING_RTRW: 'WAITING_RTRW',
    WAITING_DESA: 'WAITING_DESA',
    WAITING_KECAMATAN: 'WAITING_KECAMATAN',
    WAITING_KABUPATEN: 'WAITING_KABUPATEN',
    WAITING_PROVINSI: 'WAITING_PROVINSI',
    WAITING_CONFIRM: 'WAITING_CONFIRM'
};

async function startRegistration(msg, senderNumber, referrerId) {
    registrationSessions[senderNumber] = {
        step: REGISTRATION_STEPS.WAITING_NAME,
        data: { referrerId, phoneNumber: senderNumber }
    };

    let referrerInfo = '';
    if (referrerId) {
        const { data: referrer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', referrerId)
            .single();
        if (referrer) {
            referrerInfo = `\n📎 Anda diundang oleh: *${referrer.full_name}*\n`;
        }
    }

    await msg.reply(
        `📝 *Pendaftaran Akun EcoSistem Digital*\n${referrerInfo}\nMari kita mulai!\n\n*Langkah 1/2*: Siapa nama lengkap Anda?`
    );
}

async function handleRegistrationFlow(msg, senderNumber) {
    const session = registrationSessions[senderNumber];
    if (!session) return false;

    const messageText = msg.body.trim();

    // Allow cancel at any step
    if (messageText.toLowerCase() === 'batal') {
        delete registrationSessions[senderNumber];
        await msg.reply('❌ Pendaftaran dibatalkan. Ketik *DAFTAR* kapan saja untuk mendaftar kembali.');
        return true;
    }

    switch (session.step) {
        case REGISTRATION_STEPS.WAITING_NAME: {
            if (messageText.length < 3) {
                await msg.reply('⚠️ Nama terlalu pendek. Silakan masukkan nama lengkap Anda (minimal 3 karakter):');
                return true;
            }
            session.data.fullName = messageText;
            session.step = REGISTRATION_STEPS.WAITING_JALAN;
            await msg.reply(
                `Baik, *${messageText}*! 👍\n\n*Langkah 2/2*: Masukkan alamat lengkap Anda:\nNama Jalan/Dusun:\n_(Contoh: Jl. Pisang atau Dusun Mekar Jaya)_`
            );
            return true;
        }

        case REGISTRATION_STEPS.WAITING_JALAN: {
            if (messageText.length < 3) {
                await msg.reply('⚠️ Nama Jalan terlalu pendek. Silakan masukkan nama Jalan/Dusun:');
                return true;
            }
            session.data.jalan = messageText;
            session.step = REGISTRATION_STEPS.WAITING_NOMOR;
            await msg.reply(`Nomor Rumah:\n_(Ketik "-" jika tidak ada)_`);
            return true;
        }

        case REGISTRATION_STEPS.WAITING_NOMOR: {
            session.data.nomor = messageText;
            session.step = REGISTRATION_STEPS.WAITING_RTRW;
            await msg.reply(`RT/RW:\n_(Contoh: 03/05)_`);
            return true;
        }

        case REGISTRATION_STEPS.WAITING_RTRW: {
            session.data.rtrw = messageText;
            session.step = REGISTRATION_STEPS.WAITING_DESA;
            await msg.reply(`Desa/Kelurahan:`);
            return true;
        }

        case REGISTRATION_STEPS.WAITING_DESA: {
            session.data.desa = messageText;
            session.step = REGISTRATION_STEPS.WAITING_KECAMATAN;
            await msg.reply(`Kecamatan:`);
            return true;
        }

        case REGISTRATION_STEPS.WAITING_KECAMATAN: {
            session.data.kecamatan = messageText;
            session.step = REGISTRATION_STEPS.WAITING_KABUPATEN;
            await msg.reply(`Kabupaten/Kota:`);
            return true;
        }

        case REGISTRATION_STEPS.WAITING_KABUPATEN: {
            session.data.kabupaten = messageText;
            session.step = REGISTRATION_STEPS.WAITING_PROVINSI;
            await msg.reply(`Provinsi:`);
            return true;
        }

        case REGISTRATION_STEPS.WAITING_PROVINSI: {
            session.data.provinsi = messageText;

            let formattedAddress = session.data.jalan;
            if (session.data.nomor && session.data.nomor !== '-') {
                formattedAddress += ` No. ${session.data.nomor}`;
            }
            formattedAddress += `, RT/RW ${session.data.rtrw}, Desa/Kel. ${session.data.desa}, Kec. ${session.data.kecamatan}, ${session.data.kabupaten}, Provinsi ${session.data.provinsi}`;

            session.data.address = formattedAddress;
            session.step = REGISTRATION_STEPS.WAITING_CONFIRM;

            let referrerLine = '';
            if (session.data.referrerId) {
                const { data: ref } = await supabase.from('profiles').select('full_name').eq('id', session.data.referrerId).single();
                if (ref) referrerLine = `📎 Diundang oleh: *${ref.full_name}*\n`;
            }

            await msg.reply(
                `📋 *Konfirmasi Data Pendaftaran:*\n\n👤 Nama: *${session.data.fullName}*\n📱 No. HP: *${senderNumber}*\n🏠 Alamat: *${session.data.address}*\n${referrerLine}\nApakah data di atas sudah benar?\nKetik *YA* bila benar, atau *KOREKSI* jika ada yang salah.`
            );
            return true;
        }

        case REGISTRATION_STEPS.WAITING_CONFIRM: {
            if (messageText.toLowerCase() === 'koreksi') {
                session.step = REGISTRATION_STEPS.WAITING_NAME;
                Object.keys(session.data).forEach(key => {
                    if (key !== 'referrerId' && key !== 'phoneNumber') delete session.data[key];
                });
                await msg.reply('Mari kita ulangi proses pendaftaran.\n\n*Langkah 1/2*: Siapa nama lengkap Anda?');
                return true;
            }

            if (messageText.toLowerCase() !== 'ya') {
                await msg.reply('⚠️ Pilihan tidak valid. Ketik *YA* untuk konfirmasi data, atau ketik *KOREKSI* untuk mengulang pengisian data.');
                return true;
            }

            try {
                // Create Supabase Auth user (no email, phone-based)
                const tempEmail = `wa_${senderNumber}@ecosistemdigital.id`;
                const tempPassword = `EcoWA_${senderNumber}_${Date.now()}`;

                const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                    email: tempEmail,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: { full_name: session.data.fullName }
                });

                if (authError) {
                    console.error('[REG] Auth error:', authError);
                    await msg.reply('⚠️ Terjadi kendala saat mendaftarkan akun Anda. Silakan coba lagi nanti atau hubungi CS.');
                    delete registrationSessions[senderNumber];
                    return true;
                }

                // Update the profile created by trigger
                await supabase.from('profiles').update({
                    full_name: session.data.fullName,
                    phone_number: senderNumber,
                    address: session.data.address,
                    role: 'user',
                    registration_source: 'whatsapp',
                    is_registration_complete: true,
                    referred_by: session.data.referrerId || null
                }).eq('id', authUser.user.id);

                // Create wallet for new user
                await supabase.from('user_wallets').insert({ user_id: authUser.user.id, balance: 0 });

                // Send completion message
                await loadBotConfigs(); // Refresh config
                const completeTemplate = systemSettings['wa_registration_complete'] || '✅ Pendaftaran berhasil, {nama}!';
                let completeMsg = formatResponse(completeTemplate, { nama: session.data.fullName });
                completeMsg += '\n\n' + generateMenuList();

                await msg.reply(completeMsg);
                console.log(`[REG] New user registered via WA: ${session.data.fullName} (${senderNumber})`);

                delete registrationSessions[senderNumber];
            } catch (e) {
                console.error('[REG] Registration error:', e);
                await msg.reply('⚠️ Terjadi kesalahan sistem. Silakan coba lagi nanti.');
                delete registrationSessions[senderNumber];
            }
            return true;
        }
    }

    return false;
}

// ──────────────────────────────────────────────
// MAIN MESSAGE HANDLER
// ──────────────────────────────────────────────

client.on('message', async msg => {
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    // ── ANTI-BAN: Override msg.reply dengan random delay + typing ──
    const originalReply = msg.reply.bind(msg);
    msg.reply = async (content, chatId, options) => {
        try {
            await chat.sendStateTyping();
            // Delay RANDOM antara 2-5 detik agar terlihat natural
            const delay = randomDelay(2000, 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            await chat.clearState();
        } catch (e) {
            console.error('[WA] Gagal mengatur status typing:', e.message);
        }
        return originalReply(content, chatId, options);
    };

    // Wrap chat.sendMessage juga (untuk pesan referral ke-2)
    const originalSendMessage = chat.sendMessage.bind(chat);
    chat.sendMessage = async (content, options) => {
        try {
            await chat.sendStateTyping();
            const delay = randomDelay(2000, 4000);
            await new Promise(resolve => setTimeout(resolve, delay));
            await chat.clearState();
        } catch (e) { /* ignore */ }
        trackMessage(senderNumber);
        return originalSendMessage(content, options);
    };

    const contact = await msg.getContact();
    let senderNumber = contact.number;

    // Fallback if contact.number is undefined
    if (!senderNumber) {
        let rawId = msg.author || msg.from;
        senderNumber = rawId.split('@')[0].split(':')[0];
    }

    const messageText = msg.body.trim().toLowerCase();

    console.log('[BOT] MSG IN:', senderNumber, msg.body);

    // ── ANTI-BAN: Rate limiter check ──
    if (isRateLimited(senderNumber)) {
        return; // Diam saja, jangan balas
    }
    trackMessage(senderNumber);

    // ── Handle ongoing registration session first ──
    if (registrationSessions[senderNumber]) {
        await handleRegistrationFlow(msg, senderNumber);
        return;
    }

    // ── Superadmin RELOAD command ──
    if (messageText === 'reload') {
        const { data: profile } = await supabase.from('profiles').select('role').eq('phone_number', senderNumber).single();
        if (profile && profile.role === 'superadmin') {
            await loadBotConfigs();
            return msg.reply('✅ Konfigurasi bot berhasil diperbarui dari server.');
        }
    }

    try {
        // ── 1. Check if user is registered ──
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, full_name, role, is_registration_complete, registration_source')
            .eq('phone_number', senderNumber)
            .single();

        // ── 1.5 REACTIVE WELCOME: kirim welcome saat user web pertama kali chat ──
        if (userProfile && userProfile.registration_source === 'web') {
            await sendWebWelcomeIfNeeded(msg, userProfile);
            return; // Selesai, welcome sudah terkirim + menu
        }

        // ── 2. UNREGISTERED USER ──
        if (!userProfile) {
            // Check if message contains referral code (ref=UUID format)
            const refMatch = msg.body.match(/ref[=:]?\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);

            if (refMatch) {
                // Start registration via referral
                await startRegistration(msg, senderNumber, refMatch[1]);
                return;
            }

            if (messageText === 'daftar') {
                // Start registration without referral
                await startRegistration(msg, senderNumber, null);
                return;
            }

            // Default: show unregistered message
            let unregisteredMsg = systemSettings['unregistered_message'] || 'Nomor Anda belum terdaftar.';
            unregisteredMsg = formatResponse(unregisteredMsg, {
                link_web: 'https://aplikasi-sampah.vercel.app/auth'
            });
            return msg.reply(unregisteredMsg);
        }

        // ── 3. USER IN INCOMPLETE REGISTRATION ──
        if (!userProfile.is_registration_complete) {
            return msg.reply('⏳ Pendaftaran Anda belum selesai. Silakan lengkapi data Anda terlebih dahulu.');
        }

        // ── 4. REGISTERED USER: Command Routing ──
        const matchedMenu = botMenus.find(menu => messageText === menu.menu_key);

        if (matchedMenu) {
            let templateVars = {
                nama: userProfile.full_name,
                nomor_cs: systemSettings['cs_phone_number'] || '-',
                link_web: 'https://aplikasi-sampah.vercel.app',
                link_referral: `https://api.whatsapp.com/send?phone=&text=Hai! Ayo bergabung di EcoSistem Digital. Daftar lewat link ini:%0Ahttps://aplikasi-sampah.vercel.app/auth?ref=${userProfile.id}`
            };

            if (matchedMenu.menu_key === 'saldo') {
                const { data: wallet } = await supabase.from('user_wallets').select('balance').eq('user_id', userProfile.id).single();
                templateVars.saldo = wallet ? wallet.balance.toLocaleString('id-ID') : '0';
            }

            if (matchedMenu.menu_key === 'jemput') {
                if (userProfile.role !== 'user') {
                    return msg.reply("Maaf, fitur 'Jemput' hanya untuk peran warga.");
                }
                await supabase.from('pickup_requests').insert([{ user_id: userProfile.id, status: 'pending' }]);
            }

            if (matchedMenu.menu_key === 'harga') {
                templateVars.daftar_harga = "1. Plastik PET: Rp 2.000/kg\n2. Kardus: Rp 1.500/kg\n3. Besi/Logam: Rp 4.000/kg";
            }

            if (matchedMenu.menu_key === 'riwayat') {
                const { data: txns } = await supabase
                    .from('transactions')
                    .select('weight_organic, weight_inorganic, amount_earned, created_at')
                    .eq('user_id', userProfile.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (txns && txns.length > 0) {
                    templateVars.jumlah = txns.length;
                    templateVars.daftar = txns.map(t => {
                        const date = new Date(t.created_at).toLocaleDateString('id-ID');
                        const totalKg = Number(t.weight_organic) + Number(t.weight_inorganic);
                        return `- ${date}: ${totalKg} Kg (Rp ${Number(t.amount_earned).toLocaleString('id-ID')})`;
                    }).join('\n');
                } else {
                    templateVars.jumlah = 0;
                    templateVars.daftar = '(Belum ada riwayat setoran)';
                }
            }

            if (matchedMenu.menu_key === 'referral') {
                const kabupaten = systemSettings['kabupaten_name'] || '';
                const botPhone = systemSettings['bot_phone_number'] || '';

                // ANTI-BAN: Gunakan teks biasa, bukan api.whatsapp.com link
                // Pesan 1: Instruksi
                await msg.reply(`📢 Bagikan pesan di bawah ini ke tetangga/teman Anda:\n\nTeruskan pesan berikut dengan cara *tekan lama* lalu *Teruskan*:`);

                // Pesan 2: Pesan yang bisa diteruskan
                const forwardableMsg = `Hai! Ayo bergabung di *EcoSistem Digital* dan jadi Pahlawan Lingkungan${kabupaten ? ' ' + kabupaten : ''}. 🌿♻️\n\nCaranya:\n1. Simpan nomor ini: *${botPhone}*\n2. Kirim pesan berikut ke nomor di atas:\n\n*ref=${userProfile.id}*\n\nAtau daftar via web:\nhttps://aplikasi-sampah.vercel.app/auth?ref=${userProfile.id}`;
                await chat.sendMessage(forwardableMsg);
                return;
            }

            const response = formatResponse(matchedMenu.response_template, templateVars);
            return msg.reply(response);

        } else {
            // ── Unrecognized Command → Show Menu ──
            let header = systemSettings['welcome_message'] || 'Selamat datang!';
            if (messageText !== 'menu' && messageText !== 'hi' && messageText !== 'halo') {
                header = systemSettings['menu_header'] || 'Menu yang tersedia:';
            }
            header = formatResponse(header, { nama: userProfile.full_name });

            return msg.reply(`${header}\n\n${generateMenuList()}`);
        }

    } catch (err) {
        console.error('Error handling message:', err);
        msg.reply("Mohon maaf, terjadi gangguan pada sistem. Silakan coba beberapa saat lagi.");
    }
});

// ──────────────────────────────────────────────
// BOOT
// ──────────────────────────────────────────────

initializeBotStatusSettings().then(() => {
    client.initialize();
});
