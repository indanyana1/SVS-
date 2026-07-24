// Nursery listings data layer.
//
// Source-of-truth: Supabase table `nursery_listings`.
// Synchronous cache: localStorage (so the page renders instantly).
// Subscribers: same-tab CustomEvent + cross-tab storage event.
// Powerful search: local fuzzy + token-weighted scoring + remote ilike fan-out
// against Supabase so newly-listed items still surface even if not yet cached.

import { useEffect, useState } from 'react';
import { supabase, hasSupabaseEnv } from '../../../lib/supabase';
import { normalize, scoreField, tokenize } from '../../../lib/powerSearch';

const STORAGE_KEY = 'svs-nursery-listings';
const CHANGE_EVENT = 'svs-nursery-listings-change';
const TABLE = 'nursery_listings';

// ── Seed data ────────────────────────────────────────────────────────────
// Used when the user has no cached data yet and Supabase is empty/unreachable.
// Prices are expressed in ZAR (the marketplace's default listing currency).

export const NURSERY_SEED_ITEMS = [
	{
		id: 'nr1',
		title: 'Lavender Hidcote — Herb',
		categoryId: 'herbs',
		category: 'Herbs',
		species: 'Lavandula angustifolia "Hidcote"',
		careLevel: 'Easy',
		lightRequirement: 'Full Sun',
		wateringFrequency: 'Weekly',
		potPlantSize: '15cm pot',
		suitableFor: 'Both',
		petSafe: 'No',
		location: 'Cape Town',
		summary: 'Care: Easy • Light: Full Sun',
		description: 'Compact lavender with deep purple flowers and strong fragrance. Excellent for borders, pots, and herbal teas. Drought-tolerant once established.',
		price: 85,
		currency: 'ZAR',
		rating: 4.9,
		reviewCount: 212,
		quantity: 40,
		image: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-15T00:00:00Z',
	},
	{
		id: 'nr2',
		title: 'Rosa Chinensis — Miniature Rose',
		categoryId: 'flowers',
		category: 'Small Flowers',
		species: 'Rosa chinensis minima',
		careLevel: 'Moderate',
		lightRequirement: 'Full Sun',
		wateringFrequency: 'Every 2-3 days',
		potPlantSize: '20cm pot',
		suitableFor: 'Both',
		petSafe: 'No',
		location: 'Johannesburg North',
		summary: 'Care: Moderate • Light: Full Sun',
		description: 'Vibrant red miniature roses, perfect for balconies and windowsills. Long-lasting blooms throughout spring and summer.',
		price: 120,
		currency: 'ZAR',
		rating: 4.7,
		reviewCount: 178,
		quantity: 25,
		image: 'https://images.pexels.com/photos/56866/garden-rose-red-pink-56866.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-14T00:00:00Z',
	},
	{
		id: 'nr3',
		title: 'Moringa Sapling — 60cm',
		categoryId: 'saplings',
		category: 'Saplings',
		species: 'Moringa oleifera',
		careLevel: 'Easy',
		lightRequirement: 'Full Sun',
		wateringFrequency: 'Weekly',
		potPlantSize: '60cm sapling',
		suitableFor: 'Outdoors',
		petSafe: 'Yes',
		location: 'Limpopo',
		summary: 'Care: Easy • Light: Full Sun',
		description: 'Fast-growing miracle tree, drought-resistant. Leaves are edible and nutrient-rich. Excellent for food forests and large gardens.',
		price: 220,
		currency: 'ZAR',
		rating: 4.8,
		reviewCount: 95,
		quantity: 15,
		image: 'https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-13T00:00:00Z',
	},
	{
		id: 'nr4',
		title: 'Tomato Cherry Seedling Tray (×6)',
		categoryId: 'vegetable-starts',
		category: 'Vegetable Starts',
		species: 'Solanum lycopersicum (Cherry)',
		careLevel: 'Easy',
		lightRequirement: 'Full Sun',
		wateringFrequency: 'Daily',
		potPlantSize: 'Tray of 6 seedlings',
		suitableFor: 'Outdoors',
		petSafe: 'Yes',
		location: 'Western Cape',
		summary: 'Care: Easy • Light: Full Sun',
		description: 'Ready-to-plant cherry tomato seedlings. Prolific producers. Ideal for home vegetable gardens and containers.',
		price: 65,
		currency: 'ZAR',
		rating: 4.9,
		reviewCount: 310,
		quantity: 80,
		image: 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-12T00:00:00Z',
	},
	{
		id: 'nr5',
		title: 'Heirloom Sunflower Seed Packet',
		categoryId: 'seeds',
		category: 'Seeds',
		species: 'Helianthus annuus',
		careLevel: 'Easy',
		lightRequirement: 'Full Sun',
		wateringFrequency: 'Every 2-3 days',
		potPlantSize: '25 seeds per packet',
		suitableFor: 'Outdoors',
		petSafe: 'Yes',
		location: 'Gauteng',
		summary: 'Care: Easy • Light: Full Sun',
		description: 'Open-pollinated heirloom sunflower seeds growing 1.5–2m tall. Great for cutting gardens and attracting pollinators.',
		price: 35,
		currency: 'ZAR',
		rating: 4.8,
		reviewCount: 430,
		quantity: 200,
		image: 'https://images.pexels.com/photos/33044/sunflower-sun-summer-yellow.jpg?auto=compress&cs=tinysrgb&w=1200',
		sellerEmail: '',
		createdAt: '2025-01-11T00:00:00Z',
	},
	{
		id: 'nr6',
		title: 'Ficus Hedge Shrub — Pair',
		categoryId: 'shrubs',
		category: 'Shrubs',
		species: 'Ficus benjamina',
		careLevel: 'Moderate',
		lightRequirement: 'Partial Shade',
		wateringFrequency: 'Weekly',
		potPlantSize: 'Pair of 1m shrubs',
		suitableFor: 'Both',
		petSafe: 'No',
		location: 'KwaZulu-Natal',
		summary: 'Care: Moderate • Light: Partial Shade',
		description: 'Dense-growing ficus ideal for privacy hedging. Sold as a pair. Tolerates trimming well and can be shaped for formal hedges.',
		price: 380,
		currency: 'ZAR',
		rating: 4.6,
		reviewCount: 67,
		quantity: 10,
		image: 'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=1200',
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
	species: row.species || '',
	careLevel: row.care_level || '',
	lightRequirement: row.light_requirement || '',
	wateringFrequency: row.watering_frequency || '',
	potPlantSize: row.pot_plant_size || '',
	suitableFor: row.suitable_for || '',
	petSafe: row.pet_safe || '',
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

export const getListings = () => {
	const cached = safeRead();
	if (!cached.length) return [...NURSERY_SEED_ITEMS];
	return dedupeById([...cached, ...NURSERY_SEED_ITEMS]);
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
			console.warn('[nursery/listings] hydrate failed', err);
			return getListings();
		} finally {
			hydratePromise = null;
		}
	})();
	return hydratePromise;
};

// ── Remote search fan-out ────────────────────────────────────────────────

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
					`species.ilike.${pattern}`,
					`care_level.ilike.${pattern}`,
					`light_requirement.ilike.${pattern}`,
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
		console.warn('[nursery/listings] remote search failed', err);
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

const buildSearchBag = (item) => ({
	title: normalize(item.title),
	category: normalize(item.category),
	species: normalize(item.species),
	careLevel: normalize(item.careLevel),
	lightRequirement: normalize(item.lightRequirement),
	location: normalize(item.location),
	summary: normalize(item.summary),
	description: normalize(item.description),
});

// Search + filter + rank.
// options: { categoryId, careLevel, lightRequirement, suitableFor, minPrice, maxPrice, sort }
export const searchListings = (items, query, options = {}) => {
	const {
		categoryId = null,
		careLevel = null,
		lightRequirement = null,
		suitableFor = null,
		minPrice = null,
		maxPrice = null,
		sort = 'relevance',
	} = options;

	const tokens = tokenize(query);
	const filtered = [];

	for (const item of items || []) {
		if (categoryId && item.categoryId !== categoryId) continue;
		if (careLevel && item.careLevel !== careLevel) continue;
		if (lightRequirement && item.lightRequirement !== lightRequirement) continue;
		if (suitableFor && item.suitableFor !== suitableFor) continue;
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
				scoreField(bag.species, token, 8) +
				scoreField(bag.category, token, 6) +
				scoreField(bag.careLevel, token, 5) +
				scoreField(bag.lightRequirement, token, 5) +
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
		return (a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return String(b.item.createdAt || '').localeCompare(String(a.item.createdAt || ''));
		};
	})();

	return filtered.sort(comparator).map(({ item }) => item);
};
