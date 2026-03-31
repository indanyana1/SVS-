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

export const lookupAddressSuggestions = async ({ input, sessionToken, countryCode = 'za' }) => {
  const response = await fetch('/api/address-autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, sessionToken, countryCode }),
  });

  if (!response.ok) {
    throw await createApiError(response, 'Unable to fetch address suggestions.');
  }

  const payload = await response.json();
  return Array.isArray(payload.suggestions) ? payload.suggestions : [];
};

export const lookupAddressDetails = async ({ placeId, sessionToken }) => {
  const response = await fetch('/api/address-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placeId, sessionToken }),
  });

  if (!response.ok) {
    throw await createApiError(response, 'Unable to fetch address details.');
  }

  const payload = await response.json();
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