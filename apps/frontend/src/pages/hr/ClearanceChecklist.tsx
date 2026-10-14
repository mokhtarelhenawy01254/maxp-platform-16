import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  User,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import api from "../../services/api";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Badge } from "../../components/ui/badge";

interface ClearanceItem {
  id: string;
  itemName: string;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
}

const ClearanceChecklist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClearanceItem[]>([]);
  const [resignation, setResignation] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resRes, checklistRes] = await Promise.all([
        api.get(`/hr/resignations/${id}`),
        api.get(`/hr/resignations/${id}/clearance`),
      ]);
      setResignation(resRes.data.resignation);
      setItems(checklistRes.data.items || []);
    } catch (error) {
      console.error("Error fetching clearance data:", error);
      tToast.error("ClearanceChecklist.failed_load_eca3");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/hr/resignations/clearance/${itemId}`, {
        isCompleted: !currentStatus,
      });

      setItems(
        items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                isCompleted: !currentStatus,
                completedAt: !currentStatus ? new Date().toISOString() : null,
              }
            : item,
        ),
      );

      toast.success(
        currentStatus ? "تم إلغاء الاكتمال" : "تم تحديد البند كمكتمل",
      );
    } catch (error) {
      console.error("Error updating item:", error);
      tToast.error("ClearanceChecklist.failed_update_a0ad");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">
            جاري تحميل قائمة إخلاء الطرف...
          </p>
        </div>
      </div>
    );
  }

  if (!resignation) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <div className="max-w-md mx-auto p-6 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">
            طلب الاستقالة غير موجود أو تم حذفه
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/hr/resignations")}
          >
            العودة للاستقالات
          </Button>
        </div>
      </div>
    );
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const pendingCount = items.length - completedCount;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const isFinished = items.length > 0 && completedCount === items.length;

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 border border-border/60 hover:bg-muted/40"
            onClick={() => navigate("/hr/resignations")}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                قائمة إخلاء الطرف
              </h1>
              <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 font-medium ${
                  isFinished
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                }`}
              >
                {isFinished ? "مكتمل بالكامل" : "قيد التنفيذ"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <User className="h-3.5 w-3.5" />
              <span>
                {resignation.employee?.firstName} {resignation.employee?.lastName}
              </span>
              <span>•</span>
              <span>{resignation.employee?.position?.title || "موظف"}</span>
              {resignation.employee?.department?.name && (
                <>
                  <span>•</span>
                  <span>{resignation.employee.department.name}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="h-8 gap-1.5 text-xs border-border/70"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي البنود</span>
            <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {items.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            بنود الإبراء والتسليم
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>تم تسليمه / منجز</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">
            {completedCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            بند مستوفى الإجراءات
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>متبقي للتسليم</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-500">
            {pendingCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            بند قيد الانتظار
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>نسبة الإنجاز</span>
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {Math.round(progress)}%
          </div>
          <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-300 ${
                isFinished ? "bg-emerald-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Single Surface */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="p-3 px-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              بنود تسليم العهد وإخلاء المسؤولية
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {completedCount} من {items.length} منجز
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            لا توجد بنود مخصصة في قائمة إخلاء الطرف لهذا الموظف
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 px-4 flex items-start gap-3 transition-colors ${
                  item.isCompleted
                    ? "bg-emerald-500/[0.02]"
                    : "hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={item.isCompleted}
                  onCheckedChange={() =>
                    handleToggleItem(item.id, item.isCompleted)
                  }
                  className="mt-1 h-4 w-4 rounded border-border/80 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-medium ${
                        item.isCompleted
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.itemName}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-medium ${
                        item.isCompleted
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-muted/40 text-muted-foreground border-border/60"
                      }`}
                    >
                      {item.isCompleted ? "منجز" : "معلق"}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.description}
                    </p>
                  )}
                  {item.isCompleted && item.completedAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        تم الاستيفاء بتاريخ{" "}
                        {new Date(item.completedAt).toLocaleDateString("ar-EG")}
                      </span>
                      {item.completedBy && <span>بواسطة {item.completedBy}</span>}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-[11px] text-muted-foreground mt-1 bg-muted/30 p-1.5 rounded border border-border/50">
                      ملاحظة: {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClearanceChecklist;
