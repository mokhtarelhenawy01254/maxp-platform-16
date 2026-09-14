import React, { useState } from "react";
import { Plus, Trash2, Star, ImagePlus, Palette } from "lucide-react";
import { LandingSection, ProductLandingProduct } from "./types";

interface SectionItemEditorProps {
  section: LandingSection;
  onUpdateContent: (updatedContent: LandingSection["content"]) => void;
  product?: ProductLandingProduct | null;
}

const CommonSectionStylingFields: React.FC<{
  content: LandingSection["content"];
  update: (partial: Partial<LandingSection["content"]>) => void;
}> = ({ content, update }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="eo-common-style-box" style={{ marginTop: 14, borderTop: "1px dashed #e2e8f0", paddingTop: 10 }}>
      <button
        type="button"
        className="eo-style-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#475569",
          fontSize: "0.82rem",
          fontWeight: 600,
          padding: "4px 0",
          width: "100%",
        }}
      >
        <Palette size={14} style={{ color: "#3b82f6" }} />
        <span>خيارات التصميم المتقدمة للقسم (ألوان الخلفية، كود CSS، تبديل مكان الصورة)</span>
        <span style={{ marginInlineStart: "auto", fontSize: "0.75rem", color: "#64748b" }}>
          {isOpen ? "▲ إخفاء" : "▼ إظهار"}
        </span>
      </button>
      {isOpen && (
        <div className="eo-style-fields-grid" style={{ marginTop: 8, padding: 10, background: "#f8fafc", borderRadius: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>لون خلفية القسم:</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <input
                  type="color"
                  value={content.bgColor || "#ffffff"}
                  onChange={(e) => update({ bgColor: e.target.value })}
                  style={{ width: 34, height: 32, padding: 0, border: "none", cursor: "pointer", borderRadius: 6 }}
                />
                <input
                  type="text"
                  value={content.bgColor || ""}
                  onChange={(e) => update({ bgColor: e.target.value })}
                  placeholder="#ffffff أو transparent"
                  dir="ltr"
                  style={{ flex: 1 }}
                />
              </div>
            </label>
            <label>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>رابط صورة خلفية للقسم:</span>
              <input
                type="text"
                value={content.bgImage || ""}
                onChange={(e) => update({ bgImage: e.target.value })}
                placeholder="https://.../bg.jpg"
                dir="ltr"
                style={{ marginTop: 2 }}
              />
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: "0.82rem" }}>
              <input
                type="checkbox"
                checked={Boolean(content.reversed)}
                onChange={(e) => update({ reversed: e.target.checked })}
              />
              <span>تبديل مكان الصورة مع النص (عكس الترتيب أفقياً / رأسياً)</span>
            </label>
          </div>
          <label style={{ marginTop: 8, display: "block" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>كود CSS مخصص لهذا القسم:</span>
            <textarea
              rows={2}
              value={content.customCss || ""}
              onChange={(e) => update({ customCss: e.target.value })}
              placeholder="/* أضف كود CSS إضافي خاص بهذا القسم فقط */"
              className="eo-code-textarea"
              dir="ltr"
              style={{ marginTop: 2, fontSize: "0.75rem", fontFamily: "monospace" }}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export const SectionItemEditor: React.FC<SectionItemEditorProps> = ({
  section,
  onUpdateContent,
  product,
}) => {
  const { content, type } = section;
  const [newImageUrl, setNewImageUrl] = useState("");

  const update = (partial: Partial<LandingSection["content"]>) => {
    onUpdateContent({ ...content, ...partial });
  };

  // 1. MEDIA EDITOR
  if (type === "MEDIA") {
    const images = content.images || [];
    const addImage = () => {
      if (!newImageUrl.trim()) return;
      update({ images: [...images, newImageUrl.trim()] });
      setNewImageUrl("");
    };

    const addProductImage = (src: string) => {
      if (images.includes(src)) return;
      update({ images: [...images, src] });
    };

    const removeImage = (idx: number) => {
      update({ images: images.filter((_, i) => i !== idx) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-media-editor">
          <label>
            <strong>صور ومعرض المنتج:</strong>
          </label>
          <div className="eo-media-grid">
            {images.map((img, idx) => (
              <div key={`${img}-${idx}`} className="eo-media-card">
                <img src={img} alt="" className="eo-media-thumb" />
                <button
                  type="button"
                  className="eo-media-remove-btn"
                  onClick={() => removeImage(idx)}
                  title="حذف الصورة"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="eo-add-image-bar">
            <input
              type="text"
              placeholder="الصق رابط صورة جديدة (URL)..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              dir="ltr"
            />
            <button type="button" className="eo-btn eo-btn-outline" onClick={addImage}>
              <Plus size={15} />
              <span>إضافة رابط</span>
            </button>
          </div>

          {/* Quick Add from product images */}
          {product && (
            <div className="eo-product-quick-images">
              <span className="eo-hint">صور متاحة من بيانات المنتج:</span>
              <div className="eo-quick-thumbs">
                {product.mainImage && (
                  <button
                    type="button"
                    className="eo-quick-thumb-btn"
                    onClick={() => addProductImage(product.mainImage!)}
                    title="إضافة الصورة الرئيسية"
                  >
                    <img src={product.mainImage} alt="" />
                    <span>الرئيسية +</span>
                  </button>
                )}
                {Array.isArray(product.images) &&
                  product.images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className="eo-quick-thumb-btn"
                      onClick={() => addProductImage(src)}
                    >
                      <img src={src} alt="" />
                      <span>+ إضافة</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. TEXT EDITOR
  if (type === "TEXT") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>العنوان الرئيسي للقسم:</span>
            <input
              type="text"
              value={content.heading || ""}
              onChange={(e) => update({ heading: e.target.value })}
              placeholder="عنوان تسويقي جذاب..."
            />
          </label>
          <label>
            <span>العنوان الفرعي (مختصر):</span>
            <input
              type="text"
              value={content.subheading || ""}
              onChange={(e) => update({ subheading: e.target.value })}
              placeholder="نص فرعي يشرح القيمة..."
            />
          </label>
          <label>
            <span>الوصف التسويقي والتفاصيل:</span>
            <textarea
              rows={4}
              value={content.bodyText || ""}
              onChange={(e) => update({ bodyText: e.target.value })}
              placeholder="اكتب مواصفات وتفاصيل المنتج بأسلوب تسويقي واضح ومحفز..."
            />
          </label>
        </div>
      </div>
    );
  }

  // 3. COUNTDOWN EDITOR
  if (type === "COUNTDOWN") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>نص التنبيه أو العرض الترويجي:</span>
            <input
              type="text"
              value={content.text || ""}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="مثال: عرض خاص لفترة محدودة — اطلب الآن قبل انتهاء الكمية!"
            />
          </label>
        </div>
        <div className="eo-fields eo-fields-inline" style={{ marginTop: 10 }}>
          <label>
            <span>مدة العداد التنازلي (بالدقائق):</span>
            <input
              type="number"
              min={1}
              max={1440}
              value={content.timerEndsMinutes ?? 45}
              onChange={(e) => update({ timerEndsMinutes: Number(e.target.value) || 45 })}
            />
          </label>
          <label>
            <span>عدد القطع المتبقية في شريط النفاد:</span>
            <input
              type="number"
              min={1}
              max={100}
              value={content.lowStockCount ?? 14}
              onChange={(e) => update({ lowStockCount: Number(e.target.value) || 14 })}
            />
          </label>
        </div>
      </div>
    );
  }

  // 4. FEATURES EDITOR
  if (type === "FEATURES") {
    const features = content.features || [];
    const addFeature = () => {
      update({
        features: [
          ...features,
          { title: "ميزة جديدة", desc: "تفاصيل الميزة والضمان هنا", icon: "✨" },
        ],
      });
    };

    const updateFeature = (index: number, key: string, val: string) => {
      const next = features.map((f, i) => (i === index ? { ...f, [key]: val } : f));
      update({ features: next });
    };

    const removeFeature = (index: number) => {
      update({ features: features.filter((_, i) => i !== index) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-items-list-editor">
          <div className="eo-list-head">
            <strong>مميزات وشارات الثقة:</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addFeature}>
              <Plus size={14} /> إضافة ميزة
            </button>
          </div>
          {features.map((f, i) => (
            <div key={i} className="eo-sub-card">
              <div className="eo-sub-card-row">
                <input
                  type="text"
                  className="eo-icon-input"
                  value={f.icon}
                  onChange={(e) => updateFeature(i, "icon", e.target.value)}
                  placeholder="أيقونة (🚚/✅)"
                  title="أيقونة أو إيموجي"
                />
                <input
                  type="text"
                  className="eo-title-input"
                  value={f.title}
                  onChange={(e) => updateFeature(i, "title", e.target.value)}
                  placeholder="عنوان الميزة"
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeFeature(i)}
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                type="text"
                value={f.desc}
                onChange={(e) => updateFeature(i, "desc", e.target.value)}
                placeholder="تفاصيل الميزة"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. FORM EDITOR
  if (type === "FORM") {
    const bundles = content.bundles || [
      { qty: 1, label: "قطعة واحدة", discountPercent: 0, badge: "", freeGift: "" },
      { qty: 2, label: "قطعتين (وفر 15%)", discountPercent: 15, badge: "الأكثر طلباً 🔥", freeGift: "" },
      { qty: 3, label: "3 قطع (وفر 25% + شحن مجاني)", discountPercent: 25, badge: "أفضل قيمة 💰", freeGift: "شحن مجاني + هدية" },
    ];

    const updateBundle = (idx: number, field: string, val: string | number) => {
      const next = bundles.map((b, i) => (i === idx ? { ...b, [field]: val } : b));
      update({ bundles: next });
    };

    const addBundle = () => {
      const nextQty = bundles.length + 1;
      update({
        bundles: [
          ...bundles,
          { qty: nextQty, label: `${nextQty} قطع (عرض خاص)`, discountPercent: 20, badge: "توفير إضافي", freeGift: "" },
        ],
      });
    };

    const removeBundle = (idx: number) => {
      update({ bundles: bundles.filter((_, i) => i !== idx) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>العنوان الفرعي الصغير (Kicker):</span>
            <input
              type="text"
              value={content.orderKicker || ""}
              onChange={(e) => update({ orderKicker: e.target.value })}
              placeholder="نموذج الطلب السريع"
            />
          </label>
          <label>
            <span>عنوان نموذج الشراء الرئيسي:</span>
            <input
              type="text"
              value={content.orderTitle || ""}
              onChange={(e) => update({ orderTitle: e.target.value })}
              placeholder="اطلب المنتج الآن..."
            />
          </label>
          <label>
            <span>النص التوجيهي تحت العنوان:</span>
            <textarea
              rows={2}
              value={content.orderCopy || ""}
              onChange={(e) => update({ orderCopy: e.target.value })}
              placeholder="املأ البيانات وسيتم التواصل معك لتأكيد الشحن فوراً..."
            />
          </label>
          <label>
            <span>نص زر التأكيد والشحن (CTA Button):</span>
            <input
              type="text"
              value={content.buttonLabel || ""}
              onChange={(e) => update({ buttonLabel: e.target.value })}
              placeholder="تأكيد الطلب الآن — دفع عند الاستلام 🚚"
            />
          </label>
          <label>
            <span>رقم واتساب المساعدة والدعم السريع العائم (اختياري):</span>
            <input
              type="text"
              value={content.whatsappSupportPhone || ""}
              onChange={(e) => update({ whatsappSupportPhone: e.target.value })}
              placeholder="مثال: 201012345678 (يظهر كزر واتساب عائم للاستفسارات السريعة)"
              dir="ltr"
            />
          </label>
        </div>

        {/* Custom Bundles & Volume Discounts */}
        <div className="eo-items-list-editor" style={{ marginTop: 16 }}>
          <div className="eo-list-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>باقات التوفير ومضاعفة السلة (Bundles & Tiers):</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addBundle}>
              <Plus size={14} /> إضافة باقة
            </button>
          </div>
          {bundles.map((bundle, i) => (
            <div key={i} className="eo-sub-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={bundle.qty}
                  onChange={(e) => updateBundle(i, "qty", Number(e.target.value) || 1)}
                  title="الكمية"
                  placeholder="الكمية"
                />
                <input
                  type="text"
                  value={bundle.label}
                  onChange={(e) => updateBundle(i, "label", e.target.value)}
                  placeholder="تسمية الباقة (مثال: قطعتين - وفر 15%)"
                  style={{ fontWeight: 600 }}
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeBundle(i)}
                  title="حذف الباقة"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 6 }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>نسبة الخصم %:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bundle.discountPercent}
                    onChange={(e) => updateBundle(i, "discountPercent", Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>شارة العرض:</span>
                  <input
                    type="text"
                    value={bundle.badge || ""}
                    onChange={(e) => updateBundle(i, "badge", e.target.value)}
                    placeholder="الأكثر طلباً 🔥"
                  />
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>هدية مجانية:</span>
                  <input
                    type="text"
                    value={bundle.freeGift || ""}
                    onChange={(e) => updateBundle(i, "freeGift", e.target.value)}
                    placeholder="+ شراب هدية"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. REVIEWS EDITOR
  if (type === "REVIEWS") {
    const reviews = content.reviews || [];
    const addReview = () => {
      update({
        reviews: [
          ...reviews,
          { name: "عميل راضي", text: "المنتج تحفة ووصلني في الميعاد المحدد وجودته عالية جداً.", rating: 5 },
        ],
      });
    };

    const updateReview = (index: number, key: string, val: string | number) => {
      const next = reviews.map((r, i) => (i === index ? { ...r, [key]: val } : r));
      update({ reviews: next });
    };

    const removeReview = (index: number) => {
      update({ reviews: reviews.filter((_, i) => i !== index) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-items-list-editor">
          <div className="eo-list-head">
            <strong>تقييمات وآراء العملاء:</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addReview}>
              <Plus size={14} /> إضافة تقييم
            </button>
          </div>
          {reviews.map((rev, i) => (
            <div key={i} className="eo-sub-card">
              <div className="eo-sub-card-row">
                <input
                  type="text"
                  className="eo-title-input"
                  value={rev.name}
                  onChange={(e) => updateReview(i, "name", e.target.value)}
                  placeholder="اسم العميل"
                />
                <select
                  value={rev.rating}
                  onChange={(e) => updateReview(i, "rating", Number(e.target.value))}
                  className="eo-rating-select"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  <option value={4}>⭐⭐⭐⭐ (4)</option>
                  <option value={3}>⭐⭐⭐ (3)</option>
                </select>
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeReview(i)}
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                value={rev.text}
                onChange={(e) => updateReview(i, "text", e.target.value)}
                placeholder="نص التقييم ورأي العميل..."
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 7. FAQ EDITOR
  if (type === "FAQ") {
    const faqs = content.faqs || [];
    const addFaq = () => {
      update({
        faqs: [
          ...faqs,
          { question: "سؤال متكرر جديد؟", answer: "الإجابة التوضيحية والتفصيلية للعميل هنا." },
        ],
      });
    };

    const updateFaq = (index: number, key: "question" | "answer", val: string) => {
      const next = faqs.map((q, i) => (i === index ? { ...q, [key]: val } : q));
      update({ faqs: next });
    };

    const removeFaq = (index: number) => {
      update({ faqs: faqs.filter((_, i) => i !== index) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-items-list-editor">
          <div className="eo-list-head">
            <strong>الأسئلة الشائعة وإجاباتها:</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addFaq}>
              <Plus size={14} /> إضافة سؤال
            </button>
          </div>
          {faqs.map((faq, i) => (
            <div key={i} className="eo-sub-card">
              <div className="eo-sub-card-row">
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => updateFaq(i, "question", e.target.value)}
                  placeholder="السؤال..."
                  className="eo-flex-1"
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeFaq(i)}
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                value={faq.answer}
                onChange={(e) => updateFaq(i, "answer", e.target.value)}
                placeholder="الإجابة..."
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. BANNERS EDITOR
  if (type === "BANNERS") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>نص اللافتة الترويجية (Banner Text):</span>
            <input
              type="text"
              value={content.bannerText || ""}
              onChange={(e) => update({ bannerText: e.target.value })}
              placeholder="🔥 عرض حصري لفترة محدودة — خصم 30% + شحن مجاني"
            />
          </label>
        </div>
      </div>
    );
  }

  // 9. HTML EDITOR
  if (type === "HTML") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>كود HTML / سكريبت التتبع المخصص:</span>
            <textarea
              rows={5}
              value={content.htmlCode || ""}
              onChange={(e) => update({ htmlCode: e.target.value })}
              placeholder="<div>كود HTML مخصص أو سكريبتات إضافية...</div>"
              className="eo-code-textarea"
              dir="ltr"
            />
          </label>
        </div>
      </div>
    );
  }

  // 10. COMPARISON EDITOR
  if (type === "COMPARISON") {
    const items = content.comparisonItems || [];
    const updateItem = (
      index: number,
      field: "feature" | "us" | "them",
      val: string,
    ) => {
      const next = [...items];
      next[index] = { ...next[index], [field]: val };
      update({ comparisonItems: next });
    };
    const addItem = () => {
      update({
        comparisonItems: [
          ...items,
          {
            feature: "ميزة جديدة",
            us: "مواصفات ممتازة لمنتجنا الأصلي",
            them: "عيوب المنتجات المقلدة في السوق",
          },
        ],
      });
    };
    const removeItem = (idx: number) => {
      update({ comparisonItems: items.filter((_, i) => i !== idx) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>عنوان جدول المقارنة:</span>
            <input
              type="text"
              value={content.comparisonTitle || ""}
              onChange={(e) => update({ comparisonTitle: e.target.value })}
              placeholder="لماذا تختار منتجنا الأصلي بدلاً من البدائل في السوق؟"
            />
          </label>
          <div className="eo-two-cols-inline" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>تسمية منتجنا:</span>
              <input
                type="text"
                value={content.comparisonUsLabel || ""}
                onChange={(e) => update({ comparisonUsLabel: e.target.value })}
                placeholder="منتجنا الأصلي"
              />
            </label>
            <label>
              <span>تسمية البدائل في السوق:</span>
              <input
                type="text"
                value={content.comparisonThemLabel || ""}
                onChange={(e) => update({ comparisonThemLabel: e.target.value })}
                placeholder="المنتجات المقلدة في السوق"
              />
            </label>
          </div>
        </div>

        <div className="eo-items-list-editor" style={{ marginTop: 16 }}>
          <div className="eo-list-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>عناصر ومحاور المقارنة:</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addItem}>
              <Plus size={14} /> إضافة محور
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="eo-sub-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div className="eo-sub-card-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={item.feature}
                  onChange={(e) => updateItem(i, "feature", e.target.value)}
                  placeholder="وجه المقارنة (مثال: جودة الخامات)"
                  style={{ flex: 1, fontWeight: "bold" }}
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeItem(i)}
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  value={item.us}
                  onChange={(e) => updateItem(i, "us", e.target.value)}
                  placeholder="ميزة منتجنا ✅"
                  style={{ borderColor: "#10b981" }}
                />
                <input
                  type="text"
                  value={item.them}
                  onChange={(e) => updateItem(i, "them", e.target.value)}
                  placeholder="عيب المنافس ❌"
                  style={{ borderColor: "#ef4444" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 11. BREAKDOWN EDITOR
  if (type === "BREAKDOWN") {
    const items = content.breakdownItems || [];
    const updateItem = (
      index: number,
      field: "title" | "desc" | "icon" | "tag",
      val: string,
    ) => {
      const next = [...items];
      next[index] = { ...next[index], [field]: val };
      update({ breakdownItems: next });
    };
    const addItem = () => {
      update({
        breakdownItems: [
          ...items,
          {
            title: "ميزة تصنيع جديدة",
            desc: "شرح دقيق للميزة وكيف تفيد المشتري",
            icon: "✨",
            tag: "ميزة حصرية",
          },
        ],
      });
    };
    const removeItem = (idx: number) => {
      update({ breakdownItems: items.filter((_, i) => i !== idx) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>عنوان قسم التشريح والمواصفات:</span>
            <input
              type="text"
              value={content.breakdownTitle || ""}
              onChange={(e) => update({ breakdownTitle: e.target.value })}
              placeholder="تشريح ومواصفات المنتج الدقيقة"
            />
          </label>
        </div>

        <div className="eo-items-list-editor" style={{ marginTop: 16 }}>
          <div className="eo-list-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>كروت ومميزات التصنيع:</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addItem}>
              <Plus size={14} /> إضافة كارت
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="eo-sub-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div className="eo-sub-card-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={item.icon || "👟"}
                  onChange={(e) => updateItem(i, "icon", e.target.value)}
                  style={{ width: 48, textAlign: "center", fontSize: "1.1rem" }}
                  placeholder="أيقونة"
                />
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateItem(i, "title", e.target.value)}
                  placeholder="عنوان الميزة (مثال: نعل طبي)"
                  style={{ flex: 1, fontWeight: "bold" }}
                />
                <input
                  type="text"
                  value={item.tag || ""}
                  onChange={(e) => updateItem(i, "tag", e.target.value)}
                  placeholder="وسم (مثال: طبي 100%)"
                  style={{ width: 120 }}
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeItem(i)}
                  title="حذف"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                value={item.desc}
                onChange={(e) => updateItem(i, "desc", e.target.value)}
                placeholder="شرح تفاصيل الميزة وفائدتها للمشتري..."
                style={{ marginTop: 6, width: "100%" }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 12. GALLERY EDITOR
  if (type === "GALLERY") {
    const images = content.galleryImages || [];
    const addImg = () => {
      if (!newImageUrl.trim()) return;
      update({
        galleryImages: [
          ...images,
          { url: newImageUrl.trim(), caption: "لقطة تفصيلية للمنتج" },
        ],
      });
      setNewImageUrl("");
    };
    const removeImg = (idx: number) => {
      update({ galleryImages: images.filter((_, i) => i !== idx) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>عنوان المعرض:</span>
            <input
              type="text"
              value={content.galleryTitle || ""}
              onChange={(e) => update({ galleryTitle: e.target.value })}
              placeholder="لقطات حية للمنتج على الطبيعة"
            />
          </label>
        </div>
        <div className="eo-add-image-bar" style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="رابط صورة زاوية جديدة..."
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            dir="ltr"
            style={{ flex: 1 }}
          />
          <button type="button" className="eo-btn eo-btn-outline" onClick={addImg}>
            <Plus size={15} /> إضافة صورة للمعرض
          </button>
        </div>
        <div className="eo-media-grid" style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {images.map((img, idx) => (
            <div key={idx} className="eo-media-card" style={{ position: "relative" }}>
              <img src={img.url} alt="" className="eo-media-thumb" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />
              <button
                type="button"
                className="eo-media-remove-btn"
                onClick={() => removeImg(idx)}
                title="حذف"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 13. LIVE_PROOF EDITOR
  if (type === "LIVE_PROOF") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>نسبة رضا وتقييم المشترين:</span>
            <input
              type="text"
              value={content.satisfactionRate || ""}
              onChange={(e) => update({ satisfactionRate: e.target.value })}
              placeholder="4.9 / 5 (أكثر من 1,420 تقييم)"
            />
          </label>
          <p className="eo-hint" style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 6 }}>
            يتم توليد إشعارات الطلبات الحديثة تلقائياً بناءً على بيانات المنتج والمحافظات المصرية لإعطاء مصداقية حية وفورية تزيد من مبيعات الـ COD.
          </p>
        </div>
      </div>
    );
  }

  // 14. VIDEO_REEL EDITOR
  if (type === "VIDEO_REEL") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>رابط الفيديو (Direct MP4 URL أو YouTube Embed):</span>
            <input
              type="text"
              value={content.videoUrl || ""}
              onChange={(e) => update({ videoUrl: e.target.value })}
              placeholder="https://.../video.mp4"
              dir="ltr"
            />
          </label>
          <label>
            <span>صورة غلاف الفيديو (Thumbnail):</span>
            <input
              type="text"
              value={content.videoThumbnail || ""}
              onChange={(e) => update({ videoThumbnail: e.target.value })}
              placeholder="https://.../thumbnail.jpg"
              dir="ltr"
            />
          </label>
          <label>
            <span>نص الشرح التوجيهي أسفل الفيديو:</span>
            <input
              type="text"
              value={content.videoCaption || ""}
              onChange={(e) => update({ videoCaption: e.target.value })}
              placeholder="شاهد تجربة المنتج والأنبوكسينغ على الطبيعة بدون فلاتر..."
            />
          </label>
        </div>
      </div>
    );
  }

  // 15. BEFORE_AFTER EDITOR
  if (type === "BEFORE_AFTER") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>
              <span>تسمية الصورة الأولى (قبل / البديل العادي):</span>
              <input
                type="text"
                value={content.beforeLabel || ""}
                onChange={(e) => update({ beforeLabel: e.target.value })}
                placeholder="الأحذية العادية في السوق"
              />
            </label>
            <label>
              <span>رابط صورة (قبل):</span>
              <input
                type="text"
                value={content.beforeImage || ""}
                onChange={(e) => update({ beforeImage: e.target.value })}
                placeholder="https://.../before.jpg"
                dir="ltr"
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>تسمية الصورة الثانية (بعد / منتجنا الأصلي):</span>
              <input
                type="text"
                value={content.afterLabel || ""}
                onChange={(e) => update({ afterLabel: e.target.value })}
                placeholder="كوتشي سوان الطبي الأصلي"
              />
            </label>
            <label>
              <span>رابط صورة (بعد):</span>
              <input
                type="text"
                value={content.afterImage || ""}
                onChange={(e) => update({ afterImage: e.target.value })}
                placeholder="https://.../after.jpg"
                dir="ltr"
              />
            </label>
          </div>
          <p className="eo-hint" style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 8 }}>
            سلايدر قبل وبعد يتيح للعميل سحب المقبض التفاعلي يميناً ويساراً لمقارنة النتائج بصرياً بشكل فوري.
          </p>
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 16. IMAGE_ONLY EDITOR (EasyOrders "img_only")
  if (type === "IMAGE_ONLY") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>رابط الصورة:</span>
            <input
              type="text"
              value={content.imageUrl || ""}
              onChange={(e) => update({ imageUrl: e.target.value })}
              placeholder="https://.../banner.jpg"
              dir="ltr"
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>نمط العرض (العرض والحواف):</span>
              <select
                value={content.variant || "rounded"}
                onChange={(e) => update({ variant: e.target.value })}
              >
                <option value="full">عرض كامل بدون هوامش (Full Width)</option>
                <option value="rounded">حواف دائرية أنيقة (Rounded Box)</option>
                <option value="contained">داخل إطار محدد (Contained Card)</option>
              </select>
            </label>
            <label>
              <span>النص البديل (Alt text لمحركات البحث):</span>
              <input
                type="text"
                value={content.altText || ""}
                onChange={(e) => update({ altText: e.target.value })}
                placeholder="صورة توضيحية للمنتج"
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>رابط التحويل عند النقر (Link URL):</span>
              <input
                type="text"
                value={content.linkUrl || ""}
                onChange={(e) => update({ linkUrl: e.target.value })}
                placeholder="#checkout-form أو رابط خارجي"
                dir="ltr"
              />
            </label>
            <label>
              <span>تسمية / وصف أسفل الصورة (اختياري):</span>
              <input
                type="text"
                value={content.caption || ""}
                onChange={(e) => update({ caption: e.target.value })}
                placeholder="تفاصيل دقيقة وخامة ممتازة..."
              />
            </label>
          </div>
          {content.imageUrl && (
            <div style={{ marginTop: 10, textAlign: "center", background: "#f8fafc", padding: 8, borderRadius: 8 }}>
              <img
                src={content.imageUrl}
                alt={content.altText || "Preview"}
                style={{ maxHeight: 160, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
              />
            </div>
          )}
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 17. CAROUSEL EDITOR (EasyOrders "carousel")
  if (type === "CAROUSEL") {
    const images = content.carouselImages || (content.images ? content.images.map((url, i) => ({ id: `c-${i}`, url })) : []) || [];

    const addCarouselImage = () => {
      update({
        carouselImages: [
          ...images,
          { id: `c-${Date.now()}`, url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", caption: "" },
        ],
      });
    };

    const updateCarouselImage = (index: number, key: string, val: string) => {
      const next = images.map((item, idx) => (idx === index ? { ...item, [key]: val } : item));
      update({ carouselImages: next });
    };

    const removeCarouselImage = (index: number) => {
      update({ carouselImages: images.filter((_, idx) => idx !== index) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-items-list-editor">
          <div className="eo-list-head">
            <strong>شرائح السلايدر (Carousel Images):</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addCarouselImage}>
              <Plus size={14} /> إضافة صورة للسلايدر
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label>
              <span>التقليب التلقائي (Autoplay):</span>
              <select
                value={content.autoplay !== false ? "true" : "false"}
                onChange={(e) => update({ autoplay: e.target.value === "true" })}
              >
                <option value="true">مفعل تلقائياً</option>
                <option value="false">معطل (التحريك يدوي)</option>
              </select>
            </label>
            <label>
              <span>مدة التبديل بين الشرائح (بالثواني):</span>
              <input
                type="number"
                min={1}
                max={15}
                value={content.slideInterval || 3}
                onChange={(e) => update({ slideInterval: Number(e.target.value) })}
              />
            </label>
          </div>
          {images.map((imgItem, i) => (
            <div key={imgItem.id || i} className="eo-sub-card">
              <div className="eo-sub-card-row">
                <input
                  type="text"
                  value={imgItem.url}
                  onChange={(e) => updateCarouselImage(i, "url", e.target.value)}
                  placeholder="رابط الصورة (URL)"
                  dir="ltr"
                  style={{ flex: 2 }}
                />
                <input
                  type="text"
                  value={imgItem.caption || ""}
                  onChange={(e) => updateCarouselImage(i, "caption", e.target.value)}
                  placeholder="تسمية الشريحة (اختياري)"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeCarouselImage(i)}
                  title="حذف الشريحة"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {imgItem.url && (
                <div style={{ marginTop: 6 }}>
                  <img src={imgItem.url} alt="" style={{ height: 48, borderRadius: 4, objectFit: "cover" }} />
                </div>
              )}
            </div>
          ))}
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 18. HOW_IT_WORKS EDITOR (EasyOrders "how-to-work")
  if (type === "HOW_IT_WORKS") {
    const steps = content.steps || [];
    const addStep = () => {
      update({
        steps: [
          ...steps,
          {
            number: steps.length + 1,
            title: `الخطوة ${steps.length + 1}`,
            desc: "اشرح للعميل كيفية استخدام المنتج أو خطوات الاستلام والتجربة.",
          },
        ],
      });
    };

    const updateStep = (index: number, key: string, val: any) => {
      const next = steps.map((s, idx) => (idx === index ? { ...s, [key]: val } : s));
      update({ steps: next });
    };

    const removeStep = (index: number) => {
      update({ steps: steps.filter((_, idx) => idx !== index) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>عنوان القسم الرئيسي:</span>
            <input
              type="text"
              value={content.title || ""}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="طريقة الاستخدام السهلة في 3 خطوات"
            />
          </label>
          <label style={{ marginTop: 8 }}>
            <span>وصف تمهيدي:</span>
            <input
              type="text"
              value={content.subtitle || ""}
              onChange={(e) => update({ subtitle: e.target.value })}
              placeholder="خطوات بسيطة تضمن لك أقصى استفادة من أول يوم"
            />
          </label>
        </div>
        <div className="eo-items-list-editor" style={{ marginTop: 12 }}>
          <div className="eo-list-head">
            <strong>الخطوات والمراحل:</strong>
            <button type="button" className="eo-btn eo-btn-xs" onClick={addStep}>
              <Plus size={14} /> إضافة خطوة
            </button>
          </div>
          {steps.map((step, i) => (
            <div key={i} className="eo-sub-card">
              <div className="eo-sub-card-row">
                <span style={{ fontWeight: 700, color: "#3b82f6", width: 24, textAlign: "center" }}>
                  #{i + 1}
                </span>
                <input
                  type="text"
                  className="eo-title-input"
                  value={step.title}
                  onChange={(e) => updateStep(i, "title", e.target.value)}
                  placeholder="عنوان الخطوة"
                />
                <button
                  type="button"
                  className="eo-sub-del-btn"
                  onClick={() => removeStep(i)}
                  title="حذف الخطوة"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                rows={2}
                value={step.desc}
                onChange={(e) => updateStep(i, "desc", e.target.value)}
                placeholder="شرح وتفاصيل الخطوة..."
              />
              <div style={{ marginTop: 6 }}>
                <input
                  type="text"
                  value={step.image || ""}
                  onChange={(e) => updateStep(i, "image", e.target.value)}
                  placeholder="رابط صورة توضيحية للخطوة (اختياري)"
                  dir="ltr"
                  style={{ fontSize: "0.8rem" }}
                />
              </div>
            </div>
          ))}
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 19. FEATURED_PRODUCT EDITOR (EasyOrders "featured-product")
  if (type === "FEATURED_PRODUCT") {
    const bullets = content.featuredBullets || [
      "خامات أصلية عالية الجودة ومقاومة للاهتراء",
      "تصميم مريح يدعم الاستخدام اليومي المكثف",
      "ضمان ذهبي للاستبدال والاسترجاع مجاناً",
    ];

    const addBullet = () => {
      update({ featuredBullets: [...bullets, "ميزة إضافية تبرز قوة المنتج"] });
    };

    const updateBullet = (index: number, val: string) => {
      const next = bullets.map((b, idx) => (idx === index ? val : b));
      update({ featuredBullets: next });
    };

    const removeBullet = (index: number) => {
      update({ featuredBullets: bullets.filter((_, idx) => idx !== index) });
    };

    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <label>
              <span>اسم المنتج البارز:</span>
              <input
                type="text"
                value={content.productName || product?.title || ""}
                onChange={(e) => update({ productName: e.target.value })}
                placeholder="اسم المنتج المميز"
              />
            </label>
            <label>
              <span>شارة بارزة (Badge):</span>
              <input
                type="text"
                value={content.featuredBadge || ""}
                onChange={(e) => update({ featuredBadge: e.target.value })}
                placeholder="الأكثر مبيعاً ⭐"
              />
            </label>
          </div>
          <label style={{ marginTop: 8 }}>
            <span>رابط صورة المنتج الرئيسية:</span>
            <input
              type="text"
              value={content.imageUrl || product?.image_url || ""}
              onChange={(e) => update({ imageUrl: e.target.value })}
              placeholder="https://.../product.jpg"
              dir="ltr"
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>السعر الحالي:</span>
              <input
                type="number"
                value={content.price ?? product?.price ?? ""}
                onChange={(e) => update({ price: Number(e.target.value) })}
                placeholder="499"
              />
            </label>
            <label>
              <span>السعر القديم المشطوب:</span>
              <input
                type="number"
                value={content.oldPrice ?? product?.compare_at_price ?? ""}
                onChange={(e) => update({ oldPrice: Number(e.target.value) })}
                placeholder="750"
              />
            </label>
            <label>
              <span>العملة:</span>
              <input
                type="text"
                value={content.currency || "ج.م"}
                onChange={(e) => update({ currency: e.target.value })}
                placeholder="ج.م"
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>نص زر الشراء (CTA):</span>
              <input
                type="text"
                value={content.ctaText || ""}
                onChange={(e) => update({ ctaText: e.target.value })}
                placeholder="اطلب الآن واستفد من العرض"
              />
            </label>
            <label>
              <span>التقييم (من 5):</span>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={content.rating || 4.9}
                onChange={(e) => update({ rating: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="eo-items-list-editor" style={{ marginTop: 12 }}>
            <div className="eo-list-head">
              <strong>نقاط ومميزات المنتج البارزة:</strong>
              <button type="button" className="eo-btn eo-btn-xs" onClick={addBullet}>
                <Plus size={14} /> إضافة نقطة
              </button>
            </div>
            {bullets.map((bullet, i) => (
              <div key={i} className="eo-sub-card" style={{ padding: "6px 10px" }}>
                <div className="eo-sub-card-row">
                  <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => updateBullet(i, e.target.value)}
                    placeholder="ميزة المنتج..."
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="eo-sub-del-btn"
                    onClick={() => removeBullet(i)}
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 20. YOUTUBE_VIDEO EDITOR (EasyOrders "youtube-video")
  if (type === "YOUTUBE_VIDEO") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>عنوان الفيديو (اختياري):</span>
            <input
              type="text"
              value={content.title || ""}
              onChange={(e) => update({ title: e.target.value })}
              placeholder="شاهد تجربة واستعراض المنتج على يوتيوب"
            />
          </label>
          <label style={{ marginTop: 8 }}>
            <span>رابط أو معرف فيديو يوتيوب (URL or Video ID):</span>
            <input
              type="text"
              value={content.videoUrl || content.videoId || ""}
              onChange={(e) => update({ videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=... أو معرف الفيديو"
              dir="ltr"
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>نسبة الأبعاد (Aspect Ratio):</span>
              <select
                value={content.aspectRatio || "16/9"}
                onChange={(e) => update({ aspectRatio: e.target.value })}
              >
                <option value="16/9">عرض أفقي قياسي (16:9)</option>
                <option value="9/16">عمودي شورتس / ريلز (9:16 Shorts)</option>
                <option value="4/3">مربع / كلاسيكي (4:3)</option>
              </select>
            </label>
            <label>
              <span>التشغيل التلقائي:</span>
              <select
                value={content.autoplay ? "true" : "false"}
                onChange={(e) => update({ autoplay: e.target.value === "true" })}
              >
                <option value="false">معطل (يبدأ بالنقر)</option>
                <option value="true">مفعل (بدون صوت Autoplay Muted)</option>
              </select>
            </label>
          </div>
          <label style={{ marginTop: 8 }}>
            <span>وصف أو تعليق أسفل الفيديو:</span>
            <input
              type="text"
              value={content.videoCaption || ""}
              onChange={(e) => update({ videoCaption: e.target.value })}
              placeholder="فيديو استعراض واقعي بدون فلاتر"
            />
          </label>
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 21. BUY_BUTTON EDITOR (EasyOrders "buy_button")
  if (type === "BUY_BUTTON") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <label>
            <span>نص الزر الرئيسي:</span>
            <input
              type="text"
              value={content.text || content.title || ""}
              onChange={(e) => update({ text: e.target.value, title: e.target.value })}
              placeholder="اضغط هنا لطلب المنتج الآن — الدفع عند الاستلام"
            />
          </label>
          <label style={{ marginTop: 8 }}>
            <span>نص فرعي محفز أسفل الزر (Subtext):</span>
            <input
              type="text"
              value={content.subtitle || content.subtext || ""}
              onChange={(e) => update({ subtitle: e.target.value, subtext: e.target.value })}
              placeholder="شحن سريع لجميع المحافظات + معاينة قبل الدفع وضمان 14 يوم"
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>الإجراء عند النقر (Click Action):</span>
              <select
                value={content.targetAction || "scroll_to_form"}
                onChange={(e) => update({ targetAction: e.target.value })}
              >
                <option value="scroll_to_form">الانتقال السلس لنموذج الطلب (Scroll to Form)</option>
                <option value="open_whatsapp">مراسلة واتساب فوراً (WhatsApp Direct)</option>
                <option value="custom_url">فتح رابط مخصص (Custom URL)</option>
              </select>
            </label>
            <label>
              <span>تأثير الحركة (Animation Effect):</span>
              <select
                value={content.animation || "pulse"}
                onChange={(e) => update({ animation: e.target.value })}
              >
                <option value="pulse">نبض مستمر (Pulse Attention)</option>
                <option value="bounce">قفز لطيف (Bounce)</option>
                <option value="glow">إضاءة متوهجة (Glow)</option>
                <option value="none">بدون تأثير حركي (Static)</option>
              </select>
            </label>
          </div>
          {content.targetAction === "custom_url" && (
            <label style={{ marginTop: 8 }}>
              <span>الرابط المستهدف:</span>
              <input
                type="text"
                value={content.targetUrl || ""}
                onChange={(e) => update({ targetUrl: e.target.value })}
                placeholder="https://... أو رابط صفحة"
                dir="ltr"
              />
            </label>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>لون الزر (Button Color):</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <input
                  type="color"
                  value={content.btnColor || "#16a34a"}
                  onChange={(e) => update({ btnColor: e.target.value })}
                  style={{ width: 34, height: 32, padding: 0, border: "none", cursor: "pointer", borderRadius: 6 }}
                />
                <input
                  type="text"
                  value={content.btnColor || "#16a34a"}
                  onChange={(e) => update({ btnColor: e.target.value })}
                  dir="ltr"
                  style={{ flex: 1 }}
                />
              </div>
            </label>
            <label>
              <span>لون النص:</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <input
                  type="color"
                  value={content.btnTextColor || "#ffffff"}
                  onChange={(e) => update({ btnTextColor: e.target.value })}
                  style={{ width: 34, height: 32, padding: 0, border: "none", cursor: "pointer", borderRadius: 6 }}
                />
                <input
                  type="text"
                  value={content.btnTextColor || "#ffffff"}
                  onChange={(e) => update({ btnTextColor: e.target.value })}
                  dir="ltr"
                  style={{ flex: 1 }}
                />
              </div>
            </label>
          </div>
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  // 22. HEADING EDITOR (EasyOrders "heading")
  if (type === "HEADING") {
    return (
      <div className="eo-section-editor-body">
        <div className="eo-fields">
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 12 }}>
            <label>
              <span>نص العنوان الرئيسي:</span>
              <input
                type="text"
                value={content.title || ""}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="عنوان جذاب يلفت انتباه العميل"
              />
            </label>
            <label>
              <span>حجم العنوان:</span>
              <select
                value={content.headingLevel || "h2"}
                onChange={(e) => update({ headingLevel: e.target.value })}
              >
                <option value="h1">كبير جداً (H1)</option>
                <option value="h2">كبير رئيسي (H2)</option>
                <option value="h3">متوسط فرعي (H3)</option>
              </select>
            </label>
          </div>
          <label style={{ marginTop: 8 }}>
            <span>نص فرعي / توضيحي تحت العنوان:</span>
            <input
              type="text"
              value={content.subtitle || ""}
              onChange={(e) => update({ subtitle: e.target.value })}
              placeholder="نص توضيحي مكمل للعنوان يوضح القيمة المضافة..."
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
            <label>
              <span>محاذاة النص:</span>
              <select
                value={content.alignment || "center"}
                onChange={(e) => update({ alignment: e.target.value })}
              >
                <option value="center">في المنتصف (Center)</option>
                <option value="right">يمين (Right / RTL)</option>
                <option value="left">يسار (Left)</option>
              </select>
            </label>
            <label>
              <span>شارة أو تاج علوي (Badge):</span>
              <input
                type="text"
                value={content.badge || ""}
                onChange={(e) => update({ badge: e.target.value })}
                placeholder="ميزة حصرية ✨"
              />
            </label>
            <label>
              <span>لون خط العنوان:</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                <input
                  type="color"
                  value={content.textColor || "#0f172a"}
                  onChange={(e) => update({ textColor: e.target.value })}
                  style={{ width: 34, height: 32, padding: 0, border: "none", cursor: "pointer", borderRadius: 6 }}
                />
                <input
                  type="text"
                  value={content.textColor || "#0f172a"}
                  onChange={(e) => update({ textColor: e.target.value })}
                  dir="ltr"
                  style={{ flex: 1 }}
                />
              </div>
            </label>
          </div>
          <CommonSectionStylingFields content={content} update={update} />
        </div>
      </div>
    );
  }

  return null;
};
