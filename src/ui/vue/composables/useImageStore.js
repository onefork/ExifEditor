// Vue composable wrapping core's createImageStore with reactive refs.
// The store itself is plain JS; this composable mirrors its state into Vue
// refs so components can bind to them in templates.
import { ref } from 'vue';
import { createImageStore } from '../../../core/index.js';

export function useImageStore(readExif) {
  const store = createImageStore({ readExif });

  // Use ref([]) for images — Vue will deeply track element mutations made via
  // store methods (e.g. edits field reassignments) because the array is
  // replaced wholesale on every emit().
  const images = ref([]);
  const selectedId = ref(null);
  const mode = ref('single');

  store.subscribe((state) => {
    images.value = state.images;
    selectedId.value = state.selectedId;
    mode.value = state.mode;
  });

  return { store, images, selectedId, mode };
}
