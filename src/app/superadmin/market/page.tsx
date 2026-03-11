"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Tag, Factory, Plus, Edit, Trash2, Check, X, Search, BriefcaseBusiness, Store } from "lucide-react";

interface CommodityPrice {
    id: string;
    trade_type: 'buy_from_citizen' | 'sell_to_market';
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
    address: string;
    commodity_interest: string;
    demand_volume_kg: number;
    buying_price_per_kg: number;
    status: string;
}

export default function MarketAndPricingPage() {
    const [activeTab, setActiveTab] = useState<'prices' | 'buyers'>('prices');
    const [prices, setPrices] = useState<CommodityPrice[]>([]);
    const [buyers, setBuyers] = useState<B2BBuyer[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit states
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [editPriceValue, setEditPriceValue] = useState<number>(0);

    const [isAddingBuyer, setIsAddingBuyer] = useState(false);
    const [newBuyer, setNewBuyer] = useState<Partial<B2BBuyer>>({ status: 'active' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [priceRes, buyerRes] = await Promise.all([
                supabase.from('commodity_prices').select('*').order('trade_type').order('category'),
                supabase.from('b2b_buyers').select('*').order('created_at', { ascending: false })
            ]);

            if (priceRes.data) setPrices(priceRes.data);
            if (buyerRes.data) setBuyers(buyerRes.data);
        } catch (error) {
            console.error("Error fetching market data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePrice = async (id: string) => {
        try {
            const { error } = await supabase
                .from('commodity_prices')
                .update({ price_per_kg: editPriceValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setEditingPriceId(null);
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Gagal update harga");
        }
    };

    const handleSaveBuyer = async () => {
        try {
            if (!newBuyer.company_name || !newBuyer.contact_person || !newBuyer.buying_price_per_kg) {
                alert("Harap lengkapi nama perusahaan, kontak, dan harga beli.");
                return;
            }

            const { error } = await supabase
                .from('b2b_buyers')
                .insert([{
                    ...newBuyer,
                    demand_volume_kg: newBuyer.demand_volume_kg || 0,
                    buying_price_per_kg: newBuyer.buying_price_per_kg || 0
                }]);

            if (error) throw error;
            setIsAddingBuyer(false);
            setNewBuyer({ status: 'active' });
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan buyer");
        }
    };

    const toggleBuyerStatus = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await supabase.from('b2b_buyers').update({ status: newStatus }).eq('id', id);
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Market & Pricing</h1>
                    <p className="text-sm text-slate-400 mt-1">Kelola harga beli komunitas dan jaringan buyer B2B penjualan.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button 
                    onClick={() => setActiveTab('prices')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'prices' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                >
                    <Tag className="w-4 h-4" /> Manajemen Harga
                </button>
                <button 
                    onClick={() => setActiveTab('buyers')}
                    className={`px-6 py-3 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'buyers' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                >
                    <BriefcaseBusiness className="w-4 h-4" /> Daftar Buyer (B2B)
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin"></div></div>
            ) : activeTab === 'prices' ? (
                <div className="space-y-6">
                    {/* Beli Dari Warga */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Store className="w-5 h-5 text-emerald-400" /> Beli dari Warga (Inbound)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {prices.filter(p => p.trade_type === 'buy_from_citizen').map(price => (
                                <div key={price.id} className="bg-slate-800 border border-slate-700/50 p-4 rounded-xl flex flex-col justify-between group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{price.category}</p>
                                            <h4 className="text-lg font-bold text-white">{price.name}</h4>
                                        </div>
                                    </div>
                                    
                                    {editingPriceId === price.id ? (
                                        <div className="flex items-center gap-2 mt-auto">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rp</span>
                                                <input 
                                                    type="number" 
                                                    value={editPriceValue} 
                                                    onChange={(e) => setEditPriceValue(Number(e.target.value))}
                                                    className="w-full bg-slate-950 border border-brand-500 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                            </div>
                                            <button onClick={() => handleUpdatePrice(price.id)} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingPriceId(null)} className="p-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-end mt-auto">
                                            <div>
                                                <span className="text-2xl font-mono font-bold text-brand-400">Rp {price.price_per_kg.toLocaleString('id-ID')}</span>
                                                <span className="text-sm font-medium text-slate-500 ml-1">/{price.unit}</span>
                                            </div>
                                            <button 
                                                onClick={() => { setEditingPriceId(price.id); setEditPriceValue(price.price_per_kg); }}
                                                className="p-2 bg-slate-700 hover:bg-brand-600 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Jual Ke Market */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Factory className="w-5 h-5 text-amber-400" /> Jual Keluar Gudang (Outbound)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {prices.filter(p => p.trade_type === 'sell_to_market').map(price => (
                                <div key={price.id} className="bg-slate-800 border border-slate-700/50 p-4 rounded-xl flex flex-col justify-between group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{price.category}</p>
                                            <h4 className="text-base font-bold text-white">{price.name}</h4>
                                        </div>
                                    </div>
                                    
                                    {editingPriceId === price.id ? (
                                        <div className="flex items-center gap-2 mt-auto">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">Rp</span>
                                                <input 
                                                    type="number" 
                                                    value={editPriceValue} 
                                                    onChange={(e) => setEditPriceValue(Number(e.target.value))}
                                                    className="w-full bg-slate-950 border border-brand-500 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                            </div>
                                            <button onClick={() => handleUpdatePrice(price.id)} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg"><Check className="w-4 h-4" /></button>
                                            <button onClick={() => setEditingPriceId(null)} className="p-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-end mt-auto">
                                            <div>
                                                <span className="text-xl font-mono font-bold text-amber-400">Rp {price.price_per_kg.toLocaleString('id-ID')}</span>
                                                <span className="text-xs font-medium text-slate-500 ml-1">/{price.unit}</span>
                                            </div>
                                            <button 
                                                onClick={() => { setEditingPriceId(price.id); setEditPriceValue(price.price_per_kg); }}
                                                className="p-2 bg-slate-700 hover:bg-amber-600 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Cari perusahaan..." className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-4 py-2 rounded-xl text-sm focus:border-brand-500 focus:outline-none" />
                        </div>
                        <button onClick={() => setIsAddingBuyer(true)} className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Tambah Buyer Baru
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Perusahaan / Kontak</th>
                                        <th className="px-6 py-4">Komoditi Target</th>
                                        <th className="px-6 py-4 text-center">Volume (Permintaan)</th>
                                        <th className="px-6 py-4 text-right">Harga Beli Diajukan</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {buyers.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Belum ada data buyer.</td></tr>
                                    ) : buyers.map(buyer => (
                                        <tr key={buyer.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-base">{buyer.company_name}</div>
                                                <div className="text-slate-400 text-xs mt-1">{buyer.contact_person} • {buyer.phone_number}</div>
                                                <div className="text-slate-500 text-[10px] truncate max-w-[200px] mt-0.5">{buyer.address}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex bg-slate-800 border border-slate-700/50 text-brand-300 font-bold px-3 py-1 rounded-lg text-xs">
                                                    {buyer.commodity_interest}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-mono font-bold text-white bg-slate-800 px-3 py-1 rounded-md">{buyer.demand_volume_kg.toLocaleString('id-ID')} Kg</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-bold text-amber-400">Rp {buyer.buying_price_per_kg.toLocaleString('id-ID')} /kg</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => toggleBuyerStatus(buyer.id, buyer.status)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${buyer.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                                                    {buyer.status === 'active' ? 'Aktif' : 'Nonaktif'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="text-slate-500 hover:text-white p-1 transition"><Edit className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add Buyer */}
            {isAddingBuyer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2"><BriefcaseBusiness className="w-5 h-5 text-brand-400"/> Tambah Buyer B2B</h3>
                            <button onClick={() => setIsAddingBuyer(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Nama Perusahaan / Institusi *</label>
                                <input type="text" value={newBuyer.company_name || ''} onChange={e => setNewBuyer({...newBuyer, company_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="PT Daur Ulang Sentosa" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Contact Person *</label>
                                    <input type="text" value={newBuyer.contact_person || ''} onChange={e => setNewBuyer({...newBuyer, contact_person: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Nama PIC" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Nomor HP/WA *</label>
                                    <input type="text" value={newBuyer.phone_number || ''} onChange={e => setNewBuyer({...newBuyer, phone_number: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="08..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Alamat Lengkap</label>
                                <textarea value={newBuyer.address || ''} onChange={e => setNewBuyer({...newBuyer, address: e.target.value})} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Alamat pabrik / pengiriman..." />
                            </div>
                            
                            <hr className="border-slate-800 my-4" />
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Komoditas yang dicari</label>
                                <input type="text" list="commodities" value={newBuyer.commodity_interest || ''} onChange={e => setNewBuyer({...newBuyer, commodity_interest: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="Contoh: Cacahan Plastik PP / Pupuk Kompos" />
                                <datalist id="commodities">
                                    <option value="Pupuk Kompos Premium" />
                                    <option value="Maggot BSF Kering" />
                                    <option value="Cacahan Plastik PP" />
                                    <option value="Plastik PET (Botol)" />
                                    <option value="Kardus Bekas (Corrugated)" />
                                </datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Volume Permintaan</label>
                                    <div className="relative">
                                        <input type="number" min="0" value={newBuyer.demand_volume_kg || ''} onChange={e => setNewBuyer({...newBuyer, demand_volume_kg: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="1000" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Kg</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Harga Berani Beli *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">Rp</span>
                                        <input type="number" min="0" value={newBuyer.buying_price_per_kg || ''} onChange={e => setNewBuyer({...newBuyer, buying_price_per_kg: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-800 rounded-xl text-white pl-8 pr-4 py-2 text-sm focus:border-brand-500 focus:outline-none" placeholder="0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                            <button onClick={() => setIsAddingBuyer(false)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition">Batal</button>
                            <button onClick={handleSaveBuyer} className="px-5 py-2 text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition shadow-lg shadow-brand-500/20">Simpan Buyer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
