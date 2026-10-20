import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/exportHelpers";
import type { DentalLabCase } from "../../shared";
import {
  CASE_STATUSES,
  fetchPanLabelPdf,
  fetchWorkOrderPdf,
  fmtDate,
  permanentDeleteCase,
  restoreCase,
  trashCase,
  uploadCaseAttachment,
  uploadCaseAttachments,
} from "../../shared";

export interface UseDentalCaseActionsOptions {
  cases: DentalLabCase[] | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  setCreateOpen: (val: boolean) => void;
  setEditingCase: (val: DentalLabCase | null) => void;
}

export function useDentalCaseActions({
  cases,
  refresh,
  setCreateOpen,
  setEditingCase,
}: UseDentalCaseActionsOptions) {
  const { t } = useTranslation();
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleExportCasesExcel = () => {
    if (!cases || cases.length === 0) {
      toast.error("لا توجد حالات لتصديرها");
      return;
    }
    const columns = [
      { key: "caseNumber", label: "رقم الحالة" },
      { key: "receivedDate", label: "تاريخ الاستلام" },
      { key: "dueDate", label: "تاريخ التسليم" },
      { key: "doctorName", label: "العيادة / الطبيب" },
      { key: "patientName", label: "المريض" },
      { key: "workTypeName", label: "نوع الشغل" },
      { key: "shade", label: "اللون (Shade)" },
      { key: "teeth", label: "الأسنان" },
      { key: "unitsCount", label: "عدد الوحدات" },
      { key: "statusLabel", label: "مرحلة العمل" },
      { key: "priorityLabel", label: "الأولوية" },
      { key: "total", label: "الإجمالي (ج.م)" },
      { key: "paid", label: "المدفوع (ج.م)" },
      { key: "remaining", label: "المتبقي (ج.م)" },
      { key: "paymentStatusLabel", label: "حالة السداد" },
    ];
    const data = cases.map((c) => ({
      caseNumber: c.caseNumber || "—",
      receivedDate: fmtDate(c.receivedDate),
      dueDate: fmtDate(c.dueDate),
      doctorName: c.doctorName || "—",
      patientName: c.patientName || "—",
      workTypeName: c.workTypeName || "—",
      shade: c.shade || "—",
      teeth: c.teeth || "—",
      unitsCount: c.unitsCount || 1,
      statusLabel: CASE_STATUSES.find((s) => s.id === c.status)?.label || c.status,
      priorityLabel:
        c.priority === "URGENT" ? "مستعجل" : c.priority === "STAT" ? "طارئ" : "عادي",
      total: c.total ?? 0,
      paid: c.paid ?? 0,
      remaining: c.remaining ?? 0,
      paymentStatusLabel:
        c.paymentStatus === "PAID"
          ? "مسدد بالكامل"
          : c.paymentStatus === "PARTIAL"
          ? "مسدد جزئياً"
          : "غير مسدد",
    }));
    exportToExcel(
      data,
      columns,
      `حالات_معمل_الأسنان_${new Date().toISOString().split("T")[0]}.xlsx`,
      "الحالات"
    );
    toast.success("تم تصدير ملف الإكسيل بنجاح");
  };

  const handleSaved = () => {
    setCreateOpen(false);
    setEditingCase(null);
    refresh({ silent: true });
  };

  const handleTrashCase = async (c: DentalLabCase) => {
    if (actionBusyId) return;
    if (
      !window.confirm(
        `هل أنت متأكد من نقل الحالة "${c.caseNumber || c.patientName}" إلى سلة المهملات؟`
      )
    ) {
      return;
    }
    setActionBusyId(c.id);
    try {
      await trashCase(c.id);
      toast.success("تم نقل الحالة إلى سلة المهملات بنجاح");
      refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل نقل الحالة إلى سلة المهملات");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRestoreCase = async (c: DentalLabCase) => {
    if (actionBusyId) return;
    setActionBusyId(c.id);
    try {
      await restoreCase(c.id);
      toast.success("تمت استعادة الحالة بنجاح");
      refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت استعادة الحالة");
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePermanentDelete = async (c: DentalLabCase) => {
    if (actionBusyId) return;
    if (
      !window.confirm(
        `تحذير: هل أنت متأكد من الحذف النهائي للحالة "${
          c.caseNumber || c.patientName
        }"؟ هذا الإجراء لا يمكن التراجع عنه نهائياً وسيتم حذف سجلاتها.`
      )
    ) {
      return;
    }
    setActionBusyId(c.id);
    try {
      await permanentDeleteCase(c.id);
      toast.success("تم حذف الحالة نهائياً من النظام");
      refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف النهائي");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleUpload = async (c: DentalLabCase, e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = "";
    if (!fileList || fileList.length === 0 || uploadingId === c.id) return;
    setUploadingId(c.id);
    try {
      if (fileList.length === 1 && fileList[0]) {
        await uploadCaseAttachment(c.id, fileList[0]);
      } else {
        await uploadCaseAttachments(c.id, Array.from(fileList));
      }
      toast.success(t("dentalLab.cases.filesUploaded", { count: fileList.length }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dentalLab.common.noData"));
    } finally {
      setUploadingId(null);
    }
  };

  const handlePrintPanLabel = async (c: DentalLabCase) => {
    try {
      toast.info(`جاري تجهيز تيكت الصينية للحالة ${c.caseNumber || c.id.slice(0, 8)}...`);
      const blob = await fetchPanLabelPdf(c.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `PanLabel-${c.caseNumber || c.id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل تيكت الصينية");
    }
  };

  const handlePrintWorkOrder = async (c: DentalLabCase) => {
    try {
      toast.info(`جاري تجهيز أمر الشغل للحالة ${c.caseNumber || c.id.slice(0, 8)}...`);
      const blob = await fetchWorkOrderPdf(c.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `WorkOrder-${c.caseNumber || c.id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل أمر الشغل");
    }
  };

  const isCaseOverdue = (c: DentalLabCase) => {
    if (!c.dueDate || c.isDeleted || ["DELIVERED", "CLOSED"].includes(c.status)) return false;
    return new Date(c.dueDate) < new Date();
  };

  const getDaysOverdue = (c: DentalLabCase) => {
    if (!c.dueDate) return 0;
    const diff = Date.now() - new Date(c.dueDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  return {
    actionBusyId,
    uploadingId,
    handleExportCasesExcel,
    handleSaved,
    handleTrashCase,
    handleRestoreCase,
    handlePermanentDelete,
    handleUpload,
    handlePrintPanLabel,
    handlePrintWorkOrder,
    isCaseOverdue,
    getDaysOverdue,
  };
}
