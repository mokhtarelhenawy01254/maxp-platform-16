import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, Layers, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  ProductLandingPage,
  ProductLandingProduct,
  ProductLandingStatus,
  SectionType,
  productLandingPagesService,
} from "../../services/productLandingPagesService";
import {
  DEFAULT_EDITOR,
  EditorState,
  LandingSection,
  LandingTemplate,
  SIDEBAR_ITEMS,
  buildDefaultSectionsForProduct,
  exportLandingPageToJson,
  importLandingPageFromJson,
} from "./product-landing/types";
import { ProductLandingHeader } from "./product-landing/ProductLandingHeader";
import { ProductSummaryCard } from "./product-landing/ProductSummaryCard";
import { SectionsStackEditor } from "./product-landing/SectionsStackEditor";
import { ElementsSidebarDrawer } from "./product-landing/ElementsSidebarDrawer";
import { CreateLandingModal } from "./product-landing/CreateLandingModal";
import { TemplatesLibraryModal } from "./product-landing/TemplatesLibraryModal";
import { LandingStylePanel } from "./product-landing/LandingStylePanel";
import { LandingSeoPanel } from "./product-landing/LandingSeoPanel";
import { LandingLivePreview } from "./product-landing/LandingLivePreview";
import {
  useEditorHistory,
  useUndoKeyboardShortcuts,
} from "./product-landing/useEditorHistory";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildStoreUrl } from "../../utils/storeUrl";
import "./ProductLandingPages.css";

const ProductLandingPages: React.FC = () => {
  const [pages, setPages] = useState<ProductLandingPage[]>([]);
  const [products, setProducts] = useState<ProductLandingProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const {
    editor,
    updateEditor,
    undo,
    redo,
    resetEditor,
    canUndo,
    canRedo,
  } = useEditorHistory<EditorState>(DEFAULT_EDITOR);
  useUndoKeyboardShortcuts(undo, redo);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [showPhonePreview, setShowPhonePreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const [isElementsDrawerOpen, setIsElementsDrawerOpen] = useState(false);
  // بيزيد مع كل حفظ ناجح — جزء من إشارة تحديث المعاينة الحية
  const [saveTick, setSaveTick] = useState(0);

  const { user } = useAuth();
  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) || null,
    [pages, selectedId],
  );
  const selectedProduct = selectedPage?.product || null;

  const liveSlug = selectedPage?.slug || "";
  const companySlug = user?.company?.slug || "";
  const customDomain = user?.company?.customDomain || "";
  const companyId = user?.companyId || user?.company?.id || selectedPage?.companyId;

  const customerUrl = useMemo(() => {
    if (!liveSlug) return "";
    return buildStoreUrl(
      companySlug,
      `/store/lp/${liveSlug}`,
      customDomain || undefined,
      companyId,
    );
  }, [liveSlug, companySlug, customDomain, companyId]);

  const previewUrl = useMemo(() => {
    if (!customerUrl) return "";
    return selectedPage?.status === "PUBLISHED" ? customerUrl : `${customerUrl}?preview=1`;
  }, [customerUrl, selectedPage?.status]);

  // Live preview reload signal: editor snapshot + save counter, so refreshes
  // land after the autosave has persisted the change.
  const previewRefreshToken = useMemo(
    () =>
      `${saveTick}::${JSON.stringify([
        editor.title,
        editor.slug,
        editor.status,
        editor.style,
        editor.seo,
        editor.formConfig,
        editor.sections?.map((s) => [s.id, s.enabled, s.variant, s.title]),
      ])}`,
    [
      saveTick,
      editor.title,
      editor.slug,
      editor.status,
      editor.style,
      editor.seo,
      editor.formConfig,
      editor.sections,
    ],
  );

  // Load landing pages list
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

  // Load products list for creation modal
  const loadProducts = useCallback(async (search = "") => {
    try {
      setLoadingProducts(true);
      const data = await productLandingPagesService.listProducts({
        search,
        limit: 30,
      });
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
    loadProducts();
  }, [loadPages, loadProducts]);

  // Sync editor state when selected landing page changes
  useEffect(() => {
    if (selectedPage) {
      const savedSections =
        Array.isArray(selectedPage.sections) && selectedPage.sections.length > 0
          ? selectedPage.sections
          : Array.isArray(selectedPage.formConfig?.sections) &&
              selectedPage.formConfig!.sections!.length > 0
            ? selectedPage.formConfig!.sections!
            : buildDefaultSectionsForProduct(selectedPage.product);

      resetEditor({
        title: selectedPage.title || "",
        slug: selectedPage.slug || "",
        status: selectedPage.status || "DRAFT",
        designNotes: selectedPage.designNotes || "",
        formConfig: {
          orderKicker: selectedPage.formConfig?.orderKicker || "نموذج الطلب",
          orderTitle:
            selectedPage.formConfig?.orderTitle ||
            (selectedPage.product?.name
              ? `اطلب ${selectedPage.product.name}`
              : "اطلب المنتج الآن"),
          orderCopy:
            selectedPage.formConfig?.orderCopy ||
            "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
          buttonLabel:
            selectedPage.formConfig?.buttonLabel || "تأكيد الطلب الآن",
        },
        slices: Array.isArray(selectedPage.slices) ? selectedPage.slices : [],
        sections: savedSections,
        style: selectedPage.style || {},
        seo: selectedPage.seo || {},
      });
      setActiveSectionId(savedSections[0]?.id || null);
      setIsDirty(false);
    }
  }, [selectedPage]);

  // Section Management Handlers
  const handleAddSection = (type: SectionType) => {
    const itemConfig = SIDEBAR_ITEMS.find((item) => item.type === type);
    const newSec: LandingSection = {
      id: `sec-${type.toLowerCase()}-${Date.now()}`,
      type,
      title: itemConfig?.label || type,
      enabled: true,
      content: {
        heading:
          type === "TEXT"
            ? "عنوان جديد للقسم"
            : type === "HOW_IT_WORKS"
            ? "طريقة الاستخدام السهلة في 3 خطوات"
            : type === "HEADING"
            ? "اكتشف القوة والأناقة في منتج واحد"
            : type === "YOUTUBE_VIDEO"
            ? "شاهد تجربة واستعراض المنتج على الطبيعة"
            : undefined,
        bodyText:
          type === "TEXT" ? "اكتب تفاصيل ومواصفات المنتج هنا..." : undefined,
        bannerText:
          type === "BANNERS"
            ? "🔥 عرض خاص لفترة محدودة — خصم 30% + شحن مجاني"
            : undefined,
        timerEndsMinutes: type === "COUNTDOWN" ? 45 : undefined,
        lowStockCount: type === "COUNTDOWN" ? 14 : undefined,
        comparisonTitle:
          type === "COMPARISON"
            ? "لماذا تختار منتجنا الأصلي بدلاً من البدائل في السوق؟"
            : undefined,
        comparisonUsLabel: type === "COMPARISON" ? "منتجنا الأصلي" : undefined,
        comparisonThemLabel:
          type === "COMPARISON" ? "المنتجات المقلدة في السوق" : undefined,
        comparisonItems:
          type === "COMPARISON"
            ? [
                {
                  feature: "جودة الخامات",
                  us: "خامات أصلية عالية التحمل ومقاومة للتآكل",
                  them: "خامات بلاستيكية سريعة التلف والتقشير",
                },
                {
                  feature: "الراحة وسهولة الاستخدام",
                  us: "تصميم مريح للاستخدام اليومي والمشاوير الطويلة",
                  them: "يسبب إجهاد وتعب بعد الاستخدام لفترة وجيزة",
                },
                {
                  feature: "معاينة قبل الدفع",
                  us: "افحص المنتج براحتك قبل الاستلام والدفع",
                  them: "ممنوع فتح الشحنة قبل الدفع",
                },
                {
                  feature: "الضمان والاستبدال",
                  us: "ضمان 14 يوم استرجاع واستبدال فوري",
                  them: "لا يوجد أي ضمان أو استرجاع بعد البيع",
                },
              ]
            : undefined,
        breakdownTitle:
          type === "BREAKDOWN"
            ? "تشريح ومواصفات المنتج الدقيقة"
            : undefined,
        breakdownItems:
          type === "BREAKDOWN"
            ? [
                {
                  title: "نعل طبي ماص للصدمات",
                  desc: "مرونة كاملة لراحة الكعب والركبة طوال اليوم",
                  icon: "👟",
                  tag: "طبي 100%",
                },
                {
                  title: "خامات مسامية مانعة للتعرق",
                  desc: "تهوية مستمرة لانتعاش القدم ومنع الروائح",
                  icon: "💨",
                  tag: "انتعاش",
                },
                {
                  title: "خياطة يدوية مدعمة",
                  desc: "متانة فائقة تتحمل المشاوير اليومية الشاقة",
                  icon: "🧵",
                  tag: "متانة",
                },
                {
                  title: "خفة وزن استثنائية",
                  desc: "وزن خفيف جداً يمنحك راحة وسرعة في الحركة",
                  icon: "🪶",
                  tag: "خفيف جداً",
                },
              ]
            : undefined,
        galleryTitle:
          type === "GALLERY" ? "لقطات حية للمنتج على الطبيعة" : undefined,
        galleryImages:
          type === "GALLERY"
            ? [
                {
                  url: selectedProduct?.mainImage || "",
                  caption: "زاوية أمامية للمنتج",
                },
              ]
            : undefined,
        satisfactionRate:
          type === "LIVE_PROOF" ? "4.9 / 5 (أكثر من 1,420 تقييم)" : undefined,
        recentOrders:
          type === "LIVE_PROOF"
            ? [
                {
                  buyer: "أميرة م.",
                  city: "مدينة نصر، القاهرة",
                  timeAgo: "منذ 4 دقائق",
                  item: selectedProduct?.name || "المنتج",
                },
                {
                  buyer: "محمود ع.",
                  city: "سموحة، الإسكندرية",
                  timeAgo: "منذ 11 دقيقة",
                  item: `${selectedProduct?.name || "المنتج"} (باقة قطعتين)`,
                },
                {
                  buyer: "نورهان س.",
                  city: "المنصورة، الدقهلية",
                  timeAgo: "منذ 19 دقيقة",
                  item: selectedProduct?.name || "المنتج",
                },
              ]
            : undefined,
        videoUrl:
          type === "VIDEO_REEL"
            ? "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-person-unboxing-a-new-pair-of-shoes-42998-large.mp4"
            : undefined,
        videoThumbnail:
          type === "VIDEO_REEL" ? selectedProduct?.mainImage || "" : undefined,
        videoCaption:
          type === "VIDEO_REEL"
            ? "شاهد تجربة المنتج والأنبوكسينغ على الطبيعة بدون فلاتر"
            : undefined,
        beforeImage:
          type === "BEFORE_AFTER" ? selectedProduct?.mainImage || "" : undefined,
        afterImage:
          type === "BEFORE_AFTER" ? selectedProduct?.mainImage || "" : undefined,
        beforeLabel:
          type === "BEFORE_AFTER" ? "الأحذية العادية (إجهاد وألم في الكعب)" : undefined,
        afterLabel:
          type === "BEFORE_AFTER"
            ? `${selectedProduct?.name || "المنتج الأصلي"} (راحة وامتصاص صدمات)`
            : undefined,
        // EasyOrders additional section types defaults:
        mainImage:
          type === "IMAGE_ONLY"
            ? selectedProduct?.mainImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80"
            : undefined,
        imageUrl:
          type === "IMAGE_ONLY" || type === "FEATURED_PRODUCT"
            ? selectedProduct?.mainImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80"
            : undefined,
        isFullWidth: type === "IMAGE_ONLY" ? true : undefined,
        variant: type === "IMAGE_ONLY" ? "rounded" : undefined,
        carouselImages:
          type === "CAROUSEL"
            ? [
                { id: "c-1", url: selectedProduct?.mainImage || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", caption: "اللقطة الأولى" },
                { id: "c-2", url: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80", caption: "اللقطة الثانية" },
              ]
            : undefined,
        autoplay: type === "CAROUSEL" ? true : undefined,
        slideInterval: type === "CAROUSEL" ? 3 : undefined,
        title:
          type === "HOW_IT_WORKS"
            ? "طريقة الاستخدام السهلة في 3 خطوات"
            : type === "HEADING"
            ? "اكتشف القوة والأناقة في منتج واحد"
            : type === "YOUTUBE_VIDEO"
            ? "شاهد تجربة واستعراض المنتج على الطبيعة"
            : undefined,
        subheading:
          type === "HOW_IT_WORKS"
            ? "خطوات بسيطة تضمن لك أقصى استفادة من أول يوم"
            : type === "HEADING"
            ? "صُمم خصيصاً ليلبي أعلى معايير الجودة والراحة اليومية"
            : undefined,
        subtitle:
          type === "HOW_IT_WORKS"
            ? "خطوات بسيطة تضمن لك أقصى استفادة من أول يوم"
            : type === "HEADING"
            ? "صُمم خصيصاً ليلبي أعلى معايير الجودة والراحة اليومية"
            : undefined,
        steps:
          type === "HOW_IT_WORKS"
            ? [
                { stepNumber: 1, number: 1, title: "الطلب وتأكيد الشحن", desc: "املأ نموذج الطلب وسيتواصل معك فريق خدمة العملاء فوراً لتأكيد العنوان.", icon: "📦" },
                { stepNumber: 2, number: 2, title: "المعاينة قبل الدفع", desc: "استلم شحنتك وافتحها وافحص جودة المنتج والمقاس بنفسك قبل دفع أي جنيه للمندوب.", icon: "🔍" },
                { stepNumber: 3, number: 3, title: "تجربة واستخدام مريح", desc: "استمتع بالراحة والأداء العالي مع ضمان استبدال واسترجاع مجاني لمدة 14 يوماً.", icon: "✨" },
              ]
            : undefined,
        productName:
          type === "FEATURED_PRODUCT" ? selectedProduct?.name || "المنتج المميز" : undefined,
        featuredBadge:
          type === "FEATURED_PRODUCT" ? "الأكثر طلباً وتوفيراً 🔥" : undefined,
        badge:
          type === "FEATURED_PRODUCT" ? "الأكثر طلباً وتوفيراً 🔥" : type === "HEADING" ? "ميزة حصرية ✨" : undefined,
        price:
          type === "FEATURED_PRODUCT" ? selectedProduct?.price || 499 : undefined,
        oldPrice:
          type === "FEATURED_PRODUCT" ? (selectedProduct?.price || 499) + 200 : undefined,
        currency:
          type === "FEATURED_PRODUCT" ? "ج.م" : undefined,
        rating:
          type === "FEATURED_PRODUCT" ? 4.9 : undefined,
        ctaText:
          type === "FEATURED_PRODUCT" ? "اطلب الآن واستفد من العرض" : undefined,
        featuredBullets:
          type === "FEATURED_PRODUCT"
            ? [
                "خامات أصلية عالية الجودة تدوم لسنوات",
                "تصميم مريح يدعم الاستخدام اليومي المكثف",
                "شحن سريع لجميع المحافظات مع معاينة قبل الدفع",
              ]
            : undefined,
        youtubeUrl:
          type === "YOUTUBE_VIDEO" ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : undefined,
        buyButtonText:
          type === "BUY_BUTTON" ? "اضغط هنا لطلب المنتج الآن — الدفع عند الاستلام 🚚" : undefined,
        text:
          type === "BUY_BUTTON" ? "اضغط هنا لطلب المنتج الآن — الدفع عند الاستلام 🚚" : undefined,
        targetAction:
          type === "BUY_BUTTON" ? "scroll_to_form" : undefined,
        btnColor:
          type === "BUY_BUTTON" ? "#16a34a" : undefined,
        btnTextColor:
          type === "BUY_BUTTON" ? "#ffffff" : undefined,
        animation:
          type === "BUY_BUTTON" ? "pulse" : undefined,
        alignment:
          type === "HEADING" ? "center" : undefined,
        headingLevel:
          type === "HEADING" ? "h2" : undefined,
      },
    };

    updateEditor((current) => ({
      ...current,
      sections: [...current.sections, newSec],
    }));
    setActiveSectionId(newSec.id);
    setIsDirty(true);
    toast.success(`تمت إضافة: ${newSec.title}`);
  };

  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= editor.sections.length) return;

    updateEditor((current) => {
      const nextSections = [...current.sections];
      const temp = nextSections[index];
      nextSections[index] = nextSections[targetIndex];
      nextSections[targetIndex] = temp;
      return { ...current, sections: nextSections };
    });
    setIsDirty(true);
  };

  const handleReorderSections = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex < 0 ||
      sourceIndex >= editor.sections.length ||
      targetIndex < 0 ||
      targetIndex >= editor.sections.length ||
      sourceIndex === targetIndex
    ) {
      return;
    }

    updateEditor((current) => {
      const nextSections = [...current.sections];
      const [moved] = nextSections.splice(sourceIndex, 1);
      nextSections.splice(targetIndex, 0, moved);
      return { ...current, sections: nextSections };
    });
    setIsDirty(true);
  };

  const handleDuplicateSection = (id: string) => {
    const sec = editor.sections.find((s) => s.id === id);
    if (!sec) return;
    const duplicated: LandingSection = {
      ...sec,
      id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${sec.title} (نسخة)`,
      content: JSON.parse(JSON.stringify(sec.content || {})),
    };
    const index = editor.sections.findIndex((s) => s.id === id);
    const next = [...editor.sections];
    next.splice(index + 1, 0, duplicated);
    updateEditor((current) => ({ ...current, sections: next }));
    setActiveSectionId(duplicated.id);
    setIsDirty(true);
    toast.success(`تم تكرار قسم: ${sec.title}`);
  };

  const handleToggleSectionEnabled = (id: string) => {
    updateEditor((current) => ({
      ...current,
      sections: current.sections.map((sec) =>
        sec.id === id ? { ...sec, enabled: sec.enabled === false ? true : false } : sec,
      ),
    }));
    setIsDirty(true);
  };

  const handleRemoveSection = (id: string) => {
    updateEditor((current) => ({
      ...current,
      sections: current.sections.filter((sec) => sec.id !== id),
    }));
    if (activeSectionId === id) setActiveSectionId(null);
    setIsDirty(true);
    toast.info("تم حذف القسم");
  };

  const handleExportJson = () => {
    if (!selectedPage) return;
    const jsonStr = exportLandingPageToJson(
      editor.title || selectedPage.title,
      editor.slug || selectedPage.slug,
      editor.sections,
      editor.formConfig,
    );
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `landing-${editor.slug || "page"}-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير تصميم الصفحة كملف JSON بنجاح! 📥");
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const imported = importLandingPageFromJson(text);
        if (!imported.sections || imported.sections.length === 0) {
          toast.error("الملف لا يحتوي على أي أقسام صالحة");
          return;
        }
        updateEditor((current) => ({
          ...current,
          title: imported.title || current.title,
          slug: imported.slug || current.slug,
          sections: imported.sections,
          formConfig: imported.formConfig || current.formConfig,
        }));
        if (imported.sections.length > 0) {
          setActiveSectionId(imported.sections[0].id);
        }
        setIsDirty(true);
        toast.success(`تم استيراد ${imported.sections.length} أقسام من ملف JSON بنجاح! 🚀`);
      } catch (err) {
        toast.error("فشل قراءة ملف JSON — تأكد من صحة الملف");
      }
    };
    reader.readAsText(file);
  };

  const handleApplyTemplate = (template: LandingTemplate) => {
    const newSections = template.buildSections(selectedProduct);
    updateEditor((current) => ({
      ...current,
      sections: newSections,
    }));
    if (newSections.length > 0) {
      setActiveSectionId(newSections[0].id);
    }
    setIsDirty(true);
    toast.success(`تم تطبيق قالب "${template.name}" بنجاح! ✨`);
  };

  const handleUpdateSectionContent = (
    id: string,
    updatedContent: LandingSection["content"],
  ) => {
    updateEditor((current) => ({
      ...current,
      sections: current.sections.map((sec) =>
        sec.id === id ? { ...sec, content: updatedContent } : sec,
      ),
    }));
    setIsDirty(true);
  };

  const handleUpdateSectionVariant = (id: string, variant: string) => {
    updateEditor((current) => ({
      ...current,
      sections: current.sections.map((sec) =>
        sec.id === id ? { ...sec, variant } : sec,
      ),
    }));
    setIsDirty(true);
  };

  // Actions
  const handleSave = async (silent = false) => {
    if (!selectedPage || saving) return;

    try {
      setSaving(true);
      const updated = await productLandingPagesService.update(selectedPage.id, {
        title: editor.title,
        slug: editor.slug,
        status: editor.status,
        designNotes: editor.designNotes,
        formConfig: {
          ...editor.formConfig,
          sections: editor.sections,
        },
        sections: editor.sections,
        slices: editor.slices,
        style: editor.style,
        seo: editor.seo,
      });

      if (!updated) {
        throw new Error("لم يتم حفظ الصفحة");
      }

      setPages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setIsDirty(false);
      setSaveTick((tick) => tick + 1);
      if (!silent) {
        toast.success("تم حفظ كافة أقسام وبيانات الصفحة بنجاح! 🎉");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الصفحة");
    } finally {
      setSaving(false);
    }
  };

  // Autosave: persist edits shortly after the last change so the live
  // preview (and safety net) track the merchant without manual saves.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (!isDirty || !selectedPage) return;
    const timer = window.setTimeout(() => {
      void handleSaveRef.current(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [editor, isDirty, selectedPage]);

  const handleUpdateStatus = async (status: ProductLandingStatus) => {
    if (!selectedPage) return;

    try {
      setUpdatingStatus(true);
      const updated = await productLandingPagesService.updateStatus(
        selectedPage.id,
        status,
      );

      if (!updated) {
        throw new Error("لم يتم تحديث الحالة");
      }

      setPages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      updateEditor((current) => ({ ...current, status: updated.status }));
      toast.success(
        status === "PUBLISHED"
          ? "تم نشر صفحة الهبوط بنجاح! 🚀"
          : "تم إيقاف صفحة الهبوط مؤقتاً ⏸️",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeletePage = async () => {
    if (!selectedPage) return;

    try {
      setDeleting(true);
      await productLandingPagesService.delete(selectedPage.id);
      toast.success("تم حذف صفحة الهبوط بنجاح 🗑️");
      const nextPages = pages.filter((p) => p.id !== selectedPage.id);
      setPages(nextPages);
      setSelectedId(nextPages[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الصفحة");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateAi = async () => {
    if (!selectedPage) return;

    try {
      setGeneratingAi(true);
      const result = await productLandingPagesService.generateAiContent(
        selectedPage.id,
      );

      if (result) {
        setPages((current) =>
          current.map((item) => (item.id === result.id ? result : item)),
        );
        toast.success("تم توليد محتوى الصفحة المخصص بالذكاء الاصطناعي بنجاح! ✨");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر التوليد بالذكاء الاصطناعي",
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCreatePage = async (payload: {
    productId: string;
    title: string;
    slug: string;
  }) => {
    try {
      setCreating(true);
      const prod = products.find((p) => p.id === payload.productId);
      const initialSections = buildDefaultSectionsForProduct(prod);

      const created = await productLandingPagesService.create({
        productId: payload.productId,
        title: payload.title,
        slug: payload.slug,
        sections: initialSections,
        formConfig: {
          sections: initialSections,
        },
      });

      if (!created) {
        throw new Error("لم يتم إنشاء الصفحة");
      }

      setPages((current) => [created, ...current]);
      setSelectedId(created.id);
      toast.success("تم إنشاء صفحة الهبوط الجديدة بنجاح! 🎉");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إنشاء صفحة الهبوط",
      );
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!customerUrl) return;
    await navigator.clipboard.writeText(customerUrl);
    toast.success("تم نسخ رابط صفحة الهبوط! 📋");
  };

  return (
    <main className="eo-builder-page" dir="rtl">
      {/* Header Bar */}
      <ProductLandingHeader
        pages={pages}
        selectedId={selectedId}
        onSelectPage={setSelectedId}
        onRefresh={loadPages}
        onSave={() => void handleSave()}
        saving={saving}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenTemplatesModal={() => setIsTemplatesModalOpen(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onGenerateAi={handleGenerateAi}
        generatingAi={generatingAi}
        previewUrl={previewUrl}
        customerUrl={customerUrl}
        onCopyUrl={handleCopyUrl}
        onTogglePhonePreview={() => setShowPhonePreview((prev) => !prev)}
        showPhonePreview={showPhonePreview}
        isDirty={isDirty}
      />

      {/* If No Pages Created Yet: Show Clean Zero State */}
      {!loadingPages && pages.length === 0 ? (
        <div className="eo-zero-state-container">
          <div className="eo-zero-state-card">
            <div className="eo-zero-state-icon">🚀</div>
            <h2>ابدأ بإنشاء أول صفحة هبوط لمنتجاتك!</h2>
            <p>
              لم تقم بإنشاء أي صفحات هبوط بعد. اختر منتجاً من كتالوج متجرك
              وسيتولى الذكاء الاصطناعي تجهيز صفحة تحويل وبيانات بيع احترافية
              بشكل فوري.
            </p>
            <button
              type="button"
              className="eo-btn eo-btn-new-page eo-btn-lg"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={18} />
              <span>+ إنشاء أول صفحة هبوط الآن</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Studio Segment Switcher Bar (< 1024px) */}
          <nav className="eo-mobile-tab-nav" aria-label="تبويبات الاستوديو على الجوال">
            <button
              type="button"
              className={`eo-mobile-tab-btn ${mobileTab === "editor" ? "is-active" : ""}`}
              onClick={() => setMobileTab("editor")}
            >
              <Layers size={15} />
              <span>المحرر والأقسام ({editor.sections.length})</span>
            </button>

            <button
              type="button"
              className={`eo-mobile-tab-btn ${mobileTab === "preview" ? "is-active" : ""}`}
              onClick={() => setMobileTab("preview")}
            >
              <Eye size={15} />
              <span>المعاينة الحية</span>
            </button>

            <button
              type="button"
              className="eo-mobile-tab-btn eo-tab-btn-add"
              onClick={() => setIsElementsDrawerOpen(true)}
            >
              <Plus size={15} />
              <span>+ إضافة عنصر</span>
            </button>
          </nav>

          {/* Main Workspace: Canvas + Elements Drawer + Phone Preview */}
          <div className="eo-builder-workspace" data-mobile-tab={mobileTab}>
            {/* Right Drawer: Elements Palette (Desktop Only) */}
            <div className="eo-builder-sidebar-wrapper eo-desktop-only">
              <ElementsSidebarDrawer onAddSection={handleAddSection} />
            </div>

            {/* Center: Main Canvas Editor */}
            <section className={`eo-builder-canvas ${mobileTab === "preview" ? "eo-hide-on-mobile" : ""}`}>
              <ProductSummaryCard
                page={selectedPage}
                product={selectedProduct}
                title={editor.title}
                onChangeTitle={(val) => {
                  updateEditor((c) => ({ ...c, title: val }));
                  setIsDirty(true);
                }}
                slug={editor.slug}
                onChangeSlug={(val) => {
                  updateEditor((c) => ({ ...c, slug: val }));
                  setIsDirty(true);
                }}
                status={editor.status}
                onUpdateStatus={handleUpdateStatus}
                updatingStatus={updatingStatus}
                onDeletePage={handleDeletePage}
                deleting={deleting}
              />

              <LandingStylePanel
                style={editor.style}
                onChange={(style) => {
                  updateEditor((c) => ({ ...c, style }));
                  setIsDirty(true);
                }}
              />

              <LandingSeoPanel
                seo={editor.seo}
                productImage={selectedProduct?.mainImage || ""}
                onChange={(seo) => {
                  updateEditor((c) => ({ ...c, seo }));
                  setIsDirty(true);
                }}
              />

              <SectionsStackEditor
                sections={editor.sections}
                activeSectionId={activeSectionId}
                onToggleActiveSection={(id) =>
                  setActiveSectionId((current) => (current === id ? null : id))
                }
                onMoveSection={handleMoveSection}
                onReorderSections={handleReorderSections}
                onDuplicateSection={handleDuplicateSection}
                onToggleEnabled={handleToggleSectionEnabled}
                onRemoveSection={handleRemoveSection}
                onUpdateSectionContent={handleUpdateSectionContent}
                onUpdateSectionVariant={handleUpdateSectionVariant}
                product={selectedProduct}
              />

              {/* Mobile Quick Add Section Button */}
              <div className="eo-mobile-bottom-add-bar">
                <button
                  type="button"
                  className="eo-btn eo-btn-add-section-full"
                  onClick={() => setIsElementsDrawerOpen(true)}
                >
                  <Plus size={16} />
                  <span>+ إضافة عنصر جديد إلى هذه الصفحة</span>
                </button>
              </div>
            </section>

            {/* Left: Live Preview of the REAL storefront page */}
            <aside
              className={`eo-builder-preview-col ${mobileTab === "editor" ? "eo-hide-on-mobile" : ""} ${!showPhonePreview ? "eo-hide-on-desktop" : ""}`}
            >
              <LandingLivePreview
                customerUrl={customerUrl}
                companyId={companyId || undefined}
                refreshToken={previewRefreshToken}
                isMobileView={mobileTab === "preview"}
              />
            </aside>
          </div>

          {/* Mobile Elements Slide-Over Bottom Sheet */}
          {isElementsDrawerOpen && (
            <div
              className="eo-mobile-sheet-backdrop"
              onClick={() => setIsElementsDrawerOpen(false)}
            >
              <div
                className="eo-mobile-sheet-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <ElementsSidebarDrawer
                  isMobileSheet
                  onClose={() => setIsElementsDrawerOpen(false)}
                  onAddSection={(type) => {
                    handleAddSection(type);
                    setIsElementsDrawerOpen(false);
                    setMobileTab("editor");
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Landing Modal */}
      <CreateLandingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        products={products}
        loadingProducts={loadingProducts}
        onSearchProducts={loadProducts}
        onCreate={handleCreatePage}
        creating={creating}
      />

      {/* Templates Library Modal */}
      <TemplatesLibraryModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        product={selectedProduct}
        currentSectionsCount={editor.sections.length}
      />
    </main>
  );
};

export default ProductLandingPages;
