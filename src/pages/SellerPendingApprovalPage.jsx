import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Pencil, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

// Same section keys/labels the admin dashboard's "Request Changes" tool
// uses — kept in sync by key string, not by sharing a module (this app
// doesn't share constants across src/pages/ files).
const SELLER_PROFILE_SECTIONS = {
  business_identity: 'Business Identity',
  identity_verification: 'Identity Verification (ID/Passport photo, Selfie)',
  contact_address: 'Business Contact and Address',
  payout_returns: 'Payout and Returns',
};

const SellerPendingApprovalPage = () => {
  const [status, setStatus] = useState('loading');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [flaggedSections, setFlaggedSections] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    const userEmail = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || '');

    if (!userEmail || !hasSupabaseEnv || !supabase) {
      setStatus('submitted');
      return;
    }

    const { data } = await supabase
      .from('seller_profiles')
      .select('compliance_status, rejection_reason, admin_message, fields_to_edit')
      .eq('user_email', userEmail.trim().toLowerCase())
      .maybeSingle();

    setStatus(data?.compliance_status || 'submitted');
    setRejectionReason(data?.rejection_reason || '');
    setAdminMessage(data?.admin_message || '');
    setFlaggedSections(Array.isArray(data?.fields_to_edit) ? data.fields_to_edit : []);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      await fetchStatus();
      if (isCancelled) return;
    })();
    return () => {
      isCancelled = true;
    };
  }, [fetchStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus();
    setIsRefreshing(false);
  };

  const isRejected = status === 'rejected';
  const isChangesRequested = status === 'changes_requested';
  const isLoading = status === 'loading';

  return (
    <StandalonePageShell title="Seller Application Status" brandHref="/sell" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isRejected ? 'bg-rose-50' : isChangesRequested ? 'bg-sky-50' : 'bg-[var(--svs-cyan-surface)]'}`}>
          {isRejected ? (
            <ShieldAlert className="h-7 w-7 text-rose-600" />
          ) : isChangesRequested ? (
            <Pencil className="h-7 w-7 text-sky-600" />
          ) : (
            <Clock className="h-7 w-7 text-[var(--svs-primary)]" />
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-[var(--svs-muted)]">Checking your application status...</p>
        ) : isRejected ? (
          <>
            <h1 className="text-2xl font-black">Application Not Approved</h1>
            <p className="mt-3 text-sm text-[var(--svs-muted)]">
              Your seller application could not be approved.
            </p>
            {rejectionReason ? (
              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-left text-sm text-rose-800 ring-1 ring-rose-200">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Reason given</p>
                <p className="mt-1">{rejectionReason}</p>
              </div>
            ) : null}
            <Link
              to="/sell/onboarding"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--svs-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Update your details and resubmit
            </Link>
          </>
        ) : isChangesRequested ? (
          <>
            <h1 className="text-2xl font-black">Update Needed</h1>
            <p className="mt-3 text-sm text-[var(--svs-muted)]">
              Our team reviewed your application and needs a few things fixed before they can approve it.
            </p>
            <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-left text-sm text-sky-800 ring-1 ring-sky-200">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Message from our team</p>
              <p className="mt-1">{adminMessage}</p>
              {flaggedSections.length ? (
                <p className="mt-2 text-xs text-sky-700">
                  {flaggedSections.includes('all')
                    ? 'Please review your entire profile.'
                    : `Sections to update: ${flaggedSections.map((key) => SELLER_PROFILE_SECTIONS[key] || key).join(', ')}`}
                </p>
              ) : null}
            </div>
            <Link
              to="/sell/onboarding"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--svs-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              Update your details and resubmit
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black">Application Under Review</h1>
            <p className="mt-3 text-sm text-[var(--svs-muted)]">
              Thanks for completing seller verification. Our team is reviewing your business details, identity
              documents, and live selfie. This usually takes a short while — you&apos;ll get access to your seller
              dashboard as soon as you&apos;re approved.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--svs-cyan-surface)] px-4 py-2 text-xs font-bold text-[var(--svs-primary-strong)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Pending Approval
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--svs-primary)] hover:underline disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> {isRefreshing ? 'Checking...' : 'Check status again'}
              </button>
            </div>
          </>
        )}

        <p className="mt-8 text-sm text-[var(--svs-muted)]">
          <Link to="/markets" className="font-bold text-[var(--svs-primary)] transition hover:underline">
            Continue browsing as a buyer
          </Link>
        </p>
        <p className="mt-3 text-xs text-[var(--svs-muted)]">
          <Link to="/sell" className="transition hover:text-[var(--svs-text)]">Back to Seller Central</Link>
        </p>
      </div>
    </StandalonePageShell>
  );
};

export default SellerPendingApprovalPage;
