import type {
  DuplicateActionOption,
  DuplicateCriterionOption,
  DuplicateOrderSettingsData,
  StatusOption,
  TimeWindowPreset,
} from './types';

export const DEFAULT_SETTINGS: DuplicateOrderSettingsData = {
  enabled: true,
  criterion: 'phone',
  activeStatuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'ON_HOLD'],
  windowMinutes: null,
  action: 'record_visible',
  notifyTeam: true,
  compareStorefrontOrders: true,
  reportAs: 'duplicate',
  excludedPhones: [],

  // Legacy backwards compatibility defaults
  criteria: 'phone',
  windowEnabled: false,
  alertTeam: true,
  includeStoreOrders: true,
  reportTreatment: 'separate',
  exemptPhones: [],
};

export const AVAILABLE_STATUS_OPTIONS: StatusOption[] = [
  { code: 'PENDING', label: 'قيد الانتظار', dot: 'bg-amber-500' },
  { code: 'CONFIRMED', label: 'مؤكد', dot: 'bg-blue-500' },
  { code: 'PROCESSING', label: 'قيد التنفيذ', dot: 'bg-purple-500' },
  { code: 'READY', label: 'جاهز للشحن', dot: 'bg-emerald-500' },
  { code: 'SHIPPED', label: 'تم الشحن', dot: 'bg-cyan-500' },
  { code: 'ON_HOLD', label: 'معلق', dot: 'bg-orange-500' },
];

export const TIME_WINDOW_PRESETS: TimeWindowPreset[] = [
  { minutes: null, label: 'مقفولة' },
  { minutes: 60, label: 'ساعة' },
  { minutes: 360, label: '6 ساعات' },
  { minutes: 1440, label: '24 ساعة' },
  { minutes: 4320, label: '3 أيام' },
  { minutes: 10080, label: '7 أيام' },
];

export const CRITERION_OPTIONS: DuplicateCriterionOption[] = [
  {
    id: 'phone',
    title: 'رقم الموبايل (افتراضي)',
    desc: 'أي طلب نشط من نفس رقم الهاتف يُعتبر مكررًا',
  },
  {
    id: 'phone_amount',
    title: 'موبايل + نفس المبلغ',
    desc: 'نفس رقم الهاتف وتطابق إجمالي الطلب بالجنيه',
  },
  {
    id: 'phone_products',
    title: 'موبايل + نفس المنتجات',
    desc: 'نفس رقم الهاتف وتطابق تام لمجموعة معرفات المنتجات',
  },
];

export const CRITERIA_OPTIONS = CRITERION_OPTIONS;

export const ACTION_OPTIONS: DuplicateActionOption[] = [
  {
    id: 'record_visible',
    title: 'يسجّل ويبان للفريق (افتراضي)',
    desc: 'يُنشأ الطلب بحالة «طلب مكرر» ويظهر في قائمة الطلبات مع شارة تمييز واضحة للفريق',
  },
  {
    id: 'record_hidden',
    title: 'يسجّل ومخفي',
    desc: 'يُنشأ الطلب بحالة «طلب مكرر» ويُخفى من القائمة الافتراضية للطلبات (يمكن الوصول إليه عبر فلتر الحالة)',
  },
  {
    id: 'block',
    title: 'مايتسجلش خالص',
    desc: 'يتم رفض إنشاء الطلب فوراً وتنبيه العميل أو المستخدم برسالة واضحة دون حفظه في قاعدة البيانات',
  },
];
