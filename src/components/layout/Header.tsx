"use client";

import { Bell, UserCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/config/supabase';

interface HeaderProps {
    title: string;
}

export function Header({ title }: HeaderProps) {
    const [headerTitle, setHeaderTitle] = useState(title);
    const [adminName, setAdminName] = useState("Admin System");
    const [adminRole, setAdminRole] = useState("Regional Operator");

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('full_name, role, bank_sampah_name').eq('id', user.id).single();
                    if (profile) {
                        setAdminName(profile.full_name || "Admin System");
                        if (profile.role === 'admin') {
                            setAdminRole("Admin Bank Sampah");
                            if (title === "Command Center" && profile.bank_sampah_name) {
                                setHeaderTitle(profile.bank_sampah_name);
                            }
                        } else if (profile.role === 'superadmin') {
                            setAdminRole("Super Admin (Kabupaten)");
                        } else if (profile.role === 'gov') {
                            setAdminRole("Dinas Lingkungan Hidup");
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load user header details", err);
            }
        };
        fetchUser();
    }, [title]);

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-8 py-4 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight uppercase">{headerTitle}</h1>
            <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <span className="absolute top-2 right-2.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <Bell className="h-6 w-6 text-slate-500" />
                </button>
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <UserCircle2 className="h-8 w-8 text-brand-600 bg-brand-50 rounded-full" />
                    <div className="hidden md:block">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{adminName}</p>
                        <p className="text-xs text-slate-500 font-medium">{adminRole}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
