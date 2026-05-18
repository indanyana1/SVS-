import { Link } from 'react-router-dom';
import { Heart, MapPin, Home as HomeIcon, Maximize2, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBuyerCurrency } from '../../../lib/buyerCurrency';
import { formatListingPrice } from '../data/properties';
import {
	isInPropertyWishlist,
	subscribeToPropertyCollections,
	togglePropertyWishlist,
} from '../data/collections';

const PropertyCard = ({ listing, to }) => {
	const [liked, setLiked] = useState(() => isInPropertyWishlist(listing.id));
	useBuyerCurrency(); // re-render when buyer currency changes
	const target = to || `/property-hub/listing/${listing.id}`;

	useEffect(() => {
		const unsubscribe = subscribeToPropertyCollections(() => {
			setLiked(isInPropertyWishlist(listing.id));
		});
		return unsubscribe;
	}, [listing.id]);

	const handleToggleWishlist = (e) => {
		e.preventDefault();
		e.stopPropagation();
		togglePropertyWishlist(listing);
		setLiked((v) => !v);
	};

	return (
		<article className="overflow-hidden rounded-2xl border border-[#eeeeee] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_20px_rgba(0,0,0,0.1)]">
			<div className="relative">
				<img
					src={listing.image}
					alt={listing.title}
					loading="lazy"
					className="h-44 w-full object-cover"
					onError={(e) => {
						e.currentTarget.onerror = null;
						e.currentTarget.src =
							'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200';
					}}
				/>
				<button
					type="button"
					onClick={handleToggleWishlist}
					className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow"
					aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
				>
					<Heart
						className={`h-4 w-4 ${liked ? 'fill-[var(--svs-primary)] text-[var(--svs-primary)]' : 'text-slate-700'}`}
					/>
				</button>
			</div>
			<div className="p-4">
				<h3 className="text-sm font-bold text-[var(--svs-text)]">{listing.title}</h3>
				<span className="mt-1 inline-block rounded-md bg-[var(--svs-cyan-surface,#e6f6f8)] px-2 py-0.5 text-xs font-semibold text-[var(--svs-primary-strong)]">
					{formatListingPrice(listing)}
				</span>
				<ul className="mt-3 space-y-1.5 text-xs text-slate-600">
					<li className="flex items-center gap-2">
						<MapPin className="h-3.5 w-3.5 text-[var(--svs-primary)]" />
						{listing.location}
					</li>
					<li className="flex items-center gap-2">
						<HomeIcon className="h-3.5 w-3.5 text-[var(--svs-primary)]" />
						{listing.bhk}
					</li>
					<li className="flex items-center gap-2">
						<Maximize2 className="h-3.5 w-3.5 text-[var(--svs-primary)]" />
						{listing.size}
					</li>
					<li className="flex items-center gap-2">
						<Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
						<span className="text-slate-700">
							{listing.rating} ({listing.reviews} reviews)
						</span>
					</li>
				</ul>
				<Link
					to={target}
					className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-[var(--svs-primary)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--svs-primary-strong)]"
				>
					View Details
				</Link>
			</div>
		</article>
	);
};

export default PropertyCard;
