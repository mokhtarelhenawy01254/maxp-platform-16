import React from "react";
import type { ProductLandingSeo } from "../../../services/productLandingPagesService";

interface LandingSeoPanelProps {
  seo: ProductLandingSeo;
  productImage?: string;
  onChange: (seo: ProductLandingSeo) => void;
}

const previewFrom = (value: string, max: number) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

/**
 * Per-landing SEO: the title/description/og-image used by the backend shell
 * (SSR meta for crawlers and social scrapers) and by the client meta effect.
 * Empty fields fall back to the landing/product content automatically.
 */
export const LandingSeoPanel: React.FC<LandingSeoPanelProps> = ({
  seo,
  productImage,
  onChange,
}) => {
  const ogPreview = seo.ogImage?.trim() || productImage || "";

  return (
    <section className="eo-style-card" aria-label="ظهور الرابط (SEO)">
      <header className="eo-style-card-head">
        <h3>ظهور الرابط (SEO)</h3>
        <span className="eo-style-hint">فاضي = يتكوّن من المنتج تلقائيًا</span>
      </header>

      <div className="eo-seo-body">
        <div className="eo-seo-fields">
          <label className="eo-seo-field">
            <span>عنوان المشاركة</span>
            <input
              type="text"
              value={seo.title || ""}
              onChange={(e) => onChange({ ...seo, title: e.target.value })}
              placeholder="مثال: كوتشي Dash — عرض خاص لفترة محدودة"
              maxLength={70}
            />
          </label>
          <label className="eo-seo-field">
            <span>الوصف</span>
            <textarea
              rows={2}
              value={seo.description || ""}
              onChange={(e) => onChange({ ...seo, description: e.target.value })}
              placeholder="جملة أو جملتين بتظهر تحت العنوان في واتساب وفيسبوك وجوجل"
              maxLength={180}
            />
          </label>
          <label className="eo-seo-field">
            <span>صورة المشاركة (رابط)</span>
            <input
              type="url"
              value={seo.ogImage || ""}
              onChange={(e) => onChange({ ...seo, ogImage: e.target.value })}
              placeholder="https://… (فاضي = صورة المنتج الرئيسية)"
            />
          </label>
        </div>

        <div className="eo-seo-preview" aria-hidden="true">
          {ogPreview ? (
            <img src={ogPreview} alt="" loading="lazy" />
          ) : (
            <div className="eo-seo-preview-empty">صورة</div>
          )}
          <div className="eo-seo-preview-body">
            <div className="eo-seo-preview-site">متجرك</div>
            <div className="eo-seo-preview-title">
              {previewFrom(seo.title || "عنوان الصفحة", 45)}
            </div>
            <div className="eo-seo-preview-desc">
              {previewFrom(seo.description || "وصف يظهر هنا عند المشاركة", 70)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
