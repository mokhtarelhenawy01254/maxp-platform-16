import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  footerSettingsService,
  FooterSettings,
} from "../../services/footerSettingsService";
import { storefrontSettingsService } from "../../services/storefrontSettingsService";
import { getCompanyId, storefrontFetch } from "../../utils/storefrontApi";
import { useStorefrontThemeOptions } from "../../hooks/useStorefrontThemeOptions";
import { tokenManager } from "../../utils/tokenManager";

// Variants
import FooterVogue from "./footer-variants/FooterVogue";
import FooterBold from "./footer-variants/FooterBold";
import FooterMagazine from "./footer-variants/FooterMagazine";
import FooterCreative from "./footer-variants/FooterCreative";
import FooterElite from "./footer-variants/FooterElite";
import FooterLuxe from "./footer-variants/FooterLuxe";
import { Link } from "react-router-dom";
import { withStorefrontCompany } from "../../utils/storefrontLinks";

interface StorePage {
  id: string;
  title: string;
  slug: string;
  showInFooter: boolean;
  isActive: boolean;
}

interface FooterPageLink {
  id: string;
  title: string;
  slug: string;
}

type FooterLayoutVariant = "columns" | "minimal" | "stacked" | "elite";

type FooterSectionText = string | { ar?: string; [key: string]: unknown };

interface FooterSectionSettings {
  aboutStore?: FooterSectionText;
  copyrightText?: FooterSectionText;
  variant?: string;
  [key: string]: unknown;
}

interface FooterSectionConfig {
  settings?: FooterSectionSettings;
  [key: string]: unknown;
}

interface FooterProps {
  layoutVariant?: FooterLayoutVariant;
  section?: FooterSectionConfig;
  context?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const resolveSectionText = (value: FooterSectionText | undefined): string => {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value["ar"] === "string") {
    return value["ar"];
  }

  return "";
};

const getStoredUserCompanyId = (): string | null => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;

    const parsed = JSON.parse(storedUser) as { companyId?: string | null };
    return parsed?.companyId || null;
  } catch {
    return null;
  }
};

const CORE_STORE_LINKS = [
  { label: "المنتجات", path: "/shop" },
  { label: "السلة", path: "/shop/cart" },
  { label: "تتبع الطلب", path: "/shop/track-order" },
  { label: "تواصل معنا", path: "/contact" },
];

const defaultFooterSettings = (): FooterSettings => ({
  aboutStore: "نحن متجرك ونقدم أفضل المنتجات والخدمات لعملائنا الكرام.",
  showAboutStore: true,
  email: "",
  showEmail: true,
  phone: "",
  showPhone: true,
  address: "",
  showAddress: true,
  showQuickLinks: true,
  copyrightText: "© {year} متجرك. جميع الحقوق محفوظة.",
  showCopyright: true,
});

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const asOptionalText = (value: unknown): string =>
  String(value ?? "").trim();

const asOptionalBool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const SUPPORTED_FOOTER_STYLES = new Set([
  "default",
  "vogue",
  "bold",
  "magazine",
  "creative",
  "elite",
  "elite-v3",
  "luxe",
]);
const warnedUnknownFooterStyles = new Set<string>();

const resolveFooterStyle = (rawStyle?: string | null): string | null => {
  const normalized = String(rawStyle || "").trim().toLowerCase();
  if (!normalized) return null;
  if (SUPPORTED_FOOTER_STYLES.has(normalized)) {
    return normalized;
  }
  if (!warnedUnknownFooterStyles.has(normalized)) {
    console.warn(
      `[Footer] Unsupported footer style "${normalized}". Rendering default footer.`,
    );
    warnedUnknownFooterStyles.add(normalized);
  }
  return null;
};

const mergeStudioFooterContent = (
  current: FooterSettings | null,
  studioDesignTokens: unknown,
): FooterSettings => {
  const base = {
    ...defaultFooterSettings(),
    ...(current || {}),
  };

  const tokens = isRecord(studioDesignTokens) ? studioDesignTokens : null;
  const source =
    tokens && isRecord(tokens["footerContentStudio"])
      ? (tokens["footerContentStudio"] as Record<string, unknown>)
      : null;

  if (!source) {
    return base;
  }

  return {
    ...base,
    aboutStore: hasOwn(source, "aboutStore")
      ? asOptionalText(source["aboutStore"])
      : base.aboutStore,
    showAboutStore: hasOwn(source, "showAboutStore")
      ? asOptionalBool(source["showAboutStore"], base.showAboutStore)
      : base.showAboutStore,
    email: hasOwn(source, "email") ? asOptionalText(source["email"]) : base.email,
    showEmail: hasOwn(source, "showEmail")
      ? asOptionalBool(source["showEmail"], base.showEmail)
      : base.showEmail,
    phone: hasOwn(source, "phone") ? asOptionalText(source["phone"]) : base.phone,
    showPhone: hasOwn(source, "showPhone")
      ? asOptionalBool(source["showPhone"], base.showPhone)
      : base.showPhone,
    address: hasOwn(source, "address")
      ? asOptionalText(source["address"])
      : base.address,
    showAddress: hasOwn(source, "showAddress")
      ? asOptionalBool(source["showAddress"], base.showAddress)
      : base.showAddress,
    showQuickLinks: hasOwn(source, "showQuickLinks")
      ? asOptionalBool(source["showQuickLinks"], base.showQuickLinks)
      : base.showQuickLinks,
    showCopyright: hasOwn(source, "showCopyright")
      ? asOptionalBool(source["showCopyright"], base.showCopyright)
      : base.showCopyright,
    copyrightText: hasOwn(source, "copyrightText")
      ? asOptionalText(source["copyrightText"])
      : base.copyrightText,
  };
};

const Footer: React.FC<FooterProps> = ({ layoutVariant = "columns", section }) => {
  const { themeOptions } = useStorefrontThemeOptions();
  const footerThemeOptions = themeOptions.footer;
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [overriddenStyle, setOverriddenStyle] = useState<string | null>(null);
  const [storePages, setStorePages] = useState<StorePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedCompanyIdState, setResolvedCompanyIdState] = useState<string | null>(null);
  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  // Simple in-module cache to avoid duplicate API calls across re-renders
  const settingsCacheRef = React.useRef<{ companyId: string; data: FooterSettings } | null>(null);

  const resolveCompanyId = useCallback((): string | null => {
    const urlCompanyId = searchParams.get("companyId");
    if (urlCompanyId) return urlCompanyId;

    return (
      localStorage.getItem("storefront_companyId") ||
      getStoredUserCompanyId() ||
      localStorage.getItem("currentCompanyId") ||
      localStorage.getItem("companyId") ||
      getCompanyId() ||
      null
    );
  }, [searchParams]);

  const loadFooterSettings = useCallback(async () => {
    try {
      const companyId = resolveCompanyId();
      if (companyId) setResolvedCompanyIdState(companyId);

      if (companyId && settingsCacheRef.current?.companyId === companyId) {
        setSettings(settingsCacheRef.current.data);
        setLoading(false);
        return;
      }

      let resolvedSettings: FooterSettings | null = null;

      if (companyId) {
        try {
          const publicResponse = await footerSettingsService.getPublicSettings(companyId);
          if (publicResponse?.["success"] && publicResponse?.["data"]) {
            resolvedSettings = publicResponse["data"] as FooterSettings;
          }
        } catch { /* ignore */ }
      }

      if (!resolvedSettings && tokenManager.getAccessToken()) {
        try {
          const authResponse = await footerSettingsService.getSettings();
          const payload = authResponse?.["data"] as unknown as Record<string, unknown>;
          if (payload?.["data"] && typeof payload["data"] === "object") {
            resolvedSettings = payload["data"] as FooterSettings;
          } else if (authResponse?.["data"]) {
            resolvedSettings = authResponse["data"] as unknown as FooterSettings;
          }
        } catch { /* ignore */ }
      }

      if (companyId === "preview" && section?.settings) {
         const previewAboutStore = resolveSectionText(section.settings.aboutStore);
         const previewCopyrightText = resolveSectionText(
           section.settings.copyrightText,
         );
         // Merge manifest-driven settings if in preview mode
         resolvedSettings = {
           ...(resolvedSettings || defaultFooterSettings()),
           aboutStore: previewAboutStore || resolvedSettings?.aboutStore,
           copyrightText:
             previewCopyrightText || resolvedSettings?.copyrightText,
          };
      }

      if (companyId && resolvedSettings) {
        try {
          const storefrontResponse = await storefrontSettingsService.getPublicSettings(companyId);
          if (storefrontResponse?.success && storefrontResponse?.data) {
            const designTokens = storefrontResponse.data.designTokens;

            // 1. Sync Content
            if (isRecord(designTokens) && isRecord(designTokens["footerContentStudio"])) {
              resolvedSettings = mergeStudioFooterContent(resolvedSettings, designTokens);
            }

            // 2. Sync Style (Priority: designTokens > themeOptions)
            if (isRecord(designTokens)) {
              const studioThemeOptions = isRecord(designTokens["themeOptions"]) ? designTokens["themeOptions"] as Record<string, unknown> : null;
              const studioFooter = studioThemeOptions && isRecord(studioThemeOptions["footer"]) ? studioThemeOptions["footer"] as Record<string, unknown> : null;
              const studioStyle = studioFooter?.["footerStyle"];

              if (typeof studioStyle === "string") {
                setOverriddenStyle(resolveFooterStyle(studioStyle));
              } else {
                // Fallback to layoutStudio if available (legacy or direct merge)
                const layoutStudio = isRecord(designTokens["layoutStudio"]) ? designTokens["layoutStudio"] as Record<string, unknown> : null;
                const layoutFooter = layoutStudio && isRecord(layoutStudio["footer"]) ? layoutStudio["footer"] as Record<string, unknown> : null;
                if (typeof layoutFooter?.["style"] === "string") {
                  setOverriddenStyle(layoutFooter["style"] as string);
                }
              }
            }
          }
        } catch { /* ignore */ }
      }

      const finalSettings = resolvedSettings || defaultFooterSettings();
      if (companyId) settingsCacheRef.current = { companyId, data: finalSettings };
      setSettings(finalSettings);
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error("❌ [Footer] Error loading settings:", error);
      setSettings(defaultFooterSettings());
    } finally {
      setLoading(false);
    }
  }, [resolveCompanyId, section?.settings]);

  const loadStorePages = useCallback(async () => {
    try {
      const companyId = resolveCompanyId();
      if (!companyId) return;
      const response = await storefrontFetch(`/store-pages/${companyId}/public`);
      if (response?.success && Array.isArray(response?.data)) {
        setStorePages(response.data.filter((page: StorePage) => page.showInFooter && page.isActive));
      }
    } catch {
      setStorePages([]);
    }
  }, [resolveCompanyId]);

  const handleNewsletterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || newsletterStatus === "loading") return;
    setNewsletterStatus("loading");
    try {
      const companyId = resolvedCompanyIdState || resolveCompanyId();
      if (!companyId) throw new Error("no company");
      await storefrontFetch(`/store-pages/${companyId}/newsletter-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      setNewsletterStatus("success");
      setNewsletterEmail("");
    } catch {
      setNewsletterStatus("error");
    }
  }, [newsletterEmail, newsletterStatus, resolvedCompanyIdState, resolveCompanyId]);

  useEffect(() => {
    loadFooterSettings();
    loadStorePages();
  }, [loadFooterSettings, loadStorePages]);

  if (loading) {
    return (
      <footer className="storefront-footer py-12 mt-auto border-t footer-border animate-pulse">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-full" />
              <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded w-3/4" />
            </div>
          ))}
        </div>
      </footer>
    );
  }

  const resolvedCompanyId = resolvedCompanyIdState || resolveCompanyId();
  const finalSettings = settings || defaultFooterSettings();
  const footerPages: FooterPageLink[] = storePages.map(p => ({ id: p.id, title: p.title, slug: p.slug }));

  // ROUTER LOGIC: Select variant based on footerStyle (Priority: URL > Manifest > Studio Override > Theme Options)
  const urlStyle = searchParams.get("footerStyle");
  const manifestVariant = section?.settings?.variant;

  const style =
    resolveFooterStyle(urlStyle) ||
    resolveFooterStyle(manifestVariant) ||
    resolveFooterStyle(overriddenStyle) ||
    resolveFooterStyle(footerThemeOptions.footerStyle) ||
    "default";

  if (style === "vogue") {
    return <FooterVogue companyId={resolvedCompanyId} settings={finalSettings} storePages={footerPages} />;
  }

  if (style === "bold") {
    return (
      <FooterBold
        companyId={resolvedCompanyId}
        settings={finalSettings}
        storePages={footerPages}
        newsletterEmail={newsletterEmail}
        onNewsletterEmailChange={setNewsletterEmail}
        newsletterStatus={newsletterStatus}
        onNewsletterSubmit={handleNewsletterSubmit}
      />
    );
  }

  if (style === "magazine") {
    return <FooterMagazine companyId={resolvedCompanyId} settings={finalSettings} storePages={footerPages} />;
  }

  if (style === "creative") {
    return (
      <FooterCreative
        companyId={resolvedCompanyId}
        settings={finalSettings}
        storePages={footerPages}
        newsletterEmail={newsletterEmail}
        onNewsletterEmailChange={setNewsletterEmail}
        newsletterStatus={newsletterStatus}
        onNewsletterSubmit={handleNewsletterSubmit}
      />
    );
  }

  if (style === "luxe") {
    return (
      <FooterLuxe
        companyId={resolvedCompanyId}
        settings={finalSettings}
        storePages={footerPages}
      />
    );
  }
  if (style === "elite" || style === "elite-v3" || layoutVariant === "elite") {
    return (
      <FooterElite
        companyId={resolvedCompanyId}
        settings={finalSettings}
        storePages={footerPages}
      />
    );
  }

  // DEFAULT FOOTER (existing implementation)
  const isMinimal = layoutVariant === "minimal";
  const isStacked = layoutVariant === "stacked";
  const gridClass = isStacked
    ? "grid grid-cols-1 gap-10 text-center"
    : isMinimal
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
      : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16";

  const companyDisplayName =
    finalSettings.copyrightText?.match(/©\s*\d{4}\s*([^.]+)/)?.[1]?.trim() || "متجرك";

  return (
    <footer className={`storefront-footer ${isMinimal ? "py-12" : isStacked ? "py-16" : footerThemeOptions.compactMode ? "py-12" : "py-20"} mt-auto border-t footer-border`}>
      <div className="max-w-[1800px] mx-auto px-6 lg:px-12">
        <div className={gridClass}>
          {finalSettings.showAboutStore && (
            <div className="space-y-8">
              <h2 className="text-2xl font-serif tracking-[0.2em]" style={{ fontFamily: "var(--theme-font-heading)" }}>{companyDisplayName}</h2>
              <p className="text-[12px] leading-relaxed footer-muted tracking-wider">{finalSettings.aboutStore}</p>
            </div>
          )}

          {finalSettings.showQuickLinks && (
            <div className={`space-y-8 ${isStacked ? "mx-auto" : ""}`}>
              <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold footer-accent">روابط المتجر</h4>
              <ul className="space-y-4">
                {CORE_STORE_LINKS.map((item) => (
                  <li key={item.path}>
                    <Link to={withStorefrontCompany(item.path, resolvedCompanyId)} className="text-[11px] uppercase tracking-[0.2em] footer-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {footerThemeOptions.showContactBlock && (
            <div className="space-y-8">
              <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold footer-accent">بيانات التواصل</h4>
              <ul className="space-y-4">
                {finalSettings.showEmail && finalSettings.email && (
                  <li><a href={`mailto:${finalSettings.email}`} className="text-[11px] uppercase tracking-[0.2em] footer-link">{finalSettings.email}</a></li>
                )}
                {finalSettings.showPhone && finalSettings.phone && (
                  <li><a href={`tel:${finalSettings.phone}`} className="text-[11px] uppercase tracking-[0.2em] footer-link">{finalSettings.phone}</a></li>
                )}
                {finalSettings.showAddress && finalSettings.address && (
                  <li className="text-[11px] uppercase tracking-[0.2em] footer-link">{finalSettings.address}</li>
                )}
                <li><Link to={withStorefrontCompany("/contact", resolvedCompanyId)} className="text-[11px] uppercase tracking-[0.2em] footer-link">صفحة التواصل</Link></li>
              </ul>
            </div>
          )}

          <div className="space-y-8">
            {footerThemeOptions.showNewsletter && !isMinimal && (
              <>
                <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold footer-accent">النشرة البريدية</h4>
                {newsletterStatus === "success" ? (
                  <p className="text-[11px] tracking-wider footer-muted">✓ تم تسجيلك بنجاح، شكراً!</p>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex border-b footer-border pb-2">
                    <input
                      type="email" required value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="اكتب بريدك الإلكتروني"
                      className="bg-transparent text-[10px] w-full focus:outline-none footer-muted tracking-wider"
                    />
                    <button type="submit" disabled={newsletterStatus === "loading"} className="text-[10px] uppercase tracking-widest font-bold disabled:opacity-50">
                      {newsletterStatus === "loading" ? "..." : "اشتراك"}
                    </button>
                  </form>
                )}
                {newsletterStatus === "error" && (
                  <p className="mt-2 text-[10px] text-red-500 tracking-wider">
                    حدث خطأ أثناء الاشتراك. حاول مرة أخرى.
                  </p>
                )}
              </>
            )}

            {footerThemeOptions.showPolicyLinks && footerPages.length > 0 && (
              <ul className="space-y-2 pt-4">
                {footerPages.map((page) => (
                  <li key={page.id}>
                    <Link to={withStorefrontCompany(`/shop/page/${page.slug}`, resolvedCompanyId)} className="text-[10px] uppercase tracking-[0.2em] footer-link">{page.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={`${isMinimal ? "mt-12" : "mt-24"} pt-8 border-t footer-border flex ${isStacked ? "flex-col" : "flex-col md:flex-row justify-between"} items-center gap-6`}>
          {finalSettings.showCopyright && (
            <p className="text-[10px] uppercase tracking-[0.3em] footer-muted">
              {finalSettings.copyrightText?.replace("{year}", new Date().getFullYear().toString()) || `© ${new Date().getFullYear()} ${companyDisplayName}. جميع الحقوق محفوظة.`}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
