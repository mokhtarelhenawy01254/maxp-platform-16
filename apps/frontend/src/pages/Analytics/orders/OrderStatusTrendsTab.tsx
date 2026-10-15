import React from "react";
import { Wallet, Package } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendDay,
  PaymentRow,
  SourceRow,
  STATUS_LABELS,
  PAYMENT_LABELS,
  SOURCE_LABELS,
} from "./orderStatusTypes";

interface OrderStatusTrendsTabProps {
  trendData: TrendDay[];
  paymentStats: PaymentRow[];
  sourceStats: SourceRow[];
}

export const OrderStatusTrendsTab: React.FC<OrderStatusTrendsTabProps> = ({
  trendData,
  paymentStats,
  sourceStats,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">اتجاه الحالات على مدار الوقت</h3>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} tickFormatter={(v) => v.slice(5)} />
              <YAxis stroke="#888888" fontSize={10} tickLine={false} />
              <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("ar-EG")} />
              <Line type="monotone" dataKey="SHORTAGE_FAILED" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3 }} name={STATUS_LABELS["SHORTAGE_FAILED"]} />
              <Line type="monotone" dataKey="DELIVERED" stroke="#10B981" strokeWidth={1.5} dot={false} name={STATUS_LABELS["DELIVERED"]} />
              <Line type="monotone" dataKey="CANCELLED" stroke="#EF4444" strokeWidth={1.5} dot={false} name={STATUS_LABELS["CANCELLED"]} />
              <Line type="monotone" dataKey="PROCESSING" stroke="#6366F1" strokeWidth={1.5} dot={false} name={STATUS_LABELS["PROCESSING"]} />
              <Line type="monotone" dataKey="SHIPPED" stroke="#3B82F6" strokeWidth={1.5} dot={false} name={STATUS_LABELS["SHIPPED"]} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-muted-foreground" /> طرق الدفع
          </h3>
          <div className="space-y-2.5">
            {paymentStats.map((p) => (
              <div key={p.method} className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground w-28 truncate">
                  {PAYMENT_LABELS[p.method] || p.method || "غير محدد"}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${(p.count / Math.max(...paymentStats.map((x) => x.count), 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-foreground w-12 text-left tabular-nums">
                  {p.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Package className="h-4 w-4 text-muted-foreground" /> مصادر الطلبات
          </h3>
          <div className="space-y-2.5">
            {sourceStats.map((s) => (
              <div key={s.source} className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground w-28 truncate">
                  {SOURCE_LABELS[s.source] || s.source || "غير محدد"}
                </span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${(s.count / Math.max(...sourceStats.map((x) => x.count), 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-foreground w-12 text-left tabular-nums">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusTrendsTab;
