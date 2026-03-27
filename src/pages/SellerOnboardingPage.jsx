import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import { clearPendingSellerSignupDraft, getPendingSellerSignupDraft } from './sellerSignupDraft';

const SELLER_PROFILE_REQUIRED_FIELDS = [
  'business_name',
  'legal_full_name',
  'id_number',
  'business_type',
  'registration_number',
  'tax_number',
  'phone_number',
  'business_address_line1',
  'city',
  'province',
  'postal_code',
  'country',
  'payout_account_holder',
  'payout_bank_name',
  'payout_account_number',
  'payout_branch_code',
  'return_contact_name',
  'return_contact_phone',
];

const hasCompleteSellerProfile = (record) => SELLER_PROFILE_REQUIRED_FIELDS.every((field) => {
  const value = record?.[field];
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
});

const getUserContext = () => ({
  email: typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || getPendingSellerSignupDraft()?.email || ''),
  fullName: typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-name') || getPendingSellerSignupDraft()?.name || ''),
  contactNumber: typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-contact') || getPendingSellerSignupDraft()?.contact || ''),
  pendingSignupDraft: typeof window === 'undefined' ? null : getPendingSellerSignupDraft(),
});

const getAccountUserErrorMessage = (error) => {
  if (!error) {
    return 'Unable to save your account details.';
  }

  if (error.code === '23505' && error.message?.includes('account_users_contact_number_key')) {
    return 'That contact number is already linked to another account. Use a different account number or sign in with the existing account first.';
  }

  return error.message || 'Unable to save your account details.';
};

const SellerOnboardingPage = () => {
  const navigate = useNavigate();
  const context = useMemo(() => getUserContext(), []);
  const [formData, setFormData] = useState({
    businessName: '',
    legalFullName: context.fullName,
    idNumber: '',
    businessType: '',
    registrationNumber: '',
    taxNumber: '',
    phoneNumber: context.contactNumber,
    businessAddressLine1: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa',
    payoutAccountHolder: '',
    payoutBankName: '',
    payoutAccountNumber: '',
    payoutBranchCode: '',
    returnContactName: '',
    returnContactPhone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('idle');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!context.email) {
      setMessage('Complete the first signup step or sign in first to continue seller verification.');
      setMessageType('error');
      return;
    }

    if (!hasSupabaseEnv || !supabase) {
      setMessage(
        'Supabase is not configured. Add REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env and restart the app.',
      );
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType('idle');

    if (context.pendingSignupDraft) {
      const { name, email, contact, passwordHash } = context.pendingSignupDraft;
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedContact = String(contact || '').trim();
      const normalizedName = String(name || '').trim();

      const { data: existingUser, error: existingUserError } = await supabase
        .from('account_users')
        .select('id, full_name, password_hash')
        .eq('email_address', normalizedEmail)
        .maybeSingle();

      if (existingUserError) {
        setMessage(existingUserError.message);
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }

      let accountError = null;

      if (existingUser) {
        const accountUpdates = {};

        if (normalizedName && !String(existingUser.full_name || '').trim()) {
          accountUpdates.full_name = normalizedName;
        }

        if (passwordHash && !existingUser.password_hash) {
          accountUpdates.password_hash = passwordHash;
        }

        if (Object.keys(accountUpdates).length > 0) {
          const { error } = await supabase
            .from('account_users')
            .update(accountUpdates)
            .eq('id', existingUser.id);

          accountError = error;
        }
      } else {
        const { data: duplicateContactUser, error: duplicateContactError } = await supabase
          .from('account_users')
          .select('id')
          .eq('contact_number', normalizedContact)
          .maybeSingle();

        if (duplicateContactError) {
          setMessage(duplicateContactError.message);
          setMessageType('error');
          setIsSubmitting(false);
          return;
        }

        if (duplicateContactUser) {
          setMessage('That contact number is already linked to another account. Use a different number or sign in with the existing account first.');
          setMessageType('error');
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from('account_users').insert({
          full_name: normalizedName,
          email_address: normalizedEmail,
          contact_number: normalizedContact,
          password_hash: passwordHash,
        });

        accountError = error;
      }

      if (accountError) {
        setMessage(getAccountUserErrorMessage(accountError));
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      user_email: context.email.trim().toLowerCase(),
      business_name: formData.businessName.trim(),
      legal_full_name: formData.legalFullName.trim(),
      id_number: formData.idNumber.trim(),
      business_type: formData.businessType.trim(),
      registration_number: formData.registrationNumber.trim(),
      tax_number: formData.taxNumber.trim(),
      phone_number: formData.phoneNumber.trim(),
      business_address_line1: formData.businessAddressLine1.trim(),
      city: formData.city.trim(),
      province: formData.province.trim(),
      postal_code: formData.postalCode.trim(),
      country: formData.country.trim(),
      payout_account_holder: formData.payoutAccountHolder.trim(),
      payout_bank_name: formData.payoutBankName.trim(),
      payout_account_number: formData.payoutAccountNumber.trim(),
      payout_branch_code: formData.payoutBranchCode.trim(),
      return_contact_name: formData.returnContactName.trim(),
      return_contact_phone: formData.returnContactPhone.trim(),
      onboarding_completed: true,
      compliance_status: 'submitted',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('seller_profiles')
      .upsert(payload, { onConflict: 'user_email' })
      .select('id, onboarding_completed')
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    if (!data || !hasCompleteSellerProfile(payload)) {
      setMessage('Please complete all required fields to continue.');
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    setMessage('Seller profile saved. Redirecting to dashboard...');
    setMessageType('success');

    if (context.pendingSignupDraft) {
      window.localStorage.setItem('svs-authenticated', 'true');
      window.localStorage.setItem('svs-user-email', context.email.trim().toLowerCase());
      window.localStorage.setItem('svs-user-name', context.fullName.trim());
      window.localStorage.setItem('svs-user-contact', context.contactNumber.trim());
      window.localStorage.setItem('svs-has-seller-access', 'true');
      window.localStorage.setItem('svs-seller-home-path', '/seller/dashboard');
      clearPendingSellerSignupDraft();
      window.dispatchEvent(new Event('svs-auth-changed'));
    }

    setIsSubmitting(false);

    setTimeout(() => {
      navigate('/seller/dashboard');
    }, 500);
  };

  return (
    <StandalonePageShell title="Seller Verification and Compliance" brandHref="/sell" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--svs-cyan-surface)]">
            <ShieldCheck className="h-7 w-7 text-[var(--svs-primary)]" />
          </div>
          <h1 className="text-2xl font-black">Seller Verification and Compliance</h1>
          <p className="mt-2 text-sm text-[var(--svs-muted)]">
            Provide accurate business and payout details to protect buyers and reduce fraud.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {message ? (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  messageType === 'success'
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                }`}
              >
                {message}
              </div>
            ) : null}

            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--svs-muted)]">Business Identity</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input name="businessName" value={formData.businessName} onChange={handleChange} required placeholder="Business name" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="legalFullName" value={formData.legalFullName} onChange={handleChange} required placeholder="Legal full name" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="idNumber" value={formData.idNumber} onChange={handleChange} required placeholder="National ID / passport number" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="businessType" value={formData.businessType} onChange={handleChange} required placeholder="Business type (Individual, Pty Ltd, etc.)" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} required placeholder="Company registration number" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="taxNumber" value={formData.taxNumber} onChange={handleChange} required placeholder="Tax number" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--svs-muted)]">Business Contact and Address</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required placeholder="Business phone number" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="businessAddressLine1" value={formData.businessAddressLine1} onChange={handleChange} required placeholder="Street address" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="city" value={formData.city} onChange={handleChange} required placeholder="City" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="province" value={formData.province} onChange={handleChange} required placeholder="Province/State" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="postalCode" value={formData.postalCode} onChange={handleChange} required placeholder="Postal code" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="country" value={formData.country} onChange={handleChange} required placeholder="Country" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
            </div>

            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--svs-muted)]">Payout and Returns</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input name="payoutAccountHolder" value={formData.payoutAccountHolder} onChange={handleChange} required placeholder="Payout account holder" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="payoutBankName" value={formData.payoutBankName} onChange={handleChange} required placeholder="Bank name" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="payoutAccountNumber" value={formData.payoutAccountNumber} onChange={handleChange} required placeholder="Bank account number" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="payoutBranchCode" value={formData.payoutBranchCode} onChange={handleChange} required placeholder="Branch code" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="returnContactName" value={formData.returnContactName} onChange={handleChange} required placeholder="Returns contact name" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
              <input name="returnContactPhone" value={formData.returnContactPhone} onChange={handleChange} required placeholder="Returns contact phone" className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm" />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving profile...' : 'Create seller account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
            Need to go back?{' '}
            <Link to="/sell/signup" className="font-bold text-[var(--svs-primary)] transition hover:underline">
              Return to Seller Sign Up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--svs-muted)]">
          <Link to="/sell" className="inline-flex items-center gap-1.5 transition hover:text-[var(--svs-primary)]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Seller Central
          </Link>
        </p>
      </div>
    </StandalonePageShell>
  );
};

export { hasCompleteSellerProfile, SELLER_PROFILE_REQUIRED_FIELDS };
export default SellerOnboardingPage;
