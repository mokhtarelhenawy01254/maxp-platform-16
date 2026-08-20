import type { AxiosResponse } from "axios";

/**
 * ┘ê╪º╪¼┘ç╪⌐ ╪»┘å┘è╪º ┘ä┘ä╪╣┘à┘è┘ä API ΓÇö ┘à╪╖╪º╪¿┘é╪⌐ ┘ä┘Ç ApiClient ╪º┘ä╪¡┘é┘è┘é┘è ┘ü┘è services/apiClient.
 * ╪º╪│╪¬┘Å╪«╪»┘à╪¬ ╪¿╪»┘ä ApiLike ╪╣╪┤╪º┘å ╪º┘ä┘Ç config ┘è╪¿┘é┘ë ┘à╪│╪¬┘é┘ä ╪╣┘å ╪º┘ä╪¬┘å┘ü┘è╪░ ╪º┘ä┘ü╪╣┘ä┘è.
 */
export interface ApiLike {
  get<T = unknown>(url: string, config?: unknown): Promise<AxiosResponse<T>>;
  post<T = unknown, D = unknown>(url: string, data?: D, config?: unknown): Promise<AxiosResponse<T>>;
  put<T = unknown, D = unknown>(url: string, data?: D, config?: unknown): Promise<AxiosResponse<T>>;
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: unknown): Promise<AxiosResponse<T>>;
  delete<T = unknown>(url: string, config?: unknown): Promise<AxiosResponse<T>>;
}

/**
 * ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿ ΓÇö ╪º┘ä╪¡┘é┘ê┘ä ╪º┘ä┘à╪┤╪¬╪▒┘â╪⌐ ╪¿┘è┘å ┘â┘ä ╪º┘ä┘å╪╖╪º┘é╪º╪¬.
 * ╪º┘ä╪¡┘é┘ê┘ä ╪º┘ä╪▓╪º╪ª╪»╪⌐ (buttons/headerUsesOrderProduct/variables) ╪¬╪╕┘ç╪▒ ╪¡╪│╪¿ ╪º┘ä┘å╪╖╪º┘é.
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
 * ╪╡┘ü ╪¡╪»╪½ ┘à╪╣╪▒┘æ┘ü ┘ä┘â┘ä ╪º┘ä┘å╪╖╪º┘é╪º╪¬ ΓÇö ╪¿┘è┘Å┘å╪┤╪ú ┘à┘å ╪º┘ä┘Ç adapter ╪¿╪¬╪º╪╣ ┘â┘ä scope
 * (╪º┘ä╪ú┘ê╪▒╪»╪▒╪▓: /order-status/with-templates╪î ╪º┘ä╪╣┘à┘ä╪º╪í: schedule + templates).
 * ╪ú╪│┘à╪º╪í ╪º┘ä╪¡┘é┘ê┘ä ┘à╪╖╪º╪¿┘é╪⌐ ┘ä╪┤┘â┘ä StatusWithTemplate ╪º┘ä┘é╪»┘è┘à ╪╣╪┤╪º┘å ┘à┘â┘ê┘å╪º╪¬ ╪º┘ä╪╣╪▒╪╢ ╪¬╪┤╪¬╪║┘ä ┘â┘à╪º ┘ç┘è.
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
  /** ┘ü╪ª╪⌐ ┘é╪º┘ä╪¿ ╪º┘ä┘à┘å╪º╪│╪¿╪⌐ (OCCASION) ΓÇö ┘ä┘ä╪¬┘à┘è┘è╪▓ ┘ü┘è ╪¬╪¿┘ê┘è╪¿ ┘à┘å╪º╪│╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í */
  category?: string;
  /** ╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í ΓÇö ┘é┘å╪º╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘å╪┤╪╖╪⌐ */
  channel?: string;
  /** ╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í ΓÇö ╪¬╪ú╪«┘è╪▒ ╪º┘ä╪¼╪»┘ê┘ä╪⌐ */
  delayValue?: number;
  delayUnit?: "HOURS" | "DAYS";
  /** ╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í ΓÇö ┘ê╪╡┘ü ╪º┘ä╪¬┘ü╪╣┘è┘ä (┘à╪¬┘ë ┘è┘Å╪▒╪│┘ä) */
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

/** ╪¬╪¿┘ê┘è╪¿ ┘ü┘è ╪º┘ä╪╡┘ü╪¡╪⌐ ╪º┘ä┘à┘ê╪¡╪»╪⌐ */
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
 * ╪º┘ä┘Ç config ╪º┘ä╪«╪º╪╡ ╪¿┘â┘ä ┘å╪╖╪º┘é ΓÇö ╪¿┘è╪¡╪»╪» ┘â┘ä ┘à╪º ┘è╪«╪╡ ╪º┘ä┘å╪╖╪º┘é:
 * ╪º┘ä╪¿┘è╪º┘å╪º╪¬╪î ╪º┘ä╪¬╪¿┘ê┘è╪¿╪º╪¬╪î ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬╪î ╪º┘ä┘à┘è╪▓╪º╪¬╪î ┘ê┘å┘é╪º╪╖ ╪º┘ä┘å┘ç╪º┘è╪⌐.
 */
export interface TemplateScopeConfig {
  scope: string;
  documentTitle: string;
  title: string;
  description: string;

  /** ╪¼┘ä╪¿ ╪╡┘ü┘ê┘ü ╪º┘ä╪ú╪¡╪»╪º╪½ ΓÇö ╪º┘ä┘Ç adapter ╪¿┘è╪▒╪¼┘æ╪╣ EventRow[] ┘à┘ê╪¡┘æ╪» */
  loadEvents: (api: ApiLike) => Promise<EventRow[]>;

  /** ╪¬┘ü╪╣┘è┘ä/╪Ñ┘è┘é╪º┘ü ╪Ñ╪┤╪╣╪º╪▒ ╪¡╪»╪½ */
  toggleNotify: (api: ApiLike, row: EventRow) => Promise<void>;

  /** ╪¡┘ü╪╕ ╪¬╪╣╪»┘è┘ä╪º╪¬ ╪º┘ä╪¼╪»┘ê┘ä╪⌐ (╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¼╪»┘ê┘ä ΓÇö ╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í) */
  saveSchedule?: (api: ApiLike, row: EventRow, patch: { enabled: boolean; activeChannel: string; delayValue: number; delayUnit: "HOURS" | "DAYS" }) => Promise<void>;

  /** ╪Ñ╪▒╪│╪º┘ä ╪¬╪¼╪▒┘è╪¿┘è (╪┤╪▒┘è╪╖ ╪ú╪╣┘ä┘ë ╪º┘ä╪╡┘ü╪¡╪⌐ ΓÇö ╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í) */
  testSend?: (api: ApiLike, phone: string, eventType: string) => Promise<{ success?: boolean; message?: string; error?: string }>;

  /** ┘å┘é╪╖╪⌐ CRUD ╪º┘ä┘é┘ê╪º┘ä╪¿ ΓÇö ╪¬╪«╪¬┘ä┘ü ╪¿┘è┘å ╪º┘ä┘å╪╖╪º┘é┘è┘å (┘å┘ü╪│ ╪º┘ä┘â┘ê┘å╪¬╪▒┘ê┘ä╪▒) */
  templateCrudBase: string;

  /** ┘å┘é╪╖╪⌐ ╪╣┘à┘ä┘è╪º╪¬ ┘à┘è╪¬╪º (publish/bind/resubmit/sync/meta-available) ΓÇö ┘à┘ê╪¡┘æ╪»╪⌐ */
  metaOpsBase: string;

  /** ╪╡┘è╪║╪⌐ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪«╪▓┘å╪⌐ ΓÇö ┘ä┘ê single ╪¿┘å╪¡┘ê┘æ┘ä double ╪»╪º╪«┘ä ╪º┘ä┘ê╪º╪¼┘ç╪⌐ ┘ê╪º┘ä╪╣┘â╪│ ╪╣┘å╪» ╪º┘ä╪¡┘ü╪╕ */
  variableSyntax: "double" | "single";

  variables: { var: string; desc: string }[];
  sampleVariables: Record<string, string>;
  metaToLocalDefaultOrder: string[];
  defaultContent: string;
  eventLabelResolver: (eventType: string) => string;

  /** ╪¬╪¿┘ê┘è╪¿╪º╪¬ ╪º┘ä╪╡┘ü╪¡╪⌐ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ */
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

  /** ┘ä╪¬╪¡╪»┘è╪» ┘ü╪ª╪⌐ ╪º┘ä┘é╪º┘ä╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï (┘ê╪╢╪╣ auto) */
  resolveCategory?: (row: EventRow) => string;

  /** ┘ü╪ª╪º╪¬ ╪º┘ä╪│╪¼┘ä ╪º┘ä┘ä┘è ┘è╪╣╪▒╪╢┘ç╪º ╪¬┘é╪▒┘è╪▒ ╪º┘ä╪▒╪│╪º╪ª┘ä ΓÇö ┘ä┘ê ┘ü╪º╪╢┘è╪⌐ ┘å╪│╪¬╪«╪»┘à ┘ü╪ª╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ */
  reportCategories?: string[];

  /** ╪ú╪¡╪»╪º╪½ ╪º┘ä╪│╪¼┘ä ╪º┘ä┘ä┘è ┘è╪╣╪▒╪╢┘ç╪º ╪º┘ä╪¬┘é╪▒┘è╪▒ (┘ä┘ê ┘à╪¡╪»╪» ΓÇö ╪ú┘ê┘ä┘ê┘è╪⌐ ╪╣┘ä┘ë reportCategories) */
  reportEventTypes?: string[];

  /** ╪¬╪╣╪╖┘è┘ä/╪¬┘ü╪╣┘è┘ä ╪▓╪▒ ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è ╪Ñ╪░╪º ┘â╪º┘å ╪º┘ä╪¡╪»╪½ ╪║┘è╪▒ ┘à┘ü╪╣┘æ┘ä */
  gateCreateOnNotify?: boolean;

  /** ╪╣┘å╪º┘ê┘è┘å ╪º┘ä┘Ç endpoints ╪º┘ä╪Ñ╪╢╪º┘ü┘è╪⌐ (╪º╪«╪¬┘è╪º╪▒┘è ΓÇö ┘ä┘ê ╪º┘ä┘å╪╖╪º┘é ╪┤╪║┘æ┘ä ╪º┘ä┘à┘è╪▓╪⌐) */
  endpoints?: {
    sessions?: string;
    settings?: string;
    report?: string;
    deliveryPreview?: string;
    uploadMedia?: string;
    schedule?: { get: string; put: string };
    testSend?: string;
  };

  /** ╪¼┘ä╪¿ ╪¼┘ä╪│╪º╪¬ ┘à┘è╪¬╪º (╪º╪«╪¬┘è╪º╪▒┘è ΓÇö ┘ä┘ê ┘à╪«╪¬┘ä┘ü ╪╣┘å sessions ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è) */
  metaSessionsUrl?: string;
}

export type FilterChip = "all" | "custom" | "meta_bound" | "no_template" | "disabled";
export type SortMode = "statusType" | "alphabetical" | "recent";
