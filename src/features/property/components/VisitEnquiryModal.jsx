import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BUYER_TYPES = ['Individual', 'Family', 'Investor', 'Agent / Dealer'];
const REASONS = ['Investment', 'Self-use', 'Rental income', 'Re-sale'];

const VisitEnquiryModal = ({ open, onClose, listing }) => {
	const navigate = useNavigate();
	const [form, setForm] = useState({
		buyerType: '',
		reason: '',
		name: '',
		phone: '',
		date: '',
		time: '',
	});

	useEffect(() => {
		if (!open) setForm({ buyerType: '', reason: '', name: '', phone: '', date: '', time: '' });
	}, [open]);

	if (!open) return null;

	const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

	const submit = (e) => {
		e.preventDefault();
		// Persist a lightweight booking record so the status page has data.
		try {
			const booking = {
				id: `booking-${Date.now()}`,
				listingId: listing.id,
				...form,
				createdAt: new Date().toISOString(),
				status: 'agent-confirmed',
			};
			window.sessionStorage.setItem(`property-visit:${listing.id}`, JSON.stringify(booking));
		} catch (_err) {
			/* sessionStorage unavailable — non-fatal */
		}
		onClose?.();
		navigate(`/property-hub/visit/${listing.id}`);
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
			<form
				onSubmit={submit}
				className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl"
			>
				<div className="flex items-center justify-between">
					<h2 className="text-base font-bold text-[var(--svs-text)]">
						Send visit detail and enquiry to Dealer
					</h2>
					<button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
						<X className="h-4 w-4" />
					</button>
				</div>
				<div className="mt-5 space-y-4">
					<div>
						<label className={labelCls}>You are</label>
						<select required value={form.buyerType} onChange={update('buyerType')} className={inputCls}>
							<option value="">e.g. Individual</option>
							{BUYER_TYPES.map((opt) => (
								<option key={opt} value={opt}>{opt}</option>
							))}
						</select>
					</div>
					<div>
						<label className={labelCls}>Your reason to buy is</label>
						<select required value={form.reason} onChange={update('reason')} className={inputCls}>
							<option value="">e.g. Investment</option>
							{REASONS.map((opt) => (
								<option key={opt} value={opt}>{opt}</option>
							))}
						</select>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label className={labelCls}>Name</label>
							<input required value={form.name} onChange={update('name')} placeholder="Enter your name" className={inputCls} />
						</div>
						<div>
							<label className={labelCls}>Phone Number</label>
							<input required value={form.phone} onChange={update('phone')} placeholder="Enter your number" className={inputCls} />
						</div>
						<div>
							<label className={labelCls}>Visit Date</label>
							<input required type="date" value={form.date} onChange={update('date')} className={inputCls} />
						</div>
						<div>
							<label className={labelCls}>Visit Time</label>
							<input required type="time" value={form.time} onChange={update('time')} className={inputCls} />
						</div>
					</div>
				</div>
				<div className="mt-6 flex justify-between gap-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-[var(--svs-border)] bg-white px-6 py-2 text-sm font-semibold text-[var(--svs-text)]"
					>
						Cancel
					</button>
					<button
						type="submit"
						className="rounded-md bg-[var(--svs-primary)] px-8 py-2 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
					>
						Submit
					</button>
				</div>
			</form>
		</div>
	);
};

export default VisitEnquiryModal;
