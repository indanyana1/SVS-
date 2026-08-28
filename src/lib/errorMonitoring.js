import * as Sentry from '@sentry/react';

// Crash/error monitoring — off by default, on the moment REACT_APP_SENTRY_DSN
// is set (a free Sentry.io project's DSN; see .env.example). Nothing here
// throws or logs noisily when it's unset, so the app behaves identically
// whether or not this is configured — same pattern as EmailJS/Stripe/etc.
// elsewhere in this app.
const dsn = process.env.REACT_APP_SENTRY_DSN;

export const isErrorMonitoringEnabled = Boolean(dsn);

export const initErrorMonitoring = () => {
  if (!dsn || typeof window === 'undefined') return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Release lets Sentry group/diff errors by deployed version. Vercel
    // sets this automatically at build time; falls back to "unknown" for
    // local/dev builds and any other host.
    release: process.env.REACT_APP_VERCEL_GIT_COMMIT_SHA || undefined,
    // Conservative defaults for a project without a paid Sentry plan — trace
    // and replay sampling both cost quota, so keep them low rather than off,
    // giving some production visibility without risking the free tier's cap.
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  });

  // ErrorBoundary.jsx (the top-level React error boundary) calls this
  // global hook from componentDidCatch — React error boundaries stop an
  // error from propagating to window.onerror, so without this explicit
  // call Sentry's automatic instrumentation would never see a render-tree
  // crash at all. Everything Sentry catches on its own (unhandled
  // rejections, non-React runtime errors) still works via Sentry.init()
  // above with no extra wiring.
  window.__svsReportError = (error, info) => {
    Sentry.captureException(error, {
      extra: { componentStack: info?.componentStack },
    });
  };

  // Attaches the signed-in user's email (if any) to error reports so a
  // support ticket can be matched to what actually happened, mirroring how
  // every other piece of telemetry in this app already scopes to the
  // signed-in user. No other PII is attached.
  try {
    const email = window.localStorage.getItem('svs-user-email');
    if (email) Sentry.setUser({ email });
  } catch (_error) {
    // Storage unavailable — Sentry just reports without a user tag.
  }
};

// Called from the auth-changed listener (see main.jsx) so the tagged user
// stays correct across sign-in/sign-out without a full page reload.
export const setErrorMonitoringUser = (email) => {
  if (!isErrorMonitoringEnabled) return;
  if (email) Sentry.setUser({ email });
  else Sentry.setUser(null);
};
