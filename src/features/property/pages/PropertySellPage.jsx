import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Trash2, Plus, Building2, ImagePlus, X, Pencil, Calendar, Check } from 'lucide-react';
import { useSmartBack } from '../hooks/useSmartBack';
import {
	AMENITY_OPTIONS,
	AVAILABILITY_OPTIONS,
	AGE_OPTIONS,
	FACING_OPTIONS,
	FURNISHING_OPTIONS,
	PROPERTY_CATEGORIES,
	PROPERTY_STATUSES,
	SELLER_TYPES,
	formatListingPrice,
} from '../data/properties';
import {
	buildSellerListing,
	deleteSellerListing,
	getSellerListings,
	saveSellerListing,
	subscribeToSellerListings,
} from '../data/sellerListings';
import {
	deleteBooking,
	getBookings,
	subscribeToBookings,
	updateBookingStatus,
	useBookingsVersion,
} from '../data/bookings';
import { getBuyerCurrency, useBuyerCurrency } from '../../../lib/buyerCurrency';
import { supabase, hasSupabaseEnv } from '../../../lib/supabase';

const PRICE_CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'INR', 'NGN', 'KES', 'GHS'];
const STORAGE_BUCKET = 'marketplace-items';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const sanitizeStorageSegment = (value) =>
	String(value || 'seller')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'seller';

const readFileAsDataUrl = (file) =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
		reader.readAsDataURL(file);
	});

const initialForm = (defaultCurrency = 'ZAR') => ({
	title: '',
	propertyType: 'Apartment',
	category: 'apartments',
	status: 'For Sale',
	priceNumeric: '',
	priceCurrency: defaultCurrency,
	isRental: false,
	bedrooms: '2',
	sizeNumeric: '',
	location: '',
	city: '',
	country: '',
	streetAddress: '',
	suburb: '',
	postalCode: '',
	province: '',
	landmark: '',
	floor: '',
	totalFloors: '',
	age: 'New',
	furnishing: 'Unfurnished',
	facing: 'N/A',
	availability: 'Available Now',
	gallery: [],
	amenities: [],
	sellerType: 'Owner',
	sellerName: '',
	sellerEmail: '',
	sellerPhone: '',
	about: '',
});

const Field = ({ label, children, required, hint }) => (
	<label className="block">
		<span className="mb-1 block text-xs font-semibold text-[var(--svs-primary-strong)]">
			{label}
			{required && <span className="ml-0.5 text-red-500">*</span>}
		</span>
		{children}
		{hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
	</label>
);

const inputClass =
	'w-full rounded-md border border-[var(--svs-border)] bg-white px-3 py-2 text-sm text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)]';

const PropertySellPage = () => {
	const goBack = useSmartBack('/property-hub');
	const navigate = useNavigate();
	useBuyerCurrency();
	const [form, setForm] = useState(() => initialForm(getBuyerCurrency()));
	const [myListings, setMyListings] = useState(() => getSellerListings());
	const [bookings, setBookings] = useState(() => getBookings());
	const [toast, setToast] = useState(null);
	const [errors, setErrors] = useState({});
	const [uploading, setUploading] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const fileInputRef = useRef(null);
	useBookingsVersion();

	const isEditing = !!editingId;

	const handleImagePick = async (event) => {
		const files = Array.from(event.target.files || []);
		if (event.target) event.target.value = '';
		if (!files.length) return;
		const valid = [];
		for (const f of files) {
			if (!f.type?.startsWith('image/')) {
				setToast({ kind: 'error', text: `"${f.name}" is not an image.` });
				continue;
			}
			if (f.size > MAX_IMAGE_BYTES) {
				setToast({ kind: 'error', text: `"${f.name}" is larger than 5 MB.` });
				continue;
			}
			valid.push(f);
		}
		if (!valid.length) return;
		setUploading(true);
		try {
			const uploadedUrls = [];
			for (const file of valid) {
				if (hasSupabaseEnv && supabase) {
					const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
					const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
					const ownerSegment = sanitizeStorageSegment(form.sellerEmail || form.sellerName || 'anon');
					const filePath = `${ownerSegment}/property/${fileName}`;
					const { error: uploadError } = await supabase.storage
						.from(STORAGE_BUCKET)
						.upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
					if (uploadError) throw uploadError;
					const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
					const publicUrl = publicUrlData?.publicUrl;
					if (!publicUrl) throw new Error('No public URL returned for the uploaded image.');
					uploadedUrls.push(publicUrl);
				} else {
					const dataUrl = await readFileAsDataUrl(file);
					uploadedUrls.push(dataUrl);
				}
			}
			if (uploadedUrls.length) {
				setForm((f) => ({ ...f, gallery: [...(f.gallery || []), ...uploadedUrls] }));
			}
		} catch (err) {
			console.warn('[PropertySellPage] image upload failed', err);
			setToast({
				kind: 'error',
				text: `Image upload failed: ${err?.message || 'unknown error'}. Make sure the ${STORAGE_BUCKET} bucket exists and allows uploads.`,
			});
		} finally {
			setUploading(false);
		}
	};

	const removeGalleryImage = (index) =>
		setForm((f) => ({
			...f,
			gallery: (f.gallery || []).filter((_, i) => i !== index),
		}));

	const makeCoverImage = (index) =>
		setForm((f) => {
			const list = [...(f.gallery || [])];
			if (index <= 0 || index >= list.length) return f;
			const [chosen] = list.splice(index, 1);
			return { ...f, gallery: [chosen, ...list] };
		});

	useEffect(() => {
		const unsubscribe = subscribeToSellerListings(() => {
			setMyListings(getSellerListings());
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		const unsubscribe = subscribeToBookings(() => {
			setBookings(getBookings());
		});
		return unsubscribe;
	}, []);

	const myListingIds = new Set(myListings.map((l) => l.id));
	const myBookings = bookings
		.filter((b) => myListingIds.has(b.listingId))
		.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
	const pendingBookingCount = myBookings.filter((b) => b.status === 'requested').length;

	useEffect(() => {
		if (!toast) return undefined;
		const t = setTimeout(() => setToast(null), 3200);
		return () => clearTimeout(t);
	}, [toast]);

	const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
	const toggleAmenity = (a) =>
		setForm((f) => ({
			...f,
			amenities: f.amenities.includes(a)
				? f.amenities.filter((x) => x !== a)
				: [...f.amenities, a],
		}));

	const validate = () => {
		const next = {};
		if (!form.title.trim()) next.title = 'Title is required';
		if (!form.priceNumeric || Number(form.priceNumeric) <= 0) next.priceNumeric = 'Enter a price';
		if (!form.location.trim()) next.location = 'Location is required';
		if (!form.city.trim()) next.city = 'City is required';
		if (!form.country.trim()) next.country = 'Country is required';
		if (!form.sellerName.trim()) next.sellerName = 'Your name is required';
		if (!form.sellerPhone.trim()) next.sellerPhone = 'Contact phone is required';
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) {
			setToast({ kind: 'error', text: 'Please fix the highlighted fields.' });
			return;
		}
		const listing = buildSellerListing({
			...form,
			priceNumeric: Number(form.priceNumeric),
			sizeNumeric: form.sizeNumeric ? Number(form.sizeNumeric) : 0,
			isRental: form.isRental || form.status === 'For Rent',
		});
		if (editingId) listing.id = editingId;
		try {
			const saved = await saveSellerListing(listing);
			setToast({
				kind: 'success',
				text: editingId
					? 'Listing updated.'
					: 'Listing published — buyers can now see it on the property market.',
				listingId: saved?.id || listing.id,
			});
			setForm(initialForm(getBuyerCurrency()));
			setErrors({});
			setEditingId(null);
			if (typeof window !== 'undefined') {
				window.scrollTo({ top: 0, behavior: 'smooth' });
			}
		} catch (err) {
			setToast({ kind: 'error', text: 'Could not save listing. Please try again.' });
		}
	};

	const handleEdit = (listing) => {
		setEditingId(listing.id);
		setErrors({});
		setForm({
			title: listing.title || '',
			propertyType: listing.propertyType || 'Apartment',
			category: listing.category || 'apartments',
			status: listing.status || 'For Sale',
			priceNumeric: String(listing.priceNumeric ?? ''),
			priceCurrency: listing.priceCurrency || getBuyerCurrency(),
			isRental: !!listing.isRental,
			bedrooms: String(listing.bedrooms ?? '0'),
			sizeNumeric: String(listing.sizeNumeric ?? ''),
			location: listing.location || '',
			city: listing.city || '',
			country: listing.country || '',
			streetAddress: listing.streetAddress || '',
			suburb: listing.suburb || '',
			postalCode: listing.postalCode || '',
			province: listing.province || '',
			landmark: listing.landmark || '',
			floor: listing.floor && listing.floor !== '—' ? listing.floor : '',
			totalFloors: listing.totalFloors || '',
			age: listing.age || 'New',
			furnishing: listing.furnishing || 'Unfurnished',
			facing: listing.facing || 'N/A',
			availability: listing.availability || 'Available Now',
			gallery: Array.isArray(listing.gallery) && listing.gallery.length > 0
				? [...listing.gallery]
				: listing.image
					? [listing.image]
					: [],
			amenities: Array.isArray(listing.amenities) ? [...listing.amenities] : [],
			sellerType: listing.sellerType || 'Owner',
			sellerName: listing.agent?.name || '',
			sellerEmail: listing.agent?.email || listing.sellerEmail || '',
			sellerPhone: listing.agent?.phone || '',
			about: listing.about || '',
		});
		if (typeof window !== 'undefined') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
		setToast({ kind: 'info', text: `Editing "${listing.title}". Update the form and click Update Listing.` });
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setErrors({});
		setForm(initialForm(getBuyerCurrency()));
	};

	const handleDelete = async (id) => {
		if (typeof window !== 'undefined' && !window.confirm('Delete this listing?')) return;
		try {
			await deleteSellerListing(id);
			setToast({ kind: 'success', text: 'Listing removed.' });
		} catch (_err) {
			setToast({ kind: 'error', text: 'Could not delete listing. Please try again.' });
		}
	};

	return (
		<section className="bg-[var(--svs-bg)] px-4 py-8 text-[var(--svs-text)]">
			<div className="mx-auto w-full max-w-5xl">
				{/* HERO */}
				<div className="relative overflow-hidden rounded-2xl">
					<div
						className="h-44 bg-cover bg-center sm:h-52"
						style={{
							backgroundImage:
								"url('https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1600')",
						}}
					/>
					<div className="pointer-events-none absolute inset-0 bg-slate-900/60" />
					<button
						type="button"
						onClick={goBack}
						className="absolute left-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
						aria-label="Back"
					>
						<ArrowLeft className="h-4 w-4" />
					</button>
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
						<div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
							<Building2 className="h-5 w-5" />
						</div>
						<h1 className="text-2xl font-bold sm:text-3xl">
							{isEditing ? 'Edit Your Listing' : 'List Your Property'}
						</h1>
						<p className="mt-2 max-w-2xl text-xs text-white/85 sm:text-sm">
							{isEditing
								? 'Update the details below and save to refresh your listing on the market.'
								: 'Share the details below and your property will go live on the SVS market immediately.'}
						</p>
					</div>
				</div>

				{toast && (
					<div
						className={`mt-4 flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm ${
							toast.kind === 'success'
								? 'border-emerald-200 bg-emerald-50 text-emerald-800'
								: toast.kind === 'info'
									? 'border-amber-200 bg-amber-50 text-amber-800'
									: 'border-red-200 bg-red-50 text-red-700'
						}`}
					>
						<CheckCircle2 className="h-4 w-4" />
						<span className="flex-1">{toast.text}</span>
						{toast.listingId && (
							<Link
								to={`/property-hub/listing/${toast.listingId}`}
								className="font-semibold underline"
							>
								View listing
							</Link>
						)}
					</div>
				)}

				<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
					{/* FORM */}
					<form
						onSubmit={handleSubmit}
						className="rounded-2xl border border-[var(--svs-border)] bg-white p-5 shadow-[0_4px_8px_rgba(0,0,0,0.04)]"
					>
						<h2 className="mb-4 text-base font-bold text-[var(--svs-primary-strong)]">
							Property Details
						</h2>

						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Title" required>
								<input
									className={inputClass}
									value={form.title}
									onChange={(e) => update('title', e.target.value)}
									placeholder="3 BHK apartment in Sandton"
								/>
								{errors.title && <span className="mt-1 block text-xs text-red-500">{errors.title}</span>}
							</Field>

							<Field label="Property Type">
								<select
									className={inputClass}
									value={form.category}
									onChange={(e) => {
										const cat = PROPERTY_CATEGORIES.find((c) => c.key === e.target.value);
										update('category', e.target.value);
										if (cat) update('propertyType', cat.label);
									}}
								>
									{PROPERTY_CATEGORIES.map((c) => (
										<option key={c.key} value={c.key}>
											{c.label}
										</option>
									))}
								</select>
							</Field>

							<Field label="Status">
								<select
									className={inputClass}
									value={form.status}
									onChange={(e) => {
										update('status', e.target.value);
										update('isRental', e.target.value === 'For Rent');
									}}
								>
									{PROPERTY_STATUSES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</Field>

							<Field label="Seller Type">
								<select
									className={inputClass}
									value={form.sellerType}
									onChange={(e) => update('sellerType', e.target.value)}
								>
									{SELLER_TYPES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</Field>

							<Field label="Price" required hint={form.isRental ? 'Per month' : 'Total asking price'}>
								<div className="flex gap-2">
									<select
										className={inputClass + ' max-w-[110px]'}
										value={form.priceCurrency}
										onChange={(e) => update('priceCurrency', e.target.value)}
									>
										{PRICE_CURRENCIES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
									<input
										className={inputClass}
										type="number"
										min="0"
										value={form.priceNumeric}
										onChange={(e) => update('priceNumeric', e.target.value)}
										placeholder="e.g. 2500000"
									/>
								</div>
								{errors.priceNumeric && (
									<span className="mt-1 block text-xs text-red-500">{errors.priceNumeric}</span>
								)}
							</Field>

							<Field label="Bedrooms">
								<input
									className={inputClass}
									type="number"
									min="0"
									value={form.bedrooms}
									onChange={(e) => update('bedrooms', e.target.value)}
								/>
							</Field>

							<Field label="Size (sq ft)">
								<input
									className={inputClass}
									type="number"
									min="0"
									value={form.sizeNumeric}
									onChange={(e) => update('sizeNumeric', e.target.value)}
									placeholder="e.g. 1450"
								/>
							</Field>

							<Field label="Locality / Area" required>
								<input
									className={inputClass}
									value={form.location}
									onChange={(e) => update('location', e.target.value)}
									placeholder="Sandton"
								/>
								{errors.location && (
									<span className="mt-1 block text-xs text-red-500">{errors.location}</span>
								)}
							</Field>

							<Field label="City" required>
								<input
									className={inputClass}
									value={form.city}
									onChange={(e) => update('city', e.target.value)}
									placeholder="Johannesburg"
								/>
								{errors.city && <span className="mt-1 block text-xs text-red-500">{errors.city}</span>}
							</Field>

							<Field label="Country" required>
								<input
									className={inputClass}
									value={form.country}
									onChange={(e) => update('country', e.target.value)}
									placeholder="South Africa"
								/>
								{errors.country && (
									<span className="mt-1 block text-xs text-red-500">{errors.country}</span>
								)}
							</Field>

							<Field label="Street Address" hint="House / unit number and street name">
								<input
									className={inputClass}
									value={form.streetAddress}
									onChange={(e) => update('streetAddress', e.target.value)}
									placeholder="12 Rivonia Road"
								/>
							</Field>

							<Field label="Suburb / Neighbourhood">
								<input
									className={inputClass}
									value={form.suburb}
									onChange={(e) => update('suburb', e.target.value)}
									placeholder="Morningside"
								/>
							</Field>

							<Field label="Province / State">
								<input
									className={inputClass}
									value={form.province}
									onChange={(e) => update('province', e.target.value)}
									placeholder="Gauteng"
								/>
							</Field>

							<Field label="Postal Code">
								<input
									className={inputClass}
									value={form.postalCode}
									onChange={(e) => update('postalCode', e.target.value)}
									placeholder="2196"
								/>
							</Field>

							<div className="sm:col-span-2">
								<Field label="Nearest Landmark" hint="Helps buyers find the property easily">
									<input
										className={inputClass}
										value={form.landmark}
										onChange={(e) => update('landmark', e.target.value)}
										placeholder="Opposite Sandton City Mall"
									/>
								</Field>
							</div>

							<Field label="Floor" hint="e.g. Ground, 1st, 5th">
								<input
									className={inputClass}
									value={form.floor}
									onChange={(e) => update('floor', e.target.value)}
									placeholder="3rd"
								/>
							</Field>

							<Field label="Total Floors in Building">
								<input
									className={inputClass}
									value={form.totalFloors}
									onChange={(e) => update('totalFloors', e.target.value)}
									placeholder="12"
								/>
							</Field>

							<Field label="Property Age">
								<select
									className={inputClass}
									value={form.age}
									onChange={(e) => update('age', e.target.value)}
								>
									{AGE_OPTIONS.map((o) => (
										<option key={o} value={o}>
											{o}
										</option>
									))}
								</select>
							</Field>

							<Field label="Furnishing">
								<select
									className={inputClass}
									value={form.furnishing}
									onChange={(e) => update('furnishing', e.target.value)}
								>
									{FURNISHING_OPTIONS.map((o) => (
										<option key={o} value={o}>
											{o}
										</option>
									))}
								</select>
							</Field>

							<Field label="Facing" hint="Direction the main entrance faces">
								<select
									className={inputClass}
									value={form.facing}
									onChange={(e) => update('facing', e.target.value)}
								>
									{FACING_OPTIONS.map((o) => (
										<option key={o} value={o}>
											{o}
										</option>
									))}
								</select>
							</Field>

							<Field label="Availability">
								<select
									className={inputClass}
									value={form.availability}
									onChange={(e) => update('availability', e.target.value)}
								>
									{AVAILABILITY_OPTIONS.map((o) => (
										<option key={o} value={o}>
											{o}
										</option>
									))}
								</select>
							</Field>

							<div className="sm:col-span-2">
							<Field label="Property Images" hint="Add up to 10 photos. The first image is the cover. PNG or JPG, max 5 MB each.">
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									multiple
									className="hidden"
									onChange={handleImagePick}
								/>
								{form.gallery && form.gallery.length > 0 ? (
									<div className="space-y-3">
										<div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
											{form.gallery.map((url, index) => (
												<div
													key={`${url}-${index}`}
													className={`group relative aspect-square overflow-hidden rounded-md border ${
														index === 0
															? 'border-[var(--svs-primary)] ring-1 ring-[var(--svs-primary)]'
															: 'border-[var(--svs-border)]'
													}`}
												>
													<img
														src={url}
														alt={`Property ${index + 1}`}
														className="h-full w-full object-cover"
													/>
													{index === 0 && (
														<span className="absolute left-1 top-1 rounded bg-[var(--svs-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
															Cover
														</span>
													)}
													<div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 transition group-hover:opacity-100">
														{index !== 0 && (
															<button
																type="button"
																onClick={() => makeCoverImage(index)}
																disabled={uploading}
																className="rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--svs-primary-strong)] shadow-sm hover:bg-white"
																title="Make cover"
															>
																Cover
															</button>
														)}
														<button
															type="button"
															onClick={() => removeGalleryImage(index)}
															disabled={uploading}
															className="ml-auto rounded bg-white/95 p-1 text-red-600 shadow-sm hover:bg-white"
															title="Remove image"
														>
															<X className="h-3 w-3" />
														</button>
													</div>
												</div>
											))}
											{form.gallery.length < 10 && (
												<button
													type="button"
													onClick={() => fileInputRef.current?.click()}
													disabled={uploading}
													className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[var(--svs-border)] bg-white text-[11px] font-medium text-slate-500 transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary-strong)] disabled:opacity-60"
												>
													<Plus className="h-4 w-4" />
													{uploading ? 'Uploading...' : 'Add more'}
												</button>
											)}
										</div>
										<p className="text-[11px] text-slate-500">
											{form.gallery.length} image{form.gallery.length === 1 ? '' : 's'} added.
										</p>
									</div>
								) : (
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={uploading}
										className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[var(--svs-border)] bg-white px-3 py-8 text-xs font-medium text-slate-500 transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary-strong)] disabled:opacity-60"
									>
										<ImagePlus className="h-6 w-6" />
										{uploading ? 'Uploading...' : 'Click to upload property images'}
										<span className="text-[10px] text-slate-400">You can select multiple files</span>
									</button>
								)}
							</Field>
							</div>
						</div>

						<div className="mt-4">
							<span className="mb-2 block text-xs font-semibold text-[var(--svs-primary-strong)]">
								Amenities
							</span>
							<div className="flex flex-wrap gap-2">
								{AMENITY_OPTIONS.map((a) => {
									const active = form.amenities.includes(a);
									return (
										<button
											key={a}
											type="button"
											onClick={() => toggleAmenity(a)}
											className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
												active
													? 'border-[var(--svs-primary)] bg-[var(--svs-primary)] text-white'
													: 'border-[var(--svs-border)] bg-white text-[var(--svs-text)] hover:border-[var(--svs-primary)]'
											}`}
										>
											{a}
										</button>
									);
								})}
							</div>
						</div>

						<div className="mt-4 grid gap-4 sm:grid-cols-2">
							<Field label="Your Name" required>
								<input
									className={inputClass}
									value={form.sellerName}
									onChange={(e) => update('sellerName', e.target.value)}
									placeholder="Jane Doe"
								/>
								{errors.sellerName && (
									<span className="mt-1 block text-xs text-red-500">{errors.sellerName}</span>
								)}
							</Field>

							<Field label="Contact Phone" required>
								<input
									className={inputClass}
									value={form.sellerPhone}
									onChange={(e) => update('sellerPhone', e.target.value)}
									placeholder="+27 11 555 0123"
								/>
								{errors.sellerPhone && (
									<span className="mt-1 block text-xs text-red-500">{errors.sellerPhone}</span>
								)}
							</Field>

							<Field label="Contact Email">
								<input
									className={inputClass}
									type="email"
									value={form.sellerEmail}
									onChange={(e) => update('sellerEmail', e.target.value)}
									placeholder="you@example.com"
								/>
							</Field>
						</div>

						<Field label="About this property">
							<textarea
								className={inputClass}
								rows={4}
								value={form.about}
								onChange={(e) => update('about', e.target.value)}
								placeholder="Tell buyers what makes this property special..."
							/>
						</Field>

						<div className="mt-5 flex flex-wrap gap-2">
							<button
								type="submit"
								className="inline-flex items-center gap-2 rounded-md bg-[var(--svs-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--svs-primary-strong)]"
							>
								{isEditing ? (
									<>
										<Check className="h-4 w-4" /> Update Listing
									</>
								) : (
									<>
										<Plus className="h-4 w-4" /> Publish Listing
									</>
								)}
							</button>
							{isEditing && (
								<button
									type="button"
									onClick={handleCancelEdit}
									className="rounded-md border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:border-amber-400"
								>
									Cancel edit
								</button>
							)}
							<button
								type="button"
								onClick={() => navigate('/property-hub')}
								className="rounded-md border border-[var(--svs-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--svs-text)] hover:border-[var(--svs-primary)]"
							>
								Cancel
							</button>
						</div>
					</form>

					{/* MY LISTINGS */}
					<aside className="rounded-2xl border border-[var(--svs-border)] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.04)]">
						<h2 className="mb-3 text-sm font-bold text-[var(--svs-primary-strong)]">
							My Listings ({myListings.length})
						</h2>
						{myListings.length === 0 ? (
							<p className="text-xs text-slate-500">
								You haven't published any listings yet. Submit the form to add your first property.
							</p>
						) : (
							<ul className="space-y-3">
								{myListings.map((l) => (
									<li
										key={l.id}
										className="flex gap-3 rounded-lg border border-[var(--svs-border)] p-2"
									>
										<img
											src={l.image}
											alt={l.title}
											className="h-16 w-20 flex-shrink-0 rounded-md object-cover"
										/>
										<div className="min-w-0 flex-1">
											<Link
												to={`/property-hub/listing/${l.id}`}
												className="block truncate text-xs font-semibold text-[var(--svs-text)] hover:text-[var(--svs-primary)]"
											>
												{l.title}
											</Link>
											<p className="truncate text-[11px] text-slate-500">{l.location}</p>
											<p className="mt-0.5 text-[11px] font-semibold text-[var(--svs-primary-strong)]">
												{formatListingPrice(l)}
											</p>
										</div>
										<button
											type="button"
											onClick={() => handleEdit(l)}
											className="self-start rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
											aria-label="Edit listing"
											title="Edit"
										>
											<Pencil className="h-3.5 w-3.5" />
										</button>
										<button
											type="button"
											onClick={() => handleDelete(l.id)}
											className="self-start rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
											aria-label="Delete listing"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									</li>
								))}
							</ul>
						)}
					</aside>

					{/* BOOKINGS & ENQUIRIES */}
					<aside className="rounded-2xl border border-[var(--svs-border)] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.04)]">
						<div className="mb-3 flex items-center justify-between">
							<h2 className="text-sm font-bold text-[var(--svs-primary-strong)]">
								Bookings & Enquiries ({myBookings.length})
							</h2>
							{pendingBookingCount > 0 && (
								<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
									{pendingBookingCount} pending
								</span>
							)}
						</div>
						{myBookings.length === 0 ? (
							<p className="text-xs text-slate-500">
								No bookings yet — buyers will appear here when they request a visit or enquire.
							</p>
						) : (
							<ul className="space-y-3">
								{myBookings.map((b) => {
									const statusStyles = {
										requested: 'bg-amber-100 text-amber-800',
										'agent-confirmed': 'bg-blue-100 text-blue-800',
										completed: 'bg-emerald-100 text-emerald-800',
										declined: 'bg-red-100 text-red-700',
										cancelled: 'bg-slate-200 text-slate-700',
									};
									const badgeClass =
										statusStyles[b.status] || 'bg-slate-100 text-slate-700';
									return (
										<li
											key={b.id}
											className="rounded-lg border border-[var(--svs-border)] p-3"
										>
											<div className="flex gap-3">
												{b.listingImage && (
													<img
														src={b.listingImage}
														alt={b.listingTitle || 'Listing'}
														className="h-14 w-16 flex-shrink-0 rounded-md object-cover"
													/>
												)}
												<div className="min-w-0 flex-1">
													<Link
														to={`/property-hub/listing/${b.listingId}`}
														className="block truncate text-xs font-semibold text-[var(--svs-text)] hover:text-[var(--svs-primary)]"
													>
														{b.listingTitle || 'Listing'}
													</Link>
													<p className="truncate text-[11px] text-slate-500">
														{b.name || 'Anonymous buyer'}
														{b.buyerType ? ` · ${b.buyerType}` : ''}
													</p>
													{b.phone && (
														<p className="truncate text-[11px] text-slate-500">{b.phone}</p>
													)}
												</div>
												<span
													className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
												>
													{b.status || 'requested'}
												</span>
											</div>
											{(b.date || b.time || b.reason) && (
												<p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600">
													<Calendar className="h-3 w-3" />
													{b.date || '—'}
													{b.time ? ` at ${b.time}` : ''}
													{b.reason ? ` · ${b.reason}` : ''}
												</p>
											)}
											{b.message && (
												<p className="mt-1 text-[11px] italic text-slate-500">"{b.message}"</p>
											)}
											<div className="mt-2 flex flex-wrap gap-1.5">
												{b.status !== 'agent-confirmed' && b.status !== 'completed' && (
													<button
														type="button"
														onClick={() => updateBookingStatus(b.id, 'agent-confirmed')}
														className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:border-blue-300"
													>
														Confirm
													</button>
												)}
												{b.status !== 'completed' && (
													<button
														type="button"
														onClick={() => updateBookingStatus(b.id, 'completed')}
														className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:border-emerald-300"
													>
														Complete
													</button>
												)}
												{b.status !== 'declined' && b.status !== 'completed' && (
													<button
														type="button"
														onClick={() => updateBookingStatus(b.id, 'declined')}
														className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:border-red-300"
													>
														Decline
													</button>
												)}
												<button
													type="button"
													onClick={() => {
														if (
															typeof window !== 'undefined' &&
															!window.confirm('Remove this booking from your list?')
														)
															return;
														deleteBooking(b.id);
													}}
													className="ml-auto rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
													aria-label="Remove booking"
												>
													<Trash2 className="h-3 w-3" />
												</button>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</aside>
				</div>
			</div>
		</section>
	);
};

export default PropertySellPage;
