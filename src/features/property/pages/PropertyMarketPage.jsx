import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, ShoppingCart } from 'lucide-react';
import {
	PROPERTY_CATEGORIES,
	getTrending,
} from '../data/properties';
import { useSellerListingsVersion } from '../data/sellerListings';
import PropertyCard from '../components/PropertyCard';
import WhyShopWithUs from '../components/WhyShopWithUs';

const PropertyMarketPage = () => {
	useSellerListingsVersion();
	const trending = getTrending(3);
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState('');

	const handleSearchSubmit = (e) => {
		e.preventDefault();
		const q = searchQuery.trim();
		const target = q
			? `/property-hub/category/all?q=${encodeURIComponent(q)}`
			: '/property-hub/category/all';
		navigate(target);
	};

	return (
		<section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)]">
			{/* HERO */}
			<div className="mx-auto w-full max-w-7xl">
				<div className="relative overflow-hidden rounded-2xl">
					<div
						className="h-56 bg-cover bg-center sm:h-64"
						style={{
							backgroundImage:
								"url('https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=1600')",
						}}
					/>
					<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/55 to-slate-900/70" />
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
						<h1 className="text-2xl font-bold sm:text-3xl">Property Market</h1>
						<p className="mt-2 max-w-2xl text-xs text-white/85 sm:text-sm">
							Explore verified properties for buying, renting, or investing across prime locations, ensuring safe and reliable transactions every time.
						</p>
					</div>
				</div>

				{/* SEARCH BAR */}
				<div className="mx-auto mt-6 max-w-3xl">
					<form onSubmit={handleSearchSubmit} className="relative">
						<Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search for city, locality, or Projects..."
							className="w-full rounded-full border border-[var(--svs-border)] bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-[var(--svs-primary)]"
						/>
					</form>
				</div>

				{/* EXPLORE BY CATEGORY */}
				<div className="mt-8">
					<div className="mb-5 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--svs-primary)] text-white">
							<ShoppingCart className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-[var(--svs-primary-strong)]">
								Explore By Category
							</h2>
							<p className="text-xs text-slate-500">
								Find the perfect property type that matches your needs
							</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{PROPERTY_CATEGORIES.map((category) => (
							<Link
								key={category.key}
								to={`/property-hub/category/${category.key}`}
								className="group overflow-hidden rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.05)] transition hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
							>
								<div className="h-32 overflow-hidden">
									<img
										src={category.image}
										alt={category.label}
										className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
										loading="lazy"
										onError={(e) => {
											e.currentTarget.onerror = null;
											e.currentTarget.src =
												'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200';
										}}
									/>
								</div>
								<div className="bg-[var(--svs-primary)] px-3 py-2.5 text-center text-white">
									<p className="text-sm font-semibold">{category.label}</p>
									<p className="text-[10px] text-white/80">{category.subtitle}</p>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* TRENDING */}
				<div className="mt-12">
					<div className="text-center">
						<h2 className="text-xl font-bold text-[var(--svs-primary-strong)]">
							Trending Properties
						</h2>
						<p className="mt-1 text-xs text-slate-500">
							Handpicked favorites from our customers
						</p>
					</div>
					<div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{trending.map((listing) => (
							<PropertyCard key={listing.id} listing={listing} />
						))}
					</div>
					<div className="mt-8 flex justify-center">
						<Link
							to="/property-hub/category/apartments"
							className="rounded-md bg-[var(--svs-primary)] px-10 py-2.5 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
						>
							View All
						</Link>
					</div>
				</div>

				<WhyShopWithUs />
			</div>
		</section>
	);
};

export default PropertyMarketPage;
