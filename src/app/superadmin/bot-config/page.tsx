"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Bot, MessageSquare, Save, Settings as SettingsIcon, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";

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
    const [menus, setMenus] = useState<WaMenuConfig[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        // Fetch menus
        const { data: menuData } = await supabase
            .from("wa_menu_configs")
            .select("*")
            .order("sort_order");

        if (menuData) setMenus(menuData);

        // Fetch Bot settings
        const { data: settingData } = await supabase
            .from("system_settings")
            .select("key_name, value_text")
            .eq("category", "bot");

        if (settingData) {
            const settingsMap: Record<string, string> = {};
            settingData.forEach(s => {
                settingsMap[s.key_name] = s.value_text || "";
            });
            setSettings(settingsMap);
        }
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
                    <h1 className="text-2xl font-bold text-white tracking-tight">Konfigurasi Bot WhatsApp</h1>
                    <p className="text-sm text-slate-400 mt-1">Atur template pesan dan menu respons otomatis bot.</p>
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
                {/* Left Column: Global Bot Settings */}
                <div className="space-y-6">
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
                                        className="w-16 px-2 py-1 bg-slate-800 rounded border border-slate-700 text-xs text-white text-center"
                                        title="Urutan Menu"
                                    />
                                    <button
                                        onClick={() => handleSaveMenu(menu)}
                                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-slate-700 transition"
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
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
        </div>
    );
}

function TextAreaField({ label, placeholder, value, onChange, rows = 4 }: {
    label: string; placeholder?: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <textarea placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
                className="w-full px-4 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none" />
        </div>
    );
}
