const { fetchAddressJson, normalizeAddressResult, backfillPostalCode, parseBody } = require('./_address-utils');
const { enforceRateLimit } = require('./_rate-limit');

const normalizeFallbackReverseResult = (result) => {
  const city = String(
    result.locality ||
      result.city ||
      result.principalSubdivision ||
      result.localityInfo?.administrative?.[0]?.name ||
      '',
  ).trim();
  const province = String(
    result.principalSubdivision ||
      result.localityInfo?.administrative?.[1]?.name ||
      result.principalSubdivisionCode ||
      '',
  ).trim();
  const country = String(result.countryName || result.country || '').trim();
  const formattedAddress =
    [city, province, country].filter(Boolean).join(', ') || String(result.label || '').trim();

  return {
    formattedAddress,
    address1: '',
    address2: '',
    city,
    province,
    postalCode: '',
    country,
    latitude: Number.isFinite(Number(result.latitude)) ? Number(result.latitude) : null,
    longitude: Number.isFinite(Number(result.longitude)) ? Number(result.longitude) : null,
  };
};


const fetchFallbackReverseGeocode = async (latitude, longitude) => {
  const searchParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  });

  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${searchParams.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Address lookup request failed.');
  }

  const payload = await response.json().catch(() => ({}));
  return normalizeFallbackReverseResult(payload);
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (await enforceRateLimit(req, res, { name: 'address-reverse', windowSeconds: 60, max: 120 })) return;

  const body = parseBody(req);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'latitude and longitude are required.' });
  }

  try {
    const searchParams = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
      addressdetails: '1',
    });

    try {
      const payload = await fetchAddressJson(
        `https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`,
      );

      if (!payload || (!payload.address && !payload.display_name)) {
        throw new Error('Address lookup request failed.');
      }

      return res.status(200).json(await backfillPostalCode(normalizeAddressResult(payload)));
    } catch (_primaryError) {
      const fallbackPayload = await fetchFallbackReverseGeocode(latitude, longitude);
      return res.status(200).json(await backfillPostalCode(fallbackPayload));
    }
  } catch (error) {
    console.error('Address reverse error:', error.message);
    return res
      .status(400)
      .json({ error: error.message || 'Unable to resolve current location.' });
  }
};
