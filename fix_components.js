const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'src/app/superadmin/bank-sampah-units/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// Update Types
content = content.replace(/interface District \{/g, 'interface BankSampahUnit {');
content = content.replace(/<District\[\]>/g, '<BankSampahUnit[]>');
content = content.replace(/<District \| null>/g, '<BankSampahUnit | null>');
content = content.replace(/d: District/g, 'd: BankSampahUnit');

// Change Supabase queries for table + foreign keys
content = content.replace(/\.from\("districts"\)/g, '.from("bank_sampah_units")');
content = content.replace(/district_id/g, 'bank_sampah_id');

// Replace UI Texts
content = content.replace(/Kelola Distrik/g, 'Kelola Cabang Bank Sampah');
content = content.replace(/Distrik Baru/g, 'Cabang Baru');
content = content.replace(/Nama Distrik \/ Kabupaten/g, 'Nama Unit Bank Sampah');
content = content.replace(/Edit Distrik/g, 'Edit Cabang Unit');
content = content.replace(/Informasi Distrik/g, 'Informasi Cabang Unit');
content = content.replace(/Belum ada distrik terdaftar\./g, 'Belum ada cabang Bank Sampah terdaftar.');
content = content.replace(/Daftarkan Distrik,/g, 'Daftarkan Cabang,');
content = content.replace(/Distrik "/g, 'Cabang "');
content = content.replace(/Status Distrik:/g, 'Status Cabang:');

// Since the edge function payload might be unchanged on the remote side, 
// I'll keep the JS state names "districtName" for payload sending but I'll update the display strings.

fs.writeFileSync(targetFile, content);
console.log("Replaced strings successfully");
