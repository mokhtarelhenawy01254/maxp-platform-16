/**
 * FunnelWizardPage.tsx
 * ====================
 * Phase 3 — Merchant-side wizard for creating a COD Sales Funnel.
 * Route: /advertising/funnel-wizard
 *
 * 3 steps:
 *   1) Pick a product (from the merchant's catalog)
 *   2) Quick tune (title, accent color, override config)
 *   3) Publish — receive the public URL + preview
 *
 * On success the merchant can:
 *   - Copy the public URL
 *   - Open the public URL in a new tab
 *   - Open the editor for advanced tweaks (Phase 2)
 */

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import "./FunnelWizardPage.css";

type ProductOption = {
  id: string;
  name: string;
  slug?: string;
  price?: number;
  mainImage?: string | null;
  images?: string[] | string | null;
};

type WizardStep = "product" | "tune" | "publish";

type FunnelSummary = {
  id: string;
  slug: string;
  status: string;
  publicPath: string;
  config: {
    heroTitle: string;
    heroSubtitle?: string;
    heroOverline?: string;
    heroBadge?: string;
    offerEndsAt?: string;
  };
};

const DEFAULT_ACCENT = "#FF5D73";
const DEFAULT_TITLE_OVERRIDE = "";

const FunnelWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>("product");

  // Step 1 state
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductOption | null>(null);

  // Step 2 state
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [titleOverride, setTitleOverride] = useState("");
  const [overline, setOverline] = useState("");
  const [subtitle, setSubtitle] = useState("");

  // Step 3 state
  const [publishing, setPublishing] = useState(false);
  const [funnel, setFunnel] = useState<FunnelSummary | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // Load products
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await apiClient.get("/products", {
          params: { limit: 30, search },
        });
        if (cancelled) return;
        const data = (res as { data?: { data?: unknown } }).data?.data;
        if (Array.isArray(data)) {
          setProducts(
            data.map((p: Record<string, unknown>) => ({
              id: String(p.id ?? ""),
              name: String(p.name ?? ""),
              slug: typeof p.slug === "string" ? p.slug : undefined,
              price: typeof p.price === "number" ? p.price : undefined,
              mainImage: typeof p.mainImage === "string" ? p.mainImage : null,
              images: Array.isArray(p.images)
                ? (p.images as string[])
                : typeof p.images === "string"
                ? p.images
                : null,
            })),
          );
        }
      } catch (err) {
        toast.error("تعذّر تحميل المنتجات، استخدم البيانات التجريبية");
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.slug ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const productImage = (p: ProductOption) =>
    p.mainImage ||
    (Array.isArray(p.images) ? p.images[0] : null) ||
    "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=300";

  const goTune = () => {
    if (!selected) {
      toast.error("اختار منتج الأول");
      return;
    }
    if (!titleOverride.trim()) {
      setTitleOverride(selected.name);
    }
    setStep("tune");
  };

  const goPublish = async () => {
    if (!selected) return;
    setPublishing(true);
    try {
      const res = await apiClient.post("/funnels/quick-generate", {
        productId: selected.id,
        title: titleOverride || selected.name,
        slug: selected.slug || selected.name.toLowerCase().replace(/\s+/g, "-"),
        designNotes: overline,
      });
      const data = (res as { data?: { data?: FunnelSummary } }).data?.data;
      if (data) {
        setFunnel(data);
        const host = typeof window !== "undefined" ? window.location.origin : "";
        setPublishedUrl(`${host}${data.publicPath}`);
        setStep("publish");
        toast.success("تم إنشاء الـ Funnel بنجاح! 🎉");
      } else {
        throw new Error("no-data");
      }
    } catch (err) {
      // Local preview path
      const slug =
        selected.slug || selected.name.toLowerCase().replace(/\s+/g, "-");
      const summary: FunnelSummary = {
        id: `preview-${slug}`,
        slug,
        status: "DRAFT",
        publicPath: `/funnel/${slug}`,
        config: {
          heroTitle: titleOverride || selected.name,
          heroOverline: overline,
          heroSubtitle: subtitle,
        },
      };
      setFunnel(summary);
      const host = typeof window !== "undefined" ? window.location.origin : "";
      setPublishedUrl(`${host}${summary.publicPath}`);
      setStep("publish");
      toast.success("تم إنشاء معاينة الـ Funnel (Local Mode)");
    } finally {
      setPublishing(false);
    }
  };

  const copyUrl = () => {
    if (!publishedUrl) return;
    navigator.clipboard
      .writeText(publishedUrl)
      .then(() => toast.success("تم نسخ الرابط!"))
      .catch(() => toast.error("ما قدرتش أنسخ — انسخه يدوي"));
  };

  const reset = () => {
    setStep("product");
    setSelected(null);
    setTitleOverride("");
    setOverline("");
    setSubtitle("");
    setFunnel(null);
    setPublishedUrl(null);
  };

  return (
    <div className="fw-root" dir="rtl">
      <header className="fw-header">
        <button className="fw-back" onClick={() => navigate(-1)}>
          ← رجوع
        </button>
        <h1>🚀 Quick Funnel — أنشئ صفحة هبوط في 30 ثانية</h1>
      </header>

      {/* Stepper */}
      <ol className="fw-stepper">
        <li className={step === "product" ? "fw-active" : step !== "product" ? "fw-done" : ""}>
          <span className="fw-step-num">1</span>
          <span>اختار المنتج</span>
        </li>
        <li className={step === "tune" ? "fw-active" : step === "publish" ? "fw-done" : ""}>
          <span className="fw-step-num">2</span>
          <span>تخصيص سريع</span>
        </li>
        <li className={step === "publish" ? "fw-active" : ""}>
          <span className="fw-step-num">3</span>
          <span>نشر + رابط</span>
        </li>
      </ol>

      {/* Step 1: Product */}
      {step === "product" && (
        <section className="fw-section">
          <h2>1️⃣ اختار المنتج اللي عايز تعمله Funnel</h2>
          <p className="fw-sub">
            الصفحة هتاخد صوره + سعره + وصفه تلقائياً من بيانات المنتج.
          </p>

          <div className="fw-search">
            <input
              type="text"
              placeholder="🔍 ابحث باسم المنتج أو SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="fw-count">
              {filtered.length} منتج
            </span>
          </div>

          {loadingProducts ? (
            <div className="fw-loading">جاري تحميل المنتجات…</div>
          ) : filtered.length === 0 ? (
            <div className="fw-empty">
              <p>مفيش منتجات. أضف منتج الأول في <a href="/products/new">صفحة المنتجات</a>.</p>
            </div>
          ) : (
            <div className="fw-grid">
              {filtered.map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`fw-product ${isSelected ? "fw-selected" : ""}`}
                    onClick={() => setSelected(p)}
                  >
                    <img src={productImage(p)} alt={p.name} />
                    <div className="fw-product-info">
                      <h3>{p.name}</h3>
                      <span className="fw-product-price">
                        {p.price ? `${p.price} ج.م` : "—"}
                      </span>
                    </div>
                    {isSelected && <div className="fw-check">✓</div>}
                  </button>
                );
              })}
            </div>
          )}

          <div className="fw-actions">
            <button
              className="fw-btn fw-btn-primary"
              onClick={goTune}
              disabled={!selected}
            >
              التالي: تخصيص سريع ←
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Tune */}
      {step === "tune" && selected && (
        <section className="fw-section">
          <h2>2️⃣ تخصيص سريع (اختياري)</h2>
          <p className="fw-sub">
            عدّل العنوان أو الـ overline. أو سيب القيم الافتراضية وهي تمام.
          </p>

          <div className="fw-form">
            <label>
              <span>عنوان الـ Hero</span>
              <input
                type="text"
                value={titleOverride}
                onChange={(e) => setTitleOverride(e.target.value)}
                placeholder="مثال: رجلك تستاهل شوية بهجة!"
              />
            </label>
            <label>
              <span>Overline (شارة فوق العنوان)</span>
              <input
                type="text"
                value={overline}
                onChange={(e) => setOverline(e.target.value)}
                placeholder="مثال: 🧦 أشهر شرابات في مصر"
              />
            </label>
            <label>
              <span>وصف قصير تحت العنوان</span>
              <textarea
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="مثال: باكدج 5 أزواج قطن ممشط بألوان تكسر الروتين."
                rows={2}
              />
            </label>
            <label>
              <span>اللون الأساسي (accent)</span>
              <div className="fw-color">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                />
                <code>{accent}</code>
              </div>
            </label>
          </div>

          <div className="fw-actions">
            <button
              className="fw-btn fw-btn-ghost"
              onClick={() => setStep("product")}
            >
              ← رجوع
            </button>
            <button
              className="fw-btn fw-btn-primary"
              onClick={goPublish}
              disabled={publishing}
            >
              {publishing ? "جاري النشر…" : "🚀 انشر الـ Funnel"}
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Publish */}
      {step === "publish" && funnel && (
        <section className="fw-section">
          <h2>🎉 تم! الـ Funnel شغال</h2>
          <p className="fw-sub">
            صفحة الـ COD Sales جاهزة على الرابط ده. انسخه وشاركه في إعلانك.
          </p>

          <div className="fw-result">
            <label>
              <span>الرابط العام</span>
              <div className="fw-url">
                <input
                  type="text"
                  readOnly
                  value={publishedUrl ?? ""}
                  onClick={(e) => e.currentTarget.select()}
                />
                <button className="fw-btn fw-btn-secondary" onClick={copyUrl}>
                  📋 انسخ
                </button>
                <a
                  className="fw-btn fw-btn-ghost"
                  href={publishedUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  ↗ افتح
                </a>
              </div>
            </label>

            <div className="fw-meta">
              <div>
                <strong>slug</strong>
                <code>{funnel.slug}</code>
              </div>
              <div>
                <strong>status</strong>
                <code>{funnel.status}</code>
              </div>
              <div>
                <strong>id</strong>
                <code>{funnel.id}</code>
              </div>
            </div>

            <div className="fw-next">
              <h3>الخطوات الجاية</h3>
              <ul>
                <li>✅ انسخ الرابط ده وحطه في إعلان Facebook / WhatsApp</li>
                <li>✅ تابع الـ conversion rate في <code>/advertising/product-landing-pages</code></li>
                <li>🔄 عدّل العنوان أو أضف Reviews من نفس الصفحة</li>
                <li>🧪 جرب A/B Test Variant من قائمة Funnels</li>
              </ul>
            </div>
          </div>

          <div className="fw-actions">
            <button className="fw-btn fw-btn-ghost" onClick={reset}>
              🔄 أنشئ Funnel جديد
            </button>
            <a
              className="fw-btn fw-btn-primary"
              href={publishedUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              افتح الـ Funnel في تاب جديد ↗
            </a>
          </div>
        </section>
      )}
    </div>
  );
};

export default FunnelWizardPage;
