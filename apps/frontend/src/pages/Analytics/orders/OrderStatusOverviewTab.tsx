import React from "react";
import {
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Wallet,
  Clock,
  MapPin,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Summary,
  StatusRow,
  TrendDay,
  HourlyRow,
  GovernorateRow,
  STATUS_COLORS,
  PIE_COLORS,
  STATUS_LABELS,
} from "./orderStatusTypes";

interface OrderStatusOverviewTabProps {
  summary?: Summary;
  deliveryRate: string;
  statusDist: StatusRow[];
  trendData: TrendDay[];
  hourlyData: HourlyRow[];
  topGovs: GovernorateRow[];
}

export const OrderStatusOverviewTab: React.FC<OrderStatusOverviewTabProps> = ({
  summary,
  deliveryRate,
  statusDist,
  trendData,
  hourlyData,
  topGovs,
}) => {
  return (
    <div className="space-y-4">
      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي الطلبات</span>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
            {(summary?.totalOrders || 0).toLocaleString()}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate tabular-nums">
            نسبة التسليم: {deliveryRate}%
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي الإيرادات</span>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
            {(summary?.totalRevenue || 0).toLocaleString("ar-EG")}{" "}
            <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            متوسط: {(summary?.avgOrderValue || 0).toLocaleString("ar-EG")} ج.م
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">فشل بسبب العجز</span>
            <AlertTriangle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-purple-600 dark:text-purple-400">
            {(summary?.shortageFailedCount || 0).toLocaleString()}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            {summary?.shortageFailedPercentage || 0}% من الإجمالي
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">قيمة العجز الفاشل</span>
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {(summary?.shortageFailedRevenue || 0).toLocaleString("ar-EG")}{" "}
            <span className="text-xs font-normal text-muted-foreground">ج.م</span>
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            {summary?.shortageFailedCount || 0} طلب مفقود
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Status Distribution Pie */}
        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">توزيع الحالات</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {statusDist.map((entry, i) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} طلب`, STATUS_LABELS[String(name)] || String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {statusDist.slice(0, 6).map((s, i) => (
              <div key={s.status} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate">{STATUS_LABELS[s.status] || s.status}</span>
                <span className="font-mono font-semibold text-foreground mr-auto tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Trend */}
        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">الاتجاه اليومي للحالات</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="shortageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("ar-EG")} />
                <Area
                  type="monotone"
                  dataKey="SHORTAGE_FAILED"
                  stroke="#7C3AED"
                  fill="url(#shortageGrad)"
                  strokeWidth={1.5}
                  name={STATUS_LABELS["SHORTAGE_FAILED"]}
                />
                <Area
                  type="monotone"
                  dataKey="DELIVERED"
                  stroke="#10B981"
                  fill="transparent"
                  strokeWidth={1.5}
                  name={STATUS_LABELS["DELIVERED"]}
                />
                <Area
                  type="monotone"
                  dataKey="CANCELLED"
                  stroke="#EF4444"
                  fill="transparent"
                  strokeWidth={1.5}
                  name={STATUS_LABELS["CANCELLED"]}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Distribution + Governorates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" /> التوزيع الساعي
          </h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
                <XAxis dataKey="hour" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted-foreground" /> أعلى المحافظات
          </h3>
          <div className="space-y-2.5">
            {topGovs.slice(0, 8).map((g, i) => (
              <div key={g.name} className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="font-medium text-foreground truncate">{g.name}</span>
                    <span className="font-mono font-bold text-foreground tabular-nums">{g.count}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(g.count / (topGovs[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusOverviewTab;
