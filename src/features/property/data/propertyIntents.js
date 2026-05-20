// Buyer-submitted property intents ("Reserve" / "Buy").
// Supabase = source of truth. localStorage acts as a synchronous cache so the
// seller dashboard can render instantly without awaiting a fetch.

import { useEffect, useState } from 'react';
import { supabase, hasSupabaseEnv } from '../../../lib/supabase';

const STORAGE_KEY = 'svs-property-intents';
const CHANGE_EVENT = 'svs-property-intents-change';
const TABLE = 'property_intents';

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

const rowToIntent = (row) => ({
	id: row.id,
	listingId: row.listing_id,
	listingTitle: row.listing_title || '',
	listingImage: row.listing_image || '',
	listingLocation: row.listing_location || '',
	listingPrice: row.listing_price || '',
	sellerEmail: row.seller_email || '',
	buyerEmail: row.buyer_email || '',
	name: row.buyer_name || '',
	phone: row.buyer_phone || '',
	intentType: row.intent_type || 'reserve',
	message: row.message || '',
	status: row.status || 'new',
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

const intentToRow = (i) => ({
	id: i.id,
	listing_id: i.listingId,
	listing_title: i.listingTitle || null,
	listing_image: i.listingImage || null,
	listing_location: i.listingLocation || null,
	listing_price: i.listingPrice || null,
	seller_email: (i.sellerEmail || '').toLowerCase() || null,
	buyer_email: (i.buyerEmail || '').toLowerCase() || null,
	buyer_name: i.name || null,
	buyer_phone: i.phone || null,
	intent_type: i.intentType || 'reserve',
	message: i.message || null,
	status: i.status || 'new',
});

// ---- Sync cache reads ---------------------------------------------------

export const getIntents = () => safeRead();

export const getIntentsForSeller = (email) => {
	const normalized = String(email || '').trim().toLowerCase();
	if (!normalized) return [];
	return safeRead().filter((i) => (i.sellerEmail || '').toLowerCase() === normalized);
};

export const getIntentsForListing = (listingId) => {
	if (!listingId) return [];
	return safeRead().filter((i) => i.listingId === listingId);
};

// ---- Hydration ----------------------------------------------------------

let hydratePromise = null;

export const hydrateIntents = () => {
	if (!hasSupabaseEnv || !supabase) return Promise.resolve(safeRead());
	if (hydratePromise) return hydratePromise;
	hydratePromise = (async () => {
		try {
			const { data, error } = await supabase
				.from(TABLE)
				.select('*')
				.order('created_at', { ascending: false });
			if (error) throw error;
			const list = (data || []).map(rowToIntent);
			safeWrite(list);
			return list;
		} catch (err) {
			console.warn('[property/intents] hydrate failed', err);
			return safeRead();
		} finally {
			hydratePromise = null;
		}
	})();
	return hydratePromise;
};

// ---- Mutations ----------------------------------------------------------

export const saveIntent = async (intent) => {
	const list = safeRead();
	const idx = list.findIndex((i) => i.id === intent.id);
	const next = idx >= 0 ? [...list.slice(0, idx), intent, ...list.slice(idx + 1)] : [intent, ...list];
	safeWrite(next);

	if (hasSupabaseEnv && supabase) {
		try {
			const { data, error } = await supabase
				.from(TABLE)
				.upsert(intentToRow(intent))
				.select()
				.single();
			if (error) throw error;
			const hydrated = rowToIntent(data);
			const cache = safeRead();
			const ix = cache.findIndex((i) => i.id === hydrated.id);
			const merged = ix >= 0 ? [...cache.slice(0, ix), hydrated, ...cache.slice(ix + 1)] : [hydrated, ...cache];
			safeWrite(merged);
			return hydrated;
		} catch (err) {
			console.warn('[property/intents] upsert failed', err);
		}
	}
	return intent;
};

export const updateIntentStatus = async (id, status) => {
	const list = safeRead();
	safeWrite(list.map((i) => (i.id === id ? { ...i, status } : i)));
	if (hasSupabaseEnv && supabase) {
		try {
			const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
			if (error) throw error;
		} catch (err) {
			console.warn('[property/intents] status update failed', err);
		}
	}
};

export const deleteIntent = async (id) => {
	const list = safeRead();
	safeWrite(list.filter((i) => i.id !== id));
	if (hasSupabaseEnv && supabase) {
		try {
			const { error } = await supabase.from(TABLE).delete().eq('id', id);
			if (error) throw error;
		} catch (err) {
			console.warn('[property/intents] delete failed', err);
		}
	}
};

// ---- Subscriptions ------------------------------------------------------

export const subscribeToIntents = (callback) => {
	if (typeof window === 'undefined') return () => {};
	const handler = () => callback();
	window.addEventListener(CHANGE_EVENT, handler);
	window.addEventListener('storage', handler);
	return () => {
		window.removeEventListener(CHANGE_EVENT, handler);
		window.removeEventListener('storage', handler);
	};
};

export const useIntentsVersion = () => {
	const [version, setVersion] = useState(0);
	useEffect(() => {
		hydrateIntents().then(() => setVersion((v) => v + 1));
		return subscribeToIntents(() => setVersion((v) => v + 1));
	}, []);
	return version;
};
