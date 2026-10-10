import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRightCircle, ArrowRightLeft, ChevronDown, Clock, Columns3, ExternalLink, Eye, FileSpreadsheet, Filter, FilterX, Flame, Layers, List, Loader2, PackageCheck, Pencil, Printer, RefreshCw, RotateCcw, ScanLine, Search, Stethoscope, Trash2, UserPlus, X as XMarkIcon, Zap,
} from "lucide-react";
import {
  CASE_STATUS_MAP, CASE_STATUSES, PRIORITY_CONFIG, ROLE_CONFIG,
  DentalLabCase, DentalLabDoctor, DentalTechnician, DentalWorkType, DentalCasePriority, DentalTechnicianRole,
  fetchCases, fetchDoctors, fetchWorkTypes, fetchTechnicians, fetchDoctorPricing,
  createCase, updateCase, advanceCase, assignCase, removeCaseAssignment, uploadCaseAttachment, uploadCaseAttachments,
  createInvoice, addInvoicePayment, kioskScanCase,
  trashCase, restoreCase, permanentDeleteCase,
  bulkAdvanceCases, bulkAssignTechnician, bulkUpdatePriority, bulkTrashCases, bulkRestoreCases, bulkTransferCasesDoctor,
  fetchPanLabelPdf, fetchWorkOrderPdf,
  fmtMoney, fmtDate, nextStatusOf,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";
import { exportToExcel } from "@/utils/exportHelpers";
import QuickOrderModal from "./QuickOrderModal";
import OdontogramChart from "./OdontogramChart";
import DentalCaseInspector from "./DentalCaseInspector";

const FALLBACK_BADGE = { label: "", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };

const statusBadge = (map: Record<string, { label: string; color: string }>, value: string, fallback = value) => {
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback };
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

interface CreateCaseModalProps {
  initial?: DentalLabCase | null;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

function CreateCaseModal({ initial, doctors, workTypes, technicians, onClose, onSaved }: CreateCaseModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(initial?.doctorId ?? "");
  const [doctorName, setDoctorName] = useState(initial?.doctorName ?? "");
  const [technicianId, setTechnicianId] = useState(initial?.assignments?.[0]?.technicianId ?? "");
  const [workTypeId, setWorkTypeId] = useState(initial?.workTypeId ?? "");
  const [workTypeName, setWorkTypeName] = useState(initial?.workTypeName ?? "");
  const [priceSnapshot, setPriceSnapshot] = useState(initial?.priceSnapshot ?? 0);
  const [patientName, setPatientName] = useState(initial?.patientName ?? "");
  const [patientPhone, setPatientPhone] = useState(initial?.patientPhone ?? "");
  const [teeth, setTeeth] = useState(initial?.teeth ?? "");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initial?.teeth ? initial.teeth.split(/[,،\s]+/).filter(Boolean) : []);
  const [unitsCount, setUnitsCount] = useState<number>(() => {
    if (initial?.unitsCount && initial.unitsCount > 0) return initial.unitsCount;
    if (initial?.teeth) {
      const parsed = initial.teeth.split(/[,،\s]+/).filter(Boolean);
      if (parsed.length > 0) return parsed.length;
    }
    return 1;
  });
  const [shade, setShade] = useState(initial?.shade ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [lotNumber, setLotNumber] = useState(initial?.lotNumber ?? "");
  const [materialBrand, setMaterialBrand] = useState(initial?.materialBrand ?? "");
  const [warrantyYears, setWarrantyYears] = useState(initial?.warrantyYears ?? 0);
  const [receivedDate, setReceivedDate] = useState(initial?.receivedDate ? initial.receivedDate.slice(0, 10) : new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState(initial?.priority ?? "NORMAL");
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [doctorPricingMap, setDoctorPricingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (doctorId) {
      fetchDoctorPricing(doctorId)
        .then((map) => setDoctorPricingMap(map || {}))
        .catch(() => setDoctorPricingMap({}));
    } else {
      setDoctorPricingMap({});
    }
  }, [doctorId]);

  const resolveUnitPrice = (wt: DentalWorkType | undefined) => {
    if (!wt) return 0;
    if (doctorPricingMap[wt.id] != null) return Number(doctorPricingMap[wt.id]);
    return Number(wt.price) || 0;
  };

  const onWorkTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setWorkTypeId(id);
    const wt = workTypes.find(w => w.id === id);
    setWorkTypeName(wt?.name ?? "");
    if (wt) {
      const cnt = unitsCount > 0 ? unitsCount : 1;
      const unitP = resolveUnitPrice(wt);
      setPriceSnapshot(wt.pricingMode === "FLAT" ? unitP : unitP * cnt);
    }
  };

  const onTeethChange = (arr: string[]) => {
    setSelectedTeeth(arr);
    const count = arr.length > 0 ? arr.length : 1;
    setUnitsCount(count);
    setTeeth(arr.join(", "));
    const wt = workTypes.find(w => w.id === workTypeId);
    if (wt && wt.pricingMode !== "FLAT") {
      const unitP = resolveUnitPrice(wt);
      setPriceSnapshot(unitP * count);
    }
  };

  useEffect(() => {
    if (!initial && workTypeId) {
      const wt = workTypes.find((w) => w.id === workTypeId);
      if (wt) {
        const cnt = unitsCount > 0 ? unitsCount : 1;
        const unitP = resolveUnitPrice(wt);
        setPriceSnapshot(wt.pricingMode === "FLAT" ? unitP : unitP * cnt);
      }
    }
  }, [doctorPricingMap]);

  useEffect(() => {
    if (!initial && workTypeId) {
      const wt = workTypes.find((w) => w.id === workTypeId);
      if (wt) {
        let leadDays = (typeof wt.leadTimeDays === 'number' && wt.leadTimeDays > 0) ? wt.leadTimeDays : 3;
        if (priority === 'URGENT') {
          leadDays = (typeof wt.urgentLeadTimeDays === 'number' && wt.urgentLeadTimeDays > 0)
            ? wt.urgentLeadTimeDays
            : Math.max(1, Math.ceil(leadDays * 0.5));
        } else if (priority === 'STAT') {
          leadDays = 1;
        }
        const target = new Date(receivedDate || Date.now());
        target.setDate(target.getDate() + leadDays);
        setDueDate(target.toISOString().split("T")[0] || "");
      }
    }
  }, [workTypeId, priority, receivedDate]);

  const save = async () => {
    if (saving) return;
    if (!patientName.trim()) { toast.error(t("dentalLab.common.name")); return; }
    setSaving(true);
    try {
      const payload = {
        doctorId: doctorId || undefined,
        doctorName: doctorName.trim() || undefined,
        technicianId: technicianId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: workTypeId || undefined,
        workTypeName: workTypeName || undefined,
        teeth: teeth.trim() || undefined,
        unitsCount: Number(unitsCount) > 0 ? Number(unitsCount) : 1,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        materialBrand: materialBrand.trim() || undefined,
        warrantyYears: Number(warrantyYears) >= 0 ? Number(warrantyYears) : 0,
        priceSnapshot: Number(priceSnapshot) || 0,
        discount: Number(discount) || 0,
        receivedDate: receivedDate || undefined,
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>العيادة / المركز الطبي *</label>
              <select
                className={inputCls}
                value={doctorId}
                onChange={e => {
                  const newDocId = e.target.value;
                  setDoctorId(newDocId);
                  const found = doctors.find(d => d.id === newDocId);
                  if (found) {
                    setDoctorName(found.doctors?.[0]?.name || found.name);
                  } else {
                    setDoctorName("");
                  }
                }}
              >
                <option value="">— اختر العيادة / الحساب —</option>
                {doctors.filter(d => d.isActive).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.clinicName ? `${d.clinicName} (${d.name})` : d.name}
                  </option>
                ))}
              </select>
            </div>
            {(() => {
              const selectedClinic = doctors.find(d => d.id === doctorId);
              if (selectedClinic?.doctors && selectedClinic.doctors.length > 0) {
                return (
                  <div>
                    <label className={labelCls}>الطبيب المعالج داخل العيادة</label>
                    <select
                      className={inputCls}
                      value={doctorName}
                      onChange={e => setDoctorName(e.target.value)}
                    >
                      <option value={selectedClinic.name}>{selectedClinic.name} (الطبيب الرئيسي)</option>
                      {selectedClinic.doctors.map(doc => (
                        <option key={doc.id} value={doc.name}>
                          {doc.name} {doc.specialty ? `(${doc.specialty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div>
                  <label className={labelCls}>اسم الطبيب المعالج (اختياري)</label>
                  <input
                    className={inputCls}
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    placeholder="اسم الطبيب المعالج"
                  />
                </div>
              );
            })()}
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
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}>{t("dentalLab.cases.teeth")} (تحديد الأسنان بالخريطة التفاعلية)</label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                  {unitsCount} {unitsCount === 1 ? "سن / وحدة" : "أسنان / وحدات"}
                </span>
              </div>
              <OdontogramChart
                selectedTeeth={selectedTeeth}
                onChange={onTeethChange}
              />
            </div>
            <div>
              <label className={labelCls}>الفني المسند للتشغيل (اختياري)</label>
              <select className={inputCls} value={technicianId} onChange={e => setTechnicianId(e.target.value)}>
                <option value="">— بدون إسناد فوري —</option>
                {technicians.filter(t => t.isActive).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({String(ROLE_CONFIG[t.role]?.label || t.role || "").replace(/\s*\/\s*(Master|QC)\s*$/i, "")})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>عدد الوحدات (Units Count)</label>
              <input
                className={inputCls}
                type="number"
                min="1"
                max="32"
                value={unitsCount}
                onChange={e => {
                  const val = Math.max(1, Number(e.target.value) || 1);
                  setUnitsCount(val);
                  const wt = workTypes.find(w => w.id === workTypeId);
                  if (wt && wt.price != null && wt.pricingMode !== "FLAT") {
                    setPriceSnapshot(Number(wt.price) * val);
                  }
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
              <div className="flex items-center justify-between">
                <label className={labelCls}>{t("dentalLab.cases.priceSnapshot")}</label>
                {workTypeId && doctorPricingMap[workTypeId] != null && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    سعر خاص بالطبيب ({fmtMoney(doctorPricingMap[workTypeId])})
                  </span>
                )}
              </div>
              <input className={inputCls} type="number" value={priceSnapshot} onChange={e => setPriceSnapshot(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>{t("dentalLab.cases.discount")}</label>
              <input className={inputCls} type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>تاريخ الدخول / الاستلام</label>
              <input className={inputCls} type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
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
  const defaultNext = nextStatusOf(caseData.status);
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const availableTargets = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    const current = caseData.status;
    if (current === "RECEIVED") {
      list.push({ id: "DESIGN", label: "تصميم CAD/CAM" });
      list.push({ id: "MANUFACTURING", label: "بدء التصنيع والمعالجة" });
      list.push({ id: "OUTSOURCED", label: "إرسال لمعمل خارجي" });
    } else if (current === "DESIGN") {
      list.push({ id: "MANUFACTURING", label: "بدء التصنيع والإنتاج" });
      list.push({ id: "OUTSOURCED", label: "إرسال لمعمل خارجي" });
      list.push({ id: "QC", label: "فحص الجودة (QC)" });
    } else if (current === "MANUFACTURING") {
      list.push({ id: "QC", label: "فحص الجودة (QC)" });
      list.push({ id: "READY", label: "جاهز للتسليم (اكتمال الشغل)" });
      list.push({ id: "OUTSOURCED", label: "إرسال لمعمل خارجي" });
    } else if (current === "OUTSOURCED") {
      list.push({ id: "QC", label: "فحص الجودة (استلام من الخارجي)" });
      list.push({ id: "READY", label: "جاهز للتسليم مباشرة" });
      list.push({ id: "MANUFACTURING", label: "عودة للتصنيع الداخلي" });
    } else if (current === "QC") {
      list.push({ id: "READY", label: "جاهز للتسليم (اجتياز الجودة)" });
      list.push({ id: "DELIVERED", label: "تم التسليم للعيادة" });
    } else if (current === "READY") {
      list.push({ id: "DELIVERED", label: "تم التسليم للعيادة / الطبيب" });
      list.push({ id: "CLOSED", label: "إغلاق وتصفية الحالة" });
    } else if (current === "DELIVERED") {
      list.push({ id: "CLOSED", label: "إغلاق الحالة" });
    }
    return list;
  }, [caseData.status]);

  const [targetStatus, setTargetStatus] = useState<string>(
    defaultNext || (availableTargets[0]?.id ?? "")
  );

  const save = async () => {
    if (saving || !targetStatus) return;
    setSaving(true);
    try {
      await advanceCase(caseData.id, {
        to: targetStatus,
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
            <span className="text-xs text-gray-500 font-medium">الحالة الحالية:</span>
            {statusBadge(CASE_STATUS_MAP, caseData.status)}
            <ArrowRightCircle className="w-5 h-5 text-gray-400" />
            {targetStatus ? statusBadge(CASE_STATUS_MAP, targetStatus) : <span className="text-sm text-gray-400">{t("dentalLab.common.noData")}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المرحلة أو الحالة المراد الانتقال إليها *</label>
            <select
              className={inputCls}
              value={targetStatus}
              onChange={e => setTargetStatus(e.target.value)}
            >
              {availableTargets.map(tgt => (
                <option key={tgt.id} value={tgt.id}>
                  {tgt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.advanceReason")}</label>
            <textarea className={`${inputCls} min-h-[80px] resize-y`} value={reason} onChange={e => setReason(e.target.value)} placeholder="ملاحظات سبب النقل (اختياري)..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.advanceAssignee")}</label>
            <select className={inputCls} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">— إسناد لفني محدد (اختياري) —</option>
              {technicians.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || !targetStatus} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
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
              {active.map(x => <option key={x.id} value={x.id}>{x.name} ({String(ROLE_CONFIG[x.role]?.label || x.role || "").replace(/\s*\/\s*(Master|QC)\s*$/i, "")})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              الدور / التخصص في الحالة
            </label>
            <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
              {(Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[]).map(k => (
                <option key={k} value={k}>{ROLE_CONFIG[k]?.label || k}</option>
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
                <option key={t.id} value={t.id}>{t.name} ({String(ROLE_CONFIG[t.role]?.label || t.role || "").replace(/\s*\/\s*(Master|QC)\s*$/i, "")})</option>
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [cases, setCases] = useState<DentalLabCase[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters state with URL SearchParams support
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [doctorId, setDoctorId] = useState(() => searchParams.get("doctorId") || "");
  const [workTypeId, setWorkTypeId] = useState(() => searchParams.get("workTypeId") || "");
  const [priority, setPriority] = useState(() => searchParams.get("priority") || "");
  const [paymentStatus, setPaymentStatus] = useState(() => searchParams.get("paymentStatus") || "");
  const [technicianId, setTechnicianId] = useState(() => searchParams.get("technicianId") || "");
  const [dateRangePreset, setDateRangePreset] = useState(() => {
    const dr = searchParams.get("dateRange");
    if (dr) return dr;
    if (searchParams.get("filter") === "received_today") return "received_today";
    return "ALL";
  });
  const [agendaDate, setAgendaDate] = useState(() => searchParams.get("date") || "");
  const [agendaField, setAgendaField] = useState<"receivedDate" | "dueDate">(() => {
    return (searchParams.get("dateField") as "dueDate") || "receivedDate";
  });
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

  // URL searchParams two-way filter sync helper
  const applyFilter = useCallback(
    (key: string, value: string, resetOthers = false) => {
      setSearchParams(prev => {
        if (resetOthers) {
          const next = new URLSearchParams();
          if (value) next.set(key, value);
          const currentLayout = prev.get("layout");
          if (currentLayout) next.set("layout", currentLayout);
          return next;
        }
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const clearAllFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams();
      const currentLayout = prev.get("layout");
      if (currentLayout) next.set("layout", currentLayout);
      return next;
    });
  }, [setSearchParams]);

  // Sync state when URL searchParams changes (e.g. navigation, clicking filtered links, back/forward)
  useEffect(() => {
    const qStatus = searchParams.get("status") || "";
    const qDoctorId = searchParams.get("doctorId") || "";
    const qWorkTypeId = searchParams.get("workTypeId") || "";
    const qPriority = searchParams.get("priority") || "";
    const qPaymentStatus = searchParams.get("paymentStatus") || "";
    const qTechnicianId = searchParams.get("technicianId") || "";
    const qDateRange = searchParams.get("dateRange") || (searchParams.get("filter") === "received_today" ? "received_today" : "ALL");
    const qDate = searchParams.get("date") || "";
    const qDateField = (searchParams.get("dateField") as "dueDate") || "receivedDate";
    const qSearch = searchParams.get("search") || "";
    const qTab = (searchParams.get("tab") || "").toUpperCase();
    const qOverdue = searchParams.get("overdue") === "true";
    const qTrash = searchParams.get("trash") === "true";
    const qLayout = (searchParams.get("layout") || "").toUpperCase();

    setStatus(prev => (prev !== qStatus ? qStatus : prev));
    setDoctorId(prev => (prev !== qDoctorId ? qDoctorId : prev));
    setWorkTypeId(prev => (prev !== qWorkTypeId ? qWorkTypeId : prev));
    setPriority(prev => (prev !== qPriority ? qPriority : prev));
    setPaymentStatus(prev => (prev !== qPaymentStatus ? qPaymentStatus : prev));
    setTechnicianId(prev => (prev !== qTechnicianId ? qTechnicianId : prev));
    setDateRangePreset(prev => (prev !== qDateRange ? qDateRange : prev));
    setAgendaDate(prev => (prev !== qDate ? qDate : prev));
    setAgendaField(prev => (prev !== qDateField ? qDateField : prev));
    setSearch(prev => (prev !== qSearch ? qSearch : prev));
    setSearchInput(prev => (prev !== qSearch ? qSearch : prev));
    setPage(1);

    if (qTab === "OVERDUE" || qOverdue) setViewMode("OVERDUE");
    else if (qTab === "TRASH" || qTrash) setViewMode("TRASH");
    else if (qTab === "ACTIVE") setViewMode("ACTIVE");

    if (qLayout === "KANBAN") setLayoutMode("KANBAN");
    else if (qLayout === "TABLE") setLayoutMode("TABLE");
  }, [searchParams]);
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

  // On-Demand Case Inspector Drawer
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(false);

  useEffect(() => {
    if (cases && cases.length > 0) {
      if (!selectedCaseId || !cases.some(c => c.id === selectedCaseId)) {
        setSelectedCaseId(cases[0]?.id ?? null);
      }
    } else {
      setSelectedCaseId(null);
    }
  }, [cases, selectedCaseId]);

  const selectedCase = useMemo(() => {
    if (!cases || cases.length === 0) return null;
    return cases.find(c => c.id === selectedCaseId) ?? cases[0] ?? null;
  }, [cases, selectedCaseId]);

  // Bulk Selection & Batch Operations (معايير 2026 للإجراءات الجماعية)
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState("");
  const [bulkTechTarget, setBulkTechTarget] = useState("");
  const [bulkPriorityTarget, setBulkPriorityTarget] = useState<DentalCasePriority | "">("");
  const [bulkDoctorTarget, setBulkDoctorTarget] = useState("");


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

  const handleBulkTransferDoctor = async () => {
    if (selectedCaseIds.size === 0 || !bulkDoctorTarget) return;
    const targetDoc = doctors.find(d => d.id === bulkDoctorTarget);
    const docName = targetDoc ? (targetDoc.clinicName ? `${targetDoc.clinicName} (${targetDoc.name})` : targetDoc.name) : "";
    if (!window.confirm(`هل أنت متأكد من نقل ${selectedCaseIds.size} حالة إلى: "${docName}" ومزامنة فواتيرها؟`)) return;
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

  const handleExportCasesExcel = () => {
    if (!cases || cases.length === 0) {
      toast.error("لا توجد حالات لتصديرها");
      return;
    }
    const columns = [
      { key: "caseNumber", label: "رقم الحالة" },
      { key: "receivedDate", label: "تاريخ الاستلام" },
      { key: "dueDate", label: "تاريخ التسليم" },
      { key: "doctorName", label: "العيادة / الطبيب" },
      { key: "patientName", label: "المريض" },
      { key: "workTypeName", label: "نوع الشغل" },
      { key: "shade", label: "اللون (Shade)" },
      { key: "teeth", label: "الأسنان" },
      { key: "unitsCount", label: "عدد الوحدات" },
      { key: "statusLabel", label: "مرحلة العمل" },
      { key: "priorityLabel", label: "الأولوية" },
      { key: "total", label: "الإجمالي (ج.م)" },
      { key: "paid", label: "المدفوع (ج.م)" },
      { key: "remaining", label: "المتبقي (ج.م)" },
      { key: "paymentStatusLabel", label: "حالة السداد" },
    ];
    const data = cases.map(c => ({
      caseNumber: c.caseNumber || "—",
      receivedDate: fmtDate(c.receivedDate),
      dueDate: fmtDate(c.dueDate),
      doctorName: c.doctorName || "—",
      patientName: c.patientName || "—",
      workTypeName: c.workTypeName || "—",
      shade: c.shade || "—",
      teeth: c.teeth || "—",
      unitsCount: c.unitsCount || 1,
      statusLabel: CASE_STATUSES.find(s => s.id === c.status)?.label || c.status,
      priorityLabel: c.priority === "URGENT" ? "مستعجل" : c.priority === "STAT" ? "طارئ" : "عادي",
      total: c.total ?? 0,
      paid: c.paid ?? 0,
      remaining: c.remaining ?? 0,
      paymentStatusLabel: c.paymentStatus === "PAID" ? "مسدد بالكامل" : c.paymentStatus === "PARTIAL" ? "مسدد جزئياً" : "غير مسدد",
    }));
    exportToExcel(data, columns, `حالات_معمل_الأسنان_${new Date().toISOString().split("T")[0]}.xlsx`, "الحالات");
    toast.success("تم تصدير ملف الإكسيل بنجاح");
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
      let receivedDateFrom: string | undefined = undefined;
      let receivedDateTo: string | undefined = undefined;
      const todayStr = new Date().toISOString().split("T")[0];

      if (dateRangePreset === "today" || dateRangePreset === "due_today") {
        dueDateFrom = todayStr;
        dueDateTo = todayStr;
      } else if (dateRangePreset === "received_today") {
        receivedDateFrom = todayStr;
        receivedDateTo = todayStr;
      } else if (dateRangePreset === "this_week") {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        dueDateFrom = startOfWeek.toISOString().split("T")[0];
        dueDateTo = endOfWeek.toISOString().split("T")[0];
      }

      const isKanban = layoutMode === "KANBAN";
      const res = await fetchCases({
        status: status || undefined,
        doctorId: doctorId || undefined,
        workTypeId: workTypeId || undefined,
        priority: priority || undefined,
        paymentStatus: paymentStatus || undefined,
        technicianId: technicianId || undefined,
        dueDateFrom,
        dueDateTo,
        receivedDateFrom,
        receivedDateTo,
        date: agendaDate || undefined,
        dateFilterField: agendaField,
        search: search.trim() || undefined,
        trash: viewMode === "TRASH",
        overdueOnly: viewMode === "OVERDUE",
        page: isKanban ? 1 : page,
        limit: isKanban ? 100 : pageSize,
      });
      setCases(res.data);
      setTotal(res.total);
      if (res.trashCount !== undefined) setTrashCount(res.trashCount);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  }, [status, doctorId, workTypeId, priority, paymentStatus, technicianId, dateRangePreset, agendaDate, agendaField, search, viewMode, page, layoutMode, t]);

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

  const handlePrintPanLabel = async (c: DentalLabCase) => {
    try {
      toast.info(`جاري تجهيز تيكت الصينية للحالة ${c.caseNumber || c.id.slice(0, 8)}...`);
      const blob = await fetchPanLabelPdf(c.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `PanLabel-${c.caseNumber || c.id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل تيكت الصينية");
    }
  };

  const handlePrintWorkOrder = async (c: DentalLabCase) => {
    try {
      toast.info(`جاري تجهيز أمر الشغل للحالة ${c.caseNumber || c.id.slice(0, 8)}...`);
      const blob = await fetchWorkOrderPdf(c.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `WorkOrder-${c.caseNumber || c.id.slice(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل أمر الشغل");
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
    Boolean(agendaDate) || dateRangePreset !== "ALL",
    Boolean(searchInput.trim()),
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-3">
      {/* 2026 Unified Cockpit Command Bar */}
      <div className="bg-white dark:bg-gray-800/90 border border-slate-200 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Title & View Mode Tabs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{t("dentalLab.cases.title")}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300">
                  {total}
                </span>
              </h2>
            </div>

            {/* Segmented Mode Selector: Active / Overdue / Trash */}
            <div className="flex items-center bg-slate-100 dark:bg-gray-700/60 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setViewMode("ACTIVE"); setPage(1); }}
                className={`px-3 py-1 rounded-lg transition-all ${
                  viewMode === "ACTIVE"
                    ? "bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100 shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                النشطة
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("OVERDUE"); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                  viewMode === "OVERDUE"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>المتأخرة</span>
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("TRASH"); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                  viewMode === "TRASH"
                    ? "bg-slate-700 dark:bg-slate-600 text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span>سلة المهملات</span>
                {trashCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                    {trashCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
            <input
              className="w-full bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-xl pr-8 pl-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="بحث سريع (رقم الحالة، المريض، الطبيب)..."
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); setPage(1); }}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); applyFilter("search", ""); setPage(1); }}
                className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                title="مسح البحث"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Controls & Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Table / Kanban Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-gray-700/60 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setLayoutMode("TABLE")}
                className={`p-1.5 rounded-lg transition-all ${
                  layoutMode === "TABLE"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
                title="عرض جدول الحالات"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("KANBAN")}
                className={`p-1.5 rounded-lg transition-all ${
                  layoutMode === "KANBAN"
                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
                title="عرض لوحة مراحل التشغيل (كانبان)"
              >
                <Columns3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Kiosk Button */}
            <button
              type="button"
              onClick={() => setKioskOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
              title="فتح محطة المسح السريع بالباركود"
            >
              <ScanLine className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden md:inline">الكشك</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refresh()}
              className="p-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
              title={String(t("dentalLab.common.refresh"))}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportCasesExcel}
              className="p-1.5 border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-emerald-600 rounded-xl transition-colors"
              title="تصدير الحالات المعروضة إلى Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>

            {/* New Quick Order Primary CTA */}
            <button
              type="button"
              onClick={() => setQuickOrderOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>طلب سريع</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs border-t border-slate-100 dark:border-gray-700/60 pt-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 text-[11px]">
            <Layers className="w-3 h-3 text-slate-400" /> فلاتر سريعة:
          </span>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(""); setDateRangePreset("ALL"); setTechnicianId(""); setStatus(""); setAgendaDate(""); setDoctorId(""); setWorkTypeId(""); setPaymentStatus(""); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 text-xs ${viewMode === "ACTIVE" && !priority && dateRangePreset === "ALL" && !technicianId && !status && !agendaDate && !doctorId && !workTypeId && !paymentStatus ? "bg-blue-600 text-white shadow-2xs" : "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"}`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(""); setDateRangePreset("received_today"); setTechnicianId(""); setStatus(""); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${dateRangePreset === "received_today" ? "bg-blue-600 text-white shadow-2xs" : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-900"}`}
          >
            <PackageCheck className="w-3 h-3 text-blue-500" />
            <span>وارد اليوم</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("OVERDUE"); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${viewMode === "OVERDUE" ? "bg-rose-600 text-white shadow-2xs" : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-900"}`}
          >
            <Flame className="w-3 h-3 text-rose-500" />
            <span>متأخرة عن موعدها</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setDateRangePreset("today"); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${dateRangePreset === "today" ? "bg-amber-600 text-white shadow-2xs" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-900"}`}
          >
            <Clock className="w-3 h-3 text-amber-500" />
            <span>تسليم اليوم</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(priority === "URGENT" ? "" : "URGENT"); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${priority === "URGENT" ? "bg-purple-600 text-white shadow-2xs" : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200/80 dark:border-purple-900"}`}
          >
            <Zap className="w-3 h-3 text-purple-500" />
            <span>مستعجل</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setPriority(priority === "STAT" ? "" : "STAT"); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${priority === "STAT" ? "bg-red-600 text-white shadow-2xs" : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 border border-red-200/80 dark:border-red-900"}`}
          >
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span>طارئ فوري</span>
          </button>
          <button
            type="button"
            onClick={() => { setViewMode("ACTIVE"); setStatus(status === "OUTSOURCED" ? "" : "OUTSOURCED"); setPage(1); }}
            className={`px-2.5 py-0.5 rounded-full font-medium transition-all shrink-0 flex items-center gap-1 text-xs ${status === "OUTSOURCED" ? "bg-amber-600 text-white shadow-2xs" : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/80 dark:border-amber-900"}`}
          >
            <ExternalLink className="w-3 h-3 text-amber-500" />
            <span>بره المعمل (خارجي)</span>
          </button>
        </div>

        {/* All Direct Dropdown Filters & Agenda — Always Visible & Compact */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-gray-700/60 pt-2 text-xs">
          {viewMode !== "TRASH" && (
            <select
              className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white"
              value={status}
              onChange={e => applyFilter("status", e.target.value)}
              title="فلترة بحالة المرحلة"
            >
              <option value="">كل الحالات</option>
              {CASE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          )}

          <select
            className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white max-w-[150px]"
            value={doctorId}
            onChange={e => applyFilter("doctorId", e.target.value)}
            title="فلترة بالطبيب أو العيادة"
          >
            <option value="">كل الدكاترة</option>
            {doctors.filter(d => d.isActive).map(d => (
              <option key={d.id} value={d.id}>{d.name} {d.clinicName ? `(${d.clinicName})` : ""}</option>
            ))}
          </select>

          <select
            className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white max-w-[140px]"
            value={workTypeId}
            onChange={e => applyFilter("workTypeId", e.target.value)}
            title="فلترة بنوع الشغل"
          >
            <option value="">كل أنواع الشغل</option>
            {workTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>

          <select
            className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white"
            value={priority}
            onChange={e => applyFilter("priority", e.target.value)}
            title="فلترة بدرجة الأولوية"
          >
            <option value="">كل الأولويات</option>
            <option value="NORMAL">عادي</option>
            <option value="URGENT">مستعجل</option>
            <option value="STAT">طارئ فوري</option>
          </select>

          <select
            className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white max-w-[130px]"
            value={technicianId}
            onChange={e => applyFilter("technicianId", e.target.value)}
            title="فلترة بالفني المسند"
          >
            <option value="">كل الفنيين</option>
            {technicians.filter(t => t.isActive).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            className="bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 hover:bg-white"
            value={paymentStatus}
            onChange={e => applyFilter("paymentStatus", e.target.value)}
            title="فلترة بحالة السداد"
          >
            <option value="">كل حالات السداد</option>
            <option value="UNPAID">غير مسدد</option>
            <option value="PARTIAL">مسدد جزئياً</option>
            <option value="PAID">مسدد بالكامل</option>
          </select>

          {/* Agenda Date Range & Shortcuts */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg px-2 py-0.5 text-xs">
            <span className="text-slate-400 font-medium text-[11px]">الأجندة:</span>
            <select
              className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
              value={agendaField}
              onChange={e => { setAgendaField(e.target.value as "receivedDate" | "dueDate"); setPage(1); }}
            >
              <option value="receivedDate">تاريخ الدخول</option>
              <option value="dueDate">تاريخ التسليم</option>
            </select>
            <input
              type="date"
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none w-[110px]"
              value={agendaDate}
              onChange={e => {
                const val = e.target.value;
                setAgendaDate(val);
                setDateRangePreset(val ? "CUSTOM" : "ALL");
                setPage(1);
              }}
            />
            {agendaDate && (
              <button
                type="button"
                onClick={() => { setAgendaDate(""); setDateRangePreset("ALL"); setPage(1); }}
                className="text-slate-400 hover:text-slate-600"
                title="مسح التاريخ"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-gray-800 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yStr = yesterday.toISOString().split("T")[0];
                setAgendaDate(yStr);
                setDateRangePreset("CUSTOM");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded transition-colors ${agendaDate === new Date(Date.now() - 86400000).toISOString().split("T")[0] ? "bg-white dark:bg-gray-700 font-bold shadow-2xs text-blue-600" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
            >
              أمس
            </button>
            <button
              type="button"
              onClick={() => {
                const tStr = new Date().toISOString().split("T")[0];
                setAgendaDate(tStr);
                setDateRangePreset("CUSTOM");
                setPage(1);
              }}
              className={`px-2 py-0.5 rounded transition-colors ${agendaDate === new Date().toISOString().split("T")[0] ? "bg-white dark:bg-gray-700 font-bold shadow-2xs text-blue-600" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"}`}
            >
              اليوم
            </button>
            {(agendaDate || dateRangePreset !== "ALL") && (
              <button
                type="button"
                onClick={() => { setAgendaDate(""); setDateRangePreset("ALL"); setPage(1); }}
                className="px-2 py-0.5 rounded text-slate-500 hover:text-slate-800"
              >
                كل المواعيد
              </button>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors mr-auto"
              title="إلغاء كل الفلاتر وإعادة ضبط الجدول"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>إلغاء كل الفلاتر ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {loading && !cases ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : cases === null || cases.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>{viewMode === "TRASH" ? "سلة المهملات فارغة لا توجد بها حالات" : t("dentalLab.common.noResults")}</p>
        </div>
      ) : layoutMode === "TABLE" ? (
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xs border border-slate-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50/90 dark:bg-gray-800/90 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="w-8 py-2.5 px-2 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                      checked={cases.length > 0 && cases.every(c => selectedCaseIds.has(c.id))}
                      onChange={toggleSelectAllPage}
                      title="تحديد كل الحالات في هذه الصفحة"
                    />
                  </th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">رقم الحالة</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">المريض</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">الطبيب / العيادة</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">نوع الشغل</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">الأولوية</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">الفني</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">الحالة</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">تاريخ الدخول</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">تاريخ الاستحقاق</th>
                  <th className="text-right py-2.5 px-3 whitespace-nowrap">المستحقات</th>
                  <th className="text-center py-2.5 px-3 whitespace-nowrap">إجراءات</th>
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
                      onClick={() => { setSelectedCaseId(c.id); setInspectorOpen(true); }}
                      className={`border-b border-slate-100 dark:border-gray-700/60 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70"
                          : overdue
                          ? "bg-rose-50/30 dark:bg-rose-950/15 hover:bg-rose-50/60"
                          : "hover:bg-slate-50/80 dark:hover:bg-gray-750"
                      }`}
                    >
                      <td className="w-8 py-2 px-2 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-xs whitespace-nowrap text-blue-600 dark:text-blue-400" dir="ltr">
                        <Link
                          to={`/dental-lab/cases/${c.id}`}
                          onClick={e => e.stopPropagation()}
                          className="hover:underline flex items-center gap-1"
                          title="فتح صفحة الحالة"
                        >
                          <span>{c.caseNumber || c.id.slice(0, 8)}</span>
                        </Link>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                          {c.patientName}
                        </div>
                        {c.patientPhone && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono" dir="ltr">
                            {c.patientPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[130px] flex items-center gap-1">
                          <Stethoscope className="w-3 h-3 text-blue-500 shrink-0 opacity-70" />
                          <span>{c.doctorName ? `د. ${c.doctorName}` : "—"}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {c.workTypeName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                            <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[120px]">{c.workTypeName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {c.priority !== "NORMAL" ? (
                          statusBadge(PRIORITY_CONFIG, c.priority)
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">عادي</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {c.assignments && c.assignments.length > 0 ? (
                          <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <span className="truncate max-w-[100px]">{c.assignments[0]?.technician?.name || c.assignments[0]?.technicianId}</span>
                            {c.assignments.length > 1 && (
                              <span className="text-[10px] px-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 font-bold">+{c.assignments.length - 1}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">غير مسند</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {statusBadge(CASE_STATUS_MAP, c.status)}
                          {overdue && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse" title={`متأخر ${daysOverdue} يوم`}>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>{daysOverdue}ي</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400 font-mono" dir="ltr">
                        {fmtDate(c.receivedDate)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-[11px] font-mono" dir="ltr">
                        <span className={overdue ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-600 dark:text-slate-300"}>
                          {fmtDate(c.dueDate)}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]" dir="ltr">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{fmtMoney(c.total)}</div>
                        {Number(c.remaining) > 0 ? (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium tabular-nums">باقي {fmtMoney(c.remaining)}</div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">خالص ✓</div>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                        {viewMode === "TRASH" ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleRestoreCase(c)}
                              disabled={isBusy}
                              className="p-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                              title="استعادة"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(c)}
                              disabled={isBusy}
                              className="p-1 text-xs font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => { setSelectedCaseId(c.id); setInspectorOpen(true); }}
                              className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                              title="معاينة سريعة منبثقة (درج فحص)"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {next && (
                              <button
                                type="button"
                                onClick={() => setAdvanceCaseData(c)}
                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                title={`نقل إلى: ${CASE_STATUS_MAP[next]?.label || next}`}
                              >
                                <ArrowRightCircle className="w-3.5 h-3.5 rtl:rotate-180" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setEditingCase(c); setCreateOpen(true); }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                              title="تعديل سريع"
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintPanLabel(c)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors"
                              title="طباعة تيكت صينية"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTrashCase(c)}
                              disabled={isBusy}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 rounded-lg transition-colors disabled:opacity-50"
                              title="نقل إلى سلة المهملات"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                      <Link
                        to={`/dental-lab/cases?status=${st.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          applyFilter("status", st.id, true);
                        }}
                        className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                        title={`عرض كل حالات مرحلة "${st.label}" فقط`}
                      >
                        {st.label}
                      </Link>
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
                              <Link
                                to={`/dental-lab/cases?status=${c.status}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applyFilter("status", c.status, true);
                                }}
                                title={`عرض كل حالات مرحلة: ${CASE_STATUS_MAP[c.status]?.label || c.status} فقط`}
                              >
                                {statusBadge(PRIORITY_CONFIG, c.priority)}
                              </Link>
                            </div>

                            <div>
                              <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                {c.patientName}
                              </div>
                              {c.doctorName ? (
                                <div className="flex items-center gap-1 group/doc mt-0.5">
                                  <Link
                                    to={c.doctorId ? `/dental-lab/cases?doctorId=${c.doctorId}` : `/dental-lab/cases?search=${encodeURIComponent(c.doctorName)}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (c.doctorId) applyFilter("doctorId", c.doctorId, true);
                                      else applyFilter("search", c.doctorName || "", true);
                                    }}
                                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate flex items-center gap-1"
                                    title={`عرض كل حالات د. ${c.doctorName} فقط`}
                                  >
                                    <Stethoscope className="w-3 h-3 text-blue-500 shrink-0 opacity-70 group-hover/doc:opacity-100" />
                                    <span>د. {c.doctorName}</span>
                                  </Link>
                                  {c.doctorId && (
                                    <Link
                                      to={`/dental-lab/doctors/${c.doctorId}`}
                                      className="opacity-0 group-hover/doc:opacity-100 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-opacity p-0.5"
                                      title="الملف الشامل للطبيب"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                  د. طبيب غير محدد
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px] bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-100 dark:border-gray-700/50">
                              {c.workTypeName ? (
                                <Link
                                  to={c.workTypeId ? `/dental-lab/cases?workTypeId=${c.workTypeId}` : `/dental-lab/cases?search=${encodeURIComponent(c.workTypeName)}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (c.workTypeId) applyFilter("workTypeId", c.workTypeId, true);
                                    else applyFilter("search", c.workTypeName || "", true);
                                  }}
                                  className="font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate flex items-center gap-1"
                                  title={`عرض كل حالات نوع الشغل: ${c.workTypeName} فقط`}
                                >
                                  <Layers className="w-3 h-3 text-indigo-500 shrink-0" />
                                  <span>{c.workTypeName}</span>
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-500 truncate">
                                  نوع الشغل غير محدد
                                </span>
                              )}
                              {c.teeth && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
                                  {c.teeth}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="text-gray-400 text-[10px]">الفني:</span>
                              {c.assignments && c.assignments.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-end max-w-[170px] items-center">
                                  {c.assignments.map(a => {
                                    const techName = a.technician?.name || a.technicianId;
                                    const targetTechId = a.technicianId;
                                    return (
                                      <Link
                                        key={a.id}
                                        to={`/dental-lab/cases?technicianId=${targetTechId}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          applyFilter("technicianId", targetTechId, true);
                                        }}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 truncate max-w-[100px] cursor-pointer"
                                        title={`عرض كل حالات الفني: ${techName} فقط`}
                                      >
                                        {techName}
                                      </Link>
                                    );
                                  })}
                                  <button
                                    onClick={() => setAssignCaseData(c)}
                                    className="p-0.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/40 rounded transition"
                                    title="تعديل أو إضافة فني"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                  </button>
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
                              <span className="text-gray-400 text-[10px]">دخول:</span>
                              <span className="text-gray-600 dark:text-gray-300 font-medium">
                                {fmtDate(c.receivedDate)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-gray-400 text-[10px]">تسليم:</span>
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
                                onClick={() => handlePrintPanLabel(c)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors"
                                title="طباعة تيكت الصينية (Pan Label)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
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

      {layoutMode === "KANBAN" ? (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 px-1">
          <span>عرض خط الإنتاج (Kanban Pipeline) — إجمالي {cases?.length || 0} حالة</span>
          <span>يمكنك ترقية الحالة إلى المرحلة التالية بضغطة زر واحدة مباشرة</span>
        </div>
      ) : totalPages > 1 ? (
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
      ) : null}

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
                    <option key={t.id} value={t.id}>{t.name} ({String(ROLE_CONFIG[t.role]?.label || t.role || "").replace(/\s*\/\s*(Master|QC)\s*$/i, "")})</option>
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

              {/* Bulk Transfer to Doctor / Clinic */}
              <div className="flex items-center gap-1.5">
                <select
                  className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[170px]"
                  value={bulkDoctorTarget}
                  onChange={e => setBulkDoctorTarget(e.target.value)}
                  disabled={bulkBusy}
                >
                  <option value="">نقل لطبيب / عيادة...</option>
                  {doctors.filter(d => d.isActive).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.clinicName ? `${d.clinicName} • ${d.name}` : d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkTransferDoctor}
                  disabled={bulkBusy || !bulkDoctorTarget}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
                  title="نقل الحالات المحددة لعيادة أو دكتور آخر مع تحديث فواتيرها"
                >
                  {bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                  نقل للعيادة
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
        <CreateCaseModal initial={editingCase} doctors={doctors} workTypes={workTypes} technicians={technicians} onClose={() => { setCreateOpen(false); setEditingCase(null); }} onSaved={handleSaved} />
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

      {/* On-Demand Slide-over Quick Inspector Drawer (شاشة فحص منبثقة عند الطلب) */}
      {inspectorOpen && selectedCase && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setInspectorOpen(false)}
        >
          <div
            className="w-full sm:w-[500px] md:w-[540px] bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-r dark:border-gray-800 animate-in slide-in-from-left duration-200"
            onClick={e => e.stopPropagation()}
          >
            <DentalCaseInspector
              caseData={selectedCase}
              onClose={() => setInspectorOpen(false)}
              onAdvance={setAdvanceCaseData}
              onAssign={setAssignCaseData}
              onEdit={(c) => { setEditingCase(c); setCreateOpen(true); }}
              onInvoice={setInvoiceCase}
              onUpload={handleUpload}
              onPrintPanLabel={handlePrintPanLabel}
              onPrintWorkOrder={handlePrintWorkOrder}
              onTrash={handleTrashCase}
              isBusy={actionBusyId === selectedCase.id}
              uploadingId={uploadingId}
            />
          </div>
        </div>
      )}
    </div>
  );
}