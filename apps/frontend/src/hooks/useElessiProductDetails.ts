import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import { storefrontApi } from "../utils/storefrontApi";
import type {
  ProductVariant,
  StorefrontProduct,
} from "../types/StorefrontTypes";
import { normalizeProductImages } from "../types/StorefrontTypes";
import type { ElessiColorOption, ElessiSizeOption } from "../data/mockData";
import {
  elessiColors,
  elessiProductFallback,
  elessiProductTagsFallback,
} from "../data/mockData";

export {
  elessiColors,
  elessiProductFallback,
  elessiProductTagsFallback,
} from "../data/mockData";

type LooseRecord = Record<string, unknown>;
type VariantAttributeEntry = Record<string, unknown>;

interface ElessiProductVariant extends ProductVariant {
  color?: string;
  size?: string;
}

interface ElessiProductPayload extends StorefrontProduct {
  specifications?: string;
  sizeGuide?: string;
  variants: ElessiProductVariant[];
}

const isRecord = (value: unknown): value is LooseRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJsonRecord = (value: string): LooseRecord | null => {
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseJsonValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getFirstDefined = (
  record: LooseRecord | null | undefined,
  keys: string[],
): unknown => {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }

  return undefined;
};

const toAttributeEntries = (value: unknown): VariantAttributeEntry[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const toMetadataRecord = (value: unknown): LooseRecord | null => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return parseJsonRecord(value);
  }

  return null;
};

export const parseImages = (rawImages: unknown): string[] =>
  normalizeProductImages(rawImages).map((image) => image.url);

const parseVariants = (rawVariants: unknown): ElessiProductVariant[] => {
  if (!rawVariants) {
    return [];
  }

  if (Array.isArray(rawVariants)) {
    return rawVariants.filter(Boolean) as ElessiProductVariant[];
  }

  if (isRecord(rawVariants)) {
    const container =
      rawVariants["variants"] ||
      rawVariants["items"] ||
      rawVariants["data"];

    if (Array.isArray(container)) {
      return container.filter(Boolean) as ElessiProductVariant[];
    }
  }

  if (typeof rawVariants === "string") {
    const parsed = parseJsonValue(rawVariants.trim());
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean) as ElessiProductVariant[];
    }
  }

  return [];
};

const formatCurrency = (value: number | undefined): string =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const normalizeDescription = (value?: string): string => {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const extractTags = (
  metadata: Record<string, unknown> | null | undefined,
): string[] => {
  if (!metadata) {
    return [];
  }

  const metaTags =
    metadata["tags"] || metadata["tagList"] || metadata["productTags"];

  if (Array.isArray(metaTags)) {
    return metaTags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof metaTags === "string") {
    return metaTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const extractAttributesFromMetadata = (
  metadata: LooseRecord | null | undefined,
): { colorOptions: string[]; sizeOptions: string[] } => {
  if (!metadata) {
    return { colorOptions: [], sizeOptions: [] };
  }

  let rawAttributes =
    metadata["attributes"] ??
    metadata["attributeValues"] ??
    metadata["options"] ??
    metadata["variants"];

  if (typeof rawAttributes === "string") {
    rawAttributes = parseJsonValue(rawAttributes);
  }

  if (!rawAttributes) {
    return { colorOptions: [], sizeOptions: [] };
  }

  const colorOptions = new Set<string>();
  const sizeOptions = new Set<string>();

  const pushOptions = (typeLabel: string, options: unknown) => {
    const normalizedType = String(typeLabel || "").toLowerCase();
    let list: string[] = [];

    if (Array.isArray(options)) {
      list = options.map((option) => String(option).trim()).filter(Boolean);
    } else if (typeof options === "string") {
      list = options
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);
    } else if (isRecord(options)) {
      const nested =
        options["options"] || options["values"] || options["items"];
      if (Array.isArray(nested)) {
        list = nested.map((option) => String(option).trim()).filter(Boolean);
      }
    }

    if (list.length === 0) {
      return;
    }

    if (
      normalizedType.includes("color") ||
      normalizedType.includes("colour") ||
      normalizedType.includes("لون")
    ) {
      list.forEach((option) => colorOptions.add(option));
    } else if (
      normalizedType.includes("size") ||
      normalizedType.includes("مقاس") ||
      normalizedType.includes("حجم")
    ) {
      list.forEach((option) => sizeOptions.add(option));
    }
  };

  if (Array.isArray(rawAttributes)) {
    toAttributeEntries(rawAttributes).forEach((attribute) => {
      const type = String(
        attribute["type"] ||
          attribute["name"] ||
          attribute["label"] ||
          attribute["key"] ||
          attribute["attribute"] ||
          "",
      );
      const options =
        attribute["options"] ||
        attribute["values"] ||
        attribute["items"] ||
        attribute["value"] ||
        attribute["list"];
      pushOptions(type, options);
    });
  } else if (isRecord(rawAttributes)) {
    Object.entries(rawAttributes).forEach(([key, value]) => {
      pushOptions(key, value);
    });
  }

  if (metadata["colors"] || metadata["colours"]) {
    pushOptions("color", metadata["colors"] || metadata["colours"]);
  }

  if (metadata["sizes"] || metadata["sizeOptions"] || metadata["size"]) {
    pushOptions(
      "size",
      metadata["sizes"] || metadata["sizeOptions"] || metadata["size"],
    );
  }

  return {
    colorOptions: Array.from(colorOptions),
    sizeOptions: Array.from(sizeOptions),
  };
};

const normalizeVariantType = (value?: string): string =>
  String(value || "").trim().toLowerCase();

const isColorType = (value?: string): boolean => {
  const normalized = normalizeVariantType(value);
  return (
    normalized.includes("color") ||
    normalized.includes("colour") ||
    normalized.includes("لون")
  );
};

const isSizeType = (value?: string): boolean => {
  const normalized = normalizeVariantType(value);
  return (
    normalized.includes("size") ||
    normalized.includes("مقاس") ||
    normalized.includes("حجم")
  );
};

const parseVariantAttributes = (
  variant: ElessiProductVariant,
): { color?: string; size?: string } => {
  const attributeBucket =
    variant.attributeValues ||
    variant.attributes ||
    variant.options ||
    variant.optionValues;

  const readFromArray = (
    items: VariantAttributeEntry[],
  ): { color?: string; size?: string } => {
    let color: string | undefined;
    let size: string | undefined;

    items.forEach((item) => {
      const key = String(
        item["type"] || item["name"] || item["key"] || item["label"] || "",
      ).toLowerCase();
      const rawValue =
        item["value"] ||
        item["option"] ||
        item["label"] ||
        item["name"] ||
        item["title"];
      const value = rawValue ? String(rawValue).trim() : "";

      if (!value) {
        return;
      }

      if (isColorType(key)) color = value;
      if (isSizeType(key)) size = value;
    });

    return { color, size };
  };

  if (attributeBucket) {
    if (Array.isArray(attributeBucket)) {
      const parsed = readFromArray(toAttributeEntries(attributeBucket));
      if (parsed.color || parsed.size) {
        return parsed;
      }
    }

    const bucketRecord = isRecord(attributeBucket) ? attributeBucket : null;
    if (bucketRecord) {
      const colorValue = getFirstDefined(bucketRecord, [
        "color",
        "Color",
        "اللون",
      ]);
      const sizeValue = getFirstDefined(bucketRecord, [
        "size",
        "Size",
        "المقاس",
      ]);
      if (colorValue || sizeValue) {
        return {
          color: colorValue ? String(colorValue) : undefined,
          size: sizeValue ? String(sizeValue) : undefined,
        };
      }
    }
  }

  const metadataRecord = toMetadataRecord(variant.metadata);
  if (metadataRecord) {
    const metadataAttributes =
      metadataRecord["attributeValues"] ||
      metadataRecord["attributes"] ||
      metadataRecord["options"] ||
      metadataRecord["optionValues"];

    if (Array.isArray(metadataAttributes)) {
      const parsed = readFromArray(toAttributeEntries(metadataAttributes));
      if (parsed.color || parsed.size) {
        return parsed;
      }
    }

    const metadataAttributesRecord = isRecord(metadataAttributes)
      ? metadataAttributes
      : null;
    if (metadataAttributesRecord) {
      const colorValue = getFirstDefined(metadataAttributesRecord, [
        "color",
        "Color",
        "اللون",
      ]);
      const sizeValue = getFirstDefined(metadataAttributesRecord, [
        "size",
        "Size",
        "المقاس",
      ]);

      if (colorValue || sizeValue) {
        return {
          color: colorValue ? String(colorValue) : undefined,
          size: sizeValue ? String(sizeValue) : undefined,
        };
      }
    }

    if (metadataRecord["color"] || metadataRecord["size"]) {
      return {
        color: metadataRecord["color"]
          ? String(metadataRecord["color"])
          : undefined,
        size: metadataRecord["size"]
          ? String(metadataRecord["size"])
          : undefined,
      };
    }
  }

  if (variant.color || variant.size) {
    return {
      color: variant.color ? String(variant.color) : undefined,
      size: variant.size ? String(variant.size) : undefined,
    };
  }

  const name = String(variant.name || "").trim();
  if (name.includes("|")) {
    const parts = name.split("|").map((part) => part.trim());
    const colorPart = parts.find((part) => part.includes("لون"));
    const sizePart = parts.find((part) => part.includes("مقاس"));
    return {
      color: colorPart ? colorPart.split(":").pop()?.trim() : undefined,
      size: sizePart ? sizePart.split(":").pop()?.trim() : undefined,
    };
  }

  const dashParts = name.split(/\s*[-–]\s*/);
  if (dashParts.length >= 2) {
    return {
      color: dashParts[0]?.trim(),
      size: dashParts[1]?.trim(),
    };
  }

  if (isColorType(variant.type)) {
    return { color: name };
  }

  if (isSizeType(variant.type)) {
    return { size: name };
  }

  return {};
};

export interface UseElessiProductDetailsResult {
  product: ElessiProductPayload | null;
  loading: boolean;
  galleryImage: string;
  priceLabel: string;
  currentPrice: number;
  description: string;
  specifications: string;
  sizeGuide?: string;
  colorLabel: string;
  colorOptions: ElessiColorOption[];
  selectedColorId: string | null;
  sizeLabel: string;
  sizeOptions: ElessiSizeOption[];
  selectedSizeId: string | null;
  selectedVariantId: string | null;
  quantity: number;
  canDecrease: boolean;
  canIncrease: boolean;
  addingToCart: boolean;
  sku: string;
  category: string;
  tags: string[];
  setSelectedColorId: (id: string) => void;
  setSelectedSizeId: (id: string) => void;
  decrementQuantity: () => void;
  incrementQuantity: () => void;
  addToCart: () => Promise<boolean>;
  buyNow: () => Promise<void>;
}

export const useElessiProductDetails = (
  productId?: string,
): UseElessiProductDetailsResult => {
  const navigate = useNavigate();
  const [product, setProduct] = useState<ElessiProductPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setProduct(null);
      return;
    }

    let mounted = true;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await storefrontApi.getProduct(productId);
        if (!mounted) {
          return;
        }

        if (response?.success && response.data) {
          setProduct(response.data as ElessiProductPayload);
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
        if (mounted) {
          setProduct(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      mounted = false;
    };
  }, [productId]);

  const resolvedVariants = useMemo(() => {
    if (!product) {
      return [] as ElessiProductVariant[];
    }

    return parseVariants(
      product.variants ||
        product.productVariants ||
        product["variantOptions"] ||
        product["variantValues"] ||
        product["options"],
    );
  }, [product]);

  const colorVariants = useMemo(
    () => resolvedVariants.filter((variant) => isColorType(variant.type)),
    [resolvedVariants],
  );

  const sizeVariants = useMemo(
    () => resolvedVariants.filter((variant) => isSizeType(variant.type)),
    [resolvedVariants],
  );

  const metadataAttributes = useMemo(() => {
    const metadata = toMetadataRecord(product?.metadata);
    const mergedMetadata: LooseRecord = {
      ...(metadata || {}),
      attributes:
        metadata?.["attributes"] ??
        product?.["attributes"] ??
        product?.["options"] ??
        product?.["variantAttributes"] ??
        product?.["variantOptions"],
    };

    return extractAttributesFromMetadata(mergedMetadata);
  }, [product]);

  const variantAttributeMap = useMemo(
    () =>
      resolvedVariants.map((variant) => ({
        id: variant.id,
        attributes: parseVariantAttributes(variant),
      })),
    [resolvedVariants],
  );

  const attributeColors = useMemo(() => {
    const values = new Set<string>();
    variantAttributeMap.forEach((entry) => {
      if (entry.attributes.color) {
        values.add(entry.attributes.color);
      }
    });
    metadataAttributes.colorOptions.forEach((option) => values.add(option));
    return Array.from(values);
  }, [metadataAttributes.colorOptions, variantAttributeMap]);

  const attributeSizes = useMemo(() => {
    const values = new Set<string>();
    variantAttributeMap.forEach((entry) => {
      if (entry.attributes.size) {
        values.add(entry.attributes.size);
      }
    });
    metadataAttributes.sizeOptions.forEach((option) => values.add(option));
    return Array.from(values);
  }, [metadataAttributes.sizeOptions, variantAttributeMap]);

  const hasCompositeAttributes = useMemo(
    () =>
      variantAttributeMap.some(
        (entry) => entry.attributes.color && entry.attributes.size,
      ),
    [variantAttributeMap],
  );

  const useAttributeSelections =
    hasCompositeAttributes ||
    (attributeColors.length > 0 && attributeSizes.length === 0) ||
    (attributeSizes.length > 0 && attributeColors.length === 0);
  const hasVariants = resolvedVariants.length > 0;

  useEffect(() => {
    if (useAttributeSelections) {
      if (!selectedColorId && attributeColors.length > 0) {
        setSelectedColorId(attributeColors[0] || null);
      }
      return;
    }

    if (!selectedSizeId && sizeVariants.length > 0) {
      const firstId = sizeVariants[0]?.id;
      if (firstId) {
        setSelectedSizeId(firstId);
      }
      return;
    }

    if (!selectedColorId && colorVariants.length > 0) {
      const firstId = colorVariants[0]?.id;
      if (firstId) {
        setSelectedColorId(firstId);
      }
      return;
    }

    if (!selectedSizeId && hasVariants) {
      setSelectedSizeId(resolvedVariants[0]?.id ?? null);
    }
  }, [
    attributeColors,
    colorVariants,
    hasVariants,
    resolvedVariants,
    selectedColorId,
    selectedSizeId,
    sizeVariants,
    useAttributeSelections,
  ]);

  useEffect(() => {
    if (!useAttributeSelections) {
      return;
    }

    if (!selectedSizeId && attributeSizes.length > 0) {
      const firstSize = attributeSizes[0];
      if (firstSize) {
        setSelectedSizeId(firstSize);
      }
    }
  }, [attributeSizes, selectedSizeId, useAttributeSelections]);

  const colorOptions = useMemo<ElessiColorOption[]>(() => {
    if (useAttributeSelections && attributeColors.length > 0) {
      return attributeColors.map((value, index) => {
        const fallback = elessiColors[index % elessiColors.length];
        return {
          id: value,
          label: value || "",
          className: fallback?.className || "",
        };
      });
    }

    if (colorVariants.length > 0) {
      return colorVariants.map((variant, index) => {
        const fallback = elessiColors[index % elessiColors.length];
        return {
          id: variant.id,
          label: variant.name || "",
          className: fallback?.className || "",
        };
      });
    }

    return [];
  }, [attributeColors, colorVariants, useAttributeSelections]);

  const sizeOptions = useMemo<ElessiSizeOption[]>(() => {
    if (useAttributeSelections && attributeSizes.length > 0) {
      return attributeSizes.map((size) => ({ id: size, label: size || "" }));
    }

    if (sizeVariants.length > 0) {
      return sizeVariants.map((variant) => ({
        id: variant.id,
        label: variant.name || "",
      }));
    }

    if (hasVariants) {
      return resolvedVariants.map((variant) => ({
        id: variant.id,
        label: variant.name || "",
      }));
    }

    return [];
  }, [
    attributeSizes,
    hasVariants,
    resolvedVariants,
    sizeVariants,
    useAttributeSelections,
  ]);

  const selectedColorLabel = useMemo(() => {
    const selected = colorOptions.find((option) => option.id === selectedColorId);
    return selected?.label || "";
  }, [colorOptions, selectedColorId]);

  const selectedSizeLabel = useMemo(() => {
    const selected = sizeOptions.find((option) => option.id === selectedSizeId);
    return selected?.label || "";
  }, [sizeOptions, selectedSizeId]);

  const selectedVariant = useMemo(() => {
    if (!resolvedVariants.length) {
      return null;
    }

    if (useAttributeSelections) {
      return (
        resolvedVariants.find((variant) => {
          const attributes = parseVariantAttributes(variant);
          const colorMatch = attributeColors.length
            ? attributes.color === selectedColorId
            : true;
          const sizeMatch = attributeSizes.length
            ? attributes.size === selectedSizeId
            : true;
          return colorMatch && sizeMatch;
        }) || null
      );
    }

    if (selectedSizeId) {
      return (
        resolvedVariants.find((variant) => variant.id === selectedSizeId) ||
        null
      );
    }

    if (selectedColorId) {
      return (
        resolvedVariants.find((variant) => variant.id === selectedColorId) ||
        null
      );
    }

    return null;
  }, [
    attributeColors,
    attributeSizes,
    resolvedVariants,
    selectedColorId,
    selectedSizeId,
    useAttributeSelections,
  ]);

  const galleryImages = useMemo(() => {
    const variantImages = parseImages(
      selectedVariant?.images || selectedVariant?.image,
    );
    if (variantImages.length > 0) {
      return variantImages;
    }

    const baseImages = parseImages(product?.images);
    if (baseImages.length > 0) {
      return baseImages;
    }

    return [elessiProductFallback.image.src];
  }, [product?.images, selectedVariant]);

  const currentPrice = Number(
    selectedVariant?.price ?? product?.price ?? elessiProductFallback.price,
  );
  const priceLabel = formatCurrency(currentPrice);
  const description =
    normalizeDescription(product?.description) ||
    elessiProductFallback.description;
  const specifications = normalizeDescription(product?.specifications || "");
  const sku = product?.sku || elessiProductFallback.meta.sku;
  const category =
    product?.categories && product.categories.length > 0
      ? product.categories[0]?.name || elessiProductFallback.meta.category
      : elessiProductFallback.meta.category;

  const tags = useMemo(() => {
    if (!product) {
      return elessiProductTagsFallback;
    }

    const extracted = extractTags(toMetadataRecord(product.metadata));
    return extracted.length ? extracted : elessiProductTagsFallback;
  }, [product]);

  const maxQuantity = useMemo(() => {
    const stock = Number(selectedVariant?.stock ?? product?.stock ?? 99);
    const trackInventory = selectedVariant?.trackInventory !== false;

    if (!trackInventory) {
      return 99;
    }

    if (!Number.isFinite(stock) || stock <= 0) {
      return 1;
    }

    return Math.min(99, stock);
  }, [product?.stock, selectedVariant?.stock, selectedVariant?.trackInventory]);

  useEffect(() => {
    if (quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  }, [maxQuantity, quantity]);

  const canDecrease = quantity > 1;
  const canIncrease = quantity < maxQuantity;

  const addToCart = useCallback(async (): Promise<boolean> => {
    if (!product || addingToCart) {
      return false;
    }

    const needsVariantSelection = hasVariants && !selectedVariant?.id;
    if (needsVariantSelection) {
      toast.error("يرجى اختيار اللون أو المقاس أولًا");
      return false;
    }

    setAddingToCart(true);

    try {
      const response = await storefrontApi.addToCart({
        productId: product.id,
        quantity,
        ...(selectedVariant?.id ? { variantId: selectedVariant.id } : {}),
      });

      if (!response?.success) {
        toast.error(response?.message || "تعذر إضافة المنتج للسلة");
        return false;
      }

      if (response.data?.cartId) {
        localStorage.setItem("cart_session_id", response.data.cartId);
      }

      window.dispatchEvent(new Event("cartUpdated"));
      toast.success("تمت إضافة المنتج للسلة");
      return true;
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("تعذر إضافة المنتج للسلة");
      return false;
    } finally {
      setAddingToCart(false);
    }
  }, [addingToCart, hasVariants, product, quantity, selectedVariant?.id]);

  const buyNow = useCallback(async () => {
    const added = await addToCart();
    if (!added) {
      return;
    }

    navigate(`/shop/checkout${window.location.search || ""}`);
  }, [addToCart, navigate]);

  return {
    product,
    loading,
    galleryImage: galleryImages[0] || elessiProductFallback.image.src,
    priceLabel,
    currentPrice,
    description,
    specifications,
    sizeGuide: product?.sizeGuide,
    colorLabel: colorOptions.length > 0 ? selectedColorLabel : "",
    colorOptions,
    selectedColorId,
    sizeLabel: sizeOptions.length > 0 ? selectedSizeLabel : "",
    sizeOptions,
    selectedSizeId,
    selectedVariantId: selectedVariant?.id || null,
    quantity,
    canDecrease,
    canIncrease,
    addingToCart,
    sku,
    category,
    tags,
    setSelectedColorId,
    setSelectedSizeId,
    decrementQuantity: () => setQuantity((prev) => Math.max(1, prev - 1)),
    incrementQuantity: () =>
      setQuantity((prev) => Math.min(maxQuantity, prev + 1)),
    addToCart,
    buyNow,
  };
};
