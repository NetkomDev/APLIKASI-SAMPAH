import { Leaf } from "lucide-react";
import Link from "next/link";
import { AuthUI } from "@/components/auth/AuthUI";

export const metadata = {
    title: 'Login - EcoSistem Digital',
    description: 'Masuk ke portal EcoSistem Digital',
};

export default function AuthPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden">
            {/* Background Ornaments */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-[30rem] h-[30rem] rounded-full bg-brand-200/40 blur-3xl opacity-60"></div>
                <div className="absolute bottom-0 right-0 transform translate-x-1/3 translate-y-1/3 w-[40rem] h-[40rem] rounded-full bg-emerald-200/40 blur-3xl opacity-50"></div>
            </div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl sm:rounded-[2.5rem] sm:shadow-2xl sm:border border-slate-100/50 z-10 relative flex flex-col min-h-screen sm:min-h-0">
                {/* Mobile top padding & Desktop padding */}
                <div className="flex-1 flex flex-col px-6 py-12 sm:p-10">

                    {/* Header: Logos */}
                    <div className="flex justify-between items-start mb-8">
                        <Link href="/" className="flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all">
                            <Leaf className="h-7 w-7 text-brand-500" />
                        </Link>
                        {/* Placeholder Logo Pemda */}
                        <div className="flex items-center justify-center p-2 px-3 bg-slate-100 rounded-2xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-500 tracking-wider">LOGO PEMDA</span>
                        </div>
                    </div>

                    {/* Titles */}
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                            Mulai Perjalanan <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-emerald-400">Zero Waste</span>
                        </h2>
                        <p className="mt-3 text-sm text-slate-500 max-w-sm leading-relaxed">
                            Akses sistem kelola sampah digital untuk Warga, Kurir, dan Administrator Kebijakan.
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="flex-1">
                        <AuthUI />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-8 sm:px-10 border-t border-slate-100/50 bg-slate-50/50 sm:rounded-b-[2.5rem]">
                    <p className="text-center text-xs text-slate-400 font-medium">
                        Sistem Kedaulatan Data Pemerintah Daerah <br />
                        © 2026 EcoSistem Digital
                    </p>
                </div>
            </div>
        </div>
    );
}
