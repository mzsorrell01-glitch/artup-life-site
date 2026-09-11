const { put, list } = require('@vercel/blob');

const CONTENT_PATHNAME = 'content.json';

// Blob's default cache lifetime is a month, and content.json is written to a fixed URL, so
// an edge node that cached one version would keep serving it long after a save — the admin
// changes a photo or a line of copy, and the old one comes back. 60s is the lowest value
// Blob accepts; the `?v=` below closes the remaining window.
const CONTENT_MAX_AGE = 60;

async function readContent() {
  const { blobs } = await list({ prefix: CONTENT_PATHNAME, limit: 1 });
  if (!blobs.length) return {};
  // `list` is a control-plane call, so its `uploadedAt` is always current. Hanging it off
  // the URL gives every save a cache key of its own while still letting the CDN serve
  // repeat reads of an unchanged file.
  const version = new Date(blobs[0].uploadedAt).getTime() || Date.now();
  const url = blobs[0].url + (blobs[0].url.indexOf('?') === -1 ? '?' : '&') + 'v=' + version;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return {};
  return res.json();
}

async function writeContent(data) {
  const { url } = await put(CONTENT_PATHNAME, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: CONTENT_MAX_AGE,
  });
  return url;
}

async function uploadImage(filename, buffer, contentType) {
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '-');
  // Uploads keep the default long cache on purpose: the random suffix makes every upload a
  // new URL, so a cached copy can never be the wrong image.
  const { url } = await put(`uploads/${Date.now()}-${safeName}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });
  return url;
}

module.exports = { readContent, writeContent, uploadImage };
