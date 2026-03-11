"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Search, AlertTriangle, Filter, Eye, ChevronDown, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface TransactionData {
    id: string;
    created_at: string;
    status: string;
    weight_organic: number;
    weight_inorganic: number;
    admin_weight_organic: number | null;
    admin_weight_inorganic: number | null;
    discrepancy_notes: string | null;
    amount_earned: number;
    citizen: { full_name: string; phone_number: string } | null;
    courier: { full_name: string; phone_number: string } | null;
    courier_sorting_quality: string | null;
}

export default function FraudAndTransactionsPage() {
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('bank_sampah_id, role').eq('id', user.id).single();
            const bankId = profile?.bank_sampah_id;
            const isSuper = profile?.role === 'superadmin';

            let query = supabase
                .from('transactions')
                .select(`
                    id, created_at, status, weight_organic, weight_inorganic, amount_earned,
                    admin_weight_organic, admin_weight_inorganic, discrepancy_notes,
                    courier_sorting_quality,
                    citizen:profiles!transactions_user_id_fkey(full_name, phone_number),
                    courier:profiles!transactions_kurir_id_fkey(full_name, phone_number)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!isSuper && bankId) {
                query = query.eq('bank_sampah_id', bankId);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            // Format data
            if (data) {
                setTransactions(data as unknown as TransactionData[]);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    const hasFraudAlert = (tx: TransactionData) => {
        if (tx.admin_weight_organic === null && tx.admin_weight_inorganic === null) return false;
        
        const claimTotal = (tx.weight_organic || 0) + (tx.weight_inorganic || 0);
        const actualTotal = (tx.admin_weight_organic || 0) + (tx.admin_weight_inorganic || 0);
        
        // If discrepancy is > 20% or > 2kg
        const diff = Math.abs(claimTotal - actualTotal);
        if (diff > 2) return true;
        if (claimTotal > 0 && (diff / claimTotal) > 0.2) return true;
        
        return false;
    };

    const StatusBadge = ({ status, isFraud }: { status: string, isFraud: boolean }) => {
        if (isFraud) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Fraud Alert
                </span>
            );
        }
        
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3"/>Selesai</span>;
            case 'pending_audit':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Audit/Gudang</span>;
            case 'picked_up':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Di Kurir</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">{status}</span>;
        }
    };

    const filteredData = transactions.filter(tx => {
        if (filterStatus === 'fraud') return hasFraudAlert(tx);
        if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
        
        if (searchQuery) {
            const lowQuery = searchQuery.toLowerCase();
            const citizenMatch = tx.citizen?.full_name?.toLowerCase().includes(lowQuery);
            const courierMatch = tx.courier?.full_name?.toLowerCase().includes(lowQuery);
            const idMatch = tx.id.toLowerCase().includes(lowQuery);
            return citizenMatch || courierMatch || idMatch;
        }
        return true;
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fraud & Transaksi</h1>
                    <p className="text-sm text-slate-500 mt-1">Pantau lalu-lintas sampah warga, setoran kurir, dan deteksi kecurangan otomatis.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Total Transaksi</p>
                        <h3 className="text-2xl font-black text-slate-800">{transactions.length}</h3>
                    </div>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setFilterStatus('fraud')}>
                    <div>
                        <p className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4" /> Deteksi Fraud
                        </p>
                        <h3 className="text-2xl font-black text-red-700">{transactions.filter(hasFraudAlert).length}</h3>
                    </div>
                </div>
            </div>

            {/* Filter & Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="relative w-full md:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari ID, Nama Warga, atau Kurir..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select 
                            className="w-full md:w-auto px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="picked_up">Sedang di Kurir</option>
                            <option value="pending_audit">Antre Timbang Gudang</option>
                            <option value="completed">Selesai Berhasil</option>
                            <option value="fraud">⚠️ Indikasi Fraud</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">ID Transaksi / Waktu</th>
                                <th className="px-6 py-4">Warga & Kurir</th>
                                <th className="px-6 py-4 text-center">Data Kurir (Input)</th>
                                <th className="px-6 py-4 text-center">Data Gudang (Aktual)</th>
                                <th className="px-6 py-4 text-right">Nilai Rupiah</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading data...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Tidak ada transaksi ditemukan.</td></tr>
                            ) : (
                                filteredData.map((tx) => {
                                    const claimTotal = (tx.weight_organic || 0) + (tx.weight_inorganic || 0);
                                    const actualTotal = tx.admin_weight_organic !== null ? (tx.admin_weight_organic + (tx.admin_weight_inorganic || 0)) : null;
                                    const isFraud = hasFraudAlert(tx);

                                    return (
                                        <tr key={tx.id} className={`hover:bg-slate-50 transition-colors ${isFraud ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-slate-500 mb-1">{tx.id.split('-')[0]}***</div>
                                                <div className="text-slate-800">{new Date(tx.created_at).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short' })}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800">W: {tx.citizen?.full_name || 'Anonim'}</div>
                                                <div className="text-slate-500 text-xs mt-0.5">K: {tx.courier?.full_name || 'Belum dijemput'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {claimTotal > 0 ? (
                                                    <div className="inline-flex bg-slate-100 px-3 py-1 rounded-lg">
                                                        <span className="font-bold text-slate-700">{claimTotal.toFixed(1)} kg</span>
                                                    </div>
                                                ) : <span className="text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {actualTotal !== null ? (
                                                    <div className={`inline-flex px-3 py-1 rounded-lg ${isFraud ? 'bg-red-100 text-red-700 font-bold' : 'bg-emerald-50 text-emerald-700 font-bold'}`}>
                                                        {actualTotal.toFixed(1)} kg
                                                    </div>
                                                ) : <span className="text-slate-400 italic font-mono text-xs">Belum ditimbang</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-slate-800">Rp {tx.amount_earned.toLocaleString('id-ID')}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={tx.status} isFraud={isFraud} />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
