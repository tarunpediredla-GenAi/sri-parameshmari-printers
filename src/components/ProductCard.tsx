import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatInrFromPaise } from '../lib/pricing';
import type { Product } from '../types/print';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { wishlistIds, toggleWishlist } = useStore();
  const [imgError, setImgError] = useState(false);
  const isWishlisted = wishlistIds.includes(product.id);

  const savingsPct =
    product.compareAtPricePaise && product.compareAtPricePaise > product.basePricePaise
      ? Math.round(
          ((product.compareAtPricePaise - product.basePricePaise) / product.compareAtPricePaise) * 100
        )
      : null;

  return (
    <article className="bg-white rounded-2xl border border-[#DCE4DB] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-[#E6ECE5] overflow-hidden">
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2B1D14] to-[#354E41] flex flex-col items-center justify-center p-6 text-center text-white">
            <Sparkles className="w-8 h-8 text-[#F59E0B] mb-2" aria-hidden="true" />
            <span className="text-sm font-medium text-[#D7DFD6]">{product.title}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => void toggleWishlist(product.id)}
          aria-label={`Toggle wishlist for ${product.title}`}
          className={`absolute top-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
            isWishlisted
              ? 'bg-[#3A261B] text-[#F59E0B]'
              : 'bg-white/95 text-[#52635A] hover:text-[#2B1D14]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#52635A]">
            <span className="font-semibold text-[#3D5A4C]">{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>{product.turnaroundDays}</span>
            {product.isSampleData && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#B45309] font-medium">Sample Design</span>
              </>
            )}
          </div>

          <h3 className="text-base font-bold text-[#2B1D14] leading-snug">
            <Link to={`/product/${product.id}`} className="hover:text-[#B45309] transition-colors">
              {product.title}
            </Link>
          </h3>

          <p className="text-sm text-[#52635A] line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        <div className="pt-3 border-t border-[#E6ECE5] flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#2B1D14] tabular-nums">
                {formatInrFromPaise(product.basePricePaise)}
              </span>
              {product.compareAtPricePaise && product.compareAtPricePaise > product.basePricePaise && (
                <span className="text-xs text-[#7D8C83] line-through tabular-nums">
                  {formatInrFromPaise(product.compareAtPricePaise)}
                </span>
              )}
            </div>
            {savingsPct ? (
              <span className="text-xs font-semibold text-[#3D5A4C]">
                Save {savingsPct}% · Prompt included
              </span>
            ) : (
              <span className="text-xs text-[#52635A]">Digital prompt pack</span>
            )}
          </div>

          <Link
            to={`/product/${product.id}`}
            className="px-4 py-2 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Select &amp; Unlock
          </Link>
        </div>
      </div>
    </article>
  );
}
