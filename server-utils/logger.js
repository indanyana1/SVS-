// Lightweight server logger with a Sentry-style extension point.
//
// In production wire a real reporter via setReporter(fn) at boot,
// e.g.:
//   const { setReporter } = require('./server-utils/logger');
//   const Sentry = require('@sentry/node');
//   Sentry.init({ dsn: process.env.SENTRY_DSN });
//   setReporter((level, payload) => {
//     if (level === 'error') Sentry.captureException(payload.error || new Error(payload.message));
//   });
//
// Without a reporter, logs fall through to console.

let reporter = null;

function setReporter(fn) {
  reporter = typeof fn === 'function' ? fn : null;
}

function format(level, message, meta) {
  const ts = new Date().toISOString();
  const out = { ts, level, message };
  if (meta && typeof meta === 'object') Object.assign(out, meta);
  return out;
}

function info(message, meta) {
  const payload = format('info', message, meta);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
  if (reporter) { try { reporter('info', payload); } catch (_e) { /* ignore */ } }
}

function warn(message, meta) {
  const payload = format('warn', message, meta);
  // eslint-disable-next-line no-console
  console.warn(JSON.stringify(payload));
  if (reporter) { try { reporter('warn', payload); } catch (_e) { /* ignore */ } }
}

function error(message, errorObj, meta) {
  const payload = format('error', message, {
    ...(meta || {}),
    error_message: errorObj?.message || null,
    stack: errorObj?.stack || null,
  });
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(payload));
  if (reporter) {
    try { reporter('error', { ...payload, error: errorObj }); } catch (_e) { /* ignore */ }
  }
}

module.exports = { info, warn, error, setReporter };
