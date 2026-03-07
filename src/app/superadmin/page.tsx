"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Building2, Users, Bot, Shield } from "lucide-react";
import Link from "next/link";

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({ districts: 0, govUsers: 0, adminUsers: 0, totalUsers: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            const { count: districtCount } = await supabase.from("districts").select("*", { count: "exact", head: true });
            const { count: govCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "gov");
            const { count: adminCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "admin");
            const { count: totalCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
            setStats({
                districts: districtCount || 0,
                govUsers: govCount || 0,
                adminUsers: adminCount || 0,
                totalUsers: totalCount || 0,
            });
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Super Admin</h1>
                <p className="text-sm text-slate-400 mt-1">Ringkasan seluruh sistem EcoSistem Digital</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Distrik", value: stats.districts, icon: Building2, color: "text-brand-400 bg-brand-500/10 border-brand-500/20" },
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

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Aksi Cepat</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/superadmin/districts" className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-brand-500/30 transition-all group">
                        <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                            <Building2 className="h-5 w-5 text-brand-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white group-hover:text-brand-400 transition-colors">Daftarkan Distrik Baru</p>
                            <p className="text-xs text-slate-500">Buat akun Gov + Operator satu paket</p>
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
