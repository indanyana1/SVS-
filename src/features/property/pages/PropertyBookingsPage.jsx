import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MessageCircle } from 'lucide-react';
import { useSmartBack } from '../hooks/useSmartBack';
import { getBookingsForBuyer, updateBookingStatus, useBookingsVersion } from '../data/bookings';
import { getListing } from '../data/properties';
import { useBuyerCurrency } from '../../../lib/buyerCurrency';

const STATUS_STYLES = {
	requested: 'bg-amber-100 text-amber-800',
	'agent-confirmed': 'bg-blue-100 text-blue-800',
	completed: 'bg-emerald-100 text-emerald-800',
	declined: 'bg-red-100 text-red-700',
	cancelled: 'bg-slate-200 text-slate-700',
};

const getCurrentBuyerEmail = () => {
	if (typeof window === 'undefined') return '';
	try {
		return (window.localStorage.getItem('svs-user-email') || '').trim().toLowerCase();
	} catch (_err) {
		return '';
	}
};

// Buyer-facing "My Bookings" — tracks every visit/enquiry the signed-in buyer
// has requested against Property Hub listings. No payment is involved; this
// is purely a status tracker fed by the same real property_bookings table
// the seller's "Bookings & Enquiries" panel (PropertySellPage) already reads.
const PropertyBookingsPage = () => {
	const navigate = useNavigate();
	const goBack = useSmartBack('/property-hub');
	useBuyerCurrency();
	useBookingsVersion();
	const [cancellingId, setCancellingId] = useState('');

	const buyerEmail = getCurrentBuyerEmail();
	const bookings = getBookingsForBuyer(buyerEmail).sort((a, b) =>
		String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
	);

	const handleCancel = async (id) => {
		if (typeof window !== 'undefined' && !window.confirm('Cancel this visit request?')) return;
		setCancellingId(id);
		try {
			await updateBookingStatus(id, 'cancelled');
		} catch (_err) {
			/* non-fatal — bookings.js already keeps the optimistic cache in sync */
		}
		setCancellingId('');
	};

	const goToSellerChat = (booking) => {
		const listing = getListing(booking.listingId);
		const recipientEmail = listing?.agent?.email || listing?.sellerEmail || booking.sellerEmail || '';
		const recipientName = listing?.agent?.name || 'Seller';
		navigate('/support/chat', {
			state: {
				recipientEmail,
				recipientName,
				recipientRole: 'seller',
				issueType: 'Item Enquiry',
				itemKey: booking.listingId,
				itemTitle: booking.listingTitle,
				itemImage: booking.listingImage || '',
				itemLink: `/property-hub/listing/${booking.listingId}`,
				draftMessage: `Hi, following up on my visit request for ${booking.listingTitle || 'your property'}${booking.date ? ` on ${booking.date}` : ''}.`,
			},
		});
	};

	if (!buyerEmail) {
		return (
			<section className="bg-[var(--svs-bg)] px-4 py-16 text-center text-[var(--svs-text)]">
				<p className="text-sm">Sign in to see the property visits and enquiries you've booked.</p>
				<Link
					to="/signin"
					className="mt-4 inline-block rounded-md bg-[var(--svs-primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
				>
					Sign In
				</Link>
			</section>
		);
	}

	return (
		<section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)]">
			<div className="mx-auto w-full max-w-3xl">
				<button
					type="button"
					onClick={goBack}
					className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--svs-primary)] hover:underline"
				>
					<ArrowLeft className="h-4 w-4" /> Back
				</button>

				<div className="border-b border-[var(--svs-border)] pb-4">
					<h1 className="text-xl font-bold text-[var(--svs-primary-strong)] sm:text-2xl">My Bookings</h1>
					<p className="mt-1 text-xs text-slate-500">
						Track the property visits and enquiries you've requested. No payment is involved — contact the seller
						separately to finalize details.
					</p>
				</div>

				{bookings.length === 0 ? (
					<div className="mt-6 rounded-xl border border-dashed border-[var(--svs-border)] bg-white p-8 text-center text-sm text-slate-500">
						No bookings yet — book a visit from any listing on the Property Market to see it tracked here.
					</div>
				) : (
					<ul className="mt-6 space-y-3">
						{bookings.map((b) => (
							<li key={b.id} className="rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
								<div className="flex gap-3">
									{b.listingImage ? (
										<img
											src={b.listingImage}
											alt={b.listingTitle || 'Listing'}
											className="h-16 w-20 shrink-0 rounded-lg object-cover"
										/>
									) : null}
									<div className="min-w-0 flex-1">
										<Link
											to={`/property-hub/listing/${b.listingId}`}
											className="block truncate text-sm font-bold text-[var(--svs-text)] hover:text-[var(--svs-primary)]"
										>
											{b.listingTitle || 'Listing'}
										</Link>
										<p className="truncate text-xs text-slate-500">{b.listingLocation}</p>
										<p className="mt-1 text-xs text-slate-500">
											Booking ID: <span className="font-mono">{b.id}</span>
										</p>
									</div>
									<span
										className={`self-start rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
											STATUS_STYLES[b.status] || 'bg-slate-100 text-slate-700'
										}`}
									>
										{(b.status || 'requested').replace(/-/g, ' ')}
									</span>
								</div>

								<div className="mt-3 grid gap-1 text-sm text-[var(--svs-text)] sm:grid-cols-2">
									<p className="flex items-center gap-1.5">
										<Calendar className="h-3.5 w-3.5" /> {b.date || '—'}
										{b.time ? ` at ${b.time}` : ''}
									</p>
									{b.reason ? (
										<p>
											<span className="font-semibold">Reason:</span> {b.reason}
										</p>
									) : null}
								</div>
								{b.message ? <p className="mt-2 text-sm italic text-slate-500">&quot;{b.message}&quot;</p> : null}

								<div className="mt-3 flex flex-wrap gap-2">
									<Link
										to={`/bookings/property/${b.id}/track`}
										className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--svs-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--svs-text)] hover:border-[var(--svs-primary)]"
									>
										Track Booking
									</Link>
									<button
										type="button"
										onClick={() => goToSellerChat(b)}
										className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--svs-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
									>
										<MessageCircle className="h-3.5 w-3.5" /> Discuss in Chat
									</button>
									{b.status !== 'completed' && b.status !== 'declined' && b.status !== 'cancelled' ? (
										<button
											type="button"
											disabled={cancellingId === b.id}
											onClick={() => handleCancel(b.id)}
											className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
										>
											{cancellingId === b.id ? 'Cancelling…' : 'Cancel Booking'}
										</button>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
};

export default PropertyBookingsPage;
