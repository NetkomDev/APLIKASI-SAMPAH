"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Map, Settings, PieChart, Activity, LogOut, PackageSearch, TreePine, PackageCheck } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '@/infrastructure/config/supabase';

interface SidebarProps {
    role: 'admin' | 'gov';
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname();

    const adminLinks = [
        { name: 'Command Center', href: '/admin', icon: Activity },
        { name: 'Warga & Kurir', href: '/admin/fleet', icon: Users },
        { name: 'Fraud & Transaksi', href: '/admin/transactions', icon: PackageSearch },
        { name: 'Produksi & Gudang', href: '/admin/inventory', icon: PackageCheck },
        { name: 'Pencairan Dana', href: '/admin/finance', icon: Settings },
    ];

    const govLinks = [
        { name: 'Overview', href: '/gov', icon: LayoutDashboard },
        { name: 'Geospatial Heatmap', href: '/gov/heatmap', icon: Map },
        { name: 'Economic Impact', href: '/gov/impact', icon: PieChart },
        { name: 'Reward Engine', href: '/gov/rewards', icon: Users },
        { name: 'Environmental', href: '/gov/environmental', icon: TreePine },
    ];

    const links = role === 'admin' ? adminLinks : govLinks;

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col pt-5 pb-4 transition-all duration-300 z-50 overflow-y-auto font-sans shadow-xl border-r border-slate-800">
            <div className="flex items-center flex-shrink-0 px-6 mb-8 gap-3">
                <div className="bg-brand-500 rounded p-1.5 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-white text-lg font-bold tracking-tight">Beres</span>
                    <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">{role === 'admin' ? 'Operational' : 'Government'}</span>
                </div>
            </div>
            <nav className="flex-1 px-4 space-y-1">
                {links.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                isActive
                                    ? 'bg-slate-800 text-white'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors'
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300',
                                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-4 mt-auto">
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }}
                    className="w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                    <LogOut className="text-slate-500 group-hover:text-slate-300 mr-3 flex-shrink-0 h-5 w-5 transition-colors" />
                    Keluar Sistem
                </button>
            </div>
        </aside>
    );
}
