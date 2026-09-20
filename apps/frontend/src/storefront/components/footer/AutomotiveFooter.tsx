import React from "react";
import { Link } from "react-router-dom";

export interface AutomotiveFooterProps {
  displayStoreName: string;
  descriptionText?: string;
  copyrightText?: string;
  contactRows: Array<{ label: string; value: string; href?: string }>;
  socialIcons: Record<string, string | undefined>;
  linksData: Array<{ title: string; links: Array<{ label: string; to: string }> }>;
  legalLinks: Array<{ label: string; to: string }>;
  shouldForceDocumentNavigation?: boolean;
  direction?: "rtl" | "ltr";
}

const renderSocialIcon = (social: string) => {
  const key = social.toLowerCase().trim();
  switch (key) {
    case "facebook":
    case "fb":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M13.5 21v-7.8h2.62l.4-3.03H13.5V8.22c0-.88.24-1.48 1.5-1.48h1.6V4.06c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.41-3.9 4v2.23H7.75v3.03h2.6V21h3.15Z" />
        </svg>
      );
    case "instagram":
    case "insta":
    case "ig":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
    case "ticktok":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M16.7 3c.36 2.1 1.9 3.72 4.3 3.9v3.03c-1.62.04-3.02-.42-4.3-1.24v6.5c0 3.6-2.44 5.81-5.53 5.81C8.2 21 6 18.86 6 16.1c0-2.86 2.4-5.06 5.62-4.87v3.1c-1.5-.28-2.6.55-2.6 1.77 0 1.1.86 1.9 1.98 1.9 1.3 0 2.16-.94 2.16-2.5V3h3.54Z" />
        </svg>
      );
    case "whatsapp":
    case "wa":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      );
    default:
      return null;
  }
};

export const AutomotiveFooter: React.FC<AutomotiveFooterProps> = ({
  displayStoreName,
  descriptionText,
  copyrightText,
  contactRows,
  socialIcons,
  linksData,
  legalLinks,
  shouldForceDocumentNavigation,
  direction = "rtl",
}) => {
  const whatsappRow = contactRows.find(
    (row) =>
      row.label.includes("واتساب") ||
      row.label.toLowerCase().includes("whatsapp") ||
      (row.href && row.href.includes("wa.me")),
  );
  const whatsappUrl =
    whatsappRow?.href ||
    socialIcons.whatsapp ||
    (contactRows[0]?.href?.includes("wa.me") ? contactRows[0]?.href : undefined);

  const trustBadges = [
    {
      title: "المعاينة والتجربة قبل الدفع",
      desc: "افتح وجرب الستائر على شباك سيارتك مع المندوب قبل السداد",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      title: "ضمان استبدال فوري 14 يوم",
      desc: "حق استبدال كامل وسريع بدون أي تعقيدات إذا لم يطابق المقاس",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "تفصيل فابريقة بالمللي",
      desc: "شاسيه حديد صلب مرن غير قابل للكسر مطابق لقائم سيارتك 100%",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      ),
    },
    {
      title: "شحن وتوصيل لجميع المحافظات",
      desc: "تغليف مصفح مخصص للحفاظ على الشاسيه مع طقم كبس تثبيت مجاني",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-red-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </svg>
      ),
    },
  ];

  return (
    <footer
      dir={direction}
      className="relative w-full border-t border-slate-200/90 bg-slate-50/70 text-slate-700 font-sans"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Pre-Footer Trust Bar - Harmonious Light Wireframe */}
        <div className="grid grid-cols-1 divide-y divide-slate-200/80 border-b border-slate-200/80 py-8 sm:grid-cols-2 sm:divide-y-0 sm:gap-6 lg:grid-cols-4 lg:divide-x lg:divide-y-0 lg:divide-slate-200/80 rtl:lg:divide-x-reverse">
          {trustBadges.map((badge, idx) => (
            <div
              key={badge.title}
              className={`flex items-start gap-3 py-3 sm:py-0 ${idx !== 0 ? "lg:px-5" : "lg:pe-5"}`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-200/60 bg-white text-red-600 shadow-xs">
                {badge.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 sm:text-sm">{badge.title}</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8 py-10 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1.1fr]">
          {/* Col 1: Brand & Contact Info */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                {displayStoreName}
              </span>
              <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 tracking-wide">
                Original Auto
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 max-w-sm">
              {descriptionText ||
                "المتخصص الأول في مصر في ستائر شبابيك السيارات العازلة للشمس والحرارة بنسبة 98%. تفصيل وثني شاسيه حديد مرن بالمللي مع المعاينة والتجربة قبل الدفع."}
            </p>

            {/* Contact Details */}
            {contactRows.length > 0 && (
              <div className="space-y-2 pt-1 text-xs text-slate-600">
                {contactRows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">{row.label}:</span>
                    {row.href ? (
                      <a
                        href={row.href}
                        dir="ltr"
                        className="font-mono text-slate-800 transition-colors hover:text-red-600"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="font-mono text-slate-800">{row.value}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Social Icons */}
            {Object.keys(socialIcons).length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                {Object.entries(socialIcons).map(([social, url]) => {
                  if (!url) return null;
                  return (
                    <a
                      key={social}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Follow on ${social}`}
                    >
                      {renderSocialIcon(social) ?? (
                        <span className="text-xs font-bold uppercase">{social[0]}</span>
                      )}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Col 2: First Navigation Group */}
          {linksData[1] && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {linksData[1].title}
              </h3>
              <ul className="mt-3.5 space-y-2 text-xs text-slate-600">
                {linksData[1].links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className="transition-colors hover:text-red-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 3: Second Navigation Group */}
          {linksData[0] && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {linksData[0].title}
              </h3>
              <ul className="mt-3.5 space-y-2 text-xs text-slate-600">
                {linksData[0].links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className="transition-colors hover:text-red-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 4: Fast Support Card */}
          <div className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-700">
                خدمة العملاء متاحة الآن
              </span>
            </div>

            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-500">
              متابعة الشحنات وتأكيد مقاس سيارتك متاح يومياً من 10:00 ص حتى 11:00 م.
            </p>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs font-bold text-red-700 transition-all hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>محادثة فورية عبر واتساب</span>
              </a>
            )}
          </div>
        </div>

        {/* Sub-Footer Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 py-5 text-xs text-slate-500 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-2xs font-medium">
              الدفع عند الاستلام (COD)
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-2xs font-medium">
              إنستاباي / محافظ إلكترونية
            </span>
            <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 shadow-2xs font-medium">
              بطاقات بنكية
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                reloadDocument={shouldForceDocumentNavigation}
                className="transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="font-mono text-slate-400 text-xs">
            {copyrightText || `© 2026 ${displayStoreName}. جميع الحقوق محفوظة.`}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AutomotiveFooter;
