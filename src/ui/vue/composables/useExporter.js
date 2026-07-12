// Vue composable wrapping core export functions with progress tracking.
import { ref } from 'vue';
import { exportOneByOne, exportZip } from '../../../core/index.js';

export function useExporter() {
  const isExporting = ref(false);
  const progress = ref(0);
  const lastMessage = ref('');

  async function exportOne(images) {
    isExporting.value = true;
    progress.value = 0;
    lastMessage.value = '';
    try {
      await exportOneByOne(images, ({ percent, name } = {}) => {
        progress.value = percent;
        if (name) lastMessage.value = name;
      });
    } finally {
      isExporting.value = false;
    }
  }

  async function exportZipAll(images) {
    isExporting.value = true;
    progress.value = 0;
    lastMessage.value = '';
    try {
      await exportZip(images, ({ percent, name } = {}) => {
        progress.value = percent;
        if (name) lastMessage.value = name;
      });
    } finally {
      isExporting.value = false;
    }
  }

  return { isExporting, progress, lastMessage, exportOne, exportZipAll };
}
