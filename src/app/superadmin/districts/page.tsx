"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import {
    Building2, Plus, CheckCircle2, AlertCircle,
    Eye, EyeOff, Users, Shield, X
} from "lucide-react";

interface District {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    gov_id?: string;
    gov_profile?: { id: string; full_name: string; phone_number: string } | null;
    admin_profiles?: { id: string; full_name: string; phone_number: string; role: string }[];
}

export default function DistrictsPage() {
    const [districts, setDistricts] = useState<District[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form fields
    const [districtName, setDistrictName] = useState("");
    const [districtDesc, setDistrictDesc] = useState("");
    const [govName, setGovName] = useState("");
    const [govEmail, setGovEmail] = useState("");
    const [govPhone, setGovPhone] = useState("");
    const [govPassword, setGovPassword] = useState("");
    const [showGovPassword, setShowGovPassword] = useState(false);
    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    // Edit Form State
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [editDistrictName, setEditDistrictName] = useState("");
    const [editDistrictDesc, setEditDistrictDesc] = useState("");
    const [editGovName, setEditGovName] = useState("");
    const [editGovPhone, setEditGovPhone] = useState("");
    const [editAdminName, setEditAdminName] = useState("");
    const [editAdminPhone, setEditAdminPhone] = useState("");
    const [editIsActive, setEditIsActive] = useState(true);

    useEffect(() => {
        fetchDistricts();
    }, []);

    const fetchDistricts = async () => {
        const { data } = await supabase
            .from("districts")
            .select("*")
            .order("created_at", { ascending: false });

        if (data) {
            // For each district, fetch linked profiles
            const enriched = await Promise.all(
                data.map(async (d) => {
                    const { data: govProfile } = await supabase
                        .from("profiles")
                        .select("id, full_name, phone_number")
                        .eq("id", d.gov_id)
                        .single();

                    const { data: adminProfiles } = await supabase
                        .from("profiles")
                        .select("id, full_name, phone_number, role")
                        .eq("district_id", d.id)
                        .eq("role", "admin");

                    return { ...d, gov_profile: govProfile, admin_profiles: adminProfiles || [] };
                })
            );
            setDistricts(enriched);
        }
    };

    const resetForm = () => {
        setDistrictName("");
        setDistrictDesc("");
        setGovName("");
        setGovEmail("");
        setGovPhone("");
        setGovPassword("");
        setAdminName("");
        setAdminEmail("");
        setAdminPhone("");
        setAdminPassword("");
    };

    const openEditForm = (d: District) => {
        setEditingDistrict(d);
        setEditDistrictName(d.name);
        setEditDistrictDesc(d.description || "");
        setEditGovName(d.gov_profile?.full_name || "");
        setEditGovPhone(d.gov_profile?.phone_number || "");

        const admin = d.admin_profiles?.[0];
        setEditAdminName(admin?.full_name || "");
        setEditAdminPhone(admin?.phone_number || "");
        setEditIsActive(d.is_active);

        setShowForm(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateDistrict = async () => {
        if (!editingDistrict) return;

        if (!editDistrictName.trim() || !editGovName.trim() || !editAdminName.trim()) {
            setMessage({ type: "error", text: "Nama Distrik, Gov, dan Admin wajib diisi." });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            // Update District
            const { error: districtError } = await supabase
                .from("districts")
                .update({
                    name: editDistrictName,
                    description: editDistrictDesc || null,
                    is_active: editIsActive
                })
                .eq("id", editingDistrict.id);

            if (districtError) throw new Error(`Gagal update distrik: ${districtError.message}`);

            // Update Gov Profile
            if (editingDistrict.gov_id) {
                const { error: govError } = await supabase
                    .from("profiles")
                    .update({
                        full_name: editGovName,
                        phone_number: editGovPhone,
                        district_name: editDistrictName
                    })
                    .eq("id", editingDistrict.gov_id);
                if (govError) throw new Error(`Gagal update profil Gov: ${govError.message}`);
            }

            // Update Admin Profile
            const adminId = editingDistrict.admin_profiles?.[0]?.id;
            if (adminId) {
                const { error: adminError } = await supabase
                    .from("profiles")
                    .update({
                        full_name: editAdminName,
                        phone_number: editAdminPhone,
                        district_name: editDistrictName
                    })
                    .eq("id", adminId);
                if (adminError) throw new Error(`Gagal update profil Operator: ${adminError.message}`);
            }

            // Also log it
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from("audit_logs").insert({
                    user_id: user.id,
                    action: "UPDATE_DISTRICT",
                    table_name: "districts",
                    old_value: JSON.stringify(editingDistrict),
                    new_value: JSON.stringify({
                        id: editingDistrict.id,
                        name: editDistrictName,
                        is_active: editIsActive,
                        gov_name: editGovName,
                        admin_name: editAdminName
                    }),
                });
            }

            setMessage({ type: "success", text: `Distrik "${editDistrictName}" berhasil diperbarui.` });
            setEditingDistrict(null);
            fetchDistricts();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak terduga.";
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDistrict = async () => {
        // Validation
        if (!districtName.trim() || !govName.trim() || !govEmail.trim() || !govPassword.trim() ||
            !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
            setMessage({ type: "error", text: "Semua field wajib diisi." });
            return;
        }

        if (govPassword.length < 6 || adminPassword.length < 6) {
            setMessage({ type: "error", text: "Kata sandi minimal 6 karakter." });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            // Get current session token for Edge Function auth
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = "/portal";
                return;
            }

            // Call Edge Function (uses service_role key server-side)
            // This prevents session hijack from supabase.auth.signUp()
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://icyirbezrmixxkzzrufq.supabase.co"}/functions/v1/create-district-accounts`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session?.access_token}`,
                        "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
                    },
                    body: JSON.stringify({
                        districtName,
                        districtDesc: districtDesc || null,
                        govName,
                        govEmail,
                        govPhone,
                        govPassword,
                        adminName,
                        adminEmail,
                        adminPhone,
                        adminPassword,
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                console.error("Edge function error:", result);
                throw new Error(result.error || "Gagal membuat distrik.");
            }

            if (!result || result.error) {
                throw new Error(result?.error || "Gagal membuat distrik.");
            }

            setMessage({ type: "success", text: `Distrik "${districtName}" berhasil dibuat dengan akun Gov dan Operator.` });
            resetForm();
            setShowForm(false);
            fetchDistricts();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan yang tidak terduga.";
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Kelola Distrik</h1>
                    <p className="text-sm text-slate-400 mt-1">Daftarkan Pemerintah Daerah (Gov) beserta Operator Bank Sampah sebagai satu paket.</p>
                </div>
                <button
                    onClick={() => {
                        if (editingDistrict) {
                            setEditingDistrict(null);
                        } else {
                            setShowForm(!showForm);
                            setMessage(null);
                        }
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                >
                    {(showForm || editingDistrict) ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {(showForm || editingDistrict) ? "Batal" : "Distrik Baru"}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    {message.text}
                </div>
            )}

            {/* Registration Form */}
            {showForm && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-in fade-in duration-300">
                    {/* District Info */}
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                            <Building2 className="h-5 w-5 text-brand-400" /> Informasi Distrik
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nama Distrik / Kabupaten *</label>
                                <input type="text" placeholder="Contoh: Kabupaten Bogor" value={districtName} onChange={(e) => setDistrictName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Keterangan (Opsional)</label>
                                <input type="text" placeholder="Dinas Lingkungan Hidup" value={districtDesc} onChange={(e) => setDistrictDesc(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* Gov Account */}
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-blue-400" /> Akun Pemerintah Daerah (Gov)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Nama Lengkap *" placeholder="Kepala Dinas LH" value={govName} onChange={setGovName} />
                            <InputField label="Email *" placeholder="dinas.lh@bogor.go.id" value={govEmail} onChange={setGovEmail} type="email" />
                            <InputField label="Nomor WhatsApp" placeholder="08123456789" value={govPhone} onChange={setGovPhone} type="tel" />
                            <PasswordField label="Kata Sandi *" value={govPassword} onChange={setGovPassword} show={showGovPassword} toggle={() => setShowGovPassword(!showGovPassword)} />
                        </div>
                    </div>

                    <div className="border-t border-slate-800" />

                    {/* Admin (Operator) Account */}
                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-emerald-400" /> Akun Operator Bank Sampah (Admin)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Nama Lengkap *" placeholder="Operator Bank Sampah" value={adminName} onChange={setAdminName} />
                            <InputField label="Email *" placeholder="operator@banksampah.id" value={adminEmail} onChange={setAdminEmail} type="email" />
                            <InputField label="Nomor WhatsApp" placeholder="08198765432" value={adminPhone} onChange={setAdminPhone} type="tel" />
                            <PasswordField label="Kata Sandi *" value={adminPassword} onChange={setAdminPassword} show={showAdminPassword} toggle={() => setShowAdminPassword(!showAdminPassword)} />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleCreateDistrict}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Memproses...
                            </span>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Daftarkan Distrik, Gov & Operator
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Editing Form */}
            {editingDistrict && (
                <div className="bg-slate-900 border border-brand-500/50 shadow-lg shadow-brand-500/10 rounded-2xl p-6 space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-brand-400" /> Edit Distrik
                        </h3>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400 font-medium">Status Distrik:</span>
                            <button
                                onClick={() => setEditIsActive(!editIsActive)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editIsActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editIsActive ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs font-bold uppercase ${editIsActive ? 'text-emerald-400' : 'text-slate-500'}`}>{editIsActive ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Nama Distrik / Kabupaten *" placeholder="Contoh: Kabupaten Bogor" value={editDistrictName} onChange={setEditDistrictName} />
                        <InputField label="Keterangan (Opsional)" placeholder="Dinas Lingkungan Hidup" value={editDistrictDesc} onChange={setEditDistrictDesc} />
                    </div>

                    <div className="border-t border-slate-800" />

                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-blue-400" /> Profil Pemerintah Daerah (Gov)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField label="Nama Lengkap *" placeholder="Kepala Dinas LH" value={editGovName} onChange={setEditGovName} />
                            <InputField label="Nomor WhatsApp" placeholder="08123456789" value={editGovPhone} onChange={setEditGovPhone} type="tel" />
                        </div>
                    </div>

                    <div className="border-t border-slate-800" />

                    <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-emerald-400" /> Profil Operator Bank Sampah (Admin)
                        </h3>
                        {editingDistrict.admin_profiles?.length === 0 ? (
                            <p className="text-sm text-amber-500 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">Tidak ada operator yang ditemukan. Anda mungkin perlu mendaftarkan operator terlebih dahulu.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField label="Nama Lengkap *" placeholder="Operator Bank Sampah" value={editAdminName} onChange={setEditAdminName} />
                                <InputField label="Nomor WhatsApp" placeholder="08198765432" value={editAdminPhone} onChange={setEditAdminPhone} type="tel" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button
                            onClick={() => setEditingDistrict(null)}
                            disabled={isLoading}
                            className="flex-1 py-4 px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleUpdateDistrict}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Menyimpan...
                                </span>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Simpan Perubahan
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Districts List */}
            <div className="space-y-4">
                {districts.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                        <Building2 className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Belum ada distrik terdaftar.</p>
                        <p className="text-xs text-slate-500 mt-1">Klik &quot;Distrik Baru&quot; untuk memulai.</p>
                    </div>
                ) : (
                    districts.map((d) => (
                        <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20">
                                        <Building2 className="h-5 w-5 text-brand-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">{d.name}</h3>
                                        {d.description && <p className="text-xs text-slate-500">{d.description}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${d.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                        }`}>
                                        {d.is_active ? "Aktif" : "Nonaktif"}
                                    </span>
                                    <button
                                        onClick={() => openEditForm(d)}
                                        className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                                        title="Edit Distrik"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Gov info */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                    <Shield className="h-4 w-4 text-blue-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pemerintah</p>
                                        <p className="text-sm font-semibold text-white">{d.gov_profile?.full_name || "-"}</p>
                                    </div>
                                </div>
                                {/* Admin info */}
                                {d.admin_profiles?.map((admin, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                                        <Users className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operator</p>
                                            <p className="text-sm font-semibold text-white">{admin.full_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-[10px] text-slate-600 mt-3">
                                Dibuat: {new Date(d.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Reusable Input Component
function InputField({ label, placeholder, value, onChange, type = "text" }: {
    label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition" />
        </div>
    );
}

// Reusable Password Component
function PasswordField({ label, value, onChange, show, toggle }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input type={show ? "text" : "password"} placeholder="Minimal 6 karakter" value={value} onChange={(e) => onChange(e.target.value)}
                    className="w-full px-4 pr-12 py-3 bg-slate-800/50 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition" />
                <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-400 transition-colors" tabIndex={-1}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
