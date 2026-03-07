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
                        EcoSistem<span className="text-slate-900">Digital</span>
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <Link href="#features" className="hover:text-brand-600 transition-colors">Fitur</Link>
                    <Link href="#impact" className="hover:text-brand-600 transition-colors">Dampak Keuangan</Link>
                    <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                        <Link href="/auth" className="px-5 py-2.5 rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-all font-semibold active:scale-[0.98]">
                            Login Warga
                        </Link>
                        <Link href="/admin" className="px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all font-semibold active:scale-[0.98]">
                            Portal Operator
                        </Link>
                    </div>
                </nav>
            </div>
        </header>
    );
}
