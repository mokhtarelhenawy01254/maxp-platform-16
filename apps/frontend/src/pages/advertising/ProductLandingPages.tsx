import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  ExternalLink,
  ImagePlus,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  ProductLandingPage,
  ProductLandingProduct,
  ProductLandingSlice,
  ProductLandingStatus,
  productLandingPagesService,
} from "../../services/productLandingPagesService";
import "./ProductLandingPages.css";

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
};

const DEFAULT_EDITOR: EditorState = {
  title: "",
  slug: "",
  status: "DRAFT",
  designNotes: "",
  formConfig: {
    orderKicker: "نموذج الطلب",
    orderTitle: "اطلب المنتج الآن",
    orderCopy: "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
    buttonLabel: "تأكيد الطلب",
  },
  slices: [],
};

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

const buildEditorFromPage = (page?: ProductLandingPage | null): EditorState => {
  if (!page) return DEFAULT_EDITOR;

  return {
    title: page.title || "",
    slug: page.slug || "",
    status: page.status || "DRAFT",
    designNotes: page.designNotes || "",
    formConfig: {
      orderKicker: page.formConfig?.orderKicker || "نموذج الطلب",
      orderTitle:
        page.formConfig?.orderTitle ||
        (page.product?.name ? `اطلب ${page.product.name}` : "اطلب المنتج الآن"),
      orderCopy:
        page.formConfig?.orderCopy ||
        "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
      buttonLabel: page.formConfig?.buttonLabel || "تأكيد الطلب",
    },
    slices: Array.isArray(page.slices) ? page.slices : [],
  };
};

const getStatusLabel = (status: ProductLandingStatus) => {
  if (status === "PUBLISHED") return "منشورة";
  if (status === "PAUSED") return "متوقفة";
  return "مسودة";
};

const ProductLandingPages: React.FC = () => {
  const [pages, setPages] = useState<ProductLandingPage[]>([]);
  const [products, setProducts] = useState<ProductLandingProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR);
  const [loadingPages, setLoadingPages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [createProductId, setCreateProductId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [manualSliceUrl, setManualSliceUrl] = useState("");

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) || null,
    [pages, selectedId],
  );
  const selectedProduct = selectedPage?.product || null;
  const customerUrl = selectedPage
    ? `${window.location.origin}/store/lp/${editor.slug}?companyId=${selectedPage.companyId}`
    : "";
  const previewUrl = selectedPage
    ? `${customerUrl}&preview=1`
    : "";
  const openLandingUrl =
    selectedPage && editor.status === "PUBLISHED" ? customerUrl : previewUrl;
  const isBusy = saving;
  const isPublishReady = editor.slices.length > 0;

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
    setEditor(buildEditorFromPage(selectedPage));
  }, [selectedPage]);

  const patchEditor = (patch: Partial<EditorState>) => {
    setEditor((current) => ({ ...current, ...patch }));
  };

  const updateFormConfig = (
    field: keyof EditorState["formConfig"],
    value: string,
  ) => {
    setEditor((current) => ({
      ...current,
      formConfig: {
        ...current.formConfig,
        [field]: value,
      },
    }));
  };

  const createPage = async () => {
    if (!createProductId) {
      tToast.error("advertising_ProductLandingPages.msg_11ec");
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
      tToast.success("advertising_ProductLandingPages.success_create_88aa");
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
      tToast.success("advertising_ProductLandingPages.msg_d05d");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: ProductLandingStatus) => {
    if (!selectedPage) return;

    if (status === "PUBLISHED" && editor.slices.length === 0) {
      tToast.error("advertising_ProductLandingPages.msg_637e");
      return;
    }

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
      tToast.success("advertising_ProductLandingPages.success_update_7714");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الحالة");
    }
  };

  const buildSlice = (src: string, prompt: string | undefined, nextIndex: number) => {
    const nextSlice: ProductLandingSlice = {
      id: `slice-${Date.now()}`,
      src,
      alt: `${editor.title || selectedProduct?.name || "Landing"} - شريحة ${nextIndex}`,
      prompt,
      width: 1024,
      height: 1024,
      sortOrder: nextIndex,
    };

    return nextSlice;
  };

  const appendSlice = (src: string, prompt?: string) => {
    const nextSlice = buildSlice(src, prompt, editor.slices.length + 1);

    setEditor((current) => ({
      ...current,
      slices: [...current.slices, nextSlice],
    }));
  };

  const addManualSlice = () => {
    const url = manualSliceUrl.trim();
    if (!url) return;

    appendSlice(url);
    setManualSliceUrl("");
  };

  const moveSlice = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= editor.slices.length) return;

    setEditor((current) => {
      const slices = [...current.slices];
      const item = slices[index];
      const target = slices[nextIndex];
      if (!item || !target) return current;
      slices[index] = target;
      slices[nextIndex] = item;
      return { ...current, slices };
    });
  };

  const removeSlice = (index: number) => {
    setEditor((current) => ({
      ...current,
      slices: current.slices.filter((_, sliceIndex) => sliceIndex !== index),
    }));
  };

  const copyPublicUrl = async () => {
    if (!customerUrl) return;

    if (editor.status !== "PUBLISHED") {
      tToast.error("advertising_ProductLandingPages.msg_51eb");
      return;
    }

    await navigator.clipboard.writeText(customerUrl);
    tToast.success("advertising_ProductLandingPages.msg_eeb5");
  };

  return (
    <main className="product-landing-admin" dir="rtl">
      <header className="pla-header">
        <div>
          <span className="pla-kicker">Product Media Stack</span>
          <h1>صفحات هبوط المنتجات</h1>
        </div>
        <button className="pla-icon-button" type="button" onClick={loadPages}>
          <RefreshCw size={18} />
          <span>تحديث</span>
        </button>
      </header>

      <section className="pla-create-strip">
        <div className="pla-search-field">
          <Search size={18} />
          <input
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="ابحث عن منتج"
          />
        </div>
        <select
          value={createProductId}
          onChange={(event) => setCreateProductId(event.target.value)}
        >
          <option value="">اختار منتج</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - {formatMoney(product.price)}
            </option>
          ))}
        </select>
        <input
          value={createTitle}
          onChange={(event) => setCreateTitle(event.target.value)}
          placeholder="عنوان الصفحة"
        />
        <input
          value={createSlug}
          onChange={(event) => setCreateSlug(event.target.value)}
          placeholder="الرابط"
          dir="ltr"
        />
        <button className="pla-primary-button" type="button" onClick={createPage} disabled={creating}>
          {creating ? <Loader2 className="pla-spin" size={18} /> : <Plus size={18} />}
          <span>إنشاء</span>
        </button>
      </section>

      <section className="pla-workspace">
        <aside className="pla-list-panel" aria-label="قائمة صفحات الهبوط">
          <div className="pla-panel-title">
            <h2>الصفحات</h2>
            <span>{pages.length}</span>
          </div>

          {loadingPages ? (
            <div className="pla-state">جاري التحميل...</div>
          ) : pages.length === 0 ? (
            <div className="pla-state">لا توجد صفحات بعد</div>
          ) : (
            <div className="pla-page-list">
              {pages.map((page) => (
                <button
                  key={page.id}
                  className={`pla-page-row ${selectedId === page.id ? "is-selected" : ""}`}
                  type="button"
                  onClick={() => setSelectedId(page.id)}
                >
                  <span className={`pla-status pla-status-${page.status.toLowerCase()}`}>
                    {getStatusLabel(page.status)}
                  </span>
                  <strong>{page.title}</strong>
                  <small>{page.product?.name || page.slug}</small>
                  <em>{page.slices?.length || 0} صور · {page.orders || 0} طلب</em>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="pla-editor-panel" aria-label="محرر صفحة الهبوط">
          {!selectedPage ? (
            <div className="pla-state">اختار صفحة للتعديل</div>
          ) : (
            <>
              <div className="pla-editor-head">
                <div className="pla-product-chip">
                  {getProductImage(selectedProduct) ? (
                    <img
                      src={getProductImage(selectedProduct)}
                      alt={selectedProduct?.name || editor.title || "Product"}
                    />
                  ) : (
                    <ImagePlus size={20} />
                  )}
                  <div>
                    <strong>{selectedProduct?.name || "منتج"}</strong>
                    <span>{formatMoney(selectedProduct?.price)}</span>
                  </div>
                </div>
                <div className="pla-actions">
                  <button type="button" onClick={copyPublicUrl} disabled={!customerUrl}>
                    <Copy size={17} />
                  </button>
                  <a href={openLandingUrl} target="_blank" rel="noreferrer" aria-label="فتح المعاينة">
                    <ExternalLink size={17} />
                    <span>معاينة</span>
                  </a>
                  {editor.status === "PUBLISHED" ? (
                    <button type="button" onClick={() => updateStatus("PAUSED")} disabled={isBusy}>
                      <Pause size={17} />
                      <span>إيقاف</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateStatus("PUBLISHED")}
                      disabled={isBusy}
                      title={!isPublishReady ? "أضف صورة واحدة على الأقل قبل النشر" : undefined}
                    >
                      <Play size={17} />
                      <span>نشر</span>
                    </button>
                  )}
                  <button className="pla-primary-button" type="button" onClick={saveSelected} disabled={isBusy}>
                    {saving ? <Loader2 className="pla-spin" size={17} /> : <Save size={17} />}
                    <span>حفظ</span>
                  </button>
                </div>
              </div>

              {!isPublishReady ? (
                <div className="pla-readiness-note">
                  صفحة العملاء تحتاج صورة واحدة محفوظة على الأقل قبل النشر.
                </div>
              ) : null}

              <div className="pla-form-grid">
                <label>
                  <span>العنوان</span>
                  <input
                    value={editor.title}
                    onChange={(event) => patchEditor({ title: event.target.value })}
                  />
                </label>
                <label>
                  <span>Slug</span>
                  <input
                    value={editor.slug}
                    onChange={(event) => patchEditor({ slug: event.target.value })}
                    dir="ltr"
                  />
                </label>
                <label>
                  <span>عنوان الفورم</span>
                  <input
                    value={editor.formConfig.orderTitle}
                    onChange={(event) => updateFormConfig("orderTitle", event.target.value)}
                  />
                </label>
                <label>
                  <span>زر الطلب</span>
                  <input
                    value={editor.formConfig.buttonLabel}
                    onChange={(event) => updateFormConfig("buttonLabel", event.target.value)}
                  />
                </label>
              </div>

              <label className="pla-wide-field">
                <span>ملاحظات التصميم</span>
                <textarea
                  value={editor.designNotes}
                  onChange={(event) => patchEditor({ designNotes: event.target.value })}
                  placeholder="ستايل، جمهور، عرض، ألوان، زاوية تصوير..."
                />
              </label>

              <div className="pla-manual-slice">
                <input
                  value={manualSliceUrl}
                  onChange={(event) => setManualSliceUrl(event.target.value)}
                  placeholder="رابط صورة جاهزة"
                  dir="ltr"
                />
                <button type="button" onClick={addManualSlice}>
                  <Plus size={18} />
                  <span>إضافة</span>
                </button>
              </div>

              <div className="pla-slices-grid">
                {editor.slices.map((slice, index) => (
                  <div className="pla-slice-card" key={`${slice.src}-${index}`}>
                    <img src={slice.src} alt={slice.alt || ""} />
                    <div>
                      <strong>#{index + 1}</strong>
                      <input
                        value={slice.alt || ""}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            slices: current.slices.map((item, sliceIndex) =>
                              sliceIndex === index
                                ? { ...item, alt: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        placeholder="Alt text"
                      />
                    </div>
                    <div className="pla-slice-actions">
                      <button type="button" onClick={() => moveSlice(index, -1)}>
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" onClick={() => moveSlice(index, 1)}>
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" onClick={() => removeSlice(index)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="pla-preview-panel" aria-label="معاينة الموبايل">
          <div className="pla-panel-title">
            <h2>المعاينة</h2>
            <span>{editor.slices.length} صور</span>
          </div>
          <div className="pla-phone">
            <div className="pla-phone-bar" />
            <div className="pla-phone-screen">
              {editor.slices.length === 0 ? (
                <div className="pla-phone-empty">
                  <Eye size={26} />
                  <span>لا توجد صور</span>
                </div>
              ) : (
                editor.slices.map((slice, index) => (
                  <img key={`${slice.src}-preview-${index}`} src={slice.src} alt="" />
                ))
              )}
              <div className="pla-phone-form">
                <strong>{editor.formConfig.orderTitle || "نموذج الطلب"}</strong>
                <span>{editor.formConfig.buttonLabel || "تأكيد الطلب"}</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default ProductLandingPages;
