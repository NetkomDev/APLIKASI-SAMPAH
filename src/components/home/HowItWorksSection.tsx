import { Smartphone, Truck, Scale, Coins } from 'lucide-react';

export function HowItWorksSection() {
    return (
        <section id="cara-kerja" className="py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6">
                        Bagaimana <span className="text-brand-600">Cara Kerjanya?</span>
                    </h2>
                    <p className="text-lg text-slate-600">
                        Prosesnya sangat mudah. Hanya butuh beberapa menit untuk mulai menukar sampah Anda menjadi cuan!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Step 1 */}
                    <div className="relative p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:shadow-xl transition-all hover:bg-white hover:border-brand-200">
                        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black text-brand-600">1</span>
                        </div>
                        <Smartphone className="absolute top-6 right-6 h-8 w-8 text-slate-200 group-hover:text-brand-300 transition-colors" />
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Daftar Akun</h3>
                        <p className="text-slate-600">Buat akun dengan mudah melalui smartphone Anda, isi data diri, dan pilih Bank Sampah terdekat.</p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:shadow-xl transition-all hover:bg-white hover:border-brand-200 mt-0 md:mt-8">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black text-blue-600">2</span>
                        </div>
                        <Truck className="absolute top-6 right-6 h-8 w-8 text-slate-200 group-hover:text-blue-300 transition-colors" />
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Panggil Kurir</h3>
                        <p className="text-slate-600">Kumpulkan sampah daur ulang Anda di rumah, lalu minta kurir kami untuk segera menjemputnya.</p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:shadow-xl transition-all hover:bg-white hover:border-brand-200 mt-0 md:mt-16">
                        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black text-amber-600">3</span>
                        </div>
                        <Scale className="absolute top-6 right-6 h-8 w-8 text-slate-200 group-hover:text-amber-300 transition-colors" />
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Timbang Harga</h3>
                        <p className="text-slate-600">Sampah Anda akan ditimbang secara transparan oleh kurir atau petugas Bank Sampah berdasarkan harga pasar terkini.</p>
                    </div>

                    {/* Step 4 */}
                    <div className="relative p-6 bg-slate-50 border border-slate-100 rounded-3xl group hover:shadow-xl transition-all hover:bg-white hover:border-brand-200 mt-0 md:mt-24">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <span className="text-2xl font-black text-emerald-600">4</span>
                        </div>
                        <Coins className="absolute top-6 right-6 h-8 w-8 text-slate-200 group-hover:text-emerald-300 transition-colors" />
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Terima Saldo</h3>
                        <p className="text-slate-600">Selamat! Saldo langsung masuk ke dompet digital Anda dan dapat ditarik atau dibelanjakan kapan saja.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
