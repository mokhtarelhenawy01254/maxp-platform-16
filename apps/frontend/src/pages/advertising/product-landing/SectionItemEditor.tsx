import React, { useState } from "react";
import { Plus, Trash2, Star, ImagePlus } from "lucide-react";
import { LandingSection, ProductLandingProduct } from "./types";

interface SectionItemEditorProps {
  section: LandingSection;
  onUpdateContent: (updatedContent: LandingSection["content"]) => void;
  product?: ProductLandingProduct | null;
}

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
        </div>
      </div>
    );
  }

  return null;
};
