export interface DuplicateGroupItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  mainImage: string | null;
  status: string | null;
  isActive: boolean;
  isHidden: boolean;
}

export interface DuplicateGroup {
  name: string;
  count: number;
  items: DuplicateGroupItem[];
}

export interface SelectedVariant {
  productId: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number | null;
  images: string[];
  include: boolean;
}

export const ORIGINALS_ACTIONS = [
  {
    value: "HIDE",
    label: "إخفاء الأصل (الاحتفاظ في سلة المحذوفات)",
    hint: "المنتج الأصلي يُخفى من الكتالوج ويبقى قابلاً للاسترجاع",
  },
  {
    value: "KEEP",
    label: "الاحتفاظ بالأصل كما هو",
    hint: "يظهر المنتج الأصلي والمنتج الجديد معاً في الكتالوج",
  },
  {
    value: "DELETE",
    label: "حذف الأصل نهائياً (خطير)",
    hint: "يُنقل كل الطلبات والعروض التقديمية والمخزون للمنتج الجديد ثم يُحذف الأصل نهائياً",
  },
] as const;
