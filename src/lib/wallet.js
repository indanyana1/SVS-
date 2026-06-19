import { supabase, hasSupabaseEnv } from './supabase';

// SVS eWallet client helpers.
//
// When Supabase is configured every balance change goes through a SECURITY
// DEFINER RPC (see supabase/wallet.sql) that locks the account row and checks
// the balance server-side, so the wallet can never go negative even with
// concurrent requests.
//
// When Supabase is NOT configured the same operations are emulated in
// localStorage so the feature still works as a self-contained demo (within a
// single browser).

const STORAGE_KEY = 'svs-wallet-store';
const DEFAULT_CURRENCY = 'USD';
const HISTORY_LIMIT = 100;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const makeId = () => `wtx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const emptySnapshot = (currency = DEFAULT_CURRENCY) => ({
  ok: true,
  balance: 0,
  currency,
  transactions: [],
});

// ---------------------------------------------------------------------------
// localStorage fallback store
// ---------------------------------------------------------------------------

const readStore = () => {
  if (typeof window === 'undefined') {
    return { accounts: {}, transactions: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return { accounts: {}, transactions: {} };
    }
    return {
      accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
      transactions: parsed.transactions && typeof parsed.transactions === 'object' ? parsed.transactions : {},
    };
  } catch (_error) {
    return { accounts: {}, transactions: {} };
  }
};

const writeStore = (store) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (_error) {
    // Ignore quota / serialization errors in the demo store.
  }
};

const ensureLocalAccount = (store, email, currency) => {
  if (!store.accounts[email]) {
    store.accounts[email] = {
      user_email: email,
      balance: 0,
      currency: currency || DEFAULT_CURRENCY,
      updated_at: new Date().toISOString(),
    };
  }
  if (!Array.isArray(store.transactions[email])) {
    store.transactions[email] = [];
  }
  return store.accounts[email];
};

const pushLocalTransaction = (store, email, transaction) => {
  if (!Array.isArray(store.transactions[email])) {
    store.transactions[email] = [];
  }
  store.transactions[email].unshift({
    id: makeId(),
    user_email: email,
    created_at: new Date().toISOString(),
    status: 'completed',
    ...transaction,
  });
  store.transactions[email] = store.transactions[email].slice(0, HISTORY_LIMIT);
};

const localSnapshot = (email, currency) => {
  const store = readStore();
  const account = store.accounts[normalizeEmail(email)];
  const transactions = store.transactions[normalizeEmail(email)] || [];
  return {
    ok: true,
    balance: round2(account?.balance || 0),
    currency: account?.currency || currency || DEFAULT_CURRENCY,
    transactions: transactions.slice(0, HISTORY_LIMIT),
    source: 'local',
  };
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getWalletSnapshot = async (email, fallbackCurrency = DEFAULT_CURRENCY) => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { ...emptySnapshot(fallbackCurrency), ok: false, error: 'You need to sign in to use your wallet.' };
  }

  if (!hasSupabaseEnv || !supabase) {
    return localSnapshot(normalized, fallbackCurrency);
  }

  try {
    const [accountResult, txResult] = await Promise.all([
      supabase.from('wallet_accounts').select('*').eq('user_email', normalized).maybeSingle(),
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_email', normalized)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT),
    ]);

    if (accountResult.error && accountResult.error.code !== 'PGRST116') {
      throw accountResult.error;
    }

    return {
      ok: true,
      balance: round2(accountResult.data?.balance || 0),
      currency: accountResult.data?.currency || fallbackCurrency || DEFAULT_CURRENCY,
      transactions: Array.isArray(txResult.data) ? txResult.data : [],
      source: 'supabase',
    };
  } catch (error) {
    return {
      ...emptySnapshot(fallbackCurrency),
      ok: false,
      error: error?.message || 'Could not load your wallet.',
    };
  }
};

export const topUpWallet = async ({ email, amount, currency = DEFAULT_CURRENCY, method = 'card', reference = null, otpVerificationId = null }) => {
  const normalized = normalizeEmail(email);
  const value = round2(amount);
  if (!normalized) {
    return { ok: false, error: 'You need to sign in to add funds.' };
  }
  if (value <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }

  if (!hasSupabaseEnv || !supabase) {
    const store = readStore();
    const account = ensureLocalAccount(store, normalized, currency);
    account.balance = round2(account.balance + value);
    account.updated_at = new Date().toISOString();
    pushLocalTransaction(store, normalized, {
      kind: 'topup',
      direction: 'credit',
      amount: value,
      currency: account.currency,
      reference,
      description: `Added funds via ${method}`,
    });
    writeStore(store);
    return { ok: true, balance: account.balance };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_topup', {
      p_email: normalized,
      p_amount: value,
      p_currency: currency,
      p_method: method,
      p_reference: reference,
      p_otp_id: otpVerificationId,
    });
    if (error) throw error;
    return { ok: true, balance: round2(data?.balance ?? 0) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not add funds to your wallet.' };
  }
};

export const transferWallet = async ({ fromEmail, toEmail, amount, note = null, otpVerificationId = null }) => {
  const from = normalizeEmail(fromEmail);
  const to = normalizeEmail(toEmail);
  const value = round2(amount);
  if (!from) {
    return { ok: false, error: 'You need to sign in to send money.' };
  }
  if (!to) {
    return { ok: false, error: 'Enter the recipient email address.' };
  }
  if (from === to) {
    return { ok: false, error: 'You cannot send money to yourself.' };
  }
  if (value <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }

  if (!hasSupabaseEnv || !supabase) {
    const store = readStore();
    const sender = ensureLocalAccount(store, from);
    if (round2(sender.balance) < value) {
      return { ok: false, error: 'Insufficient wallet balance.' };
    }
    const recipient = ensureLocalAccount(store, to, sender.currency);
    sender.balance = round2(sender.balance - value);
    sender.updated_at = new Date().toISOString();
    recipient.balance = round2(recipient.balance + value);
    recipient.updated_at = new Date().toISOString();
    pushLocalTransaction(store, from, {
      kind: 'transfer_out',
      direction: 'debit',
      amount: value,
      currency: sender.currency,
      counterparty: to,
      description: note || `Sent to ${to}`,
    });
    pushLocalTransaction(store, to, {
      kind: 'transfer_in',
      direction: 'credit',
      amount: value,
      currency: sender.currency,
      counterparty: from,
      description: note || `Received from ${from}`,
    });
    writeStore(store);
    return { ok: true, balance: sender.balance };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_transfer', {
      p_from: from,
      p_to: to,
      p_amount: value,
      p_note: note,
      p_otp_id: otpVerificationId,
    });
    if (error) throw error;
    return { ok: true, balance: round2(data?.balance ?? 0) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not send the money.' };
  }
};

export const requestWithdrawal = async ({ email, amount, destination = null, bankAccountId = null, otpVerificationId = null }) => {
  const normalized = normalizeEmail(email);
  const value = round2(amount);
  if (!normalized) {
    return { ok: false, error: 'You need to sign in to withdraw.' };
  }
  if (value <= 0) {
    return { ok: false, error: 'Enter an amount greater than zero.' };
  }

  if (!hasSupabaseEnv || !supabase) {
    const store = readStore();
    const account = ensureLocalAccount(store, normalized);
    if (round2(account.balance) < value) {
      return { ok: false, error: 'Insufficient wallet balance.' };
    }
    account.balance = round2(account.balance - value);
    account.updated_at = new Date().toISOString();
    pushLocalTransaction(store, normalized, {
      kind: 'withdrawal',
      direction: 'debit',
      amount: value,
      currency: account.currency,
      status: 'pending',
      counterparty: destination,
      description: 'Withdrawal request',
    });
    writeStore(store);
    return { ok: true, balance: account.balance };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_withdraw', {
      p_email: normalized,
      p_amount: value,
      p_destination: destination,
      p_bank_account_id: bankAccountId,
      p_otp_id: otpVerificationId,
    });
    if (error) throw error;
    return { ok: true, balance: round2(data?.balance ?? 0) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not request the withdrawal.' };
  }
};

export const spendFromWallet = async ({ email, amount, reference = null, description = null, otpVerificationId = null }) => {
  const normalized = normalizeEmail(email);
  const value = round2(amount);
  if (!normalized) {
    return { ok: false, error: 'You need to sign in to pay with your wallet.' };
  }
  if (value <= 0) {
    return { ok: false, error: 'Amount must be greater than zero.' };
  }

  if (!hasSupabaseEnv || !supabase) {
    const store = readStore();
    const account = ensureLocalAccount(store, normalized);
    if (round2(account.balance) < value) {
      return { ok: false, error: 'Insufficient wallet balance.' };
    }
    account.balance = round2(account.balance - value);
    account.updated_at = new Date().toISOString();
    pushLocalTransaction(store, normalized, {
      kind: 'purchase',
      direction: 'debit',
      amount: value,
      currency: account.currency,
      reference,
      description: description || 'Wallet purchase',
    });
    writeStore(store);
    return { ok: true, balance: account.balance };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_spend', {
      p_email: normalized,
      p_amount: value,
      p_reference: reference,
      p_description: description,
      p_otp_id: otpVerificationId,
    });
    if (error) throw error;
    return { ok: true, balance: round2(data?.balance ?? 0) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not complete the wallet payment.' };
  }
};

// System-issued refund (e.g. reversing a wallet payment when an order
// could not be placed). No OTP is required here — it only ever runs as
// automatic compensation for a spend that was already OTP-approved
// moments earlier, not a new user-initiated deposit.
export const refundWallet = async ({ email, amount, reference = null, description = null }) => {
  const normalized = normalizeEmail(email);
  const value = round2(amount);
  if (!normalized || value <= 0) {
    return { ok: false, error: 'Could not process the refund.' };
  }

  if (!hasSupabaseEnv || !supabase) {
    const store = readStore();
    const account = ensureLocalAccount(store, normalized);
    account.balance = round2(account.balance + value);
    account.updated_at = new Date().toISOString();
    pushLocalTransaction(store, normalized, {
      kind: 'refund',
      direction: 'credit',
      amount: value,
      currency: account.currency,
      reference,
      description: description || 'Refund',
    });
    writeStore(store);
    return { ok: true, balance: account.balance };
  }

  try {
    const { data, error } = await supabase.rpc('wallet_refund', {
      p_email: normalized,
      p_amount: value,
      p_reference: reference,
      p_description: description,
    });
    if (error) throw error;
    return { ok: true, balance: round2(data?.balance ?? 0) };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not process the refund.' };
  }
};

export const WALLET_TRANSACTION_LABELS = {
  topup: 'Added funds',
  transfer_in: 'Received',
  transfer_out: 'Sent',
  withdrawal: 'Withdrawal',
  purchase: 'Purchase',
  refund: 'Refund',
};
