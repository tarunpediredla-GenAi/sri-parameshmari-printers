import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { calculateOrderTotals, formatInrFromPaise } from '../lib/pricing';
import {
  ensureRazorpayCheckoutLoaded,
  extractRazorpayFailureMessage,
} from '../lib/razorpayClient';
import type { Order } from '../types/print';

export default function CheckoutPage() {
  const {
    user,
    profile,
    cart,
    settings,
    configStatus,
    getFreshToken,
    openAuthModal,
    clearCart,
  } = useStore();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (profile) {
      setCustomerName((prev) => prev || profile.displayName || user?.displayName || '');
      setCustomerPhone((prev) => prev || profile.phone || '');
    } else if (user?.displayName) {
      setCustomerName((prev) => prev || user.displayName || '');
    }
  }, [profile, user]);

  const totals = calculateOrderTotals(cart, 'digital', settings);
  const razorpayReady = Boolean(configStatus?.razorpayConfigured);

  const openRazorpayModal = async (
    order: Order,
    rzpParams: { keyId: string; orderId: string; amountPaise: number; currency: string },
    token: string
  ) => {
    let RazorpayCtor: Awaited<ReturnType<typeof ensureRazorpayCheckoutLoaded>>;
    try {
      RazorpayCtor = await ensureRazorpayCheckoutLoaded();
    } catch (loadErr) {
      setError(
        loadErr instanceof Error
          ? loadErr.message
          : 'Razorpay Checkout script failed to load. Please refresh the page.'
      );
      setSubmitting(false);
      return;
    }

    const publicKeyId = rzpParams.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!publicKeyId) {
      setError('Razorpay public Key ID is missing. Please contact support.');
      setSubmitting(false);
      return;
    }

    const rzp = new RazorpayCtor({
      key: publicKeyId,
      amount: rzpParams.amountPaise,
      currency: rzpParams.currency,
      name: settings.businessName,
      description: `Design Prompt Order ${order.orderNumber}`,
      order_id: rzpParams.orderId,
      prefill: {
        name: order.customerName,
        email: order.customerEmail,
        contact: order.customerPhone,
      },
      theme: {
        color: '#3A261B',
      },
      handler: async (response) => {
        try {
          const verified = await apiFetch<{ order: Order }>(
            `/api/orders/${order.id}/verify-payment`,
            {
              method: 'POST',
              body: JSON.stringify(response),
            },
            token
          );
          clearCart();
          navigate(`/orders/${verified.order.id}?confirmed=1`);
        } catch (verifyErr) {
          setError(
            verifyErr instanceof Error
              ? verifyErr.message
              : 'Payment verification failed. Use Check Payment Status below.'
          );
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          setError(
            'Payment window closed before completion. You can retry payment or check status below.'
          );
        },
      },
    });

    rzp.on('payment.failed', async (failRes: unknown) => {
      const msg = extractRazorpayFailureMessage(failRes);

      try {
        const failed = await apiFetch<{ order: Order }>(
          `/api/orders/${order.id}/mark-failed`,
          { method: 'POST', body: JSON.stringify({ reason: msg }) },
          token
        );
        setPendingOrder(failed.order);
      } catch {
        // ignore
      }
      setError(msg);
      setSubmitting(false);
    });

    rzp.open();
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!razorpayReady) {
      setError(
        'Razorpay Test Mode credentials are not configured yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment settings.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Please sign in again to continue.');

      const res = await apiFetch<{
        order: Order;
        razorpay: { keyId: string; orderId: string; amountPaise: number; currency: string };
      }>(
        '/api/orders/checkout',
        {
          method: 'POST',
          body: JSON.stringify({
            items: cart.map((item) => ({
              cartItemId: item.cartItemId,
              productId: item.productId,
              selectedOptions: item.selectedOptions,
              quantity: item.quantity,
              brandBrief: item.brandBrief,
              artwork: item.artwork,
            })),
            deliveryMethod: 'digital',
            customerName,
            customerPhone,
            shippingAddress: null,
          }),
        },
        token
      );

      setPendingOrder(res.order);
      await openRazorpayModal(res.order, res.razorpay, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout.');
      setSubmitting(false);
    }
  };

  const handleRetryPending = async () => {
    if (!pendingOrder) return;
    setError(null);
    setSubmitting(true);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Sign in required.');
      const res = await apiFetch<{
        order: Order;
        razorpay: { keyId: string; orderId: string; amountPaise: number; currency: string };
      }>(`/api/orders/${pendingOrder.id}/retry-payment`, { method: 'POST' }, token);
      setPendingOrder(res.order);
      await openRazorpayModal(res.order, res.razorpay, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed.');
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!pendingOrder) return;
    setError(null);
    setSubmitting(true);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Sign in required.');
      const res = await apiFetch<{ order: Order; message?: string }>(
        `/api/orders/${pendingOrder.id}/check-payment-status`,
        { method: 'POST' },
        token
      );
      setPendingOrder(res.order);
      if (res.order.paymentStatus === 'paid') {
        clearCart();
        navigate(`/orders/${res.order.id}?confirmed=1`);
      } else {
        setError(res.message || 'Payment not captured yet.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0 && !pendingOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-editorial text-2xl font-bold text-[#2B1D14]">No Designs to Check Out</h1>
        <p className="text-sm text-[#52635A]">Select a design package from the catalog first.</p>
        <Link
          to="/shop"
          className="inline-block px-5 py-2.5 rounded-lg bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426]"
        >
          Browse Design Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
          Server-Verified INR Checkout
        </p>
        <h1 className="font-editorial text-3xl font-bold text-[#2B1D14] mt-1">
          Unlock Design Prompts &amp; Complete Payment
        </h1>
      </div>

      {configStatus !== null && !razorpayReady && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3 text-amber-950"
        >
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-sm">
            <h2 className="font-bold">Razorpay Test Mode Setup Required</h2>
            <p>
              Online checkout is currently paused because{' '}
              <code className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">
                RAZORPAY_KEY_ID
              </code>{' '}
              and{' '}
              <code className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">
                RAZORPAY_KEY_SECRET
              </code>{' '}
              are not configured in the server environment.
            </p>
          </div>
        </div>
      )}

      {!user && (
        <div className="rounded-2xl border border-[#DCE4DB] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#2B1D14]">Sign In to Unlock Prompts</h2>
            <p className="text-sm text-[#52635A]">
              Your cart and unlocked prompts remain saved in your account forever.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 rounded-lg bg-[#3A261B] text-white text-sm font-semibold whitespace-nowrap shrink-0 hover:bg-[#4E3426]"
          >
            Log In / Sign Up
          </button>
        </div>
      )}

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Digital Delivery + Buyer Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-[#2B1D14]">1. Digital Prompt Delivery</h2>
            <div className="p-4 rounded-xl border border-[#3A261B] bg-[#3A261B] text-white flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <span>Instant Digital Prompt Unlock</span>
                  <span className="text-xs font-mono text-[#F59E0B]">₹0 Shipping</span>
                </div>
                <p className="text-xs text-[#D7DFD6] mt-1 leading-relaxed">
                  Designs only—no physical shipping required. As soon as Razorpay confirms your
                  payment, the full copy-ready design prompt(s) unlock on your Order page and in My
                  Prompts.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-[#2B1D14]">2. Billing &amp; Contact Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="chk-name" className="block text-xs font-semibold text-[#3A261B] mb-1">
                  Full Name *
                </label>
                <input
                  id="chk-name"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
                />
              </div>
              <div>
                <label htmlFor="chk-phone" className="block text-xs font-semibold text-[#3A261B] mb-1">
                  Phone / WhatsApp Number *
                </label>
                <input
                  id="chk-phone"
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Complete INR Order Summary */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-5 lg:sticky lg:top-24">
          <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">
            Order Summary (INR)
          </h2>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.cartItemId}
                className="flex justify-between gap-3 text-sm pb-3 border-b border-[#E6ECE5]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[#2B1D14] truncate">{item.title}</p>
                  <p className="text-xs text-[#52635A]">
                    {Object.values(item.selectedOptionLabels).join(' / ')}
                  </p>
                  {item.brandBrief && (
                    <p className="text-[11px] text-[#3D5A4C] font-medium mt-0.5 truncate">
                      Brief: {item.brandBrief}
                    </p>
                  )}
                </div>
                <span className="font-semibold text-[#2B1D14] tabular-nums shrink-0">
                  {formatInrFromPaise(item.unitPackPricePaise)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[#52635A]">
              <span>Design Subtotal</span>
              <span className="font-semibold text-[#2B1D14] tabular-nums">
                {formatInrFromPaise(totals.subtotalPaise)}
              </span>
            </div>
            <div className="flex justify-between text-[#52635A]">
              <span>Digital Prompt Delivery</span>
              <span className="font-semibold text-[#3D5A4C] tabular-nums">₹0</span>
            </div>
            <div className="pt-3 border-t border-[#DCE4DB] flex justify-between text-lg font-bold text-[#2B1D14]">
              <span>Total Payable (INR)</span>
              <span className="tabular-nums">{formatInrFromPaise(totals.totalPaise)}</span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {pendingOrder && pendingOrder.paymentStatus !== 'paid' && (
            <div className="p-3.5 rounded-xl bg-[#F2F5F1] border border-[#DCE4DB] space-y-2.5">
              <p className="text-xs font-semibold text-[#2B1D14]">
                Order {pendingOrder.orderNumber} created (Payment Status:{' '}
                <span className="uppercase">{pendingOrder.paymentStatus}</span>)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting || !razorpayReady}
                  onClick={() => void handleRetryPending()}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#3A261B] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#4E3426]"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Retry Payment</span>
                </button>
                <button
                  type="button"
                  disabled={submitting || !razorpayReady}
                  onClick={() => void handleCheckStatus()}
                  className="flex-1 py-2 px-3 rounded-lg border border-[#CFDACE] bg-white text-[#2B1D14] text-xs font-semibold hover:bg-[#F7F9F6]"
                >
                  Check Payment Status
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !razorpayReady || !user}
            className="w-full py-3.5 px-6 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
            <span>
              {submitting
                ? 'Processing...'
                : `Pay ${formatInrFromPaise(totals.totalPaise)} & Unlock Prompt`}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#64746B] justify-center">
            <ShieldCheck className="w-4 h-4 text-[#3D5A4C]" aria-hidden="true" />
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
              Razorpay {configStatus?.razorpayMode === 'live' ? 'Live' : 'Test Mode'} · Prompt
              unlocks strictly after verification.
            </span>
          </div>
        </aside>
      </form>
    </div>
  );
}
