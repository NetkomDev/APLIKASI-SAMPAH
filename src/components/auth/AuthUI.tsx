"use client";

import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/infrastructure/config/supabase";
import { useRouter } from "next/navigation";

export function AuthUI() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Check if user is already logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                // Here we could route them based on role, but for now just send them somewhere
                // We'll add role-based routing soon
                checkRoleAndRedirect(session.user.id);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
                checkRoleAndRedirect(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const checkRoleAndRedirect = async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profile) {
            if (profile.role === 'admin') {
                router.push('/admin');
            } else if (profile.role === 'gov') {
                router.push('/gov');
            } else {
                router.push('/'); // Or a dedicated /user dashboard
            }
        }
    };

    if (!mounted) return null;

    return (
        <div className="w-full">
            <Auth
                supabaseClient={supabase}
                appearance={{
                    theme: ThemeSupa,
                    variables: {
                        default: {
                            colors: {
                                brand: '#1fb970',
                                brandAccent: '#117646',
                                brandButtonText: 'white',
                            },
                        },
                    },
                    className: {
                        button: 'px-4 py-2 font-medium bg-brand-500 hover:bg-brand-600 rounded-lg text-white w-full transition-colors',
                        label: 'text-sm font-medium text-slate-700',
                        input: 'mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
                        anchor: 'text-sm text-brand-600 hover:text-brand-500',
                    }
                }}
                providers={['google']}
                redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined}
            />
        </div>
    );
}
