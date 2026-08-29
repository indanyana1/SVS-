// Consolidated address endpoint — merges what used to be 4 separate files
// (address-autocomplete.js, address-details.js, address-ip.js,
// address-reverse.js) into one, dispatching by HTTP method (GET = IP-based
// location) and, for POST, a `type` field in the body (autocomplete /
// details / reverse).
//
// Why: Vercel's Hobby plan caps a deployment at 12 Serverless Functions.
// Adding api/admin-login.js (see supabase/admin-login-security.sql) pushed
// api/ from 12 files to 13 and broke production deploys — the build itself
// succeeded every time, only the deploy step failed, which is why it
// wasn't obvious from `npm run build` locally. Merging these 4 back down
// to 1 restores headroom without losing anything: each original request
// shape, response shape, and rate-limit bucket (still named
// 'address-autocomplete' / 'address-details' / 'address-reverse' /
// 'address-ip' individually below) is unchanged, so nothing downstream
// needed to change except which URL/type the client sends.
//
// See server.js's handleAddress* functions + the app.get/app.post
// '/api/address' routes for the exact same dispatch mirrored for local dev.
const {
  fetchAddressJson,
  buildOsmIdentifier,
  buildRelaxedAddressQueryVariants,
  normalizeAddressResult,
  backfillPostalCode,
  parseBody,
} = require('./_address-utils');
const { enforceRateLimit } = require('./_rate-limit');

const isPrivateOrLocalIp = (ipAddress) => {
  const ip = String(ipAddress || '').trim().toLowerCase();
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
};

const normalizeFallbackReverseResult = (result) => {
  const city = String(
    result.locality
      || result.city
      || result.principalSubdivision
      || result.localityInfo?.administrative?.[0]?.name
      || '',
  ).trim();
  const province = String(
    result.principalSubdivision
      || result.localityInfo?.administrative?.[1]?.name
      || result.principalSubdivisionCode
      || '',
  ).trim();
  const country = String(result.countryName || result.country || '').trim();
  const formattedAddress = [city, province, country].filter(Boolean).join(', ') || String(result.label || '').trim();

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

// ── type: autocomplete ──────────────────────────────────────────────────
const handleAutocomplete = async (req, res, body) => {
  if (await enforceRateLimit(req, res, { name: 'address-autocomplete', windowSeconds: 60, max: 120 })) return;

  const input = String(body.input || '').trim();
  const countryCode = String(body.countryCode || 'za').trim().toLowerCase();

  if (input.length < 3) {
    res.status(200).json({ suggestions: [] });
    return;
  }

  try {
    let suggestions = [];
    for (const variant of buildRelaxedAddressQueryVariants(input)) {
      const searchParams = new URLSearchParams({
        q: variant,
        format: 'jsonv2',
        addressdetails: '1',
        // 40 is Nominatim's documented ceiling for a single search request.
        limit: '40',
        countrycodes: countryCode,
      });
      // eslint-disable-next-line no-await-in-loop
      const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`);

      suggestions = Array.isArray(payload)
        ? payload
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
          .filter((result) => result.placeId && result.fullText)
        : [];

      if (suggestions.length) break;
    }

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Address autocomplete error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to fetch address suggestions.' });
  }
};

// ── type: details ───────────────────────────────────────────────────────
const handleDetails = async (req, res, body) => {
  if (await enforceRateLimit(req, res, { name: 'address-details', windowSeconds: 60, max: 120 })) return;

  const placeId = String(body.placeId || '').trim();
  if (!placeId) {
    res.status(400).json({ error: 'placeId is required.' });
    return;
  }

  try {
    const searchParams = new URLSearchParams({ osm_ids: placeId, format: 'jsonv2', addressdetails: '1' });
    const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/lookup?${searchParams.toString()}`);
    const result = Array.isArray(payload) ? payload[0] : null;

    if (!result) {
      res.status(404).json({ error: 'Address details not found.' });
      return;
    }

    res.status(200).json(await backfillPostalCode(normalizeAddressResult(result)));
  } catch (error) {
    console.error('Address details error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to fetch address details.' });
  }
};

// ── type: reverse ───────────────────────────────────────────────────────
const fetchFallbackReverseGeocode = async (latitude, longitude) => {
  const searchParams = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), localityLanguage: 'en' });
  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${searchParams.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Address lookup request failed.');
  const payload = await response.json().catch(() => ({}));
  return normalizeFallbackReverseResult(payload);
};

const handleReverse = async (req, res, body) => {
  if (await enforceRateLimit(req, res, { name: 'address-reverse', windowSeconds: 60, max: 120 })) return;

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ error: 'latitude and longitude are required.' });
    return;
  }

  try {
    const searchParams = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', addressdetails: '1' });
    try {
      const payload = await fetchAddressJson(`https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`);
      if (!payload || (!payload.address && !payload.display_name)) {
        throw new Error('Address lookup request failed.');
      }
      res.status(200).json(await backfillPostalCode(normalizeAddressResult(payload)));
    } catch (_primaryError) {
      const fallbackPayload = await fetchFallbackReverseGeocode(latitude, longitude);
      res.status(200).json(await backfillPostalCode(fallbackPayload));
    }
  } catch (error) {
    console.error('Address reverse error:', error.message);
    res.status(400).json({ error: error.message || 'Unable to resolve current location.' });
  }
};

// ── GET: ip-based location ──────────────────────────────────────────────
const EMPTY_LOCATION = {
  formattedAddress: '', address1: '', address2: '', city: '', province: '',
  postalCode: '', country: 'South Africa', latitude: null, longitude: null,
};

const fetchBigDataCloud = async (ip) => {
  const searchParams = new URLSearchParams({ localityLanguage: 'en' });
  if (ip && !isPrivateOrLocalIp(ip)) searchParams.set('ip', ip);
  const response = await fetch(`https://api.bigdatacloud.net/data/ip-geolocation?${searchParams.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('bigdatacloud failed');
  const payload = await response.json().catch(() => ({}));
  const result = normalizeFallbackReverseResult(payload);
  if (!result.city && !result.province) throw new Error('bigdatacloud returned empty location');
  return result;
};

const fetchIpapiCo = async (ip) => {
  const url = ip && !isPrivateOrLocalIp(ip) ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('ipapi.co failed');
  const payload = await response.json().catch(() => ({}));
  if (!payload.city && !payload.region) throw new Error('ipapi.co returned empty location');
  return {
    formattedAddress: [payload.city, payload.region, payload.country_name].filter(Boolean).join(', '),
    address1: '',
    address2: '',
    city: payload.city || '',
    province: payload.region || '',
    postalCode: payload.postal || '',
    country: payload.country_name || 'South Africa',
    latitude: Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : null,
    longitude: Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : null,
  };
};

const handleIp = async (req, res) => {
  if (await enforceRateLimit(req, res, { name: 'address-ip', windowSeconds: 60, max: 120 })) return;

  const forwardedIp = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const realIp = String(req.headers['x-real-ip'] || '').trim();
  const socketIp = String(req.socket?.remoteAddress || '').trim();
  const ip = String(forwardedIp || realIp || socketIp || '').replace(/^::ffff:/, '').trim();

  try {
    const payload = await fetchBigDataCloud(ip).catch(() => fetchIpapiCo(ip));
    res.status(200).json(payload);
  } catch (error) {
    console.error('IP location lookup error:', error.message);
    // Always 200 so the client can degrade gracefully without an error state.
    res.status(200).json(EMPTY_LOCATION);
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return handleIp(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = parseBody(req);
  switch (body.type) {
    case 'autocomplete': return handleAutocomplete(req, res, body);
    case 'details': return handleDetails(req, res, body);
    case 'reverse': return handleReverse(req, res, body);
    default: return res.status(400).json({ error: 'Unknown or missing "type" — expected autocomplete, details, or reverse.' });
  }
};
