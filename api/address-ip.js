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

const fetchIpDetectedLocation = async (requestIp = '') => {
  const ip = String(requestIp || '').replace(/^::ffff:/, '').trim();
  const searchParams = new URLSearchParams({ localityLanguage: 'en' });

  if (ip && !isPrivateOrLocalIp(ip)) {
    searchParams.set('ip', ip);
  }

  const response = await fetch(
    `https://api.bigdatacloud.net/data/ip-geolocation?${searchParams.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('IP geolocation request failed.');
  }

  const payload = await response.json().catch(() => ({}));
  return normalizeFallbackReverseResult(payload);
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

  try {
    const payload = await fetchIpDetectedLocation(candidateIp);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('IP location lookup error:', error.message);
    return res
      .status(400)
      .json({ error: error.message || 'Unable to detect location from IP.' });
  }
};
