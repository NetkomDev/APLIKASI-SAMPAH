"use client";

import { MapPin, Building, Truck, Phone } from 'lucide-react';
import { supabase } from '@/infrastructure/config/supabase';
import { useEffect, useState } from 'react';

export function PartnersSection() {
    const [partners, setPartners] = useState<any[]>([]);

    useEffect(() => {
        const fetchPartners = async () => {
            const { data } = await supabase
                .from('bank_sampah_units')
                .select('id, name, address, phone')
                .eq('is_active', true)
                .order('name');
            if (data) setPartners(data);
        };
        fetchPartners();
    }, []);

    return (
        <section id="mitra" className="py-24 bg-brand-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-200/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6">
                        Mitra <span className="text-brand-600">Bank Sampah</span>
                    </h2>
                    <p className="text-lg text-slate-600">
                        Temukan unit Bank Sampah terdekat di wilayah Anda. Kami memiliki jaringan penyaluran yang kuat dan terintegrasi di berbagai kecamatan.
                    </p>
                </div>

                {partners.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {partners.map((partner) => (
                            <div key={partner.id} className="bg-white p-6 rounded-3xl border border-brand-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] transition-all hover:-translate-y-1">
                                <div className="h-12 w-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-5 border border-brand-100">
                                    <Building className="h-6 w-6 text-brand-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 capitalize">{partner.name}</h3>
                                {partner.address && (
                                    <div className="flex items-start gap-2 text-slate-600 mb-2 text-sm">
                                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-500" />
                                        <span>{partner.address}</span>
                                    </div>
                                )}
                                {partner.phone && (
                                    <div className="flex items-start gap-2 text-slate-600 mb-4 text-sm">
                                        <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 text-brand-500" />
                                        <span>{partner.phone}</span>
                                    </div>
                                )}
                                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden">
                                                <Truck className="h-3 w-3" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500">Tersedia layanan kurir</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-brand-100">
                        <Building className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Belum ada mitra Bank Sampah yang terdaftar.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
