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

## 2. Arsitektur Teknis (Tech Stack)

Sistem dirancang dengan model **1 Kabupaten = 1 Database (1 Supabase Project)**.
Satu kabupaten ini dikendalikan oleh satu **SuperAdmin** yang menaungi 1 entitas Pemerintah (Dinas DLH) dan **banyak unit Bank Sampah** (misalnya: Bank Sampah Zona 1, Bank Sampah Zona 2, dst).

| Layer                | Teknologi Pendukung            | Peran & Fungsi Utama                                                                 |
|----------------------|--------------------------------|--------------------------------------------------------------------------------------|
| **Bot Interface**    | WhatsApp API                   | Alat ujung tombak lapangan untuk registrasi, transaksi, dan notifikasi warga/kurir.  |
| **Web Dashboard**    | Next.js + Tailwind CSS         | Dashboard peran ganda terpisah untuk SuperAdmin, Pemerintah, dan Admin Bank Sampah.  |
| **Backend Engine**   | Supabase Edge Functions        | Memproses logika bot, pembaruan akun admin/gov yang aman, & integrasi pihak ketiga.  |
| **Identity System**  | Supabase Auth                  | Manajemen akses hierarkis (SuperAdmin -> Pemerintah & Admin Bank Sampah -> Kurir & Warga). |
| **Database**         | PostgreSQL + PostGIS (Supabase)| Penyimpanan data tabular terpusat 1 Kabupaten, serta data spasial (koordinat area).  |
| **Storage**          | Supabase Storage               | Penyimpanan foto bukti timbangan & dokumen pendukung kurir untuk validasi audit.     |

---

## 3. Alur Hirarki & Dasbor Antarmuka (Front-End)

Dalam satu instalasi basis data (1 Kabupaten), kendali dibagi menjadi **tiga pilar dashboard utama** yang saling mendukung: `SuperAdmin`, `Pemerintah (Gov)`, dan `Admin Bank Sampah`.

### 3.1. Dashboard Super Admin (Pusat Kendali Kabupaten)
SuperAdmin adalah kreator dan pemegang hak akses tertinggi dalam 1 kabupaten. SuperAdmin bertugas **mempersiapkan ekosistem** agar dapat digunakan oleh Pemda dan Bank Sampah.

1. **Pusat Rekrutmen & Manajemen Entitas Cabang**
   - Membuat / Mendaftarkan 1 akun khusus untuk **Pemerintah/Dinas DLH**.
   - Membuat / Mendaftarkan banyak akun untuk **Bank Sampah cabang/unit** (misal: Bank Sampah Unit Utara, Unit Selatan, dll).
2. **Global Analytics (Makro Kabupaten)**
   - Memantau total keseluruhan volume sampah mentah yang ditarik per-hari se-kabupaten.
   - Memantau akumulasi total produk turunan (Pupuk, Kaca Cacah) dari seluruh titik Bank Sampah.
3. **Konfigurasi Sistem Utama (Master Control)**
   - Konfigurasi API Bot WhatsApp (Fonnte/Meta), Menu interaktif, dan auto-reply.
   - Manajemen branding visual (Logo Daerah, banner peringatan aplikasi).
   - Pengaturan harga beli per kategori sampah (Pricing Master Control).

### 3.2. Dashboard Pemerintah / Dinas (View & Analytics DLH)
Dashboard ini didedikasikan bagai para pembuat kebijakan (Dinas Lingkungan Hidup / Bupati) untuk memantau performa *Zero Waste* dalam kabupatennya. Gov **tidak melakukan operasional**, melainkan membaca data analitik teragregasi dari seluruh Bank Sampah.

1. **Grafik Trafik & Kinerja Antar-Kecamatan**
   - Memantau tren tonase harian sampah masuk (Organik vs Anorganik) per kecamatan/kelurahan.
   - Melihat perbandingan performa aktifitas antar "Bank Sampah 1" vs "Bank Sampah 2".
2. **Indikator Efektivitas Lingkungan**
   - Melihat tingkat *Waste Diversion Rate* (Proyeksi sampah yang berhasil dialihkan dari TPA utama).
   - Est. Penghematan anggaran retribusi TPA dan bensin truk angkut dinas.
3. **Pemantauan Populasi & Dampak Sosial**
   - Melihat total pengguna (Warga) yang aktif menggunakan aplikasi di seluruh kabupaten.
   - Melihat total perputaran uang subsidi/komisi secara *real-time* ke masyarakat lewat Bank Sampah.

### 3.3. Dashboard Admin Bank Sampah (Layanan Operasional Titik/Zona)
Kabupaten memiliki beberapa titik Bank Sampah. Setiap admin yang login akan melihat data spesifik untuk unit Bank Sampahnya sendiri. **Bank Sampah adalah titik kumpul bagi Kurir dan pusat perekaman produksi fabrikasi.**

1. **Pusat Registrasi & Manajemen Kurir Fleet**
   - Para Kurir mendaftar/terafiliasi ke salah satu unit Bank Sampah terdekat.
   - Admin Bank Sampah dapat memverifikasi berkas kurir, memvalidasi kuota, dan memantau armada kurirnya sendiri.
2. **Command Center Transaksi Warga**
   - Menerima antrean *drop-off* atau serahan dari kurir wilayahnya.
   - Melakukan input/validasi timbangan (berat aktual) atas sampah rintisan dan menyetujui transfer saldo ke dompet warga/kurir.
3. **Produksi & Gudang (Inventory Tracker)**
   - Saat sampah mentah diolah (misal dicacah/dikompos), Admin Bank Sampah bertugas mencatat input "Barang Jadi / Output Gudang" milik unit mereka.
   - Data produksi unit inilah yang nantinya ditarik secara global untuk ditonton oleh Gov dan SuperAdmin.

> **PENTING — Aturan Registrasi Akun:**
> - Akun `gov` (Pemerintah/Dinas) dan `admin` (Bank Sampah Unit 1, 2, dst) **HANYA** bisa dibuat per akun oleh **SuperAdmin**. Tidak ada form pendaftaran publik (Self-registration) untuk mereka.
> - Sebaliknya, pendaftaran untuk `courier` (Kurir armada) harus divalidasi oleh `admin` Bank Sampah bersangkutan.
> - Pendaftaran Warga Umum Bebas via Bot WA atau Website.

---

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

### 3.5 Mekanisme Bot WhatsApp (Pendaftaran & Interaksi)

Bot WhatsApp adalah interface utama penghubung warga dengan sistem. Bot menggunakan arsitektur **WhatsApp Cloud API (Resmi Meta)** yang dihubungkan melalui *Webhook* ke Supabase Edge Functions.

*Catatan Sistem:*
- **Webhook URL:** `https://icyirbezrmixxkzzrufq.supabase.co/functions/v1/webhook-whatsapp`
- **Verify Token:** `beres_api_123`
#### 3.5.1 Jalur Pendaftaran Warga (Dual Registration Path)

Warga dapat mendaftar melalui **2 jalur** yang terintegrasi:

| No | Jalur | Cara Kerja | Notifikasi |
|----|-------|-----------|------------|
| 1 | **Web** (`/auth`) | User mengisi form di website → data tersimpan di Supabase → Bot mengirim pesan selamat datang otomatis via WA (proaktif) | Bot mengirim welcome + daftar menu ke nomor WA yang didaftarkan |
| 2 | **WhatsApp** (via Referral/DAFTAR) | User mengirim link referral atau ketik `DAFTAR` ke Bot → Bot memandu pendaftaran step-by-step via percakapan → data tersimpan di Supabase | Bot mengirim welcome + daftar menu setelah konfirmasi selesai |

#### 3.5.2 Alur Pendaftaran via WhatsApp (Conversation Flow)

```text
User mengirim link referral / ketik DAFTAR
          │
          ▼
┌─────────────────────────┐
│  Bot: "Langkah 1/2:     │
│  Siapa nama lengkap     │
│  Anda?"                 │
└────────┬────────────────┘
         │ User: "Budi Santoso"
         ▼
┌─────────────────────────┐
│  Bot: "Langkah 2/2:     │
│  Masukkan alamat        │
│  lengkap Anda."         │
└────────┬────────────────┘
         │ User: "Jl. Merdeka No. 10..."
         ▼
┌─────────────────────────┐
│  Bot: "Konfirmasi Data: │
│  Nama: Budi Santoso     │
│  Alamat: Jl. Merdeka... │
│  Ketik YA/BATAL"        │
└────────┬────────────────┘
         │ User: "YA"
         ▼
┌─────────────────────────┐
│  ✅ Akun dibuat di      │
│  Supabase Auth + Profile│
│  + User Wallet          │
│  Bot: Welcome + Menu    │
└─────────────────────────┘
```

- User dapat mengetik **BATAL** kapan saja untuk membatalkan pendaftaran.
- Jika melalui referral, `referred_by` di tabel `profiles` akan terisi ID referrer.
- Kolom `registration_source` mencatat asal pendaftaran: `web`, `whatsapp`, atau `admin`.

#### 3.5.3 Alur Proaktif Welcome (untuk Pendaftar Web)

Setelah user mendaftar via web dan menyertakan nomor WhatsApp:
1. Bot melakukan polling setiap 30 detik mencari user baru dengan `registration_source = 'web'`.
2. Bot mengirimkan pesan selamat datang resmi + daftar menu layanan ke nomor WA user.
3. Setelah terkirim, `registration_source` di-update menjadi `web_welcomed` agar tidak terkirim ulang.

> **User dinyatakan resmi terdaftar** saat sudah menerima pesan selamat datang dari Bot WA, baik yang mendaftar via Web maupun via WhatsApp.

#### 3.5.4 Alur Interaksi User Terdaftar

```text
User mengirim pesan ke Bot
          │
          ▼
    ┌─────────────┐
    │ Cek profil  │──── Tidak terdaftar ──→ Tampilkan cara daftar
    │ di Supabase │
    └─────┬───────┘
          │ Terdaftar
          ▼
    ┌─────────────┐
    │ Match dgn   │──── Cocok ──→ Eksekusi logika menu (saldo/jemput/dll)
    │ menu_key?   │
    └─────┬───────┘
          │ Tidak cocok
          ▼
    Tampilkan daftar menu
```

#### 3.5.5 Daftar Global Messages Bot

| Key | Fungsi | Kapan Dikirim |
|-----|--------|---------------|
| `welcome_message` | Pesan saat user terdaftar ketik MENU/HALO | Setiap user terdaftar mengirim pesan sapaan |
| `menu_header` | Header daftar menu | Saat user mengirim pesan yang tidak dikenali |
| `unregistered_message` | Info pendaftaran untuk user belum terdaftar | Saat nomor belum terdaftar mengirim pesan |
| `registration_welcome` | Pesan proaktif setelah daftar via web | Dikirim otomatis oleh bot setelah registrasi web |
| `wa_registration_complete` | Pesan selamat setelah daftar via WA | Setelah user selesai mendaftar via percakapan WA |

#### 3.5.6 Infrastruktur Bot

| Komponen | Detail |
|----------|--------|
| **Infrastruktur**  | WhatsApp Cloud API (Resmi) |
| **Integrasi**      | Supabase Edge Functions Webhook |
| **Otentikasi API** | System User Permanent Access Token (Tidak Kadaluarsa) |
| **Process Manager**| PM2 (`ecosistem-bot`) |
| **Path di VPS**    | `/home/ubuntu/ecosistem-bot/vps-bot/` |
| **Dashboard Kontrol** | Super Admin → Konfigurasi Bot WA |
| **QR Code** | Ditampilkan virtual di Dashboard (Base64 via Supabase) |

---

### 3.6 Mengelola Operasional Kurir (Fleet Management)

Sebagai ujung tombak interaksi lapangan, operasional Kurir mengombinasikan **WhatsApp** (untuk notifikasi instan) dan **Progressive Web App (PWA)** (untuk input data kompleks saat menjemput sampah).

#### 3.6.1 Pendaftaran & Onboarding
1. **Pendaftaran:** Akses registrasi kurir tidak dilepas ke publik secara bebas. Calon kurir mendaftar via form PWA/Web khusus atau mengisi data di admin.
2. **Approval (Persetujuan):** Admin meninjau kelengkapan dokumen (KTP, SIM, STNK). Jika disetujui, admin merubah profilnya menjadi `role = courier` dan menetapkan area kerjanya (Geofencing operasional).
3. **Aktivasi:** Begitu disetujui di sistem, bot WhatsApp akan otomatis mengirimkan pesan sambutan kerja beserta tautan masuk ke "Dashboard/PWA Khusus Kurir".

#### 3.6.2 Algoritma Notifikasi Tangkapan Order (Dispatch System)
Sistem memiliki kontrol cerdas ("Smart Dispatch") ketika warga melakukan request jemputan (via WA/Web):
1. **Mode Algoritma Prioritas:** Konfigurasi dapat diubah oleh *Super Admin* berdasarkan preferensi bisnis daerah:
   - **Berdasarkan Jarak Terdekat (Nearest - Default):** Mencari koordinat kurir terdekat (via PostGIS) yang sedang "Online" di aplikasi.
   - **Berdasarkan Rating Tertinggi:** Mengincar kurir dengan bintang 5 dan zero komplain terlebih dahulu.
   - **Pemerataan Rezeki (Load Balancing):** Memprioritaskan kurir yang hari itu belum mendapat *orderan*.
   - **Kelas / Akun Pro:** Memprioritaskan kurir "Senior" jika order berjumlah sangat besar.
2. **Push Notifikasi:** Warga memesan → Sistem menghitung kecocokan algoritma → Sistem "membunyikan" (Push WA) ke HP kurir target menggunakan *Interactive Message WA* (Tombol "✅ Terima" / "❌ Tolak").
3. **Sistem Lempar (Fall-back):** Jika kurir utama lambat merespon (misal > 2 menit), sistem melempar Push WA ke semua kurir terdekat (sistem rebutan).

#### 3.6.3 Mekanisme Jemput Sampah (Courier Sub-Portal / PWA)
Untuk mencegah *fraud* dan mempermudah pencatatan yang akurat, eksekusi timbangan sampah **tidak menggunakan Chat WA biasa** secara penuh di titik jemput, melainkan diarahkan mengakses **PWA Kurir** (`/courier`). Alurnya:
1. **Validasi Warga:** Kurir tiba di rumah warga, lalu men-*scan* QR Code unik warga via HP Kurir (atau warga memunculkan QR Code dari dashboard).
2. **Geo-Location Check:** Sistem langsung mencatat koordinat kurir saat membuka form timbangan (Jika meleset > 50 meter dari alamat warga, sistem memberi *Red Flag / Fraud Alert*).
3. **Pencatatan Presisi:** Kurir menimbang lalu memisahkan data input (Misal: 3 kg Plastik, 2 kg Kertas) pada aplikasi HP.
4. **Validasi Bukti (Upload):** Kurir wajib memotret bukti angka timbangan dan onggokan kategori sampah tersebut. Terunggah ke *Supabase Storage*.
5. **Autentikasi Pembayaran:** Setelah kurir menekan "Simpan Tagihan", saldo milik wargalangsung bertambah, dan saldo komisi kurir ikut bertambah. Daftar struk rincian sampah dikirim *real-time* lewat notif WhatsApp bot warga.

#### 3.6.4 Manajemen Performa & Keuangan Kurir
Di dalam Sub-Portal/PWA Khusus Kurir (`/courier`), kurir mempunyai akses fitur administrasi mandiri:
1. **Dompet Kurir (Wallet):** Pemantauan log *real-time* penambahan saldo komisi (baik berdasarkan % total harga angkut, total bobot kilogram, maupun per trip penugasan).
2. **Pencairan Saldo (Withdrawal):** Kurir mengajukan tarik tunai di sub-portal (lewat transfer e-Wallet atau tarik Tunai Admin Pusat). Sistem mencatat rekam riwayat saldo harian.
3. **Sistem Reputasi & Teguran Peringatan (SP):**
   - **Rating:** Warga wajib memberikan rating (1-5 Bintang) ke kurir setelah transaksi jemput selesai untuk menjaga pelayanan prima.
   - **Teguran Pusat:** Jika rating jatuh di bawah batas aman, ada komplain warga (misal sampah tidak terangkut bersih), atau dicurigai *fraud point*, **Warning / Surat Peringatan (SP) digital** akan muncul (popup) di *dashboard* aplikasinya dan dikirim ke *WhatsApp* pribadinya sebagai record validasi untuk admin.
4. **Riwayat Pengangkutan:** Melacak total kilogram harian yang berhasil ditarik serta target yang tergarap per kuartal.

---

## 4. Keamanan & Database Schema

### 4.1 Schema Enhancement (Tabel Esensial)
Di dalam Supabase, struktur PostgreSQL harus memasukkan beberapa entitas berikut:
- **`profiles`**: Profil user dengan ekstensi `role` (`user` / `courier` / `admin` / `gov` / `superadmin`), dan `achievement_points`.
  - **Kolom Kurir** (ditambahkan saat onboarding):
    - `courier_status` (enum: `null` / `pending_approval` / `active` / `suspended` / `terminated`)
    - `courier_id_code` (text, UNIQUE) — ID unik kurir format `KUR-XXXX`
    - `vehicle_type` (text) — Jenis kendaraan kurir
    - `vehicle_plate` (text) — Plat nomor kendaraan
    - `preferred_zone` (text) — Zona operasional
    - `is_online` (boolean, default false) — Toggle kurir sedang aktif/tidak
- **`courier_applications`**: Tabel lamaran kurir (Pre-Registration & Admin Approval). Menyimpan data lengkap calon kurir untuk ditinjau admin sebelum disetujui. Kolom:
  - `id` (uuid, PK), `user_id` (FK → profiles.id)
  - Data KTP: `nik`, `full_name`, `birth_place`, `birth_date`, `address_ktp`, `phone_number`
  - Kendaraan: `vehicle_type` (motor/mobil_pickup/gerobak/sepeda), `vehicle_plate`
  - Dokumen: `ktp_photo_url`, `sim_photo_url`, `selfie_ktp_url` (Supabase Storage)
  - Status: `status` (pending/approved/rejected), `reject_reason`, `reviewed_by`, `reviewed_at`
  - `courier_id_code` (generated on approval), `preferred_zone`
  - RLS: User lihat milik sendiri, Admin lihat & update semua
- **`courier_logs`**: Tabel log performa (durasi jemput, lokasi, *rating* dari warga).
- **`policy_configs`**: Master data pengaturan pemerintah (parameter reward, threshold, target Zero Waste).
- **`waste_analytics`**: Tabel *materialized view* / *summary* agregasi agar grafik analitik *Government Dashboard* ter-load sangat cepat.
- **`system_settings`**: Tabel konfigurasi dinamis yang dikelola Super Admin. Berisi key-value pair untuk:
  - Pengaturan tampilan dashboard (logo, tema, widget visibility)
  - Konfigurasi Webhook & Credentials WhatsApp Cloud API (Token Permanen via System User, WABA ID, Phone ID)
  - Parameter operasional global (radius layanan, harga dasar, aturan referral)
  - Setiap perubahan tercatat di `audit_logs` untuk transparansi.
- **`audit_logs`**: Log perubahan konfigurasi sistem oleh Super Admin (field: `user_id`, `action`, `table_name`, `old_value`, `new_value`, `timestamp`).
- **`wa_menu_configs`**: Konfigurasi menu dan template pesan Bot WhatsApp yang dapat diubah real-time tanpa deployment ulang.
- **`dashboard_widgets`**: Daftar widget/modul per dashboard beserta status aktif/nonaktif, urutan tampil, dan konfigurasi visual.
- **`bank_sampah_units`** (sebelumnya `districts`): Tabel pendaftaran unit operasional Bank Sampah (titik kumpul) yang ada di dalam Kabupaten.
  - `id` (uuid, PK)
  - `name` (text) — Nama unit Bank Sampah (Contoh: "Bank Sampah 1 Zona Utara")
  - `admin_id` (uuid, FK → profiles.id) — Operator/Admin pengelola lokasi ini.
  - `created_by` (uuid, FK → profiles.id) — Super Admin yang mendaftarkan
  - `is_active` (boolean) — Status aktif/nonaktif
- **`profiles.bank_sampah_id`**: Kolom tambahan pada tabel profiles (FK → bank_sampah_units.id) yang menghubungkan akun `admin` maupun `courier` ke wilayah operasional/titik kumpul spesifik mereka. *(Akun `gov` dan `superadmin` memiliki akses terbuka ke semua unit)*.

### 4.2 Storage Buckets
- **`courier-documents`**: Bucket privat untuk menyimpan foto KTP, SIM, dan Selfie+KTP calon kurir. Format: `{user_id}/{doc_type}_{timestamp}.{ext}`. Akses: user pemilik + admin/superadmin. Max 5MB per file (JPG/PNG/WebP).

### 4.2 Kredensial Super Admin
- **Email**: `superadmin@ecosistemdigital.id`
- **Password**: `SuperAdmin@2026!`
- **Akses**: Hanya via `/portal` → otomatis redirect ke `/superadmin`

### 4.3 Security & Data Privacy
- **Row Level Security (RLS)**: Data dibatasi by peruntukan login. (Misal: Pemerintah hanya visual data *aggregate*, Warga dan Kurir hanya data transaksi mereka).
- **Audit Trail**: Tracking history perubahan *Dynamic Pricing* atau persetujuan dana untuk keamanan internal.
- **Encrypted Storage**: Privasi foto tumpukan sampah terenkripsi sesuai persetujuan.

### 4.3 Logika Perhitungan Incentive / Reward (Contoh)
Insentif diformulakan di dalam sistem menggunakan Supabase Edge Functions:
$$Incentive\_Score = \sum (Weight_{organic} \times 1.5) + \sum (Weight_{inorganic} \times 1.0)$$

### 4.4 Courier Quota System (Sistem Kuota Kurir)
Sistem untuk membatasi dan mengelola jumlah kurir aktif berdasarkan jenis kendaraan dan area operasional. Bertujuan untuk menyeimbangkan *supply & demand* serta kelayakan cashflow Bank Sampah.
- **Tabel `courier_quotas`**: Menyimpan batas maksimal (`quota`) untuk kombinasi `zone_name` dan `vehicle_type`.
- **Dikelola Oleh**: Super Admin melalui halaman `/superadmin/courier-quotas` (Dashboard Super Admin).
- **Validasi Frontend**: Di halaman Pendaftaran Kurir (`/courier/register`), sistem akan mengecek sisa kuota (Total Kuota - Jumlah Kurir Pending/Aktif) secara *real-time* via Supabase RPC (`get_courier_quotas_by_vehicle`). Jika penuh, zona tersebut tidak bisa dipilih.
- **Monitoring Biasa**: Admin Bank Sampah dapat melihat ringkasan alokasi dan kuota kurir aktif secara keseluruhan di dashboard utama (`/admin`).

---

## 5. Roadmap Fase Pembangunan

1. **Fase 1 (Golden Template)**: Pembangunan inti (*core*) aplikasi Web (Admin Dashboard & Government Dashboard) serta integrasi Supabase (Skema, Fungsi, Endpoint).
2. **Fase 2 (Regional Instance)**: Implementasi proyek klon (*District Setup* per kabupaten), mulai memasukkan logic intervensi Bot WhatsApp.
3. **Fase 3 (Dashboard Activation)**: Go-Live *Admin Operations*, menyusul aktivasi portal pengambil kebijakan untuk Pemda.
4. **Fase 4 (National Aggregator)**: Pembangunan Landing Page terpusat untuk visualisasi *Live Counter* agregasi tonase berhasil daur ulang tingkat provinsi/nasional.
