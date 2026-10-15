import React from "react";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { Card, CardContent } from "../../../components/ui/card";
import {
  DaySnapshot,
  statusBadge,
  statusLabel,
  fmtTime,
  fmtHour,
} from "./todayOpsTypes";

interface Props {
  snapshot: DaySnapshot;
  snapDate: string;
  onDateChange: (date: string) => void;
}

export const TodayOpsSnapshotTab: React.FC<Props> = ({
  snapshot: s,
  snapDate,
  onDateChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Date Picker Bar */}
      <div className="flex items-center gap-3 bg-card border border-border/70 rounded-xl px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">تاريخ التقرير:</span>
        <input
          type="date"
          value={snapDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onDateChange(e.target.value)}
          className="bg-background border border-border/70 rounded-md px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Snapshot KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الوارد</span>
              <BarChart3 className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {s.totalOrders.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {s.regular} أساسي + {s.guests} زائر
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>المؤكدة</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {(
                s.statusBreakdown.find((st) => st.status === "CONFIRMED")?.count || 0
              ).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              طلبات مقبولة للتجهيز
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>الملغية</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {(
                s.statusBreakdown.find((st) => st.status === "CANCELLED")?.count || 0
              ).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              طلبات تم إلغاؤها
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>المعلقة</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {(s.pendingList.length + s.pendingListGuests.length).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              تنتظر التأكيد والاتصال
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              توزيع حالات الطلبات المسجلة
            </h3>
            {s.statusBreakdown.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                لا توجد بيانات لهذا اليوم
              </div>
            ) : (
              <div className="space-y-2">
                {s.statusBreakdown.map((b) => (
                  <div
                    key={b.status}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadge(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-foreground text-xs">
                      {b.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution Chart */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              توزيع استلام الطلبات بالساعة
            </h3>
            {s.hourly.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                لا توجد بيانات بالساعة
              </div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.hourly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                    <XAxis
                      dataKey="hour"
                      stroke="currentColor"
                      className="text-muted-foreground"
                      fontSize={11}
                      tickFormatter={fmtHour}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelFormatter={(h: number) => fmtHour(h)}
                      formatter={(v: number) => [v, "طلبات"]}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders Table */}
      <Card className="border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              قائمة الطلبات المعلقة في انتظار التأكيد
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {s.pendingList.length + s.pendingListGuests.length} طلب
          </span>
        </div>
        {s.pendingList.length === 0 && s.pendingListGuests.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            لا توجد طلبات معلقة مسجلة في هذا اليوم
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">رقم الطلب</th>
                  <th className="py-2.5 px-4 text-right font-medium">العميل</th>
                  <th className="py-2.5 px-4 text-center font-medium">الهاتف</th>
                  <th className="py-2.5 px-4 text-center font-medium">الإجمالي</th>
                  <th className="py-2.5 px-4 text-center font-medium">المصدر</th>
                  <th className="py-2.5 px-4 text-center font-medium">الوقت</th>
                  <th className="py-2.5 px-4 text-left font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {s.pendingList.map((o) => (
                  <tr key={o.orderNumber} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                      {o.orderNumber}
                    </td>
                    <td className="py-2.5 px-4 text-foreground">{o.customerName || "-"}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground dir-ltr">
                      {o.customerPhone || "-"}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-foreground">
                      {Number(o.total || 0).toLocaleString()} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-center text-muted-foreground">
                      {o.sourceType || "عادي"}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground">
                      {fmtTime(o.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 text-left">
                      {o.customerPhone ? (
                        <a
                          href={`tel:${o.customerPhone}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-[11px]"
                        >
                          <Phone className="h-3 w-3" />
                          اتصال
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {s.pendingListGuests.map((o) => (
                  <tr key={`g-${o.orderNumber}`} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                      {o.orderNumber}
                    </td>
                    <td className="py-2.5 px-4 text-foreground">{o.customerName || "-"}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground dir-ltr">
                      {o.customerPhone || "-"}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-foreground">
                      {Number(o.total || 0).toLocaleString()} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-center text-muted-foreground">
                      زائر
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground">
                      {fmtTime(o.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 text-left">
                      {o.customerPhone ? (
                        <a
                          href={`tel:${o.customerPhone}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-[11px]"
                        >
                          <Phone className="h-3 w-3" />
                          اتصال
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
