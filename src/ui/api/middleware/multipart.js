// Multipart/form-data parser — uses ONLY Node.js built-in APIs (Buffer).
// No external dependencies (no multer, no busboy).
//
// Exports:
//   parseMultipart(req)    — parses multipart/form-data request body into parts
//   readBody(req)          — reads the entire request body into a Buffer
//   readJsonBody(req)      — reads and JSON-parses the request body

function getBoundary(contentType) {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) return null;
  return (match[1] || match[2]).trim();
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function readJsonBody(req) {
  const buffer = await readBody(req);
  if (buffer.length === 0) return {};
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch (e) {
    const err = new Error('Invalid JSON body');
    err.status = 400;
    throw err;
  }
}

export async function parseMultipart(req) {
  const contentType = req.headers['content-type'] || '';
  const boundary = getBoundary(contentType);
  if (!boundary) {
    const err = new Error('No boundary in Content-Type; expected multipart/form-data');
    err.status = 400;
    throw err;
  }

  const buffer = await readBody(req);
  const delimiter = Buffer.from('--' + boundary);
  const headerSep = Buffer.from('\r\n\r\n');

  const parts = [];
  let start = 0;

  while (true) {
    const idx = buffer.indexOf(delimiter, start);
    if (idx === -1) break;

    let cursor = idx + delimiter.length;

    // Closing delimiter: "--\r\n"
    if (buffer[cursor] === 0x2d && buffer[cursor + 1] === 0x2d) break;

    // Skip \r\n after boundary line
    if (buffer[cursor] === 0x0d && buffer[cursor + 1] === 0x0a) cursor += 2;

    // Find next delimiter
    const nextIdx = buffer.indexOf(delimiter, cursor);
    if (nextIdx === -1) break;

    // Part data spans [cursor, nextIdx); strip trailing \r\n before the next boundary
    let partEnd = nextIdx;
    if (buffer[partEnd - 2] === 0x0d && buffer[partEnd - 1] === 0x0a) partEnd -= 2;

    const partBuffer = buffer.subarray(cursor, partEnd);

    const headerEnd = partBuffer.indexOf(headerSep);
    if (headerEnd === -1) {
      start = nextIdx;
      continue;
    }

    const headerStr = partBuffer.subarray(0, headerEnd).toString('utf8');
    const bodyData = partBuffer.subarray(headerEnd + 4);

    const headers = {};
    for (const line of headerStr.split('\r\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();
      headers[key] = val;
    }

    const disposition = headers['content-disposition'] || '';
    const nameMatch = disposition.match(/name="([^"]*)"/);
    const filenameMatch = disposition.match(/filename="([^"]*)"/);

    parts.push({
      name: nameMatch ? nameMatch[1] : '',
      filename: filenameMatch ? filenameMatch[1] : null,
      type: headers['content-type'] || null,
      data: bodyData,
    });

    start = nextIdx;
  }

  return parts;
}
