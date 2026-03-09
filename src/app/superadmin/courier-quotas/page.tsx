"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Truck, MapPin, Bike, Car, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface CourierQuota {
    id: string;
    zone_name: string;
    vehicle_type: string;
    quota: number;
}

const VEHICLES = [
    { type: "motor", label: "Motor", icon: Bike },
    { type: "mobil_pickup", label: "Mobil Pickup", icon: Car },
    { type: "gerobak", label: "Gerobak", icon: Truck },
    { type: "sepeda", label: "Sepeda", icon: Bike },
];

export default function CourierQuotasPage() {
    const [quotas, setQuotas] = useState<CourierQuota[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Grouping for the table: rows are zones, columns are vehicles
    const [groupedQuotas, setGroupedQuotas] = useState<Record<string, Record<string, CourierQuota>>>({});

    useEffect(() => {
        fetchQuotas();
    }, []);

    const fetchQuotas = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("courier_quotas").select("*").order("zone_name");
        if (error) {
            console.error(error);
            setMessage({ type: "error", text: "Gagal memuat data kuota." });
            setLoading(false);
            return;
        }

        const grouped: Record<string, Record<string, CourierQuota>> = {};
        if (data) {
            data.forEach((q) => {
                if (!grouped[q.zone_name]) grouped[q.zone_name] = {};
                grouped[q.zone_name][q.vehicle_type] = q;
            });
            setQuotas(data);
            setGroupedQuotas(grouped);
        }
        setLoading(false);
    };

    const handleQuotaChange = (zone: string, vehicle: string, newQuota: number) => {
        setGroupedQuotas((prev) => ({
            ...prev,
            [zone]: {
                ...prev[zone],
                [vehicle]: {
                    ...prev[zone]?.[vehicle],
                    zone_name: zone,
                    vehicle_type: vehicle,
                    quota: Math.max(0, newQuota),
                } as CourierQuota,
            },
        }));
    };

    const saveChanges = async () => {
        setSaving(true);
        setMessage(null);

        const updates: Partial<CourierQuota>[] = [];
        Object.values(groupedQuotas).forEach((vehicles) => {
            Object.values(vehicles).forEach((q) => {
                updates.push({
                    id: q.id,
                    zone_name: q.zone_name,
                    vehicle_type: q.vehicle_type,
                    quota: q.quota,
                });
            });
        });

        // Upsert all 
        const { error } = await supabase.from("courier_quotas").upsert(
            updates.map((u) => ({
                id: u.id,
                zone_name: u.zone_name,
                vehicle_type: u.vehicle_type,
                quota: u.quota,
            })),
            { onConflict: "zone_name, vehicle_type" }
        );

        if (error) {
            console.error(error);
            setMessage({ type: "error", text: "Sedang terjadi kendala saat menyimpan data." });
        } else {
            setMessage({ type: "success", text: "Perubahan kuota kurir berhasil disimpan!" });
            await fetchQuotas(); // Refresh IDs if new ones were inserted
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    const zones = Object.keys(groupedQuotas).sort();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Truck className="h-6 w-6 text-brand-400" />
                        Kuota Kurir per Zona
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        Atur jumlah maksimal kurir berdasarkan jenis kendaraan di setiap area operasional.
                    </p>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98] disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Simpan Perubahan
                </button>
            </div>

            {/* Notifications */}
            {message && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                    }`}>
                    {message.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            {/* Table / Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-2xl">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" /> Zona Operasional
                                    </div>
                                </th>
                                {VEHICLES.map((v) => (
                                    <th key={v.type} className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1.5 justify-center">
                                            <v.icon className="h-5 w-5 text-slate-500" />
                                            <span>{v.label}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {zones.map((zone) => (
                                <tr key={zone} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white max-w-[200px] truncate">
                                        {zone}
                                    </td>
                                    {VEHICLES.map((v) => {
                                        const q = groupedQuotas[zone]?.[v.type]?.quota || 0;
                                        return (
                                            <td key={v.type} className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={q}
                                                    onChange={(e) => handleQuotaChange(zone, v.type, parseInt(e.target.value) || 0)}
                                                    className="w-20 text-center px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all font-medium"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-300 space-y-1">
                    <p className="font-semibold text-blue-200">Bagaimana kuota ini bekerja?</p>
                    <p>Kuota akan langsung tersinkronisasi dengan form pendaftaran kurir. Jika kuota suatu jenis kendaraan di satu zona telah penuh (jumlah kurir aktif & pending), maka calon kurir tidak bisa memilih opsi tersebut.</p>
                </div>
            </div>
        </div>
    );
}
