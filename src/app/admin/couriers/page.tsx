"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
    Users, CheckCircle2, XCircle, Clock, Eye, ChevronDown, ChevronUp,
    Phone, MapPin, Truck, AlertTriangle, Search, Filter, IdCard, ArrowLeft,
    Plus, UserPlus, Timer, X
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────
interface CourierApplication {
    id: string;
    user_id: string;
    nik: string;
    full_name: string;
    birth_place: string;
    birth_date: string;
    address_ktp: string;
    phone_number: string;
    vehicle_type: string;
    vehicle_plate: string | null;
    preferred_zone: string;
    ktp_photo_url: string;
    sim_photo_url: string | null;
    selfie_ktp_url: string | null;
    status: "pending" | "approved" | "rejected";
    reject_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    courier_id_code: string | null;
    created_at: string;
    expires_at: string | null;
    source: string | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_CONFIG = {
    pending: { label: "Menunggu", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
    approved: { label: "Disetujui", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
    rejected: { label: "Ditolak", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
};

const VEHICLE_LABELS: Record<string, string> = {
    motor: "Sepeda Motor",
    mobil_pickup: "Mobil Pickup",
    gerobak: "Gerobak",
    sepeda: "Sepeda",
};

// ─── Signed URL helper ────────────────────────────────────────
async function getSignedUrl(path: string): Promise<string | null> {
    if (!path) return null;
    const { data } = await supabase.storage
        .from("courier-documents")
        .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminCouriersPage() {
    const [applications, setApplications] = useState<CourierApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Approval state
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectModalId, setRejectModalId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Manual registration modal state
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualForm, setManualForm] = useState({
        fullName: "", nik: "", phone: "", vehicleType: "motor",
        vehiclePlate: "", addressKtp: "", birthPlace: "", birthDate: "",
    });
    const [manualSubmitting, setManualSubmitting] = useState(false);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        // 1. Dapatkan bank_sampah_id milik admin saat ini
        const { data: adminProfile } = await supabase.from("profiles").select("bank_sampah_id").eq("id", user.id).single();

        if (!adminProfile?.bank_sampah_id) {
            setApplications([]);
            setLoading(false);
            return;
        }

        // 2. Query lamaran SECARA STRICT hanya yang ditujukan ke Cabang (Bank Sampah) ini
        let query = supabase
            .from("courier_applications")
            .select("*")
            .eq("target_bank_sampah_id", adminProfile.bank_sampah_id)
            .order("created_at", { ascending: false });

        if (filter !== "all") {
            query = query.eq("status", filter);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Fetch error:", error);
        } else {
            setApplications(data || []);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    // ─── Approve Handler ──────────────────────────────────────
    const handleApprove = async (app: CourierApplication) => {
        if (!confirm(`Setujui ${app.full_name} sebagai kurir di Bank Sampah Anda?`)) return;
        setProcessingId(app.id);
        setActionMessage(null);

        try {
            // Generate courier ID code via database function
            const { data: codeResult } = await supabase.rpc("generate_courier_id_code");
            const courierCode = codeResult || `KUR-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

            // Get current user (admin) ID and their bank_sampah_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Akses ditolak. Silakan login kembali.");

            const { data: adminProfile } = await supabase.from("profiles").select("bank_sampah_id, bank_sampah_name").eq("id", user.id).single();
            if (!adminProfile || !adminProfile.bank_sampah_id) throw new Error("Profil admin tidak valid atau Anda bukan admin bank sampah.");

            // 1. Update application
            const { error: appErr } = await supabase
                .from("courier_applications")
                .update({
                    status: "approved",
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    courier_id_code: courierCode,
                })
                .eq("id", app.id);

            if (appErr) throw appErr;

            // 2. Update profile: link to bank_sampah_id perfectly
            const { error: profileErr } = await supabase
                .from("profiles")
                .update({
                    role: "courier",
                    courier_status: "active",
                    courier_id_code: courierCode,
                    vehicle_type: app.vehicle_type,
                    vehicle_plate: app.vehicle_plate,
                    preferred_zone: app.preferred_zone,
                    is_online: false,
                    bank_sampah_id: adminProfile.bank_sampah_id,
                    bank_sampah_name: adminProfile.bank_sampah_name
                })
                .eq("id", app.user_id);

            if (profileErr) throw profileErr;

            // 3. Create wallet for courier (if not exists)
            await supabase
                .from("user_wallets")
                .upsert({ user_id: app.user_id, balance: 0 }, { onConflict: "user_id" });

            setActionMessage({ type: "success", text: `✅ ${app.full_name} resmi bergabung! Notif WA akan dikirim otomatis.` });
            fetchApplications();
        } catch (err) {
            console.error("Approve error:", err);
            setActionMessage({ type: "error", text: `❌ Gagal menyetujui: ${err instanceof Error ? err.message : "Unknown error"}` });
        }
        setProcessingId(null);
    };

    // ─── Reject Handler ───────────────────────────────────────
    const handleReject = async (app: CourierApplication) => {
        if (!rejectReason.trim()) return;
        setProcessingId(app.id);
        setActionMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("courier_applications")
                .update({
                    status: "rejected",
                    reject_reason: rejectReason,
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq("id", app.id);

            if (error) throw error;

            // Reset courier_status on profile
            await supabase
                .from("profiles")
                .update({ courier_status: null })
                .eq("id", app.user_id);

            setActionMessage({ type: "success", text: `${app.full_name} ditolak. Notif WA akan dikirim.` });
            setRejectModalId(null);
            setRejectReason("");
            fetchApplications();
        } catch (err) {
            console.error("Reject error:", err);
            setActionMessage({ type: "error", text: `❌ Gagal menolak: ${err instanceof Error ? err.message : "Unknown error"}` });
        }
        setProcessingId(null);
    };

    // ─── Filter ───────────────────────────────────────────────
    const filtered = applications.filter((a) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return a.full_name.toLowerCase().includes(q) || a.nik.includes(q) || a.phone_number.includes(q);
        }
        return true;
    });

    const counts = {
        all: applications.length,
        pending: applications.filter((a) => a.status === "pending" && !(a.expires_at && new Date(a.expires_at) < new Date())).length,
        approved: applications.filter((a) => a.status === "approved").length,
        rejected: applications.filter((a) => a.status === "rejected").length,
        expired: applications.filter((a) => a.status === "pending" && a.expires_at && new Date(a.expires_at) < new Date()).length,
    };

    // ─── Manual Registration Handler ─────────────────────────
    const [modalError, setModalError] = useState<string | null>(null);

    const handleManualRegister = async () => {
        if (!manualForm.fullName || !manualForm.nik || !manualForm.phone) {
            setModalError("Nama, NIK, dan No. Telepon wajib diisi.");
            return;
        }
        setManualSubmitting(true);
        setModalError(null);
        setActionMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sesi login habis.");

            const { data: adminProfile } = await supabase.from("profiles").select("bank_sampah_id, bank_sampah_name").eq("id", user.id).single();
            if (!adminProfile?.bank_sampah_id) throw new Error("Profil admin tidak valid.");

            // Normalize phone
            let phone = manualForm.phone.replace(/\D/g, "");
            if (phone.startsWith("0")) phone = "62" + phone.slice(1);
            if (!phone.startsWith("62")) phone = "62" + phone;

            // Check if profile already exists by phone
            const { data: existingProfile } = await supabase
                .from("profiles").select("id, courier_status").eq("phone_number", phone).maybeSingle();

            let courierUserId: string;

            if (existingProfile) {
                // User already exists — use their ID
                courierUserId = existingProfile.id;

                if (existingProfile.courier_status === "pending_approval") {
                    throw new Error("Nomor ini sudah terdaftar dan menunggu approval.");
                }
            } else {
                // Create user via Supabase Admin API (does NOT switch session)
                const email = `wa_${phone}@ecosistemdigital.id`;
                const tempPassword = `BERES-${manualForm.nik.slice(-4)}-${Date.now().toString(36)}`;

                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeWlyYmV6cm1peHhrenpydWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxNDQ2MywiZXhwIjoyMDg4MjkwNDYzfQ.r_IaCQK6lr-121Szk98PdKk8F_dhkJJ8NjxnekBrJac";

                const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": serviceKey,
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        email,
                        password: tempPassword,
                        email_confirm: true,
                        user_metadata: { full_name: manualForm.fullName },
                    }),
                });

                const createData = await createRes.json();

                if (!createRes.ok) {
                    // If user already exists in auth but not in profiles
                    if (createData?.msg?.includes?.("already") || createData?.message?.includes?.("already")) {
                        const { data: foundByEmail } = await supabase
                            .from("profiles").select("id").eq("phone_number", phone).maybeSingle();
                        if (foundByEmail) {
                            courierUserId = foundByEmail.id;
                        } else {
                            throw new Error("Akun sudah ada tapi profil tidak ditemukan. Hubungi SuperAdmin.");
                        }
                    } else {
                        throw new Error(createData?.msg || createData?.message || "Gagal membuat akun baru.");
                    }
                } else {
                    courierUserId = createData.id;
                }
            }

            // Upsert profile (without changing role — will be upgraded on approval)
            await supabase.from("profiles").upsert({
                id: courierUserId!,
                full_name: manualForm.fullName,
                phone_number: phone,
                address: manualForm.addressKtp,
                role: "user",
            });

            // Insert into courier_applications
            const { error: insertErr } = await supabase.from("courier_applications").insert({
                user_id: courierUserId!,
                nik: manualForm.nik,
                full_name: manualForm.fullName,
                birth_place: manualForm.birthPlace || "-",
                birth_date: manualForm.birthDate || new Date().toISOString().split("T")[0],
                address_ktp: manualForm.addressKtp || "-",
                phone_number: phone,
                vehicle_type: manualForm.vehicleType,
                vehicle_plate: manualForm.vehiclePlate || null,
                preferred_zone: adminProfile.bank_sampah_name || "",
                target_bank_sampah_id: adminProfile.bank_sampah_id,
                ktp_photo_url: "",
                status: "pending",
                source: "offline",
            });

            if (insertErr) throw new Error(`Gagal menyimpan: ${insertErr.message}`);

            // Update courier_status on profile
            await supabase.from("profiles").update({ courier_status: "pending_approval" }).eq("id", courierUserId!);

            // SUCCESS → close modal and refresh
            setShowManualModal(false);
            setManualForm({ fullName: "", nik: "", phone: "", vehicleType: "motor", vehiclePlate: "", addressKtp: "", birthPlace: "", birthDate: "" });
            setActionMessage({ type: "success", text: `✅ ${manualForm.fullName} berhasil didaftarkan dan menunggu approval.` });
            fetchApplications();
        } catch (err) {
            // Show error INSIDE the modal (don't close it)
            setModalError(err instanceof Error ? err.message : "Gagal mendaftarkan.");
        }
        setManualSubmitting(false);
    };


    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin" className="p-2 rounded-lg hover:bg-slate-200 transition">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Manajemen Kurir</h1>
                        <p className="text-sm text-slate-500">Persetujuan pendaftaran kurir baru</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {counts.pending > 0 && (
                        <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 animate-pulse">
                            {counts.pending} menunggu review
                        </span>
                    )}
                    <button
                        onClick={() => setShowManualModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Daftarkan Kurir (Offline)
                    </button>
                </div>
            </div>

            {/* Action Message */}
            {actionMessage && (
                <div className={`p-4 rounded-xl border text-sm font-medium ${actionMessage.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                    {actionMessage.text}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => {
                    const config = s === "all"
                        ? { label: "Semua Lamaran", color: "text-slate-600 bg-slate-100", icon: Users }
                        : STATUS_CONFIG[s];
                    return (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`p-4 rounded-xl border transition-all text-left ${filter === s
                                ? "ring-2 ring-brand-300 border-brand-200 shadow-sm"
                                : "border-slate-200 hover:border-slate-300"
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <config.icon className={`w-4 h-4 ${s === "all" ? "text-slate-500" : ""}`} />
                                <span className="text-xs font-semibold text-slate-500 uppercase">{config.label}</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{counts[s]}</p>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Cari berdasarkan nama, NIK, atau nomor telepon..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition"
                />
            </div>

            {/* Applications List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="h-8 w-8 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Memuat data lamaran...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Tidak ada lamaran ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((app) => (
                        <ApplicationCard
                            key={app.id}
                            app={app}
                            isExpanded={expandedId === app.id}
                            onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                            onApprove={() => handleApprove(app)}
                            onRejectOpen={() => { setRejectModalId(app.id); setRejectReason(""); }}
                            isProcessing={processingId === app.id}
                        />
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModalId && (
                <RejectModal
                    app={applications.find((a) => a.id === rejectModalId)!}
                    reason={rejectReason}
                    onReasonChange={setRejectReason}
                    onConfirm={() => {
                        const app = applications.find((a) => a.id === rejectModalId);
                        if (app) handleReject(app);
                    }}
                    onCancel={() => { setRejectModalId(null); setRejectReason(""); }}
                    isProcessing={!!processingId}
                />
            )}

            {/* Manual Registration Modal */}
            {showManualModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-brand-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Daftarkan Kurir (Offline)</h3>
                                    <p className="text-xs text-slate-500">Untuk pendaftar walk-in langsung di Bank Sampah</p>
                                </div>
                            </div>
                            <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 bg-red-50 text-red-700 text-sm font-semibold rounded-lg border border-red-100 flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <p>{modalError}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Nama Lengkap *</label>
                                <input type="text" value={manualForm.fullName} onChange={(e) => setManualForm(f => ({...f, fullName: e.target.value}))} placeholder="Nama sesuai KTP" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">NIK *</label>
                                <input type="text" maxLength={16} value={manualForm.nik} onChange={(e) => setManualForm(f => ({...f, nik: e.target.value.replace(/\D/g, "")}))} placeholder="16 digit" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">No. Telepon/WA *</label>
                                <input type="text" value={manualForm.phone} onChange={(e) => setManualForm(f => ({...f, phone: e.target.value}))} placeholder="08xxxxxxxxxx" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Tempat Lahir</label>
                                <input type="text" value={manualForm.birthPlace} onChange={(e) => setManualForm(f => ({...f, birthPlace: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Tanggal Lahir</label>
                                <input type="date" value={manualForm.birthDate} onChange={(e) => setManualForm(f => ({...f, birthDate: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Alamat KTP</label>
                                <input type="text" value={manualForm.addressKtp} onChange={(e) => setManualForm(f => ({...f, addressKtp: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Kendaraan</label>
                                <select value={manualForm.vehicleType} onChange={(e) => setManualForm(f => ({...f, vehicleType: e.target.value}))} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-200 focus:border-brand-300 bg-white">
                                    <option value="motor">Motor</option>
                                    <option value="mobil_pickup">Mobil Pickup</option>
                                    <option value="gerobak">Gerobak</option>
                                    <option value="sepeda">Sepeda</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1">Plat Nomor</label>
                                <input type="text" value={manualForm.vehiclePlate} onChange={(e) => setManualForm(f => ({...f, vehiclePlate: e.target.value.toUpperCase()}))} placeholder="DD 1234 XX" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-200 focus:border-brand-300" />
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-700">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>Pendaftar offline akan masuk sebagai <b>"Menunggu Review"</b>. Anda dapat langsung menyetujui setelah disimpan.</p>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowManualModal(false)} className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                                Batal
                            </button>
                            <button
                                onClick={handleManualRegister}
                                disabled={manualSubmitting}
                                className="flex-1 py-3 text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-xl transition flex items-center justify-center gap-2"
                            >
                                {manualSubmitting ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</> : <><Plus className="w-4 h-4" /> Simpan Pendaftaran</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// APPLICATION CARD COMPONENT
// ═══════════════════════════════════════════════════════════════
function ApplicationCard({
    app, isExpanded, onToggle, onApprove, onRejectOpen, isProcessing,
}: {
    app: CourierApplication;
    isExpanded: boolean;
    onToggle: () => void;
    onApprove: () => void;
    onRejectOpen: () => void;
    isProcessing: boolean;
}) {
    const statusConf = STATUS_CONFIG[app.status];
    const [docUrls, setDocUrls] = useState<{ ktp?: string; sim?: string; selfie?: string }>({});

    useEffect(() => {
        if (isExpanded) {
            (async () => {
                const [ktp, sim, selfie] = await Promise.all([
                    getSignedUrl(app.ktp_photo_url),
                    app.sim_photo_url ? getSignedUrl(app.sim_photo_url) : null,
                    app.selfie_ktp_url ? getSignedUrl(app.selfie_ktp_url) : null,
                ]);
                setDocUrls({
                    ktp: ktp || undefined,
                    sim: sim || undefined,
                    selfie: selfie || undefined,
                });
            })();
        }
    }, [isExpanded, app.ktp_photo_url, app.sim_photo_url, app.selfie_ktp_url]);

    return (
        <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${isExpanded ? "border-brand-200 shadow-md" : "border-slate-200 hover:border-slate-300"
            }`}>
            {/* Summary Row */}
            <button onClick={onToggle} className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-50/50 transition">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 font-bold text-slate-600 text-sm">
                    {app.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{app.full_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConf.color}`}>
                            {statusConf.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> +{app.phone_number}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {app.preferred_zone}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Truck className="w-3 h-3" /> {VEHICLE_LABELS[app.vehicle_type] || app.vehicle_type}</span>
                    </div>
                </div>
                <span className="text-[10px] text-slate-400 flex-shrink-0 flex flex-col items-end gap-0.5">
                    {new Date(app.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    {app.source && app.source !== "online" && (
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${app.source === "offline" ? "bg-slate-100 text-slate-500" : "bg-green-50 text-green-600"}`}>
                            {app.source === "offline" ? "WALK-IN" : "WA BOT"}
                        </span>
                    )}
                    {app.status === "pending" && app.expires_at && new Date(app.expires_at) < new Date() && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-50 text-red-600 flex items-center gap-0.5">
                            <Timer className="w-2.5 h-2.5" /> KADALUARSA
                        </span>
                    )}
                </span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Expanded Detail */}
            {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-5 animate-in fade-in duration-300">
                    {/* Data Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <DetailField label="NIK" value={app.nik} icon={IdCard} />
                        <DetailField label="Tempat, Tgl Lahir" value={`${app.birth_place}, ${new Date(app.birth_date).toLocaleDateString("id-ID")}`} />
                        <DetailField label="Alamat KTP" value={app.address_ktp} className="col-span-2" />
                        <DetailField label="Kendaraan" value={`${VEHICLE_LABELS[app.vehicle_type] || app.vehicle_type}${app.vehicle_plate ? ` (${app.vehicle_plate})` : ""}`} icon={Truck} />
                        <DetailField label="Zona" value={app.preferred_zone} icon={MapPin} />
                    </div>

                    {/* Document Preview */}
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dokumen</p>
                        <div className="grid grid-cols-3 gap-3">
                            <DocPreview label="KTP" url={docUrls.ktp} />
                            <DocPreview label="SIM" url={docUrls.sim} optional />
                            <DocPreview label="Selfie + KTP" url={docUrls.selfie} />
                        </div>
                    </div>

                    {/* Rejection reason (if rejected) */}
                    {app.status === "rejected" && app.reject_reason && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-red-700">Alasan Penolakan:</p>
                                <p className="text-sm text-red-600">{app.reject_reason}</p>
                            </div>
                        </div>
                    )}

                    {/* Approved info */}
                    {app.status === "approved" && app.courier_id_code && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-emerald-700">Kurir Aktif</p>
                                <p className="text-sm text-emerald-600">ID: {app.courier_id_code}</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons (only for pending) */}
                    {app.status === "pending" && (
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onApprove}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition active:scale-[0.98]"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {isProcessing ? "Memproses..." : "Setujui Kurir"}
                            </button>
                            <button
                                onClick={onRejectOpen}
                                disabled={isProcessing}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 font-bold text-sm rounded-xl border border-red-200 transition active:scale-[0.98]"
                            >
                                <XCircle className="w-4 h-4" />
                                Tolak
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sub-Components ───────────────────────────────────────────

function DetailField({ label, value, icon: Icon, className = "" }: {
    label: string; value: string; icon?: React.ComponentType<{ className?: string }>; className?: string;
}) {
    return (
        <div className={className}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                {Icon && <Icon className="w-3 h-3" />} {label}
            </p>
            <p className="text-sm text-slate-800">{value}</p>
        </div>
    );
}

function DocPreview({ label, url, optional }: { label: string; url?: string; optional?: boolean }) {
    if (!url && optional) {
        return (
            <div className="aspect-[3/2] rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                <p className="text-[10px] text-slate-400">Tidak diunggah</p>
            </div>
        );
    }
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-[3/2] rounded-xl overflow-hidden border border-slate-200 hover:shadow-md transition group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                </a>
            ) : (
                <div className="aspect-[3/2] rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center animate-pulse">
                    <p className="text-[10px] text-slate-400">Memuat...</p>
                </div>
            )}
        </div>
    );
}

function RejectModal({ app, reason, onReasonChange, onConfirm, onCancel, isProcessing }: {
    app: CourierApplication;
    reason: string;
    onReasonChange: (v: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing: boolean;
}) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Tolak Lamaran</h3>
                        <p className="text-sm text-slate-500">{app.full_name}</p>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Alasan Penolakan *</label>
                    <textarea
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder="Contoh: Foto KTP tidak jelas, NIK tidak valid, dll."
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition"
                    />
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!reason.trim() || isProcessing}
                        className="flex-1 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-400 disabled:opacity-50 rounded-xl transition active:scale-[0.98]"
                    >
                        {isProcessing ? "Memproses..." : "Konfirmasi Tolak"}
                    </button>
                </div>
            </div>
        </div>
    );
}
