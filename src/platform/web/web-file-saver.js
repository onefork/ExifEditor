// Web platform FileSaver — triggers browser downloads via <a download>.
// Extracted from src/exporter.js (triggerBrowserDownload).
// Core's exporter receives this via initExporter({ fileSaver }).

const REVOKE_DELAY_MS = 1500;
const ZIP_FILENAME = 'edited_images.zip';

// Create a temporary <a download> element, click it to start a browser
// download, then revoke the object URL after a short delay (so the browser
// has time to begin reading the blob). Returns a Promise that resolves once
// the URL has been revoked, allowing callers to space out successive
// downloads and avoid the browser's multi-download blocker.
export function triggerBrowserDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return new Promise((resolve) => {
    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve();
    }, REVOKE_DELAY_MS);
  });
}

export const webFileSaver = {
  saveBlob(blob, filename) {
    return triggerBrowserDownload(blob, filename);
  },

  async saveBatch(blobs, filenames) {
    // Sequential with an inherent delay between each (see triggerBrowserDownload)
    // to avoid the browser blocking consecutive programmatic downloads.
    for (let i = 0; i < blobs.length; i++) {
      await triggerBrowserDownload(blobs[i], filenames[i]);
    }
  },

  saveZip(zipBlob) {
    return triggerBrowserDownload(zipBlob, ZIP_FILENAME);
  },
};

export default webFileSaver;
