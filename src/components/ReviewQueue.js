import React, { useCallback, useEffect, useState } from 'react';
import './ReviewQueue.css';
import { supabase, normalizeLease } from '../supabase';
import { formatDate, formatRentPerSqm, formatCurrency } from '../utils/format';

function ReviewQueue({ onLeaseApproved }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(null); // lease id being saved
  const [actionError, setActionError] = useState(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('leases')
      .select('*')
      .eq('status', 'pending')
      .order('id', { ascending: false });
    if (err) {
      setError(err.message);
      setItems([]);
    } else {
      setItems((data ?? []).map(normalizeLease));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const handleExpand = (item) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditForm(null);
      return;
    }
    setExpandedId(item.id);
    setEditForm({ ...item });
    setActionError(null);
  };

  const setEdit = (key, value) => {
    setEditForm((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  /* ── Approve: set status to active and save edits ──────────── */
  const handleApprove = useCallback(async (item) => {
    const form = editForm && editForm.id === item.id ? editForm : item;
    setSaving(item.id);
    setActionError(null);

    const toNum = (v) => (v === '' || v === undefined || v === null || isNaN(Number(v)) ? null : Number(v));
    const payload = {
      tenant: form.tenant || null,
      trade_name: form.tradeName || form.tenant || null,
      asset: form.asset || null,
      unit: form.unit || null,
      gla: toNum(form.gla),
      rent_per_sqm: toNum(form.rent),
      total_monthly: toNum(form.totalMonthly),
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      status: 'active',
      rent_review: form.rentReview || null,
      break_option: form.breakOption || null,
      break_option_date: form.breakOptionDate || null,
      deposit: form.deposit || null,
      guarantee: form.guarantee || null,
      variable_rent: form.variableRent || null,
      auto_renewal: form.autoRenewal || null,
      permitted_use: form.permittedUse || null,
      non_compete: form.nonCompete || null,
      doc_type: form.docType || null,
      notes: form.notes || null,
      category: form.category || null,
    };

    const { error: err } = await supabase.from('leases').update(payload).eq('id', item.id);
    setSaving(null);
    if (err) {
      setActionError(err.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setExpandedId(null);
    setEditForm(null);
    if (onLeaseApproved) onLeaseApproved();
  }, [editForm, onLeaseApproved]);

  /* ── Reject: delete the lease ──────────────────────────────── */
  const handleReject = useCallback(async (item) => {
    if (!window.confirm(`Reject and delete lease for "${item.tenant || 'Unknown'}"? This cannot be undone.`)) return;
    setSaving(item.id);
    setActionError(null);
    const { error: err } = await supabase.from('leases').delete().eq('id', item.id);
    setSaving(null);
    if (err) {
      setActionError(err.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditForm(null);
    }
  }, [expandedId]);

  /* ── Approve all ───────────────────────────────────────────── */
  const handleApproveAll = useCallback(async () => {
    if (!window.confirm(`Approve all ${items.length} pending leases?`)) return;
    setSaving('all');
    setActionError(null);
    const ids = items.map((i) => i.id);
    const { error: err } = await supabase
      .from('leases')
      .update({ status: 'active' })
      .in('id', ids);
    setSaving(null);
    if (err) {
      setActionError(err.message);
      return;
    }
    setItems([]);
    setExpandedId(null);
    setEditForm(null);
    if (onLeaseApproved) onLeaseApproved();
  }, [items, onLeaseApproved]);

  return (
    <div className="lr-review-queue">
      <div className="lr-review-queue-header">
        <div>
          <h2 className="lr-review-queue-title">Review queue</h2>
          <p className="lr-review-queue-subtitle">
            Leases pending review after extraction. Review, edit, then approve or reject.
          </p>
        </div>
        {items.length > 1 && (
          <button
            type="button"
            className="lr-review-queue-approve-all-btn"
            onClick={handleApproveAll}
            disabled={saving != null}
          >
            Approve all ({items.length})
          </button>
        )}
      </div>

      {actionError && (
        <div className="lr-review-queue-error-bar" role="alert">{actionError}</div>
      )}

      {loading ? (
        <div className="lr-review-queue-empty"><p>Loading…</p></div>
      ) : error ? (
        <div className="lr-review-queue-empty lr-review-queue-error"><p>{error}</p></div>
      ) : items.length === 0 ? (
        <div className="lr-review-queue-empty"><p>No items in the review queue.</p></div>
      ) : (
        <ul className="lr-review-queue-list">
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const isSaving = saving === item.id || saving === 'all';
            return (
              <li key={item.id} className={`lr-review-queue-item${isExpanded ? ' lr-review-queue-item--expanded' : ''}`}>
                <div className="lr-review-queue-item-row" onClick={() => handleExpand(item)}>
                  <div className="lr-review-queue-item-info">
                    <span className="lr-review-queue-item-name">{item.tenant || item.asset || `Lease ${item.id}`}</span>
                    <span className="lr-review-queue-item-detail">
                      {item.asset && <span>{item.asset}</span>}
                      {item.unit && <span> · {item.unit}</span>}
                      {item.gla && <span> · {item.gla} m²</span>}
                    </span>
                  </div>
                  <div className="lr-review-queue-item-actions">
                    <button
                      type="button"
                      className="lr-review-queue-btn lr-review-queue-btn--approve"
                      onClick={(e) => { e.stopPropagation(); handleApprove(item); }}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="lr-review-queue-btn lr-review-queue-btn--reject"
                      onClick={(e) => { e.stopPropagation(); handleReject(item); }}
                      disabled={isSaving}
                    >
                      Reject
                    </button>
                    <span className="lr-review-queue-item-chevron">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && editForm && (
                  <div className="lr-review-queue-item-detail-panel">
                    <div className="lr-review-queue-edit-grid">
                      <label>Tenant<input type="text" value={editForm.tenant || ''} onChange={(e) => setEdit('tenant', e.target.value)} /></label>
                      <label>Asset<input type="text" value={editForm.asset || ''} onChange={(e) => setEdit('asset', e.target.value)} /></label>
                      <label>Unit<input type="text" value={editForm.unit || ''} onChange={(e) => setEdit('unit', e.target.value)} /></label>
                      <label>GLA m²<input type="number" step="0.01" value={editForm.gla || ''} onChange={(e) => setEdit('gla', e.target.value)} /></label>
                      <label>€/m²/mo<input type="number" step="0.01" value={editForm.rent || ''} onChange={(e) => setEdit('rent', e.target.value)} /></label>
                      <label>Monthly rent<input type="number" step="0.01" value={editForm.totalMonthly != null ? editForm.totalMonthly : ''} onChange={(e) => setEdit('totalMonthly', e.target.value)} /></label>
                      <label>Start date<input type="date" value={editForm.startDate || ''} onChange={(e) => setEdit('startDate', e.target.value)} /></label>
                      <label>End date<input type="date" value={editForm.endDate || ''} onChange={(e) => setEdit('endDate', e.target.value)} /></label>
                      <label>Break option<input type="text" value={editForm.breakOption || ''} onChange={(e) => setEdit('breakOption', e.target.value)} /></label>
                      <label>Rent review<input type="text" value={editForm.rentReview || ''} onChange={(e) => setEdit('rentReview', e.target.value)} /></label>
                      <label>Deposit<input type="text" value={editForm.deposit || ''} onChange={(e) => setEdit('deposit', e.target.value)} /></label>
                      <label>Guarantee<input type="text" value={editForm.guarantee || ''} onChange={(e) => setEdit('guarantee', e.target.value)} /></label>
                      <label>Permitted use<input type="text" value={editForm.permittedUse || ''} onChange={(e) => setEdit('permittedUse', e.target.value)} /></label>
                      <label>Category<input type="text" value={editForm.category || ''} onChange={(e) => setEdit('category', e.target.value)} /></label>
                      <label>Doc type<input type="text" value={editForm.docType || ''} onChange={(e) => setEdit('docType', e.target.value)} /></label>
                    </div>
                    <div className="lr-review-queue-edit-row-full">
                      <label>Notes<textarea value={editForm.notes || ''} onChange={(e) => setEdit('notes', e.target.value)} rows={2} /></label>
                    </div>
                    {item.confidence != null && (
                      <div className="lr-review-queue-confidence">
                        AI confidence: <strong>{(Number(item.confidence) * 100).toFixed(0)}%</strong>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ReviewQueue;
