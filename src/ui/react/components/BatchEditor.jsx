import React, { useState } from 'react';
import {
  getDisplayValue,
  parseExifDate,
  dtToExif,
} from '../../../core/index.js';

const sectionStyle = { padding: '12px', borderBottom: '1px solid var(--border-color, #ddd)' };
const groupStyle = { border: '1px solid #eee', borderRadius: '6px', padding: '10px', marginBottom: '10px' };
const labelStyle = { fontSize: '13px', color: '#555', display: 'block', marginBottom: '4px' };
const inputStyle = { padding: '6px 8px', minHeight: '32px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: 0 };
const btnStyle = { padding: '6px 10px', minHeight: '32px', borderRadius: '4px', cursor: 'pointer' };
const smallBtn = { ...btnStyle, padding: '4px 8px', fontSize: '12px' };

// Batch editing: field groups with apply/clear/reset; time shift section.
// Empty input = no change. Apply writes the value to all images.
export function BatchEditor({ images, store, presets, applyPresetToImage, getPresetDisplayName, t }) {
  const list = images || [];
  const [dateVal, setDateVal] = useState('');
  const [timeVal, setTimeVal] = useState('');
  const [gpsLat, setGpsLat] = useState('');
  const [gpsLng, setGpsLng] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [software, setSoftware] = useState('');
  const [presetId, setPresetId] = useState('');
  const [offset, setOffset] = useState(300);

  // Time shift state
  const [sign, setSign] = useState('+');
  const [shift, setShift] = useState({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });

  const hasImages = list.length > 0;

  const resetImagesField = (field) => {
    list.forEach((im) => {
      const raw = im.edits && im.edits[field] ? im.edits[field].rawValue : undefined;
      store.setEdit(im.id, field, raw != null ? raw : '');
    });
  };

  const clearImagesField = (field) => {
    store.applyFieldValueToAll(field, null);
  };

  // ---- Date/Time group ----
  const applyDateTime = () => {
    if (!dateVal && !timeVal) return;
    store.applyFieldValueToAll('dateTimeOriginal', dtToExif(dateVal, timeVal));
  };

  // ---- GPS group ----
  const applyGps = () => {
    if (gpsLat === '' && gpsLng === '') return;
    const map = {};
    if (gpsLat !== '') map.gpsLat = Number(gpsLat);
    if (gpsLng !== '') map.gpsLng = Number(gpsLng);
    store.applyFieldGroupToAll(map);
  };
  const applyPresetAll = () => {
    const preset = (presets || []).find((p) => p.id === presetId);
    if (!preset) return;
    // Per-image random offset (each image gets its own offset sample)
    list.forEach((im) => {
      const newEdits = applyPresetToImage({ ...preset, offsetMeters: offset }, im.edits);
      store.setEdit(im.id, 'gpsLat', newEdits.gpsLat.value);
      store.setEdit(im.id, 'gpsLng', newEdits.gpsLng.value);
    });
  };

  // ---- Equip group ----
  const applyEquip = () => {
    if (make === '' && model === '') return;
    const map = {};
    if (make !== '') map.make = make;
    if (model !== '') map.model = model;
    store.applyFieldGroupToAll(map);
  };

  // ---- Software group ----
  const applySoftware = () => {
    if (software === '') return;
    store.applyFieldValueToAll('software', software);
  };

  // ---- Time shift ----
  const applyTimeShift = () => {
    const dir = sign === '-' ? -1 : 1;
    list.forEach((im) => {
      const cur = getDisplayValue(im, 'dateTimeOriginal', true) || (im.edits.dateTimeOriginal && im.edits.dateTimeOriginal.rawValue);
      const parsed = parseExifDate(cur);
      if (!parsed) return;
      const d = new Date(`${parsed.date}T${parsed.time}`);
      if (isNaN(d.getTime())) return;
      d.setFullYear(d.getFullYear() + dir * (shift.years || 0));
      d.setMonth(d.getMonth() + dir * (shift.months || 0));
      d.setDate(d.getDate() + dir * (shift.days || 0));
      d.setHours(d.getHours() + dir * (shift.hours || 0));
      d.setMinutes(d.getMinutes() + dir * (shift.minutes || 0));
      d.setSeconds(d.getSeconds() + dir * (shift.seconds || 0));
      const newDate = d.toISOString().slice(0, 10);
      const newTime = d.toTimeString().slice(0, 8);
      store.setEdit(im.id, 'dateTimeOriginal', dtToExif(newDate, newTime));
    });
  };

  const shiftField = (name, val) => setShift((s) => ({ ...s, [name]: Number(val) || 0 }));
  const shiftInputStyle = { width: '52px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center' };

  const GroupActions = ({ onApply, onClear, onReset, applyDisabled }) => (
    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
      <button type="button" style={smallBtn} onClick={onApply} disabled={!hasImages || applyDisabled}>Apply to all</button>
      <button type="button" style={smallBtn} onClick={onClear} disabled={!hasImages}>✖ Clear all</button>
      <button type="button" style={smallBtn} onClick={onReset} disabled={!hasImages}>↺ Reset</button>
    </div>
  );

  return (
    <section style={sectionStyle}>
      <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Batch Edit ({list.length} images)</h3>

      <div style={groupStyle}>
        <label style={labelStyle}>Date / Time</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} style={inputStyle} placeholder="Date" />
          <input type="time" step="1" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} style={inputStyle} placeholder="Time" />
        </div>
        <GroupActions onApply={applyDateTime} onClear={() => clearImagesField('dateTimeOriginal')} onReset={() => resetImagesField('dateTimeOriginal')} applyDisabled={!dateVal && !timeVal} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>GPS (Lat, Lng)</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="number" step="any" value={gpsLat} onChange={(e) => setGpsLat(e.target.value)} style={inputStyle} placeholder="Latitude" />
          <input type="number" step="any" value={gpsLng} onChange={(e) => setGpsLng(e.target.value)} style={inputStyle} placeholder="Longitude" />
        </div>
        <GroupActions onApply={applyGps} onClear={() => store.applyFieldGroupToAll({ gpsLat: null, gpsLng: null })} onReset={() => { resetImagesField('gpsLat'); resetImagesField('gpsLng'); }} applyDisabled={gpsLat === '' && gpsLng === ''} />

        <label style={{ ...labelStyle, marginTop: '8px' }}>Preset (per-image random offset)</label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} style={inputStyle}>
            <option value="">— Select preset —</option>
            {(presets || []).map((p) => (
              <option key={p.id} value={p.id}>{getPresetDisplayName(p, t)}</option>
            ))}
          </select>
          <input type="range" min="0" max="5000" step="10" value={offset} onChange={(e) => setOffset(Number(e.target.value))} />
          <span style={{ fontSize: '12px', minWidth: '60px' }}>{offset} m</span>
          <button type="button" style={smallBtn} onClick={applyPresetAll} disabled={!hasImages || !presetId}>Apply</button>
        </div>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Make / Model</label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="text" value={make} onChange={(e) => setMake(e.target.value)} style={inputStyle} placeholder="Make" />
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} style={inputStyle} placeholder="Model" />
        </div>
        <GroupActions onApply={applyEquip} onClear={() => store.applyFieldGroupToAll({ make: null, model: null })} onReset={() => { resetImagesField('make'); resetImagesField('model'); }} applyDisabled={make === '' && model === ''} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Software</label>
        <input type="text" value={software} onChange={(e) => setSoftware(e.target.value)} style={inputStyle} placeholder="Software" />
        <GroupActions onApply={applySoftware} onClear={() => clearImagesField('software')} onReset={() => resetImagesField('software')} applyDisabled={software === ''} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Time Shift (apply delta to all)</label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sign} onChange={(e) => setSign(e.target.value)} style={{ ...shiftInputStyle, width: '44px' }}>
            <option value="+">+</option>
            <option value="-">−</option>
          </select>
          {['years', 'months', 'days', 'hours', 'minutes', 'seconds'].map((name) => (
            <label key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '10px', color: '#888' }}>
              <input
                type="number"
                min="0"
                value={shift[name]}
                onChange={(e) => shiftField(name, e.target.value)}
                style={shiftInputStyle}
              />
              {name.replace(/s$/, '')}
            </label>
          ))}
          <button type="button" style={smallBtn} onClick={applyTimeShift} disabled={!hasImages}>Shift all</button>
        </div>
      </div>
    </section>
  );
}

export default BatchEditor;
