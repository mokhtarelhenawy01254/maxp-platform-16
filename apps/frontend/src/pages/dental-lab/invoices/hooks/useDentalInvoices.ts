import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/exportHelpers";
import type {
  DentalInvoice,
  DentalLabCase,
  DentalLabDoctor,
  UninvoicedSummaryResult,
} from "../../shared";
import {
  fetchCases,
  fetchDoctors,
  fetchInvoices,
  fetchUninvoicedSummary,
  fmtDate,
  voidInvoice,
} from "../../shared";

export function useDentalInvoices() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalInvoice[]>([]);
  const [fetchedCount, setFetchedCount] = useState<number | null>(null);
  const [cases, setCases] = useState<DentalLabCase[]>([]);
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & selection
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [uninvoicedSummary, setUninvoicedSummary] = useState<UninvoicedSummaryResult | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<DentalInvoice | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<DentalInvoice | null>(null);
  const [statementDoctor, setStatementDoctor] = useState<DentalLabDoctor | null>(null);
  const [bulkPaymentDoctor, setBulkPaymentDoctor] = useState<DentalLabDoctor | null>(null);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementDoctorId, setSettlementDoctorId] = useState<string>("");

  // Compute date ranges
  const dateParams = useMemo(() => {
    if (datePreset === "THIS_MONTH") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { from };
    }
    if (datePreset === "LAST_MONTH") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      return { from, to };
    }
    return {};
  }, [datePreset]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const [invs, cs, docs, uninv] = await Promise.all([
          // جلب كل الصفحات — الافتراضي في الباكند 50 فاتورة فقط والباقي كان بيبقى غير ظاهر
          (async () => {
            const base = {
              doctorId: selectedDoctorId || undefined,
              status: statusFilter !== "ALL" ? statusFilter : undefined,
              search: searchQuery.trim() || undefined,
              ...dateParams,
            };
            const PAGE_SIZE = 200;
            const MAX_PAGES = 15;
            let acc: DentalInvoice[] = [];
            for (let page = 1; page <= MAX_PAGES; page++) {
              const chunk = await fetchInvoices({ ...base, page, limit: PAGE_SIZE });
              acc = acc.concat(chunk);
              if (chunk.length < PAGE_SIZE) break;
            }
            return acc;
          })(),
          fetchCases({ limit: 100 }),
          fetchDoctors(),
          fetchUninvoicedSummary().catch(() => null),
        ]);
        setRows(invs);
        setFetchedCount(invs.length);
        setCases(cs.data);
        setDoctors(docs);
        if (uninv) setUninvoicedSummary(uninv);
      } catch (e) {
        if (!opts?.silent) {
          const msg = e instanceof Error ? e.message : t("dentalLab.common.noData");
          setError(msg);
          toast.error(msg);
        }
      }
    },
    [t, selectedDoctorId, statusFilter, searchQuery, dateParams]
  );

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Selected doctor object & stats
  const activeDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [selectedDoctorId, doctors]);

  const activeDoctorStats = useMemo(() => {
    if (!activeDoctor) return null;
    const docInvoices = rows.filter(
      (r) => r.doctorId === activeDoctor.id || r.doctorName === activeDoctor.name
    );
    const totalBilled = docInvoices.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    const totalPaid = docInvoices.reduce((sum, r) => sum + (Number(r.paid) || 0), 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);
    const uninvoicedInfo = uninvoicedSummary?.doctors.find((d) => d.doctorId === activeDoctor.id);

    return {
      totalBilled,
      totalPaid,
      outstanding,
      invoicesCount: docInvoices.length,
      uninvoicedCases: uninvoicedInfo?.casesCount ?? 0,
      uninvoicedAmount: uninvoicedInfo?.totalAmount ?? 0,
      creditLimit: activeDoctor.creditLimit || 0,
      creditExceeded:
        (activeDoctor.creditLimit || 0) > 0 && outstanding > (activeDoctor.creditLimit || 0),
    };
  }, [activeDoctor, rows, uninvoicedSummary]);

  const handleExportInvoicesExcel = () => {
    if (!rows || rows.length === 0) {
      toast.error("لا توجد فواتير لتصديرها");
      return;
    }
    const columns = [
      { key: "doctorName", label: "اسم الطبيب / العيادة" },
      { key: "caseNumber", label: "رقم الحالة" },
      { key: "patientName", label: "اسم المريض" },
      { key: "workTypeName", label: "نوع التركيبة" },
      { key: "unitsCount", label: "عدد الوحدات" },
      { key: "invoiceNumber", label: "رقم الفاتورة" },
      { key: "createdAt", label: "تاريخ الإصدار" },
      { key: "total", label: "الإجمالي (ج.م)" },
      { key: "discount", label: "الخصم (ج.م)" },
      { key: "paid", label: "المدفوع (ج.م)" },
      { key: "remaining", label: "المتبقي (ج.م)" },
      { key: "statusLabel", label: "حالة الفاتورة" },
    ];
    const data: Array<Record<string, unknown>> = rows.map((inv) => ({
      doctorName: inv.doctorName || inv.doctor?.name || "—",
      caseNumber: inv.case?.caseNumber || inv.caseNumber || "—",
      patientName: inv.patientName || inv.case?.patientName || "—",
      workTypeName: inv.workTypeName || inv.case?.workTypeName || "—",
      unitsCount: inv.unitsCount ?? inv.case?.unitsCount ?? 1,
      invoiceNumber: inv.invoiceNumber || inv.id?.slice(0, 8),
      createdAt: fmtDate(inv.createdAt),
      total: inv.total ?? 0,
      discount: inv.discount ?? 0,
      paid: inv.paid ?? 0,
      remaining: inv.remaining ?? 0,
      statusLabel:
        inv.status === "PAID"
          ? "مدفوعة بالكامل"
          : inv.status === "PARTIAL"
          ? "مدفوعة جزئياً"
          : inv.status === "VOID"
          ? "ملغاة"
          : "غير مسددة",
    }));

    // إضافة صف إجمالي في نهاية الجدول
    const totalUnits = data.reduce(
      (acc, r) => acc + (typeof r.unitsCount === "number" ? r.unitsCount : 1),
      0
    );
    const totalInvoiced = data.reduce(
      (acc, r) => acc + (typeof r.total === "number" ? r.total : 0),
      0
    );
    const totalDiscount = data.reduce(
      (acc, r) => acc + (typeof r.discount === "number" ? r.discount : 0),
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
      doctorName: `الإجمالي (${data.length} فاتورة)`,
      caseNumber: "",
      patientName: "",
      workTypeName: "",
      unitsCount: totalUnits,
      invoiceNumber: "",
      createdAt: "",
      total: totalInvoiced,
      discount: totalDiscount,
      paid: totalPaid,
      remaining: totalRemaining,
      statusLabel: "",
    });

    exportToExcel(
      data,
      columns,
      `فواتير_معمل_الأسنان_${new Date().toISOString().split("T")[0]}.xlsx`,
      "الفواتير"
    );
    toast.success("تم تصدير ملف إكسيل الفواتير بنجاح");
  };

  const handleVoidInvoice = async (inv: DentalInvoice) => {
    const promptReason = window.prompt(
      `تحذير: هل أنت متأكد من إلغاء الفاتورة #${
        inv.invoiceNumber || inv.id.slice(0, 8)
      }؟\nسيتم استبعاد قيمتها بالكامل من كشوف الحسابات والمطالبات.\n\nسبب الإلغاء (اختياري):`
    );
    if (promptReason === null) return;
    try {
      await voidInvoice(inv.id, promptReason || undefined);
      toast.success("تم إلغاء الفاتورة بنجاح واستبعادها من كشوف الحسابات");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إلغاء الفاتورة");
    }
  };

  return {
    rows,
    fetchedCount,
    cases,
    doctors,
    loading,
    error,
    setError,
    selectedDoctorId,
    setSelectedDoctorId,
    statusFilter,
    setStatusFilter,
    datePreset,
    setDatePreset,
    searchQuery,
    setSearchQuery,
    createOpen,
    setCreateOpen,
    batchOpen,
    setBatchOpen,
    uninvoicedSummary,
    paymentInvoice,
    setPaymentInvoice,
    detailInvoice,
    setDetailInvoice,
    statementDoctor,
    setStatementDoctor,
    bulkPaymentDoctor,
    setBulkPaymentDoctor,
    settlementOpen,
    setSettlementOpen,
    settlementDoctorId,
    setSettlementDoctorId,
    activeDoctor,
    activeDoctorStats,
    refresh,
    handleExportInvoicesExcel,
    handleVoidInvoice,
  };
}
