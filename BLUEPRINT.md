# Blueprint Arsitektur Aplikasi Ekosistem Kelola Sampah Digital

Dokumen ini adalah pedoman dan blueprint resmi untuk membangun "Aplikasi Sampah" dengan arsitektur ekosistem digital terdistribusi (Data-Driven Policy).

## 1. Informasi Sistem & Akses Kredensial

### 1.1 Repository & Deployment
- **GitHub Repository**: [https://github.com/NetkomDev/APLIKASI-SAMPAH.git](https://github.com/NetkomDev/APLIKASI-SAMPAH.git)
- **Vercel / Hosting**: [vercel.com/netkom-developers-projects](https://vercel.com/netkom-developers-projects)

### 1.2 Konfigurasi Supabase
- **Anon Key**:
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeWlyYmV6cm1peHhrenpydWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTQ0NjMsImV4cCI6MjA4ODI5MDQ2M30.QMpOYhrB0CczJvUJEOmW1PmQx2d9vnXU89ESg_0eK6U`
- **Service Role Key**:
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeWlyYmV6cm1peHhrenpydWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxNDQ2MywiZXhwIjoyMDg4MjkwNDYzfQ.r_IaCQK6lr-121Szk98PdKk8F_dhkJJ8NjxnekBrJac`
- **Global Token (Akses Token)**:
  `sbp_faa5e670b942b15f76c0a8b087b8087944f88407`

---

## 2. Arsitektur Teknis Terdistribusi (Tech Stack)

Sistem menggunakan model **"One District, One Project"** di Supabase untuk menjamin keamanan & kedaulatan data daerah.

| Layer                | Teknologi Pendukung            | Peran & Fungsi Utama                                                                 |
|----------------------|--------------------------------|--------------------------------------------------------------------------------------|
| **Bot Interface**    | WhatsApp API                   | Alat ujung tombak lapangan untuk registrasi, transaksi, dan notifikasi warga/kurir.  |
| **Web Dashboard**    | Next.js + Tailwind CSS         | Dashboard untuk Admin Operasional dan Pemerintah (Responsive & High Performance).    |
| **Backend Engine**   | Supabase Edge Functions        | Memproses logika bot, antrean, & integrasi API pihak ketiga (Payment/Maps).          |
| **Identity System**  | Supabase Auth                  | Manajemen akses (Role-Based) untuk Admin, Pemerintah Daerah, dan Kurir.              |
| **Database**         | PostgreSQL + PostGIS (Supabase)| Penyimpanan data tabular, relasional transaksi, serta data spasial (koordinat GPS).  |
| **Storage**          | Supabase Storage               | Penyimpanan foto bukti timbangan & dokumen pendukung untuk validasi audit.           |

---

## 3. Komponen Antarmuka (Front-End)

Sistem Web (Next.js) terbagi menjadi **tiga lapisan kendali utama**, plus satu mekanisme akses tersembunyi:

### 3.1 Operational Admin Dashboard (Manajemen Harian - Tingkat Kabupaten)
Ditujukan untuk **admin pengelola operasional (operator)** untuk memastikan kelancaran bisnis dan transaksi harian.

1. **Modul Command Center (Real-Time Operations)**
   - **Live Map Monitoring**: Melacak posisi kurir & titik jemput via Supabase Realtime.
   - **Queue Management**: Pengelolaan antrean jemputan warga (manual dispatch jika sistem auto gagal).
   - **Instant Ticker**: Notifikasi realtime masalah sinkronisasi timbangan.
2. **Modul Manajemen User & CRM (Hubungan Warga)**
   - **Verifikasi Pendaftaran**: Validasi & koreksi koordinat GPS rumah penduduk.
   - **Referral Tree**: Monitoring jaringan referral warga untuk deteksi manipulasi (*fraud*).
   - **User Ledger**: Riwayat saldo, riwayat setor, dan log chat komplain.
3. **Modul Fleet Management (Kontrol Kurir)**
   - **Courier Onboarding**: Registrasi kurir, unggah KTP/SIM, & aktivasi.
   - **Performance Score**: Rating kecepatan, keramahan, dan akurasi, serta tracking rute harian.
   - **Earning & Payout**: Hitungan komisi dan pengiriman dana ke rekening kurir.
4. **Modul Manajemen Transaksi & Fraud Detection**
   - **Transaction Validation**: Audit visual (foto timbangan) vs input kurir.
   - **Geofence Alert**: Notifikasi jika kurir menginput data >15m dari koordinat terdaftar.
   - **Manual Adjustment**: Hak akses admin membetulkan selisih timbangan.
5. **Modul Financial & Pricing Hub**
   - **Dynamic Pricing**: Form auto-update harga beli per kategori sampah (berimbas langsung ke Bot WA).
   - **Withdrawal Approval**: Persetujuan pencairan saldo (Tunai / E-Wallet).
   - **Revenue Monitoring**: Hitungan profit margin antara harga beli dari warga dan harga jual ke pabrik.
6. **Modul Hub & Inventory (Gudang Antara)**
   - **Stock In/Out**: Pencatatan lalu lintas berat sampah (Hub vs Pabrik Daur Ulang).
   - **Quality Check**: Laporan kontaminasi sampah.

### 3.2 Strategic Government Dashboard (Pengambil Kebijakan - Tingkat Dinas/Bupati)
Ditujukan untuk **Dinas Lingkungan Hidup (DLH)** sebagai intelijen manajemen daerah.

1. **Modul Visualisasi Laporan Bulanan (Environmental Analytics)**
   - **Grafik Tren Tonase Bulanan**: Perbandingan inflow Organik & Anorganik.
   - **Indikator Efektivitas Diversi**: Persentase sampah yang dialihkan dari TPA.
   - **Proyeksi Penghematan TPA**: Hitungan kalkulasi efisiensi uang untuk BBM truk, *tipping fee*, dan pemeliharaan TPA.
2. **Modul Intelijen Spasial (Geospatial Heatmap)**
   - Menggunakan ekstensi **PostGIS**.
   - **Heatmap Produksi Sampah**: Identifikasi titik pembangun TPS3R.
   - **Peta Partisipasi Warga**: Kode warna untuk intervensi edukasi dari penyuluh lapangan.
3. **Modul Dampak Ekonomi & Sosial (Economic Impact)**
   - **Total Perputaran Uang**: Uang yang dibayar ke warga & penghasilan kurir.
   - **Efektivitas Pekerjaan**: Keterserapan tenaga kerja via karir sebagai kurir.
4. **Modul Reward Engine & Intervensi Kebijakan**
   - **Top 100 Contributors**: Pemeringkatan warga/kurir proaktif untuk insentif daerah (subsidi PBB/diskon retribusi sampah otomatis).

### 3.3 Super Admin Dashboard (Pengelola Sistem - Tingkat Developer)
Ditujukan untuk **developer/pengelola sistem utama** agar seluruh konfigurasi dapat diatur secara dinamis tanpa harus mengubah source code.

1. **Modul Konfigurasi Tampilan Dashboard**
   - **Dashboard Branding Manager**: Mengatur logo Pemda, nama dinas, warna tema, dan teks sambutan yang tampil di Dashboard Pemerintah dan Dashboard Operator.
   - **Widget Visibility Control**: Mengaktifkan/menonaktifkan modul-modul tertentu per dashboard (misal: menyembunyikan modul "Revenue Monitoring" dari Dashboard Operator).
   - **Announcement Banner**: Mengelola banner pengumuman yang muncul di atas semua dashboard tanpa deployment ulang.
2. **Modul Konfigurasi Bot WhatsApp**
   - **Menu Builder**: Mengatur daftar menu, teks respons, dan alur percakapan Bot WA secara visual.
   - **Template Manager**: Mengelola template pesan sambutan, notifikasi jemput, konfirmasi setoran, dan pesan broadcast.
   - **Fonnte API Settings**: Konfigurasi token API Fonnte, nomor pengirim, dan pengaturan webhook.
   - **Auto-Reply Rules**: Mengatur aturan balasan otomatis berdasarkan kata kunci.
3. **Modul Pengaturan Operasional Global**
   - **Service Area Manager**: Mengatur radius/geofence area operasional (polygon wilayah yang dilayani).
   - **Role & Permission Matrix**: Mengelola peran pengguna dan hak akses per modul.
   - **Pricing Master Control**: Mengatur harga dasar per kategori sampah yang menjadi acuan seluruh sistem.
   - **Referral Configuration**: Mengatur mekanisme referral (reward per referral, batas maksimum, dll).
4. **Modul Monitoring Sistem**
   - **System Health Check**: Status koneksi Supabase, Fonnte API, dan Edge Functions.
   - **Audit Log Viewer**: Melihat seluruh log perubahan konfigurasi (siapa mengubah apa, kapan).
   - **User Management**: Mengelola akun admin operator dan admin pemerintah (buat, nonaktifkan, reset password).

### 3.4 Mekanisme Akses Dashboard Internal (Hidden Portal)
Semua dashboard internal (Operator, Pemerintah, Super Admin) **tidak boleh** memiliki link atau tombol yang terlihat di homepage publik warga.

1. **Akses via URL Rahasia**
   - Dashboard internal diakses melalui rute `/portal` yang tidak ditampilkan di navigasi homepage.
   - Rute `/portal` menampilkan halaman login khusus dengan identifikasi peran otomatis.
   - Setelah login berhasil, sistem mengarahkan pengguna ke dashboard sesuai perannya:
     - `superadmin` → `/superadmin`
     - `admin` (Operator Bank Sampah) → `/admin`
     - `gov` (Dinas/Bupati) → `/gov`
2. **Homepage Warga Bersih**
   - Homepage (`/`) dan halaman registrasi (`/auth`) **hanya** menampilkan konten untuk warga.
   - Tidak ada tombol, link, atau referensi visual apapun ke dashboard internal.
   - Tombol CTA di homepage hanya berisi: "Mulai Jadi Pahlawan Lingkungan" (ke `/auth`) dan "Dashboard Pemerintah" (opsional, bisa dihilangkan).
3. **Proteksi Berlapis**
   - Semua rute dashboard dilindungi oleh `AuthGuard` yang memverifikasi session + role.
   - Akses ke `/superadmin` hanya bisa dilakukan oleh user dengan `role = 'superadmin'` di tabel `profiles`.
   - Percobaan akses tanpa otorisasi akan di-redirect ke halaman login portal (`/portal`).

---

## 4. Keamanan & Database Schema

### 4.1 Schema Enhancement (Tabel Esensial)
Di dalam Supabase, struktur PostgreSQL harus memasukkan beberapa entitas berikut:
- **`profiles`**: Profil user dengan ekstensi `role` (`user` / `courier` / `admin` / `gov` / `superadmin`), dan `achievement_points`.
- **`courier_logs`**: Tabel log performa (durasi jemput, lokasi, *rating* dari warga).
- **`policy_configs`**: Master data pengaturan pemerintah (parameter reward, threshold, target Zero Waste).
- **`waste_analytics`**: Tabel *materialized view* / *summary* agregasi agar grafik analitik *Government Dashboard* ter-load sangat cepat.
- **`system_settings`**: Tabel konfigurasi dinamis yang dikelola Super Admin. Berisi key-value pair untuk:
  - Pengaturan tampilan dashboard (logo, tema, widget visibility)
  - Konfigurasi Bot WhatsApp (menu, template pesan, token API Fonnte)
  - Parameter operasional global (radius layanan, harga dasar, aturan referral)
  - Setiap perubahan tercatat di `audit_logs` untuk transparansi.
- **`audit_logs`**: Log perubahan konfigurasi sistem oleh Super Admin (field: `user_id`, `action`, `table_name`, `old_value`, `new_value`, `timestamp`).
- **`wa_menu_configs`**: Konfigurasi menu dan template pesan Bot WhatsApp yang dapat diubah real-time tanpa deployment ulang.
- **`dashboard_widgets`**: Daftar widget/modul per dashboard beserta status aktif/nonaktif, urutan tampil, dan konfigurasi visual.

### 4.2 Security & Data Privacy
- **Row Level Security (RLS)**: Data dibatasi by peruntukan login. (Misal: Pemerintah hanya visual data *aggregate*, Warga dan Kurir hanya data transaksi mereka).
- **Audit Trail**: Tracking history perubahan *Dynamic Pricing* atau persetujuan dana untuk keamanan internal.
- **Encrypted Storage**: Privasi foto tumpukan sampah terenkripsi sesuai persetujuan.

### 4.3 Logika Perhitungan Incentive / Reward (Contoh)
Insentif diformulakan di dalam sistem menggunakan Supabase Edge Functions:
$$Incentive\_Score = \sum (Weight_{organic} \times 1.5) + \sum (Weight_{inorganic} \times 1.0)$$

---

## 5. Roadmap Fase Pembangunan

1. **Fase 1 (Golden Template)**: Pembangunan inti (*core*) aplikasi Web (Admin Dashboard & Government Dashboard) serta integrasi Supabase (Skema, Fungsi, Endpoint).
2. **Fase 2 (Regional Instance)**: Implementasi proyek klon (*District Setup* per kabupaten), mulai memasukkan logic intervensi Bot WhatsApp.
3. **Fase 3 (Dashboard Activation)**: Go-Live *Admin Operations*, menyusul aktivasi portal pengambil kebijakan untuk Pemda.
4. **Fase 4 (National Aggregator)**: Pembangunan Landing Page terpusat untuk visualisasi *Live Counter* agregasi tonase berhasil daur ulang tingkat provinsi/nasional.
