// Server-side crash/error monitoring — off by default, on the moment
// SENTRY_DSN is set (the same Sentry.io project as REACT_APP_SENTRY_DSN;
// see .env.example and src/lib/errorMonitoring.js for the browser side).
// A separate DSN variable (no REACT_APP_ prefix) because this runs in
// Node, never bundled into the browser build.
const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

const isEnabled = Boolean(dsn);

const initErrorMonitoring = () => {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
};

// Fire-and-forget: reporting a crash must never itself throw or block the
// response the caller is about to send.
const captureError = (error, context) => {
  if (!isEnabled) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch (_reportError) {
    // Best-effort only.
  }
};

module.exports = { initErrorMonitoring, captureError, isEnabled };
