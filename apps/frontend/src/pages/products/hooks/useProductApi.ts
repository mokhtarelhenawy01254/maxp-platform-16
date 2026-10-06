import { useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { productApi } from "../../../utils/apiHelpers";
import { ProductFormData, ProductAttribute, ProductVariant } from "../types";
import { PRODUCT_PAGE_CHECKOUT_OVERRIDE_KEY } from "../../../utils/productPageCheckout";

interface UseProductApiProps {
  formData: ProductFormData;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  deletedVariantIds: string[];
  uploadedImages: string[];
  productMetadata: Record<string, any>;
  variantSettings: any;
  whatsappNotify: any;
  isEditMode: boolean;
  canEditStock?: boolean;
  id?: string;
  t: any;
}

export const useProductApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizeArabicValue = (str: string) =>
    String(str || "")
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ");

  const cleanVariantData = (
    variant: ProductVariant,
    {
      canEditStock = true,
      attributes,
      fallbackSortOrder = 0,
      variantSettings,
    }: {
      canEditStock?: boolean;
      attributes?: ProductAttribute[];
      fallbackSortOrder?: number;
      variantSettings?: any;
    } = {},
  ): any => {
    let imagesStr = null;
    if (variant.images && Array.isArray(variant.images) && variant.images.length > 0) {
      imagesStr = JSON.stringify(variant.images);
    } else if (typeof variant.images === "string") {
      imagesStr = variant.images;
    }

    const variantData: any = {
      name: variant.name,
      type: variant.type || "color",
      sku: variant.sku || null,
      price: variant.price !== undefined ? variant.price : null,
      comparePrice: variant.comparePrice !== undefined ? variant.comparePrice : null,
      cost: variant.cost !== undefined ? variant.cost : null,
      images: imagesStr,
      isActive: variant.isActive !== undefined ? variant.isActive : true,
      sortOrder: variant.sortOrder !== undefined ? variant.sortOrder : fallbackSortOrder,
    };

    if (canEditStock) {
      variantData.stock = variant.stock !== undefined ? variant.stock : 0;
      variantData.trackInventory =
        variant.trackInventory !== undefined ? variant.trackInventory : true;
    }

    const resolvedAttributeValues: Record<string, string> = {
      ...(typeof variant.attributeValues === "object" && variant.attributeValues !== null
        ? variant.attributeValues
        : {}),
    };

    if (variant.name) {
      const parts = variant.name
        .split(/\s*[\/\-|–]\s*/)
        .map((p) => p.trim())
        .filter(Boolean);

      if (attributes && Array.isArray(attributes) && attributes.length > 0) {
        const variationAttrs = attributes.filter((a) => a.forVariations !== false);
        for (const attr of attributes) {
          const attrKey = attr.slug || attr.name;
          if (!attrKey || !Array.isArray(attr.values)) continue;

          for (const part of parts) {
            const normalizedPart = normalizeArabicValue(part);
            const matchedVal = attr.values.find(
              (v) =>
                String(v).trim().toLowerCase() === part.toLowerCase() ||
                normalizeArabicValue(String(v)) === normalizedPart,
            );
            if (matchedVal !== undefined) {
              resolvedAttributeValues[attrKey] = String(matchedVal).trim();
              break;
            }
          }
        }

        if (parts.length === variationAttrs.length && parts.length > 0) {
          variationAttrs.forEach((attr, idx) => {
            const attrKey = attr.slug || attr.name;
            if (!attrKey || !parts[idx]) return;
            const currentVal = resolvedAttributeValues[attrKey];
            if (!currentVal || !parts.includes(currentVal)) {
              const normalizedPart = normalizeArabicValue(parts[idx]);
              const matchedVal = (attr.values || []).find(
                (v) =>
                  String(v).trim().toLowerCase() === parts[idx].toLowerCase() ||
                  normalizeArabicValue(String(v)) === normalizedPart,
              );
              resolvedAttributeValues[attrKey] = matchedVal !== undefined
                ? String(matchedVal).trim()
                : parts[idx];
            }
          });
        }
      }

      const existingKeys = Object.keys(resolvedAttributeValues);
      if (existingKeys.length > 0 && parts.length === existingKeys.length) {
        existingKeys.forEach((key, idx) => {
          const val = resolvedAttributeValues[key];
          if (parts[idx] && (!val || !parts.includes(val))) {
            resolvedAttributeValues[key] = parts[idx];
          }
        });
      }
    }

    let resolvedVariantImage = variant.image || null;
    if (!resolvedVariantImage && variantSettings?.attributeImages && typeof variantSettings.attributeImages === "object") {
      const attrVals = Object.values(resolvedAttributeValues).filter(Boolean);
      for (const imageMap of Object.values(variantSettings.attributeImages)) {
        if (!imageMap || typeof imageMap !== "object") continue;
        for (const val of attrVals) {
          const direct = (imageMap as Record<string, any>)[val];
          if (typeof direct === "string" && direct.trim()) {
            resolvedVariantImage = direct.trim();
            break;
          }
          const normVal = normalizeArabicValue(val);
          for (const [mapKey, mapUrl] of Object.entries(imageMap)) {
            if (typeof mapUrl === "string" && mapUrl.trim() && normalizeArabicValue(mapKey) === normVal) {
              resolvedVariantImage = mapUrl.trim();
              break;
            }
          }
          if (resolvedVariantImage) break;
        }
        if (resolvedVariantImage) break;
      }
    }

    if (!variantData.images && resolvedVariantImage) {
      variantData.images = JSON.stringify([resolvedVariantImage]);
    }

    variantData.metadata = JSON.stringify({
      attributeValues: Object.keys(resolvedAttributeValues).length > 0 ? resolvedAttributeValues : (variant.attributeValues || null),
      description: variant.description || null,
      dimensions: variant.dimensions || null,
      weight: variant.weight || null,
      shippingClass: variant.shippingClass || null,
      allowBackorders: variant.allowBackorders || null,
      lowStockThreshold: variant.lowStockThreshold || null,
      image: resolvedVariantImage,
    });

    return variantData;
  };

  const saveProduct = async (
    props: UseProductApiProps,
    onSuccess?: (product: any) => void,
  ) => {
    const {
      formData,
      attributes,
      variants,
      deletedVariantIds,
      uploadedImages,
      productMetadata,
      variantSettings,
      whatsappNotify,
      isEditMode,
      canEditStock = true,
      id,
      t
    } = props;

    setError(null);
    setLoading(true);

    try {
      // 1. Process base64 images in description (moved to component logic or simplified here)
      // For simplicity in the hook, we assume the description is already processed
      // Or we can keep the base64 processing here if it doesn't need external state

      const affiliateVisibility =
        formData.affiliateVisibility === "HIDDEN" ||
        formData.affiliateVisibility === "SELECTED"
          ? formData.affiliateVisibility
          : "ALL";
      const affiliateVisibleAffiliateIds =
        affiliateVisibility === "SELECTED"
          ? Array.from(
              new Set(
                (formData.affiliateVisibleAffiliateIds || [])
                  .map((affiliateId) => String(affiliateId || "").trim())
                  .filter(Boolean),
              ),
            )
          : [];
      const orderRequiredAttributes = attributes
        .filter((attribute) => (
          attribute.forVariations
          && attribute.values.length > 1
          && attribute.requiredForOrder !== false
        ))
        .map((attribute) => attribute.slug || attribute.name)
        .filter(Boolean);
      const orderAttributeLabels = Object.fromEntries(
        attributes
          .filter((attribute) => attribute.slug || attribute.name)
          .map((attribute) => [attribute.slug || attribute.name, attribute.name]),
      );

      // 2. Prepare Payload
      const productData = {
        name: formData.name,
        description: formData.description,
        slug: formData.slug || null,
        price: formData.price,
        comparePrice: formData.comparePrice || null,
        cost: formData.cost || null,
        sku: formData.sku || null,
        category: formData.category,
        stock: formData.trackInventory ? formData.stock : 0,
        trackInventory: formData.trackInventory,
        allowBackorders: Boolean(formData.allowBackorders),
        lowStockThreshold: formData.lowStockThreshold || 5,
        isActive: formData.isActive,
        isFeatured: formData.isFeatured || false,
        isHidden: formData.isHidden || false,
        showFakeStock: formData.showFakeStock || false,
        featuredPriority: formData.featuredPriority || 0,
        enableCheckoutForm: formData.enableCheckoutForm,
        showAddToCartButton: formData.showAddToCartButton,
        saleStartDate: formData.saleStartDate ? new Date(formData.saleStartDate).toISOString() : null,
        saleEndDate: formData.saleEndDate ? new Date(formData.saleEndDate).toISOString() : null,
        sizeGuide: formData.sizeGuide?.trim() || null,
        tags: formData.tags,
        weight: formData.weight || null,
        dimensions: formData.dimensions || null,
        images: uploadedImages,
        mainImage: (formData.mainImage && uploadedImages.includes(formData.mainImage)
          ? formData.mainImage
          : uploadedImages[0] || null),
        affiliateCommission: formData.affiliateCommission || 0,
        commissionType: formData.commissionType,
        allowAffiliateMarkup: formData.allowAffiliateMarkup,
        affiliateVisibility: affiliateVisibility,
        affiliateVisibleAffiliateIds:
          affiliateVisibility === "SELECTED" ? JSON.stringify(affiliateVisibleAffiliateIds) : null,
        // SEO fields
        metaTitle: formData.metaTitle || null,
        metaDescription: formData.metaDescription || null,
        canonicalUrl: formData.canonicalUrl || null,
        variantSettings,
        metadata: JSON.stringify({
          ...productMetadata,
          variantSettings,
          [PRODUCT_PAGE_CHECKOUT_OVERRIDE_KEY]: Boolean(
            formData.enableCheckoutForm,
          ),
          attributes: attributes,
          aiOrderOptions: {
            requiredAttributes: orderRequiredAttributes,
            attributeLabels: orderAttributeLabels,
          },
          affiliateVisibility,
          affiliateVisibleAffiliateIds,
          shippingClass: formData.shippingClass || "standard",
          excludeFromFreeShipping: formData.excludeFromFreeShipping || false,
          // Inventory extras stored in metadata
          allowBackorders: Boolean(formData.allowBackorders),
          barcode: formData.barcode || null,
          isPreOrder: formData.isPreOrder || false,
          preOrderDate: formData.preOrderDate || null,
          preOrderMessage: formData.preOrderMessage || null,
          externalUrl: formData.externalUrl?.trim() || null,
          affiliateUrl: formData.externalUrl?.trim() || null,
          externalButtonLabel: formData.externalButtonLabel?.trim() || null,
          affiliateButtonLabel: formData.externalButtonLabel?.trim() || null,
          externalVendor: formData.externalVendor?.trim() || null,
          partnerName: formData.externalVendor?.trim() || null,
          externalDescription: formData.externalDescription?.trim() || null,
          affiliateDescription: formData.externalDescription?.trim() || null,
          externalOnly: Boolean(formData.externalOnly),
          externalAffiliateOnly: Boolean(formData.externalOnly),
          isExternalProduct: Boolean(formData.externalOnly),
        }),
      };

      if (!canEditStock) {
        delete (productData as any).stock;
        // NOTE: trackInventory is intentionally preserved so the merchant's
        // choice to disable stock tracking (or enable pre-order) is honoured
        // on the storefront. Removing it forced every product back to
        // trackInventory=true and broke pre-order / no-stock checkout.
      }

      if (isEditMode && id) {
        // UPDATE PRODUCT
        const response = await apiClient.patch(`/products/${id}`, productData, { timeout: 120000 });
        const result = response.data;

        if (result.success) {
          const savedProduct = result.data || null;

          // Delete removed variants in parallel
          if (deletedVariantIds.length > 0) {
            await Promise.all(
              deletedVariantIds.map((variantId) =>
                apiClient.delete(`/products/${id}/variants/${variantId}`).catch((err) => {
                  console.error(`Error deleting variant ${variantId}:`, err);
                })
              )
            );
          }

          // Update/Create variants in parallel
          if (variants.length > 0) {
            await Promise.all(
              variants.map(async (variant, idx) => {
                const cleanedVariant = cleanVariantData(variant, {
                  canEditStock,
                  attributes,
                  fallbackSortOrder: idx,
                  variantSettings,
                });
                try {
                  if (variant.id) {
                    await apiClient.put(`/products/${id}/variants/${variant.id}`, cleanedVariant);
                  } else {
                    const created = await productApi.createVariant(id, cleanedVariant);
                    if (created?.data?.id || created?.id) {
                      variant.id = created.data?.id || created.id;
                    }
                  }
                } catch (err) {
                  console.error(`Error processing variant:`, err);
                }
              })
            );
          }

          setSuccessMessage(t("products.messages.productUpdated"));
          setTimeout(() => setSuccessMessage(null), 3000);
          setSuccess(false);

          // WhatsApp Trigger
          if (whatsappNotify.enabled) {
            try {
              await apiClient.post('/customers/whatsapp-notify/smart-send', {
                audience: whatsappNotify.audience,
                message: whatsappNotify.customMessage,
                eventType: 'NEW_PRODUCT',
                productId: id
              });
            } catch (err) {
              console.error('Error triggering whatsapp:', err);
            }
          }

          if (onSuccess) onSuccess(savedProduct);
          return savedProduct;
        } else {
          setError(result.message || t("products.messages.productError"));
          return null;
        }
      } else {
        // CREATE PRODUCT (using apiClient for consistency)
        const response = await apiClient.post('/products', productData, { timeout: 120000 });
        const result = response.data;

        if (result.success) {
          const productId = result.data?.id;
          const savedProduct = result.data || null;
          if (variants.length > 0 && productId) {
            await Promise.all(
              variants.map(async (variant, idx) => {
                try {
                  const variantData = cleanVariantData(variant, {
                    canEditStock,
                    attributes,
                    fallbackSortOrder: idx,
                    variantSettings,
                  });
                  await productApi.createVariant(productId, variantData);
                } catch (err) {
                  console.error(`Error creating variant:`, err);
                }
              })
            );
          }

          // WhatsApp Trigger
          if (whatsappNotify.enabled && productId) {
            try {
              await apiClient.post('/customers/whatsapp-notify/smart-send', {
                audience: whatsappNotify.audience,
                message: whatsappNotify.customMessage,
                eventType: 'NEW_PRODUCT',
                productId: productId
              });
            } catch (err) {
              console.error('Error triggering whatsapp:', err);
            }
          }

          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
          if (onSuccess) onSuccess(savedProduct);
          return savedProduct;
        } else {
          setError(result.message || t("products.messages.productCreationError"));
          return null;
        }
      }
    } catch (err: any) {
      console.error("❌ [ProductSave-Hook] Error saving product:", err);
      
      // Capture more details for debugging
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      const errorStatus = err.response?.status;
      const errorData = err.response?.data;
      
      console.error("❌ [ProductSave-Details]:", {
        message: errorMessage,
        status: errorStatus,
        data: errorData,
        isEditMode,
        productId: id
      });

      setError(
        errorMessage + (errorStatus ? ` (Status: ${errorStatus})` : "")
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading, setLoading,
    error, setError,
    success, setSuccess,
    successMessage, setSuccessMessage,
    saveProduct
  };
};
