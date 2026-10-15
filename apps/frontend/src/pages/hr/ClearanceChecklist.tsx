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
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import api from "../../services/api";

interface ClearanceItem {
  id: string;
  itemName: string;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
}

export const ClearanceChecklist: React.FC = () => {
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
      setResignation(resRes.data?.resignation || resRes.data?.data || { id, employee: { firstName: "الموظف", lastName: "" } });
      const rawItems = checklistRes.data?.items || checklistRes.data?.data?.items || checklistRes.data?.data || [];
      setItems(Array.isArray(rawItems) ? rawItems.map((it: any) => ({
        id: it.id,
        itemName: it.itemName || it.title || "بند تسليم",
        description: it.description || "",
        isCompleted: it.isCompleted ?? it.status === "COMPLETED",
        completedAt: it.completedAt || null,
        completedBy: it.completedBy || null,
        notes: it.notes || null,
      })) : []);
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
        currentStatus ? "تم إلغاء الاستيفاء" : "تم تحديد البند كمستوفى بنجاح",
      );
    } catch (error) {
      console.error("Error updating item:", error);
      tToast.error("ClearanceChecklist.failed_update_a0ad");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="mt-2 text-xs text-muted-foreground">جاري تحميل قائمة إخلاء الطرف...</p>
      </div>
    );
  }

  if (!resignation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center" dir="rtl">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm font-semibold text-foreground">
          طلب الاستقالة غير موجود أو تم حذفه
        </p>
        <button
          type="button"
          onClick={() => navigate("/hr/resignations")}
          className="mt-3 px-3 py-1.5 text-xs rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-colors"
        >
          العودة للاستقالات
        </button>
      </div>
    );
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const pendingCount = items.length - completedCount;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const isFinished = items.length > 0 && completedCount === items.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background" dir="rtl">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/hr/resignations")}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع للاستقالات"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
                إخلاء الطرف وتصفية العهد
              </h1>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                  isFinished
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                {isFinished ? "مكتمل بالكامل" : "قيد التنفيذ"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
              <User className="h-3 w-3" />
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-[0.97]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>تحديث</span>
          </button>
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        
        {/* Strip 1: Telemetry Ribbon */}
        <section className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-muted/10">
          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>إجمالي البنود</span>
              <CheckSquare className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
              {items.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">بنود تسليم العهد</p>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>تم استيفاؤه</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {completedCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">بند مكتمل الإجراءات</p>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>متبقي للتسليم</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {pendingCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">بند قيد الانتظار</p>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md border border-border/60 bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>نسبة الإنجاز</span>
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="mt-1 text-base sm:text-lg font-bold font-mono text-foreground tabular-nums">
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
        </section>

        {/* Strip 2: Checklist Items */}
        <section className="p-3 sm:p-4">
          <div className="rounded-md border border-border/70 bg-card overflow-hidden">
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
                      item.isCompleted ? "bg-emerald-500/[0.02]" : "hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => handleToggleItem(item.id, item.isCompleted)}
                      className="mt-1 h-4 w-4 rounded border-border/80 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-xs sm:text-sm font-medium ${
                            item.isCompleted
                              ? "text-muted-foreground line-through"
                              : "text-foreground font-semibold"
                          }`}
                        >
                          {item.itemName}
                        </h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            item.isCompleted
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-muted/40 text-muted-foreground border border-border/60"
                          }`}
                        >
                          {item.isCompleted ? "منجز" : "معلق"}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {item.isCompleted && item.completedAt && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>
                            تم الاستيفاء بتاريخ {new Date(item.completedAt).toLocaleDateString("ar-EG")}
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
        </section>

      </main>
    </div>
  );
};

export default ClearanceChecklist;
