import React from 'react';
import { SUPPORTED_LANGUAGES } from '../../../core/index.js';
import { THEMES } from '../../../platform/web/dom-i18n.js';

const barStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-color, #ddd)',
};

const fieldStyle = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' };
const selectStyle = { padding: '6px 8px', minHeight: '32px', borderRadius: '4px' };

// Language dropdown, theme selector, mode toggle.
export function SettingsBar({ language, onLanguageChange, theme, onThemeChange, mode, onModeChange }) {
  return (
    <div style={barStyle}>
      <label style={fieldStyle}>
        <span>Language</span>
        <select
          value={language || 'en'}
          onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
          style={selectStyle}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span>Theme</span>
        <select
          value={theme || 'system'}
          onChange={(e) => onThemeChange && onThemeChange(e.target.value)}
          style={selectStyle}
        >
          {THEMES.map((tOpt) => (
            <option key={tOpt.code} value={tOpt.code}>{tOpt.code}</option>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span>Mode</span>
        <select
          value={mode || 'single'}
          onChange={(e) => onModeChange && onModeChange(e.target.value)}
          style={selectStyle}
        >
          <option value="single">Single</option>
          <option value="batch">Batch</option>
        </select>
      </label>
    </div>
  );
}

export default SettingsBar;
