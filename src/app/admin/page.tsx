import { MapPin, AlertCircle, Clock, Truck } from 'lucide-react';

export default function AdminPage() {
    return (
        <div className="space-y-6">

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Antrean Jemput', value: '24', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
                    { label: 'Kurir Aktif', value: '45', icon: Truck, color: 'text-brand-500', bg: 'bg-brand-100' },
                    { label: 'Kendala Laporan', value: '3', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
                    { label: 'Total Tonase Hari Ini', value: '1,200 Kg', icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-100' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
                        <div className={`p-4 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Map Area (Placeholder) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-800">Live Map Monitoring</h2>
                        <div className="flex gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                <span className="h-2 w-2 rounded-full bg-green-500"></span> Online: 45
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 border-dashed flex items-center justify-center relative overflow-hidden">
                        <MapPin className="h-10 w-10 text-slate-300 absolute" />
                        <div className="text-center z-10 p-6 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
                            <p className="text-sm font-medium text-slate-600">Map Rendering Engine (Mapbox/Leaflet)</p>
                            <p className="text-xs text-slate-500 mt-1">Titik Kurir & Jemputan Warga akan tampil di sini</p>
                        </div>
                    </div>
                </div>

                {/* Queue Management */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[500px]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Antrean Jemputan</h2>
                        <button className="text-sm text-brand-600 font-medium hover:text-brand-700">Lihat Semua</button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div key={item} className="p-4 border border-slate-100 rounded-xl hover:border-brand-200 hover:shadow-sm transition cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-slate-800 text-sm">Budi Santoso</h4>
                                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3 line-clamp-1">Jl. Mawar Merah No.12, Kec. Bone</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded">Est: 15 Kg Organik</span>
                                    <button className="text-xs font-semibold text-white bg-slate-900 group-hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors">
                                        Assign Kurir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
