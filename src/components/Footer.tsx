import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Footer() {
  const { settings, categories } = useStore();

  return (
    <footer className="bg-[#231710] text-[#D7DFD6] border-t border-[#4E382B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Column 1: Business Details (Configurable) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-white">
            <span className="w-9 h-9 rounded-lg bg-[#3A261B] border border-[#F59E0B]/45 text-[#F59E0B] flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(245,158,11,0.25)]">
              <Printer className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="font-editorial text-lg font-bold tracking-tight">
              {settings.businessName}
            </span>
          </div>
          <p className="text-sm text-[#B7C5B8] leading-relaxed">
            {settings.tagline}. Operated by{' '}
            <strong className="text-[#F5EFE6] font-medium">{settings.proprietorOrEntity}</strong>.
          </p>
          <div className="text-xs text-[#B7C5B8] space-y-1.5 leading-relaxed">
            <p>
              <strong className="text-[#F5EFE6]">Design Studio:</strong> {settings.address}
            </p>
            <p>
              <strong className="text-[#F5EFE6]">Email:</strong> {settings.email}
            </p>
            <p>
              <strong className="text-[#F5EFE6]">Helpline:</strong> {settings.phone}
            </p>
            <p>
              <strong className="text-[#F5EFE6]">Hours:</strong> {settings.businessHours}
            </p>
          </div>
        </div>

        {/* Column 2: Design Catalog */}
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide mb-4">Design Catalog</h3>
          <ul className="space-y-2.5 text-sm text-[#B7C5B8]">
            {categories.slice(0, 6).map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/shop?category=${encodeURIComponent(cat.id)}`}
                  className="hover:text-[#F59E0B] transition-colors"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Information & Policies */}
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide mb-4">
            Information &amp; Policies
          </h3>
          <ul className="space-y-2.5 text-sm text-[#B7C5B8]">
            <li>
              <Link to="/policy/about" className="hover:text-[#F59E0B] transition-colors">
                About Studio
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-[#F59E0B] transition-colors">
                Contact &amp; Support
              </Link>
            </li>
            <li>
              <Link to="/policy/privacy" className="hover:text-[#F59E0B] transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/policy/terms" className="hover:text-[#F59E0B] transition-colors">
                License &amp; Terms
              </Link>
            </li>
            <li>
              <Link to="/policy/refund" className="hover:text-[#F59E0B] transition-colors">
                Refund Policy
              </Link>
            </li>
            <li>
              <Link to="/policy/shipping" className="hover:text-[#F59E0B] transition-colors">
                Digital Delivery Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 4: Customer & Administration */}
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide mb-4">
            Account &amp; Administration
          </h3>
          <ul className="space-y-2.5 text-sm text-[#B7C5B8]">
            <li>
              <Link to="/dashboard" className="hover:text-[#F59E0B] transition-colors">
                My Unlocked Prompts &amp; Orders
              </Link>
            </li>
            <li>
              <Link to="/quote" className="hover:text-[#F59E0B] transition-colors">
                Request Custom Design Prompt
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-[#F59E0B] transition-colors">
                Shopping Cart
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-[#F59E0B] transition-colors">
                Admin Console
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#3E2A1F] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#9DB0A0]">
          <p>
            © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
          </p>
          <p>Digital Designs Only · Instant Prompt Delivery in INR (₹).</p>
        </div>
      </div>
    </footer>
  );
}
