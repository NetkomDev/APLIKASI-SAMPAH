// =====================================================================
// Edge Function: approve-deposit
// Dipanggil oleh Admin setelah validasi timbangan kurir.
// Alur:
//   1. Update courier_deposits → status: 'approved'
//   2. Tentukan harga aktual berdasarkan commodity_prices
//   3. Hitung komisi kurir (per-kg flat, bisa dikonfigurasi di system_settings)
//   4. Update semua transactions terkait → status: 'completed' + update berat aktual
//   5. Kreditkan saldo warga ke user_wallets + catat di wallet_ledgers
//   6. Kreditkan komisi kurir ke user_wallets + catat di wallet_ledgers
// =====================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      deposit_id,
      admin_id,
      actual_organic,     // kg timbangan aktual admin
      actual_inorganic,   // kg timbangan aktual admin
      admin_quality_assessment,
      discrepancy_notes,
    } = body;

    if (!deposit_id || !admin_id) {
      return new Response(
        JSON.stringify({ error: "deposit_id dan admin_id wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── STEP 1: Ambil data deposit + semua transactions terkait ───
    const { data: deposit, error: depErr } = await supabase
      .from("courier_deposits")
      .select("*, kurir_id, bank_sampah_id")
      .eq("id", deposit_id)
      .single();

    if (depErr || !deposit) {
      return new Response(
        JSON.stringify({ error: "Deposit tidak ditemukan", detail: depErr }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (deposit.status === "approved") {
      return new Response(
        JSON.stringify({ error: "Deposit ini sudah diapprove sebelumnya." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: transactions, error: txErr } = await supabase
      .from("transactions")
      .select("id, user_id, amount_earned, weight_organic, weight_inorganic, status")
      .eq("courier_deposit_id", deposit_id);

    if (txErr) throw txErr;

    // ─── STEP 2: Ambil harga komoditas & pengaturan sistem ───
    const [{ data: prices }, { data: settings }] = await Promise.all([
      supabase.from("commodity_prices").select("trade_type, category, price_per_kg").eq("is_active", true),
      supabase.from("system_settings").select("key_name, value_text").in("key_name", [
        "courier_organic_commission_per_kg",
        "courier_inorganic_commission_per_kg",
      ]),
    ]);

    const settingsMap: Record<string, number> = {};
    settings?.forEach((s) => { settingsMap[s.key_name] = parseFloat(s.value_text || "0"); });

    // Default komisi kurir jika belum dikonfigurasi: Rp 200/kg organik, Rp 300/kg anorganik
    const COURIER_RATE_ORGANIC = settingsMap["courier_organic_commission_per_kg"] ?? 200;
    const COURIER_RATE_INORGANIC = settingsMap["courier_inorganic_commission_per_kg"] ?? 300;

    // ─── STEP 3: Hitung total berat aktual (proporsi dari klaim kurir) ───
    const orgActual = actual_organic ?? deposit.total_organic_claimed ?? 0;
    const inorgActual = actual_inorganic ?? deposit.total_inorganic_claimed ?? 0;
    const totalActual = orgActual + inorgActual;
    const totalClaimed = (deposit.total_organic_claimed || 0) + (deposit.total_inorganic_claimed || 0);

    // Rasio koreksi (bila admin timbang berbeda dari klaim kurir)
    const correctionRatio = totalClaimed > 0 ? totalActual / totalClaimed : 1;

    // ─── STEP 4: Update courier_deposits ───
    await supabase.from("courier_deposits").update({
      actual_organic: orgActual,
      actual_inorganic: inorgActual,
      admin_quality_assessment,
      discrepancy_notes,
      admin_id,
      status: "approved",
      approved_at: new Date().toISOString(),
    }).eq("id", deposit_id);

    // ─── STEP 5: Update setiap transaksi warga → completed + hitung ulang saldo ───
    let totalCitizenPayout = 0;
    const ledgerEntries: any[] = [];

    for (const tx of transactions || []) {
      // Koreksi berat sesuai rasio timbangan admin
      const correctedOrg = Math.round((tx.weight_organic || 0) * correctionRatio * 100) / 100;
      const correctedInorg = Math.round((tx.weight_inorganic || 0) * correctionRatio * 100) / 100;

      // Hitung nilai berdasarkan harga komoditas SuperAdmin (acuan)
      // Cari harga organik dan anorganik
      const orgPrice = prices?.find(p => p.trade_type === "buy_from_bank_sampah" && p.category === "organic")?.price_per_kg
        ?? prices?.find(p => p.category === "organic")?.price_per_kg
        ?? 400;
      const inorgPrice = prices?.find(p => p.trade_type === "buy_from_bank_sampah" && p.category === "inorganic")?.price_per_kg
        ?? prices?.find(p => p.category === "inorganic")?.price_per_kg
        ?? 1500;

      const citizenEarning = Math.round(correctedOrg * orgPrice + correctedInorg * inorgPrice);
      totalCitizenPayout += citizenEarning;

      // Update transaksi
      await supabase.from("transactions").update({
        status: "completed",
        admin_weight_organic: correctedOrg,
        admin_weight_inorganic: correctedInorg,
        admin_sorting_quality: admin_quality_assessment,
        discrepancy_notes,
        admin_id,
        amount_earned: citizenEarning,
      }).eq("id", tx.id);

      // Kreditkan ke saldo warga
      if (tx.user_id && citizenEarning > 0) {
        await supabase.rpc("increment_wallet_balance", {
          p_user_id: tx.user_id,
          p_amount: citizenEarning,
        });

        ledgerEntries.push({
          user_id: tx.user_id,
          amount: citizenEarning,
          type: "credit",
          description: `Setoran sampah divalidasi — Org: ${correctedOrg}kg, Anorg: ${correctedInorg}kg`,
          reference_id: tx.id,
          reference_type: "transaction",
        });
      }
    }

    // ─── STEP 6: Hitung & kreditkan komisi kurir ───
    const courierCommission = Math.round(orgActual * COURIER_RATE_ORGANIC + inorgActual * COURIER_RATE_INORGANIC);

    if (deposit.kurir_id && courierCommission > 0) {
      await supabase.rpc("increment_wallet_balance", {
        p_user_id: deposit.kurir_id,
        p_amount: courierCommission,
      });

      ledgerEntries.push({
        user_id: deposit.kurir_id,
        amount: courierCommission,
        type: "credit",
        description: `Komisi jemput sampah — Org: ${orgActual}kg × Rp${COURIER_RATE_ORGANIC} + Anorg: ${inorgActual}kg × Rp${COURIER_RATE_INORGANIC}`,
        reference_id: deposit_id,
        reference_type: "courier_deposit",
      });
    }

    // ─── STEP 7: Catat semua di wallet_ledgers ───
    if (ledgerEntries.length > 0) {
      await supabase.from("wallet_ledgers").insert(ledgerEntries);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          deposit_id,
          total_transactions: transactions?.length || 0,
          total_citizen_payout: totalCitizenPayout,
          courier_commission: courierCommission,
          correction_ratio: Math.round(correctionRatio * 100) + "%",
          actual_organic: orgActual,
          actual_inorganic: inorgActual,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("approve-deposit error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
