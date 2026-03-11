"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Bot, MessageSquare, Save, Settings as SettingsIcon, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";
import { useSuperAdminTheme, t } from "@/components/superadmin/ThemeProvider";

interface WaMenuConfig {
    id: string;
    menu_key: string;
    menu_label: string;
    response_template: string;
    is_active: boolean;
    sort_order: number;
}

interface SystemSetting {
    key_name: string;
    value_text: string | null;
}

export default function BotConfigPage() {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    const [menus, setMenus] = useState<WaMenuConfig[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchData();

        // Setup polling for bot status & qr code
        const intervalId = setInterval(() => {
            fetchSettings();
        }, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const fetchSettings = async () => {
        const { data: settingData } = await supabase
            .from("system_settings")
            .select("key_name, value_text")
            .eq("category", "bot");

        if (settingData) {
            setSettings(prev => {
                const newSettings = { ...prev };
                settingData.forEach(s => {
                    newSettings[s.key_name] = s.value_text || "";
                });
                return newSettings;
            });
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        // Fetch menus
        const { data: menuData } = await supabase
            .from("wa_menu_configs")
            .select("*")
            .order("sort_order");

        if (menuData) setMenus(menuData);

        await fetchSettings();
        setIsLoading(false);
    };

    const handleMenuChange = (id: string, field: keyof WaMenuConfig, value: any) => {
        setMenus(menus.map(menu => menu.id === id ? { ...menu, [field]: value } : menu));
    };

    const handleSettingChange = (key: string, value: string) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleSaveMenu = async (menu: WaMenuConfig) => {
        setMessage(null);
        const { error } = await supabase
            .from("wa_menu_configs")
            .update({
                menu_label: menu.menu_label,
                response_template: menu.response_template,
                is_active: menu.is_active,
                sort_order: menu.sort_order
            })
            .eq("id", menu.id);

        if (error) {
            setMessage({ type: "error", text: `Gagal menyimpan menu ${menu.menu_key}: ${error.message}` });
        } else {
            setMessage({ type: "success", text: `Menu ${menu.menu_label} berhasil disimpan.` });
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        setMessage(null);
        try {
            const updates = Object.keys(settings).map(key => ({
                key_name: key,
                value_text: settings[key]
            }));

            // Upsert each setting
            for (const update of updates) {
                await supabase
                    .from("system_settings")
                    .update({ value_text: update.value_text })
                    .eq("key_name", update.key_name);
            }

            setMessage({ type: "success", text: "Pengaturan Bot berhasil disimpan." });
        } catch (error: any) {
            setMessage({ type: "error", text: `Gagal menyimpan pengaturan: ${error.message}` });
        } finally {
            setIsSavingSettings(false);
        }
    };

    if (isLoading) return <div className="text-white">Memuat data...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-extrabold ${tk.textHeading} tracking-tight`}>Konfigurasi Bot WhatsApp</h1>
                    <p className={`text-sm ${tk.textSecondary} mt-1`}>Atur template pesan, menu respons otomatis, dan pantau status bot WhatsApp.</p>
                </div>
            </div>

            {message && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Global Bot Settings & Status */}
                <div className="space-y-6">
                    {/* Bot Status / QR Code */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <Smartphone className="h-5 w-5 text-emerald-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Status Koneksi</h2>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${(settings.bot_status === "READY" || settings.bot_status === "CONNECTED") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                settings.bot_status === "WAITING_QR" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                    "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}>
                                {(settings.bot_status === "READY" || settings.bot_status === "CONNECTED") ? "Tersambung" :
                                    settings.bot_status === "WAITING_QR" ? "Menunggu Scan" : "Terputus"}
                            </span>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/50 rounded-xl border border-slate-800 relative z-10 min-h-[200px]">
                            {(settings.bot_status === "READY" || settings.bot_status === "CONNECTED") ? (
                                <div className="text-center space-y-3">
                                    <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                        <Bot className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <p className="text-sm font-medium text-emerald-400">Bot Siap Melayani</p>
                                    <p className="text-xs text-slate-500">Koneksi WhatsApp aktif dan stabil.</p>
                                </div>
                            ) : settings.bot_status === "WAITING_QR" && settings.bot_qr_code ? (
                                <div className="text-center space-y-4">
                                    <div className="mx-auto w-40 h-40 bg-white p-2 rounded-xl border-4 border-slate-800 shadow-xl overflow-hidden relative">
                                        <img src={settings.bot_qr_code} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                                    </div>
                                    <p className="text-sm font-medium text-amber-400 animate-pulse">Menunggu Scan QR...</p>
                                    <p className="text-xs text-slate-500">Buka WA &gt; Perangkat Tertaut &gt; Tautkan Perangkat</p>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                                        <AlertCircle className="h-8 w-8 text-red-400" />
                                    </div>
                                    <p className="text-sm font-medium text-red-400">Bot Terputus</p>
                                    <p className="text-xs text-slate-500">Bot sedang offline atau terjadi masalah di server VPS.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bot Global Messages */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <MessageSquare className="h-5 w-5 text-purple-400" />
                            </div>
                            <h2 className="text-lg font-bold text-white">Global Messages</h2>
                        </div>
                        <div className="space-y-4">
                            <TextAreaField
                                label="Pesan Sambutan (Awal Chat)"
                                value={settings.welcome_message || ""}
                                onChange={(v: string) => handleSettingChange("welcome_message", v)}
                            />
                            <TextAreaField
                                label="Header Menu Utama"
                                value={settings.menu_header || ""}
                                onChange={(v: string) => handleSettingChange("menu_header", v)}
                            />
                            <TextAreaField
                                label="Pesan Belum Terdaftar"
                                value={settings.unregistered_message || ""}
                                onChange={(v: string) => handleSettingChange("unregistered_message", v)}
                            />
                        </div>
                        <button
                            onClick={handleSaveSettings}
                            disabled={isSavingSettings}
                            className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all"
                        >
                            {isSavingSettings ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Pengaturan</>}
                        </button>
                    </div>
                </div>

                {/* Right Column: Dynamic Menus */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Bot className="h-5 w-5 text-brand-400" /> Daftar Menu & Balasan Otomatis
                    </h2>

                    {menus.map((menu) => (
                        <div key={menu.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                                        Keyword: {menu.menu_key}
                                    </span>
                                    {/* Toggle Active Switch */}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={menu.is_active}
                                            onChange={(e) => handleMenuChange(menu.id, "is_active", e.target.checked)}
                                        />
                                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        <span className="ml-2 text-xs font-medium text-slate-400">{menu.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={menu.sort_order}
                                        onChange={(e) => handleMenuChange(menu.id, "sort_order", parseInt(e.target.value))}
                                        className={`w-16 px-2 py-1 rounded border text-xs text-center ${tk.inputBg}`}
                                        title="Urutan Menu"
                                    />
                                    <button
                                        onClick={() => handleSaveMenu(menu)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded border transition ${tk.btnSecondary}`}
                                    >
                                        Simpan
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Label Menu (Tampil di List)"
                                    value={menu.menu_label}
                                    onChange={(v: string) => handleMenuChange(menu.id, "menu_label", v)}
                                />
                                <TextAreaField
                                    label="Template Balasan"
                                    value={menu.response_template}
                                    onChange={(v: string) => handleMenuChange(menu.id, "response_template", v)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function InputField({ label, placeholder, value, onChange, type = "text" }: {
    label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string;
}) {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${tk.inputBg}`} />
        </div>
    );
}

function TextAreaField({ label, placeholder, value, onChange, rows = 4 }: {
    label: string; placeholder?: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <textarea placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none ${tk.inputBg}`} />
        </div>
    );
}
