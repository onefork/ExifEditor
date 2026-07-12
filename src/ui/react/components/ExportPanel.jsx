import React from 'react';
import { useExporter } from '../hooks/useExporter.js';

const sectionStyle = { padding: '12px', borderBottom: '1px solid var(--border-color, #ddd)' };
const btnStyle = { padding: '8px 12px', minHeight: '36px', borderRadius: '4px', cursor: 'pointer' };

// Export buttons, progress bar, loading state.
export function ExportPanel({ images }) {
  const { isExporting, progress, exportOne, exportZip } = useExporter();
  const count = (images || []).length;
  const disabled = isExporting || count === 0;

  return (
    <section style={sectionStyle}>
      <h3 style={{ margin: '0 0 8px', fontSize: '15px' }}>Export</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button type="button" style={btnStyle} disabled={disabled} onClick={() => exportOne(images)}>
          {isExporting ? 'Exporting…' : 'Download one by one'}
        </button>
        <button type="button" style={btnStyle} disabled={disabled} onClick={() => exportZip(images)}>
          {isExporting ? 'Exporting…' : 'Download ZIP'}
        </button>
        <span style={{ fontSize: '13px', color: '#666' }}>{count} image(s)</span>
      </div>

      {isExporting && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ position: 'relative', height: '20px', background: '#eee', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max(0, Math.min(100, progress))}%`,
                height: '100%',
                background: '#1976d2',
                transition: 'width 120ms linear',
              }}
            />
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#333' }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export default ExportPanel;
