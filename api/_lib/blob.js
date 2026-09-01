const { put, list } = require('@vercel/blob');

const CONTENT_PATHNAME = 'content.json';

async function readContent() {
  const { blobs } = await list({ prefix: CONTENT_PATHNAME, limit: 1 });
  if (!blobs.length) return {};
  const res = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!res.ok) return {};
  return res.json();
}

async function writeContent(data) {
  const { url } = await put(CONTENT_PATHNAME, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}

async function uploadImage(filename, buffer, contentType) {
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '-');
  const { url } = await put(`uploads/${Date.now()}-${safeName}`, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });
  return url;
}

module.exports = { readContent, writeContent, uploadImage };
