import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { UninvoicedSummaryResult } from "../../../../shared";
import { batchCreateMonthlyInvoices, fetchUninvoicedSummary } from "../../../../shared";
import type { DentalInvoiceBatchMode } from "../types";

export interface UseDentalInvoiceBatchFormProps {
  summary: UninvoicedSummaryResult;
  onSaved: () => void;
}

export function useDentalInvoiceBatchForm({
  summary,
  onSaved,
}: UseDentalInvoiceBatchFormProps) {
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<UninvoicedSummaryResult>(summary);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>(() =>
    summary.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
  );
  const [mode, setMode] = useState<DentalInvoiceBatchMode>("PER_CASE");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(10);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleIncludeAllToggle = async (checked: boolean) => {
    setIncludeAllStatuses(checked);
    setLoadingSummary(true);
    try {
      const res = await fetchUninvoicedSummary(checked);
      setCurrentSummary(res);
      setSelectedDoctorIds(
        res.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
      );
    } catch {
      toast.error("فشل تحديث ملخص الحالات");
    } finally {
      setLoadingSummary(false);
    }
  };

  const allSelected =
    currentSummary.doctors.length > 0 &&
    selectedDoctorIds.length === currentSummary.doctors.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDoctorIds([]);
    } else {
      setSelectedDoctorIds(
        currentSummary.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
      );
    }
  };

  const toggleDoctor = (id: string | null) => {
    if (!id) return;
    setSelectedDoctorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedStats = useMemo(() => {
    const filtered = currentSummary.doctors.filter(
      (d) => d.doctorId && selectedDoctorIds.includes(d.doctorId)
    );
    const cases = filtered.reduce((sum, d) => sum + d.casesCount, 0);
    const amount = filtered.reduce((sum, d) => sum + d.totalAmount, 0);
    return { doctorsCount: filtered.length, cases, amount };
  }, [currentSummary, selectedDoctorIds]);

  const handleRunBatch = async () => {
    if (selectedDoctorIds.length === 0) {
      toast.error("يرجى اختيار طبيب واحد على الأقل لإصدار الفواتير له");
      return;
    }
    setSubmitting(true);
    try {
      const res = await batchCreateMonthlyInvoices({
        doctorIds: selectedDoctorIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        mode,
        includeAllStatuses,
      });
      toast.success(
        `تم إنشاء ${res.createdCount} فاتورة بنجاح لـ ${res.invoicedCasesCount} حالة!`
      );
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الفواتير المجمعة");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    includeAllStatuses,
    handleIncludeAllToggle,
    currentSummary,
    loadingSummary,
    selectedDoctorIds,
    toggleDoctor,
    toggleSelectAll,
    allSelected,
    mode,
    setMode,
    dueDate,
    setDueDate,
    notes,
    setNotes,
    submitting,
    selectedStats,
    handleRunBatch,
  };
}
