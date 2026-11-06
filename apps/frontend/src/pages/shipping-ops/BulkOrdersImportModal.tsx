import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadOrdersImportTemplate } from './shippingOpsShared';

interface ImportErrorItem {
  row: number;
  reason: string;
  message: string;
  orderNumber?: string;
  clientReference?: string;
}

interface ImportResult {
  total: number;
  successful: number;
  failed: ImportErrorItem[];
}

interface BulkOrdersImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isEn?: boolean;
}

export const BulkOrdersImportModal: React.FC<BulkOrdersImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isEn = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(isEn ? 'Please choose an Excel or CSV file' : 'يرجى اختيار ملف إكسيل أو CSV أولاً');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/v1/shipping-portal/orders/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok && !data.failed) {
        throw new Error(data.message || data.error || (isEn ? 'Failed to import file' : 'فشل استيراد الملف'));
      }

      setResult({
        total: data.total || 0,
        successful: data.successful || 0,
        failed: Array.isArray(data.failed) ? data.failed : (Array.isArray(data.errors) ? data.errors : []),
      });

      if (data.successful > 0) {
        toast.success(
          isEn
            ? `Successfully imported ${data.successful} orders/parcels`
            : `تم استيراد ${data.successful} أوردر بنجاح`
        );
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEn ? 'Import failed' : 'حدث خطأ أثناء الاستيراد');
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorCsv = () => {
    if (!result || result.failed.length === 0) return;

    const headers = ['Row', 'Reason', 'Message', 'Order Number', 'Reference'];
    const rows = result.failed.map((f) => [
      f.row,
      f.reason,
      `"${(f.message || '').replace(/"/g, '""')}"`,
      f.orderNumber || '',
      f.clientReference || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEn ? 'Import Orders & Shipments via Excel' : 'استيراد أوردرات وشحنات من Excel / CSV'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          {/* Download Template Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl">
            <div className="space-y-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300">
                {isEn ? 'Download Excel Template' : 'تحميل نموذج الإكسيل الجاهز'}
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                {isEn
                  ? 'Contains all full order & parcel fields with sample Egyptian records and guidelines.'
                  : 'يحتوي على كافة أعمدة الأوردر الكاملة (العميل، الأصناف، الإجمالي، الشحن) مع أمثلة واقعية.'}
              </p>
            </div>
            <button
              type="button"
              onClick={downloadOrdersImportTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-white dark:bg-slate-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition shrink-0 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Download .XLSX' : 'تحميل النموذج (.XLSX)'}</span>
            </button>
          </div>

          {!result ? (
            /* Upload Dropzone */
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-file-input"
              />
              <label
                htmlFor="excel-file-input"
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer transition text-center group"
              >
                <Upload className="w-10 h-10 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-2 transition" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedFile
                    ? selectedFile.name
                    : isEn
                    ? 'Click to select Excel or CSV file'
                    : 'اضغط هنا لاختيار ملف إكسيل (.xlsx, .csv)'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : isEn
                    ? 'Supports .XLSX, .XLS, .CSV up to 10MB (max 500 rows)'
                    : 'يقبل ملفات حتى 10 ميجابايت وحتى 500 صف في المرة'}
                </span>
              </label>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-rose-600 hover:underline"
                  >
                    {isEn ? 'Remove' : 'إزالة'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              {/* Stats Strip */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500">{isEn ? 'Total Rows' : 'إجمالي الصفوف'}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{result.total}</div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">{isEn ? 'Successful' : 'تم الاستيراد'}</div>
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{result.successful}</div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <div className="text-xs text-rose-600 dark:text-rose-400">{isEn ? 'Failed' : 'صفوف بها أخطاء'}</div>
                  <div className="text-lg font-bold text-rose-700 dark:text-rose-300">{result.failed.length}</div>
                </div>
              </div>

              {/* Failed Items Table */}
              {result.failed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-rose-600 text-xs">
                      {isEn ? 'Rows requiring review:' : 'الصفوف التي تعذر استيرادها وأسبابها:'}
                    </span>
                    <button
                      type="button"
                      onClick={downloadErrorCsv}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                    >
                      <Download className="w-3 h-3" />
                      <span>{isEn ? 'Download Errors CSV' : 'تحميل تقرير الأخطاء (CSV)'}</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-right rtl:text-right ltr:text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                        <tr>
                          <th className="px-3 py-2"># الصف</th>
                          <th className="px-3 py-2">رقم الطلب/المرجع</th>
                          <th className="px-3 py-2">سبب الخطأ</th>
                          <th className="px-3 py-2">التفاصيل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {result.failed.map((f, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2 font-mono font-bold text-slate-700 dark:text-slate-300">{f.row}</td>
                            <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                              {f.orderNumber || f.clientReference || '—'}
                            </td>
                            <td className="px-3 py-2 font-semibold text-rose-600">{f.reason}</td>
                            <td className="px-3 py-2 text-slate-500">{f.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          {result ? (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isEn ? 'Import Another File' : 'استيراد ملف آخر'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
          )}

          {result ? (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95"
            >
              {isEn ? 'Done' : 'إغلاق'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEn ? 'Processing Import...' : 'جاري معالجة الاستيراد...'}</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Start Import' : 'بدء الاستيراد الآن'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
