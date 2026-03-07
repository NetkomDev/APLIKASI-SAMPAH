import Link from 'next/link';
import { Leaf } from 'lucide-react';

export function NavigationMenuBar() {
    return (
        <header className="px-8 py-6 flex justify-between items-center border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-brand-600">
                <Leaf className="h-8 w-8 text-brand-500" />
                <span className="text-xl font-bold tracking-tight">EcoSistem<span className="text-slate-900">Digital</span></span>
            </div>
            <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
                <Link href="#features" className="hover:text-brand-600 transition">Fitur</Link>
                <Link href="#impact" className="hover:text-brand-600 transition">Dampak Keuangan</Link>
                <Link href="/auth" className="px-4 py-2 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100 transition">Login / Daftar</Link>
                <Link href="/admin" className="px-4 py-2 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200 transition">Portal Admin</Link>
            </nav>
        </header>
    );
}
