import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const [generatingAi, setGeneratingAi] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showPhonePreview, setShowPhonePreview] = useState(true);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) || null,
    [pages, selectedId],
  );
  const selectedProduct = selectedPage?.product || null;

  const customerUrl = selectedPage
    ? `${window.location.origin}/store/lp/${editor.slug || selectedPage.slug}`
    : "";
  const previewUrl = selectedPage ? `${customerUrl}?preview=1` : "";

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
      },
    };

    setEditor((current) => ({
      ...current,
      sections: [...current.sections, newSec],
    }));
    setActiveSectionId(newSec.id);
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
  };

  const handleRemoveSection = (id: string) => {
    setEditor((current) => ({
      ...current,
      sections: current.sections.filter((sec) => sec.id !== id),
    }));
    if (activeSectionId === id) setActiveSectionId(null);
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
      />

      {/* Main Workspace: Canvas + Elements Drawer + Phone Preview */}
      <div className="eo-builder-workspace">
        {/* Right Drawer: Elements Palette */}
        <ElementsSidebarDrawer onAddSection={handleAddSection} />

        {/* Center: Main Canvas Editor */}
        <section className="eo-builder-canvas">
          <ProductSummaryCard
            page={selectedPage}
            product={selectedProduct}
            title={editor.title}
            onChangeTitle={(val) => setEditor((c) => ({ ...c, title: val }))}
            slug={editor.slug}
            onChangeSlug={(val) => setEditor((c) => ({ ...c, slug: val }))}
            status={editor.status}
            onUpdateStatus={handleUpdateStatus}
            updatingStatus={updatingStatus}
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
            />
          </aside>
        )}
      </div>

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
