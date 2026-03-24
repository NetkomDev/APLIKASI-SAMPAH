import Link from 'next/link';
import { Leaf } from 'lucide-react';

export function NavigationMenuBar() {
    return (
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <div className="bg-brand-500 p-2 rounded-xl border border-brand-400 shadow-sm">
                        <Leaf className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-extrabold tracking-tight text-brand-600">
                        Beres <span className="text-slate-900">App</span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <a href="#cara-kerja" className="hover:text-brand-600 transition-colors">Cara Kerja</a>
                    <a href="#harga-sampah" className="hover:text-brand-600 transition-colors">Daftar Harga</a>
                    <a href="#mitra" className="hover:text-brand-600 transition-colors">Mitra Bank Sampah</a>
                    <div className="pl-6 border-l border-slate-200">
                        <Link href="/auth" className="px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all font-semibold active:scale-[0.98]">
                            Daftar Sekarang
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}
