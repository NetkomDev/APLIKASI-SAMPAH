"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { TreePine, Leaf, Recycle, Factory, Sprout } from 'lucide-react';

export default function EnvironmentalPage() {
    const [loading, setLoading] = useState(true);
    const [envStats, setEnvStats] = useState({
        totalOrganic: 0, totalInorganic: 0, totalDiverted: 0, inventoryOutputs: 0,
    });

    useEffect(() => {
        const fetch = async () => {
            const { data: allTx } = await supabase.from('transactions').select('weight_organic, weight_inorganic');
            const totalOrg = allTx?.reduce((a, t) => a + (t.weight_organic || 0), 0) || 0;
            const totalInorg = allTx?.reduce((a, t) => a + (t.weight_inorganic || 0), 0) || 0;
            const { count: outputCount } = await supabase.from('inventory_outputs').select('*', { count: 'exact', head: true });
            setEnvStats({ totalOrganic: totalOrg, totalInorganic: totalInorg, totalDiverted: totalOrg + totalInorg, inventoryOutputs: outputCount || 0 });
            setLoading(false);
        };
        fetch();
    }, []);

    const emisiCH4 = envStats.totalOrganic * 0.06;
    const treeEquiv = Math.floor(emisiCH4 / 0.022);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">Dampak Lingkungan</h2>
                <p className="text-xs text-slate-400 mt-1">Indikator efektivitas lingkungan dan pencegahan emisi gas rumah kaca.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <EnvCard gradient="from-emerald-500 to-teal-600" shadow="shadow-emerald-500/20" icon={<Recycle className="w-7 h-7" />} label="Total Sampah Dialihkan" value={`${envStats.totalDiverted.toFixed(1)} Kg`} />
                        <EnvCard gradient="from-green-500 to-emerald-600" shadow="shadow-green-500/20" icon={<Leaf className="w-7 h-7" />} label="Organik Terkelola" value={`${envStats.totalOrganic.toFixed(1)} Kg`} />
                        <EnvCard gradient="from-sky-500 to-blue-600" shadow="shadow-sky-500/20" icon={<Factory className="w-7 h-7" />} label="Anorganik Terkelola" value={`${envStats.totalInorganic.toFixed(1)} Kg`} />
                        <EnvCard gradient="from-lime-500 to-green-600" shadow="shadow-lime-500/20" icon={<Sprout className="w-7 h-7" />} label="Setara Pohon Ditanam" value={`${treeEquiv}`} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                            <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                                <div className="p-2 bg-emerald-50 rounded-xl"><Leaf className="w-4 h-4 text-emerald-600" /></div>
                                Pencegahan Emisi Gas Metana (CH4)
                            </h3>
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl p-6">
                                <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider mb-2">Estimasi Reduksi CO2 Equivalent</p>
                                <p className="text-4xl font-black text-emerald-700 font-mono">{emisiCH4.toFixed(1)} Ton</p>
                                <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">Dari {envStats.totalOrganic.toFixed(1)} Kg sampah organik yang berhasil dialihkan dari TPA dan tidak membusuk menghasilkan gas CH4.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-shadow">
                            <h3 className="text-sm font-extrabold text-slate-800 mb-5 flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-xl"><Factory className="w-4 h-4 text-blue-600" /></div>
                                Produksi Daur Ulang
                            </h3>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl p-6">
                                <p className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider mb-2">Total Pencatatan Output Gudang</p>
                                <p className="text-4xl font-black text-blue-700 font-mono">{envStats.inventoryOutputs}</p>
                                <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">Jumlah entry pencatatan produksi yang telah direkam oleh seluruh Bank Sampah.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function EnvCard({ gradient, shadow, icon, label, value }: { gradient: string; shadow: string; icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 text-white shadow-xl ${shadow} text-center relative overflow-hidden hover:-translate-y-1 transition-transform`}>
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
            <div className="relative z-10">
                <div className="mx-auto mb-3 flex justify-center opacity-90">{icon}</div>
                <p className="text-2xl font-black font-mono">{value}</p>
                <p className="text-[10px] text-white/80 font-bold mt-1">{label}</p>
            </div>
        </div>
    );
}
