import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import DentalModelViewer from "./DentalModelViewer";
import OdontogramChart from "./OdontogramChart";
import {
  AlertTriangle, ArrowRightCircle, ArrowRight, BadgeCheck, Banknote, Box, Calendar, CheckCircle2, CreditCard, Download, ExternalLink, Eye, FileDown, FileText, Globe, History,
  Image as ImageIcon, Loader2, Package, Pencil, Plus, Receipt, RefreshCw, RotateCcw, Trash2, Upload, UploadCloud, UserCheck, Users, UserPlus, X as XMarkIcon, XCircle,
} from "lucide-react";
import {
  CASE_STATUSES, CASE_STATUS_MAP, PRIORITY_CONFIG, PAYMENT_STATUS_MAP, ROLE_CONFIG, STAGE_STATUS_MAP,
  DentalCaseHistoryEntry, DentalCaseStage, DentalStageAssignee, DentalCaseAttachment, DentalInvoice, DentalTechnician,
  DentalQualityCheck, DentalRefabrication, DentalCaseStatus, DentalLabCaseDetail, RefabricationStage, CreditNote,
  DentalLabDoctor, DentalWorkType, DentalCasePriority, DentalMaterial, DentalCaseMaterialUsage,
  fetchCaseDetail, advanceCase, updateCase, deleteCaseAttachment,
  addInvoicePayment, fetchTechnicians, fetchDoctors, fetchWorkTypes, addStageAssignee, removeStageAssignee,
  fetchCaseFileBlob, fetchWorkOrderPdf, fetchPanLabelPdf, fetchWarrantyCertificatePdf,
  sendCaseToTryIn, returnCaseFromTryIn, downloadAllFiles,
  recordQualityCheck, flagRefabrication, resolveRefabrication,
  trashCase, restoreCase, permanentDeleteCase,
  consumeDentalCaseMaterial, deleteDentalCaseMaterialUsage, fetchDentalMaterials,
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

const STAGE_ASSIGNEE_ROLES: { id: string; label: string; shortLabel: string; badgeCls: string }[] = [
  { id: "PRIMARY", label: "فني رئيسي (Primary)", shortLabel: "رئيسي", badgeCls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { id: "ASSISTANT", label: "مساعد (Assistant)", shortLabel: "مساعد", badgeCls: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { id: "QC", label: "مراجعة وفحص جودة (QC)", shortLabel: "فحص جودة", badgeCls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { id: "FINISHER", label: "تشطيب وتلميع (Finisher)", shortLabel: "تشطيب", badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { id: "OTHER", label: "دور آخر (Other)", shortLabel: "آخر", badgeCls: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700" },
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
  const [showHtml, setShowHtml] = useState(false);

  // 3D-viewable: STL/PLY/OBJ/DCM
  const fileExt = (attachment.fileName || "").split(".").pop()?.toLowerCase() || "";
  const is3D = ["stl", "ply", "obj", "dcm"].includes(fileExt);
  const isPdf = fileExt === "pdf";
  const isHtml = fileExt === "html" || fileExt === "htm";
  const isImage = (attachment.mimeType?.startsWith("image/") || (!attachment.mimeType && !failed)) && !is3D && !isPdf && !isHtml;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (attachment.storedName) {
      fetchCaseFileBlob(attachment.storedName)
        .then(blob => {
          if (cancelled) return;
          // إذا كان الملف HTML، نضمن نوع الـ Blob لفتحه تفاعلياً في المتصفح
          const finalBlob = isHtml && blob.type !== "text/html" ? new Blob([blob], { type: "text/html;charset=utf-8" }) : blob;
          objectUrl = URL.createObjectURL(finalBlob);
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
  }, [attachment.storedName, isHtml]);

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

  const openHtml = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) setShowHtml(true);
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden group relative">
      <div
        className="h-28 bg-gray-100 dark:bg-gray-900 flex items-center justify-center cursor-pointer"
        onClick={is3D && url ? open3d : isPdf && url ? openPdf : isHtml && url ? openHtml : open}
        title={is3D ? "اضغط للمعاينة 3D" : isPdf ? "اضغط لمعاينة الـPDF" : isHtml ? "اضغط لمعاينة عارض / تقرير HTML" : "اضغط للتحميل"}
      >
        {url && isImage ? (
          <img src={url} alt={attachment.fileName} className="h-full w-full object-cover" />
        ) : isHtml ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-teal-600 dark:text-teal-400">
            <Globe className="w-8 h-8 mb-1" />
            <span className="text-[10px] font-semibold">عارض 3D / تقرير HTML</span>
          </div>
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-red-500">
            <FileText className="w-8 h-8 mb-1" />
            <span className="text-[10px] font-semibold">ملف PDF</span>
          </div>
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
        {isHtml && (
          <div className="absolute top-1 right-1 bg-teal-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
            HTML 3D
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
          {isHtml && url && (
            <button
              onClick={openHtml}
              className="p-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded"
              title="معاينة تقرير / عارض HTML"
            >
              <Eye className="w-3.5 h-3.5" />
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

      {/* HTML Viewer Modal — Sandboxed interactive webview for Exocad / 3Shape */}
      {showHtml && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowHtml(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{attachment.fileName}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">({((attachment.size || 0) / 1024 / 1024).toFixed(1)}MB · HTML)</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 rounded font-medium flex items-center gap-1"
                >
                  <span>فتح في نافذة كاملة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setShowHtml(false)}
                  className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded"
                  title="إغلاق"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-900 relative">
              <iframe
                src={url}
                title={attachment.fileName}
                className="w-full h-full border-0 rounded-b-xl"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
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

// O4: واجهة إرسال الشغل لجهة خارجية (بره المعمل - OUTSOURCED)
function OutsourceModal({ caseId, onClose, onSaved }: { caseId: string; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [cost, setCost] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    if (!providerName.trim()) {
      toast.error("يرجى إدخال اسم جهة التنفيذ الخارجية (المعمل أو المركز)");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const summaryParts = [
        `جهة التنفيذ: ${providerName.trim()}`,
        workDescription.trim() && `العمل: ${workDescription.trim()}`,
        cost.trim() && `التكلفة: ${cost.trim()} ج.م`,
        returnDate && `موعد الاستلام: ${returnDate}`,
        trackingNumber.trim() && `رقم الإيصال: ${trackingNumber.trim()}`,
        notes.trim() && `ملاحظات: ${notes.trim()}`,
      ].filter(Boolean);

      const combinedNotes = `[بره المعمل (OUTSOURCED) | ${summaryParts.join(" | ")}]`;

      await advanceCase(caseId, {
        to: "OUTSOURCED",
        reason: `إرسال إلى: ${providerName.trim()}`,
        notes: combinedNotes,
        dueDate: returnDate || undefined,
      });

      toast.success("تم تحويل الحالة إلى مرحلة (بره المعمل) بنجاح");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || "فشل إرسال الحالة للجهة الخارجية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold">إرسال الشغل لجهة خارجية (بره المعمل)</h3>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اسم جهة التنفيذ الخارجية (مركز ميلنج / معمل صب / مورد) *
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={providerName}
              onChange={e => setProviderName(e.target.value)}
              placeholder="مثال: مركز الأمل للميلنج والـ CAD/CAM..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                نوع العمل المطلوب خارجياً
              </label>
              <input
                className={MODAL_INPUT_CLS}
                value={workDescription}
                onChange={e => setWorkDescription(e.target.value)}
                placeholder="مثال: خرط زيركون Katana 3D..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                التكلفة المتوقعة (ج.م)
              </label>
              <input
                className={MODAL_INPUT_CLS}
                type="number"
                min="0"
                value={cost}
                onChange={e => setCost(e.target.value)}
                placeholder="مثال: 150"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                موعد الاستلام المتوقع
              </label>
              <input
                className={MODAL_INPUT_CLS}
                type="date"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رقم الإيصال / البوليصة
              </label>
              <input
                className={MODAL_INPUT_CLS}
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="رقم متابعة الاستلام..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات وتعليمات للجهة الخارجية
            </label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[60px] resize-y`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تعليمات أو مقاسات خاصة مطلوبة من المورد الخارجي..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            تأكيد الإرسال لجهة خارجية
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
  const [doctors, setDoctors] = useState<DentalLabDoctor[]>([]);
  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [assignStage, setAssignStage] = useState<DentalCaseStage | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<{ name: string; url: string } | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<DentalInvoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadDragOver, setUploadDragOver] = useState(false);
  const [workOrderLoading, setWorkOrderLoading] = useState(false);
  const [panLabelLoading, setPanLabelLoading] = useState(false);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [tryInSendOpen, setTryInSendOpen] = useState(false);
  const [tryInReturnOpen, setTryInReturnOpen] = useState(false);
  const [outsourceOpen, setOutsourceOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [refabOpen, setRefabOpen] = useState(false);
  const [refabBusyId, setRefabBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const designReviewInputRef = useRef<HTMLInputElement | null>(null);

  const [materialConsumeOpen, setMaterialConsumeOpen] = useState(false);
  const [materialsList, setMaterialsList] = useState<DentalMaterial[]>([]);
  const [selectedMatId, setSelectedMatId] = useState("");
  const [selectedStockId, setSelectedStockId] = useState("");
  const [consumeUnits, setConsumeUnits] = useState(1);
  const [consumeNotes, setConsumeNotes] = useState("");
  const [materialBusy, setMaterialBusy] = useState(false);

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

  const handleDesignReviewUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    startUpload(files, files.map(() => "DESIGN_REVIEW"));
    e.target.value = "";
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
  const [snoozing, setSnoozing] = useState(false);

  // O5: تأجيل تنبيهات التأخير (Snooze overdue alerts: +1 / +3 days / +week)
  const handleSnoozeOverdue = async (days: number) => {
    if (!id || snoozing) return;
    try {
      setSnoozing(true);
      const base = new Date();
      base.setDate(base.getDate() + days);
      const newDueDateIso = base.toISOString().split("T")[0];
      await updateCase(id, { dueDate: newDueDateIso });
      toast.success(`تم تأجيل تنبيه التأخير (Snooze) وتمديد ميعاد التسليم بمقدار ${days} يوم إلى ${fmtDate(newDueDateIso)}`);
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "فشل تأجيل تنبيه التأخير");
    } finally {
      setSnoozing(false);
    }
  };

  // O4: استلام الشغل من الجهة الخارجية ونقله إلى مراجعة الجودة
  const handleReturnFromOutsource = async () => {
    if (!id || caseBusy) return;
    if (!window.confirm("هل تم استلام الشغل من الجهة الخارجية ونقله إلى مراجعة الجودة (QC)؟")) return;
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
  }, [refresh]);

  // Max file size (50MB) — matches backend upload limit. Hard cap to
  // stop users picking 200MB STL files that would silently 502.
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const ACCEPT_ATTR = ".stl,.ply,.obj,.jpg,.jpeg,.png,.webp,.pdf,.dcm,.html,.htm";
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
  const materialUsages = (c.materialUsages ?? []) as DentalCaseMaterialUsage[];
  const latestCheck = qualityChecks.length > 0
    ? [...qualityChecks].sort((a, b) => new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime())[0]
    : undefined;

  const infoRows: { label: string; value: ReactNode }[] = [
    { label: t("dentalLab.cases.patient"), value: c.patientName },
    { label: t("dentalLab.cases.patientPhone"), value: c.patientPhone ? <span dir="ltr">{c.patientPhone}</span> : "—" },
    { 
      label: t("dentalLab.cases.doctor"), 
      value: c.doctorId && c.doctorName ? (
        <Link 
          to={`/dental-lab/doctors/${c.doctorId}`} 
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
        >
          {c.doctorName}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>
      ) : (c.doctorName || "—") 
    },
    { 
      label: t("dentalLab.cases.workType"), 
      value: c.workTypeName ? (
        <Link 
          to="/dental-lab/work-types" 
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 font-medium transition-colors"
        >
          {c.workTypeName}
          <ExternalLink className="w-3 h-3 opacity-70" />
        </Link>
      ) : "—" 
    },
    { label: "عدد الوحدات", value: c.unitsCount ? `${c.unitsCount} وحدات` : "1 وحدة" },
    { label: "سعر الوحدة", value: c.unitPrice ? fmtMoney(c.unitPrice) : "—" },
    { label: t("dentalLab.cases.teeth"), value: c.teeth || "—" },
    { label: t("dentalLab.cases.shade"), value: c.shade || "—" },
    { label: t("dentalLab.cases.material"), value: c.material || "—" },
    { label: "الماركة / الشركة", value: c.materialBrand || "—" },
    { label: "رقم التشغيلة (Lot #)", value: c.lotNumber ? <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{c.lotNumber}</span> : "—" },
    { label: "مدة الضمان", value: c.warrantyYears ? <span className="text-emerald-600 font-bold">{c.warrantyYears} سنوات</span> : "بدون ضمان" },
    { label: "حالة البروفة", value: c.isTryIn ? <span className="text-amber-600 font-bold">في بروفة ({c.tryInStage})</span> : (c.tryInCount ? `تمت (${c.tryInCount} بروفة)` : "لا يوجد") },
    { label: "تاريخ الدخول", value: c.receivedDate ? <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-blue-500" />{fmtDate(c.receivedDate)}</span> : "—" },
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
            <button
              onClick={() => setStatusOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 shadow-sm transition-colors"
            >
              <Pencil className="w-4 h-4" /> تعديل الحالة بالكامل
            </button>
          )}
          {c.status === "MANUFACTURING" && !c.isTryIn && !c.isDeleted && (
            <button
              type="button"
              onClick={() => setOutsourceOpen(true)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-sm transition"
              title="إرسال الحالة لجهة خارجية (ميلنج، صب، ليزر...)"
            >
              <ExternalLink className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              بره المعمل
            </button>
          )}
          {c.status === "OUTSOURCED" && !c.isDeleted && (
            <button
              type="button"
              onClick={handleReturnFromOutsource}
              disabled={caseBusy}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
              title="استلام الشغل من الجهة الخارجية ونقله لفحص الجودة"
            >
              <CheckCircle2 className="w-4 h-4" />
              استلام من بره المعمل
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
        <div className="mb-6 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
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
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300 hidden sm:inline">تأجيل التنبيه (Snooze):</span>
            <button
              type="button"
              onClick={() => handleSnoozeOverdue(1)}
              disabled={snoozing}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm disabled:opacity-50 transition-colors"
              title="تأجيل تنبيه التأخير وتمديد الموعد ليوم إضافي"
            >
              تأجيل +1 يوم
            </button>
            <button
              type="button"
              onClick={() => handleSnoozeOverdue(3)}
              disabled={snoozing}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm disabled:opacity-50 transition-colors"
              title="تأجيل تنبيه التأخير وتمديد الموعد لـ 3 أيام"
            >
              تأجيل +3 أيام
            </button>
            <button
              type="button"
              onClick={() => handleSnoozeOverdue(7)}
              disabled={snoozing}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 shadow-sm disabled:opacity-50 transition-colors"
              title="تأجيل تنبيه التأخير وتمديد الموعد لأسبوع كامل"
            >
              تأجيل +أسبوع
            </button>
          </div>
        </div>
      )}

      {c.status === "OUTSOURCED" && (
        <div className="mb-6 p-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                الشغل حالياً لدى جهة خارجية (بره المعمل)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                الحالة في مرحلة التشغيل الخارجي (مركز ميلنج / صب / ليزر). فور استلام الشغل الجاهز، اضغط على زر الاستلام لنقل الحالة إلى مراجعة الجودة (QC).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReturnFromOutsource}
            disabled={caseBusy}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            استلام الشغل وفحص الجودة
          </button>
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

      {(() => {
        const designAtt = attachments.find(a => a.kind === "DESIGN_REVIEW");
        if (!designAtt) return null;
        const designHist = history.find(h => h.dimension === "DESIGN_REVIEW");
        const isApproved = designHist?.status === "APPROVED";
        const isChanges = designHist?.status === "CHANGES_REQUESTED";
        return (
          <div className={`mb-6 p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
            isApproved
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : isChanges
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl text-white font-bold ${isApproved ? "bg-emerald-600" : isChanges ? "bg-amber-600" : "bg-indigo-600"}`}>
                <Box className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {isApproved
                    ? `تم اعتماد تصميم الـ 3D من الطبيب المعالج (${designHist?.userName || "الطبيب"})`
                    : isChanges
                    ? `الطبيب طلب تعديل على تصميم الـ 3D`
                    : `تصميم الـ 3D مرفوع وبانتظار اعتماد الطبيب المعالج عبر البوابة`}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {designHist?.reason ? `ملاحظات الطبيب: "${designHist.reason}"` : `الملف المرفق: ${designAtt.fileName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedModel({
                  name: designAtt.fileName,
                  url: `/api/v1/dental-lab/files/${designAtt.storedPath}`,
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> معاينة التصميم ثلاثي الأبعاد
              </button>
            </div>
          </div>
        );
      })()}

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
            {c.teeth ? (
              <div className="mt-4 border-t dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  خريطة الأسنان المحددة في أمر الشغل (Visual FDI Odontogram):
                </p>
                <OdontogramChart
                  selectedTeeth={c.teeth.split(/[,،\s]+/).filter(Boolean)}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            ) : null}
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
                        {h.dimension === "DESIGN_REVIEW" ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            h.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}>
                            {h.status === "APPROVED" ? "✅ اعتماد تصميم الـ 3D من الطبيب" : "⚠️ طلب تعديل على تصميم الـ 3D"}
                          </span>
                        ) : (
                          <>
                            {badge(CASE_STATUS_MAP, h.fromStatus)}
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                            {badge(CASE_STATUS_MAP, h.toStatus)}
                          </>
                        )}
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
                      <th className="text-right py-2.5 px-3">{t("dentalLab.detail.stageName")}</th>
                      <th className="text-right py-2.5 px-3">الفنيون المسندون للمرحلة</th>
                      <th className="text-right py-2.5 px-3">{t("dentalLab.common.status")}</th>
                      <th className="text-right py-2.5 px-3">{t("dentalLab.detail.startedAt")}</th>
                      <th className="text-right py-2.5 px-3">{t("dentalLab.detail.completedAt")}</th>
                      <th className="text-right py-2.5 px-3">إدارة الفنيين</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map(s => {
                      const hasAssignees = s.assignees && s.assignees.length > 0;
                      return (
                        <tr key={s.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                          <td className="py-2.5 px-3 font-medium">{s.name}</td>
                          <td className="py-2.5 px-3">
                            {hasAssignees ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {s.assignees!.map((asg) => {
                                  const techName = asg.technician?.name || asg.technicianName || asg.technicianId;
                                  const roleMeta = STAGE_ASSIGNEE_ROLES.find(r => r.id === asg.role);
                                  return (
                                    <span
                                      key={asg.id || asg.technicianId}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium ${roleMeta?.badgeCls || 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}
                                      title={asg.notes ? `ملاحظات: ${asg.notes}` : undefined}
                                    >
                                      <span className="font-semibold">{techName}</span>
                                      <span className="text-[10px] opacity-80">
                                        ({roleMeta ? roleMeta.shortLabel : asg.role})
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className={s.assigneeName ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-400 italic text-xs"}>
                                {s.assigneeName || "غير محدد"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">{badge(STAGE_STATUS_MAP, s.status) ?? <span className="text-gray-400">{s.status}</span>}</td>
                          <td className="py-2.5 px-3 text-xs">{fmtDate(s.startedAt)}</td>
                          <td className="py-2.5 px-3 text-xs">{fmtDate(s.completedAt)}</td>
                          <td className="py-2.5 px-3">
                            {!c.isDeleted && (
                              <button
                                type="button"
                                onClick={() => setAssignStage(s)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                                title="إدارة وإسناد الفنيين لهذه المرحلة (يمكن إضافة أكثر من فني)"
                              >
                                <Users className="w-3.5 h-3.5" />
                                {hasAssignees
                                  ? `إدارة الفنيين (${s.assignees!.length})`
                                  : (s.assigneeName ? "إدارة الفني" : "+ تعيين فني")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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

          <Card
            title="الخامات المستخدمة وتتبع التشغيلة (Materials & Lot Traceability)"
            icon={<Package className="w-5 h-5" />}
            action={
              !c.isDeleted ? (
                <button
                  type="button"
                  onClick={handleOpenMaterialConsume}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  تسجيل استهلاك خام
                </button>
              ) : null
            }
          >
            {materialUsages.length === 0 ? (
              <div className="text-center py-5 text-gray-400 dark:text-gray-500 text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                لم يتم تسجيل استهلاك خامات أو ربط قرص تفريز / تشغيلة بهذه الحالة حتى الآن.
              </div>
            ) : (
              <div className="space-y-2.5">
                {materialUsages.map((usage) => (
                  <div
                    key={usage.id}
                    className="border dark:border-gray-700 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                          {usage.material?.name || "مادة خام"}
                        </span>
                        {usage.material?.category && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                            {usage.material.category}
                          </span>
                        )}
                        {usage.material?.shade && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                            {usage.material.shade}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-[11px] flex-wrap">
                        <span>الكمية: <strong className="text-gray-800 dark:text-gray-200 font-semibold">{usage.unitsUsed} {usage.material?.unit || "وحدة"}</strong></span>
                        {usage.lotNumber && (
                          <span>رقم التشغيلة (Lot #): <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded font-mono text-gray-800 dark:text-gray-200 font-bold">{usage.lotNumber}</code></span>
                        )}
                        {usage.materialStock?.expiryDate && (
                          <span>انتهاء: {fmtDate(usage.materialStock.expiryDate)}</span>
                        )}
                        {usage.consumedByName && (
                          <span>بواسطة: {usage.consumedByName}</span>
                        )}
                        <span>{fmtDateTime(usage.consumedAt)}</span>
                      </div>
                      {usage.notes && (
                        <p className="text-gray-600 dark:text-gray-300 text-[11px] mt-0.5">
                          📝 {usage.notes}
                        </p>
                      )}
                    </div>
                    {!c.isDeleted && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterialUsage(usage.id)}
                        disabled={materialBusy}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-50"
                        title="إلغاء الاستهلاك واسترجاع الرصيد للمخزن"
                      >
                        <Trash2 className="w-4 h-4" />
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
                <button
                  onClick={() => designReviewInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                  title="رفع تصميم ثلاثي الأبعاد (HTML Exocad أو STL) لاعتماده من الطبيب قبل البدء بالتفريز"
                >
                  <Box className="w-3.5 h-3.5" />
                  رفع تصميم 3D للاعتماد
                </button>
                <input
                  ref={designReviewInputRef}
                  type="file"
                  className="hidden"
                  accept=".html,.htm,.stl,.ply,.obj"
                  onChange={handleDesignReviewUpload}
                />
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
                STL, PLY, OBJ, HTML (Exocad 3D), JPG, PNG, PDF, DCM — حد أقصى 50MB للملف
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
        <EditCaseModal
          caseData={c}
          doctors={doctors}
          workTypes={workTypes}
          onClose={() => setStatusOpen(false)}
          onSaved={() => { setStatusOpen(false); refresh(); }}
        />
      )}

      {assignStage && (
        <AssignStageModal
          caseId={c.id}
          stage={(c.stages || []).find(s => s.id === assignStage.id) || assignStage}
          technicians={technicians}
          onClose={() => setAssignStage(null)}
          onSaved={() => refresh()}
        />
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

      {outsourceOpen && (
        <OutsourceModal
          caseId={c.id}
          onClose={() => setOutsourceOpen(false)}
          onSaved={() => { setOutsourceOpen(false); refresh(); }}
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

      {materialConsumeOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => !materialBusy && setMaterialConsumeOpen(false)}
        >
          <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                تسجيل استهلاك خامات وتتبع التشغيلة (Lot Traceability)
              </h3>
              <button
                type="button"
                onClick={() => !materialBusy && setMaterialConsumeOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  المادة الخام المستهلكة *
                </label>
                <select
                  className={MODAL_INPUT_CLS}
                  value={selectedMatId}
                  onChange={e => {
                    const mId = e.target.value;
                    setSelectedMatId(mId);
                    const mat = materialsList.find(m => m.id === mId);
                    const stocks = mat?.stocks || [];
                    setSelectedStockId(stocks.length > 0 ? stocks[0].id : "");
                  }}
                >
                  <option value="">— اختر المادة الخام —</option>
                  {materialsList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category}) {m.shade ? `· لون: ${m.shade}` : ""} · الرصيد: {m.currentStock} {m.unit}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatId && (
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    التشغيلة أو القرص المحدد (Lot / Disc) *
                  </label>
                  {(() => {
                    const mat = materialsList.find(m => m.id === selectedMatId);
                    const stocks = mat?.stocks || [];
                    if (stocks.length === 0) {
                      return (
                        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs">
                          لا توجد شحنات مسجلة برقم تشغيلة لهذه الخامة. سيتم الصرف مباشرة من الرصيد العام.
                        </div>
                      );
                    }
                    return (
                      <select
                        className={MODAL_INPUT_CLS}
                        value={selectedStockId}
                        onChange={e => setSelectedStockId(e.target.value)}
                      >
                        <option value="">— خصم من الرصيد العام بدون تشغيلة محددة —</option>
                        {stocks.map(s => (
                          <option key={s.id} value={s.id}>
                            Lot: {s.lotNumber || "عام"} · المتبقي: {s.remainingUnits} {mat?.unit} {s.expiryDate ? `· انتهاء: ${fmtDate(s.expiryDate)}` : ""}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  الكمية المستهلكة (عدد التيجان / الجرامات / الوحدات) *
                </label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={consumeUnits}
                  onChange={e => setConsumeUnits(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  ملاحظات الاستهلاك (اختياري)
                </label>
                <input
                  className={MODAL_INPUT_CLS}
                  value={consumeNotes}
                  onChange={e => setConsumeNotes(e.target.value)}
                  placeholder="مثال: تفريز جسر 3 وحدات فك علوي..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={() => setMaterialConsumeOpen(false)}
                disabled={materialBusy}
                className="px-4 py-2 border rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConsumeSubmit}
                disabled={materialBusy || !selectedMatId}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {materialBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                تسجيل وخصم من المخزن
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedModel && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedModel(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <Box className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedModel.name}</span>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded flex-shrink-0"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative min-h-[500px]">
              <DentalModelViewer url={selectedModel.url} ext={(selectedModel.name.split(".").pop() || "stl").toLowerCase()} />
            </div>
          </div>
        </div>
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

interface AssignStageModalProps {
  caseId: string;
  stage: DentalCaseStage;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignStageModal({ caseId, stage, technicians, onClose, onSaved }: AssignStageModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [removingTechId, setRemovingTechId] = useState<string | null>(null);

  // Local list of assignees for immediate UI responsiveness
  const [assignees, setAssignees] = useState<DentalStageAssignee[]>(() => {
    if (stage.assignees && stage.assignees.length > 0) return stage.assignees;
    if (stage.assigneeId) {
      return [{
        id: `legacy-${stage.assigneeId}`,
        stageId: stage.id,
        technicianId: stage.assigneeId,
        technicianName: stage.assigneeName,
        role: "PRIMARY",
        sharePercent: 100,
        technician: { id: stage.assigneeId, name: stage.assigneeName || "فني مسند" },
      }];
    }
    return [];
  });

  // Sync if prop updates
  useEffect(() => {
    if (stage.assignees && stage.assignees.length > 0) {
      setAssignees(stage.assignees);
    }
  }, [stage.assignees]);

  // Form state for adding a technician
  const [technicianId, setTechnicianId] = useState("");
  const [role, setRole] = useState("PRIMARY");
  const [notes, setNotes] = useState("");

  const handleAddAssignee = async () => {
    if (!technicianId) {
      toast.error("يرجى اختيار الفني المراد إسناده للمرحلة");
      return;
    }
    setSaving(true);
    try {
      const updatedCase = await addStageAssignee(caseId, stage.id, {
        technicianId,
        role,
        sharePercent: 100,
        notes: notes.trim() || undefined,
      });
      toast.success("تم إسناد الفني للمرحلة بنجاح");
      if (updatedCase && updatedCase.stages) {
        const found = updatedCase.stages.find(s => s.id === stage.id);
        if (found && found.assignees) {
          setAssignees(found.assignees);
        }
      }
      setTechnicianId("");
      setNotes("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignee = async (techId: string, techName?: string) => {
    if (!window.confirm(`هل أنت متأكد من إزالة الفني "${techName || 'المحدد'}" من هذه المرحلة؟`)) return;
    setRemovingTechId(techId);
    try {
      const updatedCase = await removeStageAssignee(caseId, stage.id, techId);
      toast.success("تم إلغاء إسناد الفني من المرحلة");
      if (updatedCase && updatedCase.stages) {
        const found = updatedCase.stages.find(s => s.id === stage.id);
        if (found) {
          setAssignees(found.assignees || []);
        } else {
          setAssignees(prev => prev.filter(a => a.technicianId !== techId));
        }
      } else {
        setAssignees(prev => prev.filter(a => a.technicianId !== techId));
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingTechId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} max-w-lg w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              إسناد الفنيين لمرحلة: <span className="text-blue-600 dark:text-blue-400">{stage.name}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              يمكنك تعيين أكثر من فني وتحديد دور كل فني (رئيسي، مساعد، فحص جودة، تشطيب)
            </p>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* List of currently assigned technicians */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
              <span>الفنيون المسندون للمرحلة</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
                {assignees.length}
              </span>
            </h4>
          </div>

          {assignees.length === 0 ? (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
              لا يوجد فنيون مسندون لهذه المرحلة حتى الآن. اختر فنياً من النموذج أدناه لإسناده.
            </div>
          ) : (
            <div className="space-y-2">
              {assignees.map((asg) => {
                const techName = asg.technician?.name || asg.technicianName || asg.technicianId;
                const roleMeta = STAGE_ASSIGNEE_ROLES.find(r => r.id === asg.role);
                const isRemoving = removingTechId === asg.technicianId;
                return (
                  <div
                    key={asg.id || asg.technicianId}
                    className="flex items-center justify-between p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {techName}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${roleMeta?.badgeCls || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
                          {roleMeta?.shortLabel || asg.role}
                        </span>
                      </div>
                      {asg.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          📝 {asg.notes}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(asg.technicianId, techName)}
                      disabled={isRemoving || saving}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-50 flex items-center gap-1 text-xs"
                      title="إزالة الفني من المرحلة"
                    >
                      {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new technician to stage section */}
        <div className="bg-gray-50/80 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700/80 space-y-3.5">
          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            إضافة فني جديد إلى المرحلة
          </h4>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اختر الفني *
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={technicianId}
              onChange={e => setTechnicianId(e.target.value)}
            >
              <option value="">— اختر فني —</option>
              {technicians
                .filter(x => x.isActive)
                .map(x => {
                  const alreadyAssigned = assignees.some(a => a.technicianId === x.id);
                  return (
                    <option key={x.id} value={x.id}>
                      {x.name} ({ROLE_CONFIG[x.role]?.label || x.role}) {alreadyAssigned ? "— (مسند بالفعل)" : ""}
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              دور الفني في هذه المرحلة
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {STAGE_ASSIGNEE_ROLES.map(r => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات وتوجيهات خاصة للفني (اختياري)
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: مسؤول عن الفينش النهائي والمقاسات..."
            />
          </div>

          <button
            type="button"
            onClick={handleAddAssignee}
            disabled={saving || !technicianId}
            className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            + إضافة الفني للمرحلة
          </button>
        </div>

        <div className="flex justify-end mt-5 pt-3 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditCaseModalProps {
  caseData: DentalLabCaseDetail;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  onClose: () => void;
  onSaved: () => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function EditCaseModal({ caseData, doctors, workTypes, onClose, onSaved }: EditCaseModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(caseData.doctorId || "");
  const [patientName, setPatientName] = useState(caseData.patientName || "");
  const [patientPhone, setPatientPhone] = useState(caseData.patientPhone || "");
  const [workTypeId, setWorkTypeId] = useState(caseData.workTypeId || "");
  const [workTypeName, setWorkTypeName] = useState(caseData.workTypeName || "");
  const [unitsCount, setUnitsCount] = useState<number>(caseData.unitsCount || 1);
  const [unitPrice, setUnitPrice] = useState<number>(caseData.unitPrice || 0);
  const [priceSnapshot, setPriceSnapshot] = useState<number>(caseData.priceSnapshot || 0);
  const [discount, setDiscount] = useState<number>(caseData.discount || 0);
  const [receivedDate, setReceivedDate] = useState(caseData.receivedDate ? caseData.receivedDate.slice(0, 10) : "");
  const [dueDate, setDueDate] = useState(caseData.dueDate ? caseData.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState<DentalCasePriority>((caseData.priority as DentalCasePriority) || "NORMAL");
  const [status, setStatus] = useState<DentalCaseStatus>((caseData.status as DentalCaseStatus) || "RECEIVED");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
    caseData.teeth ? caseData.teeth.split(/[,،\s]+/).filter(Boolean) : []
  );
  const [teeth, setTeeth] = useState(caseData.teeth || "");
  const [shade, setShade] = useState(caseData.shade || "");
  const [material, setMaterial] = useState(caseData.material || "");
  const [lotNumber, setLotNumber] = useState(caseData.lotNumber || "");
  const [materialBrand, setMaterialBrand] = useState(caseData.materialBrand || "");
  const [warrantyYears, setWarrantyYears] = useState(caseData.warrantyYears || 0);
  const [notes, setNotes] = useState(caseData.notes || "");

  const onWorkTypeChange = (wtId: string) => {
    setWorkTypeId(wtId);
    const wt = workTypes.find(w => w.id === wtId);
    if (wt) {
      setWorkTypeName(wt.name);
      const pr = Number(wt.price) || 0;
      setUnitPrice(pr);
      setPriceSnapshot(round2(pr * (unitsCount || 1)));
      if (wt.defaultMaterial && !material) setMaterial(wt.defaultMaterial);
      if (wt.materialBrand && !materialBrand) setMaterialBrand(wt.materialBrand);
      if (wt.defaultWarrantyYears != null && !warrantyYears) setWarrantyYears(wt.defaultWarrantyYears);
    }
  };

  const handleUnitsCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setUnitsCount(validCount);
    if (unitPrice > 0) {
      setPriceSnapshot(round2(validCount * unitPrice));
    }
  };

  const handleUnitPriceChange = (price: number) => {
    const validPrice = Math.max(0, price);
    setUnitPrice(validPrice);
    if (unitsCount > 0) {
      setPriceSnapshot(round2(unitsCount * validPrice));
    }
  };

  const save = async () => {
    if (saving) return;
    if (!patientName.trim()) {
      toast.error(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      if (status !== caseData.status) {
        await advanceCase(caseData.id, { status: status as DentalCaseStatus });
      }
      await updateCase(caseData.id, {
        doctorId: doctorId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: workTypeId || undefined,
        workTypeName: workTypeName.trim() || undefined,
        unitsCount: Math.max(1, Number(unitsCount) || 1),
        unitPrice: Math.max(0, Number(unitPrice) || 0),
        priceSnapshot: Math.max(0, Number(priceSnapshot) || 0),
        discount: Math.max(0, Number(discount) || 0),
        receivedDate: receivedDate || undefined,
        dueDate: dueDate || undefined,
        priority: priority as DentalCasePriority,
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

  const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1";
  const sectionTitleCls = "text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2 mb-3";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" onClick={() => !saving && onClose()}>
      <div className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 border-b dark:border-gray-700 pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">تعديل بيانات الحالة بالكامل</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              رقم الحالة: <span className="font-mono font-semibold">{caseData.caseNumber}</span>
            </p>
          </div>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 text-sm">
          {/* Section 1: Doctor & Patient */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
            <h4 className={sectionTitleCls}>
              👤 بيانات الطبيب والمريض
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>الطبيب المعالج *</label>
                <select className={MODAL_INPUT_CLS} value={doctorId} onChange={e => setDoctorId(e.target.value)}>
                  <option value="">— اختر الطبيب —</option>
                  {doctors.filter(d => d.isActive).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>اسم المريض *</label>
                <input className={MODAL_INPUT_CLS} value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="اسم المريض" />
              </div>
              <div>
                <label className={labelCls}>هاتف المريض</label>
                <input className={MODAL_INPUT_CLS} value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
              </div>
            </div>
          </div>

          {/* Section 2: Work & Units */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
            <h4 className={sectionTitleCls}>
              ⚙️ مواصفات الشغل والأسنان
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className={labelCls}>نوع الشغل *</label>
                <select className={MODAL_INPUT_CLS} value={workTypeId} onChange={e => onWorkTypeChange(e.target.value)}>
                  <option value="">— اختر نوع الشغل —</option>
                  {workTypes.filter(w => w.isActive).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>عدد الوحدات / الأسنان</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="1"
                  value={unitsCount}
                  onChange={e => handleUnitsCountChange(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>سعر الوحدة</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={e => handleUnitPriceChange(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>اللون (Shade)</label>
                <input className={MODAL_INPUT_CLS} value={shade} onChange={e => setShade(e.target.value)} placeholder="مثال: A1, A2, BL2" />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelCls}>تحديد الأسنان بالخريطة التفاعلية (FDI Odontogram)</label>
              <OdontogramChart
                selectedTeeth={selectedTeeth}
                onChange={(arr) => {
                  setSelectedTeeth(arr);
                  setTeeth(arr.join(", "));
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>الخامة (Material)</label>
                <input className={MODAL_INPUT_CLS} value={material} onChange={e => setMaterial(e.target.value)} placeholder="زيركون، إيماكس، PFM..." />
              </div>
              <div>
                <label className={labelCls}>الشركة المصنعة / الماركة</label>
                <input className={MODAL_INPUT_CLS} value={materialBrand} onChange={e => setMaterialBrand(e.target.value)} placeholder="Ivoclar, Wieland, Aidite..." />
              </div>
              <div>
                <label className={labelCls}>رقم التشغيلة (Lot #)</label>
                <input className={MODAL_INPUT_CLS} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="LOT-2026-XXXX" />
              </div>
              <div>
                <label className={labelCls}>سنوات الضمان</label>
                <input className={MODAL_INPUT_CLS} type="number" min="0" max="20" value={warrantyYears} onChange={e => setWarrantyYears(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Dates */}
          <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
            <h4 className={sectionTitleCls}>
              💰 الأسعار والجدولة
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>الإجمالي قبل الخصم</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="0"
                  value={priceSnapshot}
                  onChange={e => setPriceSnapshot(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>قيمة الخصم</label>
                <input
                  className={MODAL_INPUT_CLS}
                  type="number"
                  min="0"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelCls}>تاريخ الدخول / الاستلام</label>
                <input className={MODAL_INPUT_CLS} type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>تاريخ التسليم المتوقع</label>
                <input className={MODAL_INPUT_CLS} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>الأولوية</label>
                <select className={MODAL_INPUT_CLS} value={priority} onChange={e => setPriority(e.target.value as DentalCasePriority)}>
                  {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map(k => (
                    <option key={k} value={k}>{PRIORITY_CONFIG[k].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelCls}>حالة الشغل العامة</label>
              <select className={MODAL_INPUT_CLS} value={status} onChange={e => setStatus(e.target.value as DentalCaseStatus)}>
                {CASE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className={labelCls}>ملاحظات وتعليمات الشغل</label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[70px] resize-y`}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="إرشادات التحضير، تفاصيل خاصة..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
          <button onClick={onClose} disabled={saving} className="px-5 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            {t("dentalLab.common.cancel")}
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}