import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useAuth } from "../../../../hooks/useAuthSimple";
import { getCurrencyByCode } from "../../../../utils/currency";
import { apiClient } from "../../../../services/apiClient";
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  CubeIcon,
  PhotoIcon,
  SwatchIcon,
  TruckIcon,
  Cog6ToothIcon,
  EyeIcon,
  MegaphoneIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Hooks
import { useProductForm } from "../../hooks/useProductForm";
import { useProductMedia } from "../../hooks/useProductMedia";
import { useProductVariants } from "../../hooks/useProductVariants";
import { useProductPresentations } from "../../hooks/useProductPresentations";
import { useProductApi } from "../../hooks/useProductApi";

import type { FieldErrors } from "../../types";
import type { ConvertPresentationResult } from "../../hooks/useProductPresentations";
import {
  hydrateVariantSettings,
  normalizeVariantSettingsForSave,
} from "../../utils/variantSettings";
import { resolveShippingClassSettingsCompanyId } from "../../utils/shippingClassCompany";
import {
  canManageProductWorkflowByRole,
  canSubmitProductReviewByRole,
  getWorkflowStatusColor,
  getWorkflowStatusLabel,
  normalizeProductWorkflow,
  PRODUCT_WORKFLOW_STATUSES,
  resolvePrimarySaveWorkflow,
  type ProductWorkflow,
} from "../../utils/workflow";
import {
  normalizeQuantityOffers,
  type QuantityOffer,
} from "../../../../utils/quantityOffers";
import {
  DEFAULT_SHIPPING_CLASSES,
  ensureShippingClassesForKeys,
  mergeShippingClasses,
  type ShippingClassOption,
} from "../../../../constants/shippingClasses";
import { getProductPageCheckoutOverrideEnabled } from "../../../../utils/productPageCheckout";
import {
  buildProductPreviewUrl,
  resolveProductPreviewCompanyId,
} from "../../utils/productPreviewUrl";
import {
  ProductMetadata,
  ProductCategory,
  ProductListItem,
  ProductImageSource,
  EditableVariant,
  EditableProduct,
  TabItem,
  WorkflowAction,
  ProductAttribute,
} from "./types";
import {
  parseProductMetadata,
  parseVariantMetadata,
  normalizeAffiliateVisibility,
  normalizeAffiliateVisibilityIds,
  getErrorMessage,
} from "./utils";

export function useProductNewController() {
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

  // General State – sync tab with URL search param
  const tabFromUrl = searchParams.get("tab") || "basic";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const changeTab = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const [productMetadata, setProductMetadata] = useState<ProductMetadata>({});
  const [workflow, setWorkflow] = useState<ProductWorkflow>(
    normalizeProductWorkflow(null, false)
  );
  const [currentProductId, setCurrentProductId] = useState<string | null>(
    id || null
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

  // Custom Hooks
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
    void fetchAllProducts();
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
      } catch {
        setCategories([]);
        setCategoriesError(t("products.messages.categoriesLoadErrorNetwork"));
      } finally {
        setCategoriesLoading(false);
      }
    };
    void fetchCategories();
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
            nextOptions.length > 0 ? nextOptions : DEFAULT_SHIPPING_CLASSES
          );
        }
      } catch (err) {
        console.error("Failed to load shipping class options:", err);
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
          product.isActive
        );

        const parsedMetadata = parseProductMetadata(product.metadata);

        setProductMetadata(parsedMetadata);
        setVariantSettings(
          hydrateVariantSettings(parsedMetadata.variantSettings)
        );
        setWorkflow(resolvedWorkflow);
        setCurrentProductId(product.id || null);
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
            : null
        );

        setFormData({
          name: product.name || "",
          description: product.description || "",
          slug: product.slug || "",
          price: parseFloat(String(product.price || 0)) || 0,
          comparePrice: product.comparePrice
            ? parseFloat(String(product.comparePrice))
            : undefined,
          cost: product.cost ? parseFloat(String(product.cost)) : undefined,
          sku: product.sku || "",
          category: product.categoryId || "",
          stock: parseFloat(String(product.stock || 0)) || 0,
          trackInventory: product.trackInventory !== false,
          lowStockThreshold: product.lowStockThreshold || 5,
          isActive:
            resolvedWorkflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
          enableCheckoutForm:
            getProductPageCheckoutOverrideEnabled(parsedMetadata),
          showAddToCartButton: (product as any).showAddToCartButton !== false,
          saleStartDate: (product as any).saleStartDate
            ? new Date((product as any).saleStartDate).toISOString().slice(0, 16)
            : "",
          saleEndDate: (product as any).saleEndDate
            ? new Date((product as any).saleEndDate).toISOString().slice(0, 16)
            : "",
          sizeGuide: (product as any).sizeGuide || "",
          tags: (() => {
            if (Array.isArray(product.tags)) return product.tags;
            if (typeof product.tags === "string" && product.tags.trim()) {
              try {
                const parsed = JSON.parse(product.tags);
                return Array.isArray(parsed) ? parsed : [product.tags];
              } catch {
                return product.tags
                  .split(",")
                  .map((t: string) => t.trim())
                  .filter(Boolean);
              }
            }
            return [];
          })(),
          weight: product.weight ? parseFloat(String(product.weight)) : undefined,
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
            ? parseFloat(String(product.affiliateCommission))
            : 0,
          commissionType: product.commissionType || "PERCENTAGE",
          allowAffiliateMarkup: product.allowAffiliateMarkup || false,
          affiliateVisibility: normalizeAffiliateVisibility(
            (product as any).affiliateVisibility || parsedMetadata.affiliateVisibility
          ),
          affiliateVisibleAffiliateIds: normalizeAffiliateVisibilityIds(
            (product as any).affiliateVisibleAffiliateIds
              ? (() => {
                  try {
                    return JSON.parse((product as any).affiliateVisibleAffiliateIds);
                  } catch {
                    return [];
                  }
                })()
              : undefined,
            parsedMetadata.affiliateVisibleAffiliateIds,
            parsedMetadata.visibleAffiliateIds,
            parsedMetadata.allowedAffiliateIds
          ),
          mainImage: product.mainImage || "",
          metaTitle: product.metaTitle || "",
          metaDescription: product.metaDescription || "",
          canonicalUrl: product.canonicalUrl || "",
          allowBackorders: (parsedMetadata as any).allowBackorders || (product as any).allowBackorders || false,
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
                    : img.fullUrl || img.url || img.path
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
              price: v.price ? parseFloat(String(v.price)) : undefined,
              comparePrice: v.comparePrice
                ? parseFloat(String(v.comparePrice))
                : undefined,
              cost: v.cost ? parseFloat(String(v.cost)) : undefined,
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
                varMeta.weight || (v.weight ? parseFloat(String(v.weight)) : undefined),
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
                    variant.attributeValues[attrKey]
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
        setError(
          (data as any)?.message ||
            (data as any)?.error ||
            t("products.messages.productError")
        );
      }
    } catch (err: any) {
      console.error("[ProductEdit] Error fetching product:", err);
      setProductCompanyId(null);
      const errData = err?.response?.data;
      const status = err?.response?.status;

      if (
        errData?.code === "DIFFERENT_COMPANY_ACCESSIBLE" &&
        errData?.targetCompanyId
      ) {
        setAccessibleTargetCompany({
          id: errData.targetCompanyId,
          name: errData.targetCompanyName || "الشركة المالكة للمنتج",
        });
        setError(
          errData.message ||
            errData.error ||
            "هذا المنتج يتبع لشركة أخرى ضمن حسابك."
        );
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
    void fetchProduct();
  }, [fetchProduct]);

  const resolvedShippingClassOptions = ensureShippingClassesForKeys(
    shippingClassOptions,
    [
      formData.shippingClass,
      ...variants.map((variant) => variant.shippingClass),
      typeof bulkValue === "string" ? bulkValue : "",
    ].filter((value): value is string => Boolean(String(value || "").trim()))
  );

  const getInputClassName = (fieldName: string) => {
    return fieldErrors[fieldName as keyof typeof fieldErrors]
      ? "mt-1 block w-full border-destructive text-destructive placeholder:text-destructive/50 focus:outline-none focus:ring-1 focus:ring-destructive rounded-md text-xs"
      : "mt-1 block w-full border-border/70 rounded-md shadow-xs focus:ring-1 focus:ring-primary text-xs bg-background text-foreground";
  };

  const handleDimensionChange = (
    field: "length" | "width" | "height",
    value: string
  ) => {
    setFormData((prev: any) => ({
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
          "companyId"
        ),
      });

      if (companyId) {
        localStorage.setItem("storefront_companyId", companyId);
      }

      let storedCompanySlug = "";
      let storedCustomDomain = "";
      try {
        const storedCompany = JSON.parse(
          localStorage.getItem("company") || "{}"
        );
        storedCompanySlug = storedCompany?.slug || "";
        storedCustomDomain = storedCompany?.customDomain || "";
      } catch {
        // ignore
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
    ]
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
    [changeTab, formData, setError, setFieldErrors, t]
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
    ]
  );

  const syncProductState = useCallback(
    (
      product: EditableProduct | null | undefined,
      fallbackWorkflow?: ProductWorkflow
    ) => {
      if (!product) return;

      const nextWorkflow = normalizeProductWorkflow(
        product.workflow || fallbackWorkflow,
        product.isActive
      );
      setWorkflow(nextWorkflow);
      setCurrentProductId(product.id || effectiveProductId || null);
      setProductCompanyId(product.companyId || null);
      setFormData((prev: any) => ({
        ...prev,
        isActive: nextWorkflow.status === PRODUCT_WORKFLOW_STATUSES.PUBLISHED,
      }));

      if (product.metadata !== undefined) {
        try {
          const nextMetadata = parseProductMetadata(product.metadata);
          setProductMetadata(nextMetadata);
          setVariantSettings(
            hydrateVariantSettings(nextMetadata?.variantSettings)
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
    [effectiveProductId, setFormData, setVariantSettings]
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
          PRODUCT_WORKFLOW_STATUSES.PUBLISHED
      );

      const normalizedVariantSettings = normalizeVariantSettingsForSave(
        variantSettings,
        attributes,
        variants
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
      canEditInventoryStock,
      deletedVariantIds,
      effectiveProductId,
      formData,
      id,
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
    ]
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
          }
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
    ]
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

    if (resolvedProductId) {
      const previewUrl = buildPreviewUrl(resolvedProductId);
      if (previewUrl) {
        window.open(previewUrl, "_blank", "noopener,noreferrer");

        persistProduct({
          validationMode: "draft",
          workflowOverride: workflow,
        }).catch((err) => {
          console.warn("[handlePreview] Background auto-save encountered error:", err);
        });

        return;
      }
    }

    const previewWindow = window.open("", "_blank");
    if (previewWindow) {
      try {
        previewWindow.opener = null;
      } catch {
        // ignore
      }
      previewWindow.document.title = "جاري التحضير...";
      previewWindow.document.write(`
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f9fafb; font-family: system-ui, -apple-system, sans-serif; margin: 0; flex-direction: column; }
              .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .text { color: #4b5563; font-weight: 500; font-size: 14px; }
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
      void fetchPresentations();
    },
    [fetchPresentations]
  );

  const handleCopyConvertLink = useCallback(async () => {
    if (!convertSuccess) return;
    try {
      await navigator.clipboard.writeText(
        `/products/${convertSuccess.presentationSlug}`
      );
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [convertSuccess]);

  const tabs: TabItem[] = [
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

  return {
    navigate,
    id,
    isEditMode,
    user,
    switchCompany,
    accessibleTargetCompany,
    t,
    isMerchant,
    canManageProductWorkflow,
    canSubmitProductReview,
    displayCurrency,
    storefrontOrigin,
    activeTab,
    setActiveTab,
    changeTab,
    productMetadata,
    setProductMetadata,
    workflow,
    isFetchingProduct,
    showVariants,
    setShowVariants,
    showConvertModal,
    setShowConvertModal,
    convertSuccess,
    setConvertSuccess,
    linkCopied,
    categories,
    setCategories,
    categoriesLoading,
    categoriesError,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    canEditInventoryStock,
    merchantStockControl,
    relatedProducts,
    setRelatedProducts,
    upsellProducts,
    setUpsellProducts,
    crossSellProducts,
    setCrossSellProducts,
    quantityOffers,
    setQuantityOffers,
    allProducts,
    isLoadingProducts,
    whatsappNotify,
    setWhatsappNotify,
    formData,
    setFormData,
    fieldErrors,
    handleInputChange,
    uploadedImages,
    uploading,
    handleImageChange,
    handleDragEnd,
    removeUploadedImage,
    variants,
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
    loading,
    error,
    setError,
    success,
    successMessage,
    effectiveProductId,
    presentations,
    presentationsLoading,
    fetchPresentations,
    addPresentation,
    updatePresentation,
    deletePresentation,
    convertToPresentation,
    resolvedShippingClassOptions,
    getInputClassName,
    handleDimensionChange,
    runWorkflowAction,
    handleSaveChanges,
    handlePreview,
    handleConverted,
    handleCopyConvertLink,
    tabs,
    workflowLabel,
    workflowColorClass,
  };
}
