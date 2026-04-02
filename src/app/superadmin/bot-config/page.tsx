"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
    Bot, MessageSquare, Save, Smartphone, CheckCircle2, AlertCircle,
    RefreshCw, Key, Phone, Settings, Hash, ToggleLeft, ToggleRight, Info, Globe
} from "lucide-react";
import { useSuperAdminTheme, t } from "@/components/superadmin/ThemeProvider";

interface WaMenuConfig {
    id: string;
    menu_key: string;
    menu_label: string;
    response_template: string;
    is_active: boolean;
    sort_order: number;
}

const BOT_SETTING_KEYS = [
    "wa_api_token",
    "wa_phone_number_id",
    "wa_business_account_id",
    "cs_phone_number",
    "app_domain",
    "welcome_message",
    "menu_header",
    "unregistered_message",
    "registration_welcome",
];

export default function BotConfigPage() {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    const [menus, setMenus] = useState<WaMenuConfig[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [savingMenuId, setSavingMenuId] = useState<string | null>(null);
    const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const [{ data: menuData }, { data: settingData }] = await Promise.all([
            supabase.from("wa_menu_configs").select("*").order("sort_order"),
            supabase.from("system_settings").select("key_name, value_text"),
        ]);
        if (menuData) setMenus(menuData);
        if (settingData) {
            const map: Record<string, string> = {};
            settingData.forEach(s => { map[s.key_name] = s.value_text || ""; });
            setSettings(map);
        }
        setIsLoading(false);
    }, []);

    // Check Meta API token validity
    const checkApiStatus = useCallback(async () => {
        setApiStatus("checking");
        const token = settings["wa_api_token"];
        const phoneId = settings["wa_phone_number_id"];
        if (!token || !phoneId) { setApiStatus("error"); return; }
        try {
            const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}?fields=display_phone_number,verified_name&access_token=${token}`);
            const data = await res.json();
            setApiStatus(data.error ? "error" : "ok");
        } catch {
            setApiStatus("error");
        }
    }, [settings]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (settings["wa_api_token"] && settings["wa_phone_number_id"]) {
            checkApiStatus();
        }
    }, [settings["wa_api_token"], settings["wa_phone_number_id"]]);

    const handleMenuChange = (id: string, field: keyof WaMenuConfig, value: any) => {
        setMenus(menus.map(menu => menu.id === id ? { ...menu, [field]: value } : menu));
    };

    const handleSettingChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveMenu = async (menu: WaMenuConfig) => {
        setSavingMenuId(menu.id);
        setMessage(null);
        const { error } = await supabase.from("wa_menu_configs").update({
            menu_label: menu.menu_label,
            response_template: menu.response_template,
            is_active: menu.is_active,
            sort_order: menu.sort_order
        }).eq("id", menu.id);
        setSavingMenuId(null);
        if (error) {
            setMessage({ type: "error", text: `Gagal menyimpan menu: ${error.message}` });
        } else {
            setMessage({ type: "success", text: `✅ Menu "${menu.menu_label}" berhasil disimpan.` });
        }
        setTimeout(() => setMessage(null), 4000);
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        setMessage(null);
        try {
            const CATEGORY_MAP: Record<string, string> = { app_domain: "branding" };
            for (const key of BOT_SETTING_KEYS) {
                if (settings[key] !== undefined) {
                    const category = CATEGORY_MAP[key] || "bot";
                    await supabase.from("system_settings")
                        .upsert({ key_name: key, value_text: settings[key], category }, { onConflict: "key_name" });
                }
            }
            setMessage({ type: "success", text: "✅ Semua pengaturan bot berhasil disimpan." });
            checkApiStatus();
        } catch (error: any) {
            setMessage({ type: "error", text: `Gagal menyimpan: ${error.message}` });
        } finally {
            setIsSavingSettings(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-brand-400 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-extrabold ${tk.textHeading} tracking-tight`}>
                        Konfigurasi Bot WhatsApp
                    </h1>
                    <p className={`text-sm ${tk.textSecondary} mt-1`}>
                        Kelola token Meta API, pesan global, dan aktif/nonaktifkan menu bot secara fleksibel.
                    </p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-all">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {/* Alert Message */}
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT COLUMN ── */}
                <div className="space-y-6">

                    {/* Status Koneksi META API */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <Smartphone className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Status Koneksi Meta API</h2>
                                <p className="text-xs text-slate-500">WhatsApp Cloud API (Resmi)</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-5 bg-slate-950/50 rounded-xl border border-slate-800 min-h-[140px]">
                            {apiStatus === "checking" && (
                                <div className="text-center space-y-2">
                                    <RefreshCw className="h-8 w-8 text-slate-500 animate-spin mx-auto" />
                                    <p className="text-xs text-slate-500">Memeriksa token...</p>
                                </div>
                            )}
                            {apiStatus === "ok" && (
                                <div className="text-center space-y-3">
                                    <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                        <Bot className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-400">Bot Aktif & Terhubung</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Token Meta API valid dan berfungsi.</p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Live
                                    </span>
                                </div>
                            )}
                            {apiStatus === "error" && (
                                <div className="text-center space-y-3">
                                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                                        <AlertCircle className="h-8 w-8 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-red-400">Koneksi Gagal</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Token tidak valid atau Phone ID salah.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-2">
                            <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-400">Bot berjalan di VPS via polling Supabase Realtime. Status ini memverifikasi token Meta API secara langsung.</p>
                        </div>

                        <button onClick={checkApiStatus} className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all">
                            <RefreshCw className="h-3.5 w-3.5" /> Cek Ulang Koneksi
                        </button>
                    </div>

                    {/* Kredensial Meta API */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <Key className="h-5 w-5 text-blue-400" />
                            </div>
                            <h2 className="text-base font-bold text-white">Kredensial Meta API</h2>
                        </div>
                        <InputField
                            label="WA Phone Number ID"
                            placeholder="Contoh: 1050331384824809"
                            value={settings["wa_phone_number_id"] || ""}
                            onChange={(v) => handleSettingChange("wa_phone_number_id", v)}
                            icon={<Hash className="h-4 w-4" />}
                        />
                        <InputField
                            label="Business Account ID"
                            placeholder="Contoh: 2194082477665446"
                            value={settings["wa_business_account_id"] || ""}
                            onChange={(v) => handleSettingChange("wa_business_account_id", v)}
                            icon={<Hash className="h-4 w-4" />}
                        />
                        <TextAreaField
                            label="WA API Token (dari Meta Developer)"
                            placeholder="EAAXJe9Jm8M0BQ..."
                            value={settings["wa_api_token"] || ""}
                            onChange={(v) => handleSettingChange("wa_api_token", v)}
                            rows={3}
                        />
                        <p className="text-xs text-slate-500">⚠️ Token ini bersifat rahasia. Jangan bagikan ke siapapun.</p>
                    </div>

                    {/* Nomor CS */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <Phone className="h-5 w-5 text-amber-400" />
                            </div>
                            <h2 className="text-base font-bold text-white">Nomor Customer Service</h2>
                        </div>
                        <InputField
                            label="Nomor CS (Format: 08xxxxxxxxxx)"
                            placeholder="08123456789"
                            value={settings["cs_phone_number"] || ""}
                            onChange={(v) => handleSettingChange("cs_phone_number", v)}
                        />
                        <p className="text-xs text-slate-500">Nomor ini akan ditampilkan otomatis di menu Bantuan / CS bot.</p>
                    </div>

                    {/* Domain / Website */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <Globe className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Domain / Website</h2>
                                <p className="text-xs text-slate-500">URL utama aplikasi web</p>
                            </div>
                        </div>
                        <InputField
                            label="URL Domain Aplikasi"
                            placeholder="https://beres.vercel.app"
                            value={settings["app_domain"] || ""}
                            onChange={(v) => handleSettingChange("app_domain", v)}
                            icon={<Globe className="h-4 w-4" />}
                        />
                        <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex gap-2">
                            <Info className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-400 space-y-1">
                                <p>Domain ini digunakan bot WA untuk membuat link dinamis:</p>
                                <ul className="list-disc list-inside text-slate-500 space-y-0.5">
                                    <li>Link QR Code Warga</li>
                                    <li>Link Pendaftaran & Referral</li>
                                    <li>Link Dashboard Kurir</li>
                                    <li>Link Formulir Registrasi Kurir</li>
                                </ul>
                                <p className="text-amber-400 mt-1">⚠️ Pastikan format URL lengkap dengan <code className="bg-slate-800 px-1 rounded">https://</code> tanpa garis miring di akhir.</p>
                            </div>
                        </div>
                    </div>

                    {/* Global Messages */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <MessageSquare className="h-5 w-5 text-purple-400" />
                            </div>
                            <h2 className="text-base font-bold text-white">Pesan Global Bot</h2>
                        </div>
                        <TextAreaField
                            label="Pesan Registrasi Berhasil"
                            placeholder="Selamat {nama}, Anda telah terdaftar!"
                            value={settings["registration_welcome"] || ""}
                            onChange={(v) => handleSettingChange("registration_welcome", v)}
                            hint="Variabel: {nama}"
                            rows={3}
                        />
                        <TextAreaField
                            label="Pesan Pengguna Belum Terdaftar"
                            placeholder="Nomor Anda belum terdaftar..."
                            value={settings["unregistered_message"] || ""}
                            onChange={(v) => handleSettingChange("unregistered_message", v)}
                            rows={3}
                        />
                    </div>

                    {/* Tombol Simpan Semua Pengaturan */}
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSavingSettings}
                        className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/30"
                    >
                        {isSavingSettings ? <><RefreshCw className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><Save className="h-4 w-4" /> Simpan Semua Pengaturan</>}
                    </button>
                </div>

                {/* ── RIGHT COLUMN: Dynamic Menu ── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Bot className="h-5 w-5 text-brand-400" /> Menu & Balasan Otomatis Bot
                        </h2>
                        <span className="text-xs text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                            {menus.filter(m => m.is_active).length}/{menus.length} menu aktif
                        </span>
                    </div>

                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-2">
                        <Info className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-400">
                            Perubahan <strong className="text-white">Label Menu</strong> dan <strong className="text-white">Template Balasan</strong> akan langsung diterapkan bot setelah disimpan. Toggle <strong className="text-white">Aktif/Nonaktif</strong> menentukan apakah menu muncul di daftar utama bot.
                        </p>
                    </div>

                    {menus.map((menu) => (
                        <div key={menu.id} className={`bg-slate-900 border rounded-2xl p-5 transition-all ${menu.is_active ? "border-slate-700" : "border-slate-800 opacity-60"}`}>
                            {/* Menu Header Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                                        /{menu.menu_key}
                                    </span>
                                    {/* Toggle Active */}
                                    <button
                                        onClick={() => handleMenuChange(menu.id, "is_active", !menu.is_active)}
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${menu.is_active
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                            : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500"
                                        }`}
                                    >
                                        {menu.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                                        {menu.is_active ? "Aktif" : "Nonaktif"}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-slate-500">Urutan:</label>
                                    <input
                                        type="number"
                                        value={menu.sort_order}
                                        onChange={(e) => handleMenuChange(menu.id, "sort_order", parseInt(e.target.value))}
                                        className="w-16 px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-500"
                                    />
                                    <button
                                        onClick={() => handleSaveMenu(menu)}
                                        disabled={savingMenuId === menu.id}
                                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 text-white transition-all"
                                    >
                                        {savingMenuId === menu.id ? "..." : "Simpan"}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    label="Label Menu (tampil di bot)"
                                    value={menu.menu_label}
                                    onChange={(v) => handleMenuChange(menu.id, "menu_label", v)}
                                />
                                <TextAreaField
                                    label="Template Balasan"
                                    value={menu.response_template}
                                    onChange={(v) => handleMenuChange(menu.id, "response_template", v)}
                                    rows={3}
                                    hint="Variabel: {nama}, {nomor_cs}, {link_referral}"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function InputField({ label, placeholder, value, onChange, type = "text", icon }: {
    label: string; placeholder?: string; value: string;
    onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full ${icon ? "pl-9" : "pl-4"} pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500`}
                />
            </div>
        </div>
    );
}

function TextAreaField({ label, placeholder, value, onChange, rows = 4, hint }: {
    label: string; placeholder?: string; value: string;
    onChange: (v: string) => void; rows?: number; hint?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <textarea
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 resize-none"
            />
            {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
    );
}
