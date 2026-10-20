import { Clock, Sparkles } from "lucide-react";
import type { DentalInvoice } from "../../../../shared";
import { fmtDate } from "../../../../shared";
import type { ConsolidatedData } from "../types";

interface InvoiceDoctorPatientCardProps {
  invoice: DentalInvoice;
  consolidatedData: ConsolidatedData | null;
  casesCount: number;
  totalUnits: number;
}

export function InvoiceDoctorPatientCard({
  invoice,
  consolidatedData,
  casesCount,
  totalUnits,
}: InvoiceDoctorPatientCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-700/60">
      <div>
        <span className="text-gray-400 block mb-0.5">بيانات الطبيب</span>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{invoice.doctorName || "—"}</p>
        {invoice.doctor?.clinicName && <p className="text-gray-500 mt-0.5">{invoice.doctor.clinicName}</p>}
        {invoice.doctor?.phone && <p className="text-gray-500 mt-0.5 font-mono">{invoice.doctor.phone}</p>}
      </div>
      <div>
        <span className="text-gray-400 block mb-0.5">
          {consolidatedData ? "نوع المطالبة" : "بيانات المريض والحالة"}
        </span>
        {consolidatedData ? (
          <div>
            <span className="inline-flex items-center gap-1.5 font-bold text-sm text-indigo-700 dark:text-indigo-400">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              فاتورة شهرية مجمعة ({casesCount} حالة)
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              إجمالي الوحدات:{" "}
              <strong className="text-gray-800 dark:text-gray-200 font-mono">{totalUnits} وحدة</strong>
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {invoice.patientName || invoice.case?.patientName || "—"}
            </p>
            {invoice.case?.caseNumber && (
              <p className="text-blue-600 dark:text-blue-400 font-semibold mt-0.5 font-mono">
                حالة رقم: {invoice.case.caseNumber}
              </p>
            )}
          </>
        )}
        {invoice.dueDate && (
          <p className="text-amber-600 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> استحقاق: {fmtDate(invoice.dueDate)}
          </p>
        )}
      </div>
    </div>
  );
}
