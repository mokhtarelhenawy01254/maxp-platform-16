import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Link2, Loader2, Mail, Package, Search, ShoppingBag, Star, X } from 'lucide-react';
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";

type JsonRecord = Record<string, unknown>;
type ManagedRelationType = "related" | "crossSell" | "upsell";
type RelationBuckets = Record<ManagedRelationType, string[]>;

interface ManagedProduct {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  isActive: boolean;
  categoryName: string;
  metadata: unknown;
}

interface UpsellManualManagerProps {
  active: boolean;
}

const EMPTY_RELATIONS: RelationBuckets = {
  related: [],
  crossSell: [],
  upsell: [],
};

const RELATION_ORDER: ManagedRelationType[] = ["related", "crossSell", "upsell"];

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJsonRecord = (value: unknown): JsonRecord => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isRecord(value) ? value : {};
};

const normalizeManagedProduct = (value: unknown): ManagedProduct => {
  const raw = isRecord(value) ? value : {};
  const rawPrice = Number(raw["price"]);

  return {
    id: String(raw["id"] || ""),
    name: String(raw["name"] || "منتج بدون اسم"),
    sku: String(raw["sku"] || ""),
    price: Number.isFinite(rawPrice) ? rawPrice : null,
    isActive: raw["isActive"] !== false,
    categoryName: isRecord(raw["category"]) ? String(raw["category"]["name"] || "") : "",
    metadata: raw["metadata"],
  };
};

const extractRelationIds = (metadata: JsonRecord, key: string) => {
  const value = metadata[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry || "").trim()).filter(Boolean);
};

const cloneRelationBuckets = (source: RelationBuckets): RelationBuckets => ({
  related: [...source.related],
  crossSell: [...source.crossSell],
  upsell: [...source.upsell],
});

const formatPrice = (price: number | null) => {
  if (price === null) {
    return "بدون سعر";
  }

  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

const includesQuery = (product: ManagedProduct, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [product.name, product.sku, product.id, product.categoryName]
    .map((entry) => entry.toLowerCase())
    .some((entry) => entry.includes(normalizedQuery));
};

const createFallbackProduct = (productId: string): ManagedProduct => ({
  id: productId,
  name: `منتج #${productId}`,
  sku: "",
  price: null,
  isActive: true,
  categoryName: "",
  metadata: null,
});

const RelationBadge = ({
  label,
  tone = "blue",
}: {
  label: string;
  tone?: "blue" | "green" | "amber" | "neutral";
}) => {
  const styles =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
        : tone === "neutral"
          ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${styles}`}
    >
      {label}
    </span>
  );
};

const RELATION_CONFIG: Record<
  ManagedRelationType,
  {
    title: string;
    subtitle: string;
    help: string;
    metadataKey: string;
    icon: ReactNode;
    placementLabel: string;
    placementNote: string;
  }
> = {
  related: {
    title: "Related",
    subtitle: "منتجات مشابهة أو من نفس الفئة.",
    help:
      "استخدم هذا النوع عندما تريد اقتراح منتجات قريبة من المنتج الحالي على صفحة المنتج بدون ضغط بيعي زائد.",
    metadataKey: "relatedProducts",
    icon: <Package size={16} />,
    placementLabel: "Product Page",
    placementNote: "يغذي شبكة المنتجات المشابهة أسفل صفحة المنتج.",
  },
  crossSell: {
    title: "Cross-sell",
    subtitle: "منتجات مكملة ترفع قيمة السلة.",
    help:
      "هذا هو النوع الأفضل للإضافات السريعة والمكملات، لأنه يؤثر على صفحة المنتج والسلة معًا.",
    metadataKey: "crossSellProducts",
    icon: <ShoppingCart size={16} />,
    placementLabel: "PDP + Cart",
    placementNote: "الأولوية هنا للمكملات السريعة و quick add داخل السلة.",
  },
  upsell: {
    title: "Upsell",
    subtitle: "منتجات أعلى قيمة أو ترقية واضحة.",
    help:
      "اربط هنا المنتجات التي تريد دفع العميل نحوها بعد الشراء أو عند البحث عن بديل أغلى منطقيًا.",
    metadataKey: "upsellProducts",
    icon: <Mail size={16} />,
    placementLabel: "Thank You",
    placementNote: "يخدم صفحة الشكر ويغذي اقتراحات ما بعد الشراء.",
  },
};

const discardChangesPrompt = () =>
  typeof window === "undefined"
    ? true
    : window.confirm("يوجد تغييرات غير محفوظة. هل تريد تجاهلها والانتقال لمنتج آخر؟");

export default function UpsellManualManager({ active }: UpsellManualManagerProps) {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<ManagedProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ManagedProduct | null>(null);
  const [selectedMetadata, setSelectedMetadata] = useState<JsonRecord>({});
  const [relationBuckets, setRelationBuckets] = useState<RelationBuckets>(EMPTY_RELATIONS);
  const [initialRelationBuckets, setInitialRelationBuckets] =
    useState<RelationBuckets>(EMPTY_RELATIONS);
  const [activeRelation, setActiveRelation] = useState<ManagedRelationType>("related");
  const [productLoading, setProductLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const catalogById = useMemo(() => {
    const next = new Map<string, ManagedProduct>();
    for (const product of catalog) {
      next.set(product.id, product);
    }
    if (selectedProduct) {
      next.set(selectedProduct.id, selectedProduct);
    }
    return next;
  }, [catalog, selectedProduct]);

  const isDirty = useMemo(
    () =>
      RELATION_ORDER.some(
        (relationType) =>
          relationBuckets[relationType].join("::") !==
          initialRelationBuckets[relationType].join("::"),
      ),
    [initialRelationBuckets, relationBuckets],
  );

  const activeRelationIds = relationBuckets[activeRelation];
  const filteredProducts = useMemo(
    () => catalog.filter((product) => includesQuery(product, productQuery)).slice(0, 10),
    [catalog, productQuery],
  );

  const candidateProducts = useMemo(() => {
    const excludedIds = new Set<string>(activeRelationIds);
    if (selectedProduct?.id) {
      excludedIds.add(selectedProduct.id);
    }

    let nextProducts = catalog.filter((product) => !excludedIds.has(product.id));
    if (candidateQuery.trim()) {
      nextProducts = nextProducts.filter((product) => includesQuery(product, candidateQuery));
    } else if (selectedProduct?.categoryName) {
      const selectedCategory = selectedProduct.categoryName.toLowerCase();
      const sameCategory = nextProducts.filter(
        (product) => product.categoryName.toLowerCase() === selectedCategory,
      );
      const otherProducts = nextProducts.filter(
        (product) => product.categoryName.toLowerCase() !== selectedCategory,
      );
      nextProducts = [...sameCategory, ...otherProducts];
    }

    return nextProducts.slice(0, 10);
  }, [activeRelationIds, candidateQuery, catalog, selectedProduct]);

  const currentRelationProducts = useMemo(
    () =>
      activeRelationIds.map(
        (productId) => catalogById.get(productId) || createFallbackProduct(productId),
      ),
    [activeRelationIds, catalogById],
  );

  useEffect(() => {
    if (!active || catalogLoaded || catalogLoading) {
      return;
    }

    const loadCatalog = async () => {
      try {
        setCatalogLoading(true);
        setCatalogError("");
        const response = await apiClient.get("/products", {
          params: { limit: "1000" },
        });
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
        setCatalog(rows.map(normalizeManagedProduct).filter((product) => Boolean(product.id)));
        setCatalogLoaded(true);
      } catch (error) {
        console.error("Failed to load products catalog for upsell manager", error);
        setCatalogError("تعذر تحميل قائمة المنتجات. أعد المحاولة.");
      } finally {
        setCatalogLoading(false);
      }
    };

    void loadCatalog();
  }, [active, catalogLoaded, catalogLoading]);

  const loadProductRelations = async (productId: string) => {
    if (!productId) {
      return;
    }

    if (selectedProduct?.id === productId && !productLoading) {
      return;
    }

    if (isDirty && !discardChangesPrompt()) {
      return;
    }

    try {
      setProductLoading(true);
      const response = await apiClient.get(`/products/${productId}`);
      const payload = response?.data?.data;

      if (!response?.data?.success || !payload) {
        throw new Error("Product payload missing");
      }

      const nextProduct = normalizeManagedProduct(payload);
      const nextMetadata = parseJsonRecord(payload.metadata);
      const nextBuckets: RelationBuckets = {
        related: extractRelationIds(nextMetadata, "relatedProducts"),
        crossSell: extractRelationIds(nextMetadata, "crossSellProducts"),
        upsell: extractRelationIds(nextMetadata, "upsellProducts"),
      };

      setSelectedProduct(nextProduct);
      setSelectedMetadata(nextMetadata);
      setRelationBuckets(nextBuckets);
      setInitialRelationBuckets(cloneRelationBuckets(nextBuckets));
      setProductQuery(nextProduct.name);
      setCandidateQuery("");
      setActiveRelation("related");
    } catch (error) {
      console.error("Failed to load product relations", error);
      toast.error("تعذر تحميل ربط المنتجات لهذا المنتج");
    } finally {
      setProductLoading(false);
    }
  };

  const resetSelectedProduct = () => {
    if (isDirty && !discardChangesPrompt()) {
      return;
    }

    setSelectedProduct(null);
    setSelectedMetadata({});
    setRelationBuckets(cloneRelationBuckets(EMPTY_RELATIONS));
    setInitialRelationBuckets(cloneRelationBuckets(EMPTY_RELATIONS));
    setProductQuery("");
    setCandidateQuery("");
    setActiveRelation("related");
  };

  const updateRelationBucket = (relationType: ManagedRelationType, nextIds: string[]) => {
    setRelationBuckets((current) => ({
      ...current,
      [relationType]: nextIds,
    }));
  };

  const addProductToRelation = (productId: string) => {
    if (!productId || activeRelationIds.includes(productId)) {
      return;
    }

    updateRelationBucket(activeRelation, [...activeRelationIds, productId]);
    setCandidateQuery("");
  };

  const removeProductFromRelation = (productId: string) => {
    updateRelationBucket(
      activeRelation,
      activeRelationIds.filter((entry) => entry !== productId),
    );
  };

  const moveProduct = (productId: string, direction: "up" | "down") => {
    const currentIndex = activeRelationIds.findIndex((entry) => entry === productId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeRelationIds.length) {
      return;
    }

    const nextIds = [...activeRelationIds];
    const [movedItem] = nextIds.splice(currentIndex, 1);
    nextIds.splice(targetIndex, 0, movedItem);
    updateRelationBucket(activeRelation, nextIds);
  };

  const saveRelations = async () => {
    if (!selectedProduct?.id) {
      toast.error("اختر المنتج الأساسي أولًا");
      return;
    }

    try {
      setSaving(true);
      const nextMetadata = {
        ...selectedMetadata,
        relatedProducts: relationBuckets.related,
        crossSellProducts: relationBuckets.crossSell,
        upsellProducts: relationBuckets.upsell,
      };

      await apiClient.patch(`/products/${selectedProduct.id}`, {
        metadata: nextMetadata,
      });

      setSelectedMetadata(nextMetadata);
      setInitialRelationBuckets(cloneRelationBuckets(relationBuckets));
      toast.success("تم حفظ روابط الـ upsell لهذا المنتج");
    } catch (error) {
      console.error("Failed to save upsell relations", error);
      toast.error("تعذر حفظ روابط المنتجات");
    } finally {
      setSaving(false);
    }
  };

  const currentRelationConfig = RELATION_CONFIG[activeRelation];

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              <Link2 size={14} />
              Manual Links
            </div>
            <h2 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
              مدير ربط المنتجات
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-400">
              اختر المنتج الأساسي، ثم اربط له المنتجات المشابهة أو المكملة أو الأعلى قيمة
              من نفس الشاشة بدل الدخول لكل منتج يدويًا.
            </p>
          </div>

          <RelationBadge
            label={isDirty ? "Unsaved changes" : "Saved"}
            tone={isDirty ? "amber" : "green"}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ابحث عن المنتج الأساسي
              </span>
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="ابحث بالاسم أو SKU أو الفئة"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus-visible:ring-blue-900/40"
                />
              </div>
            </label>
            {catalogError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200">
                {catalogError}
              </div>
            ) : null}

            {catalogLoading ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                جارٍ تحميل المنتجات...
              </div>
            ) : null}

            {!selectedProduct ? (
              <div className="mt-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                  منتجات جاهزة للاختيار
                </div>
                <div className="grid gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => void loadProductRelations(product.id)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-950/40 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-bold text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {product.sku ? `SKU: ${product.sku}` : `ID: ${product.id}`}
                          {product.categoryName ? ` · ${product.categoryName}` : ""}
                        </div>
                      </div>
                      <RelationBadge
                        label={product.isActive ? "Active" : "Hidden"}
                        tone={product.isActive ? "green" : "neutral"}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[24px] border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RelationBadge label="Base product" />
                      <RelationBadge
                        label={selectedProduct.isActive ? "Published" : "Hidden"}
                        tone={selectedProduct.isActive ? "green" : "neutral"}
                      />
                    </div>
                    <h3 className="mt-3 text-xl font-black text-gray-900 dark:text-white">
                      {selectedProduct.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
                      {selectedProduct.sku
                        ? `SKU: ${selectedProduct.sku}`
                        : `ID: ${selectedProduct.id}`}
                      {selectedProduct.categoryName
                        ? ` · الفئة: ${selectedProduct.categoryName}`
                        : ""}
                      {` · السعر: ${formatPrice(selectedProduct.price)}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/products/${selectedProduct.id}/edit`)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:text-white"
                    >
                      <ExternalLink size={16} />
                      فتح صفحة المنتج
                    </button>
                    <button
                      type="button"
                      onClick={resetSelectedProduct}
                      className="inline-flex items-center gap-2 rounded-full border border-transparent bg-white/70 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-white dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60"
                    >
                      <X size={16} />
                      تغيير المنتج
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {RELATION_ORDER.map((relationType) => (
                    <div
                      key={relationType}
                      className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-950/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                          {RELATION_CONFIG[relationType].icon}
                          {RELATION_CONFIG[relationType].title}
                        </div>
                        <RelationBadge
                          label={`${relationBuckets[relationType].length}`}
                          tone={relationType === "upsell" ? "amber" : "blue"}
                        />
                      </div>
                      <p className="mt-2 text-xs leading-6 text-gray-600 dark:text-gray-400">
                        {RELATION_CONFIG[relationType].placementNote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950/30">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <Sparkles size={14} />
              كيف يعمل هذا الربط؟
            </div>
            <h3 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
              خريطة تأثير كل نوع
            </h3>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
              الصفحة لا تغيّر مجرد النصوص، بل تحدد أي منتجات ستظهر فعليًا لكل مكان في
              رحلة الشراء. الترتيب دائمًا: الربط اليدوي أولًا ثم fallback تلقائي إذا لم
              يوجد ربط.
            </p>

            <div className="mt-5 space-y-3">
              {RELATION_ORDER.map((relationType) => (
                <div
                  key={relationType}
                  className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                      {RELATION_CONFIG[relationType].icon}
                      {RELATION_CONFIG[relationType].title}
                    </div>
                    <RelationBadge
                      label={RELATION_CONFIG[relationType].placementLabel}
                      tone={relationType === "upsell" ? "amber" : "blue"}
                    />
                  </div>
                  <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
                    {RELATION_CONFIG[relationType].help}
                  </p>
                  <div className="mt-3 rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-xs leading-6 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                    {RELATION_CONFIG[relationType].placementNote}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm leading-7 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
              زر الحفظ هنا مستقل عن زر حفظ إعدادات الـ app. أي تعديل على الربط اليدوي
              يحفظ مباشرة داخل Metadata المنتج نفسه.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">
              Link Builder
            </div>
            <h3 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
              اختر نوع الربط الذي تريد إدارته
            </h3>
            <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">
              كل تبويب هنا يغيّر مجموعة مختلفة من العلاقات للمنتج المحدد.
            </p>
          </div>

          {productLoading ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <Loader2 size={16} className="animate-spin" />
              جارٍ تحميل المنتج...
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {RELATION_ORDER.map((relationType) => {
            const isActive = activeRelation === relationType;
            const config = RELATION_CONFIG[relationType];

            return (
              <button
                key={relationType}
                type="button"
                onClick={() => setActiveRelation(relationType)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-bold">
                  {config.icon}
                  {config.title}
                </div>
                <div className="mt-1 text-xs leading-6 opacity-80">{config.subtitle}</div>
                <div className="mt-2">
                  <RelationBadge
                    label={`${relationBuckets[relationType].length} linked`}
                    tone={
                      relationType === "crossSell"
                        ? "green"
                        : relationType === "upsell"
                          ? "amber"
                          : "blue"
                    }
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="rounded-[24px] border border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                  إضافة منتجات إلى {currentRelationConfig.title}
                </h4>
                <p className="mt-1 text-sm leading-7 text-gray-600 dark:text-gray-400">
                  {currentRelationConfig.help}
                </p>
              </div>
              <RelationBadge label={currentRelationConfig.placementLabel} tone="blue" />
            </div>

            {!selectedProduct ? (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                اختر المنتج الأساسي أولًا من الجزء العلوي، ثم ابدأ في ربط المنتجات له.
              </div>
            ) : (
              <>
                <label className="mt-5 block space-y-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    ابحث عن منتج لإضافته
                  </span>
                  <div className="relative">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      value={candidateQuery}
                      onChange={(event) => setCandidateQuery(event.target.value)}
                      placeholder="ابحث بالاسم أو SKU أو الفئة"
                      autoComplete="off"
                      className="w-full rounded-2xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:focus-visible:ring-blue-900/40"
                    />
                  </div>
                </label>

                <div className="mt-4 grid gap-3">
                  {candidateProducts.length > 0 ? (
                    candidateProducts.map((product) => (
                      <div
                        key={`${activeRelation}-${product.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950/50"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {product.sku ? `SKU: ${product.sku}` : `ID: ${product.id}`}
                            {product.categoryName ? ` · ${product.categoryName}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addProductToRelation(product.id)}
                          className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                        >
                          إضافة
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                      لا توجد منتجات مناسبة للبحث الحالي. جرّب كلمة أخرى أو ابدأ بدون بحث.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-gray-900 dark:text-white">
                  ترتيب المنتجات المرتبطة
                </h4>
                <p className="mt-1 text-sm leading-7 text-gray-600 dark:text-gray-400">
                  الترتيب هنا مهم لأنه يحدد من سيظهر أولًا عند وجود أكثر من اقتراح.
                </p>
              </div>
              <RelationBadge
                label={`${currentRelationProducts.length} items`}
                tone={currentRelationProducts.length > 0 ? "green" : "neutral"}
              />
            </div>

            {currentRelationProducts.length > 0 ? (
              <div className="mt-4 space-y-3">
                {currentRelationProducts.map((product, index) => (
                  <div
                    key={`${activeRelation}-${product.id}-selected`}
                    className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <RelationBadge label={`#${index + 1}`} tone="neutral" />
                          {product.categoryName ? (
                            <RelationBadge label={product.categoryName} tone="blue" />
                          ) : null}
                        </div>
                        <div className="mt-3 truncate font-bold text-gray-900 dark:text-white">
                          {product.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {product.sku ? `SKU: ${product.sku}` : `ID: ${product.id}`}
                          {` · السعر: ${formatPrice(product.price)}`}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => moveProduct(product.id, "up")}
                          disabled={index === 0}
                          className="rounded-full border border-gray-300 p-2 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProduct(product.id, "down")}
                          disabled={index === currentRelationProducts.length - 1}
                          className="rounded-full border border-gray-300 p-2 text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-white"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProductFromRelation(product.id)}
                          className="rounded-full border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm leading-7 text-gray-600 dark:border-gray-700 dark:text-gray-400">
                لا توجد منتجات مرتبطة في هذا التبويب بعد. أضف أول منتج من القائمة على
                اليسار.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-blue-200 bg-blue-50/80 px-5 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="text-sm leading-7 text-blue-900 dark:text-blue-100">
            <span className="font-bold">مهم:</span> الحفظ هنا يحدّث
            {" `relatedProducts` و`crossSellProducts` و`upsellProducts` "}
            داخل Metadata المنتج المحدد فقط.
          </div>

          <button
            type="button"
            onClick={saveRelations}
            disabled={!selectedProduct || saving || productLoading}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {saving ? "جارٍ الحفظ..." : "حفظ روابط المنتج"}
          </button>
        </div>
      </div>
    </section>
  );
}
