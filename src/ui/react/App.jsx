import React, { useState, useCallback, useMemo } from 'react';
import { SettingsBar } from './components/SettingsBar.jsx';
import { ImageList } from './components/ImageList.jsx';
import { ExifEditor } from './components/ExifEditor.jsx';
import { BatchEditor } from './components/BatchEditor.jsx';
import { PresetManager } from './components/PresetManager.jsx';
import { ExportPanel } from './components/ExportPanel.jsx';
import { useImageStore } from './hooks/useImageStore.js';
import { usePreset } from './hooks/usePreset.js';
import { changeLanguage, currentLanguage } from '../../core/index.js';
import { setTheme, getStoredTheme } from '../../platform/web/dom-i18n.js';

const shellStyle = {
  maxWidth: '720px',
  margin: '0 auto',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: 'var(--text-color, #222)',
  background: 'var(--bg-color, #fff)',
};

// Root component. Accepts a readExif prop (decoder-bound) from the entry layer.
export function App({ readExif }) {
  const { store, images, selectedId, mode } = useImageStore(readExif);
  const preset = usePreset();
  const [language, setLanguage] = useState(() => currentLanguage());
  const [theme, setThemeState] = useState(() => getStoredTheme());

  const selectedImage = useMemo(
    () => images.find((im) => im.id === selectedId) || null,
    [images, selectedId]
  );

  const handleLanguageChange = useCallback(async (code) => {
    await changeLanguage(code);
    try { localStorage.setItem('exif-editor.language', code); } catch (_) { /* ignore */ }
    setLanguage(code);
  }, []);

  const handleThemeChange = useCallback((code) => {
    setTheme(code);
    setThemeState(code);
  }, []);

  const handleModeChange = useCallback((code) => {
    store.setMode(code);
  }, [store]);

  return (
    <div style={shellStyle}>
      <header style={{ padding: '12px', borderBottom: '1px solid var(--border-color, #ddd)' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>ExifEditor</h1>
      </header>

      <SettingsBar
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        mode={mode}
        onModeChange={handleModeChange}
      />

      <main>
        <ImageList
          images={images}
          selectedId={selectedId}
          onAddFiles={(fl) => store.addFiles(fl)}
          onSelect={(id) => store.selectImage(id)}
          onRemove={(id) => store.removeImage(id)}
          onClearAll={() => store.clearAll()}
        />

        {mode === 'single' ? (
          <ExifEditor
            image={selectedImage}
            store={store}
            presets={preset.presets}
            applyPresetToImage={preset.applyPresetToImage}
            getPresetDisplayName={preset.getPresetDisplayName}
            t={preset.t}
          />
        ) : (
          <BatchEditor
            images={images}
            store={store}
            presets={preset.presets}
            applyPresetToImage={preset.applyPresetToImage}
            getPresetDisplayName={preset.getPresetDisplayName}
            t={preset.t}
          />
        )}

        <PresetManager
          presets={preset.presets}
          refresh={preset.refresh}
          savePreset={preset.savePreset}
          deletePreset={preset.deletePreset}
          movePresetUp={preset.movePresetUp}
          movePresetDown={preset.movePresetDown}
          getPresetDisplayName={preset.getPresetDisplayName}
          t={preset.t}
        />

        <ExportPanel images={images} />
      </main>
    </div>
  );
}

export default App;
