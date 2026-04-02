"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Building2, Users, Bot, Shield, Scale, Recycle, ShoppingBag, Banknote, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useSuperAdminTheme, t } from "@/components/superadmin/ThemeProvider";

export default function SuperAdminDashboard() {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    const [stats, setStats] = useState({
        bankSampah: 0, govUsers: 0, adminUsers: 0, totalUsers: 0,
        globalInboundKg: 0, globalProductionKg: 0,
        totalSalesRevenue: 0, totalSalesPaid: 0, totalSalesUnpaid: 0, totalSalesWeight: 0,
        totalSalesCount: 0,
    });
    const [topSales, setTopSales] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const { count: unitCount } = await supabase.from("bank_sampah_units").select("*", { count: "exact", head: true });
            const { data: profiles } = await supabase.from("profiles").select("role");

            // Inbound tonnage (all transactions)
            const { data: txData } = await supabase.from("transactions").select("weight_organic, weight_inorganic");
            const globalInbound = txData?.reduce((a, t) => a + (Number(t.weight_organic) || 0) + (Number(t.weight_inorganic) || 0), 0) || 0;

            // Production output (all inventory_outputs)
            const { data: prodData } = await supabase.from("inventory_outputs").select("weight_kg");
            const globalProduction = prodData?.reduce((a, p) => a + (Number(p.weight_kg) || 0), 0) || 0;

            // Sales data (all product_sales from all units)
            const { data: salesData } = await supabase
                .from("product_sales")
                .select("total_price, payment_status, weight_kg, product_name, buyer_company, bank_sampah_id, sold_at")
                .order("sold_at", { ascending: false })
                .limit(200);

            const totalRev = salesData?.reduce((a, s) => a + (Number(s.total_price) || 0), 0) || 0;
            const totalPaid = salesData?.filter(s => s.payment_status === 'paid').reduce((a, s) => a + (Number(s.total_price) || 0), 0) || 0;
            const totalUnpaid = totalRev - totalPaid;
            const totalSalesWeight = salesData?.reduce((a, s) => a + (Number(s.weight_kg) || 0), 0) || 0;

            setStats({
                bankSampah: unitCount || 0,
                govUsers: profiles?.filter(p => p.role === "gov").length || 0,
                adminUsers: profiles?.filter(p => p.role === "admin").length || 0,
                totalUsers: profiles?.filter(p => p.role === "user").length || 0,
                globalInboundKg: globalInbound,
                globalProductionKg: globalProduction,
                totalSalesRevenue: totalRev,
                totalSalesPaid: totalPaid,
                totalSalesUnpaid: totalUnpaid,
                totalSalesWeight: totalSalesWeight,
                totalSalesCount: salesData?.length || 0,
            });

            // Fetch recent sales with unit names for monitoring table
            if (salesData && salesData.length > 0) {
                const unitIds = [...new Set(salesData.map(s => s.bank_sampah_id))];
                const { data: units } = await supabase.from("bank_sampah_units").select("id, name").in("id", unitIds);
                const unitMap: Record<string, string> = {};
                units?.forEach(u => { unitMap[u.id] = u.name; });

                setTopSales(salesData.slice(0, 10).map(s => ({
                    ...s,
                    unit_name: unitMap[s.bank_sampah_id] || "—",
                })));
            }
        };
        fetchStats();
    }, []);

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

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

            {/* Analytics - Inbound / Production / Sales */}
            <div className={`${tk.cardBg} border rounded-2xl p-6 transition-colors duration-300`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className={`text-lg font-extrabold ${tk.textHeading}`}>Makro Analitik & Reporting</h2>
                        <p className={`text-xs ${tk.textMuted} mt-1`}>Status volume sampah masuk, produksi keluar, dan penjualan produk</p>
                    </div>
                    <span className={`px-3 py-1 ${tk.badgeBrand} border rounded-full text-[10px] font-bold uppercase tracking-wider`}>Live Data</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-xl border ${tk.cardInner} flex items-start gap-4 transition-colors duration-300`}>
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
                            <Scale className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-bold ${tk.textPrimary} mb-1`}>Global Inbound</p>
                            <p className={`text-xs ${tk.textMuted} mb-2`}>Total sampah mentah masuk</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black ${tk.textPrimary}`}>{stats.globalInboundKg.toFixed(1)}</span>
                                <span className={`text-xs font-bold ${tk.textMuted}`}>Kg</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border ${tk.cardInner} flex items-start gap-4 transition-colors duration-300`}>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500">
                            <Recycle className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-bold ${tk.textPrimary} mb-1`}>Global Production</p>
                            <p className={`text-xs ${tk.textMuted} mb-2`}>Produksi olahan semua unit</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-2xl font-black ${tk.textPrimary}`}>{stats.globalProductionKg.toFixed(1)}</span>
                                <span className={`text-xs font-bold ${tk.textMuted}`}>Kg</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border ${tk.cardInner} flex items-start gap-4 transition-colors duration-300`}>
                        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-500">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-bold ${tk.textPrimary} mb-1`}>Total Penjualan</p>
                            <p className={`text-xs ${tk.textMuted} mb-2`}>Revenue seluruh unit</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-black ${tk.textPrimary}`}>{formatRp(stats.totalSalesRevenue)}</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border ${tk.cardInner} flex items-start gap-4 transition-colors duration-300`}>
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-bold ${tk.textPrimary} mb-1`}>Piutang Dagang</p>
                            <p className={`text-xs ${tk.textMuted} mb-2`}>Belum dibayar buyer</p>
                            <div className="flex items-baseline gap-1">
                                <span className={`text-xl font-black text-amber-500`}>{formatRp(stats.totalSalesUnpaid)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sales Monitor */}
            {topSales.length > 0 && (
                <div className={`${tk.cardBg} border rounded-2xl p-6 transition-colors duration-300`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-lg font-extrabold ${tk.textHeading} flex items-center gap-2`}>
                            <ShoppingBag className="h-5 w-5 text-brand-500" /> Monitor Penjualan Terbaru
                        </h2>
                        <span className={`text-[10px] ${tk.textMuted} font-bold`}>{stats.totalSalesCount} total transaksi</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${tk.textMuted}`}>
                                    <th className="py-3 px-3">Tanggal</th>
                                    <th className="py-3 px-3">Unit Bank Sampah</th>
                                    <th className="py-3 px-3">Produk</th>
                                    <th className="py-3 px-3">Buyer</th>
                                    <th className="py-3 px-3 text-right">Berat</th>
                                    <th className="py-3 px-3 text-right">Nilai</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y text-sm ${tk.textPrimary}`}>
                                {topSales.map((sale, i) => (
                                    <tr key={i} className="hover:opacity-80 transition">
                                        <td className="py-2.5 px-3 text-xs">{new Date(sale.sold_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                                        <td className="py-2.5 px-3 text-xs font-bold capitalize">{sale.unit_name}</td>
                                        <td className="py-2.5 px-3 text-xs font-medium">{sale.product_name}</td>
                                        <td className="py-2.5 px-3 text-xs">{sale.buyer_company || "—"}</td>
                                        <td className="py-2.5 px-3 text-xs text-right font-bold">{sale.weight_kg} Kg</td>
                                        <td className="py-2.5 px-3 text-xs text-right font-bold text-brand-500">{formatRp(Number(sale.total_price))}</td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${
                                                sale.payment_status === 'paid'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                                {sale.payment_status === 'paid' ? <><CheckCircle2 className="w-2.5 h-2.5" /> Lunas</> : <><Clock className="w-2.5 h-2.5" /> Pending</>}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

