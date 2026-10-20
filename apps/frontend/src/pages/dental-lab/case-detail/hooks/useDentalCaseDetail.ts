import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDentalCaseUploads } from "./useDentalCaseUploads";
import {
  advanceCase,
  consumeDentalCaseMaterial,
  deleteDentalCaseMaterialUsage,
  fetchCaseDetail,
  fetchDentalMaterials,
  fetchDoctors,
  fetchPanLabelPdf,
  fetchTechnicians,
  fetchWarrantyCertificatePdf,
  fetchWorkOrderPdf,
  fetchWorkTypes,
  fmtDate,
  permanentDeleteCase,
  resolveRefabrication,
  restoreCase,
  trashCase,
  updateCase,
  type DentalCaseAttachment,
  type DentalCaseHistoryEntry,
  type DentalCaseMaterialUsage,
  type DentalCaseStage,
  type DentalInvoice,
  type DentalLabCaseDetail,
  type DentalLabDoctor,
  type DentalMaterial,
  type DentalQualityCheck,
  type DentalRefabrication,
  type DentalTechnician,
  type DentalWorkType,
  type CreditNote,
} from "../../shared";

export function useDentalCaseDetail(id: string | undefined) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<DentalLabCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);

  // Modals state
  const [assignStage, setAssignStage] = useState<DentalCaseStage | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<{ name: string; url: string } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<DentalInvoice | null>(null);
  const [tryInSendOpen, setTryInSendOpen] = useState(false);
  const [tryInReturnOpen, setTryInReturnOpen] = useState(false);
  const [outsourceOpen, setOutsourceOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [refabOpen, setRefabOpen] = useState(false);
  const [refabBusyId, setRefabBusyId] = useState<string | null>(null);

  // Busy & PDF triggers
  const [caseBusy, setCaseBusy] = useState(false);
  const [snoozing, setSnoozing] = useState(false);
  const [workOrderLoading, setWorkOrderLoading] = useState(false);
  const [panLabelLoading, setPanLabelLoading] = useState(false);
  const [warrantyLoading, setWarrantyLoading] = useState(false);

  // Raw materials
  const [materialConsumeOpen, setMaterialConsumeOpen] = useState(false);
  const [materialsList, setMaterialsList] = useState<DentalMaterial[]>([]);
  const [selectedMatId, setSelectedMatId] = useState("");
  const [selectedStockId, setSelectedStockId] = useState("");
  const [consumeUnits, setConsumeUnits] = useState(1);
  const [consumeNotes, setConsumeNotes] = useState("");
  const [materialBusy, setMaterialBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCaseDetail(id);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Upload queue hook
  const uploads = useDentalCaseUploads(id, refresh);

  useEffect(() => {
    refresh();
    fetchTechnicians()
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        setTechnicians(list);
      })
      .catch(() => setTechnicians([]));
    fetchDoctors({ all: true })
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setDoctors(list);
      })
      .catch(() => setDoctors([]));
    fetchWorkTypes()
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        setWorkTypes(list);
      })
      .catch(() => setWorkTypes([]));
  }, [id, refresh]);

  const handleOpenMaterialConsume = async () => {
    try {
      const mats = await fetchDentalMaterials();
      setMaterialsList(mats);
      if (mats.length > 0) {
        setSelectedMatId(mats[0].id);
        const stocks = mats[0].stocks || [];
        setSelectedStockId(stocks.length > 0 ? stocks[0].id : "");
      }
    } catch (e) {
      console.error("Failed to fetch materials", e);
    }
    setMaterialConsumeOpen(true);
  };

  const handleConsumeSubmit = async () => {
    if (!id || !selectedMatId) {
      toast.error("يرجى اختيار المادة الخام");
      return;
    }
    if (consumeUnits <= 0) {
      toast.error("يرجى إدخال عدد وحدات صحيح");
      return;
    }
    setMaterialBusy(true);
    try {
      await consumeDentalCaseMaterial(id, {
        materialId: selectedMatId,
        materialStockId: selectedStockId || undefined,
        unitsUsed: Number(consumeUnits),
        notes: consumeNotes.trim() || undefined,
      });
      toast.success("تم تسجيل استهلاك الخامة بنجاح وخصمها من الرصيد والتشغيلة");
      setMaterialConsumeOpen(false);
      setConsumeNotes("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تسجيل استهلاك الخامة");
    } finally {
      setMaterialBusy(false);
    }
  };

  const handleDeleteMaterialUsage = async (usageId: string) => {
    if (!id || materialBusy) return;
    if (!window.confirm("هل أنت متأكد من إلغاء هذا الاستهلاك واستعادة الرصيد للمخزن؟")) return;
    setMaterialBusy(true);
    try {
      await deleteDentalCaseMaterialUsage(id, usageId);
      toast.success("تم إلغاء الاستهلاك واسترجاع الرصيد بنجاح");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إلغاء الاستهلاك");
    } finally {
      setMaterialBusy(false);
    }
  };

  const openWorkOrder = async () => {
    if (!id || workOrderLoading) return;
    setWorkOrderLoading(true);
    try {
      const blob = await fetchWorkOrderPdf(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setWorkOrderLoading(false);
    }
  };

  const openPanLabel = async () => {
    if (!id || panLabelLoading) return;
    setPanLabelLoading(true);
    try {
      const blob = await fetchPanLabelPdf(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setPanLabelLoading(false);
    }
  };

  const openWarrantyCertificate = async () => {
    if (!id || warrantyLoading) return;
    setWarrantyLoading(true);
    try {
      const blob = await fetchWarrantyCertificatePdf(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setWarrantyLoading(false);
    }
  };

  const handleResolveRefab = async (refab: DentalRefabrication) => {
    if (!id || refabBusyId) return;
    if (!window.confirm(String(t("dentalLab.detail.refabResolveConfirm")))) return;
    setRefabBusyId(refab.id);
    try {
      await resolveRefabrication(id, refab.id, {});
      toast.success(t("dentalLab.detail.refabResolved"));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRefabBusyId(null);
    }
  };

  const handleSnoozeOverdue = async (days: number) => {
    if (!id || snoozing) return;
    try {
      setSnoozing(true);
      const base = new Date();
      base.setDate(base.getDate() + days);
      const newDueDateIso = base.toISOString().split("T")[0];
      await updateCase(id, { dueDate: newDueDateIso });
      toast.success(
        `تم تأجيل تنبيه التأخير وتمديد ميعاد التسليم بمقدار ${days} يوم إلى ${fmtDate(newDueDateIso)}`
      );
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "فشل تأجيل تنبيه التأخير");
    } finally {
      setSnoozing(false);
    }
  };

  const handleReturnFromOutsource = async () => {
    if (!id || caseBusy) return;
    if (!window.confirm("هل تم استلام الشغل من الجهة الخارجية ونقله إلى مراجعة الجودة (QC)؟"))
      return;
    setCaseBusy(true);
    try {
      await advanceCase(id, {
        to: "QC",
        reason: "استلام الشغل من الجهة الخارجية",
        notes: "تم استلام الشغل من الجهة الخارجية بنجاح ونقله إلى فحص الجودة (QC).",
      });
      toast.success("تم استلام الشغل من الجهة الخارجية ونقله لفحص الجودة (QC)");
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "فشل استلام الشغل من الجهة الخارجية");
    } finally {
      setCaseBusy(false);
    }
  };

  const handleTrash = async () => {
    if (!id || caseBusy) return;
    if (!window.confirm("هل أنت متأكد من نقل هذه الحالة إلى سلة المهملات؟")) return;
    setCaseBusy(true);
    try {
      await trashCase(id);
      toast.success("تم نقل الحالة إلى سلة المهملات");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل نقل الحالة إلى سلة المهملات");
    } finally {
      setCaseBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!id || caseBusy) return;
    setCaseBusy(true);
    try {
      await restoreCase(id);
      toast.success("تمت استعادة الحالة بنجاح");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت استعادة الحالة");
    } finally {
      setCaseBusy(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!id || caseBusy) return;
    if (
      !window.confirm(
        "تحذير: هل أنت متأكد من الحذف النهائي للحالة؟ هذا الإجراء لا يمكن التراجع عنه."
      )
    )
      return;
    setCaseBusy(true);
    try {
      await permanentDeleteCase(id);
      toast.success("تم حذف الحالة نهائياً");
      window.location.href = "/dental-lab/cases";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف النهائي");
      setCaseBusy(false);
    }
  };

  const stages = (detail?.stages ?? []) as DentalCaseStage[];
  const attachments = (detail?.attachments ?? []) as DentalCaseAttachment[];
  const history = (detail?.history ?? []) as DentalCaseHistoryEntry[];
  const qualityChecks = (detail?.qualityChecks ?? []) as DentalQualityCheck[];
  const refabrications = (detail?.refabrications ?? []) as DentalRefabrication[];
  const creditNotes = (detail?.creditNotes ?? []) as CreditNote[];
  const materialUsages = (detail?.materialUsages ?? []) as DentalCaseMaterialUsage[];
  const latestCheck =
    qualityChecks.length > 0
      ? [...qualityChecks].sort(
          (a, b) => new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime()
        )[0]
      : undefined;

  return {
    id,
    detail,
    loading,
    error,
    refresh,
    technicians,
    doctors,
    workTypes,
    stages,
    attachments,
    history,
    qualityChecks,
    refabrications,
    creditNotes,
    materialUsages,
    latestCheck,
    // Modals
    assignStage,
    setAssignStage,
    advanceOpen,
    setAdvanceOpen,
    statusOpen,
    setStatusOpen,
    selectedModel,
    setSelectedModel,
    paymentInvoice,
    setPaymentInvoice,
    tryInSendOpen,
    setTryInSendOpen,
    tryInReturnOpen,
    setTryInReturnOpen,
    outsourceOpen,
    setOutsourceOpen,
    qualityOpen,
    setQualityOpen,
    refabOpen,
    setRefabOpen,
    refabBusyId,
    // Actions
    caseBusy,
    snoozing,
    handleSnoozeOverdue,
    handleReturnFromOutsource,
    handleTrash,
    handleRestore,
    handlePermanentDelete,
    handleResolveRefab,
    // PDF
    workOrderLoading,
    panLabelLoading,
    warrantyLoading,
    openWorkOrder,
    openPanLabel,
    openWarrantyCertificate,
    // Uploads from useDentalCaseUploads
    ...uploads,
    // Materials
    materialConsumeOpen,
    setMaterialConsumeOpen,
    materialsList,
    selectedMatId,
    setSelectedMatId,
    selectedStockId,
    setSelectedStockId,
    consumeUnits,
    setConsumeUnits,
    consumeNotes,
    setConsumeNotes,
    materialBusy,
    handleOpenMaterialConsume,
    handleConsumeSubmit,
    handleDeleteMaterialUsage,
  };
}
