"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Building2, Users, Bot, Shield, Scale, Recycle } from "lucide-react";
import Link from "next/link";

export default function SuperAdminDashboard() {
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

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-800">SuperAdmin Dashboard (1 Kabupaten)</h2>
                <p className="text-sm text-slate-500">Pusat kontrol operasional seluruh cabang Bank Sampah</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Cabang Bank", value: stats.bankSampah, icon: Building2, color: "text-brand-400 bg-brand-500/10 border-brand-500/20" },
                    { label: "Akun Pemerintah", value: stats.govUsers, icon: Shield, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                    { label: "Akun Operator", value: stats.adminUsers, icon: Users, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                    { label: "Total Pengguna", value: stats.totalUsers, icon: Users, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                            <div className={`p-2 rounded-xl border ${stat.color}`}>
                                <stat.icon className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Makro Analitik & Reporting Murni */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white">Makro Analitik & Reporting Murni</h2>
                        <p className="text-xs text-slate-400 mt-1">Status volume sampah masuk & produksi keluar secara nasional</p>
                    </div>
                    <span className="px-3 py-1 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Live Data
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Global Volume Tracker */}
                    <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30 flex items-start gap-4">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                            <Scale className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white mb-1">Global Volume Tracker</p>
                            <p className="text-xs text-slate-400 mb-3">Total sampah mentah ditarik hari ini dari semua distrik.</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">0</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">Kg</span>
                            </div>
                        </div>
                    </div>

                    {/* Global Output/Production Tracker */}
                    <div className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30 flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                            <Recycle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-white mb-1">Global Output/Production</p>
                            <p className="text-xs text-slate-400 mb-3">Akumulasi produk akhir (pupuk, daur ulang) semua Bank Sampah.</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">0</span>
                                <span className="text-xs font-bold text-slate-500 uppercase">Kg</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/superadmin/bank-sampah-units" className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-brand-500/30 transition-all group">
                        <div className="h-12 w-12 bg-slate-800 rounded-xl flex items-center justify-center text-brand-400 shadow-sm border border-slate-700/50 mb-4 group-hover:scale-110 group-hover:bg-slate-700 transition-all">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-200">Kelola Cabang & Entitas</h3>
                            <p className="text-xs text-slate-400 mt-1">Buat akun untuk Pemda dan unit Bank Sampah baru</p>
                        </div>
                    </Link>
                    <Link href="/superadmin/bot-config" className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-emerald-500/30 transition-all group">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <Bot className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">Konfigurasi Bot WA</p>
                            <p className="text-xs text-slate-500">Atur menu, template, dan API Fonnte</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
