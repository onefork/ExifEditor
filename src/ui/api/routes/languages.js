// Language routes — returns the list of supported languages.

import { Hono } from 'hono';

export function createLanguagesRoutes(deps) {
  const app = new Hono();

  // GET /api/languages — list supported languages
  app.get('/api/languages', (c) => {
    return c.json({ languages: deps.SUPPORTED_LANGUAGES });
  });

  return app;
}
