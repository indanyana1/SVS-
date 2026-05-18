// Lightweight buyer-currency module shared by the property feature (and any
// future market feature) with App.jsx. It reads the same localStorage keys
// (`svs-buyer-currency` and `svs-fx-rates`) that App.jsx writes to and
// subscribes to a custom `svs-buyer-currency-change` window event so that
// changing the currency from the App header updates property prices in the
// same tab without a reload.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'svs-buyer-currency';
const FX_CACHE_KEY = 'svs-fx-rates';
const CHANGE_EVENT = 'svs-buyer-currency-change';
const DEFAULT_CURRENCY = 'ZAR';

// Subset of CURRENCY_DEFINITIONS that covers everything App.jsx supports.
// Symbol formatting matches the App.jsx convention (multi-char symbols get a
// trailing space, single-char symbols are tightly prefixed).
export const CURRENCY_DEFINITIONS = {
	AED: { symbol: 'AED' }, AFN: { symbol: '؋' }, ALL: { symbol: 'L' },
	AMD: { symbol: '֏' }, AOA: { symbol: 'Kz' }, ARS: { symbol: 'AR$' },
	AUD: { symbol: 'A$' }, AZN: { symbol: '₼' }, BAM: { symbol: 'KM' },
	BDT: { symbol: '৳' }, BGN: { symbol: 'лв' }, BHD: { symbol: 'BD' },
	BOB: { symbol: 'Bs' }, BRL: { symbol: 'R$' }, BWP: { symbol: 'P' },
	BYN: { symbol: 'Br' }, CAD: { symbol: 'C$' }, CHF: { symbol: 'CHF' },
	CLP: { symbol: 'CLP$' }, CNY: { symbol: '¥' }, COP: { symbol: 'COL$' },
	CZK: { symbol: 'Kč' }, DKK: { symbol: 'kr' }, DOP: { symbol: 'RD$' },
	DZD: { symbol: 'DA' }, EGP: { symbol: 'E£' }, ETB: { symbol: 'Br' },
	EUR: { symbol: '€' }, FJD: { symbol: 'FJ$' }, GBP: { symbol: '£' },
	GEL: { symbol: '₾' }, GHS: { symbol: 'GH₵' }, GTQ: { symbol: 'Q' },
	HKD: { symbol: 'HK$' }, HRK: { symbol: 'kn' }, HUF: { symbol: 'Ft' },
	IDR: { symbol: 'Rp' }, ILS: { symbol: '₪' }, INR: { symbol: '₹' },
	IQD: { symbol: 'IQD' }, IRR: { symbol: '﷼' }, ISK: { symbol: 'kr' },
	JMD: { symbol: 'J$' }, JOD: { symbol: 'JD' }, JPY: { symbol: '¥' },
	KES: { symbol: 'KSh' }, KHR: { symbol: '៛' }, KRW: { symbol: '₩' },
	KWD: { symbol: 'KD' }, KZT: { symbol: '₸' }, LAK: { symbol: '₭' },
	LBP: { symbol: 'L£' }, LKR: { symbol: 'Rs' }, LSL: { symbol: 'L' },
	MAD: { symbol: 'DH' }, MDL: { symbol: 'L' }, MKD: { symbol: 'ден' },
	MMK: { symbol: 'K' }, MNT: { symbol: '₮' }, MUR: { symbol: '₨' },
	MWK: { symbol: 'MK' }, MXN: { symbol: 'Mex$' }, MYR: { symbol: 'RM' },
	MZN: { symbol: 'MT' }, NAD: { symbol: 'N$' }, NGN: { symbol: '₦' },
	NOK: { symbol: 'kr' }, NPR: { symbol: '₨' }, NZD: { symbol: 'NZ$' },
	OMR: { symbol: 'OMR' }, PEN: { symbol: 'S/' }, PGK: { symbol: 'K' },
	PHP: { symbol: '₱' }, PKR: { symbol: '₨' }, PLN: { symbol: 'zł' },
	PYG: { symbol: '₲' }, QAR: { symbol: 'QR' }, RON: { symbol: 'lei' },
	RSD: { symbol: 'дин' }, RUB: { symbol: '₽' }, RWF: { symbol: 'FRw' },
	SAR: { symbol: 'SR' }, SEK: { symbol: 'kr' }, SGD: { symbol: 'S$' },
	SYP: { symbol: 'S£' }, SZL: { symbol: 'E' }, THB: { symbol: '฿' },
	TND: { symbol: 'DT' }, TRY: { symbol: '₺' }, TTD: { symbol: 'TT$' },
	TWD: { symbol: 'NT$' }, TZS: { symbol: 'TSh' }, UAH: { symbol: '₴' },
	UGX: { symbol: 'USh' }, USD: { symbol: '$' }, UYU: { symbol: '$U' },
	UZS: { symbol: "so'm" }, VES: { symbol: 'Bs.S' }, VND: { symbol: '₫' },
	XAF: { symbol: 'FCFA' }, XOF: { symbol: 'CFA' }, YER: { symbol: '﷼' },
	ZAR: { symbol: 'R' }, ZMW: { symbol: 'ZK' },
};

// Approximate fallback rates per 1 USD until App.jsx's live fetch fills cache.
const FALLBACK_FX = {
	USD: 1, EUR: 0.92, GBP: 0.79, JPY: 154, CNY: 7.24, CHF: 0.88,
	CAD: 1.36, AUD: 1.51, NZD: 1.66, HKD: 7.82, SGD: 1.34,
	ZAR: 18.85, NGN: 1500, KES: 129, GHS: 14.5, EGP: 49, MAD: 9.95,
	INR: 83.4, PKR: 278, BDT: 117, AED: 3.67, SAR: 3.75, TRY: 33,
};

const ZERO_DECIMAL_CURRENCIES = new Set([
	'JPY', 'KRW', 'VND', 'IDR', 'CLP', 'UGX', 'TZS', 'PYG', 'IQD',
	'VES', 'LBP', 'MMK', 'LAK', 'KHR', 'XOF', 'XAF', 'RWF', 'COP',
	'HUF', 'ISK', 'BIF', 'CRC', 'GNF',
]);

const safeReadStorage = (key) => {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage.getItem(key);
	} catch (_e) {
		return null;
	}
};

const readFxRates = () => {
	const raw = safeReadStorage(FX_CACHE_KEY);
	if (!raw) return { ...FALLBACK_FX };
	try {
		const parsed = JSON.parse(raw);
		if (parsed && parsed.rates) return { ...FALLBACK_FX, ...parsed.rates };
	} catch (_e) {
		// Ignore.
	}
	return { ...FALLBACK_FX };
};

const readCurrency = () => {
	const stored = safeReadStorage(STORAGE_KEY);
	if (stored && CURRENCY_DEFINITIONS[stored]) return stored;
	return DEFAULT_CURRENCY;
};

export const getBuyerCurrency = () => readCurrency();

export const getBuyerCurrencySymbol = (code = readCurrency()) =>
	CURRENCY_DEFINITIONS[code]?.symbol || code;

export const convertAmount = (
	amount,
	fromCode = 'USD',
	toCode = readCurrency(),
) => {
	const numeric = Number(amount) || 0;
	const rates = readFxRates();
	const fromRate = rates[fromCode] || 1;
	const toRate = rates[toCode] || 1;
	const usd = numeric / fromRate;
	return usd * toRate;
};

const formatNumber = (value, decimals) => {
	const fixed = Number(value).toFixed(decimals);
	const [intPart, decPart] = fixed.split('.');
	const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return decPart ? `${withSep}.${decPart}` : withSep;
};

export const formatAmount = (amount, code = readCurrency(), decimals) => {
	const def = CURRENCY_DEFINITIONS[code] || { symbol: code };
	const safe = Number(amount) || 0;
	const fixedDecimals =
		decimals != null ? decimals : ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2;
	const symbol = def.symbol.length > 1 ? `${def.symbol} ` : def.symbol;
	return `${symbol}${formatNumber(safe, fixedDecimals)}`;
};

// Convert an amount expressed in `fromCode` to the buyer currency and format
// it. For property prices we typically want 0 decimals because amounts are
// large; pass `decimals: 0` for that case.
export const formatInBuyerCurrency = (
	amount,
	fromCode = 'USD',
	{ decimals, suffix = '' } = {},
) => {
	const toCode = readCurrency();
	const converted = convertAmount(amount, fromCode, toCode);
	return `${formatAmount(converted, toCode, decimals)}${suffix}`;
};

// React hook: subscribes to currency changes (same-tab via custom event +
// cross-tab via storage event + visibilitychange/focus).
export const useBuyerCurrency = () => {
	const [code, setCode] = useState(() => readCurrency());

	useEffect(() => {
		const sync = () => setCode(readCurrency());

		const handleStorage = (event) => {
			if (!event || event.key === STORAGE_KEY || event.key === FX_CACHE_KEY || event.key === null) {
				sync();
			}
		};
		const handleVisibility = () => {
			if (typeof document !== 'undefined' && document.visibilityState === 'visible') sync();
		};

		window.addEventListener(CHANGE_EVENT, sync);
		window.addEventListener('storage', handleStorage);
		window.addEventListener('focus', sync);
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', handleVisibility);
		}

		// Initial sync in case storage was updated between mount and effect.
		sync();

		return () => {
			window.removeEventListener(CHANGE_EVENT, sync);
			window.removeEventListener('storage', handleStorage);
			window.removeEventListener('focus', sync);
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', handleVisibility);
			}
		};
	}, []);

	return code;
};
