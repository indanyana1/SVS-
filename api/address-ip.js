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
  };
};

const EMPTY_LOCATION = {
  formattedAddress: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
};

const fetchBigDataCloud = async (ip) => {
  const searchParams = new URLSearchParams({ localityLanguage: 'en' });
  if (ip && !isPrivateOrLocalIp(ip)) searchParams.set('ip', ip);

  const response = await fetch(
    `https://api.bigdatacloud.net/data/ip-geolocation?${searchParams.toString()}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!response.ok) throw new Error('bigdatacloud failed');
  const payload = await response.json().catch(() => ({}));
  const result = normalizeFallbackReverseResult(payload);
  if (!result.city && !result.province) throw new Error('bigdatacloud returned empty location');
  return result;
};

const fetchIpapiCo = async (ip) => {
  const url = ip && !isPrivateOrLocalIp(ip)
    ? `https://ipapi.co/${ip}/json/`
    : 'https://ipapi.co/json/';

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
  };
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const forwardedIp = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  const realIp = String(req.headers['x-real-ip'] || '').trim();
  const socketIp = String(req.socket?.remoteAddress || '').trim();
  const candidateIp = forwardedIp || realIp || socketIp;
  const ip = String(candidateIp || '').replace(/^::ffff:/, '').trim();

  try {
    const payload = await fetchBigDataCloud(ip).catch(() => fetchIpapiCo(ip));
    return res.status(200).json(payload);
  } catch (error) {
    console.error('IP location lookup error:', error.message);
    // Always return 200 so the client can degrade gracefully without an error state
    return res.status(200).json(EMPTY_LOCATION);
  }
};
