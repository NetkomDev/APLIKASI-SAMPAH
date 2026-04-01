"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Tag, Factory, Plus, Edit, Trash2, X, AlertCircle, Store, Users, Building2, RefreshCw, Phone } from "lucide-react";

interface UnitPrice {
    id: string;
    bank_sampah_unit_id: string;
    trade_type: 'buy_from_citizen' | 'sell_outbound';
    category: string;
    name: string;
    price_per_kg: number;
    unit: string;
    is_active: boolean;
}

interface B2BBuyer {
    id: string;
    company_name: string;
    contact_person: string;
    phone_number: string;
    commodity_interest: string;
    demand_volume_kg: number;
    buying_price_per_kg: number;
    status: string;
}

interface BankSampahUnit {
    id: string;
    name: string;
}

const CATEGORIES = ["organic", "inorganic", "processed", "other"];
const CAT_COLORS: Record<string, string> = {
    organic: "text-emerald-600",
    inorganic: "text-blue-600",
    processed: "text-amber-600",
    other: "text-slate-500",
};

export default function AdminPricingPage() {
    const [unitId, setUnitId] = useState<string | null>(null);
    const [unitName, setUnitName] = useState("");
    const [activeTab, setActiveTab] = useState<"inbound" | "outbound" | "buyers">("inbound");

    const [prices, setPrices] = useState<UnitPrice[]>([]);
    const [buyers, setBuyers] = useState<B2BBuyer[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<UnitPrice>>({});

    // Add state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newItem, setNewItem] = useState<Partial<UnitPrice>>({
        trade_type: 'buy_from_citizen', unit: 'kg', is_active: true, category: 'inorganic'
    });

    // Fetch unit milik admin yang login
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: unit } = await supabase
                .from("bank_sampah_units")
                .select("id, name")
                .eq("created_by", user.id)
                .single();

            if (unit) {
                setUnitId(unit.id);
                setUnitName(unit.name);
            }
        };
        init();
    }, []);

    const fetchData = useCallback(async () => {
        if (!unitId) return;
        setLoading(true);
        try {
            const [priceRes, buyerRes] = await Promise.all([
                supabase.from("unit_commodity_prices")
                    .select("*")
                    .eq("bank_sampah_unit_id", unitId)
                    .order("category").order("name"),
                supabase.from("b2b_buyers")
                    .select("*")
                    .eq("status", "active")
                    .order("company_name"),
            ]);
            if (priceRes.data) setPrices(priceRes.data);
            if (buyerRes.data) setBuyers(buyerRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [unitId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async () => {
        if (!newItem.name || !newItem.price_per_kg || !unitId) {
            alert("Harap lengkapi nama item dan harga."); return;
        }
        const { error } = await supabase.from("unit_commodity_prices").insert([{
            ...newItem, bank_sampah_unit_id: unitId
        }]);
        if (error) { alert("Gagal menyimpan: " + error.message); return; }
        setShowAddModal(false);
        setNewItem({ trade_type: 'buy_from_citizen', unit: 'kg', is_active: true, category: 'inorganic' });
        fetchData();
    };

    const handleUpdate = async (id: string) => {
        const { error } = await supabase.from("unit_commodity_prices").update({
            name: editData.name, price_per_kg: editData.price_per_kg,
            category: editData.category, updated_at: new Date().toISOString()
        }).eq("id", id);
        if (error) { alert("Gagal update"); return; }
        setEditingId(null);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus item ini?")) return;
        await supabase.from("unit_commodity_prices").delete().eq("id", id);
        fetchData();
    };

    const inbound = prices.filter(p => p.trade_type === "buy_from_citizen");
    const outbound = prices.filter(p => p.trade_type === "sell_outbound");

    const openAdd = (type: "buy_from_citizen" | "sell_outbound") => {
        setNewItem({ trade_type: type, unit: 'kg', is_active: true, category: type === 'buy_from_citizen' ? 'inorganic' : 'processed' });
        setShowAddModal(true);
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Tag className="w-7 h-7 text-brand-600" /> Harga Komoditas
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Kelola harga jual-beli komoditas sampah secara mandiri untuk unit <strong>{unitName}</strong>.
                    </p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:border-slate-400 text-sm transition">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                {[
                    { key: "inbound", label: "🏠 Beli dari Warga", count: inbound.length },
                    { key: "outbound", label: "🏭 Jual ke Luar Gudang", count: outbound.length },
                    { key: "buyers", label: "🤝 Daftar Buyer B2B", count: buyers.length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.key
                            ? "border-brand-600 text-brand-700"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        {tab.label}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === tab.key ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-500"}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* TAB: INBOUND */}
                    {activeTab === "inbound" && (
                        <PriceSection
                            title="Daftar Harga Beli dari Warga (Inbound)"
                            icon={<Store className="w-5 h-5 text-brand-600" />}
                            items={inbound}
                            editingId={editingId}
                            editData={editData}
                            onEdit={(p) => { setEditingId(p.id); setEditData(p); }}
                            onCancelEdit={() => setEditingId(null)}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            setEditData={setEditData}
                            onAdd={() => openAdd("buy_from_citizen")}
                            addLabel="+ Tambah Komoditas Inbound"
                            priceColor="text-brand-700"
                            emptyText="Belum ada komoditas inbound. Tambahkan barang yang Anda beli dari warga."
                        />
                    )}

                    {/* TAB: OUTBOUND */}
                    {activeTab === "outbound" && (
                        <PriceSection
                            title="Daftar Harga Jual ke Luar Gudang (Outbound)"
                            icon={<Factory className="w-5 h-5 text-amber-600" />}
                            items={outbound}
                            editingId={editingId}
                            editData={editData}
                            onEdit={(p) => { setEditingId(p.id); setEditData(p); }}
                            onCancelEdit={() => setEditingId(null)}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            setEditData={setEditData}
                            onAdd={() => openAdd("sell_outbound")}
                            addLabel="+ Tambah Komoditas Outbound"
                            priceColor="text-amber-600"
                            emptyText="Belum ada komoditas outbound. Tambahkan produk hasil olahan yang Anda jual ke buyer."
                        />
                    )}

                    {/* TAB: BUYERS */}
                    {activeTab === "buyers" && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between p-5 border-b border-slate-100">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-slate-600" /> Daftar Buyer B2B Aktif
                                </h3>
                                <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{buyers.length} buyer aktif</span>
                            </div>
                            {buyers.length === 0 ? (
                                <div className="text-center py-16">
                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">Belum ada buyer B2B terdaftar.<br />Hubungi SuperAdmin untuk menambahkan buyer.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                                            <tr>
                                                <th className="px-5 py-3">Perusahaan / Kontak</th>
                                                <th className="px-5 py-3">Komoditas Target</th>
                                                <th className="px-5 py-3 text-center">Volume (kg)</th>
                                                <th className="px-5 py-3 text-right">Harga Berani Beli</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {buyers.map(b => (
                                                <tr key={b.id} className="hover:bg-slate-50">
                                                    <td className="px-5 py-4">
                                                        <div className="font-bold text-slate-900">{b.company_name}</div>
                                                        <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-3 h-3" /> {b.contact_person} · {b.phone_number}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold border border-brand-100">
                                                            {b.commodity_interest}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center font-mono font-bold text-slate-700">
                                                        {b.demand_volume_kg?.toLocaleString('id-ID')} kg
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-bold text-amber-600">
                                                        Rp {b.buying_price_per_kg?.toLocaleString('id-ID')}/kg
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Modal Tambah Item */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                                {newItem.trade_type === 'buy_from_citizen'
                                    ? <><Store className="w-5 h-5 text-brand-600" /> Item Inbound (Beli dari Warga)</>
                                    : <><Factory className="w-5 h-5 text-amber-600" /> Item Outbound (Jual ke Buyer)</>
                                }
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Kategori</label>
                                <select value={newItem.category}
                                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
                                    <option value="organic">Organic</option>
                                    <option value="inorganic">Inorganic</option>
                                    <option value="processed">Processed (Hasil Olahan)</option>
                                    <option value="other">Lainnya</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nama Item *</label>
                                <input type="text" value={newItem.name || ''}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                    placeholder="Contoh: Plastik PET Bersih" />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                                        {newItem.trade_type === 'buy_from_citizen' ? 'Harga Beli (Rp)' : 'Harga Jual (Rp)'}
                                    </label>
                                    <span className="absolute left-4 bottom-3 text-slate-400 font-bold text-sm">Rp</span>
                                    <input type="number" min="0" value={newItem.price_per_kg || ''}
                                        onChange={e => setNewItem({ ...newItem, price_per_kg: Number(e.target.value) })}
                                        className="w-full border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                        placeholder="0" />
                                </div>
                                <div className="w-20">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Satuan</label>
                                    <input type="text" value={newItem.unit || 'kg'}
                                        onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                                        placeholder="kg" />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t flex justify-end gap-3">
                            <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Batal</button>
                            <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-md">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PriceSection({ title, icon, items, editingId, editData, onEdit, onCancelEdit, onUpdate, onDelete, setEditData, onAdd, addLabel, priceColor, emptyText }: {
    title: string; icon: React.ReactNode; items: UnitPrice[];
    editingId: string | null; editData: Partial<UnitPrice>;
    onEdit: (item: UnitPrice) => void; onCancelEdit: () => void;
    onUpdate: (id: string) => void; onDelete: (id: string) => void;
    setEditData: (d: Partial<UnitPrice>) => void;
    onAdd: () => void; addLabel: string; priceColor: string; emptyText: string;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">{icon}{title}</h3>
                <button onClick={onAdd} className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-400 px-3 py-1.5 rounded-xl transition bg-brand-50">
                    <Plus className="w-3.5 h-3.5" /> {addLabel}
                </button>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">{emptyText}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {items.map(item => (
                        <div key={item.id} className="border border-slate-200 rounded-xl p-4 hover:border-brand-200 hover:shadow-sm transition-all group">
                            {editingId === item.id ? (
                                <div className="space-y-3">
                                    <input type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-brand-500" />
                                    <div className="flex gap-2">
                                        <select value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })}
                                            className="w-1/2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input type="number" value={editData.price_per_kg || ''} onChange={e => setEditData({ ...editData, price_per_kg: Number(e.target.value) })}
                                            className="w-1/2 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-brand-500" />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={onCancelEdit} className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Batal</button>
                                        <button onClick={() => onUpdate(item.id)} className="flex-1 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Simpan</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${CAT_COLORS[item.category] || 'text-slate-500'}`}>{item.category}</p>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 leading-snug">{item.name}</h4>
                                    <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                                        <div>
                                            <span className={`text-xl font-black ${priceColor}`}>Rp {item.price_per_kg.toLocaleString('id-ID')}</span>
                                            <span className="text-xs text-slate-500 ml-0.5">/{item.unit}</span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(item)} className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-lg transition">
                                                <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => onDelete(item.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-200 rounded-lg transition">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
