"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { PackageCheck, Scale, Wallet2, ArrowRightLeft, X, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { CourierQuotaSummary } from '@/components/admin/CourierQuotaSummary';

export default function AdminPage() {
    const [stats, setStats] = useState({
        pending: 0,
        tonnageToday: 0,
        withdrawals: 0,
        totalPayout: 0
    });
    const [pendingTxs, setPendingTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Validation Modal State
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [adminOrg, setAdminOrg] = useState('');
    const [adminInorg, setAdminInorg] = useState('');
    const [adminQuality, setAdminQuality] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('bank_sampah_id, role').eq('id', user.id).single();
            const bankId = profile?.bank_sampah_id;
            const isSuper = profile?.role === 'superadmin';

            if (bankId || isSuper) {
                // 1. Antrean Validasi Timbangan (Faktur Setoran / Manifest Bulk Kurir)
                let pendingQuery = supabase
                    .from('courier_deposits')
                    .select(`
                        id, total_organic_claimed, total_inorganic_claimed, transaction_count, status, created_at,
                        kurir:profiles!courier_deposits_kurir_id_fkey(full_name)
                    `)
                    .eq('status', 'pending_audit')
                    .order('created_at', { ascending: true });

                if (!isSuper) pendingQuery = pendingQuery.eq('bank_sampah_id', bankId);

                const { data: pendingData } = await pendingQuery;
                setPendingTxs(pendingData || []);

                // 2. Tonase Masuk Hari Ini
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                let todayQuery = supabase
                    .from('transactions')
                    .select('weight_organic, weight_inorganic')
                    .gte('created_at', startOfDay.toISOString());
                if (!isSuper) todayQuery = todayQuery.eq('bank_sampah_id', bankId);

                const { data: todayTxs } = await todayQuery;
                const tonnageToDay = todayTxs?.reduce((acc: number, cur) => acc + (cur.weight_organic || 0) + (cur.weight_inorganic || 0), 0) || 0;

                // 3. Pencairan Dana (Withdrawals)
                let withdrawCount = 0;
                if (!isSuper && bankId) {
                    const { data: bankUsers } = await supabase.from('profiles').select('id').eq('bank_sampah_id', bankId);
                    const userIds = bankUsers?.map(u => u.id) || [];
                    if (userIds.length > 0) {
                        const { count } = await supabase
                            .from('withdraw_requests')
                            .select('*', { count: 'exact', head: true })
                            .in('user_id', userIds)
                            .eq('status', 'pending');
                        withdrawCount = count || 0;
                    }
                } else if (isSuper) {
                    const { count } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
                    withdrawCount = count || 0;
                }

                // 4. Total Payout (Transactions Completed)
                let payoutQuery = supabase
                    .from('transactions')
                    .select('amount_earned')
                    .eq('status', 'completed');
                if (!isSuper) payoutQuery = payoutQuery.eq('bank_sampah_id', bankId);

                const { data: payoutTxs } = await payoutQuery;
                const totalPayout = payoutTxs?.reduce((acc: number, cur) => acc + (cur.amount_earned || 0), 0) || 0;

                setStats({
                    pending: pendingData?.length || 0,
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

    useEffect(() => {
        fetchStats();
    }, []);

    const handleOpenModal = (tx: any) => {
        setSelectedTx(tx);
        setAdminOrg(tx.total_organic_claimed?.toString() || '0');
        setAdminInorg(tx.total_inorganic_claimed?.toString() || '0');
        setAdminQuality('Campur Aduk / Belum Dipilah');
        setNotes('');
    };

    const handleValidasi = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthenticated");

            // Update Courier Deposit (Manifest) with Admin Actual measurements
            const { error: depositError } = await supabase
                .from('courier_deposits')
                .update({
                    actual_organic: Number(adminOrg),
                    actual_inorganic: Number(adminInorg),
                    admin_quality_assessment: adminQuality,
                    discrepancy_notes: notes,
                    admin_id: user.id,
                    status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .eq('id', selectedTx.id);

            if (depositError) throw depositError;

            // Optional: You would also trigger an Edge Function here to automatically
            // transfer commission to the courier and set all related `transactions` statuses to `completed`.
            // For now, updating the transaction UI table is done:

            setSelectedTx(null);
            fetchStats();
        } catch (err) {
            console.error("Gagal memvalidasi:", err);
            alert("Gagal memvalidasi timbangan.");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                    { label: 'Menunggu Validasi', value: loading ? '...' : `${stats.pending}`, icon: PackageCheck, color: 'text-amber-500', bg: 'bg-amber-100', subtitle: 'Antrean Audit Kurir' },
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
                            <h2 className="text-lg font-bold text-slate-800">Antrean Audit & Timbangan Kurir</h2>
                            <p className="text-sm text-slate-500">Cross-check berat aktual & kualitas setoran dari Kurir secara langsung.</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {loading ? (
                            <div className="py-20 flex justify-center items-center">
                                <div className="h-8 w-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
                            </div>
                        ) : pendingTxs.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                                <PackageCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">Bebas Antrean</p>
                                <p className="text-xs text-slate-400 mt-1">Belum ada kurir yang menunggu validasi di Pintu Masuk.</p>
                            </div>
                        ) : (
                            pendingTxs.map((tx) => (
                                <div key={tx.id} className="p-4 border border-slate-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition cursor-pointer group flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 font-bold flex-shrink-0">
                                            {(tx.kurir?.full_name || 'K').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">Kurir: {tx.kurir?.full_name || 'Reguler'}</h4>
                                            <p className="text-xs text-brand-600 mt-0.5 font-medium flex items-center gap-1"><PackageCheck className="w-3 h-3" /> Faktur Setoran (Bulk)</p>

                                            <div className="mt-2 text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                                <p><span className="text-emerald-600 font-semibold">Org:</span> {tx.total_organic_claimed} Kg &nbsp;|&nbsp; <span className="text-blue-600 font-semibold">Anorg:</span> {tx.total_inorganic_claimed} Kg</p>
                                                <p className="mt-1 text-slate-400 italic">Total Klaim Timbangan Kurir • {tx.transaction_count || 0} rumah</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${tx.status === 'menimbang' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                            {tx.status.toUpperCase()}
                                        </span>
                                        <button
                                            onClick={() => handleOpenModal(tx)}
                                            className="text-xs font-bold text-white bg-slate-900 hover:bg-brand-600 px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                                        >
                                            Audit Timbangan
                                        </button>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
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

            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-hidden">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <div>
                                <h3 className="font-bold text-2xl text-slate-800 tracking-tight">Validasi Pintu Masuk (Inbound)</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Lakukan kalibrasi berat aktual dari laporan kurir</p>
                            </div>
                            <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors flex items-center justify-center">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
                            {/* Courier's Claimed Panel */}
                            <div className="bg-slate-50 rounded-2xl p-8 border-2 border-slate-200 relative overflow-hidden flex flex-col justify-center">
                                <div className="absolute top-0 left-0 w-2 h-full bg-slate-400"></div>
                                <h4 className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6" /> Klaim Faktur Kurir
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-300 pb-3">
                                        <span className="text-lg text-slate-600 font-medium">Total Organik</span>
                                        <span className="font-bold font-mono text-3xl text-slate-800">{selectedTx.total_organic_claimed} <span className="text-xl text-slate-500">Kg</span></span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-300 pb-3">
                                        <span className="text-lg text-slate-600 font-medium">Total Anorganik</span>
                                        <span className="font-bold font-mono text-3xl text-slate-800">{selectedTx.total_inorganic_claimed} <span className="text-xl text-slate-500">Kg</span></span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="text-xs text-slate-500 block mb-2 uppercase font-bold tracking-wider">Status Faktur</span>
                                        <span className="inline-block bg-brand-100 text-brand-700 text-base font-bold px-4 py-2 rounded-lg border border-brand-200">
                                            Menunggu Audit Gudang
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Admin's Actual Reality Panel */}
                            <form id="validation-form" onSubmit={handleValidasi} className="bg-brand-50 rounded-2xl p-6 border-2 border-brand-300 relative overflow-hidden shadow-inner flex flex-col justify-between h-full">
                                <div className="absolute top-0 left-0 w-2 h-full bg-brand-500"></div>

                                <div>
                                    <h4 className="text-base font-bold text-brand-700 uppercase tracking-widest mb-4 flex items-center gap-3">
                                        <Scale className="w-5 h-5" /> Realitas Timbangan Pusat
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white p-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-brand-100 shadow-sm">
                                            <label className="text-base font-bold text-slate-700">Organik</label>
                                            <div className="relative w-full px-2">
                                                <input type="number" step="0.1" min="0" required value={adminOrg} onChange={e => setAdminOrg(e.target.value)} className="w-full text-center font-mono font-bold text-3xl py-2 rounded-xl border-2 border-brand-300 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Kg</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-brand-100 shadow-sm">
                                            <label className="text-base font-bold text-slate-700">Anorganik</label>
                                            <div className="relative w-full px-2">
                                                <input type="number" step="0.1" min="0" required value={adminInorg} onChange={e => setAdminInorg(e.target.value)} className="w-full text-center font-mono font-bold text-3xl py-2 rounded-xl border-2 border-brand-300 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Kg</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Penilaian Kualitas Akhir Gudang</label>
                                    <select value={adminQuality} onChange={e => setAdminQuality(e.target.value)} className="w-full text-base font-semibold py-3 px-4 rounded-xl border-2 border-brand-300 focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 bg-white">
                                        <option value="Sangat Bersih (Dipilah Mandiri)">Sangat Bersih (Dipilah Mandiri)</option>
                                        <option value="Standar (Campur Sedikit)">Standar (Campur Sedikit)</option>
                                        <option value="Campur Aduk / Belum Dipilah">Campur Aduk / Belum Dipilah</option>
                                        <option value="Kotoran / Residu Tinggi">Kotoran / Residu Tinggi</option>
                                    </select>
                                </div>
                            </form>

                            {/* Discrepancy Note spans full width */}
                            <div className="lg:col-span-2 bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col gap-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-widest">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    Berita Acara Selisih (Discrepancy Notes)
                                </label>
                                <textarea
                                    rows={1}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Wajib diisi jika timbangan Gudang meleset dari kurir."
                                    className="w-full text-base p-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 resize-none bg-white font-medium"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 shrink-0 shadow-inner">
                            <button type="button" onClick={() => setSelectedTx(null)} disabled={isSubmitting} className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all text-base shadow-sm">
                                Batal
                            </button>
                            <button type="submit" form="validation-form" disabled={isSubmitting} className="px-8 py-3 bg-brand-600 border-2 border-brand-600 text-white font-black rounded-xl hover:bg-brand-500 transition-all text-lg flex items-center gap-2 shadow-lg disabled:opacity-70">
                                {isSubmitting ? 'Memproses Validasi...' : 'PENGESAHAN & TERIMA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
