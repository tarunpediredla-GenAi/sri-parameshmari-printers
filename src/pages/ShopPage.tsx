import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heart, Search, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useStore } from '../context/StoreContext';

export default function ShopPage() {
  const { categories, products, wishlistIds, searchQuery, setSearchQuery, loadingCatalog } =
    useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';

  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [priceRange, setPriceRange] = useState<'all' | 'standard' | 'premium'>('all');
  const [wishlistOnly, setWishlistOnly] = useState(false);

  const selectCategory = (catId: string) => {
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (!p.published) return false;
      if (activeCategory !== 'all' && p.categoryId !== activeCategory) return false;
      if (priceRange === 'standard' && p.basePricePaise > 1000000) return false;
      if (priceRange === 'premium' && p.basePricePaise <= 1000000) return false;
      if (wishlistOnly && !wishlistIds.includes(p.id)) return false;
      if (q) {
        const hay = `${p.title} ${p.categoryName} ${p.shortDescription} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.basePricePaise - b.basePricePaise);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.basePricePaise - a.basePricePaise);
    }
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [products, activeCategory, priceRange, wishlistOnly, wishlistIds, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider uppercase text-[#B45309]">
            Digital Design Storefront
          </p>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2B1D14] mt-1">
            Shop Design &amp; Prompt Packages
          </h1>
          <p className="text-sm text-[#52635A] mt-1">
            Studio-curated designs rated from ₹5,000 to ₹20,000 across websites, business cards,
            brochures, banners, packaging labels, and wedding suites.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#64746B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Filter designs by keyword"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs..."
              className="pl-9 pr-3 py-2 rounded-lg border border-[#CFDACE] bg-white text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-[#CFDACE] rounded-lg px-2.5 py-2">
            <SlidersHorizontal className="w-4 h-4 text-[#52635A]" aria-hidden="true" />
            <select
              aria-label="Sort designs"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm font-medium text-[#2B1D14] bg-transparent focus:outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setWishlistOnly((v) => !v)}
            aria-pressed={wishlistOnly}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              wishlistOnly
                ? 'bg-[#3A261B] border-[#3A261B] text-[#F59E0B]'
                : 'bg-white border-[#CFDACE] text-[#2B1D14] hover:bg-[#F7F9F6]'
            }`}
          >
            <Heart className={`w-4 h-4 ${wishlistOnly ? 'fill-current' : ''}`} aria-hidden="true" />
            <span>Wishlist ({wishlistIds.length})</span>
          </button>
        </div>
      </div>

      {/* Category & Rate Tier Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-[#DCE4DB] rounded-xl">
          <button
            type="button"
            onClick={() => selectCategory('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeCategory === 'all'
                ? 'bg-[#3A261B] text-white'
                : 'text-[#52635A] hover:text-[#2B1D14] hover:bg-[#E6ECE5]'
            }`}
          >
            All Designs ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-[#3A261B] text-white'
                  : 'text-[#52635A] hover:text-[#2B1D14] hover:bg-[#E6ECE5]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 p-1.5 bg-white border border-[#DCE4DB] rounded-xl shrink-0">
          {[
            { id: 'all', label: 'All Rates' },
            { id: 'standard', label: '₹5,000 – ₹10,000' },
            { id: 'premium', label: '₹12,000 – ₹20,000' },
          ].map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setPriceRange(tier.id as typeof priceRange)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                priceRange === tier.id
                  ? 'bg-[#F59E0B] text-[#231710]'
                  : 'text-[#52635A] hover:text-[#2B1D14] hover:bg-[#E6ECE5]'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {loadingCatalog ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-96 rounded-2xl bg-[#DCE4DB]/70 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DCE4DB] p-12 text-center space-y-3">
          <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">
            No matching design packages found
          </h2>
          <p className="text-sm text-[#52635A]">
            Try clearing your search, rate tier, or category filters, or request a custom design prompt.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setPriceRange('all');
              setWishlistOnly(false);
              selectCategory('all');
            }}
            className="px-4 py-2 rounded-lg bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          className={
            filteredProducts.length === 1
              ? 'max-w-md'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          }
        >
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
