import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, KeyRound, ShoppingBag, Trash2 } from 'lucide-react';
import ArtworkUploader from '../components/ArtworkUploader';
import { useStore } from '../context/StoreContext';
import { calculateOrderTotals, formatInrFromPaise } from '../lib/pricing';

export default function CartPage() {
  const { cart, removeFromCart, updateCartItemArtwork, settings } = useStore();
  const navigate = useNavigate();

  const estimatedTotals = calculateOrderTotals(cart, 'digital', settings);
  const missingArtwork = cart.some((item) => item.artworkRequired && !item.artwork);

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#3A261B] text-[#F59E0B] flex items-center justify-center mx-auto shadow-[0_0_16px_rgba(245,158,11,0.25)]">
          <ShoppingBag className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[#2B1D14]">Your Design Cart is Empty</h1>
        <p className="text-sm text-[#52635A] max-w-md mx-auto">
          Browse website, business card, flyer, brochure, banner, sticker, and invitation designs to
          unlock their studio prompts.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/shop"
            className="px-6 py-3 rounded-xl bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426]"
          >
            Explore Design Catalog
          </Link>
          <Link
            to="/quote"
            className="px-6 py-3 rounded-xl border border-[#CFDACE] bg-white text-[#2B1D14] text-sm font-semibold hover:bg-[#F7F9F6]"
          >
            Request Custom Design
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">Review Design Items</p>
        <h1 className="font-editorial text-3xl font-bold text-[#2B1D14] mt-1">
          Shopping Cart ({cart.length})
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div
              key={item.cartItemId}
              className="bg-white rounded-2xl border border-[#DCE4DB] p-5 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-24 h-20 rounded-xl object-cover bg-[#E6ECE5] shrink-0"
                  />
                  <div className="space-y-1.5">
                    <Link
                      to={`/product/${item.productId}`}
                      className="text-base font-bold text-[#2B1D14] hover:text-[#B45309]"
                    >
                      {item.title}
                    </Link>
                    <p className="text-xs text-[#64746B] inline-flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                      <span>Delivery: {item.turnaroundDays}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#52635A]">
                      {Object.entries(item.selectedOptionLabels).map(([k, v]) => (
                        <span key={k}>
                          <strong className="capitalize text-[#2B1D14]">{k}:</strong> {v}
                        </span>
                      ))}
                    </div>
                    {item.brandBrief && (
                      <p className="text-xs text-[#3D5A4C] bg-[#F2F5F1] px-2.5 py-1.5 rounded-lg border border-[#DCE4DB]">
                        <strong>Brand Brief:</strong> {item.brandBrief}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <span className="text-lg font-bold text-[#2B1D14] tabular-nums">
                    {formatInrFromPaise(item.unitPackPricePaise)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.cartItemId)}
                    aria-label={`Remove ${item.title} from cart`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>

              {(item.artworkRequired || item.artwork) && (
                <ArtworkUploader
                  label="Reference Logo / File Attachment"
                  required={item.artworkRequired}
                  artwork={item.artwork || null}
                  onChange={(art) => updateCartItemArtwork(item.cartItemId, art)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-5 lg:sticky lg:top-24">
          <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">INR Price Breakdown</h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-[#52635A]">
              <span>Design Packages Subtotal</span>
              <span className="font-semibold text-[#2B1D14] tabular-nums">
                {formatInrFromPaise(estimatedTotals.subtotalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-[#52635A]">
              <span>Digital Prompt Delivery</span>
              <span className="font-semibold text-[#3D5A4C] tabular-nums">₹0 (Instant)</span>
            </div>
            <div className="pt-3 border-t border-[#DCE4DB] flex justify-between text-base font-bold text-[#2B1D14]">
              <span>Total Payable</span>
              <span className="tabular-nums">{formatInrFromPaise(estimatedTotals.totalPaise)}</span>
            </div>
          </div>

          <p className="text-xs text-[#64746B]">
            Designs only—prompts unlock immediately upon verified Razorpay payment at ₹0 shipping.
          </p>

          {missingArtwork && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Attach required reference files above before checking out.</span>
            </div>
          )}

          <button
            type="button"
            disabled={missingArtwork}
            onClick={() => navigate('/checkout')}
            className="w-full py-3.5 px-5 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </aside>
      </div>
    </div>
  );
}
