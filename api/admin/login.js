const { checkCredentials, issueSessionCookie } = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const { username, password } = req.body || {};
  if (!checkCredentials(username, password)) {
    res.status(401).json({ error: 'invalid_credentials' });
    return;
  }
  issueSessionCookie(res, username);
  res.status(200).json({ ok: true });
};
