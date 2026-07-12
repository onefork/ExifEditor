import React, { useState, useMemo } from 'react';
import {
  getDisplayValue,
  parseExifDate,
  dtToExif,
  formatGps,
} from '../../../core/index.js';

const sectionStyle = { padding: '12px', borderBottom: '1px solid var(--border-color, #ddd)' };
const rowStyle = { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' };
const labelStyle = { fontSize: '13px', color: '#555' };
const inputStyle = { padding: '6px 8px', minHeight: '32px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 };
const btnStyle = { padding: '6px 10px', minHeight: '32px', borderRadius: '4px', cursor: 'pointer' };

// Single image editor: date/time, GPS, make/model/software, preset dropdown + offset slider.
export function ExifEditor({ image, store, presets, applyPresetToImage, getPresetDisplayName, t }) {
  const [showEdited, setShowEdited] = useState(true);
  const [presetId, setPresetId] = useState('');
  const [offset, setOffset] = useState(300);

  const parsedDate = useMemo(() => {
    if (!image) return { date: '', time: '' };
    const val = getDisplayValue(image, 'dateTimeOriginal', showEdited);
    return parseExifDate(val) || { date: '', time: '' };
  }, [image, showEdited]);

  if (!image) {
    return (
      <section style={sectionStyle}>
        <p style={{ color: '#999' }}>No image selected.</p>
      </section>
    );
  }

  const setField = (field, value) => store.setEdit(image.id, field, value);

  const handleDateChange = (datePart) => {
    setField('dateTimeOriginal', dtToExif(datePart, parsedDate.time || ''));
  };
  const handleTimeChange = (timePart) => {
    setField('dateTimeOriginal', dtToExif(parsedDate.date || '', timePart));
  };

  const applyPreset = () => {
    const preset = (presets || []).find((p) => p.id === presetId);
    if (!preset) return;
    const newEdits = applyPresetToImage({ ...preset, offsetMeters: offset }, image.edits);
    store.setEdit(image.id, 'gpsLat', newEdits.gpsLat.value);
    store.setEdit(image.id, 'gpsLng', newEdits.gpsLng.value);
  };

  const resetField = (field) => {
    const raw = image.summary && image.summary[field];
    setField(field, raw != null ? raw : '');
  };

  const lat = getDisplayValue(image, 'gpsLat', showEdited);
  const lng = getDisplayValue(image, 'gpsLng', showEdited);

  return (
    <section style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>{image.summary && image.summary.fileName}</h3>
        <button type="button" style={btnStyle} onClick={() => setShowEdited((v) => !v)}>
          {showEdited ? '👁 Edited' : '👁 Original'}
        </button>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Date / Time</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="date" value={parsedDate.date || ''} onChange={(e) => handleDateChange(e.target.value)} style={inputStyle} />
          <input type="time" step="1" value={parsedDate.time || ''} onChange={(e) => handleTimeChange(e.target.value)} style={inputStyle} />
          <button type="button" style={btnStyle} onClick={() => resetField('dateTimeOriginal')}>↺</button>
        </div>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>GPS (Lat, Lng)</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="number"
            step="any"
            value={lat == null ? '' : lat}
            onChange={(e) => setField('gpsLat', e.target.value === '' ? '' : Number(e.target.value))}
            style={inputStyle}
            placeholder="Latitude"
          />
          <input
            type="number"
            step="any"
            value={lng == null ? '' : lng}
            onChange={(e) => setField('gpsLng', e.target.value === '' ? '' : Number(e.target.value))}
            style={inputStyle}
            placeholder="Longitude"
          />
          <button type="button" style={btnStyle} onClick={() => { resetField('gpsLat'); resetField('gpsLng'); }}>↺</button>
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>{formatGps(lat, lng)}</div>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Preset Location</label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} style={inputStyle}>
            <option value="">— Select preset —</option>
            {(presets || []).map((p) => (
              <option key={p.id} value={p.id}>{getPresetDisplayName(p, t)}</option>
            ))}
          </select>
          <input
            type="range"
            min="0"
            max="5000"
            step="10"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
          />
          <span style={{ fontSize: '12px', minWidth: '60px' }}>{offset} m</span>
          <button type="button" style={btnStyle} onClick={applyPreset} disabled={!presetId}>Apply</button>
        </div>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Make</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="text" value={getDisplayValue(image, 'make', showEdited) ?? ''} onChange={(e) => setField('make', e.target.value)} style={inputStyle} />
          <button type="button" style={btnStyle} onClick={() => resetField('make')}>↺</button>
        </div>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Model</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="text" value={getDisplayValue(image, 'model', showEdited) ?? ''} onChange={(e) => setField('model', e.target.value)} style={inputStyle} />
          <button type="button" style={btnStyle} onClick={() => resetField('model')}>↺</button>
        </div>
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Software</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="text" value={getDisplayValue(image, 'software', showEdited) ?? ''} onChange={(e) => setField('software', e.target.value)} style={inputStyle} />
          <button type="button" style={btnStyle} onClick={() => resetField('software')}>↺</button>
        </div>
      </div>
    </section>
  );
}

export default ExifEditor;
