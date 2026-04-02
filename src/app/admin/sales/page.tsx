"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
    ShoppingBag, Plus, Search, Package, Banknote, TrendingUp,
    CheckCircle2, Clock, XCircle, AlertCircle, X, Receipt
} from "lucide-react";
import clsx from "clsx";

interface ProductSale {
    id: string;
    product_name: string;
    product_category: string;
    quality_grade: string | null;
    weight_kg: number;
    price_per_kg: number;
    total_price: number;
    buyer_name: string;
    buyer_company: string | null;
    invoice_number: string | null;
    payment_status: string;
    payment_method: string | null;
    notes: string | null;
    sold_at: string;
    profiles: { full_name: string } | null;
}

interface B2BBuyer {
    id: string;
    company_name: string;
    contact_person: string;
    phone_number: string;
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    paid: { label: "Lunas", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    partial: { label: "Sebagian", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
    unpaid: { label: "Belum Bayar", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

const PRODUCT_CATEGORIES = [
    "Maggot BSF Kering", "Maggot BSF Segar", "Pupuk Kompos", "BBM Pirolisis",
    "Logam Besi", "Logam Aluminium/Kaleng", "Plastik Cacahan (PET)",
    "Plastik Cacahan (PP/PE)", "Kertas/Kardus Press", "Beling / Botol Kaca",
    "Minyak Jelantah", "E-Waste / Elektronik", "Kain/Tekstil Bekas", "Lainnya"
];

export default function AdminSalesPage() {
    const [sales, setSales] = useState<ProductSale[]>([]);
    const [buyers, setBuyers] = useState<B2BBuyer[]>([]);
    const [loading, setLoading] = useState(true);
    const [bankId, setBankId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form
    const [formData, setFormData] = useState({
        product_name: PRODUCT_CATEGORIES[0],
        quality_grade: "Grade A (Premium)",
        weight_kg: "",
        price_per_kg: "",
        buyer_name: "",
        buyer_company: "",
        b2b_buyer_id: "",
        payment_status: "unpaid" as string,
        payment_method: "",
        notes: ""
    });

    useEffect(() => {
        initData();
    }, []);

    const initData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from("profiles")
            .select("bank_sampah_id")
            .eq("id", user.id)
            .single();

        if (!profile?.bank_sampah_id) { setLoading(false); return; }
        setBankId(profile.bank_sampah_id);

        const { data: buyerData } = await supabase
            .from("b2b_buyers")
            .select("id, company_name, contact_person, phone_number")
            .eq("status", "active");
        if (buyerData) setBuyers(buyerData);

        await fetchSales(profile.bank_sampah_id);
    };

    const fetchSales = useCallback(async (unitId: string) => {
        const { data, error } = await supabase
            .from("product_sales")
            .select(`
                id, product_name, product_category, quality_grade, weight_kg,
                price_per_kg, total_price, buyer_name, buyer_company,
                invoice_number, payment_status, payment_method, notes, sold_at,
                profiles:sold_by (full_name)
            `)
            .eq("bank_sampah_id", unitId)
            .order("sold_at", { ascending: false })
            .limit(100);

        if (!error && data) setSales(data as any);
        setLoading(false);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankId) return;
        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthenticated");

            const weightKg = Number(formData.weight_kg);
            const pricePerKg = Number(formData.price_per_kg);
            const totalPrice = Math.round(weightKg * pricePerKg);

            const autoInvoice = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

            const { error } = await supabase.from("product_sales").insert({
                bank_sampah_id: bankId,
                product_name: formData.product_name,
                product_category: "processed",
                quality_grade: formData.quality_grade,
                weight_kg: weightKg,
                price_per_kg: pricePerKg,
                total_price: totalPrice,
                buyer_name: formData.buyer_name,
                buyer_company: formData.buyer_company || null,
                b2b_buyer_id: formData.b2b_buyer_id || null,
                invoice_number: autoInvoice,
                payment_status: formData.payment_status,
                payment_method: formData.payment_method || null,
                notes: formData.notes || null,
                sold_by: user.id,
            });

            if (error) throw error;

            setShowModal(false);
            setFormData({
                product_name: PRODUCT_CATEGORIES[0],
                quality_grade: "Grade A (Premium)",
                weight_kg: "", price_per_kg: "",
                buyer_name: "", buyer_company: "", b2b_buyer_id: "",
                payment_status: "unpaid", payment_method: "", notes: ""
            });
            await fetchSales(bankId);
        } catch (err: any) {
            alert("Gagal mencatat penjualan: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectBuyer = (buyerId: string) => {
        const buyer = buyers.find(b => b.id === buyerId);
        if (buyer) {
            setFormData(prev => ({
                ...prev,
                b2b_buyer_id: buyerId,
                buyer_name: buyer.contact_person,
                buyer_company: buyer.company_name,
            }));
        }
    };

    const handleUpdatePayment = async (saleId: string, newStatus: string) => {
        await supabase.from("product_sales").update({ payment_status: newStatus }).eq("id", saleId);
        if (bankId) await fetchSales(bankId);
    };

    // Stats
    const totalRevenue = sales.reduce((s, sale) => s + (sale.total_price || 0), 0);
    const totalPaid = sales.filter(s => s.payment_status === 'paid').reduce((s, sale) => s + (sale.total_price || 0), 0);
    const totalUnpaid = sales.filter(s => s.payment_status !== 'paid').reduce((s, sale) => s + (sale.total_price || 0), 0);
    const totalWeight = sales.reduce((s, sale) => s + (sale.weight_kg || 0), 0);

    const filtered = sales.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.product_name.toLowerCase().includes(q) ||
            s.buyer_name.toLowerCase().includes(q) ||
            s.buyer_company?.toLowerCase().includes(q) ||
            s.invoice_number?.toLowerCase().includes(q);
    });

    const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Penjualan Produk</h1>
                    <p className="text-sm text-slate-500 mt-1">Catat penjualan produk olahan Bank Sampah ke buyer.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.97]"
                >
                    <Plus className="w-5 h-5" /> Catat Penjualan Baru
                </button>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Penjualan", value: formatRp(totalRevenue), icon: TrendingUp, gradient: "from-brand-500 to-emerald-500", shadow: "shadow-brand-500/20" },
                    { label: "Sudah Dibayar", value: formatRp(totalPaid), icon: CheckCircle2, gradient: "from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20" },
                    { label: "Belum Dibayar", value: formatRp(totalUnpaid), icon: Clock, gradient: "from-amber-500 to-orange-500", shadow: "shadow-amber-500/20" },
                    { label: "Total Terjual", value: `${totalWeight.toLocaleString('id-ID')} Kg`, icon: Package, gradient: "from-blue-500 to-indigo-500", shadow: "shadow-blue-500/20" },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white shadow-xl ${s.shadow} relative overflow-hidden`}>
                        <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{s.label}</p>
                                <div className="p-2 bg-white/20 rounded-xl"><s.icon className="h-4 w-4" /></div>
                            </div>
                            <p className="text-2xl font-black">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari produk, buyer, atau nomor invoice..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white transition"
                    />
                </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center"><div className="h-8 w-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Belum ada data penjualan</p>
                        <p className="text-xs text-slate-400 mt-1">Klik tombol "Catat Penjualan Baru" untuk mulai.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                                    <th className="py-4 px-4">Tanggal</th>
                                    <th className="py-4 px-4">Produk</th>
                                    <th className="py-4 px-4">Buyer</th>
                                    <th className="py-4 px-4 text-right">Berat</th>
                                    <th className="py-4 px-4 text-right">Total Harga</th>
                                    <th className="py-4 px-4 text-center">Status</th>
                                    <th className="py-4 px-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {filtered.map((sale) => {
                                    const st = PAYMENT_STATUS_MAP[sale.payment_status] || PAYMENT_STATUS_MAP.unpaid;
                                    return (
                                        <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-semibold text-slate-700">{new Date(sale.sold_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.invoice_number}</p>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <p className="font-semibold text-slate-800">{sale.product_name}</p>
                                                {sale.quality_grade && <p className="text-[10px] text-slate-400">{sale.quality_grade}</p>}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <p className="font-medium text-slate-700">{sale.buyer_name}</p>
                                                {sale.buyer_company && <p className="text-[10px] text-slate-400">{sale.buyer_company}</p>}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-slate-700">{sale.weight_kg} <span className="text-xs text-slate-400 font-normal">Kg</span></td>
                                            <td className="py-3.5 px-4 text-right font-bold text-brand-600">{formatRp(sale.total_price)}</td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={clsx("inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border", st.color)}>
                                                    <st.icon className="w-3 h-3" /> {st.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {sale.payment_status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleUpdatePayment(sale.id, 'paid')}
                                                        className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Tandai Lunas
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Sale Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-100 rounded-lg"><Receipt className="w-5 h-5 text-brand-600" /></div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">Catat Penjualan Produk</h3>
                                    <p className="text-xs text-slate-500">Catat transaksi jual produk olahan ke buyer</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Produk</label>
                                    <select value={formData.product_name} onChange={e => setFormData(p => ({ ...p, product_name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                                        {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Grade Kualitas</label>
                                    <select value={formData.quality_grade} onChange={e => setFormData(p => ({ ...p, quality_grade: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                                        <option value="Grade A (Premium)">Grade A (Premium)</option>
                                        <option value="Grade B (Standar)">Grade B (Standar)</option>
                                        <option value="Grade C (Sortiran)">Grade C (Sortiran)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Berat (Kg)</label>
                                    <input type="number" step="0.1" min="0" required value={formData.weight_kg} onChange={e => setFormData(p => ({ ...p, weight_kg: e.target.value }))} placeholder="0.0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Harga per Kg (Rp)</label>
                                    <input type="number" min="0" required value={formData.price_per_kg} onChange={e => setFormData(p => ({ ...p, price_per_kg: e.target.value }))} placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500" />
                                </div>
                            </div>

                            {formData.weight_kg && formData.price_per_kg && (
                                <div className="bg-brand-50 border-2 border-brand-200 rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-brand-700">Total Nilai Jual</span>
                                    <span className="text-2xl font-black text-brand-600">
                                        {formatRp(Math.round(Number(formData.weight_kg) * Number(formData.price_per_kg)))}
                                    </span>
                                </div>
                            )}

                            <hr className="border-slate-200" />

                            {buyers.length > 0 && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Pilih dari Daftar Buyer (Opsional)</label>
                                    <select value={formData.b2b_buyer_id} onChange={e => handleSelectBuyer(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                                        <option value="">-- Buyer Manual --</option>
                                        {buyers.map(b => <option key={b.id} value={b.id}>{b.company_name} ({b.contact_person})</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nama Pembeli</label>
                                    <input type="text" required value={formData.buyer_name} onChange={e => setFormData(p => ({ ...p, buyer_name: e.target.value }))} placeholder="Nama lengkap pembeli" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Perusahaan (Opsional)</label>
                                    <input type="text" value={formData.buyer_company} onChange={e => setFormData(p => ({ ...p, buyer_company: e.target.value }))} placeholder="Nama perusahaan" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status Pembayaran</label>
                                    <select value={formData.payment_status} onChange={e => setFormData(p => ({ ...p, payment_status: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500">
                                        <option value="unpaid">Belum Bayar</option>
                                        <option value="partial">Sebagian</option>
                                        <option value="paid">Lunas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Metode Bayar (Opsional)</label>
                                    <select value={formData.payment_method} onChange={e => setFormData(p => ({ ...p, payment_method: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500">
                                        <option value="">Pilih Metode</option>
                                        <option value="cash">Tunai / Cash</option>
                                        <option value="transfer">Transfer Bank</option>
                                        <option value="ewallet">E-Wallet (DANA/OVO/GoPay)</option>
                                        <option value="credit">Kredit / Tempo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Catatan (Opsional)</label>
                                <textarea rows={2} value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Keterangan tambahan..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-brand-500" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 bg-white border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition text-sm">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-brand-600 border-2 border-brand-600 text-white font-bold rounded-xl hover:bg-brand-500 transition text-sm shadow-lg disabled:opacity-70">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Penjualan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
