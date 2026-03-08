"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowRight, Leaf } from "lucide-react";

export default function PortalLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check if already logged in → redirect by role
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                redirectByRole(session.user.id);
            }
        });
    }, []);

    const redirectByRole = async (userId: string) => {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .single();

        if (profile) {
            switch (profile.role) {
                case "superadmin":
                    router.push("/superadmin");
                    break;
                case "admin":
                    router.push("/admin");
                    break;
                case "gov":
                    router.push("/gov");
                    break;
                default:
                    setError("Akun Anda tidak memiliki akses ke portal ini.");
            }
        }
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError("Masukkan email dan kata sandi.");
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
            await redirectByRole(data.user.id);
        }
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleLogin();
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-slate-900 relative overflow-hidden flex items-center justify-center">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                    backgroundSize: "40px 40px"
                }} />
            </div>

            {/* Subtle Color Orbs */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-6">
                <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4">
                            <Shield className="h-8 w-8 text-brand-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Portal Akses Internal</h1>
                        <p className="text-sm text-slate-400 mt-2">Masuk dengan akun yang telah terdaftar oleh sistem.</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-4" onKeyDown={handleKeyDown}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                id="portal-email"
                                name="email"
                                autoComplete="email"
                                placeholder="admin@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 bg-slate-900/50 rounded-xl border border-slate-600/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kata Sandi</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="portal-password"
                                    name="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 pr-12 py-3.5 bg-slate-900/50 rounded-xl border border-slate-600/50 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-400 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] mt-2"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Memverifikasi...
                                </span>
                            ) : (
                                <>Masuk ke Portal <ArrowRight className="h-4 w-4" /></>
                            )}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-500">
                            <Leaf className="h-4 w-4" />
                            <span className="text-xs font-medium">Beres | Benahi Residu Sampah • Akses Terbatas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
