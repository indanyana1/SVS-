const {
  fetchAddressJson,
  buildOsmIdentifier,
  parseBody,
} = require('./_address-utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = parseBody(req);
  const input = String(body.input || '').trim();
  const countryCode = String(body.countryCode || 'za').trim().toLowerCase();

  if (input.length < 3) {
    return res.status(200).json({ suggestions: [] });
  }

  try {
    const searchParams = new URLSearchParams({
      q: input,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: countryCode,
    });
    const payload = await fetchAddressJson(
      `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
    );

    const suggestions = Array.isArray(payload)
      ? payload
          .map((result) => ({
            placeId: buildOsmIdentifier(result),
            fullText: result.display_name || '',
            primaryText:
              [result.address?.house_number, result.address?.road]
                .filter(Boolean)
                .join(' ')
                .trim() ||
              result.name ||
              result.display_name ||
              '',
            secondaryText: [
              result.address?.suburb ||
                result.address?.neighbourhood ||
                result.address?.residential ||
                result.address?.quarter,
              result.address?.city ||
                result.address?.town ||
                result.address?.village ||
                result.address?.municipality ||
                result.address?.county,
              result.address?.state,
            ]
              .filter(Boolean)
              .join(', '),
          }))
          .filter((result) => result.placeId && result.fullText)
      : [];

    return res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Address autocomplete error:', error.message);
    return res
      .status(400)
      .json({ error: error.message || 'Unable to fetch address suggestions.' });
  }
};
