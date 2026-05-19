// Buyer-submitted property bookings/enquiries.
// Supabase = source of truth. localStorage acts as a synchronous cache so the
// sidebar/visit-status page can render instantly without awaiting a fetch.

import { useEffect, useState } from 'react';
import { supabase, hasSupabaseEnv } from '../../../lib/supabase';

const STORAGE_KEY = 'svs-property-bookings';
const CHANGE_EVENT = 'svs-property-bookings-change';
const TABLE = 'property_bookings';

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
		/* ignore quota errors */
	}
};

const rowToBooking = (row) => ({
	id: row.id,
	listingId: row.listing_id,
	listingTitle: row.listing_title || '',
	listingImage: row.listing_image || '',
	listingLocation: row.listing_location || '',
	sellerEmail: row.seller_email || '',
	buyerEmail: row.buyer_email || '',
	name: row.buyer_name || '',
	phone: row.buyer_phone || '',
	buyerType: row.buyer_type || '',
	reason: row.reason || '',
	date: row.visit_date || '',
	time: row.visit_time || '',
	message: row.message || '',
	status: row.status || 'requested',
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

const bookingToRow = (b) => ({
	id: b.id,
	listing_id: b.listingId,
	listing_title: b.listingTitle || null,
	listing_image: b.listingImage || null,
	listing_location: b.listingLocation || null,
	seller_email: (b.sellerEmail || '').toLowerCase() || null,
	buyer_email: (b.buyerEmail || '').toLowerCase() || null,
	buyer_name: b.name || null,
	buyer_phone: b.phone || null,
	buyer_type: b.buyerType || null,
	reason: b.reason || null,
	visit_date: b.date || null,
	visit_time: b.time || null,
	message: b.message || null,
	status: b.status || 'requested',
});

// ---- Sync cache reads (used by selectors / hooks) ------------------------

export const getBookings = () => safeRead();

export const getBookingsForSeller = (email) => {
	const normalized = String(email || '').trim().toLowerCase();
	if (!normalized) return [];
	return safeRead().filter((b) => (b.sellerEmail || '').toLowerCase() === normalized);
};

export const getBookingsForListing = (listingId) => {
	if (!listingId) return [];
	return safeRead().filter((b) => b.listingId === listingId);
};

export const getBookingsForBuyer = (email) => {
	const normalized = String(email || '').trim().toLowerCase();
	if (!normalized) return [];
	return safeRead().filter((b) => (b.buyerEmail || '').toLowerCase() === normalized);
};

// ---- Hydration from Supabase --------------------------------------------

let hydratePromise = null;

export const hydrateBookings = () => {
	if (!hasSupabaseEnv || !supabase) {
		return Promise.resolve(safeRead());
	}
	if (hydratePromise) return hydratePromise;
	hydratePromise = (async () => {
		try {
			const { data, error } = await supabase
				.from(TABLE)
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw error;
			const list = (data || []).map(rowToBooking);
			safeWrite(list);
			return list;
		} catch (err) {
			console.warn('[property/bookings] hydrate failed', err);
			return safeRead();
		} finally {
			hydratePromise = null;
		}
	})();
	return hydratePromise;
};

// ---- Mutations -----------------------------------------------------------

export const saveBooking = async (booking) => {
	const list = safeRead();
	const idx = list.findIndex((b) => b.id === booking.id);
	const next = idx >= 0 ? [...list.slice(0, idx), booking, ...list.slice(idx + 1)] : [booking, ...list];
	safeWrite(next);

	if (hasSupabaseEnv && supabase) {
		try {
			const { data, error } = await supabase
				.from(TABLE)
				.upsert(bookingToRow(booking))
				.select()
				.single();
			if (error) throw error;
			const hydrated = rowToBooking(data);
			const cache = safeRead();
			const ix = cache.findIndex((b) => b.id === hydrated.id);
			const merged = ix >= 0 ? [...cache.slice(0, ix), hydrated, ...cache.slice(ix + 1)] : [hydrated, ...cache];
			safeWrite(merged);
			return hydrated;
		} catch (err) {
			console.warn('[property/bookings] upsert failed', err);
		}
	}
	return booking;
};

export const updateBookingStatus = async (id, status) => {
	const list = safeRead();
	const next = list.map((b) => (b.id === id ? { ...b, status } : b));
	safeWrite(next);

	if (hasSupabaseEnv && supabase) {
		try {
			const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
			if (error) throw error;
		} catch (err) {
			console.warn('[property/bookings] status update failed', err);
		}
	}
};

export const deleteBooking = async (id) => {
	const list = safeRead();
	safeWrite(list.filter((b) => b.id !== id));

	if (hasSupabaseEnv && supabase) {
		try {
			const { error } = await supabase.from(TABLE).delete().eq('id', id);
			if (error) throw error;
		} catch (err) {
			console.warn('[property/bookings] delete failed', err);
		}
	}
};

// ---- Subscriptions / hooks ----------------------------------------------

export const subscribeToBookings = (callback) => {
	if (typeof window === 'undefined') return () => {};
	const handler = () => callback();
	window.addEventListener(CHANGE_EVENT, handler);
	window.addEventListener('storage', handler);
	return () => {
		window.removeEventListener(CHANGE_EVENT, handler);
		window.removeEventListener('storage', handler);
	};
};

export const useBookingsVersion = () => {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		hydrateBookings().then(() => setVersion((v) => v + 1));
		return subscribeToBookings(() => setVersion((v) => v + 1));
	}, []);
	return version;
};
