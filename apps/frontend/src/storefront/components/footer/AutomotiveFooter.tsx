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
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      title: "ضمان استبدال فوري 14 يوم",
      desc: "حق استبدال كامل وسريع بدون أي تعقيدات إذا لم يطابق المقاس",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "تفصيل فابريقة بالمللي",
      desc: "شاسيه حديد صلب مرن غير قابل للكسر مطابق لقائم سيارتك 100%",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      ),
    },
    {
      title: "شحن وتوصيل لجميع المحافظات",
      desc: "تغليف مصفح مخصص للحفاظ على الشاسيه مع طقم كبس تثبيت مجاني",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      className="relative w-full overflow-hidden border-t border-zinc-800 bg-[#09090b] text-zinc-300"
    >
      {/* Machined Red Line Accent */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent" />

      {/* Subtle Ambient Radial Highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-56 w-[36rem] rounded-full bg-red-950/20 blur-[120px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Pre-Footer Trust Bar */}
        <div className="grid grid-cols-1 divide-y divide-zinc-800/80 border-b border-zinc-800/80 py-8 sm:grid-cols-2 sm:divide-y-0 sm:gap-6 lg:grid-cols-4 lg:divide-x lg:divide-y-0 lg:divide-zinc-800/80 rtl:lg:divide-x-reverse">
          {trustBadges.map((badge, idx) => (
            <div
              key={badge.title}
              className={`flex items-start gap-3.5 py-4 sm:py-0 ${idx !== 0 ? "lg:px-6" : "lg:pe-6"}`}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
                {badge.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white">{badge.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Col 1: Brand & Contact Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="font-heading text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {displayStoreName}
              </span>
              <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-400 uppercase">
                Original Auto
              </span>
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              {descriptionText ||
                "المتخصص الأول في مصر في ستائر شبابيك السيارات العازلة للشمس والحرارة بنسبة 98%. تفصيل وثني شاسيه حديد مرن بالمللي مع المعاينة والتجربة قبل الدفع."}
            </p>

            {/* Clean Contact Details */}
            {contactRows.length > 0 && (
              <div className="space-y-2.5 pt-2 text-xs text-zinc-300">
                {contactRows.map((row) => (
                  <div key={`${row.label}-${row.value}`} className="flex items-center gap-2">
                    <span className="text-zinc-500">{row.label}:</span>
                    {row.href ? (
                      <a
                        href={row.href}
                        dir="ltr"
                        className="font-mono text-zinc-200 transition-colors hover:text-red-400"
                      >
                        {row.value}
                      </a>
                    ) : (
                      <span className="font-mono text-zinc-200">{row.value}</span>
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
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/90 text-zinc-400 transition-all hover:border-red-500/40 hover:bg-zinc-800 hover:text-white"
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                {linksData[1].title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-xs text-zinc-400">
                {linksData[1].links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className="transition-colors hover:text-red-400"
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                {linksData[0].title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-xs text-zinc-400">
                {linksData[0].links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      reloadDocument={shouldForceDocumentNavigation}
                      className="transition-colors hover:text-red-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Col 4: Fast Support & Dispatch Telemetry */}
          <div className="space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                متاح لاستقبال وتأكيد الطلبات
              </span>
            </div>

            <p className="text-xs leading-relaxed text-zinc-400">
              خدمة العملاء ومتابعة الشحنات متواجدة يومياً من 10:00 صباحاً حتى 11:00 مساءً.
            </p>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-600/40 bg-red-600/10 px-4 py-2.5 text-xs font-bold text-red-300 transition-all hover:border-red-500 hover:bg-red-600 hover:text-white active:scale-[0.98]"
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
        <div className="flex flex-col items-center justify-between gap-4 border-t border-zinc-800/80 py-6 text-xs text-zinc-400 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-300">
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5">
              الدفع عند الاستلام (COD)
            </span>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5">
              إنستاباي / محافظ إلكترونية
            </span>
            <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5">
              بطاقات بنكية
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                reloadDocument={shouldForceDocumentNavigation}
                className="transition-colors hover:text-zinc-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="font-mono text-zinc-400">
            {copyrightText || `© 2026 ${displayStoreName}. جميع الحقوق محفوظة.`}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AutomotiveFooter;
