import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  createCase,
  fetchDoctorPricing,
  fetchDoctors,
  fetchPanLabelPdf,
  fetchTechnicians,
  fetchWorkTypes,
  IMPRESSION_TYPES,
  CASE_INTENTS,
  type DentalLabCase,
  type DentalLabDoctor,
  type DentalTechnician,
  type DentalTechnicianRole,
  type DentalWorkType,
} from "../../shared";
import {
  calculateDynamicDueDate,
  getDefaultDueDate,
  type Step,
} from "../types/quickOrderTypes";
import { useQuickOrderDraft } from "./useQuickOrderDraft";
import { useQuickOrderAttachments } from "./useQuickOrderAttachments";

export function useQuickOrderWizard({
  preselectedDoctor,
  onClose,
  onSaved,
}: {
  preselectedDoctor?: DentalLabDoctor | null;
  onClose: () => void;
  onSaved: (created: DentalLabCase) => void;
}) {
  const [step, setStep] = useState<Step>(preselectedDoctor ? 2 : 1);
  const [selectedDoctor, setSelectedDoctor] = useState<DentalLabDoctor | null>(
    preselectedDoctor || null
  );
  const [treatingDoctorName, setTreatingDoctorName] = useState("");
  const [customDoctorInput, setCustomDoctorInput] = useState(false);
  const [showNewDoctor, setShowNewDoctor] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [bypassCreditCheck, setBypassCreditCheck] = useState(false);

  const [allDoctors, setAllDoctors] = useState<DentalLabDoctor[]>([]);
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);
  const [doctorPricingMap, setDoctorPricingMap] = useState<Record<string, number>>({});
  const [refsLoading, setRefsLoading] = useState(false);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [unitsCount, setUnitsCount] = useState<number>(1);
  const [shade, setShade] = useState("");
  const [customShade, setCustomShade] = useState("");
  const [material, setMaterial] = useState("");
  const [impressionType, setImpressionType] = useState("SILICONE");
  const [caseIntent, setCaseIntent] = useState("FINAL");
  const [priceSnapshot, setPriceSnapshot] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [receivedDate, setReceivedDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() => getDefaultDueDate());
  const [isDueDateUserModified, setIsDueDateUserModified] = useState(false);
  const [dueDateReason, setDueDateReason] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT" | "STAT">("NORMAL");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedTechnicianRole, setSelectedTechnicianRole] =
    useState<DentalTechnicianRole>("CAD_DESIGNER");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittingAndPrint, setSubmittingAndPrint] = useState(false);

  // Files & Attachments Hook
  const {
    files,
    setFiles,
    dragOver,
    setDragOver,
    fileInputRef,
    upProgress,
    upStatus,
    upTotalPct,
    upDoneCount,
    uploadFilesForCase,
  } = useQuickOrderAttachments();

  // Draft persistence hook
  const { draftRestored, clearDraft, removeSavedDraft } = useQuickOrderDraft({
    selectedDoctor,
    setSelectedDoctor,
    treatingDoctorName,
    setTreatingDoctorName,
    selectedServiceIds,
    setSelectedServiceIds,
    selectedTeeth,
    setSelectedTeeth,
    unitsCount,
    setUnitsCount,
    shade,
    setShade,
    customShade,
    setCustomShade,
    material,
    setMaterial,
    impressionType,
    setImpressionType,
    caseIntent,
    setCaseIntent,
    priceSnapshot,
    setPriceSnapshot,
    discount,
    setDiscount,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    receivedDate,
    setReceivedDate,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    notes,
    setNotes,
    selectedTechnicianId,
    setSelectedTechnicianId,
    selectedTechnicianRole,
    setSelectedTechnicianRole,
    preselectedDoctor,
    defaultDueDate: getDefaultDueDate(),
    setStep,
  });

  const primaryWorkType = useMemo(() => {
    const id = selectedServiceIds[0];
    return workTypes.find((w) => w.id === id) || null;
  }, [selectedServiceIds, workTypes]);

  // Dynamic due date calculation
  useEffect(() => {
    if (!isDueDateUserModified) {
      const calc = calculateDynamicDueDate(primaryWorkType, priority, receivedDate);
      setDueDate(calc.dateStr);
      setDueDateReason(calc.reason);
    }
  }, [primaryWorkType, priority, receivedDate, isDueDateUserModified]);

  // Load Initial Refs
  useEffect(() => {
    let mounted = true;
    setRefsLoading(true);
    Promise.all([
      fetchWorkTypes(),
      fetchDoctors(),
      fetchTechnicians().catch(() => ({ items: [] })),
    ])
      .then(([wts, docs, techRes]) => {
        if (!mounted) return;
        setWorkTypes(Array.isArray(wts) ? wts : []);
        setAllDoctors(Array.isArray(docs) ? docs : []);
        const rawTechs = (techRes as any)?.items || techRes;
        setTechnicians(Array.isArray(rawTechs) ? rawTechs.filter((x: any) => x.isActive) : []);
      })
      .catch(() => {
        toast.error("فشل تحميل البيانات المرجعية");
      })
      .finally(() => mounted && setRefsLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch doctor pricing map when selectedDoctor changes
  useEffect(() => {
    if (!selectedDoctor?.id) {
      setDoctorPricingMap({});
      return;
    }
    let cancelled = false;
    fetchDoctorPricing(selectedDoctor.id)
      .then((pricing) => {
        if (!cancelled && pricing) {
          const map: Record<string, number> = {};
          if (Array.isArray(pricing)) {
            pricing.forEach((p: any) => {
              if (p.workTypeId && p.price != null) {
                map[p.workTypeId] = Number(p.price);
              }
            });
          }
          setDoctorPricingMap(map);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedDoctor?.id]);

  // Debounced Doctor Search
  useEffect(() => {
    if (step !== 1) return;
    if (doctorSearch.trim().length === 0) {
      fetchDoctors()
        .then((docs) => setAllDoctors(Array.isArray(docs) ? docs : []))
        .catch(() => {});
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    const t2 = setTimeout(() => {
      fetchDoctors(doctorSearch.trim())
        .then((docs) => {
          if (!cancelled) setAllDoctors(Array.isArray(docs) ? docs : []);
        })
        .catch(() => {
          if (!cancelled) setAllDoctors([]);
        })
        .finally(() => {
          if (!cancelled) setDoctorsLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t2);
    };
  }, [doctorSearch, step]);

  const resolveUnitPrice = useCallback(
    (wt: DentalWorkType | undefined) => {
      if (!wt) return 0;
      if (doctorPricingMap[wt.id] != null) return Number(doctorPricingMap[wt.id]);
      return Number(wt.price) || 0;
    },
    [doctorPricingMap]
  );

  // Recalculate price when service, unitsCount, or teeth change
  useEffect(() => {
    if (primaryWorkType) {
      if (primaryWorkType.defaultMaterial) {
        setMaterial(primaryWorkType.defaultMaterial);
      }
      const count =
        selectedTeeth.length > 0
          ? selectedTeeth.length
          : primaryWorkType.defaultCrownCount || 1;
      setUnitsCount(count);
      const isPerUnit =
        (primaryWorkType.pricingMode || "PER_UNIT") === "PER_UNIT";
      const basePrice = resolveUnitPrice(primaryWorkType);
      setPriceSnapshot(isPerUnit ? count * basePrice : basePrice);
    }
  }, [selectedServiceIds, workTypes, doctorPricingMap, resolveUnitPrice, primaryWorkType]);

  const toggleService = (id: string, allowMulti = false) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return [];
        return prev.filter((x) => x !== id);
      }
      if (!allowMulti) {
        return [id];
      }
      return [id, ...prev.filter((x) => x !== id)];
    });
  };

  const handleTeethChange = (teethArr: string[]) => {
    setSelectedTeeth(teethArr);
    const count = teethArr.length > 0 ? teethArr.length : 1;
    setUnitsCount(count);
    if (
      primaryWorkType &&
      (primaryWorkType.pricingMode || "PER_UNIT") === "PER_UNIT"
    ) {
      setPriceSnapshot(count * resolveUnitPrice(primaryWorkType));
    }
  };

  const handleManualUnitsChange = (n: number) => {
    const count = Math.max(1, n);
    setUnitsCount(count);
    if (
      primaryWorkType &&
      (primaryWorkType.pricingMode || "PER_UNIT") === "PER_UNIT"
    ) {
      setPriceSnapshot(count * resolveUnitPrice(primaryWorkType));
    }
  };

  const handleCancel = () => {
    removeSavedDraft();
    onClose();
  };

  const submitOrder = async (andPrint = false) => {
    if (submitting || submittingAndPrint) return;
    if (!selectedDoctor) {
      toast.error("يرجى اختيار الطبيب أولاً");
      setStep(1);
      return;
    }
    if (selectedServiceIds.length === 0) {
      toast.error("يرجى اختيار نوع الشغل المطلوب");
      setStep(2);
      return;
    }
    if (!patientName.trim()) {
      toast.error("اسم المريض مطلوب");
      setStep(3);
      return;
    }
    if (patientPhone.trim()) {
      const egPhoneRegex = /^(?:\+20|0)?1[0125][0-9]{8}$/;
      if (!egPhoneRegex.test(patientPhone.trim())) {
        toast.error("رقم هاتف المريض غير صحيح (يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ومكون من 11 رقماً)");
        setStep(3);
        return;
      }
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (dueDate && dueDate < todayStr) {
      toast.error("لا يمكن حفظ الحالة بتاريخ تسليم سابق لتاريخ اليوم");
      setStep(3);
      return;
    }

    const primaryId = selectedServiceIds[0];
    const primary = workTypes.find((w) => w.id === primaryId);
    const extraNames = selectedServiceIds
      .filter((sId) => sId !== primaryId)
      .map((sId) => workTypes.find((w) => w.id === sId)?.name)
      .filter(Boolean)
      .join("، ");

    const finalShade = customShade.trim() || shade.trim() || undefined;
    const impressionLabel =
      IMPRESSION_TYPES.find((i) => i.id === impressionType)?.label || impressionType;
    const intentLabel =
      CASE_INTENTS.find((c) => c.id === caseIntent)?.label || caseIntent;

    const effectiveDoctorName =
      treatingDoctorName.trim() || selectedDoctor.name;
    const metadataParts = [
      treatingDoctorName.trim() && treatingDoctorName.trim() !== selectedDoctor.name
        ? `الطبيب المعالج: د. ${treatingDoctorName.trim()}`
        : null,
      `نوع الطبعة: ${impressionLabel}`,
      `نوع الطلب: ${intentLabel}`,
      extraNames && `خدمات إضافية: ${extraNames}`,
      notes.trim(),
    ].filter(Boolean);

    const finalNotes = metadataParts.join(" | ") || undefined;
    const teethStr = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : undefined;

    if (andPrint) {
      setSubmittingAndPrint(true);
    } else {
      setSubmitting(true);
    }

    try {
      const created = await createCase({
        doctorId: selectedDoctor.id,
        doctorName: effectiveDoctorName,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: primaryId,
        workTypeName: primary?.name,
        unitsCount: Math.max(1, Number(unitsCount) || 1),
        unitPrice: primary ? resolveUnitPrice(primary) : undefined,
        teeth: teethStr,
        shade: finalShade,
        material: material.trim() || undefined,
        priceSnapshot: Number(priceSnapshot) || 0,
        discount: Number(discount) || 0,
        receivedDate: receivedDate || undefined,
        dueDate: dueDate || undefined,
        priority,
        notes: finalNotes,
        source: "QUICK_ORDER",
        technicianId: selectedTechnicianId || undefined,
        technicianRole: selectedTechnicianId ? selectedTechnicianRole : undefined,
      });

      removeSavedDraft();

      if (files.length > 0) {
        await uploadFilesForCase(created.id);
      } else {
        toast.success("تم إنشاء أمر الشغل السريع بنجاح!");
      }

      if (andPrint) {
        try {
          const blob = await fetchPanLabelPdf(created.id);
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
          toast.success("تم فتح كارت الباركود (Pan Label) للطباعة فوراً!");
        } catch (printErr) {
          console.error("Failed to fetch pan label:", printErr);
          toast.warning("تم حفظ الحالة ولكن تعذر فتح كارت الباركود تلقائياً");
        }
      }

      onSaved(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الحالة");
    } finally {
      setSubmitting(false);
      setSubmittingAndPrint(false);
    }
  };

  return {
    step,
    setStep,
    selectedDoctor,
    setSelectedDoctor,
    treatingDoctorName,
    setTreatingDoctorName,
    customDoctorInput,
    setCustomDoctorInput,
    showNewDoctor,
    setShowNewDoctor,
    doctorSearch,
    setDoctorSearch,
    doctorsLoading,
    bypassCreditCheck,
    setBypassCreditCheck,
    allDoctors,
    setAllDoctors,
    workTypes,
    technicians,
    doctorPricingMap,
    refsLoading,
    selectedServiceIds,
    toggleService,
    selectedTeeth,
    handleTeethChange,
    unitsCount,
    handleManualUnitsChange,
    shade,
    setShade,
    customShade,
    setCustomShade,
    material,
    setMaterial,
    impressionType,
    setImpressionType,
    caseIntent,
    setCaseIntent,
    priceSnapshot,
    setPriceSnapshot,
    discount,
    setDiscount,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    receivedDate,
    setReceivedDate,
    dueDate,
    setDueDate,
    isDueDateUserModified,
    setIsDueDateUserModified,
    dueDateReason,
    priority,
    setPriority,
    selectedTechnicianId,
    setSelectedTechnicianId,
    selectedTechnicianRole,
    setSelectedTechnicianRole,
    notes,
    setNotes,
    files,
    setFiles,
    submitting,
    submittingAndPrint,
    dragOver,
    setDragOver,
    fileInputRef,
    draftRestored,
    upProgress,
    upStatus,
    upTotalPct,
    upDoneCount,
    primaryWorkType,
    clearDraft,
    handleCancel,
    submitOrder,
  };
}

export default useQuickOrderWizard;
