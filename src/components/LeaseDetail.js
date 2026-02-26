import React, { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import './LeaseDetail.css';
import { formatDate, formatCurrency, formatRentPerSqm, formatRentPerSqmMo, formatBreakOption, toTitleCaseIfAllCaps, formatCurrencyInText } from '../utils/format';
import { supabase } from '../supabase';

const ASSET_OPTIONS = ['CC La Vega', 'CC Madrid Sur', 'CC La Loma', 'CC Vinaroz', 'Other'];
const RENT_INVOICES_BUCKET = 'rent-invoices';

function LeaseDetail({ lease, onAssetChange, onLeaseUpdate }) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [rentHistory, setRentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRentHistory = useCallback(async () => {
    if (!lease?.id) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('rent_history')
      .select('*')
      .eq('lease_id', lease.id)
      .order('effective_date', { ascending: true });
    setHistoryLoading(false);
    if (error) {
      setRentHistory([]);
      return;
    }
    setRentHistory(data ?? []);
  }, [lease?.id]);

  useEffect(() => {
    if (historyExpanded && lease?.id) fetchRentHistory();
  }, [historyExpanded, lease?.id, fetchRentHistory]);

  if (!lease) return null;

  const displayDate = (value) => formatDate(value) ?? '—';
  const displayCurrency = (value) => formatCurrency(value) ?? '—';
  const displayRentSqm = (value) => formatRentPerSqm(value) ?? '—';
  const displayRentSqmMo = (value) => formatRentPerSqmMo(value) ?? '—';

  const glaNum = lease.gla != null && lease.gla !== '' ? Number(lease.gla) : null;
  const totalNum = lease.totalMonthly != null ? Number(lease.totalMonthly) : null;
  const rentNum = lease.rent != null && lease.rent !== '' ? Number(lease.rent) : null;
  const effectiveRentPerSqm =
    rentNum != null && !isNaN(rentNum)
      ? rentNum
      : glaNum != null && glaNum > 0 && totalNum != null && !isNaN(totalNum)
        ? totalNum / glaNum
        : null;

  const handleAssetSelect = (e) => {
    const newAsset = e.target.value;
    if (onAssetChange && lease.id) onAssetChange(lease.id, newAsset);
  };

  const assetOptions = [...ASSET_OPTIONS];
  if (lease.asset && !assetOptions.includes(lease.asset)) {
    assetOptions.unshift(lease.asset);
  }
  const assetValue = lease.asset || 'Other';

  const chartData = rentHistory.map((h) => ({
    date: h.effective_date,
    label: formatDate(h.effective_date) || h.effective_date,
    rentPerSqm: h.rent_per_sqm != null ? Number(h.rent_per_sqm) : null,
  })).filter((d) => d.rentPerSqm != null);

  return (
    <div className="lr-lease-detail">
      <h2 className="lr-lease-detail-title">{lease.tenant}</h2>
      <p className="lr-lease-detail-subtitle">
        {lease.asset} · {lease.unit}
      </p>

      <section className="lr-lease-detail-section">
        <h3 className="lr-lease-detail-section-title">Overview</h3>
        <dl className="lr-lease-detail-grid">
          <dt>Tenant</dt>
          <dd>{lease.tenant || '—'}</dd>
          <dt>Asset</dt>
          <dd>
            <select
              className="lr-lease-detail-asset-select"
              value={assetValue}
              onChange={handleAssetSelect}
              aria-label="Asset"
            >
              {assetOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </dd>
          <dt>Unit</dt>
          <dd>{lease.unit || '—'}</dd>
          <dt>GLA m²</dt>
          <dd>{lease.gla ?? '—'}</dd>
          <dt>Start date</dt>
          <dd>{displayDate(lease.startDate)}</dd>
          <dt>End date</dt>
          <dd>{displayDate(lease.endDate)}</dd>
          <dt>Status</dt>
          <dd>{lease.status || '—'}</dd>
        </dl>
      </section>

      <section className="lr-lease-detail-section">
        <h3 className="lr-lease-detail-section-title">Financial terms</h3>
        <dl className="lr-lease-detail-grid">
          <dt>€/m²/mo</dt>
          <dd>{displayRentSqm(effectiveRentPerSqm)}</dd>
          <dt>Monthly rent</dt>
          <dd>{displayCurrency(lease.totalMonthly)}</dd>
          <dt>Passing rent</dt>
          <dd className="lr-lease-detail-passing-rent">
            <span className="lr-lease-detail-passing-rent-value">
              {displayRentSqmMo(lease.passingRentSqm) ?? '—'}
              {lease.passingRentTotal != null && (
                <span className="lr-lease-detail-passing-rent-total">
                  {' '}({displayCurrency(lease.passingRentTotal)})
                </span>
              )}
            </span>
            {lease.passingRentUpdated && (
              <span className="lr-lease-detail-passing-rent-updated">
                {' · '}Updated {displayDate(lease.passingRentUpdated)}
              </span>
            )}
            {lease.passingRentInvoice && (
              <span className="lr-lease-detail-passing-rent-invoice" title="Invoice attached">
                {' '}📎
              </span>
            )}
          </dd>
          <dt>Rent review</dt>
          <dd>{lease.rentReview || '—'}</dd>
          <dt>Break option</dt>
          <dd>{formatBreakOption(lease.breakOption)}</dd>
          <dt>Break option date</dt>
          <dd>{displayDate(lease.breakOptionDate)}</dd>
          <dt>Deposit</dt>
          <dd>{formatCurrencyInText(lease.deposit) || '—'}</dd>
          <dt>Guarantee</dt>
          <dd>{formatCurrencyInText(lease.guarantee) || '—'}</dd>
          <dt>Variable rent</dt>
          <dd>{lease.variableRent || '—'}</dd>
        </dl>

        <div className="lr-lease-detail-history">
          <button
            type="button"
            className="lr-lease-detail-history-toggle"
            onClick={() => setHistoryExpanded((e) => !e)}
            aria-expanded={historyExpanded}
          >
            {historyExpanded ? '▼' : '▶'} History
          </button>
          {historyExpanded && (
            <div className="lr-lease-detail-history-content">
              {historyLoading ? (
                <p className="lr-lease-detail-history-loading">Loading history…</p>
              ) : (
                <>
                  {chartData.length > 0 && (
                    <div className="lr-lease-detail-chart">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                          <Tooltip
                            formatter={(value) => [`€${Number(value).toFixed(2)}/m²/mo`, 'Rent']}
                            labelFormatter={(l) => l}
                          />
                          {effectiveRentPerSqm != null && (
                            <ReferenceLine
                              y={effectiveRentPerSqm}
                              stroke="#858078"
                              strokeDasharray="5 5"
                              label={{ value: 'Contracted', position: 'right', fontSize: 11 }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="rentPerSqm"
                            stroke="#0064d2"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name="Rent/m²"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <table className="lr-lease-detail-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>€/m²/mo</th>
                        <th>Total</th>
                        <th>Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="lr-lease-detail-history-empty">No history yet.</td>
                        </tr>
                      ) : (
                        rentHistory.map((h) => (
                          <tr key={h.id}>
                            <td>{displayDate(h.effective_date)}</td>
                            <td>{displayRentSqmMo(h.rent_per_sqm)}</td>
                            <td>{displayCurrency(h.total)}</td>
                            <td>
                              {h.invoice_url ? (
                                <a href={h.invoice_url} target="_blank" rel="noopener noreferrer">View</a>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {!showNewEntryForm ? (
                    <button
                      type="button"
                      className="lr-lease-detail-log-entry-btn"
                      onClick={() => setShowNewEntryForm(true)}
                    >
                      Log new passing rent entry
                    </button>
                  ) : (
                    <PassingRentEntryForm
                      lease={lease}
                      glaNum={glaNum}
                      onCancel={() => { setShowNewEntryForm(false); setSaveError(null); }}
                      onSaved={(updatedLease) => {
                        setShowNewEntryForm(false);
                        setSaveError(null);
                        fetchRentHistory();
                        if (onLeaseUpdate) onLeaseUpdate(updatedLease);
                      }}
                      onError={(msg) => setSaveError(msg)}
                      saving={saving}
                      setSaving={setSaving}
                    />
                  )}
                  {saveError && (
                    <p className="lr-lease-detail-history-error" role="alert">{saveError}</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="lr-lease-detail-section">
        <h3 className="lr-lease-detail-section-title">Lease conditions</h3>
        <dl className="lr-lease-detail-grid">
          <dt>Auto-renewal</dt>
          <dd>{lease.autoRenewal || '—'}</dd>
          <dt>Permitted use</dt>
          <dd>{toTitleCaseIfAllCaps(lease.permittedUse) || '—'}</dd>
          <dt>Non-compete radius</dt>
          <dd>{lease.nonCompete || '—'}</dd>
          <dt>Document type</dt>
          <dd>{lease.docType || '—'}</dd>
          <dt>Notes</dt>
          <dd className="lr-lease-detail-notes">{lease.notes || '—'}</dd>
        </dl>
      </section>
    </div>
  );
}

function PassingRentEntryForm({ lease, glaNum, onCancel, onSaved, onError, saving, setSaving }) {
  const [effectiveDate, setEffectiveDate] = useState('');
  const [rentPerSqm, setRentPerSqm] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);

  const total = (rentPerSqm !== '' && glaNum != null && glaNum > 0 && !isNaN(Number(rentPerSqm)))
    ? Number(rentPerSqm) * glaNum
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rps = rentPerSqm === '' || isNaN(Number(rentPerSqm)) ? null : Number(rentPerSqm);
    if (!effectiveDate.trim() || rps == null) {
      onError('Effective date and rent per m² are required.');
      return;
    }
    if (glaNum == null || glaNum <= 0) {
      onError('GLA is required to calculate total.');
      return;
    }
    setSaving(true);
    onError(null);
    let invoiceUrl = null;
    if (invoiceFile && lease?.id) {
      const path = `${lease.id}/${Date.now()}_${invoiceFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from(RENT_INVOICES_BUCKET)
        .upload(path, invoiceFile, { contentType: invoiceFile.type, upsert: false });
      if (uploadError) {
        setSaving(false);
        onError('Invoice upload failed. You can save without it or create a bucket "' + RENT_INVOICES_BUCKET + '".');
        return;
      }
      const { data: urlData } = supabase.storage.from(RENT_INVOICES_BUCKET).getPublicUrl(path);
      invoiceUrl = urlData?.publicUrl ?? null;
    }
    const totalVal = rps * glaNum;
    const { data: inserted, error: insertError } = await supabase
      .from('rent_history')
      .insert({
        lease_id: lease.id,
        effective_date: effectiveDate.trim(),
        rent_per_sqm: rps,
        total: totalVal,
        notes: notes.trim() || null,
        invoice_url: invoiceUrl,
      })
      .select('id')
      .single();
    if (insertError) {
      setSaving(false);
      onError(insertError.message || 'Failed to save history entry.');
      return;
    }
    const { error: updateError } = await supabase
      .from('leases')
      .update({
        passing_rent_sqm: rps,
        passing_rent_total: totalVal,
        passing_rent_updated: effectiveDate.trim(),
        passing_rent_invoice: invoiceUrl || '',
      })
      .eq('id', lease.id);
    if (updateError) {
      setSaving(false);
      onError(updateError.message || 'Failed to update lease.');
      return;
    }
    setSaving(false);
    onSaved({
      ...lease,
      passingRentSqm: rps,
      passingRentTotal: totalVal,
      passingRentUpdated: effectiveDate.trim(),
      passingRentInvoice: invoiceUrl || '',
    });
  };

  return (
    <form className="lr-lease-detail-passing-rent-form" onSubmit={handleSubmit}>
      <div className="lr-lease-detail-form-row">
        <label>
          Effective date <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
        </label>
      </div>
      <div className="lr-lease-detail-form-row">
        <label>
          Rent per m² (€/m²/mo) <input type="number" step="0.01" min="0" value={rentPerSqm} onChange={(e) => setRentPerSqm(e.target.value)} required />
        </label>
      </div>
      <div className="lr-lease-detail-form-row">
        <label>
          Total (from GLA) <span className="lr-lease-detail-form-total">{total != null ? `€${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
        </label>
      </div>
      <div className="lr-lease-detail-form-row">
        <label>
          Notes <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </label>
      </div>
      <div className="lr-lease-detail-form-row">
        <label>
          PDF invoice <input type="file" accept=".pdf,application/pdf" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} />
        </label>
      </div>
      <div className="lr-lease-detail-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default LeaseDetail;
