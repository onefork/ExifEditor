// HTTP API server — built on Hono (v4) with @hono/node-server adapter.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createImagesRoutes } from './routes/images.js';
import { createPresetsRoutes } from './routes/presets.js';
import { createLanguagesRoutes } from './routes/languages.js';

// Maps known error codes (e.g. UNSUPPORTED_FORMAT) to HTTP status.
const CODE_TO_STATUS = {
  UNSUPPORTED_FORMAT: 400,
};

export function startServer(deps, port) {
  const app = new Hono();

  // CORS — replaces hand-written cors.js
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    }),
  );

  // Error handling — replaces hand-written error.js handleError()
  app.onError((err, c) => {
    const status =
      (err && (err.status || err.statusCode)) ||
      (err && err.code && CODE_TO_STATUS[err.code]) ||
      500;
    const body = { error: (err && err.message) || 'Internal Server Error' };
    if (err && err.code) body.code = err.code;
    return c.json(body, status);
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  // Mount route modules
  app.route('/', createImagesRoutes(deps));
  app.route('/', createPresetsRoutes(deps));
  app.route('/', createLanguagesRoutes(deps));

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`ExifEditor API server running on http://localhost:${info.port}`);
  });

  return server;
}
