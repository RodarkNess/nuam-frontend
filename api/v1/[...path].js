export default async function handler(req, res) {
  let backendUrl = (
    process.env.NUAM_BACKEND_URL?.trim()
    || 'https://nuam-backend-t5z9.vercel.app'
  ).replace(/\/$/, '');
  if (!/^https?:\/\//i.test(backendUrl)) {
    res.status(503).json({
      detail: 'NUAM_BACKEND_URL debe ser una URL HTTP o HTTPS válida.',
    });
    return;
  }
  backendUrl = backendUrl.replace(/\/api\/v1$/i, '');

  const pathParts = req.query.path;
  const path = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');
  const queryIndex = req.url.indexOf('?');
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : '';
  const target = `${backendUrl}/api/v1/${path}${query}`;

  const headers = new Headers();
  for (const name of ['authorization', 'content-type', 'accept', 'x-integrity-sha256']) {
    const value = req.headers[name];
    if (value) headers.set(name, Array.isArray(value) ? value.join(',') : value);
  }

  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (Buffer.isBuffer(req.body)) {
      body = req.body;
    } else if (typeof req.body === 'string') {
      body = req.body;
    } else if (req.body) {
      body = JSON.stringify(req.body);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      if (chunks.length) body = Buffer.concat(chunks);
    }
  }

  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body,
    });
    const responseBody = await response.arrayBuffer();

    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    const integrity = response.headers.get('x-integrity-sha256');
    if (integrity) res.setHeader('x-integrity-sha256', integrity);
    res.setHeader('cache-control', 'no-store');
    res.send(Buffer.from(responseBody));
  } catch (error) {
    res.status(502).json({
      detail: 'No fue posible conectar con el backend NUAM.',
      error: error instanceof Error ? error.message : 'Error de conexión',
    });
  }
}
