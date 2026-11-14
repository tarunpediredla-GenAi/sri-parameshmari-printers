import fs from 'node:fs';
import path from 'node:path';
import { getStorage } from 'firebase-admin/storage';
import {
  DEFAULT_STORE_SETTINGS,
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
} from '../src/lib/catalogDefaults';
import type {
  Category,
  Order,
  Product,
  QuoteRequest,
  StoreSettings,
  UserProfile,
} from '../src/types/print';
import { initFirebaseAdmin } from './firebaseAdmin';

export interface ArtworkRecord {
  id: string;
  userId: string;
  fileName: string;
  contentType: 'application/pdf' | 'image/png' | 'image/jpeg';
  sizeBytes: number;
  storagePath: string;
  status: 'uploaded' | 'approved' | 'revision_requested';
  reviewNote?: string;
  createdAt: string;
}

export interface PaymentEventRecord {
  id: string;
  eventType: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  processedAt: string;
}

interface LocalRuntimeState {
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
  orders: Order[];
  quotes: QuoteRequest[];
  artworks: ArtworkRecord[];
  profiles: Record<string, UserProfile>;
  paymentEvents: PaymentEventRecord[];
  admins: string[];
}

const onVercel = process.env.VERCEL === '1';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'runtime-store.json');
export const PRIVATE_ARTWORK_DIR = path.resolve(process.cwd(), 'uploads', 'private-artwork');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRIVATE_ARTWORK_DIR)) {
    fs.mkdirSync(PRIVATE_ARTWORK_DIR, { recursive: true });
  }
}

function defaultState(): LocalRuntimeState {
  return {
    categories: SAMPLE_CATEGORIES,
    products: SAMPLE_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    orders: [],
    quotes: [],
    artworks: [],
    profiles: {},
    paymentEvents: [],
    admins: [],
  };
}

function readLocalState(): LocalRuntimeState {
  if (onVercel) return defaultState();
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = defaultState();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as Partial<LocalRuntimeState>;
    return {
      ...defaultState(),
      ...parsed,
    };
  } catch {
    return defaultState();
  }
}

function writeLocalState(state: LocalRuntimeState) {
  if (onVercel) throw new Error('Persistent storage is unavailable.');
  ensureDirs();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export function getFirestoreIfReady() {
  const { db, hasServiceAccount } = initFirebaseAdmin();
  return hasServiceAccount && db ? db : null;
}

export async function getCatalogData(): Promise<{
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
}> {
  const db = getFirestoreIfReady();
  if (db) {
    try {
      const [catSnap, prodSnap, settingsSnap] = await Promise.all([
        db.collection('categories').orderBy('sortOrder', 'asc').get(),
        db.collection('products').get(),
        db.collection('settings').doc('storefront').get(),
      ]);

      const categories = catSnap.empty
        ? SAMPLE_CATEGORIES
        : (catSnap.docs.map((d) => d.data()) as Category[]);
      const products = prodSnap.empty
        ? SAMPLE_PRODUCTS
        : (prodSnap.docs.map((d) => d.data()) as Product[]);
      const settings = settingsSnap.exists
        ? ({ ...(settingsSnap.data() as StoreSettings), gstPercentage: 0 } as StoreSettings)
        : DEFAULT_STORE_SETTINGS;

      return { categories, products, settings };
    } catch (err) {
      if (onVercel) throw err;
      console.warn('Firestore catalog fallback:', err instanceof Error ? err.message : err);
    }
  }

  const state = readLocalState();
  return {
    categories: state.categories,
    products: state.products,
    settings: { ...state.settings, gstPercentage: 0 },
  };
}

export async function saveProduct(product: Product): Promise<Product> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('products').doc(product.id).set(product);
    if (onVercel) return product;
  }
  const state = readLocalState();
  const idx = state.products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    state.products[idx] = product;
  } else {
    state.products.push(product);
  }
  writeLocalState(state);
  return product;
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('products').doc(productId).delete();
    if (onVercel) return;
  }
  const state = readLocalState();
  state.products = state.products.filter((p) => p.id !== productId);
  writeLocalState(state);
}

export async function saveCategory(category: Category): Promise<Category> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('categories').doc(category.id).set(category);
    if (onVercel) return category;
  }
  const state = readLocalState();
  const idx = state.categories.findIndex((c) => c.id === category.id);
  if (idx >= 0) {
    state.categories[idx] = category;
  } else {
    state.categories.push(category);
  }
  state.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  writeLocalState(state);
  return category;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('categories').doc(categoryId).delete();
    if (onVercel) return;
  }
  const state = readLocalState();
  state.categories = state.categories.filter((c) => c.id !== categoryId);
  writeLocalState(state);
}

export async function saveStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('settings').doc('storefront').set(settings);
    if (onVercel) return settings;
  }
  const state = readLocalState();
  state.settings = settings;
  writeLocalState(state);
  return settings;
}

export async function saveArtworkRecord(
  record: ArtworkRecord,
  buffer: Buffer
): Promise<ArtworkRecord> {
  ensureDirs();
  const userDir = path.join(PRIVATE_ARTWORK_DIR, record.userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  const safeName = record.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localPath = path.join(userDir, `${record.id}_${safeName}`);
  fs.writeFileSync(localPath, buffer);

  const db = getFirestoreIfReady();
  if (db) {
    try {
      const { app, config } = initFirebaseAdmin();
      if (app && config.storageBucket) {
        const bucket = getStorage(app).bucket(config.storageBucket);
        const file = bucket.file(record.storagePath);
        await file.save(buffer, { contentType: record.contentType, resumable: false });
      }
      await db.collection('artwork_uploads').doc(record.id).set(record);
    } catch (err) {
      console.warn('Firebase Storage/Firestore artwork notice:', err instanceof Error ? err.message : err);
    }
  }

  const state = readLocalState();
  state.artworks.push(record);
  writeLocalState(state);
  return record;
}

export async function getArtworkRecord(artworkId: string): Promise<ArtworkRecord | null> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection('artwork_uploads').doc(artworkId).get();
    if (snap.exists) {
      return snap.data() as ArtworkRecord;
    }
  }
  const state = readLocalState();
  return state.artworks.find((a) => a.id === artworkId) || null;
}

export async function updateArtworkStatus(
  artworkId: string,
  status: 'uploaded' | 'approved' | 'revision_requested',
  reviewNote?: string
): Promise<ArtworkRecord | null> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('artwork_uploads').doc(artworkId).update({ status, reviewNote: reviewNote || '' });
  }
  const state = readLocalState();
  const item = state.artworks.find((a) => a.id === artworkId);
  if (item) {
    item.status = status;
    item.reviewNote = reviewNote;
    writeLocalState(state);
    return item;
  }
  return null;
}

export async function readArtworkBuffer(record: ArtworkRecord): Promise<Buffer | null> {
  const userDir = path.join(PRIVATE_ARTWORK_DIR, record.userId);
  const safeName = record.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localPath = path.join(userDir, `${record.id}_${safeName}`);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  const db = getFirestoreIfReady();
  if (db) {
    try {
      const { app, config } = initFirebaseAdmin();
      if (app && config.storageBucket) {
        const [buf] = await getStorage(app).bucket(config.storageBucket).file(record.storagePath).download();
        return buf;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveOrder(order: Order): Promise<Order> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('orders').doc(order.id).set(order);
    if (onVercel) return order;
  }
  const state = readLocalState();
  const idx = state.orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    state.orders[idx] = order;
  } else {
    state.orders.unshift(order);
  }
  writeLocalState(state);
  return order;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection('orders').doc(orderId).get();
    if (snap.exists) {
      return snap.data() as Order;
    }
  }
  const state = readLocalState();
  return state.orders.find((o) => o.id === orderId) || null;
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db
      .collection('orders')
      .where('razorpayOrderId', '==', razorpayOrderId)
      .limit(1)
      .get();
    if (!snap.empty) {
      return snap.docs[0].data() as Order;
    }
  }
  const state = readLocalState();
  return state.orders.find((o) => o.razorpayOrderId === razorpayOrderId) || null;
}

export async function listOrdersForUser(userId: string): Promise<Order[]> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db
      .collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()) as Order[];
  }
  const state = readLocalState();
  return state.orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllOrders(): Promise<Order[]> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()) as Order[];
  }
  const state = readLocalState();
  return [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function recordPaymentEventIfNew(event: PaymentEventRecord): Promise<boolean> {
  const db = getFirestoreIfReady();
  if (db) {
    const ref = db.collection('payment_events').doc(event.id);
    return await db.runTransaction(async (tx) => {
      const docSnap = await tx.get(ref);
      if (docSnap.exists) {
        return false;
      }
      tx.set(ref, event);
      return true;
    });
  }
  const state = readLocalState();
  if (state.paymentEvents.some((e) => e.id === event.id)) {
    return false;
  }
  state.paymentEvents.push(event);
  writeLocalState(state);
  return true;
}

export async function saveQuote(quote: QuoteRequest): Promise<QuoteRequest> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('quotes').doc(quote.id).set(quote);
    if (onVercel) return quote;
  }
  const state = readLocalState();
  const idx = state.quotes.findIndex((q) => q.id === quote.id);
  if (idx >= 0) {
    state.quotes[idx] = quote;
  } else {
    state.quotes.unshift(quote);
  }
  writeLocalState(state);
  return quote;
}

export async function getQuoteById(quoteId: string): Promise<QuoteRequest | null> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection('quotes').doc(quoteId).get();
    if (snap.exists) {
      return snap.data() as QuoteRequest;
    }
  }
  const state = readLocalState();
  return state.quotes.find((q) => q.id === quoteId) || null;
}

export async function listQuotesForUser(userId: string): Promise<QuoteRequest[]> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db
      .collection('quotes')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()) as QuoteRequest[];
  }
  const state = readLocalState();
  return state.quotes
    .filter((q) => q.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllQuotes(): Promise<QuoteRequest[]> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection('quotes').orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()) as QuoteRequest[];
  }
  const state = readLocalState();
  return [...state.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUserProfile(uid: string, email: string): Promise<UserProfile> {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
      return snap.data() as UserProfile;
    }
  }
  const state = readLocalState();
  if (state.profiles[uid]) {
    return state.profiles[uid];
  }
  const now = new Date().toISOString();
  const created: UserProfile = {
    uid,
    email,
    addresses: [],
    wishlistProductIds: [],
    createdAt: now,
    updatedAt: now,
  };
  if (onVercel && db) {
    const ref = db.collection('users').doc(uid);
    return db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return existing.data() as UserProfile;
      transaction.set(ref, created);
      return created;
    });
  }
  if (!onVercel) {
    state.profiles[uid] = created;
    writeLocalState(state);
  }
  return created;
}

export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection('users').doc(profile.uid).set(profile, { merge: true });
    if (onVercel) return profile;
  }
  const state = readLocalState();
  state.profiles[profile.uid] = profile;
  writeLocalState(state);
  return profile;
}
