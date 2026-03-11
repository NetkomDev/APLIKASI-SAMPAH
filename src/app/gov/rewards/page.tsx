"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { Trophy, Star, Medal, Crown } from 'lucide-react';

interface TopUser { id: string; full_name: string; role: string; achievement_points: number; }

export default function RewardsPage() {
    const [loading, setLoading] = useState(true);
    const [topWarga, setTopWarga] = useState<TopUser[]>([]);
    const [topCourier, setTopCourier] = useState<TopUser[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data: warga } = await supabase.from('profiles').select('id, full_name, role, achievement_points').eq('role', 'citizen').order('achievement_points', { ascending: false }).limit(10);
            const { data: couriers } = await supabase.from('profiles').select('id, full_name, role, achievement_points').eq('role', 'courier').eq('courier_status', 'active').order('achievement_points', { ascending: false }).limit(10);
            setTopWarga(warga || []);
            setTopCourier(couriers || []);
            setLoading(false);
        };
        fetch();
    }, []);

    const medalColors = [
        'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-400/30',
        'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-300/30',
        'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-lg shadow-orange-400/30',
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">Reward Engine & Leaderboard</h2>
                <p className="text-xs text-slate-400 mt-1">Peringkat warga dan kurir berdasarkan kontribusi poin.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Warga Leaderboard */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-yellow-50 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-extrabold text-slate-800">Top 10 Warga Kontributor</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {topWarga.length === 0 ? (
                                <p className="text-center text-slate-400 py-10 text-sm">Belum ada data warga.</p>
                            ) : topWarga.map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-50/40 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i < 3 ? medalColors[i] : 'bg-slate-100 text-slate-400'}`}>
                                            {i < 3 ? <Crown className="w-4 h-4" /> : i + 1}
                                        </span>
                                        <p className="text-sm font-bold text-slate-700 group-hover:text-amber-700 transition-colors">{u.full_name || 'Tanpa Nama'}</p>
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-lg font-mono">
                                        <Star className="w-3 h-3 text-amber-500" /> {u.achievement_points || 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Courier Leaderboard */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-violet-500" />
                            <h3 className="text-sm font-extrabold text-slate-800">Top 10 Kurir Berprestasi</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {topCourier.length === 0 ? (
                                <p className="text-center text-slate-400 py-10 text-sm">Belum ada data kurir aktif.</p>
                            ) : topCourier.map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-violet-50/40 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i < 3 ? medalColors[i] : 'bg-slate-100 text-slate-400'}`}>
                                            {i < 3 ? <Crown className="w-4 h-4" /> : i + 1}
                                        </span>
                                        <p className="text-sm font-bold text-slate-700 group-hover:text-violet-700 transition-colors">{u.full_name || 'Tanpa Nama'}</p>
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-black text-violet-600 bg-violet-50 border border-violet-200/60 px-2.5 py-1 rounded-lg font-mono">
                                        <Star className="w-3 h-3 text-violet-500" /> {u.achievement_points || 0}
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
