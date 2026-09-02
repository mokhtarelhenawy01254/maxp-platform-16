import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRightCircle, CreditCard, Eye, Loader2, Pencil, RefreshCw, ScanLine, Search, Stethoscope, Upload, UserPlus, X as XMarkIcon,
} from "lucide-react";
import {
  CASE_STATUS_MAP, CASE_STATUSES, PRIORITY_CONFIG, ROLE_CONFIG,
  DentalLabCase, DentalLabDoctor, DentalTechnician, DentalWorkType, DentalCasePriority,
  fetchCases, fetchDoctors, fetchWorkTypes, fetchTechnicians,
  createCase, updateCase, advanceCase, assignCase, uploadCaseAttachment, uploadCaseAttachments, parseScan,
  createInvoice, addInvoicePayment, kioskScanCase,
  fmtMoney, fmtDate, nextStatusOf,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";
import QuickOrderModal from "./QuickOrderModal";

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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-3xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{initial ? t("dentalLab.cases.editTitle") : t("dentalLab.cases.createTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 flex flex-wrap items-center gap-3">
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50"
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
          <div>
            <label className={labelCls}>{t("dentalLab.cases.teeth")}</label>
            <input className={inputCls} value={teeth} onChange={e => setTeeth(e.target.value)} placeholder="مثال: 11، 21" />
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

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || !patientName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
          </button>
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
  const [technicianId, setTechnicianId] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const active = technicians.filter(x => x.isActive);

  const save = async () => {
    if (saving) return;
    if (!technicianId) { toast.error(t("dentalLab.cases.assignTechnician")); return; }
    setSaving(true);
    try {
      await assignCase(caseData.id, { technicianId, role: role as "RECEPTION" | "CAD" | "TECHNICIAN" | "QC" });
      toast.success(t("dentalLab.detail.assigned"));
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
          <h3 className="text-lg font-bold">{t("dentalLab.cases.assignTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.assignTechnician")} *</label>
            <select className={inputCls} value={technicianId} onChange={e => setTechnicianId(e.target.value)}>
              <option value="">—</option>
              {active.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            {active.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t("dentalLab.cases.noPendingAssign")}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.assignRole")}</label>
            <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
              {(Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[]).map(k => (
                <option key={k} value={k}>{ROLE_CONFIG[k].label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving || !technicianId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("dentalLab.common.save")}
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
  const [cases, setCases] = useState<DentalLabCase[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [kioskOpen, setKioskOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<DentalLabCase | null>(null);
  const [advanceCaseData, setAdvanceCaseData] = useState<DentalLabCase | null>(null);
  const [assignCaseData, setAssignCaseData] = useState<DentalLabCase | null>(null);
  const [invoiceCase, setInvoiceCase] = useState<DentalLabCase | null>(null);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

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
      const res = await fetchCases({
        status: status || undefined,
        doctorId: doctorId || undefined,
        search: search.trim() || undefined,
        page,
        limit: pageSize,
      });
      setCases(res.data);
      setTotal(res.total);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  }, [status, doctorId, search, page, t]);

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

  const handleUpload = async (c: DentalLabCase, e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = "";
    if (!fileList || fileList.length === 0 || uploadingId === c.id) return;
    setUploadingId(c.id);
    try {
      if (fileList.length === 1) {
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

  const filterCls = "border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("dentalLab.cases.title")}</h2>
        <div className="flex items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-3">
        <select className={filterCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t("dentalLab.cases.allStatuses")}</option>
          {CASE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className={filterCls} value={doctorId} onChange={e => { setDoctorId(e.target.value); setPage(1); }}>
          <option value="">{t("dentalLab.cases.allDoctors")}</option>
          {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
          <input className={`${filterCls} pr-9 w-64`} placeholder={t("dentalLab.cases.searchPlaceholder")} value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1); }} />
        </div>
      </div>

      {loading && !cases ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : cases === null || cases.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("dentalLab.common.noResults")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  {[t("dentalLab.cases.caseNumber"), t("dentalLab.cases.patient"), t("dentalLab.cases.doctor"), t("dentalLab.cases.workType"), t("dentalLab.cases.priority"), t("dentalLab.cases.status"), t("dentalLab.cases.dueDate"), t("dentalLab.cases.amounts"), t("dentalLab.common.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cases.map(c => {
                  const next = nextStatusOf(c.status);
                  return (
                    <tr key={c.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 font-medium" dir="ltr">{c.caseNumber || c.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 font-medium">
                        {c.patientName}
                        {c.patientPhone ? <span className="block text-xs text-gray-400" dir="ltr">{c.patientPhone}</span> : null}
                      </td>
                      <td className="py-3 px-4">{c.doctorName || "—"}</td>
                      <td className="py-3 px-4">{c.workTypeName || "—"}</td>
                      <td className="py-3 px-4">{statusBadge(PRIORITY_CONFIG, c.priority)}</td>
                      <td className="py-3 px-4">{statusBadge(CASE_STATUS_MAP, c.status)}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{fmtDate(c.dueDate)}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <span dir="ltr">{fmtMoney(c.total)} / {fmtMoney(c.paid)} / {fmtMoney(c.remaining)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <a href={`/dental-lab/cases/${c.id}`} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("dentalLab.cases.open")}>
                            <Eye className="w-4 h-4" />
                          </a>
                          <button onClick={() => { setEditingCase(c); setCreateOpen(true); }} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title={t("dentalLab.common.edit")}>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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