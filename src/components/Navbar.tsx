import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LogIn,
  LogOut,
  Menu,
  PenTool,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Navbar() {
  const {
    user,
    isAdmin,
    settings,
    categories,
    cart,
    searchQuery,
    setSearchQuery,
    openAuthModal,
    logout,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate('/shop');
  };

  const isNavActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLinkClass = (path: string) => {
    const active = isNavActive(path);
    return `relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
      active ? 'text-[#231710] font-semibold' : 'text-[#52635A] hover:text-[#231710]'
    }`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAFBF9]/95 backdrop-blur-md border-b border-[#DCE4DB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[#231710] min-w-0 shrink group"
        >
          <span className="w-9 h-9 rounded-xl bg-[#231710] text-[#F59E0B] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(35,23,16,0.18)] ring-1 ring-[#F59E0B]/30 group-hover:bg-[#3A261B] transition-colors">
            <PenTool className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-editorial text-base sm:text-lg font-bold tracking-tight truncate">
            {settings.businessName || 'Sri Parameshmari Printers'}
          </span>
        </Link>

        {/* Zone 2: Clean Editorial Primary Links */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-6 xl:gap-7 shrink-0">
          {[
            { to: '/', label: 'Home' },
            { to: '/shop', label: 'Designs' },
            { to: '/quote', label: 'Custom Design' },
            { to: '/contact', label: 'Contact' },
            ...(user ? [{ to: '/dashboard', label: 'My Prompts' }] : []),
          ].map((item) => {
            const active = isNavActive(item.to);
            return (
              <Link key={item.to} to={item.to} className={navLinkClass(item.to)}>
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full bg-[#D9840E] transition-transform duration-200 origin-left ${
                    active ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Search, Account & Cart Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative">
            <Search
              className="w-4 h-4 text-[#64746B] absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search design packages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search designs..."
              className="w-40 lg:w-44 xl:w-52 pl-9 pr-3 py-1.5 text-sm bg-[#F2F5F1] border border-[#CFDACE] rounded-xl text-[#231710] placeholder:text-[#64746B] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#D9840E] transition-all"
            />
          </form>

          {/* Account Trigger / Menu (Desktop & Tablet) */}
          <div className="hidden sm:block relative" ref={accountMenuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((o) => !o)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#CFDACE] bg-white hover:bg-[#F2F5F1] text-sm font-medium text-[#231710] transition-colors whitespace-nowrap shrink-0"
                >
                  <User className="w-4 h-4 text-[#3D5A4C]" aria-hidden="true" />
                  <span className="max-w-[96px] truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Account'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#64746B] transition-transform ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#DCE4DB] shadow-xl py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-[#E6ECE5]">
                      <div className="text-xs font-semibold text-[#231710] truncate">
                        {user.displayName || 'Customer Account'}
                      </div>
                      <div className="text-[11px] text-[#64746B] truncate">{user.email}</div>
                    </div>

                    <Link
                      to="/dashboard"
                      role="menuitem"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#231710] hover:bg-[#F2F5F1] transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                      <span>My Prompts &amp; Orders</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        role="menuitem"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#231710] hover:bg-[#F2F5F1] transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#3D5A4C]" aria-hidden="true" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        void logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#52635A] hover:text-red-700 hover:bg-red-50/70 transition-colors text-left border-t border-[#E6ECE5] mt-1 pt-2.5"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CFDACE] bg-white hover:bg-[#F2F5F1] text-sm font-semibold text-[#231710] transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4 text-[#3D5A4C]" aria-hidden="true" />
                <span>Log In</span>
              </button>
            )}
          </div>

          {/* Primary Cart CTA */}
          <Link
            to="/cart"
            aria-label={`Shopping cart with ${cart.length} items`}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#231710] hover:bg-[#3A261B] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-[#F59E0B]" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-[#F59E0B] text-[#231710] text-xs font-bold tabular-nums shadow-[0_0_10px_rgba(245,158,11,0.35)]">
              {cart.length}
            </span>
          </Link>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#CFDACE] bg-white text-[#231710] hover:bg-[#F2F5F1] transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#DCE4DB] bg-[#FAFBF9] px-4 py-4 space-y-4 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search
              className="w-4 h-4 text-[#64746B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search designs mobile"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search website, card, flyer, banner designs..."
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-[#CFDACE] rounded-xl text-[#231710] placeholder:text-[#64746B] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50"
            />
          </form>

          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/', label: 'Home' },
              { to: '/shop', label: 'All Designs' },
              { to: '/quote', label: 'Custom Design' },
              { to: '/contact', label: 'Contact' },
            ].map((item) => {
              const active = isNavActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#231710] text-white font-semibold'
                      : 'bg-white border border-[#DCE4DB] text-[#231710]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#231710] bg-[#E6ECE5] border border-[#CFDACE]"
              >
                My Prompts &amp; Orders
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#231710] bg-[#F59E0B]/20 border border-[#F59E0B]/40"
              >
                Admin Console
              </Link>
            )}
          </div>

          {categories.length > 0 && (
            <div className="pt-2 border-t border-[#E6ECE5] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#52635A]">
                Design Categories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(`/shop?category=${encodeURIComponent(cat.id)}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-[#CFDACE] text-xs font-medium text-[#2B1D14] hover:border-[#3D5A4C]"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!user ? (
            <div className="flex gap-2 pt-2 border-t border-[#E6ECE5]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#CFDACE] bg-white text-sm font-semibold text-[#231710]"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('signup');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#F59E0B] text-[#231710] text-sm font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                void logout();
              }}
              className="w-full py-2.5 rounded-xl border border-[#CFDACE] bg-white text-sm font-medium text-[#3D5A4C]"
            >
              Sign Out ({user.email})
            </button>
          )}
        </div>
      )}
    </header>
  );
}
