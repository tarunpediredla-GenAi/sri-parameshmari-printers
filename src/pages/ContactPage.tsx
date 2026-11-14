import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, PenTool, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function ContactPage() {
  const { settings } = useStore();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
          Design Studio &amp; Prompt Desk
        </p>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#2B1D14] mt-1">
          Contact {settings.businessName}
        </h1>
        <p className="text-sm text-[#52635A] mt-1.5">
          All studio contact details, support hours, and business information below are configurable
          directly from Admin Settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#DCE4DB] p-6 shadow-sm space-y-5">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#2B1D14]">Design Studio Office</h2>
              <p className="text-sm text-[#52635A] mt-1">{settings.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#2B1D14]">Phone Helpline</h2>
              <p className="text-sm text-[#52635A] mt-1">{settings.phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#2B1D14]">Design &amp; Prompt Support Email</h2>
              <p className="text-sm text-[#52635A] mt-1">{settings.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#2B1D14]">Studio Hours</h2>
              <p className="text-sm text-[#52635A] mt-1">{settings.businessHours}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#231710] via-[#3A261B] to-[#2E4035] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 border border-[#4D6F5E]/40">
          <div className="space-y-3">
            <PenTool className="w-7 h-7 text-[#F59E0B]" aria-hidden="true" />
            <h2 className="font-editorial text-2xl font-bold">Need a Custom Design Concept?</h2>
            <p className="text-sm text-[#D7DFD6] leading-relaxed">
              Submit your website layout, business card, flyer, banner, sticker, or invitation
              specifications through our Custom Design Desk for bespoke prompt creation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/quote"
              className="px-5 py-3 rounded-xl bg-[#F59E0B] hover:bg-[#D9840E] text-[#231710] font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              Request Custom Design
            </Link>
            <Link
              to="/shop"
              className="px-5 py-3 rounded-xl bg-[#4D6F5E]/25 hover:bg-[#4D6F5E]/40 border border-[#84A98C]/40 text-white font-semibold text-sm"
            >
              Browse Design Catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
