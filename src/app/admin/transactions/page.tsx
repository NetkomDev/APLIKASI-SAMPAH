"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Search, AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Truck, Info } from "lucide-react";

interface CourierDeposit {
    id: string;
    created_at: string;
    status: string;
    total_organic_claimed: number;
    total_inorganic_claimed: number;
    actual_organic: number | null;
    actual_inorganic: number | null;
    discrepancy_notes: string | null;
    transaction_count: number;
    kurir: { full_name: string; phone_number: string } | null;
}

export default function FraudAndTransactionsPage() {
    const [deposits, setDeposits] = useState<CourierDeposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        fetchDeposits();
    }, []);

    const fetchDeposits = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('bank_sampah_id, role').eq('id', user.id).single();
            const bankId = profile?.bank_sampah_id;
            const isSuper = profile?.role === 'superadmin';

            let query = supabase
                .from('courier_deposits')
                .select(`
                    id, created_at, status, total_organic_claimed, total_inorganic_claimed,
                    actual_organic, actual_inorganic, discrepancy_notes, transaction_count,
                    kurir:profiles!courier_deposits_kurir_id_fkey(full_name, phone_number)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (!isSuper && bankId) {
                query = query.eq('bank_sampah_id', bankId);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            if (data) setDeposits(data as unknown as CourierDeposit[]);
        } catch (error) {
            console.error("Error fetching deposits:", error);
        } finally {
            setLoading(false);
        }
    };

    const hasFraudAlert = (dep: CourierDeposit) => {
        if (dep.actual_organic === null && dep.actual_inorganic === null) return false;
        
        const claimTotal = (dep.total_organic_claimed || 0) + (dep.total_inorganic_claimed || 0);
        const actualTotal = (dep.actual_organic || 0) + (dep.actual_inorganic || 0);
        
        // Discrepancy > 2kg or > 20%
        const diff = Math.abs(claimTotal - actualTotal);
        if (diff > 2) return true;
        if (claimTotal > 0 && (diff / claimTotal) > 0.2) return true;
        
        return false;
    };

    const StatusBadge = ({ status, isFraud }: { status: string, isFraud: boolean }) => {
        if (isFraud) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Indikasi Fraud
                </span>
            );
        }
        
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3"/>Selesai Audit</span>;
            case 'pending_audit':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Antre Timbang</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase"><XCircle className="w-3 h-3"/>Ditolak</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase">{status}</span>;
        }
    };

    const filteredData = deposits.filter(dep => {
        if (filterStatus === 'fraud') return hasFraudAlert(dep);
        if (filterStatus !== 'all' && dep.status !== filterStatus) return false;
        
        if (searchQuery) {
            const lowQuery = searchQuery.toLowerCase();
            const courierMatch = dep.kurir?.full_name?.toLowerCase().includes(lowQuery);
            const idMatch = dep.id.toLowerCase().includes(lowQuery);
            return courierMatch || idMatch;
        }
        return true;
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Fraud & Manifest</h1>
                    <p className="text-sm text-slate-500 mt-1">Audit kesesuaian klaim total Armada Kurir vs aktual timbangan Gudang.</p>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <div>
                    <strong>Info Operasional:</strong> Admin Bank Sampah menimbang <b>Akumulasi Total</b> satu armada kurir (bukan sampah warga satu per satu). Sistem mendeteksi <i>Fraud</i> otomatis jika klaim total armada meleset parah dengan angka timbangan aktual gudang.
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 mb-1">Total Setoran / Manifest</p>
                        <h3 className="text-2xl font-black text-slate-800">{deposits.length}</h3>
                    </div>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setFilterStatus('fraud')}>
                    <div>
                        <p className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4" /> Manifest Fraud Alert
                        </p>
                        <h3 className="text-2xl font-black text-red-700">{deposits.filter(hasFraudAlert).length}</h3>
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
                            placeholder="Cari ID Manifest atau Nama Kurir..." 
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select 
                            className="w-full md:w-auto px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium shadow-sm"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Semua Manifest</option>
                            <option value="pending_audit">Antre Timbang</option>
                            <option value="approved">Selesai Audit</option>
                            <option value="fraud">⚠️ Indikasi Fraud</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">ID Manifest / Waktu</th>
                                <th className="px-6 py-4">Armada Kurir</th>
                                <th className="px-6 py-4 text-center">Isi Muatan</th>
                                <th className="px-6 py-4 text-center">Klaim Total Kurir</th>
                                <th className="px-6 py-4 text-center">Timbangan Admin</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading data...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Tidak ada manifest ditemukan.</td></tr>
                            ) : (
                                filteredData.map((dep) => {
                                    const claimTotal = (dep.total_organic_claimed || 0) + (dep.total_inorganic_claimed || 0);
                                    const actualTotal = dep.actual_organic !== null ? (dep.actual_organic + (dep.actual_inorganic || 0)) : null;
                                    const isFraud = hasFraudAlert(dep);

                                    return (
                                        <tr key={dep.id} className={`hover:bg-slate-50 transition-colors ${isFraud ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-bold text-slate-700 tracking-wider mb-1">M-{dep.id.split('-')[0].toUpperCase()}</div>
                                                <div className="text-slate-500 text-[11px]">{new Date(dep.created_at).toLocaleString("id-ID", { dateStyle: 'short', timeStyle: 'short' })}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                    <Truck className="w-4 h-4 text-brand-500" />
                                                    {dep.kurir?.full_name || 'Anonim'}
                                                </div>
                                                <div className="text-slate-500 text-xs mt-0.5">{dep.kurir?.phone_number}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold">
                                                    {dep.transaction_count} Titik Rumah
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1 rounded-lg">
                                                    <span className="font-bold">{claimTotal.toFixed(1)} kg</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {actualTotal !== null ? (
                                                    <div className={`inline-flex px-3 py-1 rounded-lg border ${isFraud ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                        <span className="font-bold">{actualTotal.toFixed(1)} kg</span>
                                                    </div>
                                                ) : <span className="text-slate-400 italic font-mono text-xs">Menunggu Proses</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <StatusBadge status={dep.status} isFraud={isFraud} />
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
