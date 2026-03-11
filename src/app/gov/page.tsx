"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { Target, Building2, Droplets, Truck, Users, Clock, Bike, Car, TrendingUp, TrendingDown, BarChart3, Wallet, Scale, Package } from 'lucide-react';

export default function GovPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalWarga: 0,
        totalCourier: 0,
        pendingCourier: 0,
        totalBankSampah: 0,
        motor: 0, mobil_pickup: 0, gerobak: 0, sepeda: 0,
        tonnageToday: 0,
        tonnageOrganic: 0,
        tonnageInorganic: 0,
        totalPayout: 0,
        totalCourierPayout: 0,
        pendingWithdrawals: 0,
        totalTransactions: 0,
    });

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        setLoading(true);
        try {
            // Warga count
            const { count: wargaCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'citizen');

            // Courier stats
            const { data: allCouriers } = await supabase.from('profiles').select('id, vehicle_type').eq('role', 'courier').eq('courier_status', 'active');
            const { count: pendingCount } = await supabase.from('courier_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            // Bank Sampah count
            const { count: bsCount } = await supabase.from('bank_sampah_units').select('*', { count: 'exact', head: true }).eq('is_active', true);

            // Tonnage today
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const { data: todayTxs } = await supabase.from('transactions').select('weight_organic, weight_inorganic, amount_earned, status').gte('created_at', startOfDay.toISOString());

            const tonnageOrganic = todayTxs?.reduce((acc, t) => acc + (t.weight_organic || 0), 0) || 0;
            const tonnageInorganic = todayTxs?.reduce((acc, t) => acc + (t.weight_inorganic || 0), 0) || 0;

            // Payout (completed)
            const { data: payoutData } = await supabase.from('transactions').select('amount_earned').eq('status', 'completed');
            const totalPayout = payoutData?.reduce((acc, t) => acc + (t.amount_earned || 0), 0) || 0;

            // Total transactions
            const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });

            // Pending withdrawals
            const { count: wdCount } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            const couriers = allCouriers || [];
            setStats({
                totalWarga: wargaCount || 0,
                totalCourier: couriers.length,
                pendingCourier: pendingCount || 0,
                totalBankSampah: bsCount || 0,
                motor: couriers.filter(c => c.vehicle_type === 'motor').length,
                mobil_pickup: couriers.filter(c => c.vehicle_type === 'mobil_pickup').length,
                gerobak: couriers.filter(c => c.vehicle_type === 'gerobak').length,
                sepeda: couriers.filter(c => c.vehicle_type === 'sepeda').length,
                tonnageToday: tonnageOrganic + tonnageInorganic,
                tonnageOrganic,
                tonnageInorganic,
                totalPayout,
                totalCourierPayout: 0,
                pendingWithdrawals: wdCount || 0,
                totalTransactions: txCount || 0,
            });
        } catch (err) {
            console.error("Failed to load gov stats:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Memuat data kabupaten...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    icon={<Target className="w-5 h-5" />}
                    iconBg="bg-brand-500/10"
                    iconColor="text-brand-400"
                    label="Waste Diversion Rate"
                    value={stats.tonnageToday > 0 ? `${Math.min(((stats.tonnageToday / 1000) * 100), 100).toFixed(1)}%` : "0%"}
                    subtext="Target: 45% sampah tereduksi hulu"
                    trend="+2.4%"
                    trendUp
                />
                <KPICard
                    icon={<Building2 className="w-5 h-5" />}
                    iconBg="bg-amber-500/10"
                    iconColor="text-amber-400"
                    label="Est. Penghematan TPA"
                    value={`Rp ${((stats.totalPayout * 0.3) / 1000000).toFixed(1)}M`}
                    subtext="Efisiensi BBM Truk & Tipping Fee"
                    trend="+15%"
                    trendUp
                    dark
                />
                <KPICard
                    icon={<Droplets className="w-5 h-5" />}
                    iconBg="bg-sky-500/10"
                    iconColor="text-sky-400"
                    label="Reduksi Emisi CH4"
                    value={`${(stats.tonnageOrganic * 0.06).toFixed(0)}T`}
                    subtext="Pencegahan gas metana organik di TPA"
                    trend="Stabil"
                    trendUp={false}
                />
                <KPICard
                    icon={<Scale className="w-5 h-5" />}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-400"
                    label="Tonase Masuk Hari Ini"
                    value={`${stats.tonnageToday.toFixed(1)} Kg`}
                    subtext={`Organik: ${stats.tonnageOrganic.toFixed(1)}Kg | Anorganik: ${stats.tonnageInorganic.toFixed(1)}Kg`}
                    trend="Live"
                    trendUp
                />
            </div>

            {/* Populasi & Infrastruktur */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Populasi Entitas */}
                <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-400" /> Populasi Ekosistem
                    </h3>
                    <div className="space-y-3">
                        <StatRow label="Warga Terdaftar" value={stats.totalWarga} color="text-white" />
                        <StatRow label="Bank Sampah Aktif" value={stats.totalBankSampah} color="text-emerald-400" />
                        <StatRow label="Kurir Aktif" value={stats.totalCourier} color="text-brand-400" />
                        <StatRow label="Pendaftar Kurir Baru" value={stats.pendingCourier} color="text-amber-400" />
                        <StatRow label="Total Transaksi" value={stats.totalTransactions} color="text-sky-400" />
                    </div>
                </div>

                {/* Armada Kurir */}
                <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-400" /> Komposisi Armada Kurir
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <FleetCard icon={<Bike className="w-5 h-5" />} label="Motor" count={stats.motor} color="from-blue-500/10 to-blue-600/5" textColor="text-blue-400" />
                        <FleetCard icon={<Car className="w-5 h-5" />} label="Pickup" count={stats.mobil_pickup} color="from-slate-500/10 to-slate-600/5" textColor="text-slate-300" />
                        <FleetCard icon={<Truck className="w-5 h-5" />} label="Gerobak" count={stats.gerobak} color="from-amber-500/10 to-amber-600/5" textColor="text-amber-400" />
                        <FleetCard icon={<Bike className="w-5 h-5" />} label="Sepeda" count={stats.sepeda} color="from-emerald-500/10 to-emerald-600/5" textColor="text-emerald-400" />
                    </div>
                </div>

                {/* Keuangan */}
                <div className="lg:col-span-1 bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" /> Perputaran Ekonomi
                    </h3>
                    <div className="space-y-3">
                        <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/10 rounded-xl p-4">
                            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider mb-1">Total Saldo Cair ke Warga</p>
                            <p className="text-2xl font-black text-emerald-400 font-mono">Rp {stats.totalPayout.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/10 rounded-xl p-4">
                            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-1">Pengajuan Pencairan Pending</p>
                            <p className="text-2xl font-black text-amber-400 font-mono">{stats.pendingWithdrawals}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-6 h-[340px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white">Grafik Tonase Harian per Wilayah</h3>
                        <span className="text-[10px] bg-brand-600/20 text-brand-300 font-bold px-2.5 py-1 rounded-lg border border-brand-500/20">Unduh PDF</span>
                    </div>
                    <div className="flex-1 border border-dashed border-slate-700/60 rounded-xl bg-slate-950/30 flex items-center justify-center">
                        <div className="text-center p-6">
                            <div className="h-12 w-12 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center mx-auto mb-3">
                                <BarChart3 className="h-6 w-6 text-brand-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-400">Modul Grafik Live</p>
                            <p className="text-[10px] text-slate-600 mt-1 max-w-[220px]">Kurva perbandingan tonase harian masing-masing kecamatan.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-6 h-[340px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white">Produksi Output Gudang</h3>
                        <span className="text-[10px] bg-emerald-600/20 text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">Real-time</span>
                    </div>
                    <div className="flex-1 border border-dashed border-slate-700/60 rounded-xl bg-slate-950/30 flex items-center justify-center">
                        <div className="text-center p-6">
                            <div className="h-12 w-12 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center mx-auto mb-3">
                                <Package className="h-6 w-6 text-emerald-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-400">Modul Produksi (Pengembangan)</p>
                            <p className="text-[10px] text-slate-600 mt-1 max-w-[220px]">Agregasi output produksi (pupuk, cacahan) dari seluruh Bank Sampah.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Reusable Sub-Components ────────────────────────────────── */

function KPICard({ icon, iconBg, iconColor, label, value, subtext, trend, trendUp, dark }: {
    icon: React.ReactNode; iconBg: string; iconColor: string;
    label: string; value: string; subtext: string; trend: string; trendUp: boolean; dark?: boolean;
}) {
    return (
        <div className={`rounded-2xl p-5 border flex flex-col justify-between ${dark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/60' : 'bg-slate-900/60 backdrop-blur border-slate-800/60'}`}>
            <div className="flex justify-between items-start mb-3">
                <p className="text-[11px] font-semibold text-slate-400 leading-tight">{label}</p>
                <div className={`p-2 rounded-xl ${iconBg}`}>
                    <span className={iconColor}>{icon}</span>
                </div>
            </div>
            <div>
                <p className="text-2xl lg:text-3xl font-black text-white leading-none mb-1">{value}</p>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${trendUp ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-600'}`}>
                        {trendUp ? <TrendingUp className="w-2.5 h-2.5 mr-1" /> : <TrendingDown className="w-2.5 h-2.5 mr-1" />}
                        {trend}
                    </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{subtext}</p>
            </div>
        </div>
    );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-800/60 last:border-0">
            <span className="text-xs text-slate-400 font-medium">{label}</span>
            <span className={`text-lg font-black font-mono ${color}`}>{value.toLocaleString('id-ID')}</span>
        </div>
    );
}

function FleetCard({ icon, label, count, color, textColor }: {
    icon: React.ReactNode; label: string; count: number; color: string; textColor: string;
}) {
    return (
        <div className={`bg-gradient-to-br ${color} border border-slate-800/40 rounded-xl p-4 text-center`}>
            <div className={`${textColor} mx-auto mb-2 flex justify-center`}>{icon}</div>
            <p className="text-xl font-black text-white">{count}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{label}</p>
        </div>
    );
}
