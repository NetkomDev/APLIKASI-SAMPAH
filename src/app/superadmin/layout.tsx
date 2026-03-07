"use client";

import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Shield, Users, Settings, LogOut, ChevronRight,
    Building2, Bot, BarChart3, Leaf, Menu, X
} from "lucide-react";

const sidebarItems = [
    { href: "/superadmin", label: "Dashboard", icon: BarChart3 },
    { href: "/superadmin/districts", label: "Kelola Distrik", icon: Building2 },
    { href: "/superadmin/bot-config", label: "Konfigurasi Bot WA", icon: Bot },
    { href: "/superadmin/settings", label: "Pengaturan Sistem", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/portal");
                return;
            }
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

            if (!profile || profile.role !== "superadmin") {
                router.push("/portal");
                return;
            }
            setLoading(false);
        };
        checkAuth();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/portal");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {/* Sidebar Header */}
                <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-800">
                    <div className="bg-brand-500/20 p-2.5 rounded-xl border border-brand-500/30">
                        <Shield className="h-5 w-5 text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight">Super Admin</h1>
                        <p className="text-[11px] text-slate-500">EcoSistem Digital</p>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-500 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 py-6 space-y-1.5">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                        ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="px-4 py-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="h-5 w-5" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-20 px-6 flex items-center border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4 text-slate-400 hover:text-white">
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-brand-400" />
                        <span className="text-sm font-bold text-white">Panel Kontrol Sistem</span>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
