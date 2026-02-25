import React, { useMemo, useState } from 'react';
import './Sidebar.css';
import { formatDate, formatCurrency, formatRentPerSqm } from '../utils/format';

function Sidebar({
  leases = [],
  leasesLoading = false,
  leasesError = null,
  onSelectLease,
  selectedLeaseId,
  activeView,
  onNavChange,
  onUploadClick,
}) {
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: 'asc',
  });

  const handleSelect = (lease) => {
    if (!onSelectLease) return;
    onSelectLease(lease);
  };

  const getStatusClass = (status) => {
    if (status == null || String(status).trim() === '') return 'lr-status-dot--unknown';
    const s = String(status).toLowerCase();
    if (s === 'active' || s === 'activo') return 'lr-status-dot--green';
    if (s === 'expiring' || s.includes('expir') || s.includes('venc') || s === 'próximo vencimiento') return 'lr-status-dot--amber';
    if (s === 'expired' || s.includes('expirado') || s.includes('ended') || s.includes('final')) return 'lr-status-dot--red';
    return 'lr-status-dot--unknown';
  };

  function formatDisplayDate(value) {
    return formatDate(value) ?? '';
  }

  const updateSort = (field, direction) => {
    if (!field || direction === 'none') {
      setSortConfig({ field: null, direction: 'asc' });
      return;
    }
    setSortConfig({ field, direction });
  };

  const sortedLeases = useMemo(() => {
    if (!sortConfig.field || leases.length === 0) return leases;

    const field = sortConfig.field;
    const dir = sortConfig.direction === 'desc' ? -1 : 1;

    const copy = [...leases];
    copy.sort((a, b) => {
      const av = a[field];
      const bv = b[field];

      if (field === 'gla') {
        const parseGla = (v) =>
          typeof v === 'string'
            ? parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0
            : Number(v) || 0;
        return (parseGla(av) - parseGla(bv)) * dir;
      }

      const astr = av == null ? '' : String(av);
      const bstr = bv == null ? '' : String(bv);
      return astr.localeCompare(bstr, undefined, { sensitivity: 'base' }) * dir;
    });

    return copy;
  }, [leases, sortConfig]);

  return (
    <aside className="lr-sidebar">
      <button
        type="button"
        className="lr-sidebar-upload"
        onClick={() => onUploadClick?.()}
      >
        + Upload
      </button>

      <nav className="lr-sidebar-nav" aria-label="Main">
        <button
          type="button"
          className={'lr-sidebar-nav-link' + (activeView === 'dashboard' ? ' lr-sidebar-nav-link--active' : '')}
          onClick={() => onNavChange?.('dashboard')}
        >
          Dashboard
        </button>
        <span className="lr-sidebar-nav-sep">·</span>
        <button
          type="button"
          className={'lr-sidebar-nav-link' + (activeView === 'leases' ? ' lr-sidebar-nav-link--active' : '')}
          onClick={() => onNavChange?.('leases')}
        >
          Leases
        </button>
        <span className="lr-sidebar-nav-sep">·</span>
        <button
          type="button"
          className={'lr-sidebar-nav-link' + (activeView === 'review-queue' ? ' lr-sidebar-nav-link--active' : '')}
          onClick={() => onNavChange?.('review-queue')}
        >
          Review Queue
        </button>
      </nav>

      {activeView === 'leases' && (
        <>
      <div className="lr-sidebar-leases-header">
        <span className="lr-sidebar-leases-col">Tenant <span className="lr-sidebar-leases-chevron">▼</span></span>
        <span className="lr-sidebar-leases-col">Unit <span className="lr-sidebar-leases-chevron">▼</span></span>
        <span className="lr-sidebar-leases-col">GLA m² <span className="lr-sidebar-leases-chevron">▼</span></span>
        <span className="lr-sidebar-leases-col">€/m² <span className="lr-sidebar-leases-chevron">▼</span></span>
        <span className="lr-sidebar-leases-col">End Date <span className="lr-sidebar-leases-chevron">▼</span></span>
        <span className="lr-sidebar-leases-col">Status <span className="lr-sidebar-leases-chevron">▼</span></span>
      </div>

      <div className="lr-sidebar-list" role="list">
        {leasesLoading ? (
          <div className="lr-sidebar-empty">
            <div className="lr-sidebar-empty-label">Loading leases…</div>
            <div className="lr-sidebar-empty-sub">Fetching from Supabase.</div>
          </div>
        ) : leasesError ? (
          <div className="lr-sidebar-empty lr-sidebar-empty--error">
            <div className="lr-sidebar-empty-label">Error loading leases</div>
            <div className="lr-sidebar-empty-sub">{leasesError}</div>
          </div>
        ) : sortedLeases.length === 0 ? (
          <div className="lr-sidebar-empty">
            <div className="lr-sidebar-empty-label">No leases loaded</div>
            <div className="lr-sidebar-empty-sub">
              Upload a lease PDF to begin.
            </div>
          </div>
        ) : (
        sortedLeases.map((lease) => {
          const isSelected = lease.id === selectedLeaseId;
          const statusClass = getStatusClass(lease.status);

          return (
            <button
              key={lease.id}
              type="button"
              className={
                'lr-sidebar-row lr-sidebar-columns lr-sidebar-row--item' +
                (isSelected ? ' lr-sidebar-row--selected' : '')
              }
              onClick={() => handleSelect(lease)}
            >
              <div className="lr-col lr-col-tenant-wrap">
                <span className="lr-col-tenant-name">{lease.tenant ?? ''}</span>
                <span className="lr-col-tenant-asset">{lease.asset ?? ''}</span>
              </div>
              <div className="lr-col lr-col-unit">{lease.unit ?? ''}</div>
              <div className="lr-col lr-col-gla">{lease.gla ?? ''}</div>
              <div className="lr-col lr-col-rent">
                {formatRentPerSqm(
                  lease.rent != null && lease.rent !== '' && !isNaN(Number(lease.rent))
                    ? Number(lease.rent)
                    : lease.totalMonthly != null && lease.gla != null && lease.gla !== '' && Number(lease.gla) > 0
                      ? Number(lease.totalMonthly) / Number(lease.gla)
                      : null
                ) ?? ''}
              </div>
              <div className="lr-col lr-col-end">{formatDisplayDate(lease.endDate)}</div>
              <div className="lr-col lr-col-status">
                <span className={`lr-status-dot ${statusClass}`} aria-hidden />
              </div>
            </button>
          );
        })
        )}
      </div>
        </>
      )}
    </aside>
  );
}

export default Sidebar;

