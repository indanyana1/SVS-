import { supabase, hasSupabaseEnv } from './supabase';

// Wallet beneficiary address book.
//
// A beneficiary can only be added by looking up an email or phone number
// against `account_users` — same query shape as `src/lib/userHandles.js`
// uses to resolve chat handles — so transfers always resolve to a real,
// registered SVS account. The saved row (`wallet_beneficiaries`) caches
// the looked-up name/phone for display; it is not itself the source of
// truth for who can receive money (wallet_transfer still validates the
// recipient at transfer time).

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').trim();
const looksLikeEmail = (value) => /@/.test(value);

export const lookupRegisteredUser = async (identifier) => {
  if (!hasSupabaseEnv || !supabase) {
    return { ok: false, error: 'Looking up Biznisdil accounts needs a connected Supabase project.' };
  }
  const raw = String(identifier || '').trim();
  if (!raw) return { ok: false, error: 'Enter an email address or phone number.' };

  const byEmail = looksLikeEmail(raw);
  const column = byEmail ? 'email_address' : 'contact_number';
  const value = byEmail ? normalizeEmail(raw) : normalizePhone(raw);

  try {
    const { data, error } = await supabase
      .from('account_users')
      .select('full_name, email_address, contact_number')
      .eq(column, value)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return { ok: false, error: 'No Biznisdil account is registered with that email or phone number.' };
    }
    return { ok: true, user: data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not look up that user.' };
  }
};

export const listBeneficiaries = async (ownerEmail) => {
  const owner = normalizeEmail(ownerEmail);
  if (!owner || !hasSupabaseEnv || !supabase) return [];
  const { data, error } = await supabase
    .from('wallet_beneficiaries')
    .select('*')
    .eq('owner_email', owner)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
};

export const addBeneficiary = async ({ ownerEmail, identifier, nickname }) => {
  const owner = normalizeEmail(ownerEmail);
  if (!owner) return { ok: false, error: 'You need to be signed in to add a beneficiary.' };

  const lookup = await lookupRegisteredUser(identifier);
  if (!lookup.ok) return lookup;

  const beneficiaryEmail = normalizeEmail(lookup.user.email_address);
  if (beneficiaryEmail === owner) {
    return { ok: false, error: 'You cannot add yourself as a beneficiary.' };
  }

  try {
    const { data, error } = await supabase
      .from('wallet_beneficiaries')
      .upsert(
        {
          owner_email: owner,
          beneficiary_email: beneficiaryEmail,
          beneficiary_phone: lookup.user.contact_number || null,
          beneficiary_name: lookup.user.full_name || null,
          nickname: nickname?.trim() || null,
        },
        { onConflict: 'owner_email,beneficiary_email' },
      )
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return { ok: true, beneficiary: data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not save that beneficiary.' };
  }
};

export const removeBeneficiary = async ({ ownerEmail, beneficiaryId }) => {
  const owner = normalizeEmail(ownerEmail);
  if (!owner || !beneficiaryId || !hasSupabaseEnv || !supabase) {
    return { ok: false, error: 'Could not remove that beneficiary.' };
  }
  const { error } = await supabase
    .from('wallet_beneficiaries')
    .delete()
    .eq('id', beneficiaryId)
    .eq('owner_email', owner);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};
