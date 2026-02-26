import React, { useMemo, useState } from 'react';
import './Dashboard.css';
import { formatDate, formatCurrency, formatRentPerSqm } from '../utils/format';

/* ── Date parsing helper ─────────────────────────────────────── */
function parseDate(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = s.split(/[/.-]/);
  if (parts.length >= 3) {
    const d = new Date(parts[2], (parseInt(parts[1], 10) || 1) - 1, parseInt(parts[0], 10) || 1);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function daysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

function Dashboard({ leases = [] }) {
  const [alertMonths, setAlertMonths] = useState(12);
  const [assetFilter, setAssetFilter] = useState('all');

  /* ── Distinct assets ────────────────────────────────────────── */
  const assets = useMemo(() => {
    const set = new Set();
    leases.forEach((l) => { if (l.asset) set.add(l.asset); });
    return Array.from(set).sort();
  }, [leases]);

  const filteredLeases = useMemo(() => {
    if (assetFilter === 'all') return leases;
    return leases.filter((l) => l.asset === assetFilter);
  }, [leases, assetFilter]);

  /* ── Alerts: expiring leases AND break options within window ── */
  const alerts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() + alertMonths);
    const items = [];

    filteredLeases.forEach((lease) => {
      // Lease expiry alert
      const endDate = parseDate(lease.endDate);
      if (endDate && endDate >= now && endDate <= cutoff) {
        items.push({
          id: `expiry-${lease.id}`,
          lease,
          type: 'expiry',
          date: endDate,
          label: `Lease expires ${formatDate(lease.endDate)}`,
        });
      }

      // Break option alert
      const breakDate = parseDate(lease.breakOptionDate || lease.breakOption);
      if (breakDate && breakDate >= now && breakDate <= cutoff) {
        items.push({
          id: `break-${lease.id}`,
          lease,
          type: 'break',
          date: breakDate,
          label: `Break option ${formatDate(lease.breakOptionDate || lease.breakOption)}`,
        });
      }
    });

    items.sort((a, b) => a.date - b.date);
    return items;
  }, [filteredLeases, alertMonths]);

  /* ── Key metrics ────────────────────────────────────────────── */
  const metrics = useMemo(() => {
    const active = filteredLeases.filter((l) => {
      const s = String(l.status || '').toLowerCase();
      return s === 'active' || s === 'activo' || s === '';
    });

    let totalGla = 0;
    let occupiedGla = 0;
    let totalMonthlyRent = 0;
    let rentCount = 0;
    let rentSum = 0;

    active.forEach((l) => {
      const gla = l.gla != null && l.gla !== '' ? Number(l.gla) : 0;
      const monthly = l.totalMonthly != null ? Number(l.totalMonthly) : 0;
      const rentPerSqm = l.rent != null && l.rent !== '' && !isNaN(Number(l.rent))
        ? Number(l.rent)
        : gla > 0 && monthly > 0 ? monthly / gla : null;

      if (gla > 0) {
        totalGla += gla;
        occupiedGla += gla;
      }
      totalMonthlyRent += monthly;
      if (rentPerSqm != null) {
        rentSum += rentPerSqm;
        rentCount++;
      }
    });

    const occupancyRate = totalGla > 0 ? (occupiedGla / totalGla * 100) : 0;
    const avgRentPerSqm = rentCount > 0 ? rentSum / rentCount : 0;

    return {
      leaseCount: filteredLeases.length,
      activeCount: active.length,
      totalGla,
      occupancyRate,
      totalMonthlyRent,
      totalAnnualRent: totalMonthlyRent * 12,
      avgRentPerSqm,
    };
  }, [filteredLeases]);

  /* ── Per-asset breakdown ────────────────────────────────────── */
  const assetMetrics = useMemo(() => {
    if (assetFilter !== 'all') return null; // Only show breakdown in portfolio view
    const map = {};
    leases.forEach((l) => {
      const key = l.asset || 'Unassigned';
      if (!map[key]) map[key] = { name: key, leases: 0, gla: 0, monthlyRent: 0, rentSum: 0, rentCount: 0 };
      map[key].leases++;
      const gla = l.gla != null && l.gla !== '' ? Number(l.gla) : 0;
      const monthly = l.totalMonthly != null ? Number(l.totalMonthly) : 0;
      const rentPerSqm = l.rent != null && l.rent !== '' && !isNaN(Number(l.rent))
        ? Number(l.rent)
        : gla > 0 && monthly > 0 ? monthly / gla : null;
      map[key].gla += gla;
      map[key].monthlyRent += monthly;
      if (rentPerSqm != null) { map[key].rentSum += rentPerSqm; map[key].rentCount++; }
    });
    return Object.values(map).sort((a, b) => b.monthlyRent - a.monthlyRent);
  }, [leases, assetFilter]);

  return (
    <div className="lr-dashboard">
      <div className="lr-dashboard-top">
        <div>
          <h2 className="lr-dashboard-title">Dashboard</h2>
          <p className="lr-dashboard-subtitle">Portfolio overview and alerts</p>
        </div>
        <div className="lr-dashboard-controls">
          <select
            className="lr-dashboard-select"
            value={assetFilter}
            onChange={(e) => setAssetFilter(e.target.value)}
          >
            <option value="all">All assets</option>
            {assets.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* ── Key metrics cards ─────────────────────────────────── */}
      <div className="lr-dashboard-metrics">
        <div className="lr-dashboard-metric-card">
          <div className="lr-dashboard-metric-value">{metrics.leaseCount}</div>
          <div className="lr-dashboard-metric-label">Total leases</div>
        </div>
        <div className="lr-dashboard-metric-card">
          <div className="lr-dashboard-metric-value">
            {metrics.totalGla > 0 ? metrics.totalGla.toLocaleString('en-US') : '—'}
          </div>
          <div className="lr-dashboard-metric-label">Total GLA m²</div>
        </div>
        <div className="lr-dashboard-metric-card">
          <div className="lr-dashboard-metric-value">
            {metrics.totalMonthlyRent > 0 ? formatCurrency(metrics.totalMonthlyRent) : '—'}
          </div>
          <div className="lr-dashboard-metric-label">Monthly rent roll</div>
        </div>
        <div className="lr-dashboard-metric-card">
          <div className="lr-dashboard-metric-value">
            {metrics.avgRentPerSqm > 0 ? formatRentPerSqm(metrics.avgRentPerSqm) : '—'}
          </div>
          <div className="lr-dashboard-metric-label">Avg rent/m²</div>
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────────────────── */}
      <section className="lr-dashboard-section">
        <div className="lr-dashboard-section-header">
          <h3 className="lr-dashboard-section-title">
            Alerts — next {alertMonths} months
          </h3>
          <select
            className="lr-dashboard-select lr-dashboard-select--small"
            value={alertMonths}
            onChange={(e) => setAlertMonths(Number(e.target.value))}
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={18}>18 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>

        {alerts.length === 0 ? (
          <p className="lr-dashboard-empty">No alerts in the next {alertMonths} months.</p>
        ) : (
          <ul className="lr-dashboard-list">
            {alerts.map((alert) => {
              const days = daysUntil(alert.date);
              return (
                <li key={alert.id} className="lr-dashboard-item">
                  <span className={`lr-dashboard-alert-badge lr-dashboard-alert-badge--${alert.type}`}>
                    {alert.type === 'expiry' ? 'EXPIRY' : 'BREAK'}
                  </span>
                  <span className="lr-dashboard-item-tenant">{alert.lease.tenant}</span>
                  <span className="lr-dashboard-item-meta">
                    {alert.lease.asset} · {alert.lease.unit} · {alert.label}
                    <span className="lr-dashboard-item-days">
                      {days <= 30 ? ` (${days}d)` : ` (${Math.round(days / 30)}mo)`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Per-asset breakdown (portfolio view only) ─────────── */}
      {assetMetrics && assetMetrics.length > 0 && (
        <section className="lr-dashboard-section">
          <h3 className="lr-dashboard-section-title">By asset</h3>
          <table className="lr-dashboard-asset-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Leases</th>
                <th>GLA m²</th>
                <th>Monthly rent</th>
                <th>Avg €/m²</th>
              </tr>
            </thead>
            <tbody>
              {assetMetrics.map((a) => (
                <tr key={a.name}>
                  <td>{a.name}</td>
                  <td>{a.leases}</td>
                  <td>{a.gla > 0 ? a.gla.toLocaleString('en-US') : '—'}</td>
                  <td>{a.monthlyRent > 0 ? formatCurrency(a.monthlyRent) : '—'}</td>
                  <td>{a.rentCount > 0 ? formatRentPerSqm(a.rentSum / a.rentCount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
