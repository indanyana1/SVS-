import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSmartBack } from '../hooks/useSmartBack';
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Building2,
	MapPin,
	Maximize2,
	CheckCircle2,
	Star,
	Phone,
	Heart,
	ShoppingCart,
	Check,
} from 'lucide-react';
import { getListing, PROPERTY_LISTINGS, formatListingPrice } from '../data/properties';
import { useSellerListingsVersion } from '../data/sellerListings';
import { useBuyerCurrency } from '../../../lib/buyerCurrency';
import {
	addToPropertyCart,
	isInPropertyCart,
	isInPropertyWishlist,
	subscribeToPropertyCollections,
	togglePropertyWishlist,
} from '../data/collections';
import PropertyCard from '../components/PropertyCard';
import VisitEnquiryModal from '../components/VisitEnquiryModal';

const Stat = ({ icon: Icon, label, value }) => (
	<div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
		<div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--svs-cyan-surface,#e6f6f8)] text-[var(--svs-primary)]">
			<Icon className="h-3.5 w-3.5" />
		</div>
		<div className="leading-tight">
			<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
			<p className="text-xs font-semibold text-[var(--svs-text)]">{value}</p>
		</div>
	</div>
);

const PropertyDetailPage = () => {
	const { listingId } = useParams();
	const goBack = useSmartBack('/property-hub');
	const [activeImage, setActiveImage] = useState(0);
	const [showVisitModal, setShowVisitModal] = useState(false);
	const [liked, setLiked] = useState(() => isInPropertyWishlist(listingId));
	const [inCart, setInCart] = useState(() => isInPropertyCart(listingId));
	const [contactReveal, setContactReveal] = useState(false);
	useBuyerCurrency();
	useSellerListingsVersion();

	useEffect(() => {
		const unsubscribe = subscribeToPropertyCollections(() => {
			setLiked(isInPropertyWishlist(listingId));
			setInCart(isInPropertyCart(listingId));
		});
		return unsubscribe;
	}, [listingId]);

	const listing = getListing(listingId);
	if (!listing) {
		return (
			<section className="bg-[var(--svs-bg)] px-4 py-16 text-center text-[var(--svs-text)]">
				<p className="text-sm">Property not found.</p>
				<Link to="/property-hub" className="mt-4 inline-block text-[var(--svs-primary)] underline">
					Back to Property Market
				</Link>
			</section>
		);
	}

	const gallery = listing.gallery || [listing.image];
	const similar = PROPERTY_LISTINGS.filter((l) => l.id !== listing.id).slice(0, 3);

	return (
		<section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)]">
			<div className="mx-auto w-full max-w-7xl">
				{/* Hero card */}
				<div className="rounded-2xl bg-[var(--svs-cyan-surface,#eaf6f8)] p-5">
					<button
						type="button"
						onClick={goBack}
						aria-label="Back"
						className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--svs-border)] bg-white text-[var(--svs-text)] shadow-sm transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
					>
						<ArrowLeft className="h-4 w-4" />
					</button>
					<div className="grid gap-5 md:grid-cols-[260px_1fr]">
						<img
							src={gallery[activeImage]}
							alt={listing.title}
							className="h-56 w-full rounded-lg object-cover"
						/>
						<div>
							<div className="flex flex-wrap items-center gap-3">
								<h1 className="text-xl font-bold text-[var(--svs-primary-strong)] sm:text-2xl">
									{listing.title}
								</h1>
								<span className="rounded-full bg-[var(--svs-primary)] px-3 py-0.5 text-[10px] font-semibold uppercase text-white">
									{listing.propertyType}
								</span>
							</div>
							<p className="mt-1 text-sm font-semibold text-[var(--svs-primary-strong)]">{formatListingPrice(listing)}</p>
							<p className="mt-1 flex items-center gap-1 text-xs text-slate-700">
								<Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
								{listing.rating}/5.0
							</p>

							<div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
								<Stat icon={Building2} label="Condition" value={listing.bhk} />
								<Stat icon={Maximize2} label="Area" value={listing.size} />
								<Stat icon={MapPin} label="Location" value={listing.location} />
								<Stat icon={CheckCircle2} label="Availability" value={listing.availability} />
							</div>

							<div className="mt-5 flex flex-wrap gap-2">
								<button
									type="button"
									onClick={() => setShowVisitModal(true)}
									className="rounded-md border border-[var(--svs-primary)] bg-white px-4 py-2 text-xs font-semibold text-[var(--svs-primary-strong)] hover:bg-[var(--svs-primary)] hover:text-white"
								>
									Book Visit
								</button>
								<button
									type="button"
									onClick={() => {
										togglePropertyWishlist(listing);
										setLiked((v) => !v);
									}}
									className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold transition ${
										liked
											? 'border-[var(--svs-primary)] bg-[var(--svs-cyan-surface,#e6f6f8)] text-[var(--svs-primary-strong)]'
											: 'border-[var(--svs-border)] bg-white text-[var(--svs-text)] hover:border-[var(--svs-primary)]'
									}`}
								>
									<Heart className={`h-3.5 w-3.5 ${liked ? 'fill-[var(--svs-primary)] text-[var(--svs-primary)]' : ''}`} />
									{liked ? 'In Wishlist' : 'Add to Wishlist'}
								</button>
								<button
									type="button"
									onClick={() => {
										addToPropertyCart(listing);
										setInCart(true);
									}}
									disabled={inCart}
									className="inline-flex items-center gap-2 rounded-md bg-[var(--svs-primary)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--svs-primary-strong)] disabled:cursor-default disabled:opacity-80"
								>
									{inCart ? <Check className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
									{inCart ? 'Added' : 'Add to Cart'}
								</button>
							</div>
						</div>
					</div>

					{/* Thumbnail strip */}
					<div className="mt-5 flex items-center gap-2">
						<button
							type="button"
							onClick={() => setActiveImage((i) => Math.max(0, i - 1))}
							className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
							{gallery.map((src, idx) => (
								<button
									key={`${src}-${idx}`}
									type="button"
									onClick={() => setActiveImage(idx)}
									className={`overflow-hidden rounded-md border-2 ${
										idx === activeImage ? 'border-[var(--svs-primary)]' : 'border-transparent'
									}`}
								>
									<img src={src} alt="" className="h-14 w-full object-cover" />
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={() => setActiveImage((i) => Math.min(gallery.length - 1, i + 1))}
							className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>

				{/* About */}
				<div className="mt-6 space-y-6">
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">About This Property</h2>
						{listing.about.split('\n\n').map((p, idx) => (
							<p key={idx} className="mt-3 text-sm text-slate-700">{p}</p>
						))}
					</section>

					{/* Highlights */}
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Highlights</h2>
						<ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
							{listing.highlights.map((h) => (
								<li key={h} className="flex items-center gap-2 text-sm text-slate-700">
									<CheckCircle2 className="h-4 w-4 text-[var(--svs-primary)]" />
									{h}
								</li>
							))}
						</ul>
					</section>

					<hr className="border-[var(--svs-border)]" />

					{/* Nearby */}
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Nearby Facilities</h2>
						<div className="mt-3 space-y-4">
							{listing.facilities.map((group) => (
								<div key={group.title} className="flex gap-2">
									<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--svs-primary)]" />
									<div>
										<p className="text-sm font-semibold text-[var(--svs-text)]">{group.title}</p>
										<ul className="mt-1 ml-2 list-disc text-xs text-slate-600">
											{group.items.map((item) => (
												<li key={item}>{item}</li>
											))}
										</ul>
									</div>
								</div>
							))}
						</div>
					</section>

					<hr className="border-[var(--svs-border)]" />

					{/* Property Details Table */}
					<section className="rounded-xl bg-[var(--svs-cyan-surface,#eaf6f8)] p-5">
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Property Details</h2>
						<dl className="mt-3 divide-y divide-white/60 text-sm">
							{[
								['Property Type', listing.propertyType],
								['Floor', listing.totalFloors ? `${listing.floor || '—'} of ${listing.totalFloors}` : listing.floor],
								['Age', listing.age],
								['Furnishing', listing.furnishing],
								['Facing', listing.facing],
								['Availability', listing.availability],
								['Seller Type', listing.sellerType],
							].map(([label, value]) => (
								<div key={label} className="grid grid-cols-2 gap-3 py-2.5">
									<dt className="text-slate-600">{label}</dt>
									<dd className="font-medium text-[var(--svs-text)]">{value || '—'}</dd>
								</div>
							))}
						</dl>
					</section>

					{/* Amenities */}
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Amenities</h2>
						<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
							{listing.amenities.map((a) => (
								<div
									key={a}
									className="flex items-center gap-2 rounded-md border border-[var(--svs-border)] bg-white px-3 py-2 text-xs"
								>
									<span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--svs-cyan-surface,#e6f6f8)] text-[var(--svs-primary)]">
										<CheckCircle2 className="h-3.5 w-3.5" />
									</span>
									<span className="font-medium text-[var(--svs-text)]">{a}</span>
								</div>
							))}
						</div>
					</section>

					<hr className="border-[var(--svs-border)]" />

					{/* Trust & Safety */}
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Trust & Safety</h2>
						<ul className="mt-3 space-y-1.5 text-sm text-slate-700">
							{listing.trustSafety.map((item) => (
								<li key={item} className="flex items-center gap-2">
									<span className="h-2 w-2 rounded-full bg-[var(--svs-primary)]" />
									{item}
								</li>
							))}
						</ul>
					</section>

					<hr className="border-[var(--svs-border)]" />

					{/* Property Location */}
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Property Location</h2>
						<div className="mt-3 grid gap-4 md:grid-cols-[1fr_280px]">
							<div className="text-sm text-slate-700">
								<p className="font-semibold text-[var(--svs-text)]">Property Name</p>
								<p className="mt-1">{listing.title}</p>
								<p className="mt-3 font-semibold text-[var(--svs-text)]">Full Location</p>
								<p className="mt-1 whitespace-pre-line">{listing.fullAddress}</p>
								{listing.landmark && (
									<>
										<p className="mt-3 font-semibold text-[var(--svs-text)]">Nearest Landmark</p>
										<p className="mt-1">{listing.landmark}</p>
									</>
								)}
								{(listing.suburb || listing.postalCode || listing.province) && (
									<>
										<p className="mt-3 font-semibold text-[var(--svs-text)]">Area</p>
										<p className="mt-1">
											{[listing.suburb, listing.province, listing.postalCode]
												.filter(Boolean)
												.join(' · ')}
										</p>
									</>
								)}
							</div>
							<div className="relative h-48 overflow-hidden rounded-lg border border-[var(--svs-border)] sm:h-56">
								{(() => {
									const mapQuery = [
										listing.streetAddress,
										listing.suburb,
										listing.location,
										listing.city,
										listing.province,
										listing.postalCode,
										listing.country,
									]
										.map((s) => (s || '').trim())
										.filter(Boolean)
										.join(', ') || listing.fullAddress || listing.title;
									const encoded = encodeURIComponent(mapQuery);
									return (
										<>
											<iframe
												title={`Map showing ${listing.title}`}
												src={`https://maps.google.com/maps?q=${encoded}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
												className="h-full w-full border-0"
												loading="lazy"
												referrerPolicy="no-referrer-when-downgrade"
											/>
											<a
												href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
												target="_blank"
												rel="noopener noreferrer"
												className="absolute bottom-1 right-1 rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[var(--svs-primary-strong)] shadow hover:bg-white"
											>
												Open in Maps
											</a>
										</>
									);
								})()}
							</div>
						</div>
					</section>

					{/* Contact Seller */}
					<section className="rounded-xl bg-[var(--svs-cyan-surface,#eaf6f8)] p-5">
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Contact Seller</h2>
						<div className="mt-3 flex items-center gap-3">
							<img
								src={listing.agent.avatar}
								alt={listing.agent.name}
								className="h-12 w-12 rounded-full object-cover"
							/>
							<div>
								<p className="text-sm font-semibold text-[var(--svs-text)]">{listing.agent.name}</p>
								<p className="text-xs text-slate-600">{listing.agent.title}</p>
								<p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
									<MapPin className="h-3 w-3" /> {listing.agent.location}
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setContactReveal(true)}
							className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--svs-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
						>
							<Phone className="h-4 w-4" />{' '}
							{contactReveal ? (
								<a href={`tel:${(listing.agent.phone || '').replace(/\s+/g, '')}`} className="underline">
									{listing.agent.phone || 'Contact unavailable'}
								</a>
							) : (
								'Contact Seller'
							)}
						</button>
					</section>

					{/* Similar */}
					<section>
						<h2 className="text-base font-bold text-[var(--svs-primary-strong)]">Similar Products</h2>
						<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{similar.map((s) => (
								<PropertyCard key={s.id} listing={s} />
							))}
						</div>
					</section>
				</div>
			</div>

			<VisitEnquiryModal
				open={showVisitModal}
				onClose={() => setShowVisitModal(false)}
				listing={listing}
			/>
		</section>
	);
};

export default PropertyDetailPage;
