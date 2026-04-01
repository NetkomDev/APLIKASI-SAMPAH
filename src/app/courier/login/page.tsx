"use client";

import { useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter } from "next/navigation";
import { Truck, Phone, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CourierLoginPage() {
    const router = useRouter();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Normalize phone number to generate the synthetic email
            let normalizedPhone = phone.replace(/\D/g, "");
            if (normalizedPhone.startsWith("0")) normalizedPhone = "62" + normalizedPhone.slice(1);
            if (!normalizedPhone.startsWith("62")) normalizedPhone = "62" + normalizedPhone;

            const email = `wa_${normalizedPhone}@ecosistemdigital.id`;

            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInErr) {
                if (signInErr.message.includes("Invalid login credentials")) {
                    setError("Nomor HP atau Password salah. Silakan coba lagi.");
                } else {
                    setError(signInErr.message);
                }
                setLoading(false);
                return;
            }

            // Verify role is courier
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
                if (prof?.role !== "courier") {
                    await supabase.auth.signOut();
                    setError("Akun ini bukan akun kurir. Silakan hubungi Admin Bank Sampah Anda.");
                    setLoading(false);
                    return;
                }
            }

            router.push("/courier");
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back Link */}
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Beranda
                </Link>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
                            <Truck className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Login Kurir</h1>
                        <p className="text-slate-400 text-sm mt-1">Masuk ke Dashboard Mitra Jemput Sampah</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nomor HP (WhatsApp)
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="085694488510"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password dari Admin"
                                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5">
                                Password default: BERES- diikuti 4 digit terakhir NIK Anda
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Masuk Dashboard"
                            )}
                        </button>
                    </form>

                    {/* Help */}
                    <div className="mt-6 text-center text-xs text-slate-500">
                        <p>Belum punya akun kurir?</p>
                        <p>Hubungi Admin Bank Sampah terdekat untuk pendaftaran.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
