// Seller-submitted property listings.
//
// Storage strategy: Supabase `property_listings` table is the source of truth
// when the env is configured. We mirror the result into localStorage so the
// existing synchronous buyer helpers (getAllListings, getListing, getTrending
// in properties.js) keep working without an async refactor across every
// caller. When Supabase is unavailable we fall back to localStorage only.

import { useEffect, useState } from 'react';
import { supabase, hasSupabaseEnv } from '../../../lib/supabase';

const STORAGE_KEY = 'svs-seller-property-listings';
const CHANGE_EVENT = 'svs-seller-property-listings-change';
const TABLE = 'property_listings';

const safeRead = () => {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch (_e) {
		return [];
	}
};

const safeWrite = (list) => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	} catch (_e) {
		// ignore quota issues
	}
	try {
		window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
	} catch (_e) {
		/* ignore */
	}
};

// ---- Supabase <-> UI shape mappers -------------------------------------------------

const rowToListing = (row) => {
	if (!row) return null;
	return {
		id: row.id,
		title: row.title,
		propertyType: row.property_type,
		category: row.category,
		status: row.status,
		isRental: !!row.is_rental,
		price: row.price_label || `${row.price_currency || 'INR'} ${row.price_numeric || 0}`,
		priceNumeric: Number(row.price_numeric) || 0,
		priceCurrency: row.price_currency || 'INR',
		bedrooms: Number(row.bedrooms) || 0,
		bhk: row.bhk || '',
		size: row.size_label || '—',
		sizeNumeric: Number(row.size_numeric) || 0,
		location: row.location || '',
		city: row.city || '',
		country: row.country || '',
		fullAddress: row.full_address || '',
		image: row.image || '',
		gallery: Array.isArray(row.gallery) ? row.gallery : [],
		amenities: Array.isArray(row.amenities) ? row.amenities : [],
		about: row.about || '',
		highlights: Array.isArray(row.highlights) ? row.highlights : [],
		facilities: Array.isArray(row.facilities) ? row.facilities : [],
		trustSafety: Array.isArray(row.trust_safety) ? row.trust_safety : [],
		availability: row.availability || 'Available Now',
		facing: row.facing || 'N/A',
		floor: row.floor || '—',
		age: row.age || 'New',
		furnishing: row.furnishing || 'Unfurnished',
		rating: Number(row.rating) || 0,
		reviews: Number(row.reviews) || 0,
		sellerType: row.seller_type || 'Owner',
		sellerEmail: row.seller_email || '',
		agent: {
			name: row.agent_name || 'SVS Seller',
			phone: row.agent_phone || '',
			email: row.agent_email || '',
			badge: row.agent_badge || 'Verified Seller',
		},
		isSellerListing: true,
		createdAt: row.created_at || new Date().toISOString(),
	};
};

const listingToRow = (l) => ({
	id: l.id,
	title: l.title,
	property_type: l.propertyType,
	category: l.category,
	status: l.status,
	is_rental: !!l.isRental,
	price_numeric: Number(l.priceNumeric) || 0,
	price_currency: l.priceCurrency || 'INR',
	price_label: l.price || null,
	bedrooms: Number(l.bedrooms) || 0,
	bhk: l.bhk || null,
	size_label: l.size || null,
	size_numeric: Number(l.sizeNumeric) || 0,
	location: l.location || null,
	city: l.city || null,
	country: l.country || null,
	full_address: l.fullAddress || null,
	image: l.image || null,
	gallery: Array.isArray(l.gallery) ? l.gallery : [],
	amenities: Array.isArray(l.amenities) ? l.amenities : [],
	about: l.about || null,
	highlights: Array.isArray(l.highlights) ? l.highlights : [],
	facilities: Array.isArray(l.facilities) ? l.facilities : [],
	trust_safety: Array.isArray(l.trustSafety) ? l.trustSafety : [],
	availability: l.availability || null,
	facing: l.facing || null,
	floor: l.floor || null,
	age: l.age || null,
	furnishing: l.furnishing || null,
	rating: Number(l.rating) || 0,
	reviews: Number(l.reviews) || 0,
	seller_type: l.sellerType || null,
	seller_email: l.sellerEmail || l.agent?.email || null,
	agent_name: l.agent?.name || null,
	agent_phone: l.agent?.phone || null,
	agent_email: l.agent?.email || null,
	agent_badge: l.agent?.badge || 'Verified Seller',
});

// ---- Sync cache API (used by buyer pages via properties.js) ------------------------

export const getSellerListings = () => safeRead();

export const getSellerListing = (id) =>
	safeRead().find((l) => l.id === id) || null;

// ---- Hydration from Supabase -------------------------------------------------------

let hydratePromise = null;

export const hydrateSellerListings = () => {
	if (!hasSupabaseEnv || !supabase) return Promise.resolve(safeRead());
	if (hydratePromise) return hydratePromise;
	hydratePromise = supabase
		.from(TABLE)
		.select('*')
		.order('created_at', { ascending: false })
		.then(({ data, error }) => {
			hydratePromise = null;
			if (error) {
				// eslint-disable-next-line no-console
				console.warn('[SVS] property_listings hydrate failed:', error.message);
				return safeRead();
			}
			const list = (data || []).map(rowToListing).filter(Boolean);
			safeWrite(list);
			return list;
		})
		.catch((err) => {
			hydratePromise = null;
			// eslint-disable-next-line no-console
			console.warn('[SVS] property_listings hydrate threw:', err);
			return safeRead();
		});
	return hydratePromise;
};

// ---- Mutations: optimistic local write + Supabase upsert/delete --------------------

export const saveSellerListing = async (listing) => {
	// optimistic local write so the buyer UI updates instantly
	const list = safeRead();
	const existing = list.findIndex((l) => l.id === listing.id);
	if (existing >= 0) list[existing] = { ...list[existing], ...listing };
	else list.unshift(listing);
	safeWrite(list);

	if (!hasSupabaseEnv || !supabase) return listing;

	const { data, error } = await supabase
		.from(TABLE)
		.upsert(listingToRow(listing))
		.select()
		.single();
	if (error) {
		// eslint-disable-next-line no-console
		console.warn('[SVS] property_listings upsert failed:', error.message);
		return listing;
	}
	const hydrated = rowToListing(data) || listing;
	// reconcile cache with server-confirmed record
	const after = safeRead();
	const idx = after.findIndex((l) => l.id === hydrated.id);
	if (idx >= 0) after[idx] = hydrated;
	else after.unshift(hydrated);
	safeWrite(after);
	return hydrated;
};

export const deleteSellerListing = async (id) => {
	const next = safeRead().filter((l) => l.id !== id);
	safeWrite(next);
	if (hasSupabaseEnv && supabase) {
		const { error } = await supabase.from(TABLE).delete().eq('id', id);
		if (error) {
			// eslint-disable-next-line no-console
			console.warn('[SVS] property_listings delete failed:', error.message);
		}
	}
	return next;
};

// ---- Change notifications ----------------------------------------------------------

export const subscribeToSellerListings = (callback) => {
	if (typeof window === 'undefined') return () => {};
	const handler = () => callback();
	const storageHandler = (e) => {
		if (e.key === STORAGE_KEY) handler();
	};
	window.addEventListener(CHANGE_EVENT, handler);
	window.addEventListener('storage', storageHandler);
	return () => {
		window.removeEventListener(CHANGE_EVENT, handler);
		window.removeEventListener('storage', storageHandler);
	};
};

// React hook: returns a monotonically increasing version that bumps whenever a
// seller listing is added/removed. Also triggers a one-shot Supabase hydrate
// on mount so the freshest server data lands in the local cache.
export const useSellerListingsVersion = () => {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		hydrateSellerListings().then(() => setVersion((v) => v + 1));
		return subscribeToSellerListings(() => setVersion((v) => v + 1));
	}, []);
	return version;
};

// Build a hydrated listing record that matches the shape used by the buyer UI
// (cards, category page, detail page).
export const buildSellerListing = ({
	title,
	propertyType,
	category,
	status,
	priceNumeric,
	priceCurrency,
	isRental,
	bedrooms,
	sizeNumeric,
	location,
	city,
	country,
	image,
	gallery,
	amenities,
	sellerType,
	sellerName,
	sellerEmail,
	sellerPhone,
	about,
}) => {
	const numericBedrooms = Number(bedrooms) || 0;
	const bhk =
		numericBedrooms >= 4
			? '4+ BHK'
			: numericBedrooms >= 1
				? `${numericBedrooms} BHK`
				: 'Studio';
	const sizeNum = Number(sizeNumeric) || 0;
	const id = `seller-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 7)}`;
	const fallbackImage =
		'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200';
	const galleryList = Array.isArray(gallery)
		? gallery.map((u) => String(u || '').trim()).filter(Boolean)
		: [];
	const cleanImage = (image || '').trim() || galleryList[0] || fallbackImage;
	const finalGallery = galleryList.length ? galleryList : [cleanImage];
	return {
		id,
		title: title?.trim() || 'Untitled Property',
		propertyType: propertyType || 'Apartment',
		category: category || 'apartments',
		status: status || 'For Sale',
		// raw display label (rarely used now — buyer UI re-formats via priceCurrency)
		price: `${priceCurrency || 'INR'} ${priceNumeric || 0}`,
		priceNumeric: Number(priceNumeric) || 0,
		priceCurrency: priceCurrency || 'INR',
		isRental: !!isRental,
		bedrooms: numericBedrooms,
		bhk,
		size: sizeNum ? `${sizeNum} sq ft` : '—',
		sizeNumeric: sizeNum,
		location: location?.trim() || '',
		city: city?.trim() || '',
		country: country?.trim() || '',
		fullAddress: `${location || ''}${city ? `, ${city}` : ''}${country ? `, ${country}` : ''}`.replace(/^,\s*/, ''),
		image: finalGallery[0] || cleanImage,
		gallery: finalGallery,
		amenities: Array.isArray(amenities) ? amenities : [],
		sellerType: sellerType || 'Owner',
		rating: 0,
		reviews: 0,
		availability: 'Available Now',
		facing: 'N/A',
		floor: '—',
		age: 'New',
		furnishing: 'Unfurnished',
		about:
			about?.trim() ||
			'Listed by an SVS verified seller. Contact the seller for more details and a private viewing.',
		highlights: [],
		facilities: [],
		trustSafety: [],
		agent: {
			name: sellerName?.trim() || 'SVS Seller',
			phone: sellerPhone?.trim() || '',
			email: sellerEmail?.trim() || '',
			badge: 'Verified Seller',
		},
		isSellerListing: true,
		sellerEmail: sellerEmail?.trim() || '',
		createdAt: new Date().toISOString(),
	};
};
