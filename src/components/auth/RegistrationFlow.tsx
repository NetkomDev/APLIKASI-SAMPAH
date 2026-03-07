"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, ArrowLeft, CheckCircle2, Phone, User, MapPin, Sparkles } from "lucide-react";

// Format phone number for display: 812 3456 7890
const formatPhoneDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
};

// Strip formatting to get raw digits for DB storage
const stripPhoneFormat = (formatted: string): string => {
    return formatted.replace(/\D/g, "");
};

type Step = "welcome" | "form" | "otp" | "success";

export function RegistrationFlow() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("welcome");
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Form data
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        setMounted(true);
        // Check if already logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                handlePostLogin(session.user.id);
            }
        });
    }, []);

    const handlePostLogin = async (userId: string) => {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();

        if (profile) {
            if (profile.role === "admin") router.push("/admin");
            else if (profile.role === "gov") router.push("/gov");
            else setStep("success");
        } else {
            setStep("success");
        }
    };

    const handleSignUp = async () => {
        if (!fullName.trim() || !phone.trim() || !email.trim() || !password.trim()) {
            setError("Lengkapi semua data terlebih dahulu ya.");
            return;
        }
        setIsLoading(true);
        setError("");

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone_number: phone,
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setIsLoading(false);
            return;
        }

        if (data?.user) {
            // Update profile with phone
            await supabase.from("profiles").upsert({
                id: data.user.id,
                full_name: fullName,
                phone_number: phone,
                role: "user",
            });
            setStep("success");
        }
        setIsLoading(false);
    };

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            setError("Masukkan email dan kata sandi Anda.");
            return;
        }
        setIsLoading(true);
        setError("");

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            setError(signInError.message);
            setIsLoading(false);
            return;
        }

        if (data?.user) {
            handlePostLogin(data.user.id);
        }
        setIsLoading(false);
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-emerald-50 relative overflow-hidden">
            {/* Floating Orbs */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-200/30 blur-3xl animate-pulse" />
                <div className="absolute bottom-20 -left-20 w-80 h-80 rounded-full bg-emerald-100/40 blur-3xl" />
                <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full bg-brand-100/20 blur-2xl animate-pulse delay-700" />
            </div>

            {/* Content Container - Mobile First */}
            <div className="relative z-10 max-w-md mx-auto px-6 py-8 min-h-screen flex flex-col">

                {/* Header: Pemda Logo Area */}
                <header className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        {/* Placeholder for Pemda Logo */}
                        <div className="w-11 h-11 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center overflow-hidden">
                            <Leaf className="h-6 w-6 text-brand-500" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider">Pemerintah Kabupaten</p>
                            <p className="text-xs text-slate-500">Dinas Lingkungan Hidup</p>
                        </div>
                    </div>
                    {step !== "welcome" && step !== "success" && (
                        <button
                            onClick={() => setStep("welcome")}
                            className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center hover:bg-slate-50 hover:shadow-lg active:scale-95 transition-all"
                            aria-label="Kembali"
                        >
                            <ArrowLeft className="h-4 w-4 text-slate-600" />
                        </button>
                    )}
                </header>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col justify-center">

                    {/* STEP: Welcome */}
                    {step === "welcome" && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100/60 text-brand-700 text-xs font-semibold">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Program Resmi Pemerintah
                                </div>
                                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
                                    Jadilah <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-emerald-500">
                                        Pahlawan Lingkungan
                                    </span>
                                </h1>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Setor sampah dari rumah, dapatkan uang langsung ke dompet digital Anda.
                                    Cukup daftar sekali, selanjutnya gunakan <strong>WhatsApp</strong> untuk semua kebutuhan.
                                </p>
                            </div>

                            {/* Benefit Cards */}
                            <div className="space-y-3">
                                {[
                                    { icon: Phone, title: "Akses via WhatsApp", desc: "Tidak perlu buka web lagi, semua dari chat WA" },
                                    { icon: MapPin, title: "Jemput di Rumah", desc: "Kurir datang ke lokasi Anda, tanpa repot" },
                                    { icon: Sparkles, title: "Langsung Dapat Saldo", desc: "Uang masuk otomatis setelah sampah divalidasi" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-white shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                            <item.icon className="h-5 w-5 text-brand-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                            <p className="text-xs text-slate-500">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={() => setStep("form")}
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                                >
                                    Mulai Pendaftaran
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setStep("form")}
                                    className="w-full py-3 text-sm text-slate-500 hover:text-brand-600 font-medium transition"
                                >
                                    Sudah punya akun? <span className="text-brand-600 underline underline-offset-2">Masuk di sini</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: Registration Form - Conversational Style */}
                    {step === "form" && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Kenalkan diri Anda 👋</h2>
                                <p className="text-sm text-slate-500 mt-1">Isi data berikut untuk memulai. Tenang, cepat kok.</p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Name Input */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" /> Nama Lengkap
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Budi Santoso"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition shadow-sm"
                                    />
                                </div>

                                {/* Phone Input */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Phone className="h-3.5 w-3.5" /> Nomor WhatsApp
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium select-none">+62</span>
                                        <input
                                            type="tel"
                                            placeholder="812 3456 7890"
                                            value={formatPhoneDisplay(phone)}
                                            onChange={(e) => {
                                                const raw = stripPhoneFormat(e.target.value);
                                                if (raw.length <= 12) setPhone(raw);
                                            }}
                                            className="w-full pl-14 pr-4 py-3.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 tracking-wide placeholder:text-slate-300 placeholder:tracking-wide focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition shadow-sm"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 pl-1">Bot WhatsApp akan menghubungi nomor ini setelah pendaftaran berhasil.</p>
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        placeholder="nama@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition shadow-sm"
                                    />
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kata Sandi</label>
                                    <input
                                        type="password"
                                        placeholder="Minimal 6 karakter"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleSignUp}
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Mendaftarkan...
                                        </span>
                                    ) : (
                                        <>Daftarkan Saya<ArrowRight className="h-4 w-4" /></>
                                    )}
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-slate-100" />
                                    <span className="px-3 text-xs text-slate-400">atau masuk</span>
                                    <div className="flex-grow border-t border-slate-100" />
                                </div>

                                <button
                                    onClick={handleSignIn}
                                    disabled={isLoading}
                                    className="w-full py-3.5 px-6 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-[0.98]"
                                >
                                    Masuk dengan Akun yang Sudah Ada
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP: Success */}
                    {step === "success" && (
                        <div className="text-center space-y-6 animate-in fade-in duration-500">
                            <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center shadow-inner">
                                <CheckCircle2 className="h-10 w-10 text-brand-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-slate-900">Selamat! 🎉</h2>
                                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                                    Akun Anda telah berhasil terdaftar. Dalam beberapa saat, Bot WhatsApp kami akan menghubungi nomor Anda dengan menu layanan lengkap.
                                </p>
                            </div>
                            <div className="bg-white/70 backdrop-blur-sm border border-brand-100 rounded-2xl p-5 text-left space-y-3">
                                <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider">Langkah Selanjutnya</p>
                                <div className="space-y-2">
                                    {[
                                        "Cek WhatsApp Anda untuk pesan sambutan",
                                        "Ketik MENU untuk melihat semua fitur",
                                        "Ketik JEMPUT untuk panggil kurir ke rumah",
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            <p className="text-sm text-slate-700">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => window.location.href = "/"}
                                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                            >
                                Kembali ke Beranda
                            </button>
                        </div>
                    )}
                </main>

                {/* Footer */}
                <footer className="mt-8 pt-6 border-t border-brand-100/30 text-center">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Dilindungi oleh enkripsi data tingkat pemerintah.<br />
                        © 2026 EcoSistem Digital • Pemerintah Kabupaten
                    </p>
                </footer>
            </div>
        </div>
    );
}
