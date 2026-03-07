require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Global State (Cached settings to avoid querying DB for every message)
let systemSettings = {};
let botMenus = [];

// Init WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('SCAN QR CODE INI DENGAN WHATSAPP (Perangkat Tautkan):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is Ready!');
    await loadBotConfigs(); // Load rules from database
    console.log('⚙️ Konfigurasi berhasil dimuat dari Supabase.');
});

// Load configs from our new system_settings & wa_menu_configs tables
async function loadBotConfigs() {
    try {
        const { data: settings } = await supabase
            .from('system_settings')
            .select('key_name, value_text');

        if (settings) {
            settings.forEach(s => {
                systemSettings[s.key_name] = s.value_text;
            });
        }

        const { data: menus } = await supabase
            .from('wa_menu_configs')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

        if (menus) {
            botMenus = menus;
        }
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Format template strings: replace {nama}, {saldo}, dll
function formatResponse(template, variables) {
    let result = template;
    for (const key in variables) {
        // use regex to replace all occurrences case-insensitively
        const re = new RegExp(`{${key}}`, 'gi');
        result = result.replace(re, variables[key] || '');
    }
    return result;
}

client.on('message', async msg => {
    // Only respond to private chats (not group)
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const senderNumber = msg.from.split('@')[0];
    const messageText = msg.body.trim().toLowerCase();

    // Reload configs dynamically if superadmin sends "RELOAD"
    if (messageText === 'reload') {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('phone_number', senderNumber)
            .single();

        if (profile && profile.role === 'superadmin') {
            await loadBotConfigs();
            return msg.reply('✅ Konfigurasi bot berhasil diperbarui dari server.');
        }
    }

    try {
        // 1. Authenticate user by phone number
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('phone_number', senderNumber)
            .single();

        // 2. Unregistered User Handling
        if (!userProfile) {
            let unregisteredMsg = systemSettings['unregistered_message'] || "Nomor Anda belum terdaftar.";
            // assume web link is the app name mapped domain, you can hardcode this in template mapping
            unregisteredMsg = formatResponse(unregisteredMsg, {
                link_web: "https://ecosistemdigital.id/auth"
            });
            return msg.reply(unregisteredMsg);
        }

        // 3. Command Routing
        const matchedMenu = botMenus.find(menu => messageText === menu.menu_key);

        if (matchedMenu) {
            let templateVars = {
                nama: userProfile.full_name,
                nomor_cs: systemSettings['cs_phone_number'] || '-',
                link_web: "https://ecosistemdigital.id",
                link_referral: `https://ecosistemdigital.id/auth?ref=${userProfile.id}`
            };

            // Calculate context-specific variables based on menu intent
            if (matchedMenu.menu_key === 'saldo') {
                const { data: wallet } = await supabase
                    .from('user_wallets')
                    .select('balance')
                    .eq('user_id', userProfile.id)
                    .single();
                templateVars.saldo = wallet ? wallet.balance.toLocaleString('id-ID') : '0';
            }

            if (matchedMenu.menu_key === 'jemput') {
                if (userProfile.role !== 'user') {
                    return msg.reply("Maaf, fitur 'Jemput' hanya untuk peran warga.");
                }
                await supabase.from('pickup_requests').insert([{ user_id: userProfile.id, status: 'pending' }]);
                // No extra template logic needed, template handles generic success message
            }

            if (matchedMenu.menu_key === 'harga') {
                templateVars.daftar_harga = "1. Plastik PET: Rp 2.000/kg\n2. Kardus: Rp 1.500/kg\n3. Besi/Logam: Rp 4.000/kg";
            }

            if (matchedMenu.menu_key === 'riwayat') {
                templateVars.jumlah = 3;
                templateVars.daftar = "- 12 Okt: 3 Kg Plastik (Rp 6.000)\n- 10 Okt: 5 Kg Kardus (Rp 7.500)";
            }

            const response = formatResponse(matchedMenu.response_template, templateVars);
            return msg.reply(response);

        } else {
            // Unrecognized Command -> Display Menu
            let header = systemSettings['welcome_message'] || "Selamat datang!";
            if (messageText !== 'menu' && messageText !== 'hi' && messageText !== 'halo') {
                header = systemSettings['menu_header'] || "Menu yang tersedia:\n";
            }

            header = formatResponse(header, { nama: userProfile.full_name });

            // Generate menu options dynamically
            let menuList = "";
            botMenus.forEach(m => {
                menuList += `👉 *${m.menu_key.toUpperCase()}*: ${m.menu_label}\n`;
            });

            return msg.reply(`${header}\n\n${menuList}`);
        }

    } catch (err) {
        console.error('Error handling message:', err);
        msg.reply("Mohon maaf, terjadi gangguan pada sistem. Silakan coba beberapa saat lagi.");
    }
});

client.initialize();
