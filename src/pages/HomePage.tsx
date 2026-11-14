import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  KeyRound,
  Layers,
  Layout,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { DEFAULT_FAQS } from '../lib/catalogDefaults';
import { formatInrFromPaise } from '../lib/pricing';

export default function HomePage() {
  const { categories, products, settings } = useStore();
  const navigate = useNavigate();

  const spotlightProducts = [
    products.find((p) => p.id === 'prod-ecommerce-website-design') || products[0],
    products.find((p) => p.id === 'prod-gold-foil-business-cards') || products[1] || products[0],
    products.find((p) => p.id === 'prod-royal-wedding-invitations') || products[2] || products[0],
  ].filter(Boolean);

  const [spotlightIdx, setSpotlightIdx] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(DEFAULT_FAQS[0].id);

  const activeSpotlight = spotlightProducts[spotlightIdx] || products[0];
  const featuredProducts = products.filter((p) => p.featured).slice(0, 6);

  return (
    <div>
      {/* 1. Walnut Brown to Deep Sage Botanical Hero with Amber Glow */}
      <section className="bg-gradient-to-br from-[#231710] via-[#3A261B] to-[#2E4035] text-white border-b border-[#4D6F5E]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Hero Column */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <p className="text-xs font-semibold tracking-wider uppercase text-[#F59E0B]">
                  {settings.businessName} · Digital Designs &amp; Prompt Store
                </p>

                <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[52px] font-bold leading-[1.1] tracking-tight text-balance">
                  Curated <span className="text-[#F59E0B]">Website, Card, Flyer &amp; Banner</span>{' '}
                  Designs — Prompt Unlocked on Purchase.
                </h1>

                <p className="text-base sm:text-lg text-[#D7DFD6] max-w-2xl leading-relaxed">
                  Buy digital designs only—covering websites, business cards, flyers &amp;
                  brochures, banners &amp; signage, stickers &amp; labels, and invitations. Every
                  purchase unlocks the exact studio prompt so you can generate your design right away.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm transition-colors shadow-[0_0_24px_rgba(245,158,11,0.3)]"
                  >
                    <span>Browse All Designs</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/quote"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#4D6F5E]/25 hover:bg-[#4D6F5E]/40 border border-[#84A98C]/40 text-white font-semibold text-sm transition-colors"
                  >
                    <span>Request Custom Design Prompt</span>
                  </Link>
                </div>
              </div>

              {/* Quick Category Buttons */}
              <div className="pt-6 border-t border-white/15 space-y-3">
                <p className="text-xs font-semibold tracking-wider uppercase text-[#B7C5B8]">
                  Explore {categories.length} Design Categories
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.id)}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#27382F] hover:bg-[#354E41] border border-[#4D6F5E]/60 text-xs font-medium text-[#E6ECE5] transition-colors whitespace-nowrap shrink-0"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Hero Column: Featured Design Spotlight Panel */}
            {activeSpotlight && (
              <div className="lg:col-span-5 bg-[#1F2D26] border border-[#4D6F5E]/60 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(245,158,11,0.12)]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold tracking-wider uppercase text-[#F59E0B]">
                      Featured Design
                    </span>
                    <div className="flex items-center gap-1 bg-[#231710] p-1 rounded-lg border border-[#4D6F5E]/40">
                      {spotlightProducts.map((sp, idx) => (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() => setSpotlightIdx(idx)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                            spotlightIdx === idx
                              ? 'bg-[#F59E0B] text-[#231710]'
                              : 'text-[#D7DFD6] hover:text-white'
                          }`}
                        >
                          {sp.categoryName.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#4D6F5E]/50 bg-[#231710]">
                    <img
                      src={activeSpotlight.imageUrl}
                      alt={activeSpotlight.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#B7C5B8]">
                      <span>
                        {activeSpotlight.categoryName} · {activeSpotlight.turnaroundDays}
                      </span>
                      {activeSpotlight.isSampleData && (
                        <span className="text-[#F59E0B]">Sample Design</span>
                      )}
                    </div>
                    <h2 className="font-editorial text-xl font-bold text-white leading-snug">
                      {activeSpotlight.title}
                    </h2>
                    <p className="text-xs text-[#D7DFD6] line-clamp-2">
                      {activeSpotlight.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#4D6F5E]/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {formatInrFromPaise(activeSpotlight.basePricePaise)}
                      </span>
                      {activeSpotlight.compareAtPricePaise && (
                        <span className="text-xs text-[#B7C5B8] line-through tabular-nums">
                          {formatInrFromPaise(activeSpotlight.compareAtPricePaise)}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#B7C5B8]">Digital Prompt Pack · INR (₹)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/product/${activeSpotlight.id}`}
                      className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] text-xs font-bold transition-colors whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
                    >
                      Get Design Prompt
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4-Column Capability Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/15">
            <div className="rounded-xl bg-[#27382F]/85 border border-[#4D6F5E]/50 p-4 flex items-start gap-3">
              <Layout className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-white">6 Design Categories</h3>
                <p className="text-xs text-[#D7DFD6] mt-1">
                  Websites, business cards, flyers, brochures, banners, stickers &amp; invitations.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-[#27382F]/85 border border-[#4D6F5E]/50 p-4 flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-white">Instant Prompt Unlock</h3>
                <p className="text-xs text-[#D7DFD6] mt-1">
                  Verified payment immediately reveals your complete copy-ready design prompt.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-[#27382F]/85 border border-[#4D6F5E]/50 p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-white">Brand Brief Tailoring</h3>
                <p className="text-xs text-[#D7DFD6] mt-1">
                  Add your business name &amp; colors at checkout—or request custom admin tailoring.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-[#27382F]/85 border border-[#4D6F5E]/50 p-4 flex items-start gap-3">
              <Layers className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-white">₹0 Digital Delivery</h3>
                <p className="text-xs text-[#D7DFD6] mt-1">
                  Designs only—no shipping fees or waiting for couriers. Access anytime in My Prompts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop by Design Category */}
      <section className="py-14 bg-[#F2F5F1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-[#B45309]">
                01. Design Categories
              </p>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14] mt-1">
                Digital Designs for Websites, Print Layouts &amp; Events
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2B1D14] hover:text-[#B45309]"
            >
              <span>Browse Full Design Catalog</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${encodeURIComponent(cat.id)}`}
                className="group bg-white rounded-2xl border border-[#DCE4DB] overflow-hidden shadow-sm hover:shadow-md hover:border-[#84A98C] hover:-translate-y-0.5 transition-all flex items-center gap-4 p-4"
              >
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#E6ECE5] shrink-0">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[#2B1D14] group-hover:text-[#B45309] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-[#52635A] line-clamp-2 mt-1">{cat.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Design Packages Grid */}
      <section className="py-14 bg-white border-y border-[#DCE4DB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-[#B45309]">
                02. Featured Design Catalog
              </p>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14] mt-1">
                Select Format, Add Brand Brief &amp; Unlock Your Design Prompt
              </h2>
              <p className="text-sm text-[#52635A] mt-1">
                All design prompts are kept private until payment and can be edited anytime from the Admin Console.
              </p>
            </div>
            <Link
              to="/shop"
              className="px-4 py-2 rounded-lg bg-[#3A261B] text-white text-sm font-semibold hover:bg-[#4E3426] transition-colors whitespace-nowrap shrink-0"
            >
              View All Designs
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Workflow & Value */}
      <section className="py-14 bg-[#F2F5F1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-[#B45309]">
                03. Production-Tested Prompts
              </p>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14] mt-1">
                Why Creators &amp; Businesses Buy Designs from {settings.businessName}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  title: 'Prompt-Verified Protection',
                  desc: 'Design prompts stay hidden on the server and unlock strictly for verified paying customers.',
                },
                {
                  title: 'Ready-to-Paste Structure',
                  desc: 'Includes exact color hex tokens, layout grids, typography hierarchy, and aspect ratios.',
                },
                {
                  title: 'Tailored to Your Brand',
                  desc: 'Add your business name and style preferences, or receive a custom prompt directly from our admin.',
                },
                {
                  title: 'Transparent INR Pricing',
                  desc: 'Instant option pricing and multi-variation bundles calculated clearly in Indian Rupees.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white rounded-2xl border border-[#DCE4DB] p-5 space-y-2 shadow-sm"
                >
                  <ShieldCheck className="w-5 h-5 text-[#3D5A4C]" aria-hidden="true" />
                  <h3 className="text-base font-bold text-[#2B1D14]">{item.title}</h3>
                  <p className="text-sm text-[#52635A] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold tracking-wider uppercase text-[#B45309]">
                04. How Prompt Delivery Works
              </p>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14] mt-1">
                From Checkout to Design in 3 Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  title: 'Pick a Design & Enter Your Brand Brief',
                  desc: 'Choose website, business card, flyer, banner, sticker, or invitation specs and optionally add your business name or reference logo.',
                },
                {
                  step: '02',
                  title: 'Pay Securely in INR via Razorpay',
                  desc: 'Complete instant digital checkout at ₹0 shipping with UPI, cards, or net banking.',
                },
                {
                  step: '03',
                  title: 'Copy Your Unlocked Prompt & Generate',
                  desc: 'Your order page immediately reveals the full prompt + instructions—plus any custom prompt updates sent by our studio.',
                },
              ].map((card) => (
                <div
                  key={card.step}
                  className="bg-white rounded-2xl border border-[#DCE4DB] p-6 space-y-3 shadow-sm"
                >
                  <span className="inline-block font-mono text-sm font-bold text-[#B45309]">
                    {card.step}
                  </span>
                  <h3 className="text-lg font-bold text-[#2B1D14]">{card.title}</h3>
                  <p className="text-sm text-[#52635A] leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ Accordion + Custom Design Callout */}
      <section className="py-14 bg-white border-t border-[#DCE4DB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold tracking-wider uppercase text-[#B45309]">
              05. Questions &amp; Answers
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1D14]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#52635A]">
              Everything about buying digital designs, unlocking prompts, and custom requests.
            </p>
          </div>

          <div className="space-y-3">
            {DEFAULT_FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border border-[#DCE4DB] bg-[#F7F9F6] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#2B1D14] hover:bg-[#E6ECE5]/60 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#52635A] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-[#52635A] leading-relaxed border-t border-[#DCE4DB] pt-3 bg-white">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Design Prompt CTA Card */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
          <div className="rounded-2xl bg-gradient-to-r from-[#231710] via-[#3A261B] to-[#2E4035] text-white p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-[#4D6F5E]/40">
            <div className="lg:col-span-7 space-y-3">
              <p className="text-xs font-bold tracking-wider uppercase text-[#F59E0B]">
                Bespoke Brand Systems &amp; Website Prompts
              </p>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold">
                Need a Custom Website, Packaging, or Full Brand Design Prompt?
              </h2>
              <p className="text-sm text-[#D7DFD6] leading-relaxed max-w-2xl">
                Share your niche, layout goals, and optional reference logo with our design desk. We
                craft a tailored prompt and deliver it directly to your account.
              </p>
              <div className="flex flex-wrap gap-5 pt-2 text-xs text-[#D7DFD6]">
                <span>Email: {settings.email}</span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#F59E0B]" aria-hidden="true" />
                  {settings.phone}
                </span>
              </div>
            </div>
            <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-3">
              <Link
                to="/quote"
                className="px-6 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm transition-colors whitespace-nowrap shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                Request Custom Design
              </Link>
              <Link
                to="/contact"
                className="px-6 py-3.5 rounded-xl bg-[#4D6F5E]/25 hover:bg-[#4D6F5E]/40 border border-[#84A98C]/40 text-white font-semibold text-sm transition-colors whitespace-nowrap"
              >
                Contact Studio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
