"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
  Send, Package, CheckCircle2, XCircle, ArrowLeft, 
  Scale, Leaf, Recycle, AlertTriangle, Truck, MapPin
} from "lucide-react";
import Link from "next/link";

type PickupItem = {
  id: string;
  warga_name: string;
  weight_organic: number;
  weight_inorganic: number;
  sorting_quality: string;
  created_at: string;
};

export default function CourierManifestPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [todayPickups, setTodayPickups] = useState<PickupItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [manifestCreated, setManifestCreated] = useState(false);
  const [manifestId, setManifestId] = useState<string | null>(null);

  // Existing pending manifests (already submitted but not yet audited)
  const [pendingManifests, setPendingManifests] = useState<any[]>([]);

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

    await loadData(user.id, prof?.bank_sampah_id);
    setLoading(false);
  };

  const loadData = async (courierId: string, bankSampahId: string | null) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Load unlinked pickups (not yet in any manifest)
    const { data: pickups } = await supabase
      .from("transactions")
      .select("id, weight_organic, weight_inorganic, courier_sorting_quality, created_at, warga:profiles!transactions_user_id_fkey(full_name)")
      .eq("courier_id", courierId)
      .is("courier_deposit_id", null)
      .eq("status", "picked_up")
      .order("created_at", { ascending: true });

    const items: PickupItem[] = (pickups || []).map((t: any) => ({
      id: t.id,
      warga_name: t.warga?.full_name || "Warga",
      weight_organic: t.weight_organic || 0,
      weight_inorganic: t.weight_inorganic || 0,
      sorting_quality: t.courier_sorting_quality || "-",
      created_at: t.created_at,
    }));
    setTodayPickups(items);

    // 2. Load existing pending manifests by this courier
    const { data: manifests } = await supabase
      .from("courier_deposits")
      .select("id, total_organic_claimed, total_inorganic_claimed, transaction_count, status, created_at, approved_at")
      .eq("kurir_id", courierId)
      .in("status", ["pending_audit", "approved"])
      .order("created_at", { ascending: false })
      .limit(10);

    setPendingManifests(manifests || []);
  };

  // Create Manifest — aggregate all unlinked pickups
  const handleCreateManifest = async () => {
    if (todayPickups.length === 0 || !user || !profile) return;
    setSubmitting(true);

    try {
      const totalOrg = todayPickups.reduce((s, p) => s + p.weight_organic, 0);
      const totalInorg = todayPickups.reduce((s, p) => s + p.weight_inorganic, 0);
      const txIds = todayPickups.map(p => p.id);

      // 1. Create the manifest (courier_deposit)
      const { data: manifest, error: manifestError } = await supabase
        .from("courier_deposits")
        .insert({
          kurir_id: user.id,
          bank_sampah_id: profile.bank_sampah_id,
          total_organic_claimed: Number(totalOrg.toFixed(1)),
          total_inorganic_claimed: Number(totalInorg.toFixed(1)),
          transaction_count: txIds.length,
          status: "pending_audit",
        })
        .select("id")
        .single();

      if (manifestError) throw manifestError;

      // 2. Link all transactions to this manifest
      const { error: linkError } = await supabase
        .from("transactions")
        .update({ courier_deposit_id: manifest.id, status: "antre" })
        .in("id", txIds);

      if (linkError) throw linkError;

      setManifestId(manifest.id);
      setManifestCreated(true);

      // Refresh data
      await loadData(user.id, profile.bank_sampah_id);
    } catch (err: any) {
      console.error("Gagal membuat manifest:", err);
      alert("Gagal mengirim manifest: " + err.message);
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
          <p className="text-slate-500 mb-6">Halaman ini hanya untuk Kurir aktif.</p>
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
              <h1 className="font-bold text-lg text-slate-800">Manifest Setoran</h1>
              <p className="text-xs text-slate-500">Kirim faktur ke Bank Sampah</p>
            </div>
          </div>
          <Link
            href="/courier/pickup"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition border border-emerald-100"
          >
            <MapPin className="w-3.5 h-3.5" /> Jemput Lagi
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* === Success State === */}
        {manifestCreated && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-xl font-black text-emerald-800 mb-1">Manifest Berhasil Dikirim! 🎉</h3>
            <p className="text-sm text-emerald-600 mb-4">
              Faktur setoran Anda telah masuk ke antrean validasi Admin Bank Sampah.
            </p>
            <p className="text-xs text-slate-500 font-mono mb-4">ID: {manifestId?.slice(0, 8)}...</p>
            <div className="flex gap-3 justify-center">
              <Link href="/courier/pickup" className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition text-sm">
                Jemput Lagi
              </Link>
              <button
                onClick={() => setManifestCreated(false)}
                className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition text-sm"
              >
                Lihat Riwayat
              </button>
            </div>
          </div>
        )}

        {/* === Unsubmitted Pickups === */}
        {todayPickups.length > 0 && !manifestCreated && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Aggregate Summary */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="w-5 h-5" />
                  <h3 className="font-bold text-base">Rangkuman Muatan Armada</h3>
                  <span className="ml-auto text-xs bg-white/20 px-3 py-1 rounded-full font-bold">{todayPickups.length} Rumah</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <Leaf className="w-5 h-5 mx-auto mb-1 text-emerald-300" />
                    <p className="text-3xl font-black font-mono">{totalOrg.toFixed(1)}</p>
                    <p className="text-xs opacity-70">Kg Organik</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-center">
                    <Recycle className="w-5 h-5 mx-auto mb-1 text-blue-300" />
                    <p className="text-3xl font-black font-mono">{totalInorg.toFixed(1)}</p>
                    <p className="text-xs opacity-70">Kg Anorganik</p>
                  </div>
                </div>
              </div>

              {/* Itemized List */}
              <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                {todayPickups.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                    <div className="h-7 w-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{p.warga_name}</p>
                      <p className="text-xs text-slate-500 font-mono">Org: {p.weight_organic} | Anorg: {p.weight_inorganic} Kg</p>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(p.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Setelah manifest dikirim, Admin Bank Sampah akan menimbang ulang seluruh muatan Anda.
                  Jika terdapat selisih besar, sistem akan mencatat notifikasi peringatan.
                </p>
              </div>
            </div>

            {/* Submit Manifest Button */}
            <button
              onClick={handleCreateManifest}
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-lg rounded-2xl hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {submitting ? (
                <><div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengirim Manifest...</>
              ) : (
                <><Send className="w-5 h-5" /> KIRIM MANIFEST KE BANK SAMPAH</>
              )}
            </button>
          </>
        )}

        {/* === No Pickups State === */}
        {todayPickups.length === 0 && !manifestCreated && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <Package className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-700 mb-2">Belum Ada Muatan</h3>
            <p className="text-sm text-slate-500 mb-6">Silakan jemput sampah warga terlebih dahulu sebelum membuat manifest.</p>
            <Link
              href="/courier/pickup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition text-sm"
            >
              <MapPin className="w-4 h-4" /> Mulai Jemput Sampah
            </Link>
          </div>
        )}

        {/* === Manifest History === */}
        {pendingManifests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-500" /> Riwayat Manifest
            </h3>
            <div className="space-y-3">
              {pendingManifests.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    m.status === "approved" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  }`}>
                    {m.status === "approved" ? <CheckCircle2 className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800">
                        {m.total_organic_claimed} Kg Org + {m.total_inorganic_claimed} Kg Anorg
                      </p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        m.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {m.status === "approved" ? "DISETUJUI" : "MENUNGGU AUDIT"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      {m.transaction_count || 0} rumah • {new Date(m.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
