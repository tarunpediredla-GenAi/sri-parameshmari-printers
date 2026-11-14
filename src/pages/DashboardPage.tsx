import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  Heart,
  Mail,
  MapPin,
  Package,
  Plus,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { FULFILLMENT_LABELS, formatInrFromPaise } from '../lib/pricing';
import type { Order, QuoteRequest, SavedAddress } from '../types/print';

export default function DashboardPage() {
  const {
    user,
    profile,
    products,
    wishlistIds,
    openAuthModal,
    getFreshToken,
    saveProfile,
    resendVerification,
  } = useStore();

  const [tab, setTab] = useState<'orders' | 'quotes' | 'profile' | 'wishlist'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  const [newAddr, setNewAddr] = useState<Omit<SavedAddress, 'id'>>({
    label: 'Office',
    recipientName: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || user?.displayName || '');
      setPhone(profile.phone || '');
      setCompanyName(profile.companyName || '');
      setGstin(profile.gstin || '');
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const token = await getFreshToken();
        if (!token) return;
        const [ordRes, qRes] = await Promise.all([
          apiFetch<{ orders: Order[] }>('/api/orders/my', {}, token),
          apiFetch<{ quotes: QuoteRequest[] }>('/api/quotes/my', {}, token),
        ]);
        setOrders(ordRes.orders);
        setQuotes(qRes.quotes);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user?.uid]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-editorial text-3xl font-bold text-[#2B1D14]">My Prompts &amp; Account</h1>
        <p className="text-sm text-[#52635A]">
          Sign in to access your unlocked design prompts, track paid design orders, and review custom
          design requests.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
        >
          Log In / Sign Up
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(false);
    await saveProfile({ displayName, phone, companyName, gstin });
    setProfileSaved(true);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const existing = profile?.addresses || [];
    const addr: SavedAddress = {
      ...newAddr,
      id: `addr_${Date.now()}`,
      isDefault: existing.length === 0,
    };
    await saveProfile({ addresses: [...existing, addr] });
    setNewAddr({
      label: 'Office',
      recipientName: '',
      phone: '',
      line1: '',
      city: '',
      state: '',
      postalCode: '',
    });
  };

  const handleDeleteAddress = async (addrId: string) => {
    const remaining = (profile?.addresses || []).filter((a) => a.id !== addrId);
    await saveProfile({ addresses: remaining });
  };

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
            Customer Prompt Vault
          </p>
          <h1 className="font-editorial text-3xl font-bold text-[#2B1D14] mt-1">
            Welcome, {profile?.displayName || user.displayName || user.email}
          </h1>
        </div>
        <Link
          to="/quote"
          className="px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-sm font-bold whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
        >
          Request Custom Design
        </Link>
      </div>

      {!user.emailVerified && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-950">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#B45309] shrink-0" />
            <span>
              Please verify your email address ({user.email}) for full account security.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await resendVerification();
              setVerifySent(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-xs font-semibold shrink-0"
          >
            {verifySent ? 'Verification Email Sent' : 'Resend Verification Email'}
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-[#DCE4DB] rounded-xl">
        {[
          { id: 'orders', label: `Unlocked Prompts & Orders (${orders.length})`, icon: Package },
          { id: 'quotes', label: `Custom Design Requests (${quotes.length})`, icon: FileText },
          { id: 'profile', label: 'Billing & Profile', icon: UserIcon },
          { id: 'wishlist', label: `Saved Designs (${wishlistedProducts.length})`, icon: Heart },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#3A261B] text-white'
                  : 'text-[#52635A] hover:text-[#2B1D14] hover:bg-[#E6ECE5]'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: My Orders & Unlocked Prompts */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="h-40 rounded-2xl bg-[#DCE4DB]/70 animate-pulse" />
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DCE4DB] p-10 text-center space-y-3">
              <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">
                No Design Purchases Yet
              </h2>
              <p className="text-sm text-[#52635A]">
                Choose a Website, Business Card, Flyer, Banner, Sticker, or Invitation design pack
                to unlock its complete ready-to-use prompt.
              </p>
              <Link
                to="/shop"
                className="inline-block px-5 py-2.5 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
              >
                Browse Design Catalog
              </Link>
            </div>
          ) : (
            orders.map((order) => {
              const hasUnlockedPrompts =
                order.paymentStatus === 'paid' &&
                order.items.some((i) => Boolean(i.unlockedPrompt));

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#64746B]">
                      <span className="font-mono font-bold text-[#2B1D14]">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span aria-hidden="true">·</span>
                      <span>{order.items.length} design item(s)</span>
                      {hasUnlockedPrompts && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#3D5A4C]">Prompt Unlocked</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#3A261B]">
                      {order.items.map((i) => `${i.title} (${i.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-xs">
                      <span className="text-[#64746B] block">Payment</span>
                      <span
                        className={`font-bold uppercase ${
                          order.paymentStatus === 'paid'
                            ? 'text-[#3D5A4C]'
                            : order.paymentStatus === 'failed'
                              ? 'text-red-700'
                              : 'text-[#B45309]'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-[#64746B] block">Delivery</span>
                      <span className="font-bold text-[#2B1D14]">
                        {FULFILLMENT_LABELS[order.fulfillmentStatus]}
                      </span>
                    </div>
                    <div className="text-base font-bold text-[#2B1D14] tabular-nums">
                      {formatInrFromPaise(order.totalPaise)}
                    </div>
                    <Link
                      to={`/orders/${order.id}`}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        order.paymentStatus === 'paid'
                          ? 'bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                          : 'bg-[#3A261B] text-white hover:bg-[#4E3426]'
                      }`}
                    >
                      {order.paymentStatus === 'paid'
                        ? 'Open & Copy Prompt'
                        : 'Pay / Check Status'}
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Custom Design Requests */}
      {tab === 'quotes' && (
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DCE4DB] p-10 text-center space-y-3">
              <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">
                No Custom Design Requests Yet
              </h2>
              <p className="text-sm text-[#52635A]">
                Need a bespoke brand suite, multi-page website concept, or custom packaging design
                prompt?
              </p>
              <Link
                to="/quote"
                className="inline-block px-5 py-2.5 rounded-lg bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-sm font-bold"
              >
                Submit Custom Design Brief
              </Link>
            </div>
          ) : (
            quotes.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#2B1D14]">
                      {q.productType} · Qty {q.quantity}
                    </h3>
                    <p className="text-xs text-[#64746B]">
                      Submitted {new Date(q.createdAt).toLocaleString()}
                      {q.dimensions ? ` · ${q.dimensions}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase text-[#3D5A4C]">
                    Status: {q.status}
                  </span>
                </div>
                {q.notes && <p className="text-sm text-[#52635A]">{q.notes}</p>}
                {(q.quotedPricePaise || q.adminResponse) && (
                  <div className="p-3.5 rounded-xl bg-[#F2F5F1] border border-[#DCE4DB] text-sm space-y-1">
                    {q.quotedPricePaise ? (
                      <div className="font-bold text-[#2B1D14] tabular-nums">
                        Quoted Price: {formatInrFromPaise(q.quotedPricePaise)}
                      </div>
                    ) : null}
                    {q.adminResponse && <p className="text-[#3A261B]">{q.adminResponse}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Profile & Saved Billing Details */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-4"
          >
            <h2 className="text-lg font-bold text-[#2B1D14]">Account &amp; GST Billing Details</h2>
            <div>
              <label htmlFor="prof-name" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Full Name
              </label>
              <input
                id="prof-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <div>
              <label htmlFor="prof-phone" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Phone Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="prof-comp" className="block text-xs font-semibold text-[#3A261B] mb-1">
                  Company Name (Optional)
                </label>
                <input
                  id="prof-comp"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
                />
              </div>
              <div>
                <label htmlFor="prof-gst" className="block text-xs font-semibold text-[#3A261B] mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  id="prof-gst"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
                />
              </div>
            </div>

            {profileSaved && (
              <div className="flex items-center gap-2 text-xs text-[#3D5A4C] font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Profile updated!</span>
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426]"
            >
              Save Profile
            </button>
          </form>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-[#2B1D14] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#B45309]" />
              <span>Saved Delivery Addresses</span>
            </h2>

            <div className="space-y-2.5">
              {(profile?.addresses || []).map((addr) => (
                <div
                  key={addr.id}
                  className="p-3.5 rounded-xl border border-[#DCE4DB] bg-[#F7F9F6] flex items-start justify-between gap-3"
                >
                  <div className="text-xs text-[#52635A] space-y-0.5">
                    <div className="font-bold text-[#2B1D14]">
                      {addr.label} · {addr.recipientName}
                    </div>
                    <div>
                      {addr.line1}, {addr.city}, {addr.state} — {addr.postalCode}
                    </div>
                    <div>Phone: {addr.phone}</div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete address ${addr.label}`}
                    onClick={() => void handleDeleteAddress(addr.id)}
                    className="text-[#64746B] hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddAddress} className="pt-4 border-t border-[#DCE4DB] space-y-3">
              <h3 className="text-sm font-bold text-[#2B1D14]">Add New Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Label (Home / Office)"
                  value={newAddr.label}
                  onChange={(e) => setNewAddr((a) => ({ ...a, label: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
                />
                <input
                  type="text"
                  required
                  placeholder="Recipient Name"
                  value={newAddr.recipientName}
                  onChange={(e) => setNewAddr((a) => ({ ...a, recipientName: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  required
                  placeholder="Phone"
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr((a) => ({ ...a, phone: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
                />
                <input
                  type="text"
                  required
                  placeholder="PIN Code"
                  value={newAddr.postalCode}
                  onChange={(e) => setNewAddr((a) => ({ ...a, postalCode: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Street Address"
                value={newAddr.line1}
                onChange={(e) => setNewAddr((a) => ({ ...a, line1: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={newAddr.city}
                  onChange={(e) => setNewAddr((a) => ({ ...a, city: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={newAddr.state}
                  onChange={(e) => setNewAddr((a) => ({ ...a, state: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 4: Wishlist */}
      {tab === 'wishlist' && (
        <div>
          {wishlistedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DCE4DB] p-10 text-center space-y-3">
              <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">
                Your Wishlist is Empty
              </h2>
              <Link
                to="/shop"
                className="inline-block px-5 py-2.5 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
              >
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
