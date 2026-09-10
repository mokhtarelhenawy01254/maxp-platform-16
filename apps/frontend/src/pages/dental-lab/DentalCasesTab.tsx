import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRightCircle, Check, CheckCircle2, CheckSquare, Clock, Columns3, CreditCard, ExternalLink, Eye, Filter, FilterX, Flame, Layers, List, Loader2, Pencil, RefreshCw, RotateCcw, ScanLine, Search, Square, Stethoscope, Trash2, Upload, UserPlus, Users, X as XMarkIcon, Zap,
} from "lucide-react";
import {
  CASE_STATUS_MAP, CASE_STATUSES, PRIORITY_CONFIG, ROLE_CONFIG, PAYMENT_STATUS_MAP,
  DentalLabCase, DentalLabDoctor, DentalTechnician, DentalWorkType, DentalCasePriority, DentalTechnicianRole,
  fetchCases, fetchDoctors, fetchWorkTypes, fetchTechnicians,
  createCase, updateCase, advanceCase, assignCase, removeCaseAssignment, uploadCaseAttachment, uploadCaseAttachments, parseScan,
  createInvoice, addInvoicePayment, kioskScanCase,
  trashCase, restoreCase, permanentDeleteCase,
  bulkAdvanceCases, bulkAssignTechnician, bulkUpdatePriority, bulkTrashCases, bulkRestoreCases,
  fmtMoney, fmtDate, nextStatusOf,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";
import QuickOrderModal from "./QuickOrderModal";
import OdontogramChart from "./OdontogramChart";

const FALLBACK_BADGE = { label: "", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };

const statusBadge = (map: Record<string, { label: string; color: string }>, value: string, fallback = value) => {
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback };
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

interface CreateCaseModalProps {
  initial?: DentalLabCase | null;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  onClose: () => void;
  onSaved: () => void;
}

function CreateCaseModal({ initial, doctors, workTypes, onClose, onSaved }: CreateCaseModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(initial?.doctorId ?? "");
  const [workTypeId, setWorkTypeId] = useState(initial?.workTypeId ?? "");
  const [workTypeName, setWorkTypeName] = useState(initial?.workTypeName ?? "");
  const [priceSnapshot, setPriceSnapshot] = useState(initial?.priceSnapshot ?? 0);
  const [patientName, setPatientName] = useState(initial?.patientName ?? "");
  const [patientPhone, setPatientPhone] = useState(initial?.patientPhone ?? "");
  const [teeth, setTeeth] = useState(initial?.teeth ?? "");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initial?.teeth ? initial.teeth.split(/[,،\s]+/).filter(Boolean) : []);
  const [shade, setShade] = useState(initial?.shade ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [lotNumber, setLotNumber] = useState(initial?.lotNumber ?? "");
  const [materialBrand, setMaterialBrand] = useState(initial?.materialBrand ?? "");
  const [warrantyYears, setWarrantyYears] = useState(initial?.warrantyYears ?? 0);
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState(initial?.priority ?? "NORMAL");
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [scanParsing, setScanParsing] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleScanFile = async (file: File) => {
    if (!file || scanParsing) return;
    setScanParsing(true);
    setScanMsg("");
    try {
      const result = await parseScan(file);
      if (result.patientName) setPatientName(result.patientName);
      if (result.teeth) setTeeth(result.teeth);
      if (result.shade) setShade(result.shade);
      if (result.material) setMaterial(result.material);
      if (result.notes) setNotes(result.notes);
      if (result.workTypeHint) {
        const matched = workTypes.find(w =>
          w.name && result.workTypeHint &&
          w.name.toLowerCase().includes(result.workTypeHint.toLowerCase())
        );
        if (matched) {
          setWorkTypeId(matched.id);
          setWorkTypeName(matched.name);
          if (matched.price != null) setPriceSnapshot(matched.price);
        }
      }
      setScanMsg(t("dentalLab.cases.scanDone"));
      toast.success(t("dentalLab.cases.scanDone"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.cases.scanFailed"));
    } finally {
      setScanParsing(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  };

  const onWorkTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setWorkTypeId(id);
    const wt = workTypes.find(w => w.id === id);
    setWorkTypeName(wt?.name ?? "");
    if (wt && wt.price != null) setPriceSnapshot(wt.price);
  };

  const save = async () => {
    if (saving) return;
    if (!patientName.trim()) { toast.error(t("dentalLab.common.name")); return; }
    setSaving(true);
    try {
      const payload = {
        doctorId: doctorId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: workTypeId || undefined,
        workTypeName: workTypeName || undefined,
        teeth: teeth.trim() || undefined,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        materialBrand: materialBrand.trim() || undefined,
        warrantyYears: Number(warrantyYears) >= 0 ? Number(warrantyYears) : 0,
        priceSnapshot: Number(priceSnapshot) || 0,
        discount: Number(discount) || 0,
        dueDate: dueDate || undefined,
        priority,
        notes: notes.trim() || undefined,
      };
      if (initial) {
        await updateCase(initial.id, payload);
        toast.success(t("dentalLab.common.saved"));
      } else {
        await createCase(payload);
        toast.success(t("dentalLab.common.saved"));
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-850 h-full shadow-2xl flex flex-col border-r dark:border-gray-700 animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                <Pencil className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {initial ? `تعديل الأوردر ${initial.caseNumber || initial.id.slice(0, 8)}` : t("dentalLab.cases.createTitle")}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {initial ? "تعديل تفاصيل وأسنان ومواصفات الحالة السريعة عبر الدرج الجانبي" : "إدخال بيانات حالة جديدة في معمل الأسنان"}
            </p>
          </div>
          <button onClick={() => !saving && onClose()} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Banner for Deep Case Detail */}
        {initial && (
          <div className="px-6 py-2.5 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 flex items-center justify-between gap-3 text-xs">
            <span className="text-blue-800 dark:text-blue-200">
              تريد إدارة فحص الجودة (QC)، الأشعة ثلاثية الأبعاد (STL)، أو الفواتير الموسعة؟
            </span>
            <Link
              to={`/dental-lab/cases/${initial.id}`}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
              onClick={onClose}
            >
              <span>فتح صفحة الأوردر</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3.5 flex flex-wrap items-center gap-3 bg-gray-50/50 dark:bg-gray-800/40">
            <input
              ref={scanInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanFile(f); }}
            />
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanParsing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 font-medium shadow-xs"
            >
              {scanParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              {t("dentalLab.cases.scanParse")}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t("dentalLab.cases.scanHint")}</span>
            {scanMsg ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{scanMsg}</span> : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t("dentalLab.cases.doctor")} *</label>
              <select className={inputCls} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                <option value="">—</option>
                {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.workType")} *</label>
              <select className={inputCls} value={workTypeId} onChange={onWorkTypeChange}>
                <option value="">—</option>
                {workTypes.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.patientName")} *</label>
              <input className={inputCls} value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="اسم المريض" />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.patientPhone")}</label>
              <input className={inputCls} value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("dentalLab.cases.teeth")} (تحديد الأسنان بالخريطة التفاعلية)</label>
              <OdontogramChart
                selectedTeeth={selectedTeeth}
                onChange={(arr) => {
                  setSelectedTeeth(arr);
                  setTeeth(arr.join(", "));
                }}
              />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.shade")}</label>
              <input className={inputCls} value={shade} onChange={e => setShade(e.target.value)} placeholder="مثال: A2" />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.material")}</label>
              <input className={inputCls} value={material} onChange={e => setMaterial(e.target.value)} placeholder="مثال: زيركون 3D Pro" />
            </div>
            <div>
              <label className={labelCls}>الشركة المصنعة / الماركة</label>
              <input className={inputCls} value={materialBrand} onChange={e => setMaterialBrand(e.target.value)} placeholder="مثال: Ivoclar, Aidite, Wieland" />
            </div>
            <div>
              <label className={labelCls}>رقم التشغيلة (Lot #)</label>
              <input className={inputCls} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="مثال: LOT-2026-88" />
            </div>
            <div>
              <label className={labelCls}>سنوات الضمان (Warranty)</label>
              <input className={inputCls} type="number" min="0" max="20" value={warrantyYears} onChange={e => setWarrantyYears(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.priceSnapshot")}</label>
              <input className={inputCls} type="number" value={priceSnapshot} onChange={e => setPriceSnapshot(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.discount")}</label>
              <input className={inputCls} type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.dueDate")}</label>
              <input className={inputCls} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.priority")}</label>
              <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value as DentalCasePriority)}>
                {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map(k => (
                  <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>{t("dentalLab.common.notes")}</label>
              <textarea className={`${inputCls} min-h-[80px] resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between">
          {initial ? (
            <Link
              to={`/dental-lab/cases/${initial.id}`}
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1 font-medium"
            >
              <span>صفحة تفاصيل الحالة</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-xs font-semibold">
              {t("dentalLab.common.cancel")}
            </button>
            <button onClick={save} disabled={saving || !patientName.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 text-xs font-bold shadow-sm">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdvanceModalProps {
  caseData: DentalLabCase;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

function AdvanceModal({ caseData, technicians, onClose, onSaved }: AdvanceModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const next = nextStatusOf(caseData.status);
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const save = async () => {
    if (saving || !next) return;
    setSaving(true);
    try {
      await advanceCase(caseData.id, {
        to: next,
        reason: reason.trim() || undefined,
        assigneeId: assigneeId || undefined,
      });
      toast.success(t("dentalLab.detail.advanced"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.cases.advanceTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {statusBadge(CASE_STATUS_MAP, caseData.status)}
            <ArrowRightCircle className="w-5 h-5 text-gray-400" />
            {next ? statusBadge(CASE_STATUS_MAP, next) : <span className="text-sm text-gray-400">{t("dentalLab.common.noData")}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.advanceReason")}</label>
            <textarea className={`${inputCls} min-h-[80px] resize-y`} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.advanceAssignee")}</label>
            <select className={inputCls} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">—</option>
              {technicians.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || !next} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AssignModalProps {
  caseData: DentalLabCase;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignModal({ caseData, technicians, onClose, onSaved }: AssignModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [currentAssignments, setCurrentAssignments] = useState(caseData.assignments || []);
  const active = technicians.filter(x => x.isActive);

  const handleAdd = async () => {
    if (saving) return;
    if (!technicianId) { toast.error(t("dentalLab.cases.assignTechnician")); return; }
    setSaving(true);
    try {
      const updated = await assignCase(caseData.id, { technicianId, role: role as DentalTechnicianRole });
      toast.success(t("dentalLab.detail.assigned"));
      setCurrentAssignments(updated.assignments || []);
      setTechnicianId("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (removingId) return;
    setRemovingId(assignmentId);
    try {
      const updated = await removeCaseAssignment(caseData.id, assignmentId);
      toast.success("تم إلغاء إسناد الفني بنجاح");
      setCurrentAssignments(updated.assignments || []);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إلغاء الإسناد");
    } finally {
      setRemovingId(null);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-lg`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold">{t("dentalLab.cases.assignTitle")}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              الحالة: <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{caseData.caseNumber || caseData.id.slice(0, 8)}</span>
              {caseData.patientName && <span> • المريض: {caseData.patientName}</span>}
            </p>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assigned Technicians List */}
        <div className="mb-5">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>الفنيون المسندون حالياً على الحالة</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
              {currentAssignments.length} فني
            </span>
          </h4>
          {currentAssignments.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
              لم يتم إسناد أي فني لهذه الحالة بعد
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                      👤
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                        {a.technician?.name || a.technicianId}
                      </p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${ROLE_CONFIG[a.role]?.color || "bg-gray-200 text-gray-700"}`}>
                        {ROLE_CONFIG[a.role]?.label || a.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={removingId === a.id}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50"
                    title="إلغاء إسناد هذا الفني"
                  >
                    {removingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Technician Form */}
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> إسناد فني جديد للحالة
          </h4>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              اختر الفني *
            </label>
            <select className={inputCls} value={technicianId} onChange={e => setTechnicianId(e.target.value)}>
              <option value="">— اختر الفني —</option>
              {active.map(x => <option key={x.id} value={x.id}>{x.name} ({ROLE_CONFIG[x.role]?.label || x.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              الدور / التخصص في الحالة
            </label>
            <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
              {(Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[]).map(k => (
                <option key={k} value={k}>{ROLE_CONFIG[k].label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !technicianId}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            إضافة وإسناد الفني
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-3 border-t dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

interface InvoiceModalProps {
  caseData: DentalLabCase;
  onClose: () => void;
  onSaved: () => void;
}

function InvoiceModal({ caseData, onClose, onSaved }: InvoiceModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(caseData.remaining ?? caseData.total ?? 0);
  const [paidNow, setPaidNow] = useState(0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const invoice = await createInvoice({
        caseId: caseData.id,
        doctorId: caseData.doctorId,
        doctorName: caseData.doctorName,
        patientName: caseData.patientName,
        total: Number(amount) || 0,
      });
      if (Number(paidNow) > 0) {
        await addInvoicePayment(invoice.id, { amount: Number(paidNow), method, note: note.trim() || undefined });
      }
      toast.success(t("dentalLab.invoices.created"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.cases.createInvoice")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.invoices.total")}</label>
            <input className={inputCls} type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentAmount")}</label>
            <input className={inputCls} type="number" value={paidNow} onChange={e => setPaidNow(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentMethod")}</label>
            <select className={inputCls} value={method} onChange={e => setMethod(e.target.value)}>
              {["CASH", "CARD", "BANK", "VODAFONE_CASH"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentNote")}</label>
            <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface KioskScannerModalProps {
  technicians: DentalTechnician[];
  onClose: () => void;
  onScanned: () => void;
}

function KioskScannerModal({ technicians, onClose, onScanned }: KioskScannerModalProps) {
  const [barcode, setBarcode] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<{
    caseNumber?: string;
    patientName?: string;
    doctorName?: string;
    newStatus: string;
    completedStage?: string;
    technicianName?: string;
  } | null>(null);
  const [scanHistory, setScanHistory] = useState<Array<{
    code: string;
    time: string;
    newStatus: string;
    caseNumber?: string;
    success: boolean;
    error?: string;
  }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcode.trim();
    if (!code || scanning) return;

    setScanning(true);
    try {
      const res = await kioskScanCase({ barcode: code, technicianId: technicianId || undefined });
      toast.success(`تم مسح الحالة ${res.case?.caseNumber || code} وترقيتها بنجاح`);
      setLastScanned({
        caseNumber: res.case?.caseNumber,
        patientName: res.case?.patientName,
        doctorName: res.case?.doctorName || undefined,
        newStatus: res.newStatus,
        completedStage: res.completedStage,
        technicianName: res.technicianName,
      });
      setScanHistory(prev => [
        {
          code,
          time: new Date().toLocaleTimeString("ar-EG"),
          newStatus: res.newStatus,
          caseNumber: res.case?.caseNumber,
          success: true,
        },
        ...prev.slice(0, 19),
      ]);
      setBarcode("");
      onScanned();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "رمز غير موجود";
      toast.error(msg);
      setScanHistory(prev => [
        {
          code,
          time: new Date().toLocaleTimeString("ar-EG"),
          newStatus: "فشل",
          success: false,
          error: msg,
        },
        ...prev.slice(0, 19),
      ]);
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !scanning && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-2xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-600 text-white"><ScanLine className="w-5 h-5" /></span>
            <div>
              <h3 className="text-lg font-bold">محطة المسح السريع بالباركود (Barcode Kiosk)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">مرر قارئ الباركود على ملصق الحالة لترقية المرحلة فوراً</p>
            </div>
          </div>
          <button onClick={() => !scanning && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الفني المنفذ الحالي:</label>
            <select
              className={`${MODAL_INPUT_CLS} !w-auto flex-1 text-sm`}
              value={technicianId}
              onChange={e => {
                setTechnicianId(e.target.value);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <option value="">تلقائي (حسب المرحلة الحالية للحالة)</option>
              {technicians.filter(t => t.isActive).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({ROLE_CONFIG[t.role]?.label || t.role})</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleScan} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              placeholder="امسح الباركود أو اكتب رقم الحالة ثم اضغط Enter..."
              className="w-full text-lg font-mono px-4 py-3 border-2 border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-100 dark:bg-gray-800 dark:border-blue-400 dark:text-gray-100 placeholder:text-sm placeholder:font-sans"
              autoFocus
              disabled={scanning}
            />
            <button
              type="submit"
              disabled={scanning || !barcode.trim()}
              className="absolute left-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />} مسح
            </button>
          </form>

          {lastScanned && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">آخر حالة ممسوحة بنجاح</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  {lastScanned.newStatus}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-900 dark:text-gray-100 font-semibold flex flex-wrap gap-4">
                <span>رقم: <b className="font-mono">{lastScanned.caseNumber}</b></span>
                <span>المريض: <b>{lastScanned.patientName || "—"}</b></span>
                {lastScanned.doctorName && <span>الطبيب: <b>{lastScanned.doctorName}</b></span>}
                {lastScanned.completedStage && <span>المرحلة المكتملة: <b>{lastScanned.completedStage}</b></span>}
                {lastScanned.technicianName && <span>الفني: <b>{lastScanned.technicianName}</b></span>}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">سجل المسح في هذه الجلسة ({scanHistory.length})</h4>
            {scanHistory.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 border dark:border-gray-800 rounded-lg">لم يتم مسح أي حالة بعد في هذه الجلسة</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                {scanHistory.map((sh, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg flex items-center justify-between border ${
                      sh.success
                        ? "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{sh.caseNumber || sh.code}</span>
                      <span className="text-gray-400">{sh.time}</span>
                      {sh.error && <span className="text-red-500 font-medium">({sh.error})</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sh.success ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : "bg-red-100 text-red-800"}`}>
                      {sh.newStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium">
            إغلاق المحطة
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DentalCasesTab() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [cases, setCases] = useState<DentalLabCase[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters state with URL SearchParams support
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [doctorId, setDoctorId] = useState(() => searchParams.get("doctorId") || "");
  const [workTypeId, setWorkTypeId] = useState(() => searchParams.get("workTypeId") || "");
  const [priority, setPriority] = useState(() => searchParams.get("priority") || "");
  const [paymentStatus, setPaymentStatus] = useState(() => searchParams.get("paymentStatus") || "");
  const [technicianId, setTechnicianId] = useState(() => searchParams.get("technicianId") || "");
  const [dateRangePreset, setDateRangePreset] = useState(() => searchParams.get("dateRange") || "ALL");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [viewMode, setViewMode] = useState<"ACTIVE" | "OVERDUE" | "TRASH">(() => {
    const tabParam = (searchParams.get("tab") || "").toUpperCase();
    if (tabParam === "OVERDUE" || searchParams.get("overdue") === "true") return "OVERDUE";
    if (tabParam === "TRASH" || searchParams.get("trash") === "true") return "TRASH";
    return "ACTIVE";
  });
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"TABLE" | "KANBAN">(() => {
    return (searchParams.get("layout") || "").toUpperCase() === "KANBAN" ? "KANBAN" : "TABLE";
  });
  const pageSize = 20;

  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);

  const [createOpen, setCreateOpen] = useState(() => searchParams.get("new") === "1");
  const [kioskOpen, setKioskOpen] = useState(() => searchParams.get("kiosk") === "1");
  const [editingCase, setEditingCase] = useState<DentalLabCase | null>(null);
  const [advanceCaseData, setAdvanceCaseData] = useState<DentalLabCase | null>(null);
  const [assignCaseData, setAssignCaseData] = useState<DentalLabCase | null>(null);
  const [invoiceCase, setInvoiceCase] = useState<DentalLabCase | null>(null);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Bulk Selection & Batch Operations (معايير 2026 للإجراءات الجماعية)
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("");
  const [bulkTechTarget, setBulkTechTarget] = useState("");
  const [bulkPriorityTarget, setBulkPriorityTarget] = useState<DentalCasePriority | "">("");

  const toggleSelect = (id: string) => {
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    if (!cases || cases.length === 0) return;
    const allCurrentSelected = cases.every(c => selectedCaseIds.has(c.id));
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (allCurrentSelected) {
        cases.forEach(c => next.delete(c.id));
      } else {
        cases.forEach(c => next.add(c.id));
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
    if (!window.confirm(`هل أنت متأكد من نقل ${selectedCaseIds.size} حالة إلى سلة المهملات؟`)) return;
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

  const loadRefs = useCallback(async () => {
    try {
      const [docs, wts, techsRes] = await Promise.all([fetchDoctors(), fetchWorkTypes(), fetchTechnicians()]);
      setDoctors(Array.isArray(docs) ? docs : []);
      setWorkTypes(Array.isArray(wts) ? wts : []);
      // fetchTechnicians returns { items, wageDefaults } — unwrap defensively.
      const techList = Array.isArray(techsRes) ? techsRes : Array.isArray(techsRes?.items) ? techsRes.items : [];
      setTechnicians(techList);
    } catch {
      setDoctors([]);
      setWorkTypes([]);
      setTechnicians([]);
    }
  }, []);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      let dueDateFrom: string | undefined = undefined;
      let dueDateTo: string | undefined = undefined;
      if (dateRangePreset === "today") {
        const todayStr = new Date().toISOString().split("T")[0];
        dueDateFrom = todayStr;
        dueDateTo = todayStr;
      } else if (dateRangePreset === "this_week") {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        dueDateFrom = startOfWeek.toISOString().split("T")[0];
        dueDateTo = endOfWeek.toISOString().split("T")[0];
      }

      const res = await fetchCases({
        status: status || undefined,
        doctorId: doctorId || undefined,
        workTypeId: workTypeId || undefined,
        priority: priority || undefined,
        paymentStatus: paymentStatus || undefined,
        technicianId: technicianId || undefined,
        dueDateFrom,
        dueDateTo,
        search: search.trim() || undefined,
        trash: viewMode === "TRASH",
        overdueOnly: viewMode === "OVERDUE",
        page,
        limit: pageSize,
      });
      setCases(res.data);
      setTotal(res.total);
      if (res.trashCount !== undefined) setTrashCount(res.trashCount);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  }, [status, doctorId, workTypeId, priority, paymentStatus, technicianId, dateRangePreset, search, viewMode, page, t]);

  useEffect(() => {
    const t2 = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t2);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    loadRefs();
    refresh().finally(() => setLoading(false));
  }, [refresh, loadRefs]);

  const handleSaved = () => {
    setCreateOpen(false);
    setEditingCase(null);
    refresh({ silent: true });
  };

  const handleTrashCase = async (c: DentalLabCase) => {
    if (actionBusyId) return;
    if (!window.confirm(`هل أنت متأكد من نقل الحالة "${c.caseNumber || c.patientName}" إلى سلة المهملات؟`)) return;
    setActionBusyId(c.id);
    try {
      await trashCase(c.id);
      toast.success("تم نقل الحالة إلى سلة المهملات بنجاح");
      refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل نقل الحالة إلى سلة المهملات");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRestoreCase = async (c: DentalLabCase) => {
    if (actionBusyId) return;
    setActionBusyId(c.id);
    try {
      await restoreCase(c.id);
      toast.success("تمت استعادة الحالة بنجاح");
      refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشلت استعادة الحالة");
    } finally {
      setActionBusyId(null);
    }
  };

  const handlePermanentDelete = async (c: DentalLabCase) => {
    if (actionBusyId) return;
    if (!window.confirm(`تحذير: هل أنت متأكد من الحذف النهائي للحالة "${c.caseNumber || c.patientName}"؟ هذا الإجراء لا يمكن التراجع عنه نهائياً وسيتم حذف سجلاتها.`)) return;
    setActionBusyId(c.id);
    try {
      await permanentDeleteCase(c.id);
      toast.success("تم حذف الحالة نهائياً من النظام");
      refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف النهائي");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleUpload = async (c: DentalLabCase, e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = "";
    if (!fileList || fileList.length === 0 || uploadingId === c.id) return;
    setUploadingId(c.id);
    try {
      if (fileList.length === 1 && fileList[0]) {
        await uploadCaseAttachment(c.id, fileList[0]);
      } else {
        await uploadCaseAttachments(c.id, Array.from(fileList));
      }
      toast.success(t("dentalLab.cases.filesUploaded", { count: fileList.length }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dentalLab.common.noData"));
    } finally {
      setUploadingId(null);
    }
  };

  const isCaseOverdue = (c: DentalLabCase) => {
    if (!c.dueDate || c.isDeleted || ["DELIVERED", "CLOSED"].includes(c.status)) return false;
    return new Date(c.dueDate) < new Date();
  };

  const getDaysOverdue = (c: DentalLabCase) => {
    if (!c.dueDate) return 0;
    const diff = Date.now() - new Date(c.dueDate).getTime();
    return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const activeFiltersCount = [
    Boolean(status),
    Boolean(doctorId),
    Boolean(workTypeId),
    Boolean(priority),
    Boolean(paymentStatus),
    Boolean(technicianId),
    dateRangePreset !== "ALL",
    Boolean(searchInput.trim()),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatus("");
    setDoctorId("");
    setWorkTypeId("");
    setPriority("");
    setPaymentStatus("");
    setTechnicianId("");
    setDateRangePreset("ALL");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const filterCls = "border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.cases.title")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">إدارة ومتابعة مراحل الشغل وحالات المعمل</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Table / Kanban View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode("TABLE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                layoutMode === "TABLE"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
              }`}
              title="عرض جدول الحالات"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">جدول</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("KANBAN")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                layoutMode === "KANBAN"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
              }`}
              title="عرض لوحة مراحل التشغيل (كانبان)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">كانبان</span>
            </button>
          </div>

          <button
            onClick={() => setKioskOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-blue-300 dark:border-blue-700 bg-blue-50/70 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-semibold shadow-sm"
            title="فتح محطة المسح السريع بالباركود للإنتاج"
          >
            <ScanLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            محطة الباركود (Kiosk)
          </button>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button
            onClick={() => setQuickOrderOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 text-sm font-medium shadow-sm"
          >
            <Stethoscope className="w-4 h-4" />{t("dentalLab.cases.quickOrder")}
          </button>
        </div>
      </div>

      <div className="space-y-3 pb-3 border-b dark:border-gray-800">
        {/* Main Tabs (Active / Overdue / Trash) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm">
            <button
              onClick={() => { setViewMode("ACTIVE"); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${viewMode === "ACTIVE" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:text-gray-400"}`}
            >
              الحالات النشطة
            </button>
            <button
              onClick={() => { setViewMode("OVERDUE"); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${viewMode === "OVERDUE" ? "bg-rose-600 text-white shadow-sm" : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              الحالات المتأخرة
            </button>
            <button
              onClick={() => { setViewMode("TRASH"); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${viewMode === "TRASH" ? "bg-gray-700 dark:bg-gray-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:text-gray-400"}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              سلة المهملات
              {trashCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${viewMode === "TRASH" ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                  {trashCount}
                </span>
              )}
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-colors"
              title="إلغاء وتفريغ جميع الفلاتر"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Smart Filter Pills (معايير 2026 للفلترة السريعة اللحظية) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-t dark:border-gray-800/80 pt-2.5">
          <span className="text-gray-400 dark:text-gray-500 font-semibold flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5" /> فلاتر سريعة:
          </span>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(""); setDateRangePreset("ALL"); setTechnicianId(""); setStatus(""); setPage(1); }}
            className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 ${viewMode === "ACTIVE" && !priority && dateRangePreset === "ALL" && !technicianId && !status ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("OVERDUE"); setPage(1); }}
            className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 ${viewMode === "OVERDUE" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900"}`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>متأخرة عن موعدها</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setDateRangePreset("today"); setPage(1); }}
            className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 ${dateRangePreset === "today" ? "bg-amber-600 text-white shadow-sm" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-900"}`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>تسليم اليوم</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(priority === "URGENT" ? "" : "URGENT"); setPage(1); }}
            className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 ${priority === "URGENT" ? "bg-purple-600 text-white shadow-sm" : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-900"}`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            <span>مستعجل 🔥</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(priority === "STAT" ? "" : "STAT"); setPage(1); }}
            className={`px-2.5 py-1 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 ${priority === "STAT" ? "bg-red-600 text-white shadow-sm" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 border border-red-200 dark:border-red-900"}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span>طارئ فوري ⚡</span>
          </button>
        </div>

        {/* Comprehensive Filters Bar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {viewMode !== "TRASH" && (
            <select
              className={`${filterCls} text-xs`}
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
              title="فلترة بحالة المرحلة"
            >
              <option value="">{t("dentalLab.cases.allStatuses")}</option>
              {CASE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}

          <select
            className={`${filterCls} text-xs`}
            value={doctorId}
            onChange={e => { setDoctorId(e.target.value); setPage(1); }}
            title="فلترة بالطبيب"
          >
            <option value="">{t("dentalLab.cases.allDoctors")}</option>
            {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            className={`${filterCls} text-xs`}
            value={workTypeId}
            onChange={e => { setWorkTypeId(e.target.value); setPage(1); }}
            title="فلترة بنوع الشغل"
          >
            <option value="">كل أنواع الشغل</option>
            {workTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select
            className={`${filterCls} text-xs`}
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(1); }}
            title="فلترة بدرجة الأولوية"
          >
            <option value="">كل الأولويات</option>
            <option value="NORMAL">عادي (Normal)</option>
            <option value="URGENT">مستعجل (Urgent)</option>
            <option value="STAT">طارئ وفوري (Stat)</option>
          </select>

          <select
            className={`${filterCls} text-xs`}
            value={technicianId}
            onChange={e => { setTechnicianId(e.target.value); setPage(1); }}
            title="فلترة بالفني المسند"
          >
            <option value="">كل الفنيين</option>
            {technicians.filter(t => t.isActive).map(t => (
              <option key={t.id} value={t.id}>{t.name} ({ROLE_CONFIG[t.role]?.label || t.role})</option>
            ))}
          </select>

          <select
            className={`${filterCls} text-xs`}
            value={paymentStatus}
            onChange={e => { setPaymentStatus(e.target.value); setPage(1); }}
            title="فلترة بحالة السداد"
          >
            <option value="">كل حالات السداد</option>
            <option value="UNPAID">غير مسدد (Unpaid)</option>
            <option value="PARTIAL">مسدد جزئياً (Partial)</option>
            <option value="PAID">مسدد بالكامل (Paid)</option>
          </select>

          <select
            className={`${filterCls} text-xs`}
            value={dateRangePreset}
            onChange={e => { setDateRangePreset(e.target.value); setPage(1); }}
            title="فلترة بموعد التسليم والاستحقاق"
          >
            <option value="ALL">كل المواعيد</option>
            <option value="today">تسليم اليوم</option>
            <option value="this_week">تسليم هذا الأسبوع</option>
          </select>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input
              className={`${filterCls} pr-9 w-full text-xs`}
              placeholder={t("dentalLab.cases.searchPlaceholder")}
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
                className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                title="مسح البحث"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && !cases ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : cases === null || cases.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>{viewMode === "TRASH" ? "سلة المهملات فارغة لا توجد بها حالات" : t("dentalLab.common.noResults")}</p>
        </div>
      ) : layoutMode === "TABLE" ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="w-10 py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer align-middle"
                      checked={cases.length > 0 && cases.every(c => selectedCaseIds.has(c.id))}
                      onChange={toggleSelectAllPage}
                      title="تحديد كل الحالات في هذه الصفحة"
                    />
                  </th>
                  {[
                    t("dentalLab.cases.caseNumber"),
                    t("dentalLab.cases.patient"),
                    t("dentalLab.cases.doctor"),
                    t("dentalLab.cases.workType"),
                    t("dentalLab.cases.priority"),
                    "الفني المسند",
                    t("dentalLab.cases.status"),
                    t("dentalLab.cases.dueDate"),
                    t("dentalLab.cases.amounts"),
                    t("dentalLab.common.actions"),
                  ].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => {
                  const next = nextStatusOf(c.status);
                  const overdue = isCaseOverdue(c);
                  const daysOverdue = overdue ? getDaysOverdue(c) : 0;
                  const isBusy = actionBusyId === c.id;
                  const isSelected = selectedCaseIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      className={`border-b dark:border-gray-700 transition-colors ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/60 dark:hover:bg-blue-900/40"
                          : overdue
                            ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <td className="w-10 py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer align-middle"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="py-3 px-4 font-medium" dir="ltr">
                        <Link
                          to={`/dental-lab/cases/${c.id}`}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 group"
                          title="فتح تفاصيل الحالة / الأوردر"
                        >
                          <span>{c.caseNumber || c.id.slice(0, 8)}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {c.patientName}
                        {c.patientPhone ? <span className="block text-xs text-gray-400" dir="ltr">{c.patientPhone}</span> : null}
                      </td>
                      <td className="py-3 px-4">{c.doctorName || "—"}</td>
                      <td className="py-3 px-4">{c.workTypeName || "—"}</td>
                      <td className="py-3 px-4">{statusBadge(PRIORITY_CONFIG, c.priority)}</td>
                      <td className="py-3 px-4">
                        {c.assignments && c.assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center max-w-[170px]">
                            {c.assignments.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                title={`الدور: ${ROLE_CONFIG[a.role]?.label || a.role}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                <span>{a.technician?.name || a.technicianId}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">غير مسند</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {c.isDeleted ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              🗑️ محذوفة
                            </span>
                          ) : (
                            statusBadge(CASE_STATUS_MAP, c.status)
                          )}
                          {overdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3" /> متأخر {daysOverdue} يوم
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={overdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-gray-500 dark:text-gray-400"}>
                          {fmtDate(c.dueDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <span dir="ltr">{fmtMoney(c.total)} / {fmtMoney(c.paid)} / {fmtMoney(c.remaining)}</span>
                      </td>
                      <td className="py-3 px-4">
                        {viewMode === "TRASH" ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleRestoreCase(c)}
                              disabled={isBusy}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-100 disabled:opacity-50"
                              title="استعادة الحالة من سلة المهملات"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> استعادة
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(c)}
                              disabled={isBusy}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-100 disabled:opacity-50"
                              title="حذف الحالة نهائياً من النظام"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> حذف نهائي
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Link to={`/dental-lab/cases/${c.id}`} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("dentalLab.cases.open")}>
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button onClick={() => { setEditingCase(c); setCreateOpen(true); }} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="تعديل سريع بالدرج الجانبي">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {next && (
                              <button onClick={() => setAdvanceCaseData(c)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title={t("dentalLab.cases.advance")}>
                                <ArrowRightCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setAssignCaseData(c)} className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded" title={t("dentalLab.cases.assign")}>
                              <UserPlus className="w-4 h-4" />
                            </button>
                            <label className="p-1.5 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded cursor-pointer" title={t("dentalLab.cases.uploadMulti")}>
                              {uploadingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              <input type="file" multiple className="hidden" onChange={e => handleUpload(c, e)} />
                            </label>
                            <button onClick={() => setInvoiceCase(c)} className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded" title={t("dentalLab.cases.createInvoice")}>
                              <CreditCard className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTrashCase(c)}
                              disabled={isBusy}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50"
                              title="نقل الحالة إلى سلة المهملات"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Pipeline View (معايير 2026 للوحة مراحل التشغيل) */
        <div className="overflow-x-auto pb-4">
          <div className="flex items-start gap-4 min-w-[1280px]">
            {CASE_STATUSES.filter(s => s.id !== "CLOSED").map(st => {
              const stageCases = (cases || []).filter(c => c.status === st.id);
              return (
                <div
                  key={st.id}
                  className="w-80 shrink-0 flex flex-col bg-gray-50/70 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/70 shadow-xs max-h-[calc(100vh-300px)]"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${st.dotColor}`} />
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{st.label}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
                      {stageCases.length}
                    </span>
                  </div>

                  {/* Cards Scrollable Container */}
                  <div className="p-3 space-y-3 overflow-y-auto flex-1">
                    {stageCases.length === 0 ? (
                      <div className="py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700/60 rounded-xl text-xs text-gray-400">
                        لا توجد حالات حالياً
                      </div>
                    ) : (
                      stageCases.map(c => {
                        const next = nextStatusOf(c.status);
                        const overdue = isCaseOverdue(c);
                        const daysOverdue = overdue ? getDaysOverdue(c) : 0;
                        const isSelected = selectedCaseIds.has(c.id);

                        return (
                          <div
                            key={c.id}
                            className={`p-3.5 rounded-xl bg-white dark:bg-gray-850 border shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 ${
                              isSelected
                                ? "ring-2 ring-blue-500 border-blue-400 dark:border-blue-500"
                                : overdue
                                  ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/20"
                                  : "border-gray-200 dark:border-gray-700/80"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(c.id)}
                                />
                                <Link
                                  to={`/dental-lab/cases/${c.id}`}
                                  className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  title="فتح تفاصيل الأوردر"
                                >
                                  <span>{c.caseNumber || c.id.slice(0, 8)}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </Link>
                              </div>
                              {statusBadge(PRIORITY_CONFIG, c.priority)}
                            </div>

                            <div>
                              <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                {c.patientName}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                د. {c.doctorName || "طبيب غير محدد"}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px] bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                              <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                {c.workTypeName || "نوع الشغل غير محدد"}
                              </span>
                              {c.teeth && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
                                  🦷 {c.teeth}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="text-gray-400 text-[10px]">الفني:</span>
                              {c.assignments && c.assignments.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-end max-w-[170px]">
                                  {c.assignments.map(a => (
                                    <span
                                      key={a.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 truncate max-w-[100px]"
                                      title={a.technician?.name || a.technicianId}
                                    >
                                      {a.technician?.name || a.technicianId}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAssignCaseData(c)}
                                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 font-medium"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>إسناد فني</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t dark:border-gray-800">
                              <span className="text-gray-400 text-[10px]">التسليم:</span>
                              {overdue ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                                  <Flame className="w-3 h-3" /> متأخر {daysOverdue} يوم
                                </span>
                              ) : (
                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                  {fmtDate(c.dueDate)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-1">
                              {next && (
                                <button
                                  onClick={() => setAdvanceCaseData(c)}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                                  title={`ترقية إلى ${CASE_STATUS_MAP[next]?.label || next}`}
                                >
                                  <span>ترقية للمرحلة التالية</span>
                                  <ArrowRightCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => { setEditingCase(c); setCreateOpen(true); }}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                                title="تعديل سريع بالدرج الجانبي"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <Link
                                to={`/dental-lab/cases/${c.id}`}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                                title="فتح صفحة تفاصيل الحالة"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 border dark:border-gray-600 rounded-lg disabled:opacity-40"
          >
            {t("dentalLab.common.prev")}
          </button>
          <span className="text-gray-500 dark:text-gray-400">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border dark:border-gray-600 rounded-lg disabled:opacity-40"
          >
            {t("dentalLab.common.next")}
          </button>
        </div>
      )}

      {/* Floating Bulk Action Bar (شريط الإجراءات الجماعية العائم - معايير 2026) */}
      {selectedCaseIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-gray-700/80 flex items-center gap-3 flex-wrap max-w-[95vw] animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2 pr-2 border-l border-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs font-bold whitespace-nowrap">
              تم تحديد {selectedCaseIds.size} حالة
            </span>
            <button
              onClick={() => setSelectedCaseIds(new Set())}
              className="text-[11px] text-gray-400 hover:text-white underline mr-1"
            >
              إلغاء
            </button>
          </div>

          {viewMode !== "TRASH" ? (
            <>
              {/* Bulk Advance Status */}
              <div className="flex items-center gap-1.5">
                <select
                  className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={bulkStatusTarget}
                  onChange={e => setBulkStatusTarget(e.target.value)}
                  disabled={bulkBusy}
                >
                  <option value="">ترقية المرحلة إلى...</option>
                  {CASE_STATUSES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAdvance}
                  disabled={bulkBusy || !bulkStatusTarget}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
                >
                  {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightCircle className="w-3.5 h-3.5" />}
                  تطبيق
                </button>
              </div>

              {/* Bulk Assign Technician */}
              <div className="flex items-center gap-1.5">
                <select
                  className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={bulkTechTarget}
                  onChange={e => setBulkTechTarget(e.target.value)}
                  disabled={bulkBusy}
                >
                  <option value="">إسناد للفني...</option>
                  {technicians.filter(t => t.isActive).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({ROLE_CONFIG[t.role]?.label || t.role})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={bulkBusy || !bulkTechTarget}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
                >
                  {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  إسناد
                </button>
              </div>

              {/* Bulk Priority */}
              <div className="flex items-center gap-1.5">
                <select
                  className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={bulkPriorityTarget}
                  onChange={e => setBulkPriorityTarget(e.target.value as DentalCasePriority)}
                  disabled={bulkBusy}
                >
                  <option value="">الأولوية...</option>
                  <option value="NORMAL">عادي</option>
                  <option value="URGENT">مستعجل 🔥</option>
                  <option value="STAT">طارئ فوري ⚡</option>
                </select>
                <button
                  type="button"
                  onClick={handleBulkPriority}
                  disabled={bulkBusy || !bulkPriorityTarget}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
                >
                  تحديث
                </button>
              </div>

              {/* Bulk Trash */}
              <button
                type="button"
                onClick={handleBulkTrash}
                disabled={bulkBusy}
                className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 mr-auto shadow-sm transition"
                title="نقل الحالات المحددة إلى المهملات"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف ({selectedCaseIds.size})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBulkRestore}
                disabled={bulkBusy}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                استعادة الحالات المحددة ({selectedCaseIds.size})
              </button>
            </>
          )}
        </div>
      )}

      {createOpen && (
        <CreateCaseModal initial={editingCase} doctors={doctors} workTypes={workTypes} onClose={() => { setCreateOpen(false); setEditingCase(null); }} onSaved={handleSaved} />
      )}
      {kioskOpen && (
        <KioskScannerModal technicians={technicians} onClose={() => setKioskOpen(false)} onScanned={() => refresh({ silent: true })} />
      )}
      {quickOrderOpen && (
        <QuickOrderModal
          onClose={() => setQuickOrderOpen(false)}
          onSaved={() => { setQuickOrderOpen(false); refresh({ silent: true }); }}
        />
      )}
      {advanceCaseData && (
        <AdvanceModal caseData={advanceCaseData} technicians={technicians} onClose={() => setAdvanceCaseData(null)} onSaved={() => { setAdvanceCaseData(null); refresh({ silent: true }); }} />
      )}
      {assignCaseData && (
        <AssignModal caseData={assignCaseData} technicians={technicians} onClose={() => setAssignCaseData(null)} onSaved={() => { setAssignCaseData(null); refresh({ silent: true }); }} />
      )}
      {invoiceCase && (
        <InvoiceModal caseData={invoiceCase} onClose={() => setInvoiceCase(null)} onSaved={() => { setInvoiceCase(null); refresh({ silent: true }); }} />
      )}
    </div>
  );
}