import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Heart,
  KeyRound,
  Lock,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import ArtworkUploader from '../components/ArtworkUploader';
import { useStore } from '../context/StoreContext';
import { calculateItemPricing, formatInrFromPaise } from '../lib/pricing';
import type { ArtworkAttachment } from '../types/print';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, wishlistIds, toggleWishlist } = useStore();

  const product = products.find((p) => p.id === id || p.slug === id);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedQty, setSelectedQty] = useState<number>(0);
  const [brandBrief, setBrandBrief] = useState('');
  const [artwork, setArtwork] = useState<ArtworkAttachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!product) return;
    const defaults: Record<string, string> = {};
    for (const group of product.optionGroups) {
      if (group.choices.length > 0) {
        defaults[group.id] = group.choices[0].id;
      }
    }
    setSelectedOptions(defaults);
    setSelectedQty(product.quantityTiers[0]?.quantity || 1);
    setBrandBrief('');
    setArtwork(null);
    setError(null);
    setAddedFeedback(false);
  }, [product?.id]);

  const priced = useMemo(() => {
    if (!product || !selectedQty) return null;
    try {
      return calculateItemPricing(product, selectedOptions, selectedQty);
    } catch {
      return null;
    }
  }, [product, selectedOptions, selectedQty]);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-editorial text-2xl font-bold text-[#2B1D14]">Design Not Found</h1>
        <p className="text-sm text-[#52635A]">
          This design package may have been archived or removed from the catalog.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Design Catalog
        </Link>
      </div>
    );
  }

  const isWishlisted = wishlistIds.includes(product.id);
  const selectedTierLabel =
    product.quantityTiers.find((t) => t.quantity === selectedQty)?.label || `${selectedQty}`;

  const handleAddToCart = () => {
    setError(null);
    if (!priced) {
      setError('Please select all design options and license pack.');
      return;
    }
    if (product.artworkRequired && !artwork) {
      setError('Please upload your reference logo or brief file before adding to cart.');
      return;
    }

    addToCart({
      cartItemId: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productId: product.id,
      title: product.title,
      imageUrl: product.imageUrl,
      selectedOptions,
      selectedOptionLabels: priced.selectedOptionLabels,
      quantity: selectedQty,
      unitPackPricePaise: priced.unitPackPricePaise,
      turnaroundDays: priced.turnaroundDays,
      artworkRequired: product.artworkRequired,
      brandBrief: brandBrief.trim() || undefined,
      artwork,
    });
    setAddedFeedback(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#52635A] hover:text-[#2B1D14]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Design Catalog</span>
        </Link>
        {product.isSampleData && (
          <span className="text-xs font-medium text-[#B45309]">
            Sample Design Package · Editable in Admin
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Showcase + Locked Prompt Preview */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-[#DCE4DB] bg-white shadow-sm aspect-[4/3]">
            <img
              src={product.imageUrl}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-6 space-y-3">
            <h2 className="text-base font-bold text-[#2B1D14]">
              What You Receive Upon Purchase
            </h2>
            <p className="text-sm text-[#52635A] leading-relaxed">{product.description}</p>
            <div className="rounded-xl bg-[#231710] text-white p-4 space-y-2 border border-[#4D6F5E]/40">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Design Prompt Deliverable (Locked)</span>
                </span>
                <span className="text-[11px] text-[#B7C5B8]">Unlocks on payment</span>
              </div>
              <p className="text-xs text-[#D7DFD6] leading-relaxed">
                Complete copy-ready prompt + customization guide unlocks immediately after Razorpay
                checkout verification inside your Order &amp; My Prompts dashboard.
              </p>
              {product.promptToolHint && (
                <p className="text-[11px] text-[#F59E0B] font-medium pt-1">
                  Compatible with: {product.promptToolHint}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Digital Design Configurator */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE4DB] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
                {product.categoryName}
              </p>
              <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14] mt-1">
                {product.title}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => void toggleWishlist(product.id)}
              aria-label={`Toggle wishlist for ${product.title}`}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                isWishlisted
                  ? 'bg-[#3A261B] border-[#3A261B] text-[#F59E0B]'
                  : 'border-[#DCE4DB] text-[#52635A] hover:bg-[#F7F9F6]'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Configurable Design Option Groups */}
          <div className="space-y-5">
            {product.optionGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3A261B]">
                  {group.name}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {group.choices.map((choice) => {
                    const active = selectedOptions[group.id] === choice.id;
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() =>
                          setSelectedOptions((prev) => ({ ...prev, [group.id]: choice.id }))
                        }
                        aria-pressed={active}
                        className={`px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? 'border-[#3A261B] bg-[#3A261B] text-white font-semibold'
                            : 'border-[#DCE4DB] bg-[#F7F9F6] text-[#2B1D14] hover:border-[#84A98C]'
                        }`}
                      >
                        <span className="truncate">{choice.label}</span>
                        {choice.priceDeltaPaise !== 0 && (
                          <span
                            className={`text-xs tabular-nums shrink-0 ${
                              active ? 'text-[#F59E0B]' : 'text-[#52635A]'
                            }`}
                          >
                            {choice.priceDeltaPaise > 0 ? '+' : ''}
                            {formatInrFromPaise(choice.priceDeltaPaise)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* License / Prompt Pack Tiers */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#3A261B]">
                Design License / Prompt Pack
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {product.quantityTiers.map((tier) => {
                  const active = selectedQty === tier.quantity;
                  return (
                    <button
                      key={tier.quantity}
                      type="button"
                      onClick={() => setSelectedQty(tier.quantity)}
                      aria-pressed={active}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        active
                          ? 'border-[#3A261B] bg-[#3A261B] text-white'
                          : 'border-[#DCE4DB] bg-[#F7F9F6] text-[#2B1D14] hover:border-[#84A98C]'
                      }`}
                    >
                      <div className="text-sm font-bold">{tier.label}</div>
                      {tier.discountLabel && (
                        <div
                          className={`text-[11px] font-semibold mt-0.5 ${
                            active ? 'text-[#F59E0B]' : 'text-[#3D5A4C]'
                          }`}
                        >
                          {tier.discountLabel}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Optional Brand Brief for Prompt Tailoring */}
          <div className="space-y-2">
            <label
              htmlFor="brand-brief-input"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#3A261B]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
              <span>Your Brand Brief / Text to Include (Optional)</span>
            </label>
            <textarea
              id="brand-brief-input"
              rows={3}
              value={brandBrief}
              onChange={(e) => setBrandBrief(e.target.value)}
              placeholder="e.g., Business Name: Sri Parameshmari Organics | Tagline: Pure Cold-Pressed Oils | Preferred colors, phone, or website text to embed into your unlocked prompt..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#CFDACE] bg-[#F7F9F6] text-sm text-[#2B1D14] placeholder:text-[#64746B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
            />
          </div>

          {/* Selected Configuration Summary & Live Price */}
          {priced && (
            <div className="rounded-xl bg-[#F2F5F1] border border-[#DCE4DB] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-[#52635A]">Design Package Total</span>
                  <div className="text-3xl font-bold text-[#2B1D14] tabular-nums">
                    {formatInrFromPaise(priced.unitPackPricePaise)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B1D14]">
                    <KeyRound className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                    <span>Delivery: {priced.turnaroundDays}</span>
                  </div>
                  <div className="text-xs text-[#52635A] mt-0.5">
                    Pack: {selectedTierLabel} · ₹0 shipping
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[#DCE4DB] text-xs text-[#52635A] flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(priced.selectedOptionLabels).map(([k, v]) => (
                  <span key={k}>
                    <strong className="text-[#2B1D14] capitalize">{k}:</strong> {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Optional Reference Logo / Inspiration Upload */}
          <ArtworkUploader
            label="Optional Reference Logo or Sketch (PDF, PNG, JPEG)"
            artwork={artwork}
            onChange={(next) => {
              setArtwork(next);
              setError(null);
            }}
            required={product.artworkRequired}
          />

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {addedFeedback && (
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#E6ECE5] border border-[#84A98C] text-[#2B1D14] text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#3D5A4C] shrink-0" />
                <span className="font-medium">Design added to cart!</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="px-3 py-1.5 rounded-lg bg-[#3D5A4C] text-white text-xs font-semibold hover:bg-[#354E41]"
              >
                View Cart &amp; Checkout
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-3.5 px-6 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>
              Add Design to Cart · {priced ? formatInrFromPaise(priced.unitPackPricePaise) : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
