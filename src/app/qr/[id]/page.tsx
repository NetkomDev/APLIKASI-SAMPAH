"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/infrastructure/config/supabase";
import { QRCodeSVG } from "qrcode.react";
import { Printer, MapPin, Leaf, Phone } from "lucide-react";
import { useParams } from "next/navigation";

export default function WargaQRPage() {
  const params = useParams();
  const idStr = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const decodedId = decodeURIComponent(idStr || "");

  const [warga, setWarga] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!decodedId) {
      setError("ID Warga tidak ditemukan di URL.");
      setLoading(false);
      return;
    }
    fetchData(decodedId);
  }, [decodedId]);

  const fetchData = async (wargaId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, address, bank_sampah_name, role")
        .eq("id", wargaId)
        .single();

      if (error) throw error;
      if (data.role !== "user") throw new Error("Akses hanya untuk QR Code Warga.");

      setWarga(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat profil warga.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-slate-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !warga) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">QR Code Tidak Tersedia</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
      {/* Kertas Print ID Card */}
      <div 
        id="print-area" 
        className="w-[340px] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-[8cm] print:m-0"
      >
        {/* Header Kartu */}
        <div className="bg-brand-600 p-6 text-center text-white rounded-b-[30px] shadow-sm relative overflow-hidden print:bg-brand-600 print:-webkit-print-color-adjust-exact">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Leaf className="w-24 h-24" />
            </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white text-brand-600 p-2 rounded-xl mb-3">
              <Leaf className="w-6 h-6" />
            </div>
            <h1 className="font-extrabold tracking-widest text-lg opacity-90">KARTU WARGA</h1>
            <h2 className="font-bold text-xl leading-tight mt-1">{warga.bank_sampah_name || "Beres.in"}</h2>
          </div>
        </div>

        {/* Body Kartu */}
        <div className="p-8 pb-10 flex flex-col items-center">
          {/* Info Warga */}
          <div className="w-full text-center border-b border-slate-100 pb-5 mb-5">
            <h3 className="font-black text-2xl text-slate-800 break-words leading-tight">{warga.full_name}</h3>
            <p className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full w-max mx-auto mt-2 tracking-wider">
              {warga.phone_number}
            </p>
          </div>

          {/* QR Area */}
          <div className="bg-white p-3 rounded-2xl border-2 border-brand-100 shadow-sm relative">
            {/* L Corners to make it look like a scanner bracket */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-brand-500 rounded-tl-xl -translate-x-1 -translate-y-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-brand-500 rounded-tr-xl translate-x-1 -translate-y-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-brand-500 rounded-bl-xl -translate-x-1 translate-y-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-brand-500 rounded-br-xl translate-x-1 translate-y-1"></div>

            <QRCodeSVG 
              value={warga.id} 
              size={180}
              bgColor={"#ffffff"}
              fgColor={"#020617"} // slate-950
              level={"H"} 
              includeMargin={false}
            />
          </div>
          
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Scan QR untuk Setor</p>
          
          {/* Footer Info */}
          {warga.address && (
              <div className="w-full bg-slate-50 p-3 rounded-xl mt-6 border border-slate-100 flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-3">
                      {warga.address}
                  </p>
              </div>
          )}
        </div>
      </div>

      {/* Action Buttons (Hidden in Print) */}
      <div className="mt-8 flex gap-4 print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-700 transition active:scale-95"
        >
          <Printer className="w-5 h-5" /> Cetak / Print ID Card
        </button>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            min-height: auto;
          }
          #print-area {
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
