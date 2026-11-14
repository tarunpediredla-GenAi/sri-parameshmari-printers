import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import ArtworkUploader from '../components/ArtworkUploader';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import type { ArtworkAttachment, QuoteRequest } from '../types/print';

export default function QuotePage() {
  const { user, profile, getFreshToken, openAuthModal } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [productType, setProductType] = useState('Custom Website & Brand Design Pack');
  const [quantity, setQuantity] = useState(1);
  const [dimensions, setDimensions] = useState('');
  const [paperAndFinish, setPaperAndFinish] = useState('');
  const [notes, setNotes] = useState('');
  const [artwork, setArtwork] = useState<ArtworkAttachment | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<QuoteRequest | null>(null);

  useEffect(() => {
    if (user) {
      setCustomerName((prev) => prev || profile?.displayName || user.displayName || '');
      setCustomerEmail((prev) => prev || user.email || '');
      setCustomerPhone((prev) => prev || profile?.phone || '');
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getFreshToken();
      if (!token) throw new Error('Please sign in again to submit your quote.');

      const res = await apiFetch<{ quote: QuoteRequest }>(
        '/api/quotes',
        {
          method: 'POST',
          body: JSON.stringify({
            customerName,
            customerEmail,
            customerPhone,
            productType,
            quantity: Number(quantity),
            dimensions,
            paperAndFinish,
            notes,
            artworkId: artwork?.artworkId,
            artworkFileName: artwork?.fileName,
          }),
        },
        token
      );
      setSubmittedQuote(res.quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit design request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
          Bespoke Design Brief &amp; Custom Prompt Desk
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2B1D14] mt-1">
          Request a Custom Design &amp; Prompt
        </h1>
        <p className="text-sm text-[#52635A] mt-1.5">
          Need a tailored Website UI layout, multi-page Brochure system, Retail Signage concept,
          Product Label collection, or Custom Invitation prompt pack? Submit your brief and
          optional brand logo reference below.
        </p>
      </div>

      {submittedQuote ? (
        <div className="bg-white rounded-2xl border border-[#84A98C] p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-[#3D5A4C]">
            <CheckCircle2 className="w-7 h-7 text-[#3D5A4C] shrink-0" />
            <div>
              <h2 className="font-editorial text-xl font-bold text-[#2B1D14]">
                Custom Design Request Submitted
              </h2>
              <p className="text-xs text-[#64746B] font-mono">Reference ID: {submittedQuote.id}</p>
            </div>
          </div>
          <p className="text-sm text-[#3A261B]">
            We received your brief for{' '}
            <strong>
              {submittedQuote.productType} ({submittedQuote.quantity} variant/license)
            </strong>
            . Our design studio will review your specs and post an INR quote in your Account Portal.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-sm font-semibold"
            >
              View Status in My Prompts
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedQuote(null);
                setArtwork(null);
                setNotes('');
              }}
              className="px-5 py-2.5 rounded-lg border border-[#CFDACE] text-[#2B1D14] text-sm font-semibold hover:bg-[#F7F9F6]"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#DCE4DB] p-6 sm:p-8 shadow-sm space-y-5"
        >
          {!user && (
            <div className="p-4 rounded-xl bg-[#F2F5F1] border border-[#DCE4DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-sm text-[#3A261B]">
                Sign in so your custom design brief stays linked to your account.
              </span>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-lg bg-[#3A261B] hover:bg-[#4E3426] text-white text-xs font-semibold shrink-0"
              >
                Log In / Sign Up
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="q-name" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Your Name *
              </label>
              <input
                id="q-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <div>
              <label htmlFor="q-email" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Email Address *
              </label>
              <input
                id="q-email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <div>
              <label htmlFor="q-phone" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Phone Number *
              </label>
              <input
                id="q-phone"
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="q-type" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Design Category / Concept *
              </label>
              <input
                id="q-type"
                type="text"
                required
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                placeholder="e.g., Website UI, Business Card, Flyer, Banner, Sticker, Invitation"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <div>
              <label htmlFor="q-qty" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Number of Design Concepts / Screens *
              </label>
              <input
                id="q-qty"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="q-dim" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Target Format / Aspect Ratio
              </label>
              <input
                id="q-dim"
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="e.g., Responsive Web + Mobile, A4 Tri-Fold, 1080×1920 Story, 3.5×2 in"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
            <div>
              <label htmlFor="q-paper" className="block text-xs font-semibold text-[#3A261B] mb-1">
                Color Palette, Typography &amp; Visual Style
              </label>
              <input
                id="q-paper"
                type="text"
                value={paperAndFinish}
                onChange={(e) => setPaperAndFinish(e.target.value)}
                placeholder="e.g., Sage Green + Walnut Brown, Editorial Serif, Minimalist Luxury"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="q-notes" className="block text-xs font-semibold text-[#3A261B] mb-1">
              Brand Details, Copy &amp; Target Tool Preferences
            </label>
            <textarea
              id="q-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Include your brand name, tagline, sections or text needed in the design, and preferred design tool (Midjourney, Canva, Figma, ChatGPT/Claude)..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#CFDACE] text-sm text-[#2B1D14] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/60"
            />
          </div>

          <ArtworkUploader
            label="Optional Brand Logo or Moodboard Reference"
            required={false}
            artwork={artwork}
            onChange={setArtwork}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{submitting ? 'Submitting Request...' : 'Submit Custom Design Request'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
