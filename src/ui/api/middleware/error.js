// Error handling middleware — normalizes errors into JSON responses.
// Maps known error codes (e.g. UNSUPPORTED_FORMAT) to appropriate HTTP status.

const CODE_TO_STATUS = {
  UNSUPPORTED_FORMAT: 400,
};

export function handleError(err, res) {
  const status =
    (err && (err.status || err.statusCode)) ||
    (err && err.code && CODE_TO_STATUS[err.code]) ||
    500;

  const body = {
    error: (err && err.message) || 'Internal Server Error',
  };
  if (err && err.code) body.code = err.code;

  // Avoid double-writing headers if something already started a response
  if (res.headersSent) {
    res.end();
    return;
  }

  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
