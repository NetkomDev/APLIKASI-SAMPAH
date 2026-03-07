import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function GovLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['gov', 'admin']}>
            <div className="min-h-screen bg-slate-50 flex">
                <Sidebar role="gov" />
                <div className="flex-1 ml-64 flex flex-col">
                    <Header title="Strategic Government Dashboard" />
                    <main className="flex-1 p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
