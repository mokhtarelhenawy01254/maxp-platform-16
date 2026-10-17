export interface ProductVariant {
  id: string;
  sku: string;
  price: number | string;
  stock: number;
  name: string;
  type?: string;
  color?: string;
  size?: string;
  image?: string;
  metadata?: string;
  attributeValues?: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  sku: string;
  variants: ProductVariant[];
}

export interface SimplifiedProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelected: (product: Product, variant?: ProductVariant) => void;
}

export interface ProductAttribute {
  name: string;
  values: string[];
}

// Helper function to parse variant metadata and extract attributeValues
export const parseVariantAttributes = (
  variant: ProductVariant,
): Record<string, string> => {
  if (
    variant.attributeValues &&
    Object.keys(variant.attributeValues).length > 0
  ) {
    return variant.attributeValues;
  }

  if (variant.metadata) {
    try {
      const metadata =
        typeof variant.metadata === "string"
          ? JSON.parse(variant.metadata)
          : variant.metadata;

      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        const attrs: Record<string, string> = {};
        metadata.attributes.forEach((attr: any) => {
          if (attr.type === "color") {
            attrs["اللون"] = attr.option;
          } else if (attr.type === "size") {
            attrs["المقاس"] = attr.option;
          } else if (attr.type === "material") {
            attrs["المادة"] = attr.option;
          } else if (attr.type === "style") {
            attrs["النمط"] = attr.option;
          } else if (attr.option) {
            const attrName = attr.name || "خاصية";
            attrs[attrName] = attr.option;
          }
        });

        if (Object.keys(attrs).length > 0) {
          return attrs;
        }
      }

      if (
        metadata.attributeValues &&
        Object.keys(metadata.attributeValues).length > 0
      ) {
        return metadata.attributeValues;
      }
    } catch {}
  }

  if (variant.color || variant.size) {
    const attrs: Record<string, string> = {};
    if (variant.color) attrs["اللون"] = variant.color;
    if (variant.size) attrs["المقاس"] = variant.size;
    return attrs;
  }

  if (variant.name) {
    const pipePattern = /([^:]+):\s*([^|]+)/g;
    const attrs: Record<string, string> = {};
    let match;

    while ((match = pipePattern.exec(variant.name)) !== null) {
      if (match[1] && match[2]) {
        const key = match[1].trim();
        const value = match[2].trim();
        attrs[key] = value;
      }
    }

    if (Object.keys(attrs).length > 0) {
      return attrs;
    }

    const parts = variant.name.split(/\s*[-–]\s*/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return {
        اللون: parts[0].trim(),
        المقاس: parts[1].trim(),
      };
    } else if (parts.length === 1 && parts[0] && variant.type) {
      const typeName =
        variant.type === "color"
          ? "اللون"
          : variant.type === "size"
            ? "المقاس"
            : variant.type;
      return { [typeName]: parts[0].trim() };
    }
  }

  return {};
};

// Helper function to extract unique attributes from variants
export const extractAttributes = (
  variants: ProductVariant[],
): ProductAttribute[] => {
  const attributeMap: Record<string, Set<string>> = {};

  variants.forEach((variant) => {
    const attrs = parseVariantAttributes(variant);
    Object.entries(attrs).forEach(([key, value]) => {
      if (!attributeMap[key]) attributeMap[key] = new Set();
      if (value) attributeMap[key].add(value);
    });
  });

  return Object.entries(attributeMap)
    .filter(([_, values]) => values.size > 0)
    .map(([name, values]) => ({
      name,
      values: Array.from(values).sort(),
    }));
};
