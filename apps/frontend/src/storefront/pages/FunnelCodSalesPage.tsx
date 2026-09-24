/**
 * FunnelCodSalesPage.tsx
 * =====================
 * Phase 3 — COD Sales Landing Page (#3 of 4 product display shapes).
 *
 * This is the "Easy Orders style" landing page: a single-page, conversion-optimised
 * layout built for D2C ad campaigns. Unlike the existing ProductImageLandingPage
 * (which is image-slice driven), this page is SECTION-driven — it composes the
 * existing storefront blocks (Countdown, LowStock, SoldCounter, PurchaseFomo,
 * QuantityOffers, Reviews, TrustBadges) into a high-conversion COD flow.
 *
 * Route (mounted by App.tsx):
 *   /{subdomain}/funnel/{slug}
 *
 * Expected backend response (POST /api/v1/funnels/public/{slug}):
 *   {
 *     funnel: { id, slug, title, status, ... },
 *     product: { id, name, price, comparePrice, images, ... },
 *     company: { id, name, slug, currency },
 *     config: {
 *       heroTitle, heroSubtitle, heroImage, heroBadge,
 *       bundleTiers: [{ qty, price, originalPrice, label, popular, bestValue, freeShipping }],
 *       features: [{ title, desc, icon }],
 *       reviews: [{ name, text, rating, verified, avatar }],
 *       trustBadges: [{ icon, title, desc }],
 *       offerEndsAt: ISO timestamp,
 *       lowStockCount: number,
 *       soldCount: number,
 *     }
 *   }
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EGYPT_GOVERNORATES } from "../../constants/egyptGovernorates";
import { getCompanyId, storefrontApi } from "../../utils/storefrontApi";
import type { Product } from "../hooks/useProducts";
import { buildCheckoutOrderPayload } from "../hooks/useCheckout";
import { formatStorefrontCurrency } from "../utils/currency";
import { getPrimaryProductImage } from "../utils/productImages";
import { buildStorefrontPath } from "../utils/paths";
import { persistPurchaseTracking } from "../utils/purchaseTrackingStorage";
import { captureStorefrontAttribution } from "../utils/orderAttribution";
import type { CartItem } from "../store/useCartStore";

import CountdownBlock from "../sections/ConversionBlocks/CountdownBlock";
import LowStockBlock from "../sections/ConversionBlocks/LowStockBlock";
import SoldCounterBlock from "../sections/ConversionBlocks/SoldCounterBlock";
import "./FunnelCodSalesPage.css";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface BundleTier {
  qty: number;
  price: number;
  originalPrice?: number;
  label: string;
  popular?: boolean;
  bestValue?: boolean;
  freeShipping?: boolean;
}

interface FeatureItem {
  title: string;
  desc: string;
  icon?: string; // emoji or key
}

interface ReviewItem {
  name: string;
  text: string;
  rating: number;
  verified?: boolean;
  avatar?: string;
}

interface TrustBadge {
  icon: string; // emoji
  title: string;
  desc: string;
}

interface FunnelConfig {
  heroTitle: string;
  heroSubtitle?: string;
  heroOverline?: string;
  heroImage?: string;
  heroBadge?: string; // e.g. "خصم 29%!"
  rating?: { value: number; count: number; label?: string };
  offerEndsAt?: string; // ISO timestamp
  lowStockCount?: number;
  soldCount?: number;
  fomoMessages?: string[];
  bundleTiers: BundleTier[];
  features: FeatureItem[];
  reviews: ReviewItem[];
  trustBadges: TrustBadge[];
  orderKicker?: string;
  orderTitle?: string;
  orderCopy?: string;
  buttonLabel?: string;
}

interface PublicFunnel {
  id: string;
  companyId: string;
  productId: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "PAUSED";
  config: FunnelConfig;
}

interface FunnelResponse {
  funnel: PublicFunnel;
  product: Product;
  company: {
    id: string;
    name?: string;
    slug?: string;
    logo?: string | null;
    currency?: string | null;
  };
}

interface OrderFormState {
  customerName: string;
  phone: string;
  governorate: string;
  area: string;
  address: string;
  quantity: number;
  notes?: string;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const DEFAULT_FOMO_POOL = [
  "أحمد من القاهرة اشترى للتو 3 قطع",
  "سارة من الإسكندرية اشترت للتو قطعة واحدة",
  "محمد من الجيزة اشترى للتو 3 قطع",
  "منى من المنصورة اشترت للتو قطعتين",
  "كريم من أسيوط اشترى للتو قطعة واحدة",
  "يوسف من طنطا اشترى للتو قطعتين",
  "جنى من شبرا اشترت للتو قطعة واحدة",
];

const DEFAULT_COMPANY = {
  id: "",
  name: "",
  slug: "",
  currency: "EGP",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (!parts.length) return "?";
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
};

const formatTime = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
};

const computeRemaining = (endAt: string | undefined): number => {
  if (!endAt) return 0;
  const ts = Date.parse(endAt);
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, ts - Date.now());
};

// ────────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────────

const FunnelCodSalesPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<OrderFormState>({
    customerName: "",
    phone: "",
    governorate: "",
    area: "",
    address: "",
    quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  // Ad-campaign measurement: capture UTMs/click-ids at landing entry so the
  // order attribution snapshot survives navigation before checkout.
  useEffect(() => {
    captureStorefrontAttribution(funnel?.companyId || company?.id);
  }, [funnel?.companyId, company?.id]);

  // Countdown state
  const [remainingMs, setRemainingMs] = useState<number>(0);

  // FOMO rotation
  const [fomoIndex, setFomoIndex] = useState(0);
  const [fomoVisible, setFomoVisible] = useState(false);

  // Load funnel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resolvedCompanyId = getCompanyId();
        const res = (await storefrontApi.getFunnel?.(slug, {
          companyId: resolvedCompanyId ?? undefined,
        })) as FunnelResponse | null;
        if (cancelled) return;
        if (res?.funnel && res?.product) {
          setFunnel(res.funnel);
          setProduct(res.product);
          if (res.company) {
            setCompany({
              id: res.company.id,
              name: res.company.name || "",
              slug: res.company.slug || "",
              currency: res.company.currency || "EGP",
            });
          }
        } else {
          setError("not_found");
        }
      } catch (err) {
        // No demo fallback: a 404 means the slug is wrong/unpublished, and
        // anything else is a transient store error. Ad traffic must never
        // land on placeholder content.
        if (!cancelled) {
          const status = (err as { status?: number } | null)?.status;
          setError(status === 404 ? "not_found" : "unavailable");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined" || !company?.slug) return;
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === "maxp.online" || hostname === "www.maxp.online") {
      const targetUrl = `https://${company.slug}.maxp.online${window.location.pathname}${window.location.search}`;
      window.location.replace(targetUrl);
    }
  }, [company]);

  const config = funnel?.config ?? null;

  // Sync document.title and meta tags for dynamic COD Funnel landing page
  useEffect(() => {
    const pageTitle = funnel?.title || product?.name || config?.heroTitle;
    const storeName = company?.name || "MaxP";
    const fullTitle = pageTitle ? `${pageTitle} | ${storeName}` : `عرض خاص | ${storeName}`;
    const previousTitle = document.title;
    document.title = fullTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc?.getAttribute("content");
    const newDesc = config?.heroSubtitle || product?.description || "اطلب الآن بأفضل سعر مع شحن سريع ودفع عند الاستلام";
    if (metaDesc) {
      metaDesc.setAttribute("content", newDesc);
    }

    return () => {
      document.title = previousTitle;
      if (metaDesc && previousDesc) {
        metaDesc.setAttribute("content", previousDesc);
      }
    };
  }, [funnel?.title, product?.name, product?.description, config?.heroTitle, config?.heroSubtitle, company?.name]);

  // Countdown timer
  useEffect(() => {
    const tick = () => setRemainingMs(computeRemaining(config?.offerEndsAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [config?.offerEndsAt]);

  // FOMO rotation
  useEffect(() => {
    const show = () => {
      setFomoVisible(true);
      window.setTimeout(() => setFomoVisible(false), 4500);
    };
    const first = window.setTimeout(show, 5000);
    const loop = window.setInterval(() => {
      setFomoIndex((i) => i + 1);
      show();
    }, 14000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
    };
  }, []);

  const fomoMessages = useMemo(
    () => (config?.fomoMessages && config.fomoMessages.length ? config.fomoMessages : DEFAULT_FOMO_POOL),
    [config?.fomoMessages],
  );

  const heroImage = useMemo(
    () =>
      config?.heroImage ||
      (product ? getPrimaryProductImage(product.images) : "") ||
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200",
    [config?.heroImage, product],
  );

  // Active tier
  const activeTier = useMemo(
    () => config?.bundleTiers.find((t) => t.qty === form.quantity) ?? config?.bundleTiers[0] ?? null,
    [config?.bundleTiers, form.quantity],
  );

  // A bundle tier's price is the TOTAL for the tier's quantity (e.g.
  // { qty: 3, price: 717 } = 717 EGP for all three pieces) — never multiply
  // it by the quantity again.
  const subtotal = activeTier ? activeTier.price : Number(product?.price || 0);

  const handleChange = <K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!funnel || !product) return;
    if (!form.customerName.trim() || !form.phone.trim() || !form.governorate.trim() || !form.address.trim()) {
      toast.error("من فضلك أكمل البيانات المطلوبة");
      return;
    }
    try {
      setSubmitting(true);
      // Create a REAL order through the same storefront pipeline the cart
      // checkout and ProductImageLandingPage use. The funnel order endpoint
      // is only a conversion counter — it never persisted customer data,
      // which used to silently drop every order placed on this page.
      const tierTotal = activeTier ? activeTier.price : Number(product.price || 0);
      const quantity = Math.max(1, form.quantity || activeTier?.qty || 1);
      const unitPrice = Math.round((tierTotal / quantity) * 100) / 100;

      const pixelEventId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const landingAttribution = {
        source: "cod_funnel",
        landingPageId: funnel.id || null,
        landingPageSlug: funnel.slug,
        generationMode: "QUICK_FUNNEL",
      };

      const items: CartItem[] = [
        {
          id: `${product.id}-funnel`,
          productId: product.id,
          name: product.name,
          price: unitPrice,
          basePrice: Number(product.price || 0),
          quantity,
          imageUrl: heroImage,
          attributes: {},
        },
      ];

      const payload = buildCheckoutOrderPayload(
        {
          customerName: form.customerName.trim(),
          email: "",
          phone: form.phone.replace(/\s+/g, ""),
          address: form.address.trim(),
          city: form.area.trim() || form.governorate.trim(),
          governorate: form.governorate.trim(),
          notes: [
            form.notes?.trim() ? `ملاحظات العميل: ${form.notes.trim()}` : "",
            activeTier ? `عرض الباقة: ${activeTier.label} (${quantity} قطع)` : "",
            `Funnel Slug: ${funnel.slug}`,
            funnel.id ? `Funnel ID: ${funnel.id}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
          paymentMethod: "cod",
          shippingCost: 0,
          subtotal: tierTotal,
          total: tierTotal,
        },
        items,
        tierTotal,
        funnel.companyId || getCompanyId() || undefined,
        pixelEventId,
      ) as Record<string, unknown>;

      const payloadItems = Array.isArray(payload["items"]) ? payload["items"] : [];
      payload["items"] = payloadItems.map((payloadItem) =>
        isRecord(payloadItem)
          ? {
              ...payloadItem,
              metadata: {
                ...(isRecord(payloadItem["metadata"]) ? payloadItem["metadata"] : {}),
                landingPage: landingAttribution,
              },
            }
          : payloadItem,
      );
      payload["attribution"] = {
        ...(isRecord(payload["attribution"]) ? payload["attribution"] : {}),
        landingPage: landingAttribution,
      };

      const response = await storefrontApi.createOrder(payload);
      if (!response?.success) {
        throw new Error(response?.message || "تعذر إرسال الطلب الآن.");
      }

      const orderId = response?.data?.orderNumber || response?.data?.id || "success";

      // Best-effort conversion counter (same funnel row).
      storefrontApi
        .trackFunnelOrder?.(funnel.slug, { orderId })
        .catch(() => undefined);

      const purchaseTracking = {
        eventId: pixelEventId,
        orderNumber: String(orderId),
        total: Number(response?.data?.finalTotal ?? response?.data?.total ?? tierTotal),
        phone: form.phone,
        customerName: form.customerName,
        paymentMethod: "cod" as const,
        items: items.map((it) => ({
          id: it.id,
          productId: it.productId,
          variantId: it.variantId || undefined,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          imageUrl: it.imageUrl,
          attributes: it.attributes || {},
        })),
      };
      persistPurchaseTracking(
        purchaseTracking,
        funnel?.companyId || company?.id,
      );

      toast.success("تم إرسال طلبك بنجاح!");
      const thankYouPath = buildStorefrontPath(
        location.pathname,
        `/thank-you?orderId=${encodeURIComponent(String(orderId))}`,
        location.search,
      );
      navigate(thankYouPath, {
        state: { purchaseTracking },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "حصل مشكلة، حاول تاني.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !funnel) {
    return (
      <div className="fcs-root" dir="rtl">
        <div className="fcs-loading">جاري تحميل الصفحة…</div>
      </div>
    );
  }

  if (error || !funnel || !product || !config) {
    const isNotFound = error === "not_found";
    return (
      <div className="fcs-root" dir="rtl">
        <div className="fcs-error">
          <h1 className="fcs-error-title">
            {isNotFound ? "الصفحة غير متاحة" : "الصفحة غير متاحة مؤقتًا"}
          </h1>
          <p className="fcs-error-copy">
            {isNotFound
              ? "الرابط غير صحيح أو صفحة الهبوط دي مش منشورة."
              : "حصلت مشكلة مؤقتة في المتجر، جرّب تاني بعد شوية."}
          </p>
          <Link
            className="fcs-error-link"
            to={buildStorefrontPath(location.pathname, "/", location.search)}
          >
            الرجوع للمتجر
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fcs-root" dir="rtl">
      {/* Top bar: countdown + announcement */}
      <div className="fcs-topbar">
        <span className="fcs-topbar-label">ينتهي العرض خلال</span>
        <span className="fcs-topbar-count" data-testid="fcs-top-countdown">
          {formatTime(remainingMs)}
        </span>
      </div>
      {config.heroBadge && (
        <div className="fcs-promo">
          🎉 {config.heroBadge} + شحن مجاني على 3 قطع!
        </div>
      )}

      {/* Sticky Header */}
      <header className="fcs-header">
        <div className="fcs-header-inner">
          <div className="fcs-logo">
            {company.name?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="fcs-brand">{company.name?.toUpperCase() ?? "STORE"}</div>
          <nav className="fcs-nav">
            <a href="#tiers">العروض</a>
            <a href="#reviews">الآراء</a>
            <a href="#order">اطلب</a>
          </nav>
          <div className="fcs-trust-pill">
            <span>🔒</span>
            <span>دفع آمن</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="fcs-section fcs-hero">
        <div className="fcs-hero-img">
          <img src={heroImage} alt={config.heroTitle} loading="eager" />
          {config.heroBadge && (
            <span className="fcs-hero-discount">{config.heroBadge}</span>
          )}
        </div>
        <div className="fcs-hero-body">
          {config.heroOverline && (
            <span className="fcs-hero-overline">{config.heroOverline}</span>
          )}
          <h1 className="fcs-hero-title">{config.heroTitle}</h1>

          {config.rating && (
            <div className="fcs-rating">
              <span className="fcs-rating-stars">★★★★★</span>
              <span>
                {config.rating.value.toFixed(1)} ·{" "}
                {config.rating.count.toLocaleString("ar-EG")}{" "}
                {config.rating.label ?? "عميل سعيد"}
              </span>
            </div>
          )}

          <div className="fcs-price-row">
            <span className="fcs-price">
              {formatStorefrontCurrency(
                activeTier?.price ?? product.price ?? 0,
                company.currency ?? "EGP",
              )}
            </span>
            {activeTier?.originalPrice && (
              <span className="fcs-old-price">
                {formatStorefrontCurrency(
                  activeTier.originalPrice,
                  company.currency ?? "EGP",
                )}
              </span>
            )}
            {activeTier?.originalPrice && activeTier?.price && (
              <span className="fcs-discount-badge">
                خصم {Math.round((1 - activeTier.price / activeTier.originalPrice) * 100)}%
              </span>
            )}
          </div>

          {config.heroSubtitle && (
            <p className="fcs-hero-sub">{config.heroSubtitle}</p>
          )}

          <a href="#order" className="fcs-cta">
            🎁 {config.buttonLabel?.replace("تأكيد", "هاتلي") ?? "هاتلي الطلب"}
          </a>
        </div>
      </section>

      {/* CONVERSION STACK */}
      <section className="fcs-section fcs-conversion">
        <h2 className="fcs-h2">⏰ العرض بينتهي بعد</h2>
        <CountdownBlock
          label="العرض بينتهي بعد"
          summary={formatTime(remainingMs)}
        />

        {config.lowStockCount && config.lowStockCount > 0 && (
          <LowStockBlock
            count={config.lowStockCount}
            label={`باقي ${config.lowStockCount} قطعة من ${Math.max(config.lowStockCount * 5, 100)} بس`}
            style="alert"
          />
        )}

        {config.soldCount && config.soldCount > 0 && (
          <SoldCounterBlock
            count={config.soldCount}
            message={`✅ انبيع ${config.soldCount.toLocaleString("ar-EG")} قطعة في آخر 24 ساعة`}
          />
        )}
      </section>

      {/* BUNDLE TIERS */}
      <section className="fcs-section" id="tiers">
        <h2 className="fcs-h2">🎁 قطعة واحدة ولا 3 قطع؟</h2>
        <p className="fcs-section-sub">
          كل ما زودت الكمية، زاد الخصم. الشحن علينا على الـ 3 قطع.
        </p>
        <div className="fcs-tiers">
          {config.bundleTiers.map((tier) => {
            const isActive = form.quantity === tier.qty;
            return (
              <button
                key={tier.qty}
                type="button"
                className={[
                  "fcs-tier",
                  tier.popular ? "fcs-tier-popular" : "",
                  tier.bestValue ? "fcs-tier-best" : "",
                  isActive ? "fcs-tier-active" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => handleChange("quantity", tier.qty)}
                aria-pressed={isActive}
              >
                <div className="fcs-tier-qty">×{tier.qty}</div>
                <div className="fcs-tier-body">
                  <div className="fcs-tier-title">
                    {tier.label}
                    {tier.popular && <span className="fcs-pill fcs-pill-popular">الأكثر طلبًا</span>}
                    {tier.bestValue && <span className="fcs-pill fcs-pill-best">+ شحن مجاني</span>}
                  </div>
                  {tier.originalPrice && (
                    <div className="fcs-tier-save">
                      وفّر{" "}
                      {formatStorefrontCurrency(
                        tier.originalPrice - tier.price,
                        company.currency ?? "EGP",
                      )}
                    </div>
                  )}
                </div>
                <div className="fcs-tier-price">
                  <div className="fcs-tier-price-now">
                    {formatStorefrontCurrency(tier.price, company.currency ?? "EGP")}
                  </div>
                  {tier.originalPrice && (
                    <div className="fcs-tier-price-old">
                      {formatStorefrontCurrency(tier.originalPrice, company.currency ?? "EGP")}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section className="fcs-section">
        <h2 className="fcs-h2">💛 ليه هتحبها؟</h2>
        <div className="fcs-features">
          {config.features.map((f, idx) => (
            <div key={idx} className="fcs-feature">
              <div className="fcs-feature-ic">{f.icon ?? "✨"}</div>
              <h3 className="fcs-feature-title">{f.title}</h3>
              <p className="fcs-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="fcs-section" id="reviews">
        <h2 className="fcs-h2">⭐ الناس بتقول إيه؟</h2>
        <div className="fcs-reviews">
          {config.reviews.map((r, idx) => (
            <div key={idx} className="fcs-review">
              <div className="fcs-review-stars">
                {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
              </div>
              <p className="fcs-review-text">"{r.text}"</p>
              <div className="fcs-review-who">
                <div className="fcs-review-avatar">{r.avatar ?? initials(r.name)}</div>
                <div>
                  <div className="fcs-review-name">{r.name}</div>
                  {r.verified && <div className="fcs-review-verified">✓ مشتري موثّق</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="fcs-section">
        <div className="fcs-trust">
          {config.trustBadges.map((b, idx) => (
            <div key={idx} className="fcs-trust-item">
              <div className="fcs-trust-ic">{b.icon}</div>
              <h4>{b.title}</h4>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ORDER FORM */}
      <section className="fcs-section" id="order">
        <h2 className="fcs-h2">📦 {config.orderTitle ?? "كمّل طلبك"}</h2>
        {config.orderCopy && <p className="fcs-section-sub">{config.orderCopy}</p>}

        <form className="fcs-form" onSubmit={handleSubmit}>
          <div className="fcs-form-grid">
            <div>
              <label htmlFor="fcs-name">الاسم بالكامل *</label>
              <input
                id="fcs-name"
                type="text"
                required
                value={form.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="اكتب اسمك هنا"
              />
            </div>
            <div>
              <label htmlFor="fcs-phone">رقم الجوال *</label>
              <input
                id="fcs-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="01xxxxxxxxx"
              />
            </div>
            <div>
              <label htmlFor="fcs-gov">المحافظة *</label>
              <select
                id="fcs-gov"
                required
                value={form.governorate}
                onChange={(e) => handleChange("governorate", e.target.value)}
              >
                <option value="">اختار المحافظة</option>
                {EGYPT_GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fcs-area">المنطقة / الحي</label>
              <input
                id="fcs-area"
                type="text"
                value={form.area}
                onChange={(e) => handleChange("area", e.target.value)}
                placeholder="مثال: مدينة نصر"
              />
            </div>
            <div className="fcs-form-full">
              <label htmlFor="fcs-addr">العنوان بالكامل *</label>
              <textarea
                id="fcs-addr"
                required
                rows={2}
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="الشارع، رقم العمارة، الشقة..."
              />
            </div>
            <div className="fcs-form-full">
              <label htmlFor="fcs-qty">الكمية</label>
              <select
                id="fcs-qty"
                value={form.quantity}
                onChange={(e) => handleChange("quantity", Number(e.target.value))}
              >
                {config.bundleTiers.map((t) => (
                  <option key={t.qty} value={t.qty}>
                    ×{t.qty} — {formatStorefrontCurrency(t.price, company.currency ?? "EGP")}
                    {t.freeShipping ? " (شحن مجاني)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="fcs-form-full fcs-summary">
              <span>الإجمالي:</span>
              <strong>
                {formatStorefrontCurrency(subtotal, company.currency ?? "EGP")}
              </strong>
            </div>
            <div className="fcs-form-full fcs-cod">
              <label>
                <input type="radio" name="pay" defaultChecked />
                <span>💵 دفع عند الاستلام — هتدفع للكابتن بعد ما توصلك الطلب</span>
              </label>
            </div>
          </div>
          <button type="submit" className="fcs-submit" disabled={submitting}>
            {submitting ? "جاري الإرسال…" : `✅ ${config.buttonLabel ?? "تأكيد الطلب"}`}
          </button>
          <p className="fcs-foot">
            الدفع عند الاستلام متاح لكل المحافظات · الاستبدال متاح خلال 14 يوم
          </p>
        </form>
      </section>

      {/* FOMO Popup */}
      {fomoVisible && (
        <div className="fcs-fomo" role="status">
          <span className="fcs-fomo-dot" />
          <strong>{fomoMessages[fomoIndex % fomoMessages.length]}</strong>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fcs-sticky">
        <div className="fcs-sticky-img">🛍️</div>
        <div className="fcs-sticky-meta">
          <h4>{form.quantity} {form.quantity === 1 ? "قطعة" : "قطع"} {activeTier?.freeShipping ? "+ شحن مجاني" : ""}</h4>
          <div className="fcs-sticky-price">
            {activeTier
              ? formatStorefrontCurrency(subtotal, company.currency ?? "EGP")
              : ""}
          </div>
        </div>
        <button onClick={() => document.getElementById("order")?.scrollIntoView({ behavior: "smooth" })}>
          اطلب الآن
        </button>
      </div>

      <div className="fcs-spacer" />
    </div>
  );
};

export default FunnelCodSalesPage;
