export interface DuplicateOrderSettingsData {
  enabled: boolean;
  criterion: 'phone' | 'phone_amount' | 'phone_products';
  windowMinutes: number | null;
  action: 'record_visible' | 'record_hidden' | 'block';
  notifyTeam: boolean;
  compareStorefrontOrders: boolean;
  reportAs: 'duplicate' | 'cancelled';
  activeStatuses: string[];
  excludedPhones: string[];

  // Legacy fields for backwards compatibility
  criteria?: 'phone' | 'phone_amount' | 'phone_items' | 'phone_products';
  windowEnabled?: boolean;
  alertTeam?: boolean;
  includeStoreOrders?: boolean;
  reportTreatment?: 'separate' | 'cancelled';
  exemptPhones?: string[];
}

export interface StatusOption {
  code: string;
  label: string;
  dot: string;
}

export interface TimeWindowPreset {
  minutes: number | null;
  label: string;
}

export interface DuplicateCriterionOption {
  id: 'phone' | 'phone_amount' | 'phone_products';
  title: string;
  desc: string;
}

export type DuplicateCriteriaOption = DuplicateCriterionOption;

export interface DuplicateActionOption {
  id: 'record_visible' | 'record_hidden' | 'block';
  title: string;
  desc: string;
}
