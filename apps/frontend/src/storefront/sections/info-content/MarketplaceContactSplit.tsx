import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../../utils/paths';

export interface MarketplaceContactSplitProps {
  title?: string;
  helpTitle?: string;
  phone?: string;
  messenger?: string;
  telegram?: string;
  email?: string;
  subscribeText?: string;
  submitText?: string;
  sidebarLinks?: Array<{ title: string; link: string; active?: boolean }>;
}

export const MarketplaceContactSplit: React.FC<MarketplaceContactSplitProps> = ({
  title = 'تواصل معنا لأي استفسار',
  helpTitle = 'هل تحتاج مساعدة؟',
  phone = '(208) 555-0112',
  messenger = 'ماسنجر',
  telegram = 'تيليجرام',
  email = 'support@avenue-market.com',
  subscribeText = 'تابعنا',
  submitText = 'إرسال الرسالة',
  sidebarLinks = [
    { title: 'تتبع طلبك', link: '/track-order' },
    { title: 'من نحن', link: '/about' },
    { title: 'الأسئلة الشائعة', link: '/faq' },
    { title: 'شركاؤنا', link: '/partners' },
    { title: 'اعمل معنا', link: '/careers' },
    { title: 'اتصل بنا', link: '/contact', active: true },
  ],
}) => {
  const location = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  const isRtl = document.documentElement.dir === 'rtl' || location.search.includes('lang=ar');

  return (
    <section className="w-full bg-[#fbfbfb] py-8 md:py-12">
      <div className="mx-auto w-full max-w-[1235px] px-4">
        <div className="flex flex-col lg:flex-row gap-[30px]">
          {/* Left Sidebar (247px on 1280px screen) */}
          <aside className="w-full lg:w-[247px] shrink-0">
            <div className="rounded-[16px] bg-white border border-black/5 p-5 shadow-sm">
              <nav className="flex flex-col space-y-1">
                {sidebarLinks.map((item, idx) => {
                  const isActive = item.active || item.link === '/contact';
                  const path = buildStorefrontPath(location.pathname, item.link, location.search);
                  return (
                    <Link
                      key={idx}
                      to={path}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-[#777777] hover:text-[#242424] hover:bg-black/[0.02]'
                      }`}
                    >
                      <span>{item.title}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content (958px on 1280px screen) */}
          <main className="flex-1 min-w-0 max-w-[958px]">
            {/* Map Container with Floating Help Card */}
            <div className="relative w-full h-[500px] rounded-[20px] overflow-hidden mb-[40px] bg-[#e5e3df] shadow-sm">
              {/* Interactive Map Visual Layer */}
              <div className="absolute inset-0 bg-[#e8ecf1] overflow-hidden">
                <svg
                  className="w-full h-full opacity-60"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1000 600"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d5dbe3" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  {/* Styled roads & rivers */}
                  <path d="M-100 250 C 200 230, 400 350, 1100 280" fill="none" stroke="#cbd5e1" strokeWidth="24" />
                  <path d="M-100 250 C 200 230, 400 350, 1100 280" fill="none" stroke="#ffffff" strokeWidth="16" />
                  <path d="M 500 -100 C 520 200, 450 400, 600 700" fill="none" stroke="#cbd5e1" strokeWidth="20" />
                  <path d="M 500 -100 C 520 200, 450 400, 600 700" fill="none" stroke="#ffffff" strokeWidth="14" />
                  <path d="M 100 600 C 350 400, 700 300, 950 -50" fill="none" stroke="#93c5fd" strokeWidth="18" opacity="0.6" />
                  <circle cx="680" cy="290" r="12" fill="#e14a5c" />
                  <circle cx="680" cy="290" r="28" fill="#e14a5c" opacity="0.25" />
                </svg>

                {/* Map Pin Marker */}
                <div className="absolute top-[270px] end-[220px] -translate-x-1/2 -translate-y-full flex flex-col items-center">
                  <div className="bg-[#e14a5c] text-white p-2 rounded-full shadow-lg">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="bg-white/95 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold shadow-md mt-1 text-[#242424]">
                    MaxPerformance Store
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute top-4 end-4 flex flex-col gap-1 z-10">
                  <button type="button" aria-label="Zoom in" className="w-8 h-8 rounded-lg bg-white/90 text-[#333] shadow flex items-center justify-center font-bold hover:bg-white transition-colors">
                    +
                  </button>
                  <button type="button" aria-label="Zoom out" className="w-8 h-8 rounded-lg bg-white/90 text-[#333] shadow flex items-center justify-center font-bold hover:bg-white transition-colors">
                    −
                  </button>
                </div>

                {/* OpenStreetMap Attribution */}
                <div className="absolute bottom-2 end-2 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-[#777]">
                  Leaflet | © OpenStreetMap contributors
                </div>
              </div>

              {/* Floating Help Card */}
              <div className="absolute top-[30px] md:top-[50px] start-[15px] md:start-[40px] z-10 w-[300px] max-w-[calc(100%-30px)] rounded-[20px] bg-white p-[30px] shadow-[0_0_12px_rgba(0,0,0,0.22)]">
                <h3 className="font-heading text-[24px] font-semibold text-[#242424] leading-tight mb-5">
                  {helpTitle}
                </h3>

                <ul className="space-y-4 mb-6">
                  {/* Phone */}
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <a href={`tel:${phone.replace(/\D/g, '')}`} className="text-[14px] text-[#242424] hover:text-primary transition-colors font-medium direction-ltr">
                      {phone}
                    </a>
                  </li>

                  {/* Messenger */}
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0084ff]/10 text-[#0084ff] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.735 7.214V22l3.385-1.859c.905.251 1.874.387 2.88.387 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.05 12.443l-2.67-2.85-5.215 2.85 5.736-6.09 2.735 2.85 5.15-2.85-5.736 6.09z" />
                      </svg>
                    </div>
                    <a href="https://m.me" target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#242424] hover:text-primary transition-colors font-medium">
                      {messenger}
                    </a>
                  </li>

                  {/* Telegram */}
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#229ed9]/10 text-[#229ed9] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
                      </svg>
                    </div>
                    <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#242424] hover:text-primary transition-colors font-medium">
                      {telegram}
                    </a>
                  </li>

                  {/* Email */}
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <a href={`mailto:${email}`} className="text-[14px] text-[#242424] hover:text-primary transition-colors font-medium truncate">
                      {email}
                    </a>
                  </li>
                </ul>

                {/* Social Links */}
                <div>
                  <span className="block text-[13px] text-[#777777] font-medium mb-2.5">
                    {subscribeText}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="w-8 h-8 rounded-full bg-[#f4f4f4] hover:bg-[#1877f2] hover:text-white text-[#555] flex items-center justify-center transition-colors text-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                    <a
                      href="https://x.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="X"
                      className="w-8 h-8 rounded-full bg-[#f4f4f4] hover:bg-black hover:text-white text-[#555] flex items-center justify-center transition-colors text-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-8 h-8 rounded-full bg-[#f4f4f4] hover:bg-[#e4405f] hover:text-white text-[#555] flex items-center justify-center transition-colors text-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    </a>
                    <a
                      href="https://youtube.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="YouTube"
                      className="w-8 h-8 rounded-full bg-[#f4f4f4] hover:bg-[#ff0000] hover:text-white text-[#555] flex items-center justify-center transition-colors text-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="font-heading text-[24px] font-semibold text-[#242424] leading-[33.6px] mb-5">
              {title}
            </h2>

            {/* Split Contact Form */}
            {submitted ? (
              <div className="rounded-[20px] bg-emerald-50 border border-emerald-200 p-8 text-center text-emerald-800 animate-in fade-in">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-heading text-lg font-bold mb-1">
                  {isRtl ? 'تم إرسال رسالتك بنجاح!' : 'Your message has been sent!'}
                </h3>
                <p className="text-sm text-emerald-700">
                  {isRtl
                    ? 'شكرًا لتواصلك معنا. سنقوم بالرد على استفسارك في أقرب وقت.'
                    : 'Thank you for contacting us. We will get back to you shortly.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: First Name & Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'الاسم الأول' : 'First name'}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="h-[42px] px-[15px] rounded-[30px] border border-black/10 bg-white text-[14px] text-[#242424] placeholder:text-[#999999] focus:outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'اسم العائلة' : 'Last name'}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-[42px] px-[15px] rounded-[30px] border border-black/10 bg-white text-[14px] text-[#242424] placeholder:text-[#999999] focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Row 2: Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <input
                    type="tel"
                    placeholder={isRtl ? 'رقم الهاتف' : 'Phone Number'}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-[42px] px-[15px] rounded-[30px] border border-black/10 bg-white text-[14px] text-[#242424] placeholder:text-[#999999] focus:outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="email"
                    required
                    placeholder={isRtl ? 'البريد الإلكتروني' : 'Email'}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-[42px] px-[15px] rounded-[30px] border border-black/10 bg-white text-[14px] text-[#242424] placeholder:text-[#999999] focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Row 3: Message Textarea */}
                <div>
                  <textarea
                    rows={6}
                    required
                    placeholder={isRtl ? 'رسالتك' : 'Your Message'}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full h-[190px] p-[15px] rounded-[25px] border border-black/10 bg-white text-[14px] text-[#242424] placeholder:text-[#999999] focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    className="inline-flex h-[42px] min-w-[127px] items-center justify-center rounded-[35px] bg-[#e14a5c] px-6 text-[13px] font-semibold text-white uppercase tracking-wider transition-opacity hover:opacity-90 shadow-sm"
                  >
                    {submitText}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </section>
  );
};
