"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Truck, MapPin, Loader2 } from "lucide-react";

export function CourierQuotaSummary() {
    const [summary, setSummary] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuotas = async () => {
            setLoading(true);
            // We just fetch all quotas and sum them up for simplicity in the admin dashboard
            const { data, error } = await supabase.from("courier_quotas").select("*");
            if (!error && data) {
                const grouped: Record<string, { total: number, types: string[] }> = {};
                data.forEach((q) => {
                    if (q.quota > 0) {
                        if (!grouped[q.zone_name]) grouped[q.zone_name] = { total: 0, types: [] };
                        grouped[q.zone_name].total += q.quota;
                        grouped[q.zone_name].types.push(q.vehicle_type);
                    }
                });

                const arr = Object.keys(grouped).map(k => ({
                    zone: k,
                    total: grouped[k].total,
                    types: grouped[k].types.length
                })).sort((a, b) => b.total - a.total).slice(0, 4); // Show top 4 active zones

                setSummary(arr);
            }
            setLoading(false);
        };
        fetchQuotas();
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col mt-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-brand-500" />
                    <h2 className="text-md font-bold text-slate-800">Alokasi & Kuota Kurir Aktif</h2>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-full border border-slate-200">
                    Sistem Kuota
                </span>
            </div>

            {loading ? (
                <div className="flex h-16 items-center justify-center">
                    <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
                </div>
            ) : summary.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada kuota yang diset oleh Super Admin.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summary.map((s, i) => (
                        <div key={i} className="p-4 border border-slate-100 rounded-xl hover:border-brand-200 transition bg-slate-50/50">
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <h4 className="font-semibold text-slate-700 text-sm truncate">{s.zone}</h4>
                            </div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-slate-500">Total Kuota Tersedia</p>
                                    <p className="font-bold text-brand-600 text-lg mt-0.5">{s.total} <span className="text-xs font-normal text-slate-500">posisi</span></p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
