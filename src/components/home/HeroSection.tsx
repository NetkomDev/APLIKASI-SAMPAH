import Link from 'next/link';
import { ArrowRight, Leaf, ShieldCheck, MapPin, Truck } from 'lucide-react';

export function HeroSection() {
    return (
        <main className="flex-1 w-full bg-slate-50 relative overflow-hidden">
            {/* Background Ornaments */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-100/40 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            <section className="px-6 pt-12 pb-20 lg:pt-16 lg:pb-32 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 relative z-10">

                {/* Left Text Content */}
                <div className="flex-1 flex flex-col items-start space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
                        </span>
                        <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Data-Driven Policy System</span>
                    </div>

                    {/* Headline */}
                    <div className="space-y-4">
                        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                            Kedaulatan Data <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-emerald-500">
                                Pengelolaan Sampah
                            </span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                            Ekosistem digital terdistribusi untuk melacak timbulan sampah dari rumah tangga, memonitor efisiensi kinerja kurir, hingga menyediakan analisis data strategis per kabupaten menuju visi Zero Waste.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
                        <Link href="/auth" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98]">
                            Mulai Jadi Pahlawan Lingkungan
                        </Link>
                        <Link href="/gov" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 hover:text-brand-600 transition-all shadow-sm active:scale-[0.98] group">
                            Dashboard Pemerintah
                            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
                        </Link>
                    </div>

                    {/* Trust Indicators */}
                    <div className="flex items-center gap-6 pt-6 border-t border-slate-200 w-full sm:max-w-md">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-brand-500" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sistem Terenkripsi</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-500" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akurasi GPS</span>
                        </div>
                    </div>
                </div>

                {/* Right Floating Stats Area */}
                <div className="flex-1 w-full lg:w-auto relative lg:perspective-1000">
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-200/60 to-emerald-100/60 rounded-3xl transform rotate-3 scale-105 opacity-60 backdrop-blur-md"></div>

                    <div className="relative bg-white/90 p-8 rounded-3xl shadow-2xl border border-white grid grid-cols-2 gap-5 backdrop-blur-xl z-10 w-full transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500">
                        {/* Main Stat Card */}
                        <div className="col-span-2 bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-6 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                            <div>
                                <p className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Total Reduksi TPA</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-extrabold text-slate-900 tracking-tight">4,520</p>
                                    <span className="text-sm font-semibold text-slate-500">Ton</span>
                                </div>
                            </div>
                            <div className="h-14 w-14 rounded-2xl bg-brand-100 flex items-center justify-center shadow-inner border border-brand-50">
                                <Leaf className="h-7 w-7 text-brand-600" />
                            </div>
                        </div>

                        {/* Sub Stat Card 1 */}
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:border-brand-200 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-blue-50 rounded-lg"><Truck className="h-4 w-4 text-blue-500" /></div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kurir Aktif</p>
                            </div>
                            <div className="flex items-end flex-wrap gap-2">
                                <p className="text-3xl font-extrabold text-slate-900">124</p>
                                <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md mb-1 border border-emerald-100">+12%</p>
                            </div>
                        </div>

                        {/* Sub Stat Card 2 */}
                        <div className="bg-white border border-slate-100 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:border-emerald-200 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-orange-50 rounded-lg"><MapPin className="h-4 w-4 text-orange-500" /></div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cakupan Wilayah</p>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-3xl font-extrabold text-slate-900">18</p>
                                <p className="text-xs font-semibold text-slate-500 mb-1">Kecamatan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
