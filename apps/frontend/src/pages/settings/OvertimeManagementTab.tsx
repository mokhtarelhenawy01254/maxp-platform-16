import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Building2,
  RefreshCw,
  Search,
} from "lucide-react";

interface OvertimeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface OvertimeSession {
  id: string;
  companyId: string;
  userId: string;
  deviceId: string | null;
  date: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number;
  reason: string;
  taskSummary: string | null;
  status: "ACTIVE" | "PENDING" | "APPROVED" | "REJECTED";
  deviceType: "OFFICE" | "PERSONAL";
  approvedBy: string | null;
  createdAt: string;
  user?: OvertimeUser;
}

export const OvertimeManagementTab: React.FC = () => {
  const [sessions, setSessions] = useState<OvertimeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await apiClient.get<any>("/api/v1/shifts/overtime", { params });
      if (res.data?.success) {
        setSessions(res.data.sessions || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل تحميل سجلات العمل الإضافي");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleUpdateStatus = async (sessionId: string, newStatus: "APPROVED" | "REJECTED") => {
    try {
      setActionId(sessionId);
      const res = await apiClient.patch<any>(`/api/v1/shifts/overtime/${sessionId}/status`, {
        status: newStatus,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "تم تحديث حالة الوردية الإضافية");
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل تحديث الحالة");
    } finally {
      setActionId(null);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const name = `${s.user?.firstName || ""} ${s.user?.lastName || ""}`.toLowerCase();
    const reason = (s.reason || "").toLowerCase();
    return name.includes(q) || reason.includes(q);
  });

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${mins} دقيقة`;
    return `${hours} س و ${mins} د`;
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border border-border/40">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالموظف أو السبب..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-background border border-border/60 rounded-md outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-1">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted border border-border/40"
                }`}
              >
                {st === "ALL" && "الكل"}
                {st === "PENDING" && "بانتظار الاعتماد"}
                {st === "APPROVED" && "معتمدة"}
                {st === "REJECTED" && "مرفوضة"}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSessions}
          disabled={loading}
          className="h-8 gap-1.5 text-xs self-end sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث</span>
        </Button>
      </div>

      {/* Sessions Table */}
      <div className="rounded-lg border border-border/50 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3 font-semibold">الموظف</th>
                <th className="py-2.5 px-3 font-semibold">التاريخ والمدة</th>
                <th className="py-2.5 px-3 font-semibold">نوع الجهاز</th>
                <th className="py-2.5 px-3 font-semibold">سبب العمل الإضافي</th>
                <th className="py-2.5 px-3 font-semibold">الحالة</th>
                <th className="py-2.5 px-3 font-semibold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading && sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    جاري تحميل سجلات العمل الإضافي...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    لا توجد سجلات عمل إضافي مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-muted/15 transition-colors">
                    {/* Employee */}
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground">
                          {session.user
                            ? `${session.user.firstName || ""} ${session.user.lastName || ""}`.trim()
                            : "موظف غير مسمّى"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{session.user?.email}</span>
                      </div>
                    </td>

                    {/* Date & Duration */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-foreground font-semibold tabular-nums">
                          <Clock className="h-3 w-3 text-primary" />
                          <span>{formatDuration(session.durationSec)}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {new Date(session.startedAt).toLocaleDateString("ar-EG")} —{" "}
                          {new Date(session.startedAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Device Type */}
                    <td className="py-2.5 px-3">
                      {session.deviceType === "OFFICE" ? (
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[11px]"
                        >
                          <Building2 className="h-3 w-3" />
                          <span>مكتب</span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 text-[11px]"
                        >
                          <Laptop className="h-3 w-3" />
                          <span>شخصي (خارج المقر)</span>
                        </Badge>
                      )}
                    </td>

                    {/* Reason & Tasks */}
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground font-medium truncate" title={session.reason}>
                          {session.reason}
                        </span>
                        {session.taskSummary && (
                          <span
                            className="text-[10px] text-muted-foreground line-clamp-1"
                            title={session.taskSummary}
                          >
                            {session.taskSummary}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      {session.status === "PENDING" && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px]">
                          بانتظار الاعتماد
                        </Badge>
                      )}
                      {session.status === "APPROVED" && (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[10px]">
                          معتمدة
                        </Badge>
                      )}
                      {session.status === "REJECTED" && (
                        <Badge variant="outline" className="border-rose-500/40 text-rose-500 bg-rose-500/10 text-[10px]">
                          مرفوضة
                        </Badge>
                      )}
                      {session.status === "ACTIVE" && (
                        <Badge variant="outline" className="border-blue-500/40 text-blue-500 bg-blue-500/10 text-[10px] animate-pulse">
                          نشطة حالياً
                        </Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      {session.status === "PENDING" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                            disabled={actionId === session.id}
                            onClick={() => handleUpdateStatus(session.id, "APPROVED")}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>اعتماد</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
                            disabled={actionId === session.id}
                            onClick={() => handleUpdateStatus(session.id, "REJECTED")}
                          >
                            <XCircle className="h-3 w-3" />
                            <span>رفض</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {session.status === "APPROVED" ? "تم الاعتماد" : "تم الرفض"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OvertimeManagementTab;
