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
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  ScanLine,
  Search,
  Stethoscope,
  Trash2,
  Upload,
  UserPlus,
  Users2,
  Wallet,
  X as XMarkIcon,
} from "lucide-react";
import {
  DentalLabCase,
  DentalLabDoctor,
  DentalWorkType,
  PRIORITY_CONFIG,
  ScanParseResult,
  createCase,
  createDoctor,
  fetchDoctors,
  fetchWorkTypes,
  fmtMoney,
  parseScan,
  uploadCaseAttachments,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "./shared";

type Step = 1 | 2 | 3;

interface QuickOrderModalProps {
  onClose: () => void;
  onSaved: (created: DentalLabCase) => void;
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
  if (["stl", "ply", "dxf", "dcm"].includes(ext)) return <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold text-indigo-500">3D</span>;
  if (["json", "txt"].includes(ext)) return <FileText className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

function stepLabel(t: (k: string) => string, step: Step): string {
  if (step === 1) return t("dentalLab.cases.stepServices");
  if (step === 2) return t("dentalLab.cases.stepDoctor");
  return t("dentalLab.cases.stepPatient");
}

function StepIndicator({ current, t }: { current: Step; t: (k: string) => string }) {
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
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2",
                done
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-400",
              ].join(" ")}
            >
              {done ? <Check className="w-4 h-4" /> : s}
            </div>
            <span
              className={[
                "text-sm",
                active ? "font-semibold text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400",
              ].join(" ")}
            >
              {stepLabel(t, s)}
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
  t,
}: {
  doctor: DentalLabDoctor;
  selected: boolean;
  onSelect: () => void;
  t: (k: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-right rounded-xl border-2 p-3 transition",
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{doctor.name}</div>
        {selected && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
      </div>
      {doctor.clinicName && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
          <Building2 className="w-3 h-3" />{doctor.clinicName}
        </div>
      )}
      {doctor.phone && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5" dir="ltr">{doctor.phone}</div>}
      <div className="grid grid-cols-3 gap-1 mt-2 text-[11px]">
        <div className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-center">
          <div className="text-gray-400">{t("dentalLab.cases.doctorOutstanding")}</div>
          <div className="font-semibold text-amber-600 dark:text-amber-400" dir="ltr">{fmtMoney(doctor.outstanding)}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-center">
          <div className="text-gray-400">{t("dentalLab.cases.doctorActiveCases")}</div>
          <div className="font-semibold text-blue-600 dark:text-blue-400" dir="ltr">{doctor.activeCases ?? 0}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 text-center">
          <div className="text-gray-400">{t("dentalLab.cases.doctorCreditLimit")}</div>
          <div className="font-semibold text-emerald-600 dark:text-emerald-400" dir="ltr">
            {doctor.creditLimit ? fmtMoney(doctor.creditLimit) : "—"}
          </div>
        </div>
      </div>
      {(doctor.overdueCases ?? 0) > 0 && (
        <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">
          {t("dentalLab.cases.doctorOverdue")}: {doctor.overdueCases}
        </div>
      )}
      {doctor.creditExceeded && (
        <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1">
          ⚠ {t("dentalLab.cases.creditExceeded")}
        </div>
      )}
    </button>
  );
}

function NewDoctorInline({
  onCreated,
  onCancel,
  t,
}: {
  onCreated: (d: DentalLabDoctor) => void;
  onCancel: () => void;
  t: (k: string) => string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) { toast.error(t("dentalLab.cases.doctorNamePh")); return; }
    setSaving(true);
    try {
      const created = await createDoctor({ name: name.trim(), phone: phone.trim() || undefined, clinicName: clinicName.trim() || undefined, isActive: true });
      toast.success(t("dentalLab.common.saved"));
      onCreated(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
          <UserPlus className="w-4 h-4" />{t("dentalLab.cases.newDoctorInlineTitle")}
        </div>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inputCls} placeholder={t("dentalLab.cases.doctorNamePh")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className={inputCls} placeholder={t("dentalLab.cases.doctorPhonePh")} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        <input className={`${inputCls} sm:col-span-2`} placeholder={t("dentalLab.cases.doctorClinicPh")} value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t("dentalLab.common.save")}
        </button>
      </div>
    </div>
  );
}

export default function QuickOrderModal({ onClose, onSaved }: QuickOrderModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);

  // Reference data
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [allDoctors, setAllDoctors] = useState<DentalLabDoctor[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);

  // Step 1: services
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Step 2: doctor
  const [doctorSearch, setDoctorSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<DentalLabDoctor | null>(null);
  const [showNewDoctor, setShowNewDoctor] = useState(false);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // Step 3: patient + files
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [teeth, setTeeth] = useState("");
  const [shade, setShade] = useState("");
  const [material, setMaterial] = useState("");
  const [priceSnapshot, setPriceSnapshot] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT" | "STAT">("NORMAL");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // load refs once
  useEffect(() => {
    let mounted = true;
    setRefsLoading(true);
    Promise.all([fetchWorkTypes(), fetchDoctors()])
      .then(([wts, docs]) => {
        if (!mounted) return;
        setWorkTypes(Array.isArray(wts) ? wts : []);
        setAllDoctors(Array.isArray(docs) ? docs : []);
      })
      .catch(() => {
        toast.error(t("dentalLab.common.noData"));
      })
      .finally(() => mounted && setRefsLoading(false));
    return () => { mounted = false; };
  }, [t]);

  // debounced doctor search
  useEffect(() => {
    if (step !== 2) return;
    if (doctorSearch.trim().length === 0) { setAllDoctors([]); return; }
    let cancelled = false;
    setDoctorsLoading(true);
    const t2 = setTimeout(() => {
      fetchDoctors(doctorSearch.trim())
        .then((docs) => { if (!cancelled) setAllDoctors(Array.isArray(docs) ? docs : []); })
        .catch(() => { if (!cancelled) setAllDoctors([]); })
        .finally(() => { if (!cancelled) setDoctorsLoading(false); });
    }, 280);
    return () => { cancelled = true; clearTimeout(t2); };
  }, [doctorSearch, step]);

  const activeWorkTypes = useMemo(() => workTypes.filter((w) => w.isActive), [workTypes]);

  const selectedServices = useMemo(
    () => workTypes.filter((w) => selectedServiceIds.includes(w.id)),
    [workTypes, selectedServiceIds],
  );

  const subtotal = useMemo(
    () => selectedServices.reduce((s, w) => s + (Number(w.price) || 0), 0),
    [selectedServices],
  );

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // الـ schema الحالي يقبل workTypeId واحد فقط — نخلي أول واحد هو الأساسي
      const next = prev.length === 0 ? [id] : [prev[0], id];
      return Array.from(new Set(next));
    });
  };

  // عند اختيار أول خدمة، عبّي السعر تلقائياً
  useEffect(() => {
    if (selectedServiceIds.length > 0) {
      const primary = workTypes.find((w) => w.id === selectedServiceIds[0]);
      if (primary && primary.price != null) setPriceSnapshot(Number(primary.price) || 0);
    }
  }, [selectedServiceIds, workTypes]);

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
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  };

  const handleParseFile = async (file: File) => {
    setParseMsg("");
    try {
      const result: ScanParseResult = await parseScan(file);
      if (result.patientName) setPatientName((p) => p || String(result.patientName));
      if (result.teeth) setTeeth((p) => p || String(result.teeth));
      if (result.shade) setShade((p) => p || String(result.shade));
      if (result.material) setMaterial((p) => p || String(result.material));
      if (result.workTypeHint) {
        const match = workTypes.find((w) =>
          w.name && String(result.workTypeHint).toLowerCase().includes(w.name.toLowerCase()),
        );
        if (match) {
          setSelectedServiceIds((prev) => (prev.includes(match.id) ? prev : [...prev, match.id]));
        }
      }
      if (result.dueDate) {
        const d = new Date(result.dueDate);
        if (!Number.isNaN(d.getTime())) {
          const iso = d.toISOString().slice(0, 10);
          setDueDate((p) => p || iso);
        }
      }
      if (result.notes) setNotes((p) => p || String(result.notes));
      setParseMsg(t("dentalLab.cases.scanDone"));
      toast.success(t("dentalLab.cases.scanDone"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.cases.scanFailed"));
    }
  };

  const canNextFromStep1 = selectedServiceIds.length > 0;
  const canNextFromStep2 = selectedDoctor !== null;

  const submit = async () => {
    if (submitting) return;
    if (!patientName.trim()) { toast.error(t("dentalLab.cases.patientNamePh")); setStep(3); return; }
    const primaryId = selectedServiceIds[0];
    const primary = workTypes.find((w) => w.id === primaryId);
    const extraNames = selectedServices
      .filter((s) => s.id !== primaryId)
      .map((s) => s.name)
      .join("، ");
    const finalNotes = [notes.trim(), extraNames && `خدمات إضافية: ${extraNames}`].filter(Boolean).join(" | ") || undefined;

    setSubmitting(true);
    try {
      const created = await createCase({
        doctorId: selectedDoctor?.id,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: primaryId,
        workTypeName: primary?.name,
        teeth: teeth.trim() || undefined,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        priceSnapshot: Number(priceSnapshot) || 0,
        discount: Number(discount) || 0,
        dueDate: dueDate || undefined,
        priority,
        notes: finalNotes,
        source: "QUICK_ORDER",
      });

      if (files.length > 0) {
        try {
          // Don't force kind="SCAN" — let inferAttachmentKind pick the right
          // type per file (STL→SCAN, JPG→PHOTO, PDF→PRESCRIPTION, etc).
          await uploadCaseAttachments(created.id, files);
          toast.success(t("dentalLab.cases.filesUploaded", { count: files.length }));
        } catch (err) {
          toast.error(`اتعملت الحالة لكن فشل رفع بعض الملفات: ${err instanceof Error ? err.message : ""}`);
        }
      }
      toast.success(t("dentalLab.common.saved"));
      onSaved(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => !submitting && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-3xl max-h-[92vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              {t("dentalLab.cases.quickOrder")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("dentalLab.cases.quickOrderSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
            aria-label="close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <StepIndicator current={step} t={t} />

        {/* Step 1: Services */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">{t("dentalLab.cases.servicesHint")}</p>
            {refsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : activeWorkTypes.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">{t("dentalLab.common.noData")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
                {activeWorkTypes.map((w) => {
                  const checked = selectedServiceIds.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleService(w.id)}
                      className={[
                        "text-right rounded-xl border-2 p-3 transition",
                        checked
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm">{w.name}</div>
                        {checked && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-mono" dir="ltr">{fmtMoney(w.price)} ج.م</span>
                        {w.leadTimeDays != null && <span>{w.leadTimeDays} يوم</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedServices.length > 0 && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Wallet className="w-4 h-4" />{t("dentalLab.cases.subtotal")}
                  </div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-300" dir="ltr">{fmtMoney(subtotal)} ج.م</div>
                </div>
                <ul className="mt-2 space-y-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  {selectedServices.map((s) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <span>{s.name}</span>
                      <span dir="ltr">{fmtMoney(s.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Doctor */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
              <input
                className={`${inputCls} pr-9`}
                placeholder={t("dentalLab.cases.doctorSearch")}
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                autoFocus
              />
            </div>

            {doctorsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : (
              <>
                {doctorSearch.trim() && allDoctors.length === 0 && !showNewDoctor && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t("dentalLab.cases.noDoctorFound")}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
                  {allDoctors.slice(0, 12).map((d) => (
                    <DoctorCard
                      key={d.id}
                      doctor={d}
                      selected={selectedDoctor?.id === d.id}
                      onSelect={() => { setSelectedDoctor(d); setShowNewDoctor(false); }}
                      t={t}
                    />
                  ))}
                </div>
              </>
            )}

            {showNewDoctor ? (
              <NewDoctorInline
                t={t}
                onCancel={() => setShowNewDoctor(false)}
                onCreated={(d) => { setAllDoctors((prev) => [d, ...prev]); setSelectedDoctor(d); setShowNewDoctor(false); }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowNewDoctor(true)}
                className="w-full rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 p-3 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/10 flex items-center justify-center gap-1"
              >
                <UserPlus className="w-4 h-4" />{t("dentalLab.cases.addNewDoctor")}
              </button>
            )}
          </div>
        )}

        {/* Step 3: Patient + files */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary box */}
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 text-sm">
              <div className="font-semibold text-blue-700 dark:text-blue-300 mb-1">{t("dentalLab.cases.summary")}</div>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                <li>
                  <Users2 className="w-3 h-3 inline" /> {t("dentalLab.cases.doctorSummary")}: <b>{selectedDoctor?.name || "—"}</b>
                </li>
                <li>
                  <Stethoscope className="w-3 h-3 inline" /> {selectedServices.length} {t("dentalLab.cases.service")} ·{" "}
                  <span dir="ltr">{fmtMoney(subtotal)}</span>
                </li>
                {dueDate && (
                  <li>
                    <CreditCard className="w-3 h-3 inline" /> {t("dentalLab.cases.dueDateSummary")}: {fmtDate(dueDate)}
                  </li>
                )}
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("dentalLab.cases.patientNamePh")} *</label>
                <input className={inputCls} value={patientName} onChange={(e) => setPatientName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.patientPhonePh")}</label>
                <input className={inputCls} value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} dir="ltr" placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.teeth")}</label>
                <input className={inputCls} value={teeth} onChange={(e) => setTeeth(e.target.value)} placeholder="مثال: 16, 26" />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.shade")}</label>
                <input className={inputCls} value={shade} onChange={(e) => setShade(e.target.value)} placeholder="مثال: 2M3" />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.material")}</label>
                <input className={inputCls} value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="مثال: زيركون" />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.priceSnapshot")}</label>
                <input className={inputCls} type="number" value={priceSnapshot} onChange={(e) => setPriceSnapshot(Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.discount")}</label>
                <input className={inputCls} type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.dueDate")}</label>
                <input className={inputCls} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.cases.priority")}</label>
                <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as "NORMAL" | "URGENT" | "STAT")}>
                  {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map((k) => (
                    <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("dentalLab.common.notes")}</label>
              <textarea
                className={`${inputCls} min-h-[60px] resize-y`}
                placeholder={t("dentalLab.cases.notesHint")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Multi-file drop zone */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls + " mb-0"}>{t("dentalLab.cases.uploadMulti")}</label>
                <span className="text-[11px] text-gray-400">{t("dentalLab.cases.filesHint")}</span>
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
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                <Upload className="w-7 h-7 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t("dentalLab.cases.dropFiles")}</p>
                {parseMsg && <p className="text-xs text-emerald-600 mt-1">{parseMsg}</p>}
              </div>

              {files.length > 0 && (
                <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {files.map((f, idx) => (
                    <li key={`${f.name}-${idx}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {fileIcon(f.name)}
                        <span className="truncate">{f.name}</span>
                        <span className="text-gray-400 shrink-0" dir="ltr">{fmtBytes(f.size)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          title={t("dentalLab.cases.scanParse")}
                          onClick={(e) => { e.stopPropagation(); handleParseFile(f); }}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {files.length > 0 && step === 3 && (
              <span><Upload className="w-3 h-3 inline" /> {files.length} {t("dentalLab.cases.filesSelected")}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                disabled={submitting}
                className="px-4 py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />{t("dentalLab.cases.back")}
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={(step === 1 && !canNextFromStep1) || (step === 2 && !canNextFromStep2)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                {t("dentalLab.cases.next")}<ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !patientName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {submitting ? t("dentalLab.cases.creating") : t("dentalLab.cases.createAndUpload")}
              </button>
            )}
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {t("dentalLab.common.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG");
}
