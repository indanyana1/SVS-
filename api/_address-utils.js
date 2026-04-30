const NOMINATIM_USER_AGENT = 'SVS E-Commerce/1.0 (address lookup)';

const fetchAddressJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': NOMINATIM_USER_AGENT,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.error || payload.message || 'Address lookup request failed.';
    throw new Error(message);
  }

  return payload;
};

const buildOsmIdentifier = (result) => {
  const typePrefix = String(result.osm_type || '').trim().charAt(0).toUpperCase();
  const osmId = String(result.osm_id || '').trim();
  return typePrefix && osmId ? `${typePrefix}${osmId}` : '';
};

const normalizeAddressResult = (result) => {
  const address = result.address || {};
  const address1 =
    [address.house_number, address.road].filter(Boolean).join(' ').trim() ||
    address.road ||
    result.name ||
    '';
  const address2 =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.quarter ||
    '';
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    '';
  const province = address.state || address.province || '';
  const postalCode = address.postcode || '';
  const country = address.country || 'South Africa';

  return {
    formattedAddress: result.display_name || '',
    address1,
    address2,
    city,
    province,
    postalCode,
    country,
  };
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_error) {
      return {};
    }
  }
  return req.body;
};

module.exports = {
  fetchAddressJson,
  buildOsmIdentifier,
  normalizeAddressResult,
  parseBody,
};
