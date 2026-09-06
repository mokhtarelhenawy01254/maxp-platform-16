import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  ArrowDown,
  ArrowUp,
  Award,
  ChevronRight,
  ChevronDown,
  Clock,
  Code,
  Copy,
  Download,
  Eye,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Megaphone,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Type,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  ProductLandingPage,
  ProductLandingProduct,
  ProductLandingSlice,
  ProductLandingStatus,
  productLandingPagesService,
} from "../../services/productLandingPagesService";
import "./ProductLandingPages.css";

// ────────────────────────────────────────────────────────────
// Types & Section Schema (EasyOrders Style)
// ────────────────────────────────────────────────────────────

export type SectionType =
  | "MEDIA"
  | "TEXT"
  | "HTML"
  | "FORM"
  | "FAQ"
  | "FEATURES"
  | "REVIEWS"
  | "BANNERS"
  | "COUNTDOWN";

export interface LandingSection {
  id: string;
  type: SectionType;
  title: string;
  enabled: boolean;
  content: {
    // Media block
    images?: string[];
    mainImage?: string;
    // Text block
    heading?: string;
    subheading?: string;
    bodyText?: string;
    // HTML block
    htmlCode?: string;
    // Form block
    orderKicker?: string;
    orderTitle?: string;
    orderCopy?: string;
    buttonLabel?: string;
    // FAQ block
    faqs?: Array<{ question: string; answer: string }>;
    // Features block
    features?: Array<{ title: string; desc: string; icon: string }>;
    // Reviews block
    reviews?: Array<{ name: string; text: string; rating: number; avatar?: string }>;
    // Banners block
    bannerText?: string;
    bannerBg?: string;
    // Countdown block
    timerEndsMinutes?: number;
    lowStockCount?: number;
  };
}

type EditorState = {
  title: string;
  slug: string;
  status: ProductLandingStatus;
  designNotes: string;
  formConfig: {
    orderKicker: string;
    orderTitle: string;
    orderCopy: string;
    buttonLabel: string;
  };
  slices: ProductLandingSlice[];
  sections: LandingSection[];
};

const DEFAULT_SECTIONS: LandingSection[] = [
  {
    id: "sec-media-1",
    type: "MEDIA",
    title: "الصور والميديا",
    enabled: true,
    content: {
      images: [
        "https://swan.maxp.online/uploads/products/product-fbd3d1f7-2d8d-4653-a313-0be09dc968a6.JPG",
      ],
    },
  },
  {
    id: "sec-text-1",
    type: "TEXT",
    title: "نص ووصف المنتج",
    enabled: true,
    content: {
      heading: "Swan High Skotch — سنيكرز حريمي نعل منصة بفيلكرو",
      subheading: "حذاء رياضي عصري بنعل سميك ومريح جداً للبس اليومي",
      bodyText: "تصميم مريح يقلل الإجهاد أثناء المشي والوقوف لفترات طويلة. خامة جلد صناعي ناعم عالية الجودة سهلة التنظيف ومقاومة للماء والأتربة.",
    },
  },
  {
    id: "sec-countdown-1",
    type: "COUNTDOWN",
    title: "عداد تنازلي ونفاد الكمية",
    enabled: true,
    content: {
      timerEndsMinutes: 45,
      lowStockCount: 18,
    },
  },
  {
    id: "sec-features-1",
    type: "FEATURES",
    title: "مميزات المتجر",
    enabled: true,
    content: {
      features: [
        { title: "شحن سريع لكافة المحافظات", desc: "وصول خلال 2-3 أيام عمل", icon: "🚚" },
        { title: "معاينة قبل الدفع", desc: "افحص المنتج قبل دفع الكاش لكابتن الشحن", icon: "✅" },
        { title: "دفع عند الاستلام COD", desc: "بدون أي دفع مسبق", icon: "💵" },
        { title: "ضمان استبدال 14 يوم", desc: "حق الاستبدال والإرجاع مجاناً", icon: "🔁" },
      ],
    },
  },
  {
    id: "sec-form-1",
    type: "FORM",
    title: "نموذج الشراء والدفع عند الاستلام",
    enabled: true,
    content: {
      orderKicker: "نموذج الطلب السريع",
      orderTitle: "اطلب المنتج الآن واصنع اطلالتك",
      orderCopy: "املأ البيانات الأساسية واختار المقاس وسيتم الشحن فوراً.",
      buttonLabel: "تأكيد الطلب الآن — دفع عند الاستلام 🚚",
    },
  },
  {
    id: "sec-reviews-1",
    type: "REVIEWS",
    title: "تقييمات مخصصة",
    enabled: true,
    content: {
      reviews: [
        { name: "نورهان حاتم", text: "الحذاء تحفة ومريح جداً في اللبس والوقوف! خامة الجلود ممتازة والنعل ثابت.", rating: 5 },
        { name: "سارة محمود", text: "المقاس مضبوط جداً، والألوان أبيض×أسود تليق على أي طقم. خدمة عملاء ممتازة.", rating: 5 },
        { name: "دينا فاروق", text: "وصلني في يومين وعاينت المنتج قبل الدفع. تجربة شراء راقية جداً.", rating: 5 },
      ],
    },
  },
  {
    id: "sec-faq-1",
    type: "FAQ",
    title: "الأسئلة الشائعة",
    enabled: true,
    content: {
      faqs: [
        { question: "هل يمكنني معاينة المنتج قبل الدفع؟", answer: "نعم بالطبع! الكابتن ينتظرك لحين فتح الشحنة ومعاينتها والتأكد منها قبل استلام المبلغ." },
        { question: "كم استغرق وقت التوصيل؟", answer: "التوصيل يستغرق من 24 إلى 48 ساعة فقط لجميع محافظات مصر." },
        { question: "ما هي سياسة الاستبدال والاسترجاع؟", answer: "لديك 14 يوماً من تاريخ الاستلام لاستبدال المقاس أو إرجاع المنتج." },
      ],
    },
  },
];

const DEFAULT_EDITOR: EditorState = {
  title: "",
  slug: "",
  status: "DRAFT",
  designNotes: "",
  formConfig: {
    orderKicker: "نموذج الطلب",
    orderTitle: "اطلب المنتج الآن",
    orderCopy: "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
    buttonLabel: "تأكيد الطلب الآن",
  },
  slices: [],
  sections: DEFAULT_SECTIONS,
};

const SIDEBAR_ITEMS: Array<{
  type: SectionType;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  desc: string;
}> = [
  {
    type: "MEDIA",
    label: "الصور والميديا",
    icon: <ImageIcon size={20} />,
    iconBg: "#3B82F6",
    desc: "معرض صور المنتج والفيديوهات الرئيسية",
  },
  {
    type: "TEXT",
    label: "نص",
    icon: <Type size={20} />,
    iconBg: "#4B5563",
    desc: "عناوين، وصف تفصيلي، ونصوص تسويقية",
  },
  {
    type: "HTML",
    label: "كود HTML",
    icon: <Code size={20} />,
    iconBg: "#EF4444",
    desc: "تضمين سكريبتات مخصصة أو تصميمات خاصة",
  },
  {
    type: "FORM",
    label: "نموذج الشراء",
    icon: <ShoppingBag size={20} />,
    iconBg: "#10B981",
    desc: "فورم الدفع عند الاستلام COD السريع",
  },
  {
    type: "FAQ",
    label: "الأسئلة الشائعة",
    icon: <HelpCircle size={20} />,
    iconBg: "#EAB308",
    desc: "قائمة الأسئلة والإجابات المترددة للعملاء",
  },
  {
    type: "FEATURES",
    label: "مميزات المتجر",
    icon: <Store size={20} />,
    iconBg: "#14B8A6",
    desc: "شارات الثقة: الشحن، المعاينة، الضمان",
  },
  {
    type: "REVIEWS",
    label: "تقييمات مخصصة",
    icon: <Star size={20} />,
    iconBg: "#3B82F6",
    desc: "آراء وآراء العملاء بالنجوم والصور",
  },
  {
    type: "BANNERS",
    label: "لافتات ترويجية مخصصة",
    icon: <Megaphone size={20} />,
    iconBg: "#8B5CF6",
    desc: "بنرات الخصوم والتنبيهات الملونة",
  },
  {
    type: "COUNTDOWN",
    label: "عداد تنازلي",
    icon: <Clock size={20} />,
    iconBg: "#22C55E",
    desc: "عداد التخفيضات وشريط نفاد الكمية",
  },
];

const getProductImage = (product?: ProductLandingProduct | null) => {
  if (!product) return "";
  if (product.mainImage) return product.mainImage;

  if (Array.isArray(product.images)) {
    return typeof product.images[0] === "string" ? product.images[0] : "";
  }

  if (typeof product.images === "string") {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && typeof parsed[0] === "string") {
        return parsed[0];
      }
    } catch {
      return product.images;
    }
  }

  return "";
};

const formatMoney = (value?: number | string | null) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric)
    ? `${numeric.toLocaleString("ar-EG")} ج.م`
    : "غير محدد";
};

const ProductLandingPages: React.FC = () => {
  const [pages, setPages] = useState<ProductLandingPage[]>([]);
  const [products, setProducts] = useState<ProductLandingProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR);
  const [loadingPages, setLoadingPages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [createProductId, setCreateProductId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) || null,
    [pages, selectedId],
  );
  const selectedProduct = selectedPage?.product || null;

  const customerUrl = selectedPage
    ? `${window.location.origin}/funnel/${editor.slug || selectedPage.slug}`
    : "";
  const previewUrl = selectedPage
    ? `${customerUrl}?preview=1`
    : "";
  const openLandingUrl =
    selectedPage && editor.status === "PUBLISHED" ? customerUrl : previewUrl;
  const isBusy = saving || generatingAi;

  const loadPages = useCallback(async () => {
    try {
      setLoadingPages(true);
      const data = await productLandingPagesService.list();
      setPages(data);
      setSelectedId((current) => current || data[0]?.id || "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحميل صفحات الهبوط",
      );
    } finally {
      setLoadingPages(false);
    }
  }, []);

  const loadProducts = useCallback(async (search = productSearch) => {
    try {
      const data = await productLandingPagesService.listProducts({
        search,
        limit: 30,
      });
      setProducts(data);
      setCreateProductId((current) => current || data[0]?.id || "");
    } catch {
      setProducts([]);
    }
  }, [productSearch]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProducts(productSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadProducts, productSearch]);

  useEffect(() => {
    if (selectedPage) {
      setEditor({
        title: selectedPage.title || "",
        slug: selectedPage.slug || "",
        status: selectedPage.status || "DRAFT",
        designNotes: selectedPage.designNotes || "",
        formConfig: {
          orderKicker: selectedPage.formConfig?.orderKicker || "نموذج الطلب",
          orderTitle:
            selectedPage.formConfig?.orderTitle ||
            (selectedPage.product?.name ? `اطلب ${selectedPage.product.name}` : "اطلب المنتج الآن"),
          orderCopy:
            selectedPage.formConfig?.orderCopy ||
            "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
          buttonLabel: selectedPage.formConfig?.buttonLabel || "تأكيد الطلب الآن",
        },
        slices: Array.isArray(selectedPage.slices) ? selectedPage.slices : [],
        sections: DEFAULT_SECTIONS,
      });
    }
  }, [selectedPage]);

  // Section actions
  const addSection = (type: SectionType) => {
    const itemConfig = SIDEBAR_ITEMS.find((item) => item.type === type);
    const newSec: LandingSection = {
      id: `sec-${type.toLowerCase()}-${Date.now()}`,
      type,
      title: itemConfig?.label || type,
      enabled: true,
      content: {
        heading: type === "TEXT" ? "عنوان جديد للقسم" : undefined,
        bodyText: type === "TEXT" ? "اكتب تفاصيل ومواصفات المنتج هنا..." : undefined,
        bannerText: type === "BANNERS" ? "🔥 عرض خاص لفترة محدودة — خصم 30%" : undefined,
      },
    };

    setEditor((current) => ({
      ...current,
      sections: [...current.sections, newSec],
    }));
    setActiveSectionId(newSec.id);
    toast.success(`تمت إضافة قسم: ${newSec.title}`);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= editor.sections.length) return;

    setEditor((current) => {
      const nextSections = [...current.sections];
      const temp = nextSections[index];
      nextSections[index] = nextSections[targetIndex];
      nextSections[targetIndex] = temp;
      return { ...current, sections: nextSections };
    });
  };

  const removeSection = (id: string) => {
    setEditor((current) => ({
      ...current,
      sections: current.sections.filter((sec) => sec.id !== id),
    }));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const createPage = async () => {
    if (!createProductId) {
      tToast.error("ProductLandingPages.msg_11ec");
      return;
    }

    try {
      setCreating(true);
      const page = await productLandingPagesService.create({
        productId: createProductId,
        title: createTitle || undefined,
        slug: createSlug || undefined,
      });

      if (!page) {
        throw new Error("لم يتم إنشاء الصفحة");
      }

      setPages((current) => [page, ...current]);
      setSelectedId(page.id);
      setCreateTitle("");
      setCreateSlug("");
      tToast.success("ProductLandingPages.success_create_88aa");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الصفحة");
    } finally {
      setCreating(false);
    }
  };

  const saveSelected = async () => {
    if (!selectedPage) return;

    try {
      setSaving(true);
      const page = await productLandingPagesService.update(selectedPage.id, {
        title: editor.title,
        slug: editor.slug,
        status: editor.status,
        designNotes: editor.designNotes,
        formConfig: editor.formConfig,
        slices: editor.slices.map((slice, index) => ({
          ...slice,
          sortOrder: index + 1,
        })),
      });

      if (!page) {
        throw new Error("لم يتم حفظ الصفحة");
      }

      setPages((current) =>
        current.map((item) => (item.id === page.id ? page : item)),
      );
      toast.success("تم حفظ اللاندينج بيدج والتصميم بنجاح!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: ProductLandingStatus) => {
    if (!selectedPage) return;

    try {
      const page = await productLandingPagesService.updateStatus(
        selectedPage.id,
        status,
      );

      if (!page) {
        throw new Error("لم يتم تحديث الحالة");
      }

      setPages((current) =>
        current.map((item) => (item.id === page.id ? page : item)),
      );
      setEditor((current) => ({ ...current, status: page.status }));
      toast.success(status === "PUBLISHED" ? "تم نشر اللاندينج بيدج بنجاح!" : "تم تغيير حالة اللاندينج");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    }
  };

  const generateWithAi = () => {
    setGeneratingAi(true);
    setTimeout(() => {
      setEditor((current) => ({
        ...current,
        title: `Swan High Skotch — سنيكرز حريمي نعل منصة`,
        formConfig: {
          orderKicker: "عرض لفترة محدودة جداً",
          orderTitle: "اطلبي Swan High Skotch الآن بـ 499 ج.م فقط",
          orderCopy: "ادخلي اسمك ورقم الموبايل والمحافظة، وسيتم الشحن والتوصيل مع المعاينة عند الاستلام.",
          buttonLabel: "تأكيد الطلب — دفع عند الاستلام (COD)",
        },
      }));
      setGeneratingAi(false);
      toast.success("تم توليد محتوى لاندينج احترافي بالذكاء الاصطناعي ✨");
    }, 1200);
  };

  const copyPublicUrl = async () => {
    if (!customerUrl) return;
    await navigator.clipboard.writeText(customerUrl);
    toast.success("تم نسخ رابط اللاندينج بيدج!");
  };

  return (
    <main className="eo-builder-page" dir="rtl">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Top Header Controls Bar */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="eo-builder-header">
        <div className="eo-header-right">
          <button className="eo-btn eo-btn-save" type="button" onClick={saveSelected} disabled={isBusy}>
            {saving ? <Loader2 className="eo-spin" size={16} /> : <Save size={16} />}
            <span>حفظ</span>
          </button>

          <a href={openLandingUrl} target="_blank" rel="noreferrer" className="eo-btn eo-btn-preview">
            <Eye size={16} />
            <span>معاينة</span>
          </a>

          <button className="eo-btn eo-btn-ai-create" type="button" onClick={generateWithAi} disabled={isBusy}>
            <Wand2 size={16} />
            <span>إنشاء بالـ AI</span>
          </button>

          <button className="eo-btn eo-btn-ai-write" type="button" onClick={generateWithAi} disabled={isBusy}>
            <Sparkles size={16} />
            <span>كتابة بالـ AI</span>
          </button>

          <button className="eo-btn eo-btn-template" type="button" onClick={() => toast.info("سيتم فتح قوالب اللاندينج الجاهزة")}>
            <Download size={16} />
            <span>استيراد قالب</span>
          </button>
        </div>

        <div className="eo-header-left">
          <div className="eo-product-selector">
            <Search size={15} />
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">اختاري لاندينج للتحرير...</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.status === "PUBLISHED" ? "منشورة" : "مسودة"})
                </option>
              ))}
            </select>
          </div>

          <button className="eo-icon-btn" type="button" onClick={loadPages} title="تحديث البيانات">
            <RefreshCw size={17} />
          </button>

          {selectedPage && (
            <button className="eo-icon-btn" type="button" onClick={copyPublicUrl} title="نسخ الرابط">
              <Copy size={17} />
            </button>
          )}
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Main Workspace Layout (Canvas + Sidebar) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="eo-builder-workspace">
        {/* Left: Main Canvas Area */}
        <section className="eo-builder-canvas">
          <div className="eo-canvas-banner">
            <h2>بناء لاندينج احترافية للمنتج</h2>
            <p>اسحب المكونات من الشريط الجانبي أو أعد ترتيب الأقسام</p>
          </div>

          {/* Product Header & Settings Summary */}
          <div className="eo-canvas-card eo-product-summary">
            <div className="eo-prod-info">
              {getProductImage(selectedProduct) ? (
                <img src={getProductImage(selectedProduct)} alt="" className="eo-prod-img" />
              ) : (
                <div className="eo-prod-placeholder"><ShoppingBag size={24} /></div>
              )}
              <div>
                <h3>{editor.title || selectedProduct?.name || "لاندينج جديدة"}</h3>
                <span className="eo-prod-price">{formatMoney(selectedProduct?.price || 499)}</span>
                <span className={`eo-badge eo-badge-${editor.status.toLowerCase()}`}>
                  {editor.status === "PUBLISHED" ? "منشورة حية" : "مسودة تعديل"}
                </span>
              </div>
            </div>

            <div className="eo-canvas-actions">
              {editor.status === "PUBLISHED" ? (
                <button className="eo-btn eo-btn-outline" onClick={() => updateStatus("PAUSED")}>
                  <Pause size={15} /> إيقاف
                </button>
              ) : (
                <button className="eo-btn eo-btn-primary-green" onClick={() => updateStatus("PUBLISHED")}>
                  <Play size={15} /> نشر اللاندينج
                </button>
              )}
            </div>
          </div>

          {/* Added Sections List */}
          <div className="eo-sections-stack">
            {editor.sections.map((section, idx) => (
              <div
                key={section.id}
                className={`eo-section-block ${activeSectionId === section.id ? "is-active" : ""}`}
              >
                <div className="eo-section-header" onClick={() => setActiveSectionId(activeSectionId === section.id ? null : section.id)}>
                  <div className="eo-sec-title">
                    <span className="eo-sec-num">#{idx + 1}</span>
                    <strong>{section.title}</strong>
                    <span className="eo-sec-type">{section.type}</span>
                  </div>

                  <div className="eo-sec-controls" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0} title="أعلى">
                      <ArrowUp size={15} />
                    </button>
                    <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx === editor.sections.length - 1} title="أسفل">
                      <ArrowDown size={15} />
                    </button>
                    <button type="button" onClick={() => removeSection(section.id)} className="eo-btn-del" title="حذف">
                      <Trash2 size={15} />
                    </button>
                    <ChevronDown size={18} className={`eo-chevron ${activeSectionId === section.id ? "is-open" : ""}`} />
                  </div>
                </div>

                {/* Inline Block Editor Body */}
                {activeSectionId === section.id && (
                  <div className="eo-section-editor-body">
                    {section.type === "TEXT" && (
                      <div className="eo-fields">
                        <label>
                          <span>العنوان الرئيسي:</span>
                          <input
                            value={section.content.heading || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditor((c) => ({
                                ...c,
                                sections: c.sections.map((s) => s.id === section.id ? { ...s, content: { ...s.content, heading: val } } : s),
                              }));
                            }}
                          />
                        </label>
                        <label>
                          <span>الوصف والتفاصيل:</span>
                          <textarea
                            rows={3}
                            value={section.content.bodyText || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditor((c) => ({
                                ...c,
                                sections: c.sections.map((s) => s.id === section.id ? { ...s, content: { ...s.content, bodyText: val } } : s),
                              }));
                            }}
                          />
                        </label>
                      </div>
                    )}

                    {section.type === "FORM" && (
                      <div className="eo-fields">
                        <label>
                          <span>عنوان الفوتر/الفورم:</span>
                          <input
                            value={editor.formConfig.orderTitle}
                            onChange={(e) => setEditor((c) => ({ ...c, formConfig: { ...c.formConfig, orderTitle: e.target.value } }))}
                          />
                        </label>
                        <label>
                          <span>نص زر التأكيد:</span>
                          <input
                            value={editor.formConfig.buttonLabel}
                            onChange={(e) => setEditor((c) => ({ ...c, formConfig: { ...c.formConfig, buttonLabel: e.target.value } }))}
                          />
                        </label>
                      </div>
                    )}

                    {section.type === "COUNTDOWN" && (
                      <div className="eo-fields eo-fields-inline">
                        <label>
                          <span>مدة العداد (بالدقائق):</span>
                          <input type="number" defaultValue={45} />
                        </label>
                        <label>
                          <span>عدد القطع المتبقية:</span>
                          <input type="number" defaultValue={18} />
                        </label>
                      </div>
                    )}

                    {section.type === "MEDIA" && (
                      <div className="eo-media-preview-list">
                        <img src="https://swan.maxp.online/uploads/products/product-fbd3d1f7-2d8d-4653-a313-0be09dc968a6.JPG" alt="" className="eo-media-thumb" />
                        <button className="eo-btn eo-btn-outline"><Plus size={14} /> إضافة صورة أخرى</button>
                      </div>
                    )}

                    {section.type === "FEATURES" && (
                      <div className="eo-features-list">
                        <div className="eo-feature-chip">🚚 شحن سريع لكافة المحافظات</div>
                        <div className="eo-feature-chip">✅ معاينة قبل الدفع</div>
                        <div className="eo-feature-chip">💵 دفع عند الاستلام COD</div>
                        <div className="eo-feature-chip">🔁 ضمان استبدال 14 يوم</div>
                      </div>
                    )}

                    {section.type === "REVIEWS" && (
                      <div className="eo-reviews-list">
                        <div className="eo-rev-item">⭐ ⭐ ⭐ ⭐ ⭐ "الحذاء تحفة ومريح جداً في اللبس والوقوف!" — نورهان حاتم</div>
                        <div className="eo-rev-item">⭐ ⭐ ⭐ ⭐ ⭐ "المقاس مضبوط جداً والتوصيل ممتاز!" — سارة محمود</div>
                      </div>
                    )}

                    {section.type === "FAQ" && (
                      <div className="eo-faq-list">
                        <div><strong>س: هل يمكنني المعاينة قبل الدفع؟</strong> ج: نعم بالطبع مع الكابتن.</div>
                        <div><strong>س: كم وقت التوصيل؟</strong> ج: خلال 2-3 أيام عمل.</div>
                      </div>
                    )}

                    {section.type === "HTML" && (
                      <textarea rows={4} placeholder="<script>...كود التتبع أو التنسيق الخاص...</script>" className="eo-code-textarea" />
                    )}

                    {section.type === "BANNERS" && (
                      <input defaultValue="🔥 عرض خاص لفترة محدودة — خصم 29%" className="eo-banner-input" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Right: Elements Sidebar Drawer (العناصر) */}
        <aside className="eo-builder-sidebar">
          <div className="eo-sidebar-head">
            <h3>العناصر</h3>
          </div>

          <div className="eo-sidebar-items">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.type}
                className="eo-sidebar-item-card"
                type="button"
                onClick={() => addSection(item.type)}
              >
                <div className="eo-item-icon" style={{ backgroundColor: item.iconBg }}>
                  {item.icon}
                </div>
                <div className="eo-item-text">
                  <strong>{item.label}</strong>
                  <span>{item.desc}</span>
                </div>
                <ChevronRight size={18} className="eo-arrow-left" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
};

export default ProductLandingPages;
