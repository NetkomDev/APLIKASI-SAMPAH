"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
  ScanLine, Scale, Leaf, Recycle, Send, CheckCircle2, XCircle, 
  MapPin, ArrowLeft, Package, Plus, Camera, Star, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { Scanner } from "@yudiel/react-qr-scanner";

type PickupItem = {
  id: string;
  warga_name: string;
  warga_id: string;
  weight_organic: number;
  weight_inorganic: number;
  sorting_quality: string;
  status: string;
  created_at: string;
};

export default function CourierPickupPage() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // QR/Scan state
  const [scanMode, setScanMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedWarga, setScannedWarga] = useState<any>(null);
  const [scanError, setScanError] = useState("");

  // Input state
  const [weightOrg, setWeightOrg] = useState("");
  const [weightInorg, setWeightInorg] = useState("");
  const [sortingQuality, setSortingQuality] = useState("Standar (Campur Sedikit)");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Today's pickups (unsubmitted manifest)
  const [todayPickups, setTodayPickups] = useState<PickupItem[]>([]);

  // Geo state
  const [geoLat, setGeoLat] = useState<number | null>(null);
  const [geoLng, setGeoLng] = useState<number | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/courier/login"; return; }
    setUser(user);

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(prof);

    // Load today's unlinked pickups by this courier (no manifest yet)
    await loadTodayPickups(user.id);
    
    // Get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGeoLat(pos.coords.latitude); setGeoLng(pos.coords.longitude); },
        () => {}
      );
    }
    setLoading(false);
  };

  const loadTodayPickups = async (courierId: string) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("transactions")
      .select("id, weight_organic, weight_inorganic, courier_sorting_quality, status, created_at, warga:profiles!transactions_user_id_fkey(full_name, id)")
      .eq("courier_id", courierId)
      .is("courier_deposit_id", null) // Not yet part of a manifest
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false });

    const items: PickupItem[] = (data || []).map((t: any) => ({
      id: t.id,
      warga_name: t.warga?.full_name || "Warga",
      warga_id: t.warga?.id || "",
      weight_organic: t.weight_organic || 0,
      weight_inorganic: t.weight_inorganic || 0,
      sorting_quality: t.courier_sorting_quality || "-",
      status: t.status,
      created_at: t.created_at,
    }));
    setTodayPickups(items);
  };

  // Scan/Search warga by QR code or manual input
  const handleScanWarga = async (code: string) => {
    setScanError("");
    setScannedWarga(null);

    const trimmed = code.trim();
    if (!trimmed) { setScanError("Masukkan kode QR atau nama warga"); return; }

    // Sanitize input: remove characters that could break PostgREST query
    const sanitized = trimmed.replace(/[,()]/g, "");

    // Try by UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sanitized);

    let data = null;
    if (isUUID) {
      const res = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, address, bank_sampah_id")
        .eq("id", sanitized)
        .eq("role", "user")
        .maybeSingle();
      data = res.data;
    }

    // If not found by UUID, search by name
    if (!data) {
      const res = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, address, bank_sampah_id")
        .eq("role", "user")
        .ilike("full_name", `%${sanitized}%`)
        .limit(1)
        .maybeSingle();
      data = res.data;
    }

    if (!data) {
      setScanError("Warga tidak ditemukan. Pastikan QR Code atau nama benar.");
      return;
    }

    setScannedWarga(data);
    setScanMode(false);
  };

  // Submit pickup for this warga
  const handleSubmitPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedWarga || !user) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: scannedWarga.id,
        courier_id: user.id,
        bank_sampah_id: profile?.bank_sampah_id || null,
        weight_organic: Number(weightOrg) || 0,
        weight_inorganic: Number(weightInorg) || 0,
        courier_sorting_quality: sortingQuality,
        status: "picked_up",
        picked_up_at: new Date().toISOString(),
        geo_lat: geoLat,
        geo_lng: geoLng,
        // amount_earned will be calculated later by admin/system 
        amount_earned: 0,
      });

      if (error) throw error;

      setSubmitSuccess(true);
      // Reset form
      setTimeout(() => {
        setScannedWarga(null);
        setWeightOrg("");
        setWeightInorg("");
        setSortingQuality("Standar (Campur Sedikit)");
        setSubmitSuccess(false);
        loadTodayPickups(user.id);
      }, 1500);
    } catch (err: any) {
      console.error("Gagal input pickup:", err);
      alert("Gagal menyimpan data: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Totals
  const totalOrg = todayPickups.reduce((s, p) => s + p.weight_organic, 0);
  const totalInorg = todayPickups.reduce((s, p) => s + p.weight_inorganic, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || profile?.role !== "courier") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500 mb-6">Halaman ini hanya untuk Kurir yang sudah terdaftar dan aktif.</p>
          <Link href="/" className="text-emerald-600 font-semibold underline">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/courier" className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="font-bold text-lg text-slate-800">Jemput Sampah</h1>
              <p className="text-xs text-slate-500">Scan QR → Timbang → Catat</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {geoLat && <MapPin className="w-4 h-4 text-emerald-500" />}
            <span className="text-xs font-mono text-slate-400">{profile?.courier_id_code || "KURIR"}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Today's Running Total Bar */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold opacity-90">Muatan Hari Ini (Belum Disetor)</h3>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold">{todayPickups.length} Rumah</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs opacity-70 mb-1">Organik</p>
              <p className="text-3xl font-black font-mono">{totalOrg.toFixed(1)} <span className="text-base font-normal opacity-70">Kg</span></p>
            </div>
            <div>
              <p className="text-xs opacity-70 mb-1">Anorganik</p>
              <p className="text-3xl font-black font-mono">{totalInorg.toFixed(1)} <span className="text-base font-normal opacity-70">Kg</span></p>
            </div>
          </div>
          {todayPickups.length > 0 && (
            <Link 
              href="/courier/manifest" 
              className="mt-4 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white py-2.5 rounded-xl text-sm font-bold transition"
            >
              <Send className="w-4 h-4" /> Buat Manifest & Setor ke Bank Sampah
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Scan / Search Warga Section */}
        {!scannedWarga ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-emerald-600" />
              Identifikasi Warga
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanWarga(manualCode)}
                placeholder="Kode warga / Nama..."
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
              />
              <button
                onClick={() => setScanMode(true)}
                className="px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition text-sm shadow-sm flex items-center justify-center border border-slate-300"
                title="Scan QR Kamera"
              >
                <Camera className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={() => handleScanWarga(manualCode)}
                className="px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition text-sm shadow-sm"
              >
                Cari
              </button>
            </div>

            {scanMode && (
              <div className="mt-4 p-2 bg-slate-900 rounded-2xl overflow-hidden relative">
                <button 
                  onClick={() => setScanMode(false)}
                  className="absolute top-4 right-4 z-10 bg-white/20 text-white p-2 text-xs font-bold rounded-full backdrop-blur-md"
                >
                  <XCircle className="w-5 h-5" />
                </button>
                <div className="h-64 w-full rounded-xl overflow-hidden relative">
                  <Scanner 
                    onScan={(result) => result?.[0]?.rawValue && handleScanWarga(result[0].rawValue)} 
                    styles={{ container: { width: "100%", height: "100%" } }}
                  />
                </div>
                <p className="text-center text-xs text-white/70 mt-3 pb-2">Arahkan kamera ke QR Code milik Warga</p>
              </div>
            )}

            {scanError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex items-center gap-2">
                <XCircle className="w-4 h-4 flex-shrink-0" /> {scanError}
              </div>
            )}
          </div>
        ) : (
          /* Warga Identified → Weighing Form */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Warga Info Bar */}
            <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {scannedWarga.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{scannedWarga.full_name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{scannedWarga.address || "Alamat belum diisi"}</p>
                </div>
              </div>
              <button onClick={() => setScannedWarga(null)} className="text-xs text-red-500 font-semibold hover:underline">Ganti</button>
            </div>

            {/* Weighing Form */}
            <form onSubmit={handleSubmitPickup} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                    <Leaf className="w-4 h-4" /> Organik
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={weightOrg}
                      onChange={(e) => setWeightOrg(e.target.value)}
                      className="w-full text-center font-mono font-black text-3xl py-3 rounded-xl border-2 border-emerald-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                      placeholder="0.0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Kg</span>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                    <Recycle className="w-4 h-4" /> Anorganik
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={weightInorg}
                      onChange={(e) => setWeightInorg(e.target.value)}
                      className="w-full text-center font-mono font-black text-3xl py-3 rounded-xl border-2 border-blue-200 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      placeholder="0.0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Kg</span>
                  </div>
                </div>
              </div>

              {/* Sorting Quality */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  <Star className="w-4 h-4 text-amber-500" /> Kualitas Pilahan Warga
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: "Sangat Bersih", emoji: "🌟", activeClass: "bg-emerald-50 border-emerald-400 text-emerald-700 ring-2 ring-emerald-200" },
                    { val: "Standar (Campur Sedikit)", emoji: "👍", activeClass: "bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200" },
                    { val: "Campur Aduk / Belum Dipilah", emoji: "⚠️", activeClass: "bg-amber-50 border-amber-400 text-amber-700 ring-2 ring-amber-200" },
                    { val: "Kotoran / Residu Tinggi", emoji: "🚫", activeClass: "bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200" },
                  ].map((q) => (
                    <button
                      key={q.val}
                      type="button"
                      onClick={() => setSortingQuality(q.val)}
                      className={`p-3 rounded-xl border-2 text-left text-xs font-semibold transition-all ${
                        sortingQuality === q.val
                          ? q.activeClass
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-base mr-1">{q.emoji}</span> {q.val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || submitSuccess}
                className={`w-full py-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                  submitSuccess
                    ? "bg-emerald-500"
                    : "bg-slate-900 hover:bg-emerald-600 active:scale-[0.98]"
                } disabled:opacity-70`}
              >
                {submitSuccess ? (
                  <><CheckCircle2 className="w-5 h-5" /> TERSIMPAN!</>
                ) : submitting ? (
                  <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                ) : (
                  <><Plus className="w-5 h-5" /> CATAT JEMPUTAN INI</>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Today's Pickup History */}
        {todayPickups.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-500" />
              Riwayat Jemputan Hari Ini
              <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">{todayPickups.length} rumah</span>
            </h3>
            <div className="space-y-3">
              {todayPickups.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="h-8 w-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{todayPickups.length - i}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.warga_name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      Org: {p.weight_organic} Kg | Anorg: {p.weight_inorganic} Kg
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{p.sorting_quality === "Sangat Bersih" ? "🌟" : p.sorting_quality === "Kotoran / Residu Tinggi" ? "🚫" : "✓"}</span>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(p.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
