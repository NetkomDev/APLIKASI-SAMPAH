const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const query = `
    -- Rename table
    ALTER TABLE IF EXISTS public.districts RENAME TO bank_sampah_units;

    -- Rename foreign key columns in profiles
    ALTER TABLE IF EXISTS public.profiles RENAME COLUMN district_id TO bank_sampah_id;
    ALTER TABLE IF EXISTS public.profiles RENAME COLUMN district_name TO bank_sampah_name;

    -- Rename FK in other operational tables
    ALTER TABLE IF EXISTS public.transactions RENAME COLUMN district_id TO bank_sampah_id;
    ALTER TABLE IF EXISTS public.inventory_outputs RENAME COLUMN district_id TO bank_sampah_id;

    -- Fix Policies on inventory_outputs
    DROP POLICY IF EXISTS "Admin dapat menginput data di distrik mereka" ON public.inventory_outputs;
    CREATE POLICY "Admin menginput data di unit bank sampah mereka"
    ON public.inventory_outputs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.bank_sampah_id = inventory_outputs.bank_sampah_id
        )
    );

    DROP POLICY IF EXISTS "Akses baca berdasarkan distrik atau role superadmin" ON public.inventory_outputs;
    CREATE POLICY "Akses baca laporan berdasarkan peran"
    ON public.inventory_outputs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'superadmin' OR profiles.role = 'gov' OR profiles.bank_sampah_id = inventory_outputs.bank_sampah_id)
        )
    );

    -- Fix Policies on transactions
    DROP POLICY IF EXISTS "Admin lihat semua di distriknya" ON public.transactions;
    CREATE POLICY "Admin / Gov lihat semua transaksi di wilayahnya"
    ON public.transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND (profiles.role = 'superadmin' OR profiles.role = 'gov' OR profiles.bank_sampah_id = transactions.bank_sampah_id)
        )
    );

    DROP POLICY IF EXISTS "Admin validasi timbangan" ON public.transactions;
    CREATE POLICY "Admin validasi timbangan di wilayahnya"
    ON public.transactions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.bank_sampah_id = transactions.bank_sampah_id
        )
    );
  `;
  // Note: We cannot execute raw SQL directly through supabase-js client if RPC doesn't exist.
  // We need to use postgres module directly since this is executing DDL statements.
  console.log("To execute raw SQL programatically without pg string, the Management API needs to work, or use PG client.");
}

runMigration();
