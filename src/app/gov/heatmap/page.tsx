"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { MapPin, Building2 } from 'lucide-react';

interface BankSampahUnit {
    id: string;
    name: string;
    address: string;
    is_active: boolean;
}

export default function HeatmapPage() {
    const [units, setUnits] = useState<BankSampahUnit[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase.from('bank_sampah_units').select('*').eq('is_active', true).order('name');
            setUnits(data || []);
            setLoading(false);
        };
        fetch();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Peta Geospasial & Sebaran Titik</h2>
                <p className="text-xs text-slate-500 mt-1">Sebaran lokasi Bank Sampah dan cakupan wilayah kurir.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin" /></div>
            ) : (
                <>
                    {/* Map Placeholder */}
                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-6 h-[360px] flex items-center justify-center">
                        <div className="text-center">
                            <div className="h-14 w-14 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center mx-auto mb-4">
                                <MapPin className="h-7 w-7 text-brand-400" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">Modul Peta Interaktif</p>
                            <p className="text-[10px] text-slate-600 mt-1 max-w-xs">Integrasi peta (Leaflet / Mapbox) akan menampilkan posisi Bank Sampah, titik penjemputan, dan area cakupan kurir secara real-time.</p>
                        </div>
                    </div>

                    {/* Bank Sampah Unit List */}
                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800/60">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-400" /> Daftar Bank Sampah Aktif</h3>
                        </div>
                        <div className="divide-y divide-slate-800/40">
                            {units.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 text-xs">Belum ada Bank Sampah terdaftar.</p>
                            ) : units.map(u => (
                                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition">
                                    <div>
                                        <p className="text-sm font-bold text-white">{u.name}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{u.address || 'Alamat belum diisi'}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">AKTIF</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
