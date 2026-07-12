// Preset routes — CRUD endpoints backed by core preset functions.

import { readJsonBody } from '../middleware/multipart.js';

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function notFound(res, message = 'Not found') {
  sendJson(res, 404, { error: message });
}

export async function handlePresetsRoutes(req, res, url, deps) {
  const path = url.pathname;
  const method = req.method;

  // GET /api/presets — list all presets
  if (method === 'GET' && path === '/api/presets') {
    const presets = await deps.listPresets();
    sendJson(res, 200, { presets });
    return;
  }

  // POST /api/presets — create a new preset
  if (method === 'POST' && path === '/api/presets') {
    const body = await readJsonBody(req);
    const saved = await deps.savePreset(body);
    sendJson(res, 201, { preset: saved });
    return;
  }

  // /api/presets/:id — PUT (update) or DELETE
  const idMatch = path.match(/^\/api\/presets\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];

    if (method === 'PUT') {
      const body = await readJsonBody(req);
      const saved = await deps.savePreset({ ...body, id });
      sendJson(res, 200, { preset: saved });
      return;
    }

    if (method === 'DELETE') {
      const presets = await deps.deletePreset(id);
      sendJson(res, 200, { presets });
      return;
    }
  }

  notFound(res);
}
