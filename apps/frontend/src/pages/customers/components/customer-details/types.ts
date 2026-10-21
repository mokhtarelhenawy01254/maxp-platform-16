import {
  CustomerBlockAction,
  CustomerBlockReasonCode,
  CustomerBlockRule,
} from "@/services/customerBlocklistService";

export interface CustomerDetailsData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    tags: string[];
    notes?: string;
    birthday?: string;
    status: string;
    customerRating?: string;
    deliveryRate?: number;
    totalDelivered?: number;
    totalOrdersCount?: number;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    ordersCount: number;
    conversationsCount: number;
    totalSpent: number;
    averageOrderValue: number;
    deliveryRate?: number;
    totalDelivered?: number;
    totalOrdersCount?: number;
    customerRating?: string;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
  recentConversations: Array<{
    id: string;
    channel: string;
    status: string;
    lastMessageAt: string;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    author?: {
      firstName: string;
      lastName: string;
    };
  }>;
  activities: Array<{
    type: string;
    id: string;
    title: string;
    status?: string;
    value?: number;
    content?: string;
    author?: string;
    timestamp: string;
  }>;
  customerBlock?: {
    isBlocked: boolean;
    rule?: CustomerBlockRule | null;
  };
  loyalty?: Array<{
    programId: string;
    programName?: string | null;
    programType?: string;
    points: number;
    totalEarned: number;
    tierName?: string | null;
    status?: string;
  }>;
  wallet?: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    currency: string;
  } | null;
  cashbackTotal?: number;
}

export type CustomerDetailTabKey =
  | "info"
  | "orders"
  | "conversations"
  | "notes"
  | "activity"
  | "loyalty"
  | "journey";

export interface CustomerBlockFormState {
  reasonCode: CustomerBlockReasonCode;
  reasonNote: string;
  action: CustomerBlockAction;
  expiresAt: string;
}
