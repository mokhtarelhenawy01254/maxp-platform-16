import React, { useState, useEffect } from "react";
import { Clock, Calendar, CheckCircle2, AlertCircle, Send, ShieldCheck, FileCheck } from "lucide-react";
import { toast } from "sonner";
import api from "../../../services/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface AttendanceRegularizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string;
  initialTime?: string;
  initialAction?: "CHECK_IN" | "CHECK_OUT";
  onSuccess?: () => void;
}

const COMMON_REASONS = [
  "الكمبيوتر المكتبي لا يحتوي على GPS ودقة الموقع ضعيفة",
  "مشكلة أو انقطاع في شبكة واي فاي الفرع عند الحضور",
  "البصمة لم تُسجل على الموقع رغم تواجدي في مقر العمل في الموعد",
  "فشل البصمة بسبب دوران عنوان IP لراوتر الفرع",
];

export const AttendanceRegularizationDialog: React.FC<AttendanceRegularizationDialogProps> = ({
  open,
  onOpenChange,
  initialDate,
  initialTime,
  initialAction = "CHECK_IN",
  onSuccess,
}) => {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getCurrentTimeStr = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const [attendanceDate, setAttendanceDate] = useState(initialDate || getTodayStr());
  const [requestedTime, setRequestedTime] = useState(initialTime || getCurrentTimeStr());
  const [action, setAction] = useState<"CHECK_IN" | "CHECK_OUT">(initialAction);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAttendanceDate(initialDate || getTodayStr());
      setRequestedTime(initialTime || getCurrentTimeStr());
      setAction(initialAction);
      setReason("");
      setErrorMessage(null);
      setSubmitting(false);
    }
  }, [open, initialDate, initialTime, initialAction]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!attendanceDate) {
      setErrorMessage("يرجى تحديد تاريخ البصمة");
      return;
    }
    if (!requestedTime) {
      setErrorMessage("يرجى تحديد وقت الوصول أو الانصراف");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("يرجى كتابة سبب طلب اعتماد البصمة بالتفصيل");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const res = await api.post("/hr/attendance/exception-requests", {
        attendanceDate,
        requestedTime: requestedTime.trim(),
        action,
        reason: reason.trim(),
      });

      if (res.status === 200 || res.status === 201) {
        toast.success("تم إرسال طلب اعتماد البصمة بنجاح ✅", {
          description: "تم توثيق طلبك في سجل الطلبات المعتمدة للإدارة لاعتماده بضغطة زر.",
          duration: 6000,
        });
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(res.data?.error || "فشل إرسال الطلب");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "حدث خطأ أثناء إرسال الطلب";
      setErrorMessage(msg);
      toast.error("تعذر إرسال الطلب — السبب: " + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg text-right" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                طلب بصمة معتمدة (اعتماد حضور يدوي)
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                سجل وقت وصولك الفعلي والسبب ليقوم المالك أو الإدارة باعتماده بضغطة زر بدلاً من المراسلات اليدوية.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* نوع البصمة */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              نوع البصمة
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction("CHECK_IN")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  action === "CHECK_IN"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                بصمة حضور (وصول)
              </button>
              <button
                type="button"
                onClick={() => setAction("CHECK_OUT")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  action === "CHECK_OUT"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                بصمة انصراف (مغادرة)
              </button>
            </div>
          </div>

          {/* التاريخ ووقت البصمة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تاريخ اليوم
              </label>
              <div className="relative">
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="text-xs h-9 text-right"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                وقت البصمة الفعلي
              </label>
              <div className="relative">
                <Input
                  type="time"
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  className="text-xs h-9 text-right"
                  required
                />
              </div>
            </div>
          </div>

          {/* سبب الطلب واقتراحات سريعة */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                سبب الطلب
              </label>
              <span className="text-[11px] text-gray-400">اختر سبباً شائعاً أو اكتب سبباً مخصصاً</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_REASONS.map((cr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(cr)}
                  className="text-[11px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  + {cr}
                </button>
              ))}
            </div>

            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب عدم تسجيل البصمة بشكل طبيعي (مثال: كنت متواجداً في المكتب وجهاز الكمبيوتر رفض بسبب دقة الموقع)..."
              rows={3}
              className="text-xs resize-none"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>جاري الإرسال...</>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> إرسال للمالك للاعتماد
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
