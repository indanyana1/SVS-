// Livestock listings data layer.
//
// Source-of-truth: Supabase table `livestock_listings`.
// Synchronous cache: localStorage (so the page renders instantly).
// Subscribers: same-tab CustomEvent + cross-tab storage event.
// Powerful search: local fuzzy + token-weighted scoring + remote ilike fan-out
// against Supabase so newly-listed items still surface even if not yet cached.

import { useEffect, useState } from 'react';
import { supabase, hasSupabaseEnv } from '../../../lib/supabase';
import { normalize, scoreField, tokenize } from '../../../lib/powerSearch';

const STORAGE_KEY = 'svs-livestock-listings';
const CHANGE_EVENT = 'svs-livestock-listings-change';
const TABLE = 'livestock_listings';

// ── Seed data ────────────────────────────────────────────────────────────
// Used when the user has no cached data yet and Supabase is empty/unreachable.
// Prices are expressed in ZAR (the marketplace's default listing currency).

export const LIVESTOCK_SEED_ITEMS = [
	{
		id: 'ls1',
		title: 'Holstein Friesian Dairy Cow',
		categoryId: 'cattle',
		category: 'Cattle',
		breed: 'Holstein Friesian',
		gender: 'Female',
		healthStatus: 'Vaccinated',
		purpose: 'Dairy',
		age: '3 years',
		weight: '550 kg',
		location: 'Gauteng',
		summary: 'Age: 3 years • Weight: 550 kg',
		description:
			'Healthy dairy cow with regular vet checks and milk yield records. Vaccinated and tagged.',
		price: 85000,
		currency: 'ZAR',
		rating: 4.8,
		reviewCount: 145,
		quantity: 1,
		image:
			'https://images.pexels.com/photos/735968/pexels-photo-735968.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-15T00:00:00Z',
	},
	{
		id: 'ls2',
		title: 'Large White Breeding Sow',
		categoryId: 'pigs',
		category: 'Pigs & Swine',
		breed: 'Large White',
		gender: 'Female',
		healthStatus: 'Vaccinated',
		purpose: 'Breeding',
		age: '18 months',
		weight: '180 kg',
		location: 'North West Province',
		summary: 'Age: 18 months • Weight: 180 kg',
		description:
			'Healthy breeding sow with proven litter records. Vaccinated, dewormed, and ready for breeding.',
		price: 18500,
		currency: 'ZAR',
		rating: 4.7,
		reviewCount: 58,
		quantity: 1,
		image:
			'https://images.pexels.com/photos/2226449/pexels-photo-2226449.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-14T00:00:00Z',
	},
	{
		id: 'ls3',
		title: 'Dorper Sheep Breeding Ewe',
		categoryId: 'sheep',
		category: 'Sheep & Lambs',
		breed: 'Dorper',
		gender: 'Female',
		healthStatus: 'Vaccinated',
		purpose: 'Beef / Meat',
		age: '2 years',
		weight: '55 kg',
		location: 'KwaZulu-Natal',
		summary: 'Age: 2 years • Weight: 55 kg',
		description:
			'Hardy meat breed. Tagged, dewormed, ready for breeding season.',
		price: 12000,
		currency: 'ZAR',
		rating: 4.8,
		reviewCount: 145,
		quantity: 0,
		image:
			'https://images.pexels.com/photos/288621/pexels-photo-288621.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-13T00:00:00Z',
	},
	{
		id: 'ls4',
		title: 'Boer Goat Starter Herd',
		categoryId: 'goats',
		category: 'Goats',
		breed: 'Boer',
		gender: 'Mixed Herd',
		healthStatus: 'Vaccinated',
		purpose: 'Beef / Meat',
		age: '2 years',
		weight: '45 kg',
		location: 'Limpopo Farm Belt',
		summary: 'Age: 2 years • Weight: 45 kg',
		description: '5 goats, tagged, delivery support available.',
		price: 14500,
		currency: 'ZAR',
		rating: 4.7,
		reviewCount: 92,
		quantity: 5,
		image:
			'https://images.pexels.com/photos/144240/goat-lamb-little-grass-144240.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-12T00:00:00Z',
	},
	{
		id: 'ls5',
		title: 'Free-Range Layer Hens',
		categoryId: 'birds',
		category: 'Birds & Poultry',
		breed: 'Layer Hen',
		gender: 'Female',
		healthStatus: 'Vaccinated',
		purpose: 'Eggs',
		age: '6 months',
		weight: '2 kg',
		location: 'Western Cape',
		summary: 'Age: 6 months • Weight: 2 kg',
		description: 'Free-range egg layers. Vaccinated. Sold in flocks of 10+.',
		price: 180,
		currency: 'ZAR',
		rating: 4.6,
		reviewCount: 64,
		quantity: 25,
		image:
			'https://images.pexels.com/photos/1300355/pexels-photo-1300355.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-11T00:00:00Z',
	},
	{
		id: 'ls6',
		title: 'Arabian Riding Horse',
		categoryId: 'horses',
		category: 'Horses & Donkeys',
		breed: 'Arabian',
		gender: 'Male',
		healthStatus: 'Health Certificate Available',
		purpose: 'Riding / Racing',
		age: '5 years',
		weight: '450 kg',
		location: 'Mpumalanga',
		summary: 'Age: 5 years • Weight: 450 kg',
		description:
			'Well-trained for riding. Excellent temperament. Full medical history.',
		price: 180000,
		currency: 'ZAR',
		rating: 4.9,
		reviewCount: 38,
		quantity: 1,
		image:
			'https://images.pexels.com/photos/52500/horse-herd-fog-nature-52500.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-10T00:00:00Z',
	},
];

// ── Storage helpers ──────────────────────────────────────────────────────

const safeRead = () => {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch (_err) {
		return [];
	}
};

const safeWrite = (list) => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
		window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
	} catch (_err) {
		/* ignore */
	}
};

// ── Row mapping (Supabase <-> client) ────────────────────────────────────

const rowToListing = (row) => ({
	id: row.id,
	title: row.title || '',
	categoryId: row.category_id || '',
	category: row.category || '',
	breed: row.breed || '',
	gender: row.gender || '',
	healthStatus: row.health_status || '',
	purpose: row.purpose || '',
	age: row.age || '',
	weight: row.weight || '',
	location: row.location || '',
	summary: row.summary || '',
	description: row.description || '',
	price: Number(row.price) || 0,
	currency: row.currency || 'ZAR',
	rating: Number(row.rating) || 0,
	reviewCount: Number(row.review_count) || 0,
	quantity: row.quantity == null ? null : Number(row.quantity) || 0,
	image: row.image || '',
	sellerEmail: row.seller_email || '',
	createdAt: row.created_at,
});

const dedupeById = (items) => {
	const map = new Map();
	for (const item of items) {
		if (item && item.id != null) map.set(item.id, item);
	}
	return Array.from(map.values());
};

// ── Public reads ─────────────────────────────────────────────────────────

// Returns seed + cached items, deduped by id (cache wins).
export const getListings = () => {
	const cached = safeRead();
	if (!cached.length) return [...LIVESTOCK_SEED_ITEMS];
	return dedupeById([...cached, ...LIVESTOCK_SEED_ITEMS]);
};

export const getListingById = (id) =>
	getListings().find((item) => item.id === id) || null;

// ── Hydration ────────────────────────────────────────────────────────────

let hydratePromise = null;

export const hydrateListings = () => {
	if (!hasSupabaseEnv || !supabase) return Promise.resolve(getListings());
	if (hydratePromise) return hydratePromise;
	hydratePromise = (async () => {
		try {
			const { data, error } = await supabase
				.from(TABLE)
				.select('*')
				.order('created_at', { ascending: false })
				.limit(500);
			if (error) throw error;
			const list = (data || []).map(rowToListing);
			if (list.length) safeWrite(list);
			return list;
		} catch (err) {
			console.warn('[livestock/listings] hydrate failed', err);
			return getListings();
		} finally {
			hydratePromise = null;
		}
	})();
	return hydratePromise;
};

// ── Remote search fan-out ────────────────────────────────────────────────
// For non-trivial queries, ask Supabase for any matching rows we don't have
// cached yet. Results are merged into the local cache so subsequent renders
// (and the next page load) can show them instantly.

export const remoteSearchListings = async (query) => {
	const q = (query || '').trim();
	if (!q || !hasSupabaseEnv || !supabase) return [];
	const safe = q.replace(/[%,()]/g, ' ').trim();
	if (!safe) return [];
	try {
		const pattern = `%${safe}%`;
		const { data, error } = await supabase
			.from(TABLE)
			.select('*')
			.or(
				[
					`title.ilike.${pattern}`,
					`category.ilike.${pattern}`,
					`breed.ilike.${pattern}`,
					`location.ilike.${pattern}`,
					`summary.ilike.${pattern}`,
					`description.ilike.${pattern}`,
				].join(','),
			)
			.limit(50);
		if (error) throw error;
		const found = (data || []).map(rowToListing);
		if (found.length) {
			const merged = dedupeById([...found, ...safeRead()]);
			safeWrite(merged);
		}
		return found;
	} catch (err) {
		console.warn('[livestock/listings] remote search failed', err);
		return [];
	}
};

// ── Subscriptions ────────────────────────────────────────────────────────

export const subscribeToListings = (callback) => {
	if (typeof window === 'undefined') return () => {};
	const handler = () => {
		try {
			callback();
		} catch (_err) {
			/* ignore */
		}
	};
	const onStorage = (event) => {
		if (!event || event.key === STORAGE_KEY || event.key === null) handler();
	};
	window.addEventListener(CHANGE_EVENT, handler);
	window.addEventListener('storage', onStorage);
	return () => {
		window.removeEventListener(CHANGE_EVENT, handler);
		window.removeEventListener('storage', onStorage);
	};
};

export const useListingsVersion = () => {
	const [version, setVersion] = useState(0);
	useEffect(() => subscribeToListings(() => setVersion((v) => v + 1)), []);
	return version;
};

// ── Power search ─────────────────────────────────────────────────────────
// Primitives live in lib/powerSearch.js so every market shares the same logic.

// Build the searchable bag for an item once (memoize per-call).
const buildSearchBag = (item) => ({
	title: normalize(item.title),
	category: normalize(item.category),
	breed: normalize(item.breed),
	location: normalize(item.location),
	summary: normalize(item.summary),
	description: normalize(item.description),
});

// Search + filter + rank.
// - items:    array from getListings()
// - query:    raw search string
// - options:  { categoryId, minPrice, maxPrice, sort: 'relevance' | 'price-asc' | 'price-desc' | 'newest' }
export const searchListings = (items, query, options = {}) => {
	const { categoryId = null, minPrice = null, maxPrice = null, sort = 'relevance' } =
		options;
	const tokens = tokenize(query);
	const filtered = [];

	for (const item of items || []) {
		if (categoryId && item.categoryId !== categoryId) continue;
		const numericPrice = Number(item.price) || 0;
		if (minPrice != null && numericPrice < minPrice) continue;
		if (maxPrice != null && numericPrice > maxPrice) continue;

		if (!tokens.length) {
			filtered.push({ item, score: 0 });
			continue;
		}

		const bag = buildSearchBag(item);
		let total = 0;
		let allTokensMatched = true;
		for (const token of tokens) {
			const tokenScore =
				scoreField(bag.title, token, 10) +
				scoreField(bag.breed, token, 8) +
				scoreField(bag.category, token, 6) +
				scoreField(bag.location, token, 6) +
				scoreField(bag.summary, token, 3) +
				scoreField(bag.description, token, 3);
			if (tokenScore <= 0) {
				allTokensMatched = false;
				break;
			}
			total += tokenScore;
		}
		if (allTokensMatched) filtered.push({ item, score: total });
	}

	const comparator = (() => {
		if (sort === 'price-asc') return (a, b) => (Number(a.item.price) || 0) - (Number(b.item.price) || 0);
		if (sort === 'price-desc') return (a, b) => (Number(b.item.price) || 0) - (Number(a.item.price) || 0);
		if (sort === 'newest')
			return (a, b) => String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || ''));
		// Default: relevance — higher score first, then newer first.
		return (a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || ''));
		};
	})();

	return filtered.sort(comparator).map(({ item }) => item);
};
