# Blueprint Arsitektur — Beres (Benahi Residu Sampah)
# Ekosistem Kelola Sampah Digital Terdistribusi

> **Dokumen ini adalah Single Source of Truth** yang merepresentasikan state aktual sistem per April 2026.
> Setiap perubahan arsitektur, tabel, atau fitur **wajib** di-update di dokumen ini.

---

## 1. Informasi Sistem & Kredensial

### 1.1 Repository & Deployment
| Item | Detail |
|------|--------|
| **Repo** | [github.com/NetkomDev/APLIKASI-SAMPAH](https://github.com/NetkomDev/APLIKASI-SAMPAH.git) |
| **Hosting** | Vercel (auto-deploy on `main` push) |
| **Live URL** | `https://beres-bone.vercel.app` |
| **Framework** | Next.js 14 + Tailwind CSS + TypeScript |

### 1.2 Supabase Project
| Item | Detail |
|------|--------|
| **Project ID** | `icyirbezrmixxkzzrufq` |
| **Region** | Southeast Asia (Singapore) |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeWlyYmV6cm1peHhrenpydWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTQ0NjMsImV4cCI6MjA4ODI5MDQ2M30.QMpOYhrB0CczJvUJEOmW1PmQx2d9vnXU89ESg_0eK6U` |
| **Service Role Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeWlyYmV6cm1peHhrenpydWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxNDQ2MywiZXhwIjoyMDg4MjkwNDYzfQ.r_IaCQK6lr-121Szk98PdKk8F_dhkJJ8NjxnekBrJac` |
| **Global Token** | `sbp_faa5e670b942b15f76c0a8b087b8087944f88407` |

### 1.3 SuperAdmin Credentials
| Item | Detail |
|------|--------|
| **Email** | `superadmin@ecosistemdigital.id` |
| **Password** | `SuperAdmin@2026!` |
| **Login** | Via `/portal` → auto-redirect ke `/superadmin` |

---

## 2. Arsitektur Teknis

### 2.1 Model Deployment
**1 Kabupaten = 1 Database (1 Supabase Project)**
Satu kabupaten dikendalikan oleh **SuperAdmin** yang menaungi 1 entitas Pemerintah (Dinas DLH) dan **banyak unit Bank Sampah** (Bank Sampah Palakka, Bank Sampah T. Riattang, dll).

### 2.2 Tech Stack

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | Next.js 14 + Tailwind CSS + TypeScript | Dashboard multi-role (SuperAdmin, Gov, Admin BS, Kurir) |
| **Backend** | Supabase (PostgreSQL + PostGIS) | Database, Auth, RLS, Edge Functions |
| **Bot Interface** | WhatsApp Cloud API (Meta) | Registrasi warga, notifikasi, interaksi |
| **Identity** | Supabase Auth | Manajemen akses hierarkis 5 role |
| **Storage** | Supabase Storage (`courier-documents`) | Foto KTP, SIM, Selfie kurir |
| **Deployment** | Vercel (auto-deploy) | CI/CD dari branch `main` |

### 2.3 Hirarki Peran (Roles)
```
SuperAdmin (1 per kabupaten)
  ├── Gov / Dinas (1 per kabupaten) ← Read-Only monitoring
  ├── Admin Bank Sampah (N unit) ← Operasional per unit
  │     ├── Courier / Kurir (M per unit) ← Jemput sampah
  │     └── Warga / User (unlimited) ← Setor sampah
  └── Konfigurasi global (harga, kuota, branding)
```

---

## 3. Peta Halaman Frontend (Route Map)

### 3.1 Public Routes

| Route | Fungsi | File |
|-------|--------|------|
| `/` | Homepage warga (CTA registrasi) | `src/app/page.tsx` |
| `/auth` | Registrasi warga (form web) | `src/app/auth/` |
| `/portal` | Login internal (admin/gov/superadmin) | `src/app/portal/` |
| `/qr` | QR Code viewer warga | `src/app/qr/` |

### 3.2 Dashboard SuperAdmin (`/superadmin`)

| Route | Fungsi | Hak Akses |
|-------|--------|-----------|
| `/superadmin` | **Command Center** — Statistik makro: total unit, inbound global, produksi global, revenue penjualan, piutang. Tabel 10 penjualan terbaru semua unit. | `superadmin` |
| `/superadmin/bank-sampah-units` | **Manajemen Unit Bank Sampah** — CRUD unit BS, buat akun admin/gov (via Edge Function `create-district-accounts`). Toggle `can_sell_direct` per unit. | `superadmin` |
| `/superadmin/market` | **Harga & Market B2B** — Kelola `commodity_prices` (harga beli warga & harga jual pasar). Kelola `b2b_buyers` (data buyer industri). | `superadmin` |
| `/superadmin/courier-quotas` | **Kuota Armada Kurir** — Set kuota per jenis kendaraan per unit BS (`courier_quotas`). | `superadmin` |
| `/superadmin/bot-config` | **Konfigurasi Bot WA** — Menu interaktif (`wa_menu_configs`), template pesan, kredensial webhook. | `superadmin` |
| `/superadmin/settings` | **Pengaturan Sistem** — Branding (nama kabupaten, logo pemda, nama app). Operasional (radius layanan, CS phone). | `superadmin` |

### 3.3 Dashboard Pemerintah / Dinas (`/gov`)

| Route | Fungsi | Data Source |
|-------|--------|-------------|
| `/gov` | **Overview** — KPI cards (Waste Diversion, Penghematan TPA, Reduksi CH4, Tonnage). Populasi ekosistem. Armada kurir. Perputaran ekonomi (saldo warga, revenue penjualan, pencairan pending). **Produksi & Penjualan Produk** (total produksi olahan, transaksi jual, efisiensi konversi). | `transactions`, `profiles`, `inventory_outputs`, `product_sales`, `user_wallets` |
| `/gov/heatmap` | **Geospasial** — Peta sebaran (placeholder modul). | — |
| `/gov/impact` | **Ekonomi** — Analisis dampak ekonomi (placeholder modul). | — |
| `/gov/rewards` | **Reward** — Manajemen penghargaan warga (placeholder modul). | — |
| `/gov/environmental` | **Lingkungan** — Indikator lingkungan (placeholder modul). | — |

**Header Dinamis:**
- Nama kabupaten: dari `system_settings.pemda_name`
- Logo: dari `system_settings.pemda_logo_url`
- Diatur oleh SuperAdmin melalui halaman Settings

### 3.4 Dashboard Admin Bank Sampah (`/admin`)

| Route | Fungsi | Isolasi Data |
|-------|--------|-------------|
| `/admin` | **Command Center** — Statistik lokal unit BS: warga terdaftar di unit ini, kurir aktif, total transaksi, trend tonase. | `bank_sampah_id` |
| `/admin/couriers` | **Manajemen Kurir** — Review lamaran (`courier_applications`), approve/reject, daftarkan kurir offline. | `target_bank_sampah_id` |
| `/admin/fleet` | **Armada Aktif** — List kurir aktif, status online, performa. | `bank_sampah_id` |
| `/admin/transactions` | **Fraud & Transaksi** — Audit transaksi warga, discrepancy check. | `bank_sampah_id` |
| `/admin/pricing` | **Harga Komoditas** — Harga beli sampah lokal unit ini (`unit_commodity_prices`). Masing-masing BS punya harga sendiri. | `bank_sampah_unit_id` |
| `/admin/inventory` | **Produksi & Gudang** — Catat output olahan (`inventory_outputs`). Kelola kategori olahan lokal (`unit_product_categories`) — bisa tambah/hapus kategori sendiri tanpa bercampur unit lain. | `bank_sampah_id` |
| `/admin/sales` | **Penjualan Produk** — Catat penjualan ke buyer (`product_sales`). Kategori produk dari `unit_product_categories` lokal. Buyer dari `b2b_buyers` global. Auto-fill harga. | `bank_sampah_id` |
| `/admin/finance` | **Pencairan Dana** — Proses withdraw warga/kurir (`withdraw_requests`). | `bank_sampah_id` |

### 3.5 Portal Kurir (`/courier`)

| Route | Fungsi |
|-------|--------|
| `/courier` | **Dashboard Kurir** — Status online toggle, ringkasan hari ini, saldo wallet. |
| `/courier/register` | **Pendaftaran Kurir** — Form multi-step (data diri, kendaraan, dokumen). |
| `/courier/login` | **Login Kurir** — Autentikasi. |
| `/courier/pickup` | **Form Jemput Sampah** — Scan QR warga, input timbangan, foto bukti, geo-location. |
| `/courier/manifest` | **Manifest Setoran** — Buat faktur setoran bulk ke Bank Sampah (`courier_deposits`). |

---

## 4. Database Schema (22 Tabel Aktif)

### 4.1 Tabel Inti

#### `profiles` (6 rows)
Ekstensi dari `auth.users`. Menyimpan data profil + role.
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK, FK → auth.users) | |
| `full_name` | text | |
| `phone_number` | text (UNIQUE) | |
| `role` | text | `user` / `courier` / `admin` / `gov` / `superadmin` |
| `address` | text | |
| `location` | geography | Koordinat PostGIS |
| `achievement_points` | int (default 0) | Poin reward |
| `bank_sampah_id` | uuid (FK → bank_sampah_units) | Unit BS affiliasi |
| `bank_sampah_name` | text | Cache nama unit |
| `referred_by` | uuid (FK → profiles) | Referral |
| `registration_source` | text | `web` / `whatsapp` / `admin` |
| `is_registration_complete` | bool | |
| `courier_status` | text | `null` / `pending_approval` / `active` / `suspended` / `terminated` |
| `courier_id_code` | text (UNIQUE) | Format `KUR-XXXX` |
| `vehicle_type`, `vehicle_plate`, `preferred_zone` | text | Data kendaraan kurir |
| `is_online` | bool (default false) | Toggle kurir aktif |

#### `bank_sampah_units` (2 rows)
Unit operasional Bank Sampah dalam kabupaten.
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK) | |
| `name` | text | Nama unit (misal: "Bank Sampah Palakka") |
| `description` | text | |
| `gov_id` | uuid (FK → profiles) | |
| `created_by` | uuid (FK → profiles) | SuperAdmin |
| `is_active` | bool | |
| `can_sell_direct` | bool (default false) | **Toggle penjualan langsung** — jika true, menu Penjualan Produk muncul di dashboard admin BS |

#### `transactions` (1 row)
Transaksi jemput sampah warga.
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | uuid (PK) | |
| `user_id`, `kurir_id`, `courier_id` | uuid (FK) | Warga & kurir terkait |
| `pickup_id` | uuid (FK → pickup_requests) | |
| `weight_organic`, `weight_inorganic` | numeric | Klaim timbangan kurir |
| `admin_weight_organic`, `admin_weight_inorganic` | numeric | Timbangan ulang admin |
| `courier_sorting_quality`, `admin_sorting_quality` | text | Kualitas sortasi |
| `discrepancy_notes` | text | Catatan selisih |
| `photo_proof_url`, `pickup_photo_url` | text | Bukti foto |
| `geo_lat`, `geo_lng` | float8 | Lokasi jemput |
| `picked_up_at` | timestamptz | |
| `status` | text | `requested`/`dijemput`/`picked_up`/`menimbang`/`antre`/`pending`/`completed`/`cancelled`/`rejected` |
| `amount_earned` | numeric | Nilai rupiah untuk warga |
| `bank_sampah_id` | uuid (FK) | Unit BS |
| `courier_deposit_id` | uuid (FK) | Grup setoran |

### 4.2 Tabel Keuangan

| Tabel | Rows | Fungsi |
|-------|------|--------|
| `user_wallets` | 6 | Saldo per user (warga/kurir). PK = `user_id`. |
| `wallet_ledgers` | 0 | Riwayat mutasi (credit/debit) per user. FK → transactions. |
| `withdraw_requests` | 0 | Pengajuan tarik tunai. Status: `pending`/`approved`/`rejected`. |

### 4.3 Tabel Kurir

| Tabel | Rows | Fungsi |
|-------|------|--------|
| `courier_applications` | 1 | Lamaran kurir (online/offline/wa_bot). `target_bank_sampah_id` menentukan admin reviewer. `expires_at` (7 hari). |
| `courier_deposits` | 1 | Manifest setoran bulk kurir → BS. Status: `pending_audit`/`approved`/`rejected`. |
| `courier_logs` | 0 | Log performa kurir (durasi, rating 1-5, lokasi). |
| `courier_quotas` | 8 | Kuota armada per jenis kendaraan per BS. Dikelola SuperAdmin. |

### 4.4 Tabel Produksi & Penjualan (Outbound)

| Tabel | Rows | Fungsi |
|-------|------|--------|
| `inventory_outputs` | 3 | **Catatan produksi olahan** per BS. Kategori, berat, grade, batch number. Kategori dari `unit_product_categories`. |
| `product_sales` | 0 | **Catatan penjualan produk** ke buyer. FK → `b2b_buyers`, `bank_sampah_units`. Payment status tracking. |
| `unit_product_categories` | 16 | **Kategori olahan LOKAL per BS** — setiap unit punya kategori sendiri, tidak bercampur. UNIQUE(bank_sampah_id, name). Admin BS bisa CRUD. |

### 4.5 Tabel Pricing & Market

| Tabel | Rows | Fungsi |
|-------|------|--------|
| `commodity_prices` | 10 | **Harga GLOBAL** — dikelola SuperAdmin. `trade_type`: `buy_from_bank_sampah` (harga SuperAdmin beli dari BS) atau `sell_to_market` (harga jual ke pasar). Seed awal untuk `unit_product_categories`. |
| `unit_commodity_prices` | 5 | **Harga LOKAL per BS** — harga beli sampah warga yang ditentukan masing-masing BS. `trade_type`: `buy_from_citizen` / `sell_outbound`. |
| `b2b_buyers` | 3 | **Data buyer B2B** — perusahaan pembeli produk olahan. Status: `active`/`inactive`/`fulfilled`. |

### 4.6 Tabel Konfigurasi & Sistem

| Tabel | Rows | Fungsi |
|-------|------|--------|
| `system_settings` | 22 | **Pengaturan sistem** — key-value pairs. Categories: `branding` (pemda_name, pemda_logo_url, app_name), `operational` (radius, CS phone), `whatsapp` (token, phone_id). |
| `wa_menu_configs` | 6 | **Menu bot WA** — menu_key, label, response_template. Dikelola SuperAdmin. |
| `policy_configs` | 0 | Master data kebijakan (reward parameters, thresholds). |
| `audit_logs` | 1 | Log perubahan konfigurasi oleh SuperAdmin. |
| `pickup_requests` | 0 | Request jemput dari warga. Status: `pending`/`assigned`/`completed`/`cancelled`. |
| `hub_inventory` | 0 | Legacy: tracki inventory gudang (in/out per kategori). |
| `whatsapp_webhooks` | 132 | Raw webhook payloads dari WhatsApp Cloud API. |

---

## 5. Supabase Edge Functions (4 Aktif)

| Function | Slug | JWT | Fungsi |
|----------|------|-----|--------|
| **Webhook WA** | `webhook-whatsapp` | ❌ | Endpoint webhook WhatsApp Cloud API. Memproses pesan masuk, registrasi via WA, auto-reply. |
| **Create Accounts** | `create-district-accounts` | ❌ | Membuat akun `admin` atau `gov` (with Supabase Auth + profile). Dipanggil dari halaman SuperAdmin. |
| **Manage Accounts** | `manage-district-accounts` | ❌ | Update/reset password akun admin/gov. |
| **Approve Deposit** | `approve-deposit` | ❌ | Proses approval manifest setoran kurir. Update wallet, status transaksi. |

---

## 6. Custom Database Functions

| Function | Fungsi |
|----------|--------|
| `handle_new_user()` | Trigger: auto-create profile + wallet saat user baru di auth.users. |
| `create_wallet_for_new_user()` | Auto-create wallet entry. |
| `handle_valid_transaction_reward_and_wallet()` | Auto-credit wallet warga saat transaksi completed. |
| `increment_wallet_balance()` | Atomic increment saldo wallet. |
| `approve_withdrawal()` | Proses approval withdraw request. |
| `generate_courier_id_code()` | Generate kode kurir unik format `KUR-XXXX`. |
| `get_courier_quotas_by_vehicle()` | RPC: ambil sisa kuota per jenis kendaraan (dipakai di form registrasi kurir). |
| `check_courier_distance_fraud()` | Cek jarak GPS kurir vs alamat warga (fraud detection). |
| `get_user_role()` | Helper: ambil role user (dipakai di RLS policies). |
| `refresh_analytics()` | Refresh materialized view analytics. |

---

## 7. Alur Data Utama

### 7.1 Alur Inbound (Sampah Masuk)
```
Warga request jemput (via WA/Web)
  → pickup_requests (status: pending)
  → Kurir terima order → status: assigned
  → Kurir jemput + timbang di lokasi warga
  → transactions (status: picked_up)
  → Saldo warga otomatis ditambah (wallet)
  → Kurir kumpulkan beberapa transaksi
  → courier_deposits (manifest setoran bulk)
  → Admin BS verifikasi timbangan gudang
  → courier_deposits (status: approved)
  → Komisi kurir dicairkan ke wallet kurir
```

### 7.2 Alur Outbound (Produksi & Penjualan)
```
Admin BS olah sampah mentah
  → inventory_outputs (kategori dari unit_product_categories lokal)
  → Admin BS jual ke buyer (jika can_sell_direct = true)
  → product_sales (FK → b2b_buyers, bank_sampah_id)
  → Data termonitor di SuperAdmin & Gov dashboard
```

### 7.3 Alur Pricing (3 Layer Harga)
```
Layer 1: GLOBAL (SuperAdmin)
  commodity_prices
  ├── buy_from_bank_sampah: Harga SuperAdmin beli dari BS
  └── sell_to_market: Harga referensi jual ke pasar → seed unit_product_categories

Layer 2: LOKAL per BS (Admin BS)
  unit_commodity_prices
  └── buy_from_citizen: Harga BS beli dari warga (tampil di warga app)
  
  unit_product_categories  
  └── Kategori olahan + default_price_per_kg (lokal, independent per unit)

Layer 3: TRANSACTIONAL
  product_sales.price_per_kg: Harga aktual saat transaksi jual
```

### 7.4 Sinkronisasi Data Cross-Dashboard

| Data | Admin BS | SuperAdmin | Gov |
|------|----------|------------|-----|
| Transaksi warga | ✅ Unit sendiri | ✅ Semua unit | ✅ Semua unit |
| Produksi olahan | ✅ Unit sendiri | ✅ Semua unit (agregat) | ✅ Semua unit (agregat) |
| Penjualan produk | ✅ Unit sendiri | ✅ Semua unit + tabel terbaru | ✅ Revenue & piutang |
| Kurir & armada | ✅ Unit sendiri | ✅ Semua unit | ✅ Statistik agregat |
| Warga terdaftar | ✅ Unit sendiri | ✅ Total kabupaten | ✅ Total kabupaten |
| Branding (nama/logo) | ❌ | ✅ Edit | ✅ Read (header) |

---

## 8. Keamanan & RLS

### 8.1 Row Level Security
Semua tabel penting menggunakan RLS. Prinsip:
- **Warga/Kurir**: Hanya lihat data sendiri
- **Admin BS**: Hanya data unit BS sendiri (filter `bank_sampah_id`)
- **SuperAdmin**: Akses penuh semua data
- **Gov**: Read-only semua data yang relevan untuk monitoring

### 8.2 RLS Policies Kritis

| Tabel | Policy | Filter |
|-------|--------|--------|
| `system_settings` | Branding bisa dibaca semua user | `category = 'branding'` |
| `system_settings` | Full access SuperAdmin | `role = 'superadmin'` |
| `product_sales` | Admin kelola unit sendiri | `bank_sampah_id = profiles.bank_sampah_id` |
| `product_sales` | SuperAdmin/Gov bisa baca semua | `role IN ('superadmin', 'gov')` |
| `unit_product_categories` | Admin kelola unit sendiri | `bank_sampah_id = profiles.bank_sampah_id` |
| `unit_product_categories` | SuperAdmin/Gov bisa baca | `role IN ('superadmin', 'gov')` |
| `inventory_outputs` | Admin insert di unit sendiri | Insert check |
| `inventory_outputs` | SuperAdmin/Gov/Admin baca | Multi-role read |
| `transactions` | Isolasi per user/kurir/admin/gov | Multi-policy |

### 8.3 Proteksi Akses Dashboard
- Semua rute dashboard dilindungi `AuthGuard` (komponen React)
- `AuthGuard` memverifikasi session + role sebelum render
- Redirect ke `/portal` jika unauthorized
- Portal login otomatis redirect sesuai role

---

## 9. Bot WhatsApp

### 9.1 Infrastruktur
| Komponen | Detail |
|----------|--------|
| API | WhatsApp Cloud API (Meta) |
| Webhook | `https://icyirbezrmixxkzzrufq.supabase.co/functions/v1/webhook-whatsapp` |
| Verify Token | `beres_api_123` |
| Process Manager | PM2 (`ecosistem-bot`) di VPS |
| VPS Path | `/home/ubuntu/ecosistem-bot/vps-bot/` |

### 9.2 Dual Registration Path
| Jalur | Flow | Output |
|-------|------|--------|
| **Web** (`/auth`) | User isi form → Supabase → Bot kirim welcome WA | `registration_source = 'web'` |
| **WhatsApp** | User kirim DAFTAR/referral → Bot pandu step-by-step → Supabase | `registration_source = 'whatsapp'` |

### 9.3 Menu Bot (dari `wa_menu_configs`)
| Key | Fungsi |
|-----|--------|
| `welcome_message` | Pesan saat user terdaftar ketik MENU/HALO |
| `menu_header` | Header daftar menu |
| `unregistered_message` | Info pendaftaran untuk user belum terdaftar |
| `registration_welcome` | Pesan proaktif setelah daftar via web |
| `wa_registration_complete` | Selamat setelah daftar via WA |

---

## 10. Fleet Management (Kurir)

### 10.1 Onboarding Flow
```
Calon kurir mendaftar (WA/PWA/offline)
  → courier_applications (status: pending)
  → Admin BS review (hanya lamaran ke unitnya)
  → Approve: generate KUR-XXXX, update profile.role = 'courier'
  → Reject: wajib sertakan alasan
  → Expire: otomatis setelah 7 hari tanpa review
```

### 10.2 Pickup Flow
```
Kurir buka PWA → Toggle online
  → Terima order (Push WA / rebutan)
  → Tiba di lokasi warga
  → Scan QR warga / input manual
  → Geo-location check (fraud detection: >50m = red flag)
  → Timbang + pisahkan (organik/anorganik)
  → Upload foto bukti
  → Submit → transactions (status: picked_up)
  → Saldo warga langsung ditambah
  → Lanjut ke warga berikutnya
  → Akhir shift: buat manifest → courier_deposits
  → Admin BS audit timbangan gudang vs klaim
```

### 10.3 Kuota Armada
- Dikelola SuperAdmin di `/superadmin/courier-quotas`
- Per jenis kendaraan (motor, mobil_pickup, gerobak, sepeda) per unit BS
- Validasi real-time di form registrasi kurir via RPC `get_courier_quotas_by_vehicle`

---

## 11. Storage Buckets

| Bucket | Tipe | Fungsi | Max |
|--------|------|--------|-----|
| `courier-documents` | Private | Foto KTP, SIM, Selfie+KTP kurir | 5MB per file |

Format: `{user_id}/{doc_type}_{timestamp}.{ext}`

---

## 12. Roadmap

### Fase 1 ✅ (Selesai)
- Core Web Dashboard (Admin, Gov, SuperAdmin)
- Supabase schema + RLS + Edge Functions
- Bot WhatsApp integration
- Kurir registration + fleet management
- Pricing 3-layer system

### Fase 2 🔄 (In Progress)
- Penjualan produk (product_sales) + monitoring
- Kategori olahan lokal per BS
- Branding dinamis (nama/logo kabupaten)
- Efisiensi konversi monitoring

### Fase 3 (Planned)
- Smart Dispatch Algorithm (nearest/rating/load-balance)
- Laporan ekspor PDF/Excel dari Gov dashboard
- Geospasial heatmap (integrasi PostGIS)
- Reward system untuk warga aktif
- Modul lingkungan (Waste Diversion Rate, Emisi CH4)

### Fase 4 (Future)
- Regional Instance (klon per kabupaten)
- National Aggregator (live counter nasional)
- Mobile PWA optimization
- Push notification (WA interactive buttons)
