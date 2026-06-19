import { supabase, hasSupabaseEnv } from './supabase';

// Saved bank accounts for wallet withdrawals, plus the manual-review
// withdrawal request queue. Mirrors the existing seller-payouts flow
// (supabase/account-users-and-seller-profiles.sql `payout_*` fields,
// driven from `src/pages/SellerOnboardingPage.jsx`) — full real bank
// details are collected and stored, but no live disbursement happens
// automatically; requests sit as `pending` for manual processing.

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export const listBankAccounts = async (userEmail) => {
  const email = normalizeEmail(userEmail);
  if (!email || !hasSupabaseEnv || !supabase) return [];
  const { data, error } = await supabase
    .from('wallet_bank_accounts')
    .select('*')
    .eq('user_email', email)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
};

export const addBankAccount = async ({
  userEmail,
  accountHolder,
  bankName,
  accountNumber,
  branchCode,
  accountType,
  nickname,
}) => {
  const email = normalizeEmail(userEmail);
  if (!email) return { ok: false, error: 'You need to be signed in to add a bank account.' };
  if (!accountHolder?.trim() || !bankName?.trim() || !accountNumber?.trim()) {
    return { ok: false, error: 'Account holder, bank name, and account number are required.' };
  }
  if (!hasSupabaseEnv || !supabase) {
    return { ok: false, error: 'Saving bank accounts needs a connected Supabase project.' };
  }

  try {
    const { data, error } = await supabase
      .from('wallet_bank_accounts')
      .insert({
        user_email: email,
        account_holder: accountHolder.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        branch_code: branchCode?.trim() || null,
        account_type: accountType?.trim() || null,
        nickname: nickname?.trim() || null,
      })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return { ok: true, account: data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not save that bank account.' };
  }
};

export const removeBankAccount = async ({ userEmail, accountId }) => {
  const email = normalizeEmail(userEmail);
  if (!email || !accountId || !hasSupabaseEnv || !supabase) {
    return { ok: false, error: 'Could not remove that bank account.' };
  }
  const { error } = await supabase
    .from('wallet_bank_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_email', email);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

export const listWithdrawalRequests = async (userEmail) => {
  const email = normalizeEmail(userEmail);
  if (!email || !hasSupabaseEnv || !supabase) return [];
  const { data, error } = await supabase
    .from('wallet_withdrawal_requests')
    .select('*')
    .eq('user_email', email)
    .order('requested_at', { ascending: false });
  if (error) return [];
  return data || [];
};
