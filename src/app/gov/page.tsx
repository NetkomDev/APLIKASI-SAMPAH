import { BarChart3, TrendingUp, TrendingDown, Target, Building2, Droplets } from 'lucide-react';

export default function GovPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Laporan Agregasi Lingkungan (Distrik)</h2>
                    <p className="text-sm text-slate-500">Memonitor proyeksi zero waste per kecamatan/kelurahan</p>
                </div>
                <select className="bg-white border text-sm text-slate-700 font-medium px-4 py-2 rounded-lg form-select border-slate-300 shadow-sm focus:ring-brand-500 focus:border-brand-500 outline-none">
                    <option>Harian (Hari Ini)</option>
                    <option>Bulanan (Maret 2026)</option>
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
                            <span className="flex items-center text-xs font-medium text-emerald-600 mb-1">
                                <TrendingUp className="h-3 w-3 mr-1" /> +2.4%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Dari target tahunan 45% sampah tereduksi di hulu.</p>
                    </div>

                    <div className="mt-8">
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full transition-all duration-1000" style={{ width: '38.5%' }}></div>
                        </div>
                    </div>
                </div>

                {/* Proyeksi Penghematan TPA */}
                <div className="col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between border border-slate-700">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-slate-300 font-medium text-sm">Est. Penghematan TPA</h3>
                            <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
                                <Building2 className="h-5 w-5 text-brand-400" />
                            </div>
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-4xl font-bold text-white">Rp 1.2M</span>
                            <span className="flex items-center text-xs font-bold text-emerald-400 mb-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <TrendingUp className="h-3 w-3 mr-1" /> +15%
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Efisiensi operasional BBM Truk & Tipping Fee.</p>
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
                            <span className="flex items-center text-xs font-bold text-emerald-600 mb-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <TrendingDown className="h-3 w-3 mr-1" /> Stabil
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Pencegahan pembusukan sampah organik di TPA.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Grafik Tonase */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[400px] flex flex-col relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6 z-10">
                        <h3 className="text-lg font-bold text-slate-800">Grafik Tonase Harian per Wilayah</h3>
                        <button className="text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors">Unduh Laporan PDF</button>
                    </div>
                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center relative z-10 transition-colors group-hover:border-brand-200">
                        <div className="text-center p-6">
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="h-6 w-6 text-brand-500" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">Modul Grafik Live (Tahap Pengembangan)</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Grafik ini akan menampilan kurva perbandingan sumbangan tonase harian dari masing-masing kecamatan.</p>
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
