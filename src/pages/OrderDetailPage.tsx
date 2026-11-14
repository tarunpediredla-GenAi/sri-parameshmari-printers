import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Lock,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch, fetchAuthorizedArtworkBlobUrl } from '../lib/api';
import { FULFILLMENT_LABELS, formatInrFromPaise } from '../lib/pricing';
import {
  ensureRazorpayCheckoutLoaded,
  extractRazorpayFailureMessage,
} from '../lib/razorpayClient';
import type { FulfillmentStatus, Order } from '../types/print';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isConfirmed = searchParams.get('confirmed') === '1';
  const { user, settings, configStatus, getFreshToken, openAuthModal } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadOrder = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getFreshToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await apiFetch<{ order: Order }>(`/api/orders/${id}`, {}, token);
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [id, user?.uid]);

  const handleCopyPrompt = async (cartItemId: string, promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedId(cartItemId);
      setTimeout(() => setCopiedId((prev) => (prev === cartItemId ? null : prev)), 2500);
    } catch {
      setError('Unable to copy automatically — please select and copy the prompt text.');
    }
  };

  const handleCheckPayment = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Sign in required.');
      const res = await apiFetch<{ order: Order; message?: string }>(
        `/api/orders/${order.id}/check-payment-status`,
        { method: 'POST' },
        token
      );
      setOrder(res.order);
      if (res.message) setError(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const RazorpayCtor = await ensureRazorpayCheckoutLoaded();
      const token = await getFreshToken();
      if (!token) throw new Error('Sign in required.');
      const res = await apiFetch<{
        order: Order;
        razorpay: { keyId: string; orderId: string; amountPaise: number; currency: string };
      }>(`/api/orders/${order.id}/retry-payment`, { method: 'POST' }, token);

      const publicKeyId = res.razorpay.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!publicKeyId) {
        throw new Error('Razorpay public Key ID is missing.');
      }

      const rzp = new RazorpayCtor({
        key: publicKeyId,
        amount: res.razorpay.amountPaise,
        currency: res.razorpay.currency,
        name: settings.businessName,
        description: `Retry Payment for ${order.orderNumber}`,
        order_id: res.razorpay.orderId,
        prefill: {
          name: order.customerName,
          email: order.customerEmail,
          contact: order.customerPhone,
        },
        theme: { color: '#3A261B' },
        handler: async (response) => {
          try {
            const verified = await apiFetch<{ order: Order }>(
              `/api/orders/${order.id}/verify-payment`,
              { method: 'POST', body: JSON.stringify(response) },
              token
            );
            setOrder(verified.order);
          } catch (verifyErr) {
            setError(
              verifyErr instanceof Error
                ? verifyErr.message
                : 'Payment verification failed. Try Check Payment Status.'
            );
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError('Payment window closed before completion. You can retry anytime.');
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
          setOrder(failed.order);
        } catch {
          // ignore
        }
        setError(msg);
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retry payment.');
      setBusy(false);
    }
  };

  const handleDownloadArtwork = async (artworkId: string, fileName: string) => {
    try {
      const token = await getFreshToken();
      if (!token) return;
      const url = await fetchAuthorizedArtworkBlobUrl(artworkId, token);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not access private file.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-editorial text-2xl font-bold text-[#2B1D14]">Sign In to View Order</h1>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-5 py-2.5 rounded-lg bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426]"
        >
          Log In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-64 rounded-2xl bg-[#DCE4DB]/70 animate-pulse" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
        <h1 className="font-editorial text-2xl font-bold text-[#2B1D14]">Order Unavailable</h1>
        <p className="text-sm text-red-700">{error}</p>
        <Link to="/dashboard" className="inline-block text-sm font-semibold text-[#2B1D14] underline">
          Return to My Prompts &amp; Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const stages: FulfillmentStatus[] =
    order.deliveryMethod === 'digital'
      ? ['awaiting_payment', 'completed']
      : [
          'artwork_review',
          'printing',
          order.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'shipped',
          'completed',
        ];
  const currentStageIndex = stages.indexOf(order.fulfillmentStatus);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#52635A] hover:text-[#2B1D14]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Prompts &amp; Orders</span>
      </Link>

      {(isConfirmed || order.paymentStatus === 'paid') && (
        <div className="rounded-2xl bg-[#E6ECE5] border border-[#84A98C] p-5 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#3D5A4C] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-base font-bold text-[#2B1D14]">
              Order {order.orderNumber} Confirmed — Design Prompt Unlocked!
            </h2>
            <p className="text-sm text-[#3D5A4C] mt-0.5">
              Payment verified ({order.razorpayPaymentId || 'Recorded'}). Copy your unlocked prompt(s)
              below to generate or customize your design right away.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Header + Statuses */}
      <div className="bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#64746B]">
            Placed {new Date(order.createdAt).toLocaleString()}
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14] mt-1">
            Order {order.orderNumber}
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-[#F2F5F1] border border-[#DCE4DB]">
            <div className="text-[11px] uppercase tracking-wider text-[#52635A] font-semibold">
              Payment Status
            </div>
            <div
              className={`text-sm font-bold uppercase mt-0.5 ${
                order.paymentStatus === 'paid'
                  ? 'text-[#3D5A4C]'
                  : order.paymentStatus === 'failed'
                    ? 'text-red-700'
                    : 'text-[#B45309]'
              }`}
            >
              {order.paymentStatus}
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-[#F2F5F1] border border-[#DCE4DB]">
            <div className="text-[11px] uppercase tracking-wider text-[#52635A] font-semibold">
              Prompt Delivery
            </div>
            <div className="text-sm font-bold text-[#2B1D14] mt-0.5">
              {FULFILLMENT_LABELS[order.fulfillmentStatus]}
            </div>
          </div>
        </div>
      </div>

      {/* UNLOCKED DESIGN PROMPTS PANEL (Visible ONLY after verified payment) */}
      <div className="space-y-4">
        {order.items.map((item) => (
          <div
            key={`prompt-${item.cartItemId}`}
            className="rounded-2xl bg-gradient-to-br from-[#231710] via-[#3A261B] to-[#2E4035] text-white p-6 shadow-[0_0_24px_rgba(245,158,11,0.14)] border border-[#4D6F5E]/50 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  {order.paymentStatus === 'paid' ? (
                    <>
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                      <span>Design Prompt Unlocked</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      <span>Prompt Locked Until Payment</span>
                    </>
                  )}
                </div>
                <h2 className="font-editorial text-xl font-bold text-white">{item.title}</h2>
                {item.promptToolHint && (
                  <p className="text-xs text-[#B7C5B8]">{item.promptToolHint}</p>
                )}
              </div>

              {order.paymentStatus === 'paid' && item.unlockedPrompt && (
                <button
                  type="button"
                  onClick={() => void handleCopyPrompt(item.cartItemId, item.unlockedPrompt!)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-xs font-bold transition-colors shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.3)]"
                >
                  {copiedId === item.cartItemId ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      <span>Prompt Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" aria-hidden="true" />
                      <span>Copy Design Prompt</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {order.paymentStatus === 'paid' && item.unlockedPrompt ? (
              <div className="space-y-3">
                <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed bg-[#160F0B]/85 border border-[#4D6F5E]/50 rounded-xl p-4 text-[#F5EFE6] select-all">
                  {item.unlockedPrompt}
                </pre>
                {item.promptInstructions && (
                  <div className="rounded-xl bg-[#27382F]/80 border border-[#4D6F5E]/40 p-3.5 text-xs text-[#D7DFD6] space-y-1">
                    <div className="font-bold text-[#F59E0B] inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>How to Use This Prompt</span>
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{item.promptInstructions}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-[#160F0B]/70 border border-[#4D6F5E]/40 p-4 text-xs text-[#D7DFD6]">
                Complete Razorpay payment below to reveal your full copy-ready design prompt and
                usage instructions.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Retry / Check Unpaid Order */}
      {order.paymentStatus !== 'paid' && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#2B1D14]">
              {order.paymentStatus === 'failed'
                ? 'Payment Unsuccessful'
                : 'Payment Awaiting Confirmation'}
            </h2>
            <p className="text-xs text-[#52635A] mt-0.5">
              {order.paymentFailureReason ||
                'Your design prompt will unlock immediately once Razorpay confirms your payment.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              disabled={busy || !configStatus?.razorpayConfigured}
              onClick={() => void handleRetryPayment()}
              className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Payment</span>
            </button>
            <button
              type="button"
              disabled={busy || !configStatus?.razorpayConfigured}
              onClick={() => void handleCheckPayment()}
              className="px-4 py-2 rounded-lg border border-[#CFDACE] text-[#2B1D14] text-xs font-semibold disabled:opacity-50 hover:bg-[#F7F9F6]"
            >
              Check Payment Status
            </button>
          </div>
        </div>
      )}

      {/* Visual Tracking Timeline */}
      <div className="bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-[#2B1D14] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
          <span>Design Prompt Delivery Timeline</span>
        </h2>

        <div className={`grid grid-cols-1 ${stages.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-4'} gap-3`}>
          {stages.map((stage, idx) => {
            const reached =
              (stage === 'awaiting_payment') ||
              (order.paymentStatus === 'paid' && currentStageIndex >= idx);
            const current = order.fulfillmentStatus === stage;
            return (
              <div
                key={stage}
                className={`p-3.5 rounded-xl border ${
                  current
                    ? 'border-[#3A261B] bg-[#3A261B] text-white'
                    : reached
                      ? 'border-[#84A98C] bg-[#E6ECE5] text-[#2B1D14]'
                      : 'border-[#DCE4DB] bg-[#F7F9F6] text-[#64746B]'
                }`}
              >
                <div className="text-[11px] font-mono opacity-80">Step 0{idx + 1}</div>
                <div className="text-sm font-bold mt-1">{FULFILLMENT_LABELS[stage]}</div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#E6ECE5] space-y-2">
          {order.fulfillmentHistory.map((ev, idx) => (
            <div key={idx} className="flex items-start justify-between gap-4 text-xs">
              <div>
                <span className="font-semibold text-[#2B1D14]">
                  {FULFILLMENT_LABELS[ev.status]}:
                </span>{' '}
                <span className="text-[#52635A]">{ev.note}</span>
              </div>
              <span className="text-[#64746B] font-mono shrink-0">
                {new Date(ev.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Items & Receipt Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#2B1D14]">Purchased Design Packages</h2>
          {order.items.map((item) => (
            <div
              key={item.cartItemId}
              className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-[#E6ECE5] last:border-0 last:pb-0"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#2B1D14]">{item.title}</h3>
                <p className="text-xs text-[#52635A]">
                  {Object.values(item.selectedOptionLabels).join(' / ')}
                </p>
                {item.brandBrief && (
                  <p className="text-xs text-[#3D5A4C]">
                    <strong>Brand Brief:</strong> {item.brandBrief}
                  </p>
                )}
                {item.artwork && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-[#52635A]">
                      Reference File: <strong>{item.artwork.fileName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadArtwork(item.artwork!.artworkId, item.artwork!.fileName)
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#2B1D14] hover:text-[#B45309] underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Private File
                    </button>
                  </div>
                )}
              </div>
              <span className="text-sm font-bold text-[#2B1D14] tabular-nums shrink-0">
                {formatInrFromPaise(item.lineTotalPaise)}
              </span>
            </div>
          ))}
        </div>

        <aside className="lg:col-span-4 bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-3 text-sm">
          <h2 className="text-base font-bold text-[#2B1D14]">INR Receipt Summary</h2>
          <div className="flex justify-between text-[#52635A]">
            <span>Subtotal</span>
            <span className="tabular-nums font-semibold text-[#2B1D14]">
              {formatInrFromPaise(order.subtotalPaise)}
            </span>
          </div>
          <div className="flex justify-between text-[#52635A]">
            <span>Digital Delivery</span>
            <span className="tabular-nums font-semibold text-[#3D5A4C]">
              {order.shippingPaise === 0 ? '₹0 (Instant)' : formatInrFromPaise(order.shippingPaise)}
            </span>
          </div>
          <div className="flex justify-between text-[#52635A]">
            <span>GST</span>
            <span className="tabular-nums font-semibold text-[#2B1D14]">
              {formatInrFromPaise(order.taxPaise)}
            </span>
          </div>
          <div className="pt-3 border-t border-[#DCE4DB] flex justify-between text-base font-bold text-[#2B1D14]">
            <span>Total Paid</span>
            <span className="tabular-nums">{formatInrFromPaise(order.totalPaise)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
