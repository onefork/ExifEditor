import { useState, useCallback } from 'react';
import { exportOneByOne, exportZip } from '../../../core/index.js';

// Wraps core export functions with progress tracking.
// `progress` is 0-100; `isExporting` is true while a job is running.
export function useExporter() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportOne = useCallback(async (images) => {
    setIsExporting(true);
    setProgress(0);
    try {
      await exportOneByOne(images, ({ percent }) => setProgress(percent));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportZipFn = useCallback(async (images) => {
    setIsExporting(true);
    setProgress(0);
    try {
      await exportZip(images, ({ percent }) => setProgress(percent));
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { isExporting, progress, exportOne, exportZip: exportZipFn };
}

export default useExporter;
