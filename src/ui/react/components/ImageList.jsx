import React, { useRef } from 'react';
import { humanSize } from '../../../core/index.js';

const sectionStyle = { padding: '12px', borderBottom: '1px solid var(--border-color, #ddd)' };
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
  gap: '8px',
  marginTop: '8px',
};
const thumbStyle = {
  width: '100%',
  height: '96px',
  objectFit: 'cover',
  borderRadius: '4px',
  border: '1px solid #ccc',
  cursor: 'pointer',
  display: 'block',
};
const delStyle = {
  position: 'absolute',
  top: '2px',
  right: '2px',
  background: 'rgba(0,0,0,0.6)',
  color: '#fff',
  border: 'none',
  borderRadius: '50%',
  width: '20px',
  height: '20px',
  cursor: 'pointer',
  fontSize: '12px',
  lineHeight: '20px',
  padding: 0,
};
const btnStyle = { padding: '8px 12px', minHeight: '36px', borderRadius: '4px', cursor: 'pointer' };

// File input, thumbnail grid, selection, delete, clear all.
export function ImageList({ images, selectedId, onAddFiles, onSelect, onRemove, onClearAll }) {
  const inputRef = useRef(null);
  const list = images || [];

  const handleFiles = (e) => {
    const fl = e.target.files;
    if (fl && fl.length && onAddFiles) onAddFiles(fl);
    e.target.value = '';
  };

  return (
    <section style={sectionStyle}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ display: 'none' }}
        />
        <button type="button" style={btnStyle} onClick={() => inputRef.current && inputRef.current.click()}>
          Add Images
        </button>
        {list.length > 0 && (
          <button type="button" style={btnStyle} onClick={() => onClearAll && onClearAll()}>
            Clear All
          </button>
        )}
        <span style={{ fontSize: '13px', color: '#666' }}>{list.length} image(s)</span>
      </div>

      {list.length > 0 && (
        <div style={gridStyle}>
          {list.map((im) => {
            const selected = im.id === selectedId;
            return (
              <div
                key={im.id}
                style={{
                  position: 'relative',
                  outline: selected ? '2px solid #1976d2' : 'none',
                  borderRadius: '4px',
                }}
              >
                {im.summary && im.summary.thumbnail ? (
                  <img
                    src={im.summary.thumbnail}
                    alt={im.summary.fileName}
                    style={thumbStyle}
                    onClick={() => onSelect && onSelect(im.id)}
                  />
                ) : (
                  <div
                    style={{ ...thumbStyle, alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#999', fontSize: '11px' }}
                    onClick={() => onSelect && onSelect(im.id)}
                  >
                    {im.summary && im.summary.error ? '!' : 'img'}
                  </div>
                )}
                <button type="button" style={delStyle} onClick={() => onRemove && onRemove(im.id)} aria-label="Remove">
                  ×
                </button>
                <div
                  style={{ fontSize: '10px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={im.summary && im.summary.fileName ? `${im.summary.fileName} (${humanSize(im.summary.fileSize)})` : ''}
                >
                  {im.summary && im.summary.fileName}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ImageList;
