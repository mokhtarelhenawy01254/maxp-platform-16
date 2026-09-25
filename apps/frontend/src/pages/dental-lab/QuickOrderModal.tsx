import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users2,
  Wallet,
  Printer,
  RotateCcw,
  X as XMarkIcon,
} from "lucide-react";
import {
  DentalLabCase,
  DentalLabDoctor,
  DentalWorkType,
  DentalTechnician,
  DentalTechnicianRole,
  ROLE_CONFIG,
  PRIORITY_CONFIG,
  createCase,
  createDoctor,
  fetchDoctors,
  fetchWorkTypes,
  fetchTechnicians,
  fetchDoctorPricing,
  fetchPanLabelPdf,
  fmtMoney,
  uploadCaseAttachments,
  inferAttachmentKind,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  VITA_SHADES,
  BLEACH_SHADES,
  IMPRESSION_TYPES,
  CASE_INTENTS,
} from "./shared";
import OdontogramChart from "./OdontogramChart";

type Step = 1 | 2 | 3;

interface QuickOrderModalProps {
  onClose: () => void;
  onSaved: (created: DentalLabCase) => void;
  preselectedDoctor?: DentalLabDoctor | null;
}

const inputCls = `${MODAL_INPUT_CLS} text-sm`;
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function fmtBytes(n?: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (["stl", "ply", "dxf", "dcm"].includes(ext)) return <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 rounded">3D</span>;
  if (["json", "txt"].includes(ext)) return <FileText className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

function stepLabel(step: Step): string {
  if (step === 1) return "الطبيب والعيادة";
  if (step === 2) return "الخدمة والأسنان واللون";
  return "المريض والملفات";
}

function calculateDynamicDueDate(
  workType?: DentalWorkType | null,
  priority: "NORMAL" | "URGENT" | "STAT" = "NORMAL",
  baseDateStr?: string
): { dateStr: string; reason: string } {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  if (isNaN(base.getTime())) base.setTime(Date.now());

  let leadDays = (workType && typeof workType.leadTimeDays === 'number' && workType.leadTimeDays > 0)
    ? workType.leadTimeDays
    : 3;

  let reason = `${workType?.name || 'المدة القياسية'} (${leadDays} أيام عمل)`;

  if (priority === 'URGENT') {
    const reduced = (workType && typeof workType.urgentLeadTimeDays === 'number' && workType.urgentLeadTimeDays > 0)
      ? workType.urgentLeadTimeDays
      : Math.max(1, Math.ceil(leadDays * 0.5));
    reason = `${workType?.name || 'نوع العمل'} (مستعجل: ${reduced} أيام بدل ${leadDays})`;
    leadDays = reduced;
  } else if (priority === 'STAT') {
    leadDays = 1;
    reason = `${workType?.name || 'نوع العمل'} (طارئ جداً: يوم واحد)`;
  }

  const result = new Date(base);
  result.setDate(result.getDate() + leadDays);
  return {
    dateStr: result.toISOString().split("T")[0],
    reason,
  };
}

function getDefaultDueDate(workType?: DentalWorkType | null, priority: "NORMAL" | "URGENT" | "STAT" = "NORMAL"): string {
  return calculateDynamicDueDate(workType, priority).dateStr;
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {steps.map((s, idx) => {
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : active
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "border-gray-300 dark:border-gray-600 text-gray-400",
              ].join(" ")}
            >
              {done ? <Check className="w-4 h-4 stroke-[3]" /> : s}
            </div>
            <span
              className={[
                "text-xs sm:text-sm font-medium",
                active ? "font-bold text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400",
              ].join(" ")}
            >
              {stepLabel(s)}
            </span>
            {idx < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
          </div>
        );
      })}
    </div>
  );
}

function DoctorCard({
  doctor,
  selected,
  onSelect,
}: {
  doctor: DentalLabDoctor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-right rounded-xl border-2 p-3 transition text-start",
        selected
          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-900/25 ring-1 ring-blue-400"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          {doctor.name}
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
      </div>
      {doctor.clinicName && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          {doctor.clinicName}
        </div>
      )}
      {doctor.phone && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono" dir="ltr">{doctor.phone}</div>}
      <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[11px]">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1.5 text-center">
          <div className="text-gray-400">الرصيد المعلق</div>
          <div className={`font-bold ${Number(doctor.outstanding) > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-600"}`} dir="ltr">
            {fmtMoney(doctor.outstanding)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1.5 text-center">
          <div className="text-gray-400">حالات نشطة</div>
          <div className="font-bold text-blue-600 dark:text-blue-400" dir="ltr">{doctor.activeCases ?? 0}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1.5 text-center">
          <div className="text-gray-400">حد الائتمان</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
            {doctor.creditLimit ? fmtMoney(doctor.creditLimit) : "—"}
          </div>
        </div>
      </div>
      {doctor.creditExceeded && (
        <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1.5 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>تنبيه: الطبيب تجاوز حد الائتمان المسموح</span>
        </div>
      )}
    </button>
  );
}

function NewDoctorInline({
  onCreated,
  onCancel,
}: {
  onCreated: (d: DentalLabDoctor) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) { toast.error("اسم الطبيب مطلوب"); return; }
    setSaving(true);
    try {
      const created = await createDoctor({ name: name.trim(), phone: phone.trim() || undefined, clinicName: clinicName.trim() || undefined, isActive: true });
      toast.success("تمت إضافة الطبيب بنجاح");
      onCreated(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ الطبيب");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" />
          إضافة طبيب وعيادة جديدة فوراً
        </div>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inputCls} placeholder="اسم الطبيب (د. فلان) *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className={inputCls} placeholder="رقم الهاتف (01xxxxxxxxx)" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        <input className={`${inputCls} sm:col-span-2`} placeholder="اسم العيادة أو المركز الطبي" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 shadow-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          حفظ واختيار الطبيب
        </button>
      </div>
    </div>
  );
}

export default function QuickOrderModal({ onClose, onSaved, preselectedDoctor }: QuickOrderModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(preselectedDoctor ? 2 : 1);

  // Reference data
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [allDoctors, setAllDoctors] = useState<DentalLabDoctor[]>([]);
  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);

  // Step 1: Doctor selection & financial check
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<DentalLabDoctor | null>(preselectedDoctor || null);
  const [showNewDoctor, setShowNewDoctor] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [bypassCreditCheck, setBypassCreditCheck] = useState(false);
  const [doctorPricingMap, setDoctorPricingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedDoctor?.id) {
      fetchDoctorPricing(selectedDoctor.id)
        .then((map) => setDoctorPricingMap(map || {}))
        .catch(() => setDoctorPricingMap({}));
    } else {
      setDoctorPricingMap({});
    }
  }, [selectedDoctor?.id]);

  // Step 2: Services, Teeth, Shade, Impression & Try-in
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [unitsCount, setUnitsCount] = useState(1);
  const [shade, setShade] = useState("");
  const [customShade, setCustomShade] = useState("");
  const [material, setMaterial] = useState("");
  const [impressionType, setImpressionType] = useState("SILICONE");
  const [caseIntent, setCaseIntent] = useState("FINAL");
  const [priceSnapshot, setPriceSnapshot] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Step 3: Patient, Due Date, Priority, Notes & Files
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => getDefaultDueDate());
  const [dueDateReason, setDueDateReason] = useState("");
  const [isDueDateUserModified, setIsDueDateUserModified] = useState(false);
  const [priority, setPriority] = useState<"NORMAL" | "URGENT" | "STAT">("NORMAL");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [selectedTechnicianRole, setSelectedTechnicianRole] = useState<DentalTechnicianRole>("CAD_DESIGNER");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const primaryWorkType = useMemo(() => {
    const id = selectedServiceIds[0];
    return workTypes.find((w) => w.id === id) || null;
  }, [selectedServiceIds, workTypes]);

  useEffect(() => {
    if (!isDueDateUserModified) {
      const calc = calculateDynamicDueDate(primaryWorkType, priority, receivedDate);
      setDueDate(calc.dateStr);
      setDueDateReason(calc.reason);
    }
  }, [primaryWorkType, priority, receivedDate, isDueDateUserModified]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingAndPrint, setSubmittingAndPrint] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft key & restoration state
  const DRAFT_KEY = "maxp_dental_quick_order_draft_v1";
  const [draftRestored, setDraftRestored] = useState(false);

  // Per-file upload progress
  const [upProgress, setUpProgress] = useState<Record<string, number>>({});
  const [upStatus, setUpStatus] = useState<Record<string, "uploading" | "done" | "error">>({});
  const [upTotalPct, setUpTotalPct] = useState(0);
  const [upDoneCount, setUpDoneCount] = useState(0);

  // Restore draft once on mount
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d && typeof d === "object") {
          if (d.doctor && !preselectedDoctor) setSelectedDoctor(d.doctor);
          if (Array.isArray(d.selectedServiceIds) && d.selectedServiceIds.length > 0) setSelectedServiceIds(d.selectedServiceIds);
          if (Array.isArray(d.selectedTeeth)) setSelectedTeeth(d.selectedTeeth);
          if (d.unitsCount) setUnitsCount(d.unitsCount);
          if (d.shade) setShade(d.shade);
          if (d.customShade) setCustomShade(d.customShade);
          if (d.material) setMaterial(d.material);
          if (d.impressionType) setImpressionType(d.impressionType);
          if (d.caseIntent) setCaseIntent(d.caseIntent);
          if (d.priceSnapshot) setPriceSnapshot(d.priceSnapshot);
          if (d.discount) setDiscount(d.discount);
          if (d.patientName) setPatientName(d.patientName);
          if (d.patientPhone) setPatientPhone(d.patientPhone);
          if (d.receivedDate) setReceivedDate(d.receivedDate);
          if (d.dueDate) setDueDate(d.dueDate);
          if (d.priority) setPriority(d.priority);
          if (d.notes) setNotes(d.notes);
          if (d.technicianId) setSelectedTechnicianId(d.technicianId);
          if (d.technicianRole) setSelectedTechnicianRole(d.technicianRole);
          setDraftRestored(true);
        }
      }
    } catch {
      // ignore
    }
  }, [preselectedDoctor]);

  // Debounced auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDoctor || selectedServiceIds.length > 0 || patientName.trim()) {
        try {
          const draft = {
            doctor: selectedDoctor,
            selectedServiceIds,
            selectedTeeth,
            unitsCount,
            shade,
            customShade,
            material,
            impressionType,
            caseIntent,
            priceSnapshot,
            discount,
            patientName,
            patientPhone,
            receivedDate,
            dueDate,
            priority,
            notes,
            technicianId: selectedTechnicianId,
            technicianRole: selectedTechnicianRole,
          };
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch {
          // ignore
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    selectedDoctor, selectedServiceIds, selectedTeeth, unitsCount, shade, customShade,
    material, impressionType, caseIntent, priceSnapshot, discount, patientName, patientPhone,
    receivedDate, dueDate, priority, notes, selectedTechnicianId, selectedTechnicianRole,
  ]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
      setDraftRestored(false);
      if (!preselectedDoctor) setSelectedDoctor(null);
      setSelectedServiceIds([]);
      setSelectedTeeth([]);
      setUnitsCount(1);
      setShade("");
      setCustomShade("");
      setMaterial("");
      setImpressionType("SILICONE");
      setCaseIntent("FINAL");
      setPriceSnapshot(0);
      setDiscount(0);
      setPatientName("");
      setPatientPhone("");
      setReceivedDate(new Date().toISOString().split("T")[0]);
      setDueDate(getDefaultDueDate());
      setPriority("NORMAL");
      setNotes("");
      setSelectedTechnicianId("");
      setSelectedTechnicianRole("CAD_DESIGNER");
      setStep(preselectedDoctor ? 2 : 1);
      toast.info("تم تفريغ المسودة وإعادة تعيين النموذج");
    } catch {
      // ignore
    }
  };

  const handleCancel = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    onClose();
  };

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
    return () => { mounted = false; };
  }, []);

  // Debounced Doctor Search
  useEffect(() => {
    if (step !== 1) return;
    if (doctorSearch.trim().length === 0) {
      fetchDoctors().then(docs => setAllDoctors(Array.isArray(docs) ? docs : [])).catch(() => {});
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    const t2 = setTimeout(() => {
      fetchDoctors(doctorSearch.trim())
        .then((docs) => { if (!cancelled) setAllDoctors(Array.isArray(docs) ? docs : []); })
        .catch(() => { if (!cancelled) setAllDoctors([]); })
        .finally(() => { if (!cancelled) setDoctorsLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t2); };
  }, [doctorSearch, step]);

  const activeWorkTypes = useMemo(() => workTypes.filter((w) => w.isActive), [workTypes]);

  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => workTypes.find((w) => w.id === id)).filter(Boolean) as DentalWorkType[],
    [workTypes, selectedServiceIds],
  );

  const primaryService = selectedServices[0] || null;

  // Toggle or Switch Services in Step 2 (replaces by default to prevent unintentional stacking)
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

  const resolveUnitPrice = useCallback((wt: DentalWorkType | undefined) => {
    if (!wt) return 0;
    if (doctorPricingMap[wt.id] != null) return Number(doctorPricingMap[wt.id]);
    return Number(wt.price) || 0;
  }, [doctorPricingMap]);

  // Recalculate price when service, unitsCount, or teeth change
  useEffect(() => {
    if (primaryService) {
      if (primaryService.defaultMaterial) {
        setMaterial(primaryService.defaultMaterial);
      }
      const count = selectedTeeth.length > 0 ? selectedTeeth.length : (primaryService.defaultCrownCount || 1);
      setUnitsCount(count);
      const isPerUnit = (primaryService.pricingMode || "PER_UNIT") === "PER_UNIT";
      const basePrice = resolveUnitPrice(primaryService);
      setPriceSnapshot(isPerUnit ? count * basePrice : basePrice);
    }
  }, [selectedServiceIds, workTypes, doctorPricingMap, resolveUnitPrice]);

  // Handle Tooth Selection from Odontogram
  const handleTeethChange = (teethArr: string[]) => {
    setSelectedTeeth(teethArr);
    const count = teethArr.length > 0 ? teethArr.length : 1;
    setUnitsCount(count);
    if (primaryService && (primaryService.pricingMode || "PER_UNIT") === "PER_UNIT") {
      setPriceSnapshot(count * resolveUnitPrice(primaryService));
    }
  };

  const handleManualUnitsChange = (n: number) => {
    const count = Math.max(1, n);
    setUnitsCount(count);
    if (primaryService && (primaryService.pricingMode || "PER_UNIT") === "PER_UNIT") {
      setPriceSnapshot(count * resolveUnitPrice(primaryService));
    }
  };

  const addFiles = (picked: FileList | File[]) => {
    const arr = Array.from(picked);
    if (arr.length === 0) return;
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  // Submit Quick Order
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
    const extraNames = selectedServices
      .filter((s) => s.id !== primaryId)
      .map((s) => s.name)
      .join("، ");

    const finalShade = customShade.trim() || shade.trim() || undefined;
    const impressionLabel = IMPRESSION_TYPES.find(i => i.id === impressionType)?.label || impressionType;
    const intentLabel = CASE_INTENTS.find(c => c.id === caseIntent)?.label || caseIntent;

    const metadataParts = [
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

      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      if (files.length > 0) {
        try {
          const { apiClient } = await import("@/services/api");
          const totalBytes = files.reduce((s, f) => s + f.size, 0);
          let doneBytes = 0;
          let done = 0;
          let errors = 0;
          for (const f of files) {
            const fd = new FormData();
            fd.append("files", f);
            fd.append("kinds", inferAttachmentKind(f.name));
            setUpStatus((p) => ({ ...p, [f.name]: "uploading" }));
            try {
              await apiClient.post(`/dental-lab/cases/${created.id}/attachments`, fd, {
                timeout: 600000,
                onUploadProgress: (ev) => {
                  const pct = ev.total ? Math.round((ev.loaded * 100) / ev.total) : 0;
                  setUpProgress((p) => ({ ...p, [f.name]: pct }));
                },
              });
              setUpStatus((p) => ({ ...p, [f.name]: "done" }));
              setUpProgress((p) => ({ ...p, [f.name]: 100 }));
              doneBytes += f.size;
              done += 1;
            } catch {
              setUpStatus((p) => ({ ...p, [f.name]: "error" }));
              errors += 1;
            }
            setUpTotalPct(Math.round((doneBytes * 100) / (totalBytes || 1)));
            setUpDoneCount(done);
          }
          if (errors === 0) {
            toast.success(`تم إنشاء الحالة ورفع ${files.length} ملفات بنجاح`);
          } else {
            toast.warning(`تم إنشاء الحالة، ورُفع ${done} ملف (تعذر رفع ${errors})`);
          }
        } catch (err) {
          toast.error(`تم إنشاء الحالة لكن تعذر رفع بعض المرفقات: ${err instanceof Error ? err.message : ""}`);
        }
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

  const netTotal = Math.max(0, (Number(priceSnapshot) || 0) - (Number(discount) || 0));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={() => !submitting && handleCancel()}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-700 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                الطلب السريع لأمر الشغل
              </h3>
              {draftRestored && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                  <span>مسودة مسترجعة</span>
                  <button
                    type="button"
                    onClick={clearDraft}
                    title="تفريغ المسودة وبدء طلب جديد"
                    className="hover:text-red-600 p-0.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              تسجيل حالة جديدة، تحديد الأسنان، التحقق من الائتمان، وإسناد الفني في 3 خطوات بسيطة
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && !submittingAndPrint && handleCancel()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <StepIndicator current={step} />

          {/* STEP 1: DOCTOR & FINANCIAL STATUS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  اختر الطبيب أو العيادة المرسلة لأمر الشغل:
                </p>
                {!showNewDoctor && (
                  <button
                    type="button"
                    onClick={() => setShowNewDoctor(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    طبيب / عيادة جديدة
                  </button>
                )}
              </div>

              {showNewDoctor && (
                <NewDoctorInline
                  onCreated={(d) => {
                    setAllDoctors((prev) => [d, ...prev]);
                    setSelectedDoctor(d);
                    setShowNewDoctor(false);
                  }}
                  onCancel={() => setShowNewDoctor(false)}
                />
              )}

              <div className="relative">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
                <input
                  className={`${inputCls} pr-9`}
                  placeholder="بحث باسم الطبيب، العيادة، أو رقم الهاتف..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {selectedDoctor && (
                <div className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        د
                      </div>
                      <div>
                        <div className="font-bold text-sm text-blue-900 dark:text-blue-100">{selectedDoctor.name}</div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">{selectedDoctor.clinicName || "عيادة خاصة"}</div>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">الرصيد المستحق: </span>
                      <span className="font-bold text-sm text-amber-600 dark:text-amber-400">{fmtMoney(selectedDoctor.outstanding)} ج.م</span>
                    </div>
                  </div>

                  {selectedDoctor.creditExceeded && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>تحذير: الطبيب تجاوز حد الائتمان المحدد ({fmtMoney(selectedDoctor.creditLimit)} ج.م)</span>
                      </div>
                      <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={bypassCreditCheck}
                          onChange={(e) => setBypassCreditCheck(e.target.checked)}
                          className="rounded text-red-600"
                        />
                        موافقة على الاستثناء
                      </label>
                    </div>
                  )}
                </div>
              )}

              {doctorsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : allDoctors.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-400">لا يوجد أطباء مطابقين للبحث</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[40vh] overflow-y-auto">
                  {allDoctors.map((doc) => (
                    <DoctorCard
                      key={doc.id}
                      doctor={doc}
                      selected={selectedDoctor?.id === doc.id}
                      onSelect={() => setSelectedDoctor(doc)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SERVICES, ODONTOGRAM, SHADES & INTENT */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Service Picker */}
              <div>
                <label className={labelCls}>نوع الشغل والخدمة الأساسية *</label>
                {refsLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border dark:border-gray-700 rounded-xl">
                    {activeWorkTypes.map((w) => {
                      const checked = selectedServiceIds.includes(w.id);
                      const isPrimary = selectedServiceIds[0] === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={(e) => toggleService(w.id, e.shiftKey || e.ctrlKey || e.metaKey)}
                          className={[
                            "p-2.5 rounded-lg border text-right transition flex items-center justify-between text-xs",
                            checked
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold"
                              : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-800",
                          ].join(" ")}
                        >
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{w.name}</span>
                              {isPrimary && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-medium shrink-0">
                                  الأساسية
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-normal">
                              {w.price ? `${fmtMoney(w.price)} ج.م` : "—"} {w.pricingMode === "PER_UNIT" ? "/ وحدة" : ""}
                            </div>
                          </div>
                          {checked && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Interactive FDI Odontogram */}
              <div>
                <OdontogramChart
                  selectedTeeth={selectedTeeth}
                  onChange={handleTeethChange}
                />
              </div>

              {/* Shade Selector (VITA & Bleach) */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    دليل ألوان الأسنان (VITA)
                  </label>
                  {(shade || customShade) && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      اللون المختار: {customShade || shade}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {VITA_SHADES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setShade(s); setCustomShade(""); }}
                      className={[
                        "px-2.5 py-1 rounded text-xs font-mono font-bold transition",
                        shade === s && !customShade
                          ? "bg-amber-500 text-white shadow-sm ring-1 ring-amber-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-amber-900/30",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))}
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                  {BLEACH_SHADES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setShade(s); setCustomShade(""); }}
                      className={[
                        "px-2 py-1 rounded text-[11px] font-mono font-bold transition",
                        shade === s && !customShade
                          ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-300"
                          : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    className={inputCls}
                    placeholder="أو اكتب لوناً مخصصاً (مثال: 2M2, 3D Master, Gingiva Shade)..."
                    value={customShade}
                    onChange={(e) => { setCustomShade(e.target.value); if (e.target.value) setShade(e.target.value); }}
                  />
                </div>
              </div>

              {/* Impression Type & Case Intent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">نوع الطبعة المستلمة</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {IMPRESSION_TYPES.map((imp) => (
                      <button
                        key={imp.id}
                        type="button"
                        onClick={() => setImpressionType(imp.id)}
                        className={[
                          "p-2 rounded-lg text-start text-xs font-medium border transition flex items-center gap-1.5",
                          impressionType === imp.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-bold"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                        ].join(" ")}
                      >
                        <span>{imp.icon}</span>
                        <span className="truncate">{imp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">نوع مرحلة التسليم (تجربة / نهائي)</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CASE_INTENTS.map((intent) => (
                      <button
                        key={intent.id}
                        type="button"
                        onClick={() => setCaseIntent(intent.id)}
                        className={[
                          "p-2 rounded-lg text-start text-xs font-medium border transition flex flex-col",
                          caseIntent === intent.id
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 font-bold"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
                        ].join(" ")}
                      >
                        <span className="truncate">{intent.label}</span>
                        <span className="text-[10px] text-gray-400 font-normal truncate">{intent.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Material & Live Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>الخامة الطبية</label>
                  <input className={inputCls} placeholder="مثال: زيركون Katana" value={material} onChange={(e) => setMaterial(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>عدد الوحدات / الأسنان</label>
                  <input className={inputCls} type="number" min="1" value={unitsCount} onChange={(e) => handleManualUnitsChange(Number(e.target.value))} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>سعر الطلب (قبل الخصم)</label>
                    {primaryService && doctorPricingMap[primaryService.id] != null && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        سعر خاص ({fmtMoney(doctorPricingMap[primaryService.id])})
                      </span>
                    )}
                  </div>
                  <input className={inputCls} type="number" value={priceSnapshot} onChange={(e) => setPriceSnapshot(Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PATIENT, DUE DATE, 3D FILES & DISPATCH */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>اسم المريض *</label>
                  <input className={inputCls} placeholder="اسم المريض ثلاثي" value={patientName} onChange={(e) => setPatientName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className={labelCls}>رقم هاتف المريض (اختياري)</label>
                  <input className={inputCls} placeholder="01xxxxxxxxx" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} dir="ltr" />
                </div>
                <div>
                  <label className={labelCls}>تاريخ الدخول / الاستلام</label>
                  <input className={inputCls} type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>تاريخ التسليم المطلوب</label>
                  <input
                    className={inputCls}
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={dueDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const todayStr = new Date().toISOString().split("T")[0];
                      if (val && val < todayStr) {
                        toast.error("لا يمكن تحديد تاريخ تسليم سابق لتاريخ اليوم");
                        return;
                      }
                      setDueDate(val);
                      setIsDueDateUserModified(true);
                    }}
                  />
                  {dueDateReason && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      الموعد المقترح بناءً على: {dueDateReason}
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>الأولوية والاستعجال</label>
                  <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as "NORMAL" | "URGENT" | "STAT")}>
                    {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((k) => (
                      <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>ملاحظات فنية إضافية للمعمل</label>
                <textarea
                  className={`${inputCls} min-h-[55px] resize-y`}
                  placeholder="تعليمات الطبيب، تفاصيل الإطباق، تشريح الحواف..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Technician Assignment */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
                    <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>إسناد أمر الشغل لفني المعمل (اختياري)</span>
                  </div>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    يظهر فوراً في بوابة الفني
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>الفني المسؤول</label>
                    <select
                      className={inputCls}
                      value={selectedTechnicianId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedTechnicianId(id);
                        const tech = technicians.find((t) => t.id === id);
                        if (tech?.role) setSelectedTechnicianRole(tech.role);
                      }}
                    >
                      <option value="">-- بدون إسناد (سيتم التعيين لاحقاً) --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.role && ROLE_CONFIG[t.role]?.label ? `(${ROLE_CONFIG[t.role].label})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>دور الفني في هذه الحالة</label>
                    <select
                      className={inputCls}
                      disabled={!selectedTechnicianId}
                      value={selectedTechnicianRole}
                      onChange={(e) => setSelectedTechnicianRole(e.target.value as DentalTechnicianRole)}
                    >
                      <option value="CAD_DESIGNER">تصميم كاد (CAD Designer)</option>
                      <option value="CAM_OPERATOR">تفريز وكام (CAM Operator)</option>
                      <option value="CERAMIST">خزف وسيراميك (Ceramist)</option>
                      <option value="ORTHODONTIC">تقويم (Orthodontic)</option>
                      <option value="CASTING_WAX">صب وشمع (Wax & Casting)</option>
                      <option value="MODEL_MAKER">صب قوالب (Model Maker)</option>
                      <option value="FINISHING_POLISHING">فينشنج وتلميع (Finishing & Polish)</option>
                      <option value="QC_INSPECTOR">مراقبة جودة (QC Inspector)</option>
                      <option value="GENERAL_TECHNICIAN">فني أسنان عام (General)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-file drop zone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls + " mb-0"}>رفع ملفات المسح ثلاثي الأبعاد والصور (STL, PLY, PDF)</label>
                  <span className="text-[11px] text-gray-400">سحب وإفلات الملفات هنا</span>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  className={[
                    "rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition",
                    dragOver
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white dark:bg-gray-800",
                  ].join(" ")}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                  />
                  <Upload className="w-6 h-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">انقر لاختيار ملفات الـ STL، صور الكاميرا الفموية، أو الـ PDF</p>
                </div>

                {files.length > 0 && (
                  <ul className="mt-2 space-y-1 max-h-28 overflow-y-auto">
                    {files.map((f, idx) => {
                      const st = upStatus[f.name];
                      return (
                        <li key={`${f.name}-${idx}`} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {fileIcon(f.name)}
                            <span className="truncate">{f.name}</span>
                            <span className="text-gray-400 shrink-0 font-mono" dir="ltr">{fmtBytes(f.size)}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {st === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                            {st === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                            {!submitting && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Order Summary & Pricing Breakdown */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2 text-xs">
                <div className="font-bold text-blue-900 dark:text-blue-100 flex items-center justify-between border-b border-blue-200/60 dark:border-blue-800/60 pb-1.5">
                  <span>ملخص أمر الشغل النهائي</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    صافي الإجمالي: {fmtMoney(netTotal)} ج.م
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-700 dark:text-gray-300">
                  <div><span className="text-gray-400">الطبيب: </span>{selectedDoctor?.name || "—"}</div>
                  <div><span className="text-gray-400">الخدمة: </span>{primaryService?.name || "—"}</div>
                  <div><span className="text-gray-400">الأسنان: </span>{selectedTeeth.join(", ") || "—"}</div>
                  <div><span className="text-gray-400">عدد الوحدات: </span>{unitsCount}</div>
                  <div><span className="text-gray-400">اللون: </span>{customShade || shade || "غير محدد"}</div>
                  <div><span className="text-gray-400">الخامة: </span>{material || "—"}</div>
                  <div><span className="text-gray-400">الخصم: </span>{fmtMoney(discount)} ج.م</div>
                  <div><span className="text-gray-400">الأولوية: </span>{PRIORITY_CONFIG[priority].label}</div>
                  <div><span className="text-gray-400">تاريخ التسليم: </span>{dueDate || "غير محدد"}</div>
                  <div><span className="text-gray-400">الفني المسند: </span>{technicians.find((t) => t.id === selectedTechnicianId)?.name || "غير مسند"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={submitting}
                className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCancel()}
              disabled={submitting}
              className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !selectedDoctor) {
                    toast.error("يرجى اختيار الطبيب للمتابعة");
                    return;
                  }
                  if (step === 2 && selectedServiceIds.length === 0) {
                    toast.error("يرجى اختيار نوع الشغل للمتابعة");
                    return;
                  }
                  setStep((s) => (s + 1) as Step);
                }}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
              >
                التالي
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => submitOrder(true)}
                  disabled={submitting || submittingAndPrint || !patientName.trim()}
                  className="px-4 py-2 border border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  title="حفظ أمر الشغل وفتح كارت الباركود فوراً للطباعة"
                >
                  {submittingAndPrint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  حفظ وطباعة الباركود
                </button>
                <button
                  type="button"
                  onClick={() => submitOrder(false)}
                  disabled={submitting || submittingAndPrint || !patientName.trim()}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  حفظ أمر الشغل
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
