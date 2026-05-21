// Generic power-search primitives reused across every market on the platform.
//
// Features:
//   • Diacritic-insensitive, punctuation-tolerant normalization.
//   • Multi-token AND-logic (every word in the query must match somewhere).
//   • Per-token OR-logic across fields with weighted scoring.
//   • Levenshtein-based fuzzy matching (typo tolerance, capped at distance 1
//     for tokens of length ≥ 4 to avoid false positives on short words).
//   • Two consumption modes:
//       1. Pass `fields: [{ key, weight }, ...]` for per-field weighted scoring.
//       2. Pass `haystackField: 'searchText'` (default) for items that already
//          carry a concatenated lowercase haystack — used by the cross-market
//          searchableCatalog so all 15+ markets share the same powerful search.

// Normalize: lowercase, strip diacritics, drop punctuation, collapse whitespace.
export const normalize = (value) =>
	String(value || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

export const tokenize = (query) =>
	normalize(query)
		.split(' ')
		.filter((token) => token.length > 0);

// Capped Levenshtein — returns Infinity when distance exceeds `max` so callers
// can short-circuit on hopeless candidates without paying full DP cost.
export const editDistance = (a, b, max = 2) => {
	const al = a.length;
	const bl = b.length;
	if (Math.abs(al - bl) > max) return Infinity;
	let prev = new Array(bl + 1);
	let curr = new Array(bl + 1);
	for (let j = 0; j <= bl; j += 1) prev[j] = j;
	for (let i = 1; i <= al; i += 1) {
		curr[0] = i;
		let rowMin = curr[0];
		for (let j = 1; j <= bl; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
			if (curr[j] < rowMin) rowMin = curr[j];
		}
		if (rowMin > max) return Infinity;
		[prev, curr] = [curr, prev];
	}
	return prev[bl];
};

// Score a normalized field against a token. Higher = better.
//   - Exact field match:  3 × weight
//   - Prefix match:       2 × weight
//   - Substring match:    1 × weight
//   - Fuzzy whole-word match (distance ≤ 1, token ≥ 4 chars): 0.6 × weight
export const scoreField = (field, token, weight) => {
	if (!field || !token) return 0;
	if (field === token) return weight * 3;
	if (field.startsWith(token)) return weight * 2;
	if (field.includes(token)) return weight;
	if (token.length >= 4) {
		const words = field.split(' ');
		for (const word of words) {
			if (Math.abs(word.length - token.length) > 1) continue;
			if (editDistance(word, token, 1) <= 1) return weight * 0.6;
		}
	}
	return 0;
};

// Fuzzy substring match against a single concatenated haystack.
const fuzzyHaystackMatch = (haystack, token) => {
	if (!haystack || !token) return 0;
	if (haystack.includes(token)) return 1;
	if (token.length >= 4) {
		const words = haystack.split(' ');
		for (const word of words) {
			if (Math.abs(word.length - token.length) > 1) continue;
			if (editDistance(word, token, 1) <= 1) return 0.6;
		}
	}
	return 0;
};

// searchItems — generic ranked search.
//
//   items    — array of objects to search.
//   query    — raw user search string.
//   options:
//     fields         — optional [{ key, weight }] for per-field weighted scoring.
//     haystackField  — optional string field name used as a fallback haystack
//                      (default 'searchText'). Set to null to disable.
//     sort           — 'relevance' (default) or 'none'.
//     limit          — optional max results.
//     filter         — optional (item) => boolean pre-filter.
//
// Every token in the query must match SOMEWHERE on the item (AND across tokens).
// Within a token, any matching field/haystack contributes (OR across fields).
export const searchItems = (items, query, options = {}) => {
	const {
		fields = null,
		haystackField = 'searchText',
		sort = 'relevance',
		limit = null,
		filter = null,
	} = options;

	const list = Array.isArray(items) ? items : [];
	const tokens = tokenize(query);

	if (!tokens.length) {
		const base = filter ? list.filter(filter) : list.slice();
		return limit ? base.slice(0, limit) : base;
	}

	const scored = [];
	for (const item of list) {
		if (filter && !filter(item)) continue;

		const normFields = fields
			? fields.map((f) => ({ text: normalize(item[f.key] ?? ''), weight: f.weight }))
			: null;
		const haystack = haystackField ? normalize(item[haystackField] ?? '') : '';

		let total = 0;
		let allMatched = true;
		for (const token of tokens) {
			let tokenScore = 0;
			if (normFields) {
				for (const nf of normFields) tokenScore += scoreField(nf.text, token, nf.weight);
			}
			if (tokenScore === 0 && haystack) {
				tokenScore += fuzzyHaystackMatch(haystack, token);
			}
			if (tokenScore === 0) {
				allMatched = false;
				break;
			}
			total += tokenScore;
		}
		if (allMatched) scored.push({ item, score: total });
	}

	if (sort === 'relevance') {
		scored.sort((a, b) => b.score - a.score);
	}

	const out = scored.map((s) => s.item);
	return limit ? out.slice(0, limit) : out;
};
