"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { Target, Building2, Droplets, Truck, Users, Clock, Bike, Car, TrendingUp, TrendingDown, BarChart3, Wallet, Scale, Package, ArrowUpRight, ShoppingBag, CheckCircle2, Recycle } from 'lucide-react';

export default function GovPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWarga: 0, totalCourier: 0, pendingCourier: 0, totalBankSampah: 0,
        motor: 0, mobil_pickup: 0, gerobak: 0, sepeda: 0,
        tonnageToday: 0, tonnageOrganic: 0, tonnageInorganic: 0,
        totalPayout: 0, pendingWithdrawals: 0, totalTransactions: 0,
        globalProductionKg: 0,
        salesRevenue: 0, salesPaid: 0, salesUnpaid: 0, salesCount: 0,
        tonnageAllTime: 0,
    });

    useEffect(() => { fetchAllStats(); }, []);

    const fetchAllStats = async () => {
        setLoading(true);
        try {
            const { count: wargaCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
            const { data: allCouriers } = await supabase.from('profiles').select('id, vehicle_type').eq('role', 'courier').eq('courier_status', 'active');
            const { count: pendingCount } = await supabase.from('courier_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: bsCount } = await supabase.from('bank_sampah_units').select('*', { count: 'exact', head: true }).eq('is_active', true);

            const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
            const { data: todayTxs } = await supabase.from('transactions').select('weight_organic, weight_inorganic').gte('created_at', startOfDay.toISOString());
            const tonnageOrganic = todayTxs?.reduce((a, t) => a + (t.weight_organic || 0), 0) || 0;
            const tonnageInorganic = todayTxs?.reduce((a, t) => a + (t.weight_inorganic || 0), 0) || 0;

            // All-time inbound tonnage (for efficiency ratio)
            const { data: allTxs } = await supabase.from('transactions').select('weight_organic, weight_inorganic');
            const tonnageAllTime = allTxs?.reduce((a, t) => a + (Number(t.weight_organic) || 0) + (Number(t.weight_inorganic) || 0), 0) || 0;

            const { data: payoutData } = await supabase.from('transactions').select('amount_earned').eq('status', 'completed');
            const totalPayout = payoutData?.reduce((a, t) => a + (t.amount_earned || 0), 0) || 0;

            const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
            const { count: wdCount } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            // Production output
            const { data: prodData } = await supabase.from('inventory_outputs').select('weight_kg');
            const globalProd = prodData?.reduce((a, p) => a + (Number(p.weight_kg) || 0), 0) || 0;

            // Sales monitoring
            const { data: salesData } = await supabase.from('product_sales').select('total_price, payment_status');
            const sRev = salesData?.reduce((a, s) => a + (Number(s.total_price) || 0), 0) || 0;
            const sPaid = salesData?.filter(s => s.payment_status === 'paid').reduce((a, s) => a + (Number(s.total_price) || 0), 0) || 0;

            const couriers = allCouriers || [];
            setStats({
                totalWarga: wargaCount || 0, totalCourier: couriers.length, pendingCourier: pendingCount || 0, totalBankSampah: bsCount || 0,
                motor: couriers.filter(c => c.vehicle_type === 'motor').length,
                mobil_pickup: couriers.filter(c => c.vehicle_type === 'mobil_pickup').length,
                gerobak: couriers.filter(c => c.vehicle_type === 'gerobak').length,
                sepeda: couriers.filter(c => c.vehicle_type === 'sepeda').length,
                tonnageToday: tonnageOrganic + tonnageInorganic, tonnageOrganic, tonnageInorganic,
                totalPayout, pendingWithdrawals: wdCount || 0, totalTransactions: txCount || 0,
                globalProductionKg: globalProd,
                salesRevenue: sRev, salesPaid: sPaid, salesUnpaid: sRev - sPaid, salesCount: salesData?.length || 0,
                tonnageAllTime,
            });
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-sm text-slate-400 font-semibold">Memuat data kabupaten...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    gradient="from-emerald-500 to-teal-600"
                    shadowColor="shadow-emerald-500/20"
                    icon={<Target className="w-6 h-6" />}
                    label="Waste Diversion Rate"
                    value={stats.tonnageToday > 0 ? `${Math.min(((stats.tonnageToday / 1000) * 100), 100).toFixed(1)}%` : "0%"}
                    subtext="Target: 45% reduksi di hulu"
                    trend="+2.4%"
                    trendUp
                />
                <KPICard
                    gradient="from-amber-500 to-orange-600"
                    shadowColor="shadow-amber-500/20"
                    icon={<Building2 className="w-6 h-6" />}
                    label="Est. Penghematan TPA"
                    value={`Rp ${((stats.totalPayout * 0.3) / 1000000).toFixed(1)}M`}
                    subtext="Efisiensi BBM & Tipping Fee"
                    trend="+15%"
                    trendUp
                />
                <KPICard
                    gradient="from-sky-500 to-blue-600"
                    shadowColor="shadow-sky-500/20"
                    icon={<Droplets className="w-6 h-6" />}
                    label="Reduksi Emisi CH4"
                    value={`${(stats.tonnageOrganic * 0.06).toFixed(0)}T`}
                    subtext="Pencegahan gas metana TPA"
                    trend="Stabil"
                    trendUp={false}
                />
                <KPICard
                    gradient="from-violet-500 to-purple-600"
                    shadowColor="shadow-violet-500/20"
                    icon={<Scale className="w-6 h-6" />}
                    label="Tonase Masuk Hari Ini"
                    value={`${stats.tonnageToday.toFixed(1)} Kg`}
                    subtext={`Org: ${stats.tonnageOrganic.toFixed(1)}Kg | Anorg: ${stats.tonnageInorganic.toFixed(1)}Kg`}
                    trend="Live"
                    trendUp
                />
            </div>

            {/* 3 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Populasi */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 rounded-xl"><Users className="w-4 h-4 text-emerald-600" /></div>
                        Populasi Ekosistem
                    </h3>
                    <div className="space-y-1">
                        <StatRow label="Warga Terdaftar" value={stats.totalWarga} color="text-emerald-600" bg="bg-emerald-50" />
                        <StatRow label="Bank Sampah Aktif" value={stats.totalBankSampah} color="text-blue-600" bg="bg-blue-50" />
                        <StatRow label="Kurir Aktif" value={stats.totalCourier} color="text-violet-600" bg="bg-violet-50" />
                        <StatRow label="Pendaftar Kurir Baru" value={stats.pendingCourier} color="text-amber-600" bg="bg-amber-50" />
                        <StatRow label="Total Transaksi" value={stats.totalTransactions} color="text-slate-700" bg="bg-slate-50" />
                    </div>
                </div>

                {/* Armada */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-xl"><Truck className="w-4 h-4 text-blue-600" /></div>
                        Komposisi Armada Kurir
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <FleetCard icon={<Bike className="w-6 h-6" />} label="Motor" count={stats.motor} gradient="from-blue-50 to-blue-100/50" borderColor="border-blue-200" textColor="text-blue-600" />
                        <FleetCard icon={<Car className="w-6 h-6" />} label="Pickup" count={stats.mobil_pickup} gradient="from-slate-50 to-slate-100/50" borderColor="border-slate-200" textColor="text-slate-600" />
                        <FleetCard icon={<Truck className="w-6 h-6" />} label="Gerobak" count={stats.gerobak} gradient="from-amber-50 to-amber-100/50" borderColor="border-amber-200" textColor="text-amber-600" />
                        <FleetCard icon={<Bike className="w-6 h-6" />} label="Sepeda" count={stats.sepeda} gradient="from-emerald-50 to-emerald-100/50" borderColor="border-emerald-200" textColor="text-emerald-600" />
                    </div>
                </div>

                {/* Keuangan */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                        <div className="p-2 bg-amber-50 rounded-xl"><Wallet className="w-4 h-4 text-amber-600" /></div>
                        Perputaran Ekonomi
                    </h3>
                    <div className="space-y-3">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl p-5">
                            <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider mb-1.5">Total Saldo Cair ke Warga</p>
                            <p className="text-2xl font-black text-emerald-700 font-mono">Rp {stats.totalPayout.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-gradient-to-r from-brand-50 to-indigo-50 border border-brand-200/60 rounded-xl p-5">
                            <p className="text-[10px] text-brand-700 font-extrabold uppercase tracking-wider mb-1.5 flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Revenue Penjualan Produk</p>
                            <p className="text-2xl font-black text-brand-700 font-mono">Rp {stats.salesRevenue.toLocaleString('id-ID')}</p>
                            <div className="flex gap-3 mt-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Lunas: Rp {stats.salesPaid.toLocaleString('id-ID')}</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600"><Clock className="w-3 h-3" /> Piutang: Rp {stats.salesUnpaid.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-5">
                            <p className="text-[10px] text-amber-700 font-extrabold uppercase tracking-wider mb-1.5">Pengajuan Pencairan Pending</p>
                            <p className="text-2xl font-black text-amber-700 font-mono">{stats.pendingWithdrawals}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[340px] flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-extrabold text-slate-800">Grafik Tonase Harian per Wilayah</h3>
                        <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm">Unduh PDF</span>
                    </div>
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center transition-colors hover:border-emerald-300">
                        <div className="text-center p-6">
                            <div className="h-14 w-14 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="h-7 w-7 text-emerald-500" />
                            </div>
                            <p className="text-sm font-bold text-slate-600">Modul Grafik Live</p>
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[220px]">Kurva perbandingan tonase harian masing-masing kecamatan.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[340px] flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-extrabold text-slate-800">Produksi & Penjualan Produk</h3>
                        <span className="text-[10px] bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm">Real-time</span>
                    </div>
                    <div className="space-y-3 flex-1">
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-200/40 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg"><Recycle className="w-4 h-4 text-emerald-600" /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">Total Produksi Olahan</p>
                                    <p className="text-xs text-slate-400">Semua output Bank Sampah</p>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-emerald-700">{stats.globalProductionKg.toFixed(1)} <span className="text-sm font-bold">Kg</span></p>
                        </div>
                        <div className="bg-gradient-to-r from-brand-50 to-indigo-50/50 border border-brand-200/40 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-100 rounded-lg"><ShoppingBag className="w-4 h-4 text-brand-600" /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">Total Transaksi Jual</p>
                                    <p className="text-xs text-slate-400">{stats.salesCount} transaksi ke buyer</p>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-brand-700">Rp {(stats.salesRevenue / 1000000).toFixed(2)} <span className="text-sm font-bold">Jt</span></p>
                        </div>
                        <div className="bg-gradient-to-r from-violet-50 to-purple-50/50 border border-violet-200/40 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-100 rounded-lg"><TrendingUp className="w-4 h-4 text-violet-600" /></div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase">Efisiensi Konversi</p>
                                    <p className="text-xs text-slate-400">Rasio produksi / inbound</p>
                                </div>
                            </div>
                            <p className="text-2xl font-black text-violet-700">{stats.tonnageAllTime > 0 ? ((stats.globalProductionKg / stats.tonnageAllTime) * 100).toFixed(1) : 0}<span className="text-sm font-bold">%</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Sub-Components ────────────────────── */

function KPICard({ gradient, shadowColor, icon, label, value, subtext, trend, trendUp }: {
    gradient: string; shadowColor: string; icon: React.ReactNode;
    label: string; value: string; subtext: string; trend: string; trendUp: boolean;
}) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-xl ${shadowColor} relative overflow-hidden`}>
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <p className="text-[11px] font-bold text-white/80 leading-tight max-w-[120px]">{label}</p>
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">{icon}</div>
                </div>
                <p className="text-3xl font-black leading-none mb-2">{value}</p>
                <span className="inline-flex items-center text-[10px] font-bold bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full mb-2">
                    {trendUp ? <TrendingUp className="w-2.5 h-2.5 mr-1" /> : <TrendingDown className="w-2.5 h-2.5 mr-1" />}
                    {trend}
                </span>
                <p className="text-[10px] text-white/70 leading-relaxed">{subtext}</p>
            </div>
        </div>
    );
}

function StatRow({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
    return (
        <div className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
            <span className="text-xs text-slate-500 font-semibold group-hover:text-slate-700 transition-colors">{label}</span>
            <span className={`text-base font-black font-mono ${color} ${bg} px-3 py-0.5 rounded-lg`}>{value.toLocaleString('id-ID')}</span>
        </div>
    );
}

function FleetCard({ icon, label, count, gradient, borderColor, textColor }: {
    icon: React.ReactNode; label: string; count: number; gradient: string; borderColor: string; textColor: string;
}) {
    return (
        <div className={`bg-gradient-to-br ${gradient} border ${borderColor} rounded-2xl p-4 text-center hover:shadow-md transition-all hover:-translate-y-0.5`}>
            <div className={`${textColor} mx-auto mb-2 flex justify-center`}>{icon}</div>
            <p className="text-2xl font-black text-slate-800">{count}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">{label}</p>
        </div>
    );
}
