"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Building2, Users, Bot, Shield, Scale, Recycle } from "lucide-react";
import Link from "next/link";
import { useSuperAdminTheme, t } from "@/components/superadmin/ThemeProvider";

export default function SuperAdminDashboard() {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    const [stats, setStats] = useState({ bankSampah: 0, govUsers: 0, adminUsers: 0, totalUsers: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            const { count: unitCount } = await supabase.from("bank_sampah_units").select("*", { count: "exact", head: true });
            const { data: profiles, count: totalCount } = await supabase.from("profiles").select("role", { count: "exact" });
            setStats({
                bankSampah: unitCount || 0,
                govUsers: profiles?.filter(p => p.role === "gov").length || 0,
                adminUsers: profiles?.filter(p => p.role === "admin").length || 0,
                totalUsers: totalCount || 0,
            });
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: "Cabang Bank", value: stats.bankSampah, icon: Building2, gradient: "from-brand-500 to-emerald-600", shadow: "shadow-brand-500/20" },
        { label: "Akun Pemerintah", value: stats.govUsers, icon: Shield, gradient: "from-blue-500 to-indigo-600", shadow: "shadow-blue-500/20" },
        { label: "Akun Operator", value: stats.adminUsers, icon: Users, gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20" },
        { label: "Total Pengguna", value: stats.totalUsers, icon: Users, gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className={`text-xl font-extrabold ${tk.textHeading}`}>SuperAdmin Dashboard</h2>
                <p className={`text-sm ${tk.textSecondary} mt-1`}>Pusat kontrol operasional seluruh cabang Bank Sampah</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white shadow-xl ${s.shadow} relative overflow-hidden hover:-translate-y-0.5 transition-transform`}>
                        <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{s.label}</p>
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm"><s.icon className="h-4 w-4" /></div>
                            </div>
                            <p className="text-3xl font-black">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analytics */}
            <div className={`${tk.cardBg} border rounded-2xl p-6 transition-colors duration-300`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={`text-lg font-extrabold ${tk.textHeading}`}>Makro Analitik & Reporting</h2>
                        <p className={`text-xs ${tk.textMuted} mt-1`}>Status volume sampah masuk & produksi keluar</p>
                    </div>
                    <span className={`px-3 py-1 ${tk.badgeBrand} border rounded-full text-[10px] font-bold uppercase tracking-wider`}>Live Data</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-xl border ${tk.cardInner} flex items-start gap-4 transition-colors duration-300`}>
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                            <Scale className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${tk.textPrimary} mb-1`}>Global Volume Tracker</p>
                            <p className={`text-xs ${tk.textMuted} mb-3`}>Total sampah mentah ditarik hari ini dari semua distrik.</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-black ${tk.textPrimary}`}>0</span>
                                <span className={`text-xs font-bold ${tk.textMuted} uppercase`}>Kg</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border ${tk.cardInner} flex items-start gap-4 transition-colors duration-300`}>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                            <Recycle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${tk.textPrimary} mb-1`}>Global Output/Production</p>
                            <p className={`text-xs ${tk.textMuted} mb-3`}>Akumulasi produk akhir (pupuk, daur ulang) semua Bank Sampah.</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-black ${tk.textPrimary}`}>0</span>
                                <span className={`text-xs font-bold ${tk.textMuted} uppercase`}>Kg</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className={`${tk.cardBg} border rounded-2xl p-6 transition-colors duration-300`}>
                <h2 className={`text-lg font-extrabold ${tk.textHeading} mb-4`}>Aksi Cepat</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/superadmin/bank-sampah-units" className={`flex items-center gap-4 p-4 rounded-xl ${tk.cardInner} border ${tk.hoverCard} transition-all group`}>
                        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-500 group-hover:scale-110 transition-transform">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className={`font-bold ${tk.textPrimary}`}>Kelola Cabang & Entitas</h3>
                            <p className={`text-xs ${tk.textMuted} mt-1`}>Buat akun Pemda dan unit Bank Sampah baru</p>
                        </div>
                    </Link>
                    <Link href="/superadmin/bot-config" className={`flex items-center gap-4 p-4 rounded-xl ${tk.cardInner} border ${tk.hoverCard} transition-all group`}>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className={`font-bold ${tk.textPrimary}`}>Konfigurasi Bot WA</h3>
                            <p className={`text-xs ${tk.textMuted} mt-1`}>Atur menu, template, dan API Fonnte</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
