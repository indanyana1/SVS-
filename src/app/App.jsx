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
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import logo from '../assets/icons/logo.jpeg';
import { DEFAULT_LANGUAGE_CODE, getLanguageByCode, isRtlLanguage, SUPPORTED_LANGUAGES } from '../lib/languages';
import { embeddedCardCheckoutEnabled, stripeCurrency, getStripeInstance } from '../lib/payments';
import { hasSupabaseEnv, supabase } from '../lib/supabase';
import SigninPage from '../pages/SigninPage';
import SignupPage from '../pages/SignupPage';

let stripePromise = null;

const navItems = [
  { labelKey: 'nav.home', href: '/' },
  { labelKey: 'nav.markets', href: '/markets' },
  { labelKey: 'nav.offers', href: '/offers' },
  { labelKey: 'nav.orders', href: '/orders' },
];

const marketLinks = [
  { labelKey: 'markets.beverages', href: '/beverages-liquors' },
  { labelKey: 'markets.constructionTools', href: '/building-construction-tools' },
  { labelKey: 'markets.votingClients', href: '/voting-clients' },
  { labelKey: 'markets.safety', href: '/safety' },
  { labelKey: 'markets.hardwareSoftware', href: '/hardware-software' },
  { labelKey: 'markets.tickets', href: '/tickets' },
  { labelKey: 'markets.votingProviders', href: '/voting-providers' },
  { labelKey: 'markets.fastFood', href: '/fast-food' },
  { labelKey: 'markets.groceries', href: '/groceries' },
  { labelKey: 'markets.homeCare', href: '/home-care' },
  { labelKey: 'markets.ecommerce', href: '/e-commerce' },
  { labelKey: 'markets.livestockHub', href: '/livestock-hub' },
  { labelKey: 'markets.internationalLotteryGames', href: '/international-lottery-games' },
  { labelKey: 'markets.wellness', href: '/wellness' },
  { labelKey: 'markets.propertyHub', href: '/property-hub' },
  { labelKey: 'markets.bookings', href: '/bookings-tickets' },
  { labelKey: 'markets.bettingHub', href: '/betting-hub' },
  { labelKey: 'markets.bettingVoting', href: '/betting-voting' },
  { labelKey: 'markets.stationery', href: '/stationery-office' },
];

const sellerMarketOptions = [
  { key: 'beverages', labelKey: 'markets.beverages', route: '/beverages-liquors' },
  { key: 'constructionTools', labelKey: 'markets.constructionTools', route: '/building-construction-tools' },
  { key: 'hardwareSoftware', labelKey: 'markets.hardwareSoftware', route: '/hardware-software' },
  { key: 'fastFood', labelKey: 'markets.fastFood', route: '/fast-food' },
  { key: 'groceries', labelKey: 'markets.groceries', route: '/groceries' },
  { key: 'ecommerce', labelKey: 'markets.ecommerce', route: '/e-commerce' },
  { key: 'wellness', labelKey: 'markets.wellness', route: '/wellness' },
  { key: 'stationery', labelKey: 'markets.stationery', route: '/stationery-office' },
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
    section: 'Lottery Games Hub',
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
const WISHLIST_STORAGE_KEY = 'svs-wishlist-items';
const ORDERS_STORAGE_KEY = 'svs-orders';
const NOTIFICATIONS_STORAGE_KEY = 'svs-notifications';
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

const getMarketplaceItemSaveErrorMessage = (errorMessage) => {
  const normalizedMessage = String(errorMessage || '').toLowerCase();

  if (normalizedMessage.includes('marketplace_items_market_key_check')) {
    return `Item save failed: ${errorMessage}. Rerun supabase/seller-marketplace.sql so the ${SELLER_ITEMS_TABLE} market_key constraint includes the selected market.`;
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

const createSavedItem = ({ id, title, image, price, route, marketName, details = '', sellerName = '', sellerEmail = '' }) => ({
  id: getCollectionItemId(route, id),
  sku: id,
  title,
  image,
  route,
  marketName,
  details,
  sellerName,
  sellerEmail: normalizeEmail(sellerEmail),
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

  return {
    id: `seller-${record.id}`,
    dbId: record.id,
    title: record.title,
    description: record.description || '',
    price: record.price,
    image: primaryImage,
    images: imageList.length ? imageList : (primaryImage ? [primaryImage] : []),
    marketKey: record.market_key,
    route: marketConfig.route,
    sellerName: record.seller_name || record.seller_email || 'Seller',
    sellerEmail: record.seller_email || '',
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

const Shell = ({ children, cartItemCount = 0, wishlistItemCount = 0, notifications = [], onMarkNotificationsRead }) => {
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileName, setProfileName] = useState('SVS User');
  const [theme, setTheme] = useState(getThemePreference);
  const languageCardRefs = useRef([]);
  const desktopLanguageMenuRef = useRef(null);
  const mobileLanguageMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);
  const isDarkMode = theme === 'dark';
  const activeLanguage = getLanguageByCode(i18n.resolvedLanguage || i18n.language);
  const unreadNotificationsCount = useMemo(
    () => notifications.reduce((count, notification) => (notification.read ? count : count + 1), 0),
    [notifications],
  );

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
    setIsNotificationsOpen(false);
  }, [location.pathname]);

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
    window.dispatchEvent(new Event('svs-auth-changed'));
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
            <Link to="/wishlist" aria-label="Open wishlist" className="relative rounded-full p-1.5 transition hover:bg-[var(--svs-cyan-surface)]">
              <Heart className={`h-5 w-5 ${cudyBluePrimaryIconClassName}`} />
              {wishlistItemCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--svs-primary)] px-1 text-[10px] font-bold text-white">
                  {wishlistItemCount}
                </span>
              ) : null}
            </Link>
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
                    <p className="text-xs text-[var(--svs-muted)]">{notifications.length} total</p>
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

const ECommercePage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
        onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const TicketsPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], onOpenItemDetails }) => {
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
        <div className="relative min-w-[190px]">
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className={`${languageFeatureSelectClassName} pr-10`}
            aria-label={t('ticketsPage.filters.typeAria')}
          >
            <option value="All">{t('ticketsPage.filters.all')}</option>
            <option value="Concert">{t('ticketsPage.types.concert')}</option>
            <option value="Movie">{t('ticketsPage.types.movie')}</option>
            <option value="Sports">{t('ticketsPage.types.sports')}</option>
            <option value="Travel">{t('ticketsPage.types.travel')}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
        </div>
        <div className="relative min-w-[190px]">
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            className={`${languageFeatureSelectClassName} pr-10`}
            aria-label={t('ticketsPage.filters.locationAria')}
          >
            <option value="All">{t('ticketsPage.filters.all')}</option>
            <option value="Cape Town">{t('ticketsPage.locations.capeTown')}</option>
            <option value="Nu Metro">{t('ticketsPage.locations.nuMetro')}</option>
            <option value="Kings">{t('ticketsPage.locations.kings')}</option>
            <option value="Durban">{t('ticketsPage.locations.durban')}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-[#eeeeee] bg-white shadow-[0_4px_8px_rgba(0,0,0,0.1)] transition hover:scale-[1.03]"
            role="button"
            tabIndex={0}
            onClick={() => {
              const details = `${formatDate(event.date, currentLocale)} • ${t(event.locationKey, { defaultValue: event.location })}`;
              const cartItem = createCartItem({ ...event, route: '/tickets', marketName: t('markets.tickets'), details });
              const wishlistItem = createWishlistItem({ ...event, route: '/tickets', marketName: t('markets.tickets'), details });
              onOpenItemDetails?.({
                title: t(event.titleKey, { defaultValue: event.title }),
                image: event.image,
                images: event.images || (event.image ? [event.image] : []),
                marketName: t('markets.tickets'),
                details,
                priceLabel: getSalePrices(event.price).nowPrice,
                cartItem,
                wishlistItem,
              });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(createCartItem({
                    ...event,
                    route: '/tickets',
                    marketName: t('markets.tickets'),
                    details: `${formatDate(event.date, currentLocale)} • ${t(event.locationKey, { defaultValue: event.location })}`,
                    }));
                  }}
                  className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--svs-primary-strong)]`}
                >
                  {t('ticketsPage.bookNow')}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleWishlist(createWishlistItem({
                    ...event,
                    route: '/tickets',
                    marketName: t('markets.tickets'),
                    details: `${formatDate(event.date, currentLocale)} • ${t(event.locationKey, { defaultValue: event.location })}`,
                    }));
                  }}
                  aria-pressed={wishlistItemIds.includes(getCollectionItemId('/tickets', event.id))}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${wishlistItemIds.includes(getCollectionItemId('/tickets', event.id)) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-[var(--svs-border)] bg-[var(--svs-surface-soft)] text-[var(--svs-text)]'}`}
                >
                  <Heart className={`h-4 w-4 ${wishlistItemIds.includes(getCollectionItemId('/tickets', event.id)) ? 'fill-current' : ''}`} />
                  Wishlist
                </button>
              </div>
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

const BookingsTicketsPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], onOpenItemDetails }) => {
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
        <article
          key={`booking-${event.id}`}
          className="rounded-xl border border-[#eeeeee] bg-white p-4 shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
          role="button"
          tabIndex={0}
          onClick={() => {
            const details = `${formatDate(event.date)} • ${event.location}`;
            const cartItem = createCartItem({ ...event, route: '/bookings-tickets', marketName: t('markets.bookings'), details });
            const wishlistItem = createWishlistItem({ ...event, route: '/bookings-tickets', marketName: t('markets.bookings'), details });
            onOpenItemDetails?.({
              title: event.title,
              image: event.image,
              images: event.images || (event.image ? [event.image] : []),
              marketName: t('markets.bookings'),
              details,
              priceLabel: getSalePrices(event.price).nowPrice,
              cartItem,
              wishlistItem,
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.currentTarget.click();
            }
          }}
        >
          <h3 className="text-lg font-bold">{event.title}</h3>
          <p className="mt-1 text-sm text-slate-600">{formatDate(event.date)} • {event.location}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(createCartItem({
                ...event,
                route: '/bookings-tickets',
                marketName: t('markets.bookings'),
                details: `${formatDate(event.date)} • ${event.location}`,
                }));
              }}
              className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white`}
            >
              {t('common.bookNow')}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(createWishlistItem({
                ...event,
                route: '/bookings-tickets',
                marketName: t('markets.bookings'),
                details: `${formatDate(event.date)} • ${event.location}`,
                }));
              }}
              aria-pressed={wishlistItemIds.includes(getCollectionItemId('/bookings-tickets', event.id))}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${wishlistItemIds.includes(getCollectionItemId('/bookings-tickets', event.id)) ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-[var(--svs-border)] bg-[var(--svs-surface-soft)] text-[var(--svs-text)]'}`}
            >
              <Heart className={`h-4 w-4 ${wishlistItemIds.includes(getCollectionItemId('/bookings-tickets', event.id)) ? 'fill-current' : ''}`} />
              Wishlist
            </button>
          </div>
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

const GroceriesPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('Fruits');
  const marketItems = useMemo(() => [...getSellerItemsForMarket(sellerItems, 'groceries'), ...groceries], [sellerItems]);
  const buildCartItem = (item) => createCartItem({
    ...item,
    route: '/groceries',
    marketName: t('markets.groceries'),
    details: item.discount || item.description || item.sellerName,
  });
  const buildWishlistItem = (item) => createWishlistItem({
    ...item,
    route: '/groceries',
    marketName: t('markets.groceries'),
    details: item.discount || item.description || item.sellerName,
  });

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
        onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
        onToggleWishlist={(item) => onToggleWishlist(buildWishlistItem(item))}
        onOpenItemDetails={(item) => {
          const wishlistItem = buildWishlistItem(item);
          onOpenItemDetails?.({
            title: getTranslatedValue(t, item.titleKey, item.title),
            image: item.image,
            images: item.images || (item.image ? [item.image] : []),
            marketName: t('markets.groceries'),
            details: item.discount || item.description || item.sellerName,
            priceLabel: getSalePrices(item.price).nowPrice,
            cartItem: buildCartItem(item),
            wishlistItem,
          });
        }}
        isItemWishlisted={(item) => wishlistItemIds.includes(getCollectionItemId('/groceries', item.id))}
        metaRenderer={(item) => <p className="text-sm text-slate-600"><SalePrice price={item.price} /> • {item.discount || item.sellerName || 'Seller item'}</p>}
      />
    </PageFrame>
  );
};

const FastFoodPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const BeveragesLiquorsPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const WellnessPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const StationeryPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const ConstructionToolsPage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const HardwareSoftwarePage = ({ onAddToCart, onToggleWishlist, wishlistItemIds = [], sellerItems = [], onOpenItemDetails }) => {
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
      onPrimaryAction={(item) => onAddToCart(buildCartItem(item))}
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

const MARKET_BADGE_COLORS = {
  ecommerce: 'bg-blue-100 text-blue-700',
  groceries: 'bg-green-100 text-green-700',
  fastFood: 'bg-orange-100 text-orange-700',
  beverages: 'bg-purple-100 text-purple-700',
  constructionTools: 'bg-yellow-100 text-yellow-800',
  wellness: 'bg-teal-100 text-teal-700',
  stationery: 'bg-amber-100 text-amber-700',
  hardwareSoftware: 'bg-slate-100 text-slate-700',
};

const SellerDashboardPage = ({ orders = [], onDeleteSellerItem, onUpdateSellerItem, onUpdateOrderStatus }) => {
  const { t } = useTranslation();
  const isAuthenticated = getAuthState();
  const userEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));

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
      { title: editForm.title, description: editForm.description, price: editForm.price, marketKey: editForm.marketKey, imageUrl: item.image, imageUrls: item.images || [] },
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
    await onDeleteSellerItem(item.dbId, item.images || [], item.image);
    setMyListings((current) => current.filter((listing) => listing.dbId !== item.dbId));
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
                        <MarketSelectorField
                          id={`edit-market-${item.dbId}`}
                          value={editForm.marketKey}
                          onChange={(marketKey) => setEditForm((current) => ({ ...current, marketKey }))}
                          ariaLabel="Edit listing market"
                        />
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

      <section className="mt-10 space-y-4 rounded-2xl border border-[var(--svs-border)] bg-[var(--svs-surface)] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--svs-text)]">Order Management</h2>
            <p className="text-sm text-[var(--svs-muted)]">Track orders containing your listings and update fulfillment, shipping, and refund status.</p>
          </div>
          <span className="rounded-full border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--svs-text)]">
            {visibleOrders.length} order{visibleOrders.length === 1 ? '' : 's'}
          </span>
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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    marketKey: '',
  });
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

    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    if (!trimmedTitle || !trimmedDescription || !trimmedPrice || !formData.marketKey) {
      setMessage('Fill in all required fields and select a market before publishing your listing.');
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
        price: trimmedPrice,
        market_key: formData.marketKey,
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
    setFormData({ title: '', description: '', price: '', marketKey: '' });
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
                <label htmlFor="seller-market" className="mb-1 block text-sm font-medium text-[var(--svs-text)]">Market</label>
                <MarketSelectorField
                  id="seller-market"
                  value={formData.marketKey}
                  onChange={(marketKey) => setFormData((current) => ({ ...current, marketKey }))}
                  placeholder="Select Market"
                  ariaLabel="Select listing market"
                />
              </div>
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
              <p>Use a clean, bright image where the product fills most of the frame.</p>
              <p>Set a realistic price so your listing performs better in market results.</p>
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

const StripePaymentForm = ({ onStripeContextChange }) => {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    onStripeContextChange({ stripe, elements });
  }, [stripe, elements, onStripeContextChange]);

  return (
    <div>
      <PaymentElement />
    </div>
  );
};

const CheckoutPage = ({ cartItems, onUpdateCartQuantity, onRemoveCartItem, onPlaceOrder }) => {
  const navigate = useNavigate();
  const cardPaymentsEnabled = embeddedCardCheckoutEnabled;
  const stripeInstance = useMemo(() => {
    if (!cardPaymentsEnabled) {
      return null;
    }

    if (!stripePromise) {
      stripePromise = getStripeInstance();
    }

    return stripePromise;
  }, [cardPaymentsEnabled]);
  const [formState, setFormState] = useState({
    fullName: '',
    email: typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''),
    phone: '',
    address: '',
    paymentMethod: cardPaymentsEnabled ? 'Card' : 'Cash on Delivery',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [stripeContext, setStripeContext] = useState({ stripe: null, elements: null });
  const stripeElementsOptions = useMemo(() => ({ clientSecret }), [clientSecret]);
  const totals = useMemo(() => getCartTotals(cartItems), [cartItems]);
  const handleStripeContextChange = useCallback((nextContext) => {
    setStripeContext(nextContext);
  }, []);

  useEffect(() => {
    if (formState.paymentMethod === 'Card' && cardPaymentsEnabled && !clientSecret) {
      const initializePayment = async () => {
        try {
          const response = await fetch('/api/payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Math.round(totals.total * 100),
              currency: stripeCurrency,
              email: formState.email,
              fullName: formState.fullName,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to initialize payment. Payment API may be unavailable.');
          }

          const { clientSecret: secret } = await response.json();
          setClientSecret(secret || '');
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : 'Payment initialization failed.');
        }
      };

      initializePayment();
    }
  }, [formState.paymentMethod, cardPaymentsEnabled, formState.email, formState.fullName, totals.total, clientSecret]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!formState.fullName || !formState.email || !formState.phone || !formState.address || !cartItems.length) {
      setSubmitError('Please complete your customer details before placing the order.');
      return;
    }

    setIsSubmitting(true);

    let paymentDetails = {
      provider: formState.paymentMethod,
      status: formState.paymentMethod === 'Card' ? 'pending' : 'pending-offline',
      reference: '',
      currency: stripeCurrency,
    };

    if (formState.paymentMethod === 'Card') {
      if (!clientSecret) {
        setIsSubmitting(false);
        setSubmitError('Payment form is still loading. Please wait a moment and try again.');
        return;
      }

      if (!stripeContext.stripe || !stripeContext.elements) {
        setIsSubmitting(false);
        setSubmitError('Secure card form is not ready yet. Please wait a moment and try again.');
        return;
      }

      const { error, paymentIntent } = await stripeContext.stripe.confirmPayment({
        elements: stripeContext.elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setIsSubmitting(false);
        setSubmitError(error.message || 'Card payment failed. Please check your details and try again.');
        return;
      }

      if (!paymentIntent || (paymentIntent.status !== 'succeeded' && paymentIntent.status !== 'processing')) {
        setIsSubmitting(false);
        setSubmitError('Payment was not completed. Please try again.');
        return;
      }

      paymentDetails = {
        provider: 'Stripe',
        status: paymentIntent.status === 'succeeded' ? 'paid' : 'processing',
        reference: paymentIntent.id,
        currency: stripeCurrency,
      };

      setSubmitError('');
    }

    const order = await onPlaceOrder(formState, paymentDetails);
    setIsSubmitting(false);
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
              <div className="relative">
                <select
                  value={formState.paymentMethod}
                  onChange={(event) => setFormState((current) => ({ ...current, paymentMethod: event.target.value }))}
                  className={`${languageFeatureSelectClassName} pr-10`}
                >
                  <option value="Card" disabled={!cardPaymentsEnabled}>Card {cardPaymentsEnabled ? '' : '(Unavailable)'}</option>
                  <option>Cash on Delivery</option>
                  <option>Bank Transfer</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--svs-primary-strong)]" />
              </div>

              {formState.paymentMethod === 'Card' && clientSecret && (
                <div className="rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] p-4">
                  <Elements stripe={stripeInstance} options={stripeElementsOptions}>
                    <StripePaymentForm onStripeContextChange={handleStripeContextChange} />
                  </Elements>
                </div>
              )}
              <textarea
                value={formState.notes}
                onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Additional notes"
                rows={2}
                className="w-full rounded-lg border border-[var(--svs-border)] bg-[var(--svs-surface-soft)] px-3 py-2 text-sm text-[var(--svs-text)] outline-none"
              />
              {submitError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {submitError}
                </div>
              ) : null}
              <button type="submit" disabled={isSubmitting || (formState.paymentMethod === 'Card' && !clientSecret)} className={`${cudyBluePrimaryButtonClassName} w-full rounded-lg bg-[var(--svs-primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70`}>
                {isSubmitting ? 'Processing...' : (formState.paymentMethod === 'Card' ? 'Pay Now' : 'Place Order')}
              </button>
            </form>
          </section>
        </div>
      )}
    </PageFrame>
  );
};

const OrdersPage = ({ orders, cartItems, onCancelOrder }) => {
  const { t } = useTranslation();
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
                <p className="mt-1 text-sm text-[var(--svs-muted)]">{order.customer.fullName} • {order.customer.email}</p>
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
                  <div className="flex items-center justify-between"><span>Service fee</span><span>{formatCheckoutAmount(order.serviceFee)}</span></div>
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

const ItemDetailsModal = ({ item, onClose, onAddToCart, onToggleWishlist, isWishlisted = false }) => {
  const itemImages = useMemo(() => {
    const rawImages = Array.isArray(item?.images) ? item.images : [];
    const cleanImages = rawImages.filter((url) => typeof url === 'string' && url.trim());

    if (cleanImages.length) {
      return cleanImages;
    }

    return item?.image ? [item.image] : [];
  }, [item]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartXRef = useRef(null);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [item]);

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
            {item.details ? (
              <p className="mt-3 text-sm leading-6 text-[var(--svs-muted)]">{item.details}</p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--svs-muted)]">No additional details available for this item yet.</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {item.cartItem ? (
                <button
                  type="button"
                  onClick={() => onAddToCart(item.cartItem)}
                  className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-4 py-2 text-sm font-semibold text-white`}
                >
                  Add to cart
                </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

const CardGrid = ({ items, buttonLabel, secondaryButtonLabel, metaRenderer, onPrimaryAction, onToggleWishlist, isItemWishlisted, onOpenItemDetails }) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const itemTitle = getTranslatedValue(t, item.titleKey, item.title);

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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPrimaryAction?.(item);
                  }}
                  className={`${cudyBluePrimaryButtonClassName} rounded-md bg-[var(--svs-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--svs-primary-strong)]`}
                >
                  {buttonLabel}
                </button>
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

const AppRoutes = ({ cartItems, wishlistItems, wishlistItemIds, orders, sellerItems, onAddToCart, onToggleWishlist, onRemoveWishlistItem, onUpdateCartQuantity, onRemoveCartItem, onPlaceOrder, onCancelOrder, onSellerItemCreated, onDeleteSellerItem, onUpdateSellerItem, onUpdateOrderStatus, onOpenItemDetails }) => {
  const { t } = useTranslation();

  return (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/markets" element={<MarketsPage />} />
    <Route path="/offers" element={<OffersPage />} />
    <Route path="/orders" element={<OrdersPage orders={orders} cartItems={cartItems} onCancelOrder={onCancelOrder} />} />
    <Route path="/wishlist" element={<WishlistPage wishlistItems={wishlistItems} onAddToCart={onAddToCart} onRemoveWishlistItem={onRemoveWishlistItem} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/checkout" element={<CheckoutPage cartItems={cartItems} onUpdateCartQuantity={onUpdateCartQuantity} onRemoveCartItem={onRemoveCartItem} onPlaceOrder={onPlaceOrder} />} />
    <Route path="/search" element={<SearchResultsPage />} />

    <Route path="/e-commerce" element={<ECommercePage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/tickets" element={<TicketsPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/bookings-tickets" element={<BookingsTicketsPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/voting-clients" element={<VotingClientsPage />} />
    <Route path="/voting-providers" element={<VotingProvidersPage />} />
    <Route path="/groceries" element={<GroceriesPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/fast-food" element={<FastFoodPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/beverages-liquors" element={<BeveragesLiquorsPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/building-construction-tools" element={<ConstructionToolsPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/wellness" element={<WellnessPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/stationery-office" element={<StationeryPage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/home-care" element={<HomeCarePage />} />
    <Route path="/hardware-software" element={<HardwareSoftwarePage onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} wishlistItemIds={wishlistItemIds} sellerItems={sellerItems} onOpenItemDetails={onOpenItemDetails} />} />
    <Route path="/seller/upload" element={<SellerUploadPage onSellerItemCreated={onSellerItemCreated} />} />
    <Route path="/seller/dashboard" element={<SellerDashboardPage orders={orders} onDeleteSellerItem={onDeleteSellerItem} onUpdateSellerItem={onUpdateSellerItem} onUpdateOrderStatus={onUpdateOrderStatus} />} />
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
  const [wishlistItems, setWishlistItems] = useState(getStoredWishlistItems(getCurrentUserEmail()));
  const [orders, setOrders] = useState(getStoredOrders);
  const [notifications, setNotifications] = useState(getStoredNotifications);
  const [sellerItems, setSellerItems] = useState([]);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);
  const [activeUserEmail, setActiveUserEmail] = useState(getCurrentUserEmail);
  const [hasLoadedUserCollections, setHasLoadedUserCollections] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const skipNextOrderSyncRef = useRef(false);
  const normalizedActiveUserEmail = useMemo(() => normalizeEmail(activeUserEmail), [activeUserEmail]);
  const scopedOrders = useMemo(() => orders.filter((order) => {
    if (!normalizedActiveUserEmail) {
      return true;
    }

    return normalizeEmail(order.ownerEmail || order.customer?.email) === normalizedActiveUserEmail;
  }), [orders, normalizedActiveUserEmail]);
  const wishlistItemIds = useMemo(() => wishlistItems.map((item) => item.id), [wishlistItems]);
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
    setNotifications(getStoredNotifications(activeUserEmail));
  }, [activeUserEmail]);

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
      return;
    }

    pushNotificationToStorage(normalizedTargetEmail, notification);
  }, [activeUserEmail]);

  const markNotificationsAsRead = useCallback(() => {
    setNotifications((currentNotifications) => currentNotifications.map((notification) => (
      notification.read ? notification : { ...notification, read: true }
    )));
  }, []);

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
    const allOrdersBelongToUser = orders.length === 0 || orders.every(order => normalizeEmail(order.ownerEmail || '') === normalizedEmail);
    
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
      .select('id, seller_email, seller_name, title, description, price, market_key, image_url, image_urls, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return;
    }

    setSellerItems((data || []).map(mapSellerItemRecord));
  }, []);

  useEffect(() => {
    loadSellerItems();
  }, [loadSellerItems]);

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
    setActionNotice(`Added to cart: ${cartItem.title}`);
  }, [activeUserEmail]);

  const handleUpdateCartQuantity = useCallback((itemId, delta) => {
    let removedItemId = null;
    setCartItems((currentItems) => {
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
  }, [removeCartItemFromRemote, activeUserEmail]);

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

  const handlePlaceOrder = useCallback(async (customer, paymentDetails = null) => {
    const totals = getCartTotals(cartItems);
    const sellerLookup = sellerItems.reduce((lookup, item) => {
      lookup.set(String(item.id || ''), {
        sellerEmail: normalizeEmail(item.sellerEmail || ''),
        sellerName: item.sellerName || '',
      });
      return lookup;
    }, new Map());

    const orderItems = cartItems.map((item) => {
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
      provider: customer.paymentMethod,
      status: customer.paymentMethod === 'Card' ? 'pending' : 'pending-offline',
      reference: '',
      currency: stripeCurrency,
    };
    const order = {
      id: `order-${Date.now()}`,
      reference: `SVS-${String(Date.now()).slice(-8)}`,
      createdAt: new Date().toISOString(),
      ownerEmail: normalizeEmail(activeUserEmail),
      customer,
      items: orderItems,
      paymentMethod: customer.paymentMethod,
      paymentProvider: resolvedPayment.provider,
      paymentStatus: resolvedPayment.status,
      paymentReference: resolvedPayment.reference,
      currency: resolvedPayment.currency,
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      total: totals.total,
      status: 'Processing',
    };

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

    pushNotificationToUser(order.ownerEmail, {
      type: 'order',
      title: 'Order placed',
      message: `${order.reference} is now Processing.`,
      href: '/orders',
      orderId: order.id,
    });

    setCartItems([]);
    clearCartFromRemote();

    return order;
  }, [activeUserEmail, cartItems, clearCartFromRemote, pushNotificationToUser, sellerItems]);

  const handleSellerItemCreated = useCallback((item) => {
    setSellerItems((currentItems) => [item, ...currentItems]);
  }, []);

  const handleDeleteSellerItem = useCallback(async (dbId, imageUrls = [], imageUrl = '') => {
    if (!hasSupabaseEnv || !supabase) return;
    const sellerEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));

    if (!sellerEmail) {
      return;
    }

    const bucketPrefix = `/object/public/${SELLER_IMAGES_BUCKET}/`;
    const sourceUrls = Array.isArray(imageUrls) && imageUrls.length ? imageUrls : (imageUrl ? [imageUrl] : []);
    const storagePaths = sourceUrls
      .map((url) => {
        const bucketIndex = String(url || '').indexOf(bucketPrefix);
        if (bucketIndex === -1) {
          return '';
        }

        return url.slice(bucketIndex + bucketPrefix.length);
      })
      .filter(Boolean);

    if (storagePaths.length) {
      await supabase.storage.from(SELLER_IMAGES_BUCKET).remove(storagePaths);
    }

    await supabase
      .from(SELLER_ITEMS_TABLE)
      .delete()
      .eq('id', dbId)
      .eq('seller_email', sellerEmail);
    setSellerItems((currentItems) => currentItems.filter((item) => item.dbId !== dbId));
  }, []);

  const handleUpdateSellerItem = useCallback(async (dbId, updates, newImageFile) => {
    if (!hasSupabaseEnv || !supabase) return { error: 'Supabase is not configured.' };
    const sellerEmail = normalizeEmail(typeof window === 'undefined' ? '' : (window.localStorage.getItem('svs-user-email') || ''));

    if (!sellerEmail) {
      return { error: 'You must be signed in to update this listing.' };
    }

    let imageUrl = updates.imageUrl;
    let imageUrls = Array.isArray(updates.imageUrls) ? updates.imageUrls : (updates.imageUrl ? [updates.imageUrl] : []);

    if (newImageFile) {
      const fileExtension = newImageFile.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExtension}`;
      const filePath = `${sanitizeStorageSegment(sellerEmail)}/${updates.marketKey}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(SELLER_IMAGES_BUCKET)
        .upload(filePath, newImageFile, { cacheControl: '3600', upsert: false });

      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage.from(SELLER_IMAGES_BUCKET).getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
      imageUrls = [imageUrl];
    }

    const { data, error } = await supabase
      .from(SELLER_ITEMS_TABLE)
      .update({
        title: updates.title,
        description: updates.description,
        price: updates.price,
        market_key: updates.marketKey,
        ...(imageUrl !== undefined ? { image_url: imageUrl, image_urls: imageUrls } : {}),
      })
      .eq('id', dbId)
      .eq('seller_email', sellerEmail)
      .select('*')
      .single();

    if (error) {
      return {
        error: String(error.message || '').toLowerCase().includes('marketplace_items_market_key_check')
          ? `Rerun supabase/seller-marketplace.sql so the ${SELLER_ITEMS_TABLE} market_key constraint includes the selected market.`
          : error.message,
      };
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
        .filter(Boolean),
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

    pushNotificationToUser(targetOrder.ownerEmail || normalizedBuyerEmail, {
      type: 'refund',
      title: 'Order cancelled',
      message: 'Cancellation received. After seller processes the refund, bank reflection may take 3-7 business days.',
      href: '/orders',
      orderId,
    });

    return { data: true };
  }, [activeUserEmail, orders, pushNotificationToUser]);

  const handleOpenItemDetails = useCallback((itemDetails) => {
    setSelectedItemDetails(itemDetails);
  }, []);

  const handleCloseItemDetails = useCallback(() => {
    setSelectedItemDetails(null);
  }, []);

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

  return (
    <Shell
      cartItemCount={getCartCount(cartItems)}
      wishlistItemCount={wishlistItems.length}
      notifications={notifications}
      onMarkNotificationsRead={markNotificationsAsRead}
    >
      <AppRoutes
        cartItems={cartItems}
        wishlistItems={wishlistItems}
        wishlistItemIds={wishlistItemIds}
        orders={scopedOrders}
        sellerItems={sellerItems}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        onRemoveWishlistItem={handleRemoveWishlistItem}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveCartItem={handleRemoveCartItem}
        onPlaceOrder={handlePlaceOrder}
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
        onToggleWishlist={handleToggleWishlist}
        isWishlisted={isDetailsItemWishlisted}
      />
      {actionNotice ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90] max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
          {actionNotice}
        </div>
      ) : null}
    </Shell>
  );
};

export default App;



