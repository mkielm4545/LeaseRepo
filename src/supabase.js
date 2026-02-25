import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibofgtoijgrzqponldut.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlib2ZndG9pamdyenFwb25sZHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTQ5MTEsImV4cCI6MjA4NzQzMDkxMX0.s3jN3EW7LLZ1qAbx4um3Zch5Hfz6i353ljEfTAAbKlc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Normalize a lease row from Supabase (snake_case) to UI shape (camelCase) */
export function normalizeLease(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenant: row.trade_name != null && String(row.trade_name).trim() !== ''
      ? String(row.trade_name)
      : (row.tenant != null ? String(row.tenant) : ''),
    tradeName: row.trade_name ?? '',
    asset: row.asset != null ? String(row.asset) : '',
    unit: row.unit != null ? String(row.unit) : '',
    gla: row.gla != null ? String(row.gla) : '',
    rent: row.rent_per_sqm != null ? String(row.rent_per_sqm) : '',
    totalMonthly: row.total_monthly != null ? row.total_monthly : null,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    rentReview: row.rent_review ?? '',
    breakOption: row.break_option ?? '',
    breakOptionDate: row.break_option_date ?? null,
    autoRenewal: row.auto_renewal ?? '',
    variableRent: row.variable_rent ?? '',
    deposit: row.deposit ?? '',
    guarantee: row.guarantee ?? '',
    permittedUse: row.permitted_use ?? '',
    nonCompete: row.non_compete ?? '',
    category: row.category ?? '',
    docType: row.doc_type ?? '',
    status: row.status != null ? String(row.status) : '',
    notes: row.notes ?? '',
    confidence: row.confidence ?? null,
  };
}
