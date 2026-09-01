const { readContent } = require('./_lib/blob');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const content = await readContent();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(content);
  } catch (e) {
    // Never break the public site over a storage hiccup.
    res.status(200).json({});
  }
};
