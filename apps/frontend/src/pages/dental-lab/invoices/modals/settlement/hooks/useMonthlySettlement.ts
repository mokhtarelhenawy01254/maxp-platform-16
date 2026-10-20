import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  closeMonthlySettlement,
  fetchMonthlySettlements,
  fmtDate,
  fmtMoney,
  reopenMonthlySettlement,
  type DentalMonthlySettlement,
  type MonthlySettlementSummary,
} from "../../../../shared";

interface UseMonthlySettlementOptions {
  initialDoctorId?: string;
  onUpdated: () => void;
}

export function useMonthlySettlement({
  initialDoctorId,
  onUpdated,
}: UseMonthlySettlementOptions) {
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${m}`;
  }, []);

  const [period, setPeriod] = useState<string>(currentMonthStr);
  const [filterDoctorId, setFilterDoctorId] = useState<string>(
    initialDoctorId || ""
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settlements, setSettlements] = useState<DentalMonthlySettlement[]>([]);
  const [summary, setSummary] = useState<MonthlySettlementSummary | null>(null);

  // Sub-modal for reopen reason
  const [reopenTarget, setReopenTarget] =
    useState<DentalMonthlySettlement | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  // Voucher print view
  const [voucherSettlement, setVoucherSettlement] =
    useState<DentalMonthlySettlement | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMonthlySettlements({
        period,
        doctorId: filterDoctorId || undefined,
      });
      setSettlements(res.settlements || []);
      setSummary(res.summary || null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "فشل تحميل تسويات ومستحقات الشهر";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [period, filterDoctorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCloseSingle = useCallback(
    async (docId: string, doctorName: string) => {
      if (
        !confirm(
          `هل أنت متأكد من رغبتك في تقفيل واعتماد حساب د. ${doctorName} لشهر ${period}؟ سيتم تجميد الأرصدة وترحيل الرصيد الختامي للشهر القادم.`
        )
      ) {
        return;
      }
      setSaving(true);
      try {
        await closeMonthlySettlement({
          period,
          doctorId: docId,
        });
        toast.success(`تم تقفيل واعتماد حساب د. ${doctorName} بنجاح`);
        loadData();
        onUpdated();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "فشل تقفيل الحساب";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [period, loadData, onUpdated]
  );

  const handleCloseAll = useCallback(async () => {
    const unclosedCount = settlements.filter((s) => !s.isClosed).length;
    if (unclosedCount === 0) {
      toast.info("جميع حسابات الأطباء لهذا الشهر مغلقة ومعتمدة بالفعل");
      return;
    }
    if (
      !confirm(
        `هل أنت متأكد من إغلاق واعتماد كافة الحسابات (${unclosedCount} طبيب) لشهر ${period} دفعة واحدة؟`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await closeMonthlySettlement({
        period,
      });
      toast.success(`تم إغلاق واعتماد كافة حسابات شهر ${period} بنجاح`);
      loadData();
      onUpdated();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "فشل إغلاق حسابات الشهر";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [settlements, period, loadData, onUpdated]);

  const handleConfirmReopen = useCallback(async () => {
    if (!reopenTarget) return;
    if (!reopenReason.trim()) {
      toast.error("يرجى كتابة سبب إعادة فتح الشهر للتدقيق المحاسبي");
      return;
    }
    setReopening(true);
    try {
      await reopenMonthlySettlement(reopenTarget.id, {
        reason: reopenReason.trim(),
      });
      toast.success(`تم إعادة فتح حساب شهر ${period} للتعديل بنجاح`);
      setReopenTarget(null);
      setReopenReason("");
      loadData();
      onUpdated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "فشل إعادة فتح الشهر";
      toast.error(msg);
    } finally {
      setReopening(false);
    }
  }, [reopenTarget, reopenReason, period, loadData, onUpdated]);

  const handleShareWhatsApp = useCallback((s: DentalMonthlySettlement) => {
    const phone = s.phone || "";
    if (!phone) {
      toast.error("لا يوجد رقم هاتف مسجل لهذا الطبيب");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? `2${cleanPhone}`
      : cleanPhone;
    const text = [
      `مرحباً د. ${s.doctorName || "الكريم"}`,
      `تحية طيبة من إدارة معامل MaxP للأسنان.`,
      `إليك ملخص تقفيل المستحقات والحساب لشهر: *${s.periodKey}*`,
      `───────────────`,
      `[+] رصيد أول المدة المرحل: *${fmtMoney(s.openingBalance)} ج.م*`,
      `[+] أعمال وفواتير الشهر (+): *${fmtMoney(s.totalBilled)} ج.م* (${s.invoicesCount} فاتورة / ${s.casesCount} حالة)`,
      `[-] إجمالي المسدد خلال الشهر (-): *${fmtMoney(s.totalPaid)} ج.م*`,
      s.totalAdjustments > 0
        ? `[-] خصومات وإشعارات دائنة (-): *${fmtMoney(s.totalAdjustments)} ج.م*`
        : null,
      `───────────────`,
      `*صافي الرصيد الختامي المستحق*: *${fmtMoney(s.closingBalance)} ج.م*`,
      `───────────────`,
      s.isClosed
        ? `تم اعتماد الحساب وتجميده بتاريخ: ${fmtDate(s.closedAt)}`
        : `تنبيه: هذه تسوية مبدئية غير معتمدة نهائياً`,
      `شكراً لتعاملكم ونسعد بخدمتكم دائماً.`,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }, []);

  return {
    period,
    setPeriod,
    filterDoctorId,
    setFilterDoctorId,
    loading,
    saving,
    settlements,
    summary,
    loadData,
    handleCloseSingle,
    handleCloseAll,
    reopenTarget,
    setReopenTarget,
    reopenReason,
    setReopenReason,
    reopening,
    handleConfirmReopen,
    voucherSettlement,
    setVoucherSettlement,
    handleShareWhatsApp,
  };
}
