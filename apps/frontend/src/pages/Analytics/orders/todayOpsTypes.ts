export interface TeamMember {
  name: string;
  confirms: number;
  cancels: number;
  others: number;
  total: number;
}

export interface ActionItem {
  id: string;
  orderLabel: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  createdAt: string;
  orderDate: string;
  isOldOrder: boolean;
}

export interface PendingItem {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  sourceType: string;
  createdAt: string;
}

export interface StatusRow {
  status: string;
  count: number;
}

export interface HourlyRow {
  hour: number;
  count: number;
}

export interface TodayActions {
  confirms: number;
  cancels: number;
  total: number;
  team: TeamMember[];
  feed: ActionItem[];
}

export interface DaySnapshot {
  date: string;
  totalOrders: number;
  regular: number;
  guests: number;
  pendingList: PendingItem[];
  pendingListGuests: PendingItem[];
  statusBreakdown: StatusRow[];
  hourly: HourlyRow[];
}

export interface PageData {
  todayActions: TodayActions;
  daySnapshot: DaySnapshot;
}

export function statusBadge(status: string | null): string {
  const m: Record<string, string> = {
    CONFIRMED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    CANCELLED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    DELIVERED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    PROCESSING: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    SHIPPED: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
    REFUNDED: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
    DUPLICATE_ORDER: "bg-muted text-muted-foreground border border-border/70",
  };
  return m[status || ""] || "bg-muted text-muted-foreground border border-border/70";
}

export function statusLabel(status: string | null): string {
  const m: Record<string, string> = {
    CONFIRMED: "مؤكد",
    PENDING: "معلق",
    CANCELLED: "ملغي",
    DELIVERED: "تم التسليم",
    PROCESSING: "قيد المعالجة",
    SHIPPED: "تم الشحن",
    REFUNDED: "مسترجع",
    DUPLICATE_ORDER: "مكرر",
  };
  return m[status || ""] || status || "-";
}

export function fmtTime(d: string): string {
  if (!d) return "-";
  const date = new Date(d);
  return (
    date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) +
    " " +
    date.getHours().toString().padStart(2, "0") +
    ":" +
    date.getMinutes().toString().padStart(2, "0")
  );
}

export function fmtHour(h: number): string {
  return h.toString().padStart(2, "0") + ":00";
}
