"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter } from "next/navigation";
import {
    Leaf, ArrowRight, ArrowLeft, CheckCircle2, Phone, User, MapPin,
    Truck, Camera, Upload, FileText, Shield, AlertCircle, IdCard,
    Calendar, Home, Bike, Car, X, Eye, EyeOff
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
type Step = "welcome" | "auth" | "personal" | "vehicle" | "documents" | "confirm" | "submitted";

interface FormData {
    // Auth
    email: string;
    password: string;
    confirmPassword: string;
    // Personal
    fullName: string;
    nik: string;
    birthPlace: string;
    birthDate: string;
    addressKtp: string;
    phone: string;
    // Vehicle
    vehicleType: "motor" | "mobil_pickup" | "gerobak" | "sepeda" | "";
    vehiclePlate: string;
    // Zone
    preferredZone: string;
}

interface UploadedDocs {
    ktpPhoto: File | null;
    simPhoto: File | null;
    selfieKtp: File | null;
}

const VEHICLE_OPTIONS = [
    { value: "motor", label: "Motor", icon: Bike, desc: "Sepeda motor roda 2" },
    { value: "mobil_pickup", label: "Mobil Pickup", icon: Car, desc: "Mobil bak terbuka" },
    { value: "gerobak", label: "Gerobak", icon: Truck, desc: "Gerobak dorong/tarik" },
    { value: "sepeda", label: "Sepeda", icon: Bike, desc: "Sepeda kayuh + bak" },
];

const ZONE_OPTIONS = [
    "Kec. Tanete Riattang",
    "Kec. Tanete Riattang Barat",
    "Kec. Tanete Riattang Timur",
    "Kec. Barebbo",
    "Kec. Cina",
    "Kec. Palakka",
    "Kec. Awangpone",
    "Kec. Tellu Siattinge",
    "Lainnya",
];

// ─── Helpers ──────────────────────────────────────────────────
const formatPhone = (raw: string): string => {
    const d = raw.replace(/\D/g, "");
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)}`;
};

const stripPhone = (f: string): string => f.replace(/\D/g, "");

// ─── Step Indicator ───────────────────────────────────────────
function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
    return (
        <div className="flex items-center gap-1 w-full">
            {steps.map((label, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className={`h-1.5 w-full rounded-full transition-all duration-500 ${i < current
                            ? "bg-brand-500"
                            : i === current
                                ? "bg-brand-400 animate-pulse"
                                : "bg-slate-200"
                            }`}
                    />
                    <span className={`text-[9px] font-medium tracking-wide ${i <= current ? "text-brand-600" : "text-slate-400"
                        }`}>
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── File Upload Card ─────────────────────────────────────────
function FileUploadCard({ label, description, file, onFileChange, required, icon: Icon }: {
    label: string;
    description: string;
    file: File | null;
    onFileChange: (f: File | null) => void;
    required?: boolean;
    icon: React.ComponentType<{ className?: string }>;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreview(null);
    }, [file]);

    return (
        <div
            onClick={() => !file && inputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-4 cursor-pointer transition-all
                ${file
                    ? "border-brand-300 bg-brand-50/50"
                    : "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
                }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    onFileChange(f);
                }}
            />
            {file && preview ? (
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-brand-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt={label} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-700 truncate">{file.name}</p>
                        <p className="text-xs text-brand-500">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition"
                    >
                        <X className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">
                            {label} {required && <span className="text-red-400">*</span>}
                        </p>
                        <p className="text-xs text-slate-400">{description}</p>
                    </div>
                    <Upload className="w-5 h-5 text-slate-300 ml-auto" />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function CourierRegistrationForm() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>("welcome");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [userId, setUserId] = useState<string | null>(null);

    const [form, setForm] = useState<FormData>({
        email: "", password: "", confirmPassword: "",
        fullName: "", nik: "", birthPlace: "", birthDate: "", addressKtp: "", phone: "",
        vehicleType: "", vehiclePlate: "",
        preferredZone: "",
    });

    const [docs, setDocs] = useState<UploadedDocs>({
        ktpPhoto: null, simPhoto: null, selfieKtp: null,
    });

    useEffect(() => {
        setMounted(true);
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUserId(session.user.id);
                // Pre-fill from profile if exists
                supabase.from("profiles").select("full_name, phone_number, address").eq("id", session.user.id).single()
                    .then(({ data }) => {
                        if (data) {
                            setForm((prev) => ({
                                ...prev,
                                fullName: data.full_name || prev.fullName,
                                phone: data.phone_number || prev.phone,
                                addressKtp: data.address || prev.addressKtp,
                            }));
                        }
                    });
            }
        });
    }, []);

    const updateForm = (key: keyof FormData, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setError("");
    };

    const stepIndex = ["auth", "personal", "vehicle", "documents", "confirm"].indexOf(step);
    const stepLabels = ["Akun", "Data Diri", "Kendaraan", "Dokumen", "Konfirmasi"];

    // ─── Auth Step Handler ────────────────────────────────────
    const handleAuth = async () => {
        let loginEmail = form.email.trim();
        if (!loginEmail) {
            setError("Masukkan Nomor WhatsApp atau Email.");
            return;
        }
        if (!form.password.trim()) {
            setError("Masukkan kata sandi.");
            return;
        }

        if (form.confirmPassword && form.password !== form.confirmPassword) {
            setError("Kata sandi dan konfirmasinya tidak cocok.");
            return;
        }

        // Auto-detect if input is a phone number (no @ symbol)
        if (!loginEmail.includes("@")) {
            let parsed = loginEmail.replace(/\D/g, "");
            if (parsed.startsWith("0")) parsed = "62" + parsed.slice(1);
            if (!parsed.startsWith("62")) parsed = "62" + parsed;
            loginEmail = `wa_${parsed}@ecosistemdigital.id`;
        }

        setIsLoading(true);
        setError("");

        // Try sign in first
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: form.password,
        });

        if (signInData?.user) {
            // Check if already applied
            const { data: existing } = await supabase
                .from("courier_applications")
                .select("status")
                .eq("user_id", signInData.user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (existing && existing.status === "pending") {
                setError("Anda sudah mengirim lamaran kurir. Tunggu peninjauan dari admin.");
                setIsLoading(false);
                return;
            }
            if (existing && existing.status === "approved") {
                setError("Anda sudah menjadi kurir aktif! Silakan login di Dashboard Kurir.");
                setIsLoading(false);
                return;
            }

            setUserId(signInData.user.id);
            // Pre-fill profile data
            const { data: profile } = await supabase.from("profiles").select("full_name, phone_number, address").eq("id", signInData.user.id).single();
            if (profile) {
                setForm((prev) => ({
                    ...prev,
                    fullName: profile.full_name || prev.fullName,
                    phone: profile.phone_number || prev.phone,
                    addressKtp: profile.address || prev.addressKtp,
                }));
            }
            setIsLoading(false);
            setStep("personal");
            return;
        }

        // If sign-in failed, try sign up
        if (signInErr) {
            if (!form.confirmPassword) {
                setError("Nomor belum terdaftar atau Sandi salah. Jika ingin mendaftar, isi Konfirmasi Sandi lalu klik Lanjutkan.");
                setIsLoading(false);
                return;
            }

            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
                email: loginEmail,
                password: form.password,
                options: {
                    data: { full_name: form.fullName || "Calon Kurir" },
                },
            });
            if (signUpErr) {
                if (signUpErr.message.includes("already registered")) {
                    setError("Nomor WA/Email sudah terdaftar dengan sandi berbeda, atau terdaftar via Bot WA.");
                } else {
                    setError(signUpErr.message);
                }
                setIsLoading(false);
                return;
            }
            if (signUpData?.user) {
                setUserId(signUpData.user.id);
                // Extract original phone if it was a WA
                let originalPhone = "";
                if (!form.email.includes("@")) {
                    let p = form.email.replace(/\D/g, "");
                    if (p.startsWith("0")) p = "62" + p.slice(1);
                    if (!p.startsWith("62")) p = "62" + p;
                    originalPhone = p;
                }

                await supabase.from("profiles").upsert({
                    id: signUpData.user.id,
                    full_name: form.fullName || "Calon Kurir",
                    phone_number: originalPhone,
                    role: "user",
                });
                setIsLoading(false);
                setStep("personal");
                return;
            }
        }
        setIsLoading(false);
    };

    // ─── Upload single file ──────────────────────────────────
    const uploadFile = async (file: File, folder: string): Promise<string> => {
        const ext = file.name.split(".").pop();
        const filePath = `${userId}/${folder}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
            .from("courier-documents")
            .upload(filePath, file, { upsert: true });
        if (uploadErr) throw new Error(`Upload gagal: ${uploadErr.message}`);
        return filePath;
    };

    // ─── Final Submit ─────────────────────────────────────────
    const handleSubmit = async () => {
        if (!userId) { setError("Sesi login tidak valid. Silakan ulangi."); return; }
        if (!docs.ktpPhoto || !docs.selfieKtp) { setError("Foto KTP dan Selfie+KTP wajib diunggah."); return; }

        setIsLoading(true);
        setError("");

        try {
            // Upload documents
            const ktpUrl = await uploadFile(docs.ktpPhoto, "ktp");
            const selfieUrl = await uploadFile(docs.selfieKtp, "selfie_ktp");
            let simUrl: string | null = null;
            if (docs.simPhoto) {
                simUrl = await uploadFile(docs.simPhoto, "sim");
            }

            // Insert application
            const { error: insertErr } = await supabase.from("courier_applications").insert({
                user_id: userId,
                nik: form.nik,
                full_name: form.fullName,
                birth_place: form.birthPlace,
                birth_date: form.birthDate,
                address_ktp: form.addressKtp,
                phone_number: `62${stripPhone(form.phone)}`,
                vehicle_type: form.vehicleType,
                vehicle_plate: form.vehiclePlate || null,
                preferred_zone: form.preferredZone,
                ktp_photo_url: ktpUrl,
                sim_photo_url: simUrl,
                selfie_ktp_url: selfieUrl,
                status: "pending",
            });

            if (insertErr) throw new Error(insertErr.message);

            // Update profile courier_status
            await supabase.from("profiles").update({
                courier_status: "pending_approval",
                phone_number: `62${stripPhone(form.phone)}`,
                full_name: form.fullName,
                address: form.addressKtp,
            }).eq("id", userId);

            setStep("submitted");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
        }
        setIsLoading(false);
    };

    // ─── Validation per step ─────────────────────────────────
    const canProceed = (): boolean => {
        switch (step) {
            case "personal":
                return !!(form.fullName && form.nik && form.nik.length === 16 && form.birthPlace && form.birthDate && form.addressKtp && form.phone);
            case "vehicle":
                return !!(form.vehicleType && form.preferredZone);
            case "documents":
                return !!(docs.ktpPhoto && docs.selfieKtp);
            default:
                return true;
        }
    };

    const goNext = () => {
        setError("");
        const order: Step[] = ["auth", "personal", "vehicle", "documents", "confirm"];
        const idx = order.indexOf(step);
        if (idx < order.length - 1) setStep(order[idx + 1]);
    };

    const goBack = () => {
        setError("");
        const order: Step[] = ["auth", "personal", "vehicle", "documents", "confirm"];
        const idx = order.indexOf(step);
        if (idx > 0) setStep(order[idx - 1]);
    };

    if (!mounted) return null;

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
                <div className="absolute bottom-20 -left-20 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-brand-400/5 blur-2xl animate-pulse" />
            </div>

            <div className="relative z-10 max-w-md mx-auto px-5 py-6 min-h-screen flex flex-col">

                {/* Header */}
                <header className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-brand-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Pendaftaran</p>
                            <p className="text-[11px] text-slate-500">Kurir Pahlawan Lingkungan</p>
                        </div>
                    </div>
                    {step !== "welcome" && step !== "submitted" && (
                        <button
                            onClick={() => step === "auth" ? setStep("welcome") : goBack()}
                            className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition"
                        >
                            <ArrowLeft className="h-4 w-4 text-slate-400" />
                        </button>
                    )}
                </header>

                {/* Step Indicator */}
                {stepIndex >= 0 && step !== "submitted" && (
                    <div className="mb-6">
                        <StepIndicator current={stepIndex} steps={stepLabels} />
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                {/* Main Content */}
                <main className="flex-1 flex flex-col">

                    {/* ── WELCOME ────────────────────────────── */}
                    {step === "welcome" && (
                        <div className="flex-1 flex flex-col justify-center space-y-8 animate-in fade-in duration-500">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
                                    <Shield className="h-3.5 w-3.5" />
                                    Rekrutmen Resmi
                                </div>
                                <h1 className="text-3xl font-extrabold text-white leading-tight">
                                    Bergabunglah Jadi{" "}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">
                                        Kurir BERES
                                    </span>
                                </h1>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Jadi pahlawan lingkungan dengan mengambil sampah di rumah warga.
                                    Dapatkan penghasilan, jadi lebih sehat, dan selamatkan bumi.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { icon: Truck, title: "Kerja Fleksibel", desc: "Atur jadwal dan area kerja Anda sendiri" },
                                    { icon: MapPin, title: "Notifikasi Jemputan", desc: "Order masuk langsung ke WhatsApp Anda" },
                                    { icon: Leaf, title: "Dampak Nyata", desc: "Setiap kg sampah = kontribusi untuk bumi" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
                                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                                            <item.icon className="h-5 w-5 text-brand-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{item.title}</p>
                                            <p className="text-xs text-slate-500">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep(userId ? "personal" : "auth")}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                            >
                                Mulai Daftar Kurir <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* ── AUTH STEP ──────────────────────────── */}
                    {step === "auth" && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-white">Buat Akun Terlebih Dahulu</h2>
                                <p className="text-sm text-slate-400 mt-1">Masuk atau daftar dengan Nomor WhatsApp.</p>
                            </div>
                            <div className="space-y-4">
                                <InputField label="Nomor WhatsApp (atau Email)" value={form.email} onChange={(v) => updateForm("email", v)} placeholder="08123456789" type="text" />
                                <InputField label="Kata Sandi" value={form.password} onChange={(v) => updateForm("password", v)} placeholder="Min. 6 karakter" type="password" />
                                <InputField label="Konfirmasi Kata Sandi" value={form.confirmPassword} onChange={(v) => updateForm("confirmPassword", v)} placeholder="Ulangi kata sandi" type="password" />
                            </div>
                            <button
                                onClick={handleAuth}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                            >
                                {isLoading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Lanjutkan <ArrowRight className="h-4 w-4" /></>}
                            </button>
                        </div>
                    )}

                    {/* ── PERSONAL DATA ──────────────────────── */}
                    {step === "personal" && (
                        <div className="space-y-5 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-white">Data Diri Sesuai KTP</h2>
                                <p className="text-sm text-slate-400 mt-1">Pastikan data sesuai KTP untuk verifikasi.</p>
                            </div>
                            <div className="space-y-4">
                                <InputField label="Nama Lengkap" icon={User} value={form.fullName} onChange={(v) => updateForm("fullName", v)} placeholder="Sesuai KTP" />
                                <InputField label="NIK (16 digit)" icon={IdCard} value={form.nik} onChange={(v) => { if (/^\d{0,16}$/.test(v)) updateForm("nik", v); }} placeholder="3573XXXXXXXXXXXX" maxLength={16} />
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Tempat Lahir" icon={MapPin} value={form.birthPlace} onChange={(v) => updateForm("birthPlace", v)} placeholder="Kota" />
                                    <InputField label="Tanggal Lahir" icon={Calendar} value={form.birthDate} onChange={(v) => updateForm("birthDate", v)} type="date" />
                                </div>
                                <InputField label="Alamat Lengkap (KTP)" icon={Home} value={form.addressKtp} onChange={(v) => updateForm("addressKtp", v)} placeholder="Jl. ..." multiline />
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                        <Phone className="h-3.5 w-3.5" /> Nomor WhatsApp
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">+62</span>
                                        <input
                                            type="tel"
                                            value={formatPhone(form.phone)}
                                            onChange={(e) => { const r = stripPhone(e.target.value); if (r.length <= 12) updateForm("phone", r); }}
                                            placeholder="812 3456 7890"
                                            className="w-full pl-14 pr-4 py-3.5 bg-slate-800 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                            <NavButtons canProceed={canProceed()} onNext={goNext} onBack={goBack} />
                        </div>
                    )}

                    {/* ── VEHICLE DATA ───────────────────────── */}
                    {step === "vehicle" && (
                        <div className="space-y-5 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-white">Data Kendaraan & Zona</h2>
                                <p className="text-sm text-slate-400 mt-1">Pilih kendaraan dan area operasional Anda.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Jenis Kendaraan *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {VEHICLE_OPTIONS.map((v) => (
                                            <button
                                                key={v.value}
                                                onClick={() => updateForm("vehicleType", v.value)}
                                                className={`p-3 rounded-xl border text-left transition-all
                                                    ${form.vehicleType === v.value
                                                        ? "bg-brand-500/10 border-brand-500/50 ring-1 ring-brand-500/20"
                                                        : "bg-slate-800 border-slate-700 hover:border-slate-600"
                                                    }`}
                                            >
                                                <v.icon className={`h-5 w-5 mb-1 ${form.vehicleType === v.value ? "text-brand-400" : "text-slate-500"}`} />
                                                <p className={`text-sm font-semibold ${form.vehicleType === v.value ? "text-brand-300" : "text-white"}`}>{v.label}</p>
                                                <p className="text-[10px] text-slate-500">{v.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(form.vehicleType === "motor" || form.vehicleType === "mobil_pickup") && (
                                    <InputField label="Plat Nomor Kendaraan" icon={FileText} value={form.vehiclePlate} onChange={(v) => updateForm("vehiclePlate", v.toUpperCase())} placeholder="DD 1234 AB" />
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Zona Operasional *</label>
                                    <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                                        {ZONE_OPTIONS.map((z) => (
                                            <button
                                                key={z}
                                                onClick={() => updateForm("preferredZone", z)}
                                                className={`px-4 py-2.5 rounded-xl border text-left text-sm transition-all
                                                    ${form.preferredZone === z
                                                        ? "bg-brand-500/10 border-brand-500/50 text-brand-300 font-semibold"
                                                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                                    }`}
                                            >
                                                {z}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <NavButtons canProceed={canProceed()} onNext={goNext} onBack={goBack} />
                        </div>
                    )}

                    {/* ── DOCUMENTS UPLOAD ───────────────────── */}
                    {step === "documents" && (
                        <div className="space-y-5 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-white">Unggah Dokumen</h2>
                                <p className="text-sm text-slate-400 mt-1">Foto harus jelas dan tidak terpotong.</p>
                            </div>

                            <div className="space-y-3">
                                <FileUploadCard
                                    label="Foto KTP"
                                    description="JPG/PNG, maks 5 MB"
                                    file={docs.ktpPhoto}
                                    onFileChange={(f) => setDocs((p) => ({ ...p, ktpPhoto: f }))}
                                    required
                                    icon={IdCard}
                                />
                                <FileUploadCard
                                    label="Foto SIM"
                                    description="Opsional, untuk motor/mobil"
                                    file={docs.simPhoto}
                                    onFileChange={(f) => setDocs((p) => ({ ...p, simPhoto: f }))}
                                    icon={FileText}
                                />
                                <FileUploadCard
                                    label="Selfie dengan KTP"
                                    description="Foto wajah Anda sambil memegang KTP"
                                    file={docs.selfieKtp}
                                    onFileChange={(f) => setDocs((p) => ({ ...p, selfieKtp: f }))}
                                    required
                                    icon={Camera}
                                />
                            </div>

                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-amber-300/80">
                                    Pastikan foto KTP & selfie jelas. Data Anda dilindungi dan hanya digunakan untuk verifikasi admin.
                                </p>
                            </div>

                            <NavButtons canProceed={canProceed()} onNext={goNext} onBack={goBack} />
                        </div>
                    )}

                    {/* ── CONFIRMATION ───────────────────────── */}
                    {step === "confirm" && (
                        <div className="space-y-5 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-xl font-bold text-white">Konfirmasi Data</h2>
                                <p className="text-sm text-slate-400 mt-1">Periksa kembali semua data Anda.</p>
                            </div>

                            <div className="space-y-3">
                                <ConfirmSection title="Data Diri" items={[
                                    ["Nama", form.fullName],
                                    ["NIK", form.nik],
                                    ["TTL", `${form.birthPlace}, ${form.birthDate}`],
                                    ["Alamat", form.addressKtp],
                                    ["WhatsApp", `+62${form.phone}`],
                                ]} />
                                <ConfirmSection title="Kendaraan & Zona" items={[
                                    ["Kendaraan", VEHICLE_OPTIONS.find((v) => v.value === form.vehicleType)?.label || "-"],
                                    ["Plat", form.vehiclePlate || "-"],
                                    ["Zona", form.preferredZone],
                                ]} />
                                <ConfirmSection title="Dokumen" items={[
                                    ["KTP", docs.ktpPhoto ? `✅ ${docs.ktpPhoto.name}` : "❌ Belum"],
                                    ["SIM", docs.simPhoto ? `✅ ${docs.simPhoto.name}` : "— Tidak diunggah"],
                                    ["Selfie+KTP", docs.selfieKtp ? `✅ ${docs.selfieKtp.name}` : "❌ Belum"],
                                ]} />
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-500 hover:bg-brand-400 disabled:opacity-60 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                                >
                                    {isLoading ? <Spinner /> : <>Kirim Lamaran <CheckCircle2 className="h-4 w-4" /></>}
                                </button>
                                <button onClick={goBack} className="w-full py-3 text-sm text-slate-500 hover:text-slate-300 transition">
                                    Kembali & Edit
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── SUBMITTED ──────────────────────────── */}
                    {step === "submitted" && (
                        <div className="flex-1 flex flex-col justify-center text-center space-y-6 animate-in fade-in duration-500">
                            <div className="mx-auto w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center">
                                <CheckCircle2 className="h-10 w-10 text-brand-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white">Lamaran Terkirim! 🎉</h2>
                                <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                                    Data Anda sedang diperiksa oleh admin. Anda akan mendapat notifikasi WhatsApp saat lamaran disetujui.
                                </p>
                            </div>
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 text-left space-y-3">
                                <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Proses Selanjutnya</p>
                                {[
                                    "Admin akan memeriksa data dan dokumen Anda",
                                    "Notifikasi WhatsApp akan dikirim saat disetujui",
                                    "Akses Dashboard Kurir untuk mulai menerima order",
                                ].map((text, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <p className="text-sm text-slate-300">{text}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => router.push("/")}
                                className="w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-2xl border border-slate-700 transition active:scale-[0.98]"
                            >
                                Kembali ke Beranda
                            </button>
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="mt-8 pt-4 border-t border-slate-800 text-center">
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                        Data dilindungi enkripsi tingkat pemerintah.<br />
                        © 2026 Aplikasi BERES | Benahi Residu Sampah
                    </p>
                </footer>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function InputField({ label, value, onChange, placeholder, type = "text", icon: Icon, multiline, maxLength }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    icon?: React.ComponentType<{ className?: string }>;
    multiline?: boolean;
    maxLength?: number;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const currentType = isPassword ? (showPassword ? "text" : "password") : type;
    const cls = "w-full px-4 py-3.5 bg-slate-800 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition";
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                {Icon && <Icon className="h-3.5 w-3.5" />} {label}
            </label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={2}
                    className={`${cls} resize-none`}
                />
            ) : (
                <div className="relative">
                    <input
                        type={currentType}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        className={cls + (isPassword ? " pr-12" : "")}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function NavButtons({ canProceed, onNext, onBack }: { canProceed: boolean; onNext: () => void; onBack: () => void }) {
    return (
        <div className="flex gap-3 pt-2">
            <button
                onClick={onBack}
                className="px-6 py-3.5 rounded-2xl border border-slate-700 bg-slate-800 text-slate-300 font-medium text-sm hover:bg-slate-700 transition active:scale-[0.98]"
            >
                <ArrowLeft className="h-4 w-4" />
            </button>
            <button
                onClick={onNext}
                disabled={!canProceed}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
            >
                Lanjutkan <ArrowRight className="h-4 w-4" />
            </button>
        </div>
    );
}

function ConfirmSection({ title, items }: { title: string; items: [string, string][] }) {
    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-brand-400 uppercase tracking-wider">{title}</p>
            {items.map(([key, val], i) => (
                <div key={i} className="flex justify-between items-start gap-4">
                    <span className="text-xs text-slate-500 flex-shrink-0">{key}</span>
                    <span className="text-xs text-slate-200 text-right">{val}</span>
                </div>
            ))}
        </div>
    );
}

function Spinner() {
    return (
        <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Memproses...
        </span>
    );
}
