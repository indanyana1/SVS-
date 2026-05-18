// Property marketplace seed data: categories, listings, agents.
// Used by PropertyMarketPage, PropertyCategoryPage and PropertyDetailPage.

import {
	Building2,
	Home,
	Hotel,
	LandPlot,
	Building,
	KeyRound,
	HousePlus,
	Users,
} from 'lucide-react';
import { formatInBuyerCurrency } from '../../../lib/buyerCurrency';

// All numeric prices in this file are expressed in this source currency. The
// buyer-currency engine converts on the fly when rendering.
export const PROPERTY_SOURCE_CURRENCY = 'INR';

export const formatListingPrice = (listing) => {
	if (!listing) return '';
	const numeric = Number(listing.priceNumeric) || 0;
	const code = listing.priceCurrency || PROPERTY_SOURCE_CURRENCY;
	return formatInBuyerCurrency(numeric, code, {
		decimals: 0,
		suffix: listing.isRental ? ' / month' : '',
	});
};

export const PROPERTY_CATEGORIES = [
	{
		key: 'apartments',
		label: 'Apartments',
		subtitle: 'Explore apartments',
		icon: Building2,
		image:
			'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Browse and explore the finest apartments, thoughtfully selected from trusted developers to ensure quality, comfort, and modern living.',
	},
	{
		key: 'villas',
		label: 'Villas',
		subtitle: 'Explore villas',
		icon: Home,
		image:
			'https://images.pexels.com/photos/32870/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Discover elegant villas with private gardens, pools, and premium finishes in the most sought-after neighborhoods.',
	},
	{
		key: 'plots',
		label: 'Plots / Land',
		subtitle: 'Explore plots / land',
		icon: LandPlot,
		image:
			'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Find verified residential and commercial plots with clean titles ready for your next development.',
	},
	{
		key: 'commercial',
		label: 'Commercial Spaces',
		subtitle: 'Explore commercial spaces',
		icon: Building,
		image:
			'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Offices, retail and warehousing solutions to power your growing business.',
	},
	{
		key: 'rental',
		label: 'Rental Properties',
		subtitle: 'Explore rental properties',
		icon: KeyRound,
		image:
			'https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Short-term and long-term rentals from verified landlords across the country.',
	},
	{
		key: 'luxury',
		label: 'Luxury Homes',
		subtitle: 'Explore luxury homes',
		icon: HousePlus,
		image:
			'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Hand-picked luxury homes featuring world-class architecture, finishes and amenities.',
	},
	{
		key: 'economy',
		label: 'Economy Housing',
		subtitle: 'Explore Economy Housing',
		icon: Hotel,
		image:
			'https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Affordable, family-friendly homes designed for value-conscious buyers and renters.',
	},
	{
		key: 'coliving',
		label: 'Co-Living / PG',
		subtitle: 'Explore co-living / pg',
		icon: Users,
		image:
			'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1200',
		heroSubtitle:
			'Modern co-living and PG accommodations for students and young professionals.',
	},
];

const SAMPLE_AGENT = {
	name: 'Rajesh Kumar',
	title: 'Licensed Real Estate Agent',
	location: 'Nairobi (Kenya)',
	avatar:
		'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
	phone: '+27 21 555 0142',
};

const baseHighlights = [
	'Premium Flooring',
	'Master Bedroom',
	'Modular Kitchen',
	'Balcony Views',
	'Smart Home Ready',
	'Ample Storage',
];

const baseFacilities = [
	{
		title: 'Schools & Education',
		items: [
			"St. Xavier's School – 0.5 km",
			'International School – 1.2 km',
			'IIT Sandton – 3.5 km',
		],
	},
	{
		title: 'Healthcare',
		items: [
			'Sandton Hospital – 1.8 km',
			'Holy Family Hospital – 2.3 km',
			'Medical Store – 0.3 km',
		],
	},
	{
		title: 'Shopping & Entertainment',
		items: [
			'Linking Road Market – 0.9 km',
			'Sandton Mall – 2.5 km',
			'Restaurants & Cafés – Walking distance',
		],
	},
	{
		title: 'Transportation',
		items: [
			'Sandton Railway Station – 1.5 km',
			'Sandton Metro – 0.7 km',
			'Bus Stop – 0.2 km',
		],
	},
];

const baseAmenities = [
	'Parking',
	'Gym',
	'Swimming Pool',
	'Garden',
	'24/7 Security',
	'Power Backup',
];

const trustSafety = ['Verified Property', 'Buyer Protection', 'Legal Documentation'];

const galleryFor = (cover) => [
	cover,
	'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200',
	'https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg?auto=compress&cs=tinysrgb&w=1200',
	'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200',
	'https://images.pexels.com/photos/261101/pexels-photo-261101.jpeg?auto=compress&cs=tinysrgb&w=1200',
	'https://images.pexels.com/photos/280229/pexels-photo-280229.jpeg?auto=compress&cs=tinysrgb&w=1200',
	'https://images.pexels.com/photos/1571470/pexels-photo-1571470.jpeg?auto=compress&cs=tinysrgb&w=1200',
];

export const PROPERTY_LISTINGS = [
	{
		id: 'p-sandton-skyline',
		category: 'apartments',
		title: 'Sandton Skyline Residency',
		price: '2.5 Cr/-',
		priceNumeric: 25000000,
		location: 'Sandton, Johannesburg',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '3BHK Apartment',
		bedrooms: 3,
		size: '1,850 sq.ft',
		sizeNumeric: 1850,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Agent',
		availability: 'Available Now',
		facing: 'North-East',
		floor: '12th',
		age: '2 Years',
		furnishing: 'Semi-Furnished',
		fullAddress: '123 Rivonia Road, Sandton, Johannesburg, Gauteng, 2196, South Africa.',
		image:
			'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
		about:
			"Experience luxury living at its finest in this stunning 3-bedroom apartment located in the heart of Sandton, Johannesburg. This beautifully designed residence offers spacious interiors, premium finishes, and breathtaking city skyline views. Perfect for families and professionals seeking comfort and convenience in one of Johannesburg's most prestigious areas.\n\nThe apartment features a modern open-plan layout with large windows that fill the space with natural light. High-quality finishes, a fully equipped modern kitchen with premium appliances, and stylish bathrooms with top-quality fittings make this property truly exceptional.",
		highlights: baseHighlights,
		facilities: baseFacilities,
		amenities: baseAmenities,
		trustSafety,
		agent: SAMPLE_AGENT,
	},
	{
		id: 'p-sunset-apartments',
		category: 'apartments',
		title: 'Sunset Apartments',
		price: '4.2 Cr/-',
		priceNumeric: 42000000,
		location: 'Stellenbosch, Western Cape',
		city: 'Cape Town',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '4BHK Apartment',
		bedrooms: 4,
		size: '3,200 sq.ft',
		sizeNumeric: 3200,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Builder',
		image:
			'https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-jburg-urban-heights',
		category: 'apartments',
		title: 'Johannesburg Urban Heights',
		price: '1.8 Cr/-',
		priceNumeric: 18000000,
		location: 'Rosebank, Johannesburg',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '2BHK Apartment',
		bedrooms: 2,
		size: '1,450 sq.ft',
		sizeNumeric: 1450,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Owner',
		image:
			'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-sea-point-lakeside',
		category: 'apartments',
		title: 'Sea Point Lakeside',
		price: '6.5 Cr/-',
		priceNumeric: 65000000,
		location: 'Cape Town',
		city: 'Cape Town',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '4BHK Apartment',
		bedrooms: 4,
		size: '4,500 sq.ft',
		sizeNumeric: 4500,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Agent',
		image:
			'https://images.pexels.com/photos/261395/pexels-photo-261395.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-durban-apartments',
		category: 'apartments',
		title: 'Durban Apartments',
		price: '3.0 Cr/-',
		priceNumeric: 30000000,
		location: 'Durban Central',
		city: 'Durban',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '3BHK Apartment',
		bedrooms: 3,
		size: '2,800 sq.ft',
		sizeNumeric: 2800,
		rating: 4.8,
		reviews: 145,
		status: 'For Rent',
		sellerType: 'Agent',
		image:
			'https://images.pexels.com/photos/2581922/pexels-photo-2581922.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-camps-bay-sunset',
		category: 'apartments',
		title: 'Camps Bay Sunset Apartments',
		price: '2.5 Cr/-',
		priceNumeric: 25000000,
		location: 'Cape Town',
		city: 'Cape Town',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '2BHK Apartment',
		bedrooms: 2,
		size: '1,100 sq.ft',
		sizeNumeric: 1100,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Agent',
		image:
			'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-pretoria-metro',
		category: 'apartments',
		title: 'Pretoria Metro Residency',
		price: '2.1 Cr/-',
		priceNumeric: 21000000,
		location: 'Menlyn, Pretoria',
		city: 'Pretoria',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '3BHK Apartment',
		bedrooms: 3,
		size: '1,650 sq.ft',
		sizeNumeric: 1650,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Builder',
		image:
			'https://images.pexels.com/photos/1438832/pexels-photo-1438832.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-rosebank-apartments',
		category: 'apartments',
		title: 'Rosebank Apartments',
		price: '3.5 Cr/-',
		priceNumeric: 35000000,
		location: 'Johannesburg',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'Apartment',
		bhk: '3BHK Apartment',
		bedrooms: 3,
		size: '2,400 sq.ft',
		sizeNumeric: 2400,
		rating: 4.8,
		reviews: 145,
		status: 'For Sale',
		sellerType: 'Agent',
		image:
			'https://images.pexels.com/photos/2360673/pexels-photo-2360673.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	// Other categories — a few items each so category pages aren't empty.
	{
		id: 'p-villa-cape-bay',
		category: 'villas',
		title: 'Cape Bay Villa',
		price: '8.5 Cr/-',
		priceNumeric: 85000000,
		location: 'Camps Bay, Cape Town',
		city: 'Cape Town',
		country: 'South Africa',
		propertyType: 'Villa',
		bhk: '5BHK Villa',
		bedrooms: 5,
		size: '6,200 sq.ft',
		sizeNumeric: 6200,
		rating: 4.9,
		reviews: 89,
		status: 'For Sale',
		sellerType: 'Owner',
		image:
			'https://images.pexels.com/photos/32870/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-plot-midrand',
		category: 'plots',
		title: 'Midrand Development Plot',
		price: '85 L/-',
		priceNumeric: 8500000,
		location: 'Midrand, Gauteng',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'Plot / Land',
		bhk: 'Plot',
		bedrooms: 0,
		size: '12,000 sq.ft',
		sizeNumeric: 12000,
		rating: 4.7,
		reviews: 42,
		status: 'For Sale',
		sellerType: 'Agent',
		image:
			'https://images.pexels.com/photos/1029599/pexels-photo-1029599.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-commercial-sandton',
		category: 'commercial',
		title: 'Sandton Office Tower',
		price: '12 Cr/-',
		priceNumeric: 120000000,
		location: 'Sandton, Johannesburg',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'Commercial',
		bhk: 'Office Space',
		bedrooms: 0,
		size: '8,500 sq.ft',
		sizeNumeric: 8500,
		rating: 4.6,
		reviews: 67,
		status: 'For Sale',
		sellerType: 'Builder',
		image:
			'https://images.pexels.com/photos/380769/pexels-photo-380769.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-rental-rondebosch',
		category: 'rental',
		title: 'Rondebosch Family Rental',
		price: '28,000 / month',
		priceNumeric: 28000,
		location: 'Rondebosch, Cape Town',
		city: 'Cape Town',
		country: 'South Africa',
		propertyType: 'House',
		bhk: '3BHK House',
		bedrooms: 3,
		size: '2,100 sq.ft',
		sizeNumeric: 2100,
		rating: 4.7,
		reviews: 54,
		status: 'For Rent',
		sellerType: 'Owner',
		image:
			'https://images.pexels.com/photos/2079249/pexels-photo-2079249.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-luxury-clifton',
		category: 'luxury',
		title: 'Clifton Beachfront Mansion',
		price: '24 Cr/-',
		priceNumeric: 240000000,
		location: 'Clifton, Cape Town',
		city: 'Cape Town',
		country: 'South Africa',
		propertyType: 'Luxury Home',
		bhk: '6BHK Mansion',
		bedrooms: 6,
		size: '9,800 sq.ft',
		sizeNumeric: 9800,
		rating: 5.0,
		reviews: 31,
		status: 'For Sale',
		sellerType: 'Agent',
		image:
			'https://images.pexels.com/photos/1396132/pexels-photo-1396132.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-economy-soweto',
		category: 'economy',
		title: 'Soweto Family Home',
		price: '95 L/-',
		priceNumeric: 9500000,
		location: 'Soweto, Johannesburg',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'House',
		bhk: '2BHK House',
		bedrooms: 2,
		size: '950 sq.ft',
		sizeNumeric: 950,
		rating: 4.5,
		reviews: 78,
		status: 'For Sale',
		sellerType: 'Owner',
		image:
			'https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
	{
		id: 'p-coliving-braamfontein',
		category: 'coliving',
		title: 'Braamfontein Co-Living Space',
		price: '6,500 / month',
		priceNumeric: 6500,
		location: 'Braamfontein, Johannesburg',
		city: 'Johannesburg',
		country: 'South Africa',
		propertyType: 'Co-Living',
		bhk: 'Private Room',
		bedrooms: 1,
		size: '320 sq.ft',
		sizeNumeric: 320,
		rating: 4.6,
		reviews: 112,
		status: 'For Rent',
		sellerType: 'Builder',
		image:
			'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1200',
	},
];

// Hydrate every listing with the full detail-page payload so PropertyDetailPage
// works even for the lighter-weight cards above.
const defaultListing = PROPERTY_LISTINGS[0];
PROPERTY_LISTINGS.forEach((listing) => {
	listing.gallery = listing.gallery || galleryFor(listing.image);
	listing.about = listing.about || defaultListing.about;
	listing.highlights = listing.highlights || baseHighlights;
	listing.facilities = listing.facilities || baseFacilities;
	listing.amenities = listing.amenities || baseAmenities;
	listing.trustSafety = listing.trustSafety || trustSafety;
	listing.agent = listing.agent || SAMPLE_AGENT;
	listing.fullAddress =
		listing.fullAddress || `${listing.location}, ${listing.country}.`;
	listing.availability = listing.availability || 'Available Now';
	listing.facing = listing.facing || 'North-East';
	listing.floor = listing.floor || '—';
	listing.age = listing.age || 'New';
	listing.furnishing = listing.furnishing || 'Semi-Furnished';
	// Source currency for the numeric price (used by the buyer-currency engine).
	// All static seed data is expressed in INR (matches the Cr/L convention).
	listing.priceCurrency = listing.priceCurrency || 'INR';
	// Whether this is a per-month rental. Detected from the original price label.
	listing.isRental =
		listing.isRental != null
			? listing.isRental
			: /\bmonth\b/i.test(String(listing.price || '')) || listing.status === 'For Rent';
});

export const PROPERTY_STATUSES = ['For Sale', 'For Rent', 'Ready to Move', 'Under Construction'];
export const PRICE_RANGES = [
	{ key: '5l-50l', label: '5L – 50L', min: 500000, max: 5000000 },
	{ key: '50l-1cr', label: '50L – 1Cr', min: 5000000, max: 10000000 },
	{ key: '1cr-2cr', label: '1Cr – 2Cr', min: 10000000, max: 20000000 },
	{ key: '2cr-5cr', label: '2Cr – 5Cr', min: 20000000, max: 50000000 },
	{ key: '5cr+', label: '5Cr+', min: 50000000, max: Infinity },
];
export const BEDROOM_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4+ BHK'];
export const AMENITY_OPTIONS = ['Parking', 'Swimming Pool', 'Gym', 'Garden', 'Security'];
export const SELLER_TYPES = ['Owner', 'Agent', 'Builder'];

export const getCategory = (key) => PROPERTY_CATEGORIES.find((c) => c.key === key);

// --- Seller-listing-aware lookups -------------------------------------------
// Buyer pages should prefer these so newly-added seller listings appear
// alongside the static seed data. Importing here (after seed declarations)
// keeps the module evaluation order safe.
// eslint-disable-next-line import/first
import { getSellerListings } from './sellerListings';

export const getAllListings = () => [...getSellerListings(), ...PROPERTY_LISTINGS];

export const getListing = (id) =>
	getSellerListings().find((l) => l.id === id) ||
	PROPERTY_LISTINGS.find((l) => l.id === id);

export const getListingsByCategory = (key) =>
	getAllListings().filter((l) => l.category === key);

export const getTrending = (limit = 3) => {
	const sellerItems = getSellerListings();
	if (sellerItems.length >= limit) return sellerItems.slice(0, limit);
	return [...sellerItems, ...PROPERTY_LISTINGS.slice(6, 6 + (limit - sellerItems.length))];
};
