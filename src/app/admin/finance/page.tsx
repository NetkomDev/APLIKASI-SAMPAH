"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Copy, Check, Info, Clock, CheckCircle2, XCircle, CreditCard, ChevronDown } from "lucide-react";
import Link from "next/link";

interface WithdrawRequest {
    id: string;
    created_at: string;
    amount: number;
    bank_name: string;
    account_no: string;
    status: string;
    user_id: string;
    profile: {
        full_name: string;
        phone_number: string;
        role: string;
        bank_sampah_id: string;
        user_wallets: { balance: number }[];
    } | null;
}

export default function PricingFinancePage() {
    const [requests, setRequests] = useState<WithdrawRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("pending");
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase.from('profiles').select('bank_sampah_id, role').eq('id', user.id).single();
            const bankId = profile?.bank_sampah_id;
            const isSuper = profile?.role === 'superadmin';

            let query = supabase
                .from('withdraw_requests')
                .select(`
                    id, created_at, amount, bank_name, account_no, status, user_id,
                    profile:profiles!inner(full_name, phone_number, role, bank_sampah_id, user_wallets(balance))
                `)
                .order('created_at', { ascending: false });

            // If not super admin, filter requests from users belonging to this admin's bank sampah
            if (!isSuper && bankId) {
                query = query.eq('profiles.bank_sampah_id', bankId);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            setRequests(data as unknown as WithdrawRequest[]);
        } catch (error) {
            console.error("Error fetching finance data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string, reqAmount: number, currentBalance: number) => {
        const inputAmount = window.prompt(
            `Ketik nominal yang akan dicairkan/disetujui.\nPastikan Anda sudah memberikan tunai atau transfer!\nSaldo Sistem Aktual: Rp ${currentBalance.toLocaleString('id-ID')}`, 
            (reqAmount === 0 ? currentBalance : reqAmount).toString()
        );
        if (!inputAmount) return; // Cancelled
        
        const amountToDeduct = parseInt(inputAmount.replace(/\D/g, ''), 10);
        if (isNaN(amountToDeduct) || amountToDeduct <= 0) {
            setToast({ message: "Nominal tidak valid", type: "error" });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        if (currentBalance < amountToDeduct) {
            setToast({ message: "Saldo user tidak mencukupi untuk jumlah pencairan ini.", type: "error" });
            setTimeout(() => setToast(null), 3000);
            return;
        }
        
        setProcessingId(id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Execute RPC
            const { error } = await supabase.rpc('approve_withdrawal', {
                p_request_id: id,
                p_admin_id: user!.id,
                p_approved_amount: amountToDeduct
            });

            if (error) throw error;

            setToast({ message: "Pencairan berhasil disetujui, saldo terpotong.", type: "success" });
            fetchData();
        } catch (error: any) {
            setToast({ message: error.message || "Gagal menyetujui", type: "error" });
        } finally {
            setProcessingId(null);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Tolak permintaan pencairan ini? Saldo user utuh.")) return;
        
        setProcessingId(id);
        try {
            const { error } = await supabase
                .from('withdraw_requests')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            setToast({ message: "Pencairan ditolak", type: "success" });
            fetchData();
        } catch (error: any) {
            setToast({ message: "Gagal menolak", type: "error" });
        } finally {
            setProcessingId(null);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const filteredData = requests.filter(r => filterStatus === "all" || r.status === filterStatus);
    
    const CopyButton = ({ text }: { text: string }) => {
        const [copied, setCopied] = useState(false);
        return (
            <button 
                onClick={() => {
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }}
                className="text-slate-400 hover:text-brand-600 transition p-1 rounded hover:bg-slate-100"
                title="Salin No. Rekening"
            >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
        );
    };

    return (
        <div className="space-y-6 pb-20 relative">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5"/>}
                    <p className="text-sm font-semibold">{toast.message}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Pencairan Dana</h1>
                    <p className="text-sm text-slate-500 mt-1">Kelola pencairan dana warga dan kurir (Withdrawal).</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                    <p className="text-sm font-semibold text-amber-600 mb-1 flex items-center gap-2"><Clock className="w-4 h-4"/> Menunggu Persetujuan</p>
                    <h3 className="text-2xl font-black text-amber-700">{requests.filter(r => r.status === 'pending').length}</h3>
                </div>
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    <p className="text-sm font-semibold text-emerald-600 mb-1 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Sudah Disetujui</p>
                    <h3 className="text-2xl font-black text-emerald-700">{requests.filter(r => r.status === 'approved').length}</h3>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-800">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
                <div>
                    <strong>Prosedur Pencairan:</strong> Anda melihat permintaan dari Kurir & Warga. Pastikan Anda <b>mentransfer uang secara manual</b> / tunai terlebih dahulu. Klik "Setujui" hanya jika dana sudah benar-benar diberikan. Menyetujui akan otomatis memotong saldo dompet pengguna di sistem.
                </div>
            </div>

            {/* Main Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Daftar Pengajuan Pencairan</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {["all", "pending", "approved", "rejected"].map(s => (
                            <button 
                                key={s} 
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${filterStatus === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {s === 'all' ? 'Semua' : s === 'pending'? 'Menunggu' : s === 'approved' ? 'Selesai' : 'Ditolak'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Pengguna</th>
                                <th className="px-6 py-4">Waktu Request</th>
                                <th className="px-6 py-4">Tujuan Transfer</th>
                                <th className="px-6 py-4 text-right">Nominal Pengajuan</th>
                                <th className="px-6 py-4 text-right">Saldo Sistem Aktual</th>
                                <th className="px-6 py-4 text-center">Status / Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading data...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Belum ada pengajuan.</td></tr>
                            ) : (
                                filteredData.map((req) => {
                                    const bal = req.profile?.user_wallets?.[0]?.balance || 0;
                                    const insufficient = bal < req.amount;
                                    
                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                    {req.profile?.full_name}
                                                    {req.profile?.role === 'courier' && <span className="bg-brand-100 text-brand-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">KURIR</span>}
                                                </div>
                                                <div className="text-slate-500 text-xs mt-0.5">{req.profile?.phone_number}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(req.created_at).toLocaleString("id-ID", { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-700">{req.bank_name.toUpperCase()}</div>
                                                <div className="font-mono text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                    {req.account_no} <CopyButton text={req.account_no} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-slate-800 text-base">Rp {req.amount.toLocaleString('id-ID')}</div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-medium ${insufficient && req.status === 'pending' ? 'text-red-500' : 'text-slate-600'}`}>
                                                Rp {bal.toLocaleString('id-ID')}
                                                {insufficient && req.status === 'pending' && <p className="text-[10px] text-red-500 mt-0.5">Saldo kurang!</p>}
                                            </td>
                                            <td className="px-6 py-4 flex justify-center">
                                                {req.status === 'pending' ? (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            disabled={processingId === req.id || insufficient}
                                                            onClick={() => handleApprove(req.id, req.amount, bal)}
                                                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {processingId === req.id ? 'Loading' : <><Check className="w-3.5 h-3.5"/> Setujui</>}
                                                        </button>
                                                        <button 
                                                            disabled={processingId === req.id}
                                                            onClick={() => handleReject(req.id)}
                                                            className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </div>
                                                ) : req.status === 'approved' ? (
                                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg">
                                                        <CheckCircle2 className="w-4 h-4"/> Selesai
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg">
                                                        <XCircle className="w-4 h-4"/> Ditolak
                                                    </span>
                                                )}
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
