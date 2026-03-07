import { Leaf } from "lucide-react";
import Link from "next/link";
import { AuthUI } from "@/components/auth/AuthUI";

export const metadata = {
    title: 'Login - EcoSistem Digital',
    description: 'Masuk ke portal EcoSistem Digital',
};

export default function AuthPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Ornaments */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-100/50 blur-3xl opacity-50"></div>
                <div className="absolute top-1/2 right-0 transform translate-x-1/3 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-100/40 blur-3xl opacity-60"></div>
            </div>

            <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-100 z-10 relative">
                <div className="flex flex-col items-center">
                    <Link href="/" className="flex items-center justify-center gap-2 mb-2 p-3 bg-brand-50 rounded-2xl w-16 h-16 shadow-inner cursor-pointer hover:bg-brand-100 transition-colors">
                        <Leaf className="h-8 w-8 text-brand-500" />
                    </Link>
                    <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                        Selamat Datang
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 max-w">
                        Gerbang akses untuk Warga, Kurir, dan Administrator Kebijakan Data.
                    </p>
                </div>

                <div className="mt-8">
                    <AuthUI />
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        Sistem Keamanan & Kedaulatan Data Terenkripsi. <br />
                        © 2026 EcoSistem Digital (Pemerintah Kabupaten).
                    </p>
                </div>
            </div>
        </div>
    );
}
