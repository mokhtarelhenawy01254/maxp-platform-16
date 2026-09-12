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
        <div className="eo-fields eo-fields-inline">
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

  return null;
};
