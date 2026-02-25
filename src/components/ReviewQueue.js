import React, { useEffect, useState } from 'react';
import './ReviewQueue.css';
import { supabase, normalizeLease } from '../supabase';
import { formatDate } from '../utils/format';

function ReviewQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPending() {
      setLoading(true);
      setError(null);
      const { data, err } = await supabase
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
    }
    loadPending();
  }, []);

  return (
    <div className="lr-review-queue">
      <h2 className="lr-review-queue-title">Review queue</h2>
      <p className="lr-review-queue-subtitle">
        Leases pending review after extraction.
      </p>
      {loading ? (
        <div className="lr-review-queue-empty">
          <p>Loading…</p>
        </div>
      ) : error ? (
        <div className="lr-review-queue-empty lr-review-queue-error">
          <p>{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="lr-review-queue-empty">
          <p>No items in the review queue.</p>
        </div>
      ) : (
        <ul className="lr-review-queue-list">
          {items.map((item) => (
            <li key={item.id} className="lr-review-queue-item">
              <span className="lr-review-queue-item-name">
                {item.tenant || item.asset || `Lease ${item.id}`}
              </span>
              {item.endDate && (
                <span className="lr-review-queue-item-date">
                  {formatDate(item.endDate) ?? item.endDate}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ReviewQueue;
