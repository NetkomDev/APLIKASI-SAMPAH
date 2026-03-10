"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Users, Truck, Search, Phone, MapPin, SearchX, CheckCircle2, AlertCircle, Clock, Bike, Car, Shield, MoreVertical } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface UserProfile {
    id: string;
    full_name: string;
    phone_number: string;
    address: string | null;
    achievement_points: number;
    created_at: string;
    // Courier specific
    courier_status?: string | null;
    courier_id_code?: string | null;
    vehicle_type?: string | null;
    vehicle_plate?: string | null;
    is_online?: boolean;
    bank_sampah_name?: string | null;
}

interface Wallet {
    user_id: string;
    balance: number;
}

const VEHICLE_MAP: Record<string, { label: string, icon: any }> = {
    motor: { label: "Motor", icon: Bike },
    mobil_pickup: { label: "Mobil Pickup", icon: Car },
    gerobak: { label: "Gerobak", icon: Truck },
    sepeda: { label: "Sepeda", icon: Bike }
};

export default function AdminFleetPage() {
    const [activeTab, setActiveTab] = useState<"users" | "couriers">("users");
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [wallets, setWallets] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: adminData } = await supabase.from("profiles").select("bank_sampah_id, role").eq("id", user.id).single();

        // If not superadmin and no bank_sampah_id, deny access
        if (adminData?.role !== "superadmin" && !adminData?.bank_sampah_id) {
            setProfiles([]);
            setLoading(false);
            return;
        }

        const roleToFetch = activeTab === "users" ? "user" : "courier";

        let query = supabase
            .from("profiles")
            .select("id, full_name, phone_number, address, achievement_points, created_at, courier_status, courier_id_code, vehicle_type, vehicle_plate, is_online, bank_sampah_name")
            .eq("role", roleToFetch)
            .order("created_at", { ascending: false });

        // Isolate data ONLY if not superadmin
        if (adminData?.role !== "superadmin") {
            query = query.eq("bank_sampah_id", adminData.bank_sampah_id);
        }

        const { data, error } = await query;
        if (!error && data) {
            setProfiles(data);

            // Only fetch wallets if it's the "users" tab (since couriers also have wallets, we can fetch for both, but definitely needed for users to show balance)
            const userIds = data.map(p => p.id);
            if (userIds.length > 0) {
                const { data: walletData } = await supabase.from("user_wallets").select("user_id, balance").in("user_id", userIds);
                if (walletData) {
                    const wMap: Record<string, number> = {};
                    walletData.forEach(w => wMap[w.user_id] = w.balance || 0);
                    setWallets(wMap);
                }
            }
        }
        setLoading(false);
    }, [activeTab]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredProfiles = profiles.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (p.full_name?.toLowerCase().includes(q) || p.phone_number?.includes(q) || p.courier_id_code?.toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manajemen Warga & Kurir</h1>
                    <p className="text-sm text-slate-500">Kelola secara mandiri data warga dan armada cabang Anda.</p>
                </div>

                {activeTab === "couriers" && (
                    <Link href="/admin/couriers" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-xl border border-brand-200 transition-colors shadow-sm">
                        <Shield className="w-4 h-4" />
                        Persetujuan Armada Baru
                    </Link>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
                <button
                    onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all",
                        activeTab === "users" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    <Users className={clsx("w-4 h-4", activeTab === "users" ? "text-brand-500" : "text-slate-400")} />
                    Warga Terdaftar
                    <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 border border-slate-200">
                        {activeTab === "users" ? profiles.length : ""}
                    </span>
                </button>
                <button
                    onClick={() => { setActiveTab("couriers"); setSearchQuery(""); }}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all",
                        activeTab === "couriers" ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    <Truck className={clsx("w-4 h-4", activeTab === "couriers" ? "text-brand-500" : "text-slate-400")} />
                    Armada Aktif
                    <span className="ml-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 border border-slate-200">
                        {activeTab === "couriers" ? profiles.length : ""}
                    </span>
                </button>
            </div>

            {/* Content actions */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`Cari nama, no WA${activeTab === "couriers" ? ", atau ID Kurir" : ""}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:bg-white transition"
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-3"></div>
                    <p className="text-sm">Memuat data...</p>
                </div>
            ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <SearchX className="w-8 h-8" />
                    </div>
                    <p className="text-slate-600 font-semibold">Tidak ada data ditemukan</p>
                    <p className="text-slate-400 text-sm mt-1">Data cabang Anda kosong sesuai pencarian ini.</p>
                </div>
            ) : activeTab === "users" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProfiles.map((p) => (
                        <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                        {p.full_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 leading-tight">{p.full_name}</p>
                                        <p className="text-xs text-brand-600 font-semibold">{p.bank_sampah_name || "Tanpa Cabang"}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Phone className="w-3 h-3 text-brand-500" />
                                            <span className="text-xs text-slate-500">+{p.phone_number}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-md text-[10px] font-bold">Resmi</span>
                            </div>
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-xs text-slate-600 line-clamp-2">{p.address || "Belum ada alamat domisili"}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 bg-slate-50/50 -mx-5 px-5 -mb-5 pb-5 rounded-b-xl border-t border-slate-50">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Saldo Warga</p>
                                        <p className="text-sm font-semibold text-brand-600">Rp {wallets[p.id]?.toLocaleString('id-ID') || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Poin Hadiah</p>
                                        <p className="text-sm font-semibold text-amber-600">{p.achievement_points || 0} xp</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProfiles.map((p) => {
                        const statusConfig = p.courier_status === "active"
                            ? { c: "bg-emerald-50 text-emerald-600 border-emerald-100", i: CheckCircle2, t: "Aktif" }
                            : p.courier_status === "suspended"
                                ? { c: "bg-red-50 text-red-600 border-red-100", i: AlertCircle, t: "Ditangguhkan" }
                                : { c: "bg-amber-50 text-amber-600 border-amber-100", i: Clock, t: "Menunggu" };

                        const vConfig = VEHICLE_MAP[p.vehicle_type || "motor"] || VEHICLE_MAP["motor"];

                        return (
                            <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-200 transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
                                            <vConfig.icon className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 leading-tight truncate max-w-[140px]">{p.full_name}</p>
                                            <p className="text-xs text-brand-600 font-semibold truncate max-w-[140px]">{p.bank_sampah_name || "Tanpa Cabang"}</p>
                                            <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{p.courier_id_code || "-"}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={clsx("flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border", statusConfig.c)}>
                                            {<statusConfig.i className="w-3 h-3" />} {statusConfig.t}
                                        </span>
                                        {p.is_online ? (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Offline
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4 text-sm text-slate-600">
                                    <div className="flex items-center justify-between py-2 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> WhatsApp</span>
                                        <span className="font-medium text-slate-800">+{p.phone_number}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Kendaraan</span>
                                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                                            {vConfig.label}
                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                                                {p.vehicle_plate || "N/A"}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-t border-slate-100">
                                        <span className="text-xs text-slate-500 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Bergabung Sejak</span>
                                        <span className="font-medium text-slate-800">{new Date(p.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
