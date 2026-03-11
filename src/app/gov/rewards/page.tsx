"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { Trophy, Star, Medal } from 'lucide-react';

interface TopUser {
    id: string;
    full_name: string;
    role: string;
    achievement_points: number;
}

export default function RewardsPage() {
    const [loading, setLoading] = useState(true);
    const [topWarga, setTopWarga] = useState<TopUser[]>([]);
    const [topCourier, setTopCourier] = useState<TopUser[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data: warga } = await supabase
                .from('profiles').select('id, full_name, role, achievement_points')
                .eq('role', 'citizen')
                .order('achievement_points', { ascending: false })
                .limit(10);

            const { data: couriers } = await supabase
                .from('profiles').select('id, full_name, role, achievement_points')
                .eq('role', 'courier').eq('courier_status', 'active')
                .order('achievement_points', { ascending: false })
                .limit(10);

            setTopWarga(warga || []);
            setTopCourier(couriers || []);
            setLoading(false);
        };
        fetch();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Reward Engine & Leaderboard</h2>
                <p className="text-xs text-slate-500 mt-1">Peringkat warga dan kurir berdasarkan kontribusi poin.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Warga Leaderboard */}
                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <h3 className="text-sm font-bold text-white">Top 10 Warga Kontributor</h3>
                        </div>
                        <div className="divide-y divide-slate-800/40">
                            {topWarga.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 text-xs">Belum ada data warga.</p>
                            ) : topWarga.map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-500/20 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                                            {i < 3 ? <Medal className="w-3.5 h-3.5" /> : i + 1}
                                        </span>
                                        <p className="text-sm font-semibold text-white">{u.full_name || 'Tanpa Nama'}</p>
                                    </div>
                                    <span className="text-xs font-bold text-brand-400 font-mono flex items-center gap-1">
                                        <Star className="w-3 h-3" /> {u.achievement_points || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Courier Leaderboard */}
                    <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800/60 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-brand-400" />
                            <h3 className="text-sm font-bold text-white">Top 10 Kurir Berprestasi</h3>
                        </div>
                        <div className="divide-y divide-slate-800/40">
                            {topCourier.length === 0 ? (
                                <p className="text-center text-slate-500 py-8 text-xs">Belum ada data kurir aktif.</p>
                            ) : topCourier.map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-500/20 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                                            {i < 3 ? <Medal className="w-3.5 h-3.5" /> : i + 1}
                                        </span>
                                        <p className="text-sm font-semibold text-white">{u.full_name || 'Tanpa Nama'}</p>
                                    </div>
                                    <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1">
                                        <Star className="w-3 h-3" /> {u.achievement_points || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
