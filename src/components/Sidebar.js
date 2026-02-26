import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Sidebar.css';
import { formatDate, formatRentPerSqm } from '../utils/format';

/* ── Column definitions ─────────────────────────────────────── */
const COLUMNS = [
  { key: 'tenant',  label: 'Tenant',   width: '28%' },
  { key: 'unit',    label: 'Unit',     width: '14%' },
  { key: 'gla',     label: 'GLA m²',   width: '10%' },
  { key: 'rent',    label: '€/m²',     width: '12%' },
  { key: 'endDate', label: 'End Date', width: '14%' },
  { key: 'status',  label: 'Status',   width: '6%'  },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function getStatusClass(status) {
  if (status == null || String(status).trim() === '') return 'lr-status-dot--unknown';
  const s = String(status).toLowerCase();
  if (s === 'active' || s === 'activo') return 'lr-status-dot--green';
  if (s === 'expiring' || s.includes('expir') || s.includes('venc') || s === 'próximo vencimiento') return 'lr-status-dot--amber';
  if (s === 'expired' || s.includes('expirado') || s.includes('ended') || s.includes('final')) return 'lr-status-dot--red';
  return 'lr-status-dot--unknown';
}

function displayValue(lease, key) {
  switch (key) {
    case 'tenant': return lease.tenant ?? '';
    case 'unit': return lease.unit ?? '';
    case 'gla': return lease.gla ?? '';
    case 'rent': {
      const rentNum = lease.rent != null && lease.rent !== '' && !isNaN(Number(lease.rent)) ? Number(lease.rent) : null;
      const glaNum = lease.gla != null && lease.gla !== '' ? Number(lease.gla) : null;
      const totalNum = lease.totalMonthly != null ? Number(lease.totalMonthly) : null;
      const effective = rentNum ?? (glaNum > 0 && totalNum != null ? totalNum / glaNum : null);
      return effective != null ? effective.toFixed(2) : '';
    }
    case 'endDate': return lease.endDate ?? '';
    case 'status': return lease.status ?? '';
    default: return '';
  }
}

function sortLeases(leases, sortCol, sortDir) {
  if (!sortCol) return leases;
  return [...leases].sort((a, b) => {
    let va = displayValue(a, sortCol);
    let vb = displayValue(b, sortCol);
    const na = Number(va);
    const nb = Number(vb);
    if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
      return sortDir === 'asc' ? na - nb : nb - na;
    }
    va = String(va).toLowerCase();
    vb = String(vb).toLowerCase();
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}

/* ── Filter Menu Component ───────────────────────────────────── */
function FilterMenu({ column, allValues, activeFilters, onApply, onClear, onClose, anchorRect }) {
  const ref = useRef(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set(activeFilters ?? []));

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allValues;
    const s = search.toLowerCase();
    return allValues.filter((v) => String(v).toLowerCase().includes(s));
  }, [allValues, search]);

  const toggleValue = (val) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered));
  };

  const style = anchorRect
    ? { top: anchorRect.bottom + 2, left: Math.max(anchorRect.left, 4) }
    : {};

  return (
    <div className="lr-filter-menu" ref={ref} style={style}>
      <div className="lr-filter-menu-section">
        <button type="button" className="lr-filter-menu-item" onClick={toggleAll}>
          {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>
      <div className="lr-filter-menu-divider" />
      <div className="lr-filter-menu-search">
        <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      </div>
      <div className="lr-filter-menu-values">
        {filtered.map((val) => (
          <label key={val} className="lr-filter-menu-check">
            <input type="checkbox" checked={selected.has(val)} onChange={() => toggleValue(val)} />
            <span>{val || '(empty)'}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '4px 0', color: '#858078', fontSize: 12 }}>No matches</div>
        )}
      </div>
      <div className="lr-filter-menu-footer">
        <button type="button" className="lr-filter-menu-button lr-filter-menu-button--secondary" onClick={() => { onClear(); onClose(); }}>Clear</button>
        <button type="button" className="lr-filter-menu-button" onClick={() => { onApply(selected); onClose(); }}>Apply</button>
      </div>
    </div>
  );
}

/* ── Main Sidebar ────────────────────────────────────────────── */
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
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [filterAnchor, setFilterAnchor] = useState(null);

  const handleSelect = (lease) => {
    if (!onSelectLease) return;
    onSelectLease(lease);
    if (activeView !== 'leases') onNavChange?.('leases');
  };

  const handleHeaderClick = (colKey) => {
    if (sortCol === colKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  const handleFilterClick = (e, colKey) => {
    e.stopPropagation();
    if (openFilter === colKey) { setOpenFilter(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setFilterAnchor(rect);
    setOpenFilter(colKey);
  };

  const distinctValues = useCallback(
    (colKey) => {
      const vals = new Set();
      leases.forEach((l) => vals.add(String(displayValue(l, colKey))));
      return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    },
    [leases]
  );

  const processedLeases = useMemo(() => {
    let result = leases;
    const activeKeys = Object.keys(filters).filter((k) => filters[k] && filters[k].size > 0);
    if (activeKeys.length > 0) {
      result = result.filter((lease) =>
        activeKeys.every((k) => filters[k].has(String(displayValue(lease, k))))
      );
    }
    return sortLeases(result, sortCol, sortDir);
  }, [leases, filters, sortCol, sortDir]);

  const handleApplyFilter = useCallback((colKey, sel) => {
    setFilters((prev) => ({ ...prev, [colKey]: sel }));
  }, []);

  const handleClearFilter = useCallback((colKey) => {
    setFilters((prev) => { const n = { ...prev }; delete n[colKey]; return n; });
  }, []);

  const activeFilterCount = Object.values(filters).filter((s) => s && s.size > 0).length;

  return (
    <aside className="lr-sidebar">
      <button type="button" className="lr-sidebar-upload" onClick={() => onUploadClick?.()}>+ Upload</button>

      <nav className="lr-sidebar-nav" aria-label="Main">
        <button type="button" className={'lr-sidebar-nav-link' + (activeView === 'dashboard' ? ' lr-sidebar-nav-link--active' : '')} onClick={() => onNavChange?.('dashboard')}>Dashboard</button>
        <span className="lr-sidebar-nav-sep">·</span>
        <button type="button" className={'lr-sidebar-nav-link' + (activeView === 'leases' ? ' lr-sidebar-nav-link--active' : '')} onClick={() => onNavChange?.('leases')}>Leases</button>
        <span className="lr-sidebar-nav-sep">·</span>
        <button type="button" className={'lr-sidebar-nav-link' + (activeView === 'review-queue' ? ' lr-sidebar-nav-link--active' : '')} onClick={() => onNavChange?.('review-queue')}>Review Queue</button>
      </nav>

      {activeView === 'leases' && (
        <>
          {activeFilterCount > 0 && (
            <div className="lr-sidebar-filter-bar">
              <span className="lr-sidebar-filter-bar-label">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
              <button type="button" className="lr-sidebar-filter-bar-clear" onClick={() => setFilters({})}>Clear all</button>
            </div>
          )}

          <div className="lr-sidebar-leases-header">
            {COLUMNS.map((col) => {
              const isFiltered = filters[col.key] && filters[col.key].size > 0;
              const isSorted = sortCol === col.key;
              return (
                <span key={col.key} className="lr-sidebar-leases-col" onClick={() => handleHeaderClick(col.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {col.label}
                  {isSorted && <span className="lr-sidebar-leases-sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  <button
                    type="button"
                    className={`lr-sidebar-leases-filter-btn${isFiltered ? ' lr-sidebar-leases-filter-btn--active' : ''}`}
                    onClick={(e) => handleFilterClick(e, col.key)}
                    aria-label={`Filter ${col.label}`}
                  >
                    ▼
                  </button>
                </span>
              );
            })}
          </div>

          {openFilter && (
            <FilterMenu
              column={openFilter}
              allValues={distinctValues(openFilter)}
              activeFilters={filters[openFilter]}
              onApply={(sel) => handleApplyFilter(openFilter, sel)}
              onClear={() => handleClearFilter(openFilter)}
              onClose={() => setOpenFilter(null)}
              anchorRect={filterAnchor}
            />
          )}

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
            ) : processedLeases.length === 0 ? (
              <div className="lr-sidebar-empty">
                <div className="lr-sidebar-empty-label">{leases.length === 0 ? 'No leases loaded' : 'No leases match filters'}</div>
                <div className="lr-sidebar-empty-sub">{leases.length === 0 ? 'Upload a lease PDF to begin.' : 'Try adjusting your filters.'}</div>
              </div>
            ) : (
              processedLeases.map((lease) => {
                const isSelected = lease.id === selectedLeaseId;
                const statusClass = getStatusClass(lease.status);
                return (
                  <button
                    key={lease.id}
                    type="button"
                    className={'lr-sidebar-row lr-sidebar-columns lr-sidebar-row--item' + (isSelected ? ' lr-sidebar-row--selected' : '')}
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
                    <div className="lr-col lr-col-end">{formatDate(lease.endDate) ?? ''}</div>
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
