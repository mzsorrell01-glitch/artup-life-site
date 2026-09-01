const { requireAdmin } = require('../_lib/auth');
const { writeContent } = require('../_lib/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!requireAdmin(req)) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  const body = req.body;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  try {
    await writeContent(body);
    res.status(200).json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'save_failed', message: String(e && e.message || e) });
  }
};
