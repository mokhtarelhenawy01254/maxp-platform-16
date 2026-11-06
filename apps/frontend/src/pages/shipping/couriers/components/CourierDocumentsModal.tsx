import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import courierService, { Courier, CourierDocument } from '../../../../services/courierService';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID_FRONT: 'بطاقة الرقم القومي (الوجه الأمامي)',
  NATIONAL_ID_BACK: 'بطاقة الرقم القومي (الوجه الخلفي)',
  CUSTODY_RECEIPT: 'وصل أمانة (عهدة مالية وبضائع)',
  CRIMINAL_RECORD: 'صحيفة الحالة الجنائية (فيش وتشبيه)',
  DRIVING_LICENSE: 'رخصة القيادة / تسيير المركبة',
  CONTRACT: 'عقد العمل / اتفاقية التوصيل',
  MEDICAL: 'شهادة كشف طبي / تحليل مخدرات',
  OTHER: 'مستند آخر'
};

interface CourierDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier: Courier | null;
  onStatusUpdated?: (newStatus: string) => void;
}

export const CourierDocumentsModal: React.FC<CourierDocumentsModalProps> = ({
  isOpen,
  onClose,
  courier,
  onStatusUpdated,
}) => {
  const [documents, setDocuments] = useState<CourierDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('NATIONAL_ID_FRONT');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchDocs = async () => {
    if (!courier) return;
    setLoading(true);
    try {
      const res = await courierService.listDocuments(courier.id);
      if (res.success && res.data) {
        setDocuments(res.data.documents || []);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل المستندات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && courier) {
      fetchDocs();
    }
  }, [isOpen, courier]);

  if (!isOpen || !courier) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('يرجى اختيار ملف المستند');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', docType);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (notes.trim()) formData.append('notes', notes.trim());

      const res = await courierService.uploadDocument(courier.id, formData);
      if (res.success) {
        toast.success('تم رفع المستند بنجاح');
        setFile(null);
        setNotes('');
        setExpiryDate('');
        if (res.data?.documentsStatus && onStatusUpdated) {
          onStatusUpdated(res.data.documentsStatus);
        }
        fetchDocs();
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر رفع المستند');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    let reason = '';
    if (status === 'REJECTED') {
      const promptRes = window.prompt('سبب رفض المستند (اختياري):');
      if (promptRes === null) return;
      reason = promptRes.trim();
    }

    try {
      const res = await courierService.updateDocumentStatus(courier.id, docId, {
        status,
        notes: reason || undefined
      });
      if (res.success) {
        toast.success(status === 'VERIFIED' ? 'تم اعتماد المستند' : 'تم رفض المستند');
        if (res.data?.documentsStatus && onStatusUpdated) {
          onStatusUpdated(res.data.documentsStatus);
        }
        fetchDocs();
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحديث حالة المستند');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      const res = await courierService.deleteDocument(courier.id, docId);
      if (res.success) {
        toast.success('تم حذف المستند');
        if (res.data?.documentsStatus && onStatusUpdated) {
          onStatusUpdated(res.data.documentsStatus);
        }
        fetchDocs();
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حذف المستند');
    }
  };

  const isExpired = (dateStr?: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const isExpiringSoon = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const diffDays = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diffDays > 0 && diffDays <= 30;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg">ملف ومستندات المندوب: {courier.name}</h3>
              {courier.documentsStatus === 'VERIFIED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  ملف معتمد وموثق
                </span>
              ) : courier.documentsStatus === 'PENDING_REVIEW' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <ClockIcon className="w-3.5 h-3.5" />
                  قيد مراجعة المستندات
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                  ملف ناقص (يلزم بطاقة + وصل أمانة)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إلزامي للعمل الميداني: اعتماد بطاقة الرقم القومي ووصل الأمانة لضمان سلامة العهد والطرود
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Upload Form */}
          <form onSubmit={handleUpload} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ArrowUpTrayIcon className="w-4 h-4 text-primary" />
              رفع مستند أو إقرار رسمي جديد
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">نوع المستند *</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">تاريخ انتهاء الصلاحية</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">الملف (صورة / PDF حتى 10MB) *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="ملاحظات توضيحية على المستند..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full sm:w-auto px-5 py-2 text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 font-semibold rounded-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 whitespace-nowrap text-xs"
              >
                {uploading ? 'جاري الرفع...' : 'رفع المستند'}
              </button>
            </div>
          </form>

          {/* Documents List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">سجل المستندات المرفوعة ({documents.length})</h4>
            {loading ? (
              <div className="py-8 text-center text-slate-400">جاري تحميل المستندات...</div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                لم يتم رفع أي مستندات لهذا المندوب حتى الآن
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const expired = isExpired(doc.expiryDate);
                  const expiringSoon = isExpiringSoon(doc.expiryDate);

                  return (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <DocumentTextIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                            <span>{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</span>
                            {doc.status === 'VERIFIED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200">
                                معتمد
                              </span>
                            ) : doc.status === 'REJECTED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200">
                                مرفوض
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200">
                                قيد المراجعة
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span>الملف: {doc.fileName}</span>
                            <span>الحجم: {(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                            {doc.expiryDate && (
                              <span
                                className={`font-medium ${
                                  expired
                                    ? 'text-rose-600 font-bold'
                                    : expiringSoon
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-500'
                                }`}
                              >
                                ينتهي: {new Date(doc.expiryDate).toLocaleDateString('ar-EG')}
                                {expired && ' (منتهي الصلاحية!)'}
                                {expiringSoon && ' (ينتهي قريباً!)'}
                              </span>
                            )}
                          </div>
                          {doc.notes && <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded">ملاحظة: {doc.notes}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          عرض الملف
                        </a>
                        {doc.status !== 'VERIFIED' && (
                          <button
                            onClick={() => handleUpdateStatus(doc.id, 'VERIFIED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            اعتماد
                          </button>
                        )}
                        {doc.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateStatus(doc.id, 'REJECTED')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                          >
                            <XCircleIcon className="w-3.5 h-3.5" />
                            رفض
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
