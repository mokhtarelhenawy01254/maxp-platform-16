import type { AxiosResponse } from "axios";

/**
 * واجهة دنيا للعميل API — مطابقة لـ ApiClient الحقيقي في services/apiClient.
 * استُخدمت بدل ApiLike عشان الـ config يبقى مستقل عن التنفيذ الفعلي.
 */
export interface ApiLike {
  get<T = unknown>(url: string, config?: unknown): Promise<AxiosResponse<T>>;
  post<T = unknown, D = unknown>(url: string, data?: D, config?: unknown): Promise<AxiosResponse<T>>;
  put<T = unknown, D = unknown>(url: string, data?: D, config?: unknown): Promise<AxiosResponse<T>>;
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: unknown): Promise<AxiosResponse<T>>;
  delete<T = unknown>(url: string, config?: unknown): Promise<AxiosResponse<T>>;
}

/**
 * قالب واتساب — الحقول المشتركة بين كل النطاقات.
 * الحقول الزائدة (buttons/headerUsesOrderProduct/variables) تظهر حسب النطاق.
 */
export interface Template {
  id: string;
  name: string;
  content: string;
  eventType: string;
  isActive: boolean;
  buttons?: string;
  hasButtons?: boolean;
  channel?: string;
  headerFormat?: string | null;
  headerMediaHandle?: string | null;
  headerUsesOrderProduct?: boolean | null;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
  metaTemplateLanguage?: string | null;
  variables?: string | null;
  metaTemplateId?: string | null;
  isDefault?: boolean;
}

/**
 * صف حدث معرّف لكل النطاقات — بيُنشأ من الـ adapter بتاع كل scope
 * (الأوردرز: /order-status/with-templates، العملاء: schedule + templates).
 * أسماء الحقول مطابقة لشكل StatusWithTemplate القديم عشان مكونات العرض تشتغل كما هي.
 */
export interface EventRow {
  id: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  statusType: string;
  notifyCustomer: boolean;
  isSystemStatus: boolean;
  template: Template | null;
  metaTemplate?: Template | null;
  hasTemplate: boolean;
  hasMetaTemplate?: boolean;
  isNonNotifiable?: boolean;
  updatedAt?: string;
  /** خاص بالعملاء — قناة الإرسال النشطة */
  channel?: string;
  /** خاص بالعملاء — تأخير الجدولة */
  delayValue?: number;
  delayUnit?: "HOURS" | "DAYS";
  /** خاص بالعملاء — وصف التفعيل (متى يُرسل) */
  trigger?: string;
}

export interface TemplateButton {
  id: string;
  text: string;
  action: string;
}

export interface MetaAvailableTemplate {
  name: string;
  status: string;
  language?: string;
  category?: string;
  components?: Array<{ type: string; text?: string }> | null;
  boundToLocalTemplateId?: string | null;
  boundToEventType?: string | null;
  boundToLocalTemplateIds?: string[];
  boundToEventTypes?: string[];
  boundLocalContent?: string;
}

export interface DefaultSessionInfo {
  id: string;
  name: string;
  provider: string;
  phoneNumber?: string;
}

export interface DeliveryPreviewItem {
  templateId: string;
  eventType: string;
  provider: string | null;
  deliveryStatus: string;
  riskLevel: "none" | "warning" | "danger";
  message: string;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
}

export interface SettingsForm {
  isEnabled: boolean;
  orderNotificationsEnabled: boolean;
  defaultSessionId: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  rateLimitPerMinute: number;
  stickySessionEnabled: boolean;
}

/** تبويب في الصفحة الموحدة */
export interface TabDef {
  key: string;
  label: string;
  kind: "list" | "reports" | "settings" | "schedule";
  filter?: (row: EventRow) => boolean;
  count?: (rows: EventRow[]) => number;
  isSpecial?: boolean;
}

export type TemplateSlot = "regular" | "meta";

export type TemplateFormState = {
  name: string;
  content: string;
  isActive: boolean;
  hasButtons: boolean;
  buttons: TemplateButton[];
  sendMode: "direct" | "bind_meta";
  metaTemplateName: string;
  metaTemplateLanguage: string;
  headerFormat: string;
  headerMediaHandle: string;
  headerMediaName: string;
  headerUsesOrderProduct: boolean;
  category: string;
};

/**
 * الـ config الخاص بكل نطاق — بيحدد كل ما يخص النطاق:
 * البيانات، التبويبات، المتغيرات، الميزات، ونقاط النهاية.
 */
export interface TemplateScopeConfig {
  scope: string;
  documentTitle: string;
  title: string;
  description: string;

  /** جلب صفوف الأحداث — الـ adapter بيرجّع EventRow[] موحّد */
  loadEvents: (api: ApiLike) => Promise<EventRow[]>;

  /** تفعيل/إيقاف إشعار حدث */
  toggleNotify: (api: ApiLike, row: EventRow) => Promise<void>;

  /** حفظ تعديلات الجدولة (تبويب الجدول — خاص بالعملاء) */
  saveSchedule?: (api: ApiLike, row: EventRow, patch: { enabled: boolean; activeChannel: string; delayValue: number; delayUnit: "HOURS" | "DAYS" }) => Promise<void>;

  /** إرسال تجريبي (شريط أعلى الصفحة — خاص بالعملاء) */
  testSend?: (api: ApiLike, phone: string, eventType: string) => Promise<{ success?: boolean; message?: string; error?: string }>;

  /** نقطة CRUD القوالب — تختلف بين النطاقين (نفس الكونترولر) */
  templateCrudBase: string;

  /** نقطة عمليات ميتا (publish/bind/resubmit/sync/meta-available) — موحّدة */
  metaOpsBase: string;

  /** صيغة المتغيرات المخزنة — لو single بنحوّل double داخل الواجهة والعكس عند الحفظ */
  variableSyntax: "double" | "single";

  variables: { var: string; desc: string }[];
  sampleVariables: Record<string, string>;
  metaToLocalDefaultOrder: string[];
  defaultContent: string;
  eventLabelResolver: (eventType: string) => string;

  /** تبويبات الصفحة بالترتيب */
  tabs: TabDef[];

  features: {
    enableButtons: boolean;
    enableHeaderProductImage: boolean;
    enableMetaSwitch: boolean;
    enableMetaMultiBind: boolean;
    enableTestSender: boolean;
    enableSchedule: boolean;
    enableReports: boolean;
    enableSettings: boolean;
    enableFilterChips: boolean;
    enableInternalToggle: boolean;
    sortModes: Array<"statusType" | "alphabetical" | "recent">;
    dialogCategoryOptions?: { value: string; label: string }[];
    categoryMode: "auto" | "manual";
  };

  /** لتحديد فئة القالب تلقائياً (وضع auto) */
  resolveCategory?: (row: EventRow) => string;

  /** فئات السجل اللي يعرضها تقرير الرسائل — لو فاضية نستخدم فئات الطلبات الافتراضية */
  reportCategories?: string[];

  /** أحداث السجل اللي يعرضها التقرير (لو محدد — أولوية على reportCategories) */
  reportEventTypes?: string[];

  /** تعطيل/تفعيل زر إنشاء القالب العادي إذا كان الحدث غير مفعّل */
  gateCreateOnNotify?: boolean;

  /** عناوين الـ endpoints الإضافية (اختياري — لو النطاق شغّل الميزة) */
  endpoints?: {
    sessions?: string;
    settings?: string;
    report?: string;
    deliveryPreview?: string;
    uploadMedia?: string;
    schedule?: { get: string; put: string };
    testSend?: string;
  };

  /** جلب جلسات ميتا (اختياري — لو مختلف عن sessions الافتراضي) */
  metaSessionsUrl?: string;
}

export type FilterChip = "all" | "custom" | "meta_bound" | "no_template" | "disabled";
export type SortMode = "statusType" | "alphabetical" | "recent";
