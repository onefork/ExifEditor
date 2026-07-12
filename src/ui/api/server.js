// HTTP API server — uses ONLY Node.js built-in `http` module (no express).
// Routes requests to the appropriate handler based on path prefix.

import { createServer } from 'http';
import { handleImagesRoutes } from './routes/images.js';
import { handlePresetsRoutes } from './routes/presets.js';
import { handleLanguagesRoutes } from './routes/languages.js';
import { handleCors, handleError } from './middleware/index.js';

export function startServer(deps, port) {
  const server = createServer(async (req, res) => {
    try {
      handleCors(req, res);

      // CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);
      const path = url.pathname;

      if (path.startsWith('/api/images')) {
        return await handleImagesRoutes(req, res, url, deps);
      }
      if (path.startsWith('/api/presets')) {
        return await handlePresetsRoutes(req, res, url, deps);
      }
      if (path.startsWith('/api/languages')) {
        return await handleLanguagesRoutes(req, res, url, deps);
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      handleError(err, res);
    }
  });

  server.listen(port, () => {
    console.log(`ExifEditor API server running on http://localhost:${port}`);
  });

  return server;
}
