"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { PackageCheck, Scale, Wallet2, ArrowRightLeft } from 'lucide-react';
import { CourierQuotaSummary } from '@/components/admin/CourierQuotaSummary';

export default function AdminPage() {
    const [stats, setStats] = useState({
        pending: 0,
        tonnageToday: 0,
        withdrawals: 0,
        totalPayout: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase.from('profiles').select('bank_sampah_id').eq('id', user.id).single();
                const bankId = profile?.bank_sampah_id;

                if (bankId) {
                    // 1. Menunggu Validasi (Transactions Pending Approval)
                    const { count: pendingCount } = await supabase
                        .from('transactions')
                        .select('*', { count: 'exact', head: true })
                        .eq('bank_sampah_id', bankId)
                        .eq('status', 'pending');

                    // 2. Tonase Masuk Hari Ini
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const { data: todayTxs } = await supabase
                        .from('transactions')
                        .select('weight')
                        .eq('bank_sampah_id', bankId)
                        .gte('created_at', startOfDay.toISOString());
                    const tonnageToDay = todayTxs?.reduce((acc: number, cur) => acc + (cur.weight || 0), 0) || 0;

                    // 3. Pencairan Dana (Ini cross-join user profiles di bank ini, untuk simplifikasi kita fetch semua user di bank ini)
                    const { data: bankUsers } = await supabase.from('profiles').select('id').eq('bank_sampah_id', bankId);
                    const userIds = bankUsers?.map(u => u.id) || [];

                    let withdrawCount = 0;
                    if (userIds.length > 0) {
                        const { count } = await supabase
                            .from('withdraw_requests')
                            .select('*', { count: 'exact', head: true })
                            .in('user_id', userIds)
                            .eq('status', 'pending');
                        withdrawCount = count || 0;
                    }

                    // 4. Total Payout (Transactions Completed)
                    const { data: payoutTxs } = await supabase
                        .from('transactions')
                        .select('total_amount')
                        .eq('bank_sampah_id', bankId)
                        .eq('status', 'completed');
                    const totalPayout = payoutTxs?.reduce((acc: number, cur) => acc + (cur.total_amount || 0), 0) || 0;

                    setStats({
                        pending: pendingCount || 0,
                        tonnageToday: tonnageToDay,
                        withdrawals: withdrawCount,
                        totalPayout: totalPayout
                    });
                }
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatRupiah = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="space-y-6">

            {/* Quick Stats for Hub Operator */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Menunggu Validasi', value: loading ? '...' : `${stats.pending}`, icon: PackageCheck, color: 'text-amber-500', bg: 'bg-amber-100', subtitle: 'Paket tiba di Bank Sampah' },
                    { label: 'Tonase Masuk (Hari Ini)', value: loading ? '...' : `${stats.tonnageToday} Kg`, icon: Scale, color: 'text-brand-500', bg: 'bg-brand-100', subtitle: 'Organik & Anorganik' },
                    { label: 'Pencairan Dana', value: loading ? '...' : `${stats.withdrawals}`, icon: Wallet2, color: 'text-blue-500', bg: 'bg-blue-100', subtitle: 'Permintaan Withdraw' },
                    { label: 'Total Keluar (Rp)', value: loading ? '...' : formatRupiah(stats.totalPayout), icon: ArrowRightLeft, color: 'text-emerald-500', bg: 'bg-emerald-100', subtitle: 'Dibayarkan ke warga' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                        <div className={`p-4 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                            <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quota Summary (from SuperAdmin settings) */}
            <CourierQuotaSummary />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Audit & Validation Area (Primary Task) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[600px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Antrean Audit Timbangan</h2>
                            <p className="text-sm text-slate-500">Kurir yang sudah tiba di Gudang dan menunggu verifikasi berat riil.</p>
                        </div>
                        <button className="text-sm text-brand-600 font-medium hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg">Scan Barcode / QR</button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {/* Sample Pending Validations */}
                        {[
                            { name: 'Ahmad Kurir', item: 'Kardus & Plastik', claimed_weight: '12 Kg', time: '10 menit lalu', status: 'Menimbang' },
                            { name: 'Siti Rahma (Mandiri)', item: 'Organik Dapur', claimed_weight: '5.5 Kg', time: '25 menit lalu', status: 'Antre' },
                            { name: 'Joko Anwar', item: 'Besi Bekas', claimed_weight: '40 Kg', time: '1 jam lalu', status: 'Antre' },
                        ].map((item, index) => (
                            <div key={index} className="p-4 border border-slate-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition cursor-pointer group flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                        {item.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800 text-sm">{item.name}</h4>
                                        <p className="text-xs text-slate-500">{item.item} • Est: {item.claimed_weight}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.status === 'Menimbang' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {item.status}
                                    </span>
                                    <button className="text-xs font-semibold text-white bg-slate-900 group-hover:bg-brand-600 px-4 py-2 rounded-lg transition-colors shadow-sm">
                                        Validasi & Cairkan
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Secondary Tasks: Withdrawals & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[290px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-md font-bold text-slate-800">Menunggu Pencairan Dana</h2>
                            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{loading ? '-' : stats.withdrawals}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {[1, 2].map((item) => (
                                <div key={item} className="p-3 border border-slate-100 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Budi Santoso</p>
                                        <p className="text-xs text-slate-500">Ke: DANA (0812***)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-brand-600">Rp 50.000</p>
                                        <button className="text-[10px] text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded mt-1">Transfer & Approve</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 flex flex-col h-[286px] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/20 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                        <h2 className="text-md font-bold mb-2">Harga Beli Dinamis</h2>
                        <p className="text-xs text-slate-400 mb-6">Atur harga beli warga hari ini. Harga akan otomatis update di Bot WhatsApp.</p>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg">
                                <span className="text-sm">Organik</span>
                                <span className="font-mono text-brand-400 font-bold">Rp 400 /kg</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-800 p-3 rounded-lg">
                                <span className="text-sm">Anorganik (Plastik)</span>
                                <span className="font-mono text-brand-400 font-bold">Rp 1.200 /kg</span>
                            </div>
                        </div>
                        <button className="w-full mt-auto py-2 bg-brand-600 hover:bg-brand-500 text-sm font-medium rounded-lg transition">Sesuaikan Harga</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

