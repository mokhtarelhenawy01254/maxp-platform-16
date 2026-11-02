import type { OrderConfirmationUser } from "../../../services/orderConfirmationService";

export interface ConfirmationOrderItem {
  id: string;
  productId?: string;
  productName?: string;
  name?: string;
  quantity: number;
  price: number;
  total?: number;
  color?: string;
  size?: string;
  sku?: string | null;
  image?: string | null;
}

export interface ConfirmationOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  shippingAddress?: string;
  city?: string;
  total: number;
  subtotal?: number;
  discount?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  sourceType: string;
  createdAt: string;
  governorate?: string;
  assignedTo?: string | null;
  assignedAt?: string | null;
  confirmedAt?: string | null;
  isGuestOrder?: boolean;
  assignedToName?: string | null;
  assignmentStrategy?: string | null;
  callAttempts?: number;
  lastCallAttemptAt?: string | null;
  shipping?: number;
  codDepositAmount?: number;
  notes?: string;
  metadata?: any;
  items?: ConfirmationOrderItem[];
}

export interface ConfirmationStats {
  range: { startDate: string; endDate: string };
  totals: {
    confirmedRegular: number;
    confirmedGuest: number;
    totalConfirmed: number;
    totalAssigned: number;
  };
  assignmentsByUser: Array<{
    userId: string;
    name: string;
    email?: string | null;
    count: number;
  }>;
}

export interface FilterOption {
  value: string;
  label: string;
}

export type { OrderConfirmationUser };
