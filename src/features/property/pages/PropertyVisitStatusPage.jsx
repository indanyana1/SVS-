import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import {
	Calendar,
	CheckCircle2,
	Clock,
	MapPin,
	Phone,
	User,
} from 'lucide-react';
import { getListing, formatListingPrice } from '../data/properties';
import { useBuyerCurrency } from '../../../lib/buyerCurrency';

const STAGES = [
	{ key: 'request', label: 'Request Sent' },
	{ key: 'agent-confirmed', label: 'Agent Confirmed' },
	{ key: 'visit-scheduled', label: 'Visit Scheduled' },
	{ key: 'visit-completed', label: 'Visit Completed' },
	{ key: 'follow-up', label: 'Follow-Up' },
];

const PropertyVisitStatusPage = () => {
	const { listingId } = useParams();
	const goBack = useSmartBack('/property-hub');
	const listing = getListing(listingId);
	useBuyerCurrency();

	const booking = useMemo(() => {
		try {
			const raw = window.sessionStorage.getItem(`property-visit:${listingId}`);
			if (raw) return JSON.parse(raw);
		} catch (_err) {
			/* ignore */
		}
		return null;
	}, [listingId]);

	if (!listing) {
		return (
			<section className="bg-[var(--svs-bg)] px-4 py-16 text-center">
				<p>Property not found.</p>
			</section>
		);
	}

	// Determine which stage the booking is currently at.
	const currentStageIndex = (() => {
		const status = booking?.status || 'agent-confirmed';
		const idx = STAGES.findIndex((s) => s.key === status);
		return idx === -1 ? 1 : idx;
	})();

	return (
		<section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)]">
			<div className="mx-auto w-full max-w-3xl">
				<div className="border-b border-[var(--svs-border)] pb-4 text-center">
					<h1 className="text-xl font-bold text-[var(--svs-primary-strong)] sm:text-2xl">
						Visit Status
					</h1>
					<p className="mt-1 text-xs text-slate-500">Track your property visit requests.</p>
				</div>

				{/* Property Details */}
				<section className="mt-5 rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
					<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">Property Details</h2>
					<div className="mt-3 flex items-start gap-3">
						<img
							src={listing.image}
							alt={listing.title}
							className="h-16 w-20 rounded-md object-cover"
						/>
						<div className="text-xs text-slate-700">
							<p className="font-bold text-[var(--svs-text)]">{listing.title}</p>
							<p>{listing.location}</p>
							<p>{listing.propertyType}</p>
							<p className="text-[var(--svs-primary-strong)]">{formatListingPrice(listing)}</p>
							<p className="text-slate-500">Agent: {listing.agent.name}</p>
						</div>
					</div>
				</section>

				{/* Visit Details */}
				<section className="mt-4 rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
					<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">Visit Details</h2>
					<div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
						<div>
							<p className="font-semibold">Booking ID</p>
							<p className="text-slate-600">{booking?.id || 'BK20260318'}</p>
						</div>
						<div>
							<p className="font-semibold">Request Date</p>
							<p className="text-slate-600">March 20, 2026</p>
						</div>
						<div>
							<p className="font-semibold flex items-center gap-1">
								<Calendar className="h-3 w-3" /> Scheduled Visit
							</p>
							<p className="text-slate-600">
								{booking?.date || 'March 25, 2026'} {booking?.time || '3:00 PM'} – 4:00 PM
							</p>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-semibold flex items-center gap-1">
									<Clock className="h-3 w-3" /> Visit Mode
								</p>
								<p className="text-slate-600">In-Person</p>
							</div>
							<span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-semibold text-emerald-700">
								Confirmed
							</span>
						</div>
					</div>
				</section>

				{/* Location & Instructions */}
				<section className="mt-4 rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
					<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">Visit Location & Instructions</h2>
					<div className="mt-3 space-y-2 text-xs text-slate-700">
						<p className="font-semibold flex items-center gap-1">
							<MapPin className="h-3 w-3 text-[var(--svs-primary)]" /> Property Address
						</p>
						<p>{listing.fullAddress}</p>
						<p className="mt-2 font-semibold">Entry Instructions</p>
						<p>Please use the main entrance and inform the security desk. A property manager will escort you to the apartment.</p>
						<p className="mt-2 font-semibold">Contact for Assistance</p>
						<p>Security Desk · +27 21 555 0142</p>
					</div>
					<div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
						Keep this in handy because you can pre-confirm in the day of visit-time arrival.
					</div>
				</section>

				{/* Notes */}
				<section className="mt-4 rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
					<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">Notes & Requirements</h2>
					<div className="mt-3 space-y-3 text-xs text-slate-700">
						<div>
							<p className="font-semibold flex items-center gap-1">
								<User className="h-3 w-3" /> Your Notes
							</p>
							<p className="rounded-md bg-slate-50 p-2">
								Interested in viewing the master bedroom storage and looking into Vaastu for the layout. Maintenance charges and amenities.
							</p>
						</div>
						<div>
							<p className="font-semibold flex items-center gap-1">
								<CheckCircle2 className="h-3 w-3 text-[var(--svs-primary)]" /> Agent Remarks
							</p>
							<p className="rounded-md bg-slate-50 p-2">
								Property has new finishes including paint, carpet and balcony fully operational. We will provide complete maintenance breakdown during visit.
							</p>
						</div>
					</div>
				</section>

				{/* Booking Status Timeline */}
				<section className="mt-4 rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
					<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">Booking Status</h2>
					<ol className="mt-4 space-y-3">
						{STAGES.map((stage, idx) => {
							const done = idx < currentStageIndex;
							const active = idx === currentStageIndex;
							return (
								<li key={stage.key} className="flex items-center gap-3">
									<span
										className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
											done || active
												? 'bg-[var(--svs-primary)] text-white'
												: 'bg-slate-200 text-slate-500'
										}`}
									>
										{idx + 1}
									</span>
									<div className="flex-1 rounded-md border border-[var(--svs-border)] bg-white px-3 py-2">
										<p className="text-xs font-semibold text-[var(--svs-text)]">{stage.label}</p>
										<p className="text-[10px] text-slate-500">
											{done ? 'Completed' : active ? 'In progress' : 'Pending'}
										</p>
									</div>
								</li>
							);
						})}
					</ol>
				</section>

				{/* Actions */}
				<section className="mt-4 rounded-xl border border-[var(--svs-border)] bg-white p-4 shadow-sm">
					<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">Actions</h2>
					<div className="mt-3 space-y-2">
						<button
							type="button"
							className="w-full rounded-md bg-[var(--svs-primary)] py-2 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
						>
							Reschedule Visit
						</button>
						<button
							type="button"
							className="w-full rounded-md bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
						>
							<Phone className="mr-1 inline h-3.5 w-3.5" /> Contact Agent
						</button>
						<button
							type="button"
							className="w-full rounded-md border border-red-300 bg-white py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
						>
							Cancel Booking
						</button>
					</div>
				</section>

				<div className="mt-6 flex justify-center gap-3">
					<Link
						to="/property-hub"
						className="rounded-md bg-[var(--svs-primary)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
					>
						Back Home
					</Link>
					<button
						type="button"
						onClick={goBack}
						className="rounded-md border border-[var(--svs-border)] bg-white px-6 py-2 text-sm font-semibold text-[var(--svs-text)] hover:border-[var(--svs-primary)]"
					>
						Cancel
					</button>
				</div>
			</div>
		</section>
	);
};

export default PropertyVisitStatusPage;
