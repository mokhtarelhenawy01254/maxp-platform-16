import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteTechnicianPayout,
  fetchTechnicianPayouts,
  type DentalTechnicianPayout,
  type TechnicianPayoutSummary,
} from "../../../../shared";

export function useTechnicianLedger(techId: string, onDataChanged: () => void) {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<DentalTechnicianPayout[]>([]);
  const [summary, setSummary] = useState<TechnicianPayoutSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTechnicianPayouts(techId);
      setPayouts(res.payouts || []);
      setSummary(res.summary);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "حدث خطأ في تحميل كشف حساب الفني"
      );
    } finally {
      setLoading(false);
    }
  }, [techId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (payoutId: string) => {
    if (
      !window.confirm(
        "هل أنت متأكد من حذف هذا السند المالي؟ سيتم تحديث رصيد الفني تلقائياً."
      )
    ) {
      return;
    }
    setDeletingId(payoutId);
    try {
      await deleteTechnicianPayout(payoutId);
      toast.success("تم حذف السند بنجاح");
      await loadData();
      onDataChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ أثناء حذف السند");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return {
    loading,
    payouts,
    summary,
    deletingId,
    loadData,
    handleDelete,
    handlePrint,
  };
}
