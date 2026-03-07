import Link from 'next/link';
import { ArrowRight, Leaf } from 'lucide-react';

export function HeroSection() {
    return (
        <main className="flex-1">
            <section className="px-8 py-20 md:py-32 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-sm font-medium border border-brand-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                        </span>
                        Data-Driven Policy System
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
                        Kedaulatan Data <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-emerald-400">Pengelolaan Sampah</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                        Ekosistem terdistribusi untuk melacak timbulan sampah, efisiensi kinerja kurir, hingga analisis strategis per kabupaten menuju Zero Waste.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-4">
                        <Link href="/auth" className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all shadow-md">
                            Mulai Jadi Pahlawan Lingkungan
                        </Link>
                        <Link href="/gov" className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-600 text-white font-medium hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/20 transition-all">
                            Akses Dashboard Gov <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand-100 to-emerald-50 rounded-3xl transform rotate-3 scale-105 opacity-50"></div>
                    <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-slate-100 grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Reduksi TPA</p>
                                <p className="text-2xl font-bold text-slate-900">4,520 <span className="text-base font-normal text-slate-500">Ton</span></p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                                <Leaf className="h-6 w-6" />
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <p className="text-sm text-slate-500 font-medium pb-2">Kurir Aktif</p>
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-bold text-slate-900">124</p>
                                <p className="text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded flex mb-1 font-medium">+12%</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <p className="text-sm text-slate-500 font-medium pb-2">Cakupan Wilayah</p>
                            <div className="flex items-end gap-2">
                                <p className="text-3xl font-bold text-slate-900">18</p>
                                <p className="text-xs text-slate-500 mb-1">Kecamatan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
