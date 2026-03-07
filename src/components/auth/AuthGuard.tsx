"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/infrastructure/config/supabase";

interface AuthGuardProps {
    children: React.ReactNode;
    allowedRoles: Array<'user' | 'courier' | 'admin' | 'gov'>;
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuthStatus = async () => {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                router.push('/auth');
                return;
            }

            // Fetch user profile to check role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) {
                // Assume user role not fully provisioned yet, fallback or go to unauthorized
                if (!allowedRoles.includes('user')) {
                    router.push('/auth');
                } else {
                    setIsAuthorized(true);
                }
                return;
            }

            // Check if user's role is in the allowedRoles array
            if (allowedRoles.includes(profile.role)) {
                setIsAuthorized(true);
            } else {
                // Send them to their respective dashboards based on role
                if (profile.role === 'admin') router.push('/admin');
                else if (profile.role === 'gov') router.push('/gov');
                else router.push('/auth');
            }
        };

        checkAuthStatus();
    }, [router, allowedRoles]);

    if (isAuthorized === null) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <span className="relative flex h-8 w-8 mb-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-8 w-8 bg-brand-500"></span>
                </span>
                <p className="text-slate-500 font-medium animate-pulse">Memuat Data Rahasia...</p>
            </div>
        );
    }

    return <>{children}</>;
}
