// Language routes — returns the list of supported languages.

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export async function handleLanguagesRoutes(req, res, url, deps) {
  const path = url.pathname;
  const method = req.method;

  // GET /api/languages — list supported languages
  if (method === 'GET' && path === '/api/languages') {
    sendJson(res, 200, { languages: deps.SUPPORTED_LANGUAGES });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}
