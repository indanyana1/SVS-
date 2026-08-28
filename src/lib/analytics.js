import { supabase, hasSupabaseEnv } from './supabase';

// Self-hosted product analytics — every event lands in your own Supabase
// project (public.analytics_events, see supabase/site-analytics.sql), not a
// third-party vendor. No new account/env var needed: it "just works" the
// moment the migration is applied, using the same Supabase connection
// everything else in the app already uses.
//
// Privacy: the only identity carried is a random per-browser session id
// (kept in localStorage, never sent anywhere else) and — only when the
// visitor is signed in — their email, exactly like every other
// already-signed-in write this app makes. No IP address, fingerprint, or
// third party is ever involved.

const SESSION_STORAGE_KEY = 'svs-analytics-session-id';
const QUEUE_FLUSH_INTERVAL_MS = 4000;

const getSessionId = () => {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch (_error) {
    // Storage unavailable (private mode, quota) — fall back to a session
    // id that only lives for this page view instead of failing entirely.
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
};

const getCurrentUserEmail = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('svs-user-email') || null;
  } catch (_error) {
    return null;
  }
};

// Small batching queue so a burst of events (e.g. several quick page
// navigations) becomes one network call instead of one per event.
let queue = [];
let flushTimer = null;

const flushQueue = () => {
  flushTimer = null;
  if (!queue.length) return;
  if (!hasSupabaseEnv || !supabase) {
    queue = [];
    return;
  }
  const batch = queue;
  queue = [];
  // Fire-and-forget: analytics must never block or throw into the caller's
  // flow, and a dropped event is an acceptable loss (this is instrumentation,
  // not a system of record).
  supabase.from('analytics_events').insert(batch).then(({ error }) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[analytics] failed to record events:', error.message);
    }
  }).catch(() => {});
};

const scheduleFlush = () => {
  if (flushTimer) return;
  flushTimer = setTimeout(flushQueue, QUEUE_FLUSH_INTERVAL_MS);
};

// Flush immediately before the tab actually closes so the last event of a
// session isn't silently lost waiting on the batching timer.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushQueue);
}

const enqueue = (eventName, { pagePath, metadata } = {}) => {
  if (!eventName) return;
  queue.push({
    event_name: eventName,
    page_path: pagePath || (typeof window !== 'undefined' ? window.location.pathname : null),
    session_id: getSessionId(),
    user_email: getCurrentUserEmail(),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  });
  scheduleFlush();
};

// Call once per route change (see the ScrollToTop/router integration in
// src/app/main.jsx) — records a page_view event for the given path.
export const trackPageView = (pagePath) => {
  enqueue('page_view', { pagePath });
};

// Call for a named product event — e.g. trackEvent('signup_completed'),
// trackEvent('listing_created', { metadata: { marketKey: 'petCareSupplies' } }),
// trackEvent('order_placed', { metadata: { total, currency } }).
export const trackEvent = (eventName, { metadata } = {}) => {
  enqueue(eventName, { metadata });
};
