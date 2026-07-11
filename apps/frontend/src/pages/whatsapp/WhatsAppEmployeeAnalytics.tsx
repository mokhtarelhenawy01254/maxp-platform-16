import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Clock,
  Inbox,
  MessageSquare,
  MessageCircle,
  Send,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
  WhatsAppMetricCard,
} from "./components/WhatsAppPageShell";
import { apiClient, type ApiRequestConfig } from "../../services/apiClient";

interface EmployeeStat {
  userId: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  assignedConversations: number;
  repliedConversations: number;
  unrepliedConversations: number;
  incomingMessages: number;
  outgoingMessages: number;
  responseRate: number;
  avgResponseTimeMs: number | null;
  avgResponseTimeMin: number | null;
}

interface AnalyticsSummary {
  totalIncomingConversations: number;
  totalOutgoingConversations: number;
  totalAssigned: number;
  totalReplied: number;
  totalUnreplied: number;
  totalIncomingMessages: number;
  totalOutgoingMessages: number;
  overallResponseRate: number;
  overallAvgResponseTimeMs: number | null;
  overallAvgResponseTimeMin: number | null;
  activeEmployees: number;
}

interface AnalyticsResponse {
  success: boolean;
  period: { start: string; end: string };
  summary: AnalyticsSummary;
  employees: EmployeeStat[];
}

const WhatsAppEmployeeAnalytics: React.FC<{
  companyId?: string;
}> = ({ companyId }) => {
  const { t } = useTranslation();
  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFilter, setDateFilter] = useState<"today" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params: Record<string, string> = {};
      if (dateFilter === "custom" && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await apiClient.get(
        "/whatsapp-inbox/employee-analytics",
        withCompanyConfig({ params }),
      );
      setData(res.data);
    } catch {
      toast.error("فشل في تحميل تحليلات الموظفين");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, startDate, endDate]);

  const summary = data?.summary;
  const employees = data?.employees || [];

  const sortedEmployees = useMemo(() => {
    return [...employees].sort(
      (a, b) => b.assignedConversations - a.assignedConversations,
    );
  }, [employees]);

  return (
    <WhatsAppPageShell
      title="تحليل أداء الموظفين"
      description="متابعة إحصائيات المحادثات والرسائل وأوقات الرد لكل موظف"
      icon={BarChart3}
      eyebrow="WhatsApp Analytics"
      actions={
        <>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="size-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 w-auto text-xs"
                />
              </div>
              <span className="text-xs text-muted-foreground">إلى</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-auto text-xs"
              />
            </div>
          )}
          <Button
            variant={dateFilter === "today" ? "outline" : "default"}
            size="sm"
            onClick={() =>
              setDateFilter((p) => (p === "today" ? "custom" : "today"))
            }
          >
            <Calendar className="size-4" />
            {dateFilter === "today" ? "اليوم" : "نطاق مخصص"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            تحديث
          </Button>
        </>
      }
    >
      {/* Summary Metrics */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <WhatsAppMetricCard
              label="محادثات واردة"
              value={summary.totalIncomingConversations}
              hint="العميل هو اللي بدأها"
              icon={Inbox}
              tone="primary"
            />
            <WhatsAppMetricCard
              label="محادثات صادرة"
              value={summary.totalOutgoingConversations}
              hint="بدأت من الموظف"
              icon={Send}
              tone="info"
            />
            <WhatsAppMetricCard
              label="مردود عليها"
              value={summary.totalReplied}
              hint={`من ${summary.totalIncomingConversations} واردة`}
              icon={MessageSquare}
              tone="success"
            />
            <WhatsAppMetricCard
              label="غير مردود عليها"
              value={summary.totalUnreplied}
              hint="بحاجة لمتابعة"
              icon={UserX}
              tone="danger"
            />
            <WhatsAppMetricCard
              label="رسائل واردة"
              value={summary.totalIncomingMessages}
              hint="من العملاء"
              icon={MessageCircle}
              tone="info"
            />
            <WhatsAppMetricCard
              label="رسائل صادرة"
              value={summary.totalOutgoingMessages}
              hint="من الموظفين"
              icon={Send}
              tone="primary"
            />
            <WhatsAppMetricCard
              label="نسبة الرد"
              value={`${summary.overallResponseRate}%`}
              hint="من المحادثات الواردة"
              icon={TrendingUp}
              tone={summary.overallResponseRate >= 70 ? "success" : "danger"}
            />
            <WhatsAppMetricCard
              label="متوسط وقت الرد"
              value={
                summary.overallAvgResponseTimeMin != null
                  ? `${summary.overallAvgResponseTimeMin} دقيقة`
                  : "—"
              }
              hint="من أول رسالة العميل"
              icon={Clock}
              tone="info"
            />
          </div>

          {/* Employee Breakdown Table */}
          <WhatsAppSurfaceCard
            title="توزيع الأداء على الموظفين"
            description="تفاصيل المحادثات والرسائل وأوقات الرد لكل موظف"
            action={
              <Badge variant="outline">
                <Users className="size-3.5" />
                {summary.activeEmployees} موظف
              </Badge>
            }
          >
            {sortedEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  لا توجد بيانات للموظفين في هذه الفترة
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead className="text-center">المحادثات المُعينة</TableHead>
                      <TableHead className="text-center">رُدّ عليها</TableHead>
                      <TableHead className="text-center">لم تُردّ</TableHead>
                      <TableHead className="text-center">رسائل صادرة</TableHead>
                      <TableHead className="text-center">نسبة الرد</TableHead>
                      <TableHead className="text-center">متوسط وقت الرد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmployees.map((emp) => (
                      <TableRow key={emp.userId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {emp.userName?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{emp.userName}</p>
                              {emp.userEmail && (
                                <p className="text-xs text-muted-foreground">
                                  {emp.userEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {emp.assignedConversations}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-success/15 text-[color:var(--color-success)]">
                            <UserCheck className="size-3" />
                            {emp.repliedConversations}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.unrepliedConversations > 0 ? (
                            <Badge className="bg-destructive/15 text-[color:var(--color-destructive)]">
                              <UserX className="size-3" />
                              {emp.unrepliedConversations}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-medium">
                            {emp.outgoingMessages}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              emp.responseRate >= 70
                                ? "border-success/30 text-[color:var(--color-success)]"
                                : emp.responseRate >= 40
                                  ? "border-warning/30 text-[color:var(--color-warning)]"
                                  : "border-destructive/30 text-[color:var(--color-destructive)]"
                            }
                          >
                            {emp.responseRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {emp.avgResponseTimeMin != null ? (
                            <span className="text-sm">
                              {emp.avgResponseTimeMin} دقيقة
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </WhatsAppSurfaceCard>
        </>
      ) : null}
    </WhatsAppPageShell>
  );
};

export default WhatsAppEmployeeAnalytics;