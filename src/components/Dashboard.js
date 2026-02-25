import React from 'react';
import './Dashboard.css';
import { formatDate } from '../utils/format';

function Dashboard({ leases = [] }) {
  const now = new Date();
  const inTwelveMonths = new Date(now);
  inTwelveMonths.setMonth(inTwelveMonths.getMonth() + 12);

  const expiringSoon = leases.filter((lease) => {
    const end = parseEndDate(lease.endDate);
    return end && end <= inTwelveMonths && end >= now;
  }).sort((a, b) => parseEndDate(a.endDate) - parseEndDate(b.endDate));

  function parseEndDate(str) {
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

  return (
    <div className="lr-dashboard">
      <h2 className="lr-dashboard-title">Dashboard</h2>
      <p className="lr-dashboard-subtitle">Portfolio overview and alerts</p>

      <section className="lr-dashboard-section">
        <h3 className="lr-dashboard-section-title">Leases expiring within 12 months</h3>
        {expiringSoon.length === 0 ? (
          <p className="lr-dashboard-empty">No leases expiring in the next 12 months.</p>
        ) : (
          <ul className="lr-dashboard-list">
            {expiringSoon.map((lease) => (
              <li key={lease.id} className="lr-dashboard-item">
                <span className="lr-dashboard-item-tenant">{lease.tenant}</span>
                <span className="lr-dashboard-item-meta">
                  {lease.asset} · {lease.unit} · End {lease.endDate != null ? (formatDate(lease.endDate) ?? String(lease.endDate)) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
