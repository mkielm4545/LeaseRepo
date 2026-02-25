import React from 'react';
import './LeaseDetail.css';
import { formatDate, formatCurrency, formatRentPerSqm, formatBreakOption, toTitleCaseIfAllCaps, formatCurrencyInText } from '../utils/format';

const ASSET_OPTIONS = ['CC La Vega', 'CC Madrid Sur', 'CC La Loma', 'CC Vinaroz', 'Other'];

function LeaseDetail({ lease, onAssetChange }) {
  if (!lease) return null;

  const displayDate = (value) => formatDate(value) ?? '—';
  const displayCurrency = (value) => formatCurrency(value) ?? '—';
  const displayRentSqm = (value) => formatRentPerSqm(value) ?? '—';

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

export default LeaseDetail;
