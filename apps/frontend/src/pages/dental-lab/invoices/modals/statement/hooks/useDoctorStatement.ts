import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  fetchDoctorStatement,
  fetchDoctorStatementPdf,
  fmtDate,
  type DentalLabDoctor,
  type DoctorStatement,
} from "../../../../shared";
import { shareStatementWhatsApp } from "../../../types/dentalInvoicesTypes";
import { exportToExcel } from "@/utils/exportHelpers";

interface UseDoctorStatementOptions {
  doctor: DentalLabDoctor;
}

export function useDoctorStatement({ doctor }: UseDoctorStatementOptions) {
  const [statement, setStatement] = useState<DoctorStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"invoices" | "cases">("invoices");
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadStatement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDoctorStatement({
        doctorId: doctor.id,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setStatement(data);
    } catch {
      toast.error("فشل جلب كشف الحساب");
    } finally {
      setLoading(false);
    }
  }, [doctor.id, from, to]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setDownloadingPdf(true);
    try {
      const blob = await fetchDoctorStatementPdf({
        doctorId: doctor.id,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (doctor.name || "doctor").replace(/\s+/g, "_");
      a.download = `كشف_حساب_${safeName}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل ملف كشف الحساب الرسمي بنجاح");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تنزيل ملف PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }, [doctor.id, doctor.name, from, to]);

  const handleExportStatementExcel = useCallback(() => {
    if (!statement?.invoices || statement.invoices.length === 0) {
      toast.error("لا توجد فواتير لتصديرها في هذه الفترة");
      return;
    }
    const columns = [
      { key: "doctorName", label: "اسم الطبيب" },
      { key: "clinicName", label: "العيادة" },
      { key: "caseNumber", label: "رقم الحالة / أمر الشغل" },
      { key: "patientName", label: "اسم المريض" },
      { key: "workTypeName", label: "نوع الشغل / التركيبة" },
      { key: "unitsCount", label: "عدد الوحدات" },
      { key: "invoiceNumber", label: "رقم الفاتورة" },
      { key: "createdAt", label: "تاريخ الفاتورة" },
      { key: "total", label: "القيمة الإجمالية (ج.م)" },
      { key: "paid", label: "المدفوع (ج.م)" },
      { key: "remaining", label: "المتبقي (ج.م)" },
      { key: "statusLabel", label: "حالة الفاتورة" },
    ];
    const data: any[] = statement.invoices.map((inv) => ({
      doctorName: inv.doctorName || inv.doctor?.name || doctor.name || "—",
      clinicName: inv.clinicName || inv.doctor?.clinicName || doctor.clinicName || "—",
      caseNumber: inv.caseNumber || inv.case?.caseNumber || "—",
      patientName: inv.patientName || inv.case?.patientName || "—",
      workTypeName: inv.workTypeName || inv.case?.workTypeName || "—",
      unitsCount: inv.unitsCount ?? inv.case?.unitsCount ?? 1,
      invoiceNumber: inv.invoiceNumber || inv.id?.slice(0, 8),
      createdAt: fmtDate(inv.createdAt),
      total: inv.total ?? 0,
      paid: inv.paid ?? 0,
      remaining: inv.remaining ?? 0,
      statusLabel:
        inv.status === "PAID"
          ? "مدفوعة بالكامل"
          : inv.status === "PARTIAL"
          ? "سداد جزئي"
          : inv.status === "VOID"
          ? "ملغاة"
          : "غير مسددة",
    }));

    const totalUnits = data.reduce(
      (acc, r) => acc + (typeof r.unitsCount === "number" ? r.unitsCount : 1),
      0
    );
    const totalInvoiced = data.reduce(
      (acc, r) => acc + (typeof r.total === "number" ? r.total : 0),
      0
    );
    const totalPaid = data.reduce(
      (acc, r) => acc + (typeof r.paid === "number" ? r.paid : 0),
      0
    );
    const totalRemaining = data.reduce(
      (acc, r) => acc + (typeof r.remaining === "number" ? r.remaining : 0),
      0
    );

    data.push({
      doctorName: `الإجمالي (${data.length} كارتة)`,
      clinicName: "",
      caseNumber: "",
      patientName: "",
      workTypeName: "",
      unitsCount: totalUnits,
      invoiceNumber: "",
      createdAt: "",
      total: totalInvoiced,
      paid: totalPaid,
      remaining: totalRemaining,
      statusLabel: "",
    });

    exportToExcel(
      data,
      columns,
      `كشف_حساب_${(doctor.name || "doctor").replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`,
      "كشف الحساب"
    );
    toast.success("تم تصدير كشف الحساب إلى Excel بنجاح مع كافة تفاصيل الحالات والمرضى");
  }, [statement?.invoices, doctor.name, doctor.clinicName]);

  const handleShareWhatsApp = useCallback(() => {
    shareStatementWhatsApp(doctor.name, doctor.phone, statement?.totals || {});
  }, [doctor.name, doctor.phone, statement?.totals]);

  const handleClearDates = useCallback(() => {
    setFrom("");
    setTo("");
  }, []);

  return {
    statement,
    loading,
    from,
    setFrom,
    to,
    setTo,
    tab,
    setTab,
    downloadingPdf,
    handlePrint,
    handleDownloadPdf,
    handleExportStatementExcel,
    handleShareWhatsApp,
    handleClearDates,
    reload: loadStatement,
  };
}
