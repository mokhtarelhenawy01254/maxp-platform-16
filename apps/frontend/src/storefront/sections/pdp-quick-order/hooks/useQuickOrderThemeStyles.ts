import { formatStorefrontCurrency } from '../../../utils/currency';
import { inputClassName } from '../quickOrderHelpers';

export const useQuickOrderThemeStyles = ({
  theme,
  sectionSettings,
  configuredFormVariant,
  configuredSurfaceMode,
  configuredTitle,
  configuredSubtitle,
  configuredBadgeText,
  configuredAddToCartButtonText,
  configuredSubmitButtonText,
  configuredShippingSummaryValueText,
  configuredShowAddToCartButton,
  configuredEmptyStateText,
  configuredDecisionMode,
  isOutOfStock,
  paymentMethod,
  total,
  currency,
  minimumOrder,
  activeQuantityOffer,
  isSelectionReady,
  attributeSummary,
  prefersArabicCopy,
}: {
  theme: any;
  sectionSettings: any;
  configuredFormVariant: string;
  configuredSurfaceMode: string;
  configuredTitle: string;
  configuredSubtitle: string;
  configuredBadgeText: string;
  configuredAddToCartButtonText: string;
  configuredSubmitButtonText: string;
  configuredShippingSummaryValueText: string;
  configuredShowAddToCartButton: boolean | null;
  configuredEmptyStateText: string;
  configuredDecisionMode: string;
  isOutOfStock: boolean;
  paymentMethod: string;
  total: number;
  currency: string;
  minimumOrder: any;
  activeQuantityOffer: any;
  isSelectionReady: boolean;
  attributeSummary: string;
  prefersArabicCopy: boolean;
}) => {
  const isRedlineAutoQuickOrder =
    theme.id === 'redline-auto' || configuredFormVariant === 'redline-auto';
  const isSoleaFemmeQuickOrder =
    (theme.id === 'solea-femme' || configuredFormVariant === 'solea-femme') &&
    !isRedlineAutoQuickOrder;
  const isMenShoesQuickOrder =
    (theme.id === 'men-shoes-eg' ||
      theme.id === 'women-fashion-eg' ||
      isSoleaFemmeQuickOrder ||
      configuredFormVariant === 'men-shoes-eg' ||
      configuredFormVariant === 'women-fashion-eg') &&
    !isRedlineAutoQuickOrder;
  const isWomenFashionQuickOrder =
    (theme.id === 'women-fashion-eg' ||
      configuredFormVariant === 'women-fashion-eg') &&
    !isRedlineAutoQuickOrder;
  const isKhemetLuxeQuickOrder =
    (theme.id === 'khemet-luxe-eg' ||
      configuredFormVariant === 'khemet-luxe-eg') &&
    !isRedlineAutoQuickOrder;
  const isVelaFashionQuickOrder =
    (theme.id === 'vela-fashion-eg' ||
      configuredFormVariant === 'vela-fashion-eg') &&
    !isRedlineAutoQuickOrder;
  const isMarketplaceQuickOrder =
    (Boolean(theme.id && theme.id.includes('marketplace-avenue')) ||
      configuredFormVariant === 'marketplace-bazaar') &&
    !isRedlineAutoQuickOrder;
  const isMergedBuyboxSurface = configuredSurfaceMode === 'merged-buybox';
  const isKhemetMergedBuyboxQuickOrder =
    isKhemetLuxeQuickOrder && isMergedBuyboxSurface;
  const isPrimaryQuantityOfferDecision = configuredDecisionMode === 'primary';
  const isWomenMergedBuyboxQuickOrder =
    isWomenFashionQuickOrder && isMergedBuyboxSurface;
  const isSoleaMergedBuyboxQuickOrder =
    isSoleaFemmeQuickOrder && isMergedBuyboxSurface;
  const isCompactMergedQuickOrder =
    isWomenMergedBuyboxQuickOrder || isKhemetMergedBuyboxQuickOrder;

  const showAttributeSummary =
    Boolean(attributeSummary) &&
    !isMenShoesQuickOrder &&
    !isVelaFashionQuickOrder &&
    !isKhemetLuxeQuickOrder;

  const title =
    isRedlineAutoQuickOrder
      ? configuredTitle ||
        (prefersArabicCopy
          ? 'بيانات الشحن وتأكيد الطلب'
          : 'Shipping & Order Confirmation')
      : isKhemetMergedBuyboxQuickOrder
      ? prefersArabicCopy
        ? 'أكملي بياناتك وسنأكد طلبك'
        : "Add your details & we'll confirm"
      : configuredTitle ||
    (isSoleaFemmeQuickOrder
      ? prefersArabicCopy
        ? 'احسمي الطلب من هنا'
        : 'Complete your order here'
      : isKhemetLuxeQuickOrder
      ? prefersArabicCopy
        ? 'كمّلي بيانات الطلب'
        : 'Complete your order'
      : isMenShoesQuickOrder
      ? prefersArabicCopy
        ? 'بيانات الطلب'
        : 'Order details'
      : isMarketplaceQuickOrder
      ? configuredTitle || (prefersArabicCopy ? 'الطلب السريع المباشر' : 'Direct Quick Order')
      : isVelaFashionQuickOrder
        ? prefersArabicCopy
          ? 'أكملي الطلب الآن'
          : 'Complete your order now'
      : prefersArabicCopy
        ? 'يرجى إدخال معلوماتك لإكمال الطلب'
        : 'Please enter your details to complete the order');

  const subtitle =
    isRedlineAutoQuickOrder
      ? configuredSubtitle ||
        (prefersArabicCopy
          ? 'استلم وجرب الستارة على حلق باب عربيتك وتأكد من المقاس الفابريقة قبل دفع أي قرش.'
          : 'Inspect on your car door frame before paying.')
      : isKhemetMergedBuyboxQuickOrder
      ? ''
      : configuredSubtitle ||
    (isSoleaFemmeQuickOrder
      ? prefersArabicCopy
        ? 'بعد اختيار المقاس أو العرض، اتركي بياناتك وسنؤكد الطلب معك بسرعة.'
        : 'Choose the size or offer, then leave your details and we will confirm the order.'
      : isKhemetLuxeQuickOrder
      ? prefersArabicCopy
        ? 'اختاري اللون والمقاس الأول، وبعدها سيبي بياناتك وسنأكد معاكي الطلب.'
        : 'Choose the color and size first, then leave your details and we will confirm the order.'
      : isMarketplaceQuickOrder
      ? prefersArabicCopy
        ? 'أدخل بيانات الاستلام وسنتواصل معك لتأكيد وشحن طلبك فوراً.'
        : 'Enter your delivery details and we will confirm and ship your order immediately.'
      : isMenShoesQuickOrder
      ? ''
      : '');

  const quantityLabel = isVelaFashionQuickOrder
      ? prefersArabicCopy
        ? 'الكمية'
        : 'Quantity'
    : prefersArabicCopy
      ? 'عدد القطع'
      : 'Quantity';
  const fullNameLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? 'الاسم بالكامل' : 'Full Name'
    : isMenShoesQuickOrder || isVelaFashionQuickOrder || isKhemetLuxeQuickOrder
    ? prefersArabicCopy
      ? 'الاسم'
      : 'Name'
    : prefersArabicCopy
      ? 'الاسم بالكامل'
      : 'Full name';
  const phoneLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? 'رقم الموبايل (للتواصل والشحن)' : 'Mobile Phone'
    : prefersArabicCopy ? 'رقم الهاتف' : 'Phone number';
  const governorateLabel = prefersArabicCopy ? 'المحافظة' : 'Governorate';
  const addressLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? 'عنوان التوصيل بالتفصيل (المحافظة / المركز / الشارع)' : 'Detailed Address'
    : isMenShoesQuickOrder || isKhemetLuxeQuickOrder
    ? prefersArabicCopy
      ? 'العنوان'
      : 'Address'
    : prefersArabicCopy
      ? 'العنوان بالتفصيل'
      : 'Detailed address';
  const alternatePhoneLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? 'رقم موبايل بديل (اختياري)' : 'Alternate Phone (Optional)'
    : prefersArabicCopy
    ? 'رقم هاتف بديل'
    : 'Alternate phone';
  const shippingLabel = prefersArabicCopy ? 'تكلفة الشحن' : 'Shipping';
  const totalLabel = prefersArabicCopy ? 'الإجمالي' : 'Total';

  const addToCartLabel = isOutOfStock
    ? (prefersArabicCopy ? 'نفدت الكمية' : 'Out of stock')
    : configuredAddToCartButtonText ||
      (isSoleaFemmeQuickOrder && prefersArabicCopy
        ? 'أضيفي للسلة'
        : prefersArabicCopy
          ? 'أضف للسلة'
          : 'Add to cart');

  const submitLabel = isOutOfStock
    ? (prefersArabicCopy ? 'نفدت الكمية' : 'Out of stock')
    : paymentMethod === 'card'
      ? (prefersArabicCopy
          ? `متابعة للدفع بالبطاقة 💳 (${formatStorefrontCurrency(total, currency)})`
          : `Proceed to Card Payment 💳 (${formatStorefrontCurrency(total, currency)})`)
      : configuredSubmitButtonText ||
        (isSoleaFemmeQuickOrder && prefersArabicCopy
          ? 'تأكيد الطلب'
          : isKhemetLuxeQuickOrder && prefersArabicCopy
            ? 'تأكيد الطلب'
          : isMarketplaceQuickOrder && prefersArabicCopy
            ? 'تأكيد الطلب الآن'
          : prefersArabicCopy
            ? 'اشتر الآن'
            : 'Buy now');

  const minimumOrderSubmitLabel = isOutOfStock
    ? (prefersArabicCopy ? 'نفدت الكمية' : 'Out of stock')
    : minimumOrder.blocked
      ? `${prefersArabicCopy ? 'متبقي' : 'Remaining'} ${formatStorefrontCurrency(
          minimumOrder.remaining,
          currency,
        )}`
      : submitLabel;

  const showAddToCartButton =
    configuredShowAddToCartButton === null
      ? !isPrimaryQuantityOfferDecision
      : configuredShowAddToCartButton;

  const staticShippingValueText =
    configuredShippingSummaryValueText ||
    (prefersArabicCopy ? 'شحن مجاني' : 'Free shipping');

  const selectionHint = !isSelectionReady
    ? activeQuantityOffer
      ? prefersArabicCopy
        ? isSoleaFemmeQuickOrder
          ? 'اختاري العرض وحددي اللون أو المقاس لكل قطعة أولًا، ثم أكملي بيانات الطلب هنا.'
          : 'أكمل اختيار اللون والمقاس لكل قطعة داخل العرض أولًا، ثم أكمل الطلب هنا.'
        : 'Complete the color and size selection for each item inside the offer first, then continue here.'
      : configuredEmptyStateText ||
        (prefersArabicCopy
          ? isSoleaFemmeQuickOrder
              ? 'اختاري المقاس أو اللون من أعلى أولًا، ثم أكملي الطلب من هنا.'
              : isKhemetLuxeQuickOrder
                ? 'اختاري اللون والمقاس الأول، وبعدها كمّلي بيانات الطلب من هنا.'
              : isVelaFashionQuickOrder
                ? 'اختاري اللون أو المقاس من أعلى، ثم أكملي الطلب من هنا.'
                : 'اختر اللون أو المقاس من خيارات المنتج بالأعلى أولًا، ثم أكمل الطلب هنا.'
          : 'Choose the color or size from the product options above first, then complete the form here.')
    : null;

  const shouldCollapseFormUntilSelectionReady =
    isPrimaryQuantityOfferDecision && !isSelectionReady;
  const quantityOfferSummaryTitle = prefersArabicCopy
    ? 'العرض المحدد الآن'
    : 'Current quantity offer';
  const quantityOfferSummaryHelper = prefersArabicCopy
    ? activeQuantityOffer?.isReady
      ? 'سيُنفذ الطلب مباشرة على هذا العرض.'
      : 'أكملي اختيار كل قطعة ثم أدخلي بياناتك.'
    : activeQuantityOffer?.isReady
      ? 'This order will use the selected offer directly.'
      : 'Complete each bundle selection, then add your details.';
  const shouldShowQuantityOfferSummaryHelper =
    Boolean(activeQuantityOffer) && !activeQuantityOffer?.isReady;
  const shouldShowQuantityOfferSummary =
    Boolean(activeQuantityOffer) &&
    !(isVelaFashionQuickOrder && activeQuantityOffer?.offerQuantity === 1);

  const shellClassName = isRedlineAutoQuickOrder
    ? isMergedBuyboxSurface
      ? 'space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/10'
      : 'space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/10'
    : isSoleaFemmeQuickOrder
    ? isSoleaMergedBuyboxQuickOrder
      ? 'border-t border-[#ead8cf] pt-3.5'
      : 'rounded-[1.6rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f3_100%)] p-4 shadow-[0_24px_60px_-52px_rgba(47,35,45,0.2)] sm:p-5'
    : isKhemetLuxeQuickOrder
    ? isKhemetMergedBuyboxQuickOrder
      ? 'pt-0'
      : 'rounded-[1.6rem] border border-[#eadfd9] bg-[#fffdfb] p-4 shadow-[0_24px_64px_-56px_rgba(54,36,27,0.16)] sm:p-5'
    : isMenShoesQuickOrder
    ? isWomenMergedBuyboxQuickOrder
      ? 'border-t border-[#f0d7d2] pt-3'
      : isMergedBuyboxSurface
      ? 'border-t border-[#e5eadf] pt-4'
      : 'rounded-[1.55rem] border border-[#d8dfd2] bg-white/95 p-4 shadow-[0_20px_56px_-52px_rgba(17,24,39,0.18)]'
    : isVelaFashionQuickOrder
      ? 'rounded-[1.45rem] border border-[#efd9df] bg-[linear-gradient(180deg,#fffefe_0%,#fff7f9_100%)] p-4 shadow-[0_20px_60px_-52px_rgba(176,125,139,0.18)] sm:p-5'
    : isMarketplaceQuickOrder && isMergedBuyboxSurface
      ? 'space-y-4'
    : 'rounded-[1.85rem] border border-border/70 bg-background p-5 shadow-[0_34px_100px_-78px_rgba(15,23,42,0.38)] sm:p-6';

  const quantitySurfaceClassName = isRedlineAutoQuickOrder
    ? 'flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/40'
    : isSoleaFemmeQuickOrder
    ? 'flex items-center justify-between gap-3 rounded-[1rem] border border-[#ead8cf] bg-[#fffaf5] px-3 py-2.5'
    : isKhemetMergedBuyboxQuickOrder
    ? 'hidden items-center justify-between gap-3 rounded-[1rem] border border-[#eadfd9] bg-[#fffaf6] px-3 py-2.5 sm:flex'
    : isKhemetLuxeQuickOrder
    ? 'flex items-center justify-between gap-3 rounded-[1rem] border border-[#eadfd9] bg-[#fffaf6] px-3 py-2.5'
    : isMenShoesQuickOrder
    ? 'flex items-center justify-between gap-3 rounded-[1rem] border border-[#e5eadf] bg-[#fbfcfa] px-3 py-2.5'
    : isVelaFashionQuickOrder
      ? 'flex items-center justify-between gap-3 rounded-[1rem] border border-[#efd9df] bg-white px-4 py-3'
    : 'flex items-start justify-between gap-4 rounded-[1.15rem] border border-border/70 bg-secondary/15 px-4 py-4';

  const addToCartButtonClassName = isRedlineAutoQuickOrder
    ? 'min-h-[3.4rem] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
    : isSoleaFemmeQuickOrder
    ? 'min-h-[3.4rem] rounded-[1rem] border border-[#d8b28a] bg-white px-4 text-sm font-black text-[#6f5448] transition hover:border-[#2f232d]/20 hover:bg-[#fff8f1]'
    : isKhemetLuxeQuickOrder
    ? 'min-h-[3.4rem] rounded-[1rem] border border-[#d7c5b8] bg-white px-4 text-sm font-black text-[#4a352e] transition hover:border-[#1f4c3b]/15 hover:bg-[#fffaf6]'
    : isMenShoesQuickOrder
    ? 'min-h-[3.4rem] rounded-[1rem] border border-[#d8dfd2] bg-white px-4 text-sm font-black text-[#111111] transition hover:border-[#111111]/20 hover:bg-[#f6f7f4]'
    : isVelaFashionQuickOrder
      ? 'min-h-[3.4rem] rounded-[1rem] border border-[#d7b4bf] bg-white px-4 text-sm font-black text-[#7a5260] transition hover:bg-[#fff7fa]'
    : 'min-h-[3.65rem] rounded-[1.05rem] border border-border bg-background px-4 text-sm font-black text-foreground transition hover:border-primary/30 hover:text-primary';

  const submitButtonClassName = isRedlineAutoQuickOrder
    ? 'min-h-[3.6rem] w-full rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 bg-[length:200%_auto] px-5 py-3.5 text-sm sm:text-base font-black text-white shadow-[0_8px_25px_-5px_rgba(225,29,72,0.45)] transition-all hover:bg-[position:right_center] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2'
    : isSoleaFemmeQuickOrder
    ? 'min-h-[3.4rem] rounded-[1rem] bg-[#2f232d] px-4 text-sm font-black text-white transition hover:bg-[#241a22] disabled:cursor-not-allowed disabled:opacity-60'
    : isKhemetLuxeQuickOrder
    ? 'min-h-[3.5rem] rounded-[1rem] bg-[#1f4c3b] px-4 text-sm font-black text-[#fbf5ee] transition hover:bg-[#173a2d] disabled:cursor-not-allowed disabled:opacity-60'
    : isMenShoesQuickOrder
    ? 'min-h-[3.4rem] rounded-[1rem] bg-[#111111] px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
    : isVelaFashionQuickOrder
      ? 'min-h-[3.4rem] rounded-[1rem] border border-[#7a5260] bg-[#7a5260] px-4 text-sm font-black text-white transition hover:bg-[#946777] disabled:cursor-not-allowed disabled:opacity-60'
    : isMarketplaceQuickOrder
      ? 'min-h-[3.5rem] w-full rounded-full !bg-[#eb485b] hover:!bg-[#d93a4d] px-5 py-3.5 text-sm sm:text-base font-bold !text-white shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer border-0'
    : 'min-h-[3.65rem] rounded-[1.05rem] bg-black px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';

  const resolvedInputClassName = isRedlineAutoQuickOrder
    ? 'w-full rounded-xl border border-slate-300/80 bg-slate-50/50 px-3.5 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-red-500'
    : isSoleaMergedBuyboxQuickOrder
      ? 'w-full rounded-[0.95rem] border border-[#ead8cf] bg-white px-3.5 py-2.5 text-sm text-[#3f2432] outline-none transition focus:border-[#d8b28a] focus:ring-2 focus:ring-[#d8b28a]/15'
    : isKhemetMergedBuyboxQuickOrder
      ? 'w-full rounded-[0.95rem] border border-[#eadfd9] bg-white px-3.5 py-2.5 text-sm text-[#4a352e] outline-none transition focus:border-[#1f4c3b]/18 focus:ring-2 focus:ring-[#1f4c3b]/10'
    : isVelaFashionQuickOrder
      ? 'w-full rounded-[1rem] border border-[#efd9df] bg-white px-4 py-3 text-sm font-medium text-[#5f3f48] outline-none transition focus:border-[#b07d8b] focus:ring-2 focus:ring-[#b07d8b]/12'
    : isWomenMergedBuyboxQuickOrder
      ? 'w-full rounded-[0.95rem] border border-[#ead8cf] bg-white px-3.5 py-2.5 text-sm text-[#3f2432] outline-none transition focus:border-[#8b3d33]/35 focus:ring-2 focus:ring-[#8b3d33]/10'
    : isMarketplaceQuickOrder
      ? 'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 sm:py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-[#eb485b] focus:ring-2 focus:ring-[#eb485b]/15'
    : inputClassName;

  const fieldStackClassName = isRedlineAutoQuickOrder
    ? 'block space-y-1.5'
    : isWomenMergedBuyboxQuickOrder
    ? 'block space-y-1.5'
    : isKhemetMergedBuyboxQuickOrder
      ? 'block space-y-1.5'
    : 'block space-y-2';

  const fieldLabelClassName = isRedlineAutoQuickOrder
    ? 'text-[13px] font-bold text-slate-900 dark:text-slate-100'
    : isWomenMergedBuyboxQuickOrder || isKhemetMergedBuyboxQuickOrder
    ? 'text-[13px] font-semibold text-foreground'
    : 'text-sm font-semibold text-foreground';

  const contactFieldsGridClassName = isKhemetMergedBuyboxQuickOrder
    ? 'grid gap-3'
    : isCompactMergedQuickOrder
      ? 'grid grid-cols-2 gap-2.5'
      : 'space-y-4';

  const shouldEnableMobileStickySubmitBar =
    (isWomenMergedBuyboxQuickOrder ||
      isSoleaMergedBuyboxQuickOrder ||
      isRedlineAutoQuickOrder) &&
    !shouldCollapseFormUntilSelectionReady;

  return {
    isRedlineAutoQuickOrder,
    isSoleaFemmeQuickOrder,
    isMenShoesQuickOrder,
    isWomenFashionQuickOrder,
    isKhemetLuxeQuickOrder,
    isVelaFashionQuickOrder,
    isMergedBuyboxSurface,
    isKhemetMergedBuyboxQuickOrder,
    isSoleaMergedBuyboxQuickOrder,
    isCompactMergedQuickOrder,
    isPrimaryQuantityOfferDecision,
    showAttributeSummary,
    title,
    subtitle,
    quantityLabel,
    fullNameLabel,
    phoneLabel,
    governorateLabel,
    addressLabel,
    alternatePhoneLabel,
    shippingLabel,
    totalLabel,
    addToCartLabel,
    submitLabel,
    minimumOrderSubmitLabel,
    showAddToCartButton,
    staticShippingValueText,
    selectionHint,
    shouldCollapseFormUntilSelectionReady,
    quantityOfferSummaryTitle,
    quantityOfferSummaryHelper,
    shouldShowQuantityOfferSummaryHelper,
    shouldShowQuantityOfferSummary,
    shellClassName,
    quantitySurfaceClassName,
    addToCartButtonClassName,
    submitButtonClassName,
    resolvedInputClassName,
    fieldStackClassName,
    fieldLabelClassName,
    contactFieldsGridClassName,
    shouldEnableMobileStickySubmitBar,
  };
};
