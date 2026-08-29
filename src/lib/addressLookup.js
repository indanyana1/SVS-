const SOUTH_AFRICA_PROVINCE_ALIASES = {
  'EASTERN CAPE': 'Eastern Cape',
  EC: 'Eastern Cape',
  'FREE STATE': 'Free State',
  FS: 'Free State',
  GAUTENG: 'Gauteng',
  GP: 'Gauteng',
  'KWAZULU-NATAL': 'KwaZulu-Natal',
  KZN: 'KwaZulu-Natal',
  LIMPOPO: 'Limpopo',
  LP: 'Limpopo',
  MPUMALANGA: 'Mpumalanga',
  MP: 'Mpumalanga',
  'NORTH WEST': 'North West',
  NW: 'North West',
  'NORTHERN CAPE': 'Northern Cape',
  NC: 'Northern Cape',
  'WESTERN CAPE': 'Western Cape',
  WC: 'Western Cape',
};

const createApiError = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));
  return new Error(payload.error || fallbackMessage);
};

export const createAddressLookupSessionToken = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `addr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// --- Direct Nominatim fallback (used when the local API server isn't reachable) ---
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const buildOsmIdentifier = (result) => {
  const typePrefix = String(result.osm_type || '').trim().charAt(0).toUpperCase();
  const osmId = String(result.osm_id || '').trim();
  return typePrefix && osmId ? `${typePrefix}${osmId}` : '';
};

const normalizeNominatimResult = (result) => {
  const address = result.address || {};
  const address1 = [address.house_number, address.road].filter(Boolean).join(' ').trim()
    || address.road
    || result.name
    || '';
  const address2 = address.suburb || address.neighbourhood || address.residential || address.quarter || '';
  const city = address.city || address.town || address.village || address.municipality || address.county || '';
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
    // postalCode feeds the delivery-coverage filters on Fast Food and
    // Groceries; coordinates are kept for map pins/labels.
    latitude: Number.isFinite(Number(result.lat)) ? Number(result.lat) : null,
    longitude: Number.isFinite(Number(result.lon)) ? Number(result.lon) : null,
  };
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

const fetchNominatimSuggestions = async ({ input, countryCode }) => {
  for (const variant of buildRelaxedAddressQueryVariants(input)) {
    const params = new URLSearchParams({
      q: variant,
      format: 'jsonv2',
      addressdetails: '1',
      // 40 is Nominatim's documented ceiling for a single search request.
      limit: '40',
      countrycodes: countryCode,
    });
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Address service unavailable.');
    }
    // eslint-disable-next-line no-await-in-loop
    const payload = await response.json();
    if (!Array.isArray(payload)) continue;
    const suggestions = payload
      .map((result) => ({
        placeId: buildOsmIdentifier(result),
        fullText: result.display_name || '',
        primaryText: [result.address?.house_number, result.address?.road].filter(Boolean).join(' ').trim()
          || result.name
          || result.display_name
          || '',
        secondaryText: [
          result.address?.suburb || result.address?.neighbourhood || result.address?.residential || result.address?.quarter,
          result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || result.address?.county,
          result.address?.state,
        ].filter(Boolean).join(', '),
        latitude: Number.isFinite(Number(result.lat)) ? Number(result.lat) : null,
        longitude: Number.isFinite(Number(result.lon)) ? Number(result.lon) : null,
      }))
      .filter((s) => s.placeId && s.fullText);

    if (suggestions.length) return suggestions;
  }
  return [];
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
    const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const payload = await response.json();
      const postcode = payload?.address?.postcode;
      if (postcode) {
        return { ...normalized, postalCode: String(postcode) };
      }
    }
  } catch (_error) {
    // Keep the original result — postcode just stays unset, same as before.
  }
  return normalized;
};

const fetchNominatimDetails = async ({ placeId }) => {
  const params = new URLSearchParams({
    osm_ids: placeId,
    format: 'jsonv2',
    addressdetails: '1',
  });
  const response = await fetch(`${NOMINATIM_BASE}/lookup?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Address service unavailable.');
  }
  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;
  if (!result) {
    throw new Error('Address details not found.');
  }
  return backfillPostalCode(normalizeNominatimResult(result));
};

export const lookupAddressSuggestions = async ({ input, sessionToken, countryCode = 'za' }) => {
  // Try the local API first (lets the server attach a proper User-Agent / can be swapped for Google later).
  try {
    const response = await fetch('/api/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'autocomplete', input, sessionToken, countryCode }),
    });
    if (response.ok) {
      const payload = await response.json();
      return Array.isArray(payload.suggestions) ? payload.suggestions : [];
    }
    // 4xx/5xx -> fall through to direct Nominatim fallback.
  } catch (_error) {
    // Network failure (server not running, offline) -> fall through.
  }
  return fetchNominatimSuggestions({ input, countryCode });
};

export const lookupAddressDetails = async ({ placeId, sessionToken }) => {
  let payload = null;
  try {
    const response = await fetch('/api/address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'details', placeId, sessionToken }),
    });
    if (response.ok) {
      payload = await response.json();
    }
  } catch (_error) {
    // ignore -> fallback below
  }

  // A reachable local API can still respond 200 without usable coordinates
  // (e.g. a stale deploy, or a proxy hiccup that returns a partial body) —
  // that's indistinguishable from "no location" for the caller, so retry
  // against Nominatim directly rather than surfacing a dead end.
  // `payload.latitude != null` matters because Number(null) is 0, which
  // Number.isFinite treats as a valid coordinate — without this check a
  // response with an explicit `latitude: null` would be misread as real
  // coordinates at (0, 0) instead of triggering the Nominatim fallback below.
  const hasCoordinates = payload
    && payload.latitude != null && Number.isFinite(Number(payload.latitude))
    && payload.longitude != null && Number.isFinite(Number(payload.longitude));
  if (!hasCoordinates) {
    payload = await fetchNominatimDetails({ placeId });
  }

  const province = SOUTH_AFRICA_PROVINCE_ALIASES[String(payload.province || '').toUpperCase()] || payload.province || '';

  return {
    formattedAddress: payload.formattedAddress || '',
    address1: payload.address1 || '',
    address2: payload.address2 || '',
    city: payload.city || '',
    province,
    postalCode: payload.postalCode || '',
    country: payload.country || 'South Africa',
    latitude: Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : null,
    longitude: Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : null,
  };
};


// Suppress unused-warning (used implicitly via fall-through messages elsewhere).
void createApiError;