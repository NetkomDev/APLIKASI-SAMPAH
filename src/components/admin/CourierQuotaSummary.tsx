"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Truck, Loader2, Bike, Car } from "lucide-react";

interface QuotaSummary {
    vehicleType: string;
    label: string;
    icon: React.ComponentType<any>;
    totalLimit: number;
    used: number;
    available: number;
}

const VEHICLE_MAP: Record<string, { label: string, icon: any }> = {
    motor: { label: "Motor", icon: Bike },
    mobil_pickup: { label: "Mobil Pickup", icon: Car },
    gerobak: { label: "Gerobak", icon: Truck },
    sepeda: { label: "Sepeda", icon: Bike }
};

export function CourierQuotaSummary() {
    const [summary, setSummary] = useState<QuotaSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuotas = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase.from('profiles').select('bank_sampah_id').eq('id', user.id).single();
                const bankId = profile?.bank_sampah_id;

                if (!bankId) return;

                // 1. Fetch the limits for THIS specific Bank Sampah
                const { data: quotaData, error: quotaError } = await supabase
                    .from("courier_quotas")
                    .select("*")
                    .eq("bank_sampah_id", bankId);

                // 2. Fetch current couriers taking up space in THIS Bank Sampah
                const { data: courierData, error: courierError } = await supabase
                    .from("profiles")
                    .select("vehicle_type")
                    .eq("role", "courier")
                    .eq("bank_sampah_id", bankId)
                    .in("courier_status", ["active", "pending_approval"]);

                if (!quotaError && quotaData) {
                    const grouped: Record<string, { totalLimit: number, used: number }> = {
                        motor: { totalLimit: 0, used: 0 },
                        mobil_pickup: { totalLimit: 0, used: 0 },
                        gerobak: { totalLimit: 0, used: 0 },
                        sepeda: { totalLimit: 0, used: 0 }
                    };

                    // Aggregate limits
                    quotaData.forEach((q) => {
                        if (q.quota > 0 && grouped[q.vehicle_type]) {
                            grouped[q.vehicle_type].totalLimit += q.quota;
                        }
                    });

                    // Aggregate used
                    if (courierData) {
                        courierData.forEach((c) => {
                            if (c.vehicle_type && grouped[c.vehicle_type]) {
                                grouped[c.vehicle_type].used += 1;
                            }
                        });
                    }

                    // Format array to show only those with limits
                    const arr = Object.keys(grouped)
                        .filter(k => grouped[k].totalLimit > 0)
                        .map(k => ({
                            vehicleType: k,
                            label: VEHICLE_MAP[k]?.label || k,
                            icon: VEHICLE_MAP[k]?.icon || Truck,
                            totalLimit: grouped[k].totalLimit,
                            used: grouped[k].used,
                            available: Math.max(0, grouped[k].totalLimit - grouped[k].used)
                        }));

                    setSummary(arr);
                }
            } catch (err) {
                console.error("Error fetching quota summary", err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotas();
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col mt-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-brand-500" />
                    <h2 className="text-md font-bold text-slate-800">Alokasi & Sisa Kuota Armada Cabang Ini</h2>
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
                <p className="text-sm text-slate-500 text-center py-4">Belum ada kuota armada yang diset untuk Bank Sampah Anda oleh Super Admin.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summary.map((s, i) => {
                        const isFull = s.available === 0;
                        return (
                            <div key={i} className={`p-4 border rounded-xl transition ${isFull ? 'bg-red-50/50 border-red-100' : 'bg-slate-50/50 border-slate-100 hover:border-brand-200'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-1.5 rounded-md ${isFull ? 'bg-red-100' : 'bg-brand-50'}`}>
                                        <s.icon className={`h-4 w-4 ${isFull ? 'text-red-500' : 'text-brand-500'}`} />
                                    </div>
                                    <h4 className="font-semibold text-slate-700 text-sm truncate">{s.label}</h4>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Status Kuota (Tersisa)</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <p className={`font-bold text-2xl ${isFull ? 'text-red-600' : 'text-brand-600'}`}>
                                                {s.available}
                                            </p>
                                            <span className="text-xs font-medium text-slate-500">/ {s.totalLimit} armada</span>
                                        </div>
                                    </div>
                                    {isFull && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                                            Penuh
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
