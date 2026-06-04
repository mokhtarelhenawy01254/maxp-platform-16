import { useState } from "react";
import { ProductVariant, ProductAttribute } from "../types";
import { uploadFiles } from "../../../utils/apiHelpers";
import { normalizeImagePath } from "../../../utils/imageUrl";

export const useProductVariants = (initialTrackInventory: boolean = true) => {
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

  // Single variant operations
  const addVariant = () => {
    const baseVariant: ProductVariant = {
      name: "",
      type: "color",
      sku: "",
      images: [],
      stock: 0,
      trackInventory: initialTrackInventory,
      isActive: true,
      sortOrder: variants.length,
      image: undefined,
      description: "",
      weight: undefined,
      dimensions: {},
      shippingClass: "standard",
      allowBackorders: false,
      lowStockThreshold: 5,
      attributeValues: {},
    };
    setVariants((prev) => [...prev, baseVariant]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setVariants((prev) =>
      prev.map((variant, i) => (i === index ? { ...variant, [field]: value } : variant))
    );
  };

  const removeVariant = (index: number) => {
    const variantToRemove = variants[index];
    if (variantToRemove?.id) {
      setDeletedVariantIds((prev) => [...prev, variantToRemove.id!]);
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadVariantImage = async (variantIndex: number, file: File) => {
    try {
      const data = await uploadFiles([file]);
      if (data.success && data.data.length > 0) {
        const rawUrl = data.data[0].fullUrl || data.data[0].url;
        const imageUrl = normalizeImagePath(rawUrl) || rawUrl;
        updateVariant(variantIndex, "image", imageUrl);
      }
    } catch (error) {
      console.error("Variant image upload error:", error);
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

    const newVariants: ProductVariant[] = allCombinations.map((combo, idx) => {
      const attributeValues = combo.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      const name = Object.values(attributeValues).join(" - ");
      const timestamp = Date.now();
      const uniqueSku = baseSku && baseSku !== "-" ? `${baseSku}-${idx + 1}-${timestamp}` : `VAR-${timestamp}-${idx + 1}`;

      return {
        name,
        type: "combination",
        sku: uniqueSku,
        images: [],
        stock: 0,
        trackInventory: initialTrackInventory,
        isActive: true,
        sortOrder: idx,
        description: "",
        dimensions: {},
        shippingClass: "standard",
        allowBackorders: false,
        lowStockThreshold: 5,
        attributeValues,
      };
    });

    setVariants(newVariants);
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
    addAttribute, addValueField, updateValueField, removeValueField, removeAttribute, generateVariations,
    handleBulkActionChange, applyBulkAction
  };
};
