import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import Razorpay from 'razorpay';
import {
  buildTailoredOrderPrompt,
  calculateItemPricing,
  calculateOrderTotals,
  canTransitionFulfillment,
  validateArtworkFile,
} from './src/lib/pricing';
import type {
  CartItem,
  Category,
  Order,
  OrderItemSnapshot,
  Product,
  QuoteRequest,
  StoreSettings,
} from './src/types/print';
import {
  initFirebaseAdmin,
  verifyBearerToken,
  type VerifiedRequestUser,
} from './server/firebaseAdmin';
import {
  applyVerifiedPaymentTransition,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from './server/razorpayUtils';
import {
  deleteCategory,
  deleteProduct,
  getArtworkRecord,
  getCatalogData,
  getFirestoreIfReady,
  isVercelRuntime,
  getOrderById,
  getOrderByRazorpayOrderId,
  getQuoteById,
  getUserProfile,
  listAllOrders,
  listAllQuotes,
  listOrdersForUser,
  listQuotesForUser,
  readArtworkBuffer,
  recordPaymentEventIfNew,
  saveArtworkRecord,
  saveCategory,
  saveOrder,
  saveProduct,
  saveQuote,
  saveStoreSettings,
  saveUserProfile,
  updateArtworkStatus,
  updateOrder,
  type ArtworkRecord,
} from './server/store';

interface AuthedRequest extends Request {
  user?: VerifiedRequestUser;
}

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return null;
  }
  return {
    keyId,
    keySecret,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await verifyBearerToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Invalid or expired authentication token.',
    });
  }
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: 'Admin privileges required for this action.' });
    return;
  }
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function sanitizeProductForPublic(product: Product): Product {
  const { designPrompt, promptInstructions, ...publicFields } = product;
  return {
    ...publicFields,
    hasPromptDeliverable: Boolean(designPrompt && designPrompt.trim().length > 0),
  };
}

function sanitizeOrderForCustomer(order: Order): Order {
  if (order.paymentStatus === 'paid') {
    return order;
  }
  return {
    ...order,
    items: order.items.map((item) => {
      const { unlockedPrompt: _up, promptInstructions: _pi, ...safeItem } = item;
      return safeItem;
    }),
  };
}

function resolveServerPort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else if (args[i].startsWith('--port=')) {
      const parsed = Number(args[i].slice('--port='.length));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    const parsed = Number(process.env.PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

export function createApiApp() {
  const app = express();
  const port = resolveServerPort();
  initFirebaseAdmin();

  // 1. Razorpay Webhook MUST be mounted BEFORE express.json() so raw Buffer signature verification works
  app.post(
    '/api/webhooks/razorpay',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
      if (!webhookSecret) {
        res.status(503).json({ error: 'RAZORPAY_WEBHOOK_SECRET is not configured.' });
        return;
      }

      const signature = req.headers['x-razorpay-signature'];
      if (typeof signature !== 'string' || !Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: 'Missing webhook signature or raw payload.' });
        return;
      }

      const valid = verifyRazorpayWebhookSignature(req.body, signature, webhookSecret);
      if (!valid) {
        res.status(400).json({ error: 'Invalid Razorpay webhook signature.' });
        return;
      }

      try {
        const eventPayload = JSON.parse(req.body.toString('utf8')) as {
          event?: string;
          payload?: {
            payment?: {
              entity?: {
                id: string;
                order_id: string;
                amount: number;
                currency: string;
                status: string;
              };
            };
          };
        };

        const eventName = eventPayload.event || 'unknown';
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (!paymentEntity?.order_id || !paymentEntity?.id) {
          res.json({ received: true, ignored: true });
          return;
        }

        const headerEventId = req.headers['x-razorpay-event-id'];
        const eventId =
          typeof headerEventId === 'string' && headerEventId.trim()
            ? headerEventId.trim()
            : `wh_${eventName}_${paymentEntity.id}_${paymentEntity.status}`;

        const isNew = await recordPaymentEventIfNew({
          id: eventId,
          eventType: eventName,
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          processedAt: new Date().toISOString(),
        });

        if (!isNew) {
          res.json({ received: true, duplicate: true });
          return;
        }

        const order = await getOrderByRazorpayOrderId(paymentEntity.order_id);
        if (!order) {
          res.status(404).json({ error: 'Order not found for Razorpay order ID.' });
          return;
        }

        const transition = await updateOrder(order.id, (current) =>
          applyVerifiedPaymentTransition(current, {
            razorpayOrderId: paymentEntity.order_id,
            razorpayPaymentId: paymentEntity.id,
            amountPaise: paymentEntity.amount,
            currency: paymentEntity.currency,
            status: paymentEntity.status,
            actor: 'razorpay_webhook',
            nowIso: new Date().toISOString(),
          })
        );
        res.json({
          received: true,
          orderId: transition.order.id,
          paymentStatus: transition.order.paymentStatus,
          fulfillmentStatus: transition.order.fulfillmentStatus,
          alreadyPaid: transition.alreadyPaid,
        });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Failed to process Razorpay webhook.',
        });
      }
    }
  );

  // 2. Standard JSON body parser for all other API routes
  app.use(express.json({ limit: '2mb' }));

  // 3. Public Health & Storefront Config Routes
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'sri-parameshmari-printers' });
  });

  app.get('/api/config/status', async (_req, res) => {
    const rzp = getRazorpayClient();
    const { hasServiceAccount, dataProjectId, config } = initFirebaseAdmin();
    const appUrl = process.env.APP_URL || `http://localhost:${port}`;
    res.json({
      razorpayConfigured: Boolean(rzp) && (!isVercelRuntime || Boolean(getFirestoreIfReady())),
      razorpayKeyId: rzp?.keyId || null,
      razorpayMode: rzp?.keyId.startsWith('rzp_live_') ? 'live' : 'test',
      webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
      firebaseAdminConfigured: hasServiceAccount,
      firebaseAuthProjectId: config.projectId,
      firebaseDataProjectId: dataProjectId,
      maxArtworkSizeMb: Number(process.env.MAX_ARTWORK_SIZE_MB || 25),
      webhookUrlHint: `${appUrl.replace(/\/$/, '')}/api/webhooks/razorpay`,
    });
  });

  app.get('/api/catalog', async (_req, res) => {
    try {
      const data = await getCatalogData();
      res.json({
        categories: data.categories.filter((c) => c.active),
        products: data.products.filter((p) => p.published).map(sanitizeProductForPublic),
        settings: data.settings,
      });
    } catch (error) {
      console.error('Unable to load catalog:', error);
      res.status(503).json({ error: 'The storefront is temporarily unavailable.' });
    }
  });

  // 4. Private Artwork Upload & Authorized Retrieval
  app.post(
    '/api/artwork/upload',
    requireAuth,
    upload.single('file'),
    async (req: AuthedRequest, res: Response) => {
      try {
        const user = req.user!;
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: 'No artwork file uploaded.' });
          return;
        }

        const { settings } = await getCatalogData();
        const maxMb = settings.maxArtworkSizeMb || Number(process.env.MAX_ARTWORK_SIZE_MB || 25);
        const validation = validateArtworkFile(file.originalname, file.mimetype, file.size, maxMb);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }

        const id = `art_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const record: ArtworkRecord = {
          id,
          userId: user.uid,
          fileName: file.originalname,
          contentType: file.mimetype as 'application/pdf' | 'image/png' | 'image/jpeg',
          sizeBytes: file.size,
          storagePath: `artwork/${user.uid}/${id}_${safeName}`,
          status: 'uploaded',
          createdAt: new Date().toISOString(),
        };

        await saveArtworkRecord(record, file.buffer);
        res.status(201).json({
          artworkId: record.id,
          fileName: record.fileName,
          contentType: record.contentType,
          sizeBytes: record.sizeBytes,
          status: record.status,
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : 'Artwork upload failed.',
        });
      }
    }
  );

  app.get('/api/artwork/:id/file', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const record = await getArtworkRecord(String(req.params.id));
    if (!record) {
      res.status(404).json({ error: 'Artwork file not found.' });
      return;
    }
    if (record.userId !== user.uid && !user.isAdmin) {
      res.status(403).json({ error: 'Forbidden: you do not have access to this private artwork.' });
      return;
    }

    const buf = await readArtworkBuffer(record);
    if (!buf) {
      res.status(404).json({ error: 'Artwork file binary not found in storage.' });
      return;
    }

    res.setHeader('Content-Type', record.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${record.fileName.replace(/"/g, '')}"`);
    res.send(buf);
  });

  // 5. Profile Routes
  app.get('/api/profile', requireAuth, async (req: AuthedRequest, res: Response) => {
    const profile = await getUserProfile(req.user!.uid, req.user!.email);
    res.json({ profile, isAdmin: req.user!.isAdmin });
  });

  app.put('/api/profile', requireAuth, async (req: AuthedRequest, res: Response) => {
    const existing = await getUserProfile(req.user!.uid, req.user!.email);
    const body = req.body as Partial<typeof existing>;
    const updated = await saveUserProfile({
      ...existing,
      uid: req.user!.uid,
      email: req.user!.email || existing.email,
      displayName: typeof body.displayName === 'string' ? body.displayName.slice(0, 120) : existing.displayName,
      phone: typeof body.phone === 'string' ? body.phone.slice(0, 30) : existing.phone,
      companyName: typeof body.companyName === 'string' ? body.companyName.slice(0, 120) : existing.companyName,
      gstin: typeof body.gstin === 'string' ? body.gstin.slice(0, 20) : existing.gstin,
      addresses: Array.isArray(body.addresses) ? body.addresses.slice(0, 10) : existing.addresses,
      wishlistProductIds: Array.isArray(body.wishlistProductIds)
        ? body.wishlistProductIds.slice(0, 100)
        : existing.wishlistProductIds,
      updatedAt: new Date().toISOString(),
    });
    res.json({ profile: updated });
  });

  // 6. Checkout & Razorpay Payment Verification (Server-Authoritative Integer Paise)
  app.post('/api/orders/checkout', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const user = req.user!;
      if (isVercelRuntime && !getFirestoreIfReady()) {
        res.status(503).json({ error: 'Checkout is temporarily unavailable because order storage is offline.' });
        return;
      }
      const rzp = getRazorpayClient();
      if (!rzp) {
        res.status(503).json({
          code: 'RAZORPAY_NOT_CONFIGURED',
          error:
            'Razorpay Test Mode keys (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server yet.',
        });
        return;
      }

      const body = req.body as {
        items?: Array<
          Pick<CartItem, 'cartItemId' | 'productId' | 'selectedOptions' | 'quantity' | 'artwork' | 'brandBrief'>
        >;
        deliveryMethod?: 'digital' | 'shipping' | 'pickup';
        customerName?: string;
        customerPhone?: string;
        customerEmail?: string;
        shippingAddress?: Order['shippingAddress'];
      };

      if (!Array.isArray(body.items) || body.items.length === 0) {
        res.status(400).json({ error: 'Your cart is empty.' });
        return;
      }

      const { products, settings } = await getCatalogData();
      const deliveryMethod: Order['deliveryMethod'] =
        body.deliveryMethod === 'pickup' && settings.pickupEnabled
          ? 'pickup'
          : body.deliveryMethod === 'shipping' && settings.shippingEnabled
            ? 'shipping'
            : 'digital';

      const customerName = body.customerName?.trim();
      const rawPhone = body.customerPhone?.trim() || '';
      const phoneDigits = rawPhone.replace(/\D/g, '');
      const customerPhone =
        phoneDigits.length === 10
          ? `+91${phoneDigits}`
          : rawPhone.startsWith('+')
            ? rawPhone.replace(/\s+/g, '')
            : phoneDigits
              ? `+${phoneDigits}`
              : rawPhone;
      const customerEmail = (body.customerEmail || user.email || '').trim().toLowerCase();

      if (!customerName || !customerPhone) {
        res.status(400).json({ error: 'Customer name and phone number are required.' });
        return;
      }
      if (deliveryMethod === 'shipping') {
        const addr = body.shippingAddress;
        if (!addr?.line1 || !addr?.city || !addr?.state || !addr?.postalCode) {
          res.status(400).json({ error: 'Complete shipping address is required for courier delivery.' });
          return;
        }
      }

      const orderItems: OrderItemSnapshot[] = [];

      for (const clientItem of body.items) {
        const product = products.find((p) => p.id === clientItem.productId && p.published);
        if (!product) {
          res.status(400).json({ error: `Design product "${clientItem.productId}" is unavailable.` });
          return;
        }

        const priced = calculateItemPricing(
          product,
          clientItem.selectedOptions || {},
          Number(clientItem.quantity)
        );

        let verifiedArtwork: OrderItemSnapshot['artwork'] = null;
        if (clientItem.artwork?.artworkId) {
          const artRec = await getArtworkRecord(clientItem.artwork.artworkId);
          if (!artRec || artRec.userId !== user.uid) {
            res.status(403).json({
              error: `Attached reference file for "${product.title}" is missing or does not belong to your account.`,
            });
            return;
          }
          verifiedArtwork = {
            artworkId: artRec.id,
            fileName: artRec.fileName,
            contentType: artRec.contentType,
            sizeBytes: artRec.sizeBytes,
            status: artRec.status,
            reviewNote: artRec.reviewNote,
          };
        } else if (product.artworkRequired) {
          res.status(400).json({
            error: `Reference upload is required for "${product.title}" before checkout.`,
          });
          return;
        }

        const brandBrief =
          typeof clientItem.brandBrief === 'string' && clientItem.brandBrief.trim()
            ? clientItem.brandBrief.trim().slice(0, 1200)
            : '';

        const basePrompt =
          product.designPrompt ||
          `Design prompt for ${product.title}. Contact ${settings.email} with your order number if you need a tailored prompt.`;

        orderItems.push({
          cartItemId: clientItem.cartItemId || crypto.randomUUID(),
          productId: product.id,
          title: product.title,
          imageUrl: product.imageUrl,
          selectedOptions: clientItem.selectedOptions || {},
          selectedOptionLabels: priced.selectedOptionLabels,
          quantity: Number(clientItem.quantity),
          lineTotalPaise: priced.unitPackPricePaise,
          turnaroundDays: priced.turnaroundDays,
          artworkRequired: product.artworkRequired,
          brandBrief,
          artwork: verifiedArtwork,
          unlockedPrompt: buildTailoredOrderPrompt(
            basePrompt,
            priced.selectedOptionLabels,
            brandBrief
          ),
          promptInstructions: product.promptInstructions,
          promptToolHint: product.promptToolHint,
        });
      }

      const totals = calculateOrderTotals(
        orderItems.map((i) => ({ unitPackPricePaise: i.lineTotalPaise })),
        deliveryMethod,
        settings
      );

      const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
      const orderNumber = `SPP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const rzpOrder = await rzp.client.orders.create({
        amount: totals.totalPaise,
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          internalOrderId: orderId,
          userId: user.uid,
        },
      });

      const now = new Date().toISOString();
      const newOrder: Order = {
        id: orderId,
        orderNumber,
        userId: user.uid,
        customerEmail: customerEmail || user.email || '',
        customerName,
        customerPhone,
        deliveryMethod,
        shippingAddress: deliveryMethod === 'shipping' ? body.shippingAddress || null : null,
        items: orderItems,
        subtotalPaise: totals.subtotalPaise,
        shippingPaise: totals.shippingPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        currency: 'INR',
        paymentStatus: 'pending',
        fulfillmentStatus: 'awaiting_payment',
        razorpayOrderId: rzpOrder.id,
        fulfillmentHistory: [
          {
            status: 'awaiting_payment',
            note: 'Design order locked on server. Prompt unlocks immediately upon Razorpay payment verification.',
            updatedBy: user.uid,
            timestamp: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await saveOrder(newOrder);
      res.status(201).json({
        order: sanitizeOrderForCustomer(newOrder),
        razorpay: {
          keyId: rzp.keyId,
          orderId: rzpOrder.id,
          amountPaise: totals.totalPaise,
          currency: 'INR',
        },
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to initiate checkout.',
      });
    }
  });

  app.post('/api/orders/:id/verify-payment', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const user = req.user!;
      const rzp = getRazorpayClient();
      if (!rzp) {
        res.status(503).json({ error: 'Razorpay credentials not configured.' });
        return;
      }

      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.userId !== user.uid && !user.isAdmin) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }

      const { razorpay_payment_id, razorpay_signature } = req.body as {
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      };

      if (!order.razorpayOrderId || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ error: 'Missing Razorpay payment confirmation fields.' });
        return;
      }

      // 1. Verify HMAC-SHA256 using the Razorpay Order ID stored on the server
      const validSig = verifyRazorpayCheckoutSignature(
        order.razorpayOrderId,
        razorpay_payment_id,
        razorpay_signature,
        rzp.keySecret
      );
      if (!validSig) {
        res.status(400).json({ error: 'Payment signature verification failed.' });
        return;
      }

      // 2. Fetch live payment record from Razorpay API to verify order, amount, currency, and captured status
      const payment = await rzp.client.payments.fetch(razorpay_payment_id);
      if (payment.order_id !== order.razorpayOrderId) {
        res.status(400).json({ error: 'Payment does not match the server Razorpay order ID.' });
        return;
      }

      const isNew = await recordPaymentEventIfNew({
        id: `chk_${razorpay_payment_id}_${payment.status}`,
        eventType: 'checkout.verify',
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: razorpay_payment_id,
        processedAt: new Date().toISOString(),
      });

      const latestOrder = (await getOrderById(order.id)) || order;
      if (!isNew && latestOrder.paymentStatus === 'paid') {
        res.json({ order: latestOrder, alreadyPaid: true });
        return;
      }

      const transition = await updateOrder(order.id, (current) =>
        applyVerifiedPaymentTransition(current, {
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          amountPaise: Number(payment.amount),
          currency: payment.currency,
          status: payment.status,
          actor: 'checkout_verify',
          nowIso: new Date().toISOString(),
        })
      );
      res.json({ order: sanitizeOrderForCustomer(transition.order), alreadyPaid: transition.alreadyPaid });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Payment verification failed.',
      });
    }
  });

  app.post('/api/orders/:id/retry-payment', requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
      const user = req.user!;
      const rzp = getRazorpayClient();
      if (!rzp) {
        res.status(503).json({
          code: 'RAZORPAY_NOT_CONFIGURED',
          error: 'Razorpay credentials not configured.',
        });
        return;
      }

      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.userId !== user.uid) {
        res.status(403).json({ error: 'Forbidden.' });
        return;
      }
      if (order.paymentStatus === 'paid') {
        res.json({ order, razorpay: null });
        return;
      }
      if (!order.razorpayOrderId) {
        res.status(409).json({ error: 'This order has no Razorpay reference. Contact support with your order number.' });
        return;
      }

      const razorpayOrderId = order.razorpayOrderId;
      const payments = await rzp.client.orders.fetchPayments(razorpayOrderId);
      const captured = payments.items.find((payment) => payment.status === 'captured');
      if (captured) {
        const transition = await updateOrder(order.id, (current) =>
          applyVerifiedPaymentTransition(current, {
            razorpayOrderId,
            razorpayPaymentId: captured.id,
            amountPaise: Number(captured.amount),
            currency: captured.currency,
            status: captured.status,
            actor: 'retry_payment',
            nowIso: new Date().toISOString(),
          })
        );
        res.json({ order: transition.order, razorpay: null });
        return;
      }

      const current = await getOrderById(order.id);
      if (!current || current.razorpayOrderId !== razorpayOrderId) {
        res.status(409).json({ error: 'The order changed. Refresh it and check payment status.' });
        return;
      }
      if (current.paymentStatus === 'paid') {
        res.json({ order: current, razorpay: null });
        return;
      }
      if (payments.items.some((payment) => payment.status === 'authorized')) {
        res.status(409).json({ error: 'Razorpay is confirming your payment. Use Check Payment Status before paying again.' });
        return;
      }

      res.json({
        order: sanitizeOrderForCustomer(current),
        razorpay: {
          keyId: rzp.keyId,
          orderId: razorpayOrderId,
          amountPaise: current.totalPaise,
          currency: current.currency,
        },
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to retry payment.',
      });
    }
  });

  app.post(
    '/api/orders/:id/check-payment-status',
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        const user = req.user!;
        const rzp = getRazorpayClient();
        if (!rzp) {
          res.status(503).json({ error: 'Razorpay credentials not configured.' });
          return;
        }

        const order = await getOrderById(String(req.params.id));
        if (!order) {
          res.status(404).json({ error: 'Order not found.' });
          return;
        }
        if (order.userId !== user.uid && !user.isAdmin) {
          res.status(403).json({ error: 'Forbidden.' });
          return;
        }
        if (order.paymentStatus === 'paid' || !order.razorpayOrderId) {
          res.json({ order: sanitizeOrderForCustomer(order) });
          return;
        }

        const razorpayOrderId = order.razorpayOrderId;
        const payments = await rzp.client.orders.fetchPayments(razorpayOrderId);
        const captured = payments.items.find((payment) => payment.status === 'captured');
        const authorized = payments.items.some((payment) => payment.status === 'authorized');
        const failed = payments.items.find((payment) => payment.status === 'failed');
        const targetPayment = captured || (authorized ? undefined : failed);

        if (!targetPayment) {
          res.json({
            order: sanitizeOrderForCustomer(order),
            message: 'Payment is still awaiting confirmation from Razorpay.',
          });
          return;
        }

        const transition = await updateOrder(order.id, (current) =>
          applyVerifiedPaymentTransition(current, {
            razorpayOrderId,
            razorpayPaymentId: targetPayment.id,
            amountPaise: Number(targetPayment.amount),
            currency: targetPayment.currency,
            status: targetPayment.status,
            actor: 'status_check',
            nowIso: new Date().toISOString(),
          })
        );

        res.json({ order: sanitizeOrderForCustomer(transition.order) });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Failed to check payment status.',
        });
      }
    }
  );

  app.post('/api/orders/:id/mark-failed', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const order = await getOrderById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.userId !== user.uid) {
      res.status(403).json({ error: 'Forbidden.' });
      return;
    }
    const reason =
      typeof req.body?.reason === 'string'
        ? req.body.reason.slice(0, 240)
        : 'Checkout cancelled or payment declined.';
    const { code, source, step, reason: gatewayReason, paymentId } = req.body?.failure ?? {};
    const safeField = (value: unknown) =>
      typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : undefined;
    console.info('Razorpay Checkout payment.failed', {
      orderNumber: order.orderNumber,
      razorpayOrderId: order.razorpayOrderId,
      paymentId: safeField(paymentId),
      code: safeField(code),
      source: safeField(source),
      step: safeField(step),
      reason: safeField(gatewayReason),
    });

    try {
      const result = await updateOrder(order.id, (current) => ({
        order: current.paymentStatus === 'paid' || current.razorpayOrderId !== order.razorpayOrderId
          ? current
          : {
              ...current,
              paymentStatus: 'failed',
              paymentFailureReason: reason,
              updatedAt: new Date().toISOString(),
            },
      }));
      res.json({ order: sanitizeOrderForCustomer(result.order) });
    } catch {
      res.status(500).json({ error: 'Payment failure could not be saved. Use Check Payment Status.' });
    }
  });

  app.get('/api/orders/my', requireAuth, async (req: AuthedRequest, res: Response) => {
    const orders = await listOrdersForUser(req.user!.uid);
    res.json({ orders: orders.map(sanitizeOrderForCustomer) });
  });

  app.get('/api/orders/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
    const order = await getOrderById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    if (order.userId !== req.user!.uid && !req.user!.isAdmin) {
      res.status(403).json({ error: 'Forbidden: you can only view your own orders.' });
      return;
    }
    res.json({ order: req.user!.isAdmin ? order : sanitizeOrderForCustomer(order) });
  });

  // 7. Customer Quote Requests
  app.post('/api/quotes', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const body = req.body as Partial<QuoteRequest>;
    if (!body.customerName || !body.productType || !body.quantity || Number(body.quantity) < 1) {
      res.status(400).json({ error: 'Name, product type, and quantity are required.' });
      return;
    }

    if (body.artworkId) {
      const art = await getArtworkRecord(body.artworkId);
      if (!art || art.userId !== user.uid) {
        res.status(403).json({ error: 'Attached artwork is invalid or unauthorized.' });
        return;
      }
    }

    const now = new Date().toISOString();
    const quote: QuoteRequest = {
      id: `q_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`,
      userId: user.uid,
      customerName: body.customerName.trim().slice(0, 120),
      customerEmail: (body.customerEmail || user.email).trim().slice(0, 200),
      customerPhone: body.customerPhone?.trim().slice(0, 30),
      productType: body.productType.trim().slice(0, 120),
      quantity: Math.round(Number(body.quantity)),
      dimensions: body.dimensions?.trim().slice(0, 120),
      paperAndFinish: body.paperAndFinish?.trim().slice(0, 200),
      notes: body.notes?.trim().slice(0, 2000),
      artworkId: body.artworkId,
      artworkFileName: body.artworkFileName,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };
    await saveQuote(quote);
    res.status(201).json({ quote });
  });

  app.get('/api/quotes/my', requireAuth, async (req: AuthedRequest, res: Response) => {
    const quotes = await listQuotesForUser(req.user!.uid);
    res.json({ quotes });
  });

  // 8. Admin Protected Routes
  app.get('/api/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
    const [orders, quotes, catalog] = await Promise.all([
      listAllOrders(),
      listAllQuotes(),
      getCatalogData(),
    ]);
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
    const verifiedRevenuePaise = paidOrders.reduce((sum, o) => sum + o.totalPaise, 0);
    const openPrintJobs = paidOrders.filter((o) => o.fulfillmentStatus !== 'completed').length;
    const openQuotes = quotes.filter((q) => q.status === 'submitted' || q.status === 'reviewing').length;

    res.json({
      stats: {
        totalOrders: orders.length,
        paidOrdersCount: paidOrders.length,
        verifiedRevenuePaise,
        openPrintJobs,
        openQuotes,
        totalProducts: catalog.products.length,
      },
      orders,
      quotes,
      categories: catalog.categories,
      products: catalog.products,
      settings: catalog.settings,
    });
  });

  app.patch(
    '/api/admin/orders/:id/fulfillment',
    requireAuth,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      const nextStatus = req.body?.fulfillmentStatus as Order['fulfillmentStatus'];
      const note =
        typeof req.body?.note === 'string' && req.body.note.trim()
          ? req.body.note.trim().slice(0, 400)
          : `Print status updated to ${nextStatus}.`;

      const check = canTransitionFulfillment(
        order.fulfillmentStatus,
        nextStatus,
        order.paymentStatus,
        order.deliveryMethod
      );
      if (!check.allowed) {
        res.status(400).json({ error: check.reason });
        return;
      }

      const now = new Date().toISOString();
      const updated: Order = {
        ...order,
        fulfillmentStatus: nextStatus,
        updatedAt: now,
        fulfillmentHistory: [
          ...order.fulfillmentHistory,
          {
            status: nextStatus,
            note,
            updatedBy: req.user!.email || req.user!.uid,
            timestamp: now,
          },
        ],
      };

      await saveOrder(updated);
      res.json({ order: updated });
    }
  );

  app.patch(
    '/api/admin/orders/:id/artwork-review',
    requireAuth,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      const { artworkId, status, reviewNote } = req.body as {
        artworkId?: string;
        status?: 'approved' | 'revision_requested';
        reviewNote?: string;
      };
      if (!artworkId || (status !== 'approved' && status !== 'revision_requested')) {
        res.status(400).json({ error: 'Invalid artwork review payload.' });
        return;
      }

      await updateArtworkStatus(artworkId, status, reviewNote);
      const updatedItems = order.items.map((item) =>
        item.artwork?.artworkId === artworkId
          ? {
              ...item,
              artwork: {
                ...item.artwork,
                status,
                reviewNote,
              },
            }
          : item
      );

      const updatedOrder: Order = {
        ...order,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
      await saveOrder(updatedOrder);
      res.json({ order: updatedOrder });
    }
  );

  app.patch(
    '/api/admin/orders/:id/deliver-prompt',
    requireAuth,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }
      if (order.paymentStatus !== 'paid') {
        res.status(400).json({ error: 'Cannot deliver custom prompts on an unpaid order.' });
        return;
      }

      const { cartItemId, unlockedPrompt, promptInstructions, promptToolHint } = req.body as {
        cartItemId?: string;
        unlockedPrompt?: string;
        promptInstructions?: string;
        promptToolHint?: string;
      };

      if (!cartItemId || !unlockedPrompt || !unlockedPrompt.trim()) {
        res.status(400).json({ error: 'Item ID and prompt text are required.' });
        return;
      }

      const now = new Date().toISOString();
      let found = false;
      const updatedItems = order.items.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        found = true;
        return {
          ...item,
          unlockedPrompt: unlockedPrompt.trim().slice(0, 8000),
          promptInstructions:
            typeof promptInstructions === 'string'
              ? promptInstructions.trim().slice(0, 2000)
              : item.promptInstructions,
          promptToolHint:
            typeof promptToolHint === 'string'
              ? promptToolHint.trim().slice(0, 300)
              : item.promptToolHint,
          promptUpdatedAt: now,
        };
      });

      if (!found) {
        res.status(404).json({ error: 'Order item not found.' });
        return;
      }

      const updatedOrder: Order = {
        ...order,
        items: updatedItems,
        fulfillmentStatus: 'completed',
        updatedAt: now,
        fulfillmentHistory: [
          ...order.fulfillmentHistory,
          {
            status: 'completed',
            note: 'Custom design prompt delivered/updated by studio admin.',
            updatedBy: req.user!.email || req.user!.uid,
            timestamp: now,
          },
        ],
      };

      await saveOrder(updatedOrder);
      res.json({ order: updatedOrder });
    }
  );

  app.patch('/api/admin/quotes/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const existing = await getQuoteById(String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: 'Quote request not found.' });
      return;
    }
    const { status, quotedPricePaise, adminResponse } = req.body as Partial<QuoteRequest>;
    const updated: QuoteRequest = {
      ...existing,
      status: status || existing.status,
      quotedPricePaise:
        typeof quotedPricePaise === 'number' ? Math.round(quotedPricePaise) : existing.quotedPricePaise,
      adminResponse: typeof adminResponse === 'string' ? adminResponse.slice(0, 1500) : existing.adminResponse,
      updatedAt: new Date().toISOString(),
    };
    await saveQuote(updated);
    res.json({ quote: updated });
  });

  app.post('/api/admin/products', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body as Product;
    if (!body.title || !body.categoryId) {
      res.status(400).json({ error: 'Title and category are required.' });
      return;
    }
    const id = body.id?.trim() || `prod_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const product: Product = {
      ...body,
      id,
      slug:
        body.slug ||
        body.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      basePricePaise: Math.max(100, Math.round(Number(body.basePricePaise || 0))),
      updatedAt: new Date().toISOString(),
    };
    await saveProduct(product);
    res.status(201).json({ product });
  });

  app.put('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body as Product;
    const product: Product = {
      ...body,
      id: String(req.params.id),
      basePricePaise: Math.max(100, Math.round(Number(body.basePricePaise || 0))),
      updatedAt: new Date().toISOString(),
    };
    await saveProduct(product);
    res.json({ product });
  });

  app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    await deleteProduct(String(req.params.id));
    res.json({ deleted: true });
  });

  app.post('/api/admin/categories', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body as Category;
    if (!body.name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const id = body.id?.trim() || `cat_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
    const category: Category = {
      ...body,
      id,
      slug:
        body.slug ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      sortOrder: Number(body.sortOrder || 99),
      active: body.active !== false,
    };
    await saveCategory(category);
    res.status(201).json({ category });
  });

  app.put('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body as Category;
    const category: Category = {
      ...body,
      id: String(req.params.id),
    };
    await saveCategory(category);
    res.json({ category });
  });

  app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    await deleteCategory(String(req.params.id));
    res.json({ deleted: true });
  });

  app.put('/api/admin/settings', requireAuth, requireAdmin, async (req: AuthedRequest, res: Response) => {
    const body = req.body as StoreSettings;
    const updated: StoreSettings = {
      ...body,
      id: 'storefront',
      updatedAt: new Date().toISOString(),
    };
    await saveStoreSettings(updated);
    res.json({ settings: updated });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();
  const port = resolveServerPort();

  // 9. Vite Middleware (Dev) or Static Dist Serving (Prod)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    // Vite is loaded lazily and only for local development. A static import
    // here would make the Vercel server function load Vite (and its rolldown
    // native binding) at startup and crash with 500 FUNCTION_INVOCATION_FAILED.
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Sri Parameshmari Printers server running on http://0.0.0.0:${port}`);
  });
}

const entryBase = process.argv[1]
  ? path.basename(process.argv[1]).replace(/\.(ts|js|mjs|cjs)$/, '')
  : '';
if (entryBase === 'server') {
  void startServer();
}
