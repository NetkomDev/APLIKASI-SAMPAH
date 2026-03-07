import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={['admin']}>
            <div className="min-h-screen bg-slate-50 flex">
                <Sidebar role="admin" />
                <div className="flex-1 ml-64 flex flex-col">
                    <Header title="Command Center" />
                    <main className="flex-1 p-8 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
