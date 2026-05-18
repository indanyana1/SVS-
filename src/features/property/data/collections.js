// Tiny persisted-collection helpers backed by sessionStorage so wishlist and
// cart actions on the property feature survive across pages within a session
// (and provide a single place for a future Supabase sync).

const safeRead = (key) => {
	if (typeof window === 'undefined') return [];
	try {
		const raw = window.sessionStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch (_e) {
		return [];
	}
};

const safeWrite = (key, value) => {
	if (typeof window === 'undefined') return;
	try {
		window.sessionStorage.setItem(key, JSON.stringify(value));
	} catch (_e) {
		// Ignore quota / serialization issues.
	}
	if (typeof window.dispatchEvent === 'function') {
		try { window.dispatchEvent(new CustomEvent('property-collections-change')); } catch (_e) { /* ignore */ }
	}
};

const CART_KEY = 'property-cart';
const WISHLIST_KEY = 'property-wishlist';

export const readPropertyCart = () => safeRead(CART_KEY);
export const readPropertyWishlist = () => safeRead(WISHLIST_KEY);

const upsertById = (list, item) => {
	const next = list.filter((entry) => entry.id !== item.id);
	next.push(item);
	return next;
};

export const addToPropertyCart = (listing) => {
	if (!listing) return readPropertyCart();
	const next = upsertById(readPropertyCart(), {
		id: listing.id,
		title: listing.title,
		image: listing.image,
		price: listing.price,
		priceNumeric: listing.priceNumeric,
		priceCurrency: listing.priceCurrency,
		isRental: listing.isRental,
		addedAt: Date.now(),
	});
	safeWrite(CART_KEY, next);
	return next;
};

export const removeFromPropertyCart = (id) => {
	const next = readPropertyCart().filter((entry) => entry.id !== id);
	safeWrite(CART_KEY, next);
	return next;
};

export const isInPropertyCart = (id) =>
	readPropertyCart().some((entry) => entry.id === id);

export const togglePropertyWishlist = (listing) => {
	if (!listing) return readPropertyWishlist();
	const current = readPropertyWishlist();
	const exists = current.some((entry) => entry.id === listing.id);
	const next = exists
		? current.filter((entry) => entry.id !== listing.id)
		: upsertById(current, {
			id: listing.id,
			title: listing.title,
			image: listing.image,
			price: listing.price,
			priceNumeric: listing.priceNumeric,
			priceCurrency: listing.priceCurrency,
			isRental: listing.isRental,
			addedAt: Date.now(),
		});
	safeWrite(WISHLIST_KEY, next);
	return next;
};

export const isInPropertyWishlist = (id) =>
	readPropertyWishlist().some((entry) => entry.id === id);

export const subscribeToPropertyCollections = (callback) => {
	if (typeof window === 'undefined') return () => {};
	const handler = () => callback();
	window.addEventListener('property-collections-change', handler);
	window.addEventListener('storage', handler);
	return () => {
		window.removeEventListener('property-collections-change', handler);
		window.removeEventListener('storage', handler);
	};
};
