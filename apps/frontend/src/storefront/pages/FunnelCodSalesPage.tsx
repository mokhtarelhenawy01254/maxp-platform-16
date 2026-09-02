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
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EGYPT_GOVERNORATES } from "../../constants/egyptGovernorates";
import { getCompanyId, storefrontApi } from "../../utils/storefrontApi";
import type { Product } from "../hooks/useProducts";
import { formatStorefrontCurrency } from "../utils/currency";
import { getPrimaryProductImage } from "../utils/productImages";
import { persistPurchaseTracking } from "../utils/purchaseTrackingStorage";

import CountdownBlock from "../sections/ConversionBlocks/CountdownBlock";
import LowStockBlock from "../sections/ConversionBlocks/LowStockBlock";
import SoldCounterBlock from "../sections/ConversionBlocks/SoldCounterBlock";
import PurchaseFomoBlock from "../sections/ConversionBlocks/PurchaseFomoBlock";
import { TrustedBadgePanel } from "../components/TrustedBadgePanel";
import { BackInStockSignupCard } from "../components/BackInStockSignupCard";
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
  "أحمد من القاهرة اشترى للتو باكدج 3",
  "سارة من الإسكندرية اشترت للتو باكدج 1",
  "محمد من الجيزة اشترى للتو باكدج 3",
  "منى من المنصورة اشترت للتو باكدج 2",
  "كريم من أسيوط اشترى للتو باكدج 1",
  "يوسف من طنطا اشترى للتو باكدج 2",
  "جنى من شبرا اشترت للتو باكدج 1",
];

const FALLBACK_CONFIG: FunnelConfig = {
  heroTitle: "رجلك تستاهل شوية بهجة!",
  heroSubtitle: "باكدج 5 أزواج قطن ممشط بألوان تكسر الروتين.",
  heroOverline: "🧦 أشهر شرابات في مصر",
  heroBadge: "خصم 29%!",
  rating: { value: 4.9, count: 2100, label: "+2,100 رِجل مبسوطة" },
  offerEndsAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  lowStockCount: 18,
  soldCount: 1247,
  fomoMessages: DEFAULT_FOMO_POOL,
  bundleTiers: [
    {
      qty: 1,
      price: 249,
      originalPrice: 349,
      label: "باكدج واحد (5 أزواج)",
    },
    {
      qty: 2,
      price: 448,
      originalPrice: 698,
      label: "باكدجين (10 أزواج) — خصم 10%",
      popular: true,
    },
    {
      qty: 3,
      price: 597,
      originalPrice: 1047,
      label: "3 باكدجات (15 زوج) — خصم 20% + شحن مجاني",
      bestValue: true,
      freeShipping: true,
    },
  ],
  features: [
    { title: "قطن ممشط 85%", desc: "نعومة من أول لبسة ولحد آخر غسلة.", icon: "✨" },
    { title: "كعب معزز", desc: "مش بتتخرم حتى مع اللبس اليومي.", icon: "🛡️" },
    { title: "استك مريح", desc: "بيثبت من غير ما يسيب علامة على رجلك.", icon: "💜" },
    { title: "ألوان ثابتة", desc: "صبغات ثابتة مش بتبهت ولا بتلون الغسيل.", icon: "🎨" },
  ],
  reviews: [
    {
      name: "عمر الشناوي",
      text: "أول مرة أصحى الصبح مبسوط عشان هلبس شراب 😂 الألوان جنان والخامة تقيلة بجد.",
      rating: 5,
      verified: true,
    },
    {
      name: "مريم حسام",
      text: "غسلتهم عشر مرات ولا بهتوا ولا اتكوروا — جبت باكدج تاني لجوزي.",
      rating: 5,
      verified: true,
    },
    {
      name: "يوسف الديب",
      text: "المقاس مظبوط والاستك مش بيعور، وبقى في طابور في البيت على الألوان.",
      rating: 5,
      verified: true,
    },
  ],
  trustBadges: [
    { icon: "🚚", title: "شحن سريع", desc: "2-3 أيام لكل المحافظات" },
    { icon: "✅", title: "منتج أصلي", desc: "مستورد ومضمون 100%" },
    { icon: "💵", title: "دفع عند الاستلام", desc: "من غير دفع مسبق" },
    { icon: "🔁", title: "ضمان استرداد", desc: "14 يوم لاستبدال أو إرجاع" },
  ],
  orderKicker: "نموذج الطلب",
  orderTitle: "كمّل طلبك",
  orderCopy: "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب خلال ساعة.",
  buttonLabel: "تأكيد الطلب — كاش عند الاستلام",
};

const FALLBACK_PRODUCT: Product = {
  id: "demo-product",
  name: "باكدج الشرابات المبهجة (5 أزواج)",
  slug: "happy-feet-5-pack",
  description: "باكدج 5 أزواج شرابات قطن ممشط بألوان مختارة.",
  price: 249,
  images: ["https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200"],
};

const FALLBACK_COMPANY = {
  id: "demo-company",
  name: "Swan",
  slug: "swan",
  currency: "EGP",
};

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
  const [funnel, setFunnel] = useState<PublicFunnel | null>(null);
  const [product, setProduct] = useState<Product>(FALLBACK_PRODUCT);
  const [company] = useState(FALLBACK_COMPANY);
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

  // Countdown state
  const [remainingMs, setRemainingMs] = useState<number>(0);

  // FOMO rotation
  const [fomoIndex, setFomoIndex] = useState(0);
  const [fomoVisible, setFomoVisible] = useState(false);

  // Load funnel
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Declared outside try so the catch block can use it for the
      // demo-fallback (otherwise `const companyId` inside try is block-scoped
      // and the catch can't see it — throws "companyId is not defined").
      let resolvedCompanyId: string | null = null;
      try {
        setLoading(true);
        setError(null);
        resolvedCompanyId = getCompanyId();
        const res = await storefrontApi.getFunnel?.(slug, {
          companyId: resolvedCompanyId ?? undefined,
        });
        if (cancelled) return;
        if (res) {
          setFunnel(res.funnel);
          setProduct(res.product ?? FALLBACK_PRODUCT);
        }
      } catch (err) {
        // Graceful fallback to demo data — funnel is publicly viewable
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "fallback");
          setFunnel({
            id: "demo",
            companyId: resolvedCompanyId ?? "demo",
            productId: FALLBACK_PRODUCT.id,
            slug,
            title: FALLBACK_PRODUCT.name,
            status: "PUBLISHED",
            config: FALLBACK_CONFIG,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const config = funnel?.config ?? FALLBACK_CONFIG;

  // Countdown timer
  useEffect(() => {
    const tick = () => setRemainingMs(computeRemaining(config.offerEndsAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [config.offerEndsAt]);

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
    () => (config.fomoMessages && config.fomoMessages.length ? config.fomoMessages : DEFAULT_FOMO_POOL),
    [config.fomoMessages],
  );

  const heroImage = useMemo(
    () =>
      config.heroImage ||
      getPrimaryProductImage(product.images) ||
      "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1200",
    [config.heroImage, product.images],
  );

  // Active tier
  const activeTier = useMemo(
    () => config.bundleTiers.find((t) => t.qty === form.quantity) ?? config.bundleTiers[0],
    [config.bundleTiers, form.quantity],
  );

  const subtotal = activeTier ? activeTier.price * form.quantity : 0;

  const handleChange = <K extends keyof OrderFormState>(key: K, value: OrderFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!funnel) return;
    if (!form.customerName.trim() || !form.phone.trim() || !form.governorate.trim() || !form.address.trim()) {
      toast.error("من فضلك أكمل البيانات المطلوبة");
      return;
    }
    try {
      setSubmitting(true);
      // The funnel backend only needs the minimum: who is buying, what
      // product, how many, and where to ship. We bypass the standard
      // buildCheckoutOrderPayload (cart-based) because this page is a
      // single-product COD flow that doesn't use the cart.
      const subtotal = activeTier ? activeTier.price * form.quantity : 0;
      await storefrontApi.trackFunnelOrder?.(funnel.slug, {
        companyId: funnel.companyId,
        productId: funnel.productId,
        productName: product.name,
        productImage: heroImage,
        quantity: form.quantity,
        unitPrice: activeTier?.price ?? product.price ?? 0,
        subtotal,
        currency: company.currency ?? "EGP",
        customerName: form.customerName,
        phone: form.phone,
        governorate: form.governorate,
        area: form.area,
        address: form.address,
        notes: form.notes,
        landingSlug: funnel.slug,
      });
      toast.success("تم استلام طلبك! هنتواصل معاك خلال ساعة.");
      setForm({
        customerName: "",
        phone: "",
        governorate: "",
        area: "",
        address: "",
        quantity: 1,
      });
    } catch (err) {
      toast.error("حصل مشكلة، حاول تاني.");
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
          🎉 {config.heroBadge} + شحن مجاني على باكدج الـ 3!
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
            🎁 {config.buttonLabel?.replace("تأكيد", "هاتلي") ?? "هاتلي الباكدج"}
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
        <h2 className="fcs-h2">🎁 باكدج واحد ولا تخزين للسنة؟</h2>
        <p className="fcs-section-sub">
          كل ما زودت الكمية، زاد الخصم. الشحن علينا على باكدج الـ 3.
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
                <span>💵 دفع عند الاستلام — هتدفع للكابتن بعد ما توصلك الباكدج</span>
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
        <div className="fcs-sticky-img">🧦</div>
        <div className="fcs-sticky-meta">
          <h4>باكدج {form.quantity} {activeTier?.freeShipping ? "+ شحن مجاني" : ""}</h4>
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
