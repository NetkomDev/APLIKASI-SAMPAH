"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Settings, Save, LayoutTemplate, BriefcaseBusiness, CheckCircle2, AlertCircle } from "lucide-react";

export default function SettingsPage() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from("system_settings")
            .select("key_name, value_text")
            .in("category", ["branding", "operational"]);

        if (data) {
            const settingsMap: Record<string, string> = {};
            data.forEach(s => {
                settingsMap[s.key_name] = s.value_text || "";
            });
            setSettings(settingsMap);
        }
        setIsLoading(false);
    };

    const handleChange = (key: string, value: string) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleSave = async () => {
        setIsSaving(true);
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

            setMessage({ type: "success", text: "Pengaturan Sistem berhasil disimpan." });
        } catch (error: any) {
            setMessage({ type: "error", text: `Gagal menyimpan pengaturan: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-white">Memuat data...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Pengaturan Sistem Utama</h1>
                    <p className="text-sm text-slate-400 mt-1">Konfigurasi visual dan aturan operasional global aplikasi.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 py-3 px-5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                    {isSaving ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Semua</>}
                </button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branding Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                            <LayoutTemplate className="h-5 w-5 text-orange-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Branding Tampilan</h2>
                    </div>

                    <div className="space-y-4">
                        <InputField
                            label="Nama Aplikasi"
                            value={settings.app_name}
                            onChange={(v: string) => handleChange("app_name", v)}
                        />
                        <InputField
                            label="Nama Pemerintah Daerah"
                            value={settings.pemda_name}
                            onChange={(v: string) => handleChange("pemda_name", v)}
                            placeholder="Contoh: Kabupaten Bogor"
                        />
                        <InputField
                            label="URL Logo Pemda"
                            value={settings.pemda_logo_url}
                            onChange={(v: string) => handleChange("pemda_logo_url", v)}
                            placeholder="https://..."
                        />
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-800/30 p-3 rounded-lg">
                        Nama dan logo ini akan menggantikan elemen default di header dan sidebar jika diatur.
                    </div>
                </div>

                {/* Operational Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <BriefcaseBusiness className="h-5 w-5 text-blue-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Operasional Inti</h2>
                    </div>

                    <div className="space-y-4">
                        <InputField
                            label="Radius Layanan Minimum (KM)"
                            value={settings.service_radius_km}
                            onChange={(v: string) => handleChange("service_radius_km", v)}
                            type="number"
                        />
                        <InputField
                            label="Nomor WhatsApp Customer Service"
                            value={settings.cs_phone_number}
                            onChange={(v: string) => handleChange("cs_phone_number", v)}
                            placeholder="08123456789"
                        />
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-800/30 p-3 rounded-lg">
                        Pengaturan operasional ini akan menjadi nilai default bagi Distrik/Bank Sampah yang tidak mengatur konfigurasi khusus.
                    </div>
                </div>
            </div>
        </div>
    );
}

function InputField({ label, placeholder, value, onChange, type = "text" }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all" />
        </div>
    );
}
