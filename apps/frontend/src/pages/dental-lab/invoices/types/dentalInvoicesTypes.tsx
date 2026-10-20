import type {
  DentalInvoice,
  DentalLabCase,
  DentalLabDoctor,
  DoctorStatement,
  DentalMonthlySettlement,
  MonthlySettlementSummary,
  UninvoicedSummaryResult,
} from "../../shared";
import {
  fmtMoney,
  INVOICE_STATUS_MAP,
  PAYMENT_STATUS_MAP,
} from "../../shared";

export const FALLBACK_BADGE = {
  label: "",
  color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export const invoiceBadge = (status?: string) => {
  if (!status) return null;
  const meta = INVOICE_STATUS_MAP[status] ?? { ...FALLBACK_BADGE, label: status };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
};

export const paymentBadge = (status?: string) => {
  if (!status) return null;
  const meta = PAYMENT_STATUS_MAP[status as keyof typeof PAYMENT_STATUS_MAP] ?? { ...FALLBACK_BADGE, label: status };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color}`}>
      {meta.label}
    </span>
  );
};

export function normalizeWhatsAppPhone(phone: string | undefined): string {
  let p = (phone || "").replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "2" + p;
  return p;
}

export function shareInvoiceWhatsApp(inv: DentalInvoice) {
  const phone = normalizeWhatsAppPhone(inv.doctor?.phone);
  const invNum = inv.invoiceNumber || inv.id.slice(0, 8);

  let isConsolidated = false;
  let casesCount = 0;
  let totalUnits = 0;
  let cleanNote = "";
  if (inv.notes && inv.notes.startsWith("{") && inv.notes.includes('"items"')) {
    try {
      const p = JSON.parse(inv.notes);
      if (p.isConsolidated || Array.isArray(p.items)) {
        isConsolidated = true;
        casesCount = p.items?.length || p.casesCount || p.summary?.casesCount || 0;
        totalUnits =
          p.totalUnits ||
          p.summary?.totalUnits ||
          (p.items || []).reduce(
            (acc: number, it: any) => acc + (Number(it.unitsCount) || 1),
            0
          );
        cleanNote = p.title || p.note || "";
      }
    } catch {}
  }

  let text = "";
  if (isConsolidated) {
    text = `مرحباً دكتور ${inv.doctorName || ""}\nتحية طيبة من إدارة معمل الأسنان\nمرفق الفاتورة الشهرية المجمعة رقم: *${invNum}*\nعدد الحالات المشمولة: *${casesCount} حالة* (${totalUnits} وحدة)${
      cleanNote ? `\nملاحظة: ${cleanNote}` : ""
    }\n------------------\nالإجمالي: *${fmtMoney(inv.total)} ج.م*\nالمسدد: *${fmtMoney(
      inv.paid
    )} ج.م*\nالمتبقي المستحق: *${fmtMoney(inv.remaining)} ج.م*\n------------------\nشكراً لتعاملكم معنا.`;
  } else {
    const patient = inv.patientName || inv.case?.patientName || "—";
    const caseNum = inv.case?.caseNumber ? ` (حالة: ${inv.case.caseNumber})` : "";
    const workType = inv.case?.workTypeName ? `\nنوع الشغل: ${inv.case.workTypeName}` : "";
    const teeth = inv.case?.teeth ? `\nالأسنان: ${inv.case.teeth}` : "";
    text = `مرحباً دكتور ${inv.doctorName || ""}\nتحية طيبة من إدارة معمل الأسنان\nمرفق تفاصيل الفاتورة رقم: *${invNum}*\nالمريض: *${patient}*${caseNum}${workType}${teeth}\n------------------\nالإجمالي: *${fmtMoney(
      inv.total
    )} ج.م*\nالمسدد: *${fmtMoney(inv.paid)} ج.م*\nالمتبقي المستحق: *${fmtMoney(
      inv.remaining
    )} ج.م*\n------------------\nشكراً لتعاملكم معنا.`;
  }

  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
}

export function shareStatementWhatsApp(
  docName: string,
  phone: string | undefined,
  totals: { invoiced?: number; paid?: number; remaining?: number; cases?: number }
) {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const text = `مرحباً دكتور ${docName}\nتحية طيبة من إدارة معمل الأسنان\nمرفق ملخص كشف الحساب:\nعدد الحالات: *${
    totals.cases || 0
  } حالة*\nإجمالي المفوتر: *${fmtMoney(totals.invoiced)} ج.م*\nإجمالي المسدد: *${fmtMoney(
    totals.paid
  )} ج.م*\n*الرصيد المتبقي المستحق: ${fmtMoney(
    totals.remaining
  )} ج.م*\n------------------\nنسعد دائماً بخدمتكم وتوفير أعلى معايير الجودة.`;

  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
}

export interface CreateInvoiceModalProps {
  cases: DentalLabCase[];
  doctors: DentalLabDoctor[];
  preselectedDoctorId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface InvoicePaymentModalProps {
  invoice: DentalInvoice;
  onClose: () => void;
  onSaved: () => void;
}

export interface BatchMonthlyInvoiceModalProps {
  doctors: DentalLabDoctor[];
  preselectedDoctorId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface BulkPaymentModalProps {
  doctors: DentalLabDoctor[];
  preselectedDoctorId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface DoctorStatementModalProps {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export interface SettlementVoucherModalProps {
  settlement: DentalMonthlySettlement;
  onClose: () => void;
  onUpdated?: () => void;
}

export interface MonthlySettlementModalProps {
  doctors: DentalLabDoctor[];
  onClose: () => void;
  onSaved?: () => void;
}

export interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onPaymentClick: (inv: DentalInvoice) => void;
  onVoided: () => void;
}
