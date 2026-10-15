import { useState, useEffect, ChangeEvent } from "react";
import { Upload, FileText, ExternalLink, Trash2, Loader2, AlertCircle } from "lucide-react";
import { PatientDocument, DOCUMENT_TYPES, MODAL_INPUT_CLS, api, fetchJson } from "./shared";

interface Props {
  patientId: string;
}

const documentTypeLabel = (t: string): string => DOCUMENT_TYPES.find(d => d.value === t)?.label || t;

const documentTypeColor = (t: string): string => {
  const colors: Record<string, string> = {
    DRIVING_LICENSE: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    INSURANCE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    PRESCRIPTION: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    IMAGE: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    VIDEO: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    OTHER: "bg-muted text-muted-foreground border-border/70",
  };
  return colors[t] || "bg-muted text-muted-foreground border-border/70";
};

export default function PatientDocumentsTab({ patientId }: Props) {
  const id = patientId;
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [docType, setDocType] = useState("OTHER");
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docFile, setDocFile] = useState<{ name: string; dataUrl: string; mimeType: string } | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setDocumentsLoading(true);
    (async () => {
      try {
        const data = await fetchJson<PatientDocument[]>(api(`patient-documents/patient/${id}`));
        if (!cancelled) setDocuments(data || []);
      } catch (e: unknown) {
        if (!cancelled) setDocError(e instanceof Error ? e.message : "خطأ أثناء جلب المستندات");
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const onDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setDocError(null);
    if (!file) { setDocFile(null); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl.length > 5 * 1024 * 1024) {
        setDocError("حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)");
        setDocFile(null);
        setFileInputKey(k => k + 1);
        return;
      }
      setDocFile({ name: file.name, dataUrl, mimeType: file.type || "" });
    };
    reader.onerror = () => { setDocError("تعذر قراءة الملف"); setDocFile(null); };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!id || !docFile) return;
    setUploading(true);
    setDocError(null);
    try {
      await fetchJson(api("patient-documents"), {
        method: "POST",
        body: JSON.stringify({
          patientId: id,
          documentType: docType,
          name: docName.trim() || docFile.name,
          fileData: docFile.dataUrl,
          mimeType: docFile.mimeType || undefined,
          notes: docNotes.trim() || undefined,
        }),
      });
      setDocName("");
      setDocNotes("");
      setDocFile(null);
      setFileInputKey(k => k + 1);
      const data = await fetchJson<PatientDocument[]>(api(`patient-documents/patient/${id}`));
      setDocuments(data || []);
    } catch (e: unknown) {
      setDocError(e instanceof Error ? e.message : "خطأ أثناء رفع المستند");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!window.confirm("هل تريد حذف هذا المستند؟")) return;
    setDocError(null);
    try {
      await fetchJson(api(`patient-documents/${docId}`), { method: "DELETE" });
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e: unknown) {
      setDocError(e instanceof Error ? e.message : "خطأ أثناء الحذف");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Upload className="w-4 h-4 text-primary" />
          إضافة مستند أو ملف للمريض
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">نوع المستند</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className={MODAL_INPUT_CLS}>
              {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">اسم المستند</label>
            <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="اختياري" className={MODAL_INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">ملاحظات</label>
            <input value={docNotes} onChange={e => setDocNotes(e.target.value)} placeholder="اختياري" className={MODAL_INPUT_CLS} />
          </div>
        </div>
        <div className="mt-2">
          <input
            key={fileInputKey}
            type="file"
            onChange={onDocFileChange}
            className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold hover:file:bg-primary/20 cursor-pointer"
          />
          {docFile && <p className="mt-1 text-xs text-muted-foreground font-mono">الملف المختار: {docFile.name}</p>}
        </div>
        <div className="flex items-center justify-between pt-2">
          {docError ? (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {docError}
            </p>
          ) : <span />}
          <button
            onClick={handleUpload}
            disabled={!docFile || uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? "جارٍ الرفع..." : "رفع وحفظ المستند"}
          </button>
        </div>
      </div>

      {/* Documents List Surface */}
      <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-3">
        <h4 className="text-sm font-semibold flex items-center justify-between text-foreground">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            المستندات المحفوظة
          </span>
          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
            {documents.length}
          </span>
        </h4>
        {documentsLoading ? (
          <p className="text-center py-8 text-xs text-muted-foreground">جاري التحميل...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground space-y-1">
            <FileText className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">لا توجد مستندات مرفوعة لهذا المريض</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between gap-3 border border-border/60 bg-muted/20 rounded-xl px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap border ${documentTypeColor(doc.documentType)}`}>
                    {documentTypeLabel(doc.documentType)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name || "بدون اسم"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {String(doc.uploadedAt).split("T")[0]}
                      {doc.uploadedBy ? ` · ${doc.uploadedBy}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {doc.fileData && (
                    <a
                      href={doc.fileData}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      عرض
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
