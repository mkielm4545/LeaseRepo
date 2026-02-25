/**
 * Truncate PDF to first 99 pages and return base64.
 * Uses pdf-lib; if PDF has ≤99 pages, returns base64 of full file.
 */
export async function pdfToBase64Max99Pages(file) {
  const arrayBuffer = await file.arrayBuffer();
  const { PDFDocument } = await import('pdf-lib');
  const src = await PDFDocument.load(arrayBuffer);
  const pageCount = src.getPageCount();
  if (pageCount <= 99) {
    return arrayBufferToBase64(arrayBuffer);
  }
  const dest = await PDFDocument.create();
  const copyIndices = Array.from({ length: 99 }, (_, i) => i);
  const copied = await dest.copyPages(src, copyIndices);
  copied.forEach((p) => dest.addPage(p));
  const pdfBytes = await dest.save();
  return arrayBufferToBase64(pdfBytes.buffer);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const EXTRACTION_PROMPT = `Extract lease/commercial real estate terms from this document. Return ONLY a single JSON object with no markdown or code fences, using exactly these keys (use empty string "" or null for missing values):

tenant, trade_name, asset, unit, gla, rent_per_sqm, total_monthly, start_date, end_date, rent_review, break_option, break_option_date, auto_renewal, variable_rent, deposit, guarantee, permitted_use, non_compete, category, doc_type, notes, confidence

- rent_per_sqm: the monthly rent per square metre in euros - this is the unit price, NOT the total. If the contract states a total monthly rent and a GLA, divide to get the per-sqm rate. For example if total monthly is 1766.18 and GLA is 43m², rent per sqm = 41.07.
- total_monthly: the total monthly rent amount in euros - this is rent_per_sqm multiplied by GLA. Must equal rent_per_sqm × gla.
- Use ISO date format (YYYY-MM-DD) for start_date and end_date where possible.
- break_option: the break option as a single date in DD/MM/YYYY format if the contract specifies a fixed break date; use "None" if there is no break option; use "Rolling" if it is a rolling break (e.g. with X months notice at any time). Do not return a description — only the date, "None", or "Rolling".
- break_option_date: the specific calendar date by which the tenant must exercise or notify the break option, if stated in the contract (e.g. "notice by 30/06/2028"). Use DD/MM/YYYY or ISO (YYYY-MM-DD). Omit or null if not specified.
- For confidence, use a number between 0 and 1 or null.`;

/** Parse JSON from Claude's text response (may be inside markdown code block) */
export function parseExtractionText(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  let jsonStr = trimmed;
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/** Map extracted JSON to Supabase leases row (snake_case) */
const toNum = (v) =>
  v === '' || v === undefined || v === null || isNaN(Number(v))
    ? null
    : Number(v);

export function toLeaseRow(extracted) {
  if (!extracted || typeof extracted !== 'object') return null;

  const rawRentPerSqm = extracted.rent_per_sqm;

  const rentPerSqm = toNum(rawRentPerSqm);
  if (rentPerSqm === null && rawRentPerSqm != null && rawRentPerSqm !== '') {
    const parsed = typeof rawRentPerSqm === 'string' ? parseFloat(rawRentPerSqm.replace(/,/g, '').trim()) : Number(rawRentPerSqm);
    if (!isNaN(parsed)) {
      return toLeaseRowWithRent(extracted, parsed);
    }
  }

  return toLeaseRowWithRent(extracted, rentPerSqm);
}

function toLeaseRowWithRent(extracted, rent_per_sqm) {
  return {
    tenant: extracted.tenant ?? '',
    trade_name: extracted.trade_name ?? '',
    asset: extracted.asset ?? '',
    unit: extracted.unit ?? '',
    gla: toNum(extracted.gla),
    rent_per_sqm,
    total_monthly: toNum(extracted.total_monthly),
    market_rate: toNum(extracted.market_rate),
    start_date: extracted.start_date ?? null,
    end_date: extracted.end_date ?? null,
    rent_review: extracted.rent_review ?? '',
    break_option: extracted.break_option ?? '',
    break_option_date: extracted.break_option_date ?? null,
    auto_renewal: extracted.auto_renewal ?? '',
    variable_rent: extracted.variable_rent ?? '',
    deposit: extracted.deposit ?? '',
    guarantee: extracted.guarantee ?? '',
    permitted_use: extracted.permitted_use ?? '',
    non_compete: extracted.non_compete ?? '',
    category: extracted.category ?? '',
    doc_type: extracted.doc_type ?? '',
    status: extracted.status ?? 'active',
    notes: extracted.notes ?? '',
    confidence: extracted.confidence ?? null,
  };
}
