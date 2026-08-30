import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
// Side-effect import: registers the <model-viewer> custom element with
// the browser. Must run once on the client. Without this, the JSX tag
// below would just render as an unknown element.
import "@google/model-viewer";
import {
  ArrowRightCircle, ArrowRight, BadgeCheck, Banknote, Box, Calendar, CheckCircle2, CreditCard, Download, FileDown, FileText, History,
  Image as ImageIcon, Loader2, Pencil, Plus, Receipt, RefreshCw, RotateCcw, Upload, UploadCloud, X as XMarkIcon, XCircle,
} from "lucide-react";
import {
  CASE_STATUSES, CASE_STATUS_MAP, PRIORITY_CONFIG, PAYMENT_STATUS_MAP, ROLE_CONFIG, STAGE_STATUS_MAP,
  DentalCaseHistoryEntry, DentalCaseStage, DentalCaseAttachment, DentalInvoice, DentalTechnician,
  DentalQualityCheck, DentalRefabrication, DentalCaseStatus, DentalLabCaseDetail, RefabricationStage, CreditNote,
  fetchCaseDetail, advanceCase, updateCase, uploadCaseAttachment, deleteCaseAttachment,
  addInvoicePayment, fetchTechnicians, fetchCaseFileBlob, fetchWorkOrderPdf,
  recordQualityCheck, flagRefabrication, resolveRefabrication,
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
  const isImage = attachment.mimeType?.startsWith("image/") || (!attachment.mimeType && !failed);
  // 3D-viewable: anything that dental lab techs would want to rotate/zoom
  // on. STL/PLY/OBJ are the dental scan formats; DCM is x-ray (DICOM) which
  // the model-viewer can also render.
  const fileExt = (attachment.fileName || "").split(".").pop()?.toLowerCase() || "";
  const is3D = ["stl", "ply", "obj", "dcm"].includes(fileExt);

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

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden group relative">
      <div
        className="h-28 bg-gray-100 dark:bg-gray-900 flex items-center justify-center cursor-pointer"
        onClick={is3D && url ? open3d : open}
        title={is3D ? "اضغط للمعاينة 3D" : "اضغط للتحميل"}
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
                <span className="text-xs text-gray-400 flex-shrink-0">({(attachment.size / 1024 / 1024).toFixed(1)}MB · {fileExt.toUpperCase()})</span>
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
              {/* @ts-ignore — model-viewer is a custom element, no TS types */}
              <model-viewer
                src={url}
                alt={attachment.fileName}
                camera-controls
                auto-rotate
                auto-rotate-delay="1500"
                rotation-per-second="20deg"
                shadow-intensity="1.2"
                exposure="0.9"
                tone-mapping="commerce"
                style={{ width: "100%", height: "100%", minHeight: "500px" }}
              >
                <div slot="progress-bar" className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  جاري تحميل النموذج 3D...
                </div>
                <div slot="error" className="absolute inset-0 flex items-center justify-center text-red-500 text-sm p-4 text-center">
                  فشل تحميل النموذج. تأكد إن الملف STL/PLY/OBJ صالح.
                </div>
              </model-viewer>
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

function RefabricationModal({ caseId, onClose, onSaved }: { caseId: string; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [stageFrom, setStageFrom] = useState<RefabricationStage>("DESIGN");

  const save = async () => {
    if (saving) return;
    if (!reason.trim()) { toast.error(t("dentalLab.detail.refabReasonRequired")); return; }
    setSaving(true);
    try {
      await flagRefabrication(caseId, { reason: reason.trim(), stageFrom });
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
            <textarea className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`} value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.detail.refabStageFrom")}</label>
            <select className={MODAL_INPUT_CLS} value={stageFrom} onChange={e => setStageFrom(e.target.value as RefabricationStage)}>
              {REFAB_STAGES.map(s => <option key={s.id} value={s.id}>{t(s.labelKey)}</option>)}
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

  // Per-file upload queue. Each file gets its own item so progress
  // shows individually and one failure doesn't kill the batch.
  const startUpload = useCallback(
    async (filesToUpload: File[], perFileKinds?: string[]) => {
      if (!id || filesToUpload.length === 0) return;

      // Client-side validation: drop anything oversized before hitting the network.
      const valid: { file: File; kind: string }[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const f = filesToUpload[i];
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
    { label: t("dentalLab.cases.dueDate"), value: c.dueDate ? <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{fmtDate(c.dueDate)}</span> : "—" },
    { label: t("dentalLab.cases.priceSnapshot"), value: fmtMoney(c.priceSnapshot) },
    { label: t("dentalLab.cases.discount"), value: fmtMoney(c.discount) },
    { label: t("dentalLab.cases.amounts"), value: (
      <span dir="ltr" className="whitespace-nowrap">{fmtMoney(c.total)} / {fmtMoney(c.paid)} / {fmtMoney(c.remaining)}</span>
    ) },
    { label: t("dentalLab.common.status"), value: badge(PAYMENT_STATUS_MAP, c.paymentStatus) },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/dental-lab/cases" className="text-blue-600 dark:text-blue-400 text-sm flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />{t("dentalLab.common.back")}
          </a>
          <h1 className="text-xl font-bold" dir="ltr">{c.caseNumber || c.id.slice(0, 8)}</h1>
          {badge(CASE_STATUS_MAP, c.status)}
          {badge(PRIORITY_CONFIG, c.priority)}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openWorkOrder} disabled={workOrderLoading} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
            {workOrderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}{t("dentalLab.detail.workOrder")}
          </button>
          <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={() => setStatusOpen(true)} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <Pencil className="w-4 h-4" />{t("dentalLab.detail.editStatus")}
          </button>
          {next && (
            <button onClick={() => setAdvanceOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <ArrowRightCircle className="w-4 h-4" />{t("dentalLab.cases.advance")}
            </button>
          )}
        </div>
      </div>

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
                      {t("dentalLab.detail.refabStageFrom")}: {r.stageFrom ? t(`dentalLab.status.${r.stageFrom}`) : "—"}
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
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}{t("dentalLab.detail.uploadFile")}
              </button>
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
                      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${it.status === "done" ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${it.progress}%` }}
                        />
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

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await advanceCase(caseData.id, { status: status as DentalCaseStatus });
      toast.success(t("dentalLab.common.saved"));
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
          <h3 className="text-lg font-bold">{t("dentalLab.detail.editStatus")}</h3>
          <button onClick={() => !saving && onClose()} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("dentalLab.common.status")}</label>
          <select className={MODAL_INPUT_CLS} value={status} onChange={e => setStatus(e.target.value as DentalCaseStatus)}>
            {CASE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
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