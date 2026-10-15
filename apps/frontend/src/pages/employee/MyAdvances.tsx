import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { tToast } from "../../utils/i18n-toast";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Loader2,
  Coins,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { useDateFormat } from "../../hooks/useDateFormat";
import { AdvanceRequestDialog } from "./AdvanceRequestDialog";

interface AdvanceItem {
  id: string;
  amount: number;
  reason: string;
  status: "APPROVED" | "REJECTED" | "PENDING" | string;
  repaymentType: string;
  installmentsCount?: number;
  createdAt: string;
}

const MyAdvances: React.FC = () => {
  const { formatDate } = useDateFormat();
  const [advances, setAdvances] = useState<AdvanceItem[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeId = async () => {
      try {
        const response = await api.get("/hr/employees/me");
        if (response.data && response.data.employee) {
          setEmployeeId(response.data.employee.userId || response.data.employee.id);
        }
      } catch (error) {
        console.error("Failed to fetch employee ID", error);
      }
    };
    fetchEmployeeId();
    fetchAdvances();
  }, []);

  const fetchAdvances = async () => {
    try {
      setLoadingAdvances(true);
      const response = await api.get("/hr/advances/my");
      if (response.data && response.data.success) {
        setAdvances(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching advances:", error);
      tToast.error("MyAdvances.failed_fetch_10f6");
    } finally {
      setLoadingAdvances(false);
    }
  };

  const filteredAdvances = useMemo(() => {
    if (selectedStatus === "ALL") return advances;
    return advances.filter((a) => a.status === selectedStatus);
  }, [advances, selectedStatus]);

  const stats = useMemo(() => {
    const total = advances.length;
    const approved = advances.filter((a) => a.status === "APPROVED").length;
    const pending = advances.filter((a) => a.status === "PENDING").length;
    const totalAmount = advances.reduce((acc, a) => acc + (a.amount || 0), 0);
    return { total, approved, pending, totalAmount };
  }, [advances]);

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              السلف المالية
            </h1>
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground"
            >
              {filteredAdvances.length} طلب
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة سجل السلف المالية الشخصية وتقديم طلبات الصرف وفق سياسة الشركة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAdvances}
            className="h-8 gap-1.5 text-xs border-border/70"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            تحديث
          </Button>

          <AdvanceRequestDialog
            employeeId={employeeId}
            onSuccess={fetchAdvances}
          />
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الطلبات</span>
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.total}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">طلب سلفة مسجل</div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>تمت الموافقة</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">
            {stats.approved}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">سلفة معتمدة ومصروفة</div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>قيد المراجعة</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-500">
            {stats.pending}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">بانتظار قرار الإدارة</div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي المبالغ</span>
            <CreditCard className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.totalAmount.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground mr-1">ج.م</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">إجمالي قيمة السلف</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-muted/20 w-fit">
        {[
          { key: "ALL", label: "الكل" },
          { key: "APPROVED", label: "معتمدة" },
          { key: "PENDING", label: "قيد الانتظار" },
          { key: "REJECTED", label: "مرفوضة" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedStatus === tab.key
                ? "bg-card text-foreground shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Advances Table Single Surface */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="p-3 px-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              سجل طلبات السلف المالية
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {filteredAdvances.length} طلب
          </span>
        </div>

        {loadingAdvances ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            جاري تحميل سجل السلف...
          </div>
        ) : filteredAdvances.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <Coins className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-foreground">لا توجد طلبات سلف مسجلة</p>
            <p className="text-muted-foreground">يمكنك تقديم طلب سلفة جديد في أي وقت بالضغط على الزر أعلاه</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-right text-xs">تاريخ الطلب</TableHead>
                  <TableHead className="text-right text-xs">المبلغ المطلوب</TableHead>
                  <TableHead className="text-right text-xs">السبب والتبرير</TableHead>
                  <TableHead className="text-right text-xs">طريقة السداد</TableHead>
                  <TableHead className="text-right text-xs">حالة الاعتماد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvances.map((advance) => (
                  <TableRow key={advance.id} className="border-border/60 hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {formatDate(advance.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs font-bold font-mono tabular-nums text-foreground">
                      {advance.amount.toLocaleString()} ج.م
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={advance.reason}>
                      {advance.reason}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {advance.repaymentType === "INSTALLMENTS"
                        ? `تقسيط على ${advance.installmentsCount || 1} أشهر`
                        : "خصم دفعة واحدة"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 font-medium ${
                          advance.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : advance.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {advance.status === "APPROVED"
                          ? "تمت الموافقة"
                          : advance.status === "REJECTED"
                            ? "مرفوض"
                            : "قيد المراجعة"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAdvances;
