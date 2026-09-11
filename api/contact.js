// Sends the Contact page form via Resend's HTTP API. No new dependency —
// same fetch-based pattern as the rest of api/*.js. Requires RESEND_API_KEY
// and CONTACT_FROM_EMAIL (a sender address on a domain verified with Resend)
// to be set as env vars; until then, returns 503 and the client falls back
// to a mailto: link (see script.js).
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'hello@artup.life';
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }
  if (!RESEND_API_KEY || !FROM_EMAIL) {
    res.status(503).json({ error: 'not_configured' });
    return;
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `ArtUp Life Contact Form <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        reply_to: email,
        subject: `[Contact] ${subject}`,
        html: `<p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p><p><strong>Subject:</strong> ${escapeHtml(subject)}</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
      })
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => '');
      res.status(502).json({ error: 'send_failed', message: errBody });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'send_failed', message: String((e && e.message) || e) });
  }
};
