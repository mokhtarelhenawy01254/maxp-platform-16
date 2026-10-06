import { useState, useRef, useEffect } from "react";
import { ProductVariant, ProductAttribute } from "../types";
import { uploadFiles } from "../../../utils/apiHelpers";
import { normalizeImagePath } from "../../../utils/imageUrl";

export interface ProductPricingDefaults {
  price?: number;
  comparePrice?: number;
  cost?: number;
  shippingClass?: string;
  lowStockThreshold?: number;
}

export const useProductVariants = (
  initialTrackInventory: boolean = true,
  defaultSettings?: ProductPricingDefaults,
) => {
  const defaultSettingsRef = useRef<ProductPricingDefaults | undefined>(defaultSettings);
  defaultSettingsRef.current = defaultSettings;

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValuesList, setNewAttributeValuesList] = useState<string[]>([""]);
  
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState<string | number>("");
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [attributeMode, setAttributeMode] = useState<"templates" | "custom">("templates");
  
  const [variantSettings, setVariantSettings] = useState<{
    styles: {
      [key: string]: "buttons" | "circles" | "dropdown" | "thumbnails" | "radio";
    };
    attributeImages: { [key: string]: { [value: string]: string } };
    attributeColors: { [key: string]: { [value: string]: string } };
  }>({ styles: {}, attributeImages: {}, attributeColors: {} });

  // Auto-fill unpriced variants when base pricing is provided/updated in product draft
  useEffect(() => {
    const currentPrice = defaultSettings?.price;
    if (currentPrice === undefined || Number(currentPrice) <= 0) return;

    setVariants((prev) => {
      const hasUnpriced = prev.some(
        (v) => v.price === undefined || v.price === null || Number(v.price) <= 0
      );
      if (!hasUnpriced) return prev;

      return prev.map((v) => {
        if (v.price === undefined || v.price === null || Number(v.price) <= 0) {
          return {
            ...v,
            price: Number(currentPrice),
            comparePrice:
              v.comparePrice !== undefined && Number(v.comparePrice) > 0
                ? v.comparePrice
                : defaultSettings?.comparePrice !== undefined && Number(defaultSettings.comparePrice) > 0
                  ? Number(defaultSettings.comparePrice)
                  : undefined,
            cost:
              v.cost !== undefined && Number(v.cost) > 0
                ? v.cost
                : defaultSettings?.cost !== undefined && Number(defaultSettings.cost) > 0
                  ? Number(defaultSettings.cost)
                  : undefined,
          };
        }
        return v;
      });
    });
  }, [defaultSettings?.price, defaultSettings?.comparePrice, defaultSettings?.cost]);

  // Single variant operations
  const addVariant = () => {
    const defaults = defaultSettingsRef.current;
    const baseVariant: ProductVariant = {
      name: "",
      type: "color",
      sku: "",
      price:
        defaults?.price !== undefined && Number(defaults.price) > 0
          ? Number(defaults.price)
          : undefined,
      comparePrice:
        defaults?.comparePrice !== undefined && Number(defaults.comparePrice) > 0
          ? Number(defaults.comparePrice)
          : undefined,
      cost:
        defaults?.cost !== undefined && Number(defaults.cost) > 0
          ? Number(defaults.cost)
          : undefined,
      images: [],
      stock: 0,
      trackInventory: initialTrackInventory,
      isActive: true,
      sortOrder: variants.length,
      image: undefined,
      description: "",
      weight: undefined,
      dimensions: {},
      shippingClass: defaults?.shippingClass || "standard",
      allowBackorders: false,
      lowStockThreshold:
        defaults?.lowStockThreshold !== undefined ? defaults.lowStockThreshold : 5,
      attributeValues: {},
    };
    setVariants((prev) => [...prev, baseVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants((prev) =>
      prev.map((variant, i) => {
        if (i !== index) return variant;
        const updated: ProductVariant = { ...variant, [field]: value };
        if (field === "name" && typeof value === "string") {
          const parts = value
            .split(/\s*[\/\-|–]\s*/)
            .map((p) => p.trim())
            .filter(Boolean);
          const currentAttrValues =
            variant.attributeValues && typeof variant.attributeValues === "object"
              ? { ...variant.attributeValues }
              : {};
          const attrKeys = Object.keys(currentAttrValues);
          if (attrKeys.length > 0 && parts.length === attrKeys.length) {
            attrKeys.forEach((key, idx) => {
              if (parts[idx]) {
                currentAttrValues[key] = parts[idx];
              }
            });
            updated.attributeValues = currentAttrValues;
          }
        }
        return updated;
      })
    );
  };

  const removeVariant = (index: number) => {
    const variantToRemove = variants[index];
    if (variantToRemove?.id) {
      setDeletedVariantIds((prev) => [...prev, variantToRemove.id!]);
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const batchUpdateVariants = (
    indices: number[],
    updates: Partial<ProductVariant> | ((v: ProductVariant) => Partial<ProductVariant>)
  ) => {
    const indexSet = new Set(indices);
    setVariants((prev) =>
      prev.map((variant, i) => {
        if (!indexSet.has(i)) return variant;
        const patch = typeof updates === "function" ? updates(variant) : updates;
        return { ...variant, ...patch };
      })
    );
  };

  const uploadVariantImage = async (variantIndex: number, file: File) => {
    try {
      const data = await uploadFiles([file]);
      if (data.success && data.data.length > 0) {
        const rawUrl = data.data[0].fullUrl || data.data[0].url;
        const imageUrl = normalizeImagePath(rawUrl) || rawUrl;
        setVariants((prev) =>
          prev.map((variant, i) =>
            i === variantIndex
              ? {
                  ...variant,
                  image: imageUrl,
                  images:
                    variant.images && variant.images.length > 0
                      ? [imageUrl, ...variant.images.filter((img) => img !== imageUrl)]
                      : [imageUrl],
                }
              : variant
          )
        );
      }
    } catch (error) {
      console.error("Variant image upload error:", error);
    }
  };

  const uploadImageForVariants = async (
    indices: number[],
    file: File
  ): Promise<string | undefined> => {
    try {
      const data = await uploadFiles([file]);
      if (data.success && data.data.length > 0) {
        const rawUrl = data.data[0].fullUrl || data.data[0].url;
        const imageUrl = normalizeImagePath(rawUrl) || rawUrl;
        batchUpdateVariants(indices, (v) => ({
          image: imageUrl,
          images:
            v.images && v.images.length > 0
              ? [imageUrl, ...v.images.filter((img) => img !== imageUrl)]
              : [imageUrl],
        }));
        return imageUrl;
      }
    } catch (error) {
      console.error("Batch variant image upload error:", error);
      throw error;
    }
  };

  // Attribute operations
  const addAttribute = () => {
    if (!newAttributeName.trim()) return;

    const values = newAttributeValuesList.map((v) => v.trim()).filter((v) => v);
    if (values.length === 0) return;

    const newAttr: ProductAttribute = {
      id: `attr_${Date.now()}`,
      name: newAttributeName.trim(),
      slug: newAttributeName.trim().toLowerCase().replace(/\s+/g, "_"),
      values: values,
      visible: true,
      forVariations: true,
      requiredForOrder: true,
    };

    setAttributes((prev) => [...prev, newAttr]);
    setNewAttributeName("");
    setNewAttributeValuesList([""]);
  };

  const addValueField = () => setNewAttributeValuesList((prev) => [...prev, ""]);
  const updateValueField = (index: number, value: string) =>
    setNewAttributeValuesList((prev) => prev.map((v, i) => (i === index ? value : v)));
  const removeValueField = (index: number) => {
    if (newAttributeValuesList.length > 1) {
      setNewAttributeValuesList((prev) => prev.filter((_, i) => i !== index));
    }
  };
  const removeAttribute = (id: string) => setAttributes((prev) => prev.filter((attr) => attr.id !== id));

  const generateVariations = (baseSku: string) => {
    const variationAttributes = attributes.filter((attr) => attr.forVariations && attr.values.length > 0);
    if (variationAttributes.length === 0) return;

    const combinations: { [key: string]: string }[][] = variationAttributes.map((attr) =>
      attr.values.map((value) => ({ [attr.slug]: value }))
    );

    const allCombinations = combinations.reduce(
      (acc, curr) => {
        if (acc.length === 0) return curr.map((item) => [item]);
        return acc.flatMap((combo) => curr.map((item) => [...combo, item]));
      },
      [] as { [key: string]: string }[][]
    );

    const defaults = defaultSettingsRef.current;
    const defaultPrice =
      defaults?.price !== undefined && Number(defaults.price) > 0
        ? Number(defaults.price)
        : undefined;
    const defaultComparePrice =
      defaults?.comparePrice !== undefined && Number(defaults.comparePrice) > 0
        ? Number(defaults.comparePrice)
        : undefined;
    const defaultCost =
      defaults?.cost !== undefined && Number(defaults.cost) > 0
        ? Number(defaults.cost)
        : undefined;
    const defaultShippingClass = defaults?.shippingClass || "standard";
    const defaultLowStock =
      defaults?.lowStockThreshold !== undefined ? defaults.lowStockThreshold : 5;

    const matchedExistingVariantIds = new Set<string>();

    const newVariants: ProductVariant[] = allCombinations.map((combo, idx) => {
      const attributeValues = combo.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      const name = Object.values(attributeValues).join(" - ");

      // Match against existing variants to preserve their ID, pricing, images, and inventory
      const existingMatch = variants.find((ev) => {
        if (ev.id && matchedExistingVariantIds.has(ev.id)) return false;

        // 1. Check exact or normalized name match
        if (ev.name && ev.name.trim().toLowerCase() === name.trim().toLowerCase()) {
          return true;
        }

        // 2. Check attributeValues match (exact or normalized keys)
        if (ev.attributeValues && typeof ev.attributeValues === "object") {
          const evEntries = Object.entries(ev.attributeValues);
          const comboEntries = Object.entries(attributeValues);
          if (evEntries.length === comboEntries.length && comboEntries.length > 0) {
            const allMatched = comboEntries.every(([k, v]) => {
              const cleanK = k.replace(/[:_ـ\-]/g, "").trim().toLowerCase();
              return evEntries.some(([ek, evVal]) => {
                const cleanEk = ek.replace(/[:_ـ\-]/g, "").trim().toLowerCase();
                return cleanEk === cleanK && String(evVal).trim() === String(v).trim();
              });
            });
            if (allMatched) return true;
          }
        }

        return false;
      });

      if (existingMatch) {
        if (existingMatch.id) {
          matchedExistingVariantIds.add(existingMatch.id);
        }
        return {
          ...existingMatch,
          name,
          attributeValues,
          sortOrder: idx,
        };
      }

      return {
        name,
        type: "combination",
        sku: baseSku ? `${baseSku}-${idx + 1}` : "",
        price: defaultPrice,
        comparePrice: defaultComparePrice,
        cost: defaultCost,
        images: [],
        stock: 0,
        trackInventory: initialTrackInventory,
        isActive: true,
        sortOrder: idx,
        description: "",
        dimensions: {},
        shippingClass: defaultShippingClass,
        allowBackorders: false,
        lowStockThreshold: defaultLowStock,
        attributeValues,
      };
    });

    // Detect all existing variants with ID that are no longer part of new combinations
    const newlyDeletedVariantIds: string[] = [];
    variants.forEach((v) => {
      if (v.id && !matchedExistingVariantIds.has(v.id)) {
        newlyDeletedVariantIds.push(v.id);
      }
    });

    if (newlyDeletedVariantIds.length > 0) {
      setDeletedVariantIds((prev) => Array.from(new Set([...prev, ...newlyDeletedVariantIds])));
    }

    setVariants(newVariants);
  };

  // Sync pricing with base product settings
  const syncWithProductPricing = (targetIndex?: number) => {
    const defaults = defaultSettingsRef.current;
    if (!defaults) return;

    const price =
      defaults.price !== undefined && Number(defaults.price) > 0
        ? Number(defaults.price)
        : undefined;
    const comparePrice =
      defaults.comparePrice !== undefined && Number(defaults.comparePrice) > 0
        ? Number(defaults.comparePrice)
        : undefined;
    const cost =
      defaults.cost !== undefined && Number(defaults.cost) > 0
        ? Number(defaults.cost)
        : undefined;

    setVariants((prev) =>
      prev.map((v, i) => {
        if (targetIndex !== undefined && i !== targetIndex) return v;
        return {
          ...v,
          price: price !== undefined ? price : v.price,
          comparePrice: comparePrice !== undefined ? comparePrice : v.comparePrice,
          cost: cost !== undefined ? cost : v.cost,
        };
      })
    );
  };

  // Bulk actions
  const bulkActionsNeedingInput = [
    "set_price", "increase_price", "decrease_price", "increase_price_percent", "decrease_price_percent",
    "set_compare_price", "set_cost", "set_stock", "set_low_stock",
    "set_weight", "set_length", "set_width", "set_height", "set_shipping_class",
  ];

  const handleBulkActionChange = (action: string) => {
    setBulkAction(action);
    setShowBulkInput(bulkActionsNeedingInput.includes(action));
    setBulkValue("");
  };

  const applyBulkAction = () => {
    if (!bulkAction || variants.length === 0) return;
    const numValue = Number(bulkValue) || 0;

    setVariants((prev) => {
      return prev.map((v) => {
        let updated = { ...v };
        switch (bulkAction) {
          case "activate": updated.isActive = true; break;
          case "deactivate": updated.isActive = false; break;
          case "sync_product_pricing": {
            const defaults = defaultSettingsRef.current;
            if (defaults?.price !== undefined && Number(defaults.price) > 0) {
              updated.price = Number(defaults.price);
            }
            if (defaults?.comparePrice !== undefined && Number(defaults.comparePrice) > 0) {
              updated.comparePrice = Number(defaults.comparePrice);
            }
            if (defaults?.cost !== undefined && Number(defaults.cost) > 0) {
              updated.cost = Number(defaults.cost);
            }
            break;
          }
          case "set_price": updated.price = numValue; break;
          case "increase_price": updated.price = (updated.price || 0) + numValue; break;
          case "decrease_price": updated.price = Math.max(0, (updated.price || 0) - numValue); break;
          case "increase_price_percent": updated.price = (updated.price || 0) * (1 + numValue / 100); break;
          case "decrease_price_percent": updated.price = Math.max(0, (updated.price || 0) * (1 - numValue / 100)); break;
          case "set_compare_price": updated.comparePrice = numValue; break;
          case "set_cost": updated.cost = numValue; break;
          case "track_inventory": updated.trackInventory = true; break;
          case "untrack_inventory": updated.trackInventory = false; break;
          case "set_stock": updated.stock = Math.floor(numValue); updated.trackInventory = true; break;
          case "set_low_stock": updated.lowStockThreshold = Math.floor(numValue); break;
          case "in_stock": updated.stock = updated.stock || 10; updated.trackInventory = true; break;
          case "out_of_stock": updated.stock = 0; updated.trackInventory = true; break;
          case "allow_backorders": updated.allowBackorders = true; break;
          case "disallow_backorders": updated.allowBackorders = false; break;
          case "set_weight": updated.weight = numValue; break;
          case "set_length": updated.dimensions = { ...updated.dimensions, length: numValue }; break;
          case "set_width": updated.dimensions = { ...updated.dimensions, width: numValue }; break;
          case "set_height": updated.dimensions = { ...updated.dimensions, height: numValue }; break;
          case "set_shipping_class": updated.shippingClass = bulkValue as string; break;
        }
        return updated;
      });
    });

    if (bulkAction === "delete") {
      if (!window.confirm(`هل أنت متأكد من حذف كل المتغيرات (${variants.length})؟`)) {
        setBulkAction("");
        setBulkValue("");
        setShowBulkInput(false);
        return;
      }
      setDeletedVariantIds((prev) => [...prev, ...variants.map(v => v.id).filter(id => id) as string[]]);
      setVariants([]);
    }

    setBulkAction("");
    setBulkValue("");
    setShowBulkInput(false);
  };

  return {
    variants, setVariants, deletedVariantIds, setDeletedVariantIds,
    attributes, setAttributes, newAttributeName, setNewAttributeName,
    newAttributeValuesList, setNewAttributeValuesList,
    bulkAction, setBulkAction, bulkValue, setBulkValue,
    showBulkInput, setShowBulkInput,
    attributeMode, setAttributeMode,
    variantSettings, setVariantSettings,
    addVariant, updateVariant, removeVariant, uploadVariantImage,
    batchUpdateVariants, uploadImageForVariants,
    addAttribute, addValueField, updateValueField, removeValueField, removeAttribute, generateVariations,
    handleBulkActionChange, applyBulkAction, syncWithProductPricing
  };
};
