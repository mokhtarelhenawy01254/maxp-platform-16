export interface PostPurchaseOfferProductVariant {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  sku?: string;
  stock?: number;
  options?: Record<string, string>;
}

export interface PostPurchaseOfferProduct {
  id: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  imageUrl?: string;
  mainImage?: string;
  images?: (string | { url: string })[];
  variants?: PostPurchaseOfferProductVariant[];
}

export interface PostPurchaseOfferConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  badgeText: string;
  productId: string;
  productName?: string;
  productImage?: string;
  originalPrice: number;
  discountType: 'percentage' | 'fixed_price';
  discountValue: number;
  offerPrice: number;
  freeShipping: boolean;
  timerMinutes: number;
  description: string;
  features: string[];
  acceptButtonText: string;
  declineButtonText: string;
  triggerCondition: 'all' | 'specific_products';
  triggerProductIds?: string[];
  product?: PostPurchaseOfferProduct;
}

export const DEFAULT_POST_PURCHASE_OFFER: PostPurchaseOfferConfig = {
  enabled: false,
  title: 'انتظر! لدينا عرض خاص وحصري لطلبك الآن',
  subtitle: 'وفر أكثر بإضافة هذا المنتج الحصري إلى شحنتك الحالية قبل تجهيزها',
  badgeText: 'عرض لمرة واحدة فقط',
  productId: '',
  productName: '',
  productImage: '',
  originalPrice: 0,
  discountType: 'percentage',
  discountValue: 30,
  offerPrice: 0,
  freeShipping: true,
  timerMinutes: 5,
  description: 'احصل على هذا العرض الحصري كإضافة مميزة لطلبك دون أي مصاريف شحن إضافية.',
  features: [
    'يُشحن مجانًا داخل نفس طرد طلبك الحالي',
    'خصم استثنائي لمرة واحدة لن يتكرر بعد إغلاق الصفحة',
    'الدفع عند الاستلام مع باقي محتويات الطلب',
    'ضمان الاستبدال والاسترجاع لمدة 14 يومًا'
  ],
  acceptButtonText: 'نعم! أضف هذا العرض إلى طلبي الآن',
  declineButtonText: 'لا شكراً، اكتفِ بطلبي الأصلي فقط',
  triggerCondition: 'all',
  triggerProductIds: []
};
