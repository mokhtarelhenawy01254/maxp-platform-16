export type OrderType = 'GUEST' | 'REGULAR';

export const WORKSPACE_TAB_KEYS = [
  'all',
  'today',
  'pending',
  'processing',
  'cancelled',
  'followup',
  'confirmed',
] as const;

export type FilterTab = typeof WORKSPACE_TAB_KEYS[number];
export type OrderAction = 'log-call' | 'confirm' | 'cancel' | 'details' | 'follow-up';
export type PerspectiveMode = 'operator' | 'supervisor';

export interface CallLogEntry {
  id: string;
  result: string;
  notes?: string | null;
  createdAt: string;
  userName?: string | null;
  durationSeconds?: number;
  recordingUrl?: string | null;
}

export interface CustomerStats {
  deliveryRate: number | null;
  totalDelivered: number;
  totalOrdersCount: number;
  customerRating: string;
}

export interface OrderAttribution {
  source?: string | null;
  campaignName?: string | null;
  adSetId?: string | null;
  adId?: string | null;
}

export interface WorkspaceOrderItem {
  id?: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  name?: string;
  quantity: number;
  price: number;
  total: number;
  productColor?: string | null;
  productSize?: string | null;
  productImage?: string | null;
  sku?: string | null;
}

export interface WorkspaceOrder {
  id: string;
  orderNumber: string;
  type?: OrderType;
  customerName: string;
  customerPhone: string;
  secondaryPhone?: string | null;
  governorate: string;
  city: string;
  shippingAddress?: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount?: number;
  status: string;
  callAttempts: number;
  lastCallAt: string | null;
  followUpDate: string | null;
  createdAt: string;
  assignedAt?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  notes?: string;
  items: WorkspaceOrderItem[];
  callLogs?: CallLogEntry[];
  customerStats?: CustomerStats | null;
  attribution?: OrderAttribution | null;
  isIncomplete?: boolean;
  abandonReason?: string;
  cartId?: string;
}

export interface WorkspaceStats {
  total: number;
  all?: number;
  today?: number;
  pending: number;
  processing?: number;
  confirmed: number;
  cancelled: number;
  followup: number;
  incomplete?: number;
}

export interface WorkspacePagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AgentWorkload {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
  availability?: string;
  pendingCount: number;
  todayConfirmedCount: number;
}

export interface TeamWorkloadData {
  unassignedCount: number;
  agents: AgentWorkload[];
}
