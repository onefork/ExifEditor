import { useState, useEffect, useCallback } from 'react';
import {
  listPresets,
  savePreset,
  deletePreset,
  movePresetUp,
  movePresetDown,
  ensureDefaultsOnce,
  getPresetDisplayName,
  applyPresetToImage,
  t,
} from '../../../core/index.js';

// Wraps core preset functions with React state.
// presets is refreshed on mount and after mutations.
export function usePreset() {
  const [presets, setPresets] = useState([]);

  const refresh = useCallback(async () => {
    await ensureDefaultsOnce();
    setPresets(await listPresets());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    presets,
    refresh,
    savePreset,
    deletePreset,
    movePresetUp,
    movePresetDown,
    getPresetDisplayName,
    applyPresetToImage,
    t,
  };
}

export default usePreset;
