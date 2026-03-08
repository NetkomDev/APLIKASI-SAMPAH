const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('system_settings').select('key_name, value_text').eq('category', 'bot');
    if (error) {
        console.error('Error:', error);
    } else {
        const status = data.find(d => d.key_name === 'bot_status')?.value_text;
        const qr = data.find(d => d.key_name === 'bot_qr_code')?.value_text;
        console.log('Status:', status);
        console.log('QR base64 length (bytes):', qr ? qr.length : 0);
    }
}
run();
