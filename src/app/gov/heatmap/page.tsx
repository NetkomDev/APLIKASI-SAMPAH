"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { MapPin, Building2, CheckCircle2 } from 'lucide-react';

interface BankSampahUnit { id: string; name: string; address: string; is_active: boolean; }

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
                <h2 className="text-xl font-extrabold text-slate-800">Peta Geospasial & Sebaran Titik</h2>
                <p className="text-xs text-slate-400 mt-1">Sebaran lokasi Bank Sampah dan cakupan wilayah kurir.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : (
                <>
                    {/* Map Placeholder */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-2xl p-8 h-[380px] flex items-center justify-center hover:border-blue-400 transition-colors">
                        <div className="text-center">
                            <div className="h-16 w-16 bg-white rounded-2xl shadow-lg border border-blue-100 flex items-center justify-center mx-auto mb-4">
                                <MapPin className="h-8 w-8 text-blue-500" />
                            </div>
                            <p className="text-base font-bold text-slate-600">Modul Peta Interaktif</p>
                            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">Integrasi peta (Leaflet / Mapbox) akan menampilkan posisi Bank Sampah, titik penjemputan, dan area cakupan kurir secara real-time.</p>
                        </div>
                    </div>

                    {/* Bank Sampah Unit List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" /> Daftar Bank Sampah Aktif ({units.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {units.length === 0 ? (
                                <p className="text-center text-slate-400 py-10 text-sm">Belum ada Bank Sampah terdaftar.</p>
                            ) : units.map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-blue-50/40 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md">{i + 1}</span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{u.name}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{u.address || 'Alamat belum diisi'}</p>
                                        </div>
                                    </div>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 className="w-3 h-3" /> AKTIF
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
