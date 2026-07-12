import { useState, useEffect } from 'react';
import { createImageStore } from '../../../core/index.js';

// Wraps core's createImageStore with React state.
// The store itself is imperative; this hook mirrors its state into React
// so components re-render on changes.
export function useImageStore(readExif) {
  const [store] = useState(() => createImageStore({ readExif }));
  const [images, setImages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('single');

  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setImages(state.images);
      setSelectedId(state.selectedId);
      setMode(state.mode);
    });
    return unsub;
  }, [store]);

  return { store, images, selectedId, mode };
}

export default useImageStore;
