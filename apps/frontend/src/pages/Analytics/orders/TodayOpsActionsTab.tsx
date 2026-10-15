import React from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import {
  TodayActions,
  statusBadge,
  statusLabel,
  fmtTime,
} from "./todayOpsTypes";

interface Props {
  actions: TodayActions;
}

export const TodayOpsActionsTab: React.FC<Props> = ({ actions }) => {
  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الإجراءات</span>
              <Activity className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {actions.total.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {actions.confirms} تأكيد + {actions.cancels} إلغاء
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>التأكيدات الناجحة</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {actions.confirms.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              طلبات تم تثبيتها للتحضير
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>الإلغاءات</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {actions.cancels.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              طلبات تم استبعادها اليوم
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>نسبة الإنجاز للتأكيد</span>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {actions.total > 0 ? Math.round((actions.confirms / actions.total) * 100) : 0}%
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              {actions.cancels > 0
                ? `${Math.round((actions.cancels / actions.total) * 100)}% معدل الإلغاء`
                : "0% إلغاء"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Activity Leaderboard */}
      <Card className="border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-foreground">
              نشاط فريق العمل والتأكيدات
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {actions.team.length} أعضاء مسجلين
          </span>
        </div>
        {actions.team.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            لا توجد إجراءات مسجلة للفريق اليوم حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">عضو الفريق</th>
                  <th className="py-2.5 px-4 text-center font-medium">تأكيد</th>
                  <th className="py-2.5 px-4 text-center font-medium">إلغاء</th>
                  <th className="py-2.5 px-4 text-center font-medium">أخرى</th>
                  <th className="py-2.5 px-4 text-left font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {actions.team.map((m) => (
                  <tr key={m.name} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-foreground">{m.name}</td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                      {m.confirms}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-rose-500 font-semibold">
                      {m.cancels}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground">
                      {m.others}
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono tabular-nums font-bold text-foreground">
                      {m.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Activity Live Feed */}
      <Card className="border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">
              سجل التحديثات الحية واللحظية
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {actions.feed.length} إجراء
          </span>
        </div>
        {actions.feed.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            لا توجد حركات حالة مسجلة اليوم
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
                <tr>
                  <th className="py-2.5 px-4 text-right font-medium">رقم الطلب</th>
                  <th className="py-2.5 px-4 text-center font-medium">الحالة السابقة</th>
                  <th className="py-2.5 px-4 text-center font-medium">الحالة الجديدة</th>
                  <th className="py-2.5 px-4 text-center font-medium">المستخدم</th>
                  <th className="py-2.5 px-4 text-center font-medium">الوقت</th>
                  <th className="py-2.5 px-4 text-left font-medium">النوع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {actions.feed.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                      {item.orderLabel}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${statusBadge(item.oldStatus)}`}>
                        {statusLabel(item.oldStatus)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${statusBadge(item.newStatus)}`}>
                        {statusLabel(item.newStatus)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-muted-foreground">
                      {item.changedBy}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-muted-foreground">
                      {fmtTime(item.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 text-left">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${item.isOldOrder ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : "bg-blue-500/10 text-blue-600 border border-blue-500/20"}`}>
                        {item.isOldOrder ? "قديم" : "جديد"}
                      </span>
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
