"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { PlusCircle, PackageCheck, FileSpreadsheet, Scale, Clock, AlertCircle, Settings2, X, Trash2, Plus } from "lucide-react";

interface InventoryRecord {
    id: string;
    category: string;
    weight_kg: number;
    recorded_at: string;
    quality_grade?: string | null;
    batch_number?: string | null;
    notes?: string | null;
    profiles: {
        full_name: string;
    };
}

export default function InventoryPage() {
    const [records, setRecords] = useState<InventoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [outboundCategories, setOutboundCategories] = useState<{id: string, name: string, default_price_per_kg: number}[]>([]);
    const [category, setCategory] = useState("");
    const [weight, setWeight] = useState("");
    const [qualityGrade, setQualityGrade] = useState("Grade A (Premium)");
    const [batchNumber, setBatchNumber] = useState("");
    const [notes, setNotes] = useState("");
    const [bankId, setBankId] = useState<string | null>(null);

    // Category Management
    const [showCatManager, setShowCatManager] = useState(false);
    const [newCatName, setNewCatName] = useState("");
    const [newCatPrice, setNewCatPrice] = useState("");

    // Feedback
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch profiles to get bank_sampah_id and role
            const { data: profile } = await supabase
                .from("profiles")
                .select("bank_sampah_id, role")
                .eq("id", user.id)
                .single();

            // Block access only if regular admin without a branch
            if (!profile?.bank_sampah_id && profile?.role !== 'superadmin') return;
            setBankId(profile.bank_sampah_id);

            // Fetch LOCAL product categories for this unit
            if (profile.bank_sampah_id) {
                const { data: cats } = await supabase
                    .from('unit_product_categories')
                    .select('id, name, default_price_per_kg')
                    .eq('bank_sampah_id', profile.bank_sampah_id)
                    .eq('is_active', true)
                    .order('name');
                if (cats && cats.length > 0) {
                    setOutboundCategories(cats);
                    setCategory(cats[0].name);
                }
            }

            // Notice: The `inventory_outputs` table must exist in Supabase!
            // Wait to run the SQL migration manually in Supabase SQL Editor.
            let query = supabase
                .from("inventory_outputs")
                .select(`
                    id, 
                    category, 
                    weight_kg, 
                    recorded_at,
                    quality_grade,
                    batch_number,
                    notes,
                    profiles:recorded_by (full_name)
                `)
                .order("recorded_at", { ascending: false })
                .limit(50);

            // Isolate data ONLY if not superadmin
            if (profile?.role !== 'superadmin') {
                query = query.eq("bank_sampah_id", profile.bank_sampah_id);
            }

            const { data, error } = await query;

            if (error) {
                // If table doesn't exist yet, simply silence it or log
                if (error.code !== '42P01') {
                    console.error("Error fetching inventory:", error);
                }
                setRecords([]);
            } else {
                setRecords(data as any || []);
            }
        } catch (error) {
            console.error("Critical fail:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSumbit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!weight || Number(weight) <= 0) {
            setMessage({ type: 'error', text: 'Berat (Kg) harus lebih dari 0' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthenticated");

            const { data: profile } = await supabase
                .from("profiles")
                .select("bank_sampah_id")
                .eq("id", user.id)
                .single();

            if (!profile?.bank_sampah_id) throw new Error("Bukan Admin / Operator Cabang Bank Sampah");

            const autoBatch = `BTN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`;

            const { error } = await supabase
                .from("inventory_outputs")
                .insert({
                    bank_sampah_id: profile.bank_sampah_id,
                    recorded_by: user.id,
                    category: category,
                    weight_kg: Number(weight),
                    quality_grade: qualityGrade,
                    batch_number: batchNumber.trim() || autoBatch,
                    notes: notes.trim() || null
                });

            if (error && error.code === '42P01') {
                throw new Error("Tabel 'inventory_outputs' belum ditambahkan di Supabase. Harap hubungi Super Admin untuk menjalankan SQL Migration.");
            } else if (error) {
                throw error;
            }

            setMessage({ type: 'success', text: 'Data produksi berhasil dicatat!' });
            setWeight("");
            setBatchNumber("");
            setNotes("");
            fetchRecords();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Gagal menyimpan rincian." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Produksi & Gudang</h1>
                <p className="text-sm text-slate-500 mt-1">Catat dan pantau hasil output olahan Bank Sampah (Gudang Induk).</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {message.type === 'error' ? <AlertCircle className="h-5 w-5 flex-shrink-0" /> : <PackageCheck className="h-5 w-5 flex-shrink-0" />}
                    <p className="mt-0.5 font-medium">{message.text}</p>
                </div>
            )}

            {/* Category Manager Panel */}
            {showCatManager && (
                <div className="bg-white border border-brand-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-brand-50 rounded-lg"><Settings2 className="h-4 w-4 text-brand-600" /></div>
                            <h3 className="text-sm font-bold text-slate-800">Kelola Kategori Olahan Lokal</h3>
                        </div>
                        <button onClick={() => setShowCatManager(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X className="h-4 w-4 text-slate-500" /></button>
                    </div>
                    <p className="text-xs text-slate-500">Kategori ini bersifat lokal — hanya berlaku untuk unit Bank Sampah ini. Tidak bercampur dengan unit lain.</p>

                    {/* Existing categories */}
                    <div className="space-y-2">
                        {outboundCategories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                                <div>
                                    <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                                    <span className="text-xs text-slate-400 ml-2">Rp {Number(cat.default_price_per_kg).toLocaleString('id-ID')}/Kg</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (!confirm(`Nonaktifkan kategori "${cat.name}"?`)) return;
                                        await supabase.from('unit_product_categories').update({ is_active: false }).eq('id', cat.id);
                                        setOutboundCategories(prev => prev.filter(c => c.id !== cat.id));
                                        setMessage({ type: 'success', text: `Kategori "${cat.name}" dinonaktifkan.` });
                                    }}
                                    className="p-1.5 hover:bg-red-100 rounded-lg transition text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add new category */}
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nama Kategori Baru</label>
                            <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Misal: Minyak Jelantah" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="w-36">
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Harga/Kg</label>
                            <input type="number" min="0" value={newCatPrice} onChange={e => setNewCatPrice(e.target.value)} placeholder="0" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <button
                            onClick={async () => {
                                if (!newCatName.trim() || !bankId) return;
                                const { data, error } = await supabase.from('unit_product_categories').insert({
                                    bank_sampah_id: bankId,
                                    name: newCatName.trim(),
                                    default_price_per_kg: Number(newCatPrice) || 0,
                                }).select('id, name, default_price_per_kg').single();
                                if (error) {
                                    setMessage({ type: 'error', text: error.code === '23505' ? `Kategori "${newCatName}" sudah ada.` : error.message });
                                    return;
                                }
                                if (data) {
                                    setOutboundCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                                    setNewCatName(""); setNewCatPrice("");
                                    setMessage({ type: 'success', text: `Kategori "${data.name}" berhasil ditambahkan!` });
                                }
                            }}
                            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition whitespace-nowrap flex items-center gap-1.5"
                        >
                            <Plus className="h-4 w-4" /> Tambah
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Input Panel */}
                <div className="lg:col-span-1 border border-slate-200 bg-white shadow-sm p-6 rounded-2xl h-fit sticky top-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <PlusCircle className="h-5 w-5 text-brand-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Catat Output Baru</h2>
                    </div>

                    <form onSubmit={handleSumbit} className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategori Olahan</label>
                                <button type="button" onClick={() => setShowCatManager(!showCatManager)} className="text-[10px] font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 transition">
                                    <Settings2 className="h-3 w-3" /> Kelola
                                </button>
                            </div>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            >
                                {outboundCategories.length === 0 ? (
                                    <option value="">Belum ada kategori</option>
                                ) : (
                                    outboundCategories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Kualitas / Grade</label>
                            <select
                                value={qualityGrade}
                                onChange={(e) => setQualityGrade(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            >
                                <option value="Grade A (Premium)">Grade A (Premium)</option>
                                <option value="Grade B (Standar)">Grade B (Standar)</option>
                                <option value="Grade C (Sortiran/Afkir)">Grade C (Sortiran/Afkir)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Total Berat Timbangan</label>
                            <div className="relative">
                                <Scale className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Kg</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nomor Batch (Opsi)</label>
                                <input
                                    type="text"
                                    placeholder="Auto-Generate"
                                    value={batchNumber}
                                    onChange={(e) => setBatchNumber(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 uppercase"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Catatan Produksi</label>
                                <textarea
                                    rows={2}
                                    placeholder="Opsional: Keterangan tambahan hasil produksi..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full mt-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all focus:ring-4 focus:ring-brand-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Pencatatan'}
                        </button>
                    </form>
                </div>

                {/* Table History Panel */}
                <div className="lg:col-span-2 border border-slate-200 bg-white shadow-sm p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Riwayat Produksi Gudang</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">50 Terakhir</span>
                    </div>

                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center">
                            <div className="h-8 w-8 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                            <PackageCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Belum ada catatan produksi</p>
                            <p className="text-xs text-slate-400 mt-1">Gunakan form di samping untuk mencatat output pertama.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <th className="py-4 pl-2">Waktu Catat</th>
                                        <th className="py-4">Kategori Output</th>
                                        <th className="py-4 text-right">Berat Timbangan</th>
                                        <th className="py-4 pl-6">Operator</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {records.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-4 pl-2 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold text-slate-800">
                                                        {new Date(r.recorded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 w-fit px-2 py-0.5 rounded border border-slate-200">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(r.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 font-medium text-slate-800">
                                                <div className="flex flex-col gap-1.5">
                                                    <div>
                                                        <span className={`px-2.5 py-1 rounded-md text-xs border font-semibold ${r.category.includes('Organik') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            r.category.includes('Kertas') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                            {r.category}
                                                        </span>
                                                    </div>
                                                    {r.quality_grade && (
                                                        <span className="text-xs text-slate-500">Grade: {r.quality_grade.replace('Grade ', '')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 text-right">
                                                <p className="font-black text-slate-700 whitespace-nowrap">{r.weight_kg.toLocaleString('id-ID')} <span className="text-xs text-slate-400 font-medium">Kg</span></p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">{r.batch_number}</p>
                                            </td>
                                            <td className="py-4 pl-6">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-700">
                                                        {(r.profiles?.full_name || 'S').charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700 capitalize">{r.profiles?.full_name || 'Sistem Otomatis'}</p>
                                                </div>
                                                {r.notes && (
                                                    <p className="text-[10px] text-slate-500 line-clamp-2 max-w-[160px] italic border-l-2 border-slate-200 pl-2 ml-1">"{r.notes}"</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
