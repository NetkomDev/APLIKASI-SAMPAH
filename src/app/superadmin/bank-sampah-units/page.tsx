"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { Building2, Plus, CheckCircle2, AlertCircle, Eye, EyeOff, Users, Shield, X, Edit2 } from "lucide-react";
import { useSuperAdminTheme, t } from "@/components/superadmin/ThemeProvider";

interface GovProfile {
    id: string;
    full_name: string;
    phone_number: string;
}

interface BankSampahUnit {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    can_sell_direct: boolean;
    created_at: string;
    admin_profiles?: { id: string; full_name: string; phone_number: string; role: string }[];
}

export default function BankSampahUnitsPage() {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    const [govUser, setGovUser] = useState<GovProfile | null>(null);
    const [branches, setBranches] = useState<BankSampahUnit[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Form Gov Actions
    const [isEditingGov, setIsEditingGov] = useState(false);
    const [govName, setGovName] = useState("");
    const [govEmail, setGovEmail] = useState("");
    const [govPhone, setGovPhone] = useState("");
    const [govPassword, setGovPassword] = useState("");
    const [showGovPassword, setShowGovPassword] = useState(false);

    // Form Branch Actions
    const [showBranchForm, setShowBranchForm] = useState(false);
    const [editingBranch, setEditingBranch] = useState<BankSampahUnit | null>(null);
    const [branchName, setBranchName] = useState("");
    const [branchDesc, setBranchDesc] = useState("");
    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [editIsActive, setEditIsActive] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Gov
            const { data: govData } = await supabase.from("profiles").select("id, full_name, phone_number").eq("role", "gov").limit(1).single();
            if (govData) setGovUser(govData);

            // Fetch Branches
            const { data: unitsData } = await supabase.from("bank_sampah_units").select("*").order("created_at", { ascending: false });
            if (unitsData) {
                const enriched = await Promise.all(unitsData.map(async (u) => {
                    const { data: admins } = await supabase.from("profiles").select("id, full_name, phone_number, role").eq("bank_sampah_id", u.id).eq("role", "admin");
                    return { ...u, admin_profiles: admins || [] };
                }));
                setBranches(enriched);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Edge function helpers
    const getSessionAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesi tidak valid, silakan login kembali.");
        return session.access_token;
    };

    const callEdgeFunction = async (payload: any) => {
        const token = await getSessionAuth();
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://icyirbezrmixxkzzrufq.supabase.co"}/functions/v1/manage-district-accounts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Gagal memproses data di server.");
        return result;
    };

    // --- Gov Handlers ---
    const handleOpenGovForm = async (editMode: boolean) => {
        setMessage(null);
        setIsEditingGov(true);
        if (editMode && govUser) {
            setGovName(govUser.full_name);
            setGovPhone(govUser.phone_number);
            setGovPassword(""); // intentional blank for update
            setGovEmail("Loading...");
            try {
                const res = await callEdgeFunction({ action: "GET_EMAILS", ids: [govUser.id] });
                if (res.emails?.[govUser.id]) setGovEmail(res.emails[govUser.id]);
                else setGovEmail("");
            } catch (e) {
                setGovEmail("");
            }
        } else {
            setGovName(""); setGovEmail(""); setGovPhone(""); setGovPassword("");
        }
    };

    const handleSaveGov = async () => {
        if (!govName.trim() || !govEmail.trim()) {
            setMessage({ type: "error", text: "Nama dan Email Pemerintah wajib diisi." }); return;
        }
        if (!govUser && govPassword.length < 6) {
            setMessage({ type: "error", text: "Kata sandi minimal 6 karakter." }); return;
        }

        setIsSubmitting(true); setMessage(null);
        try {
            await callEdgeFunction({
                action: "UPSERT_GOV",
                govId: govUser?.id,
                govName, govEmail, govPhone, govPassword
            });
            setMessage({ type: "success", text: "Profil Pemerintah Daerah berhasil disimpan." });
            setIsEditingGov(false);
            fetchData();
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally { setIsSubmitting(false); }
    };

    // --- Branch Handlers ---
    const handleOpenBranchForm = async (branch?: BankSampahUnit) => {
        setMessage(null);
        if (branch) {
            setEditingBranch(branch);
            setBranchName(branch.name);
            setBranchDesc(branch.description || "");
            setEditIsActive(branch.is_active);

            const admin = branch.admin_profiles?.[0];
            setAdminName(admin?.full_name || "");
            setAdminPhone(admin?.phone_number || "");
            setAdminPassword("");
            setAdminEmail("Loading...");
            setShowBranchForm(true);

            if (admin?.id) {
                try {
                    const res = await callEdgeFunction({ action: "GET_EMAILS", ids: [admin.id] });
                    if (res.emails?.[admin.id]) setAdminEmail(res.emails[admin.id]);
                    else setAdminEmail("");
                } catch (e) { setAdminEmail(""); }
            } else { setAdminEmail(""); }
        } else {
            setEditingBranch(null);
            setBranchName(""); setBranchDesc("");
            setAdminName(""); setAdminEmail(""); setAdminPhone(""); setAdminPassword("");
            setShowBranchForm(true);
        }
    };

    const handleSaveBranch = async () => {
        if (!branchName.trim() || !adminName.trim() || !adminEmail.trim()) {
            setMessage({ type: "error", text: "Semua isian wajib untuk Cabang & Operator harus diisi." }); return;
        }
        if (!editingBranch && adminPassword.length < 6) {
            setMessage({ type: "error", text: "Kata sandi operator minimal 6 karakter." }); return;
        }

        setIsSubmitting(true); setMessage(null);
        try {
            await callEdgeFunction({
                action: editingBranch ? "UPDATE_BRANCH" : "CREATE_BRANCH",
                branchId: editingBranch?.id,
                branchName, branchDesc, isActive: editIsActive,
                adminId: editingBranch?.admin_profiles?.[0]?.id,
                adminName, adminEmail, adminPhone, adminPassword
            });
            setMessage({ type: "success", text: `Cabang Bank Sampah berhasil ${editingBranch ? 'diperbarui' : 'ditambahkan'}.` });
            setShowBranchForm(false);
            setEditingBranch(null);
            fetchData();
        } catch (err: any) {
            setMessage({ type: "error", text: err.message });
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-10">
            {/* Page Header */}
            <div>
                <h1 className={`text-2xl font-extrabold ${tk.textHeading} tracking-tight`}>Kelola Cabang & Entitas Daerah</h1>
                <p className={`text-sm ${tk.textSecondary} mt-1`}>Sistem Teritorial 1 Kabupaten: Kelola Akun Tunggal Dinas DLH dan Jaringan Operasional Bank Sampah.</p>
            </div>

            {/* Message Alert */}
            {message && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />}
                    {message.text}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center p-20">
                    <div className="h-8 w-8 border-4 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* SECTION 1: GOV ACCOUNT (SINGLETON) */}
                    <div className={`${tk.cardBg} border rounded-2xl overflow-hidden transition-colors duration-300`}>
                        <div className={`${tk.cardInner} px-6 py-4 flex items-center justify-between border-b`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Shield className="h-5 w-5 text-blue-400" />
                                </div>
                                <h2 className={`text-base font-bold ${tk.textPrimary}`}>Akun Pemantau (Dinas LHK Kabupaten)</h2>
                            </div>
                            {!isEditingGov && (
                                <button onClick={() => handleOpenGovForm(!!govUser)} className="text-sm font-semibold text-brand-400 hover:text-brand-300 transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800">
                                    {govUser ? <><Edit2 className="h-4 w-4" /> Edit Profil DLH</> : <><Plus className="h-4 w-4" /> Buat Akun DLH</>}
                                </button>
                            )}
                        </div>

                        <div className="p-6">
                            {isEditingGov ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputField label="Nama Lengkap / Instansi *" placeholder="Misal: Kepala Dinas DLH Bone" value={govName} onChange={setGovName} />
                                        <InputField label="Email *" placeholder="admin.dlh@bone.go.id" value={govEmail} onChange={setGovEmail} type="email" />
                                        <InputField label="Nomor WhatsApp" placeholder="08123456789" value={govPhone} onChange={setGovPhone} type="tel" />
                                        <PasswordField label={govUser ? "Kata Sandi (Kosongkan bila sama)" : "Kata Sandi *"} value={govPassword} onChange={setGovPassword} show={showGovPassword} toggle={() => setShowGovPassword(!showGovPassword)} />
                                    </div>
                                    <div className="flex items-center gap-3 pt-4">
                                        <button onClick={() => setIsEditingGov(false)} disabled={isSubmitting} className={`flex-1 py-3 disabled:opacity-50 font-semibold rounded-xl transition ${tk.btnSecondary}`}>Batal</button>
                                        <button onClick={handleSaveGov} disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg shadow-brand-500/20 active:scale-[0.98]">
                                            {isSubmitting ? "Menyimpan..." : "Simpan Profil DLH"}
                                        </button>
                                    </div>
                                </div>
                            ) : govUser ? (
                                <div className={`flex items-center gap-4 ${tk.cardInner} p-4 rounded-xl border transition-colors duration-300`}>
                                    <div className="h-12 w-12 rounded-full border-2 border-brand-300 bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                                        {govUser.full_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className={`${tk.textPrimary} font-bold`}>{govUser.full_name}</h3>
                                        <p className="text-sm text-brand-500">{govUser.phone_number || "Nomor WA belum diisi"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 border-2 border-dashed border-slate-700/50 rounded-xl text-center">
                                    <p className="text-slate-400 text-sm mb-2">Belum ada profil Pemerintah Kabupaten (Gov) yang terdaftar.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 2: BRANCHES (BANK SAMPAH) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pt-4">
                            <h2 className={`text-lg font-extrabold ${tk.textHeading} flex items-center gap-2`}>
                                <Building2 className="h-5 w-5 text-brand-500" /> Daftar Unit Bank Sampah
                            </h2>
                            <button onClick={() => setShowBranchForm(!showBranchForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 font-bold text-sm transition border border-emerald-500/20">
                                {showBranchForm ? <><X className="h-4 w-4" /> Batal</> : <><Plus className="h-4 w-4" /> Tambah Cabang</>}
                            </button>
                        </div>

                        {showBranchForm && (
                            <div className={`${tk.cardBg} border border-brand-500/30 rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 transition-colors`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className={`text-base font-bold ${tk.textPrimary} flex items-center gap-2`}>
                                        <Building2 className="h-5 w-5 text-brand-500" /> {editingBranch ? 'Edit Data Cabang' : 'Pendaftaran Cabang Baru'}
                                    </h3>
                                    {editingBranch && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400 font-medium">Status Operasional:</span>
                                            <button onClick={() => setEditIsActive(!editIsActive)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editIsActive ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${editIsActive ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Nama Unit Bank Sampah *" placeholder="Contoh: Bank Sampah Induk Bahagia" value={branchName} onChange={setBranchName} />
                                    <InputField label="Lokasi / Deskripsi Cabang" placeholder="Jl. Raya Timur, Zona Utara" value={branchDesc} onChange={setBranchDesc} />
                                </div>

                                <div className="border-t border-slate-800" />

                                <div>
                                    <h3 className={`text-sm font-bold ${tk.textPrimary} flex items-center gap-2 mb-4`}>
                                        <Users className="h-4 w-4 text-emerald-400" /> Profil Akun Kepala/Operator Cabang
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <InputField label="Nama Operator *" placeholder="Bapak Budi (Opr. Induk)" value={adminName} onChange={setAdminName} />
                                        <InputField label="Email *" placeholder="opr.bahagia@banksampah.id" value={adminEmail} onChange={setAdminEmail} type="email" />
                                        <InputField label="Nomor WhatsApp" placeholder="08198765432" value={adminPhone} onChange={setAdminPhone} type="tel" />
                                        <PasswordField label={editingBranch ? "Kata Sandi (Kosongkan jika tidak diubah)" : "Kata Sandi *"} value={adminPassword} onChange={setAdminPassword} show={showAdminPassword} toggle={() => setShowAdminPassword(!showAdminPassword)} />
                                    </div>
                                </div>

                                <button onClick={handleSaveBranch} disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 py-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg active:scale-[0.99]">
                                    {isSubmitting ? "Menyimpan Data..." : <><CheckCircle2 className="h-5 w-5" /> Simpan Cabang & Akun Operator</>}
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {branches.length === 0 ? (
                                <div className={`col-span-1 md:col-span-2 ${tk.cardBg} border rounded-2xl p-12 text-center transition-colors`}>
                                    <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <p className={`${tk.textSecondary} font-medium`}>Belum ada cabang Bank Sampah.</p>
                                </div>
                            ) : (
                                branches.map((b) => (
                                    <div key={b.id} className={`${tk.cardBg} border rounded-2xl p-5 ${tk.hoverCard} transition-all relative group`}>
                                        <button onClick={() => handleOpenBranchForm(b)} className={`absolute top-4 right-4 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${tk.btnEdit}`}>
                                            <Edit2 className="h-4 w-4" />
                                        </button>

                                        <div className="flex justify-between items-start mb-4 pr-10">
                                            <div>
                                                <h3 className={`text-base font-bold ${tk.textPrimary} capitalize`}>{b.name}</h3>
                                                {b.description && <p className="text-xs text-slate-500 mt-0.5">{b.description}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${b.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    {b.is_active ? 'Status: Aktif' : 'Status: Tutup'}
                                                </span>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const newVal = !b.can_sell_direct;
                                                        await supabase.from('bank_sampah_units').update({ can_sell_direct: newVal }).eq('id', b.id);
                                                        setBranches(prev => prev.map(br => br.id === b.id ? { ...br, can_sell_direct: newVal } : br));
                                                    }}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                                        b.can_sell_direct
                                                            ? 'bg-brand-500/10 text-brand-400 border-brand-500/30 hover:bg-brand-500/20'
                                                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${b.can_sell_direct ? 'bg-brand-400 animate-pulse' : 'bg-slate-600'}`} />
                                                    {b.can_sell_direct ? 'Jual Langsung: ON' : 'Jual Langsung: OFF'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`${tk.cardInner} p-3 rounded-xl border transition-colors`}>
                                            <p className={`text-[10px] font-bold ${tk.textMuted} uppercase tracking-wider mb-2 flex items-center gap-1.5`}><Users className="h-3 w-3" /> Info Operator</p>
                                            {b.admin_profiles?.map((adm, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <span className={`text-sm font-semibold ${tk.textPrimary}`}>{adm.full_name}</span>
                                                    <span className="text-xs text-brand-500">{adm.phone_number || "WA tidak tersedia"}</span>
                                                </div>
                                            ))}
                                            {(!b.admin_profiles || b.admin_profiles.length === 0) && (
                                                <span className="text-xs text-slate-500 italic">Belum ada operator cabang</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function InputField({ label, placeholder, value, onChange, type = "text" }: {
    label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    return (
        <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${tk.textSecondary} uppercase tracking-wider`}>{label}</label>
            <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-colors ${tk.inputBg}`} />
        </div>
    );
}

function PasswordField({ label, value, onChange, show, toggle }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void;
}) {
    const { theme } = useSuperAdminTheme();
    const tk = t(theme);
    return (
        <div className="space-y-1.5">
            <label className={`text-xs font-semibold ${tk.textSecondary} uppercase tracking-wider`}>{label}</label>
            <div className="relative">
                <input type={show ? "text" : "password"} placeholder="Ketik Sandi Login" value={value} onChange={(e) => onChange(e.target.value)}
                    className={`w-full px-4 pr-12 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-colors ${tk.inputBg}`} />
                <button type="button" onClick={toggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-brand-400 transition" tabIndex={-1}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
