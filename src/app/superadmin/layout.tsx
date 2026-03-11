"use client";

import { useState, useEffect, ReactNode } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    Shield, Users, Settings, LogOut, ChevronRight,
    Building2, Bot, BarChart3, Leaf, Menu, X, Truck, Store, Sun, Moon
} from "lucide-react";
import { SuperAdminThemeProvider, useSuperAdminTheme, t } from "@/components/superadmin/ThemeProvider";

const sidebarItems = [
    { href: "/superadmin", label: "Dashboard", icon: BarChart3 },
    { href: "/superadmin/bank-sampah-units", label: "Cabang Bank Sampah", icon: Building2 },
    { href: "/superadmin/courier-quotas", label: "Kuota Kurir", icon: Truck },
    { href: "/superadmin/market", label: "Market & Pricing", icon: Store },
    { href: "/superadmin/bot-config", label: "Konfigurasi Bot WA", icon: Bot },
    { href: "/superadmin/settings", label: "Pengaturan Sistem", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    return (
        <SuperAdminThemeProvider>
            <InnerLayout>{children}</InnerLayout>
        </SuperAdminThemeProvider>
    );
}

function InnerLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useSuperAdminTheme();
    const tk = t(theme);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push("/portal"); return; }
            const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
            if (!profile || profile.role !== "superadmin") { router.push("/portal"); return; }
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
            <div className={`min-h-screen ${tk.loaderBg} flex items-center justify-center`}>
                <div className={`h-8 w-8 border-2 ${tk.loaderColor} rounded-full animate-spin`} />
            </div>
        );
    }

    return (
        <div data-sa-theme={theme} className={`min-h-screen ${tk.pageBg} flex transition-colors duration-300`}>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className={`fixed inset-0 ${tk.overlayBg} z-40 lg:hidden`} onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 ${tk.sidebarBg} border-r flex flex-col transform transition-all duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {/* Sidebar Header */}
                <div className={`h-20 px-6 flex items-center gap-3 border-b ${tk.sidebarSep}`}>
                    <div className={`p-2.5 rounded-xl border ${tk.sidebarIcon}`}>
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className={`text-sm font-bold ${tk.sidebarTitle} tracking-tight`}>Super Admin</h1>
                        <p className={`text-[11px] ${tk.sidebarSubtitle}`}>Beres | Benahi Residu Sampah</p>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className={`ml-auto lg:hidden ${tk.sidebarText} hover:text-slate-800`}>
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
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? `${tk.sidebarActive} border` : `${tk.sidebarText} ${tk.sidebarHover}`}`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className={`px-4 py-4 border-t ${tk.sidebarSep}`}>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium ${tk.btnDanger} transition-all`}
                    >
                        <LogOut className="h-5 w-5" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className={`h-16 px-6 flex items-center justify-between border-b ${tk.headerBg} backdrop-blur-xl sticky top-0 z-30 transition-colors duration-300`}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className={`lg:hidden mr-2 ${tk.textSecondary}`}>
                            <Menu className="h-6 w-6" />
                        </button>
                        <Leaf className="h-5 w-5 text-brand-500" />
                        <span className={`text-sm font-bold ${tk.textPrimary}`}>Panel Kontrol Sistem</span>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                            theme === "dark"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                        }`}
                        title={theme === "dark" ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
                    >
                        {theme === "dark" ? (
                            <>
                                <Sun className="h-4 w-4" />
                                <span className="hidden sm:inline">Tema Terang</span>
                            </>
                        ) : (
                            <>
                                <Moon className="h-4 w-4" />
                                <span className="hidden sm:inline">Tema Gelap</span>
                            </>
                        )}
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
