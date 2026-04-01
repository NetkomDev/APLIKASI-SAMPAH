"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
    MapPin, Package, Send, Wallet, Truck, PlusCircle,
    ChevronRight, LogOut, Navigation, Star, FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CourierDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [wallet, setWallet] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Stats
    const [todayTonnage, setTodayTonnage] = useState({ org: 0, inorg: 0 });
    const [monthlyPickups, setMonthlyPickups] = useState(0);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/auth/login");
                return;
            }
            setUser(user);

            // Fetch Profile
            const { data: prof } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            const allowedRoles = ["courier", "superadmin", "admin_bank_sampah"];
            if (!prof || !allowedRoles.includes(prof.role)) {
                router.push("/");
                return;
            }
            setProfile(prof);

            // Fetch Wallet
            const { data: w } = await supabase
                .from("user_wallets")
                .select("balance")
                .eq("user_id", user.id)
                .single();
            if (w) setWallet(w);

            // Fetch Today's Setoran Stats (from approved courier_deposits)
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data: todayDeps } = await supabase
                .from("courier_deposits")
                .select("total_organic_claimed, total_inorganic_claimed, actual_organic, actual_inorganic, status")
                .eq("kurir_id", user.id)
                .gte("created_at", startOfDay.toISOString());

            let tOrg = 0; let tInorg = 0;
            todayDeps?.forEach(d => {
                tOrg += (d.actual_organic || d.total_organic_claimed || 0);
                tInorg += (d.actual_inorganic || d.total_inorganic_claimed || 0);
            });
            setTodayTonnage({ org: tOrg, inorg: tInorg });

            // Fetch Monthly Pickups count
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const { count } = await supabase
                .from("transactions")
                .select("*", { count: 'exact', head: true })
                .eq("courier_id", user.id)
                .gte("created_at", startOfMonth.toISOString());

            setMonthlyPickups(count || 0);
        } catch (error) {
            console.error("Dashboard init error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20 bg-slate-50">
            {/* Preview Banner for Admin/SuperAdmin */}
            {profile?.role !== "courier" && (
                <div className="bg-amber-500 text-white text-center py-2 px-4 text-xs font-bold">
                    ⚠️ MODE PREVIEW — Anda login sebagai {profile?.role?.toUpperCase()}. Ini adalah tampilan yang dilihat oleh Kurir.
                </div>
            )}
            {/* Top Header Base */}
            <div className="bg-emerald-600 rounded-b-[40px] px-6 pt-10 pb-20 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Truck className="w-40 h-40" />
                </div>
                
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <p className="text-emerald-100 text-sm font-semibold mb-1">Selamat bekerja,</p>
                        <h1 className="text-2xl font-black">{profile?.full_name}</h1>
                        <span className="inline-block mt-2 bg-emerald-700/50 backdrop-blur-sm border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-mono font-bold tracking-wider">
                            {profile?.courier_id_code || "DRIVER UNREGISTERED"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Wallet & Stats Card (Overlapping header) */}
            <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-6">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-500">Saldo Komisi</p>
                                    <p className="text-2xl font-black text-slate-800">
                                        Rp {(wallet?.balance || 0).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>
                            <button className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition">
                                Cairkan
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-2">
                            <div>
                                <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                                    <Package className="w-3 h-3" /> Pickup Bulan Ini
                                </p>
                                <p className="text-xl font-black text-slate-700">{monthlyPickups} Rumah</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Status Armada
                                </p>
                                <p className="text-sm font-black text-slate-700 truncate">{profile?.vehicle_type?.replace(/_/g, ' ').toUpperCase() || "AKTIF"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <Link href="/courier/pickup" className="group bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-3xl text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                        <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-8 backdrop-blur-sm group-hover:scale-110 transition-transform">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg leading-tight mb-1">Mulai<br />Jemput Sampah</h3>
                        <p className="text-xs text-white/70 font-medium">Scan & catat warga</p>
                    </Link>

                    <div className="flex flex-col gap-4">
                        <Link href="/courier/manifest" className="flex-1 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center">
                                    <Send className="w-5 h-5" />
                                </div>
                                <div className="bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800">Kirim Manifest</h3>
                                <p className="text-xs text-slate-500 font-medium">Setor ke Bank Sampah</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Info Card: Today's Effort */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" /> Kinerja Anda Hari Ini
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                <span className="text-slate-600">Total Organik</span>
                                <span className="text-slate-800">{todayTonnage.org.toFixed(1)} Kg</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((todayTonnage.org / 100) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                        
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                <span className="text-slate-600">Total Anorganik</span>
                                <span className="text-slate-800">{todayTonnage.inorg.toFixed(1)} Kg</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((todayTonnage.inorg / 100) * 100, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <button 
                    onClick={handleLogout}
                    className="w-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition"
                >
                    <LogOut className="w-4 h-4" /> Keluar Akun
                </button>
            </div>
        </div>
    );
}
