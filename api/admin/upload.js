const { requireAdmin } = require('../_lib/auth');
const { uploadImage } = require('../_lib/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  const { filename, contentType, dataBase64 } = req.body || {};
  if (!filename || !contentType || !dataBase64) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  if (!/^image\//.test(contentType)) {
    res.status(400).json({ error: 'unsupported_type' });
    return;
  }
  // ~15MB decoded ceiling — comfortably above what the client-side resize step produces.
  if (dataBase64.length > 20 * 1024 * 1024) {
    res.status(413).json({ error: 'file_too_large' });
    return;
  }
  try {
    const buffer = Buffer.from(dataBase64, 'base64');
    const url = await uploadImage(filename, buffer, contentType);
    res.status(200).json({ ok: true, url });
  } catch (e) {
    res.status(500).json({ error: 'upload_failed', message: String(e && e.message || e) });
  }
};
