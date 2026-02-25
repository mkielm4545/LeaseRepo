const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format date as DD MMM YYYY (e.g. 01 Mar 2026). Accepts ISO (YYYY-MM-DD) or DD/MM/YYYY. */
export function formatDate(value) {
  if (value == null || value === '') return null;
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  }
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!isNaN(d.getTime())) {
      const dStr = String(d.getDate()).padStart(2, '0');
      const mStr = MONTHS[d.getMonth()];
      return `${dStr} ${mStr} ${d.getFullYear()}`;
    }
  }
  return str;
}

/** Format number as € with comma thousands (e.g. €1,766) */
export function formatCurrency(value) {
  if (value == null || value === '' || isNaN(Number(value))) return null;
  const num = Number(value);
  return '€' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/** Format rent per sqm as €X.XX/m² (e.g. €41.07/m²) */
export function formatRentPerSqm(value) {
  if (value == null || value === '' || isNaN(Number(value))) return null;
  const num = Number(value);
  return '€' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '/m²';
}

/** Format break_option: "None", "Rolling", or date as DD MMM YYYY. */
export function formatBreakOption(value) {
  if (value == null || value === '') return 'None';
  const str = String(value).trim();
  if (/^none$/i.test(str)) return 'None';
  if (/^rolling$/i.test(str)) return 'Rolling';
  const asDate = formatDate(str);
  if (asDate) return asDate;
  return str;
}

/** If str is all uppercase (every letter is uppercase), convert to title case; otherwise return as-is. */
export function toTitleCaseIfAllCaps(str) {
  if (str == null || typeof str !== 'string') return str;
  const trimmed = str.trim();
  if (!trimmed) return str;
  if (!/[A-Z]/.test(trimmed) || /[a-z]/.test(trimmed)) return str;
  return trimmed
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

/** Format currency amounts in text: replace full decimal numbers with € and comma thousands. */
export function formatCurrencyInText(str) {
  if (str == null || typeof str !== 'string') return str;
  return str.replace(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)/g, (match) => {
    const num = parseFloat(match.replace(/,/g, ''));
    if (isNaN(num)) return match;
    if (num >= 100 || /\./.test(match)) {
      return '€' + num.toLocaleString('en-US', {
        minimumFractionDigits: /\./.test(match) ? 2 : 0,
        maximumFractionDigits: 2,
      });
    }
    return match;
  });
}
