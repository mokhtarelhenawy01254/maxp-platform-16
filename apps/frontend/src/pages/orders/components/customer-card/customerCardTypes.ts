import { OrderDetailsType, Government, Area } from "../types";
import { InvoicePrintSettings } from "../../../../types/invoiceSettings";
import {
  CustomerBlockAction,
  CustomerBlockReasonCode,
} from "../../../../services/customerBlocklistService";

export interface CustomerInfoCardCustomFieldConfig {
  isEnabled?: boolean;
  label?: string;
  placeholder?: string;
}

export interface CustomerInfoCardProps {
  order: OrderDetailsType;
  isEditing: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  governments: Government[];
  areas?: Area[];
  loadingGovernments?: boolean;
  loadingAreas?: boolean;
  selectedGovernmentId?: number | null;
  setSelectedGovernmentId?: (id: number | null) => void;
  handleGovernmentChange?: (id: number, name: string) => void;
  invoiceSettings?: InvoicePrintSettings;
  customFieldConfig?: CustomerInfoCardCustomFieldConfig;
  onOrderUpdated?: () => void;
  onCustomerRatingChange?: (newRating: string) => void;
}

export const blockReasonOptions: Array<{
  value: CustomerBlockReasonCode;
  label: string;
}> = [
  { value: "FAKE_ORDERS", label: "طلبات وهمية" },
  { value: "REPEATED_REFUSAL", label: "رفض استلام متكرر" },
  { value: "ABUSE", label: "إساءة للدعم" },
  { value: "FRAUD", label: "احتيال" },
  { value: "WRONG_DATA", label: "بيانات غير صحيحة" },
  { value: "OTHER", label: "سبب آخر" },
];

export const blockActionOptions: Array<{
  value: CustomerBlockAction;
  label: string;
}> = [
  { value: "BLOCK_ORDERS", label: "منع الطلبات" },
  { value: "REQUIRE_MANAGER_APPROVAL", label: "موافقة مدير قبل الطلب" },
  { value: "BLOCK_COD_ONLY", label: "منع الدفع عند الاستلام فقط" },
];

export const getBlockActionLabel = (action?: string | null) =>
  blockActionOptions.find((item) => item.value === action)?.label ||
  "منع الطلبات";
