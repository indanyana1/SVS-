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

// Nominatim's free-text search is an exact-ish match against how OpenStreetMap
// contributors phrased the place — a real address can return zero results
// just because the house number isn't mapped as its own point (common outside
// major metros) or because a unit/complex name confuses the parser, even
// though the street itself is well-mapped. Each variant drops a bit more
// specificity so a genuine address isn't reported as "not found" only because
// the exact text the buyer typed doesn't exist verbatim in OSM's data.
const buildRelaxedAddressQueryVariants = (input) => {
  const trimmed = String(input || '').trim();
  const variants = [trimmed];

  const withoutLeadingNumber = trimmed.replace(/^\d+[a-zA-Z]?\s+/, '').trim();
  if (withoutLeadingNumber && withoutLeadingNumber !== trimmed) {
    variants.push(withoutLeadingNumber);
  }

  const afterFirstComma = trimmed.includes(',') ? trimmed.split(',').slice(1).join(',').trim() : '';
  if (afterFirstComma && !variants.includes(afterFirstComma)) {
    variants.push(afterFirstComma);
  }

  return variants;
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
    // postalCode powers the delivery-coverage filters on the Fast Food and
    // Groceries markets; coordinates are kept for map pins/labels.
    latitude: Number.isFinite(Number(result.lat)) ? Number(result.lat) : null,
    longitude: Number.isFinite(Number(result.lon)) ? Number(result.lon) : null,
  };
};


// Some places (small towns especially — Umkomaas is a real example) have
// their postal code tagged only on an administrative boundary (ward/suburb),
// not on the specific place/road node a normal search or reverse lookup
// hits, so the primary result comes back with every other field filled in
// except postcode. Zoom 14 (ward/suburb level) is where that boundary tends
// to live, so retry there once before accepting "no postal code" as final.
const backfillPostalCode = async (normalized) => {
  if (normalized.postalCode || !Number.isFinite(normalized.latitude) || !Number.isFinite(normalized.longitude)) {
    return normalized;
  }
  try {
    const params = new URLSearchParams({
      lat: String(normalized.latitude),
      lon: String(normalized.longitude),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '14',
    });
    const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
    const postcode = payload?.address?.postcode;
    if (postcode) {
      return { ...normalized, postalCode: String(postcode) };
    }
  } catch (_error) {
    // Keep the original result — postcode just stays unset, same as before.
  }
  return normalized;
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
  buildRelaxedAddressQueryVariants,
  normalizeAddressResult,
  backfillPostalCode,
  parseBody,
};
