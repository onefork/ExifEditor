import React, { useState } from 'react';

const sectionStyle = { padding: '12px', borderBottom: '1px solid var(--border-color, #ddd)' };
const listStyle = { listStyle: 'none', padding: 0, margin: '8px 0 0' };
const itemStyle = { display: 'flex', gap: '6px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' };
const btnStyle = { padding: '6px 10px', minHeight: '32px', borderRadius: '4px', cursor: 'pointer' };
const smallBtn = { ...btnStyle, padding: '4px 8px', fontSize: '12px' };
const inputStyle = { padding: '6px 8px', minHeight: '32px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: 0 };

// Preset list with up/down/delete, add/edit form.
export function PresetManager({ presets, refresh, savePreset, deletePreset, movePresetUp, movePresetDown, getPresetDisplayName, t }) {
  const [editing, setEditing] = useState(null); // null | 'new' | presetId
  const [form, setForm] = useState({ id: '', name: '', lat: '', lng: '', offsetMeters: 300 });

  const list = presets || [];

  const startAdd = () => {
    setEditing('new');
    setForm({ id: '', name: '', lat: '', lng: '', offsetMeters: 300 });
  };
  const startEdit = (p) => {
    setEditing(p.id);
    setForm({ id: p.id, name: p.name || '', lat: String(p.lat), lng: String(p.lng), offsetMeters: p.offsetMeters || 0 });
  };
  const cancel = () => setEditing(null);

  const handleSave = async () => {
    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return;
    await savePreset({
      id: form.id || undefined,
      name: form.name,
      lat: latNum,
      lng: lngNum,
      offsetMeters: Number(form.offsetMeters) || 0,
    });
    setEditing(null);
    await refresh();
  };

  const handleDelete = async (id) => {
    await deletePreset(id);
    await refresh();
  };
  const handleUp = async (id) => {
    await movePresetUp(id);
    await refresh();
  };
  const handleDown = async (id) => {
    await movePresetDown(id);
    await refresh();
  };

  return (
    <section style={sectionStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '15px' }}>Presets</h3>
        <button type="button" style={btnStyle} onClick={startAdd}>+ Add</button>
      </div>

      {editing && (
        <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '10px', marginTop: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Display name" />
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} style={inputStyle} placeholder="Latitude" />
              <input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} style={inputStyle} placeholder="Longitude" />
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="range" min="0" max="5000" step="10" value={form.offsetMeters} onChange={(e) => setForm((f) => ({ ...f, offsetMeters: Number(e.target.value) }))} />
              <span style={{ fontSize: '12px', minWidth: '60px' }}>{form.offsetMeters} m</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" style={btnStyle} onClick={handleSave}>Save</button>
              <button type="button" style={btnStyle} onClick={cancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ul style={listStyle}>
        {list.map((p, idx) => (
          <li key={p.id} style={itemStyle}>
            <span style={{ flex: 1, fontSize: '13px' }}>
              {getPresetDisplayName(p, t)}
              <span style={{ color: '#999', fontSize: '11px' }}> ({p.lat?.toFixed(4)}, {p.lng?.toFixed(4)}) · {p.offsetMeters}m</span>
            </span>
            <button type="button" style={smallBtn} onClick={() => handleUp(p.id)} disabled={idx === 0} title="Move up">↑</button>
            <button type="button" style={smallBtn} onClick={() => handleDown(p.id)} disabled={idx === list.length - 1} title="Move down">↓</button>
            <button type="button" style={smallBtn} onClick={() => startEdit(p)} title="Edit">✎</button>
            <button type="button" style={smallBtn} onClick={() => handleDelete(p.id)} title="Delete">🗑</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PresetManager;
