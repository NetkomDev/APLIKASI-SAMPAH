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
                        id, total_organic_claimed, total_inorganic_claimed, status, created_at,
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
                                                <p className="mt-1 text-slate-400 italic">Total Klaim Timbangan Kurir</p>
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

            {/* CROSS-CHECK MODAL */}
            {selectedTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Validasi Pintu Masuk (Inbound)</h3>
                                <p className="text-xs text-slate-500 font-medium">Lakukan kalibrasi berat aktual dari laporan kurir</p>
                            </div>
                            <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Courier's Claimed Panel */}
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Klaim Kurir
                                </h4>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                        <span className="text-sm text-slate-600">Total Klaim Organik</span>
                                        <span className="font-bold font-mono text-slate-800">{selectedTx.total_organic_claimed} Kg</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                        <span className="text-sm text-slate-600">Total Klaim Anorganik</span>
                                        <span className="font-bold font-mono text-slate-800">{selectedTx.total_inorganic_claimed} Kg</span>
                                    </div>
                                    <div className="pt-1">
                                        <span className="text-xs text-slate-500 block mb-1">Status Rombongan Pengangkutan</span>
                                        <span className="inline-block bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded">
                                            Faktur Setoran Masuk
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Admin's Actual Reality Panel */}
                            <form id="validation-form" onSubmit={handleValidasi} className="bg-brand-50 rounded-xl p-5 border border-brand-200 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-brand-500"></div>
                                <h4 className="text-xs font-bold text-brand-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Scale className="w-4 h-4" /> Realitas Timbangan Pusat
                                </h4>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-sm font-semibold text-slate-700">Audit Organik</label>
                                        <div className="relative w-28">
                                            <input type="number" step="0.1" min="0" required value={adminOrg} onChange={e => setAdminOrg(e.target.value)} className="w-full text-right font-mono font-bold text-sm py-1.5 pr-8 pl-3 rounded-lg border-brand-200 focus:ring-brand-500 focus:border-brand-500" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Kg</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="text-sm font-semibold text-slate-700">Audit Anorganik</label>
                                        <div className="relative w-28">
                                            <input type="number" step="0.1" min="0" required value={adminInorg} onChange={e => setAdminInorg(e.target.value)} className="w-full text-right font-mono font-bold text-sm py-1.5 pr-8 pl-3 rounded-lg border-brand-200 focus:ring-brand-500 focus:border-brand-500" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Kg</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">Penilaian Kualitas Akhir</label>
                                        <select value={adminQuality} onChange={e => setAdminQuality(e.target.value)} className="w-full text-sm py-2 px-3 rounded-lg border-brand-200 focus:ring-brand-500 focus:border-brand-500 bg-white">
                                            <option value="Sangat Bersih (Dipilah Mandiri)">Sangat Bersih (Dipilah Mandiri)</option>
                                            <option value="Standar (Campur Sedikit)">Standar (Campur Sedikit)</option>
                                            <option value="Campur Aduk / Belum Dipilah">Campur Aduk / Belum Dipilah</option>
                                            <option value="Kotoran / Residu Tinggi">Kotoran / Residu Tinggi</option>
                                        </select>
                                    </div>
                                </div>
                            </form>

                            {/* Discrepancy Note spans 2 columns */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Catatan Selisih (Discrepancy)
                                </label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Wajib diisi jika berat / kualitas menurun drastis dari klaim kurir. Akan menjadi history SP kurir."
                                    className="w-full text-sm p-3 border border-slate-200 rounded-xl focus:ring-brand-500 focus:border-brand-500 resize-none bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button type="button" onClick={() => setSelectedTx(null)} disabled={isSubmitting} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors text-sm">
                                Batal
                            </button>
                            <button type="submit" form="validation-form" disabled={isSubmitting} className="px-5 py-2 bg-brand-600 border border-brand-600 text-white font-bold rounded-lg hover:bg-brand-500 transition-colors text-sm flex items-center gap-2 disabled:opacity-70">
                                {isSubmitting ? 'Memproses Validasi...' : 'Setujui & Terima Sampah'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
