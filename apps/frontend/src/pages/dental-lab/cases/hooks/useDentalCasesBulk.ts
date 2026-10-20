import { useState } from "react";
import { toast } from "sonner";
import type { DentalCasePriority, DentalLabCase, DentalLabDoctor } from "../../shared";
import {
  bulkAdvanceCases,
  bulkAssignTechnician,
  bulkRestoreCases,
  bulkTransferCasesDoctor,
  bulkTrashCases,
  bulkUpdatePriority,
} from "../../shared";

export interface UseDentalCasesBulkOptions {
  cases: DentalLabCase[] | null;
  doctors: DentalLabDoctor[];
  refresh: () => void;
}

export function useDentalCasesBulk({ cases, doctors, refresh }: UseDentalCasesBulkOptions) {
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("");
  const [bulkTechTarget, setBulkTechTarget] = useState("");
  const [bulkPriorityTarget, setBulkPriorityTarget] = useState<DentalCasePriority | "">("");
  const [bulkDoctorTarget, setBulkDoctorTarget] = useState("");

  const toggleSelect = (id: string) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    if (!cases || cases.length === 0) return;
    const allCurrentSelected = cases.every((c) => selectedCaseIds.has(c.id));
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (allCurrentSelected) {
        cases.forEach((c) => next.delete(c.id));
      } else {
        cases.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const handleBulkAdvance = async () => {
    if (selectedCaseIds.size === 0 || !bulkStatusTarget) return;
    const ids = Array.from(selectedCaseIds);
    setBulkBusy(true);
    try {
      const res = await bulkAdvanceCases(ids, bulkStatusTarget);
      toast.success(res.message || `تمت ترقية ${res.count} حالة بنجاح`);
      setSelectedCaseIds(new Set());
      setBulkStatusTarget("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت الترقية الجماعية");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedCaseIds.size === 0 || !bulkTechTarget) return;
    const ids = Array.from(selectedCaseIds);
    setBulkBusy(true);
    try {
      const res = await bulkAssignTechnician(ids, bulkTechTarget);
      toast.success(res.message || `تم إسناد ${res.count} حالة للفني بنجاح`);
      setSelectedCaseIds(new Set());
      setBulkTechTarget("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإسناد الجماعي");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkPriority = async () => {
    if (selectedCaseIds.size === 0 || !bulkPriorityTarget) return;
    const ids = Array.from(selectedCaseIds);
    setBulkBusy(true);
    try {
      const res = await bulkUpdatePriority(ids, bulkPriorityTarget);
      toast.success(res.message || `تم تحديث أولوية ${res.count} حالة بنجاح`);
      setSelectedCaseIds(new Set());
      setBulkPriorityTarget("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تعديل الأولوية");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkTrash = async () => {
    if (selectedCaseIds.size === 0) return;
    if (!window.confirm(`هل أنت متأكد من نقل ${selectedCaseIds.size} حالة إلى سلة المهملات؟`)) {
      return;
    }
    const ids = Array.from(selectedCaseIds);
    setBulkBusy(true);
    try {
      const res = await bulkTrashCases(ids);
      toast.success(res.message || `تم نقل ${res.count} حالة للمهملات`);
      setSelectedCaseIds(new Set());
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل نقل الحالات");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedCaseIds.size === 0) return;
    const ids = Array.from(selectedCaseIds);
    setBulkBusy(true);
    try {
      const res = await bulkRestoreCases(ids);
      toast.success(res.message || `تمت استعادة ${res.count} حالة`);
      setSelectedCaseIds(new Set());
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت الاستعادة");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkTransferDoctor = async () => {
    if (selectedCaseIds.size === 0 || !bulkDoctorTarget) return;
    const targetDoc = doctors.find((d) => d.id === bulkDoctorTarget);
    const docName = targetDoc
      ? targetDoc.clinicName
        ? `${targetDoc.clinicName} (${targetDoc.name})`
        : targetDoc.name
      : "";
    if (
      !window.confirm(
        `هل أنت متأكد من نقل ${selectedCaseIds.size} حالة إلى: "${docName}" ومزامنة فواتيرها؟`
      )
    ) {
      return;
    }
    const ids = Array.from(selectedCaseIds);
    setBulkBusy(true);
    try {
      const res = await bulkTransferCasesDoctor(ids, bulkDoctorTarget, targetDoc?.name, true);
      toast.success(res.message || `تم نقل ${res.count} حالة بنجاح`);
      setSelectedCaseIds(new Set());
      setBulkDoctorTarget("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل نقل الحالات إلى الطبيب");
    } finally {
      setBulkBusy(false);
    }
  };

  return {
    selectedCaseIds,
    setSelectedCaseIds,
    bulkBusy,
    bulkStatusTarget,
    setBulkStatusTarget,
    bulkTechTarget,
    setBulkTechTarget,
    bulkPriorityTarget,
    setBulkPriorityTarget,
    bulkDoctorTarget,
    setBulkDoctorTarget,
    toggleSelect,
    toggleSelectAllPage,
    handleBulkAdvance,
    handleBulkAssign,
    handleBulkPriority,
    handleBulkTrash,
    handleBulkRestore,
    handleBulkTransferDoctor,
  };
}
