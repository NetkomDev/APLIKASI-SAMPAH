import { Bell, UserCircle2 } from 'lucide-react';

interface HeaderProps {
    title: string;
}

export function Header({ title }: HeaderProps) {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-8 py-4 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
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
                        <p className="text-sm font-semibold text-slate-800 leading-tight">Admin System</p>
                        <p className="text-xs text-slate-500 font-medium">Regional Operator</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
