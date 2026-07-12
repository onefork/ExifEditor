// Image routes — upload, EXIF query/modify, export.
// In-memory storage: id -> { id, file, summary, edits }

import { parseMultipart, readJsonBody } from '../middleware/multipart.js';

// Module-level in-memory store (resets on server restart)
const store = new Map();

function uid() {
  return 'img_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Strip heavy/non-serializable fields from summary before returning as JSON.
// rawBinary is a binary string (entire file content) and rawTags is the full
// piexifjs tag tree — both can be large and are not needed by API consumers.
function sanitizeSummary(summary) {
  if (!summary) return summary;
  const { rawBinary, rawTags, ...rest } = summary;
  return rest;
}

// Wrap a parsed multipart part into a File-like object compatible with the
// core readExif/writeExif functions (which access file.name, file.size,
// file.type, file.arrayBuffer()).
function makeFileLike(part) {
  return {
    name: part.filename || 'image.jpg',
    size: part.data.length,
    lastModified: Date.now(),
    type: part.type || 'image/jpeg',
    arrayBuffer: () => Promise.resolve(part.data),
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function notFound(res, message = 'Not found') {
  sendJson(res, 404, { error: message });
}

export async function handleImagesRoutes(req, res, url, deps) {
  const path = url.pathname;
  const method = req.method;

  // POST /api/images — upload image(s) via multipart/form-data
  if (method === 'POST' && path === '/api/images') {
    const parts = await parseMultipart(req);
    const fileParts = parts.filter((p) => p.filename);
    if (fileParts.length === 0) {
      sendJson(res, 400, { error: 'No files uploaded' });
      return;
    }
    const images = [];
    for (const part of fileParts) {
      const file = makeFileLike(part);
      const summary = await deps.readExif(file);
      const id = uid();
      const entry = { id, file, summary, edits: {} };
      store.set(id, entry);
      images.push({ id, exif: sanitizeSummary(summary) });
    }
    sendJson(res, 201, { images });
    return;
  }

  // POST /api/images/export-zip — export multiple images as ZIP
  if (method === 'POST' && path === '/api/images/export-zip') {
    const body = await readJsonBody(req);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const images = ids
      .map((id) => store.get(id))
      .filter(Boolean)
      .map((entry) => ({ file: entry.file, summary: entry.summary, edits: entry.edits }));
    if (images.length === 0) {
      sendJson(res, 404, { error: 'No matching images found for the provided ids' });
      return;
    }
    const zipBlob = await deps.exportZip(images);
    const buffer = Buffer.from(await zipBlob.arrayBuffer());
    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="edited_images.zip"',
    });
    res.end(buffer);
    return;
  }

  // GET /api/images — list all uploaded images
  if (method === 'GET' && path === '/api/images') {
    const images = [];
    for (const entry of store.values()) {
      images.push({ id: entry.id, exif: sanitizeSummary(entry.summary), edits: entry.edits });
    }
    sendJson(res, 200, { images });
    return;
  }

  // GET|PUT /api/images/:id/exif
  const exifMatch = path.match(/^\/api\/images\/([^/]+)\/exif$/);
  if (exifMatch) {
    const id = exifMatch[1];
    const entry = store.get(id);
    if (!entry) {
      notFound(res, 'Image not found');
      return;
    }

    if (method === 'GET') {
      sendJson(res, 200, {
        id,
        exif: sanitizeSummary(entry.summary),
        edits: entry.edits,
      });
      return;
    }

    if (method === 'PUT') {
      const body = await readJsonBody(req);
      const incomingEdits = body.edits || {};
      // Wrap raw values in { value, editedBy: 'user' } format expected by writeExif.
      // If the caller already supplies the structured form, pass it through.
      for (const [field, val] of Object.entries(incomingEdits)) {
        if (val && typeof val === 'object' && 'value' in val) {
          entry.edits[field] = val;
        } else {
          entry.edits[field] = { value: val, editedBy: 'user' };
        }
      }
      sendJson(res, 200, {
        id,
        exif: sanitizeSummary(entry.summary),
        edits: entry.edits,
      });
      return;
    }
  }

  // GET /api/images/:id/export — download the image with modified EXIF
  const exportMatch = path.match(/^\/api\/images\/([^/]+)\/export$/);
  if (exportMatch && method === 'GET') {
    const id = exportMatch[1];
    const entry = store.get(id);
    if (!entry) {
      notFound(res, 'Image not found');
      return;
    }

    // Pass __rawBinary from summary to avoid re-reading the file buffer
    const editsWithRaw = { ...entry.edits };
    if (entry.summary && entry.summary.rawBinary) {
      editsWithRaw.__rawBinary = entry.summary.rawBinary;
    }

    const blob = await deps.writeExif(entry.file, editsWithRaw);
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Output filename: {stem}_exif.{ext}
    const originalName = entry.file.name || 'image.jpg';
    const dot = originalName.lastIndexOf('.');
    const base = dot >= 0 ? originalName.slice(0, dot) : originalName;
    const ext = dot >= 0 ? originalName.slice(dot) : '.jpg';
    const outName = `${base}_exif${ext}`;

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${outName}"`,
    });
    res.end(buffer);
    return;
  }

  notFound(res);
}
