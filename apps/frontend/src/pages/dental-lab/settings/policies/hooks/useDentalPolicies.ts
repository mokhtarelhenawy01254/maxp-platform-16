import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import {
  type DentalPoliciesData,
  DEFAULT_POLICIES,
} from "../types/dentalPoliciesTypes";

export function useDentalPolicies() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningEscalation, setRunningEscalation] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [policies, setPolicies] = useState<DentalPoliciesData>(DEFAULT_POLICIES);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/dental-lab/policies");
      const loaded = res.data?.data?.policies || res.data?.data;
      if (loaded) {
        setPolicies((prev) => ({
          ...prev,
          assignment: {
            ...prev.assignment,
            ...(loaded.assignment || {}),
            mode: loaded.assignment?.mode || prev.assignment.mode,
            strategy: loaded.assignment?.strategy || prev.assignment.strategy,
            respectSchedule:
              loaded.assignment?.respectSchedule !== undefined
                ? Boolean(loaded.assignment.respectSchedule)
                : Boolean(
                    loaded.assignment?.respectWorkingDays ??
                      prev.assignment.respectSchedule
                  ),
            dailyCapPerTechnician:
              Number(
                loaded.assignment?.dailyCapPerTechnician ??
                  loaded.assignment?.dailyCap ??
                  prev.assignment.dailyCapPerTechnician
              ) || 0,
          },
          dueDate: {
            ...prev.dueDate,
            ...(loaded.dueDate || {}),
            defaultLeadDays:
              Number(loaded.dueDate?.defaultLeadDays) ||
              prev.dueDate.defaultLeadDays,
            urgentRule: loaded.dueDate?.urgentRule || prev.dueDate.urgentRule,
            urgentValue:
              Number(
                loaded.dueDate?.urgentValue ??
                  loaded.dueDate?.urgentReductionPercent ??
                  prev.dueDate.urgentValue
              ) || 50,
            minDays:
              Number(loaded.dueDate?.minDays) || prev.dueDate.minDays,
          },
          fields: {
            ...prev.fields,
            ...(loaded.fields || {}),
            patientPhoneRequired: Boolean(
              loaded.fields?.patientPhoneRequired
            ),
            requireToothAndShade: Boolean(
              loaded.fields?.requireToothAndShade
            ),
          },
          escalation: {
            ...prev.escalation,
            ...(loaded.escalation || {}),
            enabled: loaded.escalation?.enabled !== false,
            afterHoursInStage:
              Number(
                loaded.escalation?.afterHoursInStage ??
                  loaded.escalation?.escalationHours ??
                  prev.escalation.afterHoursInStage
              ) || 24,
            target:
              loaded.escalation?.target || prev.escalation.target,
            notify:
              loaded.escalation?.notify !== undefined
                ? Boolean(loaded.escalation.notify)
                : Boolean(
                    loaded.escalation?.notifyOwnerOnOverdue ??
                      prev.escalation.notify
                  ),
          },
          notify: {
            ...prev.notify,
            ...(loaded.notify || {}),
            patientEnabled: Boolean(loaded.notify?.patientEnabled),
            doctorEnabled: loaded.notify?.doctorEnabled !== false,
          },
        }));
      }
    } catch (err) {
      console.warn("Could not load dental policies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put("/dental-lab/policies", policies);
      toast.success("تم حفظ السياسات وقواعد الأتمتة بنجاح");
      await loadPolicies();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "حدث خطأ أثناء حفظ السياسات";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRunEscalation = async () => {
    setRunningEscalation(true);
    try {
      const res = await apiClient.post("/dental-lab/escalation/run");
      toast.success(
        `تم فحص الحالات المتأخرة بنجاح (${
          res.data?.data?.escalatedCount || 0
        } مرحلة تم تصعيدها)`
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "فشل تشغيل فحص التصعيد";
      toast.error(msg);
    } finally {
      setRunningEscalation(false);
    }
  };

  return {
    loading,
    saving,
    runningEscalation,
    dryRunOpen,
    setDryRunOpen,
    policies,
    setPolicies,
    loadPolicies,
    handleSave,
    handleRunEscalation,
  };
}
