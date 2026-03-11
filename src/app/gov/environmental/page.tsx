"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';
import { TreePine, Leaf, Recycle, Factory } from 'lucide-react';

export default function EnvironmentalPage() {
    const [loading, setLoading] = useState(true);
    const [envStats, setEnvStats] = useState({
        totalOrganic: 0,
        totalInorganic: 0,
        totalDiverted: 0,
        inventoryOutputs: 0,
    });

    useEffect(() => {
        const fetch = async () => {
            // All transactions -> total organic / inorganic
            const { data: allTx } = await supabase.from('transactions').select('weight_organic, weight_inorganic');
            const totalOrg = allTx?.reduce((a, t) => a + (t.weight_organic || 0), 0) || 0;
            const totalInorg = allTx?.reduce((a, t) => a + (t.weight_inorganic || 0), 0) || 0;

            // Inventory outputs count
            const { count: outputCount } = await supabase.from('inventory_outputs').select('*', { count: 'exact', head: true });

            setEnvStats({
                totalOrganic: totalOrg,
                totalInorganic: totalInorg,
                totalDiverted: totalOrg + totalInorg,
                inventoryOutputs: outputCount || 0,
            });
            setLoading(false);
        };
        fetch();
    }, []);

    // Calculations
    const emisiCH4 = (envStats.totalOrganic * 0.06); // ton CO2 equivalent approx
    const treeEquiv = Math.floor(emisiCH4 / 0.022); // 1 tree absorbs ~22kg/year

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-white">Dampak Lingkungan</h2>
                <p className="text-xs text-slate-500 mt-1">Indikator efektivitas lingkungan dan pencegahan emisi gas rumah kaca.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <EnvCard
                            icon={<Recycle className="w-6 h-6" />}
                            label="Total Sampah Dialihkan"
                            value={`${envStats.totalDiverted.toFixed(1)} Kg`}
                            color="emerald"
                        />
                        <EnvCard
                            icon={<Leaf className="w-6 h-6" />}
                            label="Organik Terkelola"
                            value={`${envStats.totalOrganic.toFixed(1)} Kg`}
                            color="green"
                        />
                        <EnvCard
                            icon={<Factory className="w-6 h-6" />}
                            label="Anorganik Terkelola"
                            value={`${envStats.totalInorganic.toFixed(1)} Kg`}
                            color="sky"
                        />
                        <EnvCard
                            icon={<TreePine className="w-6 h-6" />}
                            label="Setara Pohon Ditanam"
                            value={`${treeEquiv}`}
                            color="lime"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Leaf className="w-4 h-4 text-emerald-400" /> Pencegahan Emisi Gas Metana (CH4)
                            </h3>
                            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/10 rounded-xl p-5">
                                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider mb-2">Estimasi Reduksi CO2 Equivalent</p>
                                <p className="text-4xl font-black text-emerald-400 font-mono">{emisiCH4.toFixed(1)} Ton</p>
                                <p className="text-[10px] text-slate-500 mt-3">Dari {envStats.totalOrganic.toFixed(1)} Kg sampah organik yang berhasil dialihkan dari TPA, dan tidak membusuk menghasilkan gas CH4.</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                <Factory className="w-4 h-4 text-brand-400" /> Produksi Daur Ulang
                            </h3>
                            <div className="bg-gradient-to-r from-brand-500/10 to-transparent border border-brand-500/10 rounded-xl p-5">
                                <p className="text-[10px] text-brand-300 font-bold uppercase tracking-wider mb-2">Total Pencatatan Output Gudang</p>
                                <p className="text-4xl font-black text-brand-400 font-mono">{envStats.inventoryOutputs}</p>
                                <p className="text-[10px] text-slate-500 mt-3">Jumlah entry pencatatan produksi yang telah direkam oleh seluruh Bank Sampah.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function EnvCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    const schemes: Record<string, string> = {
        emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/15 text-emerald-400',
        green: 'from-green-500/10 to-green-600/5 border-green-500/15 text-green-400',
        sky: 'from-sky-500/10 to-sky-600/5 border-sky-500/15 text-sky-400',
        lime: 'from-lime-500/10 to-lime-600/5 border-lime-500/15 text-lime-400',
    };
    const s = schemes[color] || schemes.emerald;
    return (
        <div className={`bg-gradient-to-br ${s.split(' ').slice(0, 2).join(' ')} border ${s.split(' ')[2]} rounded-2xl p-5 text-center`}>
            <div className={`${s.split(' ').slice(-1)} mx-auto mb-3 flex justify-center`}>{icon}</div>
            <p className="text-2xl font-black text-white font-mono">{value}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">{label}</p>
        </div>
    );
}
