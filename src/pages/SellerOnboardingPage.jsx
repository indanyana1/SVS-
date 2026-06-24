import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Camera, Check, RotateCcw, ShieldCheck, SwitchCamera, X } from 'lucide-react';
import StandalonePageShell from '../components/layout/StandalonePageShell';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import { clearPendingSellerSignupDraft, getPendingSellerSignupDraft } from './sellerSignupDraft';

const SELLER_VERIFICATION_BUCKET = 'seller-verification';

const sanitizeStorageSegment = (value) => String(value || 'seller')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'seller';

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
  'id_document_path',
  'selfie_path',
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

// Forces a live camera capture — there is deliberately no file-picker
// fallback anywhere in here, for either the ID/passport photo or the
// selfie, since the whole point is to stop sellers substituting a
// pre-existing, downloaded, or doctored image for either document.
// Below this average 0-255 luminance, a captured frame is flagged as too
// dark to reliably verify (e.g. a document photographed in a dim room).
const DARK_PHOTO_LUMINANCE_THRESHOLD = 60;

const LiveCameraCapture = ({
  previewUrl,
  isDark = false,
  onCapture,
  onRetake,
  instructions,
  captureLabel = 'Capture photo',
  capturedLabel = 'Photo captured',
  capturedHint = '',
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user');
  // Optimistic until proven otherwise — enumerateDevices() can't reliably
  // tell us camera count before permission is granted on every browser, so
  // default to showing the switch control rather than hiding a useful one.
  const [hasMultipleCameras, setHasMultipleCameras] = useState(true);
  const [pendingCapture, setPendingCapture] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('');

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopStream(), []);

  useEffect(() => {
    if (!pendingCapture) {
      setPendingPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(pendingCapture.blob);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingCapture]);

  // The <video> element only mounts once cameraState becomes 'live', so
  // videoRef.current is still null at the point getUserMedia resolves —
  // attaching the stream has to wait for the next render (this effect),
  // not happen inline inside startCamera, or the feed never appears.
  useEffect(() => {
    if (cameraState !== 'live' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraState]);

  const startCamera = async (mode = facingMode) => {
    setCameraState('starting');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false });
      streamRef.current = stream;
      setCameraState('live');

      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasMultipleCameras(devices.filter((device) => device.kind === 'videoinput').length > 1);
        } catch {
          // Device labels/enumeration can be restricted in some browsers —
          // keep the switch button visible rather than guessing it's absent.
        }
      }
    } catch (error) {
      setCameraState('error');
      setCameraError(
        error?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera access in your browser settings, then try again.'
          : error?.name === 'NotFoundError'
            ? 'No camera was detected on this device. A live camera is required to verify your identity.'
            : 'Could not start the camera. Close any other app using it and try again.',
      );
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    stopStream();
    startCamera(nextMode);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Sample every 8th pixel (4 bytes each) for a fast-enough average
    // brightness estimate — this only runs once per capture, not per frame.
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let totalLuminance = 0;
    let sampleCount = 0;
    for (let i = 0; i < data.length; i += 32) {
      totalLuminance += (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
      sampleCount += 1;
    }
    const averageLuminance = sampleCount ? totalLuminance / sampleCount : 255;
    const capturedIsDark = averageLuminance < DARK_PHOTO_LUMINANCE_THRESHOLD;

    canvas.toBlob((blob) => {
      if (blob) setPendingCapture({ blob, isDark: capturedIsDark });
    }, 'image/png');
    stopStream();
    setCameraState('idle');
  };

  // "Retake" while reviewing a just-taken (not yet confirmed) photo — drop
  // it and jump straight back into the live camera view.
  const handleRetakeFromReview = () => {
    setPendingCapture(null);
    startCamera();
  };

  // "Cancel" while reviewing — drop the candidate photo and back out to
  // idle entirely, distinct from Retake which immediately restarts the camera.
  const handleCancelReview = () => {
    setPendingCapture(null);
    setCameraState('idle');
    setCameraError('');
  };

  const handleUsePhoto = () => {
    if (!pendingCapture) return;
    onCapture(pendingCapture.blob, pendingCapture.isDark);
    setPendingCapture(null);
  };

  // "Retake" once the parent has already confirmed a photo (previewUrl is
  // set) — clears the parent's stored photo and goes back to idle.
  const handleRetake = () => {
    onRetake();
    setCameraState('idle');
    setCameraError('');
  };

  if (previewUrl) {
    return (
      <div className="space-y-2">
        {isDark ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This photo looks too dark to verify clearly. Move somewhere brighter and retake for the best chance of approval.</span>
          </div>
        ) : null}
        <div className="flex items-center gap-4 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
          <img src={previewUrl} alt={capturedLabel} className="h-20 w-20 rounded-lg object-cover" />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isDark ? 'text-amber-700' : 'text-emerald-600'}`}>
              {isDark ? 'Captured — but it looks dark' : capturedLabel}
            </p>
            {capturedHint ? <p className="text-xs text-[var(--svs-muted)]">{capturedHint}</p> : null}
          </div>
          <button
            type="button"
            onClick={handleRetake}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${isDark ? 'border-amber-300 text-amber-800 hover:border-amber-500' : 'border-[var(--svs-border)] text-[var(--svs-text)] hover:border-[var(--svs-primary)]'}`}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retake
          </button>
        </div>
      </div>
    );
  }

  if (pendingCapture && pendingPreviewUrl) {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
        <p className="text-center text-xs font-medium text-[var(--svs-text)]">Review your photo before continuing.</p>
        {pendingCapture.isDark ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This photo looks too dark to verify clearly. Consider retaking it somewhere brighter.</span>
          </div>
        ) : null}
        <img src={pendingPreviewUrl} alt="Captured preview, not yet confirmed" className="mx-auto h-56 w-full max-w-sm rounded-lg object-cover" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleRetakeFromReview}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-2 text-sm font-semibold text-[var(--svs-text)] hover:border-[var(--svs-primary)]"
          >
            <RotateCcw className="h-4 w-4" /> Retake
          </button>
          <button
            type="button"
            onClick={handleUsePhoto}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--svs-primary)] px-4 py-2 text-sm font-bold text-white hover:brightness-110"
          >
            <Check className="h-4 w-4" /> Use This Photo
          </button>
        </div>
        <button
          type="button"
          onClick={handleCancelReview}
          className="flex w-full items-center justify-center gap-1 text-center text-xs font-semibold text-[var(--svs-muted)] hover:text-[var(--svs-text)] hover:underline"
        >
          <X className="h-3 w-3" /> Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
      {instructions ? <p className="mb-3 text-center text-xs font-medium text-[var(--svs-text)]">{instructions}</p> : null}
      {cameraState === 'live' ? (
        <div className="flex flex-col items-center gap-3">
          <video ref={videoRef} autoPlay playsInline muted className="h-56 w-full max-w-sm rounded-lg bg-black object-cover" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={captureFrame}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--svs-primary)] px-4 py-2 text-sm font-bold text-white hover:brightness-110"
            >
              <Camera className="h-4 w-4" /> {captureLabel}
            </button>
            {hasMultipleCameras ? (
              <button
                type="button"
                onClick={switchCamera}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-2 text-sm font-semibold text-[var(--svs-text)] hover:border-[var(--svs-primary)]"
              >
                <SwitchCamera className="h-4 w-4" /> Switch Camera
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            type="button"
            onClick={() => startCamera()}
            disabled={cameraState === 'starting'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-2 text-sm font-bold text-[var(--svs-text)] hover:border-[var(--svs-primary)] disabled:opacity-60"
          >
            <Camera className="h-4 w-4" /> {cameraState === 'starting' ? 'Starting camera…' : 'Start camera'}
          </button>
          <p className="text-center text-xs text-[var(--svs-muted)]">A live photo is required — uploaded photos are not accepted.</p>
          {cameraError ? <p className="text-center text-xs font-medium text-rose-600">{cameraError}</p> : null}
        </div>
      )}
    </div>
  );
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
  const [idDocumentType, setIdDocumentType] = useState('');
  const [idDocumentBlob, setIdDocumentBlob] = useState(null);
  const [idDocumentPreviewUrl, setIdDocumentPreviewUrl] = useState('');
  const [isIdDocumentDark, setIsIdDocumentDark] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState('');
  const [isSelfieDark, setIsSelfieDark] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('idle');

  const handleIdDocumentCapture = (blob, capturedIsDark) => {
    setIdDocumentBlob(blob);
    setIsIdDocumentDark(Boolean(capturedIsDark));
  };

  const handleSelfieCapture = (blob, capturedIsDark) => {
    setSelfieBlob(blob);
    setIsSelfieDark(Boolean(capturedIsDark));
  };

  useEffect(() => {
    if (!idDocumentBlob) {
      setIdDocumentPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(idDocumentBlob);
    setIdDocumentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [idDocumentBlob]);

  useEffect(() => {
    if (!selfieBlob) {
      setSelfiePreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(selfieBlob);
    setSelfiePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selfieBlob]);

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

    if (!idDocumentType || !idDocumentBlob) {
      setMessage('Select your ID document type and capture a live photo of your ID/passport using your camera. Uploaded photos are not accepted.');
      setMessageType('error');
      return;
    }

    if (!selfieBlob) {
      setMessage('Capture a live selfie using your camera to verify your identity. Uploaded photos are not accepted.');
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

    const identifierChecks = [
      ['id_number', formData.idNumber.trim()],
      ['payout_account_number', formData.payoutAccountNumber.trim()],
      ['phone_number', formData.phoneNumber.trim()],
      ['email', context.email.trim().toLowerCase()],
    ].filter(([, value]) => value);

    for (const [identifierType, identifierValue] of identifierChecks) {
      const { data: bannedRow, error: bannedCheckError } = await supabase
        .from('banned_identifiers')
        .select('id')
        .eq('identifier_type', identifierType)
        .eq('identifier_value', identifierValue)
        .maybeSingle();

      if (bannedCheckError) {
        setMessage(bannedCheckError.message);
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }

      if (bannedRow) {
        setMessage('This application cannot be processed. Contact support if you believe this is a mistake.');
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }
    }

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

    const storageSegment = sanitizeStorageSegment(context.email);

    const idDocumentPath = `${storageSegment}/id-document-${Date.now()}.png`;
    const { error: idUploadError } = await supabase.storage
      .from(SELLER_VERIFICATION_BUCKET)
      .upload(idDocumentPath, idDocumentBlob, { cacheControl: '3600', upsert: false, contentType: 'image/png' });

    if (idUploadError) {
      setMessage(`ID document upload failed: ${idUploadError.message}. Make sure the ${SELLER_VERIFICATION_BUCKET} bucket exists and allows uploads.`);
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    const selfiePath = `${storageSegment}/selfie-${Date.now()}.png`;
    const { error: selfieUploadError } = await supabase.storage
      .from(SELLER_VERIFICATION_BUCKET)
      .upload(selfiePath, selfieBlob, { cacheControl: '3600', upsert: false, contentType: 'image/png' });

    if (selfieUploadError) {
      setMessage(`Selfie upload failed: ${selfieUploadError.message}. Make sure the ${SELLER_VERIFICATION_BUCKET} bucket exists and allows uploads.`);
      setMessageType('error');
      setIsSubmitting(false);
      return;
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
      id_document_path: idDocumentPath,
      id_document_type: idDocumentType,
      selfie_path: selfiePath,
      selfie_captured_at: new Date().toISOString(),
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

    setMessage('Seller profile submitted. Your application is now pending admin approval...');
    setMessageType('success');

    if (context.pendingSignupDraft) {
      window.localStorage.setItem('svs-authenticated', 'true');
      window.localStorage.setItem('svs-user-email', context.email.trim().toLowerCase());
      window.localStorage.setItem('svs-user-name', context.fullName.trim());
      window.localStorage.setItem('svs-user-contact', context.contactNumber.trim());
      // compliance_status is always 'submitted' for a fresh onboarding
      // submission, so this never actually grants access here — approval
      // only happens once an admin reviews the application.
      if (payload.compliance_status === 'approved') {
        window.localStorage.setItem('svs-has-seller-access', 'true');
        window.localStorage.setItem('svs-seller-home-path', '/seller/dashboard');
      } else {
        window.localStorage.removeItem('svs-has-seller-access');
        window.localStorage.removeItem('svs-seller-home-path');
      }
      clearPendingSellerSignupDraft();
      window.dispatchEvent(new Event('svs-auth-changed'));
    }

    setIsSubmitting(false);

    setTimeout(() => {
      navigate(payload.compliance_status === 'approved' ? '/seller/dashboard' : '/sell/pending-approval');
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

            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--svs-muted)]">Identity Verification</h2>
            <p className="-mt-2 text-xs text-[var(--svs-muted)]">
              Required to confirm you are who you say you are and to keep fake sellers off the platform. Both photos below
              must be taken live with your camera — file uploads are not accepted for either one.
            </p>
            <select
              name="idDocumentType"
              value={idDocumentType}
              onChange={(event) => setIdDocumentType(event.target.value)}
              required
              className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] md:w-1/2"
            >
              <option value="">ID document type</option>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
            </select>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--svs-text)]">
                {idDocumentType === 'passport' ? 'Passport photo' : 'ID document photo'}
              </p>
              <LiveCameraCapture
                previewUrl={idDocumentPreviewUrl}
                isDark={isIdDocumentDark}
                onCapture={handleIdDocumentCapture}
                onRetake={() => { setIdDocumentBlob(null); setIsIdDocumentDark(false); }}
                instructions="Hold your National ID or passport flat inside the frame. Make sure all four corners and the printed details are clearly visible."
                captureLabel="Capture document"
                capturedLabel="Document photo captured"
                capturedHint="Used only to verify your identity."
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--svs-text)]">Live selfie</p>
              <LiveCameraCapture
                previewUrl={selfiePreviewUrl}
                isDark={isSelfieDark}
                onCapture={handleSelfieCapture}
                onRetake={() => { setSelfieBlob(null); setIsSelfieDark(false); }}
                instructions="Look directly at the camera with your face clearly visible and well lit."
                captureLabel="Capture selfie"
                capturedLabel="Live selfie captured"
                capturedHint="Used only to confirm you match your ID document."
              />
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
