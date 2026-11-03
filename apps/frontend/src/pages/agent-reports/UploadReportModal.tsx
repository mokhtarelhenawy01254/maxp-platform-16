import React, { useState, useRef } from 'react';
import { X, Upload, FileCode, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { agentReportsService, AgentReportType, AgentReportDetail } from '../../services/agentReportsService';

interface UploadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  types: AgentReportType[];
  selectedTypeId?: string;
  onCreated: (created: AgentReportDetail) => void;
}

export const UploadReportModal: React.FC<UploadReportModalProps> = ({
  isOpen,
  onClose,
  types,
  selectedTypeId,
  onCreated,
}) => {
  const [typeId, setTypeId] = useState(selectedTypeId || (types[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [periodLabel, setPeriodLabel] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentType = types.find((t) => t.id === (typeId || selectedTypeId)) || types[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error('يرجى اختيار ملف HTML صالح (.html)');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('حجم الملف يتجاوز الحد الأقصى المسموح به (12 ميجابايت)');
      return;
    }

    setFileName(file.name);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setHtmlContent(text || '');
    };
    reader.onerror = () => {
      toast.error('فشل في قراءة محتوى الملف');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('عنوان التقرير مطلوب');
      return;
    }
    if (!htmlContent.trim()) {
      toast.error('يرجى رفع ملف HTML أو لصق الكود الخاص به');
      return;
    }

    const targetTypeId = typeId || currentType?.id;
    if (!targetTypeId) {
      toast.error('يرجى اختيار نوع التقرير');
      return;
    }

    setLoading(true);
    try {
      const created = await agentReportsService.createReport({
        typeId: targetTypeId,
        title: title.trim(),
        periodLabel: periodLabel.trim() || undefined,
        summary: summary.trim() || undefined,
        html: htmlContent,
      });

      toast.success('تم رفع التقرير بنجاح');
      onCreated(created);
      onClose();
      setTitle('');
      setHtmlContent('');
      setFileName('');
      setSummary('');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل في رفع التقرير';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const sizeKb = htmlContent ? (new Blob([htmlContent]).size / 1024).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">رفع تقرير وكيل جديد</h3>
              <p className="text-xs text-slate-400">صفحة HTML مكتفية بذاتها (Self-Contained)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              نوع التقرير <span className="text-rose-500">*</span>
            </label>
            <select
              value={typeId || currentType?.id}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                عنوان التقرير <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: التقرير اليومي للشحن"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                تاريخ أو فترة التقرير <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="2026-11-03 أو الأسبوع 44"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              ملخص التقرير <span className="text-slate-400 font-normal">(يظهر في قائمة التقارير)</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="سطرين يوضحان أهم مخرجات هذا التقرير…"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700">
                محتوى الـ HTML <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    mode === 'file' ? 'bg-white font-medium text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  رفع ملف (.html)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('text')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    mode === 'text' ? 'bg-white font-medium text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  لصق كود
                </button>
              </div>
            </div>

            {mode === 'file' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50/50 rounded-xl p-6 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary/10 text-slate-400 group-hover:text-primary flex items-center justify-center mx-auto mb-2 transition-colors">
                  <FileCode className="w-5 h-5" />
                </div>
                {fileName ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium text-sm">
                    <Check className="w-4 h-4" />
                    <span>{fileName}</span>
                    <span className="text-xs text-slate-400 tabular-nums">({sizeKb} KB)</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-700 mb-0.5">انقر لاختيار ملف .html مكتمل</p>
                    <p className="text-[11px] text-slate-400">الحد الأقصى للحجم 12 ميجابايت</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<!DOCTYPE html><html>...</html>"
                  rows={8}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y"
                  dir="ltr"
                />
                {htmlContent && (
                  <p className="text-[11px] text-slate-400 mt-1 text-left tabular-nums">
                    الحجم: {sizeKb} KB
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !htmlContent.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/95 rounded-lg active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'جاري الرفع…' : 'حفظ ونشر التقرير'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
