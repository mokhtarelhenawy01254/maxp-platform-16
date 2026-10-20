import { ReviewDisplayConfig } from '../../../services/returnService';

export const typeCodeKey = (code: string): string => {
  switch (code) {
    case 'SENDER_PAYS':
      return '241';
    case 'RECIPIENT_PAYS':
      return '242';
    case 'CANCELLED':
      return '243';
    default:
      return '244';
  }
};

export const costModelKey = (model: string): string => {
  switch (model) {
    case 'FULL':
      return '245';
    case 'NONE':
      return '246';
    default:
      return '247';
  }
};

export const getOrderStatusFields = (t: (k: string) => string): {
  code: string;
  label: string;
}[] => [
  { code: 'PENDING', label: t('returns.k_1') },
  { code: 'CONFIRMED', label: t('returns.k_2') },
  { code: 'SCHEDULED', label: t('returns.k_3') },
  { code: 'PROCESSING', label: t('returns.k_4') },
  { code: 'SHIPPED', label: t('returns.k_5') },
  { code: 'DELIVERED', label: t('returns.k_6') },
  { code: 'CANCELLED', label: t('returns.k_7') },
  { code: 'RETURNED', label: t('returns.k_8') },
  { code: 'REFUNDED', label: t('returns.k_9') },
  { code: 'DUPLICATE_ORDER', label: t('returns.k_10') },
  { code: 'ON_HOLD', label: t('returns.k_11') },
  { code: 'PARTIALLY_DELIVERED', label: t('returns.k_12') },
];

export const getDisplayFields = (t: (k: string) => string): {
  key: keyof ReviewDisplayConfig;
  label: string;
  description: string;
  section: 'columns' | 'controls';
}[] => [
  {
    key: 'showOrderColumn',
    label: t('returns.k_47'),
    description: t('returns.k_48'),
    section: 'columns',
  },
  {
    key: 'showCustomerColumn',
    label: t('returns.k_49'),
    description: t('returns.k_50'),
    section: 'columns',
  },
  {
    key: 'showCustomerRating',
    label: t('returns.k_51'),
    description: t('returns.k_52'),
    section: 'columns',
  },
  {
    key: 'showCustomerSuccessScore',
    label: t('returns.k_53'),
    description: t('returns.k_54'),
    section: 'columns',
  },
  {
    key: 'showCustomerPhone',
    label: t('returns.k_55'),
    description: t('returns.k_56'),
    section: 'columns',
  },
  {
    key: 'showReasonColumn',
    label: t('returns.k_57'),
    description: t('returns.k_58'),
    section: 'columns',
  },
  {
    key: 'showResponsiblePartyColumn',
    label: t('returns.k_59'),
    description: t('returns.k_60'),
    section: 'columns',
  },
  {
    key: 'showReviewColumn',
    label: t('returns.k_63'),
    description: t('returns.k_64'),
    section: 'columns',
  },
  {
    key: 'showDateColumn',
    label: t('returns.k_65'),
    description: t('returns.k_66'),
    section: 'columns',
  },
  {
    key: 'showActionsColumn',
    label: t('returns.k_67'),
    description: t('returns.k_68'),
    section: 'columns',
  },
  {
    key: 'showFilterBar',
    label: t('returns.k_69'),
    description: t('returns.k_70'),
    section: 'controls',
  },
  {
    key: 'showCreateButton',
    label: t('returns.k_71'),
    description: t('returns.k_72'),
    section: 'controls',
  },
];

export const getDefaultData = (t: (k: string) => string) => [
  {
    name: t('returns.k_77'),
    defaultRole: 'STORE',
    reasons: [
      { reason: t('returns.k_78'), description: t('returns.k_79') },
      { reason: t('returns.k_80'), description: t('returns.k_81') },
    ],
  },
  {
    name: t('returns.k_82'),
    defaultRole: 'SHIPPING',
    reasons: [
      {
        reason: t('returns.k_83'),
        description: t('returns.k_84'),
      },
      {
        reason: t('returns.k_85'),
        description: t('returns.k_86'),
      },
    ],
  },
  {
    name: t('returns.k_87'),
    defaultRole: 'CUSTOMER',
    reasons: [
      { reason: t('returns.k_88'), description: t('returns.k_89') },
      { reason: t('returns.k_90'), description: t('returns.k_91') },
    ],
  },
  {
    name: 'أسباب رفض العميل (RTO)',
    defaultRole: 'CUSTOMER',
    reasons: [
      { reason: 'العميل غير موجود عند التسليم', description: 'لم يتم العثور على العميل في العنوان المحدد' },
      { reason: 'العنوان خطأ أو غير مكتمل', description: 'بيانات العنوان غير صحيحة أو ناقصة' },
      { reason: 'رفض السعر', description: 'العميل رفض السعر عند الاستلام' },
      { reason: 'طلب مكرر', description: 'العميل قام بطلب نفس المنتج من مكان آخر' },
      { reason: 'العميل غير رأيه', description: 'غير رأيه في الشراء' },
      { reason: 'تأخير في التوصيل', description: 'وصلت الشحنة متأخرة عن الموعد المتوقع' },
    ],
  },
];
