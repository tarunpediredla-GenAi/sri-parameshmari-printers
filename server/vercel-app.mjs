// server.ts
import "dotenv/config";
import crypto2 from "node:crypto";
import fs3 from "node:fs";
import path3 from "node:path";
import express from "express";
import multer from "multer";
import Razorpay from "razorpay";

// src/lib/pricing.ts
function calculateItemPricing(product, selectedOptions, quantity) {
  let optionsDeltaPaise = 0;
  let extraDays = 0;
  const selectedOptionLabels = {};
  for (const group of product.optionGroups) {
    const chosenId = selectedOptions[group.id];
    const choice = chosenId ? group.choices.find((c) => c.id === chosenId) : group.required ? void 0 : group.choices[0];
    if (!choice) {
      throw new Error(`Invalid or missing option for "${group.name}"`);
    }
    optionsDeltaPaise += Math.round(choice.priceDeltaPaise);
    extraDays += choice.turnaroundDaysDelta ?? 0;
    selectedOptionLabels[group.id] = choice.label;
  }
  const tier = product.quantityTiers.find((t) => t.quantity === quantity);
  if (!tier) {
    throw new Error(`Unsupported tier (${quantity}) for "${product.title}"`);
  }
  const singlePackWithOptions = Math.max(0, Math.round(product.basePricePaise + optionsDeltaPaise));
  const unitPackPricePaise = Math.max(100, Math.round(singlePackWithOptions * tier.multiplier));
  const turnaroundDays = extraDays > 0 ? `${product.turnaroundDays} (+${extraDays}d custom)` : product.turnaroundDays;
  return {
    unitPackPricePaise,
    selectedOptionLabels,
    turnaroundDays
  };
}
function calculateOrderTotals(items, deliveryMethod, settings) {
  if (deliveryMethod === "pickup" && !settings.pickupEnabled) {
    throw new Error("Store pickup is currently disabled.");
  }
  if (deliveryMethod === "shipping" && !settings.shippingEnabled) {
    throw new Error("Courier shipping is currently disabled.");
  }
  const subtotalPaise = items.reduce(
    (sum, item) => sum + Math.max(0, Math.round(item.unitPackPricePaise)),
    0
  );
  let shippingPaise = 0;
  if (deliveryMethod === "shipping" && subtotalPaise > 0) {
    shippingPaise = subtotalPaise >= settings.freeShippingThresholdPaise ? 0 : Math.max(0, Math.round(settings.shippingFeePaise));
  }
  const taxPaise = 0;
  const totalPaise = subtotalPaise + shippingPaise;
  return {
    subtotalPaise,
    shippingPaise,
    taxPaise,
    totalPaise
  };
}
var ALLOWED_ARTWORK_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg"
];
function validateArtworkFile(fileName, contentType, sizeBytes, maxSizeMb) {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: "File name is missing." };
  }
  if (!ALLOWED_ARTWORK_MIME_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload PDF, PNG, or JPEG reference files only."
    };
  }
  const maxBytes = Math.max(1, maxSizeMb) * 1024 * 1024;
  if (sizeBytes <= 0) {
    return { valid: false, error: "File is empty." };
  }
  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      error: `File exceeds the ${maxSizeMb} MB limit. Please compress your file and retry.`
    };
  }
  return { valid: true };
}
var FULFILLMENT_LABELS = {
  awaiting_payment: "Awaiting Payment",
  artwork_review: "Brief Review",
  printing: "Prompt Customization",
  ready_for_pickup: "Ready to Copy",
  shipped: "Dispatched",
  completed: "Prompt Unlocked"
};
function canTransitionFulfillment(current, next, paymentStatus, deliveryMethod) {
  if (paymentStatus !== "paid") {
    return {
      allowed: false,
      reason: "Orders cannot unlock design prompts or advance until payment is verified."
    };
  }
  if (current === next) {
    return { allowed: true };
  }
  if (next === "awaiting_payment") {
    return { allowed: false, reason: "Cannot revert a paid order to awaiting payment." };
  }
  if (next === "ready_for_pickup" && deliveryMethod !== "pickup") {
    return { allowed: false, reason: "Ready for Pickup applies only to pickup orders." };
  }
  if (next === "shipped" && deliveryMethod !== "shipping") {
    return { allowed: false, reason: "Shipped applies only to shipping orders." };
  }
  const allowedTransitions = {
    awaiting_payment: ["artwork_review", "completed"],
    artwork_review: deliveryMethod === "digital" ? ["printing", "completed"] : ["printing"],
    printing: deliveryMethod === "digital" ? ["completed"] : [deliveryMethod === "pickup" ? "ready_for_pickup" : "shipped"],
    ready_for_pickup: ["completed"],
    shipped: ["completed"],
    completed: []
  };
  if (!allowedTransitions[current]?.includes(next)) {
    return {
      allowed: false,
      reason: `Invalid delivery stage transition from "${FULFILLMENT_LABELS[current]}" to "${FULFILLMENT_LABELS[next]}".`
    };
  }
  return { allowed: true };
}
function buildTailoredOrderPrompt(masterPrompt, selectedOptionLabels, brandBrief) {
  const specsLine = Object.entries(selectedOptionLabels).map(([k, v]) => `${k}: ${v}`).join(" | ");
  const parts = [masterPrompt.trim()];
  if (specsLine) {
    parts.push(`
Selected Configuration:
- ${specsLine}`);
  }
  if (brandBrief && brandBrief.trim()) {
    parts.push(`
Customer Brand Brief / Text To Include:
${brandBrief.trim()}`);
  }
  return parts.join("\n");
}

// server/firebaseAdmin.ts
import fs from "node:fs";
import path from "node:path";
import {
  applicationDefault,
  cert,
  getApp,
  initializeApp
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
var configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
var appletConfig = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : { projectId: process.env.FIREBASE_PROJECT_ID || "famous-campaign-mcbh2" };
var adminApp = null;
var adminFirestore = null;
var hasServiceAccount = false;
var dataProjectId = null;
function getNamedApp(name) {
  try {
    return getApp(name);
  } catch {
    return null;
  }
}
function initFirebaseAdmin() {
  if (adminApp) {
    return {
      app: adminApp,
      db: adminFirestore,
      hasServiceAccount,
      config: appletConfig,
      dataProjectId
    };
  }
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  try {
    adminApp = getNamedApp("auth") ?? initializeApp(
      {
        projectId: appletConfig.projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket
      },
      "auth"
    );
    const dataApp = getNamedApp("data");
    if (dataApp) {
      adminFirestore = getFirestore(dataApp);
      adminFirestore.settings({ ignoreUndefinedProperties: true });
      hasServiceAccount = true;
      dataProjectId = dataApp.options.projectId ?? null;
    } else if (rawJson) {
      const parsed = JSON.parse(rawJson);
      dataProjectId = parsed.project_id || process.env.FIREBASE_DATA_PROJECT_ID || "sri-parameshmari-printers";
      const app2 = initializeApp(
        { credential: cert(parsed), projectId: dataProjectId },
        "data"
      );
      adminFirestore = getFirestore(app2);
      adminFirestore.settings({ ignoreUndefinedProperties: true });
      hasServiceAccount = true;
    } else if (credFile && fs.existsSync(credFile)) {
      const app2 = initializeApp({ credential: applicationDefault() }, "data");
      adminFirestore = getFirestore(app2);
      adminFirestore.settings({ ignoreUndefinedProperties: true });
      hasServiceAccount = true;
      dataProjectId = app2.options.projectId ?? null;
    }
  } catch (err) {
    console.warn("Firebase Admin initialization notice:", err instanceof Error ? err.message : err);
  }
  return {
    app: adminApp,
    db: adminFirestore,
    hasServiceAccount,
    config: appletConfig,
    dataProjectId
  };
}
async function verifyBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    return null;
  }
  const { app: app2, db, hasServiceAccount: adminReady } = initFirebaseAdmin();
  if (!app2) {
    return null;
  }
  const decoded = await getAuth(app2).verifyIdToken(idToken);
  const bootstrapAdminEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || "tarunpediredla9966@gmail.com").toLowerCase();
  let isAdmin = decoded.admin === true;
  if (!isAdmin && decoded.email && decoded.email_verified && decoded.email.toLowerCase() === bootstrapAdminEmail) {
    isAdmin = true;
  }
  if (!isAdmin && adminReady && db) {
    try {
      const adminDoc = await db.collection("admins").doc(decoded.uid).get();
      if (adminDoc.exists) {
        isAdmin = true;
      }
    } catch {
    }
  }
  return {
    uid: decoded.uid,
    email: decoded.email || "",
    emailVerified: Boolean(decoded.email_verified),
    isAdmin
  };
}

// server/razorpayUtils.ts
import crypto from "node:crypto";
function verifyRazorpayCheckoutSignature(razorpayOrderId, razorpayPaymentId, signature, secret) {
  if (!razorpayOrderId || !razorpayPaymentId || !signature || !secret) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
function verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret) {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
function applyVerifiedPaymentTransition(existingOrder, payment) {
  if (existingOrder.razorpayOrderId !== payment.razorpayOrderId) {
    throw new Error("Razorpay order ID mismatch.");
  }
  if (payment.currency !== "INR" || existingOrder.currency !== "INR") {
    throw new Error(`Invalid currency: expected INR, received ${payment.currency}.`);
  }
  if (payment.amountPaise !== existingOrder.totalPaise) {
    throw new Error(
      `Amount mismatch: expected ${existingOrder.totalPaise} paise, received ${payment.amountPaise} paise.`
    );
  }
  if (existingOrder.paymentStatus === "paid") {
    return {
      order: existingOrder,
      alreadyPaid: true,
      transitionedToPaid: false
    };
  }
  if (payment.status === "captured") {
    const nextFulfillment = existingOrder.fulfillmentStatus === "awaiting_payment" ? existingOrder.deliveryMethod === "digital" ? "completed" : "artwork_review" : existingOrder.fulfillmentStatus;
    const historyNote = existingOrder.deliveryMethod === "digital" ? `Payment verified (${payment.razorpayPaymentId}) via ${payment.actor}. Design prompt(s) unlocked for customer.` : `Payment verified (${payment.razorpayPaymentId}) via ${payment.actor}. Order moved into queue.`;
    const updatedOrder = {
      ...existingOrder,
      paymentStatus: "paid",
      fulfillmentStatus: nextFulfillment,
      razorpayPaymentId: payment.razorpayPaymentId,
      paymentFailureReason: void 0,
      updatedAt: payment.nowIso,
      fulfillmentHistory: [
        ...existingOrder.fulfillmentHistory,
        {
          status: nextFulfillment,
          note: historyNote,
          updatedBy: payment.actor,
          timestamp: payment.nowIso
        }
      ]
    };
    return {
      order: updatedOrder,
      alreadyPaid: false,
      transitionedToPaid: true
    };
  }
  if (payment.status === "failed") {
    const updatedOrder = {
      ...existingOrder,
      paymentStatus: "failed",
      razorpayPaymentId: payment.razorpayPaymentId,
      paymentFailureReason: `Payment failed (${payment.razorpayPaymentId}). You can retry payment anytime.`,
      updatedAt: payment.nowIso
    };
    return {
      order: updatedOrder,
      alreadyPaid: false,
      transitionedToPaid: false
    };
  }
  return {
    order: {
      ...existingOrder,
      razorpayPaymentId: payment.razorpayPaymentId,
      updatedAt: payment.nowIso
    },
    alreadyPaid: false,
    transitionedToPaid: false
  };
}

// server/store.ts
import fs2 from "node:fs";
import path2 from "node:path";
import { getStorage } from "firebase-admin/storage";

// src/lib/catalogDefaults.ts
var DEFAULT_STORE_SETTINGS = {
  id: "storefront",
  businessName: "Sri Parameshmari Printers",
  tagline: "Digital Design & Prompt Studio \xB7 Websites, Branding & Event Designs",
  proprietorOrEntity: "[Configure Proprietor / Registered Studio Entity in Admin]",
  address: "[Configure Studio Address, City, State & PIN Code in Admin]",
  email: "[Configure Support Email in Admin]",
  phone: "[Configure Studio Helpline Number in Admin]",
  businessHours: "Monday \u2013 Saturday, 9:30 AM \u2013 7:30 PM IST (24/7 Instant Prompt Unlock)",
  gstPercentage: 0,
  shippingFeePaise: 0,
  freeShippingThresholdPaise: 0,
  pickupEnabled: false,
  shippingEnabled: false,
  maxArtworkSizeMb: 25,
  policies: {
    about: "Sri Parameshmari Printers is a digital design & prompt studio specializing in Websites, Business Cards, Flyers & Brochures, Banners & Signage, Stickers & Labels, and Invitations & Cards. Every purchase unlocks a production-tested design prompt you can immediately copy to generate or build your finished design.",
    privacy: "Customer contact details, brand briefs, and uploaded reference logos are stored securely in private authenticated storage and used strictly for order fulfillment and custom prompt tailoring.",
    terms: "All digital design prompt packages unlock immediately upon verified Razorpay payment. Commercial and agency license tiers permit client and commercial project usage according to the selected pack.",
    refund: "Because digital design prompts are unlocked immediately upon verified payment, orders are non-refundable once the prompt has been revealed. If you need assistance customizing a prompt for your brand, contact our desk with your Order ID.",
    shipping: "Designs-only storefront: all products are delivered digitally inside your Order Confirmation page and Account Dashboard immediately after payment verification at \u20B90 shipping cost."
  }
};
var SAMPLE_CATEGORIES = [
  {
    id: "cat-website-designs",
    name: "Website Designs",
    slug: "website-designs",
    description: "Complete storefront, business, portfolio & landing page UI design prompts.",
    imageUrl: "/images/website-designs.jpg",
    sortOrder: 1,
    active: true
  },
  {
    id: "cat-business-cards",
    name: "Business Card Designs",
    slug: "business-card-designs",
    description: "Luxury minimalist, gold-foil style & corporate visiting card design prompts.",
    imageUrl: "/images/business-cards.jpg",
    sortOrder: 2,
    active: true
  },
  {
    id: "cat-flyers-brochures",
    name: "Flyer & Brochure Designs",
    slug: "flyer-brochure-designs",
    description: "High-converting bi-fold, tri-fold brochures and event flyer layout prompts.",
    imageUrl: "/images/flyers-brochures.jpg",
    sortOrder: 3,
    active: true
  },
  {
    id: "cat-banners-signage",
    name: "Banner & Signage Designs",
    slug: "banner-signage-designs",
    description: "Roll-up standees, storefront hoardings, flex & exhibition backdrop prompts.",
    imageUrl: "/images/banners-signage.jpg",
    sortOrder: 4,
    active: true
  },
  {
    id: "cat-stickers-labels",
    name: "Sticker & Label Designs",
    slug: "sticker-label-designs",
    description: "Die-cut vinyl stickers, bottle packaging labels & metallic seal prompts.",
    imageUrl: "/images/stickers-labels.jpg",
    sortOrder: 5,
    active: true
  },
  {
    id: "cat-invitations",
    name: "Invitation & Card Designs",
    slug: "invitation-card-designs",
    description: "Royal wedding suites, festive greetings, RSVP & ceremony card design prompts.",
    imageUrl: "/images/invitations-cards.jpg",
    sortOrder: 6,
    active: true
  }
];
var SAMPLE_PRODUCTS = [
  {
    id: "prod-ecommerce-website-design",
    title: "Modern Business & E-Commerce Website Design Prompt",
    slug: "modern-business-ecommerce-website-design",
    categoryId: "cat-website-designs",
    categoryName: "Website Designs",
    shortDescription: "Sample Design \xB7 Full responsive storefront layout, color tokens, typography & component prompt.",
    description: "Sample digital design package. Purchasing unlocks a detailed, production-ready website UI/UX prompt covering responsive navigation, two-column hero with featured spotlight, product grid, checkout architecture, and color tokens so you can generate the exact website design in seconds.",
    imageUrl: "/images/website-designs.jpg",
    basePricePaise: 49900,
    compareAtPricePaise: 99900,
    turnaroundDays: "Instant Prompt Unlock",
    artworkRequired: false,
    featured: true,
    published: true,
    isSampleData: true,
    promptToolHint: "Works with AI App Builders, ChatGPT, Claude, Gemini, and Figma AI",
    promptInstructions: "1. Copy the unlocked prompt below.\n2. Replace [BRAND_NAME], [PRIMARY_OFFERING], and [CONTACT_EMAIL] with your brand details.\n3. Paste into your preferred AI website builder or UI design tool to generate the complete responsive website design.",
    designPrompt: "Design and build a responsive editorial e-commerce website for [BRAND_NAME] specializing in [PRIMARY_OFFERING]. Use a grounded Sage Green (#F2F5F1 canvas, #3D5A4C accents), deep Walnut Brown (#231710 / #3A261B headers & anchors), and warm Amber Glow (#F59E0B primary CTAs) palette. Structure: 1) Sticky top navbar with brand mark, primary links, live search bar, and cart count badge. 2) Two-column hero on deep walnut-to-sage gradient featuring bold display typography, two CTA buttons, quick category chips, and an interactive Featured Spotlight card on the right. 3) Category showcase grid, filterable Shop grid with 4:3 cards, Product Configurator view, Cart & Checkout flow, and FAQ accordion + structured 4-column footer.",
    optionGroups: [
      {
        id: "scope",
        name: "Website Type",
        type: "size",
        required: true,
        choices: [
          { id: "landing", label: "Single Landing Page Prompt", priceDeltaPaise: 0 },
          { id: "multi-store", label: "Multi-Page Storefront Prompt", priceDeltaPaise: 2e4 },
          { id: "full-saas", label: "Storefront + Admin Dashboard Prompt", priceDeltaPaise: 4e4 }
        ]
      },
      {
        id: "style",
        name: "Visual Aesthetic",
        type: "finish",
        required: true,
        choices: [
          { id: "sage-walnut", label: "Sage Green, Walnut & Amber Glow", priceDeltaPaise: 0 },
          { id: "minimal-editorial", label: "Minimalist Luxury Editorial", priceDeltaPaise: 1e4 }
        ]
      },
      {
        id: "delivery",
        name: "Prompt Delivery Mode",
        type: "custom",
        required: true,
        choices: [
          { id: "instant", label: "Instant Master Prompt Unlock", priceDeltaPaise: 0 },
          {
            id: "tailored",
            label: "Instant + Studio-Tailored Prompt",
            priceDeltaPaise: 2e4,
            turnaroundDaysDelta: 1
          }
        ]
      }
    ],
    quantityTiers: [
      { quantity: 1, label: "Personal License", multiplier: 1 },
      { quantity: 3, label: "3 Prompt Variations", multiplier: 1.4, discountLabel: "Save 53%" },
      { quantity: 5, label: "Agency Commercial Pack", multiplier: 1.7, discountLabel: "Save 66%" }
    ]
  }
];

// server/store.ts
var isVercelRuntime = process.env.VERCEL === "1";
var DATA_DIR = path2.resolve(process.cwd(), "data");
var DATA_FILE = path2.join(DATA_DIR, "runtime-store.json");
var PRIVATE_ARTWORK_DIR = path2.resolve(process.cwd(), "uploads", "private-artwork");
function ensureDirs() {
  if (!fs2.existsSync(DATA_DIR)) {
    fs2.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs2.existsSync(PRIVATE_ARTWORK_DIR)) {
    fs2.mkdirSync(PRIVATE_ARTWORK_DIR, { recursive: true });
  }
}
function defaultState() {
  return {
    categories: SAMPLE_CATEGORIES,
    products: SAMPLE_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    orders: [],
    quotes: [],
    artworks: [],
    profiles: {},
    paymentEvents: [],
    admins: []
  };
}
function readLocalState() {
  if (isVercelRuntime) return defaultState();
  ensureDirs();
  if (!fs2.existsSync(DATA_FILE)) {
    const initial = defaultState();
    fs2.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs2.readFileSync(DATA_FILE, "utf8"));
    return {
      ...defaultState(),
      ...parsed
    };
  } catch {
    return defaultState();
  }
}
function writeLocalState(state) {
  if (isVercelRuntime) throw new Error("Persistent storage is unavailable.");
  ensureDirs();
  fs2.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}
function getFirestoreIfReady() {
  const { db, hasServiceAccount: hasServiceAccount2 } = initFirebaseAdmin();
  return hasServiceAccount2 && db ? db : null;
}
function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== void 0) {
        out[k] = stripUndefined(v);
      }
    }
    return out;
  }
  return value;
}
async function getCatalogData() {
  const db = getFirestoreIfReady();
  if (db) {
    try {
      const [catSnap, prodSnap, settingsSnap] = await Promise.all([
        db.collection("categories").orderBy("sortOrder", "asc").get(),
        db.collection("products").get(),
        db.collection("settings").doc("storefront").get()
      ]);
      const categories = catSnap.empty ? SAMPLE_CATEGORIES : catSnap.docs.map((d) => d.data());
      const products = prodSnap.empty ? SAMPLE_PRODUCTS : prodSnap.docs.map((d) => d.data());
      const settings = settingsSnap.exists ? settingsSnap.data() : DEFAULT_STORE_SETTINGS;
      return { categories, products, settings };
    } catch (err) {
      if (isVercelRuntime) throw err;
      console.warn("Firestore catalog fallback:", err instanceof Error ? err.message : err);
    }
  }
  const state = readLocalState();
  return {
    categories: state.categories,
    products: state.products,
    settings: state.settings
  };
}
async function saveProduct(product) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("products").doc(product.id).set(stripUndefined(product));
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
async function deleteProduct(productId) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("products").doc(productId).delete();
  }
  const state = readLocalState();
  state.products = state.products.filter((p) => p.id !== productId);
  writeLocalState(state);
}
async function saveCategory(category) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("categories").doc(category.id).set(stripUndefined(category));
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
async function deleteCategory(categoryId) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("categories").doc(categoryId).delete();
  }
  const state = readLocalState();
  state.categories = state.categories.filter((c) => c.id !== categoryId);
  writeLocalState(state);
}
async function saveStoreSettings(settings) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("settings").doc("storefront").set(stripUndefined(settings));
  }
  const state = readLocalState();
  state.settings = settings;
  writeLocalState(state);
  return settings;
}
async function saveArtworkRecord(record, buffer) {
  ensureDirs();
  const userDir = path2.join(PRIVATE_ARTWORK_DIR, record.userId);
  if (!fs2.existsSync(userDir)) {
    fs2.mkdirSync(userDir, { recursive: true });
  }
  const safeName = record.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localPath = path2.join(userDir, `${record.id}_${safeName}`);
  fs2.writeFileSync(localPath, buffer);
  const db = getFirestoreIfReady();
  if (db) {
    try {
      const { app: app2, config } = initFirebaseAdmin();
      if (app2 && config.storageBucket) {
        const bucket = getStorage(app2).bucket(config.storageBucket);
        const file = bucket.file(record.storagePath);
        await file.save(buffer, { contentType: record.contentType, resumable: false });
      }
      await db.collection("artwork_uploads").doc(record.id).set(stripUndefined(record));
    } catch (err) {
      console.warn("Firebase Storage/Firestore artwork notice:", err instanceof Error ? err.message : err);
    }
  }
  const state = readLocalState();
  state.artworks.push(record);
  writeLocalState(state);
  return record;
}
async function getArtworkRecord(artworkId) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("artwork_uploads").doc(artworkId).get();
    if (snap.exists) {
      return snap.data();
    }
  }
  const state = readLocalState();
  return state.artworks.find((a) => a.id === artworkId) || null;
}
async function updateArtworkStatus(artworkId, status, reviewNote) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("artwork_uploads").doc(artworkId).update({ status, reviewNote: reviewNote || "" });
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
async function readArtworkBuffer(record) {
  const userDir = path2.join(PRIVATE_ARTWORK_DIR, record.userId);
  const safeName = record.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const localPath = path2.join(userDir, `${record.id}_${safeName}`);
  if (fs2.existsSync(localPath)) {
    return fs2.readFileSync(localPath);
  }
  const db = getFirestoreIfReady();
  if (db) {
    try {
      const { app: app2, config } = initFirebaseAdmin();
      if (app2 && config.storageBucket) {
        const [buf] = await getStorage(app2).bucket(config.storageBucket).file(record.storagePath).download();
        return buf;
      }
    } catch {
      return null;
    }
  }
  return null;
}
async function saveOrder(order) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("orders").doc(order.id).set(stripUndefined(order));
    if (isVercelRuntime) return order;
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
async function updateOrder(orderId, update) {
  const db = getFirestoreIfReady();
  if (db) {
    const ref = db.collection("orders").doc(orderId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error("Order not found.");
      const current2 = snapshot.data();
      const result2 = update(current2);
      if (result2.order !== current2) transaction.set(ref, stripUndefined(result2.order));
      return result2;
    });
  }
  if (isVercelRuntime) throw new Error("Order storage is unavailable.");
  const state = readLocalState();
  const index = state.orders.findIndex((order) => order.id === orderId);
  if (index === -1) throw new Error("Order not found.");
  const current = state.orders[index];
  const result = update(current);
  if (result.order !== current) {
    state.orders[index] = result.order;
    writeLocalState(state);
  }
  return result;
}
async function getOrderById(orderId) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("orders").doc(orderId).get();
    if (snap.exists) {
      return snap.data();
    }
  }
  const state = readLocalState();
  return state.orders.find((o) => o.id === orderId) || null;
}
async function getOrderByRazorpayOrderId(razorpayOrderId) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("orders").where("razorpayOrderId", "==", razorpayOrderId).limit(1).get();
    if (!snap.empty) {
      return snap.docs[0].data();
    }
  }
  const state = readLocalState();
  return state.orders.find((o) => o.razorpayOrderId === razorpayOrderId) || null;
}
async function listOrdersForUser(userId) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("orders").where("userId", "==", userId).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data());
  }
  const state = readLocalState();
  return state.orders.filter((o) => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function listAllOrders() {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("orders").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data());
  }
  const state = readLocalState();
  return [...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function recordPaymentEventIfNew(event) {
  const db = getFirestoreIfReady();
  if (db) {
    const ref = db.collection("payment_events").doc(event.id);
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
async function saveQuote(quote) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("quotes").doc(quote.id).set(stripUndefined(quote));
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
async function getQuoteById(quoteId) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("quotes").doc(quoteId).get();
    if (snap.exists) {
      return snap.data();
    }
  }
  const state = readLocalState();
  return state.quotes.find((q) => q.id === quoteId) || null;
}
async function listQuotesForUser(userId) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("quotes").where("userId", "==", userId).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data());
  }
  const state = readLocalState();
  return state.quotes.filter((q) => q.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function listAllQuotes() {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("quotes").orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => d.data());
  }
  const state = readLocalState();
  return [...state.quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function getUserProfile(uid, email) {
  const db = getFirestoreIfReady();
  if (db) {
    const snap = await db.collection("users").doc(uid).get();
    if (snap.exists) {
      return snap.data();
    }
  }
  const state = readLocalState();
  if (state.profiles[uid]) {
    return state.profiles[uid];
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const created = {
    uid,
    email,
    addresses: [],
    wishlistProductIds: [],
    createdAt: now,
    updatedAt: now
  };
  if (isVercelRuntime) {
    if (!db) return created;
    const ref = db.collection("users").doc(uid);
    return db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return existing.data();
      transaction.set(ref, created);
      return created;
    });
  }
  state.profiles[uid] = created;
  writeLocalState(state);
  return created;
}
async function saveUserProfile(profile) {
  const db = getFirestoreIfReady();
  if (db) {
    await db.collection("users").doc(profile.uid).set(stripUndefined(profile), { merge: true });
    if (isVercelRuntime) return profile;
  }
  const state = readLocalState();
  state.profiles[profile.uid] = profile;
  writeLocalState(state);
  return profile;
}

// server.ts
function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return null;
  }
  return {
    keyId,
    keySecret,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret })
  };
}
async function requireAuth(req, res, next) {
  try {
    const user = await verifyBearerToken(req.headers.authorization);
    if (!user) {
      res.status(401).json({ error: "Authentication required. Please sign in." });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : "Invalid or expired authentication token."
    });
  }
}
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Admin privileges required for this action." });
    return;
  }
  next();
}
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});
function sanitizeProductForPublic(product) {
  const { designPrompt, promptInstructions, ...publicFields } = product;
  return {
    ...publicFields,
    hasPromptDeliverable: Boolean(designPrompt && designPrompt.trim().length > 0)
  };
}
function sanitizeOrderForCustomer(order) {
  if (order.paymentStatus === "paid") {
    return order;
  }
  return {
    ...order,
    items: order.items.map((item) => {
      const { unlockedPrompt: _up, promptInstructions: _pi, ...safeItem } = item;
      return safeItem;
    })
  };
}
function resolveServerPort() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--port" && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else if (args[i].startsWith("--port=")) {
      const parsed = Number(args[i].slice("--port=".length));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.NODE_ENV === "production" && process.env.PORT) {
    const parsed = Number(process.env.PORT);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 3e3;
}
function createApiApp() {
  const app2 = express();
  const port = resolveServerPort();
  initFirebaseAdmin();
  app2.post(
    "/api/webhooks/razorpay",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
      if (!webhookSecret) {
        res.status(503).json({ error: "RAZORPAY_WEBHOOK_SECRET is not configured." });
        return;
      }
      const signature = req.headers["x-razorpay-signature"];
      if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: "Missing webhook signature or raw payload." });
        return;
      }
      const valid = verifyRazorpayWebhookSignature(req.body, signature, webhookSecret);
      if (!valid) {
        res.status(400).json({ error: "Invalid Razorpay webhook signature." });
        return;
      }
      try {
        const eventPayload = JSON.parse(req.body.toString("utf8"));
        const eventName = eventPayload.event || "unknown";
        const paymentEntity = eventPayload.payload?.payment?.entity;
        if (!paymentEntity?.order_id || !paymentEntity?.id) {
          res.json({ received: true, ignored: true });
          return;
        }
        const headerEventId = req.headers["x-razorpay-event-id"];
        const eventId = typeof headerEventId === "string" && headerEventId.trim() ? headerEventId.trim() : `wh_${eventName}_${paymentEntity.id}_${paymentEntity.status}`;
        const isNew = await recordPaymentEventIfNew({
          id: eventId,
          eventType: eventName,
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          processedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (!isNew) {
          res.json({ received: true, duplicate: true });
          return;
        }
        const order = await getOrderByRazorpayOrderId(paymentEntity.order_id);
        if (!order) {
          res.status(404).json({ error: "Order not found for Razorpay order ID." });
          return;
        }
        const transition = await updateOrder(
          order.id,
          (current) => applyVerifiedPaymentTransition(current, {
            razorpayOrderId: paymentEntity.order_id,
            razorpayPaymentId: paymentEntity.id,
            amountPaise: paymentEntity.amount,
            currency: paymentEntity.currency,
            status: paymentEntity.status,
            actor: "razorpay_webhook",
            nowIso: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        res.json({
          received: true,
          orderId: transition.order.id,
          paymentStatus: transition.order.paymentStatus,
          fulfillmentStatus: transition.order.fulfillmentStatus,
          alreadyPaid: transition.alreadyPaid
        });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Failed to process Razorpay webhook."
        });
      }
    }
  );
  app2.use(express.json({ limit: "2mb" }));
  app2.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "sri-parameshmari-printers" });
  });
  app2.get("/api/config/status", async (_req, res) => {
    const rzp = getRazorpayClient();
    const { hasServiceAccount: hasServiceAccount2, dataProjectId: dataProjectId2, config } = initFirebaseAdmin();
    const appUrl = process.env.APP_URL || `http://localhost:${port}`;
    res.json({
      razorpayConfigured: Boolean(rzp) && (!isVercelRuntime || Boolean(getFirestoreIfReady())),
      razorpayKeyId: rzp?.keyId || null,
      razorpayMode: rzp?.keyId.startsWith("rzp_live_") ? "live" : "test",
      webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
      firebaseAdminConfigured: hasServiceAccount2,
      firebaseAuthProjectId: config.projectId,
      firebaseDataProjectId: dataProjectId2,
      maxArtworkSizeMb: Number(process.env.MAX_ARTWORK_SIZE_MB || 25),
      webhookUrlHint: `${appUrl.replace(/\/$/, "")}/api/webhooks/razorpay`
    });
  });
  app2.get("/api/catalog", async (_req, res) => {
    try {
      const data = await getCatalogData();
      res.json({
        categories: data.categories.filter((c) => c.active),
        products: data.products.filter((p) => p.published).map(sanitizeProductForPublic),
        settings: data.settings
      });
    } catch (error) {
      console.error("Unable to load catalog:", error);
      res.status(503).json({ error: "The storefront is temporarily unavailable." });
    }
  });
  app2.post(
    "/api/artwork/upload",
    requireAuth,
    upload.single("file"),
    async (req, res) => {
      try {
        const user = req.user;
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "No artwork file uploaded." });
          return;
        }
        const { settings } = await getCatalogData();
        const maxMb = settings.maxArtworkSizeMb || Number(process.env.MAX_ARTWORK_SIZE_MB || 25);
        const validation = validateArtworkFile(file.originalname, file.mimetype, file.size, maxMb);
        if (!validation.valid) {
          res.status(400).json({ error: validation.error });
          return;
        }
        const id = `art_${crypto2.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const record = {
          id,
          userId: user.uid,
          fileName: file.originalname,
          contentType: file.mimetype,
          sizeBytes: file.size,
          storagePath: `artwork/${user.uid}/${id}_${safeName}`,
          status: "uploaded",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await saveArtworkRecord(record, file.buffer);
        res.status(201).json({
          artworkId: record.id,
          fileName: record.fileName,
          contentType: record.contentType,
          sizeBytes: record.sizeBytes,
          status: record.status
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : "Artwork upload failed."
        });
      }
    }
  );
  app2.get("/api/artwork/:id/file", requireAuth, async (req, res) => {
    const user = req.user;
    const record = await getArtworkRecord(String(req.params.id));
    if (!record) {
      res.status(404).json({ error: "Artwork file not found." });
      return;
    }
    if (record.userId !== user.uid && !user.isAdmin) {
      res.status(403).json({ error: "Forbidden: you do not have access to this private artwork." });
      return;
    }
    const buf = await readArtworkBuffer(record);
    if (!buf) {
      res.status(404).json({ error: "Artwork file binary not found in storage." });
      return;
    }
    res.setHeader("Content-Type", record.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${record.fileName.replace(/"/g, "")}"`);
    res.send(buf);
  });
  app2.get("/api/profile", requireAuth, async (req, res) => {
    const profile = await getUserProfile(req.user.uid, req.user.email);
    res.json({ profile, isAdmin: req.user.isAdmin });
  });
  app2.put("/api/profile", requireAuth, async (req, res) => {
    const existing = await getUserProfile(req.user.uid, req.user.email);
    const body = req.body;
    const updated = await saveUserProfile({
      ...existing,
      uid: req.user.uid,
      email: req.user.email || existing.email,
      displayName: typeof body.displayName === "string" ? body.displayName.slice(0, 120) : existing.displayName,
      phone: typeof body.phone === "string" ? body.phone.slice(0, 30) : existing.phone,
      companyName: typeof body.companyName === "string" ? body.companyName.slice(0, 120) : existing.companyName,
      gstin: typeof body.gstin === "string" ? body.gstin.slice(0, 20) : existing.gstin,
      addresses: Array.isArray(body.addresses) ? body.addresses.slice(0, 10) : existing.addresses,
      wishlistProductIds: Array.isArray(body.wishlistProductIds) ? body.wishlistProductIds.slice(0, 100) : existing.wishlistProductIds,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ profile: updated });
  });
  app2.post("/api/orders/checkout", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (isVercelRuntime && !getFirestoreIfReady()) {
        res.status(503).json({ error: "Checkout is temporarily unavailable because order storage is offline." });
        return;
      }
      const rzp = getRazorpayClient();
      if (!rzp) {
        res.status(503).json({
          code: "RAZORPAY_NOT_CONFIGURED",
          error: "Razorpay Test Mode keys (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server yet."
        });
        return;
      }
      const body = req.body;
      if (!Array.isArray(body.items) || body.items.length === 0) {
        res.status(400).json({ error: "Your cart is empty." });
        return;
      }
      const { products, settings } = await getCatalogData();
      const deliveryMethod = body.deliveryMethod === "pickup" && settings.pickupEnabled ? "pickup" : body.deliveryMethod === "shipping" && settings.shippingEnabled ? "shipping" : "digital";
      const customerName = body.customerName?.trim();
      const customerPhone = body.customerPhone?.trim();
      if (!customerName || !customerPhone) {
        res.status(400).json({ error: "Customer name and phone number are required." });
        return;
      }
      if (deliveryMethod === "shipping") {
        const addr = body.shippingAddress;
        if (!addr?.line1 || !addr?.city || !addr?.state || !addr?.postalCode) {
          res.status(400).json({ error: "Complete shipping address is required for courier delivery." });
          return;
        }
      }
      const orderItems = [];
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
        let verifiedArtwork = null;
        if (clientItem.artwork?.artworkId) {
          const artRec = await getArtworkRecord(clientItem.artwork.artworkId);
          if (!artRec || artRec.userId !== user.uid) {
            res.status(403).json({
              error: `Attached reference file for "${product.title}" is missing or does not belong to your account.`
            });
            return;
          }
          verifiedArtwork = {
            artworkId: artRec.id,
            fileName: artRec.fileName,
            contentType: artRec.contentType,
            sizeBytes: artRec.sizeBytes,
            status: artRec.status,
            reviewNote: artRec.reviewNote
          };
        } else if (product.artworkRequired) {
          res.status(400).json({
            error: `Reference upload is required for "${product.title}" before checkout.`
          });
          return;
        }
        const brandBrief = typeof clientItem.brandBrief === "string" && clientItem.brandBrief.trim() ? clientItem.brandBrief.trim().slice(0, 1200) : "";
        const basePrompt = product.designPrompt || `Design prompt for ${product.title}. Contact ${settings.email} with your order number if you need a tailored prompt.`;
        orderItems.push({
          cartItemId: clientItem.cartItemId || crypto2.randomUUID(),
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
          promptToolHint: product.promptToolHint
        });
      }
      const totals = calculateOrderTotals(
        orderItems.map((i) => ({ unitPackPricePaise: i.lineTotalPaise })),
        deliveryMethod,
        settings
      );
      const orderId = `ord_${crypto2.randomUUID().replace(/-/g, "").slice(0, 14)}`;
      const orderNumber = `SPP-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e5 + Math.random() * 9e5)}`;
      const rzpOrder = await rzp.client.orders.create({
        amount: totals.totalPaise,
        currency: "INR",
        receipt: orderNumber,
        notes: {
          internalOrderId: orderId,
          userId: user.uid
        }
      });
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const newOrder = {
        id: orderId,
        orderNumber,
        userId: user.uid,
        customerEmail: user.email,
        customerName,
        customerPhone,
        deliveryMethod,
        shippingAddress: deliveryMethod === "shipping" ? body.shippingAddress || null : null,
        items: orderItems,
        subtotalPaise: totals.subtotalPaise,
        shippingPaise: totals.shippingPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        currency: "INR",
        paymentStatus: "pending",
        fulfillmentStatus: "awaiting_payment",
        razorpayOrderId: rzpOrder.id,
        fulfillmentHistory: [
          {
            status: "awaiting_payment",
            note: "Design order locked on server. Prompt unlocks immediately upon Razorpay payment verification.",
            updatedBy: user.uid,
            timestamp: now
          }
        ],
        createdAt: now,
        updatedAt: now
      };
      await saveOrder(newOrder);
      res.status(201).json({
        order: sanitizeOrderForCustomer(newOrder),
        razorpay: {
          keyId: rzp.keyId,
          orderId: rzpOrder.id,
          amountPaise: totals.totalPaise,
          currency: "INR"
        }
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Unable to initiate checkout."
      });
    }
  });
  app2.post("/api/orders/:id/verify-payment", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const rzp = getRazorpayClient();
      if (!rzp) {
        res.status(503).json({ error: "Razorpay credentials not configured." });
        return;
      }
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: "Order not found." });
        return;
      }
      if (order.userId !== user.uid && !user.isAdmin) {
        res.status(403).json({ error: "Forbidden." });
        return;
      }
      const { razorpay_payment_id, razorpay_signature } = req.body;
      if (!order.razorpayOrderId || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ error: "Missing Razorpay payment confirmation fields." });
        return;
      }
      const validSig = verifyRazorpayCheckoutSignature(
        order.razorpayOrderId,
        razorpay_payment_id,
        razorpay_signature,
        rzp.keySecret
      );
      if (!validSig) {
        res.status(400).json({ error: "Payment signature verification failed." });
        return;
      }
      const payment = await rzp.client.payments.fetch(razorpay_payment_id);
      if (payment.order_id !== order.razorpayOrderId) {
        res.status(400).json({ error: "Payment does not match the server Razorpay order ID." });
        return;
      }
      const isNew = await recordPaymentEventIfNew({
        id: `chk_${razorpay_payment_id}_${payment.status}`,
        eventType: "checkout.verify",
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: razorpay_payment_id,
        processedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const latestOrder = await getOrderById(order.id) || order;
      if (!isNew && latestOrder.paymentStatus === "paid") {
        res.json({ order: latestOrder, alreadyPaid: true });
        return;
      }
      const transition = await updateOrder(
        order.id,
        (current) => applyVerifiedPaymentTransition(current, {
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          amountPaise: Number(payment.amount),
          currency: payment.currency,
          status: payment.status,
          actor: "checkout_verify",
          nowIso: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      res.json({ order: sanitizeOrderForCustomer(transition.order), alreadyPaid: transition.alreadyPaid });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Payment verification failed."
      });
    }
  });
  app2.post("/api/orders/:id/retry-payment", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      const rzp = getRazorpayClient();
      if (!rzp) {
        res.status(503).json({
          code: "RAZORPAY_NOT_CONFIGURED",
          error: "Razorpay credentials not configured."
        });
        return;
      }
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: "Order not found." });
        return;
      }
      if (order.userId !== user.uid) {
        res.status(403).json({ error: "Forbidden." });
        return;
      }
      if (order.paymentStatus === "paid") {
        res.json({ order, razorpay: null });
        return;
      }
      if (!order.razorpayOrderId) {
        res.status(409).json({ error: "This order has no Razorpay reference. Contact support with your order number." });
        return;
      }
      const razorpayOrderId = order.razorpayOrderId;
      const payments = await rzp.client.orders.fetchPayments(razorpayOrderId);
      const captured = payments.items.find((payment) => payment.status === "captured");
      if (captured) {
        const transition = await updateOrder(
          order.id,
          (current2) => applyVerifiedPaymentTransition(current2, {
            razorpayOrderId,
            razorpayPaymentId: captured.id,
            amountPaise: Number(captured.amount),
            currency: captured.currency,
            status: captured.status,
            actor: "retry_payment",
            nowIso: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        res.json({ order: transition.order, razorpay: null });
        return;
      }
      const current = await getOrderById(order.id);
      if (!current || current.razorpayOrderId !== razorpayOrderId) {
        res.status(409).json({ error: "The order changed. Refresh it and check payment status." });
        return;
      }
      if (current.paymentStatus === "paid") {
        res.json({ order: current, razorpay: null });
        return;
      }
      if (payments.items.some((payment) => payment.status === "authorized")) {
        res.status(409).json({ error: "Razorpay is confirming your payment. Use Check Payment Status before paying again." });
        return;
      }
      res.json({
        order: sanitizeOrderForCustomer(current),
        razorpay: {
          keyId: rzp.keyId,
          orderId: razorpayOrderId,
          amountPaise: current.totalPaise,
          currency: current.currency
        }
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : "Unable to retry payment."
      });
    }
  });
  app2.post(
    "/api/orders/:id/check-payment-status",
    requireAuth,
    async (req, res) => {
      try {
        const user = req.user;
        const rzp = getRazorpayClient();
        if (!rzp) {
          res.status(503).json({ error: "Razorpay credentials not configured." });
          return;
        }
        const order = await getOrderById(String(req.params.id));
        if (!order) {
          res.status(404).json({ error: "Order not found." });
          return;
        }
        if (order.userId !== user.uid && !user.isAdmin) {
          res.status(403).json({ error: "Forbidden." });
          return;
        }
        if (order.paymentStatus === "paid" || !order.razorpayOrderId) {
          res.json({ order: sanitizeOrderForCustomer(order) });
          return;
        }
        const razorpayOrderId = order.razorpayOrderId;
        const payments = await rzp.client.orders.fetchPayments(razorpayOrderId);
        const captured = payments.items.find((payment) => payment.status === "captured");
        const authorized = payments.items.some((payment) => payment.status === "authorized");
        const failed = payments.items.find((payment) => payment.status === "failed");
        const targetPayment = captured || (authorized ? void 0 : failed);
        if (!targetPayment) {
          res.json({
            order: sanitizeOrderForCustomer(order),
            message: "Payment is still awaiting confirmation from Razorpay."
          });
          return;
        }
        const transition = await updateOrder(
          order.id,
          (current) => applyVerifiedPaymentTransition(current, {
            razorpayOrderId,
            razorpayPaymentId: targetPayment.id,
            amountPaise: Number(targetPayment.amount),
            currency: targetPayment.currency,
            status: targetPayment.status,
            actor: "status_check",
            nowIso: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        res.json({ order: sanitizeOrderForCustomer(transition.order) });
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : "Failed to check payment status."
        });
      }
    }
  );
  app2.post("/api/orders/:id/mark-failed", requireAuth, async (req, res) => {
    const user = req.user;
    const order = await getOrderById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.userId !== user.uid) {
      res.status(403).json({ error: "Forbidden." });
      return;
    }
    const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 240) : "Checkout cancelled or payment declined.";
    const { code, source, step, reason: gatewayReason, paymentId } = req.body?.failure ?? {};
    const safeField = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : void 0;
    console.info("Razorpay Checkout payment.failed", {
      orderNumber: order.orderNumber,
      razorpayOrderId: order.razorpayOrderId,
      paymentId: safeField(paymentId),
      code: safeField(code),
      source: safeField(source),
      step: safeField(step),
      reason: safeField(gatewayReason)
    });
    try {
      const result = await updateOrder(order.id, (current) => ({
        order: current.paymentStatus === "paid" || current.razorpayOrderId !== order.razorpayOrderId ? current : {
          ...current,
          paymentStatus: "failed",
          paymentFailureReason: reason,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }));
      res.json({ order: sanitizeOrderForCustomer(result.order) });
    } catch {
      res.status(500).json({ error: "Payment failure could not be saved. Use Check Payment Status." });
    }
  });
  app2.get("/api/orders/my", requireAuth, async (req, res) => {
    const orders = await listOrdersForUser(req.user.uid);
    res.json({ orders: orders.map(sanitizeOrderForCustomer) });
  });
  app2.get("/api/orders/:id", requireAuth, async (req, res) => {
    const order = await getOrderById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.userId !== req.user.uid && !req.user.isAdmin) {
      res.status(403).json({ error: "Forbidden: you can only view your own orders." });
      return;
    }
    res.json({ order: req.user.isAdmin ? order : sanitizeOrderForCustomer(order) });
  });
  app2.post("/api/quotes", requireAuth, async (req, res) => {
    const user = req.user;
    const body = req.body;
    if (!body.customerName || !body.productType || !body.quantity || Number(body.quantity) < 1) {
      res.status(400).json({ error: "Name, product type, and quantity are required." });
      return;
    }
    if (body.artworkId) {
      const art = await getArtworkRecord(body.artworkId);
      if (!art || art.userId !== user.uid) {
        res.status(403).json({ error: "Attached artwork is invalid or unauthorized." });
        return;
      }
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const quote = {
      id: `q_${crypto2.randomUUID().replace(/-/g, "").slice(0, 14)}`,
      userId: user.uid,
      customerName: body.customerName.trim().slice(0, 120),
      customerEmail: (body.customerEmail || user.email).trim().slice(0, 200),
      customerPhone: body.customerPhone?.trim().slice(0, 30),
      productType: body.productType.trim().slice(0, 120),
      quantity: Math.round(Number(body.quantity)),
      dimensions: body.dimensions?.trim().slice(0, 120),
      paperAndFinish: body.paperAndFinish?.trim().slice(0, 200),
      notes: body.notes?.trim().slice(0, 2e3),
      artworkId: body.artworkId,
      artworkFileName: body.artworkFileName,
      status: "submitted",
      createdAt: now,
      updatedAt: now
    };
    await saveQuote(quote);
    res.status(201).json({ quote });
  });
  app2.get("/api/quotes/my", requireAuth, async (req, res) => {
    const quotes = await listQuotesForUser(req.user.uid);
    res.json({ quotes });
  });
  app2.get("/api/admin/overview", requireAuth, requireAdmin, async (_req, res) => {
    const [orders, quotes, catalog] = await Promise.all([
      listAllOrders(),
      listAllQuotes(),
      getCatalogData()
    ]);
    const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
    const verifiedRevenuePaise = paidOrders.reduce((sum, o) => sum + o.totalPaise, 0);
    const openPrintJobs = paidOrders.filter((o) => o.fulfillmentStatus !== "completed").length;
    const openQuotes = quotes.filter((q) => q.status === "submitted" || q.status === "reviewing").length;
    res.json({
      stats: {
        totalOrders: orders.length,
        paidOrdersCount: paidOrders.length,
        verifiedRevenuePaise,
        openPrintJobs,
        openQuotes,
        totalProducts: catalog.products.length
      },
      orders,
      quotes,
      categories: catalog.categories,
      products: catalog.products,
      settings: catalog.settings
    });
  });
  app2.patch(
    "/api/admin/orders/:id/fulfillment",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: "Order not found." });
        return;
      }
      const nextStatus = req.body?.fulfillmentStatus;
      const note = typeof req.body?.note === "string" && req.body.note.trim() ? req.body.note.trim().slice(0, 400) : `Print status updated to ${nextStatus}.`;
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
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const updated = {
        ...order,
        fulfillmentStatus: nextStatus,
        updatedAt: now,
        fulfillmentHistory: [
          ...order.fulfillmentHistory,
          {
            status: nextStatus,
            note,
            updatedBy: req.user.email || req.user.uid,
            timestamp: now
          }
        ]
      };
      await saveOrder(updated);
      res.json({ order: updated });
    }
  );
  app2.patch(
    "/api/admin/orders/:id/artwork-review",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: "Order not found." });
        return;
      }
      const { artworkId, status, reviewNote } = req.body;
      if (!artworkId || status !== "approved" && status !== "revision_requested") {
        res.status(400).json({ error: "Invalid artwork review payload." });
        return;
      }
      await updateArtworkStatus(artworkId, status, reviewNote);
      const updatedItems = order.items.map(
        (item) => item.artwork?.artworkId === artworkId ? {
          ...item,
          artwork: {
            ...item.artwork,
            status,
            reviewNote
          }
        } : item
      );
      const updatedOrder = {
        ...order,
        items: updatedItems,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveOrder(updatedOrder);
      res.json({ order: updatedOrder });
    }
  );
  app2.patch(
    "/api/admin/orders/:id/deliver-prompt",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      const order = await getOrderById(String(req.params.id));
      if (!order) {
        res.status(404).json({ error: "Order not found." });
        return;
      }
      if (order.paymentStatus !== "paid") {
        res.status(400).json({ error: "Cannot deliver custom prompts on an unpaid order." });
        return;
      }
      const { cartItemId, unlockedPrompt, promptInstructions, promptToolHint } = req.body;
      if (!cartItemId || !unlockedPrompt || !unlockedPrompt.trim()) {
        res.status(400).json({ error: "Item ID and prompt text are required." });
        return;
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let found = false;
      const updatedItems = order.items.map((item) => {
        if (item.cartItemId !== cartItemId) return item;
        found = true;
        return {
          ...item,
          unlockedPrompt: unlockedPrompt.trim().slice(0, 8e3),
          promptInstructions: typeof promptInstructions === "string" ? promptInstructions.trim().slice(0, 2e3) : item.promptInstructions,
          promptToolHint: typeof promptToolHint === "string" ? promptToolHint.trim().slice(0, 300) : item.promptToolHint,
          promptUpdatedAt: now
        };
      });
      if (!found) {
        res.status(404).json({ error: "Order item not found." });
        return;
      }
      const updatedOrder = {
        ...order,
        items: updatedItems,
        fulfillmentStatus: "completed",
        updatedAt: now,
        fulfillmentHistory: [
          ...order.fulfillmentHistory,
          {
            status: "completed",
            note: "Custom design prompt delivered/updated by studio admin.",
            updatedBy: req.user.email || req.user.uid,
            timestamp: now
          }
        ]
      };
      await saveOrder(updatedOrder);
      res.json({ order: updatedOrder });
    }
  );
  app2.patch("/api/admin/quotes/:id", requireAuth, requireAdmin, async (req, res) => {
    const existing = await getQuoteById(String(req.params.id));
    if (!existing) {
      res.status(404).json({ error: "Quote request not found." });
      return;
    }
    const { status, quotedPricePaise, adminResponse } = req.body;
    const updated = {
      ...existing,
      status: status || existing.status,
      quotedPricePaise: typeof quotedPricePaise === "number" ? Math.round(quotedPricePaise) : existing.quotedPricePaise,
      adminResponse: typeof adminResponse === "string" ? adminResponse.slice(0, 1500) : existing.adminResponse,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveQuote(updated);
    res.json({ quote: updated });
  });
  app2.post("/api/admin/products", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body.title || !body.categoryId) {
      res.status(400).json({ error: "Title and category are required." });
      return;
    }
    const id = body.id?.trim() || `prod_${crypto2.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const product = {
      ...body,
      id,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      basePricePaise: Math.max(100, Math.round(Number(body.basePricePaise || 0))),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveProduct(product);
    res.status(201).json({ product });
  });
  app2.put("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body;
    const product = {
      ...body,
      id: String(req.params.id),
      basePricePaise: Math.max(100, Math.round(Number(body.basePricePaise || 0))),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveProduct(product);
    res.json({ product });
  });
  app2.delete("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res) => {
    await deleteProduct(String(req.params.id));
    res.json({ deleted: true });
  });
  app2.post("/api/admin/categories", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body;
    if (!body.name) {
      res.status(400).json({ error: "Category name is required." });
      return;
    }
    const id = body.id?.trim() || `cat_${crypto2.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const category = {
      ...body,
      id,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      sortOrder: Number(body.sortOrder || 99),
      active: body.active !== false
    };
    await saveCategory(category);
    res.status(201).json({ category });
  });
  app2.put("/api/admin/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body;
    const category = {
      ...body,
      id: String(req.params.id)
    };
    await saveCategory(category);
    res.json({ category });
  });
  app2.delete("/api/admin/categories/:id", requireAuth, requireAdmin, async (req, res) => {
    await deleteCategory(String(req.params.id));
    res.json({ deleted: true });
  });
  app2.put("/api/admin/settings", requireAuth, requireAdmin, async (req, res) => {
    const body = req.body;
    const updated = {
      ...body,
      id: "storefront",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveStoreSettings(updated);
    res.json({ settings: updated });
  });
  return app2;
}
async function startServer() {
  const app2 = createApiApp();
  const port = resolveServerPort();
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distDir = path3.resolve(process.cwd(), "dist");
    app2.use(express.static(distDir));
    app2.get("*", (_req, res) => {
      const indexFile = path3.join(distDir, "index.html");
      if (fs3.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Build output not found. Run npm run build first.");
      }
    });
  }
  app2.listen(port, "0.0.0.0", () => {
    console.log(`Sri Parameshmari Printers server running on http://0.0.0.0:${port}`);
  });
}
var entryBase = process.argv[1] ? path3.basename(process.argv[1]).replace(/\.(ts|js|mjs|cjs)$/, "") : "";
if (entryBase === "server") {
  void startServer();
}

// scripts/build-api.ts
var app = createApiApp();
var build_api_default = app;
export {
  build_api_default as default
};
