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
  };
};

const fetchNominatimSuggestions = async ({ input, countryCode }) => {
  const params = new URLSearchParams({
    q: input,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: countryCode,
  });
  const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Address service unavailable.');
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload
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
    }))
    .filter((s) => s.placeId && s.fullText);
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
  return normalizeNominatimResult(result);
};

export const lookupAddressSuggestions = async ({ input, sessionToken, countryCode = 'za' }) => {
  // Try the local API first (lets the server attach a proper User-Agent / can be swapped for Google later).
  try {
    const response = await fetch('/api/address-autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, sessionToken, countryCode }),
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
    const response = await fetch('/api/address-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, sessionToken }),
    });
    if (response.ok) {
      payload = await response.json();
    }
  } catch (_error) {
    // ignore -> fallback below
  }

  if (!payload) {
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
  };
};

// Suppress unused-warning (used implicitly via fall-through messages elsewhere).
void createApiError;