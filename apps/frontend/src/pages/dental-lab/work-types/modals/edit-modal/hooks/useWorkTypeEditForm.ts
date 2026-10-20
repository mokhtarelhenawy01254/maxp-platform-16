import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createWorkType, updateWorkType } from "../../../../shared";
import type { WorkTypeForm } from "../../../types/workTypeTypes";

interface UseWorkTypeEditFormOptions {
  initialModal: WorkTypeForm;
  onSaved: () => void;
}

export function useWorkTypeEditForm({
  initialModal,
  onSaved,
}: UseWorkTypeEditFormOptions) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<WorkTypeForm>(initialModal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) {
      setError(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        category: modal.category || "OTHER",
        pricingMode: modal.pricingMode,
        price: Number(modal.price) || 0,
        costPrice: Number(modal.costPrice) || 0,
        leadTimeDays: Number(modal.leadTimeDays) || 0,
        urgentLeadTimeDays: Number(modal.urgentLeadTimeDays) || 0,
        defaultMaterial: modal.defaultMaterial.trim() || undefined,
        materialBrand: modal.materialBrand.trim() || undefined,
        instructions: modal.instructions.trim() || undefined,
        defaultWarrantyYears: Number(modal.defaultWarrantyYears) || 0,
        defaultCrownCount: Math.max(1, Number(modal.defaultCrownCount) || 1),
        sortOrder: Number(modal.sortOrder) || 0,
      };
      if (modal.id) {
        await updateWorkType(modal.id, {
          ...payload,
          isActive: modal.isActive,
        });
        toast.success(t("dentalLab.workTypes.updated"));
      } else {
        await createWorkType({ ...payload, isActive: true });
        toast.success(t("dentalLab.workTypes.created"));
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  }, [modal, saving, onSaved, t]);

  const liveProfit = useMemo(
    () =>
      Math.max(
        0,
        (Number(modal.price) || 0) - (Number(modal.costPrice) || 0)
      ),
    [modal.price, modal.costPrice]
  );

  const liveMarginPct = useMemo(
    () =>
      Number(modal.price) > 0
        ? Math.round((liveProfit / Number(modal.price)) * 100)
        : 0,
    [modal.price, liveProfit]
  );

  return {
    modal,
    setModal,
    saving,
    error,
    save,
    liveProfit,
    liveMarginPct,
  };
}
