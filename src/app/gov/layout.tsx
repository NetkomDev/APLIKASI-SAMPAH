"use client";

import { AuthGuard } from '@/components/auth/AuthGuard';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Map, PieChart, Users, TreePine, LogOut } from 'lucide-react';
import { supabase } from '@/infrastructure/config/supabase';
import clsx from 'clsx';

const navItems = [
    { name: 'Overview', href: '/gov', icon: LayoutDashboard, color: 'from-emerald-500 to-teal-600' },
    { name: 'Geospasial', href: '/gov/heatmap', icon: Map, color: 'from-blue-500 to-indigo-600' },
    { name: 'Ekonomi', href: '/gov/impact', icon: PieChart, color: 'from-amber-500 to-orange-600' },
    { name: 'Reward', href: '/gov/rewards', icon: Users, color: 'from-violet-500 to-purple-600' },
    { name: 'Lingkungan', href: '/gov/environmental', icon: TreePine, color: 'from-green-500 to-emerald-600' },
];

export default function GovLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/portal');
    };

    return (
        <AuthGuard allowedRoles={['gov', 'admin']}>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 font-sans">
                {/* Top Navigation Bar */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                    <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
                        {/* Logo + Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-extrabold tracking-tight text-slate-800 leading-tight">Strategic Government Dashboard</h1>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.15em]">Dinas Lingkungan Hidup Kabupaten</p>
                            </div>
                        </div>

                        {/* Navigation Pills */}
                        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-2xl p-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => router.push(item.href)}
                                        className={clsx(
                                            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300',
                                            isActive
                                                ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/80'
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
                            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Keluar</span>
                        </button>
                    </div>

                    {/* Mobile Nav */}
                    <div className="md:hidden flex items-center gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={clsx(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all',
                                        isActive
                                            ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                                            : 'text-slate-500 bg-slate-100'
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
