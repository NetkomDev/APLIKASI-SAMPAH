import Link from 'next/link';
import { Leaf } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-slate-950 text-slate-300 py-16 border-t border-slate-900 border-opacity-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity mb-6 inline-block">
                            <div className="flex items-center gap-2">
                                <div className="bg-brand-500 p-2 rounded-xl border border-brand-400">
                                    <Leaf className="h-5 w-5 text-white" />
                                </div>
                                <span className="text-xl font-extrabold tracking-tight text-white">
                                    Beres <span className="text-brand-500">App</span>
                                </span>
                            </div>
                        </Link>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                            Beres (Benahi Residu Sampah) adalah inisiatif hijau inovatif yang menyulap aktivitas daur ulang dari buang jadi cuan, mendukung lingkungan yang bersih nan asri.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-6">Program</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><Link href="#cara-kerja" className="hover:text-brand-400 transition-colors">Cara Kerja</Link></li>
                            <li><Link href="#harga-sampah" className="hover:text-brand-400 transition-colors">Daftar Harga</Link></li>
                            <li><Link href="#mitra" className="hover:text-brand-400 transition-colors">Mitra Bank Sampah</Link></li>
                            <li><Link href="/auth" className="hover:text-brand-400 transition-colors">Daftar Kurir</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" className="hover:text-brand-400 transition-colors">Syarat & Ketentuan</a></li>
                            <li><a href="#" className="hover:text-brand-400 transition-colors">Kebijakan Privasi</a></li>
                            <li><a href="#" className="hover:text-brand-400 transition-colors">Disclaimer Data</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-sm tracking-widest uppercase mb-6">Hubungi Kami</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li className="flex items-start gap-2">
                                <span className="text-brand-400 mt-0.5">@</span>
                                <span>hello@beres.app</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-brand-400 mt-0.5 font-mono">#</span>
                                <span>+62 811-2233-4455</span>
                            </li>
                            <li className="flex items-start gap-2 mt-4 mt-8">
                                <div className="inline-flex gap-4">
                                    {/* Social icons placeholders */}
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-brand-500 hover:border-brand-500 hover:text-white transition-all cursor-pointer">In</div>
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-brand-500 hover:border-brand-500 hover:text-white transition-all cursor-pointer">Tw</div>
                                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-brand-500 hover:border-brand-500 hover:text-white transition-all cursor-pointer">Ig</div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
                    <p>&copy; {new Date().getFullYear()} Beres App - Benahi Residu Sampah. All rights reserved.</p>
                    <p className="mt-2 md:mt-0 font-medium">Bawa Dampak, Tuai Cuan.</p>
                </div>
            </div>
        </footer>
    );
}
