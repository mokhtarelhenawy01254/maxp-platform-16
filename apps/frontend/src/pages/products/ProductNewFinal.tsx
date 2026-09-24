import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { useAuth } from "../../hooks/useAuthSimple";
import { getCurrencyByCode } from "../../utils/currency";
import { apiClient } from "../../services/apiClient";
import ThemeToggle from "../../components/ui/theme-toggle";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CubeIcon,
  PhotoIcon,
  SwatchIcon,
  TruckIcon,
  Cog6ToothIcon,
  EyeIcon,
  MegaphoneIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// Hooks
import { useProductForm } from "./hooks/useProductForm";
import { useProductMedia } from "./hooks/useProductMedia";
import { useProductVariants } from "./hooks/useProductVariants";
import { useProductPresentations } from "./hooks/useProductPresentations";
import { useProductApi } from "./hooks/useProductApi";

// Tabs
import { BasicTab } from "./components/tabs/BasicTab";
import { PricingTab } from "./components/tabs/PricingTab";
import { InventoryTab } from "./components/tabs/InventoryTab";
import { MediaTab } from "./components/tabs/MediaTab";
import { AttributesTab } from "./components/tabs/AttributesTab";
import { VariantsTab } from "./components/tabs/VariantsTab";
import { DisplayTab } from "./components/tabs/DisplayTab";
import { CommissionTab } from "./components/tabs/CommissionTab";
import { WhatsappTab } from "./components/tabs/WhatsappTab";
import { ShippingTab } from "./components/tabs/ShippingTab";
import { SeoTab } from "./components/tabs/SeoTab";
import { AdvancedTab } from "./components/tabs/AdvancedTab";
import { QuantityOffersTab } from "./components/tabs/QuantityOffersTab";
import { PresentationsTab } from "./components/tabs/PresentationsTab";
import { ConvertToPresentationModal } from "./components/ConvertToPresentationModal";
import { CategoryFormModal } from "../../components/category/CategoryFormModal";
import type { FieldErrors } from "./types";
import type { ConvertPresentationResult } from "./hooks/useProductPresentations";
import {
  hydrateVariantSettings,
  normalizeVariantSettingsForSave,
} from "./utils/variantSettings";
import { resolveShippingClassSettingsCompanyId } from "./utils/shippingClassCompany";
import {
  canApprove,
  canPublish,
  canReject,
  canSubmitReview,
  canUnpublish,
  canManageProductWorkflowByRole,
  canSubmitProductReviewByRole,
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
  normalizeProductWorkflow,
  PRODUCT_WORKFLOW_STATUSES,
  resolvePrimarySaveWorkflow,
  type ProductWorkflow,
} from "./utils/workflow";
import {
  normalizeQuantityOffers,
  type QuantityOffer,
} from "../../utils/quantityOffers";
import {
  DEFAULT_SHIPPING_CLASSES,
  ensureShippingClassesForKeys,
  mergeShippingClasses,
  type ShippingClassOption,
} from "../../constants/shippingClasses";
import { getProductPageCheckoutOverrideEnabled } from "../../utils/productPageCheckout";
import {
  buildProductPreviewUrl,
  resolveProductPreviewCompanyId,
} from "./utils/productPreviewUrl";


type WorkflowAction =
  | "save_draft"
  | "submit_review"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish";

type ProductAttribute = {
  id: string;
  name: string;
  slug: string;
  values: string[];
  visible?: boolean;
  forVariations?: boolean;
  requiredForOrder?: boolean;
};

type ProductMetadata = Record<string, unknown> & {
  workflow?: ProductWorkflow;
  shippingClass?: string;
  excludeFromFreeShipping?: boolean;
  barcode?: string;
  isPreOrder?: boolean;
  preOrderDate?: string;
  preOrderMessage?: string;
  externalUrl?: string;
  affiliateUrl?: string;
  externalButtonLabel?: string;
  affiliateButtonLabel?: string;
  externalVendor?: string;
  partnerName?: string;
  vendorName?: string;
  externalDescription?: string;
  affiliateDescription?: string;
  externalOnly?: boolean;
  externalAffiliateOnly?: boolean;
  isExternalProduct?: boolean;
  affiliateVisibility?: string;
  affiliateVisibleAffiliateIds?: unknown;
  visibleAffiliateIds?: unknown;
  allowedAffiliateIds?: unknown;
  attributes?: ProductAttribute[];
  aiOrderOptions?: {
    requiredAttributes?: string[];
    attributeLabels?: Record<string, string>;
  };
  relatedProducts?: string[];
  upsellProducts?: string[];
  crossSellProducts?: string[];
  variantSettings?: unknown;
};

type ProductCategory = {
  id: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
};

type ProductListItem = {
  id: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
};

type ProductImageSource =
  | string
  | {
      fullUrl?: string;
      url?: string;
      path?: string;
    };

type VariantMetadata = Record<string, unknown> & {
  image?: string;
  description?: string;
  weight?: number;
  dimensions?: Record<string, unknown>;
  shippingClass?: string;
  allowBackorders?: boolean;
  lowStockThreshold?: number;
  attributeValues?: Record<string, string>;
};

type EditableVariant = {
  id?: string;
  name?: string;
  type?: string;
  sku?: string;
  price?: string | number;
  comparePrice?: string | number;
  cost?: string | number;
  images?: string | ProductImageSource[];
  stock?: number;
  trackInventory?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  image?: string;
  description?: string;
  weight?: string | number;
  dimensions?: string | Record<string, unknown>;
  shippingClass?: string;
  allowBackorders?: boolean;
  lowStockThreshold?: number;
  attributeValues?: string | Record<string, string>;
  metadata?: string | VariantMetadata | null;
};

type MerchantInventorySnapshot = {
  canEditStock?: boolean;
  stockLocationLabel?: string;
  availableForSale?: number;
} | null;

type EditableProduct = {
  id?: string;
  companyId?: string;
  workflow?: ProductWorkflow | null;
  isActive?: boolean;
  metadata?: string | ProductMetadata | null;
  category?: string;
  categoryId?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  price?: string | number;
  comparePrice?: string | number;
  cost?: string | number;
  regularPrice?: string | number;
  salePrice?: string | number;
  sku?: string;
  stock?: string | number;
  trackInventory?: boolean;
  lowStockThreshold?: number;
  tags?: string;
  weight?: string | number;
  dimensions?: string | Record<string, unknown>;
  isFeatured?: boolean;
  isHidden?: boolean;
  showFakeStock?: boolean;
  featuredPriority?: number;
  shippingClass?: string;
  excludeFromFreeShipping?: boolean;
  affiliateCommission?: string | number;
  commissionType?: string;
  allowAffiliateMarkup?: boolean;
  mainImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  barcode?: string;
  images?: string | ProductImageSource[];
  variants?: EditableVariant[];
  inventorySnapshot?: MerchantInventorySnapshot;
  merchantContext?: {
    canEditStock?: boolean;
    stockLocationLabel?: string;
    inventorySnapshot?: MerchantInventorySnapshot;
  } | null;
};

const parseProductMetadata = (metadata: unknown): ProductMetadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as ProductMetadata;
    } catch {
      return {};
    }
  }

  return metadata as ProductMetadata;
};

const parseVariantMetadata = (metadata: unknown): VariantMetadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as VariantMetadata;
    } catch {
      return {};
    }
  }

  return metadata as VariantMetadata;
};

const normalizeAffiliateVisibility = (
  value: unknown,
): "ALL" | "HIDDEN" | "SELECTED" => {
  const normalized = String(value || "ALL").toUpperCase();
  return normalized === "HIDDEN" || normalized === "SELECTED"
    ? normalized
    : "ALL";
};

const normalizeAffiliateVisibilityIds = (...sources: unknown[]) => {
  const ids = sources.find((source) => Array.isArray(source));
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(
      ids
        .map((affiliateId) => String(affiliateId || "").trim())
        .filter(Boolean),
    ),
  );
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
};

export const ProductNewFinal: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, switchCompany } = useAuth();
  const [accessibleTargetCompany, setAccessibleTargetCompany] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { currency } = useCurrency();
  const { t } = useTranslation();
  const isMerchant = user?.role === "MERCHANT";
  const canManageProductWorkflow = canManageProductWorkflowByRole(user?.role);
  const canSubmitProductReview = canSubmitProductReviewByRole(user?.role);

  const currencyInfo = getCurrencyByCode(currency || "EGP");
  const displayCurrency = currencyInfo?.symbol || "ج.م";

  // أصل المتجر العمومي لفتح صفحة العروض التقديمية في تاب جديد
  const storefrontOrigin = useMemo(() => {
    const company = user?.company;
    if (company?.customDomain?.trim()) {
      return `https://${company.customDomain.trim()}`;
    }
    if (company?.slug?.trim()) {
      return `https://${company.slug.trim()}.maxp.online`;
    }
    return "";
  }, [user?.company]);

  // General State – sync tab with URL search param for deep-link support
  const tabFromUrl = searchParams.get("tab") || "basic";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const changeTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);
  // Keep in sync if the URL changes externally
  useEffect(() => {
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const [productMetadata, setProductMetadata] = useState<ProductMetadata>({});
  const [workflow, setWorkflow] = useState<ProductWorkflow>(
    normalizeProductWorkflow(null, false),
  );
  const [currentProductId, setCurrentProductId] = useState<string | null>(
    id || null,
  );
  const [isFetchingProduct, setIsFetchingProduct] = useState(Boolean(id));
  const [showVariants, setShowVariants] = useState(false);

  // Convert-to-presentation State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertSuccess, setConvertSuccess] =
    useState<ConvertPresentationResult | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [shippingClassOptions, setShippingClassOptions] = useState<
    ShippingClassOption[]
  >(DEFAULT_SHIPPING_CLASSES);
  const [productCompanyId, setProductCompanyId] = useState<string | null>(null);
  const [merchantStockControl, setMerchantStockControl] = useState<{
    canEditStock: boolean;
    stockLocationLabel?: string | null;
  } | null>(null);
  const canEditInventoryStock = merchantStockControl?.canEditStock !== false;

  // Recommendations State
  const [relatedProducts, setRelatedProducts] = useState<string[]>([]);
  const [upsellProducts, setUpsellProducts] = useState<string[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<string[]>([]);
  const [quantityOffers, setQuantityOffers] = useState<QuantityOffer[]>([]);
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // WhatsApp State
  const [whatsappNotify, setWhatsappNotify] = useState({
    enabled: false,
    audience: "all" as "all" | "withOrders" | "newCustomers" | "activeCustomers",
    templateName: "NEW_PRODUCT",
    customMessage: "",
  });

  // Tag State
  // Initialize Custom Hooks
  const {
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    handleInputChange,
  } = useProductForm();

  const {
    uploadedImages,
    setUploadedImages,
    uploading,
    handleImageChange,
    handleDragEnd,
    removeUploadedImage,
  } = useProductMedia();

  const {
    variants,
    setVariants,
    deletedVariantIds,
    setDeletedVariantIds,
    attributes,
    setAttributes,
    newAttributeName,
    setNewAttributeName,
    newAttributeValuesList,
    bulkAction,
    bulkValue,
    setBulkValue,
    showBulkInput,
    attributeMode,
    setAttributeMode,
    variantSettings,
    setVariantSettings,
    addVariant,
    updateVariant,
    removeVariant,
    uploadVariantImage,
    batchUpdateVariants,
    uploadImageForVariants,
    addAttribute,
    addValueField,
    updateValueField,
    removeValueField,
    removeAttribute,
    generateVariations,
    handleBulkActionChange,
    applyBulkAction,
    syncWithProductPricing,
  } = useProductVariants(formData.trackInventory, {
    price: formData.price,
    comparePrice: formData.comparePrice,
    cost: formData.cost,
    shippingClass: formData.shippingClass,
    lowStockThreshold: formData.lowStockThreshold,
  });

  const {
    loading,
    setLoading,
    error,
    setError,
    success,
    successMessage,
    setSuccessMessage,
    saveProduct,
  } = useProductApi();

  const effectiveProductId = id || currentProductId;

  const {
    presentations,
    loading: presentationsLoading,
    fetchPresentations,
    addPresentation,
    updatePresentation,
    deletePresentation,
    convertToPresentation,
  } = useProductPresentations(effectiveProductId);

  useEffect(() => {
    setCurrentProductId(id || null);
    setIsFetchingProduct(Boolean(id));
    if (!id) {
      setMerchantStockControl(null);
    }
  }, [id]);

  // Lazy-load allProducts only when the Advanced tab is opened
  useEffect(() => {
    if (activeTab !== "advanced" || allProducts.length > 0 || isLoadingProducts)
      return;
    const fetchAllProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await apiClient.get("/products", {
          params: { limit: "1000" },
        });
        if (res.data?.success && res.data?.data) {
          setAllProducts(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchAllProducts();
  }, [activeTab, allProducts.length, isLoadingProducts]);

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const response = await apiClient.get("/products/categories");
        const data = response.data;
        if (data.success && data.data) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]);
          setCategoriesError(t("products.messages.categoriesLoadError"));
        }
      } catch (err) {
        setCategories([]);
        setCategoriesError(t("products.messages.categoriesLoadErrorNetwork"));
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, [t]);

  const shippingClassSettingsCompanyId =
    resolveShippingClassSettingsCompanyId({
      isEditMode,
      productCompanyId,
      userCompanyId: user?.companyId,
    });

  useEffect(() => {
    if (isEditMode && isFetchingProduct) {
      return;
    }

    if (!shippingClassSettingsCompanyId) {
      setShippingClassOptions(DEFAULT_SHIPPING_CLASSES);
      return;
    }

    let isMounted = true;

    const fetchShippingClassOptions = async () => {
      try {
        const response = await apiClient.get("/settings/company", {
          params: {
            companyId: shippingClassSettingsCompanyId,
          },
        });
        const companySettings = response.data?.data?.settings || {};
        const storedClasses =
          companySettings.shippingClasses ||
          companySettings.shippingClassOptions ||
          companySettings.classOptions ||
          [];
        const nextOptions = mergeShippingClasses(storedClasses);

        if (isMounted) {
          setShippingClassOptions(
            nextOptions.length > 0 ? nextOptions : DEFAULT_SHIPPING_CLASSES,
          );
        }
      } catch (error) {
        console.error("Failed to load shipping class options:", error);
        if (isMounted) {
          setShippingClassOptions(DEFAULT_SHIPPING_CLASSES);
        }
      }
    };

    void fetchShippingClassOptions();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, isFetchingProduct, shippingClassSettingsCompanyId]);

  // Load Product for editing
  const fetchProduct = useCallback(async () => {
    if (!isEditMode || !id) return;
    setIsFetchingProduct(true);
    setAccessibleTargetCompany(null);
    try {
      const response = await apiClient.get(`/products/${id}`);
      const data = response.data;

      if (data.success && data.data) {
        const product = data.data as EditableProduct;
        const resolvedWorkflow = normalizeProductWorkflow(
          product.workflow,
          product.isActive,
        );

        const parsedMetadata = parseProductMetadata(product.metadata);

        setProductMetadata(parsedMetadata);
        setVariantSettings(
          hydrateVariantSettings(parsedMetadata.variantSettings),
        );
        setWorkflow(resolvedWorkflow);
        setCurrentProductId(product.id);
        setProductCompanyId(product.companyId || null);
        const inventorySnapshot =
          product.inventorySnapshot ||
          product.merchantContext?.inventorySnapshot ||
          null;
        setMerchantStockControl(
          product.merchantContext || inventorySnapshot
            ? {
                canEditStock:
                  product.merchantContext?.canEditStock ??
                  inventorySnapshot?.canEditStock ??
                  true,
                stockLocationLabel:
                  product.merchantContext?.stockLocationLabel ||
                  inventorySnapshot?.stockLocationLabel ||
                  null,
              }
            : null,
        );

        setFormData({
          name: product.name || "",
          description: product.description || "",
          slug: product.slug || "",
          price: parseFloat(product.price) || 0,
          comparePrice: product.comparePrice
            ? parseFloat(product.comparePrice)
            : undefined,
          cost: product.cost ? parseFloat(product.cost) : undefined,
          sku: product.sku || "",
          category: product.categoryId || "",
          stock: product.stock || 0,
          trackInventory: product.trackInventory !== false,
          lowStockThreshold: product.lowStockThreshold || 5,
          isActive:
            resolvedWorkflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
          enableCheckoutForm:
            getProductPageCheckoutOverrideEnabled(parsedMetadata),
          showAddToCartButton: product.showAddToCartButton !== false,
          saleStartDate: product.saleStartDate
            ? new Date(product.saleStartDate).toISOString().slice(0, 16)
            : "",
          saleEndDate: product.saleEndDate
            ? new Date(product.saleEndDate).toISOString().slice(0, 16)
            : "",
          sizeGuide: product.sizeGuide || "",
          tags: (() => {
            if (Array.isArray(product.tags)) return product.tags;
            if (typeof product.tags === "string" && product.tags.trim()) {
              try {
                // Try JSON parse first (modern format)
                const parsed = JSON.parse(product.tags);
                return Array.isArray(parsed) ? parsed : [product.tags];
              } catch (e) {
                // Fallback to comma-separated string (legacy format)
                return product.tags
                  .split(",")
                  .map((t: string) => t.trim())
                  .filter(Boolean);
              }
            }
            return [];
          })(),
          weight: product.weight ? parseFloat(product.weight) : undefined,
          dimensions:
            typeof product.dimensions === "string"
              ? JSON.parse(product.dimensions || "{}")
              : product.dimensions || undefined,
          isFeatured: product.isFeatured || false,
          isHidden: product.isHidden || false,
          showFakeStock: product.showFakeStock || false,
          featuredPriority: product.featuredPriority || 0,
          shippingClass:
            parsedMetadata.shippingClass || product.shippingClass || "standard",
          excludeFromFreeShipping:
            typeof parsedMetadata.excludeFromFreeShipping === "boolean"
              ? parsedMetadata.excludeFromFreeShipping
              : Boolean(product.excludeFromFreeShipping),
          affiliateCommission: product.affiliateCommission
            ? parseFloat(product.affiliateCommission)
            : 0,
          commissionType: product.commissionType || "PERCENTAGE",
          allowAffiliateMarkup: product.allowAffiliateMarkup || false,
          affiliateVisibility: normalizeAffiliateVisibility(
            product.affiliateVisibility || parsedMetadata.affiliateVisibility,
          ),
          affiliateVisibleAffiliateIds: normalizeAffiliateVisibilityIds(
            product.affiliateVisibleAffiliateIds
              ? (() => { try { return JSON.parse(product.affiliateVisibleAffiliateIds); } catch { return []; } })()
              : undefined,
            parsedMetadata.affiliateVisibleAffiliateIds,
            parsedMetadata.visibleAffiliateIds,
            parsedMetadata.allowedAffiliateIds,
          ),
          mainImage: product.mainImage || "",
          metaTitle: product.metaTitle || "",
          metaDescription: product.metaDescription || "",
          canonicalUrl: product.canonicalUrl || "",
          // Ghost fields from metadata
          allowBackorders: parsedMetadata.allowBackorders || product.allowBackorders || false,
          barcode: parsedMetadata.barcode || product.barcode || "",
          isPreOrder: parsedMetadata.isPreOrder || false,
          preOrderDate: parsedMetadata.preOrderDate || "",
          preOrderMessage: parsedMetadata.preOrderMessage || "",
          externalUrl:
            parsedMetadata.externalUrl || parsedMetadata.affiliateUrl || "",
          externalButtonLabel:
            parsedMetadata.externalButtonLabel ||
            parsedMetadata.affiliateButtonLabel ||
            "",
          externalVendor:
            parsedMetadata.externalVendor ||
            parsedMetadata.partnerName ||
            parsedMetadata.vendorName ||
            "",
          externalDescription:
            parsedMetadata.externalDescription ||
            parsedMetadata.affiliateDescription ||
            "",
          externalOnly:
            Boolean(parsedMetadata.externalOnly) ||
            Boolean(parsedMetadata.externalAffiliateOnly) ||
            Boolean(parsedMetadata.isExternalProduct),
        });

        if (product.images) {
          const rawImages =
            typeof product.images === "string"
              ? JSON.parse(product.images)
              : product.images;
          const cleanImages = Array.isArray(rawImages)
            ? rawImages
                .map((img: ProductImageSource) =>
                  typeof img === "string"
                    ? img
                    : img.fullUrl || img.url || img.path,
                )
                .filter((img): img is string => Boolean(img))
            : [];
          setUploadedImages(cleanImages);
        }

        let savedAttributes: ProductAttribute[] = [];
        if (parsedMetadata.attributes && Array.isArray(parsedMetadata.attributes)) {
          savedAttributes = parsedMetadata.attributes;
          setAttributes(savedAttributes);
        }

        if (product.variants && product.variants.length > 0) {
          const loadedVariants = product.variants.map((v: EditableVariant) => {
            const varMeta = parseVariantMetadata(v.metadata);
            return {
              id: v.id,
              name: v.name || "",
              type: v.type || "color",
              sku: v.sku || "",
              price: v.price ? parseFloat(v.price) : undefined,
              comparePrice: v.comparePrice
                ? parseFloat(v.comparePrice)
                : undefined,
              cost: v.cost ? parseFloat(v.cost) : undefined,
              images:
                typeof v.images === "string"
                  ? JSON.parse(v.images || "[]")
                  : v.images || [],
              stock: v.stock || 0,
              trackInventory: v.trackInventory !== false,
              isActive: v.isActive !== false,
              sortOrder: v.sortOrder || 0,
              image: varMeta.image || v.image,
              description: varMeta.description || v.description || "",
              weight:
                varMeta.weight || (v.weight ? parseFloat(v.weight) : undefined),
              dimensions:
                Object.keys(varMeta.dimensions || {}).length > 0
                  ? varMeta.dimensions
                  : typeof v.dimensions === "string"
                    ? JSON.parse(v.dimensions || "{}")
                    : v.dimensions || {},
              shippingClass:
                varMeta.shippingClass || v.shippingClass || "standard",
              allowBackorders:
                varMeta.allowBackorders || v.allowBackorders || false,
              lowStockThreshold:
                varMeta.lowStockThreshold || v.lowStockThreshold || 5,
              attributeValues:
                Object.keys(varMeta.attributeValues || {}).length > 0
                  ? varMeta.attributeValues
                  : typeof v.attributeValues === "string"
                    ? JSON.parse(v.attributeValues || "{}")
                    : v.attributeValues || {},
            };
          });
          setVariants(loadedVariants);
          setDeletedVariantIds([]);
          setShowVariants(true);

          // Reconstruct attributes from variants if missing in metadata
          if (loadedVariants.length > 0 && savedAttributes.length === 0) {
            const extractedAttributes: { [key: string]: Set<string> } = {};
            loadedVariants.forEach((variant) => {
              if (
                variant.attributeValues &&
                typeof variant.attributeValues === "object"
              ) {
                Object.keys(variant.attributeValues).forEach((attrKey) => {
                  if (!extractedAttributes[attrKey])
                    extractedAttributes[attrKey] = new Set();
                  extractedAttributes[attrKey]!.add(
                    variant.attributeValues[attrKey],
                  );
                });
              } else if (variant.name) {
                const parts = variant.name
                  .split(/[-/|]/)
                  .map((p: string) => p.trim())
                  .filter(Boolean);
                if (parts.length === 1) {
                  const attrName =
                    variant.type === "color"
                      ? "اللون"
                      : variant.type === "size"
                        ? "الحجم"
                        : "النوع";
                  if (!extractedAttributes[attrName])
                    extractedAttributes[attrName] = new Set();
                  extractedAttributes[attrName]!.add(parts[0]);
                } else {
                  const defaultNames = ["اللون", "الحجم", "النمط", "المادة"];
                  parts.forEach((part: string, idx: number) => {
                    const attrKey = defaultNames[idx] || `صفة ${idx + 1}`;
                    if (!extractedAttributes[attrKey])
                      extractedAttributes[attrKey] = new Set();
                    extractedAttributes[attrKey]!.add(part);
                  });
                }
              }
            });
            const newAttrs = Object.keys(extractedAttributes).map((key) => ({
              id: `ex-${key}-${Date.now()}`,
              name: key,
              slug: key.toLowerCase().replace(/\s+/g, "-"),
              values: Array.from(extractedAttributes[key] as Set<string>),
              visible: true,
              forVariations: true,
              requiredForOrder: true,
            }));
            if (newAttrs.length > 0) setAttributes(newAttrs);
          }
        }

        if (parsedMetadata.relatedProducts)
          setRelatedProducts(parsedMetadata.relatedProducts);
        if (parsedMetadata.upsellProducts)
          setUpsellProducts(parsedMetadata.upsellProducts);
        if (parsedMetadata.crossSellProducts)
          setCrossSellProducts(parsedMetadata.crossSellProducts);
        setQuantityOffers(normalizeQuantityOffers(parsedMetadata));
      } else {
        setProductCompanyId(null);
        setError((data as any)?.message || (data as any)?.error || t("products.messages.productError"));
      }
    } catch (err: any) {
      console.error("❌ [ProductEdit] Error fetching product:", err);
      setProductCompanyId(null);
      const errData = err?.response?.data;
      const status = err?.response?.status;

      if (errData?.code === "DIFFERENT_COMPANY_ACCESSIBLE" && errData?.targetCompanyId) {
        setAccessibleTargetCompany({
          id: errData.targetCompanyId,
          name: errData.targetCompanyName || "الشركة المالكة للمنتج",
        });
        setError(errData.message || errData.error || "هذا المنتج يتبع لشركة أخرى ضمن حسابك.");
      } else if (errData?.message || errData?.error) {
        setError(errData.message || errData.error);
      } else if (status === 404) {
        setError("المنتج غير موجود أو قد تم حذفه أو يتبع لشركة أخرى.");
      } else if (status === 403) {
        setError("لا تملك صلاحية الوصول إلى هذا المنتج.");
      } else {
        setError(t("products.messages.productErrorNetwork"));
      }
    } finally {
      setIsFetchingProduct(false);
    }
  }, [
    id,
    isEditMode,
    t,
    setFormData,
    setAttributes,
    setVariants,
    setVariantSettings,
    setUploadedImages,
    setDeletedVariantIds,
    setError,
  ]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const resolvedShippingClassOptions = ensureShippingClassesForKeys(
    shippingClassOptions,
    [
      formData.shippingClass,
      ...variants.map((variant) => variant.shippingClass),
      typeof bulkValue === "string" ? bulkValue : "",
    ].filter((value): value is string => Boolean(String(value || "").trim())),
  );

  // Helpers
  const getInputClassName = (fieldName: string) => {
    return fieldErrors[fieldName as keyof typeof fieldErrors]
      ? "mt-1 block w-full border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500 dark:border-red-600 dark:text-red-500 rounded-md sm:text-sm"
      : "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  };

  const handleDimensionChange = (
    field: "length" | "width" | "height",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...(prev.dimensions || {}),
        [field]: value === "" ? "" : parseFloat(value),
      },
    }));
  };

  const buildPreviewUrl = useCallback(
    (productId: string) => {
      const resolvedProductId = String(productId || "").trim();
      if (!resolvedProductId) {
        return "";
      }

      const companyId = resolveProductPreviewCompanyId({
        productCompanyId,
        userCompanyId: user?.companyId,
        storedCompanyId:
          localStorage.getItem("storefront_companyId") ||
          localStorage.getItem("companyId"),
        queryCompanyId: new URLSearchParams(window.location.search).get(
          "companyId",
        ),
      });

      if (companyId) {
        localStorage.setItem("storefront_companyId", companyId);
      }

      let storedCompanySlug = "";
      let storedCustomDomain = "";
      try {
        const storedCompany = JSON.parse(
          localStorage.getItem("company") || "{}",
        );
        storedCompanySlug = storedCompany?.slug || "";
        storedCustomDomain = storedCompany?.customDomain || "";
      } catch {
        // ignore storage parse error
      }

      const companySlug =
        user?.company?.slug?.trim() ||
        storedCompanySlug?.trim() ||
        localStorage.getItem("companySlug") ||
        "";
      const customDomain =
        user?.company?.customDomain?.trim() ||
        storedCustomDomain?.trim() ||
        "";

      return buildProductPreviewUrl({
        origin: window.location.origin,
        productId: resolvedProductId,
        productSlug: formData.slug,
        companyId,
        companySlug,
        customDomain,
      });
    },
    [
      formData.slug,
      productCompanyId,
      user?.company?.customDomain,
      user?.company?.slug,
      user?.companyId,
    ],
  );


  const validateProduct = useCallback(
    (mode: "draft" | "strict") => {
      const errors: Record<string, string> = {};

      if (!formData.name.trim()) {
        errors["name"] =
          t("products.validation.nameRequired") || "اسم المنتج مطلوب";
      }

      if (mode === "strict") {
        if (!formData.category) {
          errors["category"] =
            t("products.validation.categoryRequired") || "الفئة مطلوبة";
        }
        if (!formData.price || formData.price <= 0) {
          errors["price"] =
            t("products.validation.priceRequired") ||
            "السعر يجب أن يكون أكبر من صفر";
        }
        if (formData.comparePrice && formData.comparePrice <= formData.price) {
          errors["comparePrice"] =
            t("products.validation.comparePriceInvalid") ||
            "سعر المقارنة يجب أن يكون أكبر من سعر البيع";
        }
        if (
          formData.saleStartDate &&
          formData.saleEndDate &&
          new Date(formData.saleStartDate) >= new Date(formData.saleEndDate)
        ) {
          errors["saleEndDate"] =
            t("products.pricing.endDateBeforeStart") ||
            "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية";
        }
        if (
          formData.externalOnly &&
          !String(formData.externalUrl || "").trim()
        ) {
          errors["slug"] =
            "أدخل رابط شراء خارجي أولًا قبل تفعيل وضع المنتج الخارجي";
        }
      }

      if (Object.keys(errors).length > 0) {
        setError(Object.values(errors)[0] || null);
        setFieldErrors(errors as FieldErrors);
        if (errors["name"] || errors["category"]) changeTab("basic");
        else if (
          errors["price"] ||
          errors["comparePrice"] ||
          errors["saleEndDate"]
        )
          changeTab("pricing");
        else if (errors["slug"]) changeTab("advanced");
        return false;
      }

      setError(null);
      setFieldErrors({});
      return true;
    },
    [formData, setError, setFieldErrors, t],
  );

  const buildCombinedMetadata = useCallback(
    (workflowOverride: ProductWorkflow) => ({
      ...productMetadata,
      workflow: workflowOverride,
      relatedProducts,
      upsellProducts,
      crossSellProducts,
      quantityOffers: normalizeQuantityOffers(quantityOffers),
    }),
    [
      crossSellProducts,
      productMetadata,
      quantityOffers,
      relatedProducts,
      upsellProducts,
    ],
  );

  const syncProductState = useCallback(
    (product: EditableProduct | null | undefined, fallbackWorkflow?: ProductWorkflow) => {
      if (!product) return;

      const nextWorkflow = normalizeProductWorkflow(
        product.workflow || fallbackWorkflow,
        product.isActive,
      );
      setWorkflow(nextWorkflow);
      setCurrentProductId(product.id || effectiveProductId || null);
      setProductCompanyId(product.companyId || null);
      setFormData((prev) => ({
        ...prev,
        isActive: nextWorkflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
      }));

      if (product.metadata !== undefined) {
        try {
          const nextMetadata = parseProductMetadata(product.metadata);
          setProductMetadata(nextMetadata);
          setVariantSettings(
            hydrateVariantSettings(nextMetadata?.variantSettings),
          );
          setQuantityOffers(normalizeQuantityOffers(nextMetadata));
        } catch {
          setProductMetadata((prev) => ({ ...prev, workflow: nextWorkflow }));
          setQuantityOffers([]);
        }
      } else {
        setProductMetadata((prev) => ({ ...prev, workflow: nextWorkflow }));
        setQuantityOffers([]);
      }
    },
    [effectiveProductId, setFormData, setVariantSettings],
  );

  const persistProduct = useCallback(
    async ({
      validationMode,
      workflowOverride,
    }: {
      validationMode: "draft" | "strict";
      workflowOverride?: ProductWorkflow;
    }) => {
      if (!validateProduct(validationMode)) {
        return null;
      }

      const nextWorkflow = normalizeProductWorkflow(
        workflowOverride || workflow,
        (workflowOverride || workflow)?.status ===
          PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
      );

      const normalizedVariantSettings = normalizeVariantSettingsForSave(
        variantSettings,
        attributes,
        variants,
      );
      if (
        JSON.stringify(normalizedVariantSettings) !==
        JSON.stringify(variantSettings)
      ) {
        setVariantSettings(normalizedVariantSettings);
      }

      const savedProduct = await saveProduct({
        formData: {
          ...formData,
          isActive: nextWorkflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
        },
        attributes,
        variants,
        deletedVariantIds,
        uploadedImages,
        productMetadata: buildCombinedMetadata(nextWorkflow),
        variantSettings: normalizedVariantSettings,
        whatsappNotify,
        isEditMode: Boolean(effectiveProductId),
        canEditStock: canEditInventoryStock,
        id: effectiveProductId || undefined,
        t,
      });

      if (savedProduct?.id) {
        syncProductState(savedProduct, nextWorkflow);
        if (!id) {
          navigate(`/products/${savedProduct.id}/edit`, { replace: true });
        }
      }

      return savedProduct;
    },
    [
      attributes,
      buildCombinedMetadata,
      deletedVariantIds,
      effectiveProductId,
      formData,
      id,
      canEditInventoryStock,
      navigate,
      saveProduct,
      setVariantSettings,
      syncProductState,
      t,
      uploadedImages,
      validateProduct,
      variantSettings,
      variants,
      whatsappNotify,
      workflow,
    ],
  );

  const runWorkflowAction = useCallback(
    async (action: WorkflowAction) => {
      let rejectionReason: string | null | undefined;
      if (action === "reject") {
        const promptValue = window.prompt("سبب الرفض (اختياري):");
        if (promptValue === null) {
          return null;
        }
        rejectionReason = promptValue.trim() || null;
      }

      const validationMode =
        action === "save_draft" || action === "reject" || action === "unpublish"
          ? "draft"
          : "strict";

      const savedProduct = await persistProduct({
        validationMode,
        workflowOverride: workflow,
      });
      const productId = savedProduct?.id || effectiveProductId;

      if (!productId) {
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post(
          `/products/${productId}/workflow`,
          {
            action,
            rejectionReason,
          },
        );
        const updatedProduct = response.data?.data;

        if (response.data?.success && updatedProduct) {
          syncProductState(updatedProduct);
          setSuccessMessage(response.data?.message || "تم تحديث حالة المنتج");
          setTimeout(() => setSuccessMessage(null), 3000);
          return updatedProduct;
        }

        throw new Error(response.data?.message || "فشل في تحديث حالة المنتج");
      } catch (err: unknown) {
        setError(getErrorMessage(err, "فشل في تحديث حالة المنتج"));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      effectiveProductId,
      persistProduct,
      setError,
      setLoading,
      setSuccessMessage,
      syncProductState,
      workflow,
    ],
  );

  const handleSaveChanges = useCallback(async () => {
    await persistProduct({
      validationMode: "strict",
      workflowOverride: resolvePrimarySaveWorkflow(workflow, {
        isMerchant,
      }),
    });
  }, [isMerchant, persistProduct, workflow]);

  const handlePreview = useCallback(async () => {
    const resolvedProductId = effectiveProductId || id;

    // 1. If product already exists (edit mode), open immediately in a new tab!
    // This gives instant response with zero delay and avoids popup-blocker issues.
    if (resolvedProductId) {
      const previewUrl = buildPreviewUrl(resolvedProductId);
      if (previewUrl) {
        window.open(previewUrl, "_blank", "noopener,noreferrer");

        // Concurrently auto-save any draft edits without blocking user navigation
        persistProduct({
          validationMode: "draft",
          workflowOverride: workflow,
        }).catch((err) => {
          console.warn("[handlePreview] Background auto-save encountered error:", err);
        });

        return;
      }
    }

    // 2. If it's a new unsaved product, open window synchronously to bypass popup blocker
    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      try {
        previewWindow.opener = null;
      } catch {
        // Ignore if the browser does not allow mutating opener.
      }
      previewWindow.document.title = "جاري التحضير...";
      previewWindow.document.write(`
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; margin: 0; flex-direction: column; }
              .spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .text { color: #4b5563; font-weight: 500; font-size: 16px; }
            </style>
          </head>
          <body>
            <div class="spinner"></div>
            <div class="text">جاري حفظ المسودة وتجهيز المعاينة...</div>
          </body>
        </html>
      `);
      previewWindow.document.close();
    }

    try {
      const savedProduct = await persistProduct({
        validationMode: "draft",
        workflowOverride: workflow,
      });
      const productId = savedProduct?.id || effectiveProductId;
      const previewUrl = productId ? buildPreviewUrl(productId) : "";

      if (!previewUrl) {
        setError((prev) => prev || "تعذر تجهيز رابط المعاينة لهذا المنتج");
        if (previewWindow) previewWindow.close();
        return;
      }

      if (previewWindow && !previewWindow.closed) {
        previewWindow.location.href = previewUrl;
      } else {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("[handlePreview] Error during preview creation:", err);
      if (previewWindow) previewWindow.close();
      setError("حدث خطأ أثناء تجهيز المعاينة");
    }
  }, [buildPreviewUrl, effectiveProductId, id, persistProduct, setError, workflow]);

  const handleConverted = useCallback(
    (result: ConvertPresentationResult) => {
      setShowConvertModal(false);
      setConvertSuccess(result);
      setLinkCopied(false);
      fetchPresentations();
    },
    [fetchPresentations],
  );

  const handleCopyConvertLink = useCallback(async () => {
    if (!convertSuccess) return;
    try {
      await navigator.clipboard.writeText(
        `/products/${convertSuccess.presentationSlug}`,
      );
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API unavailable; ignore.
    }
  }, [convertSuccess]);

  // Tab Definitions
  const tabs = [
    { id: "basic", name: t("products.tabs.basic"), icon: DocumentTextIcon },
    {
      id: "pricing",
      name: t("products.tabs.pricing"),
      icon: CurrencyDollarIcon,
    },
    { id: "quantity-offers", name: "عروض الكميات", icon: MegaphoneIcon },
    { id: "inventory", name: t("products.tabs.inventory"), icon: CubeIcon },
    { id: "media", name: t("products.tabs.media"), icon: PhotoIcon },
    { id: "attributes", name: t("products.tabs.attributes"), icon: SwatchIcon },
    { id: "variants", name: t("products.tabs.variants"), icon: SwatchIcon },
    { id: "presentations", name: "العروض التقديمية", icon: PhotoIcon },
    { id: "display", name: t("products.tabs.display"), icon: EyeIcon },
    ...(!isMerchant
      ? [
          {
            id: "commission",
            name: t("products.tabs.commission") || "العمولة",
            icon: CurrencyDollarIcon,
          },
          {
            id: "whatsapp",
            name: t("products.tabs.whatsapp") || "إشعار واتساب",
            icon: MegaphoneIcon,
          },
        ]
      : []),
    { id: "shipping", name: t("products.tabs.shipping"), icon: TruckIcon },
    { id: "seo", name: t("products.tabs.seo"), icon: MagnifyingGlassIcon },
    { id: "advanced", name: t("products.tabs.advanced"), icon: Cog6ToothIcon },
  ];

  const workflowLabel = getWorkflowStatusLabel(workflow.status);
  const workflowColorClass = getWorkflowStatusColor(workflow.status);

  if (isFetchingProduct && isEditMode) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
      {/* Top Navigation Bar */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200/80 dark:border-gray-700/70 sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-4 max-w-6xl 2xl:max-w-7xl mx-auto">
          {/* Title & Status */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/products"
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
              >
                <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                    {isEditMode ? t("products.editTitle") : t("products.addNew")}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${workflowColorClass}`}
                  >
                    {workflowLabel}
                  </span>
                </div>
                {workflow.rejectionReason && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                    سبب الرفض: {workflow.rejectionReason}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile quick save & theme toggle */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <ThemeToggle />
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                {loading ? "..." : (effectiveProductId ? "حفظ" : "إنشاء")}
              </button>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex w-full items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 sm:w-auto sm:flex-wrap sm:gap-2 sm:overflow-visible sm:py-0">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="shrink-0 whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 shadow-xs text-xs sm:text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200 dark:hover:bg-indigo-900/30 ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              معاينة
            </button>

            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              disabled={!effectiveProductId}
              title={
                effectiveProductId
                  ? undefined
                  : "احفظ المنتج أولاً قبل تحويله إلى عرض تقديمي"
              }
              className={`inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-lg border border-purple-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-900/40 dark:bg-slate-800 dark:text-purple-300 dark:hover:bg-purple-900/20 ${
                effectiveProductId ? "" : "cursor-not-allowed opacity-50"
              }`}
            >
              <ArrowPathIcon className="h-4 w-4" />
              عرض تقديمي
            </button>

            <button
              type="button"
              onClick={() => runWorkflowAction("save_draft")}
              disabled={loading}
              className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${
                loading ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              مسودة
            </button>

            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={loading}
              className={`hidden sm:inline-flex shrink-0 whitespace-nowrap items-center px-5 py-2 border border-transparent shadow-xs text-sm font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 ${
                loading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {loading && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {effectiveProductId
                ? t("common.saveChanges")
                : t("products.save")}
            </button>

            {canSubmitProductReview && canSubmitReview(workflow) && (
              <button
                type="button"
                onClick={() => runWorkflowAction("submit_review")}
                disabled={loading}
                className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200 dark:hover:bg-amber-900/30 ${
                  loading ? "cursor-not-allowed opacity-75" : ""
                }`}
              >
                إرسال للمراجعة
              </button>
            )}
            {canManageProductWorkflow && canApprove(workflow) && (
              <button
                type="button"
                onClick={() => runWorkflowAction("approve")}
                disabled={loading}
                className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30 ${
                  loading ? "cursor-not-allowed opacity-75" : ""
                }`}
              >
                اعتماد
              </button>
            )}
            {canManageProductWorkflow && canReject(workflow) && (
              <button
                type="button"
                onClick={() => runWorkflowAction("reject")}
                disabled={loading}
                className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200 dark:hover:bg-rose-900/30 ${
                  loading ? "cursor-not-allowed opacity-75" : ""
                }`}
              >
                رفض
              </button>
            )}
            {canManageProductWorkflow && canPublish(workflow) && (
              <button
                type="button"
                onClick={() => runWorkflowAction("publish")}
                disabled={loading}
                className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200 dark:hover:bg-green-900/30 ${
                  loading ? "cursor-not-allowed opacity-75" : ""
                }`}
              >
                نشر
              </button>
            )}
            {canManageProductWorkflow && canUnpublish(workflow) && (
              <button
                type="button"
                onClick={() => runWorkflowAction("unpublish")}
                disabled={loading}
                className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-200 dark:hover:bg-orange-900/30 ${
                  loading ? "cursor-not-allowed opacity-75" : ""
                }`}
              >
                إلغاء النشر
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        {/* Error / Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon
                  className="h-5 w-5 text-red-500"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3 rtl:mr-3 rtl:ml-0 flex-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {error}
                  </p>
                  {accessibleTargetCompany && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await switchCompany(accessibleTargetCompany.id);
                          window.location.reload();
                        } catch (swErr) {
                          console.error("Switch failed:", swErr);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      التبديل إلى شركة {accessibleTargetCompany.name} والفتح فوراً
                    </button>
                  )}
                  {fieldErrors.category && (
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      {t("categories.management.addCategory")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(success || successMessage) && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 rtl:mr-3 rtl:ml-0">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {successMessage || t("products.messages.productCreated")}
                </p>
              </div>
            </div>
          </div>
        )}

        {convertSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircleIcon
                  className="h-5 w-5 text-green-500 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    تم تحويل المنتج إلى عرض تقديمي بنجاح
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <span>الرابط الجديد:</span>
                    <span dir="ltr" className="font-mono text-xs">
                      /products/{convertSuccess.presentationSlug}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyConvertLink}
                      className="inline-flex items-center gap-1 rounded-md border border-green-300 dark:border-green-800 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                      {linkCopied ? (
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                      ) : (
                        <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      )}
                      {linkCopied ? "تم النسخ" : "نسخ الرابط"}
                    </button>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertSuccess(null)}
                className="text-green-500 hover:text-green-700 shrink-0"
                aria-label="إغلاق الإشعار"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Mobile horizontal tab bar */}
          <div className="lg:hidden -mx-1 px-1 sm:mx-0 sm:px-0 mb-2">
            <nav
              className="flex gap-1.5 overflow-x-auto scrollbar-none py-1.5 px-2 bg-white/90 dark:bg-gray-800/90 border border-gray-200/70 dark:border-gray-700/60 rounded-xl shadow-2xs"
              aria-label="أقسام المنتج"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeTab(tab.id)}
                    className={`shrink-0 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all min-h-[38px] ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Tabs */}
          <div className="hidden lg:block lg:col-span-1">
            <nav className="space-y-1 sticky top-24">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                // Highlight variants tab if toggled via button elsewhere
                const shouldPulse =
                  tab.id === "variants" && showVariants && !isActive;

                const tabUrl = isEditMode
                  ? `/products/${id}/edit?tab=${tab.id}`
                  : `/products/new?tab=${tab.id}`;
                return (
                  <a
                    key={tab.id}
                    href={tabUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      changeTab(tab.id);
                    }}
                    className={`${
                      isActive
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-500 dark:text-indigo-300"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    } group flex w-full items-center border-l-4 px-3 py-3 text-sm font-medium transition-colors duration-150 ease-in-out ${shouldPulse ? "animate-pulse bg-indigo-50/50 dark:bg-indigo-900/20" : ""}`}
                  >
                    <Icon
                      className={`${
                        isActive
                          ? "text-indigo-500 dark:text-indigo-400"
                          : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
                      } flex-shrink-0 mr-3 rtl:ml-3 rtl:mr-0 h-6 w-6 transition-colors duration-150 ease-in-out`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{tab.name}</span>

                    {/* Error indicators for specific tabs could go here */}
                    {tab.id === "basic" &&
                      (fieldErrors.name || fieldErrors.category) && (
                        <span className="ml-auto rtl:mr-auto w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    {tab.id === "pricing" && fieldErrors.price && (
                      <span className="ml-auto rtl:mr-auto w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Dynamic Tab Content */}
          <div className="lg:col-span-3">
            {activeTab === "basic" && (
              <BasicTab
                formData={formData}
                setFormData={setFormData}
                handleInputChange={handleInputChange}
                fieldErrors={fieldErrors}
                categories={categories}
                categoriesLoading={categoriesLoading}
                categoriesError={categoriesError}
                getInputClassName={getInputClassName}
                workflowLabel={workflowLabel}
                t={t}
                onAddCategoryClick={() => setIsCategoryModalOpen(true)}
              />
            )}

            {activeTab === "pricing" && (
              <PricingTab
                formData={formData}
                handleInputChange={handleInputChange}
                fieldErrors={fieldErrors}
                displayCurrency={displayCurrency}
                getInputClassName={getInputClassName}
                t={t}
              />
            )}

            {activeTab === "quantity-offers" && (
              <QuantityOffersTab
                quantityOffers={quantityOffers}
                setQuantityOffers={setQuantityOffers}
                baseUnitPrice={formData.comparePrice || formData.price}
                currentUnitPrice={formData.price}
                displayCurrency={displayCurrency}
                hasVariants={variants.length > 0}
                productName={formData.name}
              />
            )}

            {activeTab === "inventory" && (
              <InventoryTab
                formData={formData}
                handleInputChange={handleInputChange}
                fieldErrors={fieldErrors}
                getInputClassName={getInputClassName}
                canEditStock={canEditInventoryStock}
                stockLocationLabel={merchantStockControl?.stockLocationLabel}
                t={t}
              />
            )}

            {activeTab === "media" && (
              <MediaTab
                formData={formData}
                setFormData={setFormData}
                uploadedImages={uploadedImages}
                uploading={uploading}
                handleImageChange={handleImageChange}
                handleDragEnd={handleDragEnd}
                removeUploadedImage={removeUploadedImage}
                t={t}
              />
            )}

            {activeTab === "attributes" && (
              <AttributesTab
                attributes={attributes}
                setAttributes={setAttributes}
                attributeMode={attributeMode}
                setAttributeMode={setAttributeMode}
                newAttributeName={newAttributeName}
                setNewAttributeName={setNewAttributeName}
                newAttributeValuesList={newAttributeValuesList}
                addValueField={addValueField}
                updateValueField={updateValueField}
                removeValueField={removeValueField}
                addAttribute={addAttribute}
                removeAttribute={removeAttribute}
                generateVariations={() => generateVariations(formData.sku)}
                setActiveTab={setActiveTab}
                t={t}
              />
            )}

            {activeTab === "variants" && (
              <VariantsTab
                variants={variants}
                showVariants={showVariants}
                setShowVariants={setShowVariants}
                addVariant={addVariant}
                updateVariant={updateVariant}
                removeVariant={removeVariant}
                handleVariantImageChange={(vIdx, e) => {
                  if (e.target.files?.[0])
                    uploadVariantImage(vIdx, e.target.files[0]);
                }}
                bulkAction={bulkAction}
                handleBulkActionChange={handleBulkActionChange}
                showBulkInput={showBulkInput}
                bulkValue={bulkValue}
                setBulkValue={setBulkValue}
                applyBulkAction={applyBulkAction}
                displayCurrency={displayCurrency}
                shippingClassOptions={resolvedShippingClassOptions}
                defaultPricing={{
                  price: formData.price,
                  comparePrice: formData.comparePrice,
                  cost: formData.cost,
                }}
                syncWithProductPricing={syncWithProductPricing}
                attributes={attributes}
                uploadedImages={uploadedImages}
                onBatchUpdateVariants={batchUpdateVariants}
                onUploadImageForVariants={uploadImageForVariants}
                variantSettings={variantSettings}
                setVariantSettings={setVariantSettings}
                t={t}
              />
            )}

            {activeTab === "presentations" && (
              <PresentationsTab
                presentations={presentations}
                loading={presentationsLoading}
                productId={effectiveProductId}
                productSlug={formData.slug}
                storefrontOrigin={storefrontOrigin}
                onAdd={addPresentation}
                onUpdate={updatePresentation}
                onDelete={deletePresentation}
                onRefresh={fetchPresentations}
              />
            )}

            {activeTab === "display" && (
              <DisplayTab
                attributes={attributes}
                variants={variants}
                variantSettings={variantSettings}
                setVariantSettings={setVariantSettings}
                setActiveTab={setActiveTab}
                uploadFiles={async (files) => {
                  const { uploadFiles } =
                    await import("../../utils/apiHelpers");
                  const res = await uploadFiles(files);
                  return res;
                }}
                t={t}
              />
            )}

            {!isMerchant && activeTab === "commission" && (
              <CommissionTab
                formData={formData}
                setFormData={setFormData}
                handleInputChange={handleInputChange}
                displayCurrency={displayCurrency}
              />
            )}

            {!isMerchant && activeTab === "whatsapp" && (
              <WhatsappTab
                whatsappNotify={whatsappNotify}
                setWhatsappNotify={setWhatsappNotify}
              />
            )}

            {activeTab === "shipping" && (
              <ShippingTab
                formData={formData}
                handleInputChange={handleInputChange}
                handleDimensionChange={handleDimensionChange}
                shippingClassOptions={resolvedShippingClassOptions}
                t={t}
              />
            )}

            {activeTab === "seo" && (
              <SeoTab
                formData={formData}
                handleInputChange={handleInputChange}
              />
            )}

            {activeTab === "advanced" && (
              <AdvancedTab
                formData={formData}
                handleInputChange={handleInputChange}
                setFormData={setFormData}
                shippingClassOptions={resolvedShippingClassOptions}
                t={t}
                allProducts={allProducts}
                isLoadingProducts={isLoadingProducts}
                relatedProducts={relatedProducts}
                setRelatedProducts={setRelatedProducts}
                upsellProducts={upsellProducts}
                setUpsellProducts={setUpsellProducts}
                crossSellProducts={crossSellProducts}
                setCrossSellProducts={setCrossSellProducts}
                productMetadata={productMetadata}
                setProductMetadata={setProductMetadata}
              />
            )}
          </div>
        </div>
      </div>

      {showConvertModal && effectiveProductId && (
        <ConvertToPresentationModal
          open={showConvertModal}
          currentProductId={effectiveProductId}
          displayCurrency={displayCurrency}
          onClose={() => setShowConvertModal(false)}
          onConvert={convertToPresentation}
          onSuccess={handleConverted}
        />
      )}

      <CategoryFormModal
        open={isCategoryModalOpen}
        editingCategory={null}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={(category) => {
          setCategories((prev) => {
            if (prev.some((c) => c.id === category.id)) {
              return prev;
            }
            return [...prev, category as ProductCategory];
          });
          setFormData((prev) => ({
            ...prev,
            category: category.id,
          }));
          setError(null);
        }}
      />

    </div>
  );
};

export default ProductNewFinal;
