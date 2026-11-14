import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const POLICY_TITLES: Record<string, string> = {
  about: 'About Sri Parameshmari Printers',
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  refund: 'Digital Purchase & Refund Policy',
  shipping: 'Instant Digital Prompt Delivery Policy',
};

export default function PolicyPage() {
  const { slug = 'about' } = useParams<{ slug: string }>();
  const { settings } = useStore();

  const title = POLICY_TITLES[slug] || 'Store Information';
  const body =
    settings.policies[slug as keyof typeof settings.policies] || settings.policies.about;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#52635A] hover:text-[#2B1D14]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Storefront</span>
      </Link>

      <div className="bg-white rounded-2xl border border-[#DCE4DB] p-8 shadow-sm space-y-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
          {settings.businessName}
        </p>
        <h1 className="font-editorial text-3xl font-bold text-[#2B1D14]">{title}</h1>
        <p className="text-sm text-[#3A261B] leading-relaxed whitespace-pre-line">{body}</p>
        <div className="pt-4 border-t border-[#E6ECE5] text-xs text-[#64746B]">
          Questions? Contact {settings.email} or call {settings.phone}.
        </div>
      </div>
    </div>
  );
}
