cd ~/ecosistem-bot/vps-bot

cat << 'NODE_EOF' > patch_args.js
const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// replace the entire puppeteer object args
code = code.replace(/args:\s*\[.*?\]/s, "args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']");

fs.writeFileSync('index.js', code);
NODE_EOF

node patch_args.js
rm -rf .wwebjs_auth
pm2 restart ecosistem-bot
sleep 3
pm2 logs ecosistem-bot --lines 30
