import React, { useState } from 'react';

const CATEGORY_OPTIONS = [
  'All',
  'Fresh Fruits',
  'Fresh Vegetables',
  'Organic Produce',
  'Local Harvest',
  'Ready to Cook',
  'Seasonal Fruits',
  'Cut & Ready Produce',
  'Herbs & Seasonings',
];


const AVAILABILITY_OPTIONS = [
  'Available Now',
  'Pre-Order',
];

export default function CategoryFilterSidebar({
  filters,
  setFilters,
  minPrice = 0,
  maxPrice = 1000,
  brandOptions = [],
  productTypeOptions = [],
  categoryTitle = '',
}) {
  const [price, setPrice] = useState([minPrice, maxPrice]);

  const handleCheckbox = (group, value) => {
    setFilters((prev) => {
      const current = prev[group] || [];
      return {
        ...prev,
        [group]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const handlePriceChange = (e, idx) => {
    const val = Number(e.target.value);
    const newPrice = [...price];
    newPrice[idx] = val;
    setPrice(newPrice);
    setFilters((prev) => ({ ...prev, price: newPrice }));
  };

  return (
    <aside className="w-full max-w-xs bg-white rounded-2xl shadow p-6 sticky top-6 h-fit">
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Product Category</h3>
        <label className="flex items-center mb-2 text-sm">
          <input
            type="checkbox"
            checked={true}
            readOnly
            className="mr-2 accent-[#0f6674]"
          />
          {categoryTitle || 'Current Category'}
        </label>
      </div>
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Brand</h3>
        {brandOptions.length === 0 ? (
          <div className="text-sm text-gray-400">No brands</div>
        ) : (
          brandOptions.map((brand) => (
            <label key={brand} className="flex items-center mb-2 text-sm">
              <input
                type="checkbox"
                checked={filters.brand?.includes(brand) || false}
                onChange={() => handleCheckbox('brand', brand)}
                className="mr-2 accent-[#0f6674]"
              />
              {brand}
            </label>
          ))
        )}
      </div>
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Product Types</h3>
        {productTypeOptions.length === 0 ? (
          <div className="text-sm text-gray-400">No product types</div>
        ) : (
          productTypeOptions.map((type) => (
            <label key={type} className="flex items-center mb-2 text-sm">
              <input
                type="checkbox"
                checked={filters.productType?.includes(type) || false}
                onChange={() => handleCheckbox('productType', type)}
                className="mr-2 accent-[#0f6674]"
              />
              {type}
            </label>
          ))
        )}
      </div>
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={price[0]}
            onChange={(e) => handlePriceChange(e, 0)}
            className="w-1/2 accent-[#0f6674]"
          />
          <span className="text-sm">{price[0]}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={price[1]}
            onChange={(e) => handlePriceChange(e, 1)}
            className="w-1/2 accent-[#0f6674]"
          />
          <span className="text-sm">{price[1]}</span>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-lg mb-3">Availability</h3>
        {AVAILABILITY_OPTIONS.map((avail) => (
          <label key={avail} className="flex items-center mb-2 text-sm">
            <input
              type="checkbox"
              checked={filters.availability?.includes(avail) || false}
              onChange={() => handleCheckbox('availability', avail)}
              className="mr-2 accent-[#0f6674]"
            />
            {avail}
          </label>
        ))}
      </div>
    </aside>
  );
}
