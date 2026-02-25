import React, { useCallback, useEffect, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LeaseDetail from './components/LeaseDetail';
import UploadLease from './components/UploadLease';
import ReviewQueue from './components/ReviewQueue';
import { supabase, normalizeLease } from './supabase';

function App() {
  const [leases, setLeases] = useState([]);
  const [leasesLoading, setLeasesLoading] = useState(true);
  const [leasesError, setLeasesError] = useState(null);
  const [selectedLease, setSelectedLease] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    async function loadLeases() {
      setLeasesLoading(true);
      setLeasesError(null);
      const { data, error } = await supabase.from('leases').select('*');

      if (error) {
        setLeasesError(error.message);
        setLeases([]);
        setLeasesLoading(false);
        return;
      }

      const raw = data ?? [];
      const normalized = raw.map(normalizeLease);
      setLeases(normalized);
      setLeasesLoading(false);
    }
    loadLeases();
  }, []);

  useEffect(() => {
    function handleMouseMove(event) {
      if (!isResizing) return;
      const minWidth = 220;
      const maxWidth = Math.max(window.innerWidth - 360, minWidth);
      const nextWidth = Math.min(Math.max(event.clientX, minWidth), maxWidth);
      setSidebarWidth(nextWidth);
    }

    function handleMouseUp() {
      if (isResizing) {
        setIsResizing(false);
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResizing = () => {
    setIsResizing(true);
  };

  const handleUploadClick = () => {
    setShowUploadPanel(true);
  };

  const handleNavChange = (view) => {
    setActiveView(view);
    setShowUploadPanel(false);
    if (view !== 'leases') setSelectedLease(null);
  };

  const refetchLeases = useCallback(async () => {
    setLeasesLoading(true);
    setLeasesError(null);
    const { data, error } = await supabase.from('leases').select('*');
    if (error) {
      setLeasesError(error.message);
      setLeases([]);
      setLeasesLoading(false);
      return [];
    }
    const normalized = (data ?? []).map(normalizeLease);
    setLeases(normalized);
    setLeasesLoading(false);
    return normalized;
  }, []);

  const handleExtractionComplete = useCallback((insertedIds, updatedLeases) => {
    setShowUploadPanel(false);
    setActiveView('leases');
    if (insertedIds?.length && updatedLeases?.length) {
      const first = updatedLeases.find((l) => insertedIds.includes(l.id));
      if (first) setSelectedLease(first);
    }
    setToastMessage('Lease saved successfully');
  }, []);

  const handleAssetChange = useCallback(async (leaseId, newAsset) => {
    const { error } = await supabase.from('leases').update({ asset: newAsset }).eq('id', leaseId);
    if (error) return;
    setSelectedLease((prev) => (prev && prev.id === leaseId ? { ...prev, asset: newAsset } : prev));
  }, []);

  function renderMainContent() {
    if (showUploadPanel) {
      return (
        <UploadLease
          onLeasesRefetch={refetchLeases}
          onExtractionComplete={handleExtractionComplete}
        />
      );
    }
    if (activeView === 'review-queue') {
      return <ReviewQueue />;
    }
    if (activeView === 'leases' && selectedLease) {
      return <LeaseDetail lease={selectedLease} onAssetChange={handleAssetChange} />;
    }
    if (activeView === 'leases') {
      return (
        <div className="lr-main-placeholder">
          <p>Select a lease from the list to view details.</p>
        </div>
      );
    }
    return <Dashboard leases={leases} />;
  }

  return (
    <div className="lr-root">
      <div className="lr-window">
        <div className="lr-window-titlebar">
          <div className="lr-window-title">LeaseRepo · Portfolio View</div>
        </div>

        <div
          className="lr-window-body"
          style={{
            gridTemplateColumns: `${sidebarWidth}px 4px minmax(0, 1fr)`,
            cursor: isResizing ? 'col-resize' : 'default',
          }}
        >
          <Sidebar
            leases={leases}
            leasesLoading={leasesLoading}
            leasesError={leasesError}
            onSelectLease={setSelectedLease}
            selectedLeaseId={selectedLease?.id ?? null}
            activeView={activeView}
            onNavChange={handleNavChange}
            onUploadClick={handleUploadClick}
          />

          <div
            className="lr-resize-handle"
            onMouseDown={startResizing}
            aria-hidden="true"
          />

          <section className="lr-main">
            {toastMessage && (
              <div className="lr-toast" role="status" aria-live="polite">
                {toastMessage}
              </div>
            )}
            {renderMainContent()}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
