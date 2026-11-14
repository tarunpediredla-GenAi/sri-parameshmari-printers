import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  DEFAULT_STORE_SETTINGS,
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
} from '../lib/catalogDefaults';
import { apiFetch } from '../lib/api';
import { auth, googleProvider } from '../lib/firebase';
import type {
  CartItem,
  Category,
  Product,
  StoreSettings,
  UserProfile,
} from '../types/print';

export interface ConfigStatus {
  razorpayConfigured: boolean;
  razorpayKeyId: string | null;
  checkoutStorageReady?: boolean;
  razorpayMode: 'test' | 'live';
  webhookSecretConfigured: boolean;
  firebaseAdminConfigured: boolean;
  maxArtworkSizeMb: number;
  webhookUrlHint: string;
}

type AuthModalMode = 'login' | 'signup' | 'reset';

interface StoreContextValue {
  user: User | null;
  authReady: boolean;
  idToken: string | null;
  isAdmin: boolean;
  profile: UserProfile | null;
  categories: Category[];
  products: Product[];
  settings: StoreSettings;
  configStatus: ConfigStatus | null;
  loadingCatalog: boolean;
  cart: CartItem[];
  wishlistIds: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  getFreshToken: () => Promise<string | null>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemArtwork: (cartItemId: string, artwork: CartItem['artwork']) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (patch: Partial<UserProfile>) => Promise<UserProfile | null>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'spp_cart_v1';
const WISHLIST_STORAGE_KEY = 'spp_wishlist_v1';

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [categories, setCategories] = useState<Category[]>(SAMPLE_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => readStoredJson<CartItem[]>(CART_STORAGE_KEY, []));
  const [wishlistIds, setWishlistIds] = useState<string[]>(() =>
    readStoredJson<string[]>(WISHLIST_STORAGE_KEY, [])
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // ignore
    }
  }, [wishlistIds]);

  const refreshCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const [catalogRes, statusRes] = await Promise.all([
        apiFetch<{ categories: Category[]; products: Product[]; settings: StoreSettings }>('/api/catalog'),
        apiFetch<ConfigStatus>('/api/config/status'),
      ]);
      setCategories(catalogRes.categories);
      setProducts(catalogRes.products);
      setSettings(catalogRes.settings);
      setConfigStatus(statusRes);
    } catch (err) {
      console.warn('Using bundled sample catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  const loadProfileWithToken = useCallback(async (token: string) => {
    try {
      const res = await apiFetch<{ profile: UserProfile; isAdmin: boolean }>(
        '/api/profile',
        {},
        token
      );
      setProfile(res.profile);
      setIsAdmin(res.isAdmin);
      if (Array.isArray(res.profile.wishlistProductIds) && res.profile.wishlistProductIds.length > 0) {
        setWishlistIds((prev) => Array.from(new Set([...prev, ...res.profile.wishlistProductIds])));
      }
    } catch {
      // ignore profile sync failure if token just refreshed
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          setIdToken(tokenResult.token);
          setIsAdmin(Boolean(tokenResult.claims.admin));
          await loadProfileWithToken(tokenResult.token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
        setIsAdmin(false);
        setProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [loadProfileWithToken]);

  const getFreshToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken(false);
    setIdToken(token);
    return token;
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await getFreshToken();
    if (token) {
      await loadProfileWithToken(token);
    }
  }, [getFreshToken, loadProfileWithToken]);

  const saveProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      const token = await getFreshToken();
      if (!token) return null;
      const res = await apiFetch<{ profile: UserProfile }>(
        '/api/profile',
        { method: 'PUT', body: JSON.stringify(patch) },
        token
      );
      setProfile(res.profile);
      return res.profile;
    },
    [getFreshToken]
  );

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    setAuthModalOpen(false);
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // verification email dispatch best-effort
    }
    setAuthModalOpen(false);
  }, []);

  const signInGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
    setAuthModalOpen(false);
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => [...prev, item]);
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  }, []);

  const updateCartItemArtwork = useCallback(
    (cartItemId: string, artwork: CartItem['artwork']) => {
      setCart((prev) =>
        prev.map((item) => (item.cartItemId === cartItemId ? { ...item, artwork } : item))
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const next = wishlistIds.includes(productId)
        ? wishlistIds.filter((id) => id !== productId)
        : [...wishlistIds, productId];
      setWishlistIds(next);
      if (auth.currentUser) {
        const token = await getFreshToken();
        if (token) {
          await apiFetch<{ profile: UserProfile }>(
            '/api/profile',
            { method: 'PUT', body: JSON.stringify({ wishlistProductIds: next }) },
            token
          ).catch(() => undefined);
        }
      }
    },
    [wishlistIds, getFreshToken]
  );

  return (
    <StoreContext.Provider
      value={{
        user,
        authReady,
        idToken,
        isAdmin,
        profile,
        categories,
        products,
        settings,
        configStatus,
        loadingCatalog,
        cart,
        wishlistIds,
        searchQuery,
        setSearchQuery,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signInEmail,
        signUpEmail,
        signInGoogle,
        sendResetEmail,
        resendVerification,
        logout,
        getFreshToken,
        addToCart,
        removeFromCart,
        updateCartItemArtwork,
        clearCart,
        toggleWishlist,
        refreshCatalog,
        refreshProfile,
        saveProfile,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}
