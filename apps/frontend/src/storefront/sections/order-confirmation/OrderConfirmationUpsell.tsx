import React from 'react';
import PostPurchaseUpsellBlock from '../../components/PostPurchaseUpsellBlock';
import type { OrderConfirmationSettings, PurchaseTrackingItem } from './types';

interface OrderConfirmationUpsellProps {
  showRecommended: boolean;
  resolvedOrderReference: string;
  purchaseItems: PurchaseTrackingItem[];
  settings?: OrderConfirmationSettings;
  prefersArabicCopy: boolean;
  isPcHub: boolean;
  isRoseBoutique: boolean;
}

export const OrderConfirmationUpsell: React.FC<OrderConfirmationUpsellProps> = ({
  showRecommended,
  resolvedOrderReference,
  purchaseItems,
  settings,
  prefersArabicCopy,
  isPcHub,
  isRoseBoutique,
}) => {
  if (!showRecommended) return null;

  const upsellSettings = {
    title:
      settings?.recommendedTitle ||
      (prefersArabicCopy ? 'ممكن يعجبك كمان' : 'You may also like'),
    subtitle:
      settings?.recommendedSubtitle ||
      (isPcHub
        ? prefersArabicCopy
          ? 'شاشات وملحقات وترقيات أقرب لنفس قرار الشراء لو حبيت تكمل الطلب من نفس الرحلة.'
          : 'Displays, add-ons, and upgrades that fit the same buying decision.'
        : isRoseBoutique
        ? prefersArabicCopy
          ? 'إكسسوارات وطبقات خفيفة قريبة من الطلب الحالي، لو حبيت تضيف لمسة أخيرة.'
          : 'Light layers and accessories that stay close to the same boutique mood.'
        : prefersArabicCopy
        ? 'إضافات مناسبة للطلب الحالي لو حبيت تزود حاجة خفيفة.'
        : 'Relevant add-ons that fit the order that was just created.'),
    limit: settings?.recommendedLimit || 4,
    badge:
      settings?.recommendedBadge ||
      (isPcHub
        ? prefersArabicCopy
          ? 'ترشيحات ما بعد الاعتماد'
          : 'Post-order picks'
        : isRoseBoutique
        ? prefersArabicCopy
          ? 'تنسيقات إضافية'
          : 'Styling add-ons'
        : prefersArabicCopy
        ? 'اقتراحات بعد الطلب'
        : 'Post-purchase upsell'),
    ctaLabel:
      settings?.recommendedCtaLabel ||
      (isPcHub
        ? prefersArabicCopy
          ? 'أضف بسرعة'
          : 'Quick add'
        : isRoseBoutique
        ? prefersArabicCopy
          ? 'أضف للسلة'
          : 'Add to cart'
        : prefersArabicCopy
        ? 'أضف للسلة'
        : 'Add to cart'),
    chooseOptionsLabel:
      settings?.recommendedChooseOptionsLabel ||
      (isPcHub
        ? prefersArabicCopy
          ? 'راجع الخيارات'
          : 'Review options'
        : isRoseBoutique
        ? prefersArabicCopy
          ? 'عرض التفاصيل'
          : 'View details'
        : prefersArabicCopy
        ? 'اختر الإضافات'
        : 'Choose options'),
    variantChoicesLabel:
      settings?.recommendedVariantChoicesLabel ||
      (isPcHub
        ? prefersArabicCopy
          ? 'خيارات الجهاز'
          : 'Device options'
        : prefersArabicCopy
        ? 'مقاسات متاحة'
        : 'Available sizes'),
    variant:
      settings?.recommendedVariant ||
      (isRoseBoutique ? 'boutique-afterglow' : 'standard'),
  };

  return (
    <div className="animate-in fade-in-0 border-t border-border/40 pt-20 duration-1000 delay-500">
      <PostPurchaseUpsellBlock
        orderReference={resolvedOrderReference}
        purchaseItems={purchaseItems}
        settings={upsellSettings}
      />
    </div>
  );
};

export default OrderConfirmationUpsell;
