// Image routes — upload, EXIF query/modify, export.
// In-memory storage: id -> { id, file, summary, edits }

import { Hono } from 'hono';
import JSZip from 'jszip';

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

// Reads and JSON-parses the request body. Empty body -> {}.
// Invalid JSON throws an error with status=400 (handled by onError).
async function readJsonBody(c) {
  const text = await c.req.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error('Invalid JSON body');
    err.status = 400;
    throw err;
  }
}

export function createImagesRoutes(deps) {
  const app = new Hono();

  // POST /api/images — upload image(s) via multipart/form-data
  app.post('/api/images', async (c) => {
    const form = await c.req.parseBody({ all: true });
    const files = Object.values(form)
      .flat()
      .filter((v) => v instanceof File);
    if (files.length === 0) {
      return c.json({ error: 'No files uploaded' }, 400);
    }
    const images = [];
    for (const file of files) {
      const summary = await deps.readExif(file);
      const id = uid();
      const entry = { id, file, summary, edits: {} };
      store.set(id, entry);
      images.push({ id, exif: sanitizeSummary(summary) });
    }
    return c.json({ images }, 201);
  });

  // POST /api/images/export-zip — export multiple images as ZIP
  // NOTE: must be declared before /:id routes to avoid being captured.
  // Builds the ZIP with JSZip directly using nodebuffer data, because the
  // core exportZip() passes writeExif() Blobs to JSZip, which cannot read
  // Blobs in Node.js (FileReader is undefined there).
  app.post('/api/images/export-zip', async (c) => {
    const body = await readJsonBody(c);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const entries = ids.map((id) => store.get(id)).filter(Boolean);
    if (entries.length === 0) {
      return c.json({ error: 'No matching images found for the provided ids' }, 404);
    }
    const zip = new JSZip();
    for (const entry of entries) {
      const editsWithRaw = { ...entry.edits };
      if (entry.summary && entry.summary.rawBinary) {
        editsWithRaw.__rawBinary = entry.summary.rawBinary;
      }
      const blob = await deps.writeExif(entry.file, editsWithRaw);
      const buffer = Buffer.from(await blob.arrayBuffer());
      const originalName = entry.file.name || 'image.jpg';
      const dot = originalName.lastIndexOf('.');
      const base = dot >= 0 ? originalName.slice(0, dot) : originalName;
      const ext = dot >= 0 ? originalName.slice(dot) : '.jpg';
      zip.file(`${base}_exif${ext}`, buffer);
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return c.body(zipBuffer, 200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="edited_images.zip"',
    });
  });

  // GET /api/images — list all uploaded images
  app.get('/api/images', (c) => {
    const images = [];
    for (const entry of store.values()) {
      images.push({ id: entry.id, exif: sanitizeSummary(entry.summary), edits: entry.edits });
    }
    return c.json({ images });
  });

  // GET /api/images/:id/exif — get EXIF for one image
  app.get('/api/images/:id/exif', (c) => {
    const id = c.req.param('id');
    const entry = store.get(id);
    if (!entry) {
      return c.json({ error: 'Image not found' }, 404);
    }
    return c.json({ id, exif: sanitizeSummary(entry.summary), edits: entry.edits });
  });

  // PUT /api/images/:id/exif — modify EXIF
  // Raw values in body.edits are wrapped as { value, editedBy: 'user' }.
  app.put('/api/images/:id/exif', async (c) => {
    const id = c.req.param('id');
    const entry = store.get(id);
    if (!entry) {
      return c.json({ error: 'Image not found' }, 404);
    }
    const body = await readJsonBody(c);
    const incomingEdits = body.edits || {};
    for (const [field, val] of Object.entries(incomingEdits)) {
      if (val && typeof val === 'object' && 'value' in val) {
        entry.edits[field] = val;
      } else {
        entry.edits[field] = { value: val, editedBy: 'user' };
      }
    }
    return c.json({ id, exif: sanitizeSummary(entry.summary), edits: entry.edits });
  });

  // GET /api/images/:id/export — download image with modified EXIF
  app.get('/api/images/:id/export', async (c) => {
    const id = c.req.param('id');
    const entry = store.get(id);
    if (!entry) {
      return c.json({ error: 'Image not found' }, 404);
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

    return c.body(buffer, 200, {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${outName}"`,
    });
  });

  return app;
}
