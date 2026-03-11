"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Banknote, Receipt } from 'lucide-react';

export default function ImpactPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalPayoutWarga: 0, totalTransactions: 0, pendingWithdrawals: 0, approvedWithdrawals: 0,
    });

    useEffect(() => {
        const fetch = async () => {
            const { data: txData } = await supabase.from('transactions').select('amount_earned').eq('status', 'completed');
            const totalPayout = txData?.reduce((a, t) => a + (t.amount_earned || 0), 0) || 0;
            const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
            const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: approvedWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved');
            setData({ totalPayoutWarga: totalPayout, totalTransactions: txCount || 0, pendingWithdrawals: pendingWd || 0, approvedWithdrawals: approvedWd || 0 });
            setLoading(false);
        };
        fetch();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">Dampak Ekonomi Lokal</h2>
                <p className="text-xs text-slate-400 mt-1">Perputaran dana, komisi, dan subsidi ke masyarakat secara real-time.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                            <div className="relative z-10">
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm w-fit mb-3"><Banknote className="w-6 h-6" /></div>
                                <p className="text-2xl font-black font-mono">Rp {data.totalPayoutWarga.toLocaleString('id-ID')}</p>
                                <p className="text-[11px] text-white/80 font-semibold mt-1">Total Dana Cair ke Warga</p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                            <div className="relative z-10">
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm w-fit mb-3"><Receipt className="w-6 h-6" /></div>
                                <p className="text-2xl font-black font-mono">{data.totalTransactions.toLocaleString('id-ID')}</p>
                                <p className="text-[11px] text-white/80 font-semibold mt-1">Total Transaksi Tercatat</p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                            <div className="relative z-10">
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm w-fit mb-3"><ArrowDownRight className="w-6 h-6" /></div>
                                <p className="text-2xl font-black font-mono">{data.pendingWithdrawals}</p>
                                <p className="text-[11px] text-white/80 font-semibold mt-1">Pencairan Menunggu Approval</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 rounded-xl"><Wallet className="w-4 h-4 text-emerald-600" /></div>
                            Rincian Arus Dana
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl p-6">
                                <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider mb-2">Dana Tersalurkan ke Ekosistem</p>
                                <p className="text-3xl font-black text-emerald-700 font-mono">Rp {data.totalPayoutWarga.toLocaleString('id-ID')}</p>
                                <p className="text-[10px] text-slate-400 mt-3">Akumulasi seluruh transaksi Bank Sampah.</p>
                            </div>
                            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 rounded-2xl p-6">
                                <p className="text-[10px] font-extrabold text-violet-700 uppercase tracking-wider mb-2">Pengajuan Selesai</p>
                                <p className="text-3xl font-black text-violet-700 font-mono">{data.approvedWithdrawals}</p>
                                <p className="text-[10px] text-slate-400 mt-3">Pencairan yang telah disetujui.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
