"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

export function useSuperAdminTheme() {
    return useContext(ThemeContext);
}

export function SuperAdminThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const saved = localStorage.getItem("sa-theme");
        if (saved === "light" || saved === "dark") setTheme(saved);
    }, []);

    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("sa-theme", next);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

/* ── Theme Token Helper ──────────────────────────────── */
export function t(theme: Theme) {
    const isDark = theme === "dark";
    return {
        // Backgrounds
        pageBg: isDark ? "bg-slate-950" : "bg-gradient-to-br from-slate-50 via-white to-emerald-50/30",
        sidebarBg: isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200",
        headerBg: isDark ? "bg-slate-900/50 border-slate-800" : "bg-white/80 border-slate-200/60",
        cardBg: isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100 shadow-sm",
        cardInner: isDark ? "bg-slate-800/30 border-slate-700/50" : "bg-slate-50 border-slate-200/60",
        inputBg: isDark ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-500",
        selectBg: isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900",

        // Text  
        textPrimary: isDark ? "text-white" : "text-slate-900",
        textSecondary: isDark ? "text-slate-400" : "text-slate-700",
        textMuted: isDark ? "text-slate-500" : "text-slate-600",
        textHeading: isDark ? "text-white" : "text-slate-950",

        // Sidebar
        sidebarText: isDark ? "text-slate-400" : "text-slate-700",
        sidebarHover: isDark ? "hover:bg-slate-800 hover:text-white" : "hover:bg-slate-100 hover:text-slate-900",
        sidebarActive: isDark ? "bg-brand-500/10 text-brand-400 border-brand-500/20" : "bg-brand-50 text-brand-600 border-brand-200",
        sidebarTitle: isDark ? "text-white" : "text-slate-800",
        sidebarSubtitle: isDark ? "text-slate-500" : "text-slate-400",
        sidebarIcon: isDark ? "bg-brand-500/20 border-brand-500/30 text-brand-400" : "bg-brand-50 border-brand-200 text-brand-600",
        sidebarSep: isDark ? "border-slate-800" : "border-slate-200",

        // Buttons
        btnPrimary: "bg-brand-600 hover:bg-brand-500 text-white",
        btnDanger: isDark ? "text-red-400 hover:bg-red-500/10" : "text-red-500 hover:bg-red-50",

        // Badges  
        badgeBrand: isDark ? "bg-brand-500/10 text-brand-400 border-brand-500/20" : "bg-brand-50 text-brand-600 border-brand-200",
        badgeSuccess: isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-200",

        // Loading
        loaderBg: isDark ? "bg-slate-900" : "bg-white",
        loaderColor: isDark ? "border-brand-400/30 border-t-brand-400" : "border-brand-200 border-t-brand-600",

        // Overlay
        overlayBg: isDark ? "bg-black/60" : "bg-black/30",

        // Misc
        hoverCard: isDark ? "hover:border-slate-700" : "hover:shadow-md hover:border-slate-200",
    };
}
