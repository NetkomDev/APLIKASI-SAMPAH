import { BarChart3, TrendingUp, TrendingDown, Target, Building2, Droplets } from 'lucide-react';

export default function GovPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Environmental Analytics Overview</h2>
                    <p className="text-sm text-slate-500">Rekapitulasi progres Zero Waste Kabupaten</p>
                </div>
                <select className="bg-white border text-sm text-slate-700 font-medium px-4 py-2 rounded-lg form-select border-slate-300">
                    <option>Bulan Ini (Maret 2026)</option>
                    <option>Februari 2026</option>
                    <option>Tahun Berjalan 2026</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Waste Diversion Rate */}
                <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-500 font-medium text-sm">Waste Diversion Rate</h3>
                            <div className="p-2 bg-brand-50 rounded-lg">
                                <Target className="h-5 w-5 text-brand-500" />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-4xl font-bold text-slate-800">38.5%</span>
                            <span className="flex items-center text-sm font-medium text-brand-600 mb-1">
                                <TrendingUp className="h-4 w-4 mr-1" /> +2.4%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Dari target tahunan 45% sampah tereduksi di hulu.</p>
                    </div>

                    <div className="mt-8">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: '38.5%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Proyeksi Penghematan TPA */}
                <div className="col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-300 font-medium text-sm">Est. Penghematan TPA</h3>
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <Building2 className="h-5 w-5 text-brand-400" />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-4xl font-bold text-white">Rp 1.2M</span>
                            <span className="flex items-center text-sm font-medium text-brand-400 mb-1 bg-brand-950 px-2 py-0.5 rounded-full">
                                <TrendingUp className="h-3 w-3 mr-1" /> +15%
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Efisiensi BBM Truk + Tipping Fee bulan ini.</p>
                    </div>
                </div>

                {/* Emisi Gas Metana */}
                <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-500 font-medium text-sm">Reduksi Emisi CH4</h3>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Droplets className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-4xl font-bold text-slate-800">420T</span>
                            <span className="flex items-center text-sm font-medium text-brand-600 mb-1">
                                <TrendingDown className="h-4 w-4 mr-1" /> Sukses
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Pencegahan pembusukan sampah organik di TPA.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Grafik Tonase */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Tren Tonase Kategori Sampah</h3>
                        <button className="text-sm text-brand-600 font-medium hover:text-brand-700">Ekspor Laporan PDF</button>
                    </div>
                    <div className="flex-1 border border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center relative">
                        <div className="text-center z-10 p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
                            <BarChart3 className="h-10 w-10 text-brand-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-600">Chart Component Here</p>
                            <p className="text-xs text-slate-500 mt-1">Comparison: Organik vs Anorganik</p>
                        </div>
                    </div>
                </div>

                {/* Economic Impact Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Perputaran Ekonomi Lokal</h3>
                        <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-1 rounded-lg">Real-time</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col justify-center gap-2">
                            <p className="text-sm font-medium text-slate-500 text-center">Saldo Warga Cair</p>
                            <p className="text-3xl font-bold text-slate-800 text-center">Rp 345Jt</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex flex-col justify-center gap-2">
                            <p className="text-sm font-medium text-slate-500 text-center">Komisi Kurir</p>
                            <p className="text-3xl font-bold text-slate-800 text-center">Rp 120Jt</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
