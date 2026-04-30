const {
  fetchAddressJson,
  normalizeAddressResult,
  parseBody,
} = require('./_address-utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = parseBody(req);
  const placeId = String(body.placeId || '').trim();

  if (!placeId) {
    return res.status(400).json({ error: 'placeId is required.' });
  }

  try {
    const searchParams = new URLSearchParams({
      osm_ids: placeId,
      format: 'jsonv2',
      addressdetails: '1',
    });
    const payload = await fetchAddressJson(
      `https://nominatim.openstreetmap.org/lookup?${searchParams.toString()}`,
    );
    const result = Array.isArray(payload) ? payload[0] : null;

    if (!result) {
      return res.status(404).json({ error: 'Address details not found.' });
    }

    return res.status(200).json(normalizeAddressResult(result));
  } catch (error) {
    console.error('Address details error:', error.message);
    return res
      .status(400)
      .json({ error: error.message || 'Unable to fetch address details.' });
  }
};
