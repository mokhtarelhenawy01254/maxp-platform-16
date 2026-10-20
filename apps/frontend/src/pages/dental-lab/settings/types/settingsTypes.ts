import {
  Building2,
  Workflow,
  MessageSquareText,
  FilePlus2,
  Coins,
  BellRing,
  CreditCard,
  Bot,
  DollarSign,
} from "lucide-react";
import { type DentalInvoiceMode, tKey } from "../../shared";

export type SettingsSectionId =
  | "general"
  | "policies"
  | "financial"
  | "stages"
  | "whatsapp"
  | "fields"
  | "wages"
  | "dunning"
  | "billing";

export const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  labelKey: string;
  icon: typeof Building2;
}[] = [
  { id: "general", labelKey: "dentalLab.settings.sections.general", icon: Building2 },
  { id: "policies", labelKey: "الأتمتة والسياسات", icon: Bot },
  { id: "financial", labelKey: "الطبقة المالية والترحيل", icon: DollarSign },
  { id: "stages", labelKey: "dentalLab.settings.sections.stages", icon: Workflow },
  { id: "whatsapp", labelKey: "dentalLab.settings.sections.whatsapp", icon: MessageSquareText },
  { id: "fields", labelKey: "dentalLab.settings.sections.fields", icon: FilePlus2 },
  { id: "wages", labelKey: "dentalLab.settings.sections.wages", icon: Coins },
  { id: "dunning", labelKey: "dentalLab.settings.sections.dunning", icon: BellRing },
  { id: "billing", labelKey: "dentalLab.settings.sections.billing", icon: CreditCard },
];

export const CATEGORY_LABEL = (t: (key: never) => unknown, cat: string) => {
  const key = `dentalLab.workTypes.categoryOptions.${cat}`;
  const val = tKey(t, key);
  return val && val !== key ? val : cat;
};

export const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT"];

export const INVOICE_MODES: {
  id: DentalInvoiceMode;
  labelKey: string;
  hintKey: string;
}[] = [
  {
    id: "AUTO_ON_RECEIPT",
    labelKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_RECEIPT",
    hintKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_RECEIPT_hint",
  },
  {
    id: "AUTO_ON_DELIVERY",
    labelKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_DELIVERY",
    hintKey: "dentalLab.settings.billingPolicy.modes.AUTO_ON_DELIVERY_hint",
  },
  {
    id: "MANUAL",
    labelKey: "dentalLab.settings.billingPolicy.modes.MANUAL",
    hintKey: "dentalLab.settings.billingPolicy.modes.MANUAL_hint",
  },
];

export const sectionCardCls =
  "bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5";
export const labelCls =
  "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
