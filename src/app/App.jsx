import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../assets/icons/logo.jpeg';
import { DEFAULT_LANGUAGE_CODE, getLanguageByCode, isRtlLanguage, SUPPORTED_LANGUAGES } from '../lib/languages';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import SigninPage from '../pages/SigninPage';
import SignupPage from '../pages/SignupPage';

const navItems = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.markets', href: '/markets' },
  { labelKey: 'nav.offers', href: '/offers' },
  { labelKey: 'nav.orders', href: '/orders' },
];

const marketLinks = [
  { labelKey: 'markets.ecommerce', href: '/e-commerce' },
  { labelKey: 'markets.beverages', href: '/beverages-liquors' },
  { labelKey: 'markets.bettingHub', href: '/betting-hub' },
  { labelKey: 'markets.bettingVoting', href: '/betting-voting' },
  { labelKey: 'markets.bookings', href: '/bookings-tickets' },
  { labelKey: 'markets.fastFood', href: '/fast-food' },
  { labelKey: 'markets.groceries', href: '/groceries' },
  { labelKey: 'markets.hardwareSoftware', href: '/hardware-software' },
  { labelKey: 'markets.internationalLotteryGames', href: '/international-lottery-games' },
  { labelKey: 'markets.livestockHub', href: '/livestock-hub' },
  { labelKey: 'markets.homeCare', href: '/home-care' },
  { labelKey: 'markets.propertyHub', href: '/property-hub' },
  { labelKey: 'markets.safety', href: '/safety' },
  { labelKey: 'markets.tickets', href: '/tickets' },
  { labelKey: 'markets.votingClients', href: '/voting-clients' },
  { labelKey: 'markets.votingProviders', href: '/voting-providers' },
  { labelKey: 'markets.wellness', href: '/wellness' },
];

const sellerMarketOptions = [
  { key: 'ecommerce', labelKey: 'markets.ecommerce', route: '/e-commerce' },
  { key: 'groceries', labelKey: 'markets.groceries', route: '/groceries' },
  { key: 'fastFood', labelKey: 'markets.fastFood', route: '/fast-food' },
  { key: 'beverages', labelKey: 'markets.beverages', route: '/beverages-liquors' },
  { key: 'wellness', labelKey: 'markets.wellness', route: '/wellness' },
  { key: 'hardwareSoftware', labelKey: 'markets.hardwareSoftware', route: '/hardware-software' },
];

const sellerMarketConfig = sellerMarketOptions.reduce((accumulator, option) => {
  accumulator[option.key] = option;
  return accumulator;
}, {});

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

const groceries = [
  {
    id: 'g1',
    title: 'Fresh Tomatoes Pack',
    price: '4.50',
    discount: '20% Off',
    image:
      'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g2',
    title: 'Organic Eggs 12 Pack',
    price: '5.99',
    discount: 'Buy 1 Get 1 Free',
    image:
      'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'g3',
    title: 'Fresh Citrus Crate',
    price: '7.99',
    discount: 'Weekly Deal',
    image:
      'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=1200',
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
    section: 'International Lottery Games Hub',
    sectionKey: 'markets.internationalLotteryGames',
    route: '/international-lottery-games',
    searchText: buildSearchText([
      item.title,
      item.region,
      item.drawDay,
      item.jackpot,
      'lottery lotto jackpot draw games international millions powerball',
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
const ORDERS_STORAGE_KEY = 'svs-orders';
const ORDER_STATUS_FLOW = ['Confirmed', 'Processing', 'Ready', 'Completed'];
const SELLER_ITEMS_TABLE = 'marketplace_items';
const SELLER_IMAGES_BUCKET = 'marketplace-items';

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

const getStoredCartItems = () => getStoredCollection(CART_STORAGE_KEY);
const getStoredOrders = () => getStoredCollection(ORDERS_STORAGE_KEY);

const sanitizeStorageSegment = (value) => String(value || 'seller')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'seller';

const cudyBluePrimaryButtonClassName = 'svs-test-primary-button';
const cudyBluePrimaryOutlineClassName = 'svs-test-primary-outline';
const cudyBluePrimaryIconClassName = 'svs-test-primary-icon';

const formatDate = (value, locale = 'en-US') =>
  new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const SALE_DISCOUNT_RATE = 0.2;

const formatSaleAmount = (amount, decimals) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(amount);

const formatCheckoutAmount = (amount) => formatSaleAmount(amount, 2);

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

const getCartCount = (cartItems) => cartItems.reduce((total, item) => total + item.quantity, 0);
const getCartSubtotal = (cartItems) => cartItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
const getServiceFee = (subtotal) => subtotal * 0.03;

const getCartTotals = (cartItems) => {
  const subtotal = getCartSubtotal(cartItems);
  const serviceFee = getServiceFee(subtotal);

  return {
    subtotal,
    serviceFee,
    total: subtotal + serviceFee,
  };
};

const getOrderStatusStep = (status) => {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);
  const nextIndex = Math.min(currentIndex + 1, ORDER_STATUS_FLOW.length - 1);
  return ORDER_STATUS_FLOW[nextIndex] || ORDER_STATUS_FLOW[0];
};

const createCartItem = ({ id, title, image, price, route, marketName, details = '' }) => ({
  id: `${route}:${id}`,
  sku: id,
  title,
  image,
  route,
  marketName,
  details,
  quantity: 1,
  unitPrice: getNumericPriceValue(price),
  unitPriceLabel: getSalePrices(price).nowPrice,
});

const getStatusClasses = (status) => {
  switch (status) {
    case 'Completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'Ready':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'Processing':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};

const mapSellerItemRecord = (record) => {
  const marketConfig = sellerMarketConfig[record.market_key] || sellerMarketOptions[0];

  return {
    id: `seller-${record.id}`,
    dbId: record.id,
    title: record.title,
    description: record.description || '',
    price: record.price,
    image: record.image_url,
    marketKey: record.market_key,
    route: marketConfig.route,
    sellerName: record.seller_name || record.seller_email || 'Seller',
    sellerEmail: record.seller_email || '',
    createdAt: record.created_at,
  };
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

const LanguageSelectorPopover = ({
  isOpen,
  pendingLanguageCode,
  focusedIndex,
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
      <div className="max-h-80 overflow-y-auto p-2">
        {SUPPORTED_LANGUAGES.map((language, index) => {
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
        })}
      </div>
    </div>
  );
};

const Shell = ({ children, cartItemCount = 0 }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [pendingLanguageCode, setPendingLanguageCode] = useState(DEFAULT_LANGUAGE_CODE);
  const [focusedLanguageIndex, setFocusedLanguageIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(getAuthState);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('SVS User');
  const [theme, setTheme] = useState(getThemePreference);
  const languageCardRefs = useRef([]);
  const desktopLanguageMenuRef = useRef(null);
  const mobileLanguageMenuRef = useRef(null);
  const isDarkMode = theme === 'dark';
  const activeLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language);

  const closeLanguageModal = () => {
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
    setProfileOpen(false);
    setIsLanguageModalOpen(false);
  }, [location.pathname]);

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
      return undefined;
    }

    const onKeyDown = (event) => {
      const maxIndex = SUPPORTED_LANGUAGES.length - 1;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeLanguageModal();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedLanguageIndex((currentIndex) => {
          const nextIndex = event.key === 'ArrowDown'
            ? (currentIndex >= maxIndex ? 0 : currentIndex + 1)
            : (currentIndex <= 0 ? maxIndex : currentIndex - 1);
          const nextLanguage = SUPPORTED_LANGUAGES[nextIndex];
          setPendingLanguageCode(nextLanguage.code);
          languageCardRefs.current[nextIndex]?.focus();
          languageCardRefs.current[nextIndex]?.scrollIntoView({ block: 'nearest' });
          return nextIndex;
        });
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selectedLanguage = SUPPORTED_LANGUAGES[focusedLanguageIndex] || getLanguageByCode(pendingLanguageCode);
        setPendingLanguageCode(selectedLanguage.code);
        applyLanguageCode(selectedLanguage.code);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyLanguageCode, focusedLanguageIndex, isLanguageModalOpen, pendingLanguageCode]);

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
    setIsAuthenticated(false);
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
            {navItems.map((item) => (
              <Link key={item.labelKey} to={item.href} className="transition hover:text-[var(--svs-primary)]">
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <form className="relative hidden max-w-xl flex-1 lg:block" onSubmit={handleSearchSubmit}>
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
            <Link to="/checkout" aria-label="Open cart and checkout" className="relative rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]">
              <ShoppingCart className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
              {cartItemCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--svs-primary)] px-1 text-[10px] font-bold text-white">
                  {cartItemCount}
                </span>
              ) : null}
            </Link>
            <button type="button" aria-label="Wishlist" className="rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]">
              <Heart className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
            </button>
            <button type="button" aria-label="Notifications" className="rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]">
              <Bell className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
            </button>
            <div className="relative" ref={desktopLanguageMenuRef}>
              <button
                type="button"
                onClick={() => {
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
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface)] px-3 py-1.5 text-sm font-semibold transition hover:border-[var(--svs-primary)]"
              aria-label={t('theme.toggleAria')}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-[var(--svs-primary)]" /> : <Moon className="h-4 w-4 text-[var(--svs-primary-strong)]" />}
              <span>{isDarkMode ? t('theme.light') : t('theme.dark')}</span>
            </button>
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
                  <Link
                    to="/seller/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="mt-3 block w-full rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-center text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
                  >
                    My Store
                  </Link>
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
                onSelect={async (code) => {
                  setPendingLanguageCode(code);
                  setFocusedLanguageIndex(SUPPORTED_LANGUAGES.findIndex((language) => language.code === code));
                  setMobileOpen(false);
                  await applyLanguageCode(code);
                }}
                onFocusIndex={setFocusedLanguageIndex}
                cardRefs={languageCardRefs}
              />
            </div>
            <div className="space-y-2 text-sm font-semibold">
              {navItems.map((item) => (
                <Link
                  key={item.labelKey}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2"
                >
                  {t(item.labelKey)}
                </Link>
              ))}
              {!isAuthenticated ? (
                <>
                  <Link to="/signin" className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2">
                    {t('profile.signIn')}
                  </Link>
                  <Link to="/signup" className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2">
                    {t('profile.signUp')}
                  </Link>
                </>
              ) : (
                <Link to="/seller/dashboard" onClick={() => setMobileOpen(false)} className="block rounded-md bg-[var(--svs-surface-soft)] px-3 py-2">
                  My Store
                </Link>
              )}
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

const ECommercePage = ({ onAddToCart, sellerItems = [] }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'ecommerce'), ...productCards], [sellerItems]);

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
        onPrimaryAction={(item) => onAddToCart(createCartItem({
          ...item,
          route: '/e-commerce',
          marketName: t('markets.ecommerce'),
          details: item.subtitle || item.description || item.sellerName,
        }))}
        metaRenderer={(item) => <p className="text-sm text-slate-500">{item.subtitle || item.description || item.sellerName || 'Seller item'} • <SalePrice price={item.price} /></p>}
      />
    </PageFrame>
  );
};

const TicketsPage = ({ onAddToCart }) => {
  const { t, i18n } = useTranslation();
  const [typeFilter, setTypeFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const currentLocale = i18n.resolvedLanguage || i18n.language || 'en';

  const filtered = useMemo(() => {
    return ticketEvents.filter((event) => {
      const byType = typeFilter === 'All' || event.type === typeFilter;
      const byLocation = locationFilter === 'All' || event.location.includes(locationFilter);
      return byType && byLocation;
    });
  }, [typeFilter, locationFilter]);

  return (
    <PageFrame
      title={t('markets.tickets')}
      subtitle={t('ticketsPage.subtitle')}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-md border border-[#b2ebf2] bg-white px-3 py-2 text-sm"
          aria-label={t('ticketsPage.filters.typeAria')}
        >
          <option value="All">{t('ticketsPage.filters.all')}</option>
          <option value="Concert">{t('ticketsPage.types.concert')}</option>
          <option value="Movie">{t('ticketsPage.types.movie')}</option>
          <option value="Sports">{t('ticketsPage.types.sports')}</option>
          <option value="Travel">{t('ticketsPage.types.travel')}</option>
        </select>
        <select
          value={locationFilter}
          onChange={(event) => setLocationFilter(event.target.value)}
          className="rounded-md border border-[#b2ebf2] bg-white px-3 py-2 text-sm"
          aria-label={t('ticketsPage.filters.locationAria')}
        >
          <option value="All">{t('ticketsPage.filters.all')}</option>
          <option value="Cape Town">{t('ticketsPage.locations.capeTown')}</option>
          <option value="Nu Metro">{t('ticketsPage.locations.nuMetro')}</option>
          <option value="Kings">{t('ticketsPage.locations.kings')}</option>
          <option value="Durban">{t('ticketsPage.locations.durban')}</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition hover:scale-[1.03]"
          >
            <img
              src={event.image}
              alt=""
              aria-hidden="true"
              className="h-40 w-full rounded-t-xl object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <div className="p-4">
              <h3 className="text-base font-bold">{t(event.titleKey, { defaultValue: event.title })}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><CalendarDays className="h-4 w-4" /> {formatDate(event.date, currentLocale)}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" /> {t(event.locationKey, { defaultValue: event.location })}</p>
              <p className="mt-2 text-sm text-[var(--svs-primary-strong)]">{t(event.typeKey, { defaultValue: event.type })} • <SalePrice price={event.price} /></p>
              <button
                type="button"
                onClick={() => onAddToCart(createCartItem({
                  ...event,
                  route: '/tickets',
                  marketName: t('markets.tickets'),
                  details: `${formatDate(event.date, currentLocale)} • ${t(event.locationKey, { defaultValue: event.location })}`,
                }))}
                className={`${cudyBluePrimaryButtonClassName} mt-3 rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--svs-primary-strong)]`}
              >
                {t('ticketsPage.bookNow')}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex min-w-max gap-4">
          {ticketEvents.map((event) => (
            <div key={`${event.id}-carousel`} className="w-64 shrink-0 rounded-xl border border-[#b2ebf2] bg-[#e0f7fa] p-3">
              <p className="text-xs text-slate-600">{t('ticketsPage.upcomingHighlight')}</p>
              <p className="font-semibold">{t(event.titleKey, { defaultValue: event.title })}</p>
            </div>
          ))}
        </div>
      </div>
    </PageFrame>
  );
};

const BookingsTicketsPage = ({ onAddToCart }) => {
  const { t } = useTranslation();

  return (
  <PageFrame
    title={t('markets.bookings')}
    subtitle={t('pageSubtitles.bookings')}
  >
    <p className="rounded-xl border border-[#b2ebf2] bg-[#e0f7fa] p-4 text-sm text-slate-700">
      Integrated booking flow: select event -&gt; choose seat and provider -&gt; complete secure payment -&gt; receive e-ticket.
    </p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {ticketEvents.slice(0, 2).map((event) => (
        <article key={`booking-${event.id}`} className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <h3 className="text-lg font-bold">{event.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{formatDate(event.date)} • {event.location}</p>
          <button
            type="button"
            onClick={() => onAddToCart(createCartItem({
              ...event,
              route: '/bookings-tickets',
              marketName: t('markets.bookings'),
              details: `${formatDate(event.date)} • ${event.location}`,
            }))}
            className={`${cudyBluePrimaryButtonClassName} mt-3 rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white`}
          >
            {t('common.bookNow')}
          </button>
        </article>
      ))}
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

const GroceriesPage = ({ onAddToCart, sellerItems = [] }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('Fruits');
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'groceries'), ...groceries], [sellerItems]);

  return (
    <PageFrame title={t('markets.groceries')} subtitle={t('pageSubtitles.groceries')}>
      <div className="mb-4 flex flex-wrap gap-2">
        {['Fruits', 'Vegetables', 'Dairy', 'Bakery'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${tab === name ? 'bg-[var(--svs-primary)] text-white' : 'border border-[#b2ebf2] bg-white'}`}
          >
            {name}
          </button>
        ))}
      </div>
      <CardGrid
        items={marketItems}
        buttonLabel={t('common.addToBasket')}
        secondaryButtonLabel={t('common.deliveryOptions')}
        onPrimaryAction={(item) => onAddToCart(createCartItem({
          ...item,
          route: '/groceries',
          marketName: t('markets.groceries'),
          details: item.discount || item.description || item.sellerName,
        }))}
        metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} /> • {item.discount || item.description || item.sellerName || 'Seller item'}</p>}
      />
    </PageFrame>
  );
};

const FastFoodPage = ({ onAddToCart, sellerItems = [] }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'fastFood'), ...fastFoodItems], [sellerItems]);

  return (
  <PageFrame
    title={t('markets.fastFood')}
    subtitle={t('pageSubtitles.fastFood')}
  >
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.orderNow')}
      secondaryButtonLabel={t('common.viewMeal')}
      onPrimaryAction={(item) => onAddToCart(createCartItem({
        ...item,
        route: '/fast-food',
        marketName: t('markets.fastFood'),
        details: `${item.category || 'Seller item'} • ${item.prepTime || item.description || 'Ready to order'}`,
      }))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.prepTime || item.description || 'Ready to order'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const BeveragesLiquorsPage = ({ onAddToCart, sellerItems = [] }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'beverages'), ...beveragesLiquorItems], [sellerItems]);

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
      onPrimaryAction={(item) => onAddToCart(createCartItem({
        ...item,
        route: '/beverages-liquors',
        marketName: t('markets.beverages'),
        details: `${item.category || 'Seller item'} • ${item.volume || item.description || item.sellerName || 'Marketplace listing'}`,
      }))}
      metaRenderer={(item) => <p className="text-sm text-slate-600">{item.category || 'Seller item'} • {item.volume || item.description || item.sellerName || 'Marketplace listing'} • <SalePrice price={item.price} /></p>}
    />
  </PageFrame>
  );
};

const WellnessPage = ({ onAddToCart, sellerItems = [] }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'wellness'), ...wellnessItems], [sellerItems]);

  return (
  <PageFrame title={t('markets.wellness')} subtitle={t('pageSubtitles.wellness')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.add')}
      secondaryButtonLabel={t('common.uploadPrescription')}
      onPrimaryAction={(item) => onAddToCart(createCartItem({
        ...item,
        route: '/wellness',
        marketName: t('markets.wellness'),
        details: item.description || item.sellerName,
      }))}
      metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} />{item.description ? ` • ${item.description}` : ''}</p>}
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
      <select className="rounded-md border border-[#b2ebf2] bg-white px-3 py-2 text-sm" aria-label="Filter service type">
        <option>All Types</option>
        <option>Plumbing</option>
        <option>Electrical</option>
        <option>Cleaning</option>
      </select>
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

const HardwareSoftwarePage = ({ onAddToCart, sellerItems = [] }) => {
  const { t } = useTranslation();
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'hardwareSoftware'), ...techItems], [sellerItems]);

  return (
  <PageFrame title={t('markets.hardwareSoftware')} subtitle={t('pageSubtitles.hardwareSoftware')}>
    <CardGrid
      items={marketItems}
      buttonLabel={t('common.addToCart')}
      secondaryButtonLabel={t('common.viewMore')}
      onPrimaryAction={(item) => onAddToCart(createCartItem({
        ...item,
        route: '/hardware-software',
        marketName: t('markets.hardwareSoftware'),
        details: item.description || item.subtitle || item.sellerName,
      }))}
      metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} />{item.description ? ` • ${item.description}` : ''}</p>}
    />
  </PageFrame>
  );
};

const MARKET_BADGE_COLORS = {
  ecommerce: 'bg-blue-100 text-blue-700',
  groceries: 'bg-green-100 text-green-700',
  fastFood: 'bg-orange-100 text-orange-700',
  beverages: 'bg-purple-100 text-purple-700',
  wellness: 'bg-teal-100 text-teal-700',
  hardwareSoftware: 'bg-slate-100 text-slate-700',
};

const SellerDashboardPage = ({ onDeleteSellerItem, onUpdateSellerItem }) => {
  const { t } = useTranslation();
  const isAuthenticated = getAuthState();
  const userEmail = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || '');

  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '', marketKey: '', imageFile: null });
  const [editMessage, setEditMessage] = useState('');
  const [editMessageType, setEditMessageType] = useState('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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

  const openEdit = (item) => {
    setEditingId(item.dbId);
    setEditForm({ title: item.title, description: item.description, price: item.price, marketKey: item.marketKey, imageFile: null });
    setEditMessage('');
    setEditMessageType('idle');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', description: '', price: '', marketKey: '', imageFile: null });
    setEditMessage('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveEdit = async (item) => {
    setIsSaving(true);
    setEditMessage('');
    setEditMessageType('idle');

    const result = await onUpdateSellerItem(
      item.dbId,
      { title: editForm.title, description: editForm.description, price: editForm.price, marketKey: editForm.marketKey, imageUrl: item.image },
      editForm.imageFile || null,
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
    setEditingId(null);
    setIsSaving(false);
  };

  const handleDelete = async (item) => {
    setDeletingId(item.dbId);
    await onDeleteSellerItem(item.dbId, item.image);
    setMyListings((current) => current.filter((listing) => listing.dbId !== item.dbId));
    setConfirmDeleteId(null);
    setDeletingId(null);
  };

  if (!isAuthenticated) {
    return (
      <PageFrame title="My Store" subtitle="Sign in to manage your product listings.">
        <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-6 text-sm text-[var(--svs-text)]">
          <p className="mb-4">You need to be signed in to view and manage your listings.</p>
          <Link to="/signin" className={`${cudyBluePrimaryButtonClassName} inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
            Sign In
          </Link>
        </div>
      </PageFrame>
    );
  }

  const uniqueMarketCount = new Set(myListings.map((item) => item.marketKey)).size;

  return (
    <PageFrame title="My Store" subtitle="View, edit, and remove your product listings across all markets.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--svs-muted)]">
          {isLoading
            ? 'Loading your listings\u2026'
            : myListings.length === 0
              ? 'No listings yet. Add your first product to get started.'
              : `${myListings.length} listing${myListings.length !== 1 ? 's' : ''} across ${uniqueMarketCount} market${uniqueMarketCount !== 1 ? 's' : ''}`}
        </p>
        <Link
          to="/seller/upload"
          className={`${cudyBluePrimaryButtonClassName} inline-flex items-center gap-2 rounded-lg bg-[var(--svs-primary)] px-4 py-2.5 text-sm font-semibold text-white`}
        >
          <Plus className="h-4 w-4" /> Add New Listing
        </Link>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div>
      ) : isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {myListings.map((item) => (
            <article key={item.dbId} className="overflow-hidden rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <div className="relative h-48 overflow-hidden bg-[var(--svs-surface-soft)]">
                <img src={item.image} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${MARKET_BADGE_COLORS[item.marketKey] || 'bg-slate-100 text-slate-700'}`}>
                  {t(sellerMarketConfig[item.marketKey]?.labelKey || '')}
                </span>
              </div>

              <div className="p-4">
                <h3 className="text-base font-bold leading-tight text-[var(--svs-text)]">{item.title}</h3>
                <p className="mt-0.5 text-sm font-semibold text-[var(--svs-primary-strong)]"><SalePrice price={item.price} /></p>
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
                        <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Market</label>
                        <select name="marketKey" value={editForm.marketKey} onChange={handleEditChange} className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none">
                          {sellerMarketOptions.map((option) => (
                            <option key={option.key} value={option.key}>{t(option.labelKey)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Description</label>
                      <textarea name="description" value={editForm.description} onChange={handleEditChange} rows={3} className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--svs-text)]">Replace Image <span className="font-normal text-[var(--svs-muted)]">(optional)</span></label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setEditForm((current) => ({ ...current, imageFile: event.target.files?.[0] || null }))}
                        className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-xs text-[var(--svs-text)] outline-none"
                      />
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
                  <div className="mt-4 flex gap-2">
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
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="flex-1 rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm font-semibold text-[var(--svs-text)] transition hover:border-[var(--svs-primary)]"
                        >
                          Edit Listing
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.dbId)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </PageFrame>
  );
};

const SellerUploadPage = ({ onSellerItemCreated }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    marketKey: sellerMarketOptions[0].key,
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('idle');
  const isAuthenticated = getAuthState();
  const userEmail = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || '');
  const userName = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-name') || 'SVS Seller');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (!hasSupabaseEnv || !supabase) {
      setMessage('Supabase is not configured. Add the environment values first so seller uploads can be stored.');
      setMessageType('error');
      return;
    }

    if (!imageFile) {
      setMessage('Select an image before uploading your item.');
      setMessageType('error');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType('idle');

    const selectedMarket = sellerMarketConfig[formData.marketKey];
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

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .insert({
        seller_email: userEmail,
        seller_name: userName,
        title: formData.title,
        description: formData.description,
        price: formData.price,
        market_key: formData.marketKey,
        image_url: publicUrlData.publicUrl,
      })
      .select('*')
      .single();

    if (error) {
      setMessage(`Item save failed: ${error.message}. Create the ${SELLER_ITEMS_TABLE} table before using seller uploads.`);
      setMessageType('error');
      setIsSubmitting(false);
      return;
    }

    onSellerItemCreated(mapSellerItemRecord(data));
    setMessage(`Item uploaded successfully to ${t(selectedMarket.labelKey)}.`);
    setMessageType('success');
    setFormData({ title: '', description: '', price: '', marketKey: sellerMarketOptions[0].key });
    setImageFile(null);
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
                <label htmlFor="seller-market" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Market</label>
                <select id="seller-market" name="marketKey" value={formData.marketKey} onChange={handleChange} className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none">
                  {sellerMarketOptions.map((option) => (
                    <option key={option.key} value={option.key}>{t(option.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seller-description" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Description</label>
                <textarea id="seller-description" name="description" value={formData.description} onChange={handleChange} rows={4} placeholder="Short details that should appear with the product in its market." className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="seller-image" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Product image</label>
                <input
                  id="seller-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                  required
                  className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2.5 text-sm text-[var(--svs-text)] outline-none"
                />
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
            <h2 className="text-xl font-bold text-[var(--svs-text)]">Storage Setup</h2>
            <div className="mt-4 space-y-3 text-sm text-[var(--svs-muted)]">
              <p>Use Supabase Postgres for the item details and Supabase Storage for the uploaded image files.</p>
              <p>The app expects a table named <span className="font-semibold text-[var(--svs-text)]">{SELLER_ITEMS_TABLE}</span> and a public storage bucket named <span className="font-semibold text-[var(--svs-text)]">{SELLER_IMAGES_BUCKET}</span>.</p>
              <p>Run the SQL in <span className="font-semibold text-[var(--svs-text)]">supabase/seller-marketplace.sql</span> before using this feature in production.</p>
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

const InternationalLotteryGamesPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.internationalLotteryGames')} subtitle={t('pageSubtitles.internationalLotteryGames')}>
    <div className="mb-5 rounded-xl border border-[#fcd34d] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
      {t('internationalLotteryHub.notice')}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {lotteryGames.map((game) => (
        <article key={game.id} className="overflow-hidden rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
          <img src={game.image} alt={getTranslatedValue(t, game.titleKey, game.title)} className="h-44 w-full object-cover" loading="lazy" />
          <div className="p-4">
            <h3 className="text-lg font-bold">{getTranslatedValue(t, game.titleKey, game.title)}</h3>
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

const BettingHubPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.bettingHub')} subtitle={t('pageSubtitles.bettingHub')}>
    <div className="mb-5 rounded-xl border border-[#f44336] bg-[#fff4f4] p-3 text-sm text-[#b91c1c]">
      Play Responsibly. 18+ Only. Verified transactions and encrypted payments.
    </div>
    <div className="grid gap-4 md:grid-cols-2">
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
  </PageFrame>
  );
};

const BettingVotingMarketPage = () => {
  const { t } = useTranslation();

  return (
  <PageFrame title={t('markets.bettingVoting')} subtitle={t('pageSubtitles.bettingVoting')}>
    <div className="grid gap-4 md:grid-cols-2">
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
      </section>
      <section className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]">
        <h3 className="text-lg font-bold">Place a Prediction</h3>
        <p className="mt-2 text-sm text-slate-600">Choose a match and submit your prediction in one click.</p>
        <Link to="/voting-clients" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
          {t('common.voteNow')}
        </Link>
      </section>
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
  const sortedMarketLinks = useMemo(
    () => [...marketLinks].sort((a, b) => t(a.labelKey).localeCompare(t(b.labelKey))),
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
        {sortedMarketLinks.map((market, index) => (
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
              <span className="rounded-full bg-[var(--svs-cyan-surface)] px-2 py-1 text-xs font-bold text-[var(--svs-primary-strong)]">SVS</span>
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

const CheckoutPage = ({ cartItems, onUpdateCartQuantity, onRemoveCartItem, onPlaceOrder }) => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    fullName: '',
    email: typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''),
    phone: '',
    address: '',
    paymentMethod: 'Card',
    notes: '',
  });
  const totals = useMemo(() => getCartTotals(cartItems), [cartItems]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formState.fullName || !formState.email || !formState.phone || !formState.address || !cartItems.length) {
      return;
    }

    const order = onPlaceOrder(formState);
    navigate('/orders', { state: { orderId: order.id } });
  };

  return (
    <PageFrame title="Checkout" subtitle="Review your cart, confirm your details, and place your order.">
      {!cartItems.length ? (
        <div className="rounded-xl border border-[var(--svs-border)] bg-[var(--svs-cyan-surface)] p-5 text-sm text-[var(--svs-text)]">
          <p>Your cart is empty. Add products or tickets from any market to continue.</p>
          <Link to="/markets" className={`${cudyBluePrimaryButtonClassName} mt-4 inline-flex rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
            Browse Markets
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="space-y-4">
            {cartItems.map((item) => (
              <article key={item.id} className="flex gap-4 rounded-xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-4 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
                <img src={item.image} alt={item.title} className="h-24 w-24 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--svs-text)]">{item.title}</h3>
                      <p className="mt-1 text-sm text-[var(--svs-muted)]">{item.marketName}</p>
                      {item.details ? <p className="mt-1 text-sm text-[var(--svs-muted)]">{item.details}</p> : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--svs-primary-strong)]">{item.unitPriceLabel}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-[var(--svs-border)]">
                      <button type="button" onClick={() => onUpdateCartQuantity(item.id, -1)} className="px-3 py-2 text-sm font-semibold text-[var(--svs-text)]">-</button>
                      <span className="min-w-10 border-x border-[var(--svs-border)] px-3 py-2 text-center text-sm font-semibold text-[var(--svs-text)]">{item.quantity}</span>
                      <button type="button" onClick={() => onUpdateCartQuantity(item.id, 1)} className="px-3 py-2 text-sm font-semibold text-[var(--svs-text)]">+</button>
                    </div>
                    <button type="button" onClick={() => onRemoveCartItem(item.id)} className="text-sm font-semibold text-rose-600 transition hover:text-rose-500">
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_4px_8px_rgba(0,0,0,0.08)]">
            <h2 className="text-xl font-bold text-[var(--svs-text)]">Order Summary</h2>
            <div className="mt-4 space-y-2 text-sm text-[var(--svs-muted)]">
              <div className="flex items-center justify-between"><span>Items</span><span>{getCartCount(cartItems)}</span></div>
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCheckoutAmount(totals.subtotal)}</span></div>
              <div className="flex items-center justify-between"><span>Service fee</span><span>{formatCheckoutAmount(totals.serviceFee)}</span></div>
              <div className="flex items-center justify-between border-t border-[var(--svs-border)] pt-3 text-base font-bold text-[var(--svs-text)]"><span>Total</span><span>{formatCheckoutAmount(totals.total)}</span></div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="text"
                value={formState.fullName}
                onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Full name"
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              />
              <input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email address"
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              />
              <input
                type="tel"
                value={formState.phone}
                onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone number"
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              />
              <textarea
                value={formState.address}
                onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
                placeholder="Delivery address or booking notes"
                rows={3}
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              />
              <select
                value={formState.paymentMethod}
                onChange={(event) => setFormState((current) => ({ ...current, paymentMethod: event.target.value }))}
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              >
                <option>Card</option>
                <option>Cash on Delivery</option>
                <option>Bank Transfer</option>
              </select>
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Additional notes"
                rows={2}
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              />
              <button type="submit" className={`${cudyBluePrimaryButtonClassName} w-full rounded-lg bg-[var(--svs-primary)] px-4 py-3 text-sm font-semibold text-white`}>
                Place Order
              </button>
            </form>
          </section>
        </div>
      )}
    </PageFrame>
  );
};

const OrdersPage = ({ orders, cartItems, onAdvanceOrderStatus }) => {
  const { t } = useTranslation();

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
                <p className="mt-1 text-sm text-[var(--svs-muted)]">{order.customer.fullName} • {order.customer.email}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                {order.status}
              </span>
            </div>
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
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCheckoutAmount(order.subtotal)}</span></div>
                  <div className="flex items-center justify-between"><span>Service fee</span><span>{formatCheckoutAmount(order.serviceFee)}</span></div>
                  <div className="flex items-center justify-between border-t border-[var(--svs-border)] pt-3 text-base font-bold text-[var(--svs-text)]"><span>Total</span><span>{formatCheckoutAmount(order.total)}</span></div>
                </div>
                {order.status !== ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.length - 1] ? (
                  <button type="button" onClick={() => onAdvanceOrderStatus(order.id)} className={`${cudyBluePrimaryButtonClassName} mt-4 w-full rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}>
                    Advance Status
                  </button>
                ) : null}
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

const PageFrame = ({ title, subtitle, children, darkHero = false }) => (
  <section className={`${darkHero ? 'bg-[#121212] text-white' : 'bg-[var(--svs-bg)] text-[var(--svs-text)]'} px-4 py-8 sm:py-10`}>
    <div className="mx-auto w-full max-w-7xl">
      <div className={`${darkHero ? 'border-[#2a2a2a] bg-[#1e1e1e]' : 'border-[var(--svs-border)] bg-[var(--svs-surface)]'} rounded-2xl border p-6 shadow-[0_4px_8px_rgba(0,0,0,0.1)]`}>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className={`${darkHero ? 'text-slate-300' : 'text-[var(--svs-muted)]'} mt-2 text-sm sm:text-base`}>{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  </section>
);

const CardGrid = ({ items, buttonLabel, secondaryButtonLabel, metaRenderer, onPrimaryAction }) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const itemTitle = getTranslatedValue(t, item.titleKey, item.title);

        return (
          <article key={item.id} className="overflow-hidden rounded-xl border border-[var(--svs-border)] bg-[var(--svs-card-bg)] shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition hover:scale-[1.03]">
            <img src={item.image} alt={itemTitle} className="h-40 w-full object-cover" loading="lazy" />
            <div className="p-4">
              <h3 className="text-lg font-bold">{itemTitle}</h3>
              <div className="mt-1">{metaRenderer(item)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onPrimaryAction?.(item)} className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--svs-primary-strong)]`}>
                  {buttonLabel}
                </button>
                <button type="button" className="rounded-md border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm font-semibold text-[var(--svs-text)]">
                  {secondaryButtonLabel}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

const SiteFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-gradient-to-b from-[#121212] to-[#007b9c] px-4 py-10 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-4">
        <div>
          <h3 className="text-xl font-bold">SVS E-Commerce</h3>
          <p className="mt-2 text-sm text-slate-100">{t('site.tagline')}</p>
          <p className="mt-3 text-sm text-slate-200">{t('site.address')}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">{t('footer.quickLinks')}</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {footerLinks.quick.map((item) => (
              <li key={item.href}>
                <Link to={item.href} className="text-slate-100 transition hover:text-white">{t(item.labelKey)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">{t('footer.support')}</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {footerLinks.support.map((item) => (
              <li key={item.href}>
                <Link to={item.href} className="text-slate-100 transition hover:text-white">{t(item.labelKey)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">{t('footer.subscribe')}</h4>
          <div className="mt-2 space-y-2">
            <input type="text" placeholder={t('footer.subscribePlaceholder')} className="w-full rounded-md border border-cyan-200/40 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-200" aria-label={t('footer.subscribeAria')} />
            <button type="button" className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold`}>{t('footer.subscribe')}</button>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-white/20 px-2 py-1 text-xs">FB</span>
            <span className="rounded-full bg-white/20 px-2 py-1 text-xs">TW</span>
            <span className="rounded-full bg-white/20 px-2 py-1 text-xs">IG</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 border-t border-white/20 pt-4 text-xs text-slate-100">
        <p>{t('footer.last', { year: getCurrentYear() })} • SVS E-Commerce</p>
        <p className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> {t('footer.securePayments')}</p>
      </div>
    </footer>
  );
};

const AppRoutes = ({ cartItems, orders, sellerItems, onAddToCart, onUpdateCartQuantity, onRemoveCartItem, onPlaceOrder, onAdvanceOrderStatus, onSellerItemCreated, onDeleteSellerItem, onUpdateSellerItem }) => {
  const { t } = useTranslation();

  return (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/markets" element={<MarketsPage />} />
    <Route path="/offers" element={<OffersPage />} />
    <Route path="/orders" element={<OrdersPage orders={orders} cartItems={cartItems} onAdvanceOrderStatus={onAdvanceOrderStatus} />} />
    <Route path="/checkout" element={<CheckoutPage cartItems={cartItems} onUpdateCartQuantity={onUpdateCartQuantity} onRemoveCartItem={onRemoveCartItem} onPlaceOrder={onPlaceOrder} />} />
    <Route path="/search" element={<SearchResultsPage />} />

    <Route path="/e-commerce" element={<ECommercePage onAddToCart={onAddToCart} sellerItems={sellerItems} />} />
    <Route path="/tickets" element={<TicketsPage onAddToCart={onAddToCart} />} />
    <Route path="/bookings-tickets" element={<BookingsTicketsPage onAddToCart={onAddToCart} />} />
    <Route path="/voting-clients" element={<VotingClientsPage />} />
    <Route path="/voting-providers" element={<VotingProvidersPage />} />
    <Route path="/groceries" element={<GroceriesPage onAddToCart={onAddToCart} sellerItems={sellerItems} />} />
    <Route path="/fast-food" element={<FastFoodPage onAddToCart={onAddToCart} sellerItems={sellerItems} />} />
    <Route path="/beverages-liquors" element={<BeveragesLiquorsPage onAddToCart={onAddToCart} sellerItems={sellerItems} />} />
    <Route path="/wellness" element={<WellnessPage onAddToCart={onAddToCart} sellerItems={sellerItems} />} />
    <Route path="/home-care" element={<HomeCarePage />} />
    <Route path="/hardware-software" element={<HardwareSoftwarePage onAddToCart={onAddToCart} sellerItems={sellerItems} />} />
    <Route path="/seller/upload" element={<SellerUploadPage onSellerItemCreated={onSellerItemCreated} />} />
    <Route path="/seller/dashboard" element={<SellerDashboardPage onDeleteSellerItem={onDeleteSellerItem} onUpdateSellerItem={onUpdateSellerItem} />} />
    <Route path="/property-hub" element={<PropertyHubPage />} />
    <Route path="/international-lottery-games" element={<InternationalLotteryGamesPage />} />
    <Route path="/livestock-hub" element={<LivestockHubPage />} />
    <Route path="/betting-hub" element={<BettingHubPage />} />
    <Route path="/betting-voting" element={<BettingVotingMarketPage />} />
    <Route path="/safety" element={<SafetyPage />} />

    <Route path="/signin" element={<SigninPage />} />
    <Route path="/signup" element={<SignupPage />} />

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
  const [cartItems, setCartItems] = useState(getStoredCartItems);
  const [orders, setOrders] = useState(getStoredOrders);
  const [sellerItems, setSellerItems] = useState([]);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const loadSellerItems = useCallback(async () => {
    if (!hasSupabaseEnv || !supabase) {
      setSellerItems([]);
      return;
    }

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .select('id, seller_email, seller_name, title, description, price, market_key, image_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return;
    }

    setSellerItems((data || []).map(mapSellerItemRecord));
  }, []);

  useEffect(() => {
    loadSellerItems();
  }, [loadSellerItems]);

  const handleAddToCart = useCallback((cartItem) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === cartItem.id);

      if (existingItem) {
        return currentItems.map((item) => (
          item.id === cartItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }

      return [...currentItems, cartItem];
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((itemId, delta) => {
    setCartItems((currentItems) => currentItems.reduce((nextItems, item) => {
      if (item.id !== itemId) {
        nextItems.push(item);
        return nextItems;
      }

      const nextQuantity = item.quantity + delta;

      if (nextQuantity > 0) {
        nextItems.push({ ...item, quantity: nextQuantity });
      }

      return nextItems;
    }, []));
  }, []);

  const handleRemoveCartItem = useCallback((itemId) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }, []);

  const handlePlaceOrder = useCallback((customer) => {
    const totals = getCartTotals(cartItems);
    const order = {
      id: `order-${Date.now()}`,
      reference: `SVS-${String(Date.now()).slice(-8)}`,
      createdAt: new Date().toISOString(),
      customer,
      items: cartItems,
      paymentMethod: customer.paymentMethod,
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      total: totals.total,
      status: ORDER_STATUS_FLOW[0],
    };

    setOrders((currentOrders) => [order, ...currentOrders]);
    setCartItems([]);

    return order;
  }, [cartItems]);

  const handleAdvanceOrderStatus = useCallback((orderId) => {
    setOrders((currentOrders) => currentOrders.map((order) => (
      order.id === orderId
        ? { ...order, status: getOrderStatusStep(order.status) }
        : order
    )));
  }, []);

  const handleSellerItemCreated = useCallback((item) => {
    setSellerItems((currentItems) => [item, ...currentItems]);
  }, []);

  const handleDeleteSellerItem = useCallback(async (dbId, imageUrl) => {
    if (!hasSupabaseEnv || !supabase) return;

    const bucketPrefix = `/object/public/${SELLER_IMAGES_BUCKET}/`;
    const bucketIndex = String(imageUrl || '').indexOf(bucketPrefix);

    if (bucketIndex !== -1) {
      const storagePath = imageUrl.slice(bucketIndex + bucketPrefix.length);
      await supabase.storage.from(SELLER_IMAGES_BUCKET).remove([storagePath]);
    }

    await supabase.from(SELLER_ITEMS_TABLE).delete().eq('id', dbId);
    setSellerItems((currentItems) => currentItems.filter((item) => item.dbId !== dbId));
  }, []);

  const handleUpdateSellerItem = useCallback(async (dbId, updates, newImageFile) => {
    if (!hasSupabaseEnv || !supabase) return { error: 'Supabase is not configured.' };

    let imageUrl = updates.imageUrl;

    if (newImageFile) {
      const sellerEmail = typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || '');
      const fileExtension = newImageFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;
      const filePath = `${sanitizeStorageSegment(sellerEmail)}/${updates.marketKey}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(SELLER_IMAGES_BUCKET)
        .upload(filePath, newImageFile, { cacheControl: '3600', upsert: false });

      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage.from(SELLER_IMAGES_BUCKET).getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        market_key: updates.marketKey,
        ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
      })
      .eq('id', dbId)
      .select('*')
      .single();

    if (error) return { error: error.message };

    setSellerItems((currentItems) =>
      currentItems.map((item) => (item.dbId === dbId ? mapSellerItemRecord(data) : item)),
    );

    return { data };
  }, []);

  return (
    <Shell cartItemCount={getCartCount(cartItems)}>
      <AppRoutes
        cartItems={cartItems}
        orders={orders}
        sellerItems={sellerItems}
        onAddToCart={handleAddToCart}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveCartItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
        onAdvanceOrderStatus={handleAdvanceOrderStatus}
        onSellerItemCreated={handleSellerItemCreated}
        onDeleteSellerItem={handleDeleteSellerItem}
        onUpdateSellerItem={handleUpdateSellerItem}
      />
    </Shell>
  );
};

export default App;

