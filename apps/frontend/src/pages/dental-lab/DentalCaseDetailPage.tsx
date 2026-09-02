import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import DentalModelViewer from "./DentalModelViewer";
import {
  AlertTriangle, ArrowRightCircle, ArrowRight, BadgeCheck, Banknote, Box, Calendar, CheckCircle2, CreditCard, Download, FileDown, FileText, History,
  Image as ImageIcon, Loader2, Pencil, Plus, Receipt, RefreshCw, RotateCcw, Trash2, Upload, UploadCloud, X as XMarkIcon, XCircle,
} from "lucide-react";
import {
  CASE_STATUSES, CASE_STATUS_MAP, PRIORITY_CONFIG, PAYMENT_STATUS_MAP, ROLE_CONFIG, STAGE_STATUS_MAP,
  DentalCaseHistoryEntry, DentalCaseStage, DentalCaseAttachment, DentalInvoice, DentalTechnician,
  DentalQualityCheck, DentalRefabrication, DentalCaseStatus, DentalLabCaseDetail, RefabricationStage, CreditNote,
  fetchCaseDetail, advanceCase, updateCase, deleteCaseAttachment,
  addInvoicePayment, fetchTechnicians, fetchCaseFileBlob, fetchWorkOrderPdf, fetchPanLabelPdf, fetchWarrantyCertificatePdf,
  sendCaseToTryIn, returnCaseFromTryIn, downloadAllFiles,
  recordQualityCheck, flagRefabrication, resolveRefabrication,
  trashCase, restoreCase, permanentDeleteCase,
  inferAttachmentKind,
  fmtMoney, fmtDate, fmtDateTime, nextStatusOf,
  MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";

type UploadItem = {
  id: string;
  file: File;
  kind: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number; // 0..100
  error?: string;
  attachmentId?: string;
};

const FALLBACK_BADGE = { label: "", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };

const REFAB_STAGES: { id: RefabricationStage; labelKey: string }[] = [
  { id: "DESIGN", labelKey: "dentalLab.status.DESIGN" },
  { id: "MANUFACTURING", labelKey: "dentalLab.status.MANUFACTURING" },
  { id: "QC", labelKey: "dentalLab.status.QC" },
  { id: "RECEIVED", labelKey: "dentalLab.status.RECEIVED" },
];

const badge = (map: Record<string, { label: string; color: string }>, value?: string, fallback?: string) => {
  if (!value) return null;
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback ?? value };
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}>{meta.label}</span>;
};

const Card = ({ title, icon, action, children }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b dark:border-gray-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        {icon ? <span className="text-blue-600 dark:text-blue-400">{icon}</span> : null}
        {title}
      </h3>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

function AttachmentCard({ attachment, onDeleted }: { attachment: DentalCaseAttachment; onDeleted: () => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const isImage = attachment.mimeType?.startsWith("image/") || (!attachment.mimeType && !failed);
  // 3D-viewable: anything that dental lab techs would want to rotate/zoom
  // on. STL/PLY/OBJ are the dental scan formats; DCM is x-ray (DICOM) which
  // the model-viewer can also render.
  const fileExt = (attachment.fileName || "").split(".").pop()?.toLowerCase() || "";
  const is3D = ["stl", "ply", "obj", "dcm"].includes(fileExt);
  const isPdf = fileExt === "pdf";

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (attachment.storedName) {
      fetchCaseFileBlob(attachment.storedName)
        .then(blob => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    } else {
      setFailed(true);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.storedName]);

  const remove = async () => {
    if (!window.confirm(t("dentalLab.common.confirmDelete"))) return;
    try {
      await deleteCaseAttachment(attachment.caseId ?? "", attachment.id);
      toast.success(t("dentalLab.detail.fileDeleted"));
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const open = () => {
    if (url) window.open(url, "_blank");
  };

  const open3d = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) setShow3d(true);
  };

  const openPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) setShowPdf(true);
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden group relative">
      <div
        className="h-28 bg-gray-100 dark:bg-gray-900 flex items-center justify-center cursor-pointer"
        onClick={is3D && url ? open3d : isPdf && url ? openPdf : open}
        title={is3D ? "اضغط للمعاينة 3D" : isPdf ? "اضغط لمعاينة الـPDF" : "اضغط للتحميل"}
      >
        {url && isImage ? (
          <img src={url} alt={attachment.fileName} className="h-full w-full object-cover" />
        ) : failed ? (
          <FileText className="w-8 h-8 text-gray-400" />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        )}
        {is3D && (
          <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
            3D
          </div>
        )}
        {isPdf && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
            PDF
          </div>
        )}
      </div>
      <div className="p-2 flex items-center justify-between gap-2">
        <span className="text-xs truncate" title={attachment.fileName}>{attachment.fileName}</span>
        <div className="flex items-center gap-1">
          {is3D && url && (
            <button
              onClick={open3d}
              className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
              title="معاينة 3D"
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          )}
          {isPdf && url && (
            <button
              onClick={openPdf}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              title="معاينة الـPDF"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={open} className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("dentalLab.detail.download")}>
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={remove} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("dentalLab.common.delete")}>
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Viewer Modal — Google <model-viewer> for STL/PLY/OBJ/DCM */}
      {show3d && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShow3d(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <Box className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{attachment.fileName}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">({((attachment.size || 0) / 1024 / 1024).toFixed(1)}MB · {fileExt.toUpperCase()})</span>
              </div>
              <button
                onClick={() => setShow3d(false)}
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded flex-shrink-0"
                title="إغلاق"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative min-h-[500px]">
              {fileExt === "dcm" ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
                  ملف DICOM (DCM) لا يُعاين هنا — حمّله وافتحه في عارض DICOM المتخصص.
                </div>
              ) : url ? (
                <DentalModelViewer url={url} ext={fileExt} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  جاري تحميل النموذج 3D...
                </div>
              )}
            </div>
            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>اسحب لتدوير · عجلة للتقريب · نقرة مزدوجة للإعادة</span>
              <a
                href={url}
                download={attachment.fileName}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                تحميل الملف
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal — native browser PDF rendering via iframe.
          Chrome/Edge/Safari/Firefox all support this; on mobile the user
          gets a download. We tried pdf.js but the native viewer has
          better scroll/zoom UX for clinical prescriptions. */}
      {showPdf && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowPdf(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{attachment.fileName}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">({((attachment.size || 0) / 1024).toFixed(0)}KB · PDF)</span>
              </div>
              <button
                onClick={() => setShowPdf(false)}
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded flex-shrink-0"
                title="إغلاق"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={url}
              title={attachment.fileName}
              className="flex-1 w-full bg-white"
            />
            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>الروشتة / الوصفة الطبية</span>
              <a
                href={url}
                download={attachment.fileName}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                تحميل الملف
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSaved }: { invoice: DentalInvoice; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(invoice.remaining > 0 ? invoice.remaining : 0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    if (!(Number(amount) > 0)) { toast.error(t("dentalLab.detail.paymentAmount")); return; }
    setSaving(true);
    try {
      await addInvoicePayment(invoice.id, { amount: Number(amount), method, note: note.trim() || undefined });
      toast.success(t("dentalLab.detail.paymentAdded"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.detail.paymentTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentAmount")} *</label>
            <input className={MODAL_INPUT_CLS} type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentMethod")}</label>
            <select className={MODAL_INPUT_CLS} value={method} onChange={e => setMethod(e.target.value)}>
              {["CASH", "CARD", "BANK", "VODAFONE_CASH"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.paymentNote")}</label>
            <input className={MODAL_INPUT_CLS} value={note} onChange={e => setNote(e.target.value)} />
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

function QualityCheckModal({ caseId, onClose, onSaved }: { caseId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [passed, setPassed] = useState(true);
  const [notes, setNotes] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await recordQualityCheck(caseId, { passed, notes: notes.trim() || undefined });
      toast.success(t("dentalLab.detail.qualityAdded"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.detail.qualityTitleModal")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.qualityResult")}</label>
            <select className={MODAL_INPUT_CLS} value={passed ? "PASS" : "FAIL"} onChange={e => setPassed(e.target.value === "PASS")}>
              <option value="PASS">{t("dentalLab.detail.qualityPassed")}</option>
              <option value="FAIL">{t("dentalLab.detail.qualityFailed")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.common.notes")}</label>
            <textarea className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
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

const REMAKE_ROOT_CAUSES = [
  { id: "DOCTOR_IMPRESSION", label: "مقاس / طبعة الطبيب غير دقيقة (Doctor Impression)" },
  { id: "DOCTOR_PREPARATION", label: "تحضير وبرد السن غير كافٍ (Doctor Preparation)" },
  { id: "LAB_CAD_DESIGN", label: "خطأ تصميم CAD بالمعمل (Lab CAD Design)" },
  { id: "LAB_FIT_MARGIN", label: "عدم مطابقة الحواف بالمعمل (Lab Fit & Margins)" },
  { id: "LAB_SHADE_COLOR", label: "اختلاف اللون والجماليات (Lab Shade/Color)" },
  { id: "MATERIAL_FAILURE", label: "كسر أو عيب في المادة الخام (Material Defect)" },
  { id: "PATIENT_CHANGE", label: "تغيير رغبة المريض (Patient Request)" },
  { id: "OTHER", label: "سبب آخر (Other)" },
];

const TRYIN_STAGES = [
  { id: "WAX_TRY_IN", label: "بروفة شمع (Wax Try-in)" },
  { id: "METAL_TRY_IN", label: "بروفة شاسيه معدن (Metal Try-in)" },
  { id: "BISQUE_TRY_IN", label: "بروفة بسكويت/خزف (Bisque Try-in)" },
  { id: "FRAME_TRY_IN", label: "بروفة فريم زيركون (Zirconia Frame Try-in)" },
  { id: "CUSTOM_TRY_IN", label: "بروفة مخصصة (Custom Try-in)" },
];

function RefabricationModal({ caseId, onClose, onSaved }: { caseId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [stageFrom, setStageFrom] = useState<RefabricationStage>("DESIGN");
  const [rootCauseCategory, setRootCauseCategory] = useState("DOCTOR_IMPRESSION");
  const [isBillable, setIsBillable] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!reason.trim()) { toast.error(t("dentalLab.detail.refabReasonRequired")); return; }
    setSaving(true);
    try {
      await flagRefabrication(caseId, {
        reason: reason.trim(),
        stageFrom,
        rootCauseCategory,
        isBillable,
      });
      toast.success(t("dentalLab.detail.refabFlagged"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{t("dentalLab.detail.refabModalTitle")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.refabReason")} *</label>
            <textarea className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`} value={reason} onChange={e => setReason(e.target.value)} placeholder="اذكر سبب الإعادة بالتفصيل..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السبب الجذري للمشكلة (Root Cause)</label>
            <select className={MODAL_INPUT_CLS} value={rootCauseCategory} onChange={e => setRootCauseCategory(e.target.value)}>
              {REMAKE_ROOT_CAUSES.map(rc => <option key={rc.id} value={rc.id}>{rc.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.refabStageFrom")}</label>
            <select className={MODAL_INPUT_CLS} value={stageFrom} onChange={e => setStageFrom(e.target.value as RefabricationStage)}>
              {REFAB_STAGES.map(s => <option key={s.id} value={s.id}>{t(s.labelKey as any)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isBillable"
              checked={isBillable}
              onChange={e => setIsBillable(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="isBillable" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              إعادة مدفوعة (تحميل تكلفة الإعادة على الطبيب)
            </label>
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

function SendToTryInModal({ caseId, onClose, onSaved }: { caseId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [tryInStage, setTryInStage] = useState("WAX_TRY_IN");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await sendCaseToTryIn(caseId, { tryInStage, note: note.trim() || undefined });
      toast.success("تم تسجيل خروج الحالة للبروفة بنجاح");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ في إرسال الحالة للبروفة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">خروج الحالة لإجراء بروفة (Try-in)</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع البروفة المطلوبة</label>
            <select className={MODAL_INPUT_CLS} value={tryInStage} onChange={e => setTryInStage(e.target.value)}>
              {TRYIN_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات البروفة أو تعليمات الطبيب</label>
            <textarea className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`} value={note} onChange={e => setNote(e.target.value)} placeholder="مثال: التأكد من الإطباق ومطابقة خط المنتصف..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            إلغاء
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} تسجيل خروج للبروفة
          </button>
        </div>
      </div>
    </div>
  );
}

function ReturnFromTryInModal({ caseId, onClose, onSaved }: { caseId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [targetStage, setTargetStage] = useState("MANUFACTURING");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await returnCaseFromTryIn(caseId, { targetStage, feedbackNotes: feedbackNotes.trim() || undefined });
      toast.success("تم استلام الحالة من البروفة بنجاح واستئناف مسار العمل");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ في استلام الحالة من البروفة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && onClose()}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">استلام الحالة من البروفة وملاحظات الطبيب</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المرحلة المستهدفة لاستئناف العمل</label>
            <select className={MODAL_INPUT_CLS} value={targetStage} onChange={e => setTargetStage(e.target.value)}>
              <option value="MANUFACTURING">تصنيع / إنهاء (MANUFACTURING)</option>
              <option value="DESIGN">إعادة تصميم CAD (DESIGN)</option>
              <option value="QC">فحص الجودة النهائي (QC)</option>
              <option value="READY">جاهزة للتسليم (READY)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الطبيب والتعديلات المطلوبة</label>
            <textarea className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`} value={feedbackNotes} onChange={e => setFeedbackNotes(e.target.value)} placeholder="مثال: تمت البروفة بنجاح، تقصير الحد القاطع بمقدار 0.5 مم..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            إلغاء
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} استلام ومتابعة العمل
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DentalCaseDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DentalLabCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<DentalTechnician[]>([]);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<DentalInvoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [workOrderLoading, setWorkOrderLoading] = useState(false);
  const [panLabelLoading, setPanLabelLoading] = useState(false);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [tryInSendOpen, setTryInSendOpen] = useState(false);
  const [tryInReturnOpen, setTryInReturnOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [refabOpen, setRefabOpen] = useState(false);
  const [refabBusyId, setRefabBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  }, [id, t]);

  const [caseBusy, setCaseBusy] = useState(false);

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
    if (!window.confirm("تحذير: هل أنت متأكد من الحذف النهائي للحالة؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
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

  useEffect(() => {
    refresh();
    fetchTechnicians()
      .then((res) => {
        // fetchTechnicians returns { items, wageDefaults }; unwrap defensively.
        const list = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
        setTechnicians(list);
      })
      .catch(() => setTechnicians([]));
  }, [refresh]);

  // Max file size (50MB) — matches backend upload limit. Hard cap to
  // stop users picking 200MB STL files that would silently 502.
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const ACCEPT_ATTR = ".stl,.ply,.obj,.jpg,.jpeg,.png,.webp,.pdf,.dcm";
  // WebP compression: only worth doing on photos larger than 200KB
  // (smaller files already compressed enough; canvas re-encode would
  // just lose quality). The quality 0.85 is the sweet spot — visually
  // indistinguishable from the source for clinical photos.
  const WEBP_THRESHOLD = 200 * 1024;
  const WEBP_QUALITY = 0.85;

  // Compress an image file (JPG/PNG/JPEG/etc) to WebP in the browser
  // using canvas. Returns the original file if the source is already
  // small, or compression fails (e.g. animated PNG, HEIC without
  // decoder). Compression is lossless in size terms — we just trade
  // bytes for browser re-encode time.
  const compressToWebP = async (file: File): Promise<File> => {
    if (file.size < WEBP_THRESHOLD) return file;
    if (!file.type.startsWith("image/")) return file;
    // Don't re-compress if it's already WebP.
    if (file.type === "image/webp") return file;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", WEBP_QUALITY),
      );
      // Only keep the new file if it's actually smaller. Sometimes
      // (rare) the WebP re-encode is bigger than the source.
      if (blob.size >= file.size) return file;
      const newName = file.name.replace(/\.(jpe?g|png|bmp|tiff?|webp)$/i, ".webp");
      return new File([blob], newName, { type: "image/webp" });
    } catch (e) {
      // Compression failed (animated image, codec not supported, etc).
      // Fall back to the original file rather than blocking the upload.
      console.warn("WebP compression failed for", file.name, e);
      return file;
    }
  };

  // Per-file upload queue. Each file gets its own item so progress
  // shows individually and one failure doesn't kill the batch.
  const startUpload = useCallback(
    async (filesToUpload: File[], perFileKinds?: string[]) => {
      if (!id || filesToUpload.length === 0) return;

      // Step 1: compress any oversized photos to WebP before validation.
      // This is the only place we mutate the file; the rest of the queue
      // just sees a smaller File object of the same name (with .webp
      // extension). The inferAttachmentKind() function already routes
      // .webp → PHOTO, so no kind change needed.
      const processed: File[] = [];
      for (const f of filesToUpload) {
        if (f.type.startsWith("image/") && f.size >= WEBP_THRESHOLD && f.type !== "image/webp") {
          toast.promise(compressToWebP(f), {
            loading: `جاري ضغط ${f.name}...`,
            success: (out) => {
              const saved = f.size - out.size;
              const savedPct = Math.round((saved / f.size) * 100);
              if (saved > 0) {
                return `تم ضغط ${f.name}: وفّرنا ${(saved / 1024).toFixed(0)}KB (${savedPct}%)`;
              }
              return `لم يوفّر شيء بضغط ${f.name}`;
            },
            error: () => `فشل ضغط ${f.name}، هيترفع أصلي`,
          });
        }
        processed.push(f);
      }
      // Wait for compressions (toasts already shown for each)
      const compressed = await Promise.all(
        processed.map((f) => (f.type.startsWith("image/") && f.size >= WEBP_THRESHOLD && f.type !== "image/webp" ? compressToWebP(f) : f)),
      );

      // Step 2: client-side validation on the (possibly compressed) files.
      const valid: { file: File; kind: string }[] = [];
      for (let i = 0; i < compressed.length; i++) {
        const f = compressed[i];
        if (!f) continue;
        if (f.size > MAX_FILE_SIZE) {
          toast.error(`${f.name}: أكبر من 50MB (الحجم: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
          continue;
        }
        if (f.size === 0) {
          toast.error(`${f.name}: ملف فاضي`);
          continue;
        }
        const kind = perFileKinds?.[i] || inferAttachmentKind(f.name);
        valid.push({ file: f, kind });
      }
      if (valid.length === 0) return;

      // Build queue items
      const items: UploadItem[] = valid.map((v) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: v.file,
        kind: v.kind,
        status: "queued",
        progress: 0,
      }));
      setUploadItems((prev) => [...prev, ...items]);
      setUploading(true);

      // Upload in parallel (max 3 concurrent to avoid server overload
      // — see backend memory budget for 15MB STL files).
      const CONCURRENCY = 3;
      const updateItem = (id: string, patch: Partial<UploadItem>) => {
        setUploadItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      };
      let cursor = 0;
      const next = async (): Promise<void> => {
        while (cursor < items.length) {
          const item = items[cursor++];
          if (!item) break;
          updateItem(item.id, { status: "uploading" });
          try {
            const fd = new FormData();
            fd.append("files", item.file);
            fd.append("kinds", item.kind);
            // We use the apiClient directly here so we can hook onUploadProgress
            // for real per-file progress (the helper doesn't expose it).
            const { apiClient } = await import("@/services/api");
            const res = await apiClient.post(
              `/dental-lab/cases/${id}/attachments`,
              fd,
              {
                timeout: 600000, // 10min per file (large STL on slow link)
                onUploadProgress: (ev) => {
                  if (ev.total) {
                    const pct = Math.round((ev.loaded * 100) / ev.total);
                    updateItem(item.id, { progress: pct });
                  }
                },
              },
            );
            const body = (res as { data?: { success?: boolean; data?: { id?: string } | { id?: string }[] } }).data;
            const att = Array.isArray(body?.data) ? body?.data?.[0] : body?.data;
            updateItem(item.id, {
              status: "done",
              progress: 100,
              attachmentId: att?.id,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "فشل الرفع";
            updateItem(item.id, { status: "error", error: msg });
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next()));

      setUploading(false);
      // Refresh once after the whole queue finishes
      await refresh();
      const successCount = items.filter((i) => i.status === "done").length;
      const failCount = items.filter((i) => i.status === "error").length;
      if (successCount > 0 && failCount === 0) {
        toast.success(`تم رفع ${successCount} ملف بنجاح`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`تم رفع ${successCount}، فشل ${failCount}`);
      } else if (failCount > 0) {
        toast.error(`فشل رفع ${failCount} ملف`);
      }
    },
    [id, refresh],
  );

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0 || !id) return;
    await startUpload(files);
  };

  // Drag-and-drop handlers on the dropzone.
  const handleUploadDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragOver(true);
  };
  const handleUploadDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragOver(false);
  };
  const handleUploadDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadDragOver(false);
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length === 0 || !id) return;
    await startUpload(files);
  };

  // Retry a single failed item
  const retryUpload = async (itemId: string) => {
    const item = uploadItems.find((i) => i.id === itemId);
    if (!item) return;
    await startUpload([item.file], [item.kind]);
  };
  // Clear finished/error items from the list
  const clearFinishedUploads = () => {
    setUploadItems((prev) => prev.filter((i) => i.status === "uploading" || i.status === "queued"));
  };

  if (!id) return <div className="text-center py-16 text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</div>;

  if (loading && !detail) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  if (error || !detail) {
    return (
      <div className="p-4 md:p-6 lg:p-8" dir="rtl">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm mb-4">
          {error || t("dentalLab.common.noData")}
        </div>
        <a href="/dental-lab/cases" className="text-blue-600 dark:text-blue-400 text-sm">{t("dentalLab.common.back")}</a>
      </div>
    );
  }

  const c = detail;
  const next = nextStatusOf(c.status);
  const stages = (c.stages ?? []) as DentalCaseStage[];
  const attachments = (c.attachments ?? []) as DentalCaseAttachment[];
  const history = (c.history ?? []) as DentalCaseHistoryEntry[];
  const qualityChecks = (c.qualityChecks ?? []) as DentalQualityCheck[];
  const refabrications = (c.refabrications ?? []) as DentalRefabrication[];
  const creditNotes = (c.creditNotes ?? []) as CreditNote[];
  const latestCheck = qualityChecks.length > 0
    ? [...qualityChecks].sort((a, b) => new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime())[0]
    : undefined;

  const infoRows: { label: string; value: ReactNode }[] = [
    { label: t("dentalLab.cases.patient"), value: c.patientName },
    { label: t("dentalLab.cases.patientPhone"), value: c.patientPhone ? <span dir="ltr">{c.patientPhone}</span> : "—" },
    { label: t("dentalLab.cases.doctor"), value: c.doctorName || "—" },
    { label: t("dentalLab.cases.workType"), value: c.workTypeName || "—" },
    { label: t("dentalLab.cases.teeth"), value: c.teeth || "—" },
    { label: t("dentalLab.cases.shade"), value: c.shade || "—" },
    { label: t("dentalLab.cases.material"), value: c.material || "—" },
    { label: "الماركة / الشركة", value: c.materialBrand || "—" },
    { label: "رقم التشغيلة (Lot #)", value: c.lotNumber ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{c.lotNumber}</span> : "—" },
    { label: "مدة الضمان", value: c.warrantyYears ? <span className="text-emerald-600 font-bold">{c.warrantyYears} سنوات</span> : "بدون ضمان" },
    { label: "حالة البروفة", value: c.isTryIn ? <span className="text-amber-600 font-bold">في بروفة ({c.tryInStage})</span> : (c.tryInCount ? `تمت (${c.tryInCount} بروفة)` : "لا يوجد") },
    { label: t("dentalLab.cases.dueDate"), value: c.dueDate ? <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{fmtDate(c.dueDate)}</span> : "—" },
    { label: t("dentalLab.cases.priceSnapshot"), value: fmtMoney(c.priceSnapshot) },
    { label: t("dentalLab.cases.discount"), value: fmtMoney(c.discount) },
    { label: t("dentalLab.cases.amounts"), value: (
      <span dir="ltr" className="whitespace-nowrap">{fmtMoney(c.total)} / {fmtMoney(c.paid)} / {fmtMoney(c.remaining)}</span>
    ) },
    { label: t("dentalLab.common.status"), value: badge(PAYMENT_STATUS_MAP, c.paymentStatus) },
  ];

  const isOverdue = Boolean(
    c.dueDate &&
    !c.isDeleted &&
    !["DELIVERED", "CLOSED"].includes(c.status) &&
    new Date(c.dueDate) < new Date()
  );
  const daysOverdue = isOverdue && c.dueDate
    ? Math.max(1, Math.floor((Date.now() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/dental-lab/cases" className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />{t("dentalLab.common.back")}
          </a>
          <h1 className="text-xl font-bold" dir="ltr">{c.caseNumber || c.id.slice(0, 8)}</h1>
          {c.isDeleted ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
              🗑️ سلة المهملات
            </span>
          ) : (
            badge(CASE_STATUS_MAP, c.status)
          )}
          {badge(PRIORITY_CONFIG, c.priority)}
          {c.isTryIn && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/50 dark:text-amber-200">
              في بروفة ({c.tryInStage})
            </span>
          )}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> متأخر {daysOverdue} يوم
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openWorkOrder} disabled={workOrderLoading} className="flex items-center gap-2 px-3 sm:px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            {workOrderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}{t("dentalLab.detail.workOrder")}
          </button>
          <button onClick={openPanLabel} disabled={panLabelLoading} className="flex items-center gap-2 px-3 sm:px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50" title="طباعة ملصق الباركود لعلبة الشغل (حراري 80x50 مم)">
            {panLabelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4 text-blue-600 dark:text-blue-400" />}ملصق العلبة
          </button>
          <button onClick={openWarrantyCertificate} disabled={warrantyLoading} className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50" title="طباعة شهادة ضمان المريض مع تفاصيل الخامة والـ Lot Number">
            {warrantyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}شهادة الضمان
          </button>
          {!c.isTryIn && c.status !== "DELIVERED" && c.status !== "CLOSED" && !c.isDeleted && (
            <button onClick={() => setTryInSendOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-lg text-sm hover:bg-amber-100 dark:hover:bg-amber-900/40" title="إرسال الحالة للعيادة لإجراء بروفة">
              <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />خروج بروفة
            </button>
          )}
          {c.isTryIn && (
            <button onClick={() => setTryInReturnOpen(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              <RotateCcw className="w-4 h-4" />استلام من بروفة
            </button>
          )}
          <button onClick={refresh} className="flex items-center gap-2 px-3 sm:px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          {!c.isDeleted && (
            <button onClick={() => setStatusOpen(true)} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              <Pencil className="w-4 h-4" />{t("dentalLab.detail.editStatus")}
            </button>
          )}
          {next && !c.isTryIn && !c.isDeleted && (
            <button onClick={() => setAdvanceOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <ArrowRightCircle className="w-4 h-4" />{t("dentalLab.cases.advance")}
            </button>
          )}
          {!c.isDeleted ? (
            <button
              onClick={handleTrash}
              disabled={caseBusy}
              className="flex items-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-sm disabled:opacity-50"
              title="نقل الحالة إلى سلة المهملات"
            >
              <Trash2 className="w-4 h-4" /> نقل للسلة
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRestore}
                disabled={caseBusy}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" /> استعادة
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={caseBusy}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> حذف نهائي
              </button>
            </div>
          )}
        </div>
      </div>

      {isOverdue && (
        <div className="mb-6 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                تنبيه تأخير: هذه الحالة متأخرة بمقدار {daysOverdue} يوم عن موعد التسليم المحدد!
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                تاريخ الاستحقاق كان في: <b className="font-sans">{fmtDate(c.dueDate)}</b> — يرجى الإسراع في إنهاء المراحل المتبقية وتجهيز الشغل للتسليم.
              </p>
            </div>
          </div>
        </div>
      )}

      {c.isDeleted && (
        <div className="mb-6 p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/80 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-600 text-white flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
                هذه الحالة موجودة حالياً في سلة المهملات
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                تم نقل الحالة إلى سلة المهملات ولا تظهر في القوائم النشطة أو الإحصائيات. يمكنك استعادتها أو حذفها نهائياً.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestore}
              disabled={caseBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> استعادة الحالة
            </button>
            <button
              onClick={handlePermanentDelete}
              disabled={caseBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف نهائي
            </button>
          </div>
        </div>
      )}

      {c.isTryIn && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-amber-500 text-white font-bold text-sm">بروفة</span>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-200">
                الحالة حالياً في مرحلة بروفة (Try-in) لدى العيادة — {c.tryInStage || "بروفة عامة"}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                عدد مرات خروج البروفة لهذه الحالة: {c.tryInCount || 1} مرات. الفاتورة والبيانات المالية محفوظة دون تكرار.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTryInReturnOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> استلام الحالة من البروفة
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card title={t("dentalLab.detail.info")} icon={<FileText className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {infoRows.map(r => (
                <div key={r.label}>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">{r.label}</p>
                  <p className="font-medium">{r.value}</p>
                </div>
              ))}
            </div>
            {c.notes ? (
              <div className="mt-4 border-t dark:border-gray-700 pt-3 text-sm">
                <p className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">{t("dentalLab.common.notes")}</p>
                <p>{c.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card title={t("dentalLab.detail.timeline")} icon={<History className="w-5 h-5" />}>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
            ) : (
              <div className="space-y-4">
                {history.map(h => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {badge(CASE_STATUS_MAP, h.fromStatus)}
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        {badge(CASE_STATUS_MAP, h.toStatus)}
                        <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDateTime(h.createdAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t("dentalLab.detail.changedBy")}: {h.userName || h.changedBy || "—"}
                      </p>
                      {h.reason ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{h.reason}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.detail.stages")} icon={<History className="w-5 h-5" />}>
            {stages.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noStages")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-300">
                      <th className="text-right py-2 px-2">{t("dentalLab.detail.stageName")}</th>
                      <th className="text-right py-2 px-2">{t("dentalLab.detail.assignee")}</th>
                      <th className="text-right py-2 px-2">{t("dentalLab.common.status")}</th>
                      <th className="text-right py-2 px-2">{t("dentalLab.detail.startedAt")}</th>
                      <th className="text-right py-2 px-2">{t("dentalLab.detail.completedAt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map(s => (
                      <tr key={s.id} className="border-b dark:border-gray-700 last:border-b-0">
                        <td className="py-2 px-2 font-medium">{s.name}</td>
                        <td className="py-2 px-2">{s.assigneeName || "—"}</td>
                        <td className="py-2 px-2">{badge(STAGE_STATUS_MAP, s.status) ?? <span className="text-gray-400">{s.status}</span>}</td>
                        <td className="py-2 px-2">{fmtDate(s.startedAt)}</td>
                        <td className="py-2 px-2">{fmtDate(s.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.detail.team")} icon={<History className="w-5 h-5" />}>
            {(c.assignments ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noTeam")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(c.assignments ?? []).map(a => (
                  <div key={a.id} className="border dark:border-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.technician?.name || a.technicianId}</p>
                      <p className="text-xs text-gray-400">{t("dentalLab.technicians.role")}: {ROLE_CONFIG[a.role]?.label ?? a.role}</p>
                    </div>
                    <span className="text-xs text-gray-400">{fmtDate(a.assignedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.detail.qualityTitle")} icon={<BadgeCheck className="w-5 h-5" />}
            action={
              <button onClick={() => setQualityOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                <Plus className="w-3.5 h-3.5" />{t("dentalLab.detail.qualityAdd")}
              </button>
            }
          >
            {latestCheck && latestCheck.passed && (
              <div className="flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 text-xs font-medium w-fit">
                <CheckCircle2 className="w-4 h-4" />{t("dentalLab.detail.qualityInspected")}
              </div>
            )}
            {qualityChecks.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.qualityNoData")}</p>
            ) : (
              <div className="space-y-3">
                {[...qualityChecks].sort((a, b) => new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime()).map(q => (
                  <div key={q.id} className="border dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {q.passed
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <XCircle className="w-4 h-4 text-red-500" />}
                        {q.passed ? t("dentalLab.detail.qualityPassed") : t("dentalLab.detail.qualityFailed")}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDateTime(q.checkedAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("dentalLab.detail.changedBy")}: {q.checkedByName || q.checkedBy || "—"}
                    </p>
                    {q.notes ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{q.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.detail.refabTitle")} icon={<RotateCcw className="w-5 h-5" />}
            action={
              <button onClick={() => setRefabOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs hover:bg-amber-600">
                <RotateCcw className="w-3.5 h-3.5" />{t("dentalLab.detail.refabButton")}
              </button>
            }
          >
            {refabrications.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.refabNoData")}</p>
            ) : (
              <div className="space-y-3">
                {[...refabrications].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).map(r => (
                  <div key={r.id} className="border dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.resolved || r.status === "RESOLVED"
                        ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                        {r.resolved || r.status === "RESOLVED" ? t("dentalLab.detail.refabResolvedTag") : t("dentalLab.detail.refabOpenTag")}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDateTime(r.createdAt)}</span>
                    </div>
                    {r.reason ? <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{r.reason}</p> : null}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t("dentalLab.detail.refabStageFrom")}: {r.stageFrom ? t(`dentalLab.status.${r.stageFrom}` as any) : "—"}
                    </p>
                    {!(r.resolved || r.status === "RESOLVED") && (
                      <button
                        onClick={() => handleResolveRefab(r)}
                        disabled={refabBusyId !== null}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg text-xs disabled:opacity-50"
                      >
                        {refabBusyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {t("dentalLab.detail.refabResolve")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.creditNotes.title")} icon={<Receipt className="w-5 h-5" />}>
            {creditNotes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noCreditNotes")}</p>
            ) : (
              <div className="space-y-3">
                {creditNotes.map(cn => (
                  <div key={cn.id} className="border dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">- {fmtMoney(cn.amount)} {t("dentalLab.common.egp")}</span>
                      <span className="text-xs text-gray-400">{fmtDateTime(cn.createdAt)}</span>
                    </div>
                    {cn.reason ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cn.reason}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={t("dentalLab.detail.files")} icon={<ImageIcon className="w-5 h-5" />}
            action={
              <div className="flex items-center gap-2">
                {attachments.length > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        await downloadAllFiles(id, `${c.caseNumber}-files.zip`);
                        toast.success("تم تجهيز ملف ZIP");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="تحميل كل الملفات دفعة واحدة (ZIP)"
                  >
                    <Download className="w-3.5 h-3.5" />تحميل الكل (ZIP)
                  </button>
                )}
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}{t("dentalLab.detail.uploadFile")}
                </button>
              </div>
            }
          >
            <input ref={fileInputRef} type="file" className="hidden" multiple accept={ACCEPT_ATTR} onChange={handleUpload} />
            {/* Drag-and-drop zone — visible feedback when files hover */}
            <div
              onDragOver={handleUploadDragOver}
              onDragLeave={handleUploadDragLeave}
              onDrop={handleUploadDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 px-4 py-6 mb-4 border-2 border-dashed rounded-lg cursor-pointer transition ${
                uploadDragOver
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <UploadCloud className={`w-8 h-8 ${uploadDragOver ? "text-blue-500" : "text-gray-400"}`} />
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                {uploadDragOver ? "إفلت الملفات هنا" : "اسحب الملفات هنا أو اضغط للاختيار"}
              </p>
              <p className="text-xs text-gray-400 text-center">
                STL, PLY, OBJ, JPG, PNG, PDF, DCM — حد أقصى 50MB للملف
              </p>
            </div>

            {/* Active / finished upload queue */}
            {uploadItems.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {uploading ? "جاري الرفع..." : "نتائج الرفع"}
                  </span>
                  {!uploading && (
                    <button onClick={clearFinishedUploads} className="text-xs text-gray-500 hover:text-gray-700">
                      مسح المكتمل
                    </button>
                  )}
                </div>

                {/* Total upload progress */}
                {(() => {
                  const totalBytes = uploadItems.reduce((s, it) => s + it.file.size, 0);
                  const loadedBytes = uploadItems.reduce((s, it) => s + (it.file.size * (it.progress || 0)) / 100, 0);
                  const doneCount = uploadItems.filter((it) => it.status === "done").length;
                  const totalPct = totalBytes > 0 ? Math.round((loadedBytes * 100) / totalBytes) : 0;
                  return (
                    <div className="border dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          الإجمالي: {totalPct}%
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {doneCount}/{uploadItems.length} ملف مكتمل · {uploadItems.filter((it) => it.status === "error").length > 0 ? `${uploadItems.filter((it) => it.status === "error").length} فشل · ` : ""}{Math.round(loadedBytes / 1024 / 1024)}MB / {Math.round(totalBytes / 1024 / 1024)}MB
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${totalPct >= 100 ? "bg-green-500" : "bg-indigo-500"}`}
                          style={{ width: `${totalPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {uploadItems.map((it) => (
                  <div key={it.id} className="border dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs truncate" title={it.file.name}>{it.file.name}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          ({(it.file.size / 1024 / 1024).toFixed(1)}MB · {it.kind})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {it.status === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                        {it.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                        {it.status === "error" && (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            <button
                              onClick={(e) => { e.stopPropagation(); retryUpload(it.id); }}
                              className="text-[10px] text-blue-600 hover:underline"
                              title={it.error}
                            >
                              إعادة
                            </button>
                          </>
                        )}
                        {it.status === "queued" && <span className="text-[10px] text-gray-400">في الانتظار</span>}
                      </div>
                    </div>
                    {(it.status === "uploading" || it.status === "done") && (
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                          <div
                            className={`h-full transition-all ${it.status === "done" ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${it.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 flex-shrink-0 w-8 text-left">{it.progress}%</span>
                      </div>
                    )}
                    {it.status === "error" && it.error && (
                      <p className="text-[10px] text-red-500 mt-1 truncate" title={it.error}>{it.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {attachments.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noFiles")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {attachments.map(a => (
                  <AttachmentCard key={a.id} attachment={a} onDeleted={refresh} />
                ))}
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.detail.invoices")} icon={<CreditCard className="w-5 h-5" />}>
            {(c.invoices ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noInvoices")}</p>
            ) : (
              <div className="space-y-3">
                {(c.invoices ?? []).map(inv => (
                  <div key={inv.id} className="border dark:border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-medium text-sm" dir="ltr">{inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                      {badge(PAYMENT_STATUS_MAP, inv.paymentStatus)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      <span>{t("dentalLab.invoices.total")}: <b className="text-gray-800 dark:text-gray-200">{fmtMoney(inv.total)}</b></span>
                      <span>{t("dentalLab.invoices.paid")}: <b className="text-green-600 dark:text-green-400">{fmtMoney(inv.paid)}</b></span>
                      <span>{t("dentalLab.invoices.remaining")}: <b className="text-red-500">{fmtMoney(inv.remaining)}</b></span>
                    </div>
                    {(inv.payments ?? []).length > 0 && (
                      <div className="border-t dark:border-gray-700 pt-2 mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t("dentalLab.detail.payments")}:</p>
                        {(inv.payments ?? []).map(p => (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <span>{fmtDate(p.createdAt)} — {fmtMoney(p.amount)} {p.method ? `(${p.method})` : ""}</span>
                            <span className="text-gray-400">{p.note}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {inv.remaining > 0 && (
                      <button onClick={() => setPaymentInvoice(inv)} className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg text-xs">
                        <Banknote className="w-3.5 h-3.5" />{t("dentalLab.detail.addPayment")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title={t("dentalLab.detail.customValues")} icon={<History className="w-5 h-5" />}>
            {(c.customValues ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noCustomValues")}</p>
            ) : (
              <div className="space-y-2">
                {(c.customValues ?? []).map(v => (
                  <div key={v.id} className="flex items-center justify-between border dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{v.field?.name || v.fieldId || "—"}</span>
                    <span className="font-medium">{v.value || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {advanceOpen && next && (
        <AdvanceModal
          caseData={c}
          next={next}
          technicians={technicians}
          onClose={() => setAdvanceOpen(false)}
          onSaved={() => { setAdvanceOpen(false); refresh(); }}
        />
      )}

      {statusOpen && (
        <EditStatusModal caseData={c} onClose={() => setStatusOpen(false)} onSaved={() => { setStatusOpen(false); refresh(); }} />
      )}

      {tryInSendOpen && (
        <SendToTryInModal
          caseId={c.id}
          onClose={() => setTryInSendOpen(false)}
          onSaved={() => { setTryInSendOpen(false); refresh(); }}
        />
      )}

      {tryInReturnOpen && (
        <ReturnFromTryInModal
          caseId={c.id}
          onClose={() => setTryInReturnOpen(false)}
          onSaved={() => { setTryInReturnOpen(false); refresh(); }}
        />
      )}

      {paymentInvoice && (
        <PaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} onSaved={() => { setPaymentInvoice(null); refresh(); }} />
      )}

      {qualityOpen && (
        <QualityCheckModal caseId={c.id} onClose={() => setQualityOpen(false)} onSaved={() => { setQualityOpen(false); refresh(); }} />
      )}

      {refabOpen && (
        <RefabricationModal caseId={c.id} onClose={() => setRefabOpen(false)} onSaved={() => { setRefabOpen(false); refresh(); }} />
      )}
    </div>
  );
}

interface AdvanceModalProps {
  caseData: DentalLabCaseDetail;
  next: string;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

function AdvanceModal({ caseData, next, technicians, onClose, onSaved }: AdvanceModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const save = async () => {
    if (saving) return;
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
            {badge(CASE_STATUS_MAP, caseData.status)}
            <ArrowRightCircle className="w-5 h-5 text-gray-400" />
            {badge(CASE_STATUS_MAP, next)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.advanceReason")}</label>
            <textarea className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.cases.advanceAssignee")}</label>
            <select className={MODAL_INPUT_CLS} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">—</option>
              {technicians.filter(x => x.isActive).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
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

interface EditStatusModalProps {
  caseData: DentalLabCaseDetail;
  onClose: () => void;
  onSaved: () => void;
}

function EditStatusModal({ caseData, onClose, onSaved }: EditStatusModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(caseData.status);
  const [lotNumber, setLotNumber] = useState(caseData.lotNumber || "");
  const [materialBrand, setMaterialBrand] = useState(caseData.materialBrand || "");
  const [warrantyYears, setWarrantyYears] = useState(caseData.warrantyYears || 0);
  const [teeth, setTeeth] = useState(caseData.teeth || "");
  const [shade, setShade] = useState(caseData.shade || "");
  const [material, setMaterial] = useState(caseData.material || "");
  const [notes, setNotes] = useState(caseData.notes || "");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (status !== caseData.status) {
        await advanceCase(caseData.id, { status: status as DentalCaseStatus });
      }
      await updateCase(caseData.id, {
        teeth: teeth.trim() || undefined,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        materialBrand: materialBrand.trim() || undefined,
        warrantyYears: Number(warrantyYears) >= 0 ? Number(warrantyYears) : 0,
        notes: notes.trim() || undefined,
      });
      toast.success(t("dentalLab.common.saved"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">تعديل بيانات الحالة والضمان</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.common.status")}</label>
            <select className={MODAL_INPUT_CLS} value={status} onChange={e => setStatus(e.target.value as DentalCaseStatus)}>
              {CASE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">الشركة المصنعة / الماركة</label>
              <input className={MODAL_INPUT_CLS} value={materialBrand} onChange={e => setMaterialBrand(e.target.value)} placeholder="مثال: Ivoclar, Aidite, Wieland..." />
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">رقم التشغيلة (Lot #)</label>
              <input className={MODAL_INPUT_CLS} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="مثال: LOT-2026-9988" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">سنوات الضمان</label>
              <input className={MODAL_INPUT_CLS} type="number" min="0" max="20" value={warrantyYears} onChange={e => setWarrantyYears(Number(e.target.value))} />
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">اللون (Shade)</label>
              <input className={MODAL_INPUT_CLS} value={shade} onChange={e => setShade(e.target.value)} placeholder="A1, A2, BL2..." />
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">الأسنان (Teeth)</label>
              <input className={MODAL_INPUT_CLS} value={teeth} onChange={e => setTeeth(e.target.value)} placeholder="11, 21, 22..." />
            </div>
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">المادة (Material)</label>
            <input className={MODAL_INPUT_CLS} value={material} onChange={e => setMaterial(e.target.value)} placeholder="Zirconia 3D Pro, E.max Press, PFM..." />
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.common.notes")}</label>
            <textarea className={`${MODAL_INPUT_CLS} min-h-[60px] resize-y`} value={notes} onChange={e => setNotes(e.target.value)} />
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