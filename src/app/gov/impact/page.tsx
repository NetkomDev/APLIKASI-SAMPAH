"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function ImpactPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalPayoutWarga: 0,
        totalPayoutCourier: 0,
        totalTransactions: 0,
        pendingWithdrawals: 0,
        approvedWithdrawals: 0,
    });

    useEffect(() => {
        const fetch = async () => {
            // Total payout to warga via completed transactions
            const { data: txData } = await supabase.from('transactions').select('amount_earned').eq('status', 'completed');
            const totalPayout = txData?.reduce((a, t) => a + (t.amount_earned || 0), 0) || 0;

            const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });

            // Withdrawals
            const { count: pendingWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            const { count: approvedWd } = await supabase.from('withdraw_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved');

            setData({
                totalPayoutWarga: totalPayout,
                totalPayoutCourier: 0,
                totalTransactions: txCount || 0,
                pendingWithdrawals: pendingWd || 0,
                approvedWithdrawals: approvedWd || 0,
            });
            setLoading(false);
        };
        fetch();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Dampak Ekonomi Lokal</h2>
                <p className="text-xs text-slate-500 mt-1">Perputaran dana, komisi, dan subsidi ke masyarakat secara real-time.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <EconCard
                            label="Total Dana Cair ke Warga"
                            value={`Rp ${data.totalPayoutWarga.toLocaleString('id-ID')}`}
                            icon={<ArrowUpRight className="w-5 h-5" />}
                            color="emerald"
                        />
                        <EconCard
                            label="Total Transaksi Tercatat"
                            value={data.totalTransactions.toLocaleString('id-ID')}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="brand"
                        />
                        <EconCard
                            label="Pencairan Menunggu Approval"
                            value={data.pendingWithdrawals.toString()}
                            icon={<ArrowDownRight className="w-5 h-5" />}
                            color="amber"
                        />
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-6">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-400" /> Rincian Arus Dana</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dana Tersalurkan ke Ekosistem</p>
                                <p className="text-3xl font-black text-emerald-400 font-mono">Rp {data.totalPayoutWarga.toLocaleString('id-ID')}</p>
                                <p className="text-[10px] text-slate-600 mt-2">Akumulasi seluruh transaksi dari seluruh cabang Bank Sampah.</p>
                            </div>
                            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pengajuan Selesai</p>
                                <p className="text-3xl font-black text-brand-400 font-mono">{data.approvedWithdrawals}</p>
                                <p className="text-[10px] text-slate-600 mt-2">Pencairan yang telah disetujui dan dana ditransfer.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function EconCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
    const colorMap: Record<string, string> = {
        emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400',
        brand: 'from-brand-500/10 to-brand-600/5 border-brand-500/20 text-brand-400',
        amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
    };
    const c = colorMap[color] || colorMap.brand;
    return (
        <div className={`bg-gradient-to-br ${c.split(' ').slice(0, 2).join(' ')} border ${c.split(' ')[2]} rounded-2xl p-5`}>
            <div className={`${c.split(' ').slice(-1)} mb-3`}>{icon}</div>
            <p className="text-2xl font-black text-white font-mono">{value}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{label}</p>
        </div>
    );
}
