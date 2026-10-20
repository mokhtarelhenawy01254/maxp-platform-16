import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { tToast } from "../../../utils/i18n-toast";
import {
  EMPTY_RELATIONS,
  RELATION_ORDER,
  RELATION_CONFIG_DATA,
  cloneRelationBuckets,
  createFallbackProduct,
  extractRelationIds,
  includesQuery,
  normalizeManagedProduct,
  parseJsonRecord,
  type JsonRecord,
  type ManagedProduct,
  type ManagedRelationType,
  type RelationBuckets,
  type RelationConfigItem,
} from "../types/upsellManualTypes";

const discardChangesPrompt = () =>
  typeof window === "undefined"
    ? true
    : window.confirm("يوجد تغييرات غير محفوظة. هل تريد تجاهلها والانتقال لمنتج آخر؟");

export function useUpsellManualManagerData(active: boolean) {
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
      tToast.error("UpsellManualManager.unable_load_6178");
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
      tToast.error("UpsellManualManager.msg_11d8");
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
      tToast.success("UpsellManualManager.success_save_00ab");
    } catch (error) {
      console.error("Failed to save upsell relations", error);
      tToast.error("UpsellManualManager.unable_save_5607");
    } finally {
      setSaving(false);
    }
  };

  const currentRelationConfig: RelationConfigItem = RELATION_CONFIG_DATA[activeRelation];

  return {
    catalog,
    catalogLoading,
    catalogError,
    productQuery,
    setProductQuery,
    candidateQuery,
    setCandidateQuery,
    selectedProduct,
    relationBuckets,
    activeRelation,
    setActiveRelation,
    productLoading,
    saving,
    isDirty,
    filteredProducts,
    candidateProducts,
    currentRelationProducts,
    currentRelationConfig,
    loadProductRelations,
    resetSelectedProduct,
    addProductToRelation,
    removeProductFromRelation,
    moveProduct,
    saveRelations,
  };
}
