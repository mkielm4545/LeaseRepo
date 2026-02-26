import React, { useCallback, useEffect, useState } from 'react';
import './UploadLease.css';
import { supabase } from '../supabase';
import {
  pdfToBase64Max99Pages,
  EXTRACTION_PROMPT,
  parseExtractionText,
  toLeaseRow,
} from '../utils/pdfExtract';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const STORAGE_KEY = 'onix_api_key';
const MAX_PAGES = 50;

const STATUS = { PENDING: 'pending', EXTRACTING: 'extracting', SAVED: 'saved', ERROR: 'error' };

function UploadLease({ onLeasesRefetch, onExtractionComplete }) {
  const [apiKey, setApiKey] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileEntries, setFileEntries] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const saveApiKey = useCallback((value) => {
    setApiKey(value);
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.type === 'application/pdf'
    );
    if (dropped.length) {
      setFileEntries((prev) => [
        ...prev,
        ...dropped.map((file) => ({ file, status: STATUS.PENDING })),
      ]);
    }
  }, []);

  const handleFileInput = useCallback((e) => {
    const chosen = Array.from(e.target.files || []);
    if (chosen.length) {
      setFileEntries((prev) => [
        ...prev,
        ...chosen.map((file) => ({ file, status: STATUS.PENDING })),
      ]);
    }
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index) => {
    setFileEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setEntryStatus = useCallback((index, status, payload = {}) => {
    setFileEntries((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], status, ...payload };
      return next;
    });
  }, []);

  const extractOne = useCallback(
    async (entry, index) => {
      const { file } = entry;
      const base64 = await pdfToBase64Max99Pages(file);
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64,
                  },
                },
                { type: 'text', text: EXTRACTION_PROMPT },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error('EXTRACTION ERROR:', res.status, errBody);
        throw new Error(res.statusText + (errBody ? `: ${errBody.slice(0, 200)}` : ''));
  
      }

      const data = await res.json();
      const textBlock = data.content?.find((c) => c.type === 'text');
      const text = textBlock?.text ?? '';
      const parsed = parseExtractionText(text);
      const row = toLeaseRow(parsed);
      if (!row) throw new Error('Could not parse extraction result');

      const { data: inserted, error } = await supabase.from('leases').insert(row).select('id').single();
      if (error) throw error;
      return inserted?.id ?? null;
    },
    [apiKey]
  );

  const handleExtractAll = useCallback(async () => {
    if (!apiKey.trim()) {
      setExtractError('Please enter your API key.');
      return;
    }
    if (fileEntries.length === 0) return;

    setExtracting(true);
    setExtractError(null);
    const insertedIds = [];

    for (let i = 0; i < fileEntries.length; i++) {
      // Wait 30s between files to respect API rate limits
      if (i > 0) {
        for (let s = 30; s > 0; s--) {
          setExtractError(`Waiting ${s}s before next file…`);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setExtractError(null);
      }
      setEntryStatus(i, STATUS.EXTRACTING);
      try {
        const id = await extractOne(fileEntries[i], i);
        setEntryStatus(i, STATUS.SAVED, { insertedId: id });
        if (id) insertedIds.push(id);
      } catch (err) {
        setEntryStatus(i, STATUS.ERROR, { errorMessage: err.message || 'Extraction failed' });
      }
    }
    const updated = await onLeasesRefetch?.() ?? [];
    if (insertedIds.length > 0 && onExtractionComplete) {
      onExtractionComplete(insertedIds, updated);
    }
    setFileEntries([]);
    setExtracting(false);
  }, [apiKey, fileEntries, extractOne, setEntryStatus, onLeasesRefetch, onExtractionComplete]);

  function formatFileSize(bytes) {
    if (bytes == null || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function renderStatus(entry) {
    switch (entry.status) {
      case STATUS.EXTRACTING:
        return <span className="lr-upload-lease-file-status lr-upload-lease-file-status--extracting">Extracting…</span>;
      case STATUS.SAVED:
        return <span className="lr-upload-lease-file-status lr-upload-lease-file-status--saved">Saved ✓</span>;
      case STATUS.ERROR:
        return <span className="lr-upload-lease-file-status lr-upload-lease-file-status--error" title={entry.errorMessage}>Error</span>;
      default:
        return null;
    }
  }

  const pendingCount = fileEntries.filter((e) => e.status === STATUS.PENDING).length;
  const canExtract = fileEntries.length > 0 && !extracting && pendingCount === fileEntries.length;

  return (
    <div className="lr-upload-lease">
      <div className="lr-upload-lease-header">
        <h2 className="lr-upload-lease-title">Upload lease PDFs</h2>
        <p className="lr-upload-lease-subtitle">Add one or more lease documents for extraction.</p>
      </div>

      <div className="lr-upload-lease-apikey">
        <label htmlFor="lr-upload-api-key" className="lr-upload-lease-apikey-label">
          Anthropic API key
        </label>
        <input
          id="lr-upload-api-key"
          type="password"
          className="lr-upload-lease-apikey-input"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => saveApiKey(e.target.value)}
          disabled={extracting}
        />
      </div>

      <div
        className={`lr-upload-lease-zone ${isDragging ? 'lr-upload-lease-zone--dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInput}
          className="lr-upload-lease-input"
          id="lr-upload-lease-input"
          disabled={extracting}
        />
        <label htmlFor="lr-upload-lease-input" className="lr-upload-lease-label">
          <span className="lr-upload-lease-icon">↑</span>
          <span className="lr-upload-lease-text">
            Drag and drop PDFs here, or click to browse
          </span>
          <span className="lr-upload-lease-hint">Multiple files supported</span>
        </label>
      </div>
      <p className="lr-upload-lease-caption">Only first {MAX_PAGES} pages are read.</p>

      {extractError && (
        <div className="lr-upload-lease-error" role="alert">
          {extractError}
        </div>
      )}

      {fileEntries.length > 0 && (
        <>
          <div className="lr-upload-lease-actions">
            <button
              type="button"
              className="lr-upload-lease-extract-btn"
              onClick={handleExtractAll}
              disabled={!canExtract || !apiKey.trim()}
            >
              {extracting ? 'Extracting…' : 'Extract All'}
            </button>
          </div>
          <ul className="lr-upload-lease-files">
            {fileEntries.map((entry, index) => (
              <li key={`${entry.file.name}-${index}`} className="lr-upload-lease-file">
                <span className="lr-upload-lease-file-name">{entry.file.name}</span>
                <span className="lr-upload-lease-file-meta">
                  {formatFileSize(entry.file.size)}
                  {renderStatus(entry)}
                </span>
                <button
                  type="button"
                  className="lr-upload-lease-file-remove"
                  onClick={() => removeFile(index)}
                  aria-label="Remove"
                  disabled={extracting}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default UploadLease;
