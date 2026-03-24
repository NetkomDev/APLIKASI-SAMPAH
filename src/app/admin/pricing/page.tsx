"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Tag, Store, Plus, Edit, Trash2, X, AlertCircle, ArrowRight } from "lucide-react";

interface CommodityPrice {
    id: string;
    trade_type: 'buy_from_citizen' | 'sell_to_market';
    category: string;
    name: string;
    price_per_kg: number;
    unit: string;
    is_active: boolean;
}

export default function AdminPricingPage() {
    const [prices, setPrices] = useState<CommodityPrice[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit State
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [editCommodityData, setEditCommodityData] = useState<Partial<CommodityPrice>>({});

    // Add State
    const [isAddingCommodity, setIsAddingCommodity] = useState(false);
    const [newCommodity, setNewCommodity] = useState<Partial<CommodityPrice>>({ 
        trade_type: 'buy_from_citizen', 
        unit: 'kg', 
        is_active: true,
        category: 'organic'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('commodity_prices')
                .select('*')
                .eq('trade_type', 'buy_from_citizen')  // Only show buying prices
                .order('category')
                .order('name');

            if (data) setPrices(data);
            if (error) console.error("Error fetching data:", error);
        } catch (error) {
            console.error("Error fetching market data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCommodity = async () => {
        try {
            if (!newCommodity.name || !newCommodity.price_per_kg) {
                alert("Harap lengkapi nama item dan harga.");
                return;
            }

            const { error } = await supabase
                .from('commodity_prices')
                .insert([{
                    ...newCommodity,
                    price_per_kg: newCommodity.price_per_kg || 0
                }]);

            if (error) throw error;
            setIsAddingCommodity(false);
            setNewCommodity({ trade_type: 'buy_from_citizen', unit: 'kg', is_active: true, category: 'organic' });
            fetchData();
        } catch (error: any) {
            console.error("Insert error:", error);
            alert("Gagal menyimpan item: " + (error?.message || "Unknown error"));
        }
    };

    const handleUpdateCommodity = async (id: string) => {
        try {
            const { error } = await supabase
                .from('commodity_prices')
                .update({ 
                    name: editCommodityData.name,
                    price_per_kg: editCommodityData.price_per_kg,
                    category: editCommodityData.category,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', id);

            if (error) throw error;
            setEditingPriceId(null);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Gagal update item");
        }
    };

    const handleDeleteCommodity = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus item komoditas ini?")) return;
        try {
            const { error } = await supabase
                .from('commodity_prices')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Gagal menghapus item");
        }
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Tag className="w-8 h-8 text-brand-600" />
                        Harga Beli Sampah
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                        Atur harga referensi pembelian barang bekas dari warga. Harga yang Anda masukkan akan langsung tampil di halaman depan untuk publik.
                    </p>
                </div>
                <button 
                    onClick={() => setIsAddingCommodity(true)} 
                    className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-brand-500/20 active:scale-[0.98] transition"
                >
                    <Plus className="w-4 h-4" /> Item Komoditas Baru
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Store className="w-5 h-5 text-brand-600" /> 
                            Daftar Etalase Pembelian (Inbound)
                        </h3>
                        <div className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            Total: {prices.length} Komoditas
                        </div>
                    </div>

                    {prices.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h4 className="text-slate-800 font-bold mb-1">Daftar Harga Kosong</h4>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">
                                Belum ada komoditas sampah yang ditambahkan. Silakan klik tombol "Item Komoditas Baru" untuk mulai.
                            </p>
                            <button onClick={() => setIsAddingCommodity(true)} className="text-brand-600 font-semibold text-sm hover:underline">
                                Tambah Sekarang
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {prices.map(price => (
                                <div key={price.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between group relative overflow-hidden hover:border-brand-300 hover:shadow-md transition-all">
                                    
                                    {editingPriceId === price.id ? (
                                        <div className="flex flex-col gap-4 h-full justify-between">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nama Item</label>
                                                <input 
                                                    type="text" 
                                                    value={editCommodityData.name || ''} 
                                                    onChange={(e) => setEditCommodityData({...editCommodityData, name: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-1/2">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kategori</label>
                                                    <select 
                                                        value={editCommodityData.category || ''} 
                                                        onChange={(e) => setEditCommodityData({...editCommodityData, category: e.target.value})}
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                                    >
                                                        <option value="organic">Organic</option>
                                                        <option value="inorganic">Inorganic</option>
                                                        <option value="processed">Processed</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                <div className="w-1/2 relative">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Harga (Rp)</label>
                                                    <input 
                                                        type="number" 
                                                        value={editCommodityData.price_per_kg || ''} 
                                                        onChange={(e) => setEditCommodityData({...editCommodityData, price_per_kg: Number(e.target.value)})}
                                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100">
                                                <button onClick={() => setEditingPriceId(null)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition">Batal</button>
                                                <button onClick={() => handleUpdateCommodity(price.id)} className="flex-1 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg text-sm font-medium transition shadow-md">Simpan</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">{price.category}</p>
                                                    <h4 className="text-lg font-bold text-slate-900 leading-tight">{price.name}</h4>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-100">
                                                <div>
                                                    <span className="text-2xl font-black text-slate-900">Rp {price.price_per_kg.toLocaleString('id-ID')}</span>
                                                    <span className="text-sm font-semibold text-slate-500 ml-1">/{price.unit}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => { setEditingPriceId(price.id); setEditCommodityData(price); }}
                                                        className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-lg transition-colors"
                                                        title="Edit Harga"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteCommodity(price.id)}
                                                        className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            )}

            {/* Tambah Komoditas Modal Overlay */}
            {isAddingCommodity && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                                <Tag className="w-5 h-5 text-brand-600"/> 
                                Item Baru
                            </h3>
                            <button onClick={() => setIsAddingCommodity(false)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full border border-slate-200"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Kategori Komoditas</label>
                                <select value={newCommodity.category} onChange={e => setNewCommodity({...newCommodity, category: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl text-slate-900 px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
                                    <option value="organic">Organic</option>
                                    <option value="inorganic">Inorganic</option>
                                    <option value="processed">Processed</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nama Item Sampah</label>
                                <input type="text" value={newCommodity.name || ''} onChange={e => setNewCommodity({...newCommodity, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl text-slate-900 px-4 py-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" placeholder="Contoh: Plastik PET Bersih" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Harga Beli Warga</label>
                                    <div className="absolute left-4 top-10 text-slate-400 font-bold">Rp</div>
                                    <input type="number" min="0" value={newCommodity.price_per_kg || ''} onChange={e => setNewCommodity({...newCommodity, price_per_kg: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-900 pl-11 pr-4 py-3 text-lg font-black focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none shadow-inner" placeholder="0" />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Satuan</label>
                                    <input type="text" value={newCommodity.unit || ''} onChange={e => setNewCommodity({...newCommodity, unit: e.target.value})} className="w-full bg-slate-50 text-center border border-slate-200 rounded-xl text-slate-600 font-bold px-4 py-3 text-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none" placeholder="kg" disabled />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                            <button onClick={() => setIsAddingCommodity(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">Batal</button>
                            <button onClick={handleSaveCommodity} className="px-6 py-2.5 text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shadow-lg shadow-brand-500/20 flex items-center gap-2">
                                Simpan <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
