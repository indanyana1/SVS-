import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flag,
  Heart,
  MapPin,
  Menu,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  User,
  Sun,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/icons/logo.jpeg';
import { createAddressLookupSessionToken, lookupAddressDetails, lookupAddressSuggestions } from '../lib/addressLookup';
import { DEFAULT_LANGUAGE_CODE, getLanguageByCode, isRtlLanguage, SUPPORTED_LANGUAGES } from '../lib/languages';
import { embeddedCardCheckoutEnabled, getStripeInstance, startCardPayment, stripeCurrency } from '../lib/payments';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import SigninPage from '../pages/SigninPage';
import SignupPage from '../pages/SignupPage';
import SellerLandingPage from '../pages/SellerLandingPage';
import SellerOnboardingPage from '../pages/SellerOnboardingPage';
import SellerSigninPage from '../pages/SellerSigninPage';
import SellerSignupPage from '../pages/SellerSignupPage';

const navItems = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.markets', href: '/markets' },
  { labelKey: 'nav.offers', href: '/offers' },
  { labelKey: 'nav.orders', href: '/orders' },
];

const sellerConsoleNavItems = [
  { label: 'Dashboard', href: '/seller/dashboard' },
  { label: 'Orders', href: '/seller/orders' },
  { label: 'Upload Products', href: '/seller/upload' },
];

const marketLinks = [
  { labelKey: 'markets.beverages', href: '/beverages-liquors' },
  { labelKey: 'markets.constructionTools', href: '/building-construction-tools' },
  { labelKey: 'markets.fashionStyle', href: '/fashion-style' },
  { labelKey: 'markets.votingClients', href: '/voting-clients' },
  { labelKey: 'markets.safety', href: '/safety' },
  { labelKey: 'markets.hardwareSoftware', href: '/hardware-software' },
  { labelKey: 'markets.mobilityVehicles', href: '/mobility-vehicles' },
  { labelKey: 'markets.naturalResources', href: '/natural-resources-minerals' },
  { labelKey: 'markets.tickets', href: '/tickets' },
  { labelKey: 'markets.votingProviders', href: '/voting-providers' },
  { labelKey: 'markets.fastFood', href: '/fast-food' },
  { labelKey: 'markets.groceries', href: '/groceries' },
  { labelKey: 'markets.homeCare', href: '/home-care' },
  { labelKey: 'markets.ecommerce', href: '/e-commerce' },
  { labelKey: 'markets.traditionalMedicines', href: '/traditional-medicines-herbs' },
  { labelKey: 'markets.livestockHub', href: '/livestock-hub' },
  { labelKey: 'markets.bettingLotteryGames', href: '/betting-lottery-games' },
  { labelKey: 'markets.wellness', href: '/wellness' },
  { labelKey: 'markets.propertyHub', href: '/property-hub' },
  { labelKey: 'markets.bookings', href: '/bookings-tickets' },
  { labelKey: 'markets.stationery', href: '/stationery-office' },
];

const sellerMarketOptions = [
  { key: 'beverages', labelKey: 'markets.beverages', route: '/beverages-liquors' },
  { key: 'constructionTools', labelKey: 'markets.constructionTools', route: '/building-construction-tools' },
  { key: 'fashionStyle', labelKey: 'markets.fashionStyle', route: '/fashion-style' },
  { key: 'hardwareSoftware', labelKey: 'markets.hardwareSoftware', route: '/hardware-software' },
  { key: 'mobilityVehicles', labelKey: 'markets.mobilityVehicles', route: '/mobility-vehicles' },
  { key: 'naturalResources', labelKey: 'markets.naturalResources', route: '/natural-resources-minerals' },
  { key: 'fastFood', labelKey: 'markets.fastFood', route: '/fast-food' },
  { key: 'groceries', labelKey: 'markets.groceries', route: '/groceries' },
  { key: 'ecommerce', labelKey: 'markets.ecommerce', route: '/e-commerce' },
  { key: 'tickets', labelKey: 'markets.tickets', route: '/tickets' },
  { key: 'traditionalMedicines', labelKey: 'markets.traditionalMedicines', route: '/traditional-medicines-herbs' },
  { key: 'wellness', labelKey: 'markets.wellness', route: '/wellness' },
  { key: 'stationery', labelKey: 'markets.stationery', route: '/stationery-office' },
];

const sellerMarketConfig = sellerMarketOptions.reduce((accumulator, option) => {
  accumulator[option.key] = option;
  return accumulator;
}, {});

const EMPTY_GROCERIES_LISTING_FIELDS = {
  categoryKey: '',
  brand: '',
  volume: '',
  freshness: '',
  storage: '',
  origin: '',
  expiryDate: '',
  discount: '',
};

const createSellerListingFormState = () => ({
  title: '',
  description: '',
  price: '',
  quantity: '',
  marketKey: '',
  ...EMPTY_GROCERIES_LISTING_FIELDS,
});

const clearGroceriesListingFields = (formState) => ({
  ...formState,
  ...EMPTY_GROCERIES_LISTING_FIELDS,
});

const TRENDING_MARKET_HREFS = [
  '/e-commerce',
  '/groceries',
  '/fast-food',
  '/fashion-style',
  '/hardware-software',
  '/mobility-vehicles',
];

const productCards = [
  {
    id: 'p1',
    title: 'Smart Wireless Earbuds',
    subtitle: 'Audio and Tech',
    price: '129.99',
    image:
      'https://images.pexels.com/photos/3394662/pexels-photo-3394662.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'p2',
    title: 'Classic Gold Watch',
    subtitle: 'Lifestyle',
    price: '249.00',
    image:
      'https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'p3',
    title: 'Urban Travel Backpack',
    subtitle: 'Fashion',
    price: '79.00',
    image:
      'https://images.pexels.com/photos/1546003/pexels-photo-1546003.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'p4',
    title: 'Premium Office Chair',
    subtitle: 'Home Care',
    price: '189.00',
    image:
      'https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const ticketEvents = [
  {
    id: 't1',
    title: 'Summer Music Festival 2026',
    titleKey: 'ticketsPage.events.t1.title',
    date: '2026-11-28',
    location: 'Cape Town Arena',
    locationKey: 'ticketsPage.events.t1.location',
    type: 'Concert',
    typeKey: 'ticketsPage.types.concert',
    price: '59.99',
    image:
      'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 't2',
    title: 'Midnight Movie Premiere',
    titleKey: 'ticketsPage.events.t2.title',
    date: '2026-10-14',
    location: 'Nu Metro',
    locationKey: 'ticketsPage.events.t2.location',
    type: 'Movie',
    typeKey: 'ticketsPage.types.movie',
    price: '15.00',
    image:
      'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 't3',
    title: 'City Derby Match Day',
    titleKey: 'ticketsPage.events.t3.title',
    date: '2026-09-21',
    location: 'Kings Stadium',
    locationKey: 'ticketsPage.events.t3.location',
    type: 'Sports',
    typeKey: 'ticketsPage.types.sports',
    price: '30.00',
    image:
      'https://images.pexels.com/photos/46798/the-ball-stadion-football-the-pitch-46798.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 't4',
    title: 'Hot Travel Weekend Deal',
    titleKey: 'ticketsPage.events.t4.title',
    date: '2026-08-02',
    location: 'Durban Bay',
    locationKey: 'ticketsPage.events.t4.location',
    type: 'Travel',
    typeKey: 'ticketsPage.types.travel',
    price: '199.00',
    image:
      'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const bookingsPrototypeCategoryTabs = ['All', 'Movies', 'Concerts', 'Sports', 'Travel'];

const bookingsPrototypeDateOptions = [
  { value: 'all', label: 'Select Date' },
  { value: '2025-11-25', label: 'Nov 25, 2025' },
  { value: '2025-11-28', label: 'Nov 28, 2025' },
  { value: '2025-12-02', label: 'Dec 2, 2025' },
];

const bookingsPrototypeCountryOptions = [
  { value: 'all', label: 'Select Country' },
  { value: 'South Africa', label: 'South Africa' },
  { value: 'Kenya', label: 'Kenya' },
  { value: 'Uganda', label: 'Uganda' },
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Tanzania', label: 'Tanzania' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
];

const bookingsPrototypeCategoryCards = [
  {
    id: 'bookings-movies-card',
    category: 'Movies',
    title: 'Movies',
    description: 'Book the latest movies in your favorite cinemas.',
    image: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bookings-concerts-card',
    category: 'Concerts',
    title: 'Concerts',
    description: 'Find live shows, music events, and artist performances.',
    image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bookings-sports-card',
    category: 'Sports',
    title: 'Sports',
    description: 'Get tickets for matches, tournaments, and sports events.',
    image: 'https://images.pexels.com/photos/399187/pexels-photo-399187.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bookings-travel-card',
    category: 'Travel',
    title: 'Travel',
    description: 'Book flights, buses, and travel passes instantly.',
    image: 'https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const bookingsPrototypeMovieItems = [
  {
    id: 'booking-movie-1',
    category: 'Movies',
    title: 'Midnight Movie Premiere',
    subtitle: 'Cineworld Luxe Opening Night',
    date: '2025-11-25',
    location: 'V&A Waterfront Cinema, Cape Town',
    city: 'Cape Town',
    country: 'South Africa',
    genre: 'Action',
    genres: ['Action', 'Thriller'],
    language: 'English',
    languages: ['English', 'Zulu'],
    showtime: 'Evening',
    duration: '2h 15min',
    rating: 4.5,
    ageRating: '16+',
    director: 'Akin Omotoso',
    writer: 'Kagiso Lediga',
    overview: 'A gripping action thriller set in the heart of Cape Town. When a veteran detective uncovers a conspiracy that reaches the highest levels of power, he must navigate a web of deception, betrayal, and danger to expose the truth. Featuring breathtaking chase sequences through the streets of the Mother City and a star-studded cast, this premiere event promises an unforgettable cinematic experience with exclusive behind-the-scenes access and a post-screening Q&A with the director.',
    cast: [
      { name: 'Thuso Mbedu', role: 'Detective Naledi', photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'John Boyega', role: 'Marcus Cole', photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Nomzamo Mbatha', role: 'Zara Obi', photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Idris Elba', role: 'Commander Shaw', photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Pearl Thusi', role: 'Agent Khumalo', photo: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=300' },
    ],
    cinemas: [
      { name: 'Ster-Kinekor V&A Waterfront', location: 'V&A Waterfront, Cape Town', showtimes: ['10:00 AM', '1:30 PM', '5:00 PM', '8:30 PM'], price: '149.00' },
      { name: 'Nu Metro Canal Walk', location: 'Canal Walk Mall, Cape Town', showtimes: ['11:00 AM', '3:00 PM', '7:00 PM'], price: '129.00' },
      { name: 'Ster-Kinekor Cavendish', location: 'Cavendish Square, Claremont', showtimes: ['12:00 PM', '4:30 PM', '9:00 PM'], price: '139.00' },
    ],
    gallery: [
      'https://images.pexels.com/photos/7991319/pexels-photo-7991319.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/65128/pexels-photo-65128.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/436413/pexels-photo-436413.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    price: '649.00',
    image: 'https://images.pexels.com/photos/7991319/pexels-photo-7991319.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-movie-2',
    category: 'Movies',
    title: 'Pan African Film Gala',
    subtitle: 'Red Carpet Feature Screening',
    date: '2025-11-28',
    location: 'Westgate Premiere Hall, Nairobi',
    city: 'Nairobi',
    country: 'Kenya',
    genre: 'Drama',
    genres: ['Drama', 'Romance'],
    language: 'Swahili',
    languages: ['Swahili', 'English', 'Yoruba'],
    showtime: 'Afternoon',
    duration: '1h 58min',
    rating: 4.8,
    ageRating: '13+',
    director: 'Wanuri Kahiu',
    writer: 'Jenna Bass',
    overview: 'An emotional masterpiece celebrating the rich tapestry of African storytelling. This gala screening features a powerful drama that follows three generations of women in Nairobi as they navigate love, loss, and legacy. With stunning cinematography capturing the beauty of East Africa and performances that have already earned standing ovations at Cannes, this is a cinematic event not to be missed. The gala includes a red carpet reception and exclusive panel discussion.',
    cast: [
      { name: 'Lupita Nyong\'o', role: 'Mama Wanjiku', photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Omotola Jalade', role: 'Amara', photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Chiwetel Ejiofor', role: 'Professor Okafor', photo: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Adesua Etomi', role: 'Young Wanjiku', photo: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=300' },
    ],
    cinemas: [
      { name: 'Westgate Premiere Hall', location: 'Westgate Mall, Nairobi', showtimes: ['2:00 PM', '5:30 PM', '8:00 PM'], price: '199.00' },
      { name: 'IMAX Garden City', location: 'Garden City Mall, Nairobi', showtimes: ['3:00 PM', '6:30 PM', '9:30 PM'], price: '249.00' },
    ],
    gallery: [
      'https://images.pexels.com/photos/274937/pexels-photo-274937.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/7234394/pexels-photo-7234394.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1117132/pexels-photo-1117132.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    price: '899.00',
    image: 'https://images.pexels.com/photos/274937/pexels-photo-274937.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-movie-3',
    category: 'Movies',
    title: 'Cinema Under The Stars',
    subtitle: 'Open-Air Family Pass',
    date: '2025-12-02',
    location: 'Lake Victoria Gardens, Kampala',
    city: 'Kampala',
    country: 'Uganda',
    genre: 'Comedy',
    genres: ['Comedy', 'Family'],
    language: 'English',
    languages: ['English', 'Swahili'],
    showtime: 'Late Night',
    duration: '1h 42min',
    rating: 4.2,
    ageRating: 'PG',
    director: 'Katende Morris',
    writer: 'Patience Ndidi',
    overview: 'A heartwarming family comedy set against the breathtaking backdrop of Lake Victoria. When a quirky Ugandan family inherits a dilapidated outdoor cinema, they must come together to restore it before a property developer swoops in. Filled with laugh-out-loud moments, vibrant musical numbers, and a touching message about community and heritage, this open-air screening under the stars is the perfect outing for the whole family. Bring your blankets and enjoy the magic of outdoor cinema!',
    cast: [
      { name: 'Daniel Kaluuya', role: 'Uncle Mukasa', photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Anne Kansiime', role: 'Auntie Rose', photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=300' },
      { name: 'Maimouna Doumbia', role: 'Nana', photo: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=300' },
    ],
    cinemas: [
      { name: 'Lake Victoria Open Air', location: 'Lake Victoria Gardens, Kampala', showtimes: ['6:30 PM', '9:00 PM'], price: '99.00' },
      { name: 'Acacia Mall Cinema', location: 'Acacia Mall, Kampala', showtimes: ['4:00 PM', '7:30 PM', '10:00 PM'], price: '119.00' },
    ],
    gallery: [
      'https://images.pexels.com/photos/109669/pexels-photo-109669.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1200450/pexels-photo-1200450.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1117132/pexels-photo-1117132.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/7234394/pexels-photo-7234394.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    price: '499.00',
    image: 'https://images.pexels.com/photos/109669/pexels-photo-109669.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const bookingsPrototypeConcertItems = [
  {
    id: 'booking-concert-1',
    category: 'Concerts',
    title: 'Sunburn Festival 2025',
    subtitle: '',
    date: '2025-11-25',
    location: 'Clifton Beach, Cape Town',
    country: 'South Africa',
    price: '1,499.00',
    image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-concert-2',
    category: 'Concerts',
    title: 'Rock Revolution',
    subtitle: 'Multi Artist',
    date: '2025-11-28',
    location: 'Nairobi Arboretum Grounds',
    country: 'Kenya',
    price: '3,999.00',
    image: 'https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-concert-3',
    category: 'Concerts',
    title: 'DJ Alan Walker',
    subtitle: '',
    date: '2025-12-02',
    location: 'Lugogo Grounds, Kampala',
    country: 'Uganda',
    price: '1,999.00',
    image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const bookingsPrototypeSportsItems = [
  {
    id: 'booking-sports-1',
    category: 'Sports',
    title: 'Kenya vs Uganda',
    subtitle: 'East Africa Cup',
    date: '2025-11-25',
    location: 'St George\'s Park, South Africa',
    country: 'South Africa',
    price: '505.99',
    image: 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-sports-2',
    category: 'Sports',
    title: 'Morocco vs Senegal',
    subtitle: 'World Cup Qualifier',
    date: '2025-11-28',
    location: 'FNB Stadium, Johannesburg',
    country: 'South Africa',
    price: '1,999.00',
    image: 'https://images.pexels.com/photos/274506/pexels-photo-274506.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-sports-3',
    category: 'Sports',
    title: 'Uganda vs Zambia',
    subtitle: 'Victoria Cup',
    date: '2025-12-02',
    location: 'Loftus Versfeld, Pretoria',
    country: 'South Africa',
    price: '1,999.00',
    image: 'https://images.pexels.com/photos/3628912/pexels-photo-3628912.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const bookingsPrototypeTravelItems = [
  {
    id: 'booking-travel-1',
    category: 'Travel',
    title: 'Lagos to Dubai',
    subtitle: 'Direct Flight',
    meta: 'Flexible dates',
    provider: 'Emirates Airlines',
    date: '',
    sortDate: '2025-12-31',
    location: 'Dubai International',
    country: 'United Arab Emirates',
    price: '22,499.00',
    image: 'https://images.pexels.com/photos/912050/pexels-photo-912050.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-travel-2',
    category: 'Travel',
    title: 'Nairobi to Mombasa',
    subtitle: 'Luxury Bus',
    meta: 'Daily departures',
    provider: 'Comfortable Sleeper Coach',
    date: '',
    sortDate: '2025-12-15',
    location: 'Kenya Coastal Route',
    country: 'Kenya',
    price: '889.99',
    image: 'https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'booking-travel-3',
    category: 'Travel',
    title: 'Nairobi to Zanzibar',
    subtitle: 'Island Hop Coastal Air',
    meta: 'Dec 2, 2025',
    provider: 'Zanzibar Airlines',
    date: '2025-12-02',
    sortDate: '2025-12-02',
    location: 'Zanzibar International',
    country: 'Tanzania',
    price: '45,999.00',
    image: 'https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const buildBookingsPrototypeDetails = (item, locale = 'en-US') => {
  const parts = [];

  if (item.subtitle) {
    parts.push(item.subtitle);
  }

  if (item.meta) {
    parts.push(item.meta);
  } else if (item.date) {
    parts.push(formatDate(item.date, locale));
  }

  if (item.provider) {
    parts.push(item.provider);
  }

  if (item.location) {
    parts.push(item.location);
  }

  return parts.filter(Boolean).join(' • ');
};

const homeHeroSlides = [
  {
    id: 'hero-1',
    image:
      'https://images.pexels.com/photos/6169668/pexels-photo-6169668.jpeg?auto=compress&cs=tinysrgb&w=1920',
    label: 'Trending Innovation',
    title: 'Fashion Forward Collection',
    subtitle: 'Trending styles for the modern you',
  },
  {
    id: 'hero-2',
    image:
      'https://images.pexels.com/photos/5632398/pexels-photo-5632398.jpeg?auto=compress&cs=tinysrgb&w=1920',
    label: 'Trending Innovation',
    title: 'Fashion Forward Collection',
    subtitle: 'Trending styles for the modern you',
  },
  {
    id: 'hero-3',
    image:
      'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=1920',
    label: 'Trending Innovation',
    title: 'Fashion Forward Collection',
    subtitle: 'Trending styles for the modern you',
  },
];

const leaderboardSeed = [
  { id: 'e1', name: 'Mina Sports Lab', accuracy: 88.5, votes: 10200, rank: 1 },
  { id: 'e2', name: 'Odds Insight Pro', accuracy: 86.1, votes: 9340, rank: 2 },
  { id: 'e3', name: 'Goal Tracker TV', accuracy: 82, votes: 8805, rank: 3 },
  { id: 'e4', name: 'Prime Match Picks', accuracy: 79.9, votes: 8102, rank: 4 },
  { id: 'e5', name: 'Stat Vision Africa', accuracy: 77.3, votes: 7720, rank: 5 },
];

const matchSeed = [
  { id: 'm1', match: 'Man City vs Arsenal', options: ['Man City Win', 'Draw', 'Arsenal Win'], split: '56%' },
  { id: 'm2', match: 'PSG vs Inter Milan', options: ['PSG Win', 'Draw', 'Inter Win'], split: '51%' },
  { id: 'm3', match: 'Barcelona vs Atletico', options: ['Barcelona Win', 'Draw', 'Atletico Win'], split: '62%' },
];

const groceriesCategoryCards = [
  {
    key: 'fruitsVegetables',
    title: 'Fruits & Vegetables',
    subtitle: 'Fresh & farm-picked',
    image:
      'https://images.pexels.com/photos/1656663/pexels-photo-1656663.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'dairyEggs',
    title: 'Dairy & Eggs',
    subtitle: 'Pure daily essentials',
    image:
      'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'meatSeafood',
    title: 'Meat & Seafood',
    subtitle: 'Fresh & quality cuts',
    image:
      'https://images.pexels.com/photos/13749941/pexels-photo-13749941.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'bakerySnacks',
    title: 'Bakery & Snacks',
    subtitle: 'Baked fresh, always tasty',
    image:
      'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'beverages',
    title: 'Drinks',
    subtitle: 'Refreshing everyday drinks',
    image:
      'https://images.pexels.com/photos/4113669/pexels-photo-4113669.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'staplesGrains',
    title: 'Staples & Grains',
    subtitle: 'Pantry essentials',
    image:
      'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    key: 'personalCare',
    title: 'Personal Care',
    subtitle: 'Daily care essentials',
    image:
      'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'householdEssentials',
    title: 'Household Essentials',
    subtitle: 'Home care basics',
    image:
      'https://images.pexels.com/photos/7492919/pexels-photo-7492919.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const groceriesCategoryKeywordMap = {
  fruitsVegetables: ['fruit', 'vegetable', 'produce', 'tomato', 'citrus', 'spinach', 'avocado', 'banana', 'apple', 'pepper', 'onion'],
  dairyEggs: ['dairy', 'egg', 'milk', 'yoghurt', 'yogurt', 'cheese', 'butter'],
  meatSeafood: ['meat', 'seafood', 'chicken', 'beef', 'fish', 'salmon', 'prawn'],
  bakerySnacks: ['bakery', 'bread', 'loaf', 'croissant', 'snack', 'biscuit', 'chips', 'cookie'],
  beverages: ['beverage', 'drink', 'juice', 'water', 'soda', 'tea', 'coffee'],
  staplesGrains: ['staple', 'grain', 'rice', 'maize', 'flour', 'pasta', 'beans', 'cereal'],
  personalCare: ['personal care', 'body wash', 'soap', 'toothpaste', 'lotion', 'shampoo', 'deodorant'],
  householdEssentials: ['household', 'cleaner', 'detergent', 'dishwashing', 'laundry', 'tissue', 'paper towel'],
};

const resolveGroceriesCategoryKey = (item = {}) => {
  if (item.categoryKey && groceriesCategoryCards.some((category) => category.key === item.categoryKey)) {
    return item.categoryKey;
  }

  const haystack = `${item.category || ''} ${item.title || ''} ${item.description || ''}`.toLowerCase();

  const matchedCategory = groceriesCategoryCards.find((category) => {
    if (haystack.includes(category.title.toLowerCase())) {
      return true;
    }

    return groceriesCategoryKeywordMap[category.key].some((keyword) => haystack.includes(keyword));
  });

  return matchedCategory?.key || null;
};

const getGroceriesCategoryTitle = (categoryKey = '') => (
  groceriesCategoryCards.find((category) => category.key === categoryKey)?.title || ''
);

const groceries = [
  {
    id: 'g1',
    categoryKey: 'fruitsVegetables',
    title: 'Fresh Tomatoes Pack',
    price: '4.50',
    discount: '20% Off',
    description: 'Sun-ripened tomatoes for salads, stews, and sauces.',
    image:
      'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g2',
    categoryKey: 'dairyEggs',
    title: 'Organic Eggs 12 Pack',
    price: '5.99',
    discount: 'Buy 1 Get 1 Free',
    description: 'Farm-fresh eggs for breakfast, baking, and family meals.',
    image:
      'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g3',
    categoryKey: 'fruitsVegetables',
    title: 'Fresh Citrus Crate',
    price: '7.99',
    discount: 'Weekly Deal',
    description: 'A bright mix of oranges, lemons, and grapefruit.',
    image:
      'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g4',
    categoryKey: 'fruitsVegetables',
    title: 'Garden Spinach Bunch',
    price: '3.25',
    discount: 'Fresh Pick',
    description: 'Leafy greens for smoothies, sautés, and quick salads.',
    image:
      'https://images.pexels.com/photos/2329440/pexels-photo-2329440.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g5',
    categoryKey: 'dairyEggs',
    title: 'Whole Milk 2L',
    price: '3.89',
    discount: 'Family Saver',
    description: 'Creamy full-cream milk for cereal, tea, and cooking.',
    image:
      'https://images.pexels.com/photos/5946721/pexels-photo-5946721.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g6',
    categoryKey: 'dairyEggs',
    title: 'Aged Cheddar Block',
    price: '6.49',
    discount: 'Best Seller',
    description: 'Rich cheddar cheese for sandwiches, platters, and sauces.',
    image:
      'https://images.pexels.com/photos/821365/pexels-photo-821365.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g7',
    categoryKey: 'meatSeafood',
    title: 'Chicken Fillet Tray',
    price: '8.99',
    discount: 'Protein Pick',
    description: 'Fresh boneless chicken fillets ready for grilling or frying.',
    image:
      'https://images.pexels.com/photos/616354/pexels-photo-616354.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g8',
    categoryKey: 'meatSeafood',
    title: 'Salmon Portion Pack',
    price: '12.99',
    discount: 'Chef Choice',
    description: 'Fresh salmon portions with a clean, buttery finish.',
    image:
      'https://images.pexels.com/photos/3296275/pexels-photo-3296275.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g9',
    categoryKey: 'bakerySnacks',
    title: 'Soft Sandwich Loaf',
    price: '2.95',
    discount: 'Daily Bake',
    description: 'Freshly baked bread for toast, lunches, and quick sandwiches.',
    image:
      'https://images.pexels.com/photos/1775037/pexels-photo-1775037.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g10',
    categoryKey: 'bakerySnacks',
    title: 'Crunchy Snack Crisps',
    price: '2.50',
    discount: '2 for 1',
    description: 'Crispy snack packs for lunchboxes, parties, and cravings.',
    image:
      'https://images.pexels.com/photos/568805/pexels-photo-568805.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g11',
    categoryKey: 'beverages',
    title: 'Orange Juice Blend',
    price: '3.40',
    discount: 'Chilled Deal',
    description: 'Bright citrus juice for breakfast tables and packed lunches.',
    image:
      'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g12',
    categoryKey: 'beverages',
    title: 'Sparkling Water Six Pack',
    price: '4.99',
    discount: 'Weekend Special',
    description: 'Refreshing sparkling water with a crisp, clean finish.',
    image:
      'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g13',
    categoryKey: 'staplesGrains',
    title: 'Premium Jasmine Rice 5kg',
    price: '10.99',
    discount: 'Pantry Value',
    description: 'Fragrant long-grain rice for everyday family meals.',
    image:
      'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g14',
    categoryKey: 'staplesGrains',
    title: 'Stoneground Maize Meal',
    price: '6.75',
    discount: 'Kitchen Staple',
    description: 'A household staple for porridge and hearty side dishes.',
    image:
      'https://images.pexels.com/photos/7421204/pexels-photo-7421204.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g15',
    categoryKey: 'personalCare',
    title: 'Moisture Body Wash',
    price: '4.89',
    discount: 'Self Care Pick',
    description: 'Gentle body wash for a soft, fresh daily routine.',
    image:
      'https://images.pexels.com/photos/4465124/pexels-photo-4465124.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g16',
    categoryKey: 'personalCare',
    title: 'Fresh Mint Toothpaste',
    price: '2.99',
    discount: 'Dental Care',
    description: 'Everyday toothpaste for a clean and refreshing finish.',
    image:
      'https://images.pexels.com/photos/298611/pexels-photo-298611.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g17',
    categoryKey: 'householdEssentials',
    title: 'Dishwashing Liquid',
    price: '3.10',
    discount: 'Home Saver',
    description: 'Cuts through grease while staying gentle on hands.',
    image:
      'https://images.pexels.com/photos/4108273/pexels-photo-4108273.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g18',
    categoryKey: 'householdEssentials',
    title: 'Laundry Detergent Refill',
    price: '8.25',
    discount: 'Bulk Value',
    description: 'Long-lasting detergent refill for bright, fresh laundry.',
    image:
      'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const stationeryItems = [
  {
    id: 's1',
    title: 'Executive Ballpoint Pen Set',
    category: 'Pens',
    description: 'Smooth-writing pens for school, office, and front-desk use.',
    price: '6.99',
    image:
      'https://images.pexels.com/photos/261763/pexels-photo-261763.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 's2',
    title: 'A4 Hardcover Exercise Books Pack',
    category: 'Books',
    description: 'Durable ruled books for class notes, stock records, and admin work.',
    price: '9.50',
    image:
      'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 's3',
    title: 'Duplicate Invoice Book',
    category: 'Invoice Books',
    description: 'Carbonless duplicate pages for retail, delivery, and field sales.',
    price: '4.25',
    image:
      'https://images.pexels.com/photos/669365/pexels-photo-669365.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 's4',
    title: 'Desk Stationery Essentials Bundle',
    category: 'Office Supplies',
    description: 'Stapler, sticky notes, paper clips, and markers in one pack.',
    price: '12.99',
    image:
      'https://images.pexels.com/photos/355952/pexels-photo-355952.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const constructionToolsItems = [
  {
    id: 'ct1',
    title: 'Heavy-Duty Claw Hammer',
    category: 'Hand Tools',
    description: 'Forged steel hammer for framing, finishing, and general site work.',
    price: '18.99',
    image:
      'https://images.pexels.com/photos/209235/pexels-photo-209235.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'ct2',
    title: 'Cordless Impact Drill Kit',
    category: 'Power Tools',
    description: '2-battery drill set for concrete anchors, woodwork, and steel fixtures.',
    price: '129.00',
    image:
      'https://images.pexels.com/photos/162553/drill-machine-tool-construction-162553.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'ct3',
    title: 'Masonry Trowel and Float Set',
    category: 'Masonry',
    description: 'Trowel combo for plastering, leveling mortar, and smooth finishing.',
    price: '24.50',
    image:
      'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'ct4',
    title: 'Laser Level with Tripod',
    category: 'Measuring Tools',
    description: 'Precision leveling for tiles, ceilings, partitions, and layout lines.',
    price: '67.40',
    image:
      'https://images.pexels.com/photos/159358/construction-site-build-construction-work-159358.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const fastFoodItems = [
  {
    id: 'f1',
    title: 'Double Beef Burger Combo',
    category: 'Burgers',
    prepTime: '15 min',
    price: '8.99',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f2',
    title: 'Crispy Chicken Bucket',
    category: 'Chicken',
    prepTime: '20 min',
    price: '12.49',
    image:
      'https://images.pexels.com/photos/12081205/pexels-photo-12081205.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f3',
    title: 'Loaded Pepperoni Pizza',
    category: 'Pizza',
    prepTime: '25 min',
    price: '10.99',
    image:
      'https://images.pexels.com/photos/825661/pexels-photo-825661.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f4',
    title: 'Shawarma Wrap Meal',
    category: 'Wraps',
    prepTime: '12 min',
    price: '7.49',
    image:
      'https://images.pexels.com/photos/5779367/pexels-photo-5779367.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f5',
    title: 'Cheesy Fries Supreme',
    category: 'Sides',
    prepTime: '10 min',
    price: '4.99',
    image:
      'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f6',
    title: 'Taco Trio Plate',
    category: 'Tacos',
    prepTime: '14 min',
    price: '9.49',
    image:
      'https://images.pexels.com/photos/4958792/pexels-photo-4958792.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f7',
    title: 'Spicy Noodles Bowl',
    category: 'Noodles',
    prepTime: '13 min',
    price: '6.99',
    image:
      'https://images.pexels.com/photos/955137/pexels-photo-955137.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'f8',
    title: 'Chocolate Shake Deluxe',
    category: 'Drinks',
    prepTime: '6 min',
    price: '3.99',
    image:
      'https://images.pexels.com/photos/3727250/pexels-photo-3727250.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const beveragesLiquorItems = [
  {
    id: 'bl1',
    title: 'Tropical Fruit Smoothie',
    category: 'Beverages',
    volume: '450ml',
    price: '3.49',
    image:
      'https://images.pexels.com/photos/4051795/pexels-photo-4051795.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl2',
    title: 'Iced Caramel Latte',
    category: 'Beverages',
    volume: '380ml',
    price: '2.99',
    image:
      'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl3',
    title: 'Sparkling Citrus Soda Pack',
    category: 'Beverages',
    volume: '6 x 330ml',
    price: '5.99',
    image:
      'https://images.pexels.com/photos/544961/pexels-photo-544961.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl4',
    title: 'Premium Red Wine',
    category: 'Liquors',
    volume: '750ml',
    price: '18.99',
    image:
      'https://images.pexels.com/photos/434311/pexels-photo-434311.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl5',
    title: 'Craft Lager 6-Pack',
    category: 'Liquors',
    volume: '6 x 330ml',
    price: '11.49',
    image:
      'https://images.pexels.com/photos/1269025/pexels-photo-1269025.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl6',
    title: 'Gold Reserve Whiskey',
    category: 'Liquors',
    volume: '700ml',
    price: '29.99',
    image:
      'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl7',
    title: 'Classic Tonic Water Case',
    category: 'Beverages',
    volume: '12 x 250ml',
    price: '9.99',
    image:
      'https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'bl8',
    title: 'Botanical Gin Signature',
    category: 'Liquors',
    volume: '750ml',
    price: '24.99',
    image:
      'https://images.pexels.com/photos/1283219/pexels-photo-1283219.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const wellnessItems = [
  {
    id: 'w1',
    title: 'Daily Immunity Boost',
    price: '18.99',
    image:
      'https://images.pexels.com/photos/3683098/pexels-photo-3683098.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'w2',
    title: 'Pain Relief Tablets',
    price: '6.75',
    image:
      'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'w3',
    title: 'First Aid Home Kit',
    price: '24.00',
    image:
      'https://images.pexels.com/photos/4021779/pexels-photo-4021779.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const traditionalMedicinesItems = [
  {
    id: 'tm1',
    title: 'Wild Harvested African Ginger Root',
    category: 'Herbs',
    description: 'Dried root cuts for teas, tonics, and traditional wellness blends.',
    price: '14.50',
    image:
      'https://images.pexels.com/photos/4198166/pexels-photo-4198166.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'tm2',
    title: 'Moringa Leaf Powder Blend',
    category: 'Traditional Supplements',
    description: 'Stone-milled moringa leaf powder prepared for daily herbal use.',
    price: '11.20',
    image:
      'https://images.pexels.com/photos/6693658/pexels-photo-6693658.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'tm3',
    title: 'Herbal Steam Relief Mix',
    category: 'Traditional Remedies',
    description: 'Aromatic leaf and bark blend for home steam and inhalation rituals.',
    price: '9.80',
    image:
      'https://images.pexels.com/photos/6157223/pexels-photo-6157223.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'tm4',
    title: 'Dried Artemisia Herbal Bundle',
    category: 'Medicinal Herbs',
    description: 'Sun-dried herbal stems and leaves packaged for decoctions and infusions.',
    price: '12.40',
    image:
      'https://images.pexels.com/photos/6941876/pexels-photo-6941876.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'tm5',
    title: 'Traditional Wellness Bark Pack',
    category: 'Botanical Remedies',
    description: 'Mixed bark selection sourced for traditional healing preparations.',
    price: '16.90',
    image:
      'https://images.pexels.com/photos/6693652/pexels-photo-6693652.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const homeCareProviders = [
  { id: 'h1', name: 'QuickFix Plumbing', rating: 4.7, type: 'Plumbing', city: 'Pietermaritzburg' },
  { id: 'h2', name: 'Bright Spark Electric', rating: 4.6, type: 'Electrical', city: 'Durban' },
  { id: 'h3', name: 'HomeClean Pro', rating: 4.8, type: 'Cleaning', city: 'Cape Town' },
];

const techItems = [
  {
    id: 'x1',
    title: 'Ultra Laptop 15',
    price: '899.00',
    image:
      'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'x2',
    title: 'Developer Mechanical Keyboard',
    price: '139.00',
    image:
      'https://images.pexels.com/photos/2115256/pexels-photo-2115256.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'x3',
    title: 'Secure Home Router',
    price: '99.00',
    image:
      'https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const livestockImageFallback = 'https://images.pexels.com/photos/735968/pexels-photo-735968.jpeg?auto=compress&cs=tinysrgb&w=1200';

const propertyListings = [
  {
    id: 'pr1',
    title: 'Skyline Luxury Apartment',
    titleKey: 'propertyHub.items.pr1.title',
    location: 'Cape Town Waterfront',
    locationKey: 'propertyHub.items.pr1.location',
    type: '2 Bedroom Apartment',
    typeKey: 'propertyHub.items.pr1.type',
    price: '24,500 / month',
    image:
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'pr2',
    title: 'Greenbelt Family Home',
    titleKey: 'propertyHub.items.pr2.title',
    location: 'Pietermaritzburg Hills',
    locationKey: 'propertyHub.items.pr2.location',
    type: '4 Bedroom House',
    typeKey: 'propertyHub.items.pr2.type',
    price: '3,850,000',
    image:
      'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'pr3',
    title: 'Harbour Office Suite',
    titleKey: 'propertyHub.items.pr3.title',
    location: 'Durban Central',
    locationKey: 'propertyHub.items.pr3.location',
    type: 'Commercial Space',
    typeKey: 'propertyHub.items.pr3.type',
    price: '185 / m2',
    image:
      'https://images.pexels.com/photos/37347/office-sitting-room-executive-sitting.jpg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const lotteryGames = [
  {
    id: 'lg1',
    title: 'EuroMillions Global Draw',
    titleKey: 'internationalLotteryHub.items.lg1.title',
    region: 'Europe',
    regionKey: 'internationalLotteryHub.items.lg1.region',
    drawDay: 'Friday',
    drawDayKey: 'internationalLotteryHub.items.lg1.drawDay',
    jackpot: '128 Million',
    image:
      'https://images.pexels.com/photos/2942085/pexels-photo-2942085.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'lg2',
    title: 'Powerball International',
    titleKey: 'internationalLotteryHub.items.lg2.title',
    region: 'North America',
    regionKey: 'internationalLotteryHub.items.lg2.region',
    drawDay: 'Wednesday',
    drawDayKey: 'internationalLotteryHub.items.lg2.drawDay',
    jackpot: '214 Million',
    image:
      'https://images.pexels.com/photos/7594069/pexels-photo-7594069.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'lg3',
    title: 'Pan-African Mega Millions',
    titleKey: 'internationalLotteryHub.items.lg3.title',
    region: 'Africa',
    regionKey: 'internationalLotteryHub.items.lg3.region',
    drawDay: 'Saturday',
    drawDayKey: 'internationalLotteryHub.items.lg3.drawDay',
    jackpot: '42 Million',
    image:
      'https://images.pexels.com/photos/8112194/pexels-photo-8112194.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const livestockItems = [
  {
    id: 'ls1',
    title: 'Brahman Breeding Bull',
    titleKey: 'livestockHub.items.ls1.title',
    location: 'Free State, South Africa',
    locationKey: 'livestockHub.items.ls1.location',
    summary: '22 months • Vaccinated • Auction-ready',
    summaryKey: 'livestockHub.items.ls1.summary',
    price: '28,000',
    image: livestockImageFallback,
  },
  {
    id: 'ls2',
    title: 'Dorper Sheep Trio',
    titleKey: 'livestockHub.items.ls2.title',
    location: 'Lesotho Highlands',
    locationKey: 'livestockHub.items.ls2.location',
    summary: 'Healthy ewes • Ready for breeding season',
    summaryKey: 'livestockHub.items.ls2.summary',
    price: '9,800',
    image:
      'https://images.pexels.com/photos/751689/pexels-photo-751689.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'ls3',
    title: 'Boer Goat Starter Herd',
    titleKey: 'livestockHub.items.ls3.title',
    location: 'Limpopo Farm Belt',
    locationKey: 'livestockHub.items.ls3.location',
    summary: '5 goats • Tagged • Delivery support available',
    summaryKey: 'livestockHub.items.ls3.summary',
    price: '14,500',
    image:
      'https://images.pexels.com/photos/144240/goat-lamb-little-grass-144240.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const mobilityVehiclesItems = [
  {
    id: 'mv1',
    title: 'CityCruise Sedan 1.8 Auto',
    category: 'Car',
    specification: '2022 model • 48,000 km • Automatic',
    price: '289000',
    image:
      'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'mv2',
    title: 'StormRider 650 Touring Bike',
    category: 'Motorcycle',
    specification: 'ABS • 12,400 km • Touring ready',
    price: '118000',
    image:
      'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'mv3',
    title: 'MetroLink Passenger Coach',
    category: 'Rail',
    specification: '84 seats • Refurbished interior • Fleet unit',
    price: '4900000',
    image:
      'https://images.pexels.com/photos/302428/pexels-photo-302428.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'mv4',
    title: 'AeroSwift Trainer Aircraft',
    category: 'Aircraft',
    specification: '2-seater • 2020 avionics package • Hangared',
    price: '1850000',
    image:
      'https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'mv5',
    title: 'TrailVolt Carbon Adventure Bike',
    category: 'Bicycle',
    specification: '27-speed • Carbon frame • Trail setup',
    price: '42000',
    image:
      'https://images.pexels.com/photos/100582/pexels-photo-100582.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const fashionStyleItems = [
  {
    id: 'fs1',
    title: 'Tailored Linen Two-Piece Set',
    category: 'Clothing',
    specification: 'Breathable linen • Neutral palette',
    price: '1799',
    image:
      'https://images.pexels.com/photos/934070/pexels-photo-934070.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'fs2',
    title: 'Street Motion Leather Sneakers',
    category: 'Footwear',
    specification: 'Cushioned sole • Everyday wear',
    price: '1299',
    image:
      'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'fs3',
    title: 'Signature Occasion Heels',
    category: 'Shoes',
    specification: 'Evening finish • Comfort footbed',
    price: '1599',
    image:
      'https://images.pexels.com/photos/267301/pexels-photo-267301.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'fs4',
    title: 'Classic Denim Utility Jacket',
    category: 'Outerwear',
    specification: 'Layer-ready • Mid-weight denim',
    price: '1149',
    image:
      'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'fs5',
    title: 'Travel Leather Weekender',
    category: 'Accessories',
    specification: 'Full-grain finish • Cabin-friendly',
    price: '2499',
    image:
      'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const naturalResourcesItems = [
  {
    id: 'nr1',
    title: 'Industrial Grade Copper Cathodes',
    category: 'Minerals',
    specification: '99.99% purity • Export-ready lots',
    price: '86000',
    image:
      'https://source.unsplash.com/1200x900/?copper,metal,industry',
  },
  {
    id: 'nr2',
    title: 'Washed River Sand Bulk Supply',
    category: 'Aggregates',
    specification: 'Construction grade • Bulk delivery available',
    price: '18500',
    image:
      'https://source.unsplash.com/1200x900/?sand,quarry,aggregate',
  },
  {
    id: 'nr3',
    title: 'Dimension Granite Blocks',
    category: 'Stone',
    specification: 'Cut-to-order • Quarry sourced',
    price: '54000',
    image:
      'https://source.unsplash.com/1200x900/?granite,stone,quarry',
  },
  {
    id: 'nr4',
    title: 'Hardwood Timber Packs',
    category: 'Natural Resources',
    specification: 'Kiln-dried • Furniture and structural use',
    price: '32000',
    image:
      'https://source.unsplash.com/1200x900/?timber,lumber,wood',
  },
  {
    id: 'nr5',
    title: 'Refined Sea Salt Mineral Stock',
    category: 'Mineral Products',
    specification: 'Food and industrial grade options',
    price: '9500',
    image:
      'https://source.unsplash.com/1200x900/?sea-salt,mineral,salt',
  },
];

const footerLinks = {
  quick: [
    { labelKey: 'footer.about', href: '/about' },
    { labelKey: 'footer.careers', href: '/careers' },
    { labelKey: 'footer.blog', href: '/blog' },
  ],
  support: [
    { labelKey: 'footer.help', href: '/help' },
    { labelKey: 'footer.contact', href: '/contact' },
    { labelKey: 'footer.terms', href: '/terms' },
    { labelKey: 'footer.privacy', href: '/privacy' },
  ],
};

const buildSearchText = (parts) => parts.filter(Boolean).join(' ').toLowerCase();

const getTranslatedValue = (t, key, defaultValue) => (key ? t(key, { defaultValue }) : defaultValue);

const searchableCatalog = [
  ...productCards.map((item) => ({
    ...item,
    section: 'Plenty E-Commerce Market',
    route: '/e-commerce',
    searchText: buildSearchText([
      item.title,
      item.subtitle,
      item.price,
      'ecommerce e-commerce market shop shopping fashion gadgets electronics',
    ]),
  })),
  ...ticketEvents.map((item) => ({
    ...item,
    section: 'Tickets Sales Hub',
    route: '/tickets',
    searchText: buildSearchText([
      item.title,
      item.type,
      item.location,
      item.price,
      'tickets booking movie concert sports travel events',
    ]),
  })),
  ...groceries.map((item) => ({
    ...item,
    section: 'Groceries Hub',
    route: '/groceries',
    searchText: buildSearchText([
      item.title,
      item.discount,
      item.price,
      'food groceries fruits vegetables basket delivery',
    ]),
  })),
  ...fastFoodItems.map((item) => ({
    ...item,
    section: 'Fast Foods Hub',
    route: '/fast-food',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.price,
      item.prepTime,
      'fast food burgers chicken pizza wraps fries tacos noodles drinks delivery',
    ]),
  })),
  ...beveragesLiquorItems.map((item) => ({
    ...item,
    section: 'Beverages & Liquors Hub',
    route: '/beverages-liquors',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.price,
      item.volume,
      'beverages liquor wine whiskey beer gin tonic drinks soda coffee smoothie',
    ]),
  })),
  ...wellnessItems.map((item) => ({
    ...item,
    section: 'Wellness Products Hub',
    route: '/wellness',
    searchText: buildSearchText([
      item.title,
      item.price,
      'wellness health medicine medicines pharmacy tablets first aid',
    ]),
  })),
  ...traditionalMedicinesItems.map((item) => ({
    ...item,
    section: 'Traditional Medicines and Herbs Market',
    sectionKey: 'markets.traditionalMedicines',
    route: '/traditional-medicines-herbs',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.description,
      item.price,
      'traditional medicine medicines herbs herbal remedies roots bark leaves moringa ginger botanical healing',
    ]),
  })),
  ...stationeryItems.map((item) => ({
    ...item,
    section: 'Stationery and Office Supplies Hub',
    sectionKey: 'markets.stationery',
    route: '/stationery-office',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.description,
      item.price,
      'stationery stationary pens pen books notebooks invoice books office school supplies',
    ]),
  })),
  ...constructionToolsItems.map((item) => ({
    ...item,
    section: 'Building Materials, Construction and Engineering Hub',
    sectionKey: 'markets.constructionTools',
    route: '/building-construction-tools',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.description,
      item.price,
      'construction building tools power tools hand tools masonry hardware site equipment',
    ]),
  })),
  ...techItems.map((item) => ({
    ...item,
    section: 'Hardwares & Softwares Hub',
    route: '/hardware-software',
    searchText: buildSearchText([
      item.title,
      item.price,
      'hardware software laptop keyboard router technology tech gadgets',
    ]),
  })),
  ...propertyListings.map((item) => ({
    ...item,
    section: 'Property Hub',
    sectionKey: 'markets.propertyHub',
    route: '/property-hub',
    searchText: buildSearchText([
      item.title,
      item.location,
      item.type,
      item.price,
      'property real estate apartment house office rental sale hub',
    ]),
  })),
  ...lotteryGames.map((item) => ({
    ...item,
    section: 'Betting and Lottery Games',
    sectionKey: 'markets.bettingLotteryGames',
    route: '/betting-lottery-games',
    searchText: buildSearchText([
      item.title,
      item.region,
      item.drawDay,
      item.jackpot,
      'lottery lotto jackpot draw games international millions powerball betting predictions odds',
    ]),
  })),
  ...livestockItems.map((item) => ({
    ...item,
    section: 'Livestock Online Selling & Buying Hub',
    sectionKey: 'markets.livestockHub',
    route: '/livestock-hub',
    searchText: buildSearchText([
      item.title,
      item.location,
      item.summary,
      item.price,
      'livestock cattle goats sheep farm buying selling agriculture hub',
    ]),
  })),
  ...mobilityVehiclesItems.map((item) => ({
    ...item,
    section: 'Mobility and Vehicles Exchange',
    sectionKey: 'markets.mobilityVehicles',
    route: '/mobility-vehicles',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.specification,
      item.price,
      'cars car motorcycles motorbikes train plane aircraft bicycle transport vehicles mobility exchange',
    ]),
  })),
  ...fashionStyleItems.map((item) => ({
    ...item,
    section: 'Fashion, Clothing and Footwear Market',
    sectionKey: 'markets.fashionStyle',
    route: '/fashion-style',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.specification,
      item.price,
      'fashion clothes clothing shoes sneakers heels apparel style boutique bags accessories',
    ]),
  })),
  ...naturalResourcesItems.map((item) => ({
    ...item,
    section: 'Natural Resources and Minerals Exchange',
    sectionKey: 'markets.naturalResources',
    route: '/natural-resources-minerals',
    searchText: buildSearchText([
      item.title,
      item.category,
      item.specification,
      item.price,
      'natural resources minerals copper sand granite timber salt quarry mining bulk commodities',
    ]),
  })),
];

const getCurrentYear = () => new Date().getFullYear();

const getAuthState = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem('svs-authenticated') === 'true';
};

const getThemePreference = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const savedTheme = window.localStorage.getItem('svs-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const CART_STORAGE_KEY = 'svs-cart-items';
const WISHLIST_STORAGE_KEY = 'svs-wishlist-items';
const ORDERS_STORAGE_KEY = 'svs-orders';
const NOTIFICATIONS_STORAGE_KEY = 'svs-notifications';
const PRODUCT_REVIEWS_STORAGE_KEY = 'svs-product-reviews';
const SELLER_ACCESS_STORAGE_KEY = 'svs-has-seller-access';
const SELLER_HOME_PATH_STORAGE_KEY = 'svs-seller-home-path';
const ORDER_STATUS_FLOW = ['Processing', 'Confirmed', 'Preparing for Shipping', 'Shipped', 'Delivered'];
const REFUND_STATUS_FLOW = ['Cancelled by Buyer', 'Refund Pending', 'Refund Made'];
const ORDER_AUTO_PROGRESS_MS = {
  confirmed: 45 * 1000,
  preparingForShipping: 3 * 60 * 1000,
  shipped: 8 * 60 * 1000,
  delivered: 15 * 60 * 1000,
};
const ORDERS_TABLE = 'orders';
const SELLER_ITEMS_TABLE = 'marketplace_items';
const CART_ITEMS_TABLE = 'cart_items';
const WISHLIST_ITEMS_TABLE = 'wishlist_items';
const PRODUCT_REVIEWS_TABLE = 'product_reviews';
const NOTIFICATIONS_TABLE = 'notifications';
const SELLER_IMAGES_BUCKET = 'marketplace-items';
const HARSH_REVIEW_TERMS = ['idiot', 'stupid', 'trash', 'garbage', 'useless', 'scam'];

const getStoredCollection = (storageKey) => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const getSellerAccessState = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SELLER_ACCESS_STORAGE_KEY) === 'true';
};

const getSellerHomePath = () => {
  if (typeof window === 'undefined') {
    return '/seller/dashboard';
  }

  const storedPath = window.localStorage.getItem(SELLER_HOME_PATH_STORAGE_KEY);
  return storedPath === '/sell/onboarding' ? storedPath : '/seller/dashboard';
};

const getCurrentUserEmail = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem('svs-user-email') || '';
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getUserScopedStorageKey = (storageKey, userEmail = getCurrentUserEmail()) => {
  const normalizedEmail = normalizeEmail(userEmail);
  return `${storageKey}:${normalizedEmail || 'guest'}`;
};

const getStoredCartItems = (userEmail = getCurrentUserEmail()) =>
  getStoredCollection(getUserScopedStorageKey(CART_STORAGE_KEY, userEmail));
const getStoredWishlistItems = (userEmail = getCurrentUserEmail()) =>
  getStoredCollection(getUserScopedStorageKey(WISHLIST_STORAGE_KEY, userEmail));
const getStoredOrders = (userEmail = getCurrentUserEmail()) =>
  getStoredCollection(getUserScopedStorageKey(ORDERS_STORAGE_KEY, userEmail));
const getStoredNotifications = (userEmail = getCurrentUserEmail()) =>
  getStoredCollection(getUserScopedStorageKey(NOTIFICATIONS_STORAGE_KEY, userEmail));
const getStoredProductReviews = () => getStoredCollection(PRODUCT_REVIEWS_STORAGE_KEY);

const createNotificationRecord = ({ title, message, href, orderId, type = 'info' }) => ({
  id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  title: String(title || 'Notification'),
  message: String(message || ''),
  href: String(href || '/orders'),
  orderId: String(orderId || ''),
  createdAt: new Date().toISOString(),
  read: false,
});

const mapNotificationRecord = (record) => ({
  id: String(record.notification_key || record.id || `notif-${Date.now()}`),
  type: String(record.type || 'info'),
  title: String(record.title || 'Notification'),
  message: String(record.message || ''),
  href: String(record.href || '/orders'),
  orderId: String(record.order_id || ''),
  createdAt: record.created_at || new Date().toISOString(),
  read: Boolean(record.is_read),
});

const toNotificationRecord = (userEmail, notification) => ({
  user_email: normalizeEmail(userEmail),
  notification_key: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  href: notification.href,
  order_id: notification.orderId || null,
  is_read: Boolean(notification.read),
  created_at: notification.createdAt,
});

const pushNotificationToStorage = (userEmail, notification) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail) {
    return;
  }

  const key = getUserScopedStorageKey(NOTIFICATIONS_STORAGE_KEY, normalizedEmail);
  const current = getStoredCollection(key);
  window.localStorage.setItem(key, JSON.stringify([notification, ...current].slice(0, 80)));
};

const getSellerStatusOptions = (currentStatus) => {
  if (REFUND_STATUS_FLOW.includes(currentStatus)) {
    const refundIndex = REFUND_STATUS_FLOW.indexOf(currentStatus);
    return REFUND_STATUS_FLOW.slice(refundIndex);
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);

  if (currentIndex === -1) {
    return ORDER_STATUS_FLOW;
  }

  return ORDER_STATUS_FLOW.slice(currentIndex);
};

const canBuyerCancelOrder = (status) => (
  status === 'Processing' || status === 'Confirmed' || status === 'Preparing for Shipping'
);

const sanitizeStorageSegment = (value) => String(value || 'seller')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'seller';

const getSellerImageStoragePaths = (urls = []) => {
  const bucketPrefix = `/object/public/${SELLER_IMAGES_BUCKET}/`;

  return (Array.isArray(urls) ? urls : [])
    .map((url) => {
      const bucketIndex = String(url || '').indexOf(bucketPrefix);

      if (bucketIndex === -1) {
        return '';
      }

      return url.slice(bucketIndex + bucketPrefix.length);
    })
    .filter(Boolean);
};

const normalizeReviewComment = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeReviewerName = (value, reviewerEmail = '') => {
  const trimmedName = String(value || '').trim();

  if (trimmedName) {
    return trimmedName.slice(0, 50);
  }

  const normalizedEmail = normalizeEmail(reviewerEmail);

  if (normalizedEmail.includes('@')) {
    return normalizedEmail.split('@')[0].slice(0, 50);
  }

  return 'Guest';
};

const containsHarshReviewContent = (value) => {
  const normalizedValue = normalizeReviewComment(value).toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return HARSH_REVIEW_TERMS.some((term) => {
    const expression = new RegExp(`(^|[^a-z])${term}([^a-z]|$)`, 'i');
    return expression.test(normalizedValue);
  });
};

const getProductReviewItemKey = (item) => {
  if (item?.wishlistItem?.id) {
    return item.wishlistItem.id;
  }

  if (item?.cartItem?.id) {
    return item.cartItem.id;
  }

  return `${sanitizeStorageSegment(item?.marketName)}:${sanitizeStorageSegment(item?.title)}`;
};

const createProductReview = ({ itemKey, rating, comment, reviewerName, reviewerEmail = '' }) => ({
  id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  itemKey,
  rating: Math.min(5, Math.max(1, Number(rating) || 5)),
  comment: normalizeReviewComment(comment),
  reviewerName: normalizeReviewerName(reviewerName, reviewerEmail),
  reviewerEmail: normalizeEmail(reviewerEmail),
  moderationStatus: 'approved',
  createdAt: new Date().toISOString(),
});

const sortProductReviews = (reviews) => [...reviews].sort((leftReview, rightReview) => (
  Date.parse(rightReview.createdAt || '') - Date.parse(leftReview.createdAt || '')
));

const mapProductReviewRecord = (record) => ({
  id: record.id,
  itemKey: record.item_key,
  rating: Math.min(5, Math.max(1, Number(record.rating) || 5)),
  comment: normalizeReviewComment(record.comment),
  reviewerName: normalizeReviewerName(record.reviewer_name, record.reviewer_email),
  reviewerEmail: normalizeEmail(record.reviewer_email || ''),
  moderationStatus: String(record.moderation_status || 'approved'),
  createdAt: record.created_at || new Date().toISOString(),
});

const toProductReviewRecord = (review) => ({
  item_key: review.itemKey,
  rating: review.rating,
  comment: review.comment,
  reviewer_name: review.reviewerName,
  reviewer_email: review.reviewerEmail || null,
  moderation_status: review.moderationStatus || 'approved',
});

const getStoredApprovedProductReviews = (itemKey) => sortProductReviews(
  getStoredProductReviews().filter((review) => review.itemKey === itemKey && review.moderationStatus !== 'rejected'),
);

const buildProductReviewSummaryMap = (reviews = []) => {
  const groupedSummaries = reviews.reduce((summaryMap, review) => {
    if (!review?.itemKey || review.moderationStatus === 'rejected') {
      return summaryMap;
    }

    const currentSummary = summaryMap[review.itemKey] || { totalRating: 0, reviewCount: 0 };
    const nextSummary = {
      totalRating: currentSummary.totalRating + (Number(review.rating) || 0),
      reviewCount: currentSummary.reviewCount + 1,
    };

    summaryMap[review.itemKey] = nextSummary;
    return summaryMap;
  }, {});

  return Object.fromEntries(
    Object.entries(groupedSummaries).map(([itemKey, summary]) => [
      itemKey,
      {
        averageRating: summary.reviewCount ? Number((summary.totalRating / summary.reviewCount).toFixed(1)) : 0,
        reviewCount: summary.reviewCount,
      },
    ]),
  );
};

const getProductReviewSummary = (reviewSummaryMap, itemKey) => reviewSummaryMap?.[itemKey] || {
  averageRating: 0,
  reviewCount: 0,
};

const getMarketplaceItemSaveErrorMessage = (errorMessage) => {
  const normalizedMessage = String(errorMessage || '').toLowerCase();

  if (normalizedMessage.includes('marketplace_items_market_key_check')) {
    return `Item save failed: ${errorMessage}. Rerun supabase/seller-marketplace.sql so the ${SELLER_ITEMS_TABLE} market_key constraint includes the selected market.`;
  }

  if (normalizedMessage.includes('quantity')) {
    return `Item save failed: ${errorMessage}. Run supabase/add-marketplace-item-quantity.sql, then try again.`;
  }

  if (normalizedMessage.includes('details_json')) {
    return `Item save failed: ${errorMessage}. Rerun supabase/seller-marketplace.sql so seller listing metadata fields are available.`;
  }

  return `Item save failed: ${errorMessage}. Create or update the ${SELLER_ITEMS_TABLE} table before using seller uploads.`;
};

const cudyBluePrimaryButtonClassName = 'svs-test-primary-button';
const cudyBluePrimaryOutlineClassName = 'svs-test-primary-outline';
const cudyBluePrimaryIconClassName = 'svs-test-primary-icon';
const languageFeatureSelectClassName = 'w-full appearance-none rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)] outline-none transition hover:border-[var(--svs-primary)] focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/40';

const formatDate = (value, locale = 'en-US') =>
  new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatListingDateLabel = (value) => {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return '';
  }

  const parsedDate = new Date(`${trimmedValue}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return trimmedValue;
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getGroceriesListingValidationMessage = (formState) => {
  if (formState.marketKey !== 'groceries') {
    return '';
  }

  const hasCategory = String(formState.categoryKey || '').trim();
  const hasBrand = String(formState.brand || '').trim();
  const hasVolume = String(formState.volume || '').trim();
  const hasFreshness = String(formState.freshness || '').trim();

  if (hasCategory && hasBrand && hasVolume && hasFreshness) {
    return '';
  }

  return 'For grocery listings, select the grocery category and add the brand, pack size, and freshness details before publishing.';
};

const buildSellerItemDetailsJson = (formState) => {
  if (formState.marketKey !== 'groceries') {
    return {};
  }

  const categoryKey = String(formState.categoryKey || '').trim();
  const categoryTitle = getGroceriesCategoryTitle(categoryKey);

  return Object.fromEntries(
    Object.entries({
      categoryKey,
      category: categoryTitle,
      brand: String(formState.brand || '').trim(),
      volume: String(formState.volume || '').trim(),
      freshness: String(formState.freshness || '').trim(),
      storage: String(formState.storage || '').trim(),
      origin: String(formState.origin || '').trim(),
      expiryDate: String(formState.expiryDate || '').trim(),
      discount: String(formState.discount || '').trim(),
    }).filter(([, value]) => Boolean(String(value || '').trim())),
  );
};

const getGroceriesListingMetaText = (item = {}) => {
  const categoryLabel = item.category || getGroceriesCategoryTitle(item.categoryKey);
  const parts = [categoryLabel, item.brand, item.volume, item.discount || item.freshness].filter(Boolean);

  return parts.join(' • ') || item.description || item.sellerName || 'Seller item';
};

const getGroceriesListingDetailsText = (item = {}) => {
  const categoryLabel = item.category || getGroceriesCategoryTitle(item.categoryKey);
  const parts = [
    item.discount,
    categoryLabel,
    item.brand,
    item.volume,
    item.freshness,
    item.storage ? `Storage: ${item.storage}` : '',
    item.origin ? `Origin: ${item.origin}` : '',
    item.expiryDate ? `Best before ${formatListingDateLabel(item.expiryDate)}` : '',
    item.description,
  ].filter(Boolean);

  return parts.join(' • ') || item.sellerName || 'Seller item';
};

const SALE_DISCOUNT_RATE = 0.2;

const formatSaleAmount = (amount, decimals) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(amount);

const formatCheckoutAmount = (amount) => `R ${formatSaleAmount(amount, 2)}`;

const getNumericPriceValue = (price, discountRate = SALE_DISCOUNT_RATE) => {
  const text = String(price ?? '').trim();
  const match = text.match(/^([^\d-]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);

  if (!match) {
    return 0;
  }

  const amount = Number(match[2].replace(/,/g, ''));

  if (Number.isNaN(amount)) {
    return 0;
  }

  return Math.max(amount * (1 - discountRate), 0);
};

const normalizePriceFilterInput = (value) => String(value || '')
  .replace(/[^\d.]/g, '')
  .replace(/(\..*)\./g, '$1');

const parsePriceFilterInput = (value) => {
  const normalizedValue = normalizePriceFilterInput(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatPriceFilterAmount = (amount) => {
  const safeAmount = Number(amount) || 0;
  const decimals = Number.isInteger(safeAmount) ? 0 : 2;
  return formatSaleAmount(safeAmount, decimals);
};

const getPriceFilterStep = (minPrice, maxPrice) => {
  const priceSpread = Math.max((Number(maxPrice) || 0) - (Number(minPrice) || 0), 0);

  if (priceSpread <= 10) {
    return 0.5;
  }

  if (priceSpread <= 100) {
    return 1;
  }

  if (priceSpread <= 1000) {
    return 10;
  }

  return 50;
};

const useMarketplacePriceFilter = (items = []) => {
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');

  const availablePrices = useMemo(() => items
    .map((item) => getNumericPriceValue(item?.price))
    .filter((price) => Number.isFinite(price) && price >= 0), [items]);
  const minimumAvailablePrice = availablePrices.length ? Math.min(...availablePrices) : 0;
  const maximumAvailablePrice = availablePrices.length ? Math.max(...availablePrices) : 0;
  const sliderStep = useMemo(
    () => getPriceFilterStep(minimumAvailablePrice, maximumAvailablePrice),
    [maximumAvailablePrice, minimumAvailablePrice],
  );

  const normalizedBounds = useMemo(() => {
    const parsedMin = parsePriceFilterInput(minPriceInput);
    const parsedMax = parsePriceFilterInput(maxPriceInput);

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      return { minimumPrice: parsedMax, maximumPrice: parsedMin };
    }

    return { minimumPrice: parsedMin, maximumPrice: parsedMax };
  }, [maxPriceInput, minPriceInput]);

  const filteredItems = useMemo(() => items.filter((item) => {
    const numericPrice = getNumericPriceValue(item?.price);

    if (normalizedBounds.minimumPrice !== null && numericPrice < normalizedBounds.minimumPrice) {
      return false;
    }

    if (normalizedBounds.maximumPrice !== null && numericPrice > normalizedBounds.maximumPrice) {
      return false;
    }

    return true;
  }), [items, normalizedBounds]);

  useEffect(() => {
    if (!availablePrices.length) {
      if (minPriceInput !== '' || maxPriceInput !== '') {
        setMinPriceInput('');
        setMaxPriceInput('');
      }

      return;
    }

    const parsedMin = parsePriceFilterInput(minPriceInput);
    const parsedMax = parsePriceFilterInput(maxPriceInput);
    const clampedMin = parsedMin === null
      ? null
      : Math.min(Math.max(parsedMin, minimumAvailablePrice), maximumAvailablePrice);
    const clampedMax = parsedMax === null
      ? null
      : Math.min(Math.max(parsedMax, minimumAvailablePrice), maximumAvailablePrice);
    const normalizedMin = clampedMin === null ? '' : String(Math.min(clampedMin, clampedMax ?? clampedMin));
    const normalizedMax = clampedMax === null ? '' : String(Math.max(clampedMax, clampedMin ?? clampedMax));

    if (normalizedMin !== minPriceInput) {
      setMinPriceInput(normalizedMin);
    }

    if (normalizedMax !== maxPriceInput) {
      setMaxPriceInput(normalizedMax);
    }
  }, [availablePrices.length, maximumAvailablePrice, maxPriceInput, minPriceInput, minimumAvailablePrice]);

  const hasActivePriceFilter = minPriceInput !== '' || maxPriceInput !== '';
  const sliderMinValue = normalizedBounds.minimumPrice ?? minimumAvailablePrice;
  const sliderMaxValue = normalizedBounds.maximumPrice ?? maximumAvailablePrice;

  const handleMinPriceChange = useCallback((value) => {
    setMinPriceInput(normalizePriceFilterInput(value));
  }, []);

  const handleMaxPriceChange = useCallback((value) => {
    setMaxPriceInput(normalizePriceFilterInput(value));
  }, []);

  const handleClearPriceFilter = useCallback(() => {
    setMinPriceInput('');
    setMaxPriceInput('');
  }, []);

  const handleSliderMinimumChange = useCallback((value) => {
    const nextMinimum = Math.min(Number(value) || minimumAvailablePrice, sliderMaxValue);
    setMinPriceInput(String(nextMinimum));
  }, [minimumAvailablePrice, sliderMaxValue]);

  const handleSliderMaximumChange = useCallback((value) => {
    const nextMaximum = Math.max(Number(value) || maximumAvailablePrice, sliderMinValue);
    setMaxPriceInput(String(nextMaximum));
  }, [maximumAvailablePrice, sliderMinValue]);

  return {
    filteredItems,
    hasActivePriceFilter,
    isPriceFilterOpen,
    minPriceInput,
    maxPriceInput,
    minimumAvailablePrice,
    maximumAvailablePrice,
    sliderMinValue,
    sliderMaxValue,
    sliderStep,
    setIsPriceFilterOpen,
    handleMinPriceChange,
    handleMaxPriceChange,
    handleClearPriceFilter,
    handleSliderMinimumChange,
    handleSliderMaximumChange,
  };
};

const getCartCount = (cartItems) => cartItems.reduce((total, item) => total + item.quantity, 0);
const getCartSubtotal = (cartItems) => cartItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
const getServiceFee = (subtotal) => subtotal * 0.03;
const GUEST_ORDER_EMAIL = 'guest@svs.app';
const STANDARD_SHIPPING_FEE = 150;
const SOUTH_AFRICA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];
const PAYFAST_METHOD_OPTIONS = [
  { value: 'credit_cheque_card', label: 'Credit & Cheque card' },
  { value: 'instant_eft', label: 'Instant EFT' },
  { value: 'capitec_pay', label: 'Capitec Pay' },
  { value: 'snapscan', label: 'SnapScan' },
  { value: 'zapper', label: 'Zapper' },
  { value: 'bank_qr_code', label: 'Bank QR Code Apps' },
  { value: 'scan_to_pay', label: 'Scan to Pay' },
];
const CARD_PAYMENT_METHOD_VALUE = 'credit_cheque_card';
const PAYFAST_PENDING_PAYMENT_STORAGE_KEY = 'svs-payfast-pending-payment';

const readPendingPayfastSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PAYFAST_PENDING_PAYMENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
};

const writePendingPayfastSession = (session) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (session) {
      window.sessionStorage.setItem(PAYFAST_PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(PAYFAST_PENDING_PAYMENT_STORAGE_KEY);
    }
  } catch (_error) {
    // Ignore storage access failures and fall back to in-memory route state.
  }
};

const clearPendingPayfastSession = () => {
  writePendingPayfastSession(null);
};

const toStripeMinorUnitAmount = (amount) => Math.max(Math.round((Number(amount) || 0) * 100), 0);

const requestStripeClientSecret = async ({ amount, currency, email, fullName }) => {
  const response = await fetch('/api/payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: toStripeMinorUnitAmount(amount),
      currency: String(currency || stripeCurrency || 'usd').toLowerCase(),
      email,
      fullName,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Could not initialize secure card payment.');
  }

  if (!result.clientSecret) {
    throw new Error('Stripe client secret was not returned by the payment server.');
  }

  return result.clientSecret;
};

const getCartTotals = (cartItems) => {
  const subtotal = getCartSubtotal(cartItems);
  const serviceFee = getServiceFee(subtotal);

  return {
    subtotal,
    serviceFee,
    total: subtotal + serviceFee,
  };
};

const getCheckoutTotals = (cartItems, shippingFee = 0) => {
  const subtotal = getCartSubtotal(cartItems);
  const serviceFee = getServiceFee(subtotal);
  const normalizedShippingFee = Math.max(Number(shippingFee) || 0, 0);
  const feeTotal = serviceFee + normalizedShippingFee;

  return {
    subtotal,
    serviceFee,
    shippingFee: normalizedShippingFee,
    feeTotal,
    total: subtotal + feeTotal,
  };
};

const MinimalCheckoutShell = ({ title, badge = null, children }) => {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(getThemePreference);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [pendingLanguageCode, setPendingLanguageCode] = useState(DEFAULT_LANGUAGE_CODE);
  const [focusedLanguageIndex, setFocusedLanguageIndex] = useState(0);
  const languageCardRefs = useRef([]);
  const languageMenuRef = useRef(null);
  const isDarkMode = theme === 'dark';
  const activeLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language);

  const applyLanguageCode = useCallback(async (languageCode) => {
    const nextLanguage = getLanguageByCode(languageCode);
    await i18n.changeLanguage(nextLanguage.code);
    window.localStorage.setItem('svs-language', nextLanguage.code);
    document.documentElement.setAttribute('lang', nextLanguage.code);
    document.documentElement.setAttribute('dir', isRtlLanguage(nextLanguage.code) ? 'rtl' : 'ltr');
    setIsLanguageModalOpen(false);
  }, [i18n]);

  useEffect(() => {
    window.localStorage.setItem('svs-theme', theme);
    document.body.classList.toggle('theme-dark', isDarkMode);
    document.body.classList.toggle('theme-light', !isDarkMode);
  }, [isDarkMode, theme]);

  useEffect(() => {
    const currentLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language);
    setPendingLanguageCode(currentLanguage.code);
    setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === currentLanguage.code));
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!isLanguageModalOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageModalOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isLanguageModalOpen]);

  return (
    <div className={`min-h-screen bg-[var(--svs-bg)] text-[var(--svs-text)] ${isDarkMode ? 'theme-dark' : 'theme-light'}`.trim()}>
      <header className="border-b border-[var(--svs-border)] bg-[var(--svs-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/" aria-label="Back to SVS E-Commerce" className="shrink-0">
              <img src={logo} alt="SVS E-Commerce" className="h-10 w-auto rounded-lg" />
            </Link>
            <h1 className="truncate text-2xl font-black text-[var(--svs-text)]">{title}</h1>
          </div>

          <div className="flex items-center gap-2" ref={languageMenuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === activeLanguage.code));
                  setIsLanguageModalOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
              >
                <span>{activeLanguage.flag ? `${activeLanguage.flag} ` : ''}{activeLanguage.englishName}</span>
                <ChevronDown className={`h-4 w-4 transition ${isLanguageModalOpen ? 'rotate-180' : ''}`} />
              </button>
              <LanguageSelectorPopover
                isOpen={isLanguageModalOpen}
                pendingLanguageCode={pendingLanguageCode}
                focusedIndex={focusedLanguageIndex}
                onSelect={async (code) => {
                  setPendingLanguageCode(code);
                  setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === code));
                  await applyLanguageCode(code);
                }}
                onFocusIndex={setFocusedLanguageIndex}
                cardRefs={languageCardRefs}
              />
            </div>
            <button
              type="button"
              onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
              aria-label={t('theme.toggleAria')}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-[var(--svs-primary)]" /> : <Moon className="h-4 w-4 text-[var(--svs-primary-strong)]" />}
              <span>{isDarkMode ? t('theme.light') : t('theme.dark')}</span>
            </button>
          </div>
          {badge}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
};

const getAutoOrderStatus = (order, now = Date.now()) => {
  const createdAtMs = Date.parse(order.createdAt || '');

  if (Number.isNaN(createdAtMs)) {
    return order.status || ORDER_STATUS_FLOW[0];
  }

  const elapsed = Math.max(0, now - createdAtMs);
  let targetStatus = ORDER_STATUS_FLOW[0];

  if (elapsed >= ORDER_AUTO_PROGRESS_MS.delivered) {
    targetStatus = 'Delivered';
  } else if (elapsed >= ORDER_AUTO_PROGRESS_MS.shipped) {
    targetStatus = 'Shipped';
  } else if (elapsed >= ORDER_AUTO_PROGRESS_MS.preparingForShipping) {
    targetStatus = 'Preparing for Shipping';
  } else if (elapsed >= ORDER_AUTO_PROGRESS_MS.confirmed) {
    targetStatus = 'Confirmed';
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const targetIndex = ORDER_STATUS_FLOW.indexOf(targetStatus);

  if (currentIndex === -1) {
    return targetStatus;
  }

  return ORDER_STATUS_FLOW[Math.max(currentIndex, targetIndex)] || targetStatus;
};

const getCollectionItemId = (route, id) => `${route}:${id}`;

const normalizeListingQuantity = (value, fallback = 0) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(Math.floor(parsed), 0);
};

const getSellerListingIdFromItemKey = (value) => {
  const rawValue = String(value || '');

  if (!rawValue) {
    return '';
  }

  const normalizedValue = rawValue.includes(':') ? rawValue.split(':').pop() : rawValue;

  if (normalizedValue.startsWith('seller-')) {
    return normalizedValue.slice('seller-'.length);
  }

  return '';
};

const getSellerListingStock = (sellerItems, candidateItem) => {
  const listingDbId = getSellerListingIdFromItemKey(candidateItem?.sku || candidateItem?.id);

  if (!listingDbId) {
    return null;
  }

  const listing = sellerItems.find((item) => item.dbId === listingDbId || item.id === `seller-${listingDbId}`);

  if (!listing) {
    return null;
  }

  return normalizeListingQuantity(listing.availableQuantity, 0);
};

const createSavedItem = ({ id, title, image, price, route, marketName, details = '', sellerName = '', sellerEmail = '', availableQuantity = null }) => ({
  id: getCollectionItemId(route, id),
  sku: id,
  title,
  image,
  route,
  marketName,
  details,
  sellerName,
  sellerEmail: normalizeEmail(sellerEmail),
  availableQuantity: String(id || '').startsWith('seller-') ? normalizeListingQuantity(availableQuantity, 0) : null,
  unitPrice: getNumericPriceValue(price),
  unitPriceLabel: getSalePrices(price).nowPrice,
});

const createCartItem = (item) => ({
  ...createSavedItem(item),
  quantity: 1,
});

const createWishlistItem = (item) => createSavedItem(item);

const mapCartItemRecord = (record) => ({
  id: record.item_key,
  sku: record.sku,
  title: record.title,
  image: record.image_url || '',
  route: record.route,
  marketName: record.market_name,
  details: record.details || '',
  sellerName: record.seller_name || '',
  sellerEmail: normalizeEmail(record.seller_email || ''),
  quantity: Math.max(Number(record.quantity) || 1, 1),
  unitPrice: Number(record.unit_price) || 0,
  unitPriceLabel: record.unit_price_label,
});

const mapWishlistItemRecord = (record) => ({
  id: record.item_key,
  sku: record.sku,
  title: record.title,
  image: record.image_url || '',
  route: record.route,
  marketName: record.market_name,
  details: record.details || '',
  sellerName: record.seller_name || '',
  sellerEmail: normalizeEmail(record.seller_email || ''),
  unitPrice: Number(record.unit_price) || 0,
  unitPriceLabel: record.unit_price_label,
});

const toCartItemRecord = (userEmail, item) => ({
  user_email: userEmail,
  item_key: item.id,
  sku: item.sku,
  title: item.title,
  image_url: item.image,
  route: item.route,
  market_name: item.marketName,
  details: item.details,
  seller_name: item.sellerName || null,
  seller_email: normalizeEmail(item.sellerEmail || ''),
  quantity: item.quantity,
  unit_price: item.unitPrice,
  unit_price_label: item.unitPriceLabel,
});

const toWishlistItemRecord = (userEmail, item) => ({
  user_email: userEmail,
  item_key: item.id,
  sku: item.sku,
  title: item.title,
  image_url: item.image,
  route: item.route,
  market_name: item.marketName,
  details: item.details,
  seller_name: item.sellerName || null,
  seller_email: normalizeEmail(item.sellerEmail || ''),
  unit_price: item.unitPrice,
  unit_price_label: item.unitPriceLabel,
});

const mapOrderRecord = (record) => ({
  id: record.order_key,
  reference: record.reference,
  createdAt: record.order_created_at,
  ownerEmail: normalizeEmail(record.user_email),
  customer: typeof record.customer === 'object' && record.customer ? record.customer : {},
  items: Array.isArray(record.items) ? record.items : [],
  paymentMethod: record.payment_method,
  paymentProvider: record.payment_provider,
  paymentStatus: record.payment_status,
  paymentReference: record.payment_reference,
  currency: record.currency,
  subtotal: Number(record.subtotal) || 0,
  serviceFee: Number(record.service_fee) || 0,
  total: Number(record.total) || 0,
  status: record.status || ORDER_STATUS_FLOW[0],
});

const toOrderRecord = (userEmail, order) => ({
  user_email: normalizeEmail(order.ownerEmail || userEmail),
  order_key: order.id,
  reference: order.reference,
  order_created_at: order.createdAt,
  customer: order.customer,
  items: order.items,
  payment_method: order.paymentMethod,
  payment_provider: order.paymentProvider,
  payment_status: order.paymentStatus,
  payment_reference: order.paymentReference,
  currency: order.currency,
  subtotal: order.subtotal,
  service_fee: order.serviceFee,
  total: order.total,
  status: order.status,
});

const syncUserCollection = async ({ tableName, userEmail, records, removeMissing = true }) => {
  if (!records.length) {
    if (!removeMissing) {
      return null;
    }

    const { error: clearError } = await supabase.from(tableName).delete().eq('user_email', userEmail);
    return clearError || null;
  }

  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(records, { onConflict: 'user_email,item_key' });

  if (upsertError) {
    return upsertError;
  }

  if (!removeMissing) {
    return null;
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from(tableName)
    .select('item_key')
    .eq('user_email', userEmail);

  if (fetchError) {
    return fetchError;
  }

  const nextItemKeys = new Set(records.map((record) => record.item_key));
  const keysToDelete = (existingRows || [])
    .map((row) => row.item_key)
    .filter((itemKey) => !nextItemKeys.has(itemKey));

  if (!keysToDelete.length) {
    return null;
  }

  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq('user_email', userEmail)
    .in('item_key', keysToDelete);

  return deleteError || null;
};

const getStatusClasses = (status) => {
  switch (status) {
    case 'Delivered':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Shipped':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'Preparing for Shipping':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'Confirmed':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'Processing':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'Cancelled by Buyer':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'Refund Pending':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'Refund Made':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};

const mapSellerItemRecord = (record) => {
  const marketConfig = sellerMarketConfig[record.market_key] || sellerMarketOptions[0];
  const imageList = Array.isArray(record.image_urls)
    ? record.image_urls.filter((url) => typeof url === 'string' && url.trim())
    : [];
  const primaryImage = record.image_url || imageList[0] || '';
  const rawDetailsJson = record.details_json && typeof record.details_json === 'object' && !Array.isArray(record.details_json)
    ? record.details_json
    : {};
  const resolvedCategoryKey = String(rawDetailsJson.categoryKey || '').trim()
    || (record.market_key === 'groceries'
      ? resolveGroceriesCategoryKey({
        categoryKey: rawDetailsJson.categoryKey,
        category: rawDetailsJson.category,
        title: record.title,
        description: record.description,
      })
      : '');
  const resolvedCategory = String(rawDetailsJson.category || '').trim() || getGroceriesCategoryTitle(resolvedCategoryKey);

  return {
    id: `seller-${record.id}`,
    dbId: record.id,
    title: record.title,
    description: record.description || '',
    availableQuantity: normalizeListingQuantity(record.quantity, 0),
    price: record.price,
    image: primaryImage,
    images: imageList.length ? imageList : (primaryImage ? [primaryImage] : []),
    marketKey: record.market_key,
    route: marketConfig.route,
    sellerName: record.seller_name || record.seller_email || 'Seller',
    sellerEmail: record.seller_email || '',
    category: resolvedCategory,
    categoryKey: resolvedCategoryKey,
    brand: String(rawDetailsJson.brand || '').trim(),
    volume: String(rawDetailsJson.volume || '').trim(),
    freshness: String(rawDetailsJson.freshness || '').trim(),
    storage: String(rawDetailsJson.storage || '').trim(),
    origin: String(rawDetailsJson.origin || '').trim(),
    expiryDate: String(rawDetailsJson.expiryDate || '').trim(),
    discount: String(rawDetailsJson.discount || '').trim(),
    createdAt: record.created_at,
  };
};

const doesLineItemBelongToSeller = (lineItem, sellerEmail, ownedListingIds) => {
  const normalizedSellerEmail = normalizeEmail(sellerEmail);
  const lineSellerEmail = normalizeEmail(lineItem?.sellerEmail || '');

  if (normalizedSellerEmail && lineSellerEmail === normalizedSellerEmail) {
    return true;
  }

  const sku = String(lineItem?.sku || '');
  if (ownedListingIds.has(sku)) {
    return true;
  }

  const lineId = String(lineItem?.id || '');
  const rawId = lineId.includes(':') ? lineId.split(':').pop() : lineId;

  return ownedListingIds.has(rawId) || ownedListingIds.has(`seller-${rawId}`);
};

const getSellerItemsForMarket = (items, marketKey) => items.filter((item) => item.marketKey === marketKey);

const getSalePrices = (price, discountRate = SALE_DISCOUNT_RATE) => {
  const text = String(price ?? '').trim();
  const match = text.match(/^([^\d-]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);

  if (!match) {
    return { wasPrice: text, nowPrice: text };
  }

  const [, prefix, amountText, suffix] = match;
  const normalizedAmountText = amountText.replace(/,/g, '');
  const amount = Number(normalizedAmountText);

  if (Number.isNaN(amount)) {
    return { wasPrice: text, nowPrice: text };
  }

  const decimals = normalizedAmountText.includes('.') ? normalizedAmountText.split('.')[1].length : 0;
  const discountedAmount = Math.max(amount * (1 - discountRate), 0);

  return {
    wasPrice: `${prefix}${formatSaleAmount(amount, decimals)}${suffix}`,
    nowPrice: `${prefix}${formatSaleAmount(discountedAmount, decimals)}${suffix}`,
  };
};

const SalePrice = ({ price, className = '', wasClassName = '', nowClassName = '' }) => {
  const { t } = useTranslation();
  const { wasPrice, nowPrice } = getSalePrices(price);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className={`text-xs text-slate-500 line-through ${wasClassName}`.trim()}>
        {t('pricing.was', { price: wasPrice })}
      </span>
      <span className={`font-bold text-[var(--svs-primary-strong)] ${nowClassName}`.trim()}>
        {t('pricing.now', { price: nowPrice })}
      </span>
    </span>
  );
};

const PriceFilterPanel = ({
  filteredCount,
  totalCount,
  isPriceFilterOpen,
  onToggleOpen,
  minPriceInput,
  maxPriceInput,
  onMinPriceChange,
  onMaxPriceChange,
  onClearPriceFilter,
  hasActivePriceFilter,
  minimumAvailablePrice,
  maximumAvailablePrice,
  sliderMinValue,
  sliderMaxValue,
  sliderStep,
  onSliderMinimumChange,
  onSliderMaximumChange,
}) => {
  const sliderTrackStart = maximumAvailablePrice > minimumAvailablePrice
    ? ((Math.min(sliderMinValue, sliderMaxValue) - minimumAvailablePrice) / (maximumAvailablePrice - minimumAvailablePrice)) * 100
    : 0;
  const sliderTrackEnd = maximumAvailablePrice > minimumAvailablePrice
    ? ((Math.max(sliderMinValue, sliderMaxValue) - minimumAvailablePrice) / (maximumAvailablePrice - minimumAvailablePrice)) * 100
    : 100;

  return (
    <section className="mb-3 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--svs-primary-strong)]">Price filter</p>
          <p className="mt-0.5 text-xs text-[var(--svs-muted)] sm:text-sm">
            Showing {filteredCount} of {totalCount} items
            {totalCount ? ` • Range ${formatPriceFilterAmount(minimumAvailablePrice)} to ${formatPriceFilterAmount(maximumAvailablePrice)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActivePriceFilter ? (
            <button
              type="button"
              onClick={onClearPriceFilter}
              className="rounded-full border border-[var(--svs-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)] sm:text-sm"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--svs-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--svs-primary-strong)] sm:text-sm"
            aria-expanded={isPriceFilterOpen}
          >
            {isPriceFilterOpen ? 'Hide filter' : 'Filter prices'}
            <ChevronDown className={`h-4 w-4 transition ${isPriceFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {isPriceFilterOpen ? (
        <div className="mt-2.5 space-y-2.5 border-t border-[var(--svs-border)] pt-2.5">
          <div className="grid gap-3 lg:grid-cols-[5cm] lg:items-start">
            <div className="w-full max-w-[5cm] space-y-2.5" role="group" aria-label="Price range slider">
              <div className="flex justify-start">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--svs-surface-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--svs-text)] sm:text-xs">
                  <span className="text-[var(--svs-muted)]">Selected range:</span>
                  <span>{formatPriceFilterAmount(Math.min(sliderMinValue, sliderMaxValue))} - {formatPriceFilterAmount(Math.max(sliderMinValue, sliderMaxValue))}</span>
                </span>
              </div>
              <div className="relative px-1 py-2">
                <div className="h-1.5 rounded-full bg-[var(--svs-border)]" />
                <div
                  className="pointer-events-none absolute top-2 h-1.5 rounded-full bg-[var(--svs-primary)]"
                  style={{ left: `${sliderTrackStart}%`, width: `${Math.max(sliderTrackEnd - sliderTrackStart, 0)}%` }}
                  aria-hidden="true"
                />
                <input
                  type="range"
                  min={minimumAvailablePrice}
                  max={maximumAvailablePrice}
                  step={sliderStep}
                  value={Math.min(sliderMinValue, sliderMaxValue)}
                  onChange={(event) => onSliderMinimumChange(event.target.value)}
                  className="svs-range-slider svs-range-slider-min pointer-events-auto absolute inset-x-0 top-0 h-6 w-full cursor-pointer bg-transparent"
                  aria-label="Minimum price slider"
                />
                <input
                  type="range"
                  min={minimumAvailablePrice}
                  max={maximumAvailablePrice}
                  step={sliderStep}
                  value={Math.max(sliderMinValue, sliderMaxValue)}
                  onChange={(event) => onSliderMaximumChange(event.target.value)}
                  className="svs-range-slider svs-range-slider-max pointer-events-auto absolute inset-x-0 top-0 h-6 w-full cursor-pointer bg-transparent"
                  aria-label="Maximum price slider"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--svs-muted)] sm:text-xs">
                <span>{formatPriceFilterAmount(minimumAvailablePrice)}</span>
                <span>{formatPriceFilterAmount(maximumAvailablePrice)}</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[var(--svs-muted)] sm:text-xs">
            Drag the slider to narrow the price range.
            </div>
        </div>
      ) : null}
    </section>
  );
};

const LanguageSelectorPopover = ({
  isOpen,
  pendingLanguageCode,
  focusedIndex,
  filteredLanguages,
  searchQuery,
  onSearchQueryChange,
  onSelect,
  onFocusIndex,
  cardRefs,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-2xl"
      role="menu"
      aria-label="Language selector"
    >
      <div className="border-b border-[var(--svs-border)] p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search languages"
            className="w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] py-2 pl-9 pr-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
            aria-label="Search languages"
            autoFocus
          />
        </label>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {filteredLanguages.length ? filteredLanguages.map((language, index) => {
          const selected = pendingLanguageCode === language.code;
          return (
            <button
              key={language.code}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              type="button"
              onClick={() => onSelect(language.code)}
              onFocus={() => onFocusIndex(index)}
              className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition last:mb-0 ${
                selected
                  ? 'bg-[var(--svs-cyan-surface)] text-[var(--svs-primary-strong)]'
                  : 'text-[var(--svs-text)] hover:bg-[var(--svs-surface-soft)]'
              }`}
              aria-checked={selected}
              role="menuitemradio"
              tabIndex={focusedIndex === index ? 0 : -1}
            >
              <span className="font-medium">
                {language.englishName} ({language.nativeName})
              </span>
              <span
                className={`h-4 w-4 rounded-full border-2 ${
                  selected ? 'border-[var(--svs-primary)] bg-[var(--svs-primary)]' : 'border-[var(--svs-border)] bg-transparent'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        }) : (
          <p className="px-3 py-4 text-sm text-[var(--svs-muted)]">
            No matching languages found.
          </p>
        )}
      </div>
    </div>
  );
};

const PaymentMethodSelectorPopover = ({
  isOpen,
  selectedValue,
  focusedIndex,
  onSelect,
  onFocusIndex,
  cardRefs,
  className = 'w-[min(92vw,360px)]',
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`absolute right-0 top-[calc(100%+8px)] z-[70] overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-2xl ${className}`.trim()}
      role="menu"
      aria-label="Payment method selector"
    >
      <div className="max-h-80 overflow-y-auto p-2">
        {PAYFAST_METHOD_OPTIONS.map((option, index) => {
          const isSelected = selectedValue === option.value;
          const isDefault = option.value === CARD_PAYMENT_METHOD_VALUE;

          return (
            <button
              key={option.value}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              type="button"
              onClick={() => onSelect(option.value)}
              onFocus={() => onFocusIndex(index)}
              className={`mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition last:mb-0 ${
                isSelected
                  ? 'bg-[var(--svs-cyan-surface)] text-[var(--svs-primary-strong)]'
                  : 'text-[var(--svs-text)] hover:bg-[var(--svs-surface-soft)]'
              }`}
              aria-checked={isSelected}
              role="menuitemradio"
              tabIndex={focusedIndex === index ? 0 : -1}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{option.label}</span>
                {isDefault ? (
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    Default
                  </span>
                ) : null}
              </span>
              <span
                className={`h-4 w-4 rounded-full border-2 ${
                  isSelected ? 'border-[var(--svs-primary)] bg-[var(--svs-primary)]' : 'border-[var(--svs-border)] bg-transparent'
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AddressAutocompleteField = ({
  label,
  value,
  onChange,
  onSelectAddress,
  inputClassName,
  placeholder = 'Start typing a street number, area, or suburb',
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingSelection, setIsApplyingSelection] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const containerRef = useRef(null);
  const suppressLookupRef = useRef(false);
  const sessionTokenRef = useRef(createAddressLookupSessionToken());

  useEffect(() => {
    const query = String(value || '').trim();

    if (suppressLookupRef.current) {
      suppressLookupRef.current = false;
      return undefined;
    }

    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setLookupError('');
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);

    const timeoutId = window.setTimeout(() => {
      lookupAddressSuggestions({
        input: query,
        sessionToken: sessionTokenRef.current,
        countryCode: 'za',
      }).then((nextSuggestions) => {
        if (cancelled) {
          return;
        }

        setSuggestions(nextSuggestions);
        setIsOpen(nextSuggestions.length > 0);
        setLookupError('');
      }).catch((error) => {
        if (cancelled) {
          return;
        }

        setSuggestions([]);
        setIsOpen(false);
        setLookupError(error instanceof Error ? error.message : 'Unable to load address suggestions.');
      }).finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  const handleSelectSuggestion = async (suggestion) => {
    setIsApplyingSelection(true);
    setLookupError('');

    try {
      const details = await lookupAddressDetails({
        placeId: suggestion.placeId,
        sessionToken: sessionTokenRef.current,
      });

      suppressLookupRef.current = true;
      onSelectAddress(details);
      setSuggestions([]);
      setIsOpen(false);
      sessionTokenRef.current = createAddressLookupSessionToken();
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Unable to apply the selected address.');
    } finally {
      setIsApplyingSelection(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <span className="mb-2 block text-sm font-medium text-[var(--svs-text)]">{label}</span>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-muted)]" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${inputClassName} pl-10 pr-10`}
          autoComplete="street-address"
        />
        {isLoading || isApplyingSelection ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--svs-muted)]">
            {isApplyingSelection ? 'Filling...' : 'Searching...'}
          </span>
        ) : null}
      </label>
      <p className="mt-2 text-xs text-[var(--svs-muted)]">Search by street number, area, or suburb and select a result to fill the address fields.</p>
      {lookupError ? <p className="mt-2 text-xs font-medium text-[#d94d4d]">{lookupError}</p> : null}
      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-2xl">
          <div className="max-h-72 overflow-y-auto p-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                onClick={() => {
                  void handleSelectSuggestion(suggestion);
                }}
                className="mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--svs-surface-soft)] last:mb-0"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--svs-primary)]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--svs-text)]">{suggestion.primaryText}</span>
                  <span className="mt-1 block text-xs text-[var(--svs-muted)]">
                    {suggestion.secondaryText || suggestion.fullText}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const MarketSelectorField = ({
  id,
  value,
  onChange,
  placeholder = 'Select Market',
  ariaLabel = 'Market selector',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = sellerMarketOptions.find((option) => option.key === value);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="inline-flex w-full items-center justify-between rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] focus:border-[var(--svs-primary)] focus:outline-none focus:ring-2 focus:ring-[#33b9f2]/40"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{selectedOption ? t(selectedOption.labelKey) : placeholder}</span>
        <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-[70] w-full overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-2xl"
          role="menu"
          aria-label={ariaLabel}
        >
          <div className="max-h-72 overflow-y-auto p-2">
            {sellerMarketOptions.map((option) => {
              const isSelected = option.key === value;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onChange(option.key);
                    setIsOpen(false);
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition last:mb-0 ${
                    isSelected
                      ? 'bg-[var(--svs-cyan-surface)] text-[var(--svs-primary-strong)]'
                      : 'text-[var(--svs-text)] hover:bg-[var(--svs-surface-soft)]'
                  }`}
                  aria-checked={isSelected}
                  role="menuitemradio"
                >
                  <span className="font-medium">{t(option.labelKey)}</span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      isSelected ? 'border-[var(--svs-primary)] bg-[var(--svs-primary)]' : 'border-[var(--svs-border)] bg-transparent'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Shell = ({ children, cartItemCount = 0, wishlistItemCount = 0, notifications = [], onMarkNotificationsRead, onClearNotifications }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [pendingLanguageCode, setPendingLanguageCode] = useState(DEFAULT_LANGUAGE_CODE);
  const [focusedLanguageIndex, setFocusedLanguageIndex] = useState(0);
  const [languageSearchQuery, setLanguageSearchQuery] = useState('');
  const [query, setQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState);
  const [hasSellerAccess, setHasSellerAccess] = useState(getSellerAccessState);
  const [sellerHomePath, setSellerHomePath] = useState(getSellerHomePath);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileName, setProfileName] = useState('SVS User');
  const [theme, setTheme] = useState(getThemePreference);
  const languageCardRefs = useRef([]);
  const desktopLanguageMenuRef = useRef(null);
  const mobileLanguageMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);
  const isDarkMode = theme === 'dark';
  const isSellerConsoleRoute = location.pathname.startsWith('/seller/') || location.pathname === '/sell/onboarding';
  const activeLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language);
  const unreadNotificationsCount = useMemo(
    () => notifications.reduce((count, notification) => (notification.read ? count : count + 1), 0),
    [notifications],
  );
  const filteredLanguages = useMemo(() => {
    const normalizedQuery = languageSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return SUPPORTED_LANGUAGES;
    }

    return SUPPORTED_LANGUAGES.filter((language) => {
      const haystack = [language.englishName, language.nativeName, language.code]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [languageSearchQuery]);

  const closeLanguageModal = () => {
    setLanguageSearchQuery('');
    setIsLanguageModalOpen(false);
  };

  const applyLanguageCode = useCallback(async (languageCode) => {
    const nextLanguage = getLanguageByCode(languageCode);
    await i18n.changeLanguage(nextLanguage.code);
    window.localStorage.setItem('svs-language', nextLanguage.code);

    if (isAuthenticated && hasSupabaseEnv && supabase) {
      const userEmail = window.localStorage.getItem('svs-user-email');
      if (userEmail) {
        await supabase
          .from('account_users')
          .update({ preferred_language: nextLanguage.code })
          .eq('email_address', userEmail);
      }
    }

    setIsLanguageModalOpen(false);
  }, [i18n, isAuthenticated]);

  useEffect(() => {
    setIsAuthenticated(getAuthState());
    setHasSellerAccess(getSellerAccessState());
    setSellerHomePath(getSellerHomePath());
    setProfileOpen(false);
    setIsLanguageModalOpen(false);
    setIsNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(getAuthState());
      setHasSellerAccess(getSellerAccessState());
      setSellerHomePath(getSellerHomePath());
    };

    window.addEventListener('svs-auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('svs-auth-changed', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!notificationsMenuRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    window.localStorage.setItem('svs-theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadProfileName = async () => {
      if (!isAuthenticated) {
        setProfileName(t('profile.defaultName'));
        return;
      }

      const cachedName = window.localStorage.getItem('svs-user-name');
      const userEmail = window.localStorage.getItem('svs-user-email');

      if (cachedName) {
        setProfileName(cachedName);
      }

      if (!hasSupabaseEnv || !supabase || !userEmail) {
        return;
      }

      const { data, error } = await supabase
        .from('account_users')
        .select('full_name')
        .eq('email_address', userEmail)
        .maybeSingle();

      if (!error && data?.full_name) {
        setProfileName(data.full_name);
        window.localStorage.setItem('svs-user-name', data.full_name);
      }
    };

    loadProfileName();
  }, [isAuthenticated, t]);

  useEffect(() => {
    const currentLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language);
    setPendingLanguageCode(currentLanguage.code);
    setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === currentLanguage.code));

    const nextDir = isRtlLanguage(currentLanguage.code) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', currentLanguage.code);
    document.documentElement.setAttribute('dir', nextDir);
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    if (!isLanguageModalOpen) {
      return;
    }

    const selectedIndex = filteredLanguages.findIndex((language) => language.code === pendingLanguageCode);
    setFocusedLanguageIndex(selectedIndex >= 0 ? selectedIndex : 0);
    languageCardRefs.current = languageCardRefs.current.slice(0, filteredLanguages.length);
  }, [filteredLanguages, isLanguageModalOpen, pendingLanguageCode]);

  useEffect(() => {
    if (!isLanguageModalOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      const maxIndex = filteredLanguages.length - 1;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeLanguageModal();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!filteredLanguages.length) {
          return;
        }

        event.preventDefault();
        setFocusedLanguageIndex((currentIndex) => {
          const nextIndex = event.key === 'ArrowDown'
            ? (currentIndex >= maxIndex ? 0 : currentIndex + 1)
            : (currentIndex <= 0 ? maxIndex : currentIndex - 1);
          const nextLanguage = filteredLanguages[nextIndex];
          setPendingLanguageCode(nextLanguage.code);
          languageCardRefs.current[nextIndex]?.focus();
          languageCardRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return nextIndex;
        });
      }

      if (event.key === 'Enter') {
        if (!filteredLanguages.length) {
          return;
        }

        event.preventDefault();
        const selectedLanguage = filteredLanguages[focusedLanguageIndex] || getLanguageByCode(pendingLanguageCode);
        setPendingLanguageCode(selectedLanguage.code);
        applyLanguageCode(selectedLanguage.code);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyLanguageCode, filteredLanguages, focusedLanguageIndex, isLanguageModalOpen, pendingLanguageCode]);

  useEffect(() => {
    if (!isLanguageModalOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const desktopMenu = desktopLanguageMenuRef.current;
      const mobileMenu = mobileLanguageMenuRef.current;

      if (desktopMenu?.contains(event.target) || mobileMenu?.contains(event.target)) {
        return;
      }

      closeLanguageModal();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isLanguageModalOpen]);

  const quickResults = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return [];
    }

    return searchableCatalog.filter((item) => item.searchText.includes(needle)).slice(0, 6);
  }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const term = query.trim();

    if (!term) {
      return;
    }

    navigate(`/search?query=${encodeURIComponent(term)}`);
    setQuery('');
    setMobileOpen(false);
  };

  const handleQuickSelect = (term) => {
    navigate(`/search?query=${encodeURIComponent(term)}`);
    setQuery('');
    setMobileOpen(false);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('svs-authenticated');
    window.localStorage.removeItem('svs-user-email');
    window.localStorage.removeItem('svs-user-name');
    window.localStorage.removeItem(SELLER_ACCESS_STORAGE_KEY);
    window.localStorage.removeItem(SELLER_HOME_PATH_STORAGE_KEY);
    window.dispatchEvent(new Event('svs-auth-changed'));
    setIsAuthenticated(false);
    setHasSellerAccess(false);
    setSellerHomePath('/seller/dashboard');
    setProfileName(t('profile.defaultName'));
    setProfileOpen(false);
    navigate('/');
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={`min-h-screen bg-[var(--svs-bg)] text-[var(--svs-text)] ${isDarkMode ? 'theme-dark' : 'theme-light'}`.trim()}>
      <header className="fixed top-0 z-50 w-full border-b border-[var(--svs-border)] bg-[var(--svs-nav-bg)]/95 text-[var(--svs-nav-text)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/" className="shrink-0">
            <img src={logo} alt="SVS E-Commerce" className="h-10 w-auto" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--svs-nav-text)] lg:flex">
            {isSellerConsoleRoute ? sellerConsoleNavItems.map((item) => (
              <Link key={item.href} to={item.href} className="transition hover:text-[var(--svs-primary)]">
                {item.label}
              </Link>
            )) : navItems.map((item) => (
              <Link key={item.labelKey} to={item.href} className="transition hover:text-[var(--svs-primary)]">
                {t(item.labelKey)}
              </Link>
            ))}
            {isSellerConsoleRoute ? (
              <Link
                to="/markets"
                className="ml-1 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-1.5 text-xs font-bold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
              >
                Switch to Buyer View
              </Link>
            ) : hasSellerAccess ? (
              <Link
                to={sellerHomePath}
                className="ml-1 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-1.5 text-xs font-bold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
              >
                Switch to Seller View
              </Link>
            ) : (
              <Link
                to="/sell"
                className="ml-1 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600"
              >
                Sell on SVS
              </Link>
            )}
          </nav>

          <form className={`relative max-w-xl flex-1 ${isSellerConsoleRoute ? 'hidden' : 'hidden lg:block'}`} onSubmit={handleSearchSubmit}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-9 py-2 text-sm text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/40"
              aria-label={t('search.globalAria')}
            />
            {query.trim() ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-3 shadow-xl">
                {quickResults.length ? (
                  <ul className="space-y-2 text-sm text-[var(--svs-text)]">
                    {quickResults.map((item) => {
                      const itemTitle = getTranslatedValue(t, item.titleKey, item.title);
                      const itemSection = getTranslatedValue(t, item.sectionKey, item.section);

                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => handleQuickSelect(itemTitle)}
                            className="flex w-full items-center gap-3 rounded-md bg-[var(--svs-surface-soft)] px-3 py-2 text-left transition hover:bg-[var(--svs-cyan-surface)]"
                          >
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={itemTitle}
                                className="h-12 w-12 rounded-md object-cover"
                                loading="lazy"
                              />
                            ) : null}
                            <span>
                              <p className="font-semibold">{itemTitle}</p>
                              <p className="text-xs text-[var(--svs-muted)]">{itemSection}</p>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--svs-muted)]">{t('common.noResults')}</p>
                )}
              </div>
            ) : null}
          </form>

          <div className="ml-auto hidden items-center gap-3 text-[var(--svs-nav-text)] sm:flex">
            <div className="hidden items-center gap-3 lg:flex">
              <div className="relative" ref={desktopLanguageMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setLanguageSearchQuery('');
                    setPendingLanguageCode(activeLanguage.code);
                    setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === activeLanguage.code));
                    setIsLanguageModalOpen((prev) => !prev);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-1.5 text-sm font-semibold transition hover:border-[var(--svs-primary)]"
                  aria-label={t('languageModal.title')}
                  aria-haspopup="menu"
                  aria-expanded={isLanguageModalOpen}
                >
                  <span>{activeLanguage.flag ? `${activeLanguage.flag} ` : ''}{activeLanguage.englishName}</span>
                  <ChevronDown className={`h-4 w-4 transition ${isLanguageModalOpen ? 'rotate-180' : ''}`} />
                </button>
                <LanguageSelectorPopover
                  isOpen={isLanguageModalOpen}
                  pendingLanguageCode={pendingLanguageCode}
                  focusedIndex={focusedLanguageIndex}
                  filteredLanguages={filteredLanguages}
                  searchQuery={languageSearchQuery}
                  onSearchQueryChange={setLanguageSearchQuery}
                  onSelect={async (code) => {
                    setPendingLanguageCode(code);
                    setFocusedLanguageIndex(filteredLanguages.findIndex((language) => language.code === code));
                    await applyLanguageCode(code);
                  }}
                  onFocusIndex={setFocusedLanguageIndex}
                  cardRefs={languageCardRefs}
                />
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-1.5 text-sm font-semibold transition hover:border-[var(--svs-primary)]"
                aria-label={t('theme.toggleAria')}
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-[var(--svs-primary)]" /> : <Moon className="h-4 w-4 text-[var(--svs-primary-strong)]" />}
                <span>{isDarkMode ? t('theme.light') : t('theme.dark')}</span>
              </button>
            </div>
            {!isSellerConsoleRoute ? (
              <>
                <Link to="/checkout" aria-label="Open cart and checkout" className="relative rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]">
                  <ShoppingCart className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
                  {cartItemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--svs-primary)] px-1 text-[10px] font-bold text-white">
                      {cartItemCount}
                    </span>
                  ) : null}
                </Link>
                <Link to="/wishlist" aria-label="Open wishlist" className="relative rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]">
                  <Heart className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
                  {wishlistItemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--svs-primary)] px-1 text-[10px] font-bold text-white">
                      {wishlistItemCount}
                    </span>
                  ) : null}
                </Link>
              </>
            ) : null}
            <div className="relative" ref={notificationsMenuRef}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  const willOpen = !isNotificationsOpen;
                  setIsNotificationsOpen(willOpen);

                  if (willOpen && unreadNotificationsCount > 0) {
                    onMarkNotificationsRead?.();
                  }
                }}
                className="relative rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]"
              >
                <Bell className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
                {unreadNotificationsCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                ) : null}
              </button>

              {isNotificationsOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[var(--svs-border)] px-4 py-3">
                    <p className="text-sm font-bold text-[var(--svs-text)]">Notifications</p>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-[var(--svs-muted)]">{notifications.length} total</p>
                      {notifications.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => { onClearNotifications?.(); setIsNotificationsOpen(false); }}
                          className="text-xs font-semibold text-rose-500 transition hover:text-rose-700"
                        >
                          Clear all
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length ? notifications.map((notification) => (
                      <Link
                        key={notification.id}
                        to={notification.href || '/orders'}
                        onClick={() => setIsNotificationsOpen(false)}
                        className="mb-1 block rounded-xl border border-transparent bg-[var(--svs-surface-soft)] px-3 py-2.5 text-left transition last:mb-0 hover:border-[var(--svs-primary)]"
                      >
                        <p className="text-sm font-semibold text-[var(--svs-text)]">{notification.title}</p>
                        {notification.message ? <p className="mt-0.5 text-xs text-[var(--svs-muted)]">{notification.message}</p> : null}
                        <p className="mt-1 text-[11px] text-[var(--svs-muted)]">{formatDate(notification.createdAt)}</p>
                      </Link>
                    )) : (
                      <p className="px-2 py-3 text-sm text-[var(--svs-muted)]">No notifications yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                type="button"
                aria-label="User profile"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/signin');
                    return;
                  }

                  setProfileOpen((prev) => !prev);
                }}
                className="rounded-full bg-[var(--svs-cyan-surface)] p-1.5"
              >
                <User className="h-5 w-5" />
              </button>

              {isAuthenticated && profileOpen ? (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-3 shadow-xl">
                  <p className="text-xs uppercase tracking-wide text-[var(--svs-muted)]">{t('profile.signedInAs')}</p>
                  <p className="mt-1 text-sm font-bold text-[var(--svs-text)]">{profileName}</p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-3 w-full rounded-md border border-[#fca5a5] bg-[#fff1f2] px-3 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#ffe4e6]"
                  >
                    {t('profile.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="ml-auto rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] p-2 text-[var(--svs-nav-text)] lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-3 lg:hidden">
            {!isSellerConsoleRoute ? (
              <form onSubmit={handleSearchSubmit}>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('search.placeholder')}
                  className="mb-3 w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
                  aria-label={t('search.mobileAria')}
                />
              </form>
            ) : null}
            <button
              type="button"
              onClick={toggleTheme}
              className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] px-3 py-2 text-sm font-semibold"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-[var(--svs-primary)]" /> : <Moon className="h-4 w-4 text-[var(--svs-primary-strong)]" />}
              {t('theme.switchTo', { mode: isDarkMode ? t('theme.light') : t('theme.dark') })}
            </button>
            <div className="relative mb-3" ref={mobileLanguageMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setLanguageSearchQuery('');
                  setPendingLanguageCode(activeLanguage.code);
                  setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === activeLanguage.code));
                  setIsLanguageModalOpen((prev) => !prev);
                }}
                className="flex w-full items-center justify-between rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-left text-sm font-semibold"
                aria-haspopup="menu"
                aria-expanded={isLanguageModalOpen}
              >
                <span>{activeLanguage.flag ? `${activeLanguage.flag} ` : ''}{activeLanguage.englishName}</span>
                <ChevronDown className={`h-4 w-4 transition ${isLanguageModalOpen ? 'rotate-180' : ''}`} />
              </button>
              <LanguageSelectorPopover
                isOpen={isLanguageModalOpen}
                pendingLanguageCode={pendingLanguageCode}
                focusedIndex={focusedLanguageIndex}
                filteredLanguages={filteredLanguages}
                searchQuery={languageSearchQuery}
                onSearchQueryChange={setLanguageSearchQuery}
                onSelect={async (code) => {
                  setPendingLanguageCode(code);
                  setFocusedLanguageIndex(filteredLanguages.findIndex((language) => language.code === code));
                  setMobileOpen(false);
                  await applyLanguageCode(code);
                }}
                onFocusIndex={setFocusedLanguageIndex}
                cardRefs={languageCardRefs}
              />
            </div>
            <div className="space-y-2 text-sm font-semibold">
              {isSellerConsoleRoute ? sellerConsoleNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2"
                >
                  {item.label}
                </Link>
              )) : navItems.map((item) => (
                <Link
                  key={item.labelKey}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
              {isSellerConsoleRoute ? (
                <Link
                  to="/markets"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 font-bold text-[var(--svs-text)]"
                >
                  Switch to Buyer View
                </Link>
              ) : hasSellerAccess ? (
                <Link
                  to={sellerHomePath}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 font-bold text-[var(--svs-text)]"
                >
                  Switch to Seller View
                </Link>
              ) : (
                <Link
                  to="/sell"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md bg-orange-500 px-3 py-2 font-bold text-white"
                >
                  Sell on SVS
                </Link>
              )}
              {!isAuthenticated ? (
                <>
                  <Link to="/signin" className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2">
                    {t('profile.signIn')}
                  </Link>
                  <Link to="/signup" className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2">
                    {t('profile.signUp')}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      <main className="pt-20">{children}</main>
      <SiteFooter />
    </div>
  );
};

const HomePage = () => {
  const { t } = useTranslation();
  const isAuthenticated = getAuthState();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % homeHeroSlides.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const goToSlide = (index) => {
    const normalized = (index + homeHeroSlides.length) % homeHeroSlides.length;
    setActiveSlide(normalized);
  };

  const slide = homeHeroSlides[activeSlide];

  return (
    <>
      <section
        className="relative overflow-hidden bg-[#000000] px-4 py-16 text-white sm:py-24"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#141424] to-[#0a2030]" aria-hidden="true" />
        <div className="mx-auto w-full max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <img
              src={slide.image}
              alt="Shopping cart overflowing with delivery boxes"
              className="h-[420px] w-full object-cover md:h-[520px]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <p className="rounded-full bg-[var(--svs-primary)] px-4 py-1 text-sm font-semibold text-white">{slide.label}</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">{slide.title}</h1>
              <p className="mt-3 text-lg text-slate-100 sm:text-2xl">{slide.subtitle}</p>
              <button
                type="button"
                className={`${cudyBluePrimaryButtonClassName} mt-6 rounded-full bg-[var(--svs-primary)] px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 hover:bg-[#33b9f2]`}
              >
                {t('common.learnMore')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => goToSlide(activeSlide - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white transition hover:bg-black/60"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goToSlide(activeSlide + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 p-2 text-white transition hover:bg-black/60"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {homeHeroSlides.map((hero, index) => (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`h-2.5 w-2.5 rounded-full transition ${index === activeSlide ? 'bg-[var(--svs-primary)]' : 'bg-white/50'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="h-10 bg-gradient-to-b from-[#f4f7fa] to-[#f8f9fa]" />

      <section className="bg-[#f8f9fa] px-4 py-12">
        <div className="mx-auto w-full max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">What SVS E-COMMERCE Offers</h2>
          <div className="mt-5 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
            <p className="mt-4 text-base leading-7 text-[#555555] sm:text-lg">
              Shop, order, and book service provider you need - all in one intelligent platform. From daily essentials,
              food, and medicines to groceries, liquor, and tickets - enjoy a smooth, AI-powered experience with
              real-time tracking, personalized recommendations, and secure payments designed for your convenience.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#f3f6fb] shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            <img
              src="https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="Premium black smartwatch product preview"
              className="h-[380px] w-full object-cover"
              loading="lazy"
            />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-[#111827] sm:text-4xl">Smart Electronics and Gadgets</h2>
            <p className="mt-4 text-lg leading-8 text-[#555555]">
              Discover the latest smartphones, wearables, and smart home devices - powered by innovation and delivered
              with trust.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/markets"
                className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-6 py-3 text-base font-semibold text-white shadow transition hover:scale-105 hover:bg-[#33b9f2]`}
              >
                {t('common.exploreNow')}
              </Link>
              {!isAuthenticated ? (
                <Link
                  to="/signup"
                  className={`${cudyBluePrimaryOutlineClassName} rounded-md border border-[var(--svs-primary)] px-6 py-3 text-base font-semibold text-[var(--svs-primary)] transition hover:scale-105 hover:bg-[#e0f7fa]`}
                >
                  {t('profile.signUp')}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const KpiCard = ({ label, value }) => (
  <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
    <p className="text-sm text-[var(--svs-muted)]">{label}</p>
    <p className="text-2xl font-bold text-[var(--svs-primary-strong)]">{value}</p>
  </div>
);

const GroceriesSellerFields = ({ formData, onFieldChange, prefix = 'seller-grocery', isCompact = false }) => {
  const containerClassName = isCompact
    ? 'rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-3'
    : 'sm:col-span-2 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4';
  const labelClassName = isCompact
    ? 'mb-1 block text-xs font-medium text-[var(--svs-text)]'
    : 'mb-1 block text-sm font-medium text-[var(--svs-text)]';
  const inputClassName = isCompact
    ? 'w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none'
    : 'w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none';
  const helperClassName = isCompact
    ? 'mt-1 text-[10px] text-[var(--svs-muted)]'
    : 'mt-1 text-xs text-[var(--svs-muted)]';

  return (
    <div className={containerClassName}>
      <div className="mb-3">
        <h3 className={`${isCompact ? 'text-sm' : 'text-base'} font-bold text-[var(--svs-text)]`}>Groceries Listing Details</h3>
        <p className={`${helperClassName} mt-1`}>
          Grocery listings need category, brand, pack size, and freshness details so buyers can find the right product quickly.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-category`} className={labelClassName}>Grocery category</label>
          <select
            id={`${prefix}-category`}
            name="categoryKey"
            value={formData.categoryKey}
            onChange={onFieldChange}
            required
            className={inputClassName}
          >
            <option value="">Select grocery category</option>
            {groceriesCategoryCards.map((category) => (
              <option key={category.key} value={category.key}>{category.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${prefix}-brand`} className={labelClassName}>Brand</label>
          <input
            id={`${prefix}-brand`}
            name="brand"
            value={formData.brand}
            onChange={onFieldChange}
            required
            placeholder="e.g. Fresh Valley"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-volume`} className={labelClassName}>Pack size / weight / volume</label>
          <input
            id={`${prefix}-volume`}
            name="volume"
            value={formData.volume}
            onChange={onFieldChange}
            required
            placeholder="e.g. 1kg, 500g, 2L, 12 pack"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-freshness`} className={labelClassName}>Freshness or product state</label>
          <input
            id={`${prefix}-freshness`}
            name="freshness"
            value={formData.freshness}
            onChange={onFieldChange}
            required
            placeholder="e.g. Fresh today, chilled, frozen"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-expiry`} className={labelClassName}>Best before / expiry date</label>
          <input
            id={`${prefix}-expiry`}
            name="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={onFieldChange}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-origin`} className={labelClassName}>Origin / source</label>
          <input
            id={`${prefix}-origin`}
            name="origin"
            value={formData.origin}
            onChange={onFieldChange}
            placeholder="e.g. Local farm, imported from Kenya"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-storage`} className={labelClassName}>Storage guidance</label>
          <input
            id={`${prefix}-storage`}
            name="storage"
            value={formData.storage}
            onChange={onFieldChange}
            placeholder="e.g. Keep refrigerated"
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-discount`} className={labelClassName}>Offer badge</label>
          <input
            id={`${prefix}-discount`}
            name="discount"
            value={formData.discount}
            onChange={onFieldChange}
            placeholder="e.g. Fresh Pick, Weekly Deal"
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
};

const ECommercePage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'ecommerce'), ...productCards], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/e-commerce',
    marketName: t('markets.ecommerce'),
    details: item.subtitle || item.description || item.sellerName,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/e-commerce',
    marketName: t('markets.ecommerce'),
    details: item.subtitle || item.description || item.sellerName,
  });

  return (
    <PageFrame
      title={t('markets.ecommerce')}
      subtitle={t('ecommercePage.subtitle')}
      darkHero
    >
      <CardGrid
        items={marketItems}
        buttonLabel={t('common.addToCart')}
        secondaryButtonLabel={t('common.viewMore')}
        reviewSummaryMap={productReviewSummaryMap}
        getItemReviewKey={(item) => getCollectionItemId('/e-commerce', item.id)}
        onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
        onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
        onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
        onOpenItemDetails={(item) => {
          const wishlistItem = buildWishlistItem(item);
          onOpenItemDetails?.({
            title: getTranslatedValue(t, item.titleKey, item.title),
            image: item.image,
            images: item.images || (item.image ? [item.image] : []),
            marketName: t('markets.ecommerce'),
            details: item.subtitle || item.description || item.sellerName,
            priceLabel: getSalePrices(item.price).nowPrice,
            cartItem: buildCartItem(item),
            wishlistItem,
          });
        }}
        isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/e-commerce', item.id))}
        metaRenderer={(item) => <p className="text-sm text-slate-500">{item.subtitle || item.sellerName || 'Seller item'} • <SalePrice price={item.price} /></p>}
      />
    </PageFrame>
  );
};

const MovieDetailsPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [] }) => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const movie = bookingsPrototypeMovieItems.find((m) => m.id === movieId);

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [cinemaCountry, setCinemaCountry] = useState(movie?.country || 'all');
  const [cinemaCity, setCinemaCity] = useState(movie?.city || 'all');
  const [cinemaDate, setCinemaDate] = useState(movie?.date || 'all');
  const castScrollRef = useRef(null);

  if (!movie) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="text-2xl font-bold text-[var(--svs-text)]">Movie not found</h2>
        <button type="button" onClick={() => navigate('/bookings-tickets')} className="rounded-full bg-[#0f9fb2] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d8a9c]">Back to Bookings</button>
      </div>
    );
  }

  const gallery = movie.gallery || [movie.image];
  const similarMovies = bookingsPrototypeMovieItems.filter((m) => m.id !== movie.id);
  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(movie.rating || 0));

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* ── 1. Hero Cover Section — 460-520px desktop, 380-420px mobile ── */}
      <section className="relative w-full bg-[#0c1a20]">
        {/* Back to Bookings — top-left overlay */}
        <button type="button" onClick={() => navigate('/bookings-tickets')} className="absolute left-4 top-4 z-20 flex items-center gap-1.5 text-sm font-medium text-white/90 transition hover:text-white sm:left-6 sm:top-5">
          <ChevronLeft className="h-4 w-4" /> Back to Bookings
        </button>

        <div className="mx-auto flex max-w-7xl flex-col lg:h-[480px] lg:flex-row">
          {/* Left side (~60%) — large hero image filling the height */}
          <div className="relative h-[380px] w-full sm:h-[400px] lg:h-full lg:w-[60%]">
            <img src={movie.image} alt={movie.title} className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0c1a20] opacity-90 hidden lg:block" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c1a20] opacity-95 lg:hidden" />
          </div>

          {/* Right side (~40%) — dark overlay panel with movie info */}
          <div className="relative flex flex-col justify-center px-5 pb-8 pt-4 text-white sm:px-7 lg:w-[40%] lg:px-8 lg:py-8">
            {/* Rating badges — top-right area */}
            <div className="flex flex-wrap items-center gap-2">
              {movie.ageRating ? <span className="rounded bg-white/20 px-2.5 py-1 text-xs font-semibold">{movie.ageRating}</span> : null}
              {(movie.genres || [movie.genre]).map((g) => (
                <span key={g} className="rounded bg-[#0f9fb2]/30 px-2.5 py-1 text-xs font-semibold text-cyan-200">{g}</span>
              ))}
            </div>

            {/* Main title — 42-48px desktop, 32-36px mobile */}
            <h1 className="mt-4 text-[32px] font-bold leading-[1.1] sm:text-[36px] lg:text-[46px]">{movie.title}</h1>

            {/* Subtitle — 20-24px */}
            <p className="mt-2 text-[20px] text-slate-300 sm:text-[22px] lg:text-[24px]">{movie.subtitle}</p>

            {/* Rating & details line */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-200 sm:gap-4">
              <div className="flex items-center gap-1">
                {stars.map((filled, i) => (
                  <Star key={i} className={`h-4 w-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-slate-500'}`} />
                ))}
                <span className="ml-1 font-semibold">{movie.rating}</span>
              </div>
              {movie.duration ? <span>• {movie.duration}</span> : null}
              {movie.date ? <span>• {movie.date}</span> : null}
            </div>

            {/* Languages as tags */}
            {movie.languages ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {movie.languages.map((lang) => (
                  <span key={lang} className="rounded-full border border-white/25 px-3 py-0.5 text-xs text-slate-200">{lang}</span>
                ))}
              </div>
            ) : null}

            {/* Two prominent buttons — large and touch-friendly */}
            <div className="mt-6 flex flex-wrap gap-3 sm:mt-8">
              <button
                type="button"
                onClick={() => {
                  const section = document.getElementById('movie-showtimes');
                  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`${cudyBluePrimaryButtonClassName} rounded-full bg-[#0f9fb2] px-8 py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0d8a9c] sm:px-10 sm:py-4 sm:text-base`}
              >
                Book Ticket
              </button>
              <button
                type="button"
                onClick={() => onToggleWishlist?.({ id: movie.id, title: movie.title, image: movie.image, price: movie.price, route: '/bookings-tickets' })}
                className="flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10 sm:px-8 sm:py-4 sm:text-base"
              >
                <Heart className={`h-5 w-5 ${wishlistItemIds.includes(movie.id) ? 'fill-red-400 text-red-400' : ''}`} />
                Add to Wishlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Overview Section ── */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:pt-[70px]">
        <h2 className="text-[22px] font-bold text-[var(--svs-text)] sm:text-[24px]">Overview</h2>
        <p className="mt-4 max-w-4xl text-[15px] leading-[1.7] text-slate-600 sm:text-[16px] sm:leading-[1.65]">{movie.overview}</p>

        {/* Director & Writer — two-column desktop, stacked mobile */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <span className="text-sm font-semibold text-[var(--svs-text)]">Director</span>
            <p className="mt-1 text-[15px] text-slate-600">{movie.director}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-[var(--svs-text)]">Writer</span>
            <p className="mt-1 text-[15px] text-slate-600">{movie.writer}</p>
          </div>
        </div>
      </section>

      {/* ── 3. Cast & Crew Section ── */}
      {movie.cast && movie.cast.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:pt-[70px]">
          <h2 className="text-[22px] font-bold text-[var(--svs-text)] sm:text-[24px]">Cast &amp; Crew</h2>
          <div ref={castScrollRef} className="mt-5 flex gap-5 overflow-x-auto pb-3 sm:gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {movie.cast.map((person) => (
              <div key={person.name} className="flex w-[130px] shrink-0 flex-col items-center sm:w-[150px]">
                <img src={person.photo} alt={person.name} className="h-[130px] w-[130px] rounded-full object-cover shadow-md sm:h-[150px] sm:w-[150px]" loading="lazy" />
                <h3 className="mt-3 text-center text-[15px] font-semibold text-[var(--svs-text)]">{person.name}</h3>
                <p className="mt-0.5 text-center text-xs text-[var(--svs-muted)]">{person.role}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 4. Showtimes & Cinemas Section ── */}
      <section id="movie-showtimes" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:pt-[70px]">
        <h2 className="text-[22px] font-bold text-[var(--svs-text)] sm:text-[24px]">Showtimes &amp; Cinemas</h2>

        {/* Three dropdown filters */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <select value={cinemaCountry} onChange={(e) => { setCinemaCountry(e.target.value); setCinemaCity('all'); }} className="h-12 w-full rounded-lg border border-[var(--svs-border)] bg-white px-3 text-[15px] text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30">
            <option value="all">Select Country</option>
            <option value={movie.country}>{movie.country}</option>
          </select>
          <select value={cinemaCity} onChange={(e) => setCinemaCity(e.target.value)} className="h-12 w-full rounded-lg border border-[var(--svs-border)] bg-white px-3 text-[15px] text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30">
            <option value="all">Select City</option>
            <option value={movie.city}>{movie.city}</option>
          </select>
          <select value={cinemaDate} onChange={(e) => setCinemaDate(e.target.value)} className="h-12 w-full rounded-lg border border-[var(--svs-border)] bg-white px-3 text-[15px] text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30">
            <option value="all">Select Date</option>
            {movie.date ? <option value={movie.date}>{movie.date}</option> : null}
          </select>
        </div>

        {/* Cinema list — stacked vertically */}
        <div className="mt-6 space-y-4">
          {(movie.cinemas || []).map((cinema) => (
            <div key={cinema.name} className="rounded-xl border border-[var(--svs-border)] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--svs-text)]">{cinema.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[15px] text-[var(--svs-muted)]">
                    <MapPin className="h-4 w-4 shrink-0 text-[var(--svs-primary)]" />
                    {cinema.location}
                  </p>
                </div>
                <p className="text-lg font-bold text-[var(--svs-text)] sm:text-xl">R {cinema.price}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cinema.showtimes.map((time) => (
                  <span key={time} className="rounded-full bg-[#0f9fb2]/10 px-4 py-1.5 text-xs font-semibold text-[#0f9fb2]">{time}</span>
                ))}
              </div>
              <button
                type="button"
                className={`${cudyBluePrimaryButtonClassName} mt-4 w-full rounded-lg bg-[#0f9fb2] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#0d8a9c]`}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. Gallery Section ── */}
      {gallery.length > 1 ? (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:pt-[70px]">
          <h2 className="text-[22px] font-bold text-[var(--svs-text)] sm:text-[24px]">Gallery</h2>
          <div className="relative mt-5 overflow-hidden rounded-xl">
            <img src={gallery[galleryIndex]} alt={`Gallery ${galleryIndex + 1}`} className="h-[260px] w-full object-cover sm:h-[380px] lg:h-[460px]" />
            {/* Left / right arrows */}
            <button type="button" onClick={() => setGalleryIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1))} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70" aria-label="Previous image">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => setGalleryIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1))} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70" aria-label="Next image">
              <ChevronRight className="h-5 w-5" />
            </button>
            {/* "1/4" indicator */}
            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3.5 py-1 text-sm font-semibold text-white">{galleryIndex + 1}/{gallery.length}</span>
          </div>
          {/* Thumbnail strip — horizontal scroll on mobile */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {gallery.map((img, i) => (
              <button key={i} type="button" onClick={() => setGalleryIndex(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-20 sm:w-28 ${i === galleryIndex ? 'border-[#0f9fb2]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                <img src={img} alt={`Thumb ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 6. Similar Movies Section ── */}
      {similarMovies.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-20 lg:pt-[70px]">
          <h2 className="text-[22px] font-bold text-[var(--svs-text)] sm:text-[24px]">Similar Movies</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similarMovies.map((m) => (
              <article key={m.id} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(15,23,42,0.14)]">
                <img src={m.image} alt={m.title} className="h-[180px] w-full object-cover sm:h-[200px]" loading="lazy" />
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <h3 className="text-[16px] font-bold text-[var(--svs-text)]">{m.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(m.genres || [m.genre]).map((g) => (
                      <span key={g} className="rounded bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{g}</span>
                    ))}
                  </div>
                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/movie/${m.id}`)}
                      className={`${cudyBluePrimaryButtonClassName} w-full rounded-lg bg-[#0f9fb2] py-3 text-[15px] font-semibold text-white transition hover:bg-[#0d8a9c]`}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

const TicketsPage = (props) => <BookingsTicketsPage {...props} />;

const BookingsTicketsPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], onOpenItemDetails }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLocale = i18n.resolvedLanguage || i18n.language || 'en-US';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [sectionVisibleCounts, setSectionVisibleCounts] = useState({});
  const [movieSidebarOpen, setMovieSidebarOpen] = useState(false);
  const [movieGenreFilters, setMovieGenreFilters] = useState([]);
  const [movieLanguageFilters, setMovieLanguageFilters] = useState([]);
  const [movieShowtimeFilters, setMovieShowtimeFilters] = useState([]);
  const [movieFilterCountry, setMovieFilterCountry] = useState('all');
  const [movieFilterCity, setMovieFilterCity] = useState('all');
  const [sidebarGenreOpen, setSidebarGenreOpen] = useState(false);
  const [sidebarLanguageOpen, setSidebarLanguageOpen] = useState(false);
  const [sidebarLocationOpen, setSidebarLocationOpen] = useState(false);
  const [sidebarShowtimeOpen, setSidebarShowtimeOpen] = useState(false);

  const movieGenreOptions = ['Action', 'Drama', 'Comedy', 'Thriller', 'Horror', 'Romantic'];
  const movieShowtimeOptions = ['Morning', 'Afternoon', 'Evening', 'Late Night'];

  const movieLanguageOptions = useMemo(
    () => [...new Set(bookingsPrototypeMovieItems.map((item) => item.language).filter(Boolean))].sort(),
    [],
  );

  const movieCountryOptions = useMemo(
    () => [...new Set(bookingsPrototypeMovieItems.map((item) => item.country).filter(Boolean))].sort(),
    [],
  );

  const movieCityOptions = useMemo(() => {
    const movies = movieFilterCountry === 'all'
      ? bookingsPrototypeMovieItems
      : bookingsPrototypeMovieItems.filter((item) => item.country === movieFilterCountry);
    return [...new Set(movies.map((item) => item.city).filter(Boolean))].sort();
  }, [movieFilterCountry]);

  const toggleMovieFilter = (setter, value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const applyMovieSidebarFilters = () => {
    setMovieSidebarOpen(false);
  };

  useEffect(() => {
    setMovieSidebarOpen(activeCategory === 'Movies');
  }, [activeCategory]);

  const allBookingPrototypeItems = useMemo(
    () => [
      ...bookingsPrototypeMovieItems,
      ...bookingsPrototypeConcertItems,
      ...bookingsPrototypeSportsItems,
      ...bookingsPrototypeTravelItems,
    ],
    [],
  );

  const filteredBookingPrototypeItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const nextItems = allBookingPrototypeItems.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesDate = selectedDate === 'all' || item.date === selectedDate;
      const matchesCountry = selectedCountry === 'all' || item.country === selectedCountry;
      const matchesQuery = !normalizedQuery || [item.title, item.subtitle, item.meta, item.provider, item.location, item.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesDate && matchesCountry && matchesQuery;
    });

    return nextItems.sort((leftItem, rightItem) => {
      const leftTimestamp = new Date(leftItem.sortDate || leftItem.date || '1970-01-01').getTime();
      const rightTimestamp = new Date(rightItem.sortDate || rightItem.date || '1970-01-01').getTime();

      return sortOrder === 'Oldest' ? leftTimestamp - rightTimestamp : rightTimestamp - leftTimestamp;
    });
  }, [activeCategory, allBookingPrototypeItems, searchQuery, selectedCountry, selectedDate, sortOrder]);

  const filteredMovies = useMemo(() => {
    let movies = filteredBookingPrototypeItems.filter((item) => item.category === 'Movies');
    if (movieGenreFilters.length > 0) movies = movies.filter((item) => movieGenreFilters.includes(item.genre));
    if (movieLanguageFilters.length > 0) movies = movies.filter((item) => movieLanguageFilters.includes(item.language));
    if (movieShowtimeFilters.length > 0) movies = movies.filter((item) => movieShowtimeFilters.includes(item.showtime));
    if (movieFilterCountry !== 'all') movies = movies.filter((item) => item.country === movieFilterCountry);
    if (movieFilterCity !== 'all') movies = movies.filter((item) => item.city === movieFilterCity);
    return movies;
  }, [filteredBookingPrototypeItems, movieGenreFilters, movieLanguageFilters, movieShowtimeFilters, movieFilterCountry, movieFilterCity]);
  const filteredConcerts = filteredBookingPrototypeItems.filter((item) => item.category === 'Concerts');
  const filteredSports = filteredBookingPrototypeItems.filter((item) => item.category === 'Sports');
  const filteredTravel = filteredBookingPrototypeItems.filter((item) => item.category === 'Travel');

  const shouldShowMoviesSection = activeCategory === 'Movies' || ((searchQuery.trim() || selectedDate !== 'all' || selectedCountry !== 'all') && filteredMovies.length > 0);

  const openBookingItemDetails = (item) => {
    const details = buildBookingsPrototypeDetails(item, currentLocale);
    const cartItem = createCartItem({
      ...item,
      route: '/bookings-tickets',
      marketName: t('markets.bookings'),
      details,
    });
    const wishlistItem = createWishlistItem({
      ...item,
      route: '/bookings-tickets',
      marketName: t('markets.bookings'),
      details,
    });

    onOpenItemDetails?.({
      title: item.title,
      image: item.image,
      images: item.images || (item.image ? [item.image] : []),
      marketName: t('markets.bookings'),
      details,
      priceLabel: item.price,
      cartItem,
      wishlistItem,
    });
  };

  const bookingsSections = [
    {
      id: 'bookings-movies-section',
      category: 'Movies',
      title: 'Movies',
      subtitle: 'Book the latest movies in your favorite cinemas.',
      items: filteredMovies,
      show: shouldShowMoviesSection,
    },
    {
      id: 'bookings-concerts-section',
      category: 'Concerts',
      title: 'Trending Concerts',
      subtitle: 'Catch the hottest live performances',
      items: filteredConcerts,
      show: activeCategory === 'All' || activeCategory === 'Concerts',
    },
    {
      id: 'bookings-sports-section',
      category: 'Sports',
      title: 'Popular Matches',
      subtitle: 'Catch the most exciting matches happening now',
      items: filteredSports,
      show: activeCategory === 'All' || activeCategory === 'Sports',
    },
    {
      id: 'bookings-travel-section',
      category: 'Travel',
      title: 'Hot Travel Deals',
      subtitle: 'Grab the most exciting travel offers before they’re gone',
      items: filteredTravel,
      show: activeCategory === 'All' || activeCategory === 'Travel',
    },
  ].filter((section) => section.show && section.items.length > 0);

  return (
    <PageFrame
      title="Bookings And Tickets Sales Market"
      subtitle="Book movies, concerts, sports, and travel instantly with date and location filters."
      heroImages={[
        'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1200',
        'https://images.pexels.com/photos/912050/pexels-photo-912050.jpeg?auto=compress&cs=tinysrgb&w=1200',
      ]}
      heroOverlayClassName="bg-gradient-to-b from-black/70 via-black/55 to-black/70"
      heroContainerClassName="rounded-none border-x-0 border-t-0 p-0 shadow-none"
      heroContentClassName="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center sm:min-h-[260px] sm:px-8 sm:py-10"
      sectionClassName="px-0 pt-0 pb-8 sm:pt-0 sm:pb-10"
      heroWrapperClassName="w-full max-w-none"
      contentWrapperClassName="mx-auto w-full max-w-7xl px-4"
      titleClassName="text-xl text-white sm:text-2xl"
      subtitleClassName="mt-2 text-xs text-white/90 sm:text-sm"
    >
      {/* ── Search + Filter Bar ── */}
      <div className="mt-8 sm:mt-10">
        {/* Search bar — centered, max 700px */}
        <div className="mx-auto max-w-[700px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tickets, events, routes, or venues"
              className="h-10 w-full rounded-full border border-[var(--svs-border)] bg-white pl-11 pr-4 text-xs font-medium text-[var(--svs-text)] shadow-sm outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
            />
          </div>
        </div>

        {/* Filter row — card container */}
        <div className="mt-4 rounded-xl border border-[var(--svs-border)] bg-white/80 px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)] backdrop-blur sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {/* Date dropdown */}
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
                <select
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="h-9 w-full appearance-none rounded-full border border-[var(--svs-border)] bg-white pl-9 pr-8 text-xs font-semibold text-[var(--svs-text)] outline-none transition hover:border-[var(--svs-primary)] focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30 sm:w-[180px]"
                >
                  {bookingsPrototypeDateOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
              </div>

              {/* Country dropdown */}
              <div className="relative">
                <Flag className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
                <select
                  value={selectedCountry}
                  onChange={(event) => setSelectedCountry(event.target.value)}
                  className="h-9 w-full appearance-none rounded-full border border-[var(--svs-border)] bg-white pl-9 pr-8 text-xs font-semibold text-[var(--svs-text)] outline-none transition hover:border-[var(--svs-primary)] focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30 sm:w-[190px]"
                >
                  {bookingsPrototypeCountryOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
              </div>

              {/* Category pill tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                {bookingsPrototypeCategoryTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveCategory(tab);
                      if (tab !== 'All') {
                        setTimeout(() => {
                          const sectionId = `bookings-${tab.toLowerCase()}-section`;
                          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }
                    }}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${activeCategory === tab ? 'bg-[#0f9fb2] text-white shadow-[0_4px_14px_rgba(15,159,178,0.30)]' : 'border border-[var(--svs-border)] bg-white text-[var(--svs-text)] hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="h-9 w-full appearance-none rounded-full border border-[var(--svs-border)] bg-white px-4 pr-8 text-xs font-semibold text-[var(--svs-text)] outline-none transition hover:border-[var(--svs-primary)] focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30 sm:w-[130px]"
              >
                <option value="Newest">Newest</option>
                <option value="Oldest">Oldest</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Category Cards ── */}
      <div className="mt-[50px] sm:mt-[60px]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bookingsPrototypeCategoryCards.map((card) => (
            <article
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveCategory(card.category);
                setTimeout(() => {
                  const sectionId = `bookings-${card.category.toLowerCase()}-section`;
                  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveCategory(card.category);
                  setTimeout(() => {
                    const sectionId = `bookings-${card.category.toLowerCase()}-section`;
                    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl shadow-[0_4px_16px_rgba(15,23,42,0.10)] transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
            >
              <div className="relative h-[180px] w-full sm:h-[200px] lg:h-[210px]">
                <img src={card.image} alt={card.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="flex flex-1 flex-col justify-between bg-[#0c2a32] px-5 py-4 text-white">
                <div>
                  <h2 className="text-[22px] font-bold leading-tight">{card.title}</h2>
                  <p className="mt-1.5 text-[15px] leading-snug text-slate-300">{card.description}</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8cecf5] transition-all group-hover:gap-2.5">
                    Explore
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* ── Movie Sidebar + Content Sections ── */}
      {/* Section heading placed above the flex row so sidebar & cards align horizontally */}
      {movieSidebarOpen && bookingsSections.length > 0 ? (
        <div className="mb-5 mt-10 text-center sm:mt-12">
          <h2 className="text-xl font-bold tracking-tight text-[var(--svs-text)] sm:text-2xl">{bookingsSections[0].title}</h2>
          <p className="mt-1.5 text-xs text-[var(--svs-muted)] sm:text-sm">{bookingsSections[0].subtitle}</p>
        </div>
      ) : null}
      <div className={`${movieSidebarOpen ? 'flex flex-col lg:flex-row lg:items-start lg:gap-6' : ''} ${movieSidebarOpen ? '' : 'mt-10 sm:mt-12'}`}>

        {/* ── Movie Filter Sidebar (desktop: fixed left, mobile: slide-in drawer) ── */}
        {movieSidebarOpen ? (
          <>
            {/* Mobile overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMovieSidebarOpen(false)}
              onKeyDown={() => {}}
              role="presentation"
            />

            {/* Sidebar panel */}
            <aside className="fixed left-0 top-0 z-50 flex h-full w-[320px] flex-col overflow-y-auto border-r border-[var(--svs-border)] bg-white px-5 pb-6 pt-6 shadow-lg sm:w-[340px] lg:sticky lg:top-4 lg:z-auto lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:w-[280px] lg:shrink-0 lg:rounded-xl lg:border lg:shadow-[0_2px_12px_rgba(15,23,42,0.08)]">
              {/* Close button (mobile only) */}
              <button
                type="button"
                onClick={() => setMovieSidebarOpen(false)}
                className="mb-4 self-end rounded-full p-1.5 text-[var(--svs-muted)] transition hover:bg-slate-100 hover:text-[var(--svs-text)] lg:hidden"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Movie Genre */}
              <div className="border-b border-slate-200 pb-4">
                <button type="button" onClick={() => setSidebarGenreOpen((p) => !p)} className="flex w-full items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[var(--svs-text)]">Movie Genre</h3>
                  <ChevronDown className={`h-4.5 w-4.5 text-[var(--svs-muted)] transition-transform ${sidebarGenreOpen ? 'rotate-180' : ''}`} />
                </button>
                {sidebarGenreOpen ? (
                  <div className="mt-3 space-y-2.5">
                    {movieGenreOptions.map((genre) => (
                      <label key={genre} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={movieGenreFilters.includes(genre)}
                          onChange={() => toggleMovieFilter(setMovieGenreFilters, genre)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--svs-primary)] accent-[var(--svs-primary)]"
                        />
                        <span className="text-[15px] text-[var(--svs-text)]">{genre}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Language (dynamic) */}
              <div className="mt-5 border-b border-slate-200 pb-4">
                <button type="button" onClick={() => setSidebarLanguageOpen((p) => !p)} className="flex w-full items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[var(--svs-text)]">Language</h3>
                  <ChevronDown className={`h-4.5 w-4.5 text-[var(--svs-muted)] transition-transform ${sidebarLanguageOpen ? 'rotate-180' : ''}`} />
                </button>
                {sidebarLanguageOpen ? (
                  <div className="mt-3 space-y-2.5">
                    {movieLanguageOptions.length > 0 ? movieLanguageOptions.map((lang) => (
                      <label key={lang} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={movieLanguageFilters.includes(lang)}
                          onChange={() => toggleMovieFilter(setMovieLanguageFilters, lang)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--svs-primary)] accent-[var(--svs-primary)]"
                        />
                        <span className="text-[15px] text-[var(--svs-text)]">{lang}</span>
                      </label>
                    )) : (
                      <p className="text-sm text-[var(--svs-muted)]">No languages available</p>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Cinema Location */}
              <div className="mt-5 border-b border-slate-200 pb-4">
                <button type="button" onClick={() => setSidebarLocationOpen((p) => !p)} className="flex w-full items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[var(--svs-text)]">Cinema Location</h3>
                  <ChevronDown className={`h-4.5 w-4.5 text-[var(--svs-muted)] transition-transform ${sidebarLocationOpen ? 'rotate-180' : ''}`} />
                </button>
                {sidebarLocationOpen ? (
                  <div className="mt-3 space-y-3">
                    <select
                      value={movieFilterCountry}
                      onChange={(event) => { setMovieFilterCountry(event.target.value); setMovieFilterCity('all'); }}
                      className="h-10 w-full appearance-none rounded-lg border border-[var(--svs-border)] bg-white px-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
                    >
                      <option value="all">Select Country</option>
                      {movieCountryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={movieFilterCity}
                      onChange={(event) => setMovieFilterCity(event.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-[var(--svs-border)] bg-white px-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/30"
                    >
                      <option value="all">Select City</option>
                      {movieCityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ) : null}
              </div>

              {/* Showtime */}
              <div className="mt-5 border-b border-slate-200 pb-4">
                <button type="button" onClick={() => setSidebarShowtimeOpen((p) => !p)} className="flex w-full items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[var(--svs-text)]">Showtime</h3>
                  <ChevronDown className={`h-4.5 w-4.5 text-[var(--svs-muted)] transition-transform ${sidebarShowtimeOpen ? 'rotate-180' : ''}`} />
                </button>
                {sidebarShowtimeOpen ? (
                  <div className="mt-3 space-y-2.5">
                    {movieShowtimeOptions.map((time) => (
                      <label key={time} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={movieShowtimeFilters.includes(time)}
                          onChange={() => toggleMovieFilter(setMovieShowtimeFilters, time)}
                          className="h-4 w-4 rounded border-slate-300 text-[var(--svs-primary)] accent-[var(--svs-primary)]"
                        />
                        <span className="text-[15px] text-[var(--svs-text)]">{time}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Apply Filters button */}
              <button
                type="button"
                onClick={applyMovieSidebarFilters}
                className={`${cudyBluePrimaryButtonClassName} mt-8 w-full rounded-lg bg-[#0f9fb2] py-3 text-sm font-semibold text-white transition hover:bg-[#0d8a9c]`}
              >
                Apply Filters
              </button>
            </aside>
          </>
        ) : null}

        {/* ── Main content area ── */}
        <div className={movieSidebarOpen ? 'min-w-0 flex-1' : ''}>
          {/* Mobile "Open Filters" button (visible when sidebar is closed on mobile & Movies active) */}
          {activeCategory === 'Movies' && !movieSidebarOpen ? (
            <div className="mb-4 lg:hidden">
              <button
                type="button"
                onClick={() => setMovieSidebarOpen(true)}
                className="rounded-lg border border-[var(--svs-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--svs-text)] shadow-sm transition hover:border-[var(--svs-primary)]"
              >
                Open Movie Filters
              </button>
            </div>
          ) : null}

          {/* Content Sections */}
          {bookingsSections.length ? (
        bookingsSections.map((section, sectionIndex) => (
          <div key={section.id} id={section.id} className={sectionIndex === 0 && movieSidebarOpen ? '' : sectionIndex === 0 ? 'mt-10 sm:mt-12' : 'mt-10 sm:mt-14'}>
            {sectionIndex === 0 && movieSidebarOpen ? null : (
            <div className="mb-5 text-center">
              <h2 className="text-xl font-bold tracking-tight text-[var(--svs-text)] sm:text-2xl">{section.title}</h2>
              <p className="mt-1.5 text-xs text-[var(--svs-muted)] sm:text-sm">{section.subtitle}</p>
            </div>
            )}

            <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.slice(0, sectionVisibleCounts[section.id] || 3).map((item) => (
                <article
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => item.category === 'Movies' ? navigate(`/movie/${item.id}`) : openBookingItemDetails(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      item.category === 'Movies' ? navigate(`/movie/${item.id}`) : openBookingItemDetails(item);
                    }
                  }}
                  className="flex cursor-pointer flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
                >
                  <img src={item.image} alt={item.title} className="h-[160px] w-full object-cover sm:h-[180px]" loading="lazy" />
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-base font-bold text-[var(--svs-text)]">{item.title}</h3>
                    {item.subtitle ? (
                      <p className="mt-0.5 text-xs text-[var(--svs-muted)]">{item.subtitle}</p>
                    ) : null}
                    <div className="mt-2 space-y-1 text-xs text-[var(--svs-muted)]">
                      {item.date ? (
                        <p className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--svs-primary)]" />
                          <span>{formatDate(item.date, currentLocale)}</span>
                        </p>
                      ) : null}
                      {item.meta ? (
                        <p className="text-xs text-[var(--svs-muted)]">{item.meta}</p>
                      ) : null}
                      {item.location ? (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--svs-primary)]" />
                          <span>{item.location}</span>
                        </p>
                      ) : null}
                      {item.provider ? (
                        <p className="text-xs text-[var(--svs-muted)]">{item.provider}</p>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base font-bold text-[var(--svs-text)]">{item.price}</p>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          item.category === 'Movies' ? navigate(`/movie/${item.id}`) : openBookingItemDetails(item);
                        }}
                        className={`${cudyBluePrimaryButtonClassName} rounded-full bg-[#0f9fb2] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0d8a9c]`}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {(sectionVisibleCounts[section.id] || 3) < section.items.length ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSectionVisibleCounts((prev) => ({ ...prev, [section.id]: (prev[section.id] || 3) + 3 }))}
                  className="rounded-full bg-[#0f9fb2] px-6 py-2 text-xs font-semibold text-white transition hover:bg-[#0d8a9c]"
                >
                  View More
                </button>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-[var(--svs-border)] bg-white px-5 py-10 text-center text-xs text-[var(--svs-muted)]">
          No bookings match your current search and filters. Adjust the date, country, or category to see more options.
        </div>
      )}
        </div>
      </div>
    </PageFrame>
  );
};

const VotingClientsPage = () => {
  const { t } = useTranslation();
  const [submittedVote, setSubmittedVote] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  return (
    <PageFrame
      title={t('markets.votingClients')}
      subtitle={t('pageSubtitles.votingClients')}
    >
      <div className="mb-5 rounded-xl border border-[#f44336] bg-[#fff4f4] p-3 text-sm text-[#b91c1c]">
        18+ Only. Play Responsibly. Help Line: +1-800-522-4700.
      </div>

      <div className="space-y-4">
        {matchSeed.map((match) => (
          <article key={match.id} className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
            <h3 className="text-lg font-bold">{match.match}</h3>
            <p className="mt-1 text-sm text-slate-600">Man City Win? {match.split}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {match.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSubmittedVote({ match: match.match, option });
                    setHasVoted(true);
                  }}
                  className="rounded-md border border-[#b2ebf2] bg-white px-3 py-2 text-sm font-semibold transition hover:bg-[#e0f7fa]"
                >
                  Vote: {option}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {hasVoted ? (
        <section className="mt-6">
          <h3 className="text-xl font-bold">Post-Vote Live Stats</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <KpiCard label="Total Votes" value="10,000+" />
            <KpiCard label="Verified Experts" value="500+" />
            <KpiCard label="High Accuracy" value="88%" />
          </div>
        </section>
      ) : null}

      {submittedVote ? <VoteSuccessModal vote={submittedVote} onClose={() => setSubmittedVote(null)} /> : null}
    </PageFrame>
  );
};

const VoteSuccessModal = ({ vote, onClose }) => {
  const { t } = useTranslation();

  return (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-md rounded-2xl border border-[#b2ebf2] bg-white p-5 shadow-2xl animate-[fadeIn_0.2s_ease-out]">
      <p className="text-sm font-semibold text-[#4caf50]">Vote Submitted Successfully!</p>
      <h3 className="mt-1 text-xl font-bold">{vote.match}</h3>
      <p className="mt-2 text-sm text-slate-600">You selected: {vote.option}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-md bg-[#e0f7fa] p-2">
          <p className="text-xs text-slate-500">Accuracy</p>
          <p className="font-bold">82%</p>
        </div>
        <div className="rounded-md bg-[#e0f7fa] p-2">
          <p className="text-xs text-slate-500">Rank</p>
          <p className="font-bold">#3</p>
        </div>
        <div className="rounded-md bg-[#e0f7fa] p-2">
          <p className="text-xs text-slate-500">Votes</p>
          <p className="font-bold">10,000+</p>
        </div>
      </div>
      <button type="button" onClick={onClose} className={`${cudyBluePrimaryButtonClassName} mt-4 w-full rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white`}>
        {t('common.continue')}
      </button>
    </div>
  </div>
  );
};

const VotingProvidersPage = () => {
  const { t } = useTranslation();
  return (
    <PageFrame
      title={t('markets.votingProviders')}
      subtitle={t('pageSubtitles.votingProviders')}
    >
      <div className="space-y-4">
        {leaderboardSeed.map((expert) => (
          <article key={expert.id} className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">#{expert.rank} {expert.name}</h3>
              <button type="button" className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-1.5 text-sm font-semibold text-white`}>
                {t('common.voteNow')}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600">{expert.votes.toLocaleString()} total votes</p>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-[var(--svs-primary)]" style={{ width: `${expert.accuracy}%` }} aria-label={`Accuracy ${expert.accuracy}%`} />
            </div>
            <p className="mt-1 text-sm text-[var(--svs-primary-strong)]">{expert.accuracy}% accuracy</p>
          </article>
        ))}
      </div>
    </PageFrame>
  );
};

const GroceriesPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { categoryKey = '' } = useParams();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'groceries'), ...groceries], [sellerItems]);
  const activeCategory = groceriesCategoryCards.find((category) => category.key === categoryKey) || null;
  const filteredMarketItems = useMemo(
    () => marketItems.filter((item) => resolveGroceriesCategoryKey(item) === activeCategory?.key),
    [marketItems, activeCategory],
  );
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/groceries',
    marketName: t('markets.groceries'),
    details: getGroceriesListingDetailsText(item),
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/groceries',
    marketName: t('markets.groceries'),
    details: getGroceriesListingDetailsText(item),
  });

  if (categoryKey && !activeCategory) {
    return <Navigate to="/groceries" replace />;
  }

  if (activeCategory) {
    return (
      <PageFrame
        title={activeCategory.title}
        subtitle={activeCategory.subtitle}
        heroImage={activeCategory.image}
        heroMediaClassName="scale-105"
        heroOverlayClassName="bg-gradient-to-r from-black/80 via-black/60 to-black/45"
        sectionClassName="px-0 pt-0 pb-8 sm:pt-0 sm:pb-10"
        heroWrapperClassName="w-full max-w-none"
        contentWrapperClassName="mx-auto w-full max-w-7xl px-4"
        heroContainerClassName="rounded-none border-x-0 border-t-0 p-0 shadow-none"
        heroContentClassName="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center sm:min-h-[260px] sm:px-8 sm:py-10"
        titleClassName="text-xl text-white sm:text-2xl"
        subtitleClassName="mt-2 text-xs text-white/90 sm:text-sm"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-4 shadow-[0_4px_8px_rgba(0,0,0,0.06)] sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--svs-primary-strong)]">Groceries category</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--svs-text)] sm:text-2xl">{activeCategory.title}</h2>
            <p className="mt-1 text-sm text-[var(--svs-muted)]">{filteredMarketItems.length} products available in this category</p>
          </div>
          <Link
            to="/groceries"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--svs-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to categories
          </Link>
        </div>
        {filteredMarketItems.length ? (
          <CardGrid
            items={filteredMarketItems}
            buttonLabel={t('common.addToBasket')}
            secondaryButtonLabel={t('common.viewDetails')}
            reviewSummaryMap={productReviewSummaryMap}
            getItemReviewKey={(item) => getCollectionItemId('/groceries', item.id)}
            onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
            onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
            onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
            onOpenItemDetails={(item) => {
              const wishlistItem = buildWishlistItem(item);
              onOpenItemDetails?.({
                title: getTranslatedValue(t, item.titleKey, item.title),
                image: item.image,
                images: item.images || (item.image ? [item.image] : []),
                marketName: t('markets.groceries'),
                details: getGroceriesListingDetailsText(item),
                priceLabel: getSalePrices(item.price).nowPrice,
                cartItem: buildCartItem(item),
                wishlistItem,
              });
            }}
            isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/groceries', item.id))}
            metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} /> • {getGroceriesListingMetaText(item)}</p>}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-8 text-sm text-[var(--svs-muted)]">
            No items are available in {activeCategory.title} yet.
          </div>
        )}
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Groceries Market"
      subtitle="Browse and order fresh groceries and pantry essentials from trusted brands"
      heroImage="https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=1600"
      heroMediaClassName="scale-105 blur-[2px]"
      heroOverlayClassName="bg-gradient-to-r from-black/75 via-black/65 to-black/55"
      sectionClassName="px-0 pt-0 pb-8 sm:pt-0 sm:pb-10"
      heroWrapperClassName="w-full max-w-none"
      contentWrapperClassName="mx-auto w-full max-w-7xl px-4"
      heroContainerClassName="rounded-none border-x-0 border-t-0 p-0 shadow-none"
      heroContentClassName="flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center sm:min-h-[260px] sm:px-8 sm:py-10"
      titleClassName="text-xl text-white sm:text-2xl"
      subtitleClassName="mt-2 text-xs text-white/90 sm:text-sm"
    >
      <div className="mb-5 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-4 shadow-[0_4px_8px_rgba(0,0,0,0.06)] sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <ShoppingCart className="h-8 w-8 shrink-0 text-[var(--svs-primary)] sm:h-10 sm:w-10" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[var(--svs-text)] sm:text-lg">Shop by Category</h2>
            <p className="mt-1 text-sm text-[var(--svs-muted)]">Browse our wide range of product categories</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groceriesCategoryCards.map((category) => {
          return (
            <button
              key={category.key}
              type="button"
              onClick={() => navigate(`/groceries/${category.key}`)}
              className="group overflow-hidden rounded-2xl border border-[var(--svs-border)] text-left transition duration-200 hover:-translate-y-1 hover:border-[var(--svs-primary)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)]"
            >
              <div className="relative h-48">
                <img
                  src={category.image}
                  alt={category.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f766e]/95 via-[#0f766e]/45 to-transparent" aria-hidden="true" />
                <div className="absolute left-4 top-4 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0f766e]">
                  Category
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h3 className="text-lg font-bold">{category.title}</h3>
                  <p className="mt-1 text-sm text-white/90">{category.subtitle}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </PageFrame>
  );
};

const FastFoodPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'fastFood'), ...fastFoodItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/fast-food',
    marketName: t('markets.fastFood'),
    details: `${item.category || 'Seller item'} • ${item.prepTime || item.description || 'Ready to order'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/fast-food',
    marketName: t('markets.fastFood'),
    details: `${item.category || 'Seller item'} • ${item.prepTime || item.description || 'Ready to order'}`,
  });

  return (
  <PageFrame
    title={t('markets.fastFood')}
    subtitle={t('pageSubtitles.fastFood')}
  >
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.orderNow')}
      secondaryButtonLabel={t('common.viewMeal')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/fast-food', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.fastFood'),
          details: `${item.category || 'Seller item'} • ${item.prepTime || item.description || 'Ready to order'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/fast-food', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.prepTime || 'Ready to order'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const BeveragesLiquorsPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'beverages'), ...beveragesLiquorItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/beverages-liquors',
    marketName: t('markets.beverages'),
    details: `${item.category || 'Seller item'} • ${item.volume || item.description || item.sellerName || 'Marketplace listing'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/beverages-liquors',
    marketName: t('markets.beverages'),
    details: `${item.category || 'Seller item'} • ${item.volume || item.description || item.sellerName || 'Marketplace listing'}`,
  });

  return (
  <PageFrame
    title={t('markets.beverages')}
    subtitle={t('pageSubtitles.beverages')}
  >
    <div className="mb-5 rounded-xl border border-[#f59e0b] bg-[#fffbeb] p-3 text-sm text-[#92400e]">
      18+ age verification applies to liquor purchases.
    </div>

    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/beverages-liquors', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.beverages'),
          details: `${item.category || 'Seller item'} • ${item.volume || item.description || item.sellerName || 'Marketplace listing'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/beverages-liquors', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.volume || item.sellerName || 'Marketplace listing'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const WellnessPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'wellness'), ...wellnessItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/wellness',
    marketName: t('markets.wellness'),
    details: item.description || item.sellerName,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/wellness',
    marketName: t('markets.wellness'),
    details: item.description || item.sellerName,
  });

  return (
  <PageFrame title={t('markets.wellness')} subtitle={t('pageSubtitles.wellness')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.add')}
      secondaryButtonLabel={t('common.uploadPrescription')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/wellness', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.wellness'),
          details: item.description || item.sellerName,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/wellness', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} />{item.sellerName ? ` • ${item.sellerName}` : ''}</p>}
    />
  </PageFrame>
  );
};

const TraditionalMedicinesPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'traditionalMedicines'), ...traditionalMedicinesItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/traditional-medicines-herbs',
    marketName: t('markets.traditionalMedicines'),
    details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Traditional herbal listing'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/traditional-medicines-herbs',
    marketName: t('markets.traditionalMedicines'),
    details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Traditional herbal listing'}`,
  });

  return (
  <PageFrame title={t('markets.traditionalMedicines')} subtitle={t('pageSubtitles.traditionalMedicines')}>
    <div className="mb-5 rounded-xl border border-[#d6c8a3] bg-[#fff9ec] p-3 text-sm text-[#7b5b12]">
      Traditional remedies should be used responsibly. Buyers should follow local guidance and consult qualified practitioners when needed.
    </div>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/traditional-medicines-herbs', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.traditionalMedicines'),
          details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Traditional herbal listing'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/traditional-medicines-herbs', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const StationeryPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'stationery'), ...stationeryItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/stationery-office',
    marketName: t('markets.stationery'),
    details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Ready for school and office use'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/stationery-office',
    marketName: t('markets.stationery'),
    details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Ready for school and office use'}`,
  });

  return (
  <PageFrame title={t('markets.stationery')} subtitle={t('pageSubtitles.stationery')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/stationery-office', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.stationery'),
          details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Ready for school and office use'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/stationery-office', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const ConstructionToolsPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'constructionTools'), ...constructionToolsItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/building-construction-tools',
    marketName: t('markets.constructionTools'),
    details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Construction-ready listing'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/building-construction-tools',
    marketName: t('markets.constructionTools'),
    details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Construction-ready listing'}`,
  });

  return (
  <PageFrame title={t('markets.constructionTools')} subtitle={t('pageSubtitles.constructionTools')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/building-construction-tools', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.constructionTools'),
          details: `${item.category || 'Seller item'} • ${item.description || item.sellerName || 'Construction-ready listing'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/building-construction-tools', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const HomeCarePage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.homeCare')} subtitle={t('pageSubtitles.homeCare')}>
    <div className="mb-5 grid gap-2 sm:grid-cols-3">
      <input type="search" placeholder="Search providers" className="rounded-md border border-[#b2ebf2] bg-white px-3 py-2 text-sm" aria-label="Search providers" />
      <input type="search" placeholder="Location" className="rounded-md border border-[#b2ebf2] bg-white px-3 py-2 text-sm" aria-label="Filter location" />
      <div className="relative">
        <select className={`${languageFeatureSelectClassName} pr-10`} aria-label="Filter service type">
          <option>All Types</option>
          <option>Plumbing</option>
          <option>Electrical</option>
          <option>Cleaning</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {homeCareProviders.map((provider) => (
        <article key={provider.id} className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-lg font-bold">{provider.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{provider.type} • {provider.city}</p>
          <p className="mt-2 flex items-center gap-1 text-sm text-slate-700"><Star className="h-4 w-4 text-amber-500" /> {provider.rating}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white`}>{t('common.bookNow')}</button>
            <button type="button" className="rounded-md border border-[#b2ebf2] px-3 py-2 text-sm font-semibold">{t('common.chatWithProvider')}</button>
          </div>
        </article>
      ))}
    </div>
  </PageFrame>
  );
};

const HardwareSoftwarePage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'hardwareSoftware'), ...techItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/hardware-software',
    marketName: t('markets.hardwareSoftware'),
    details: item.description || item.subtitle || item.sellerName,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/hardware-software',
    marketName: t('markets.hardwareSoftware'),
    details: item.description || item.subtitle || item.sellerName,
  });

  return (
  <PageFrame title={t('markets.hardwareSoftware')} subtitle={t('pageSubtitles.hardwareSoftware')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewMore')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/hardware-software', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.hardwareSoftware'),
          details: item.description || item.subtitle || item.sellerName,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/hardware-software', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} />{item.sellerName ? ` • ${item.sellerName}` : ''}</p>}
    />
  </PageFrame>
  );
};

const MobilityVehiclesPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'mobilityVehicles'), ...mobilityVehiclesItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/mobility-vehicles',
    marketName: t('markets.mobilityVehicles'),
    details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Transport listing'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/mobility-vehicles',
    marketName: t('markets.mobilityVehicles'),
    details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Transport listing'}`,
  });

  return (
  <PageFrame title={t('markets.mobilityVehicles')} subtitle={t('pageSubtitles.mobilityVehicles')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/mobility-vehicles', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.mobilityVehicles'),
          details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Transport listing'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/mobility-vehicles', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.specification || item.sellerName || 'Transport listing'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const FashionStylePage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'fashionStyle'), ...fashionStyleItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/fashion-style',
    marketName: t('markets.fashionStyle'),
    details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Style listing'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/fashion-style',
    marketName: t('markets.fashionStyle'),
    details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Style listing'}`,
  });

  return (
  <PageFrame title={t('markets.fashionStyle')} subtitle={t('pageSubtitles.fashionStyle')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/fashion-style', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.fashionStyle'),
          details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Style listing'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/fashion-style', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.specification || item.sellerName || 'Style listing'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const NaturalResourcesPage = ({ onAddToCart, onBuyNow, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails, productReviewSummaryMap = {} }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'naturalResources'), ...naturalResourcesItems], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/natural-resources-minerals',
    marketName: t('markets.naturalResources'),
    details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Resource listing'}`,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/natural-resources-minerals',
    marketName: t('markets.naturalResources'),
    details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Resource listing'}`,
  });

  return (
  <PageFrame title={t('markets.naturalResources')} subtitle={t('pageSubtitles.naturalResources')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewDetails')}
      reviewSummaryMap={productReviewSummaryMap}
      getItemReviewKey={(item) => getCollectionItemId('/natural-resources-minerals', item.id)}
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
      onBuyNowAction={(item) => onBuyNow?.(buildCartItem(item))}
      onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
      onOpenItemDetails={(item) => {
        const wishlistItem = buildWishlistItem(item);
        onOpenItemDetails?.({
          title: getTranslatedValue(t, item.titleKey, item.title),
          image: item.image,
          images: item.images || (item.image ? [item.image] : []),
          marketName: t('markets.naturalResources'),
          details: `${item.category || 'Seller item'} • ${item.specification || item.description || item.sellerName || 'Resource listing'}`,
          priceLabel: getSalePrices(item.price).nowPrice,
          cartItem: buildCartItem(item),
          wishlistItem,
        });
      }}
      isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/natural-resources-minerals', item.id))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.specification || item.sellerName || 'Resource listing'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const MARKET_BADGE_COLORS = {
  ecommerce: 'bg-blue-100 text-blue-700',
  groceries: 'bg-green-100 text-green-700',
  fastFood: 'bg-orange-100 text-orange-700',
  beverages: 'bg-purple-100 text-purple-700',
  constructionTools: 'bg-yellow-100 text-yellow-800',
  fashionStyle: 'bg-rose-100 text-rose-700',
  mobilityVehicles: 'bg-sky-100 text-sky-700',
  naturalResources: 'bg-lime-100 text-lime-700',
  traditionalMedicines: 'bg-emerald-100 text-emerald-700',
  wellness: 'bg-teal-100 text-teal-700',
  stationery: 'bg-amber-100 text-amber-700',
  hardwareSoftware: 'bg-slate-100 text-slate-700',
};

const SellerDashboardPage = ({ orders = [], onDeleteSellerItem, onUpdateSellerItem, onUpdateOrderStatus, initialView = 'listings' }) => {
  const { t } = useTranslation();
  const isAuthenticated = getAuthState();
  const userEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));
  const isOrdersView = initialView === 'orders';

  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(() => createSellerListingFormState());
  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [editImagePreviewUrls, setEditImagePreviewUrls] = useState([]);
  const [editMessage, setEditMessage] = useState('');
  const [editMessageType, setEditMessageType] = useState('idle');
  const [listActionMessage, setListActionMessage] = useState('');
  const [listActionMessageType, setListActionMessageType] = useState('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [hasLoadedSellerOrders, setHasLoadedSellerOrders] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orderLoadError, setOrderLoadError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [orderUpdateError, setOrderUpdateError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !hasSupabaseEnv || !supabase) return;

    const fetchMyListings = async () => {
      setIsLoading(true);
      setLoadError('');

      const { data, error } = await supabase
        .from(SELLER_ITEMS_TABLE)
        .select('*')
        .eq('seller_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        setLoadError('Could not load your listings. Check your connection and try again.');
      } else {
        setMyListings((data || []).map(mapSellerItemRecord));
      }

      setIsLoading(false);
    };

    fetchMyListings();
  }, [isAuthenticated, userEmail]);

  useEffect(() => {
    if (!isAuthenticated || !hasSupabaseEnv || !supabase || myListings.length === 0) {
      setSellerOrders(orders || []);
      setHasLoadedSellerOrders(true);
      setIsLoadingOrders(false);
      return;
    }

    let isCancelled = false;

    const fetchSellerOrders = async () => {
      setIsLoadingOrders(true);
      setOrderLoadError('');

      const { data, error } = await supabase
        .from(ORDERS_TABLE)
        .select('user_email, order_key, reference, order_created_at, customer, items, payment_method, payment_provider, payment_status, payment_reference, currency, subtotal, service_fee, total, status')
        .order('order_created_at', { ascending: false });

      if (isCancelled) {
        return;
      }

      if (error) {
        setOrderLoadError('');
        setSellerOrders([]);
      } else {
        setSellerOrders((data || []).map(mapOrderRecord));
      }

      setHasLoadedSellerOrders(true);
      setIsLoadingOrders(false);
    };

    fetchSellerOrders();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, myListings.length, orders, userEmail]);

  useEffect(() => {
    if (!editImageFiles.length) {
      setEditImagePreviewUrls([]);
      return;
    }
    const nextUrls = editImageFiles.map((file) => URL.createObjectURL(file));
    setEditImagePreviewUrls(nextUrls);
    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [editImageFiles]);

  const handleEditImagePick = (event) => {
    const pickedFiles = Array.from(event.target.files || []);
    if (!pickedFiles.length) return;
    setEditImageFiles((current) => [...current, ...pickedFiles]);
    event.target.value = '';
  };

  const handleRemoveEditImage = (indexToRemove) => {
    setEditImageFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleRemoveExistingEditImage = (imageUrlToRemove) => {
    setEditExistingImages((current) => current.filter((imageUrl) => imageUrl !== imageUrlToRemove));
  };

  const handleEditMarketChange = (marketKey) => {
    setEditForm((current) => (
      marketKey === 'groceries'
        ? { ...current, marketKey }
        : clearGroceriesListingFields({ ...current, marketKey })
    ));
  };

  const openEdit = (item) => {
    const existingImages = Array.isArray(item.images) && item.images.length
      ? item.images.filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim())
      : (item.image ? [item.image] : []);

    setConfirmDeleteId(null);
    setListActionMessage('');
    setListActionMessageType('idle');
    setEditingId(item.dbId);
    setEditForm({
      title: item.title,
      description: item.description,
      price: item.price,
      quantity: String(normalizeListingQuantity(item.availableQuantity, 0)),
      marketKey: item.marketKey,
      categoryKey: item.categoryKey || '',
      brand: item.brand || '',
      volume: item.volume || '',
      freshness: item.freshness || '',
      storage: item.storage || '',
      origin: item.origin || '',
      expiryDate: item.expiryDate || '',
      discount: item.discount || '',
    });
    setEditExistingImages(existingImages);
    setEditImageFiles([]);
    setEditMessage('');
    setEditMessageType('idle');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(createSellerListingFormState());
    setEditExistingImages([]);
    setEditImageFiles([]);
    setEditMessage('');
    setEditMessageType('idle');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveEdit = async (item) => {
    setIsSaving(true);
    setEditMessage('');
    setEditMessageType('idle');
    setListActionMessage('');
    setListActionMessageType('idle');

    const normalizedQuantity = normalizeListingQuantity(editForm.quantity, NaN);

    if (!Number.isFinite(normalizedQuantity)) {
      setEditMessage('Enter a valid stock quantity using whole numbers (0 or more).');
      setEditMessageType('error');
      setIsSaving(false);
      return;
    }

    const groceriesValidationMessage = getGroceriesListingValidationMessage(editForm);

    if (groceriesValidationMessage) {
      setEditMessage(groceriesValidationMessage);
      setEditMessageType('error');
      setIsSaving(false);
      return;
    }

    const retainedImageUrls = editExistingImages.filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim());

    if (!retainedImageUrls.length && !editImageFiles.length) {
      setEditMessage('Keep at least one current image or add a new one before saving this listing.');
      setEditMessageType('error');
      setIsSaving(false);
      return;
    }

    const result = await onUpdateSellerItem(
      item.dbId,
      {
        title: editForm.title,
        description: editForm.description,
        price: editForm.price,
        quantity: normalizedQuantity,
        marketKey: editForm.marketKey,
        detailsJson: buildSellerItemDetailsJson(editForm),
        previousImageUrl: item.image,
        previousImageUrls: item.images || [],
        imageUrls: retainedImageUrls,
      },
      editImageFiles,
    );

    if (result.error) {
      setEditMessage(`Failed to save changes: ${result.error}`);
      setEditMessageType('error');
      setIsSaving(false);
      return;
    }

    setMyListings((current) =>
      current.map((listing) => (listing.dbId === item.dbId ? mapSellerItemRecord(result.data) : listing)),
    );
    setListActionMessage('Listing updated successfully.');
    setListActionMessageType('success');
    cancelEdit();
    setIsSaving(false);
  };

  const handleDelete = async (item) => {
    setListActionMessage('');
    setListActionMessageType('idle');
    setDeletingId(item.dbId);
    const result = await onDeleteSellerItem(item.dbId, item.images || [], item.image);

    if (result?.error) {
      setListActionMessage(`Failed to remove listing: ${result.error}`);
      setListActionMessageType('error');
      setDeletingId(null);
      return;
    }

    setMyListings((current) => current.filter((listing) => listing.dbId !== item.dbId));
    setListActionMessage('Listing removed from your store.');
    setListActionMessageType('success');
    setConfirmDeleteId(null);
    setDeletingId(null);
  };

  const myListingIds = useMemo(() => new Set(myListings.map((listing) => listing.id)), [myListings]);

  const visibleOrders = useMemo(() => {
    const sourceOrders = hasLoadedSellerOrders ? sellerOrders : orders;

    return sourceOrders.reduce((accumulator, order) => {
      const sellerLineItems = (order.items || []).filter((lineItem) => doesLineItemBelongToSeller(lineItem, userEmail, myListingIds));

      if (!sellerLineItems.length) {
        return accumulator;
      }

      const sellerSubtotal = sellerLineItems.reduce((total, lineItem) => {
        const price = Number(lineItem.unitPrice) || 0;
        const quantity = Math.max(Number(lineItem.quantity) || 1, 1);
        return total + (price * quantity);
      }, 0);

      accumulator.push({
        ...order,
        sellerLineItems,
        sellerSubtotal,
      });

      return accumulator;
    }, []);
  }, [hasLoadedSellerOrders, myListingIds, orders, sellerOrders, userEmail]);

  const totalStockUnits = useMemo(
    () => myListings.reduce((total, listing) => total + normalizeListingQuantity(listing.availableQuantity, 0), 0),
    [myListings],
  );

  const lowStockListingsCount = useMemo(
    () => myListings.filter((listing) => normalizeListingQuantity(listing.availableQuantity, 0) > 0 && normalizeListingQuantity(listing.availableQuantity, 0) <= 3).length,
    [myListings],
  );

  const activeOrdersCount = useMemo(
    () => visibleOrders.filter((order) => !['Delivered', 'Cancelled by Buyer', 'Refund Made'].includes(order.status)).length,
    [visibleOrders],
  );

  const deliveredOrdersCount = useMemo(
    () => visibleOrders.filter((order) => order.status === 'Delivered').length,
    [visibleOrders],
  );

  const handleOrderStatusUpdate = async (orderId, nextStatus) => {
    if (!onUpdateOrderStatus) {
      return;
    }

    setOrderUpdateError('');
    setUpdatingOrderId(orderId);

    const result = await onUpdateOrderStatus(orderId, nextStatus);

    if (result?.error) {
      setOrderUpdateError(result.error);
      setUpdatingOrderId('');
      return;
    }

    setSellerOrders((currentOrders) => currentOrders.map((order) => (
      order.id === orderId
        ? { ...order, status: nextStatus }
        : order
    )));

    setUpdatingOrderId('');
  };

  if (!isAuthenticated) {
    return (
      <PageFrame title={isOrdersView ? 'Seller Orders' : 'My Store'} subtitle={isOrdersView ? 'Sign in to manage orders containing your listings.' : 'Sign in to manage your product listings.'}>
        <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-6 text-sm text-[var(--svs-text)]">
          <p className="mb-4">You need to be signed in to view and manage your seller account.</p>
          <Link to="/signin" className={`${cudyBluePrimaryButtonClassName} inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
            Sign In
          </Link>
        </div>
      </PageFrame>
    );
  }

  const uniqueMarketCount = new Set(myListings.map((item) => item.marketKey)).size;
  const listingsSummary = isLoading
    ? 'Loading your listings…'
    : myListings.length === 0
      ? 'No listings yet. Add your first product to get started.'
      : `${myListings.length} listing${myListings.length !== 1 ? 's' : ''} across ${uniqueMarketCount} market${uniqueMarketCount !== 1 ? 's' : ''}`;
  const inventorySummary = myListings.length === 0
    ? 'Your inventory summary will appear here after your first upload.'
    : lowStockListingsCount > 0
      ? `${lowStockListingsCount} listing${lowStockListingsCount !== 1 ? 's are' : ' is'} running low on stock.`
      : 'All current listings have healthy stock levels.';

  return (
    <PageFrame
      title={isOrdersView ? 'Seller Orders' : 'My Store'}
      subtitle={isOrdersView ? 'Track orders containing your listings and update fulfillment status.' : 'View, edit, and remove your product listings across all markets.'}
    >
      <section className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_320px]">
        <div className="rounded-3xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:p-6">
          <span className="inline-flex rounded-full bg-[var(--svs-cyan-surface)] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--svs-primary-strong)]">
            {isOrdersView ? 'Seller Orders' : 'Store Dashboard'}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-[var(--svs-text)]">
            {isOrdersView ? 'Keep fulfillment moving.' : 'Everything in your store, in one place.'}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--svs-muted)] sm:text-base">
            {isOrdersView
              ? 'Review order volume, update statuses, and monitor buyer activity without digging through listing cards.'
              : 'Track inventory, update product details, and jump into order activity through clearly separated sections.'}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Listings" value={String(myListings.length)} />
            <KpiCard label="Markets" value={String(uniqueMarketCount)} />
            <KpiCard label={isOrdersView ? 'Active Orders' : 'Units in Stock'} value={String(isOrdersView ? activeOrdersCount : totalStockUnits)} />
            <KpiCard label={isOrdersView ? 'Delivered' : 'Low Stock'} value={String(isOrdersView ? deliveredOrdersCount : lowStockListingsCount)} />
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="text-base font-bold text-[var(--svs-text)]">Quick Actions</h3>
          <p className="mt-1 text-sm text-[var(--svs-muted)]">
            {isOrdersView ? 'Move between order operations and store maintenance.' : 'Open the next task without scrolling through the page.'}
          </p>
          <div className="mt-4 space-y-2.5">
            {!isOrdersView ? (
              <Link
                to="/seller/upload"
                className={`${cudyBluePrimaryButtonClassName} inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-semibold text-white`}
              >
                <Plus className="h-4 w-4" /> Add New Listing
              </Link>
            ) : null}
            <Link
              to={isOrdersView ? '/seller/dashboard' : '/seller/orders'}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
            >
              {isOrdersView ? 'Back to Listings' : 'Open Orders View'}
            </Link>
            <Link
              to="/markets"
              className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
            >
              Switch to Buyer View
            </Link>
          </div>
        </aside>
      </section>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-1 text-sm font-semibold">
          <Link
            to="/seller/dashboard"
            className={`rounded-lg px-4 py-2 transition ${!isOrdersView ? 'bg-[var(--svs-primary)] text-white' : 'text-[var(--svs-text)] hover:text-[var(--svs-primary)]'}`}
          >
            Listings
          </Link>
          <Link
            to="/seller/orders"
            className={`rounded-lg px-4 py-2 transition ${isOrdersView ? 'bg-[var(--svs-primary)] text-white' : 'text-[var(--svs-text)] hover:text-[var(--svs-primary)]'}`}
          >
            Orders
          </Link>
        </div>
        <p className="text-sm text-[var(--svs-muted)]">
          {isOrdersView
            ? `${visibleOrders.length} order${visibleOrders.length !== 1 ? 's' : ''} containing your listings`
            : listingsSummary}
        </p>
      </div>

      {!isOrdersView ? (
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-bold text-[var(--svs-text)]">Store Snapshot</h2>
              <p className="mt-1 text-sm text-[var(--svs-muted)]">A quick inventory check before you edit listings.</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--svs-text)]">
                <div className="rounded-xl bg-[var(--svs-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--svs-muted)]">Inventory Health</p>
                  <p className="mt-1 font-semibold text-[var(--svs-text)]">{inventorySummary}</p>
                </div>
                <div className="rounded-xl bg-[var(--svs-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--svs-muted)]">Orders Waiting</p>
                  <p className="mt-1 font-semibold text-[var(--svs-text)]">
                    {activeOrdersCount > 0
                      ? `${activeOrdersCount} active order${activeOrdersCount !== 1 ? 's' : ''} need attention.`
                      : 'No active seller orders right now.'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h2 className="text-lg font-bold text-[var(--svs-text)]">Next Best Step</h2>
              <p className="mt-1 text-sm text-[var(--svs-muted)]">
                {myListings.length === 0
                  ? 'Publish your first listing so it can appear in the marketplace.'
                  : lowStockListingsCount > 0
                    ? 'Restock low inventory items or adjust quantities before they run out.'
                    : 'Review product details and pricing to keep your store current.'}
              </p>
            </section>
          </aside>

          <section className="rounded-3xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--svs-text)]">Listings</h2>
                <p className="text-sm text-[var(--svs-muted)]">Manage every published item from one ordered workspace.</p>
              </div>
              <Link
                to="/seller/upload"
                className={`${cudyBluePrimaryButtonClassName} inline-flex items-center gap-2 rounded-lg bg-[var(--svs-primary)] px-4 py-2.5 text-sm font-semibold text-white`}
              >
                <Plus className="h-4 w-4" /> Add New Listing
              </Link>
            </div>

            {listActionMessage ? (
              <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${listActionMessageType === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {listActionMessage}
              </div>
            ) : null}

            {loadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div>
            ) : isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-72 animate-pulse rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)]" />
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-[var(--svs-border)] bg-[var(--svs-surface-soft)] py-16 text-center">
                <p className="text-base font-semibold text-[var(--svs-text)]">Your store is empty</p>
                <p className="mt-1 text-sm text-[var(--svs-muted)]">Start by adding your first product listing.</p>
                <Link
                  to="/seller/upload"
                  className={`${cudyBluePrimaryButtonClassName} mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--svs-primary)] px-5 py-3 text-sm font-semibold text-white`}
                >
                  <Plus className="h-4 w-4" /> Add New Listing
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                {myListings.map((item) => (
                  <article key={item.dbId} className="overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                    <div className="relative h-48 overflow-hidden bg-[var(--svs-surface-soft)]">
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${MARKET_BADGE_COLORS[item.marketKey] || 'bg-slate-100 text-slate-700'}`}>
                        {t(sellerMarketConfig[item.marketKey]?.labelKey || '')}
                      </span>
                      <button
                        type="button"
                        onClick={() => (editingId === item.dbId ? cancelEdit() : openEdit(item))}
                        className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[var(--svs-primary-strong)] shadow-sm transition hover:bg-white"
                      >
                        {editingId === item.dbId ? 'Close' : 'Edit'}
                      </button>
                    </div>

                    <div className="flex h-full flex-col p-4">
                      <h3 className="text-base font-bold leading-tight text-[var(--svs-text)]">{item.title}</h3>
                      <p className="mt-0.5 text-sm font-semibold text-[var(--svs-primary-strong)]"><SalePrice price={item.price} /></p>
                      <p className="mt-1 text-xs text-[var(--svs-muted)]">
                        Quantity in stock: {normalizeListingQuantity(item.availableQuantity, 0)}
                        {normalizeListingQuantity(item.availableQuantity, 0) === 0 ? ' (Out of stock - buyers can only wishlist this item).' : ''}
                      </p>
                      {item.description ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-[var(--svs-muted)]">{item.description}</p>
                      ) : null}

                      {editingId === item.dbId ? (
                        <div className="mt-4 space-y-3 border-t border-[var(--svs-border)] pt-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Product Name</label>
                            <input name="title" value={editForm.title} onChange={handleEditChange} className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Price</label>
                              <input name="price" value={editForm.price} onChange={handleEditChange} placeholder="e.g. 29.99" className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Quantity</label>
                              <input
                                name="quantity"
                                type="number"
                                min="0"
                                step="1"
                                value={editForm.quantity}
                                onChange={handleEditChange}
                                placeholder="e.g. 25"
                                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
                              />
                              <p className="mt-1 text-[10px] text-[var(--svs-muted)]">This is how many units are available for checkout.</p>
                            </div>
                            <div className="col-span-2">
                              <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Market</label>
                              <MarketSelectorField
                                id={`edit-market-${item.dbId}`}
                                value={editForm.marketKey}
                                onChange={handleEditMarketChange}
                                ariaLabel="Edit listing market"
                              />
                            </div>
                          </div>
                          {editForm.marketKey === 'groceries' ? (
                            <GroceriesSellerFields
                              formData={editForm}
                              onFieldChange={handleEditChange}
                              prefix={`edit-grocery-${item.dbId}`}
                              isCompact
                            />
                          ) : null}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Description</label>
                            <textarea name="description" value={editForm.description} onChange={handleEditChange} rows={3} className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Listing Images</label>
                            {editExistingImages.length ? (
                              <div className="mb-3 grid grid-cols-2 gap-2">
                                {editExistingImages.map((imageUrl, index) => (
                                  <div key={`${imageUrl}-${index}`} className="relative overflow-hidden rounded-md border border-[var(--svs-border)] bg-white">
                                    <img
                                      src={imageUrl}
                                      alt={`${item.title} ${index + 1}`}
                                      className="h-24 w-full object-cover"
                                      loading="lazy"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExistingEditImage(imageUrl)}
                                      className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mb-2 text-xs text-[var(--svs-muted)]">No current images will be kept unless you add new ones below.</p>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleEditImagePick}
                              className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-xs text-[var(--svs-text)] outline-none"
                            />
                            <p className="mt-1 text-xs text-[var(--svs-muted)]">Add more images here. You can remove current images above or remove pending uploads before saving.</p>
                            {editImageFiles.length ? (
                              <div className="mt-2 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-2 text-xs text-[var(--svs-muted)]">
                                <p className="font-semibold text-[var(--svs-text)]">{editImageFiles.length} new image{editImageFiles.length === 1 ? '' : 's'} selected</p>
                                <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto pr-1">
                                  {editImageFiles.map((file, index) => (
                                    <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2">
                                      <span className="truncate">{file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditImage(index)}
                                        className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                                      >
                                        Remove
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                                {editImagePreviewUrls.length ? (
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {editImagePreviewUrls.map((previewUrl, index) => (
                                      <div key={`${previewUrl}-${index}`} className="relative overflow-hidden rounded-md border border-[var(--svs-border)] bg-white">
                                        <img
                                          src={previewUrl}
                                          alt={`Selected preview ${index + 1}`}
                                          className="h-24 w-full object-cover"
                                          loading="lazy"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveEditImage(index)}
                                          className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                                        >
                                          x
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          {editMessage ? (
                            <div className={`rounded-lg px-3 py-2 text-xs ${editMessageType === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                              {editMessage}
                            </div>
                          ) : null}
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleSaveEdit(item)} disabled={isSaving} className={`${cudyBluePrimaryButtonClassName} flex-1 rounded-lg bg-[var(--svs-primary)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60`}>
                              {isSaving ? 'Saving\u2026' : 'Save Changes'}
                            </button>
                            <button type="button" onClick={cancelEdit} disabled={isSaving} className="rounded-lg border border-[var(--svs-border)] px-3 py-2.5 text-sm font-semibold text-[var(--svs-text)]">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto flex gap-2 pt-4">
                          {confirmDeleteId === item.dbId ? (
                            <>
                              <span className="flex-1 self-center text-xs text-[var(--svs-muted)]">Remove this listing?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={deletingId === item.dbId}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                              >
                                {deletingId === item.dbId ? 'Removing\u2026' : 'Yes, Remove'}
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg border border-[var(--svs-border)] px-3 py-2 text-xs font-semibold text-[var(--svs-text)]">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.dbId)}
                              className="ml-auto rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      <section className={`${isOrdersView ? 'mt-0' : 'mt-6'} space-y-4 rounded-3xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--svs-text)]">Order Management</h2>
            <p className="text-sm text-[var(--svs-muted)]">
              {isOrdersView
                ? 'Review every order containing your products and keep fulfillment statuses current.'
                : 'Track orders containing your listings and update fulfillment, shipping, and refund status.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--svs-text)]">
              {visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'}
            </span>
            {!isOrdersView ? (
              <Link
                to="/seller/orders"
                className="rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]"
              >
                View Full Orders Page
              </Link>
            ) : null}
          </div>
        </div>

        {orderUpdateError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{orderUpdateError}</div>
        ) : null}

        {orderLoadError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{orderLoadError}</div>
        ) : isLoadingOrders ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((placeholder) => (
              <div key={placeholder} className="h-36 animate-pulse rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)]" />
            ))}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-8 text-center text-sm text-[var(--svs-muted)]">
            Orders with your listings will show here.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((order) => (
              <article key={order.id} className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--svs-muted)]">Order</p>
                    <p className="text-sm font-bold text-[var(--svs-text)]">{order.reference || order.id}</p>
                    <p className="text-xs text-[var(--svs-muted)]">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-[var(--svs-muted)]">
                  <p>Customer: {order.customer?.fullName || order.customer?.email || 'Guest customer'}</p>
                  {order.customer?.email ? <p>Email: {order.customer.email}</p> : null}
                  {order.customer?.phone ? <p>Phone: {order.customer.phone}</p> : null}
                  <p>Items from your store: {order.sellerLineItems.reduce((count, lineItem) => count + (Number(lineItem.quantity) || 1), 0)}</p>
                  <p>Your subtotal: {formatCheckoutAmount(order.sellerSubtotal)}</p>
                </div>

                <div className="mt-3 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--svs-muted)]">Your items in this order</p>
                  <div className="mt-2 space-y-2">
                    {order.sellerLineItems.map((lineItem, index) => {
                      const quantity = Math.max(Number(lineItem.quantity) || 1, 1);
                      const linePrice = (Number(lineItem.unitPrice) || 0) * quantity;

                      return (
                        <div key={`${order.id}-${lineItem.id || lineItem.sku || index}`} className="flex items-start justify-between gap-3 text-xs text-[var(--svs-text)]">
                          <div>
                            <p className="font-semibold text-[var(--svs-text)]">{lineItem.title || 'Untitled item'}</p>
                            <p className="text-[var(--svs-muted)]">Qty: {quantity}</p>
                          </div>
                          <p className="font-semibold text-[var(--svs-primary-strong)]">{formatCheckoutAmount(linePrice)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor={`order-status-${order.id}`} className="text-xs font-semibold text-[var(--svs-text)]">Status</label>
                  <select
                    id={`order-status-${order.id}`}
                    value={order.status || ORDER_STATUS_FLOW[0]}
                    onChange={(event) => handleOrderStatusUpdate(order.id, event.target.value)}
                    disabled={updatingOrderId === order.id}
                    className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--svs-text)]"
                  >
                    {getSellerStatusOptions(order.status).map((status) => (
                      <option key={`${order.id}-${status}`} value={status}>{status}</option>
                    ))}
                  </select>
                  {updatingOrderId === order.id ? (
                    <span className="text-xs text-[var(--svs-muted)]">Updating...</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageFrame>
  );
};

const SellerUploadPage = ({ onSellerItemCreated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => createSellerListingFormState());
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('idle');
  const isAuthenticated = getAuthState();
  const userEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));
  const userName = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-name') || 'SVS Seller');

  useEffect(() => {
    if (!imageFiles.length) {
      setImagePreviewUrls([]);
      return;
    }

    const nextUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleMarketChange = (marketKey) => {
    setFormData((current) => (
      marketKey === 'groceries'
        ? { ...current, marketKey }
        : clearGroceriesListingFields({ ...current, marketKey })
    ));
  };

  const handleImagePick = (event) => {
    const pickedFiles = Array.from(event.target.files || []);

    if (!pickedFiles.length) {
      return;
    }

    setImageFiles((current) => [...current, ...pickedFiles]);
    event.target.value = '';
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setImageFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedTitle = formData.title.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedPrice = formData.price.trim();
    const normalizedQuantity = normalizeListingQuantity(formData.quantity, NaN);

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (!trimmedTitle || !trimmedDescription || !trimmedPrice || !formData.marketKey || !formData.quantity) {
      setMessage('Fill in all required fields and select a market before publishing your listing.');
      setMessageType('error');
      return;
    }

    if (!Number.isFinite(normalizedQuantity)) {
      setMessage('Enter a valid quantity in whole numbers (0 or more).');
      setMessageType('error');
      return;
    }

    const groceriesValidationMessage = getGroceriesListingValidationMessage(formData);

    if (groceriesValidationMessage) {
      setMessage(groceriesValidationMessage);
      setMessageType('error');
      return;
    }

    if (!hasSupabaseEnv || !supabase) {
      setMessage('Supabase is not configured. Add the environment values first so seller uploads can be stored.');
      setMessageType('error');
      return;
    }

    if (!imageFiles.length) {
      setMessage('Select at least one image before uploading your item.');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType('idle');

    const selectedMarket = sellerMarketConfig[formData.marketKey];

    if (!selectedMarket) {
      setMessage('Select a valid market before publishing your listing.');
      setMessageType('error');
      return;
    }

    const uploadedImageUrls = [];

    for (const imageFile of imageFiles) {
      const fileExtension = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;
      const filePath = `${sanitizeStorageSegment(userEmail)}/${formData.marketKey}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(SELLER_IMAGES_BUCKET)
        .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setMessage(`Image upload failed: ${uploadError.message}. Make sure the ${SELLER_IMAGES_BUCKET} bucket exists and allows uploads.`);
        setMessageType('error');
        setIsSubmitting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(SELLER_IMAGES_BUCKET).getPublicUrl(filePath);
      uploadedImageUrls.push(publicUrlData.publicUrl);
    }

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .insert({
        seller_email: userEmail,
        seller_name: userName,
        title: trimmedTitle,
        description: trimmedDescription,
        quantity: normalizedQuantity,
        price: trimmedPrice,
        market_key: formData.marketKey,
        details_json: buildSellerItemDetailsJson(formData),
        image_url: uploadedImageUrls[0],
        image_urls: uploadedImageUrls,
      })
      .select('*')
      .single();

    if (error) {
      setMessage(getMarketplaceItemSaveErrorMessage(error.message));
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    onSellerItemCreated(mapSellerItemRecord(data));
    setMessage(`Item uploaded successfully to ${t(selectedMarket.labelKey)}.`);
    setMessageType('success');
    setFormData(createSellerListingFormState());
    setImageFiles([]);
    setIsSubmitting(false);

    setTimeout(() => {
      navigate(selectedMarket.route);
    }, 700);
  };

  return (
    <PageFrame title="List a New Product" subtitle="Fill in the product details below. Once listed, the item will appear in your chosen market and remain stored across sessions.">
      <div className="mb-5">
        <Link to="/seller/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--svs-primary)] hover:underline">
          <ChevronLeft className="h-4 w-4" /> Back to My Store
        </Link>
      </div>
      {!isAuthenticated ? (
        <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-5 text-sm text-[var(--svs-text)]">
          <p>Sign in first to list products for sale.</p>
          <Link to="/signin" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
            Sign In
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="seller-title" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Item title</label>
                <input id="seller-title" name="title" value={formData.title} onChange={handleChange} required className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none" />
              </div>
              <div>
                <label htmlFor="seller-price" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Price</label>
                <input id="seller-price" name="price" value={formData.price} onChange={handleChange} required placeholder="129.99" className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none" />
              </div>
              <div>
                <label htmlFor="seller-quantity" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Quantity</label>
                <input
                  id="seller-quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  placeholder="20"
                  className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none"
                />
                <p className="mt-1 text-xs text-[var(--svs-muted)]">Quantity means how many units buyers can still checkout. When it reaches 0, Add to Cart is disabled and buyers can wishlist only.</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seller-market" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Market</label>
                <MarketSelectorField
                  id="seller-market"
                  value={formData.marketKey}
                  onChange={handleMarketChange}
                  placeholder="Select Market"
                  ariaLabel="Select listing market"
                />
              </div>
              {formData.marketKey === 'groceries' ? (
                <GroceriesSellerFields formData={formData} onFieldChange={handleChange} prefix="seller-grocery" />
              ) : null}
              <div className="sm:col-span-2">
                <label htmlFor="seller-description" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Description</label>
                <textarea id="seller-description" name="description" value={formData.description} onChange={handleChange} rows={4} required placeholder="Short details that should appear with the product in its market." className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seller-image" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Product images</label>
                <input
                  id="seller-image"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagePick}
                  className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none"
                />
                <p className="mt-1 text-xs text-[var(--svs-muted)]">Tap to add an image. On mobile, add images one by one. On desktop, you can also pick multiple at once.</p>
                {imageFiles.length ? (
                  <div className="mt-2 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-2 text-xs text-[var(--svs-muted)]">
                    <p className="font-semibold text-[var(--svs-text)]">{imageFiles.length} image{imageFiles.length === 1 ? '' : 's'} selected</p>
                    <ul className="mt-1 max-h-20 space-y-0.5 overflow-y-auto pr-1">
                      {imageFiles.map((file, index) => (
                        <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedImage(index)}
                            className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                    {imagePreviewUrls.length ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {imagePreviewUrls.map((previewUrl, index) => (
                          <div key={`${previewUrl}-${index}`} className="relative overflow-hidden rounded-md border border-[var(--svs-border)] bg-white">
                            <img
                              src={previewUrl}
                              alt={`Selected preview ${index + 1}`}
                              className="h-24 w-full object-cover"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedImage(index)}
                              className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {message ? (
              <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${messageType === 'error' ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {message}
              </div>
            ) : null}

            <button type="submit" disabled={isSubmitting} className={`${cudyBluePrimaryButtonClassName} mt-5 rounded-lg bg-[var(--svs-primary)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70`}>
              {isSubmitting ? 'Publishing listing\u2026' : 'Publish Listing'}
            </button>
          </form>

          <section className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-bold text-[var(--svs-text)]">Listing Tips</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--svs-muted)]">
              <p>Use a clear product title and include important details buyers search for.</p>
              <p>Add a short description with size, condition, and key features to reduce buyer questions.</p>
              <p>Set an accurate quantity so shoppers know stock availability before checkout.</p>
              <p>Use a clean, bright image where the product fills most of the frame.</p>
              <p>Set a realistic price so your listing performs better in market results.</p>
              {formData.marketKey === 'groceries' ? <p>For groceries, add the correct category, brand, pack size, freshness, and storage information so buyers can compare like-for-like products.</p> : null}
              <p>After publishing, you can edit or remove the item anytime from My Store.</p>
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  );
};

const PropertyHubPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.propertyHub')} subtitle={t('pageSubtitles.propertyHub')}>
    <div className="mb-5 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-4 text-sm text-[var(--svs-text)]">
      {t('propertyHub.intro')}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {propertyListings.map((listing) => (
        <article key={listing.id} className="overflow-hidden rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <img src={listing.image} alt={getTranslatedValue(t, listing.titleKey, listing.title)} className="h-44 w-full object-cover" loading="lazy" />
          <div className="p-4">
            <h3 className="text-lg font-bold">{getTranslatedValue(t, listing.titleKey, listing.title)}</h3>
            <p className="mt-1 text-sm text-slate-600">{getTranslatedValue(t, listing.typeKey, listing.type)}</p>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4" /> {getTranslatedValue(t, listing.locationKey, listing.location)}</p>
            <p className="mt-3 text-sm text-[var(--svs-primary-strong)]"><SalePrice price={listing.price} /></p>
            <button type="button" className={`${cudyBluePrimaryButtonClassName} mt-4 rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
              {t('common.viewDetails')}
            </button>
          </div>
        </article>
      ))}
    </div>
  </PageFrame>
  );
};

const BettingLotteryGamesPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.bettingLotteryGames')} subtitle={t('pageSubtitles.bettingLotteryGames')}>
    <div className="mb-5 rounded-xl border border-[#fcd34d] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
      {t('internationalLotteryHub.notice')}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <section className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
        <h3 className="text-lg font-bold text-[var(--svs-text)]">Lottery Games</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lotteryGames.map((game) => (
            <article key={game.id} className="overflow-hidden rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
              <img src={game.image} alt={getTranslatedValue(t, game.titleKey, game.title)} className="h-40 w-full object-cover" loading="lazy" />
              <div className="p-4">
                <h4 className="text-base font-bold">{getTranslatedValue(t, game.titleKey, game.title)}</h4>
                <p className="mt-2 text-sm text-slate-600">{t('internationalLotteryHub.regionLabel')}: {getTranslatedValue(t, game.regionKey, game.region)}</p>
                <p className="mt-1 text-sm text-slate-600">{t('internationalLotteryHub.drawDayLabel')}: {getTranslatedValue(t, game.drawDayKey, game.drawDay)}</p>
                <div className="mt-3 text-sm text-[var(--svs-primary-strong)]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('internationalLotteryHub.jackpotLabel')}</p>
                  <SalePrice price={game.jackpot} />
                </div>
                <button type="button" className={`${cudyBluePrimaryButtonClassName} mt-4 rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
                  {t('common.playNow')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-lg font-bold">Popular Matches</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {matchSeed.map((match) => (
              <li key={`hub-${match.id}`} className="rounded-md bg-[#f8fdff] px-3 py-2">
                {match.match} • Split: {match.split}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-lg font-bold">Live Leaderboard</h3>
          <div className="mt-3 space-y-3">
            {leaderboardSeed.slice(0, 3).map((expert) => (
              <div key={`lv-${expert.id}`} className="rounded-md bg-[#f8fdff] p-3">
                <p className="font-semibold">{expert.name}</p>
                <p className="text-sm text-slate-600">{expert.accuracy}% accuracy</p>
              </div>
            ))}
          </div>
          <Link to="/voting-clients" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
            {t('common.voteNow')}
          </Link>
        </section>
        <section className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-lg font-bold">Hot Travel Deals</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {ticketEvents.filter((event) => event.type === 'Travel').map((event) => (
              <li key={`travel-${event.id}`} className="rounded-md bg-[#f8fdff] px-3 py-2">
                {event.title} • <SalePrice price={event.price} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  </PageFrame>
  );
};

const LivestockHubPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.livestockHub')} subtitle={t('pageSubtitles.livestockHub')}>
    <div className="mb-5 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4 text-sm text-[var(--svs-text)]">
      {t('livestockHub.intro')}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {livestockItems.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <img
            src={item.image}
            alt={getTranslatedValue(t, item.titleKey, item.title)}
            className="h-44 w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = livestockImageFallback;
            }}
          />
          <div className="p-4">
            <h3 className="text-lg font-bold">{getTranslatedValue(t, item.titleKey, item.title)}</h3>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4" /> {getTranslatedValue(t, item.locationKey, item.location)}</p>
            <p className="mt-2 text-sm text-slate-600">{getTranslatedValue(t, item.summaryKey, item.summary)}</p>
            <p className="mt-3 text-sm text-[var(--svs-primary-strong)]"><SalePrice price={item.price} /></p>
            <button type="button" className={`${cudyBluePrimaryButtonClassName} mt-4 rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
              {t('common.viewDetails')}
            </button>
          </div>
        </article>
      ))}
    </div>
  </PageFrame>
  );
};

const SafetyPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.safety')} subtitle={t('pageSubtitles.safety')}>
    <ul className="space-y-3 text-sm text-slate-700">
      <li className="rounded-lg border border-[#b2ebf2] bg-white p-3">18+ age verification is required for betting and voting-adjacent features.</li>
      <li className="rounded-lg border border-[#b2ebf2] bg-white p-3">All transactions are encrypted and verified before processing.</li>
      <li className="rounded-lg border border-[#b2ebf2] bg-white p-3">Responsible play notices are shown in relevant routes and checkout points.</li>
      <li className="rounded-lg border border-[#b2ebf2] bg-white p-3">Help Line: +1-800-522-4700.</li>
    </ul>
  </PageFrame>
  );
};

const MarketsPage = () => {
  const { t } = useTranslation();
  const orderedMarketLinks = useMemo(
    () => {
      const trendingMarkets = TRENDING_MARKET_HREFS
        .map((href) => marketLinks.find((market) => market.href === href))
        .filter(Boolean);
      const remainingMarkets = marketLinks
        .filter((market) => !TRENDING_MARKET_HREFS.includes(market.href))
        .sort((a, b) => t(a.labelKey).localeCompare(t(b.labelKey)));

      return [...trendingMarkets, ...remainingMarkets];
    },
    [t],
  );

  return (
    <section className="bg-[var(--svs-bg)] px-4 py-10">
    <div className="mx-auto w-full max-w-7xl">
      <div className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-[0_4px_8px_rgba(0,0,0,0.1)] sm:p-8">
        <h1 className="text-3xl font-bold text-[var(--svs-text)] sm:text-4xl">{t('marketsPage.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--svs-muted)] sm:text-base">{t('marketsPage.subtitle')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--svs-cyan-surface)] px-3 py-1 text-xs font-semibold text-[var(--svs-primary-strong)]">{t('marketsPage.tags.superShopping')}</span>
          <span className="rounded-full bg-[var(--svs-cyan-surface)] px-3 py-1 text-xs font-semibold text-[var(--svs-primary-strong)]">{t('marketsPage.tags.superService')}</span>
          <span className="rounded-full bg-[var(--svs-cyan-surface)] px-3 py-1 text-xs font-semibold text-[var(--svs-primary-strong)]">{t('marketsPage.tags.intelligentPlatform')}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orderedMarketLinks.map((market, index) => (
          <Link
            key={`all-${market.href}`}
            to={market.href}
            className="group rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_22px_rgba(0,168,232,0.2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--svs-primary-strong)]">{t('marketsPage.marketLabel', { number: String(index + 1).padStart(2, '0') })}</p>
                <p className="mt-1 text-lg font-bold text-[var(--svs-text)]">{t(market.labelKey)}</p>
              </div>
              <span className="svs-berkshire-swash rounded-full bg-[var(--svs-cyan-surface)] px-2 py-1 text-sm text-[var(--svs-primary-strong)]">SVS</span>
            </div>
            <p className="mt-3 text-sm text-[var(--svs-muted)]">{t('marketsPage.openMarket')}</p>
            <div className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white transition group-hover:bg-[#33b9f2]`}>
              {t('marketsPage.enterMarket')} <span aria-hidden="true">-&gt;</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-7 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-5 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
        <p className="text-sm text-[var(--svs-text)]">{t('marketsPage.quickTip')}</p>
      </div>
    </div>
    </section>
  );
};

const SearchResultsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('query') || '').trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) {
      return [];
    }

    return searchableCatalog.filter((item) => item.searchText.includes(query));
  }, [query]);

  return (
    <PageFrame title={t('searchResults.title')} subtitle={t('searchResults.subtitle')}>
      {query ? (
        <p className="mb-4 text-sm text-slate-600">
          Showing {results.length} result{results.length === 1 ? '' : 's'} for "{query}".
        </p>
      ) : (
        <p className="mb-4 text-sm text-slate-600">Enter a term in the top search bar to begin.</p>
      )}

      {results.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((item) => {
            const itemTitle = getTranslatedValue(t, item.titleKey, item.title);
            const itemSection = getTranslatedValue(t, item.sectionKey, item.section);

            return (
              <article key={`search-${item.id}`} className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={itemTitle}
                    className="mb-3 h-40 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : null}
                <h3 className="text-lg font-bold">{itemTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">{itemSection}</p>
                {'price' in item ? <p className="mt-1 text-sm text-[var(--svs-primary-strong)]"><SalePrice price={item.price} /></p> : null}
                <Link to={item.route} className={`${cudyBluePrimaryButtonClassName} mt-3 inline-flex rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white`}>
                  {t('common.openMarket')}
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#b2ebf2] bg-[#e0f7fa] p-4 text-sm text-slate-700">{t('searchResults.noResults')}</div>
      )}
    </PageFrame>
  );
};

const OffersPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('offers.title')} subtitle={t('offers.subtitle')}>
    <div className="grid gap-4 md:grid-cols-3">
      {['Buy 1 Get 1 Free', '20% Off Groceries', 'Flash Ticket Deals'].map((offer) => (
        <article key={offer} className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <p className="text-sm font-semibold text-[var(--svs-primary-strong)]">Offer</p>
          <h3 className="mt-1 text-lg font-bold">{offer}</h3>
        </article>
      ))}
    </div>
  </PageFrame>
  );
};

const WishlistPage = ({ wishlistItems, onAddToCart, onRemoveWishlistItem, onOpenItemDetails }) => (
  <PageFrame title="Wishlist" subtitle="Save items you want to come back to later.">
    {!wishlistItems.length ? (
      <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-5 text-sm text-[var(--svs-text)]">
        <p>Your wishlist is empty. Save products or tickets from any market to find them quickly later.</p>
        <Link to="/markets" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
          Browse Markets
        </Link>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {wishlistItems.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-[0_4px_8px_rgba(0,0,0,0.08)]"
            role="button"
            tabIndex={0}
            onClick={() => onOpenItemDetails?.({
              title: item.title,
              image: item.image,
              images: item.images || (item.image ? [item.image] : []),
              marketName: item.marketName,
              details: item.details,
              priceLabel: item.unitPriceLabel,
              cartItem: { ...item, quantity: 1 },
              wishlistItem: item,
            })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
          >
            {item.image ? <img src={item.image} alt={item.title} className="h-44 w-full object-cover" loading="lazy" /> : null}
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--svs-text)]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[var(--svs-muted)]">{item.marketName}</p>
                </div>
                <Heart className="h-5 w-5 fill-current text-rose-500" />
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--svs-primary-strong)]">{item.unitPriceLabel}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddToCart({ ...item, quantity: 1 });
                  }}
                  className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white`}
                >
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveWishlistItem(item.id);
                  }}
                  className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    )}
  </PageFrame>
);

const CheckoutPage = ({ cartItems, buyNowCheckout, onUpdateCartQuantity, onRemoveCartItem, onClearBuyNowCheckout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isBuyNowMode = Boolean(location.state?.checkoutMode === 'buy-now' && buyNowCheckout?.items?.length);
  const checkoutItems = useMemo(() => (
    isBuyNowMode ? (buyNowCheckout?.items || []) : cartItems
  ), [buyNowCheckout, cartItems, isBuyNowMode]);
  const shippingFee = checkoutItems.length ? STANDARD_SHIPPING_FEE : 0;
  const totals = useMemo(() => getCheckoutTotals(checkoutItems, shippingFee), [checkoutItems, shippingFee]);
  const [formState, setFormState] = useState({
    contact: typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''),
    saveInformation: false,
    marketingOptIn: false,
    country: 'South Africa',
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    province: 'KwaZulu-Natal',
    postalCode: '',
    phoneCountryCode: '+27',
    phone: '',
    paymentMethod: PAYFAST_METHOD_OPTIONS[0].value,
    billingAddressMode: 'same',
    billingFirstName: '',
    billingLastName: '',
    billingCompany: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingProvince: 'KwaZulu-Natal',
    billingPostalCode: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setSubmitError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isMethodSelectorOpen, setIsMethodSelectorOpen] = useState(false);
  const [focusedMethodIndex, setFocusedMethodIndex] = useState(0);
  const methodCardRefs = useRef([]);
  const methodMenuRef = useRef(null);
  const isPhoneMissing = !formState.phone.trim();
  const contactEmail = String(formState.contact || '').trim();
  const hasInvalidContactEmail = Boolean(contactEmail) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  const shippingMethodLabel = `Standard – ${formatCheckoutAmount(shippingFee)}`;
  const sectionClassName = 'rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8';
  const fieldLabelClassName = 'mb-2 block text-sm font-medium text-[var(--svs-text)]';
  const inputClassName = 'w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/20';
  const mutedTextClassName = 'text-sm text-[var(--svs-muted)]';
  const checkoutSteps = [
    { id: 1, label: 'Items' },
    { id: 2, label: 'Delivery' },
    { id: 3, label: 'Payment' },
  ];

  useEffect(() => {
    if (!location.state?.prefillCheckout) {
      return;
    }

    setFormState((current) => ({ ...current, ...location.state.prefillCheckout }));
  }, [location.state]);

  useEffect(() => {
    if (!isBuyNowMode && buyNowCheckout?.items?.length) {
      onClearBuyNowCheckout?.();
    }
  }, [buyNowCheckout, isBuyNowMode, onClearBuyNowCheckout]);

  useEffect(() => {
    const nextIndex = PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === formState.paymentMethod);
    setFocusedMethodIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [formState.paymentMethod]);

  useEffect(() => {
    if (!isMethodSelectorOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!methodMenuRef.current?.contains(event.target)) {
        setIsMethodSelectorOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isMethodSelectorOpen]);

  const applyAutofillAddress = useCallback((prefix, details) => {
    const normalizeFieldName = (field) => (prefix ? `${prefix}${field.charAt(0).toUpperCase()}${field.slice(1)}` : field);

    setFormState((current) => ({
      ...current,
      [normalizeFieldName('address1')]: details.address1 || current[normalizeFieldName('address1')],
      [normalizeFieldName('address2')]: details.address2 || current[normalizeFieldName('address2')],
      [normalizeFieldName('city')]: details.city || current[normalizeFieldName('city')],
      [normalizeFieldName('province')]: SOUTH_AFRICA_PROVINCES.includes(details.province)
        ? details.province
        : current[normalizeFieldName('province')],
      [normalizeFieldName('postalCode')]: details.postalCode || current[normalizeFieldName('postalCode')],
      ...(prefix ? {} : { country: details.country || current.country }),
    }));
  }, []);

  const updateField = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const validateDeliveryStep = () => {
    const requiredFields = [
      formState.contact,
      formState.firstName,
      formState.lastName,
      formState.address1,
      formState.city,
      formState.province,
      formState.postalCode,
      formState.phone,
    ];

    if (!checkoutItems.length) {
      return 'Your checkout is empty. Choose an item before continuing.';
    }

    if (requiredFields.some((value) => !String(value || '').trim())) {
      return 'Please complete your contact, delivery, and phone details before paying.';
    }

    if (hasInvalidContactEmail) {
      return 'Enter a valid email address before paying.';
    }

    return '';
  };

  const validatePaymentStep = () => {
    const deliveryError = validateDeliveryStep();

    if (deliveryError) {
      return deliveryError;
    }

    if (formState.billingAddressMode === 'different') {
      const billingFields = [
        formState.billingFirstName,
        formState.billingLastName,
        formState.billingAddress1,
        formState.billingCity,
        formState.billingProvince,
        formState.billingPostalCode,
      ];

      if (billingFields.some((value) => !String(value || '').trim())) {
        return 'Complete the billing address details or choose same as shipping address.';
      }
    }

    return '';
  };

  const handleContinueFromItems = () => {
    if (!checkoutItems.length) {
      setSubmitError('Your checkout is empty. Choose an item before continuing.');
      return;
    }

    setSubmitError('');
    setCurrentStep(2);
  };

  const handleContinueToPayment = () => {
    const validationError = validateDeliveryStep();

    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitError('');
    setCurrentStep(3);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitError('');

    const validationError = validatePaymentStep();

    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);

    const fullName = `${formState.firstName} ${formState.lastName}`.trim();
    const normalizedContactEmail = normalizeEmail(String(formState.contact || '').trim());
    const shippingAddress = {
      country: formState.country,
      firstName: formState.firstName.trim(),
      lastName: formState.lastName.trim(),
      company: formState.company.trim(),
      address1: formState.address1.trim(),
      address2: formState.address2.trim(),
      city: formState.city.trim(),
      province: formState.province,
      postalCode: formState.postalCode.trim(),
      phone: `${formState.phoneCountryCode} ${formState.phone.trim()}`.trim(),
    };
    const billingAddress = formState.billingAddressMode === 'different'
      ? {
        firstName: formState.billingFirstName.trim(),
        lastName: formState.billingLastName.trim(),
        company: formState.billingCompany.trim(),
        address1: formState.billingAddress1.trim(),
        address2: formState.billingAddress2.trim(),
        city: formState.billingCity.trim(),
        province: formState.billingProvince,
        postalCode: formState.billingPostalCode.trim(),
        country: formState.country,
      }
      : shippingAddress;

    const payfastSession = {
      id: `payfast-${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: isBuyNowMode ? 'buy-now' : 'cart',
      checkoutMode: isBuyNowMode ? 'buy-now' : 'cart',
      customer: {
        fullName,
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        email: normalizedContactEmail || null,
        contact: normalizedContactEmail,
        phone: shippingAddress.phone,
        company: formState.company.trim(),
        address: [
          shippingAddress.address1,
          shippingAddress.address2,
          shippingAddress.city,
          shippingAddress.province,
          shippingAddress.postalCode,
          shippingAddress.country,
        ].filter(Boolean).join(', '),
        country: formState.country,
        province: formState.province,
        postalCode: formState.postalCode.trim(),
        shippingAddress,
        billingAddress,
        billingAddressMode: formState.billingAddressMode,
        shippingMethod: shippingMethodLabel,
        shippingFee,
        saveInformation: formState.saveInformation,
        marketingOptIn: formState.marketingOptIn,
        paymentMethod: PAYFAST_METHOD_OPTIONS.find((option) => option.value === formState.paymentMethod)?.label || PAYFAST_METHOD_OPTIONS[0].label,
      },
      checkoutOptions: {
        items: checkoutItems,
        mode: isBuyNowMode ? 'buy-now' : 'cart',
        feeTotal: totals.feeTotal,
        total: totals.total,
      },
      prefillCheckout: formState,
      totals,
      contactEmail: normalizedContactEmail || 'guest@svs.app',
    };
    writePendingPayfastSession(payfastSession);
    setIsSubmitting(false);
    navigate('/checkout/payfast', {
      state: {
        payfastSession,
        checkoutMode: isBuyNowMode ? 'buy-now' : 'cart',
      },
    });
  };

  let activeStepContent = null;

  if (currentStep === 1) {
    activeStepContent = (
      <section className={sectionClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[var(--svs-text)]">Items</h2>
            <p className={`${mutedTextClassName} mt-1`}>{isBuyNowMode ? 'This order contains a single item.' : 'Adjust quantities here before paying.'}</p>
          </div>
          {isBuyNowMode ? <span className="rounded-full bg-[#111111] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">Single item</span> : null}
        </div>

        <div className="mt-5 space-y-3">
          {checkoutItems.map((item) => (
            <article key={item.id} className="flex gap-4 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
              <img src={item.image} alt={item.title} className="h-24 w-24 rounded-2xl object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--svs-text)]">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--svs-muted)]">{item.marketName}</p>
                    {item.details ? <p className="mt-1 text-sm text-[var(--svs-muted)]">{item.details}</p> : null}
                  </div>
                  <p className="text-sm font-semibold text-[var(--svs-text)]">{item.unitPriceLabel}</p>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  {isBuyNowMode ? (
                    <div className="inline-flex items-center rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-2 text-sm font-semibold text-[var(--svs-text)]">
                      1 item
                    </div>
                  ) : (
                    <>
                      <div className="inline-flex items-center overflow-hidden rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)]">
                        <button type="button" onClick={() => onUpdateCartQuantity(item.id, -1)} className="px-3 py-2 text-sm font-semibold text-[var(--svs-text)]">-</button>
                        <span className="min-w-10 border-x border-[var(--svs-border)] px-3 py-2 text-center text-sm font-semibold text-[var(--svs-text)]">{item.quantity}</span>
                        <button type="button" onClick={() => onUpdateCartQuantity(item.id, 1)} className="px-3 py-2 text-sm font-semibold text-[var(--svs-text)]">+</button>
                      </div>
                      <button type="button" onClick={() => onRemoveCartItem(item.id)} className="text-sm font-semibold text-rose-600 transition hover:text-rose-500">
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={handleContinueFromItems} className={`${cudyBluePrimaryButtonClassName} rounded-xl bg-[var(--svs-primary)] px-5 py-3 text-sm font-bold text-white`}>
            Continue to Delivery
          </button>
        </div>
      </section>
    );
  } else if (currentStep === 2) {
    activeStepContent = (
      <>
        <section className={sectionClassName}>
          <h2 className="text-xl font-black text-[var(--svs-text)]">Contact</h2>
          <p className={`${mutedTextClassName} mt-1`}>Email address</p>
          <div className="mt-4">
            <input
              type="email"
              value={formState.contact}
              onChange={(event) => updateField('contact', event.target.value)}
              placeholder="Email address"
              className={inputClassName}
            />
          </div>
          {hasInvalidContactEmail ? (
            <p className="mt-2 text-xs font-medium text-[#d94d4d]">Enter a valid email address to continue</p>
          ) : null}
          <label className="mt-4 flex items-start gap-3 text-sm text-[var(--svs-text)]">
            <input
              type="checkbox"
              checked={formState.saveInformation}
              onChange={(event) => updateField('saveInformation', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#d9d1c6]"
            />
            <span>Save this information for next time</span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-sm text-[var(--svs-text)]">
            <input
              type="checkbox"
              checked={formState.marketingOptIn}
              onChange={(event) => updateField('marketingOptIn', event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#d9d1c6]"
            />
            <span>Text me with news and offers</span>
          </label>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-xl font-black text-[var(--svs-text)]">Delivery</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className={fieldLabelClassName}>Country/Region</span>
              <select value={formState.country} onChange={(event) => updateField('country', event.target.value)} className={inputClassName}>
                <option>South Africa</option>
              </select>
            </label>
            <label>
              <span className={fieldLabelClassName}>First name</span>
              <input type="text" value={formState.firstName} onChange={(event) => updateField('firstName', event.target.value)} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Last name</span>
              <input type="text" value={formState.lastName} onChange={(event) => updateField('lastName', event.target.value)} className={inputClassName} />
            </label>
            <label className="md:col-span-2">
              <span className={fieldLabelClassName}>Company (optional)</span>
              <input type="text" value={formState.company} onChange={(event) => updateField('company', event.target.value)} className={inputClassName} />
            </label>
            <div className="md:col-span-2">
              <AddressAutocompleteField
                label="Address"
                value={formState.address1}
                onChange={(nextValue) => updateField('address1', nextValue)}
                onSelectAddress={(details) => applyAutofillAddress('', details)}
                inputClassName={inputClassName}
              />
            </div>
            <label className="md:col-span-2">
              <span className={fieldLabelClassName}>Apartment, suite, etc. (optional)</span>
              <input type="text" value={formState.address2} onChange={(event) => updateField('address2', event.target.value)} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>City</span>
              <input type="text" value={formState.city} onChange={(event) => updateField('city', event.target.value)} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Province</span>
              <select value={formState.province} onChange={(event) => updateField('province', event.target.value)} className={inputClassName}>
                {SOUTH_AFRICA_PROVINCES.map((province) => <option key={province}>{province}</option>)}
              </select>
            </label>
            <label>
              <span className={fieldLabelClassName}>Postal code</span>
              <input type="text" value={formState.postalCode} onChange={(event) => updateField('postalCode', event.target.value)} className={inputClassName} />
            </label>
            <label>
              <span className={fieldLabelClassName}>Phone</span>
              <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-2">
                <select value={formState.phoneCountryCode} onChange={(event) => updateField('phoneCountryCode', event.target.value)} className={inputClassName}>
                  <option value="+27">🇿🇦 +27</option>
                </select>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm text-[var(--svs-text)] outline-none transition focus:ring-2 ${isPhoneMissing ? 'border border-[#e46b6b] bg-[#fff6f6] focus:border-[#d94d4d] focus:ring-[#ffd9d9]' : 'border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] focus:border-[var(--svs-primary)] focus:ring-[#33b9f2]/20'}`}
                />
              </div>
              {isPhoneMissing ? (
                <p className="mt-2 text-xs font-medium text-[#d94d4d]">Enter a phone number to use this delivery method</p>
              ) : null}
            </label>
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-xl font-black text-[var(--svs-text)]">Shipping Method</h2>
          <div className="mt-5 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--svs-text)]">{shippingMethodLabel}</p>
                <p className="mt-1 text-xs text-[var(--svs-muted)]">South Africa delivery</p>
              </div>
              <p className="text-sm font-semibold text-[var(--svs-text)]">{formatCheckoutAmount(shippingFee)}</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => setCurrentStep(1)} className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-5 py-3 text-sm font-bold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]">
            Back to Items
          </button>
          <button type="button" onClick={handleContinueToPayment} className={`${cudyBluePrimaryButtonClassName} rounded-xl bg-[var(--svs-primary)] px-5 py-3 text-sm font-bold text-white`}>
            Continue to Payment
          </button>
        </div>
      </>
    );
  } else {
    activeStepContent = (
      <>
        <section className={sectionClassName}>
          <h2 className="text-xl font-black text-[var(--svs-text)]">Payment</h2>
          <div className="mt-5 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--svs-text)]">Payfast</p>
                <p className="mt-1 text-xs text-[var(--svs-muted)]">You'll be redirected to Payfast to complete your purchase.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--svs-muted)]">
                <span className="rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-2.5 py-1">Visa</span>
                <span className="rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-2.5 py-1">Mastercard</span>
                <span className="rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-2.5 py-1">EFT</span>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-4 text-sm text-[var(--svs-text)]">
              <p className="font-semibold text-[var(--svs-text)]">Payment method</p>
              <div className="relative mt-3" ref={methodMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setFocusedMethodIndex(PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === formState.paymentMethod));
                    setIsMethodSelectorOpen((prev) => !prev);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
                  aria-haspopup="menu"
                  aria-expanded={isMethodSelectorOpen}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{PAYFAST_METHOD_OPTIONS.find((option) => option.value === formState.paymentMethod)?.label || PAYFAST_METHOD_OPTIONS[0].label}</span>
                    {formState.paymentMethod === CARD_PAYMENT_METHOD_VALUE ? (
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                        Default
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition ${isMethodSelectorOpen ? 'rotate-180' : ''}`} />
                </button>
                <PaymentMethodSelectorPopover
                  isOpen={isMethodSelectorOpen}
                  selectedValue={formState.paymentMethod}
                  focusedIndex={focusedMethodIndex}
                  onSelect={(value) => {
                    updateField('paymentMethod', value);
                    setFocusedMethodIndex(PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === value));
                    setIsMethodSelectorOpen(false);
                  }}
                  onFocusIndex={setFocusedMethodIndex}
                  cardRefs={methodCardRefs}
                  className="w-full"
                />
              </div>
              <p className="mt-4 text-sm text-[#4d463d]">Additional payment methods may be available on Payfast.</p>
            </div>
          </div>
        </section>

        <section className={sectionClassName}>
          <h2 className="text-xl font-black text-[var(--svs-text)]">Billing Address</h2>
          <div className="mt-5 space-y-3">
            <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${formState.billingAddressMode === 'same' ? 'border-[var(--svs-primary)] bg-[var(--svs-cyan-surface)] text-[var(--svs-text)]' : 'border-[var(--svs-border)] bg-[var(--svs-surface)] text-[var(--svs-text)]'}`}>
              <input type="radio" name="billing-address-mode" checked={formState.billingAddressMode === 'same'} onChange={() => updateField('billingAddressMode', 'same')} />
              <span>Same as shipping address</span>
            </label>
            <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${formState.billingAddressMode === 'different' ? 'border-[var(--svs-primary)] bg-[var(--svs-cyan-surface)] text-[var(--svs-text)]' : 'border-[var(--svs-border)] bg-[var(--svs-surface)] text-[var(--svs-text)]'}`}>
              <input type="radio" name="billing-address-mode" checked={formState.billingAddressMode === 'different'} onChange={() => updateField('billingAddressMode', 'different')} />
              <span>Use a different billing address</span>
            </label>
          </div>

          {formState.billingAddressMode === 'different' ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input type="text" value={formState.billingFirstName} onChange={(event) => updateField('billingFirstName', event.target.value)} placeholder="Billing first name" className={inputClassName} />
              <input type="text" value={formState.billingLastName} onChange={(event) => updateField('billingLastName', event.target.value)} placeholder="Billing last name" className={inputClassName} />
              <input type="text" value={formState.billingCompany} onChange={(event) => updateField('billingCompany', event.target.value)} placeholder="Billing company (optional)" className={`md:col-span-2 ${inputClassName}`} />
              <div className="md:col-span-2">
                <AddressAutocompleteField
                  label="Billing address"
                  value={formState.billingAddress1}
                  onChange={(nextValue) => updateField('billingAddress1', nextValue)}
                  onSelectAddress={(details) => applyAutofillAddress('billing', details)}
                  inputClassName={inputClassName}
                />
              </div>
              <input type="text" value={formState.billingAddress2} onChange={(event) => updateField('billingAddress2', event.target.value)} placeholder="Apartment, suite, etc. (optional)" className={`md:col-span-2 ${inputClassName}`} />
              <input type="text" value={formState.billingCity} onChange={(event) => updateField('billingCity', event.target.value)} placeholder="Billing city" className={inputClassName} />
              <select value={formState.billingProvince} onChange={(event) => updateField('billingProvince', event.target.value)} className={inputClassName}>
                {SOUTH_AFRICA_PROVINCES.map((province) => <option key={province}>{province}</option>)}
              </select>
              <input type="text" value={formState.billingPostalCode} onChange={(event) => updateField('billingPostalCode', event.target.value)} placeholder="Billing postal code" className={inputClassName} />
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => setCurrentStep(2)} className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-5 py-3 text-sm font-bold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)] hover:text-[var(--svs-primary)]">
            Back to Delivery
          </button>
          <button type="submit" disabled={isSubmitting} className={`${cudyBluePrimaryButtonClassName} rounded-xl bg-[var(--svs-primary)] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70`}>
            {isSubmitting ? 'Processing...' : 'Pay now'}
          </button>
        </div>
      </>
    );
  }

  return (
    <MinimalCheckoutShell
      title="Checkout"
      badge={isBuyNowMode ? <div className="rounded-full bg-[#111111] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">Buy it now</div> : null}
    >
        {!checkoutItems.length ? (
          <div className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 text-sm text-[var(--svs-text)] shadow-sm md:p-8">
            <p>Your checkout is empty. Add products or tickets from any market to continue.</p>
            <Link to="/markets" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-xl bg-[var(--svs-primary)] px-4 py-3 text-sm font-bold text-white`}>
              Browse Markets
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="mx-auto w-full max-w-3xl space-y-5 xl:mx-0 xl:max-w-none">
              <section className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-[var(--svs-text)]">Checkout</h2>
                    <p className="mt-2 text-sm text-[var(--svs-muted)]">Review your items, delivery details, and payment method.</p>
                  </div>
                  <div className="inline-flex flex-wrap rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-1 text-sm font-semibold">
                    {checkoutSteps.map((step) => {
                      const isActive = currentStep === step.id;
                      const isComplete = currentStep > step.id;

                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => {
                            if (step.id <= currentStep) {
                              setSubmitError('');
                              setCurrentStep(step.id);
                            }
                          }}
                          className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition ${isActive ? 'bg-[var(--svs-primary)] text-white' : isComplete ? 'text-[var(--svs-primary)]' : 'text-[var(--svs-muted)]'}`}
                        >
                          {step.id}. {step.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
              {activeStepContent}
            </section>

            <aside className="hidden self-start rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-6 shadow-sm md:p-8 lg:sticky lg:top-24 xl:block">
              {isBuyNowMode ? (
                <div className="mb-5 rounded-[24px] bg-[#111111] px-4 py-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Buy it now</p>
                  <p className="mt-2 text-sm text-slate-200">Express guest checkout for this single item.</p>
                </div>
              ) : null}

              <h2 className="text-xl font-black text-[var(--svs-text)]">Order Summary</h2>
              <div className="mt-5 space-y-4">
                {checkoutItems.map((item) => (
                  <div key={`summary-${item.id}`} className="flex items-center gap-3 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-3">
                    <img src={item.image} alt={item.title} className="h-16 w-16 rounded-2xl object-cover" loading="lazy" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--svs-text)]">{item.title}</p>
                      <p className="mt-1 text-xs text-[var(--svs-muted)]">{item.quantity} item{item.quantity === 1 ? '' : 's'}</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--svs-text)]">{formatCheckoutAmount(item.unitPrice * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 text-sm text-[var(--svs-muted)]">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCheckoutAmount(totals.subtotal)}</span></div>
                <div className="flex items-center justify-between"><span>Shipping</span><span>{formatCheckoutAmount(totals.shippingFee)}</span></div>
                <div className="flex items-center justify-between"><span>Platform fee</span><span>{formatCheckoutAmount(totals.serviceFee)}</span></div>
                <div className="flex items-center justify-between border-t border-[var(--svs-border)] pt-4 text-base font-bold text-[var(--svs-text)]"><span>Total</span><span>{formatCheckoutAmount(totals.total)}</span></div>
              </div>

            </aside>
          </form>
        )}
    </MinimalCheckoutShell>
  );
};

const StripeCardPaymentPanel = ({
  payfastSession,
  paymentMethodLabel,
  onReturnToCheckout,
  onFinalizeOrder,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStripeSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const paymentDetails = await startCardPayment({
        amount: payfastSession.totals.total,
        email: payfastSession.contactEmail,
        fullName: payfastSession.customer.fullName,
        phone: payfastSession.customer.phone,
        itemCount: payfastSession.checkoutOptions?.items?.length || 0,
        stripe,
        confirmPayment: {
          elements,
          confirmPayment: stripe?.confirmPayment.bind(stripe),
        },
        returnUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/orders`,
        redirect: 'if_required',
      });

      const completed = await onFinalizeOrder(paymentDetails, paymentMethodLabel);

      if (!completed) {
        setSubmitError('One or more items are no longer available in the requested quantity. Return to checkout and review your order.');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Card payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-[24px] border border-[#e2dbd0] bg-[#fbfaf7] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7967]">Card payment</p>
        <p className="mt-2 text-sm text-[#4d463d]">Your card payment is processed securely with Stripe using the existing payment integration.</p>
        <div className="mt-4 rounded-[20px] border border-[#e2dbd0] bg-white p-4">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      </div>

      {submitError ? (
        <div className="rounded-2xl border border-[#f1b8b8] bg-[#fff4f4] px-4 py-3 text-sm text-[#c74d4d]">
          {submitError}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onReturnToCheckout} className="rounded-2xl border border-[#d9d1c6] bg-white px-5 py-3 text-sm font-semibold text-[#4d463d] transition hover:border-[#1f1f1f] hover:text-[#1f1f1f]">
          Cancel Payment
        </button>
        <button type="button" disabled={isSubmitting || !stripe || !elements} onClick={handleStripeSubmit} className={`${cudyBluePrimaryButtonClassName} rounded-2xl bg-[#1a73e8] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70`}>
          {isSubmitting ? 'Processing payment...' : `Pay ${formatCheckoutAmount(payfastSession.totals.total)}`}
        </button>
      </div>
    </>
  );
};

const PayfastCheckoutPage = ({ buyNowCheckout, onPlaceOrder, onClearBuyNowCheckout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeSession = location.state?.payfastSession || null;
  const [payfastSession, setPayfastSession] = useState(() => routeSession || readPendingPayfastSession());
  const [selectedMethod, setSelectedMethod] = useState(() => {
    const storedLabel = (routeSession || readPendingPayfastSession())?.customer?.paymentMethod || PAYFAST_METHOD_OPTIONS[0].label;
    return PAYFAST_METHOD_OPTIONS.find((option) => option.label === storedLabel)?.value || PAYFAST_METHOD_OPTIONS[0].value;
  });
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [isPreparingStripe, setIsPreparingStripe] = useState(false);
  const [stripeSetupError, setStripeSetupError] = useState('');
  const [isMethodSelectorOpen, setIsMethodSelectorOpen] = useState(false);
  const [focusedMethodIndex, setFocusedMethodIndex] = useState(() => PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === selectedMethod));
  const methodCardRefs = useRef([]);
  const methodMenuRef = useRef(null);
  const stripePromise = useMemo(() => getStripeInstance(), []);
  const isBuyNowMode = payfastSession?.mode === 'buy-now' && buyNowCheckout?.items?.length;
  const selectedMethodLabel = PAYFAST_METHOD_OPTIONS.find((option) => option.value === selectedMethod)?.label || PAYFAST_METHOD_OPTIONS[0].label;
  const isCardPaymentMethod = selectedMethod === CARD_PAYMENT_METHOD_VALUE;

  useEffect(() => {
    if (routeSession) {
      setPayfastSession(routeSession);
      setSelectedMethod(PAYFAST_METHOD_OPTIONS.find((option) => option.label === routeSession.customer?.paymentMethod)?.value || PAYFAST_METHOD_OPTIONS[0].value);
      writePendingPayfastSession(routeSession);
    }
  }, [routeSession]);

  useEffect(() => {
    const nextIndex = PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === selectedMethod);
    setFocusedMethodIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [selectedMethod]);

  useEffect(() => {
    if (!isMethodSelectorOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!methodMenuRef.current?.contains(event.target)) {
        setIsMethodSelectorOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isMethodSelectorOpen]);

  useEffect(() => {
    if (!payfastSession || !isCardPaymentMethod) {
      setStripeClientSecret('');
      setStripeSetupError('');
      setIsPreparingStripe(false);
      return;
    }

    if (!embeddedCardCheckoutEnabled) {
      setStripeClientSecret('');
      setStripeSetupError('Stripe card payments are unavailable. Add REACT_APP_STRIPE_PUBLIC_KEY and STRIPE_SECRET_KEY to continue.');
      setIsPreparingStripe(false);
      return;
    }

    let cancelled = false;
    setIsPreparingStripe(true);
    setStripeSetupError('');
    setStripeClientSecret('');

    requestStripeClientSecret({
      amount: payfastSession.totals.total,
      currency: stripeCurrency,
      email: payfastSession.contactEmail,
      fullName: payfastSession.customer.fullName,
    }).then((clientSecret) => {
      if (!cancelled) {
        setStripeClientSecret(clientSecret);
      }
    }).catch((error) => {
      if (!cancelled) {
        setStripeSetupError(error instanceof Error ? error.message : 'Could not initialize Stripe card payment.');
      }
    }).finally(() => {
      if (!cancelled) {
        setIsPreparingStripe(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isCardPaymentMethod, payfastSession]);

  if (!payfastSession) {
    return (
      <MinimalCheckoutShell title="Payfast">
        <div className="rounded-[28px] border border-[#ddd5c8] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-[#4d463d]">Your payment session expired. Return to checkout and start again.</p>
          <button type="button" onClick={() => navigate('/checkout')} className={`${cudyBluePrimaryButtonClassName} mt-4 rounded-2xl bg-[#1a73e8] px-4 py-2.5 text-sm font-semibold text-white`}>
            Return to checkout
          </button>
        </div>
      </MinimalCheckoutShell>
    );
  }

  const handleReturnToCheckout = () => {
    navigate('/checkout', {
      state: {
        checkoutMode: payfastSession.checkoutMode === 'buy-now' ? 'buy-now' : undefined,
        prefillCheckout: payfastSession.prefillCheckout,
      },
    });
  };

  const handleCompletePayment = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    const order = await onPlaceOrder(
      {
        ...payfastSession.customer,
        paymentMethod: selectedMethodLabel,
      },
      {
        provider: 'Payfast',
        status: 'paid',
        reference: `PF-${Date.now()}`,
        currency: 'ZAR',
      },
      payfastSession.checkoutOptions,
    );

    if (!order) {
      setIsSubmitting(false);
      setSubmitError('One or more items are no longer available in the requested quantity. Return to checkout and review your order.');
      return;
    }

    clearPendingPayfastSession();

    if (isBuyNowMode) {
      onClearBuyNowCheckout?.();
    }

    setIsSubmitting(false);
    navigate('/orders', {
      state: {
        orderId: order.id,
        reference: order.reference,
        guestCheckout: !getAuthState(),
      },
    });
  };

  const handleFinalizeStripeOrder = async (paymentDetails, paymentMethodLabel) => {
    const order = await onPlaceOrder(
      {
        ...payfastSession.customer,
        paymentMethod: paymentMethodLabel,
      },
      paymentDetails,
      payfastSession.checkoutOptions,
    );

    if (!order) {
      return null;
    }

    clearPendingPayfastSession();

    if (isBuyNowMode) {
      onClearBuyNowCheckout?.();
    }

    navigate('/orders', {
      state: {
        orderId: order.id,
        reference: order.reference,
        guestCheckout: !getAuthState(),
      },
    });

    return order;
  };

  return (
    <MinimalCheckoutShell
      title="Payment"
      badge={<div className="rounded-full border border-[#d9d1c6] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b6258]">Secure checkout</div>}
    >
      <div className="mx-auto max-w-3xl rounded-[32px] border border-[#ddd5c8] bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="space-y-6">
          <div className="rounded-[24px] bg-[#f7f3ec] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7967]">Order from:</p>
            <p className="mt-2 text-2xl font-bold text-[#1f1f1f]">SVS E-Commerce</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-[#e2dbd0] bg-[#fbfaf7] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7967]">Payment total:</p>
              <p className="mt-2 text-2xl font-bold text-[#1f1f1f]">ZAR {formatCheckoutAmount(payfastSession.totals.total)}</p>
            </div>
            <div className="rounded-[24px] border border-[#e2dbd0] bg-[#fbfaf7] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a7967]">Transacting as:</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[#1f1f1f]">
                <span className="font-semibold">{payfastSession.contactEmail}</span>
                <button type="button" onClick={handleReturnToCheckout} className="font-semibold text-[#1a73e8] underline">
                  Change
                </button>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#1f1f1f]">How will you be paying today?</h2>
            <div className="mt-5 rounded-[22px] border border-[#e2dbd0] bg-[#fbfaf7] p-4" ref={methodMenuRef}>
              <p className="text-sm font-semibold text-[#1f1f1f]">Payment method</p>
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setFocusedMethodIndex(PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === selectedMethod));
                    setIsMethodSelectorOpen((prev) => !prev);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#d9d1c6] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1f1f1f] transition hover:border-[#1f1f1f]"
                  aria-haspopup="menu"
                  aria-expanded={isMethodSelectorOpen}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{selectedMethodLabel}</span>
                    {isCardPaymentMethod ? (
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                        Default
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition ${isMethodSelectorOpen ? 'rotate-180' : ''}`} />
                </button>
                <PaymentMethodSelectorPopover
                  isOpen={isMethodSelectorOpen}
                  selectedValue={selectedMethod}
                  focusedIndex={focusedMethodIndex}
                  onSelect={(value) => {
                    setSelectedMethod(value);
                    setFocusedMethodIndex(PAYFAST_METHOD_OPTIONS.findIndex((option) => option.value === value));
                    setIsMethodSelectorOpen(false);
                  }}
                  onFocusIndex={setFocusedMethodIndex}
                  cardRefs={methodCardRefs}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {stripeSetupError ? (
            <div className="rounded-2xl border border-[#f1b8b8] bg-[#fff4f4] px-4 py-3 text-sm text-[#c74d4d]">
              {stripeSetupError}
            </div>
          ) : null}

          {!isCardPaymentMethod && submitError ? (
            <div className="rounded-2xl border border-[#f1b8b8] bg-[#fff4f4] px-4 py-3 text-sm text-[#c74d4d]">
              {submitError}
            </div>
          ) : null}

          {isCardPaymentMethod ? (
            isPreparingStripe ? (
              <div className="rounded-2xl border border-[#e2dbd0] bg-[#fbfaf7] px-5 py-4 text-sm text-[#4d463d]">
                Preparing secure Stripe card payment...
              </div>
            ) : stripeClientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                <StripeCardPaymentPanel
                  payfastSession={payfastSession}
                  paymentMethodLabel={selectedMethodLabel}
                  onReturnToCheckout={handleReturnToCheckout}
                  onFinalizeOrder={handleFinalizeStripeOrder}
                />
              </Elements>
            ) : null
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={handleReturnToCheckout} className="rounded-2xl border border-[#d9d1c6] bg-white px-5 py-3 text-sm font-semibold text-[#4d463d] transition hover:border-[#1f1f1f] hover:text-[#1f1f1f]">
                Cancel Payment
              </button>
              <button type="button" disabled={isSubmitting} onClick={handleCompletePayment} className={`${cudyBluePrimaryButtonClassName} rounded-2xl bg-[#1a73e8] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70`}>
                {isSubmitting ? 'Processing payment...' : `Pay ${formatCheckoutAmount(payfastSession.totals.total)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </MinimalCheckoutShell>
  );
};

const OrdersPage = ({ orders, cartItems, onCancelOrder }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [cancellingOrderId, setCancellingOrderId] = useState('');
  const [cancelError, setCancelError] = useState('');

  const handleCancelOrder = async (orderId) => {
    if (!onCancelOrder) {
      return;
    }

    setCancelError('');
    setCancellingOrderId(orderId);
    const result = await onCancelOrder(orderId);

    if (result?.error) {
      setCancelError(result.error);
    }

    setCancellingOrderId('');
  };

  return (
  <PageFrame title={t('orders.title')} subtitle={t('orders.subtitle')}>
    {!orders.length ? (
      <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-4 text-sm text-[var(--svs-text)]">
        <p>{t('orders.empty')}</p>
        {cartItems.length ? (
          <Link to="/checkout" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
            Continue to Checkout
          </Link>
        ) : null}
      </div>
    ) : (
      <div className="space-y-4">
        {location.state?.reference ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Order {location.state.reference} was placed successfully.{location.state.guestCheckout ? ' Guest checkout details were captured for this purchase.' : ''}
          </div>
        ) : null}
        {cancelError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{cancelError}</div>
        ) : null}
        {cartItems.length ? (
          <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-4 text-sm text-[var(--svs-text)]">
            You still have {getCartCount(cartItems)} item{getCartCount(cartItems) === 1 ? '' : 's'} in your cart.
            <Link to="/checkout" className="ml-2 font-semibold text-[var(--svs-primary-strong)] underline">Review cart</Link>
          </div>
        ) : null}
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[var(--svs-text)]">Order {order.reference}</h3>
                <p className="mt-1 text-sm text-[var(--svs-muted)]">Placed on {formatDate(order.createdAt)}</p>
                <p className="mt-1 text-sm text-[var(--svs-muted)]">{order.customer.fullName} • {order.customer.email || order.customer.contact || order.customer.phone || 'Guest checkout'}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                {order.status}
              </span>
            </div>

            {order.status === 'Refund Pending' ? (
              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
                Refund has been initiated. If funds have not reflected yet, please allow 3-7 business days for your bank to post the reversal.
              </div>
            ) : null}
            {order.status === 'Refund Made' ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Refund has been made by the seller. Bank reflection can still take 3-7 business days.
              </div>
            ) : null}
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={`${order.id}-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-3">
                    <div>
                      <p className="font-semibold text-[var(--svs-text)]">{item.title}</p>
                      <p className="text-sm text-[var(--svs-muted)]">{item.marketName}</p>
                      {item.details ? <p className="text-sm text-[var(--svs-muted)]">{item.details}</p> : null}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-[var(--svs-text)]">x{item.quantity}</p>
                      <p className="text-[var(--svs-primary-strong)]">{formatCheckoutAmount(item.unitPrice * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--svs-muted)]">Summary</h4>
                <div className="mt-3 space-y-2 text-sm text-[var(--svs-muted)]">
                  <div className="flex items-center justify-between"><span>Payment</span><span>{order.paymentMethod}</span></div>
                  <div className="flex items-center justify-between"><span>Payment status</span><span className="capitalize">{order.paymentStatus || 'pending'}</span></div>
                  {order.paymentReference ? <div className="flex items-center justify-between"><span>Reference</span><span>{order.paymentReference}</span></div> : null}
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCheckoutAmount(order.subtotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Delivery & fees</span><span>{formatCheckoutAmount(order.serviceFee)}</span></div>
                  <div className="flex items-center justify-between border-t border-[var(--svs-border)] pt-3 text-base font-bold text-[var(--svs-text)]"><span>Total</span><span>{formatCheckoutAmount(order.total)}</span></div>
                </div>
                <div className="mt-4 border-t border-[var(--svs-border)] pt-3">
                  {canBuyerCancelOrder(order.status) ? (
                    <button
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrderId === order.id}
                      className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  ) : (
                    <p className="text-xs text-[var(--svs-muted)]">
                      Cancellation is only available before the order is shipped.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    )}
  </PageFrame>
  );
};

const SimpleContentPage = ({ title, description }) => (
  <PageFrame title={title} subtitle={description}>
    <p className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-4 text-sm text-[var(--svs-text)]">Content coming soon.</p>
  </PageFrame>
);

const PageFrame = ({ title, subtitle, children, darkHero = false, heroImage = '', heroImages = [], heroMediaClassName = '', heroOverlayClassName = '', titleClassName = '', subtitleClassName = '', sectionClassName = '', heroWrapperClassName = '', contentWrapperClassName = '', heroContainerClassName = '', heroContentClassName = '' }) => (
  <section className={`${darkHero ? 'bg-[#121212] text-white' : 'bg-[var(--svs-bg)] text-[var(--svs-text)]'} px-4 py-8 sm:py-10 ${sectionClassName}`.trim()}>
    <div className={`${heroWrapperClassName || 'mx-auto w-full max-w-7xl'}`.trim()}>
      <div className={`${darkHero ? 'border-[#2a2a2a] bg-[#1e1e1e]' : 'border-[var(--svs-border)] bg-[var(--svs-surface)]'} relative overflow-hidden rounded-2xl border p-6 shadow-[0_4px_8px_rgba(0,0,0,0.1)] ${heroContainerClassName}`.trim()}>
        {heroImages.length ? (
          <>
            <div className="absolute inset-0 grid grid-cols-3" aria-hidden="true">
              {heroImages.slice(0, 3).map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  className="h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              ))}
            </div>
            <div
              className={`absolute inset-0 ${heroOverlayClassName || (darkHero ? 'bg-gradient-to-r from-[#121212]/95 via-[#121212]/82 to-[#121212]/70' : 'bg-gradient-to-r from-white/95 via-white/88 to-white/72')}`}
              aria-hidden="true"
            />
          </>
        ) : heroImage ? (
          <>
            <div
              className={`absolute inset-0 bg-cover bg-center opacity-30 ${heroMediaClassName}`.trim()}
              style={{ backgroundImage: `url(${heroImage})` }}
              aria-hidden="true"
            />
            <div
              className={`absolute inset-0 ${heroOverlayClassName || (darkHero ? 'bg-gradient-to-r from-[#121212]/95 via-[#121212]/82 to-[#121212]/70' : 'bg-gradient-to-r from-white/95 via-white/88 to-white/72')}`}
              aria-hidden="true"
            />
          </>
        ) : null}
        <div className={`relative z-10 ${heroContentClassName}`.trim()}>
          <h1 className={`text-3xl font-bold sm:text-4xl ${titleClassName}`.trim()}>{title}</h1>
          <p className={`${darkHero ? 'text-slate-300' : 'text-[var(--svs-muted)]'} mt-2 text-sm sm:text-base ${subtitleClassName}`.trim()}>{subtitle}</p>
        </div>
      </div>
    </div>
    <div className={`${contentWrapperClassName || 'mx-auto mt-5 w-full max-w-7xl'} ${contentWrapperClassName ? 'mt-5' : ''}`.trim()}>{children}</div>
  </section>
);

const ItemDetailsModal = ({
  item,
  onClose,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted = false,
  reviews = [],
  isLoadingReviews = false,
  onSubmitReview,
  currentReviewerName = '',
  currentReviewerEmail = '',
  reviewNotice = '',
}) => {
  const itemImages = useMemo(() => {
    const rawImages = Array.isArray(item?.images) ? item.images : [];
    const cleanImages = rawImages.filter((url) => typeof url === 'string' && url.trim());

    if (cleanImages.length) {
      return cleanImages;
    }

    return item?.image ? [item.image] : [];
  }, [item]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isReviewSectionOpen, setIsReviewSectionOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState(currentReviewerName);
  const [reviewError, setReviewError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const touchStartXRef = useRef(null);
  const itemReviewKey = useMemo(() => getProductReviewItemKey(item), [item]);
  const isAuthenticatedReviewer = Boolean(normalizeEmail(currentReviewerEmail));
  const averageRating = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : null;
  const stockSource = item?.availableQuantity ?? item?.cartItem?.availableQuantity;
  const hasStockValue = stockSource !== null && stockSource !== undefined;
  const availableQuantity = hasStockValue ? normalizeListingQuantity(stockSource, 0) : null;
  const isOutOfStock = availableQuantity !== null && availableQuantity <= 0;

  useEffect(() => {
    setCurrentImageIndex(0);
    setIsReviewSectionOpen(false);
    setRating(0);
    setComment('');
    setReviewError('');
    setReviewerName(currentReviewerName);
  }, [item, currentReviewerName]);

  if (!item) {
    return null;
  }

  const currentImage = itemImages[currentImageIndex] || '';
  const hasMultipleImages = itemImages.length > 1;

  const showPreviousImage = () => {
    if (!itemImages.length) {
      return;
    }

    setCurrentImageIndex((currentIndex) => ((currentIndex - 1 + itemImages.length) % itemImages.length));
  };

  const showNextImage = () => {
    if (!itemImages.length) {
      return;
    }

    setCurrentImageIndex((currentIndex) => ((currentIndex + 1) % itemImages.length));
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const touchEndX = event.changedTouches?.[0]?.clientX ?? null;
    const touchStartX = touchStartXRef.current;

    if (touchStartX === null || touchEndX === null || !hasMultipleImages) {
      touchStartXRef.current = null;
      return;
    }

    const deltaX = touchEndX - touchStartX;
    const swipeThreshold = 35;

    if (deltaX > swipeThreshold) {
      showPreviousImage();
    } else if (deltaX < -swipeThreshold) {
      showNextImage();
    }

    touchStartXRef.current = null;
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    const nextReviewerName = isAuthenticatedReviewer ? currentReviewerName : reviewerName;
    const normalizedComment = normalizeReviewComment(comment);

    if (!isAuthenticatedReviewer && !String(nextReviewerName || '').trim()) {
      setReviewError('Add your name before posting a review.');
      return;
    }

    if (rating === 0) {
      setReviewError('Tap a star to choose your rating before posting.');
      return;
    }

    if (normalizedComment.length < 6) {
      setReviewError('Write a slightly longer review so other shoppers can use it.');
      return;
    }

    if (!itemReviewKey) {
      setReviewError('This item cannot receive reviews yet.');
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError('');
      await onSubmitReview?.({
        itemKey: itemReviewKey,
        rating,
        comment: normalizedComment,
        reviewerName: nextReviewerName,
        reviewerEmail: currentReviewerEmail,
      });
      setComment('');
      setRating(0);
      if (!isAuthenticatedReviewer) {
        setReviewerName(nextReviewerName);
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Could not publish this review right now.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Item details"
    >
      <div
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--svs-border)] px-5 py-4">
          <h2 className="text-xl font-bold text-[var(--svs-text)]">{item.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-2 text-[var(--svs-text)]"
            aria-label="Close item details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-2">
            <div className="relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={`${item.title} ${currentImageIndex + 1}`}
                  className="h-auto max-h-[70vh] w-full rounded-lg object-contain"
                  loading="eager"
                />
              ) : (
                <div className="flex h-56 items-center justify-center rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface)] text-sm text-[var(--svs-muted)]">
                  No image available
                </div>
              )}

              {hasMultipleImages ? (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--svs-border)] bg-white/90 p-1.5 text-[var(--svs-text)]"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[var(--svs-border)] bg-white/90 p-1.5 text-[var(--svs-text)]"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>

            {hasMultipleImages ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {itemImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full ${index === currentImageIndex ? 'bg-[var(--svs-primary)]' : 'bg-slate-300'}`}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--svs-primary-strong)]">{item.marketName}</p>
            {item.priceLabel ? (
              <p className="mt-2 text-base font-semibold text-[var(--svs-primary-strong)]">{item.priceLabel}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--svs-muted)]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--svs-surface-soft)] px-3 py-1 font-semibold text-[var(--svs-text)]">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {averageRating || 'New'}
              </span>
              <span>{reviews.length ? `${reviews.length} public review${reviews.length === 1 ? '' : 's'}` : 'No public reviews yet'}</span>
            </div>
            {item.details ? (
              <p className="mt-3 text-sm leading-6 text-[var(--svs-muted)]">{item.details}</p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--svs-muted)]">No additional details available for this item yet.</p>
            )}
            {availableQuantity !== null ? (
              <p className="mt-2 text-sm text-[var(--svs-muted)]">
                Quantity available: <span className="font-semibold text-[var(--svs-text)]">{availableQuantity}</span>
                {isOutOfStock ? ' (Out of stock - wishlist only)' : ''}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {item.cartItem ? (
                <>
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => onAddToCart(item.cartItem)}
                    className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400`}
                  >
                    {isOutOfStock ? 'Out of stock' : 'Add to cart'}
                  </button>
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => onBuyNow?.(item.cartItem)}
                    className="rounded-md bg-[#111111] px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isOutOfStock ? 'Out of stock' : 'Buy it now'}
                  </button>
                </>
              ) : null}
              {item.wishlistItem ? (
                <button
                  type="button"
                  onClick={() => onToggleWishlist(item.wishlistItem)}
                  className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold ${isWishlisted ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-[var(--svs-border)] bg-[var(--svs-surface-soft)] text-[var(--svs-text)]'}`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
                  {isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                </button>
              ) : null}
            </div>

            <section className="mt-6 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
              <button
                type="button"
                onClick={() => setIsReviewSectionOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 text-left"
                aria-expanded={isReviewSectionOpen}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${averageRating && s <= Math.round(Number(averageRating)) ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[var(--svs-text)]">
                    {averageRating ? `${averageRating} · ` : ''}
                    {reviews.length ? `${reviews.length} review${reviews.length === 1 ? '' : 's'}` : 'No reviews yet'}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-semibold text-[var(--svs-primary)] underline underline-offset-2">
                  {isReviewSectionOpen ? 'Hide' : 'Write a review'}
                </span>
              </button>

              {isReviewSectionOpen ? (
              <>
              <form className="mt-4 space-y-3" onSubmit={handleSubmitReview}>
                {!isAuthenticatedReviewer ? (
                  <label className="block text-sm font-medium text-[var(--svs-text)]">
                    Your name
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(event) => setReviewerName(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/40"
                      maxLength={50}
                      placeholder="Public display name"
                    />
                  </label>
                ) : (
                  <p className="text-sm text-[var(--svs-muted)]">Posting as <span className="font-semibold text-[var(--svs-text)]">{normalizeReviewerName(currentReviewerName, currentReviewerEmail)}</span></p>
                )}

                <div>
                  <p className="text-sm font-medium text-[var(--svs-text)]">Your rating</p>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setRating(starValue)}
                        className="rounded-full p-1 text-amber-400 transition hover:scale-110"
                        aria-label={`Rate ${starValue} star${starValue === 1 ? '' : 's'}`}
                      >
                        <Star className={`h-5 w-5 ${starValue <= rating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block text-sm font-medium text-[var(--svs-text)]">
                  Your review
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="mt-1 min-h-28 w-full rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none focus:border-[var(--svs-primary)] focus:ring-2 focus:ring-[#33b9f2]/40"
                    maxLength={400}
                    placeholder="Tell other shoppers what you liked, how it arrived, or how it performs."
                  />
                </label>

                {reviewError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{reviewError}</p>
                ) : null}
                {reviewNotice ? (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{reviewNotice}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`${cudyBluePrimaryButtonClassName} rounded-xl bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isSubmittingReview ? 'Publishing review...' : 'Publish review'}
                </button>
              </form>

              <div className="mt-5 space-y-3">
                {isLoadingReviews ? (
                  <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-4 text-sm text-[var(--svs-muted)]">Loading reviews...</div>
                ) : reviews.length ? (
                  reviews.map((review) => (
                    <article key={review.id} className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[var(--svs-text)]">{review.reviewerName}</p>
                          <div className="mt-1 flex items-center gap-1 text-amber-400">
                            {[1, 2, 3, 4, 5].map((starValue) => (
                              <Star key={starValue} className={`h-4 w-4 ${starValue <= review.rating ? 'fill-current' : ''}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[var(--svs-muted)]">{formatDate(review.createdAt)}</p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--svs-muted)]">{review.comment}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-4 text-sm text-[var(--svs-muted)]">Be the first to share a review for this product.</div>
                )}
              </div>
              </>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const CardGrid = ({ items, buttonLabel, secondaryButtonLabel, metaRenderer, onPrimaryAction, onBuyNowAction, onToggleWishlist, isItemWishlisted, onOpenItemDetails, reviewSummaryMap = {}, getItemReviewKey }) => {
  const { t } = useTranslation();
  const {
    filteredItems,
    hasActivePriceFilter,
    isPriceFilterOpen,
    minPriceInput,
    maxPriceInput,
    minimumAvailablePrice,
    maximumAvailablePrice,
    sliderMinValue,
    sliderMaxValue,
    sliderStep,
    setIsPriceFilterOpen,
    handleMinPriceChange,
    handleMaxPriceChange,
    handleClearPriceFilter,
    handleSliderMinimumChange,
    handleSliderMaximumChange,
  } = useMarketplacePriceFilter(items);

  return (
    <>
      <PriceFilterPanel
        filteredCount={filteredItems.length}
        totalCount={items.length}
        isPriceFilterOpen={isPriceFilterOpen}
        onToggleOpen={() => setIsPriceFilterOpen((currentValue) => !currentValue)}
        minPriceInput={minPriceInput}
        maxPriceInput={maxPriceInput}
        onMinPriceChange={handleMinPriceChange}
        onMaxPriceChange={handleMaxPriceChange}
        onClearPriceFilter={handleClearPriceFilter}
        hasActivePriceFilter={hasActivePriceFilter}
        minimumAvailablePrice={minimumAvailablePrice}
        maximumAvailablePrice={maximumAvailablePrice}
        sliderMinValue={sliderMinValue}
        sliderMaxValue={sliderMaxValue}
        sliderStep={sliderStep}
        onSliderMinimumChange={handleSliderMinimumChange}
        onSliderMaximumChange={handleSliderMaximumChange}
      />
      {filteredItems.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredItems.map((item) => {
        const itemTitle = getTranslatedValue(t, item.titleKey, item.title);
        const hasStockValue = item.availableQuantity !== null && item.availableQuantity !== undefined;
        const availableQuantity = hasStockValue ? normalizeListingQuantity(item.availableQuantity, 0) : null;
        const isOutOfStock = availableQuantity !== null && availableQuantity <= 0;
        const itemReviewKey = getItemReviewKey?.(item);
        const reviewSummary = getProductReviewSummary(reviewSummaryMap, itemReviewKey);
        const averageRatingLabel = reviewSummary.reviewCount ? reviewSummary.averageRating.toFixed(1) : '0.0';
        const reviewCountLabel = `${reviewSummary.reviewCount} review${reviewSummary.reviewCount === 1 ? '' : 's'}`;

        return (
          <article
            key={item.id}
            className="overflow-hidden rounded-xl border border-[var(--svs-border)] bg-[var(--svs-card-bg)] shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition hover:scale-[1.03]"
            role="button"
            tabIndex={0}
            onClick={() => onOpenItemDetails?.(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenItemDetails?.(item);
              }
            }}
          >
            <div className="relative">
              <img src={item.image} alt={itemTitle} className="h-40 w-full object-cover" loading="lazy" />
              {onToggleWishlist ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleWishlist(item);
                  }}
                  aria-pressed={isItemWishlisted?.(item) || false}
                  aria-label={isItemWishlisted?.(item) ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`absolute right-3 top-3 rounded-full border p-2 transition ${isItemWishlisted?.(item) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-white/70 bg-white/90 text-slate-700 hover:bg-white'}`}
                >
                  <Heart className={`h-4 w-4 ${isItemWishlisted?.(item) ? 'fill-current' : ''}`} />
                </button>
              ) : null}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-bold">{itemTitle}</h3>
              <div className="mt-1">{metaRenderer(item)}</div>
              {availableQuantity !== null ? (
                <p className="mt-1 text-xs text-[var(--svs-muted)]">
                  Quantity: {availableQuantity}
                  {isOutOfStock ? ' (Out of stock - wishlist only)' : ' available for checkout'}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPrimaryAction?.(item);
                  }}
                  className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--svs-primary-strong)] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:hover:bg-slate-400`}
                >
                  {isOutOfStock ? 'Out of stock' : buttonLabel}
                </button>
                {onBuyNowAction ? (
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={(event) => {
                      event.stopPropagation();
                      onBuyNowAction(item);
                    }}
                    className="rounded-md bg-[#111111] px-3 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400 disabled:hover:bg-slate-400"
                  >
                    {isOutOfStock ? 'Out of stock' : 'Buy it now'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenItemDetails?.(item);
                  }}
                  className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)]"
                >
                  {secondaryButtonLabel}
                </button>
                <div className="inline-flex items-center gap-1 rounded-md border border-[var(--svs-border)] bg-white px-3 py-2 text-sm text-[var(--svs-muted)]">
                  <Star className={`h-4 w-4 text-amber-500 ${reviewSummary.reviewCount ? 'fill-current' : ''}`} />
                  <span className="font-semibold text-[var(--svs-text)]">{averageRatingLabel}</span>
                  <span>{reviewCountLabel}</span>
                </div>
              </div>
            </div>
          </article>
          );
        })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--svs-border)] bg-[var(--svs-surface)] px-4 py-8 text-sm text-[var(--svs-muted)]">
          No items match that price range yet. Adjust the minimum or maximum price to see more results.
        </div>
      )}
    </>
  );
};

const SiteFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gradient-to-b from-[#0c2a32] to-[#0f6674] text-white">
      {/* ── Main Footer Grid ── */}
      <div className="mx-auto w-full max-w-7xl px-6 pt-[60px] pb-10 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 – Brand */}
          <div>
            <h3 className="text-xl font-bold">SVS E-Commerce</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              {t('site.tagline', { defaultValue: 'Your one-stop marketplace for everything you need – from groceries to tickets!' })}
            </p>
            <p className="mt-3 text-sm text-slate-300">{t('site.address')}</p>
            {/* Social icons */}
            <div className="mt-5 flex items-center gap-3">
              {/* Facebook */}
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white transition hover:text-cyan-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
              </a>
              {/* X / Twitter */}
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-white transition hover:text-cyan-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              {/* LinkedIn */}
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-white transition hover:text-cyan-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              {/* Instagram */}
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white transition hover:text-cyan-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
              {/* YouTube */}
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-white transition hover:text-cyan-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
              {/* WhatsApp */}
              <a href="https://wa.me" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-white transition hover:text-cyan-200">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </a>
            </div>
          </div>

          {/* Column 2 – Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{t('footer.quickLinks')}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {footerLinks.quick.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-slate-200 transition hover:text-white hover:underline">{t(item.labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 – Support */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{t('footer.support')}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {footerLinks.support.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-slate-200 transition hover:text-white hover:underline">{t(item.labelKey)}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 – Subscribe to Offers */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide">{t('footer.subscribe')}</h4>
            <p className="mt-3 text-sm text-slate-300">{t('footer.subscribeText')}</p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder={t('footer.subscribePlaceholder')}
                className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-300 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                aria-label={t('footer.subscribeAria')}
              />
              <button
                type="button"
                className={`${cudyBluePrimaryButtonClassName} shrink-0 rounded-full bg-[var(--svs-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0088b8]`}
              >
                Subscribe
              </button>
            </div>
            {/* Small social circles */}
            <div className="mt-4 flex items-center gap-2.5">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/15 bg-[#082028]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-slate-300 sm:px-8">
          <p>{t('footer.est')}</p>
          <p className="hidden text-center sm:block">{t('site.address')}</p>
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            {t('footer.securePayments')}
          </p>
        </div>
      </div>
    </footer>
  );
};

const AppRoutes = ({ cartItems, wishlistItems, wishlistItemIds, orders, sellerItems, buyNowCheckout, productReviewSummaryMap, onAddToCart, onBuyNow, onToggleWishlist, onRemoveWishlistItem, onUpdateCartQuantity, onRemoveCartItem, onPlaceOrder, onClearBuyNowCheckout, onCancelOrder, onSellerItemCreated, onDeleteSellerItem, onUpdateSellerItem, onUpdateOrderStatus, onOpenItemDetails }) => {
  const { t } = useTranslation();

  return (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/markets" element={<MarketsPage />} />
    <Route path="/offers" element={<OffersPage />} />
    <Route path="/orders" element={<OrdersPage orders={orders} cartItems={cartItems} onCancelOrder={onCancelOrder} />} />
    <Route path="/wishlist" element={<WishlistPage wishlistItems={wishlistItems} onAddToCart={onAddToCart} onRemoveWishlistItem={onRemoveWishlistItem} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/checkout" element={<CheckoutPage cartItems={cartItems} buyNowCheckout={buyNowCheckout} onUpdateCartQuantity={onUpdateCartQuantity} onRemoveCartItem={onRemoveCartItem} onClearBuyNowCheckout={onClearBuyNowCheckout} />} />
    <Route path="/checkout/payfast" element={<PayfastCheckoutPage buyNowCheckout={buyNowCheckout} onPlaceOrder={onPlaceOrder} onClearBuyNowCheckout={onClearBuyNowCheckout} />} />
    <Route path="/search" element={<SearchResultsPage />} />

    <Route path="/e-commerce" element={<ECommercePage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/tickets" element={<TicketsPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/bookings-tickets" element={<BookingsTicketsPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/movie/:movieId" element={<MovieDetailsPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} />} />
    <Route path="/voting-clients" element={<VotingClientsPage />} />
    <Route path="/voting-providers" element={<VotingProvidersPage />} />
    <Route path="/groceries" element={<GroceriesPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/groceries/:categoryKey" element={<GroceriesPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/fast-food" element={<FastFoodPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/beverages-liquors" element={<BeveragesLiquorsPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/building-construction-tools" element={<ConstructionToolsPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/fashion-style" element={<FashionStylePage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/traditional-medicines-herbs" element={<TraditionalMedicinesPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/wellness" element={<WellnessPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/stationery-office" element={<StationeryPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/home-care" element={<HomeCarePage />} />
    <Route path="/hardware-software" element={<HardwareSoftwarePage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/mobility-vehicles" element={<MobilityVehiclesPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/natural-resources-minerals" element={<NaturalResourcesPage onAddToCart={onAddToCart} onBuyNow={onBuyNow} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} productReviewSummaryMap={productReviewSummaryMap} />} />
    <Route path="/seller/upload" element={<SellerUploadPage onSellerItemCreated={onSellerItemCreated} />} />
    <Route path="/seller/dashboard" element={<SellerDashboardPage orders={orders} onDeleteSellerItem={onDeleteSellerItem} onUpdateSellerItem={onUpdateSellerItem} onUpdateOrderStatus={onUpdateOrderStatus} initialView="listings" />} />
    <Route path="/seller/orders" element={<SellerDashboardPage orders={orders} onDeleteSellerItem={onDeleteSellerItem} onUpdateSellerItem={onUpdateSellerItem} onUpdateOrderStatus={onUpdateOrderStatus} initialView="orders" />} />
    <Route path="/property-hub" element={<PropertyHubPage />} />
    <Route path="/betting-lottery-games" element={<BettingLotteryGamesPage />} />
    <Route path="/international-lottery-games" element={<Navigate to="/betting-lottery-games" replace />} />
    <Route path="/livestock-hub" element={<LivestockHubPage />} />
    <Route path="/betting-hub" element={<Navigate to="/betting-lottery-games" replace />} />
    <Route path="/betting-voting" element={<Navigate to="/betting-lottery-games" replace />} />
    <Route path="/safety" element={<SafetyPage />} />

    <Route path="/signin" element={<SigninPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/sell" element={<SellerLandingPage />} />
    <Route path="/sell/signin" element={<SellerSigninPage />} />
    <Route path="/sell/signup" element={<SellerSignupPage />} />
    <Route path="/sell/onboarding" element={<SellerOnboardingPage />} />

    <Route path="/about" element={<SimpleContentPage title={t('footer.about')} description={t('simplePages.about')} />} />
    <Route path="/blog" element={<SimpleContentPage title={t('footer.blog')} description={t('simplePages.blog')} />} />
    <Route path="/careers" element={<SimpleContentPage title={t('footer.careers')} description={t('simplePages.careers')} />} />
    <Route path="/help" element={<SimpleContentPage title={t('footer.help')} description={t('simplePages.help')} />} />
    <Route path="/contact" element={<SimpleContentPage title={t('footer.contact')} description={t('simplePages.contact')} />} />
    <Route path="/terms" element={<SimpleContentPage title={t('footer.terms')} description={t('simplePages.terms')} />} />
    <Route path="/privacy" element={<SimpleContentPage title={t('footer.privacy')} description={t('simplePages.privacy')} />} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  );
};

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState(getStoredCartItems);
  const [wishlistItems, setWishlistItems] = useState(getStoredWishlistItems(getCurrentUserEmail()));
  const [orders, setOrders] = useState(getStoredOrders);
  const [notifications, setNotifications] = useState(getStoredNotifications);
  const [sellerItems, setSellerItems] = useState([]);
  const [productReviews, setProductReviews] = useState([]);
  const [productReviewSummaryMap, setProductReviewSummaryMap] = useState(() => buildProductReviewSummaryMap(getStoredProductReviews()));
  const [isLoadingProductReviews, setIsLoadingProductReviews] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [activeUserEmail, setActiveUserEmail] = useState(getCurrentUserEmail);
  const [hasLoadedUserCollections, setHasLoadedUserCollections] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const [buyNowCheckout, setBuyNowCheckout] = useState(null);
  const skipNextOrderSyncRef = useRef(false);
  const normalizedActiveUserEmail = useMemo(() => normalizeEmail(activeUserEmail), [activeUserEmail]);
  const scopedOrders = useMemo(() => orders.filter((order) => {
    if (!normalizedActiveUserEmail) {
      return true;
    }

    return normalizeEmail(order.ownerEmail || order.customer?.email) === normalizedActiveUserEmail;
  }), [orders, normalizedActiveUserEmail]);
  const wishlistItemIds = useMemo(() => wishlistItems.map((item) => item.id), [wishlistItems]);
  const selectedItemReviewKey = useMemo(() => getProductReviewItemKey(selectedItemDetails), [selectedItemDetails]);
  const currentReviewerName = typeof window === 'undefined'
    ? ''
    : (window.localStorage.getItem('svs-user-name') || '');
  const isDetailsItemWishlisted = useMemo(() => {
    if (!selectedItemDetails?.wishlistItem?.id) {
      return false;
    }

    return wishlistItemIds.includes(selectedItemDetails.wishlistItem.id);
  }, [selectedItemDetails, wishlistItemIds]);

  useEffect(() => {
    const handleAuthChange = () => {
      setActiveUserEmail(getCurrentUserEmail());
    };

    window.addEventListener('svs-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('svs-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (!getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      setNotifications(getStoredNotifications(activeUserEmail));
      return;
    }

    let isCancelled = false;

    const loadRemoteNotifications = async () => {
      const normalizedUserEmail = normalizeEmail(activeUserEmail);

      if (!normalizedUserEmail) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from(NOTIFICATIONS_TABLE)
        .select('id, user_email, notification_key, type, title, message, href, order_id, is_read, created_at')
        .eq('user_email', normalizedUserEmail)
        .order('created_at', { ascending: false })
        .limit(80);

      if (isCancelled) {
        return;
      }

      if (error) {
        // Keep notifications working even if the remote table/policies are unavailable.
        setNotifications(getStoredNotifications(normalizedUserEmail));
        return;
      }

      setNotifications((data || []).map(mapNotificationRecord));
    };

    loadRemoteNotifications();

    const normalizedUserEmail = normalizeEmail(activeUserEmail);
    const channel = supabase
      .channel(`svs-notifications-${normalizedUserEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: NOTIFICATIONS_TABLE,
          filter: `user_email=eq.${normalizedUserEmail}`,
        },
        (payload) => {
          if (isCancelled) {
            return;
          }

          if (payload.eventType === 'DELETE') {
            const deletedRecord = payload.old || {};
            const deletedKey = String(deletedRecord.notification_key || deletedRecord.id || '');

            setNotifications((current) => current.filter((notification) => notification.id !== deletedKey));
            return;
          }

          const mapped = mapNotificationRecord(payload.new || {});

          setNotifications((current) => {
            const existingIndex = current.findIndex((notification) => notification.id === mapped.id);

            if (existingIndex === -1) {
              return [mapped, ...current].slice(0, 80);
            }

            const next = [...current];
            next[existingIndex] = { ...next[existingIndex], ...mapped };
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeUserEmail]);

  useEffect(() => {
    if (!reviewNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setReviewNotice('');
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [reviewNotice]);

  useEffect(() => {
    window.localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    window.localStorage.setItem(getUserScopedStorageKey(NOTIFICATIONS_STORAGE_KEY, activeUserEmail), JSON.stringify(notifications));
  }, [activeUserEmail, notifications]);

  const pushNotificationToUser = useCallback((userEmail, notificationPayload) => {
    const notification = createNotificationRecord(notificationPayload);
    const normalizedTargetEmail = normalizeEmail(userEmail);

    if (!normalizedTargetEmail) {
      return;
    }

    if (normalizedTargetEmail === normalizeEmail(activeUserEmail)) {
      setNotifications((currentNotifications) => [notification, ...currentNotifications].slice(0, 80));
    }

    if (hasSupabaseEnv && supabase) {
      supabase
        .from(NOTIFICATIONS_TABLE)
        .upsert([toNotificationRecord(normalizedTargetEmail, notification)], { onConflict: 'user_email,notification_key' })
        .then(({ error }) => {
          if (!error) {
            return;
          }

          // Fallback path when remote write fails.
          if (normalizedTargetEmail !== normalizeEmail(activeUserEmail)) {
            pushNotificationToStorage(normalizedTargetEmail, notification);
          }
        });

      return;
    }

    if (normalizedTargetEmail !== normalizeEmail(activeUserEmail)) {
      pushNotificationToStorage(normalizedTargetEmail, notification);
    }
  }, [activeUserEmail]);

  const handleClearNotifications = useCallback(async () => {
    setNotifications([]);

    if (getAuthState() && activeUserEmail && hasSupabaseEnv && supabase) {
      await supabase
        .from(NOTIFICATIONS_TABLE)
        .delete()
        .eq('user_email', normalizeEmail(activeUserEmail));
    }
  }, [activeUserEmail]);

  const markNotificationsAsRead = useCallback(() => {
    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);

    setNotifications((currentNotifications) => currentNotifications.map((notification) => (
      notification.read ? notification : { ...notification, read: true }
    )));

    if (unreadIds.length && getAuthState() && activeUserEmail && hasSupabaseEnv && supabase) {
      supabase
        .from(NOTIFICATIONS_TABLE)
        .update({ is_read: true })
        .eq('user_email', normalizeEmail(activeUserEmail))
        .in('notification_key', unreadIds);
    }
  }, [activeUserEmail, notifications]);

  useEffect(() => {
    // Remove old shared keys so cart/wishlist no longer leak between users.
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.removeItem(WISHLIST_STORAGE_KEY);

    window.localStorage.setItem(getUserScopedStorageKey(CART_STORAGE_KEY, activeUserEmail), JSON.stringify(cartItems));
  }, [activeUserEmail, cartItems]);

  useEffect(() => {
    window.localStorage.setItem(getUserScopedStorageKey(WISHLIST_STORAGE_KEY, activeUserEmail), JSON.stringify(wishlistItems));
  }, [activeUserEmail, wishlistItems]);

  useEffect(() => {
    // Remove old shared key so orders no longer leak between users.
    window.localStorage.removeItem(ORDERS_STORAGE_KEY);

    // Only save orders if they belong to the current user (safety check for account switches)
    const normalizedEmail = normalizeEmail(activeUserEmail);
    const expectedOwnerEmail = normalizedEmail || GUEST_ORDER_EMAIL;
    const allOrdersBelongToUser = orders.length === 0 || orders.every((order) => {
      const orderOwnerEmail = normalizeEmail(order.ownerEmail || '');
      return orderOwnerEmail === expectedOwnerEmail;
    });
    
    if (allOrdersBelongToUser) {
      window.localStorage.setItem(getUserScopedStorageKey(ORDERS_STORAGE_KEY, activeUserEmail), JSON.stringify(orders));
    }
  }, [activeUserEmail, orders]);

  const replaceOrdersFromRemote = useCallback((nextOrders) => {
    skipNextOrderSyncRef.current = true;
    setOrders(nextOrders);
  }, []);

  const refreshOrdersFromRemote = useCallback(async (userEmail = activeUserEmail) => {
    if (!getAuthState() || !userEmail || !hasSupabaseEnv || !supabase) {
      return false;
    }

    const normalizedUserEmail = normalizeEmail(userEmail);

    if (!normalizedUserEmail) {
      return false;
    }

    const { data, error } = await supabase
      .from(ORDERS_TABLE)
      .select('user_email, order_key, reference, order_created_at, customer, items, payment_method, payment_provider, payment_status, payment_reference, currency, subtotal, service_fee, total, status')
      .eq('user_email', normalizedUserEmail)
      .order('order_created_at', { ascending: false });

    if (error) {
      return false;
    }

    replaceOrdersFromRemote((data || []).map(mapOrderRecord));
    return true;
  }, [activeUserEmail, replaceOrdersFromRemote]);

  useEffect(() => {
    if (!hasLoadedUserCollections || !getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      return;
    }

    if (skipNextOrderSyncRef.current) {
      skipNextOrderSyncRef.current = false;
      return;
    }

    const userEmail = normalizeEmail(activeUserEmail);

    if (!userEmail) {
      return;
    }

    const syncOrdersToRemote = async () => {
      const records = orders.map((order) => toOrderRecord(userEmail, order));

      if (!records.length) {
        await supabase.from(ORDERS_TABLE).delete().eq('user_email', userEmail);
        return;
      }

      const { error: upsertError } = await supabase
        .from(ORDERS_TABLE)
        .upsert(records, { onConflict: 'user_email,order_key' });

      if (upsertError) {
        return;
      }

      const { data: existingRows, error: fetchError } = await supabase
        .from(ORDERS_TABLE)
        .select('order_key')
        .eq('user_email', userEmail);

      if (fetchError) {
        return;
      }

      const nextOrderKeys = new Set(records.map((record) => record.order_key));
      const keysToDelete = (existingRows || [])
        .map((row) => row.order_key)
        .filter((orderKey) => !nextOrderKeys.has(orderKey));

      if (!keysToDelete.length) {
        return;
      }

      await supabase
        .from(ORDERS_TABLE)
        .delete()
        .eq('user_email', userEmail)
        .in('order_key', keysToDelete);
    };

    syncOrdersToRemote();
  }, [activeUserEmail, hasLoadedUserCollections, orders]);

  useEffect(() => {
    // Pause remote sync immediately while switching users to avoid pushing stale empty data.
    setHasLoadedUserCollections(false);
    skipNextOrderSyncRef.current = true; // Prevent sync from overwriting just-cleared data

    const localCartItems = getStoredCartItems(activeUserEmail);
    const localWishlistItems = getStoredWishlistItems(activeUserEmail);
    const localOrders = getStoredOrders(activeUserEmail);

    // Clear previous user's state immediately before loading the current user's records.
    setCartItems([]);
    setWishlistItems([]);
    setOrders([]);
    setCartItems(localCartItems);
    setWishlistItems(localWishlistItems);
    setOrders(localOrders);

    if (!getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      setHasLoadedUserCollections(true);
      return;
    }

    let isCancelled = false;

    const loadUserCollections = async () => {
      setHasLoadedUserCollections(false);

      const [cartResponse, wishlistResponse, ordersResponse] = await Promise.all([
        supabase
          .from(CART_ITEMS_TABLE)
          .select('item_key, sku, title, image_url, route, market_name, details, seller_name, seller_email, quantity, unit_price, unit_price_label')
          .eq('user_email', activeUserEmail)
          .order('created_at', { ascending: false }),
        supabase
          .from(WISHLIST_ITEMS_TABLE)
          .select('item_key, sku, title, image_url, route, market_name, details, seller_name, seller_email, unit_price, unit_price_label')
          .eq('user_email', activeUserEmail)
          .order('created_at', { ascending: false }),
        supabase
          .from(ORDERS_TABLE)
          .select('user_email, order_key, reference, order_created_at, customer, items, payment_method, payment_provider, payment_status, payment_reference, currency, subtotal, service_fee, total, status')
          .eq('user_email', normalizeEmail(activeUserEmail))
          .order('order_created_at', { ascending: false }),
      ]);

      if (isCancelled) {
        return;
      }

      if (!cartResponse.error) {
        setCartItems((cartResponse.data || []).map(mapCartItemRecord));
      }

      if (!wishlistResponse.error) {
        setWishlistItems((wishlistResponse.data || []).map(mapWishlistItemRecord));
      }

      if (!ordersResponse.error) {
        replaceOrdersFromRemote((ordersResponse.data || []).map(mapOrderRecord));
      }

      setHasLoadedUserCollections(true);
    };

    loadUserCollections();

    return () => {
      isCancelled = true;
    };
  }, [activeUserEmail, replaceOrdersFromRemote]);

  useEffect(() => {
    if (!hasLoadedUserCollections || !getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      return undefined;
    }

    let isCancelled = false;

    const refreshBuyerOrders = async () => {
      const refreshed = await refreshOrdersFromRemote(activeUserEmail);

      if (isCancelled || !refreshed) {
        return;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshBuyerOrders();
      }
    };

    const intervalId = window.setInterval(refreshBuyerOrders, 15000);

    window.addEventListener('focus', refreshBuyerOrders);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshBuyerOrders);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeUserEmail, hasLoadedUserCollections, refreshOrdersFromRemote]);

  const loadSellerItems = useCallback(async () => {
    if (!hasSupabaseEnv || !supabase) {
      setSellerItems([]);
      return;
    }

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return;
    }

    setSellerItems((data || []).map(mapSellerItemRecord));
  }, []);

  useEffect(() => {
    loadSellerItems();
  }, [loadSellerItems]);

  const loadProductReviewSummaries = useCallback(async () => {
    if (!hasSupabaseEnv || !supabase) {
      setProductReviewSummaryMap(buildProductReviewSummaryMap(getStoredProductReviews()));
      return;
    }

    const { data, error } = await supabase
      .from(PRODUCT_REVIEWS_TABLE)
      .select('item_key, rating, moderation_status');

    if (error) {
      setProductReviewSummaryMap(buildProductReviewSummaryMap(getStoredProductReviews()));
      return;
    }

    setProductReviewSummaryMap(buildProductReviewSummaryMap((data || []).map((record) => ({
      itemKey: record.item_key,
      rating: record.rating,
      moderationStatus: String(record.moderation_status || 'approved'),
    }))));
  }, []);

  useEffect(() => {
    loadProductReviewSummaries();
  }, [loadProductReviewSummaries]);

  const loadReviewsForItem = useCallback(async (itemKey) => {
    if (!itemKey) {
      setProductReviews([]);
      return [];
    }

    if (!hasSupabaseEnv || !supabase) {
      const localReviews = getStoredApprovedProductReviews(itemKey);
      setProductReviews(localReviews);
      return localReviews;
    }

    setIsLoadingProductReviews(true);

    const { data, error } = await supabase
      .from(PRODUCT_REVIEWS_TABLE)
      .select('id, item_key, rating, comment, reviewer_name, reviewer_email, moderation_status, created_at')
      .eq('item_key', itemKey)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      const localReviews = getStoredApprovedProductReviews(itemKey);
      setProductReviews(localReviews);
      setIsLoadingProductReviews(false);
      return localReviews;
    }

    const nextReviews = sortProductReviews((data || []).map(mapProductReviewRecord));
    setProductReviews(nextReviews);
    setIsLoadingProductReviews(false);
    return nextReviews;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const syncReviews = async () => {
      if (!selectedItemReviewKey) {
        setProductReviews([]);
        return;
      }

      setIsLoadingProductReviews(true);
      const nextReviews = await loadReviewsForItem(selectedItemReviewKey);

      if (isCancelled) {
        return;
      }

      setProductReviews(nextReviews);
      setIsLoadingProductReviews(false);
    };

    syncReviews();

    return () => {
      isCancelled = true;
    };
  }, [loadReviewsForItem, selectedItemReviewKey]);

  // Remove background syncing for cart and wishlist. Sync only on explicit user actions below.

  const removeWishlistItemFromRemote = useCallback(async (itemId) => {
    if (!getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      return;
    }

    await supabase
      .from(WISHLIST_ITEMS_TABLE)
      .delete()
      .eq('user_email', activeUserEmail)
      .eq('item_key', itemId);
  }, [activeUserEmail]);

  const removeCartItemFromRemote = useCallback(async (itemId) => {
    if (!getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      return;
    }

    await supabase
      .from(CART_ITEMS_TABLE)
      .delete()
      .eq('user_email', activeUserEmail)
      .eq('item_key', itemId);
  }, [activeUserEmail]);

  const clearCartFromRemote = useCallback(async () => {
    if (!getAuthState() || !activeUserEmail || !hasSupabaseEnv || !supabase) {
      return;
    }

    await supabase
      .from(CART_ITEMS_TABLE)
      .delete()
      .eq('user_email', activeUserEmail);
  }, [activeUserEmail]);

  const handleAddToCart = useCallback((cartItem) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === cartItem.id);
      const availableStock = getSellerListingStock(sellerItems, cartItem);

      if (availableStock !== null) {
        const currentQuantity = existingItem ? existingItem.quantity : 0;

        if (currentQuantity >= availableStock) {
          setActionNotice(
            availableStock === 0
              ? `${cartItem.title} is out of stock. You can add it to wishlist only.`
              : `Only ${availableStock} in stock for ${cartItem.title}.`,
          );
          return currentItems;
        }
      }

      let nextItems;
      if (existingItem) {
        nextItems = currentItems.map((item) => (
          item.id === cartItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        nextItems = [...currentItems, cartItem];
      }
      // Sync to Supabase only if authenticated and valid user
      if (getAuthState() && activeUserEmail && typeof activeUserEmail === 'string' && activeUserEmail.trim() && hasSupabaseEnv && supabase) {
        syncUserCollection({
          tableName: CART_ITEMS_TABLE,
          userEmail: activeUserEmail,
          records: nextItems.map((item) => toCartItemRecord(activeUserEmail, item)),
          removeMissing: false,
        });
      }
      return nextItems;
    });
    const availableStock = getSellerListingStock(sellerItems, cartItem);
    if (availableStock === null || availableStock > 0) {
      setActionNotice(`Added to cart: ${cartItem.title}`);
    }
  }, [activeUserEmail, sellerItems]);

  const handleClearBuyNowCheckout = useCallback(() => {
    setBuyNowCheckout(null);
  }, []);

  const handleBuyNow = useCallback((cartItem) => {
    if (!cartItem) {
      return;
    }

    const singleItem = {
      ...cartItem,
      quantity: 1,
    };

    setBuyNowCheckout({
      items: [singleItem],
      startedAt: new Date().toISOString(),
    });
    setSelectedItemDetails(null);
    setActionNotice(`Ready to checkout: ${cartItem.title}`);
    navigate('/checkout', { state: { checkoutMode: 'buy-now' } });
  }, [navigate]);

  const handleUpdateCartQuantity = useCallback((itemId, delta) => {
    let removedItemId = null;
    setCartItems((currentItems) => {
      const currentItem = currentItems.find((item) => item.id === itemId);

      if (!currentItem) {
        return currentItems;
      }

      if (delta > 0) {
        const availableStock = getSellerListingStock(sellerItems, currentItem);

        if (availableStock !== null && currentItem.quantity >= availableStock) {
          setActionNotice(
            availableStock === 0
              ? `${currentItem.title} is out of stock. You can add it to wishlist only.`
              : `Only ${availableStock} in stock for ${currentItem.title}.`,
          );
          return currentItems;
        }
      }

      const nextItems = currentItems.reduce((acc, item) => {
        if (item.id !== itemId) {
          acc.push(item);
          return acc;
        }
        const nextQuantity = item.quantity + delta;
        if (nextQuantity > 0) {
          acc.push({ ...item, quantity: nextQuantity });
        } else {
          removedItemId = item.id;
        }
        return acc;
      }, []);
      if (getAuthState() && activeUserEmail && typeof activeUserEmail === 'string' && activeUserEmail.trim() && hasSupabaseEnv && supabase) {
        syncUserCollection({
          tableName: CART_ITEMS_TABLE,
          userEmail: activeUserEmail,
          records: nextItems.map((item) => toCartItemRecord(activeUserEmail, item)),
          removeMissing: false,
        });
      }
      return nextItems;
    });
    if (removedItemId) {
      removeCartItemFromRemote(removedItemId);
    }
  }, [removeCartItemFromRemote, activeUserEmail, sellerItems]);

  const handleRemoveCartItem = useCallback((itemId) => {
    setCartItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== itemId);
      if (getAuthState() && activeUserEmail && typeof activeUserEmail === 'string' && activeUserEmail.trim() && hasSupabaseEnv && supabase) {
        syncUserCollection({
          tableName: CART_ITEMS_TABLE,
          userEmail: activeUserEmail,
          records: nextItems.map((item) => toCartItemRecord(activeUserEmail, item)),
          removeMissing: false,
        });
      }
      return nextItems;
    });
    removeCartItemFromRemote(itemId);
  }, [removeCartItemFromRemote, activeUserEmail]);

  const handleToggleWishlist = useCallback((wishlistItem) => {
    const alreadyWishlisted = wishlistItems.some((item) => item.id === wishlistItem.id);
    setWishlistItems((currentItems) => {
      const nextItems = alreadyWishlisted
        ? currentItems.filter((item) => item.id !== wishlistItem.id)
        : [wishlistItem, ...currentItems];
      if (getAuthState() && activeUserEmail && typeof activeUserEmail === 'string' && activeUserEmail.trim() && hasSupabaseEnv && supabase) {
        syncUserCollection({
          tableName: WISHLIST_ITEMS_TABLE,
          userEmail: activeUserEmail,
          records: nextItems.map((item) => toWishlistItemRecord(activeUserEmail, item)),
          removeMissing: false,
        });
      }
      return nextItems;
    });
    if (alreadyWishlisted) {
      removeWishlistItemFromRemote(wishlistItem.id);
    } else {
      setActionNotice(`Added to wishlist: ${wishlistItem.title}`);
    }
  }, [removeWishlistItemFromRemote, wishlistItems, activeUserEmail]);

  const handleRemoveWishlistItem = useCallback((itemId) => {
    setWishlistItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== itemId);
      if (getAuthState() && activeUserEmail && typeof activeUserEmail === 'string' && activeUserEmail.trim() && hasSupabaseEnv && supabase) {
        syncUserCollection({
          tableName: WISHLIST_ITEMS_TABLE,
          userEmail: activeUserEmail,
          records: nextItems.map((item) => toWishlistItemRecord(activeUserEmail, item)),
          removeMissing: false,
        });
      }
      return nextItems;
    });
    removeWishlistItemFromRemote(itemId);
  }, [removeWishlistItemFromRemote, activeUserEmail]);

  const handlePlaceOrder = useCallback(async (customer, paymentDetails = null, checkoutOptions = {}) => {
    const sourceItems = Array.isArray(checkoutOptions.items) && checkoutOptions.items.length
      ? checkoutOptions.items
      : cartItems;

    if (!sourceItems.length) {
      return null;
    }

    const sellerStockLookup = sellerItems.reduce((lookup, sellerItem) => {
      lookup.set(String(sellerItem.dbId || ''), normalizeListingQuantity(sellerItem.availableQuantity, 0));
      return lookup;
    }, new Map());

    const outOfStockItem = sourceItems.find((item) => {
      const listingDbId = getSellerListingIdFromItemKey(item.sku || item.id);

      if (!listingDbId) {
        return false;
      }

      const inStock = sellerStockLookup.get(listingDbId);

      if (inStock === undefined) {
        return false;
      }

      return Math.max(Number(item.quantity) || 1, 1) > inStock;
    });

    if (outOfStockItem) {
      setActionNotice(`${outOfStockItem.title} no longer has enough stock for that cart quantity. Adjust your cart and try again.`);
      return null;
    }

    const fallbackTotals = getCartTotals(sourceItems);
    const orderFeeTotal = Math.max(Number(checkoutOptions.feeTotal), 0) || fallbackTotals.serviceFee;
    const orderTotal = Math.max(Number(checkoutOptions.total), 0) || (fallbackTotals.subtotal + orderFeeTotal);
    const sellerLookup = sellerItems.reduce((lookup, item) => {
      lookup.set(String(item.id || ''), {
        sellerEmail: normalizeEmail(item.sellerEmail || ''),
        sellerName: item.sellerName || '',
      });
      return lookup;
    }, new Map());

    const orderItems = sourceItems.map((item) => {
      const existingSellerEmail = normalizeEmail(item.sellerEmail || '');
      const existingSellerName = item.sellerName || '';

      if (existingSellerEmail) {
        return {
          ...item,
          sellerEmail: existingSellerEmail,
          sellerName: existingSellerName,
        };
      }

      const itemIdKey = String(item.id || '').includes(':')
        ? String(item.id || '').split(':').pop()
        : String(item.id || '');
      const sellerFromLookup = sellerLookup.get(String(item.sku || '')) || sellerLookup.get(itemIdKey) || null;

      return {
        ...item,
        sellerEmail: normalizeEmail(sellerFromLookup?.sellerEmail || ''),
        sellerName: sellerFromLookup?.sellerName || existingSellerName,
      };
    });

    const resolvedPayment = paymentDetails || {
      provider: customer.paymentMethod || 'Payfast',
      status: 'processing',
      reference: '',
      currency: 'ZAR',
    };
    const orderOwnerEmail = normalizeEmail(activeUserEmail) || GUEST_ORDER_EMAIL;
    const order = {
      id: `order-${Date.now()}`,
      reference: `SVS-${String(Date.now()).slice(-8)}`,
      createdAt: new Date().toISOString(),
      ownerEmail: orderOwnerEmail,
      customer,
      items: orderItems,
      paymentMethod: customer.paymentMethod,
      paymentProvider: resolvedPayment.provider,
      paymentStatus: resolvedPayment.status,
      paymentReference: resolvedPayment.reference,
      currency: resolvedPayment.currency,
      subtotal: fallbackTotals.subtotal,
      serviceFee: orderFeeTotal,
      total: orderTotal,
      status: 'Processing',
    };

    const inventoryRequest = Array.from(orderItems.reduce((accumulator, item) => {
      const listingDbId = getSellerListingIdFromItemKey(item.sku || item.id);

      if (!listingDbId) {
        return accumulator;
      }

      const purchasedQuantity = Math.max(Number(item.quantity) || 1, 1);
      accumulator.set(listingDbId, (accumulator.get(listingDbId) || 0) + purchasedQuantity);
      return accumulator;
    }, new Map()).entries()).map(([listingId, quantity]) => ({
      listing_id: listingId,
      quantity,
    }));

    if (inventoryRequest.length) {
      if (hasSupabaseEnv && supabase) {
        const { data: inventoryResult, error: inventoryError } = await supabase.rpc('apply_inventory_deduction', {
          p_order_key: order.id,
          p_user_email: orderOwnerEmail,
          p_items: inventoryRequest,
        });

        if (inventoryError) {
          setActionNotice(`Could not reserve inventory: ${inventoryError.message || 'please try again.'}`);
          return null;
        }

        if (!inventoryResult || !['applied', 'already_applied'].includes(inventoryResult.status)) {
          const failureReason = String(inventoryResult?.failure_reason || 'One or more items are no longer in stock.');
          setActionNotice(failureReason);
          return null;
        }

        const appliedItems = Array.isArray(inventoryResult.applied_items) ? inventoryResult.applied_items : [];

        if (appliedItems.length) {
          const stockByListingId = new Map(
            appliedItems.map((entry) => [
              String(entry.listing_id || ''),
              Math.max(Number(entry.new_quantity) || 0, 0),
            ]),
          );

          setSellerItems((currentItems) => currentItems.map((sellerItem) => {
            const nextQuantity = stockByListingId.get(String(sellerItem.dbId || ''));

            if (nextQuantity === undefined) {
              return sellerItem;
            }

            return {
              ...sellerItem,
              availableQuantity: nextQuantity,
            };
          }));
        }
      } else {
        // Local-only fallback without Supabase persistence.
        const purchasedByListingId = new Map(inventoryRequest.map((entry) => [String(entry.listing_id || ''), Number(entry.quantity) || 0]));

        setSellerItems((currentItems) => currentItems.map((sellerItem) => {
          const purchasedQuantity = purchasedByListingId.get(String(sellerItem.dbId || ''));

          if (!purchasedQuantity) {
            return sellerItem;
          }

          return {
            ...sellerItem,
            availableQuantity: Math.max(normalizeListingQuantity(sellerItem.availableQuantity, 0) - purchasedQuantity, 0),
          };
        }));
      }
    }

    if (hasSupabaseEnv && supabase) {
      const { error: orderSaveError } = await supabase
        .from(ORDERS_TABLE)
        .upsert([toOrderRecord(orderOwnerEmail, order)], { onConflict: 'user_email,order_key' });

      if (orderSaveError) {
        setActionNotice(`Could not save your order record: ${orderSaveError.message || 'please try again.'}`);
        return null;
      }
    }

    setOrders((currentOrders) => [order, ...currentOrders]);

    const sellerEmails = Array.from(new Set(
      orderItems
        .map((item) => normalizeEmail(item.sellerEmail || ''))
        .filter(Boolean),
    ));

    sellerEmails.forEach((sellerEmail) => {
      pushNotificationToUser(sellerEmail, {
        type: 'order',
        title: 'New order received',
        message: `${order.reference} was placed and is ready for confirmation.`,
        href: '/seller/dashboard',
        orderId: order.id,
      });
    });

    if (getAuthState() && order.ownerEmail && order.ownerEmail !== GUEST_ORDER_EMAIL) {
      pushNotificationToUser(order.ownerEmail, {
        type: 'order',
        title: 'Order placed',
        message: `${order.reference} is now Processing.`,
        href: '/orders',
        orderId: order.id,
      });
    }

    if (checkoutOptions.mode !== 'buy-now') {
      setCartItems([]);
      clearCartFromRemote();
    }

    return order;
  }, [activeUserEmail, cartItems, clearCartFromRemote, pushNotificationToUser, sellerItems]);

  const handleSellerItemCreated = useCallback((item) => {
    setSellerItems((currentItems) => [item, ...currentItems]);
  }, []);

  const handleDeleteSellerItem = useCallback(async (dbId, imageUrls = [], imageUrl = '') => {
    if (!hasSupabaseEnv || !supabase) return { error: 'Supabase is not configured.' };
    const sellerEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));

    if (!sellerEmail) {
      return { error: 'You must be signed in to remove this listing.' };
    }

    const normalizedDbId = String(dbId || '').trim();

    if (!normalizedDbId) {
      return { error: 'Missing listing id.' };
    }

    const sellerItemKeys = [`seller-${normalizedDbId}`, normalizedDbId];

    const sourceUrls = Array.isArray(imageUrls) && imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []);
    const storagePaths = getSellerImageStoragePaths(sourceUrls);

    if (storagePaths.length) {
      await supabase.storage.from(SELLER_IMAGES_BUCKET).remove(storagePaths);
    }

    const [cartCleanup, wishlistCleanup, reviewsCleanup] = await Promise.all([
      supabase
        .from(CART_ITEMS_TABLE)
        .delete()
        .or(`item_key.in.("${sellerItemKeys.join('","')}"),sku.in.("${sellerItemKeys.join('","')}")`),
      supabase
        .from(WISHLIST_ITEMS_TABLE)
        .delete()
        .or(`item_key.in.("${sellerItemKeys.join('","')}"),sku.in.("${sellerItemKeys.join('","')}")`),
      supabase
        .from(PRODUCT_REVIEWS_TABLE)
        .delete()
        .in('item_key', sellerItemKeys),
    ]);

    const cleanupError = cartCleanup.error || wishlistCleanup.error || reviewsCleanup.error;

    if (cleanupError) {
      return { error: cleanupError.message };
    }

    const { error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .delete()
      .eq('id', dbId)
      .eq('seller_email', sellerEmail);

    if (error) {
      return { error: error.message };
    }

    setSellerItems((currentItems) => currentItems.filter((item) => item.dbId !== dbId));
    setCartItems((currentItems) => currentItems.filter((item) => !sellerItemKeys.includes(String(item.id || '')) && !sellerItemKeys.includes(String(item.sku || ''))));
    setWishlistItems((currentItems) => currentItems.filter((item) => !sellerItemKeys.includes(String(item.id || '')) && !sellerItemKeys.includes(String(item.sku || ''))));
    setProductReviews((currentReviews) => currentReviews.filter((review) => !sellerItemKeys.includes(String(review.itemKey || ''))));
    setProductReviewSummaryMap((currentMap) => {
      const nextMap = new Map(currentMap);
      sellerItemKeys.forEach((itemKey) => nextMap.delete(itemKey));
      return nextMap;
    });

    if (typeof window !== 'undefined') {
      const nextStoredReviews = getStoredProductReviews().filter((review) => !sellerItemKeys.includes(String(review.itemKey || '')));
      window.localStorage.setItem(PRODUCT_REVIEWS_STORAGE_KEY, JSON.stringify(nextStoredReviews));
    }

    return { success: true };
  }, []);

  const handleUpdateSellerItem = useCallback(async (dbId, updates, newImageFiles) => {
    if (!hasSupabaseEnv || !supabase) return { error: 'Supabase is not configured.' };
    const sellerEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));

    if (!sellerEmail) {
      return { error: 'You must be signed in to update this listing.' };
    }

    const previousImageUrls = Array.isArray(updates.previousImageUrls) && updates.previousImageUrls.length
      ? updates.previousImageUrls.filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim())
      : (updates.previousImageUrl ? [updates.previousImageUrl] : []);
    const retainedImageUrls = Array.isArray(updates.imageUrls)
      ? updates.imageUrls.filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim())
      : [];
    const uploadedImageUrls = [];
    const uploadedStoragePaths = [];

    if (newImageFiles && newImageFiles.length) {
      for (const imageFile of newImageFiles) {
        const fileExtension = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;
        const filePath = `${sanitizeStorageSegment(sellerEmail)}/${updates.marketKey}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(SELLER_IMAGES_BUCKET)
          .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          if (uploadedStoragePaths.length) {
            await supabase.storage.from(SELLER_IMAGES_BUCKET).remove(uploadedStoragePaths);
          }

          return { error: uploadError.message };
        }

        const { data: publicUrlData } = supabase.storage.from(SELLER_IMAGES_BUCKET).getPublicUrl(filePath);
        uploadedStoragePaths.push(filePath);
        uploadedImageUrls.push(publicUrlData.publicUrl);
      }
    }

    const nextImageUrls = [...retainedImageUrls, ...uploadedImageUrls];

    if (!nextImageUrls.length) {
      if (uploadedStoragePaths.length) {
        await supabase.storage.from(SELLER_IMAGES_BUCKET).remove(uploadedStoragePaths);
      }

      return { error: 'Add at least one image before saving this listing.' };
    }

    const removedImageUrls = previousImageUrls.filter((imageUrl) => !nextImageUrls.includes(imageUrl));
    const imageUrl = nextImageUrls[0];

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        quantity: normalizeListingQuantity(updates.quantity, 0),
        market_key: updates.marketKey,
        details_json: updates.detailsJson || {},
        image_url: imageUrl,
        image_urls: nextImageUrls,
      })
      .eq('id', dbId)
      .eq('seller_email', sellerEmail)
      .select('*')
      .single();

    if (error) {
      if (uploadedStoragePaths.length) {
        await supabase.storage.from(SELLER_IMAGES_BUCKET).remove(uploadedStoragePaths);
      }

      return {
        error: String(error.message || '').toLowerCase().includes('marketplace_items_market_key_check')
          ? `Rerun supabase/seller-marketplace.sql so the ${SELLER_ITEMS_TABLE} market_key constraint includes the selected market.`
          : String(error.message || '').toLowerCase().includes('quantity')
            ? 'Run supabase/add-marketplace-item-quantity.sql to add listing quantity support, then try again.'
            : error.message,
      };
    }

      const removedStoragePaths = getSellerImageStoragePaths(removedImageUrls);

      if (removedStoragePaths.length) {
        await supabase.storage.from(SELLER_IMAGES_BUCKET).remove(removedStoragePaths);
      }

    setSellerItems((currentItems) =>
      currentItems.map((item) => (item.dbId === dbId ? mapSellerItemRecord(data) : item)),
    );

    return { data };
  }, []);

  const handleUpdateOrderStatus = useCallback(async (orderId, nextStatus) => {
    if (!orderId || ![...ORDER_STATUS_FLOW, ...REFUND_STATUS_FLOW].includes(nextStatus)) {
      return { error: 'Invalid order update.' };
    }

    const activeSellerEmail = normalizeEmail(activeUserEmail);
    const ownedSellerItemIds = new Set(
      sellerItems
        .filter((item) => normalizeEmail(item.sellerEmail || '') === activeSellerEmail)
        .map((item) => String(item.id || '')),
    );
    
    // Try to find order in local state first (buyer's personal orders)
    let targetOrder = orders.find((order) => order.id === orderId);

    // If not found locally, fetch from Supabase (seller may be managing a customer's order)
    if (!targetOrder && hasSupabaseEnv && supabase) {
      const { data, error: fetchError } = await supabase
        .from(ORDERS_TABLE)
        .select('user_email, order_key, reference, order_created_at, customer, items, payment_method, payment_provider, payment_status, payment_reference, currency, subtotal, service_fee, total, status')
        .eq('order_key', orderId)
        .single();

      if (fetchError || !data) {
        return { error: 'Order not found.' };
      }

      targetOrder = mapOrderRecord(data);
    }

    if (!targetOrder) {
      return { error: 'Order not found.' };
    }

    const allowedStatuses = getSellerStatusOptions(targetOrder.status);
    if (!allowedStatuses.includes(nextStatus)) {
      return { error: 'Invalid status transition for this order.' };
    }

    const sellerCanManageOrder = (targetOrder.items || []).some((lineItem) => (
      doesLineItemBelongToSeller(lineItem, activeSellerEmail, ownedSellerItemIds)
    ));

    if (!sellerCanManageOrder) {
      return { error: 'You can only update orders that include your listings.' };
    }

    if (hasSupabaseEnv && supabase) {
      const { error } = await supabase
        .from(ORDERS_TABLE)
        .update({ status: nextStatus })
        .eq('order_key', orderId);

      if (error) {
        return { error: error.message || 'Could not update order status.' };
      }
    }

    setOrders((currentOrders) => currentOrders.map((order) => (
      order.id === orderId
        ? { ...order, status: nextStatus }
        : order
    )));

    if (targetOrder.ownerEmail) {
      const refundNote = nextStatus === 'Refund Made'
        ? 'Refund has been made. Bank reflection can take 3-7 business days.'
        : `${targetOrder.reference || orderId} is now ${nextStatus}.`;

      pushNotificationToUser(targetOrder.ownerEmail, {
        type: 'status',
        title: 'Order status updated',
        message: refundNote,
        href: '/orders',
        orderId,
      });
    }

    return { data: true };
  }, [activeUserEmail, orders, pushNotificationToUser, sellerItems]);

  const handleCancelOrder = useCallback(async (orderId) => {
    const normalizedBuyerEmail = normalizeEmail(activeUserEmail);
    const targetOrder = orders.find((order) => order.id === orderId);

    if (!targetOrder) {
      return { error: 'Order not found.' };
    }

    if (!canBuyerCancelOrder(targetOrder.status)) {
      return { error: 'Order can only be cancelled before it is shipped.' };
    }

    if (hasSupabaseEnv && supabase) {
      const { error } = await supabase
        .from(ORDERS_TABLE)
        .update({ status: 'Cancelled by Buyer' })
        .eq('order_key', orderId)
        .eq('user_email', normalizedBuyerEmail);

      if (error) {
        return { error: error.message || 'Could not cancel order.' };
      }
    }

    setOrders((currentOrders) => currentOrders.map((order) => (
      order.id === orderId
        ? { ...order, status: 'Cancelled by Buyer' }
        : order
    )));

    const sellerEmails = Array.from(new Set(
      (targetOrder.items || [])
        .map((lineItem) => normalizeEmail(lineItem?.sellerEmail || ''))
        .filter((email) => Boolean(email) && email !== normalizedBuyerEmail),
    ));

    sellerEmails.forEach((sellerEmail) => {
      pushNotificationToUser(sellerEmail, {
        type: 'refund',
        title: 'Order cancelled by buyer',
        message: `${targetOrder.reference || targetOrder.id} was cancelled. Process refund once funds settle.`,
        href: '/seller/dashboard',
        orderId,
      });
    });

    const wasCardPayment = targetOrder.paymentMethod === 'Card';
    pushNotificationToUser(targetOrder.ownerEmail || normalizedBuyerEmail, {
      type: 'refund',
      title: 'Order cancelled',
      message: wasCardPayment
        ? 'Cancellation received. After the seller processes the refund, bank reflection can take 3-7 business days.'
        : 'Your order has been successfully cancelled.',
      href: '/orders',
      orderId,
    });

    return { data: true };
  }, [activeUserEmail, orders, pushNotificationToUser]);

  const handleOpenItemDetails = useCallback((itemDetails) => {
    setReviewNotice('');
    setSelectedItemDetails(itemDetails);
  }, []);

  const handleCloseItemDetails = useCallback(() => {
    setSelectedItemDetails(null);
  }, []);

  const handleSubmitProductReview = useCallback(async ({ itemKey, rating, comment, reviewerName, reviewerEmail }) => {
    const normalizedComment = normalizeReviewComment(comment);

    if (containsHarshReviewContent(normalizedComment)) {
      throw new Error('Review not published because it contains harsh language.');
    }

    const nextReview = createProductReview({
      itemKey,
      rating,
      comment: normalizedComment,
      reviewerName,
      reviewerEmail,
    });

    if (hasSupabaseEnv && supabase) {
      const { error } = await supabase
        .from(PRODUCT_REVIEWS_TABLE)
        .insert(toProductReviewRecord(nextReview));

      if (error) {
        throw new Error(
          error.message
            ? `Could not publish this review: ${error.message}`
            : 'Could not publish this review right now. Run supabase/product-reviews.sql if the table is missing.',
        );
      }

      await loadReviewsForItem(itemKey);
      await loadProductReviewSummaries();
    } else {
      const nextReviews = [nextReview, ...getStoredProductReviews()];
      window.localStorage.setItem(PRODUCT_REVIEWS_STORAGE_KEY, JSON.stringify(nextReviews));
      setProductReviews(getStoredApprovedProductReviews(itemKey));
      setProductReviewSummaryMap(buildProductReviewSummaryMap(nextReviews));
    }

    setReviewNotice('Review published. It is now visible to shoppers.');
  }, [loadProductReviewSummaries, loadReviewsForItem]);

  useEffect(() => {
    if (!actionNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionNotice('');
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    // With Supabase enabled, order status is managed by persisted updates (buyer/seller flow).
    // Skip local auto-progression to avoid overwriting seller-selected statuses.
    if (hasSupabaseEnv && supabase) {
      return undefined;
    }

    const updateOrderStatuses = () => {
      const now = Date.now();

      setOrders((currentOrders) => {
        let hasChanges = false;

        const nextOrders = currentOrders.map((order) => {
          const nextStatus = getAutoOrderStatus(order, now);

          if (nextStatus !== order.status) {
            hasChanges = true;
            return { ...order, status: nextStatus };
          }

          return order;
        });

        return hasChanges ? nextOrders : currentOrders;
      });
    };

    updateOrderStatuses();
    const intervalId = window.setInterval(updateOrderStatuses, 30 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const standaloneShellRoutes = new Set([
    '/checkout',
    '/checkout/payfast',
    '/signin',
    '/signup',
    '/sell',
    '/sell/signin',
    '/sell/signup',
    '/sell/onboarding',
  ]);
  const isStandaloneShellRoute = standaloneShellRoutes.has(location.pathname);

  const appContent = (
    <>
      <AppRoutes
        cartItems={cartItems}
        wishlistItems={wishlistItems}
        wishlistItemIds={wishlistItemIds}
        orders={scopedOrders}
        sellerItems={sellerItems}
        buyNowCheckout={buyNowCheckout}
        productReviewSummaryMap={productReviewSummaryMap}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
        onRemoveWishlistItem={handleRemoveWishlistItem}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveCartItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
        onClearBuyNowCheckout={handleClearBuyNowCheckout}
        onCancelOrder={handleCancelOrder}
        onSellerItemCreated={handleSellerItemCreated}
        onDeleteSellerItem={handleDeleteSellerItem}
        onUpdateSellerItem={handleUpdateSellerItem}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onOpenItemDetails={handleOpenItemDetails}
      />
      <ItemDetailsModal
        item={selectedItemDetails}
        onClose={handleCloseItemDetails}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isDetailsItemWishlisted}
        reviews={productReviews}
        isLoadingReviews={isLoadingProductReviews}
        onSubmitReview={handleSubmitProductReview}
        currentReviewerName={currentReviewerName}
        currentReviewerEmail={activeUserEmail}
        reviewNotice={reviewNotice}
      />
      {actionNotice ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90] max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
          {actionNotice}
        </div>
      ) : null}
    </>
  );

  if (isStandaloneShellRoute) {
    return appContent;
  }

  return (
    <Shell
      cartItemCount={getCartCount(cartItems)}
      wishlistItemCount={wishlistItems.length}
      notifications={notifications}
      onMarkNotificationsRead={markNotificationsAsRead}
      onClearNotifications={handleClearNotifications}
    >
      {appContent}
    </Shell>
  );
};

export default App;



