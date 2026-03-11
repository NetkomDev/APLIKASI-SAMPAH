"use client";

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Map, PieChart, Users, TreePine, LogOut } from 'lucide-react';
import { supabase } from '@/infrastructure/config/supabase';
import clsx from 'clsx';

const navItems = [
    { name: 'Overview', href: '/gov', icon: LayoutDashboard },
    { name: 'Geospasial', href: '/gov/heatmap', icon: Map },
    { name: 'Ekonomi', href: '/gov/impact', icon: PieChart },
    { name: 'Reward', href: '/gov/rewards', icon: Users },
    { name: 'Lingkungan', href: '/gov/environmental', icon: TreePine },
];

export default function GovLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/portal');
    };

    return (
        <AuthGuard allowedRoles={['gov', 'admin']}>
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
                {/* Top Bar */}
                <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/60">
                    <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight text-white leading-tight">Strategic Government Dashboard</h1>
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Dinas Lingkungan Hidup Kabupaten</p>
                            </div>
                        </div>

                        {/* Navigation Pills */}
                        <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/60 rounded-2xl p-1.5">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className={clsx(
                                            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                                            isActive
                                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                        )}
                                    >
                                        <item.icon className="w-3.5 h-3.5" />
                                        {item.name}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-slate-800/50"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Keluar</span>
                        </button>
                    </div>

                    {/* Mobile Nav */}
                    <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={clsx(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all',
                                        isActive
                                            ? 'bg-brand-600 text-white'
                                            : 'text-slate-500 bg-slate-800/40'
                                    )}
                                >
                                    <item.icon className="w-3 h-3" />
                                    {item.name}
                                </button>
                            );
                        })}
                    </div>
                </header>

                {/* Content */}
                <main className="max-w-[1440px] mx-auto px-6 py-6">
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
