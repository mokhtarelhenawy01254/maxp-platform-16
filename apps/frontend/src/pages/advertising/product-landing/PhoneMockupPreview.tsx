import React, { useRef, useState } from "react";
import {
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  Monitor,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tablet,
  Zap,
} from "lucide-react";
import { LandingSection, ProductLandingProduct } from "./types";
import { formatMoney, getProductImage } from "./types";

interface PhoneMockupPreviewProps {
  title: string;
  product: ProductLandingProduct | null;
  sections: LandingSection[];
  formConfig: {
    orderKicker: string;
    orderTitle: string;
    orderCopy: string;
    buttonLabel: string;
  };
  previewUrl?: string;
  customerUrl?: string;
  isMobileView?: boolean;
}

export const PhoneMockupPreview: React.FC<PhoneMockupPreviewProps> = ({
  title,
  product,
  sections,
  formConfig,
  previewUrl,
  customerUrl,
  isMobileView = false,
}) => {
  const [viewMode, setViewMode] = useState<"live" | "sync">(
    previewUrl ? "live" : "sync",
  );
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [selectedBundleQty, setSelectedBundleQty] = useState<number>(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const prodImg = getProductImage(product);
  const priceNum = Number(product?.price || 0);

  const bundleTiers = [
    { qty: 1, label: "قطعة واحدة", discount: 0, badge: "" },
    { qty: 2, label: "قطعتين (وفر 15%)", discount: 15, badge: "الأكثر طلباً 🔥" },
    { qty: 3, label: "3 قطع (وفر 25%)", discount: 25, badge: "أفضل قيمة 💰" },
  ];

  const activeBundle =
    bundleTiers.find((b) => b.qty === selectedBundleQty) || bundleTiers[0];
  const unitPrice =
    activeBundle.discount > 0
      ? Math.round(priceNum * (1 - activeBundle.discount / 100))
      : priceNum;
  const bundleTotal = unitPrice * activeBundle.qty;

  const rawVariants = (product as any)?.productVariants || (product as any)?.variants || [];
  const mockColors = React.useMemo(() => {
    const colors = new Set<string>();
    rawVariants.forEach((v: any) => {
      const attrs = v.metadata?.attributeValues || v.attributes || v.attributeValues || {};
      Object.entries(attrs).forEach(([k, val]) => {
        if (/لون|color|colour/i.test(k) && val) colors.add(String(val));
      });
      if (v.name && v.name.includes("-")) {
        const parts = v.name.split("-").map((p: string) => p.trim());
        parts.forEach((p: string) => {
          if (!/^\d+$/.test(p) && p.length > 1 && !/shoe|size|سنيكر/i.test(p)) colors.add(p);
        });
      }
    });
    if (colors.size > 0) return Array.from(colors);
    return ["أبيض في رمادي", "أبيض في نبيتي"];
  }, [rawVariants]);

  const mockSizes = React.useMemo(() => {
    const sizes = new Set<string>();
    rawVariants.forEach((v: any) => {
      const attrs = v.metadata?.attributeValues || v.attributes || v.attributeValues || {};
      Object.entries(attrs).forEach(([k, val]) => {
        if (/مقاس|size/i.test(k) && val) sizes.add(String(val));
      });
      if (v.name && v.name.includes("-")) {
        const parts = v.name.split("-").map((p: string) => p.trim());
        parts.forEach((p: string) => {
          if (/^\d{2}$/.test(p)) sizes.add(p);
        });
      }
    });
    if (sizes.size > 0) return Array.from(sizes);
    const isFootwear = /كوتشي|حذاء|سنيكر|شوز|جزمة|أحذية|boot|sneaker|shoe/i.test(product?.name || "");
    if (isFootwear) return ["37", "38", "39", "40", "41"];
    return ["37", "38", "39", "40", "41"];
  }, [rawVariants, product?.name]);

  const handleRefreshIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div
      className={`eo-phone-preview-wrapper ${isMobileView ? "is-mobile-view" : ""} ${device === "desktop" ? "is-desktop-mode" : ""}`}
      dir="rtl"
    >
      {/* Header Controls Bar */}
      <div className="eo-phone-preview-header">
        <div className="eo-preview-mode-tabs">
          {previewUrl && (
            <button
              type="button"
              className={`eo-mode-tab ${viewMode === "live" ? "is-active" : ""}`}
              onClick={() => setViewMode("live")}
              title="معاينة الصفحة الحقيقية الفعلية في المتجر"
            >
              <Globe size={14} />
              <span>المعاينة الحية (Live)</span>
            </button>
          )}

          <button
            type="button"
            className={`eo-mode-tab ${viewMode === "sync" ? "is-active" : ""}`}
            onClick={() => setViewMode("sync")}
            title="معاينة التعديلات اللحظية السريعة"
          >
            <Zap size={14} />
            <span>المعاينة الفورية (Instant)</span>
          </button>
        </div>

        <div className="eo-preview-device-tools">
          {!isMobileView && (
            <>
              <button
                type="button"
                className={`eo-device-btn ${device === "mobile" ? "is-active" : ""}`}
                onClick={() => setDevice("mobile")}
                title="عرض الموبايل (380px)"
              >
                <Smartphone size={15} />
              </button>
              <button
                type="button"
                className={`eo-device-btn ${device === "tablet" ? "is-active" : ""}`}
                onClick={() => setDevice("tablet")}
                title="عرض التابلت (680px)"
              >
                <Tablet size={15} />
              </button>
              <button
                type="button"
                className={`eo-device-btn ${device === "desktop" ? "is-active" : ""}`}
                onClick={() => setDevice("desktop")}
                title="عرض الشاشة الكاملة (حاسوب)"
              >
                <Monitor size={15} />
              </button>
            </>
          )}

          {viewMode === "live" && previewUrl && (
            <>
              <button
                type="button"
                className="eo-device-btn"
                onClick={handleRefreshIframe}
                title="إعادة تحميل المعاينة"
              >
                <RefreshCw size={14} />
              </button>

              <a
                href={customerUrl || previewUrl}
                target="_blank"
                rel="noreferrer"
                className="eo-device-btn"
                title="فتح الرابط في تبويب خارجي"
              >
                <ExternalLink size={14} />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div
        className={`eo-phone-frame ${
          isMobileView ? "is-mobile-full-bleed" : ""
        } ${
          device === "desktop"
            ? "is-desktop-chassis"
            : device === "tablet"
              ? "is-tablet-chassis"
              : ""
        }`}
      >
        {device === "mobile" && !isMobileView && (
          <div className="eo-phone-notch">
            <div className="eo-phone-speaker" />
            <div className="eo-phone-camera" />
          </div>
        )}

        {/* Browser URL bar simulator */}
        <div className="eo-frame-browser-bar" dir="ltr">
          <span className="eo-browser-dot dot-red" />
          <span className="eo-browser-dot dot-yellow" />
          <span className="eo-browser-dot dot-green" />
          <span className="eo-browser-address truncate">
            {customerUrl || (previewUrl ? previewUrl.split("?")[0] : "store.maxp.online/lp/live")}
          </span>
          {viewMode === "live" && (
            <span className="eo-live-chip">LIVE</span>
          )}
        </div>

        <div className="eo-phone-screen">
          {/* MODE 1: REAL LIVE IFRAME */}
          {viewMode === "live" && previewUrl ? (
            <div className="eo-iframe-container">
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={previewUrl}
                title="Live Store Landing Page Preview"
                className="eo-live-iframe"
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          ) : (
            /* MODE 2: AUTHENTIC INSTANT SYNC PREVIEW */
            <div className="eo-sync-store-canvas">
              {/* Micro Store Header */}
              <div className="eo-sync-store-bar">
                <span className="eo-sync-brand">{product?.name || "المتجر الرسمي"}</span>
                <span className="eo-sync-trust">
                  <ShieldCheck size={13} /> تسوق آمن وتأكيد فوري
                </span>
              </div>

              {sections.length === 0 ? (
                <div className="eo-phone-empty">
                  <ShoppingBag size={36} />
                  <p>الصفحة فارغة. أضف عناصر من القائمة لبدء المعاينة.</p>
                </div>
              ) : (
                sections.map((section) => {
                  const { type, content, id, enabled } = section;
                  if (enabled === false) return null;

                  if (type === "BANNERS") {
                    return (
                      <div
                        key={id}
                        className="eo-sync-banner"
                        style={{
                          backgroundColor: content.bannerBg || "#0284c7",
                          color: content.textColor || "#ffffff",
                        }}
                      >
                        <span>{content.bannerText || content.text || "عرض خاص لفترة محدودة — شحن سريع وتأكيد فوري"}</span>
                      </div>
                    );
                  }

                  if (type === "MEDIA") {
                    const images =
                      content.images && content.images.length > 0
                        ? content.images
                        : Array.isArray(product?.images) && product!.images.length > 0
                          ? product!.images
                          : prodImg
                            ? [prodImg]
                            : [];
                    return (
                      <div key={id} className="eo-sync-pure-media" style={{ padding: "8px 0" }}>
                        <div
                          className="eo-sync-hero-media"
                          style={{
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {images.length > 0 ? (
                            <img
                              src={images[0]}
                              alt=""
                              className="eo-sync-hero-img"
                              style={{
                                width: "100%",
                                maxHeight: 380,
                                objectFit: "contain",
                                display: "block",
                                borderRadius: 12,
                              }}
                            />
                          ) : (
                            <div className="eo-sync-placeholder">
                              <ShoppingBag size={40} />
                              <span>لا توجد صورة</span>
                            </div>
                          )}
                        </div>
                        {images.length > 1 && (
                          <div
                            className="eo-sync-thumbs-strip"
                            style={{
                              marginTop: 10,
                              display: "flex",
                              gap: 6,
                              justifyContent: "center",
                              overflowX: "auto",
                              padding: "2px",
                            }}
                          >
                            {images.slice(0, 6).map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt=""
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  objectFit: "cover",
                                  border: i === 0 ? "2px solid #0f172a" : "1px solid #e2e8f0",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (type === "TEXT") {
                    return (
                      <div key={id} className="eo-sync-text-section">
                        <h4>{content.heading || "مواصفات وتفاصيل المنتج"}</h4>
                        {content.subheading && (
                          <p className="eo-sync-subheading">{content.subheading}</p>
                        )}
                        {content.bodyText && (
                          <p className="eo-sync-body-text">{content.bodyText}</p>
                        )}
                      </div>
                    );
                  }

                  if (type === "FEATURES") {
                    const features = content.features || [];
                    return (
                      <div key={id} className="eo-sync-features-section">
                        <span className="eo-sync-sec-label">مميزات المنتج:</span>
                        <div className="eo-sync-features-grid">
                          {features.map((f, i) => (
                            <div key={i} className="eo-sync-feature-box">
                              <span className="eo-sync-feat-ico">{f.icon || "✨"}</span>
                              <div>
                                <strong>{f.title}</strong>
                                <small>{f.desc}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (type === "COUNTDOWN") {
                    return (
                      <div key={id} className="eo-sync-countdown-bar">
                        <div className="eo-sync-timer-label">
                          <Clock size={14} />
                          <span>ينتهي العرض خلال: <strong>44:59</strong></span>
                        </div>
                        <div className="eo-sync-stock-chip">
                          <Flame size={13} />
                          <span>باقي {content.lowStockCount || 12} قطعة فقط</span>
                        </div>
                      </div>
                    );
                  }

                  if (type === "FORM") {
                    return (
                      <div key={id} className="eo-sync-form-container">
                        <div className="eo-sync-form-head">
                          <span className="eo-sync-kicker-badge">
                            {content.orderKicker || formConfig.orderKicker || "نموذج الطلب"}
                          </span>
                          <h5>{content.orderTitle || formConfig.orderTitle || `اطلب ${product?.name || "المنتج"}`}</h5>
                          <p>{content.orderCopy || formConfig.orderCopy}</p>
                        </div>

                        {/* Bundle Tiers Selection */}
                        <div className="eo-sync-bundles-box">
                          <label>اختر الكمية والعرض:</label>
                          <div className="eo-sync-bundles-list">
                            {bundleTiers.map((tier) => {
                              const isSelected = selectedBundleQty === tier.qty;
                              const tierUnit =
                                tier.discount > 0
                                  ? Math.round(priceNum * (1 - tier.discount / 100))
                                  : priceNum;
                              const tierTot = tierUnit * tier.qty;

                              return (
                                <div
                                  key={tier.qty}
                                  className={`eo-sync-bundle-pill ${isSelected ? "is-selected" : ""}`}
                                  onClick={() => setSelectedBundleQty(tier.qty)}
                                >
                                  {tier.badge && (
                                    <span className="eo-sync-bundle-tag">{tier.badge}</span>
                                  )}
                                  <div className="eo-sync-bundle-left">
                                    <strong>{tier.label}</strong>
                                    {tier.qty > 1 && <small>وفر {tier.discount}%</small>}
                                  </div>
                                  <div className="eo-sync-bundle-right">
                                    <strong>{formatMoney(tierTot)}</strong>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mock Customer Info - Name & Phone first, matching real store */}
                        <div className="eo-sync-inputs-group">
                          <div className="eo-sync-mock-field">اكتب اسمك بالكامل...</div>
                          <div className="eo-sync-mock-field">01xxxxxxxxx</div>
                        </div>

                        {/* Mock Variant Selectors */}
                        {selectedBundleQty > 1 ? (
                          <div className="eo-sync-bundle-customizer-mock">
                            <span className="eo-sync-customizer-mock-title">
                              تحديد المواصفات لكل قطعة ({selectedBundleQty} قطع):
                            </span>
                            {Array.from({ length: selectedBundleQty }).map((_, idx) => (
                              <div key={idx} className="eo-sync-customizer-mock-item">
                                <span className="eo-sync-customizer-mock-tag">القطعة {idx + 1}</span>
                                {mockColors.length > 0 && (
                                  <div className="eo-sync-mock-chips-row">
                                    <span className="eo-sync-mock-label">اللون:</span>
                                    {mockColors.map((c, cIdx) => (
                                      <span
                                        key={c}
                                        className={`eo-sync-mock-chip eo-sync-mock-chip-radio ${cIdx === (idx % mockColors.length) ? "is-selected" : ""}`}
                                      >
                                        <span style={{ fontSize: 9 }}>{cIdx === (idx % mockColors.length) ? "●" : "○"}</span> {c}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {mockSizes.length > 0 && (
                                  <div className="eo-sync-mock-chips-row">
                                    <span className="eo-sync-mock-label">المقاس:</span>
                                    {mockSizes.map((s, sIdx) => (
                                      <span
                                        key={s}
                                        className={`eo-sync-mock-chip eo-sync-mock-chip-size ${sIdx === 0 ? "is-selected" : ""}`}
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="eo-sync-variants-mock">
                            {mockColors.length > 0 && (
                              <div className="eo-sync-mock-variant-field">
                                <span className="eo-sync-mock-label">اللون:</span>
                                <div className="eo-sync-mock-chips-row">
                                  {mockColors.map((c, i) => (
                                    <span
                                      key={c}
                                      className={`eo-sync-mock-chip eo-sync-mock-chip-radio ${i === 0 ? "is-selected" : ""}`}
                                    >
                                      <span style={{ fontSize: 9 }}>{i === 0 ? "●" : "○"}</span> {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {mockSizes.length > 0 && (
                              <div className="eo-sync-mock-variant-field">
                                <span className="eo-sync-mock-label">المقاس:</span>
                                <div className="eo-sync-mock-chips-row">
                                  {mockSizes.map((s, i) => (
                                    <span
                                      key={s}
                                      className={`eo-sync-mock-chip eo-sync-mock-chip-size ${i === 0 ? "is-selected" : ""}`}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mock Address & Submit */}
                        <div className="eo-sync-inputs-group">
                          <div className="eo-sync-mock-field">المحافظة: اختار...</div>
                          <div className="eo-sync-mock-field">مثال: مدينة نصر...</div>
                          <div className="eo-sync-mock-field">الشارع، العمارة، الدور...</div>

                          <div className="eo-sync-submit-btn">
                            {content.buttonLabel || formConfig.buttonLabel || "تأكيد الطلب الآن 🚚"}
                            <span className="eo-sync-submit-price">({formatMoney(bundleTotal)})</span>
                          </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="eo-sync-trust-row">
                          <div className="eo-sync-trust-badge-item">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              <path d="m9 12 2 2 4-4" />
                            </svg>
                            <span>معاينة قبل الدفع</span>
                          </div>
                          <div className="eo-sync-trust-badge-item">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="3" width="15" height="13" />
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                              <circle cx="5.5" cy="18.5" r="2.5" />
                              <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                            <span>دفع عند الاستلام</span>
                          </div>
                          <div className="eo-sync-trust-badge-item">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <polyline points="1 20 1 14 7 14" />
                              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            <span>استبدال 14 يوم</span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (type === "REVIEWS") {
                    const reviews = content.reviews || [];
                    const isWhatsApp = section.variant === "WHATSAPP";
                    if (isWhatsApp) {
                      return (
                        <div key={id} className="eo-sync-wa-preview-section" style={{ margin: "10px 0", borderRadius: 10, overflow: "hidden", border: "1px solid #d1d5db", background: "#efeae2" }}>
                          <div style={{ background: "#008069", color: "#ffffff", padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 6, height: 6, background: "#25d366", borderRadius: "50%" }} />
                            <strong style={{ fontSize: "0.75rem" }}>فريق خدمة العملاء — واتساب</strong>
                          </div>
                          <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {reviews.map((rev: any, i: number) => (
                              <div key={i} style={{ background: "#ffffff", borderRadius: "8px 8px 0 8px", padding: "6px 8px", maxWidth: "90%", alignSelf: "flex-start", boxShadow: "0 1px 1px rgba(0,0,0,0.08)", fontSize: "0.7rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 2 }}>
                                  <strong style={{ color: "#128c7e", fontSize: "0.68rem" }}>{rev.name}</strong>
                                  <span style={{ fontSize: "0.6rem", background: "#dcfce7", color: "#15803d", padding: "0 4px", borderRadius: 4 }}>مشتري مؤكد ✓</span>
                                </div>
                                <p style={{ margin: 0, color: "#111827", lineHeight: 1.4 }}>{rev.text || rev.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={id} className="eo-sync-reviews-section">
                        <span className="eo-sync-sec-label">آراء وتجارب العملاء:</span>
                        <div className="eo-sync-reviews-stack">
                          {reviews.map((rev, i) => (
                            <div key={i} className="eo-sync-rev-card">
                              <div className="eo-sync-rev-header">
                                <strong>{rev.name}</strong>
                                <span className="eo-sync-stars">
                                  {"★".repeat(rev.rating || 5)}
                                </span>
                              </div>
                              <p>{rev.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (type === "FAQ") {
                    const faqs = content.faqs || [];
                    return (
                      <div key={id} className="eo-sync-faqs-section">
                        <span className="eo-sync-sec-label">الأسئلة الشائعة:</span>
                        {faqs.map((faq, i) => (
                          <div key={i} className="eo-sync-faq-card">
                            <strong>س: {faq.question}</strong>
                            <p>ج: {faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (type === "BREAKDOWN") {
                    const items = content.breakdownItems || [];
                    return (
                      <div key={id} className="eo-sync-breakdown-section" style={{ padding: "12px 8px", background: "#f8fafc", borderRadius: 10, margin: "8px 0" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: "0 0 8px" }}>{content.breakdownTitle || "تشريح ومواصفات المنتج"}</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {items.map((item: any, i: number) => (
                            <div key={i} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                                <span>{item.icon || "✨"}</span>
                                <strong style={{ fontSize: "0.75rem", color: "#0f172a" }}>{item.title}</strong>
                              </div>
                              <p style={{ fontSize: "0.68rem", color: "#64748b", margin: 0, lineHeight: 1.3 }}>{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (type === "COMPARISON") {
                    const items = content.comparisonItems || [];
                    return (
                      <div key={id} className="eo-sync-comp-section" style={{ padding: "12px 8px", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, margin: "8px 0" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: "0 0 8px", color: "#0f172a" }}>{content.comparisonTitle || "جدول مقارنة التميز"}</h4>
                        <div style={{ fontSize: "0.72rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", background: "#0f172a", color: "#fff", padding: "6px 8px", borderRadius: 6, fontWeight: 700 }}>
                            <span>الميزة</span>
                            <span style={{ color: "#34d399" }}>{content.comparisonUsLabel || "الأصلي"}</span>
                            <span style={{ color: "#94a3b8" }}>{content.comparisonThemLabel || "التقليد"}</span>
                          </div>
                          {items.map((it: any, i: number) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", padding: "6px 8px", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
                              <strong>{it.feature}</strong>
                              <span style={{ color: "#059669", fontWeight: 600 }}>✓ {it.us}</span>
                              <span style={{ color: "#dc2626" }}>✕ {it.them}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (type === "LIVE_PROOF") {
                    const recent = content.recentOrders || [];
                    return (
                      <div key={id} className="eo-sync-liveproof-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#ffffff", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: 8, margin: "6px 0", fontSize: "0.72rem", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%", display: "inline-block" }} />
                          <strong style={{ color: "#0f172a", fontSize: "0.7rem" }}>طلب مباشر:</strong>
                          <span style={{ color: "#475569" }}>
                            {recent[0]?.city || "القاهرة"} — {recent[0]?.item || "المنتج"}
                          </span>
                        </div>
                        <span style={{ color: "#92400e", background: "#fffbeb", padding: "1px 6px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>
                          ★ 4.9
                        </span>
                      </div>
                    );
                  }

                  if (type === "IMAGE_ONLY") {
                    const imgUrl =
                      (device === "mobile" && content.mobileImage) ||
                      content.imageUrl ||
                      content.mainImage ||
                      prodImg;
                    const isFull = content.variant === "full" || content.isFullWidth;
                    const isCircle = Boolean(content.isCircle);
                    const bRadius = isCircle
                      ? "50%"
                      : isFull
                        ? 0
                        : (content.borderRadius ?? 8);

                    return (
                      <div
                        key={id}
                        className="eo-sync-image-only"
                        style={{
                          margin: isFull ? "6px -8px" : "6px 0",
                          borderRadius: bRadius,
                          overflow: "hidden",
                          background: content.bgColor || "transparent",
                          textAlign: isCircle ? "center" : undefined,
                        }}
                      >
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={content.altText || ""}
                            style={{
                              width: isCircle ? 140 : "100%",
                              height: isCircle ? 140 : "auto",
                              borderRadius: bRadius,
                              display: "block",
                              objectFit: "cover",
                              margin: isCircle ? "0 auto" : undefined,
                            }}
                          />
                        ) : (
                          <div style={{ height: 140, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                            صورة مفردة
                          </div>
                        )}
                        {content.caption && (
                          <p style={{ fontSize: "0.72rem", color: "#64748b", textAlign: "center", margin: "4px 0" }}>{content.caption}</p>
                        )}
                      </div>
                    );
                  }

                  if (type === "CAROUSEL") {
                    const cImages = content.carouselImages || (content.images ? content.images.map((u: string) => ({ url: u })) : []) || [];
                    const firstImg = cImages[0]?.url || prodImg;
                    return (
                      <div
                        key={id}
                        className="eo-sync-carousel"
                        style={{
                          margin: "6px 0",
                          borderRadius: 10,
                          overflow: "hidden",
                          background: content.bgColor || "#0f172a",
                          position: "relative",
                        }}
                      >
                        {firstImg ? (
                          <img
                            src={firstImg}
                            alt=""
                            style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ height: 160, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            سلايدر صور متقلب
                          </div>
                        )}
                        {cImages.length > 1 && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 8,
                              left: 0,
                              right: 0,
                              display: "flex",
                              justifyContent: "center",
                              gap: 5,
                            }}
                          >
                            {cImages.slice(0, 5).map((_: any, i: number) => (
                              <span
                                key={i}
                                style={{
                                  width: i === 0 ? 14 : 6,
                                  height: 6,
                                  borderRadius: 3,
                                  background: i === 0 ? "#ffffff" : "rgba(255,255,255,0.5)",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (type === "HOW_IT_WORKS") {
                    const steps = content.steps || [];
                    return (
                      <div
                        key={id}
                        className="eo-sync-howitworks"
                        style={{
                          padding: "12px 10px",
                          background: content.bgColor || "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          margin: "8px 0",
                        }}
                      >
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 800, margin: "0 0 2px", textAlign: "center" }}>
                          {content.title || content.heading || "طريقة الاستخدام في 3 خطوات"}
                        </h4>
                        {content.subtitle && (
                          <p style={{ fontSize: "0.7rem", color: "#64748b", textAlign: "center", margin: "0 0 10px" }}>
                            {content.subtitle}
                          </p>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {steps.map((st: any, i: number) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                background: "#f8fafc",
                                padding: "8px",
                                borderRadius: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: "50%",
                                  background: "#2563eb",
                                  color: "#fff",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {st.number || st.stepNumber || i + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: "0.75rem", color: "#0f172a", display: "block" }}>{st.title}</strong>
                                <p style={{ fontSize: "0.68rem", color: "#64748b", margin: 0, lineHeight: 1.3 }}>{st.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (type === "FEATURED_PRODUCT") {
                    const bullets = content.featuredBullets || content.bullets || [];
                    const featImg = content.imageUrl || content.mainImage || prodImg;
                    const pPrice = content.price ?? priceNum;
                    const pOldPrice = content.oldPrice ?? (pPrice ? Math.round(pPrice * 1.3) : 0);
                    return (
                      <div
                        key={id}
                        className="eo-sync-featured-product"
                        style={{
                          padding: "12px",
                          background: content.bgColor || "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
                          border: "1px solid #bfdbfe",
                          borderRadius: 12,
                          margin: "8px 0",
                          position: "relative",
                        }}
                      >
                        {(content.featuredBadge || content.badge) && (
                          <span
                            style={{
                              position: "absolute",
                              top: -8,
                              right: 12,
                              background: "#2563eb",
                              color: "#fff",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 10,
                            }}
                          >
                            {content.featuredBadge || content.badge}
                          </span>
                        )}
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {featImg && (
                            <img
                              src={featImg}
                              alt=""
                              style={{ width: 70, height: 70, borderRadius: 8, objectFit: "cover" }}
                            />
                          )}
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: "0.82rem", fontWeight: 800, margin: "0 0 4px" }}>
                              {content.productName || product?.name}
                            </h4>
                            <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                              <strong style={{ fontSize: "0.9rem", color: "#16a34a" }}>
                                {formatMoney(Number(pPrice))}
                              </strong>
                              {pOldPrice > pPrice && (
                                <del style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                  {formatMoney(Number(pOldPrice))}
                                </del>
                              )}
                            </div>
                          </div>
                        </div>
                        {bullets.length > 0 && (
                          <div style={{ marginTop: 8, borderTop: "1px dashed #cbd5e1", paddingTop: 6 }}>
                            {bullets.map((b: string, idx: number) => (
                              <div key={idx} style={{ fontSize: "0.68rem", color: "#334155", display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
                                <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <a
                          href="#checkout-form"
                          style={{
                            display: "block",
                            marginTop: 10,
                            padding: "8px",
                            background: "#0f172a",
                            color: "#ffffff",
                            textAlign: "center",
                            borderRadius: 8,
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          {content.ctaText || "اطلب الآن واستفد من العرض"}
                        </a>
                      </div>
                    );
                  }

                  if (type === "YOUTUBE_VIDEO") {
                    const rawUrl = content.videoUrl || content.youtubeUrl || "";
                    let ytId = content.videoId || "";
                    if (!ytId && rawUrl) {
                      const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                      ytId = match ? match[1] : "";
                    }
                    return (
                      <div
                        key={id}
                        className="eo-sync-yt-video"
                        style={{ margin: "8px 0", borderRadius: 10, overflow: "hidden", background: "#000" }}
                      >
                        {content.title || content.heading ? (
                          <div style={{ padding: "6px 10px", background: "#0f172a", color: "#fff", fontSize: "0.75rem", fontWeight: 700 }}>
                            {content.title || content.heading}
                          </div>
                        ) : null}
                        {ytId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            title="YouTube video"
                            style={{ width: "100%", height: 160, border: "none", display: "block" }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div style={{ height: 140, background: "#1e293b", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem" }}>
                            فيديو يوتيوب (أدخل الرابط)
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (type === "BUY_BUTTON") {
                    const btnBg = content.btnColor || content.buyButtonBg || "#16a34a";
                    const btnColor = content.btnTextColor || content.buyButtonTextColor || "#ffffff";
                    const text = content.text || content.buyButtonText || content.title || "اضغط هنا للطلب الآن — دفع عند الاستلام";
                    return (
                      <div
                        key={id}
                        className="eo-sync-buy-button-wrapper"
                        style={{ margin: "10px 0", textAlign: "center" }}
                      >
                        <a
                          href="#checkout-form"
                          style={{
                            display: "block",
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: btnBg,
                            color: btnColor,
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            textDecoration: "none",
                            boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                          }}
                        >
                          {text}
                        </a>
                        {(content.subtitle || content.subtext) && (
                          <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block", marginTop: 4 }}>
                            {content.subtitle || content.subtext}
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (type === "HEADING") {
                    const align = content.alignment || content.titleAlign || "center";
                    return (
                      <div
                        key={id}
                        className="eo-sync-heading-section"
                        style={{
                          margin: "12px 0 6px",
                          textAlign: align as any,
                          padding: "6px 4px",
                        }}
                      >
                        {content.badge && (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 12,
                              background: "#eff6ff",
                              color: "#2563eb",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              marginBottom: 4,
                            }}
                          >
                            {content.badge}
                          </span>
                        )}
                        <h3
                          style={{
                            margin: 0,
                            fontSize: content.headingLevel === "h1" ? "1.1rem" : "0.95rem",
                            fontWeight: 800,
                            color: content.textColor || "#0f172a",
                            lineHeight: 1.3,
                          }}
                        >
                          {content.title || content.heading || "عنوان القسم الرئيسي"}
                        </h3>
                        {(content.subtitle || content.subheading) && (
                          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                            {content.subtitle || content.subheading}
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (type === "BEFORE_AFTER") {
                    return (
                      <div
                        key={id}
                        className="eo-sync-beforeafter-section"
                        style={{
                          margin: "8px 0",
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          padding: 8,
                        }}
                      >
                        <h4 style={{ fontSize: "0.8rem", fontWeight: 700, margin: "0 0 6px", textAlign: "center" }}>
                          مقارنة النتائج (قبل وبعد)
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ height: 80, background: "#fee2e2", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              {content.beforeImage ? (
                                <img src={content.beforeImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ fontSize: "0.7rem", color: "#dc2626" }}>قبل (العادي)</span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.65rem", color: "#ef4444", fontWeight: 600, display: "block", marginTop: 3 }}>
                              {content.beforeLabel || "قبل"}
                            </span>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ height: 80, background: "#dcfce7", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                              {content.afterImage ? (
                                <img src={content.afterImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <span style={{ fontSize: "0.7rem", color: "#16a34a" }}>بعد (الأصلي)</span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: 600, display: "block", marginTop: 3 }}>
                              {content.afterLabel || "بعد"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (type === "HTML") {
                    return (
                      <div
                        key={id}
                        className="eo-sync-html-section"
                        style={{ margin: "6px 0", fontSize: "0.75rem" }}
                        dangerouslySetInnerHTML={{ __html: content.htmlContent || "<!-- مخصص -->" }}
                      />
                    );
                  }

                  if (type === "WHATSAPP_CHAT") {
                    const messages = content.messages || [
                      { sender: "customer", text: "هو المنتج ده أصلي ومضمون؟" },
                      { sender: "store", text: "أه طبعاً يا فندم أصلي 100% ومعاه ضمان استرجاع ومعاينة قبل الدفع" },
                    ];
                    return (
                      <div
                        key={id}
                        className="eo-sync-wa-section"
                        style={{
                          margin: "8px 0",
                          padding: "10px 8px",
                          background: "#efeae2",
                          borderRadius: 10,
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #d9d9d9" }}>
                          <span style={{ width: 8, height: 8, background: "#25d366", borderRadius: "50%" }} />
                          <strong style={{ fontSize: "0.75rem", color: "#075e54" }}>خدمة عملاء واتساب المباشرة</strong>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {messages.map((m: any, idx: number) => {
                            const isMe = m.sender === "store";
                            return (
                              <div
                                key={idx}
                                style={{
                                  alignSelf: isMe ? "flex-start" : "flex-end",
                                  background: isMe ? "#ffffff" : "#dcf8c6",
                                  padding: "5px 8px",
                                  borderRadius: 6,
                                  maxWidth: "85%",
                                  fontSize: "0.7rem",
                                  color: "#111827",
                                  boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
                                }}
                              >
                                {m.text}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
