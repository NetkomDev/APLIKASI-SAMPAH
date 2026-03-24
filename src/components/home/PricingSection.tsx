"use client";

import { supabase } from '@/infrastructure/config/supabase';
import { useEffect, useState } from 'react';
import { Tag, TrendingUp, RefreshCw } from 'lucide-react';

export function PricingSection() {
    const [prices, setPrices] = useState<any[]>([]);

    useEffect(() => {
        const fetchPrices = async () => {
            const { data } = await supabase
                .from('market_prices')
                .select('*')
                .eq('trade_type', 'buy_from_public') /* Assuming this type is for the public */
                .order('price_per_kg', { ascending: false })
                .limit(6);
            if (data && data.length > 0) {
                setPrices(data);
            } else {
                // If filtering by buy_from_public returns empty, fetch any general commodities
                const { data: fallback } = await supabase
                    .from('market_prices')
                    .select('*')
                    .order('category')
                    .limit(6);
                if (fallback) setPrices(fallback);
            }
        };
        fetchPrices();
    }, []);

    return (
        <section id="harga-sampah" className="py-24 bg-gradient-to-b from-white to-slate-50 relative border-t border-slate-100">
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700 tracking-wide uppercase">Daftar Harga Terkini</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4">
                            Ubah Barang Bekas <br />
                            <span className="text-brand-600">Beromzet Jutaan!</span>
                        </h2>
                        <p className="text-lg text-slate-600">
                            Kami selalu memperbarui harga pembelian sampah daur ulang menyesuaikan pasar. Jual saat harga naik dan untung maksimal!
                        </p>
                    </div>
                    <div>
                        <a href="/portal" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 whitespace-nowrap">
                            Lihat Semua Etalase
                        </a>
                    </div>
                </div>

                {prices.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {prices.map((p) => (
                            <div key={p.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 hover:shadow-xl transition-all group flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-brand-50 rounded-xl group-hover:bg-brand-500 transition-colors">
                                        <Tag className="h-6 w-6 text-brand-600 group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.category}</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight">{p.name}</h3>
                                    <div className="flex items-baseline gap-1 mt-4">
                                        <p className="text-3xl font-black text-emerald-600">Rp {p.price_per_kg.toLocaleString('id-ID')}</p>
                                        <span className="text-sm font-semibold text-slate-500">/ {p.unit}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
                        <RefreshCw className="h-10 w-10 text-slate-300 mb-4 animate-spin-slow" />
                        <p className="text-lg font-bold text-slate-900 mb-2">Mengambil Data Pasar...</p>
                        <p className="text-slate-500">Harga terbaru akan segera tampil.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
