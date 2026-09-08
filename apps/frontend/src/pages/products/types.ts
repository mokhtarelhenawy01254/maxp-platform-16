export type AffiliateProductVisibility = "ALL" | "HIDDEN" | "SELECTED";

export interface ProductFormData {
  name: string;
  description: string;
  slug?: string;
  price: number;
  comparePrice?: number | undefined;
  cost?: number | undefined;
  sku: string;
  category: string;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  isActive: boolean; // General active status
  enableCheckoutForm: boolean;
  showAddToCartButton: boolean;
  saleStartDate: string;
  saleEndDate: string;
  sizeGuide: string; // 📏 دليل المقاسات
  tags: string[];
  weight?: number | undefined;
  dimensions?: { length?: number; width?: number; height?: number } | undefined;
  // Advanced features
  isFeatured?: boolean;
  isHidden?: boolean; // Controls storefront visibility
  showFakeStock?: boolean;
  featuredPriority?: number;
  shippingClass?: string;
  excludeFromFreeShipping?: boolean;
  commissionType: string;
  affiliateCommission?: number;
  allowAffiliateMarkup: boolean;
  affiliateVisibility: AffiliateProductVisibility;
  affiliateVisibleAffiliateIds: string[];
  mainImage?: string;
  // Inventory extras
  allowBackorders?: boolean;
  barcode?: string;
  isPreOrder?: boolean;
  preOrderDate?: string;
  preOrderMessage?: string;
  externalUrl?: string;
  externalButtonLabel?: string;
  externalVendor?: string;
  externalDescription?: string;
  externalOnly?: boolean;
  // SEO fields
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
}

export interface Category {
  id: string;
  name: string;
}

// Product Attribute for generating variations
export interface ProductAttribute {
  id: string;
  name: string; // مثل: اللون، الحجم
  slug: string; // مثل: color, size
  values: string[]; // مثل: ["أحمر", "أزرق", "أخضر"]
  visible: boolean; // عرض في صفحة المنتج
  forVariations: boolean; // استخدام في المتغيرات
  requiredForOrder?: boolean; // يسأل عنه النظام عند إنشاء الأوردر
}

export interface ProductVariant {
  id?: string;
  name: string;
  type: string;
  sku: string;
  price?: number;
  comparePrice?: number;
  cost?: number;
  images: string[];
  stock: number;
  trackInventory: boolean;
  isActive: boolean;
  sortOrder: number;
  metadata?: any;
  // New fields
  image?: string; // صورة المتغير الرئيسية
  description?: string; // وصف المتغير
  weight?: number; // الوزن
  dimensions?: {
    // الأبعاد
    length?: number;
    width?: number;
    height?: number;
  };
  shippingClass?: string; // فئة الشحن
  allowBackorders?: boolean; // السماح بالطلبات المسبقة
  lowStockThreshold?: number; // حد المخزون المنخفض
  // Attribute values for this variant
  attributeValues?: { [key: string]: string }; // مثل: { color: "أحمر", size: "كبير" }
}

export type FieldErrors = Partial<
  Record<
    | "name"
    | "slug"
    | "category"
    | "price"
    | "comparePrice"
    | "saleEndDate"
    | "stock",
    string
  >
>;

export interface ProductVariantSettings {
  styles: {
    [key: string]: "buttons" | "circles" | "dropdown" | "thumbnails" | "radio";
  };
  attributeImages: {
    [attributeName: string]: {
      [valueName: string]: string;
    };
  };
  attributeColors?: {
    [attributeName: string]: {
      [valueName: string]: string;
    };
  };
}

