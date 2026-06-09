/**
 * Lightweight Core Web Vitals reporter. Numbers are forwarded to whichever
 * sink the app exposes — analytics endpoint, console in dev, or both.
 *
 * Sinks:
 *   • window.__svsAnalytics?.track('web-vital', { name, value, id, ... })
 *   • navigator.sendBeacon('/api/web-vitals', payload)
 *
 * Falls back to console.debug if neither is present.
 */
const ANALYTICS_PATH = '/api/web-vitals';

function reportToSinks(metric) {
  const payload = {
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    id: metric.id,
    delta: metric.delta,
    rating: metric.rating || null,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ts: Date.now(),
  };

  if (typeof window !== 'undefined' && window.__svsAnalytics && typeof window.__svsAnalytics.track === 'function') {
    try { window.__svsAnalytics.track('web-vital', payload); } catch (_e) { /* ignore */ }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(ANALYTICS_PATH, blob);
    } catch (_e) { /* ignore — endpoint is optional */ }
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[web-vital]', payload.name, payload.value, payload);
  }
}

export default function reportWebVitals() {
  import('web-vitals')
    .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(reportToSinks);
      getFID(reportToSinks);
      getFCP(reportToSinks);
      getLCP(reportToSinks);
      getTTFB(reportToSinks);
    })
    .catch(() => { /* web-vitals not available — silently skip */ });
}
