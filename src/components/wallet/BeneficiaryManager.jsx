import { useCallback, useEffect, useState } from 'react';
import { Check, Trash2, UserPlus, X } from 'lucide-react';
import {
  addBeneficiary,
  listBeneficiaries,
  lookupRegisteredUser,
  removeBeneficiary,
} from '../../lib/walletBeneficiaries';

const maskContact = (value) => {
  const str = String(value || '');
  if (!str) return '';
  if (str.includes('@')) {
    const [local, domain] = str.split('@');
    if (local.length <= 2) return `${local}@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return str.length > 4 ? `••••${str.slice(-4)}` : str;
};

// Beneficiary picker for wallet transfers. A beneficiary can only be added
// by looking up a phone number or email that resolves to a registered SVS
// account — their name is shown for confirmation before saving, same trust
// model as `wallet_transfer` requiring a real recipient account. Sending
// money starts here: add (or pick) a beneficiary first, then the amount/note
// fields in the parent "Send money" form appear once one is selected.
const BeneficiaryManager = ({ ownerEmail, selectedBeneficiaryId, onSelectBeneficiary }) => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [identifier, setIdentifier] = useState('');
  const [nickname, setNickname] = useState('');
  const [matchedUser, setMatchedUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | looking-up | found | saving
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!ownerEmail) return [];
    const list = await listBeneficiaries(ownerEmail);
    setBeneficiaries(list);
    return list;
  }, [ownerEmail]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLookup = async () => {
    setError('');
    setMatchedUser(null);
    if (!identifier.trim()) {
      setError('Enter a phone number or email address.');
      return;
    }
    setStatus('looking-up');
    const result = await lookupRegisteredUser(identifier);
    if (!result.ok) {
      setStatus('idle');
      setError(result.error);
      return;
    }
    setStatus('found');
    setMatchedUser(result.user);
  };

  const handleSave = async () => {
    setStatus('saving');
    const result = await addBeneficiary({ ownerEmail, identifier, nickname });
    if (!result.ok) {
      setStatus('found');
      setError(result.error);
      return;
    }
    setIdentifier('');
    setNickname('');
    setMatchedUser(null);
    setStatus('idle');
    await refresh();
    // Adding a beneficiary immediately selects them, so "add" flows
    // straight into "pay" without a second step.
    onSelectBeneficiary?.(result.beneficiary);
  };

  const handleRemove = async (beneficiaryId) => {
    await removeBeneficiary({ ownerEmail, beneficiaryId });
    if (selectedBeneficiaryId === beneficiaryId) {
      onSelectBeneficiary?.({ id: null, beneficiary_email: '' });
    }
    await refresh();
  };

  return (
    <div>
      {!matchedUser ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleLookup()}
            placeholder="Beneficiary phone number or email"
            className="w-full rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={status === 'looking-up'}
            className="shrink-0 rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'looking-up' ? 'Looking up…' : 'Look up'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-3">
          <p className="text-sm font-semibold text-[var(--svs-text)]">{matchedUser.full_name}</p>
          <p className="text-xs text-[var(--svs-muted)]">{matchedUser.email_address}{matchedUser.contact_number ? ` · ${matchedUser.contact_number}` : ''}</p>
          <input
            type="text"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Nickname (optional)"
            maxLength={40}
            className="mt-2 w-full rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] focus:border-[var(--svs-primary)] focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={status === 'saving'}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--svs-primary)] px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              {status === 'saving' ? 'Saving…' : 'Add beneficiary & continue'}
            </button>
            <button
              type="button"
              onClick={() => { setMatchedUser(null); setError(''); }}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--svs-border)] px-3 py-2 text-xs font-semibold text-[var(--svs-text)]"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      {beneficiaries.length ? (
        <div className="mt-3 space-y-2">
          {beneficiaries.map((beneficiary) => (
            <div
              key={beneficiary.id}
              role="radio"
              aria-checked={selectedBeneficiaryId === beneficiary.id}
              tabIndex={0}
              onClick={() => onSelectBeneficiary?.(beneficiary)}
              onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && onSelectBeneficiary?.(beneficiary)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                selectedBeneficiaryId === beneficiary.id ? 'border-[var(--svs-primary)] bg-[var(--svs-cyan-surface)]' : 'border-[var(--svs-border)] bg-[var(--svs-surface-soft)]'
              }`}
            >
              <input
                type="radio"
                readOnly
                checked={selectedBeneficiaryId === beneficiary.id}
                className="accent-[var(--svs-primary)]"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--svs-text)]">
                  {beneficiary.nickname || beneficiary.beneficiary_name}
                </p>
                <p className="truncate text-[11px] text-[var(--svs-muted)]">
                  {beneficiary.beneficiary_name && beneficiary.nickname ? `${beneficiary.beneficiary_name} · ` : ''}
                  {maskContact(beneficiary.beneficiary_email)}
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); handleRemove(beneficiary.id); }}
                aria-label="Remove beneficiary"
                className="rounded-md p-1.5 text-[var(--svs-muted)] transition hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !matchedUser ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-4 text-center text-xs text-[var(--svs-muted)]">
          <UserPlus className="h-3.5 w-3.5 shrink-0" />
          Add a beneficiary above to send money — only registered SVS accounts can be added.
        </p>
      ) : null}
    </div>
  );
};

export default BeneficiaryManager;
