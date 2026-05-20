import { useEffect, useState } from 'react';
import { X, Heart, ShoppingCart } from 'lucide-react';
import { saveIntent } from '../data/propertyIntents';
import {
	addToPropertyCart,
	togglePropertyWishlist,
} from '../data/collections';

const getCurrentUserEmail = () => {
	if (typeof window === 'undefined') return '';
	try {
		return (window.localStorage.getItem('svs-user-email') || '').trim();
	} catch (_err) {
		return '';
	}
};

/**
 * Modal collecting buyer contact details when they "Reserve" or "Buy"
 * a property. Persists to Supabase via saveIntent so the seller can see
 * the request in their dashboard.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - listing: property listing object
 *  - intentType: 'reserve' | 'buy'
 *  - onSubmitted: (intent) => void   (called after successful submit)
 */
const BuyerIntentModal = ({ open, onClose, listing, intentType = 'reserve', onSubmitted }) => {
	const isBuy = intentType === 'buy';
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });

	useEffect(() => {
		if (open) {
			setError('');
			setForm((prev) => ({
				...prev,
				email: prev.email || getCurrentUserEmail() || '',
			}));
		}
	}, [open]);

	if (!open) return null;

	const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

	const submit = async (e) => {
		e.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setError('');

		const intent = {
			id: `intent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
			listingId: listing?.id,
			listingTitle: listing?.title || '',
			listingImage: listing?.image || '',
			listingLocation: listing?.location || listing?.city || '',
			listingPrice: listing?.price || '',
			sellerEmail:
				listing?.sellerEmail ||
				listing?.agent?.email ||
				listing?.agentEmail ||
				'',
			buyerEmail: form.email || getCurrentUserEmail() || '',
			name: form.name,
			phone: form.phone,
			intentType,
			message: form.message,
			status: 'new',
			createdAt: new Date().toISOString(),
		};

		try {
			const saved = await saveIntent(intent);
			// Mirror to the buyer's local collections so the heart / cart state
			// on the detail page reflects the action immediately.
			try {
				if (isBuy) {
					addToPropertyCart(listing);
				} else {
					// togglePropertyWishlist flips; only call if not already there.
					togglePropertyWishlist(listing);
				}
			} catch (_e) {
				/* non-fatal */
			}
			onSubmitted?.(saved || intent);
			onClose?.();
		} catch (err) {
			setError(err?.message || 'Could not submit. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	const labelCls = 'mb-1 block text-xs font-semibold text-[var(--svs-text)]';
	const inputCls =
		'w-full rounded-md border border-[var(--svs-border)] bg-white px-3 py-2 text-sm text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)]';

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
			role="dialog"
			aria-modal="true"
		>
			<form onSubmit={submit} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="flex items-center gap-2 text-base font-bold text-[var(--svs-text)]">
							{isBuy ? (
								<ShoppingCart className="h-4 w-4 text-[var(--svs-primary)]" />
							) : (
								<Heart className="h-4 w-4 text-[var(--svs-primary)]" />
							)}
							{isBuy ? 'I shall buy it' : 'Reserve it for me'}
						</h2>
						<p className="mt-1 text-xs text-slate-500">
							{isBuy
								? 'Send the seller your firm purchase intent — they will contact you to finalise.'
								: 'Place a soft hold on this property — the seller will reach out to confirm.'}
						</p>
						{listing?.title && (
							<p className="mt-1 truncate text-[11px] font-medium text-[var(--svs-primary-strong)]">
								{listing.title}
							</p>
						)}
					</div>
					<button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="mt-5 space-y-3">
					<div>
						<label className={labelCls}>Your Name</label>
						<input
							required
							value={form.name}
							onChange={update('name')}
							placeholder="e.g. Sipho Khumalo"
							className={inputCls}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label className={labelCls}>Phone Number</label>
							<input
								required
								type="tel"
								value={form.phone}
								onChange={update('phone')}
								placeholder="e.g. +27 82 555 0142"
								className={inputCls}
							/>
						</div>
						<div>
							<label className={labelCls}>Email</label>
							<input
								required
								type="email"
								value={form.email}
								onChange={update('email')}
								placeholder="you@example.com"
								className={inputCls}
							/>
						</div>
					</div>
					<div>
						<label className={labelCls}>Message <span className="font-normal text-slate-400">(optional)</span></label>
						<textarea
							value={form.message}
							onChange={update('message')}
							rows={3}
							placeholder={
								isBuy
									? 'Tell the seller your preferred payment / occupation date.'
									: 'How long do you need to decide? Any questions?'
							}
							className={inputCls}
						/>
					</div>
				</div>

				{error && (
					<p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
				)}

				<div className="mt-6 flex justify-between gap-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-[var(--svs-border)] bg-white px-5 py-2 text-sm font-semibold text-[var(--svs-text)]"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={submitting}
						className="rounded-md bg-[var(--svs-primary)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)] disabled:opacity-60"
					>
						{submitting ? 'Sending…' : isBuy ? 'Send buy request' : 'Send reservation'}
					</button>
				</div>
			</form>
		</div>
	);
};

export default BuyerIntentModal;
