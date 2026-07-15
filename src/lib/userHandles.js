// Shareable per-user chat-link helpers.
//
// Every registered person on Biznisdil gets a stable, URL-friendly
// `user_handle` (e.g. "jane-doe-4f2a").  We use it to mint a public
// "open a chat with me" link of the form `${origin}/u/${handle}` that
// the owner can share anywhere (WhatsApp, business card, email
// signature…) and that opens the recipient picker straight on the
// shared person's profile.
//
// All functions degrade gracefully when Supabase isn't configured (the
// caller just won't get a sync'd handle, but the rest of the app keeps
// working).

import { hasSupabaseEnv, supabase } from './supabase';

const HANDLE_MIN_LEN = 3;
const HANDLE_MAX_LEN = 32;
const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

const normaliseEmail = (value) => String(value || '').trim().toLowerCase();

// Reserved words we never want to hand out as someone's handle (so that
// `/u/login`, `/u/admin`, etc. can be repurposed later without
// colliding with an existing account).
const RESERVED_HANDLES = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'system',
  'svs', 'svs-ecommerce', 'svsecommerce', 'login', 'signup', 'signin',
  'register', 'logout', 'me', 'you', 'us', 'team', 'staff',
  'api', 'app', 'auth', 'account', 'profile', 'settings',
  'about', 'contact', 'home', 'index', 'null', 'undefined',
]);

// Strip a free-form display name or email down to the slug alphabet
// `[a-z0-9-]`, collapsing repeats and trimming hyphens at the ends.
const slugify = (raw) => {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')        // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')             // non-alpha → hyphen
    .replace(/-{2,}/g, '-')                  // collapse runs
    .replace(/^-+|-+$/g, '');                // trim
};

// A short random suffix (base36) used to break ties when many people
// share the same name.
const randomSuffix = (length = 4) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

/**
 * Validate a user-supplied or generated handle.  Returns true when the
 * value matches the public shape (3-32 chars, lowercase alphanumerics
 * + single hyphens, doesn't start/end with a hyphen, not reserved).
 */
export const isValidUserHandle = (value) => {
  const handle = String(value || '').toLowerCase().trim();
  if (handle.length < HANDLE_MIN_LEN || handle.length > HANDLE_MAX_LEN) return false;
  if (!HANDLE_PATTERN.test(handle)) return false;
  if (RESERVED_HANDLES.has(handle)) return false;
  return true;
};

/**
 * Build a candidate handle from the user's display name (preferred) or
 * the local-part of their email address as a fallback.  The result is
 * NOT guaranteed unique — pass it through `ensureUserHandle` to lock
 * one in.
 */
export const generateHandleFromName = (name, email) => {
  const namePart = slugify(name);
  const emailLocal = slugify(String(email || '').split('@')[0] || '');
  const base = (namePart || emailLocal || 'user').slice(0, HANDLE_MAX_LEN - 5);
  // Pad to the minimum length if the name is unusually short.
  const padded = base.length >= HANDLE_MIN_LEN ? base : `${base}-user`.slice(0, HANDLE_MAX_LEN - 5);
  return `${padded}-${randomSuffix(4)}`;
};

/**
 * Build the public share URL for a handle.  Falls back to the
 * canonical production domain when called server-side.
 */
export const buildShareLink = (handle) => {
  const cleaned = String(handle || '').trim();
  if (!cleaned) return '';
  const origin = (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : 'https://svs-ecommerce.com';
  return `${origin}/u/${encodeURIComponent(cleaned)}`;
};

/**
 * Look up the account row for an email, including its handle (if any).
 * Returns null when Supabase is unavailable or the row is missing.
 */
const fetchAccountByEmail = async (email) => {
  if (!hasSupabaseEnv || !supabase) return null;
  const target = normaliseEmail(email);
  if (!target) return null;
  try {
    const { data, error } = await supabase
      .from('account_users')
      .select('id, full_name, email_address, user_handle')
      .eq('email_address', target)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[userHandles] fetchAccountByEmail failed:', error.message || error);
      return null;
    }
    return data || null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[userHandles] fetchAccountByEmail threw:', err);
    return null;
  }
};

/**
 * Look up the account row that owns a handle.  Returns null when
 * nothing matches.  Used by the `/u/:handle` route to resolve a share
 * link into a chatable email.
 */
export const lookupAccountByHandle = async (handle) => {
  if (!hasSupabaseEnv || !supabase) return null;
  const target = String(handle || '').trim().toLowerCase();
  if (!isValidUserHandle(target)) return null;
  try {
    const { data, error } = await supabase
      .from('account_users')
      .select('id, full_name, email_address, user_handle')
      .ilike('user_handle', target)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch (_) {
    return null;
  }
};

/**
 * Return the handle for the given email, generating + persisting one
 * on first call.  Retries on uniqueness collisions.
 *
 * Returns the final handle string, or '' when nothing could be
 * persisted (Supabase offline, account missing, etc.).
 */
export const ensureUserHandle = async (email, fallbackName = '') => {
  if (!hasSupabaseEnv || !supabase) {
    // eslint-disable-next-line no-console
    console.warn('[userHandles] Supabase not configured — cannot mint a share handle.');
    return { handle: '', error: 'Live sync is off, so share links cannot be created. Connect Supabase and try again.' };
  }
  const target = normaliseEmail(email);
  if (!target) return { handle: '', error: 'You need to be signed in with a valid email first.' };

  let account = await fetchAccountByEmail(target);

  // Auto-provision an account row for users who registered before the
  // account_users table existed (or signed in via another flow) so the
  // share link still works for them.
  if (!account) {
    const displayName = fallbackName || target.split('@')[0] || target;
    try {
      const { data, error } = await supabase
        .from('account_users')
        .insert({ full_name: displayName, email_address: target })
        .select('id, full_name, email_address, user_handle')
        .maybeSingle();
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[userHandles] could not auto-create account row:', error.message || error);
      } else {
        account = data || null;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[userHandles] auto-create account row threw:', err);
    }
    // If the insert raced with an existing row, re-fetch.
    if (!account) account = await fetchAccountByEmail(target);
  }

  if (!account) {
    // eslint-disable-next-line no-console
    console.warn('[userHandles] no account row for', target, '— run supabase/user-handles.sql and ensure account_users has this user.');
    return { handle: '', error: 'No account record found for your email. Make sure the account_users table exists in Supabase.' };
  }
  if (account.user_handle && isValidUserHandle(account.user_handle)) {
    return { handle: account.user_handle.toLowerCase(), error: '' };
  }

  const displayName = account.full_name || fallbackName || target.split('@')[0] || '';
  // Up to 5 generation attempts before bailing out.
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateHandleFromName(displayName, target);
    if (!isValidUserHandle(candidate)) continue;
    try {
      const { error } = await supabase
        .from('account_users')
        .update({ user_handle: candidate })
        .eq('id', account.id);
      if (!error) return { handle: candidate, error: '' };
      lastError = error;
    } catch (err) {
      lastError = err;
      // try again with a different random suffix
    }
  }
  const reason = lastError?.message || String(lastError || 'unknown error');
  if (lastError) {
    // eslint-disable-next-line no-console
    console.warn('[userHandles] could not persist handle (is the user_handle column present? run supabase/user-handles.sql):', reason);
  }
  const missingColumn = /user_handle/i.test(reason) && /column|schema|does not exist|not found/i.test(reason);
  return {
    handle: '',
    error: missingColumn
      ? 'The user_handle column is missing. Run supabase/user-handles.sql in your Supabase SQL editor, then try again.'
      : `Could not save your share link: ${reason}`,
  };
};
