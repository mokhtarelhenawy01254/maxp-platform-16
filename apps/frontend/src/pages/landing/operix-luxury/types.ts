export type OperixTabKey =
  | "orders"
  | "inventory"
  | "shipping"
  | "crm"
  | "financials";

export interface OperixTabItem {
  id: OperixTabKey;
  label: string;
  badge?: string;
  headline: string;
  description: string;
}

export interface OperixOrderSample {
  id: string;
  customerName: string;
  city: string;
  items: string;
  total: number;
  status: "confirmed" | "preparing" | "shipped" | "delivered";
  statusText: string;
  paymentMethod: "COD" | "InstaPay" | "Card";
  channel: "WhatsApp" | "Instagram" | "WebStore";
}

export interface OperixModuleItem {
  id: string;
  title: string;
  badge: string;
  description: string;
  metric: string;
  metricLabel: string;
  colSpan: string;
  features: string[];
}

export interface OperixFaqItem {
  question: string;
  answer: string;
}
