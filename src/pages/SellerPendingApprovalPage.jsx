import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';

const SellerPendingApprovalPage = () => {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const userEmail = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || '');

    if (!userEmail || !hasSupabaseEnv || !supabase) {
      setStatus('submitted');
      return;
    }

    let isCancelled = false;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('seller_profiles')
        .select('compliance_status')
        .eq('user_email', userEmail.trim().toLowerCase())
        .maybeSingle();

      if (isCancelled) return;
      setStatus(data?.compliance_status || 'submitted');
    };

    fetchStatus();

    return () => {
      isCancelled = true;
    };
  }, []);

  const isRejected = status === 'rejected';
  const isLoading = status === 'loading';

  return (
    <StandalonePageShell title="Seller Application Status" brandHref="/sell" mainClassName="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isRejected ? 'bg-rose-50' : 'bg-[var(--svs-cyan-surface)]'}`}>
          {isRejected ? (
            <ShieldAlert className="h-7 w-7 text-rose-600" />
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
              Your seller application could not be approved. If you believe this is a mistake, contact support for more
              details.
            </p>
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
