import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Download,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Printer,
  X as XMarkIcon,
} from "lucide-react";
import {
  FALLBACK_BADGE,
  shareStatementWhatsApp,
} from "../types/dentalInvoicesTypes";
import {
  INVOICE_STATUS_MAP,
  fetchDoctorStatement,
  fetchDoctorStatementPdf,
  fmtDate,
  fmtMoney,
  MODAL_CONTENT_CLS,
  type DentalLabDoctor,
  type DoctorStatement,
} from "../../shared";
import { exportToExcel } from "@/utils/exportHelpers";

interface DentalInvoiceDoctorStatementModalProps {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onBulkPayment: () => void;
}

const renderInvoiceBadge = (status?: string) => {
  if (!status) return null;
  const meta = INVOICE_STATUS_MAP[status] ?? { ...FALLBACK_BADGE, label: status };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
};

export function DentalInvoiceDoctorStatementModal({
  doctor,
  onClose,
  onBulkPayment,
}: DentalInvoiceDoctorStatementModalProps) {
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
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
  };

  const handleExportStatementExcel = () => {
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
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white print:z-auto print:block"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-4xl my-6 print:max-w-none print:w-full print:m-0 print:shadow-none print:p-6 print:border-none print:bg-white print:text-black`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Official Header */}
        <div className="hidden print:block pb-4 mb-4 border-b-2 border-slate-900">
          <div className="flex justify-between items-start">
            <div className="text-right">
              <h1 className="text-xl font-bold text-slate-900">كشف حساب العميل — معمل الأسنان</h1>
              <p className="text-sm font-semibold text-slate-800 mt-1">
                العميل / الطبيب: {doctor.name} {doctor.clinicName ? `(${doctor.clinicName})` : ""}
              </p>
              {doctor.phone && <p className="text-xs text-slate-600">هاتف: {doctor.phone}</p>}
            </div>
            <div className="text-left text-xs text-slate-600 space-y-1 font-mono tabular-nums">
              <p className="font-semibold text-slate-800">
                تاريخ الاستخراج: {new Date().toLocaleDateString("ar-EG")}
              </p>
              {from && <p>الفترة من: {fmtDate(from)}</p>}
              {to && <p>إلى: {fmtDate(to)}</p>}
            </div>
          </div>
        </div>

        {/* Screen Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b dark:border-gray-800 mb-4 gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                كشف حساب الطبيب: {doctor.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {doctor.clinicName ? `${doctor.clinicName} • ` : ""}
                {doctor.phone ? `هاتف: ${doctor.phone}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                shareStatementWhatsApp(doctor.name, doctor.phone, statement?.totals || {})
              }
              className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-green-100"
              title="إرسال كشف الحساب عبر الواتساب"
            >
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span>واتساب</span>
            </button>
            <button
              onClick={handleExportStatementExcel}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100"
              title="تصدير كشف الحساب كملف Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 disabled:opacity-50"
              title="تنزيل كشف الحساب كملف PDF رسمي عالي الدقة"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Download className="w-4 h-4 text-blue-600" />
              )}
              <span>PDF رسمي</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 border dark:border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="طباعة ورقية نظيفة"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onBulkPayment}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700"
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل دفعة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pb-3 border-b dark:border-gray-800 text-xs print:hidden">
          <span className="font-semibold text-gray-600 dark:text-gray-400">الفترة:</span>
          <div className="flex items-center gap-1.5">
            <span>من:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border dark:border-gray-700 rounded px-2 py-1 text-xs dark:bg-gray-800"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>إلى:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border dark:border-gray-700 rounded px-2 py-1 text-xs dark:bg-gray-800"
            />
          </div>
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            عرض الكل
          </button>
        </div>

        {/* Totals Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 print:grid-cols-4 print:border print:border-slate-300 print:p-2">
          <div className="p-3 bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium print:text-black font-sans">
              عدد الحالات والوحدات
            </span>
            <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5 print:text-black">
              {statement?.totals?.totalCards ??
                statement?.totals?.invoicesCount ??
                statement?.invoices?.length ??
                0}{" "}
              حالة (
              {statement?.totals?.totalUnits ??
                statement?.invoices?.reduce(
                  (sum, inv) => sum + (inv.unitsCount || inv.case?.unitsCount || 1),
                  0
                ) ??
                0}{" "}
              وحدة)
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border dark:border-gray-700 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium print:text-black font-sans">
              إجمالي المفوتر
            </span>
            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5 print:text-black">
              {fmtMoney(statement?.totals?.invoiced)} ج.م
            </p>
          </div>
          <div className="p-3 bg-green-50/60 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
            <span className="text-[11px] text-green-700 dark:text-green-400 font-medium print:text-black font-sans">
              إجمالي المسدد
            </span>
            <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-400 mt-0.5 print:text-black">
              {fmtMoney(statement?.totals?.paid)} ج.م
            </p>
          </div>
          <div className="p-3 bg-red-50/60 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl print:border-none print:p-1 font-mono tabular-nums">
            <span className="text-[11px] text-red-700 dark:text-red-400 font-medium print:text-black font-sans">
              الرصيد المتبقي المستحق
            </span>
            <p className="text-base sm:text-lg font-bold text-red-600 mt-0.5 print:text-black">
              {fmtMoney(statement?.totals?.remaining)} ج.م
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b dark:border-gray-800 mb-3 print:hidden">
          <button
            onClick={() => setTab("invoices")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === "invoices"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            سجل الفواتير ({statement?.invoices?.length || 0})
          </button>
          <button
            onClick={() => setTab("cases")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === "cases"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            سجل الحالات ({statement?.cases?.length || 0})
          </button>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tab === "invoices" ? (
          <div className="overflow-x-auto max-h-72 print:max-h-none print:overflow-visible border dark:border-gray-700 rounded-xl print:border-slate-300 print:rounded-none">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">رقم الكارتة</th>
                  <th className="py-2.5 px-3">اسم المريض</th>
                  <th className="py-2.5 px-3">نوع الشغل</th>
                  <th className="py-2.5 px-3">الوحدات</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">المسدد</th>
                  <th className="py-2.5 px-3">المتبقي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 print:divide-slate-200">
                {!statement?.invoices || statement.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400">
                      لا توجد فواتير مسجلة في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  statement.invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 font-mono tabular-nums"
                    >
                      <td className="py-2.5 px-3 font-semibold text-blue-600 print:text-black">
                        {inv.invoiceNumber || inv.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                        {inv.caseNumber || inv.case?.caseNumber || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100 font-sans">
                        {inv.patientName || inv.case?.patientName || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 font-sans">
                        {inv.workTypeName || inv.case?.workTypeName || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-700 dark:text-gray-300">
                        {inv.unitsCount ?? inv.case?.unitsCount ?? 1}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 print:text-black">
                        {fmtDate(inv.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{fmtMoney(inv.total)}</td>
                      <td className="py-2.5 px-3 text-green-600 print:text-black">
                        {fmtMoney(inv.paid)}
                      </td>
                      <td className="py-2.5 px-3 text-red-600 font-bold print:text-black">
                        {fmtMoney(inv.remaining)}
                      </td>
                      <td className="py-2.5 px-3 font-sans">{renderInvoiceBadge(inv.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72 print:max-h-none print:overflow-visible border dark:border-gray-700 rounded-xl print:border-slate-300 print:rounded-none">
            <table className="w-full text-xs text-right">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-2.5 px-3">رقم الحالة</th>
                  <th className="py-2.5 px-3">المريض</th>
                  <th className="py-2.5 px-3">نوع الشغل</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">المسدد</th>
                  <th className="py-2.5 px-3">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700 print:divide-slate-200">
                {!statement?.cases || statement.cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      لا توجد حالات مسجلة في هذه الفترة
                    </td>
                  </tr>
                ) : (
                  statement.cases.map((c, idx) => (
                    <tr
                      key={c.caseNumber || idx}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 font-mono tabular-nums"
                    >
                      <td className="py-2.5 px-3 font-semibold text-blue-600 print:text-black">
                        {c.caseNumber || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-medium font-sans">{c.patientName || "—"}</td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 print:text-black font-sans">
                        {c.workTypeName || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-gray-800 print:border">
                          {c.status || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium">{fmtMoney(c.total)}</td>
                      <td className="py-2.5 px-3 text-green-600 print:text-black">
                        {fmtMoney(c.paid)}
                      </td>
                      <td className="py-2.5 px-3 text-red-600 font-bold print:text-black">
                        {fmtMoney(c.remaining)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Printable Official Signatures & Stamp */}
        <div className="hidden print:block pt-8 mt-6 border-t border-slate-300">
          <div className="grid grid-cols-2 gap-8 text-center text-xs font-semibold text-slate-800">
            <div>
              <p className="mb-10">ختم واعتماد إدارة المعمل</p>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            </div>
            <div>
              <p className="mb-10">توقيع وموافقة الطبيب / المستلم</p>
              <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-500 mt-8">
            يعتبر هذا الكشف مطابقاً للحسابات ما لم يرد اعتراض كتابي خلال 7 أيام من تاريخه • منصة MaxP
            Dental Lab
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800 mt-4 print:hidden">
          <span className="text-xs text-gray-400">
            تم إنشاء كشف الحساب آلياً من منصة MaxP Dental Lab
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceDoctorStatementModal;

