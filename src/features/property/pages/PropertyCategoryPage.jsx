import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSmartBack } from '../hooks/useSmartBack';
import {
	AMENITY_OPTIONS,
	BEDROOM_OPTIONS,
	PRICE_RANGES,
	PROPERTY_CATEGORIES,
	PROPERTY_STATUSES,
	SELLER_TYPES,
	getAllListings,
	getCategory,
	getListingsByCategory,
} from '../data/properties';
import { useSellerListingsVersion } from '../data/sellerListings';
import PropertyCard from '../components/PropertyCard';
import {
	formatInBuyerCurrency,
	useBuyerCurrency,
} from '../../../lib/buyerCurrency';

const Checkbox = ({ label, checked, onChange }) => (
	<label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--svs-text)]">
		<input
			type="checkbox"
			checked={checked}
			onChange={onChange}
			className="h-3.5 w-3.5 rounded border-[var(--svs-border)] text-[var(--svs-primary)] focus:ring-[var(--svs-primary)]"
		/>
		<span>{label}</span>
	</label>
);

const FilterSection = ({ title, children }) => (
	<div className="border-b border-[var(--svs-border)] pb-4">
		<h3 className="mb-3 text-sm font-bold text-[var(--svs-primary-strong)]">{title}</h3>
		<div className="space-y-2">{children}</div>
	</div>
);

const Select = ({ label, value, onChange, options }) => (
	<div>
		<label className="mb-1 block text-[11px] text-slate-600">{label}</label>
		<div className="relative">
			<select
				value={value}
				onChange={onChange}
				className="w-full appearance-none rounded-md border border-[var(--svs-border)] bg-white px-3 py-2 pr-8 text-xs text-[var(--svs-text)]"
			>
				<option value="">Select {label}</option>
				{options.map((o) => (
					<option key={o} value={o}>{o}</option>
				))}
			</select>
			<ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
		</div>
	</div>
);

const PropertyCategoryPage = () => {
	const { categoryKey } = useParams();
	const [searchParams] = useSearchParams();
	const goBack = useSmartBack('/property-hub');
	const category = getCategory(categoryKey) || PROPERTY_CATEGORIES[0];

	const [filters, setFilters] = useState({
		propertyTypes: [],
		statuses: [],
		priceRanges: [],
		country: '',
		city: '',
		area: '',
		bedrooms: [],
		sizeMin: '',
		sizeMax: '',
		amenities: [],
		sellerTypes: [],
	});
	const [pending, setPending] = useState(filters);
	const [searchInput, setSearchInput] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [showFilters, setShowFilters] = useState(false);
	useBuyerCurrency();
	useSellerListingsVersion();

	useEffect(() => {
		const q = searchParams.get('q');
		if (q) {
			setSearchInput(q);
			setSearchTerm(q.trim().toLowerCase());
		}
	}, [searchParams]);

	const priceRangeOptions = useMemo(
		() =>
			PRICE_RANGES.map((r) => {
				const lo = formatInBuyerCurrency(r.min, 'INR', { decimals: 0 });
				const hi =
					r.max === Infinity
						? '+'
						: ` – ${formatInBuyerCurrency(r.max, 'INR', { decimals: 0 })}`;
				return { ...r, displayLabel: `${lo}${hi}` };
			}),
		// re-compute when buyer currency changes — useBuyerCurrency triggers a render
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const toggle = (key, value) =>
		setPending((prev) => {
			const set = new Set(prev[key]);
			set.has(value) ? set.delete(value) : set.add(value);
			return { ...prev, [key]: [...set] };
		});

	const setField = (key, value) => setPending((prev) => ({ ...prev, [key]: value }));

	const applyFilters = () => {
		setFilters(pending);
		setSearchTerm(searchInput.trim().toLowerCase());
		setShowFilters(false);
	};

	const filtered = useMemo(() => {
		// Default to the category's own items; if user is exploring, show all.
		const pool = categoryKey === 'all' ? getAllListings() : getListingsByCategory(category.key);
		return pool.filter((l) => {
			if (filters.propertyTypes.length && !filters.propertyTypes.includes(l.category)) return false;
			if (filters.statuses.length && !filters.statuses.includes(l.status)) return false;
			if (filters.sellerTypes.length && !filters.sellerTypes.includes(l.sellerType)) return false;
			if (filters.bedrooms.length) {
				const tag =
					l.bedrooms >= 4 ? '4+ BHK' : l.bedrooms >= 1 ? `${l.bedrooms} BHK` : null;
				if (!tag || !filters.bedrooms.includes(tag)) return false;
			}
			if (filters.priceRanges.length) {
				const ok = filters.priceRanges.some((key) => {
					const range = PRICE_RANGES.find((r) => r.key === key);
					return range && l.priceNumeric >= range.min && l.priceNumeric <= range.max;
				});
				if (!ok) return false;
			}
			if (filters.sizeMin && l.sizeNumeric < Number(filters.sizeMin)) return false;
			if (filters.sizeMax && l.sizeNumeric > Number(filters.sizeMax)) return false;
			if (filters.country && !l.country?.toLowerCase().includes(filters.country.toLowerCase())) return false;
			if (filters.city && !l.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
			if (filters.area) {
				const needle = filters.area.toLowerCase();
				const hay = `${l.location || ''} ${l.fullAddress || ''}`.toLowerCase();
				if (!hay.includes(needle)) return false;
			}
			if (filters.amenities.length) {
				const listingAmenities = (l.amenities || []).map((a) =>
					typeof a === 'string' ? a.toLowerCase() : String(a?.label || a?.name || '').toLowerCase()
				);
				const hasAll = filters.amenities.every((a) =>
					listingAmenities.some((entry) => entry.includes(a.toLowerCase()))
				);
				if (!hasAll) return false;
			}
			if (searchTerm) {
				const hay = `${l.title || ''} ${l.location || ''} ${l.propertyType || ''} ${l.category || ''} ${l.country || ''}`.toLowerCase();
				if (!hay.includes(searchTerm)) return false;
			}
			return true;
		});
	}, [category.key, categoryKey, filters, searchTerm]);

	return (
		<section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)]">
			<div className="mx-auto w-full max-w-7xl">
				{/* HERO */}
				<div className="relative overflow-hidden rounded-2xl">
					<div
						className="h-44 bg-cover bg-center sm:h-52"
						style={{ backgroundImage: `url('${category.image}')` }}
					/>
					<div className="pointer-events-none absolute inset-0 bg-slate-900/55" />
					<button
						type="button"
						onClick={goBack}
						className="absolute left-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
						aria-label="Back"
					>
						<ArrowLeft className="h-4 w-4" />
					</button>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
						<h1 className="text-2xl font-bold sm:text-3xl">{category.label}</h1>
						<p className="mt-2 max-w-2xl text-xs text-white/85 sm:text-sm">
							{category.heroSubtitle}
						</p>
					</div>
				</div>

				{/* SEARCH */}
				<div className="mx-auto mt-6 max-w-3xl">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							setSearchTerm(searchInput.trim().toLowerCase());
						}}
						className="relative"
					>
						<Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="search"
							value={searchInput}
							onChange={(e) => {
								setSearchInput(e.target.value);
								setSearchTerm(e.target.value.trim().toLowerCase());
							}}
							placeholder="Search by title, location, type..."
							className="w-full rounded-full border border-[var(--svs-border)] bg-white py-2.5 pl-12 pr-4 text-sm outline-none focus:border-[var(--svs-primary)]"
						/>
					</form>
				</div>

				<div className="mt-6 flex items-center justify-between">
					<button
						type="button"
						onClick={() => setShowFilters((v) => !v)}
						className="inline-flex items-center gap-2 rounded-md border border-[var(--svs-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--svs-primary-strong)] hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
						aria-expanded={showFilters}
						aria-controls="property-filter-panel"
					>
						{showFilters ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
						{showFilters ? 'Hide Filters' : 'Show Filters'}
					</button>
					<span className="text-xs text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
				</div>

				<div
					className={`mt-4 grid gap-6 ${
						showFilters ? 'lg:grid-cols-[280px_1fr]' : 'lg:grid-cols-1'
					}`}
				>
					{/* FILTERS */}
					{showFilters && (
					<aside
						id="property-filter-panel"
						className="rounded-2xl border border-[var(--svs-border)] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.04)]"
					>
						<div className="space-y-5">
							<FilterSection title="Property Type">
								<Checkbox
									label="All"
									checked={pending.propertyTypes.length === 0}
									onChange={() => setPending((p) => ({ ...p, propertyTypes: [] }))}
								/>
								{PROPERTY_CATEGORIES.map((c) => (
									<Checkbox
										key={c.key}
										label={c.label}
										checked={pending.propertyTypes.includes(c.key)}
										onChange={() => toggle('propertyTypes', c.key)}
									/>
								))}
							</FilterSection>

							<FilterSection title="Property Status">
								<Checkbox
									label="All"
									checked={pending.statuses.length === 0}
									onChange={() => setPending((p) => ({ ...p, statuses: [] }))}
								/>
								{PROPERTY_STATUSES.map((s) => (
									<Checkbox
										key={s}
										label={s}
										checked={pending.statuses.includes(s)}
										onChange={() => toggle('statuses', s)}
									/>
								))}
							</FilterSection>

							<FilterSection title="Price Range">
								<Checkbox
									label="All"
									checked={pending.priceRanges.length === 0}
									onChange={() => setPending((p) => ({ ...p, priceRanges: [] }))}
								/>
								{priceRangeOptions.map((r) => (
									<Checkbox
										key={r.key}
										label={r.displayLabel}
										checked={pending.priceRanges.includes(r.key)}
										onChange={() => toggle('priceRanges', r.key)}
									/>
								))}
							</FilterSection>

							<FilterSection title="Location">
								<Select
									label="Country"
									value={pending.country}
									onChange={(e) => setField('country', e.target.value)}
									options={['South Africa', 'Kenya', 'Nigeria']}
								/>
								<Select
									label="City"
									value={pending.city}
									onChange={(e) => setField('city', e.target.value)}
									options={['Johannesburg', 'Cape Town', 'Durban', 'Pretoria']}
								/>
								<Select
									label="Area"
									value={pending.area}
									onChange={(e) => setField('area', e.target.value)}
									options={['Sandton', 'Rosebank', 'Camps Bay', 'Menlyn']}
								/>
							</FilterSection>

							<FilterSection title="Bedrooms">
								<Checkbox
									label="All"
									checked={pending.bedrooms.length === 0}
									onChange={() => setPending((p) => ({ ...p, bedrooms: [] }))}
								/>
								{BEDROOM_OPTIONS.map((b) => (
									<Checkbox
										key={b}
										label={b}
										checked={pending.bedrooms.includes(b)}
										onChange={() => toggle('bedrooms', b)}
									/>
								))}
							</FilterSection>

							<FilterSection title="Property Size (Sq. FT.)">
								<div className="flex items-center gap-2">
									<input
										type="number"
										placeholder="Min"
										value={pending.sizeMin}
										onChange={(e) => setField('sizeMin', e.target.value)}
										className="w-full rounded-md border border-[var(--svs-border)] bg-white px-2 py-1.5 text-xs"
									/>
									<span className="text-slate-400">–</span>
									<input
										type="number"
										placeholder="Max"
										value={pending.sizeMax}
										onChange={(e) => setField('sizeMax', e.target.value)}
										className="w-full rounded-md border border-[var(--svs-border)] bg-white px-2 py-1.5 text-xs"
									/>
								</div>
							</FilterSection>

							<FilterSection title="Amenities">
								<Checkbox
									label="All"
									checked={pending.amenities.length === 0}
									onChange={() => setPending((p) => ({ ...p, amenities: [] }))}
								/>
								{AMENITY_OPTIONS.map((a) => (
									<Checkbox
										key={a}
										label={a}
										checked={pending.amenities.includes(a)}
										onChange={() => toggle('amenities', a)}
									/>
								))}
							</FilterSection>

							<FilterSection title="Seller Type">
								<Checkbox
									label="All"
									checked={pending.sellerTypes.length === 0}
									onChange={() => setPending((p) => ({ ...p, sellerTypes: [] }))}
								/>
								{SELLER_TYPES.map((s) => (
									<Checkbox
										key={s}
										label={s}
										checked={pending.sellerTypes.includes(s)}
										onChange={() => toggle('sellerTypes', s)}
									/>
								))}
							</FilterSection>

							<button
								type="button"
								onClick={applyFilters}
								className="w-full rounded-md bg-[var(--svs-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
							>
								Apply Filters
							</button>
						</div>
					</aside>
					)}

					{/* LISTINGS */}
					<div>
						{filtered.length === 0 ? (
							<div className="rounded-xl border border-dashed border-[var(--svs-border)] bg-white p-10 text-center text-sm text-slate-500">
								No properties match your filters.
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2">
								{filtered.map((listing) => (
									<PropertyCard key={listing.id} listing={listing} />
								))}
							</div>
						)}

						<div className="mt-8 flex justify-center">
							<Link
								to="/property-hub"
								className="rounded-md bg-[var(--svs-primary)] px-10 py-2.5 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
							>
								View All
							</Link>
						</div>
					</div>
				</div>

				{/* FEATURED & HOT DEALS */}
				<section className="relative mt-12 overflow-hidden rounded-2xl bg-[#0d2a33] px-6 py-10 text-white">
					<div
						className="absolute inset-0 bg-cover bg-center opacity-30"
						style={{
							backgroundImage:
								"url('https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg?auto=compress&cs=tinysrgb&w=1600')",
						}}
					/>
					<div className="absolute inset-0 bg-gradient-to-b from-[#0d2a33]/85 to-[#0d2a33]/95" />
					<div className="relative">
						<h2 className="text-lg font-bold">Featured Properties & Hot Deals</h2>
						<div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{getAllListings().slice(0, 3).map((listing) => (
								<PropertyCard key={`feat-${listing.id}`} listing={listing} />
							))}
						</div>
					</div>
				</section>
			</div>
		</section>
	);
};

export default PropertyCategoryPage;
