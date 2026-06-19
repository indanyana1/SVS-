import { useCallback, useEffect, useState } from 'react';
import { Landmark, Plus, Trash2, X } from 'lucide-react';
import { addBankAccount, listBankAccounts, removeBankAccount } from '../../lib/walletBankAccounts';

const maskAccountNumber = (value) => {
  const str = String(value || '');
  return str.length > 4 ? `•••• ${str.slice(-4)}` : str;
};

const EMPTY_FORM = { accountHolder: '', bankName: '', accountNumber: '', branchCode: '', accountType: '', nickname: '' };

// Saved bank accounts for wallet withdrawals — real account holder,
// bank name, account number, and branch code are collected and stored,
// then picked from when requesting a withdrawal. No live bank payout
// happens automatically; see wallet_withdraw() / wallet_withdrawal_requests.
const BankAccountManager = ({ userEmail, selectedAccountId, onSelectAccount }) => {
  const [accounts, setAccounts] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!userEmail) return;
    const list = await listBankAccounts(userEmail);
    setAccounts(list);
    if (!selectedAccountId && list.length) {
      onSelectAccount?.(list[0].id);
    }
  }, [userEmail, selectedAccountId, onSelectAccount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleAdd = async () => {
    setError('');
    setIsSaving(true);
    const result = await addBankAccount({ userEmail, ...form });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(EMPTY_FORM);
    setIsAdding(false);
    await refresh();
    onSelectAccount?.(result.account.id);
  };

  const handleRemove = async (accountId) => {
    await removeBankAccount({ userEmail, accountId });
    if (selectedAccountId === accountId) onSelectAccount?.(null);
    await refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-semibold text-[var(--svs-muted)]">
          <Landmark className="h-3.5 w-3.5" />
          Withdraw to
        </p>
        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--svs-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add bank account
          </button>
        ) : null}
      </div>

      {accounts.length ? (
        <div className="mt-2 space-y-2">
          {accounts.map((account) => (
            <label
              key={account.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                selectedAccountId === account.id ? 'border-[var(--svs-primary)] bg-[var(--svs-cyan-surface)]' : 'border-[var(--svs-border)] bg-[var(--svs-surface-soft)]'
              }`}
            >
              <input
                type="radio"
                name="wallet-bank-account"
                checked={selectedAccountId === account.id}
                onChange={() => onSelectAccount?.(account.id)}
                className="accent-[var(--svs-primary)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--svs-text)]">
                  {account.nickname || account.bank_name}
                </p>
                <p className="truncate text-[11px] text-[var(--svs-muted)]">
                  {account.bank_name} {maskAccountNumber(account.account_number)} · {account.account_holder}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(account.id)}
                aria-label="Remove bank account"
                className="rounded-md p-1.5 text-[var(--svs-muted)] transition hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </label>
          ))}
        </div>
      ) : !isAdding ? (
        <p className="mt-2 rounded-xl border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-4 text-center text-xs text-[var(--svs-muted)]">
          No bank account saved yet. Add one to request a withdrawal.
        </p>
      ) : null}

      {isAdding ? (
        <div className="mt-3 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--svs-text)]">New bank account</p>
            <button type="button" onClick={() => { setIsAdding(false); setError(''); setForm(EMPTY_FORM); }} className="text-[var(--svs-muted)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input value={form.accountHolder} onChange={updateField('accountHolder')} placeholder="Account holder name" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none" />
            <input value={form.bankName} onChange={updateField('bankName')} placeholder="Bank name" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none" />
            <input value={form.accountNumber} onChange={updateField('accountNumber')} placeholder="Account number" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none" />
            <input value={form.branchCode} onChange={updateField('branchCode')} placeholder="Branch code" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none" />
            <input value={form.accountType} onChange={updateField('accountType')} placeholder="Account type (savings, cheque…)" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none" />
            <input value={form.nickname} onChange={updateField('nickname')} placeholder="Nickname (optional)" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none" />
          </div>
          {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isSaving}
            className="mt-2 w-full rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Save bank account'}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default BankAccountManager;
