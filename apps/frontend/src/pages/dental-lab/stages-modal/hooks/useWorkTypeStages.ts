import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type DentalWorkType,
  type WorkTypeStageTemplateItem,
  fetchWorkTypeStages,
  saveWorkTypeStages,
} from "../../shared";
import { CANONICAL_PRESETS } from "../types/stagesModalTypes";

interface UseWorkTypeStagesOptions {
  workType: DentalWorkType;
  onClose: () => void;
  onSaved?: () => void;
}

export function useWorkTypeStages({
  workType,
  onClose,
  onSaved,
}: UseWorkTypeStagesOptions) {
  const [stages, setStages] = useState<WorkTypeStageTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchWorkTypeStages(workType.id);
        if (active) {
          setStages(data && data.length > 0 ? data : CANONICAL_PRESETS);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "فشل جلب قالب المراحل"
          );
          setStages(CANONICAL_PRESETS);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [workType.id]);

  const updateStage = (
    index: number,
    updates: Partial<WorkTypeStageTemplateItem>
  ) => {
    setStages((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      {
        name: "",
        requiredRole: "GENERAL_TECHNICIAN",
        slaHours: 24,
        stageWage: 0,
        isRequired: true,
        sortOrder: prev.length,
      },
    ]);
  };

  const removeStage = (index: number) => {
    setStages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveStage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy.map((st, i) => ({ ...st, sortOrder: i }));
    });
  };

  const resetToCanonical = () => {
    setStages(CANONICAL_PRESETS);
  };

  const handleSave = async () => {
    if (saving) return;
    const cleanStages = stages
      .map((st, idx) => ({
        ...st,
        name: st.name.trim(),
        sortOrder: idx,
        slaHours: Number(st.slaHours) > 0 ? Number(st.slaHours) : 24,
        stageWage: Number(st.stageWage) >= 0 ? Number(st.stageWage) : 0,
      }))
      .filter((st) => st.name.length > 0);

    if (cleanStages.length === 0) {
      setError("يجب أن يحتوي القالب على مرحلة واحدة على الأقل باسم صالح.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveWorkTypeStages(workType.id, cleanStages);
      toast.success(`تم حفظ ${cleanStages.length} مراحل بنجاح لنوع الشغل`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ في حفظ القالب");
    } finally {
      setSaving(false);
    }
  };

  const totalSlaHours = stages.reduce(
    (acc, s) => acc + (Number(s.slaHours) || 0),
    0
  );
  const totalWages = stages.reduce(
    (acc, s) => acc + (Number(s.stageWage) || 0),
    0
  );
  const totalDays = (totalSlaHours / 24).toFixed(1);

  return {
    stages,
    loading,
    saving,
    error,
    updateStage,
    addStage,
    removeStage,
    moveStage,
    resetToCanonical,
    handleSave,
    totalSlaHours,
    totalWages,
    totalDays,
  };
}
