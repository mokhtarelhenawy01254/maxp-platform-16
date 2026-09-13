import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
  SIDEBAR_ITEMS,
  buildDefaultSectionsForProduct,
} from "./product-landing/types";
import { ProductLandingHeader } from "./product-landing/ProductLandingHeader";
import { ProductSummaryCard } from "./product-landing/ProductSummaryCard";
import { SectionsStackEditor } from "./product-landing/SectionsStackEditor";
import { ElementsSidebarDrawer } from "./product-landing/ElementsSidebarDrawer";
import { PhoneMockupPreview } from "./product-landing/PhoneMockupPreview";
import { CreateLandingModal } from "./product-landing/CreateLandingModal";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildStoreUrl } from "../../utils/storeUrl";
import "./ProductLandingPages.css";

const ProductLandingPages: React.FC = () => {
  const [pages, setPages] = useState<ProductLandingPage[]>([]);
  const [products, setProducts] = useState<ProductLandingProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR);
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
  const [showPhonePreview, setShowPhonePreview] = useState(true);

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

      setEditor({
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
        heading: type === "TEXT" ? "عنوان جديد للقسم" : undefined,
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
      },
    };

    setEditor((current) => ({
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

    setEditor((current) => {
      const nextSections = [...current.sections];
      const temp = nextSections[index];
      nextSections[index] = nextSections[targetIndex];
      nextSections[targetIndex] = temp;
      return { ...current, sections: nextSections };
    });
    setIsDirty(true);
  };

  const handleRemoveSection = (id: string) => {
    setEditor((current) => ({
      ...current,
      sections: current.sections.filter((sec) => sec.id !== id),
    }));
    if (activeSectionId === id) setActiveSectionId(null);
    setIsDirty(true);
    toast.info("تم حذف القسم");
  };

  const handleUpdateSectionContent = (
    id: string,
    updatedContent: LandingSection["content"],
  ) => {
    setEditor((current) => ({
      ...current,
      sections: current.sections.map((sec) =>
        sec.id === id ? { ...sec, content: updatedContent } : sec,
      ),
    }));
    setIsDirty(true);
  };

  const handleUpdateSectionVariant = (id: string, variant: string) => {
    setEditor((current) => ({
      ...current,
      sections: current.sections.map((sec) =>
        sec.id === id ? { ...sec, variant } : sec,
      ),
    }));
    setIsDirty(true);
  };

  // Actions
  const handleSave = async () => {
    if (!selectedPage) return;

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
      });

      if (!updated) {
        throw new Error("لم يتم حفظ الصفحة");
      }

      setPages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setIsDirty(false);
      toast.success("تم حفظ كافة أقسام وبيانات الصفحة بنجاح! 🎉");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الصفحة");
    } finally {
      setSaving(false);
    }
  };

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
      setEditor((current) => ({ ...current, status: updated.status }));
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
        onSave={handleSave}
        saving={saving}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
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
        /* Main Workspace: Canvas + Elements Drawer + Phone Preview */
        <div className="eo-builder-workspace">
          {/* Right Drawer: Elements Palette */}
          <ElementsSidebarDrawer onAddSection={handleAddSection} />

          {/* Center: Main Canvas Editor */}
          <section className="eo-builder-canvas">
            <ProductSummaryCard
              page={selectedPage}
              product={selectedProduct}
              title={editor.title}
              onChangeTitle={(val) => {
                setEditor((c) => ({ ...c, title: val }));
                setIsDirty(true);
              }}
              slug={editor.slug}
              onChangeSlug={(val) => {
                setEditor((c) => ({ ...c, slug: val }));
                setIsDirty(true);
              }}
              status={editor.status}
              onUpdateStatus={handleUpdateStatus}
              updatingStatus={updatingStatus}
              onDeletePage={handleDeletePage}
              deleting={deleting}
            />

            <SectionsStackEditor
              sections={editor.sections}
              activeSectionId={activeSectionId}
              onToggleActiveSection={(id) =>
                setActiveSectionId((current) => (current === id ? null : id))
              }
              onMoveSection={handleMoveSection}
              onRemoveSection={handleRemoveSection}
              onUpdateSectionContent={handleUpdateSectionContent}
              onUpdateSectionVariant={handleUpdateSectionVariant}
              product={selectedProduct}
            />
          </section>

          {/* Left: Phone Live Preview Frame */}
          {showPhonePreview && (
            <aside className="eo-builder-preview-col">
              <PhoneMockupPreview
                title={editor.title}
                product={selectedProduct}
                sections={editor.sections}
                formConfig={editor.formConfig}
                previewUrl={previewUrl}
                customerUrl={customerUrl}
              />
            </aside>
          )}
        </div>
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
    </main>
  );
};

export default ProductLandingPages;
