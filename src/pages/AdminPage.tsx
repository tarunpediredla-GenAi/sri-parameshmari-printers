import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Layers,
  Package,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch, fetchAuthorizedArtworkBlobUrl } from '../lib/api';
import { FULFILLMENT_LABELS, formatInrFromPaise } from '../lib/pricing';
import type {
  Category,
  FulfillmentStatus,
  Order,
  Product,
  QuoteRequest,
  StoreSettings,
} from '../types/print';

interface AdminStats {
  totalOrders: number;
  paidOrdersCount: number;
  verifiedRevenuePaise: number;
  openPrintJobs: number;
  openQuotes: number;
  totalProducts: number;
}

export default function AdminPage() {
  const { user, isAdmin, settings: storeSettings, getFreshToken, openAuthModal, refreshCatalog } =
    useStore();

  const [tab, setTab] = useState<'orders' | 'products' | 'categories' | 'quotes' | 'settings'>(
    'orders'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings);

  // Order filters
  const [orderSearch, setOrderSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | Order['paymentStatus']>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'all' | FulfillmentStatus>('all');

  // Product editor state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productOptionsJson, setProductOptionsJson] = useState('');
  const [productTiersJson, setProductTiersJson] = useState('');

  // Category editor state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const loadAdminOverview = async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getFreshToken();
      if (!token) return;
      const data = await apiFetch<{
        stats: AdminStats;
        orders: Order[];
        quotes: QuoteRequest[];
        categories: Category[];
        products: Product[];
        settings: StoreSettings;
      }>('/api/admin/overview', {}, token);

      setStats(data.stats);
      setOrders(data.orders);
      setQuotes(data.quotes);
      setCategories(data.categories);
      setProducts(data.products);
      setSettingsForm(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminOverview();
  }, [user?.uid, isAdmin]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
      if (fulfillmentFilter !== 'all' && o.fulfillmentStatus !== fulfillmentFilter) return false;
      if (q) {
        const hay = `${o.orderNumber} ${o.customerName} ${o.customerEmail} ${o.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, orderSearch, paymentFilter, fulfillmentFilter]);

  const handleAdvanceFulfillment = async (order: Order, nextStatus: FulfillmentStatus) => {
    setError(null);
    setNotice(null);
    try {
      const token = await getFreshToken();
      if (!token) return;
      await apiFetch(
        `/api/admin/orders/${order.id}/fulfillment`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            fulfillmentStatus: nextStatus,
            note: `Updated to ${FULFILLMENT_LABELS[nextStatus]} by admin.`,
          }),
        },
        token
      );
      setNotice(`Order ${order.orderNumber} updated to ${FULFILLMENT_LABELS[nextStatus]}.`);
      await loadAdminOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fulfillment status.');
    }
  };

  const handleArtworkReview = async (
    orderId: string,
    artworkId: string,
    status: 'approved' | 'revision_requested'
  ) => {
    setError(null);
    try {
      const token = await getFreshToken();
      if (!token) return;
      await apiFetch(
        `/api/admin/orders/${orderId}/artwork-review`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            artworkId,
            status,
            reviewNote:
              status === 'approved' ? 'Prepress verified and approved.' : 'Please upload 300 DPI PDF.',
          }),
        },
        token
      );
      setNotice(`Artwork marked as ${status}.`);
      await loadAdminOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Artwork review update failed.');
    }
  };

  const handleViewPrivateArtwork = async (artworkId: string, fileName: string) => {
    try {
      const token = await getFreshToken();
      if (!token) return;
      const url = await fetchAuthorizedArtworkBlobUrl(artworkId, token);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch artwork.');
    }
  };

  const handleQuoteUpdate = async (
    quoteId: string,
    status: QuoteRequest['status'],
    quotedRupees: string,
    adminResponse: string
  ) => {
    setError(null);
    setNotice(null);
    try {
      const token = await getFreshToken();
      if (!token) return;
      const quotedPricePaise = quotedRupees ? Math.round(Number(quotedRupees) * 100) : undefined;
      await apiFetch(
        `/api/admin/quotes/${quoteId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, quotedPricePaise, adminResponse }),
        },
        token
      );
      setNotice('Quote response saved.');
      await loadAdminOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quote update failed.');
    }
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setProductOptionsJson(JSON.stringify(product.optionGroups, null, 2));
    setProductTiersJson(JSON.stringify(product.quantityTiers, null, 2));
  };

  const startNewProduct = () => {
    const firstCat = categories[0];
    const blank: Product = {
      id: '',
      title: '',
      slug: '',
      categoryId: firstCat?.id || 'cat-website-designs',
      categoryName: firstCat?.name || 'Website Designs',
      shortDescription: '',
      description: '',
      imageUrl: '/images/website-designs.jpg',
      basePricePaise: 49900,
      turnaroundDays: 'Instant Prompt Unlock',
      artworkRequired: false,
      featured: false,
      published: true,
      isSampleData: false,
      designPrompt: '',
      promptInstructions:
        'Paste this prompt into ChatGPT, Claude, Midjourney, Figma AI, or your preferred website/design generator and replace any [BRACKETED] placeholders with your brand details.',
      promptToolHint: 'ChatGPT / Claude / Midjourney / Figma AI / Canva',
      optionGroups: [
        {
          id: 'format',
          name: 'Design Format / Pack',
          type: 'size',
          required: true,
          choices: [{ id: 'standard', label: 'Standard Design Pack', priceDeltaPaise: 0 }],
        },
        {
          id: 'style',
          name: 'Aesthetic Direction',
          type: 'finish',
          required: true,
          choices: [{ id: 'editorial-sage', label: 'Editorial Sage & Walnut', priceDeltaPaise: 0 }],
        },
      ],
      quantityTiers: [
        { quantity: 1, label: 'Single Brand License (1 Concept)', multiplier: 1 },
        {
          quantity: 3,
          label: 'Studio Bundle (3 Variations)',
          multiplier: 1.8,
          discountLabel: 'Save 40%',
        },
      ],
    };
    setEditingProduct(blank);
    setProductOptionsJson(JSON.stringify(blank.optionGroups, null, 2));
    setProductTiersJson(JSON.stringify(blank.quantityTiers, null, 2));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setError(null);
    setNotice(null);
    try {
      const parsedOptions = JSON.parse(productOptionsJson);
      const parsedTiers = JSON.parse(productTiersJson);
      const cat = categories.find((c) => c.id === editingProduct.categoryId);
      const payload: Product = {
        ...editingProduct,
        categoryName: cat?.name || editingProduct.categoryName,
        optionGroups: parsedOptions,
        quantityTiers: parsedTiers,
      };

      const token = await getFreshToken();
      if (!token) return;
      if (editingProduct.id) {
        await apiFetch(
          `/api/admin/products/${editingProduct.id}`,
          { method: 'PUT', body: JSON.stringify(payload) },
          token
        );
      } else {
        await apiFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) }, token);
      }
      setEditingProduct(null);
      setNotice('Product saved to catalog.');
      await Promise.all([loadAdminOverview(), refreshCatalog()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid product JSON or save failed.');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const token = await getFreshToken();
    if (!token) return;
    await apiFetch(`/api/admin/products/${productId}`, { method: 'DELETE' }, token);
    setNotice('Product deleted.');
    await Promise.all([loadAdminOverview(), refreshCatalog()]);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getFreshToken();
    if (!token || !newCategoryName.trim()) return;
    await apiFetch(
      '/api/admin/categories',
      {
        method: 'POST',
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim(),
          imageUrl: '/images/website-designs.jpg',
          sortOrder: categories.length + 1,
          active: true,
        }),
      },
      token
    );
    setNewCategoryName('');
    setNewCategoryDesc('');
    setNotice('Category added.');
    await Promise.all([loadAdminOverview(), refreshCatalog()]);
  };

  const handleDeleteCategory = async (catId: string) => {
    const token = await getFreshToken();
    if (!token) return;
    await apiFetch(`/api/admin/categories/${catId}`, { method: 'DELETE' }, token);
    setNotice('Category removed.');
    await Promise.all([loadAdminOverview(), refreshCatalog()]);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const token = await getFreshToken();
      if (!token) return;
      await apiFetch(
        '/api/admin/settings',
        { method: 'PUT', body: JSON.stringify(settingsForm) },
        token
      );
      setNotice('Storefront settings & policies saved.');
      await Promise.all([loadAdminOverview(), refreshCatalog()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-editorial text-3xl font-bold text-[#2B1D14]">Admin Console</h1>
        <p className="text-sm text-[#52635A]">Sign in with an authorized admin account to continue.</p>
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="px-6 py-3 rounded-xl bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
        >
          Log In as Admin
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-[#B45309] mx-auto" />
        <h1 className="font-editorial text-2xl font-bold text-[#2B1D14]">Admin Access Required</h1>
        <p className="text-sm text-[#52635A]">
          Your account ({user.email}) does not currently have the{' '}
          <code className="font-mono text-xs bg-[#E6ECE5] px-1.5 py-0.5 rounded">admin: true</code>{' '}
          Firebase custom claim. Run{' '}
          <code className="font-mono text-xs bg-[#E6ECE5] px-1.5 py-0.5 rounded">
            npm run set-admin -- {user.uid}
          </code>{' '}
          on the server and sign back in.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
            Protected Design &amp; Prompt Operations
          </p>
          <h1 className="font-editorial text-3xl font-bold text-[#2B1D14] mt-1">
            Admin Console
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void loadAdminOverview()}
          className="px-4 py-2 rounded-lg border border-[#CFDACE] bg-white text-sm font-semibold text-[#2B1D14] hover:bg-[#F7F9F6]"
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* KPI Metrics (Revenue strictly from Verified Paid Orders) */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm">
            <div className="text-xs font-semibold text-[#52635A]">Verified Revenue (INR)</div>
            <div className="text-2xl font-bold text-[#2B1D14] tabular-nums mt-1">
              {formatInrFromPaise(stats.verifiedRevenuePaise)}
            </div>
            <div className="text-xs text-[#3D5A4C] mt-1">From verified paid orders only</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm">
            <div className="text-xs font-semibold text-[#52635A]">Paid Design Orders</div>
            <div className="text-2xl font-bold text-[#2B1D14] tabular-nums mt-1">
              {stats.paidOrdersCount}
            </div>
            <div className="text-xs text-[#64746B] mt-1">
              Out of {stats.totalOrders} total orders
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm">
            <div className="text-xs font-semibold text-[#52635A]">Pending Fulfillments</div>
            <div className="text-2xl font-bold text-[#2B1D14] tabular-nums mt-1">
              {stats.openPrintJobs}
            </div>
            <div className="text-xs text-[#64746B] mt-1">Active custom or digital reviews</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm">
            <div className="text-xs font-semibold text-[#52635A]">Custom Design Requests</div>
            <div className="text-2xl font-bold text-[#2B1D14] tabular-nums mt-1">
              {stats.openQuotes}
            </div>
            <div className="text-xs text-[#64746B] mt-1">{stats.totalProducts} design packages</div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-[#E6ECE5] border border-[#84A98C] text-[#2B1D14] text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#3D5A4C]" />
          <span>{notice}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-[#DCE4DB] rounded-xl">
        {[
          { id: 'orders', label: 'Orders & Prompt Delivery', icon: Package },
          { id: 'products', label: 'Design Packages & Prompts', icon: Layers },
          { id: 'categories', label: 'Design Categories', icon: FileText },
          { id: 'quotes', label: 'Custom Design Requests', icon: FileText },
          { id: 'settings', label: 'Studio Settings & Policies', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#3A261B] text-white'
                  : 'text-[#52635A] hover:text-[#2B1D14] hover:bg-[#E6ECE5]'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Orders & Fulfillment Queue */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-[#DCE4DB]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#64746B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search orders by number or customer"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order #, customer name, or email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <select
              aria-label="Filter by payment status"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
              className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              aria-label="Filter by print fulfillment status"
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value as typeof fulfillmentFilter)}
              className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14]"
            >
              <option value="all">All Print Stages</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="artwork_review">Artwork Review</option>
              <option value="printing">Printing</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DCE4DB] p-10 text-center text-sm text-[#52635A]">
              No orders match the current search/filter criteria.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const nextStage: FulfillmentStatus | null =
                order.paymentStatus !== 'paid'
                  ? null
                  : order.deliveryMethod === 'digital'
                    ? order.fulfillmentStatus === 'completed'
                      ? null
                      : 'completed'
                    : order.fulfillmentStatus === 'artwork_review'
                      ? 'printing'
                      : order.fulfillmentStatus === 'printing'
                        ? order.deliveryMethod === 'pickup'
                          ? 'ready_for_pickup'
                          : 'shipped'
                        : order.fulfillmentStatus === 'ready_for_pickup' ||
                            order.fulfillmentStatus === 'shipped'
                          ? 'completed'
                          : null;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#64746B]">
                        <span className="font-mono font-bold text-[#2B1D14]">
                          {order.orderNumber}
                        </span>
                        <span>·</span>
                        <span>{order.customerName}</span>
                        <span>·</span>
                        <span>{order.customerEmail}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {order.deliveryMethod === 'digital'
                            ? 'Digital Prompt Unlock'
                            : order.deliveryMethod}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-[#2B1D14] tabular-nums mt-1">
                        {formatInrFromPaise(order.totalPaise)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xs px-3 py-1.5 rounded-lg bg-[#F2F5F1] border border-[#DCE4DB]">
                        Payment:{' '}
                        <strong
                          className={`uppercase ${
                            order.paymentStatus === 'paid' ? 'text-[#3D5A4C]' : 'text-[#B45309]'
                          }`}
                        >
                          {order.paymentStatus}
                        </strong>
                      </div>
                      <div className="text-xs px-3 py-1.5 rounded-lg bg-[#F2F5F1] border border-[#DCE4DB]">
                        Delivery Status:{' '}
                        <strong className="text-[#2B1D14]">
                          {FULFILLMENT_LABELS[order.fulfillmentStatus]}
                        </strong>
                      </div>
                      {nextStage && (
                        <button
                          type="button"
                          onClick={() => void handleAdvanceFulfillment(order, nextStage)}
                          className="px-4 py-2 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-xs font-semibold"
                        >
                          Move to {FULFILLMENT_LABELS[nextStage]}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Item Prompt Delivery & Optional Reference Artwork */}
                  <div className="pt-3 border-t border-[#E6ECE5] space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.cartItemId}
                        className="text-xs bg-[#F7F9F6] p-3.5 rounded-xl border border-[#E6ECE5] space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <strong className="text-sm text-[#2B1D14]">
                              {item.title} ({item.quantity} license/tier)
                            </strong>
                            <div className="text-[#52635A] mt-0.5">
                              {Object.values(item.selectedOptionLabels).join(' / ')}
                            </div>
                            {item.brandBrief && (
                              <div className="mt-1.5 p-2 rounded-lg bg-white border border-[#DCE4DB] text-[#3A261B]">
                                <strong>Customer Brand Brief:</strong> {item.brandBrief}
                              </div>
                            )}
                          </div>
                          {item.artwork && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[#52635A]">
                                {item.artwork.fileName} ({item.artwork.status})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleViewPrivateArtwork(
                                    item.artwork!.artworkId,
                                    item.artwork!.fileName
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-white border border-[#CFDACE] font-semibold text-[#2B1D14] inline-flex items-center gap-1 hover:bg-[#F2F5F1]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Download Reference
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleArtworkReview(
                                    order.id,
                                    item.artwork!.artworkId,
                                    'approved'
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-[#3D5A4C] hover:bg-[#354E41] text-white font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleArtworkReview(
                                    order.id,
                                    item.artwork!.artworkId,
                                    'revision_requested'
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-[#B45309] hover:bg-[#92400E] text-white font-semibold"
                              >
                                Request Revision
                              </button>
                            </div>
                          )}
                        </div>

                        {order.paymentStatus === 'paid' && (
                          <AdminOrderPromptCard
                            orderId={order.id}
                            item={item}
                            getFreshToken={getFreshToken}
                            onUpdated={async () => {
                              setNotice(
                                `Custom prompt delivered/updated for ${order.orderNumber} (${item.title}).`
                              );
                              await loadAdminOverview();
                            }}
                            onError={(msg) => setError(msg)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Design Packages & Prompt Deliverables */}
      {tab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#2B1D14]">
              Design Catalog Packages &amp; Prompt Deliverables
            </h2>
            <button
              type="button"
              onClick={startNewProduct}
              className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-sm font-bold inline-flex items-center gap-1.5 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
            >
              <Plus className="w-4 h-4" />
              Add Design Package
            </button>
          </div>

          {editingProduct && (
            <form
              onSubmit={handleSaveProduct}
              className="bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-4"
            >
              <h3 className="text-base font-bold text-[#2B1D14]">
                {editingProduct.id ? `Edit Design: ${editingProduct.title}` : 'New Design Package'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title}
                    onChange={(e) =>
                      setEditingProduct((p) => (p ? { ...p, title: e.target.value } : p))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Category *
                  </label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={(e) =>
                      setEditingProduct((p) => (p ? { ...p, categoryId: e.target.value } : p))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Base Price (Paise, e.g. 49900 = ₹499)
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={editingProduct.basePricePaise}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, basePricePaise: Number(e.target.value) } : p
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Delivery / Turnaround Label
                  </label>
                  <input
                    type="text"
                    value={editingProduct.turnaroundDays}
                    onChange={(e) =>
                      setEditingProduct((p) => (p ? { ...p, turnaroundDays: e.target.value } : p))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Design Preview Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingProduct.imageUrl}
                      onChange={(e) =>
                        setEditingProduct((p) => (p ? { ...p, imageUrl: e.target.value } : p))
                      }
                      className="flex-1 px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
                    />
                    <select
                      aria-label="Choose mockup image preset"
                      value={editingProduct.imageUrl}
                      onChange={(e) =>
                        setEditingProduct((p) => (p ? { ...p, imageUrl: e.target.value } : p))
                      }
                      className="px-2.5 py-2 rounded-lg border border-[#CFDACE] text-xs bg-[#F7F9F6]"
                    >
                      <option value="/images/website-designs.jpg">Website Mockup</option>
                      <option value="/images/business-cards.jpg">Business Card</option>
                      <option value="/images/flyers-brochures.jpg">Flyer &amp; Brochure</option>
                      <option value="/images/banners-signage.jpg">Banner &amp; Signage</option>
                      <option value="/images/stickers-labels.jpg">Sticker &amp; Label</option>
                      <option value="/images/invitations-cards.jpg">Invitation &amp; Card</option>
                      <option value="/images/letterheads-stationery.jpg">Stationery</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-5 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.published}
                      onChange={(e) =>
                        setEditingProduct((p) => (p ? { ...p, published: e.target.checked } : p))
                      }
                    />
                    Published
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.featured}
                      onChange={(e) =>
                        setEditingProduct((p) => (p ? { ...p, featured: e.target.checked } : p))
                      }
                    />
                    Featured
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingProduct.artworkRequired}
                      onChange={(e) =>
                        setEditingProduct((p) =>
                          p ? { ...p, artworkRequired: e.target.checked } : p
                        )
                      }
                    />
                    Reference Upload Required
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={editingProduct.shortDescription}
                  onChange={(e) =>
                    setEditingProduct((p) => (p ? { ...p, shortDescription: e.target.value } : p))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
                />
              </div>

              {/* Protected Prompt Deliverable Fields */}
              <div className="p-4 rounded-xl bg-[#F2F5F1] border border-[#CFDACE] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#3D5A4C]">
                    Paid Prompt Deliverable (Hidden Until Razorpay Payment Verified)
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Compatible AI / Design Tools
                  </label>
                  <input
                    type="text"
                    value={editingProduct.promptToolHint || ''}
                    onChange={(e) =>
                      setEditingProduct((p) => (p ? { ...p, promptToolHint: e.target.value } : p))
                    }
                    placeholder="e.g., ChatGPT / Claude / Midjourney v6 / Figma AI / Canva"
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Master Design Prompt (Delivered Automatically After Paid Order)
                  </label>
                  <textarea
                    rows={5}
                    value={editingProduct.designPrompt || ''}
                    onChange={(e) =>
                      setEditingProduct((p) => (p ? { ...p, designPrompt: e.target.value } : p))
                    }
                    placeholder="Enter the exact master design prompt unlocked for customers once their order is paid..."
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] bg-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Customer Usage Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={editingProduct.promptInstructions || ''}
                    onChange={(e) =>
                      setEditingProduct((p) =>
                        p ? { ...p, promptInstructions: e.target.value } : p
                      )
                    }
                    placeholder="Explain how the buyer should paste and customize placeholders in the prompt..."
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    Option Groups Config (JSON: format, style, colors)
                  </label>
                  <textarea
                    rows={8}
                    value={productOptionsJson}
                    onChange={(e) => setProductOptionsJson(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                    License / Variation Tiers &amp; Multipliers (JSON)
                  </label>
                  <textarea
                    rows={8}
                    value={productTiersJson}
                    onChange={(e) => setProductTiersJson(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
                >
                  Save Design Package
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 rounded-lg border border-[#CFDACE] text-sm font-semibold text-[#2B1D14] hover:bg-[#F7F9F6]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-[#DCE4DB] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="w-16 h-14 rounded-lg object-cover shrink-0 bg-[#E6ECE5]"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#2B1D14] truncate">{p.title}</h3>
                    <p className="text-xs text-[#52635A] tabular-nums">
                      {p.categoryName} · {formatInrFromPaise(p.basePricePaise)} ·{' '}
                      {p.published ? 'Published' : 'Draft'} ·{' '}
                      <span className={p.designPrompt ? 'text-[#3D5A4C] font-semibold' : 'text-[#B45309]'}>
                        {p.designPrompt ? 'Prompt Ready' : 'No Prompt'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditProduct(p)}
                    className="px-3 py-1.5 rounded-lg border border-[#CFDACE] text-xs font-semibold text-[#2B1D14] hover:bg-[#F7F9F6]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${p.title}`}
                    onClick={() => void handleDeleteProduct(p.id)}
                    className="p-1.5 rounded-lg text-[#64746B] hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Categories */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCategory}
            className="lg:col-span-5 bg-white rounded-2xl border border-[#DCE4DB] p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-[#2B1D14]">Add Print Category</h2>
            <input
              type="text"
              required
              placeholder="Category Name (e.g., Packaging & Boxes)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm"
            />
            <textarea
              rows={3}
              placeholder="Short category description..."
              value={newCategoryDesc}
              onChange={(e) => setNewCategoryDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
            >
              Create Category
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-[#DCE4DB] p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-sm font-bold text-[#2B1D14]">{c.name}</div>
                  <div className="text-xs text-[#52635A]">{c.description}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete category ${c.name}`}
                  onClick={() => void handleDeleteCategory(c.id)}
                  className="p-2 text-[#64746B] hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Quote Requests */}
      {tab === 'quotes' && (
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DCE4DB] p-10 text-center text-sm text-[#52635A]">
              No custom quote requests submitted yet.
            </div>
          ) : (
            quotes.map((q) => (
              <AdminQuoteCard
                key={q.id}
                quote={q}
                onSave={handleQuoteUpdate}
                onViewArtwork={handleViewPrivateArtwork}
              />
            ))
          )}
        </div>
      )}

      {/* Tab 5: Shop Settings & Policies */}
      {tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white rounded-2xl border border-[#DCE4DB] p-6 sm:p-8 shadow-sm space-y-5"
        >
          <h2 className="text-lg font-bold text-[#2B1D14]">
            Shop Contact, Delivery &amp; Policy Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">Business Name</label>
              <input
                type="text"
                value={settingsForm.businessName}
                onChange={(e) => setSettingsForm((s) => ({ ...s, businessName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                Proprietor / Registered Entity
              </label>
              <input
                type="text"
                value={settingsForm.proprietorOrEntity}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, proprietorOrEntity: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">Support Email</label>
              <input
                type="text"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm((s) => ({ ...s, email: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">Phone / Helpline</label>
              <input
                type="text"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm((s) => ({ ...s, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">Shop Address</label>
              <input
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm((s) => ({ ...s, address: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">Business Hours</label>
              <input
                type="text"
                value={settingsForm.businessHours}
                onChange={(e) => setSettingsForm((s) => ({ ...s, businessHours: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                Shipping Fee (Paise)
              </label>
              <input
                type="number"
                value={settingsForm.shippingFeePaise}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, shippingFeePaise: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                Free Shipping Above (Paise)
              </label>
              <input
                type="number"
                value={settingsForm.freeShippingThresholdPaise}
                onChange={(e) =>
                  setSettingsForm((s) => ({
                    ...s,
                    freeShippingThresholdPaise: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3A261B] mb-1">
                Max Artwork Size (MB)
              </label>
              <input
                type="number"
                value={settingsForm.maxArtworkSizeMb}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, maxArtworkSizeMb: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={settingsForm.shippingEnabled}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, shippingEnabled: e.target.checked }))
                }
              />
              Enable Courier Shipping
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={settingsForm.pickupEnabled}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, pickupEnabled: e.target.checked }))
                }
              />
              Enable Store Pickup
            </label>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E6ECE5]">
            <h3 className="text-sm font-bold text-[#2B1D14]">Editable Policy Pages</h3>
            {(['about', 'privacy', 'terms', 'refund', 'shipping'] as const).map((key) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-[#3A261B] capitalize mb-1">
                  {key} Policy
                </label>
                <textarea
                  rows={2}
                  value={settingsForm.policies[key]}
                  onChange={(e) =>
                    setSettingsForm((s) => ({
                      ...s,
                      policies: { ...s.policies, [key]: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#3A261B] text-white text-sm font-bold hover:bg-[#4E3426]"
          >
            Save Storefront Settings
          </button>
        </form>
      )}
    </div>
  );
}

function AdminQuoteCard({
  quote,
  onSave,
  onViewArtwork,
}: {
  quote: QuoteRequest;
  onSave: (
    id: string,
    status: QuoteRequest['status'],
    quotedRupees: string,
    adminResponse: string
  ) => Promise<void>;
  onViewArtwork: (artworkId: string, fileName: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<QuoteRequest['status']>(quote.status);
  const [rupees, setRupees] = useState(
    quote.quotedPricePaise ? String(quote.quotedPricePaise / 100) : ''
  );
  const [response, setResponse] = useState(quote.adminResponse || '');

  return (
    <div className="bg-white rounded-2xl border border-[#DCE4DB] p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[#2B1D14]">
            {quote.productType} · Qty {quote.quantity}
          </h3>
          <p className="text-xs text-[#52635A]">
            {quote.customerName} ({quote.customerEmail} · {quote.customerPhone || 'No phone'})
          </p>
        </div>
        {quote.artworkId && quote.artworkFileName && (
          <button
            type="button"
            onClick={() => void onViewArtwork(quote.artworkId!, quote.artworkFileName!)}
            className="px-3 py-1.5 rounded-lg border border-[#CFDACE] text-xs font-semibold text-[#2B1D14] inline-flex items-center gap-1 hover:bg-[#F7F9F6]"
          >
            <Eye className="w-3.5 h-3.5" />
            Download {quote.artworkFileName}
          </button>
        )}
      </div>

      <div className="text-xs text-[#52635A] space-y-1">
        {quote.dimensions && (
          <div>
            <strong>Dimensions:</strong> {quote.dimensions}
          </div>
        )}
        {quote.paperAndFinish && (
          <div>
            <strong>Paper/Finish:</strong> {quote.paperAndFinish}
          </div>
        )}
        {quote.notes && <div>{quote.notes}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-[#E6ECE5]">
        <select
          aria-label={`Status for quote ${quote.id}`}
          value={status}
          onChange={(e) => setStatus(e.target.value as QuoteRequest['status'])}
          className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm"
        >
          <option value="submitted">Submitted</option>
          <option value="reviewing">Reviewing</option>
          <option value="quoted">Quoted</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
        <input
          type="number"
          placeholder="Quote Price (INR ₹)"
          value={rupees}
          onChange={(e) => setRupees(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm tabular-nums"
        />
        <input
          type="text"
          placeholder="Production notes / response..."
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#CFDACE] text-sm sm:col-span-2"
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => void onSave(quote.id, status, rupees, response)}
          className="px-4 py-2 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-xs font-semibold"
        >
          Send Quote Response
        </button>
      </div>
    </div>
  );
}

function AdminOrderPromptCard({
  orderId,
  item,
  getFreshToken,
  onUpdated,
  onError,
}: {
  orderId: string;
  item: Order['items'][number];
  getFreshToken: () => Promise<string | null>;
  onUpdated: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [promptText, setPromptText] = useState(item.unlockedPrompt || '');
  const [instructions, setInstructions] = useState(item.promptInstructions || '');
  const [toolHint, setToolHint] = useState(item.promptToolHint || '');
  const [saving, setSaving] = useState(false);

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    setSaving(true);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Admin session expired.');
      await apiFetch(
        `/api/admin/orders/${orderId}/deliver-prompt`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            cartItemId: item.cartItemId,
            unlockedPrompt: promptText,
            promptInstructions: instructions,
            promptToolHint: toolHint,
          }),
        },
        token
      );
      setExpanded(false);
      await onUpdated();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Unable to send custom prompt.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-2 border-t border-[#DCE4DB] space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-[#3D5A4C]">
          {item.unlockedPrompt
            ? `Prompt Unlocked (${item.unlockedPrompt.length} chars)${item.promptUpdatedAt ? ` · Updated ${new Date(item.promptUpdatedAt).toLocaleString()}` : ''}`
            : 'No prompt delivered yet'}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-3 py-1 rounded-lg bg-[#231710] hover:bg-[#3A261B] text-[#F59E0B] text-xs font-semibold"
        >
          {expanded ? 'Close Prompt Editor' : 'Customize & Send Customer Prompt'}
        </button>
      </div>

      {expanded && (
        <form onSubmit={handleDeliver} className="space-y-2.5 bg-white p-3 rounded-xl border border-[#CFDACE]">
          <div>
            <label className="block text-[11px] font-semibold text-[#3A261B] mb-1">
              Target Design Tool Hint
            </label>
            <input
              type="text"
              value={toolHint}
              onChange={(e) => setToolHint(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#CFDACE] text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#3A261B] mb-1">
              Unlocked Prompt Delivered to Customer
            </label>
            <textarea
              rows={5}
              required
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#CFDACE] font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#3A261B] mb-1">
              Usage Instructions
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#CFDACE] text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-xs font-bold disabled:opacity-60"
            >
              {saving ? 'Sending...' : 'Save & Unlock for Customer'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
