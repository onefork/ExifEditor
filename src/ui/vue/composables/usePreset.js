// Vue composable wrapping core preset CRUD functions with a reactive list.
import { ref } from 'vue';
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

export function usePreset() {
  const presets = ref([]);

  async function refresh() {
    await ensureDefaultsOnce();
    presets.value = await listPresets();
  }

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
