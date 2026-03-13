import { CalendarDays, MapPin } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

const categoryTiles = [
  {
    id: 'food',
    title: 'Food',
    description: 'Order meals, snacks, and delicacies near you',
    image:
      'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'groceries',
    title: 'Groceries',
    description: 'Shop fresh produce and household essentials',
    image:
      'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'gadgets',
    title: 'Gadgets',
    description: 'Discover trending electronics and smart devices',
    image:
      'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'animals',
    title: 'Animals & Pets',
    description: 'Browse pets and pet care products',
    image:
      'https://images.pexels.com/photos/4587997/pexels-photo-4587997.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const marketItems = [
  {
    id: 'food-1',
    type: 'food',
    title: 'Hot Wings Combo',
    venue: 'Urban Grill Kitchen',
    date: '2025-11-28',
    country: 'South Africa',
    price: 'R95',
    image:
      'https://images.pexels.com/photos/12081205/pexels-photo-12081205.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'groceries-1',
    type: 'groceries',
    title: 'Farm Fresh Veggie Box',
    venue: 'Fresh Basket Market',
    date: '2025-11-28',
    country: 'South Africa',
    price: 'R149',
    image:
      'https://images.pexels.com/photos/1458694/pexels-photo-1458694.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'gadgets-1',
    type: 'gadgets',
    title: 'Wireless Earbuds Pro',
    venue: 'SVS Electronics',
    date: '2025-12-02',
    country: 'South Africa',
    price: 'R799',
    image:
      'https://images.pexels.com/photos/3394662/pexels-photo-3394662.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'animals-1',
    type: 'animals',
    title: 'Puppy Starter Kit',
    venue: 'Pet Life Store',
    date: '2025-11-28',
    country: 'South Africa',
    price: 'R279',
    image:
      'https://images.pexels.com/photos/4587997/pexels-photo-4587997.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'medicines-1',
    type: 'medicines',
    title: 'Cold Relief Tablets',
    venue: 'SVS Pharmacy',
    date: '2025-12-28',
    country: 'Kenya',
    price: 'R67',
    image:
      'https://images.pexels.com/photos/3683074/pexels-photo-3683074.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'liquor-1',
    type: 'liquor',
    title: 'Premium Red Blend',
    venue: 'Wine Cellar SA',
    date: '2025-12-02',
    country: 'Uganda',
    price: 'R240',
    image:
      'https://images.pexels.com/photos/434311/pexels-photo-434311.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'tickets-1',
    type: 'tickets',
    title: 'Cinema Night Ticket',
    venue: 'Nu Metro Cinemas',
    date: '2025-12-06',
    country: 'South Africa',
    price: 'R120',
    image:
      'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'gadgets-2',
    type: 'gadgets',
    title: 'Smart Home Mini Hub',
    venue: 'SVS Electronics',
    date: '2025-12-10',
    country: 'Uganda',
    price: 'R1099',
    image:
      'https://images.pexels.com/photos/4790268/pexels-photo-4790268.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'food-2',
    type: 'food',
    title: 'Burger Family Meal',
    venue: 'Quick Bite Express',
    date: '2025-12-20',
    country: 'Tanzania',
    price: 'R189',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    id: 'groceries-2',
    type: 'groceries',
    title: 'Home Essentials Basket',
    venue: 'Daily Needs Market',
    date: '2025-12-14',
    country: 'South Africa',
    price: 'R320',
    image:
      'https://images.pexels.com/photos/4198015/pexels-photo-4198015.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const typeLabelMap = {
  all: 'All',
  food: 'Food',
  groceries: 'Groceries',
  gadgets: 'Gadgets',
  animals: 'Animals & Pets',
  medicines: 'Medicines',
  liquor: 'Liquor',
  tickets: 'Tickets',
};

const ticketCategoryOrder = ['all', 'food', 'groceries', 'gadgets', 'animals', 'medicines', 'liquor', 'tickets'];

const formatDate = (isoDate) =>
  new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const SALE_DISCOUNT_RATE = 0.2;

const getSalePrices = (price, discountRate = SALE_DISCOUNT_RATE) => {
  const text = String(price ?? '').trim();
  const match = text.match(/^([^\d-]*)(\d+(?:\.\d+)?)(.*)$/);

  if (!match) {
    return { wasPrice: text, nowPrice: text };
  }

  const [, prefix, amountText, suffix] = match;
  const amount = Number(amountText);

  if (Number.isNaN(amount)) {
    return { wasPrice: text, nowPrice: text };
  }

  const decimals = amountText.includes('.') ? amountText.split('.')[1].length : 0;
  const discountedAmount = Math.max(amount * (1 - discountRate), 0);

  return {
    wasPrice: `${prefix}${amount.toFixed(decimals)}${suffix}`,
    nowPrice: `${prefix}${discountedAmount.toFixed(decimals)}${suffix}`,
  };
};

const SalePrice = ({ price }) => {
  const { wasPrice, nowPrice } = getSalePrices(price);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs text-slate-400 line-through">Was {wasPrice}</span>
      <span className="font-bold text-cyan-300">Now {nowPrice}</span>
    </span>
  );
};

const MarketplaceSection = ({ title, subtitle, items }) => {
  if (!items.length) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 shadow-xl shadow-black/20"
          >
            <img src={item.image} alt={`${item.type} event visual`} className="h-44 w-full object-cover" />
            <div className="p-4">
              <h4 className="text-lg font-semibold text-white">{item.title}</h4>
              <div className="mt-2 space-y-1.5 text-sm text-slate-300">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-cyan-300" />
                  <span>{formatDate(item.date)}</span>
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-300" />
                  <span>{item.venue}</span>
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg text-cyan-300"><SalePrice price={item.price} /></p>
                <button
                  type="button"
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-cyan-400"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="mt-5 rounded-lg border border-cyan-400/70 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
      >
        View More
      </button>
    </section>
  );
};

const TicketsPage = () => {
  const [selectedType, setSelectedType] = useState('all');
  const itemsSectionRef = useRef(null);

  const handleCategorySelect = (type) => {
    setSelectedType(type);

    // Scroll to related items so the filter result is immediately visible.
    setTimeout(() => {
      itemsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const filteredItems = useMemo(() => {
    return marketItems.filter((item) => {
      const matchesType = selectedType === 'all' || item.type === selectedType;

      return matchesType;
    });
  }, [selectedType]);

  const selectedCategoryLabel = typeLabelMap[selectedType] || 'All';

  const sectionTitle = selectedType === 'all' ? 'Trending Marketplace Items' : `${selectedCategoryLabel} Items`;

  const sectionSubtitle =
    selectedType === 'all'
      ? 'Browse popular products across all marketplace categories.'
      : `Showing related products in ${selectedCategoryLabel}.`;

  return (
    <section className="min-h-screen bg-[#0b1220] px-4 pb-12 pt-28 text-slate-100">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/75 p-5">
          <div className="text-sm text-slate-300">
            Tap a category below to instantly view related items from the marketplace.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ticketCategoryOrder.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleCategorySelect(type)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedType === type
                    ? 'bg-cyan-400 text-slate-950'
                    : 'border border-slate-700 bg-slate-950/80 text-slate-200 hover:border-cyan-400/70'
                }`}
              >
                {typeLabelMap[type]}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {categoryTiles.map((tile) => (
            <article
              key={tile.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-700 shadow-xl shadow-black/25"
            >
              <img
                src={tile.image}
                alt={`${tile.title} category visual`}
                className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
              <div className="absolute bottom-0 z-10 p-4">
                <h2 className="text-xl font-bold text-white">{tile.title}</h2>
                <p className="mt-1 text-sm text-slate-200">{tile.description}</p>
                <button
                  type="button"
                  onClick={() => handleCategorySelect(tile.id)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                >
                  Explore Category <span aria-hidden="true">-&gt;</span>
                </button>
              </div>
            </article>
          ))}
        </section>

        <div ref={itemsSectionRef}>
          <MarketplaceSection
            title={sectionTitle}
            subtitle={sectionSubtitle}
            items={filteredItems}
          />
        </div>

        {filteredItems.length === 0 && (
          <div className="mt-10 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            No items matched your filters. Try changing category.
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
          Related items update instantly when you click a category or change filters.
        </div>
      </div>
    </section>
  );
};

export default TicketsPage;
