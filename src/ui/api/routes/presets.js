// Preset routes — CRUD endpoints backed by core preset functions.

import { Hono } from 'hono';

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

export function createPresetsRoutes(deps) {
  const app = new Hono();

  // GET /api/presets — list all presets
  app.get('/api/presets', async (c) => {
    const presets = await deps.listPresets();
    return c.json({ presets });
  });

  // POST /api/presets — create a new preset
  app.post('/api/presets', async (c) => {
    const body = await readJsonBody(c);
    const saved = await deps.savePreset(body);
    return c.json({ preset: saved }, 201);
  });

  // PUT /api/presets/:id — update a preset
  app.put('/api/presets/:id', async (c) => {
    const id = c.req.param('id');
    const body = await readJsonBody(c);
    const saved = await deps.savePreset({ ...body, id });
    return c.json({ preset: saved });
  });

  // DELETE /api/presets/:id — delete a preset
  app.delete('/api/presets/:id', async (c) => {
    const id = c.req.param('id');
    const presets = await deps.deletePreset(id);
    return c.json({ presets });
  });

  return app;
}
